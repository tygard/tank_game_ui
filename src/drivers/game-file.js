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
    constructor(gamesFolder, engineManager, opts = {}) {
        this._gamesFolder = gamesFolder;
        this._engineManager = engineManager;
        this._gameOptions = opts;
        this._games = {};
        this.loaded = this._loadGamesFromFolder();
    }

    async _loadGamesFromFolder() {
        for(const gameFile of await fs.readdir(this._gamesFolder)) {
            // Only load json files
            if(!gameFile.endsWith(".json")) continue;

            const filePath = path.join(this._gamesFolder, gameFile);
            const {name} = path.parse(gameFile);

            // This game has already been loaded don't reload
            if(this._games[name] !== undefined) continue;

            // Load and process the game asyncronously (does not return a promise)
            this._games[name] = loadGameFromFile(filePath, this._engineManager, this._gameOptions);
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

    async reload({ gameVersion, gameName } = {}) {
        const isAllGames = gameVersion === undefined && gameName === undefined;

        // Shutdown and remove any games we want to reload
        await Promise.all(
            Object.keys(this._games).map(async name => {
                const game = this._games[name];
                // Not the requested version don't do anything
                if(!isAllGames && game.getGameVersion() !== gameVersion && name !== gameName) {
                    return;
                }

                await game.shutdown();
                delete this._games[name];
            }),
        );

        // Rescan the folder, reloading any games we shutdown and detecting any games that we added
        await this._loadGamesFromFolder();
    }
}

export function loadGameFromFile(filePath, engineManager, { saveBack, makeTimeStamp } = {}) {
    const {name} = path.parse(filePath);
    logger.info(`Loading ${name} from ${filePath}`);

    const gameDataPromise = load(filePath, { saveBack, makeTimeStamp });
    const saveHandler = gameData => save(filePath, gameData);

    return new Game({
        name,
        gameDataPromise,
        engineManager,
        saveHandler,
    });
}

export function createGameManager(engineManager, saveUpdatedFiles) {
    const gamesFolder = path.join(process.env.TANK_GAMES_FOLDER || ".");
    const gameManager = new GameManager(gamesFolder, engineManager, { saveBack: saveUpdatedFiles });
    return gameManager;
}