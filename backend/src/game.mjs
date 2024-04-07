import fs from "node:fs/promises";
import {getEngine} from "./tank-game-engine.mjs";
import path from "node:path";
import { getLogger } from "./logging.mjs"
import { format } from "./utils.mjs";
import { GameFile } from "./game-file.mjs";
import { VERSION_SPECIFIC_CONFIG } from "./version-specific-config.mjs";

const logger = getLogger(import.meta.url);


class Game {
    constructor(gameFile) {
        this._gameFile = gameFile;
        this._states = [];
        this._ready = Promise.resolve();

        this._buildDayMap();

        // Process any unprocessed log book entries.
        this._processActions();
    }

    async _processActions() {
        await this._ready;  // Wait for any pending action processing

        this._ready = this._processActionsLogic();
        await this._ready;
    }

    async _processActionsLogic() {
        // Nothing to process
        if(this._states.length === this._gameFile.getNumLogEntries()) return;

        const startIndex = this._states.length;
        const endIndex = this._gameFile.getNumLogEntries() - 1;

        if(startIndex > endIndex) {
            throw new Error(`startIndex (${startIndex}) can't be larger than endIndex (${endIndex})`);
        }

        if(endIndex >= this._gameFile.getNumLogEntries()) {
            throw new Error(`Index ${endIndex} is past the end of the logbook`);
        }

        this._versionSpecific = VERSION_SPECIFIC_CONFIG[this._gameFile.gameVersion];
        if(!this._versionSpecific) {
            throw new Error(`Unsupported game version ${this._gameFile.gameVersion}`);
        }

        // If the tank game engine isn't already running start it
        if(!this._engine) {
            this._engine = getEngine();
        }

        if(!this._actionTemplate) {
            this._parseActionTemplate(await this._engine.getActionTemplate());
        }

        await this._sendPreviousState(startIndex);

        // Remove any states that might already be there
        this._states.splice(startIndex, (endIndex - startIndex) + 1);

        for(let i = startIndex; i <= endIndex; ++i) {
            const state = await this._engine.processAction(this._gameFile.getLogEntryAt(i));
            this._states.splice(i, 0, state); // Insert state at i
        }

        await this._rebuildGeneratedState();
    }

    async _rebuildGeneratedState() {
        this._buildDayMap();
        this._buildGameStatesSummary();
    }

    getActionTemplate() {
        return this._actionTemplate;
    }

    async _sendPreviousState(stateIndex) {
        // Send our previous state to tank game
        const initialState = stateIndex === 0 ?
            this._gameFile.getInitialState() : this._states[stateIndex - 1];
        if(!initialState) {
            throw new Error(`Expected a state at index ${stateIndex}`);
        }

        await this._engine.setBoardState(initialState.gameState);
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

    _buildGameStatesSummary() {
        this._gameStatesSummary = [];

        for(let i = 0; i < this._states.length; ++i) {
            const logEntry = this._gameFile.getLogEntryAt(i);
            const state = this._states[i];

            const actionType = logEntry.action || "start_of_day";
            const formatter = this._versionSpecific.entryFormatters[actionType];
            if(!formatter) {
                throw new Error(`Invlaid log book entry action ${actionType}`);
            }

            this._gameStatesSummary.push({
                logEntryStr: format(formatter, { ...logEntry, hit: logEntry.hit ? "hit" : "miss" }),
                valid: state.valid,
                logEntry,
            });
        }
    }

    getGameStatesSummary() {
        return this._gameStatesSummary;
    }

    getStateById(id) {
        // State 0 is initial state to external consumers
        if(id == 0) return this._gameFile.getInitialState();

        return this._states[id - 1];
    }

    getDayMappings() {
        return this._dayMap;
    }

    getMaxTurnId() {
        return this._states.length;
    }


    async _addLogBookEntry(entry) {
        await this._sendPreviousState(this._states.length);

        const state = await this._engine.processAction(entry);
        if(!state.valid) {
            throw new Error(state.error);
        }

        if(this._gameFile.getNumLogEntries() != this._states.length) {
            throw new Error(`Logbook length and states length should be identical (log book = ${this._gameFile.getNumLogEntries()}, states = ${this._states.length})`);
        }

        this._gameFile.addLogBookEntry(entry);
        this._states.push(state);

        await this._rebuildGeneratedState();
        await this._gameFile.save();
    }

    async addLogBookEntry(entry) {
        // This implies that we've waited for this._ready to finish
        await this._processActions();

        const promise = this._addLogBookEntry(entry);

        // Swallow the error before setting ready so we don't fail future submissions
        this._ready = promise.catch(() => {});

        return await promise;
    }

    _parseActionTemplate(descriptors) {
        this._actionTemplate = {};

        for(const descriptor of descriptors) {
            const userType = descriptor.subject.toLowerCase();
            const actionType = descriptor.name;

            if(!this._actionTemplate[userType]) {
                this._actionTemplate[userType] = {};
            }

            this._actionTemplate[userType][actionType] = descriptor;
        }
    }
}

async function loadGamesFromFolder(dir) {
    let games = {};

    for(const gameFile of await fs.readdir(dir)) {
        const filePath = path.join(dir, gameFile);
        const name = path.parse(gameFile).name;

        logger.info(`Loading ${name} from ${filePath}`);
        games[name] = new Game(await GameFile.load(filePath));
    }

    return games;
}

let gamePromises = loadGamesFromFolder(process.env.TANK_GAMES_FOLDER);

export async function getGame(name) {
    return await (await gamePromises)[name];
}

export async function getGameNames() {
    return Object.keys(await gamePromises);
}
