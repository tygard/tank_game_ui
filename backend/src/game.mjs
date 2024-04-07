import fs from "node:fs/promises";
import {getEngine} from "./tank-game-engine.mjs";
import path from "node:path";
import { getLogger } from "./logging.mjs"
import { format } from "./utils.mjs";

const logger = getLogger(import.meta.url);

const FILE_FORMAT_VERSION = 2;

const VERSION_SPECIFIC_CONFIG = {
    3: {
        entryFormatters: {
            start_of_day: "Start of day {day}",
            move: "{subject} moved to {position}",
            shoot: "{subject} shot at {position} ({hit})",
            buy_action: "{subject} bought some number of actions with {quantity} gold",
            donate: "{subject} donated {quantity} pre-tax gold to {target}",
            upgrade_range: "{subject} upgraded their range",
            bounty: "{subject} placed a {quantity} gold bounty on {target}",
            stimulus: "{subject} granted a stimulus of 1 action to {target}",
            grant_life: "{subject} granted 1 life to {target}",
        }
    }
};


async function readJson(path) {
    return JSON.parse(await fs.readFile(path, "utf-8"));
}

async function writeJson(path, data) {
    return await fs.writeFile(path, JSON.stringify(data, null, 4));
}

class Game {
    constructor(path, gameVersion, initialState, logBook, possibleActions) {
        this._gameVersion = gameVersion;
        this._path = path;
        this._initialState = initialState;
        this._states = [];
        this._logBook = logBook || [];
        this._possibleActions = possibleActions || [];
        this._ready = Promise.resolve();
        this._liteMode = true;

        this._buildDayMap();

        // Process any unprocessed log book entries.
        this._processActions();
    }

    static async load(filePath) {
        let content = await readJson(filePath);

        if(content?.versions?.fileFormat > FILE_FORMAT_VERSION) {
            throw new Error(`File version ${content?.versions?.fileFormat} is not supported`);
        }

        // Version 1 used a states array instead of initialState and only supported game version 3
        if(content?.versions?.fileFormat == 1) {
            content.initialState = content.gameStates[0];
            delete content.states;
            content.versions.game = 3;
        }

        const game = new Game(filePath, content.versions.game, content.initialState, content.logBook, content.possibleActions);

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

        this._versionSpecific = VERSION_SPECIFIC_CONFIG[this._gameVersion];
        if(!this._versionSpecific) {
            throw new Error(`Unsupported game version ${this._gameVersion}`);
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
            const state = await this._engine.processAction(this._logBook[i]);
            this._states.splice(i, 0, state); // Insert state at i
        }

        await this._rebuildGeneratedState();
    }

    async _rebuildGeneratedState() {
        this._buildDayMap();
        this._buildGameStatesSummary();

        // Get the list of actions that can be taken after this one
        this._possibleActions = this._hackPossibleActions(await this._engine.getPossibleActions());
    }

    async _sendPreviousState(stateIndex) {
        // Send our previous state to tank game
        const initialState = stateIndex === 0 ?
            this._initialState : this._states[stateIndex - 1];
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
            const logEntry = this._logBook[i];
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
        if(id == 0) return this._initialState;

        return this._states[id - 1];
    }

    getDayMappings() {
        return this._dayMap;
    }

    getMaxTurnId() {
        return this._states.length;
    }

    getPossibleActions() {
        return this._possibleActions;
    }

    async _addLogBookEntry(entry) {
        await this._sendPreviousState(this._states.length);

        const state = await this._engine.processAction(entry);
        if(!state.valid) {
            throw new Error(state.error);
        }

        if(this._logBook.length != this._states.length) {
            throw new Error(`Logbook length and states length should be identical (log book = ${this._logBook.length}, states = ${this._states.length})`);
        }

        this._logBook.push(entry);
        this._states.push(state);

        await this._rebuildGeneratedState();
        await this.save({ skipReadyCheck: true });
    }

    async addLogBookEntry(entry) {
        // This implies that we've waited for this._ready to finish
        await this._processActions();

        const promise = this._addLogBookEntry(entry);

        // Swallow the error before setting ready so we don't fail future submissions
        this._ready = promise.catch(() => {});

        return await promise;
    }

    async save({ skipReadyCheck = false } = {}) {
        if(!skipReadyCheck) await this._ready;

        await writeJson(this._path, {
            versions: {
                fileFormat: FILE_FORMAT_VERSION,
                game: this._gameVersion,
            },
            logBook: this._logBook,
            initialState: this._initialState,
        });
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

    _hackPossibleActions(possibleActions, user) {
        logger.debug({ "msg": "Dump possible actions", possibleActions, user });

        let actions = {};

        for(const action of possibleActions) {
            const actionType = action.rules;
            const userType = action.subject.type;

            // Location is a location if it's a space but if its a player it's a target
            const targetKey = action.target?.name ? "target" : "location";

            let fields = actions[actionType];
            if(!fields) {
                actions[actionType] = fields = [];

                const descriptor = this._actionTemplate[userType][actionType];
                logger.info({ msg: "Dump descriptor", descriptor });
                for(const field in descriptor.fields) {
                    let fieldSpec = {
                        name: field.name
                    };

                    if(field.type == "Integer") {
                        fieldSpec.type = "input-number";
                    }
                    else if(field.type == "Boolean") {
                        fieldSpec.type = "select";
                        fieldSpec.options = [];
                    }
                    else if(["Tank", "Position"].includes(field.type)) {
                        fieldSpec.type = "select";
                        fieldSpec.options = [];
                    }
                    else {
                        throw new Error(`Unsupported field type: ${field.type}`);
                    }

                    fields.push(fieldSpec);
                }
            }

            logger.debug({ msg: "Dump action", action });

            for(const key of Object.keys(action)) {
                // Skip speical keys
                if(["subject", "rule"].includes(key)) continue;

                let fieldSpec = fields.find(option => option.name === targetKey);

                if(fieldSpec && fieldSpec.options) {
                    let value = action[key];

                    // Target has a position type
                    if(typeof value == "object" && Object.keys(value).length === 1) {
                        value = value[Object.keys(value)[0]];
                    }

                    fieldSpec.options.push();
                }
            }
        }

        logger.debug({ msg: "Dump actions", actions });

        return actions;
    }
}

async function loadGamesFromFolder(dir) {
    let games = {};

    for(const gameFile of await fs.readdir(dir)) {
        const filePath = path.join(dir, gameFile);
        const name = path.parse(gameFile).name;

        logger.info(`Loading ${name} from ${filePath}`);
        games[name] = Game.load(filePath);
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
