// A suite of tests to make sure we're properly interfacing with the engine

import assert from "node:assert";
import { GameInteractor } from "../../common/game/game-interactor.mjs";
import { LogBook } from "../../common/state/log-book/log-book.mjs";
import { loadConfig, loadConfigAndGames } from "../src/config-loader.mjs";
import { load } from "../src/game-file.mjs";
import { logger } from "../src/logging.mjs";

export function defineTestsForEngine(createEngine) {
    function defTest(name, testFunc) {
        // Disable the tests if we don't have a given engine on hand
        let register = createEngine === undefined ? xit : it;

        register(name, async () => {
            logger.debug(`[integration-test] Starting ${name}`);

            try {
                await testFunc();
            }
            finally {
                logger.debug(`[integration-test] Finished ${name}`);
            }
        });
    }

    const TEST_GAME_NAME = "possible_actions_v3";
    const TEST_GAME_PATH = `../example/tank_game_v3.json`;

    defTest("can process the entire example folder", async () => {
        let { gameManager } = await loadConfigAndGames(createEngine);
        try {
            await gameManager.loaded;

            await Promise.all(
                gameManager.getAllGames().map(gameName => {
                    return gameManager.getGamePromise(gameName);
                })
            );
        }
        finally {
            await gameManager.shutdown();
        }
    });

    defTest("can process actions together and individually", async () => {
        const config = await loadConfig();
        let { logBook, initialGameState } = await load(TEST_GAME_PATH, config);
        let emptyLogBook = new LogBook(logBook.gameVersion, [], config.getGameVersion(logBook.gameVersion));

        let fullEngine = createEngine();
        let incrementalEngine = createEngine();
        try {
            // Create one instance that starts with the log book full
            // This triggers a set version, set state, and a series of process actions
            logger.debug("[integration-test] Process actions as a group");
            let fullInteractor = new GameInteractor(fullEngine, { logBook, initialGameState });
            await fullInteractor.loaded;

            // Create another instance that starts with no log enties and has then added
            // This triggers a set version and then a set state and process action for each entry
            logger.debug("[integration-test] Process individual actions");
            let incrementalInteractor = new GameInteractor(incrementalEngine, { logBook: emptyLogBook, initialGameState });

            for(const entry of logBook) {
                const entryId = await incrementalInteractor.addLogBookEntry(entry.rawLogEntry);

                // Compare the entries and states and make sure they match
                assert.deepEqual(logBook.getEntry(entryId), emptyLogBook.getEntry(entryId));
                assert.deepEqual(fullInteractor.getGameStateById(entry.id), incrementalInteractor.getGameStateById(entry.id));
            }

            // Make sure the log books are identical
            assert.deepEqual(emptyLogBook, logBook);
        }
        finally {
            await Promise.all([
                fullEngine.shutdown(),
                incrementalEngine.shutdown(),
            ]);
        }
    });

    defTest("can provide a list of possible actions", async () => {
        let { gameManager, config } = await loadConfigAndGames(createEngine);
        try {
            await gameManager.loaded;

            const {sourceSet, interactor} = await gameManager.getGamePromise(TEST_GAME_NAME);

            const logBook = interactor.getLogBook();
            const lastId = logBook.getLastEntryId();

            const players = interactor.getGameStateById(lastId).players.getAllPlayers();
            if(players.length === 0) {
                throw new Error("Expected at least on player");
            }

            let submittedAction = false;
            for(const player of players) {
                const factories = await sourceSet.getActionFactoriesForPlayer({
                    playerName: player.name,
                    logBook,
                    logEntry: logBook.getEntry(lastId),
                    gameState: interactor.getGameStateById(lastId),
                    interactor: interactor,
                    config,
                });

                for(const factory of factories) {
                    const spec = factory.getParameterSpec();
                    const canNotEnumerate = spec.find(field => !field.options?.length);

                    // This option has so unbounded component to it we can't easily sent it back
                    if(canNotEnumerate) continue;

                    let actionParameters = {};

                    for(const field of spec) {
                        actionParameters[field.logBookField] = field.options[0];
                    }

                    if(!factory.areParemetersValid(actionParameters)) {
                        throw new Error(`Failed to fill parameters for ${factory} (parameters = ${actionParameters})`)
                    }

                    const entry = factory.buildRawEntry(actionParameters);

                    // It's possible that a possible action could fail due to players not having
                    // enough resouces so we can rettry until one passes.  We just care that
                    // it can generate at least one valid action
                    assert.ok(await interactor.canProcessAction(entry), `Processing ${JSON.stringify(entry, null, 4)}`);

                    // Make sure we submit at least one action
                    submittedAction = true;
                }
            }

            assert.ok(submittedAction);
        }
        finally {
            await gameManager.shutdown();
        }
    });
}