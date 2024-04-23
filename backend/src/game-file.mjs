import fs from "node:fs/promises";
import path from "node:path";
import { LogBook } from "../../common/state/log-book/log-book.mjs";
import { readJson, writeJson } from "./utils.mjs";
import { logger } from "./logging.mjs";
import { gameStateFromRawState } from "./java-engine/board-state.mjs";
import { GameState } from "../../common/state/game-state.mjs";
import { GameInteractor } from "../../common/game/game-interactor.mjs";
import { PossibleActionSourceSet } from "../../common/state/possible-actions/index.mjs";
import { StartOfDaySource } from "../../common/state/possible-actions/start-of-day-source.mjs";

export const FILE_FORMAT_VERSION = 4;
export const MINIMUM_SUPPORTED_FILE_FORMAT_VERSION = 1;


function remapLogEntryForV4(rawEntry) {
    if(rawEntry.action == "move" || rawEntry.action == "shoot") {
        rawEntry.target = rawEntry.position;
        delete rawEntry.position;
    }

    if(rawEntry.action == "donate") {
        rawEntry.donation = rawEntry.quantity;
        delete rawEntry.quantity;
    }

    if(rawEntry.action == "buy_action") {
        rawEntry.gold = rawEntry.quantity;
        delete rawEntry.quantity;
    }

    if(rawEntry.action == "bounty") {
        rawEntry.bounty = rawEntry.quantity;
        delete rawEntry.quantity;
    }

    return rawEntry;
}

export async function load(filePath, gameConfig) {
    let content = await readJson(filePath);
    let fileFormatVersion = content?.versions?.fileFormat || content.fileFormatVersion;

    if(fileFormatVersion > FILE_FORMAT_VERSION) {
        throw new Error(`File version ${fileFormatVersion} is not supported.  Try a newer Tank Game UI version..`);
    }

    if(fileFormatVersion < MINIMUM_SUPPORTED_FILE_FORMAT_VERSION) {
        throw new Error(`File version ${fileFormatVersion} is no longer supported.  Try an older Tank Game UI version.`);
    }

    // Version 1 used a states array instead of initialState and only supported game version 3
    if(fileFormatVersion == 1) {
        content.initialState = content.gameStates[0];
        delete content.states;
        content.versions.game = 3;
        fileFormatVersion = 2;
    }

    // Version 2 uses the jar format for initial state and an array of log enties
    if(fileFormatVersion == 2) {
        content.initialState = gameStateFromRawState(content.initialState.gameState)
            // It seems kind of silly to deserialize, serialize, and deserialize but normal v3 files will have
            // the initial state serialized so we need to leave it that way for consistency
            .serialize();

        content.logBook = {
            gameVersion: content.versions.game.toString(),
            rawEntries: content.logBook,
        };

        fileFormatVersion = 3;
    }

    if(fileFormatVersion == 3) {
        content.logBook.rawEntries = content.logBook.rawEntries.map(entry => remapLogEntryForV4(entry));
        fileFormatVersion = 4;
    }

    // Make sure we have the config required to load this game.  This
    // does not check if the engine supports this game version.
    if(!gameConfig.isGameVersionSupported(content.logBook.gameVersion)) {
        logger.warn({
            msg: `Tank Game UI is not configured for game version ${content.logBook.gameVersion}.  You may experience strage behavior.`,
            supportedVersions: gameConfig.getSupportedGameVersions(),
        });
    }

    const logBook = LogBook.deserialize(content.logBook);
    const initialGameState = GameState.deserialize(content.initialState)

    return {
        logBook,
        initialGameState,
    };
}

export async function save(filePath, {logBook, initialGameState}) {
    await writeJson(filePath, {
        fileFormatVersion: FILE_FORMAT_VERSION,
        logBook: logBook.serialize(),
        initialState: initialGameState.serialize(),
    });
}

export class GameManager {
    constructor(gameConfig, createEngine) {
        this.gameConfig = gameConfig;
        this._createEngine = createEngine;
        this.loaded = this._loadGamesFromFolder();
        this._interactors = [];
    }

    async _loadGamesFromFolder() {
        this._gamePromises = {};
        this._games = {};

        const dir = this.gameConfig.getGamesFolder();
        for(const gameFile of await fs.readdir(dir)) {
            // Only load json files
            if(!gameFile.endsWith(".json")) continue;

            const filePath = path.join(dir, gameFile);
            const {name} = path.parse(gameFile);

            logger.info(`Loading ${name} from ${filePath}`);
            const saveHandler = data => save(filePath, data);

            // Load and process the game asyncronously
            this._gamePromises[name] = load(filePath, this.gameConfig)
                .then(this._initilizeGame.bind(this, name, saveHandler));

            // Update the status on error but don't remove the error from the promise
            this._gamePromises[name].catch(err => {
                logger.warn({
                    msg: `An error occured while loading ${name} from ${filePath}`,
                    err,
                });

                this._games[name] = {
                    loaded: false,
                    error: err.message,
                };
            });
        }

        Object.keys(this._gamePromises).forEach(name => {
            this._games[name] = {
                loaded: false,
            };
        });
    }

    async _initilizeGame(name, saveHandler, file) {
        const engine = this._createEngine();
        const interactor = new GameInteractor(engine, file, saveHandler);
        // Save our interactor incase we get shutdown
        this._interactors.push(interactor);
        await interactor.loaded;

        let actionSets = [
            new StartOfDaySource(),
        ];

        const engineSpecificSource = engine.getEngineSpecificSource &&
            engine.getEngineSpecificSource();

        if(engineSpecificSource) {
            actionSets.push(engineSpecificSource);
        }

        const sourceSet = new PossibleActionSourceSet(actionSets);

        this._games[name] = {
            loaded: true,
            interactor,
            sourceSet,
        };

        return this._games[name];
    }

    getGamePromise(name) {
        return this._gamePromises[name];
    }

    getGame(name) {
        return this._games[name] || {
            loaded: false,
            error: `${name} is not a valid game`,
        };
    }

    getAllGames() {
        return Object.keys(this._games) || [];
    }

    shutdown() {
        return Promise.all(this._interactors.map(interactor => interactor.shutdown()));
    }
}
