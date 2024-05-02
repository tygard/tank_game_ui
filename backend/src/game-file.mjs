import fs from "node:fs/promises";
import path from "node:path";
import { LogBook } from "../../common/state/log-book/log-book.mjs";
import { readJson, writeJson } from "./utils.mjs";
import { logger } from "./logging.mjs";
import { GameInteractor } from "../../common/game/game-interactor.mjs";
import { PossibleActionSourceSet } from "../../common/state/possible-actions/index.mjs";
import { StartOfDaySource } from "../../common/state/possible-actions/start-of-day-source.mjs";

export const FILE_FORMAT_VERSION = 5;
export const MINIMUM_SUPPORTED_FILE_FORMAT_VERSION = 5;


export async function load(filePath, gameConfig, saveBack = false) {
    let content = await readJson(filePath);

    if(content?.fileFormatVersion === undefined) {
        throw new Error("File format version missing not a valid game file");
    }

    if(content.fileFormatVersion > FILE_FORMAT_VERSION) {
        throw new Error(`File version ${content.fileFormatVersion} is not supported.  Try a newer Tank Game UI version.`);
    }

    if(content.fileFormatVersion < MINIMUM_SUPPORTED_FILE_FORMAT_VERSION) {
        throw new Error(`File version ${content.fileFormatVersion} is no longer supported.  Try an older Tank Game UI version.`);
    }

    const saveUpdatedFile = saveBack && (content.fileFormatVersion < FILE_FORMAT_VERSION);

    // Make sure we have the config required to load this game.  This
    // does not check if the engine supports this game version.
    if(!gameConfig.isGameVersionSupported(content.logBook.gameVersion)) {
        logger.warn({
            msg: `Tank Game UI is not configured for game version ${content.logBook.gameVersion}.  You may experience strage behavior.`,
            supportedVersions: gameConfig.getSupportedGameVersions(),
        });
    }

    const logBook = LogBook.deserialize(content.logBook);

    const fileData = {
        logBook,
        initialGameState: content.initialGameState,
    };

    if(saveUpdatedFile) {
        save(filePath, fileData);
    }

    return fileData;
}

export async function save(filePath, {logBook, initialGameState}) {
    await writeJson(filePath, {
        fileFormatVersion: FILE_FORMAT_VERSION,
        logBook: logBook.serialize(),
        initialGameState,
    });
}

export class GameManager {
    constructor(gameConfig, createEngine, saveBack = false) {
        this.gameConfig = gameConfig;
        this._createEngine = createEngine;
        this.loaded = this._loadGamesFromFolder(saveBack);
        this._interactors = [];
    }

    async _loadGamesFromFolder(saveBack) {
        this._gamePromises = {};
        this._games = {};

        const dir = this.gameConfig.getConfig().backend.gamesFolder;
        for(const gameFile of await fs.readdir(dir)) {
            // Only load json files
            if(!gameFile.endsWith(".json")) continue;

            const filePath = path.join(dir, gameFile);
            const {name} = path.parse(gameFile);

            logger.info(`Loading ${name} from ${filePath}`);
            const saveHandler = data => save(filePath, data);

            // Load and process the game asyncronously
            this._gamePromises[name] = load(filePath, this.gameConfig, saveBack)
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
        const config = this.gameConfig.getConfig();
        const engine = this._createEngine(config?.engineInterface?.timeout);
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
