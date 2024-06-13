/* global process */
import fs from "node:fs/promises";
import path from "node:path";
import { LogBook } from "../game/state/log-book/log-book.js";
import { readJson, writeJson } from "./file-utils.js";
import { logger } from "#platform/logging.js";
import { OpenHours } from "../game/open-hours/index.js";
import { getGameVersion } from "../versions/index.js";
import { Game } from "../game/execution/game.js";

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
        gameSettings: content.gameSettings,
        initialGameState: content.initialGameState,
    };

    if(saveUpdatedFile) {
        save(filePath, fileData);
    }

    return fileData;
}

export async function save(filePath, {logBook, initialGameState, openHours, gameSettings}) {
    await writeJson(filePath, {
        fileFormatVersion: FILE_FORMAT_VERSION,
        gameSettings,
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
    }

    async _loadGamesFromFolder(gameOptions) {
        this._gamePromises = {};
        this._games = {};

        for(const gameFile of await fs.readdir(this._gamesFolder)) {
            // Only load json files
            if(!gameFile.endsWith(".json")) continue;

            const filePath = path.join(this._gamesFolder, gameFile);
            const {name} = path.parse(gameFile);

            // Load and process the game asyncronously (does not return a promise)
            this._games[name] = loadGameFromFile(filePath, this._createEngine, gameOptions);
        }
    }

    getGame(name) {
        return this._games[name];
    }

    getAllGames() {
        return Object.values(this._games) || [];
    }

    shutdown() {
        return Promise.all(this.getAllGames().map(game => game.shutdown()));
    }
}

export function loadGameFromFile(filePath, createEngine, { saveBack, makeTimeStamp } = {}) {
    const {name} = path.parse(filePath);
    logger.info(`Loading ${name} from ${filePath}`);

    const gameDataPromise = load(filePath, { saveBack, makeTimeStamp });
    const saveHandler = gameData => save(filePath, gameData);

    return new Game({
        name,
        gameDataPromise,
        createEngine,
        saveHandler,
    });
}

export function createGameManager(createEngine, saveUpdatedFiles) {
    const gamesFolder = path.join(process.env.TANK_GAMES_FOLDER || ".");
    const gameManager = new GameManager(gamesFolder, createEngine, { saveBack: saveUpdatedFiles });
    return gameManager;
}