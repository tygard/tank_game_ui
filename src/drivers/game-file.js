/* global process */
import fs from "node:fs/promises";
import path from "node:path";
import { readJson, writeJson } from "./file-utils.js";
import { logger } from "#platform/logging.js";
import { Game } from "../game/execution/game.js";
import { dumpToRaw, loadFromRaw } from "./game-file-data.js";

export const FILE_FORMAT_VERSION = 6;
export const MINIMUM_SUPPORTED_FILE_FORMAT_VERSION = 5;


export async function load(filePath, { saveBack = false, makeTimeStamp } = {}) {
    let content = await readJson(filePath);

    const saveUpdatedFile = saveBack && (content?.fileFormatVersion < FILE_FORMAT_VERSION);
    const fileData = loadFromRaw(content, { makeTimeStamp });

    if(saveUpdatedFile) {
        save(filePath, fileData);
    }

    return fileData;
}

export async function save(filePath, fileData) {
    await writeJson(filePath, dumpToRaw(fileData));
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