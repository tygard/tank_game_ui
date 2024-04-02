import fs from "node:fs/promises";
import {getEngine} from "./tank-game-engine.mjs";
import path from "node:path";
import { throws } from "node:assert";

const FILE_FORMAT_VERSION = 1;


async function readJson(path) {
    return JSON.parse(await fs.readFile(path, "utf-8"));
}

async function writeJson(path, data) {
    return await fs.writeFile(path, JSON.stringify(data, null, 4));
}

class Game {
    constructor(path, states, logBook, possibleActions) {
        this._path = path;
        this._initialState = states[0]
        this._states = states.slice(1);
        this._logBook = logBook || [];
        this._possibleActions = possibleActions || [];
        this._ready = Promise.resolve();
        this._liteMode = this._logBook.length == this._states.length;

        this._buildDayMap();

        // Process any unprocessed log book entries.
        this._processActions();
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

        const game = new Game(filePath, content.gameStates, content.logBook, content.possibleActions);

        // Loading a game like this can cause a lot of actions to be processed
        // wait until they're done before returning the game object
        await game._ready;

        return game;
    }

    async _processActions() {
        await this._ready;  // Wait for any pending action processing

        this._ready = this._processActionsLogic();
        await this._ready;
    }

    async _processActionsLogic() {
        // Nothing to process
        if(this._states.length === this._logBook.length) return;

        const startIndex = this._states.length;
        const endIndex = this._logBook.length - 1;

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
        this._findAllUsers();

        // Get the list of actions each user can take after this one
        this._possibleActions = {};

        for(const user of this.getAllUsers()) {
            this._possibleActions[user] = await engine.getPossibleActionsFor(user);
        }

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

    _findAllUsers() {
        const state = this.getStateById(this.getMaxTurnId());
        if(!state?.gameState) return [];
        const gameState = state.gameState;

        let users = new Set([
            ...gameState.council.council,
            ...gameState.council.senate
        ]);

        for(const row of gameState.board.unit_board) {
            for(const space of row) {
                if(space.name) {
                    users.add(space.name);
                }
            }
        }

        this._users = Array.from(users);
    }

    getAllUsers() {
        if(!this._users) this._findAllUsers();

        return this._users;
    }

    getPossibleActionsFor(user) {
        return this._possibleActions[user];
    }

    async addLogBookEntry(entry) {
        this._logBook.push(entry);
        const turnId = this._logBook.length;

        // Process any pending actions
        await this._processActions();

        return turnId;
    }

    async save() {
        await this._ready;

        // In lite mode only save the first state and rebuild the rest on load
        let gameStates = [this._initialState];
        if(!this._liteMode) gameStates = gameStates.concat(this._states);

        // Data to add if we're not in lite mode
        const extendedData = this._liteMode ? undefined : {
            possibleActions: this._possibleActions,
        };

        await writeJson(this._path, {
            versions: {
                fileFormat: FILE_FORMAT_VERSION,
            },
            logBook: this._logBook,
            gameStates,
            ...extendedData,
        });
    }
}

async function loadGamesFromFolder(dir) {
    let games = {};

    for(const gameFile of await fs.readdir(dir)) {
        const filePath = path.join(dir, gameFile);
        const name = path.parse(gameFile).name;

        console.log(`Loading ${name} from ${filePath}`);
        games[name] = Game.load(filePath);
    }

    return games;
}

let gamePromises = loadGamesFromFolder(process.env.TANK_GAMES_FOLDER);

export async function getGame(name) {
    return await (await gamePromises)[name];
}
