import assert from "node:assert";
import { GameInteractor } from "../../../src/game/execution/game-interactor.js";
import { LogBook } from "../../../src/game/state/log-book/log-book.js";
import { load } from "../../../src/drivers/game-file.js";
import { logger } from "#platform/logging.js";
import { OpenHours } from "../../../src/game/open-hours/index.js";
import { getGameVersion } from "../../../src/versions/index.js";
import { stripPlayerIds } from "../../unit/helpers.js";

export async function incrementalPlaythrough(engineFactory, testGamePath) {
    let { gameVersion, logBook, initialGameState } = await load(testGamePath);

    let lastTime = 0;
    const makeTimeStamp = () => {
        lastTime += 20 * 60; // 20 minutes in seconds
        return lastTime;
    };

    const versionConfig = getGameVersion(gameVersion);
    let emptyLogBook = new LogBook([], makeTimeStamp);

    let fullEngine = engineFactory.createEngine();
    let incrementalEngine = engineFactory.createEngine();
    const fullFactories = versionConfig.getActionFactories(fullEngine);
    const incrementalFactories = versionConfig.getActionFactories(incrementalEngine);
    try {
        // Create one instance that starts with the log book full
        // This triggers a set version, set state, and a series of process actions
        logger.debug("[integration-test] Process actions as a group");
        let fullInteractor = new GameInteractor({
            logEntryFormatter: versionConfig,
            engine: fullEngine,
            actionFactories: fullFactories,
            gameData: {
                gameVersion,
                logBook,
                initialGameState,
                openHours: new OpenHours([]),
            },
        });

        // Create another instance that starts with no log enties and has then added
        // This triggers a set version and then a set state and process action for each entry
        logger.debug("[integration-test] Process individual actions");
        let incrementalInteractor = new GameInteractor({
            logEntryFormatter: versionConfig,
            engine: incrementalEngine,
            actionFactories: incrementalFactories,
            gameData: {
                gameVersion,
                logBook: emptyLogBook,
                initialGameState,
                openHours: new OpenHours([]),
            },
        });

        for(const entry of logBook) {
            await incrementalInteractor.addLogBookEntry(entry.rawLogEntry);
        }

        // Wait for the full interactor to finish loading
        await fullInteractor.loaded;

        for(let id = 0; id < logBook.getLength(); ++id) {
            const entry = logBook.getEntry(id);
            // Compare the entries and states and make sure they match
            let incrementalEntry = emptyLogBook.getEntry(id).serialize();
            let fullEntry = entry.serialize();
            // Timestamps won't be in sync ignore them
            delete incrementalEntry.timestamp;
            delete fullEntry.timestamp;

            assert.deepEqual(incrementalEntry, fullEntry);

            stripPlayerIds(fullInteractor.getGameStateById(id));
            stripPlayerIds(incrementalInteractor.getGameStateById(id));

            assert.deepEqual(fullInteractor.getGameStateById(id), incrementalInteractor.getGameStateById(id));
        }
    }
    finally {
        await Promise.all([
            fullEngine.shutdown(),
            incrementalEngine.shutdown(),
        ]);
    }
}