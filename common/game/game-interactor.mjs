export class GameInteractor {
    constructor(engine, { logBook, initialGameState }, saveHandler) {
        this._saveHandler = saveHandler;
        this._engine = engine;
        this._logBook = logBook;
        this._initialGameState = initialGameState;
        this._gameStates = [];
        this._ready = Promise.resolve();

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

        await this._sendPreviousState(startIndex);

        // Remove any states that might already be there
        this._gameStates.splice(startIndex, (endIndex - startIndex) + 1);

        for(let i = startIndex; i <= endIndex; ++i) {
            const logEntry = this._logBook.getEntry(i);
            const state = await this._engine.processAction(logEntry);
            this._gameStates.splice(i, 0, state); // Insert state at i
        }
    }

    async _sendPreviousState(currentStateIndex) {
        await this._engine.setGameVersion(this._logBook.gameVersion);

        const previousStateIndex = currentStateIndex - 1;

        // Send our previous state to the engine
        const previousState =  previousStateIndex === -1 ?
            this._initialGameState :
            this._gameStates[previousStateIndex];

        if(!previousState) {
            throw new Error(`Expected a state at index ${previousStateIndex}`);
        }

        await this._engine.setBoardState(previousState);
    }

    getGameStateById(id) {
        return this._gameStates[id];
    }

    async _addLogBookEntry(entry) {
        if(this._gameStates.length !== this._logBook.getLastEntryId() + 1) { // +1 for index to length
            throw new Error(`Logbook length and states length should be identical (log book = ${this._logBook.getLastEntryId() + 1}, states = ${this._gameStates.length})`);
        }

        await this._sendPreviousState(this._gameStates.length);
        const state = await this._engine.processAction(entry);

        this._logBook.addEntry(entry);
        this._gameStates.push(state);

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

        await this._sendPreviousState(this._gameStates.length);
        return await this._engine.canProcessAction(entry);
    }

    _handleNewEntry(entry, handlerName) {
        const promise = this._ready.then(() => {
            return this[handlerName](this._logBook.makeEntryFromRaw(entry))
        });

        // Swallow the error before setting ready so we don't fail future submissions
        this._ready = promise.catch(() => {});

        return promise;
    }

    addLogBookEntry(entry) {
        return this._handleNewEntry(entry, "_addLogBookEntry")
    }

    canProcessAction(entry) {
        return this._handleNewEntry(entry, "_canProcessAction")
    }

    shutdown() {
        return this._engine.shutdown();
    }
}
