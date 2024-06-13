import { logger } from "#platform/logging.js";
import { PromiseLock } from "../../utils.js";

export class GameInteractor {
    constructor({ engine, gameData, saveHandler, actionFactories, onEntryAdded }) {
        this._saveHandler = saveHandler;
        this._engine = engine;
        this._gameData = gameData;
        this._gameStates = [];
        this._lock = new PromiseLock();
        this._previousState = gameData.initialGameState;
        this._actionFactories = actionFactories;
        this._onEntryAdded = onEntryAdded;

        // Process any unprocessed log book entries.
        this.loaded = this._processActions();
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

        for(let entryId = startIndex; entryId <= endIndex; ++entryId) {
            let logEntry = this._gameData.logBook.getEntry(entryId);

            // Format log entry with previous state
            const previousState = this._gameStates[this._gameStates.length - 1] ||
                this._engine.getGameStateFromEngineState(this._gameData.initialGameState);

            logEntry.updateMessageWithBoardState({
                previousState,
                actions: await this._getActions(logEntry.rawLogEntry.subject, {
                    entryId: entryId,
                }),
            });

            // Process the action
            const state = await this._engine.processAction(logEntry);
            this._previousState = state;
            const gameState = this._engine.getGameStateFromEngineState(state)
            this._gameStates.push(gameState);

            if(this._onEntryAdded) {
                this._onEntryAdded(entryId);
            }
        }
    }

    async _sendPreviousState() {
        await this._engine.setGameVersion(this._gameData.logBook.gameVersion);
        await this._engine.setBoardState(this._previousState);
    }

    getGameStateById(id) {
        return this._gameStates[id];
    }

    async _addLogBookEntry(entry) {
        if(this._gameStates.length !== this._gameData.logBook.getLength()) {
            throw new Error(`Logbook length and states length should be identical (log book = ${this._gameData.logBook.getLength()}, states = ${this._gameStates.length})`);
        }

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

        if(this._onEntryAdded) {
            this._onEntryAdded(this._gameData.logBook.getLastEntryId());
        }

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
        const lastState = this.getGameStateById(this._gameData.logBook.getLastEntryId());
        entry = this._gameData.logBook.makeEntryFromRaw(entry);
        entry.finalizeEntry({
            gameState: lastState,
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
        return this._engine.shutdown();
    }

    // Some action factories communicate with the backend directly so it's assumed we're on the state before this action is submitted
    async _getActions(playerName, { entryId } = {}) {
        const {logBook} = this._gameData;
        if(entryId === undefined) {
            entryId = logBook.getLength();
        }

        const gameState = entryId > 0 ?
            this.getGameStateById(entryId - 1) :
            this._engine.getGameStateFromEngineState(this._gameData.initialGameState);

        const logEntry = logBook.getEntry(entryId);

        return await this._actionFactories.getActionFactoriesForPlayer({
            playerName,
            day: logEntry !== undefined ? logEntry.day : logBook.getMaxDay(),
            gameState,
            engine: this._engine,
        });
    }

    async getActions(playerName) {
        return await this._getActions(playerName);
    }
}
