import fs from "node:fs/promises";
import {getEngine} from "./tank-game-engine.mjs";

const FILE_FORMAT_VERSION = 1;


async function readJson(path) {
    return JSON.parse(await fs.readFile(path, "utf-8"));
}

async function writeJson(path, data) {
    return await fs.writeFile(path, JSON.stringify(data, null, 4));
}

class Game {
    constructor(path, states, logBook) {
        this._path = path;
        this._initialState = states[0]
        this._states = states.slice(1);
        this._logBook = logBook;
        this._ready = Promise.resolve();

        this._buildDayMap();

        // Process any unprocessed log book entries.
        if(this._states.length < this._logBook.length) {
            this._ready = this._processActions(this._states.length, this._logBook.length - 1);
        }
    }

    static async loadFromFiles(statePath, movesPath, saveFilePath) {
        const boardState = await readJson(statePath);
        const logBook = await readJson(movesPath);

        const states = [{
            valid: true,
            gameState: boardState
        }];

        const game = new Game(saveFilePath, states, logBook);

        // Loading a game like this can cause a lot of actions to be processed
        // wait until they're done before returning the game object
        await game._ready;

        return game;
    }

    static async load(filePath) {
        const content = await readJson(filePath);

        if(content?.versions?.fileFormat != FILE_FORMAT_VERSION) {
            throw new Error(`File version ${content?.versions?.fileFormat} is not supported`);
        }

        const game = new Game(filePath, content.gameStates, content.logBook);

        // Loading a game like this can cause a lot of actions to be processed
        // wait until they're done before returning the game object
        await game._ready;

        return game;
    }

    async _processActions(startIndex, endIndex) {
        if(startIndex > endIndex) {
            throw new Error(`startIndex (${startIndex}) can't be larger than endIndex (${endIndex})`);
        }

        if(endIndex >= this._logBook.length) {
            throw new Error(`Index ${endIndex} is past the end of the logbook`);
        }

        let engine = getEngine();

        // Send our previous state to tank game
        const initialState = startIndex === 0 ?
            this._initialState : this._states[startIndex - 1];
        if(!initialState) {
            throw new Error(`Expected a state at index ${startIndex}`);
        }

        await engine.setBoardState(initialState.gameState);

        // Remove any states that might already be there
        this._states.splice(startIndex, (endIndex - startIndex) + 1);

        for(let i = startIndex; i <= endIndex; ++i) {
            const state = await engine.processAction(this._logBook[i]);
            this._states.splice(i, 0, state); // Insert state at i
        }

        this._buildDayMap();

        engine.exit(); // Don't wait for the engine to exit
    }

    _buildDayMap() {
        this._dayMap = {
            "0": 0, // Initial state is concidered day 0
        };
        let day = 0;
        this._states.forEach((state, idx) => {
            state = state.gameState;

            if(day != state.day && state.day) {
                // Externally states[0] is initial state so indicies are offset by 1
                this._dayMap[state.day] = idx + 1;
            }
            day = state.day;
        });
    }

    getStateById(id) {
        // State 0 is initial state to external consumers
        if(id == 0) return this._initialState;

        return this._states[id - 1];
    }

    getDayMappings() {
        return this._dayMap;
    }

    getMaxTurnId() {
        return this._states.length;
    }

    async addLogBookEntry(entry) {
        this._logBook.push(entry);

        const insertIndex = this._logBook.length - 1;
        await this._processActions(insertIndex, insertIndex);
    }

    async save({ lite = false } = {}) {
        await this._ready;

        // In lite mode only save the first state and rebuild the rest on load
        let gameStates = [this._initialState];
        if(!lite) gameStates = gameStates.concat(this._states);

        await writeJson(this._path, {
            versions: {
                fileFormat: FILE_FORMAT_VERSION,
            },
            logBook: this._logBook,
            gameStates,
        });
    }
}

let gamePromises = {
    "demo": Game.load("../example/tank_game_v3.json")
};

export async function getGame(name) {
    return gamePromises[name];
}
