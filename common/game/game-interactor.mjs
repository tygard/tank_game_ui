export class GameInteractor {
    constructor(engine, { logBook, initialGameState }, saveHandler) {
        this._saveHandler = saveHandler;
        this._engine = engine;
        this._logBook = logBook;
        this._gameStates = [];
        this._ready = Promise.resolve();
        this._initialGameState = this._previousState = initialGameState;

        // Process any unprocessed log book entries.
        this.loaded = this._processActions();
    }

    getLogBook() {
        return this._logBook;
    }

    _processActions() {
        // Wait for any pending action processing
        this._ready = this._ready.then(() => this._processActionsLogic());
        return this._ready;
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

    async _addLogBookEntry(entry) {
        if(this._gameStates.length !== this._logBook.getLastEntryId() + 1) { // +1 for index to length
            throw new Error(`Logbook length and states length should be identical (log book = ${this._logBook.getLastEntryId() + 1}, states = ${this._gameStates.length})`);
        }

        await this.sendPreviousState();
        const state = await this._engine.processAction(entry);
        this._previousState = state;

        this._logBook.addEntry(entry);
        this._gameStates.push(this._engine.getGameStateFromEngineState(state));

        // Save the modified log book if we know were to save it too
        if(this._saveHandler) {
            await this._saveHandler({
                initialGameState: this._initialGameState,
                logBook: this._logBook,
            });
        }
    }

    async _canProcessAction(entry) {
        if(this._gameStates.length !== this._logBook.getLastEntryId() + 1) { // +1 for index to length
            throw new Error(`Logbook length and states length should be identical (log book = ${this._logBook.getLastEntryId() + 1}, states = ${this._gameStates.length})`);
        }

        await this.sendPreviousState();
        return await this._engine.canProcessAction(entry);
    }

    _handleNewEntry(entry, handlerName) {
        const promise = this._ready.then(() => {
            return this[handlerName](this._logBook.makeEntryFromRaw(entry));
        });

        // Swallow the error before setting ready so we don't fail future submissions
        this._ready = promise.catch(() => {});

        return promise;
    }

    addLogBookEntry(entry) {
        return this._handleNewEntry(entry, "_addLogBookEntry");
    }

    canProcessAction(entry) {
        return this._handleNewEntry(entry, "_canProcessAction");
    }

    shutdown() {
        return this._engine.shutdown();
    }
}
