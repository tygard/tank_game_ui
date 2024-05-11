import { logger } from "#platform/logging.mjs";
import { AutomaticStartOfDay } from "../open-hours/automatic-start-of-day.mjs";
import { PromiseLock } from "../../utils.mjs";

export class GameInteractor {
    constructor(engine, { logBook, initialGameState, openHours }, saveHandler) {
        this._saveHandler = saveHandler;
        this._engine = engine;
        this._logBook = logBook;
        this._gameStates = [];
        this._lock = new PromiseLock();
        this._initialGameState = this._previousState = initialGameState;
        this._openHours = openHours;

        // Process any unprocessed log book entries.
        this.loaded = this._processActions();

        if(openHours?.hasAutomaticStartOfDay?.()) {
            this._automaticStartOfDay = new AutomaticStartOfDay(this);
            this.loaded.then(() => this._automaticStartOfDay.start());
        }
    }

    getLogBook() {
        return this._logBook;
    }

    _processActions() {
        // Wait for any pending action processing
        return this._lock.use(() => this._processActionsLogic());
    }

    async _processActionsLogic() {
        // Nothing to process
        if(this._gameStates.length === this._logBook.getLastEntryId() + 1) return; // +1 for index to length

        const startIndex = this._gameStates.length;
        const endIndex = this._logBook.getLastEntryId();

        if(startIndex > endIndex) {
            throw new Error(`startIndex (${startIndex}) can't be larger than endIndex (${endIndex})`);
        }

        await this.sendPreviousState(startIndex);

        // Remove any states that might already be there
        this._gameStates.splice(startIndex, (endIndex - startIndex) + 1);

        for(let i = startIndex; i <= endIndex; ++i) {
            const logEntry = this._logBook.getEntry(i);
            const state = await this._engine.processAction(logEntry);
            this._previousState = state;
            this._gameStates.splice(i, 0, this._engine.getGameStateFromEngineState(state)); // Insert state at i
        }
    }

    async sendPreviousState() {
        await this._engine.setGameVersion(this._logBook.gameVersion);
        await this._engine.setBoardState(this._previousState);
    }

    getGameStateById(id) {
        return this._gameStates[id];
    }

    getOpenHours() {
        return this._openHours;
    }

    isGameOpen() {
        return this._openHours !== undefined ?
            this._openHours.isGameOpen() : true;
    }

    _throwIfGameNotOpen() {
        if(!this.isGameOpen()) {
            throw new Error("You're currently outside this games open hours.  New actions will be blocked until the game opens back up.");
        }
    }

    async _addLogBookEntry(entry) {
        if(this._gameStates.length !== this._logBook.getLastEntryId() + 1) { // +1 for index to length
            throw new Error(`Logbook length and states length should be identical (log book = ${this._logBook.getLastEntryId() + 1}, states = ${this._gameStates.length})`);
        }

        this._throwIfGameNotOpen();

        await this.sendPreviousState();
        const state = await this._engine.processAction(entry);
        this._previousState = state;

        this._logBook.addEntry(entry);
        this._gameStates.push(this._engine.getGameStateFromEngineState(state));

        logger.info({
            msg: "Add logbook entry",
            entry,
        });

        // Save the modified log book if we know were to save it too
        if(this._saveHandler) {
            await this._saveHandler({
                initialGameState: this._initialGameState,
                logBook: this._logBook,
                openHours: this._openHours,
            });
        }
    }

    async _canProcessAction(entry) {
        if(this._gameStates.length !== this._logBook.getLastEntryId() + 1) { // +1 for index to length
            throw new Error(`Logbook length and states length should be identical (log book = ${this._logBook.getLastEntryId() + 1}, states = ${this._gameStates.length})`);
        }

        this._throwIfGameNotOpen();

        await this.sendPreviousState();

        let success = false;
        try {
            await this._engine.processAction(entry);
            success = true;
        }
        catch(err) {}  // eslint-disable-line no-unused-vars, no-empty

        return success;
    }

    addLogBookEntry(entry) {
        return this._lock.use(() => {
            return this._addLogBookEntry(this._logBook.makeEntryFromRaw(entry));
        });
    }

    canProcessAction(entry) {
        return this._lock.use(() => {
            return this._canProcessAction(this._logBook.makeEntryFromRaw(entry));
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
}
