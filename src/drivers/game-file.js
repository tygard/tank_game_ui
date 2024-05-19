/* global process */
import fs from "node:fs/promises";
import path from "node:path";
import { LogBook } from "../game/state/log-book/log-book.js";
import { readJson, writeJson } from "./file-utils.js";
import { logger } from "#platform/logging.js";
import { GameInteractor } from "../game/execution/game-interactor.js";
import { PossibleActionSourceSet } from "../game/possible-actions/index.js";
import { StartOfDaySource } from "../game/possible-actions/start-of-day-source.js";
import { OpenHours } from "../game/open-hours/index.js";
import { getGameVersion } from "../versions/index.js";

export const FILE_FORMAT_VERSION = 5;
export const MINIMUM_SUPPORTED_FILE_FORMAT_VERSION = 5;


export async function load(filePath, { saveBack = false, makeTimeStamp } = {}) {
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
    if(!getGameVersion(content.logBook.gameVersion)) {
        throw new Error(`Game version ${content.logBook.gameVersion} is not supported`);
    }

    const logBook = LogBook.deserialize(content.logBook, makeTimeStamp);
    const openHours = content.openHours ?
        OpenHours.deserialize(content.openHours) : new OpenHours([]);

    const fileData = {
        openHours,
        logBook,
        initialGameState: content.initialGameState,
    };

    if(saveUpdatedFile) {
        save(filePath, fileData);
    }

    return fileData;
}

export async function save(filePath, {logBook, initialGameState, openHours}) {
    await writeJson(filePath, {
        fileFormatVersion: FILE_FORMAT_VERSION,
        openHours: openHours.serialize(),
        logBook: logBook.serialize({ justRawEntries: true }),
        initialGameState,
    });
}

export class GameManager {
    constructor(gamesFolder, createEngine, opts = {}) {
        this._gamesFolder = gamesFolder;
        this._createEngine = createEngine;
        this.loaded = this._loadGamesFromFolder(opts);
        this._interactors = [];
    }

    async _loadGamesFromFolder({ saveBack, makeTimeStamp }) {
        this._gamePromises = {};
        this._games = {};

        for(const gameFile of await fs.readdir(this._gamesFolder)) {
            // Only load json files
            if(!gameFile.endsWith(".json")) continue;

            const filePath = path.join(this._gamesFolder, gameFile);
            const {name} = path.parse(gameFile);
            logger.info(`Loading ${name} from ${filePath}`);

            // Load and process the game asyncronously
            this._gamePromises[name] = loadGameFromFile(filePath, this._createEngine, { saveBack, makeTimeStamp })
                .then(({ interactor, sourceSet }) => {
                    // We've already been asked to shutdown kill this game
                    if(this._isShutDown) interactor.shutdown();

                    this._interactors.push(interactor);

                    this._games[name] = {
                        loaded: true,
                        interactor,
                        sourceSet,
                    };

                    return this._games[name];
                });

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
        this._isShutDown = true;
        return Promise.all(this._interactors.map(interactor => interactor.shutdown()));
    }
}

export async function loadGameFromFile(filePath, createEngine, { saveBack, makeTimeStamp } = {}) {
    const file = await load(filePath, { saveBack, makeTimeStamp });

    const engine = createEngine();
    const saveHandler = data => save(filePath, data);
    const interactor = new GameInteractor(engine, file, saveHandler);
    await interactor.loaded;

    let actionSets = [];

    if(!interactor.hasAutomaticStartOfDay()) {
        actionSets.push(new StartOfDaySource());
    }

    const engineSpecificSource = engine.getEngineSpecificSource &&
        engine.getEngineSpecificSource();

    if(engineSpecificSource) {
        actionSets.push(engineSpecificSource);
    }

    const sourceSet = new PossibleActionSourceSet(actionSets);

    return {
        interactor,
        sourceSet,
    };
}

export async function createGameManager(createEngine, saveUpdatedFiles) {
    const gamesFolder = path.join(process.env.TANK_GAMES_FOLDER || ".");
    const gameManager = new GameManager(gamesFolder, createEngine, { saveBack: saveUpdatedFiles });
    return gameManager;
}