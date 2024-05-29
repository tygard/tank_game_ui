import { logger } from "#platform/logging.js";
import { AutomaticStartOfDay } from "../open-hours/automatic-start-of-day.js";
import { PromiseLock } from "../../utils.js";

export class GameInteractor {
    constructor({ engine, gameData, saveHandler, actionFactories }) {
        this._saveHandler = saveHandler;
        this._engine = engine;
        this._gameData = gameData;
        this._gameStates = [];
        this._lock = new PromiseLock();
        this._previousState = gameData.initialGameState;
        this._actionFactories = actionFactories;

        // Process any unprocessed log book entries.
        this.loaded = this._processActions();

        if(this._gameData.openHours?.hasAutomaticStartOfDay?.()) {
            this._automaticStartOfDay = new AutomaticStartOfDay(this);
            this.loaded.then(() => this._automaticStartOfDay.start());
        }
    }

    getLogBook() {
        return this._gameData.logBook;
    }

    _processActions() {
        // Wait for any pending action processing
        return this._lock.use(() => this._processActionsLogic());
    }

    async _processActionsLogic() {
        // Nothing to process
        if(this._gameStates.length === this._gameData.logBook.getLength()) return;

        const startIndex = this._gameStates.length;
        const endIndex = this._gameData.logBook.getLastEntryId();

        if(startIndex > endIndex) {
            throw new Error(`startIndex (${startIndex}) can't be larger than endIndex (${endIndex})`);
        }

        await this._sendPreviousState();

        for(let i = startIndex; i <= endIndex; ++i) {
            let logEntry = this._gameData.logBook.getEntry(i);

            // Format log entry with previous state
            const previousState = this._gameStates[this._gameStates.length - 1] ||
                this._engine.getGameStateFromEngineState(this._gameData.initialGameState);

            logEntry.updateMessageWithBoardState({
                previousState,
                actions: await this.getActions(logEntry.rawLogEntry.subject, {
                    day: logEntry.day,
                }),
            });

            // Process the action
            const state = await this._engine.processAction(logEntry);
            this._previousState = state;
            const gameState = this._engine.getGameStateFromEngineState(state)
            this._gameStates.splice(i, 0, gameState); // Insert state at i
        }
    }

    async _sendPreviousState() {
        await this._engine.setGameVersion(this._gameData.logBook.gameVersion);
        await this._engine.setBoardState(this._previousState);
    }

    getGameStateById(id) {
        return this._gameStates[id];
    }

    getOpenHours() {
        return this._gameData.openHours;
    }

    isGameOpen() {
        return this._gameData.openHours !== undefined ?
            this._gameData.openHours.isGameOpen() : true;
    }

    _throwIfGameNotOpen() {
        if(!this.isGameOpen()) {
            throw new Error("You're currently outside this games open hours.  New actions will be blocked until the game opens back up.");
        }
    }

    async _addLogBookEntry(entry) {
        if(this._gameStates.length !== this._gameData.logBook.getLength()) {
            throw new Error(`Logbook length and states length should be identical (log book = ${this._gameData.logBook.getLength()}, states = ${this._gameStates.length})`);
        }

        this._throwIfGameNotOpen();

        await this._sendPreviousState();

        // Format log entry with previous state
        entry.updateMessageWithBoardState({
            previousState: this._gameStates[this._gameStates.length - 1],
            actions: await this.getActions(entry.rawLogEntry.subject),
        });

        const state = await this._engine.processAction(entry);
        this._previousState = state;

        const gameState = this._engine.getGameStateFromEngineState(state);

        this._gameData.logBook.addEntry(entry);
        this._gameStates.push(gameState);

        logger.info({
            msg: "Add logbook entry",
            entry,
        });

        // Save the modified log book if we know were to save it too
        if(this._saveHandler) {
            await this._saveHandler(this._gameData);
        }

        return entry;
    }

    async _canProcessAction(entry) {
        if(this._gameStates.length !== this._gameData.logBook.getLength()) {
            throw new Error(`Logbook length and states length should be identical (log book = ${this._gameData.logBook.getLength()}, states = ${this._gameStates.length})`);
        }

        this._throwIfGameNotOpen();

        await this._sendPreviousState();

        let success = false;
        try {
            await this._engine.processAction(entry);
            success = true;
        }
        catch(err) {}  // eslint-disable-line no-unused-vars, no-empty

        return success;
    }

    async _finalizeEntry(entry) {
        const {allowManualRolls} = this.getSettings();
        const lastState = this.getGameStateById(this._gameData.logBook.getLastEntryId());
        entry = this._gameData.logBook.makeEntryFromRaw(entry);
        entry.finalizeEntry({
            gameState: lastState,
            allowManualRolls,
            actions: await this.getActions(entry.rawLogEntry.subject),
        });
        return entry;
    }

    addLogBookEntry(entry) {
        return this._lock.use(async () => {
            return this._addLogBookEntry(await this._finalizeEntry(entry));
        });
    }

    canProcessAction(entry) {
        return this._lock.use(async () => {
            return this._canProcessAction(await this._finalizeEntry(entry));
        });
    }

    shutdown() {
        if(this._automaticStartOfDay) {
            this._automaticStartOfDay.stop();
        }

        return this._engine.shutdown();
    }

    hasAutomaticStartOfDay() {
        return !!this._automaticStartOfDay;
    }

    getSettings() {
        let settings = this._gameData.gameSettings || {};

        if(settings.allowManualRolls === undefined) {
            settings.allowManualRolls = true;
        }

        return settings;
    }

    // Some action factories communicate with the backend directly so it's assumed we're on the state before this action is submitted
    async _getActions(playerName, { day } = {}) {
        const {logBook} = this._gameData;
        const lastEntryId = logBook.getLastEntryId();

        const gameState = this.getGameStateById(lastEntryId) ||
            this._engine.getGameStateFromEngineState(this._gameData.initialGameState);

        return await this._actionFactories.getActionFactoriesForPlayer({
            playerName,
            logBook,
            day: day === undefined ? logBook.getMaxDay() : day,
            gameState,
            interactor: this,
            engine: this._engine,
        });
    }

    async getActions(playerName) {
        return await this._getActions(playerName);
    }
}
