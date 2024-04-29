import assert from "node:assert";
import { LogBook } from "../../../common/state/log-book/log-book.mjs";
import { GameInteractor } from "../../../common/game/game-interactor.mjs";
import { LogEntry } from "../../../common/state/log-book/entry.mjs";

const GAME_VERSION = 3;


export class MockEngine {
    constructor() {
        this._returnIdx = 1;
        this.operations = [];
        this.throwOnNext = false;
        this.processingDelays = [];
        this._currentDelay = 0;
    }

    getGameStateFromEngineState(state) {
        return {
            converted: true,
            ...state
        };
    }

    wereAllDelaysApplied() {
        return this.processingDelays.length == this._currentDelay;
    }

    _delayOp() {
        if(this.processingDelays) {
            return new Promise(resolve => setTimeout(resolve, this.processingDelays[this._currentDelay++]));
        }
    }

    async processAction(logEntry) {
        if(this.throwOnNext) {
            this.throwOnNext = false;
            throw new Error("Oops");
        }

        await this._delayOp();

        this.operations.push({ operation: "process-action",  logEntry });
        return { stateNo: ++this._returnIdx };
    }

    async setBoardState(state) {
        await this._delayOp();
        this.operations.push({ operation: "set-state",  state });
    }

    async setGameVersion(version) {
        await this._delayOp();
        this.operations.push({ operation: "set-version", version });
    }
}


async function configureInteractor(logEntries, { saveHandler, waitForLoaded = true, processingDelays } = {}) {
    let logBook = new LogBook(GAME_VERSION, logEntries, undefined);
    let initialGameState = { stateNo: 1 };

    let mockEngine = new MockEngine();
    mockEngine.processingDelays = processingDelays;
    let interactor = new GameInteractor(mockEngine, { logBook, initialGameState }, saveHandler);

    if(waitForLoaded) await interactor.loaded;

    return { logBook, interactor, mockEngine, initialGameState };
}

function getAllStates(interactor, logEntryCounts) {
    let states = [];
    // Get all of the generated states +1 to be sure we only generated the expected number of states
    for(let i = 0; i <= logEntryCounts; ++i) {
        states.push(interactor.getGameStateById(i));
    }

    return states;
}

function getAllLogBookEntries(logBook) {
    let entries = [];
    for(let i = 0; i <= logBook.getLastEntryId(); ++i) {
        entries.push(logBook.getEntry(i));
    }
    return entries;
}


describe("GameInteractor", () => {
    it("can process the actions in the logbook on startup", async () => {
        let logEntries = [
            new LogEntry(1, { action: "sit" }, 0),
            new LogEntry(1, { action: "stand" }, 1),
            new LogEntry(2, { action: "walk" }, 2),
        ];

        const { interactor, mockEngine, initialGameState } = await configureInteractor(logEntries);

        assert.deepEqual(mockEngine.operations, [
            { operation: "set-version", version: GAME_VERSION },
            { operation: "set-state", state: initialGameState },
            { operation: "process-action", logEntry: logEntries[0] },
            { operation: "process-action", logEntry: logEntries[1] },
            { operation: "process-action", logEntry: logEntries[2] },
        ]);

        assert.deepEqual(getAllStates(interactor, logEntries.length), [
            { stateNo: 2, converted: true },
            { stateNo: 3, converted: true },
            { stateNo: 4, converted: true },
            undefined,
        ]);
    });

    it("can process new actions", async () => {
        let logEntries = [
            new LogEntry(1, { action: "sit" }, 0),
        ];

        const { logBook, interactor, mockEngine } = await configureInteractor(logEntries);

        // Reset operations after initialization
        mockEngine.operations = [];

        const rawEntry = { action: "run" };
        let newEntry = new LogEntry(1, rawEntry, 1);
        await interactor.addLogBookEntry(rawEntry);

        assert.deepEqual(mockEngine.operations, [
            { operation: "set-version", version: GAME_VERSION },
            { operation: "set-state", state: { stateNo: 2 } },
            { operation: "process-action", logEntry: newEntry },
        ]);

        assert.deepEqual(getAllLogBookEntries(logBook), [
            logEntries[0],
            newEntry,
        ]);

        assert.deepEqual(getAllStates(interactor, 2 /* expect 2 states (loads 3) */), [
            { stateNo: 2, converted: true },
            { stateNo: 3, converted: true },
            undefined,
        ]);
    });

    it("can save after processing actions", async () => {
        let saveHandler;
        let promise = new Promise(resolve => saveHandler = resolve);
        assert.ok(saveHandler);  // Sanity check that the promise callback has been called

        const { interactor, initialGameState, logBook } = await configureInteractor([], { saveHandler });

        await interactor.addLogBookEntry({ action: "run" });

        const saveData = await promise;
        assert.deepEqual(saveData, {
            initialGameState,
            logBook,
        });
    });

    it("can process valid actions after failing actions", async () => {
        const { interactor, mockEngine, logBook } = await configureInteractor([]);

        mockEngine.throwOnNext = true;
        let error;
        try {
            await interactor.addLogBookEntry({ action: "fails" });
        }
        catch(err) {
            error = err;
        }

        assert.ok(error);

        // Make sure that bad action didn't get added
        assert.equal(logBook.getLastEntryId(), -1);
        assert.deepEqual(getAllStates(interactor, 0 /* expect 0 states (loads 1) */), [
            undefined,
        ]);

        await interactor.addLogBookEntry({ action: "passes" });

        // Make sure the good action did get added
        assert.equal(logBook.getLastEntryId(), 0);
        assert.deepEqual(getAllStates(interactor, 1 /* expect 1 states (loads 2) */), [
            { stateNo: 2, converted: true },
            undefined,
        ]);
    });

    it("can process actions in order and all promises waits for all promises to resolve", async () => {
        let logEntries = [
            new LogEntry(1, { action: "sit" }, 0),
            new LogEntry(1, { action: "stand" }, 1),
            new LogEntry(2, { action: "walk" }, 2),
        ];

        const initialDelay = 3;
        const firstAddActionDelay = 5;
        const secondAddActionDelay = 1;

        const startTime = Date.now();
        const { interactor, mockEngine, logBook, initialGameState } = await configureInteractor(logEntries, {
            waitForLoaded: false,
            processingDelays: [
                initialDelay, initialDelay, // Set state + version
                initialDelay, initialDelay, initialDelay, // process initial log book
                firstAddActionDelay, firstAddActionDelay, firstAddActionDelay, // set state + version then process action
                secondAddActionDelay, secondAddActionDelay, secondAddActionDelay, // set state + version then process action
            ],
        });

        const rawEntry = { action: "run" };
        let newEntry = new LogEntry(2, rawEntry, 3);
        let newEntry2 = new LogEntry(2, rawEntry, 4);
        mockEngine.processingDelay = firstAddActionDelay;
        interactor.addLogBookEntry(rawEntry);
        mockEngine.processingDelay = secondAddActionDelay;

        await interactor.addLogBookEntry(rawEntry);
        const totalTime = Date.now() - startTime;
        const expectedTime = (initialDelay * 4) + (firstAddActionDelay * 2) + (secondAddActionDelay * 2);
        assert.ok(mockEngine.wereAllDelaysApplied(), `Expected time to be close to ${expectedTime} but it was ${totalTime}`);

        assert.deepEqual(mockEngine.operations, [
            { operation: "set-version", version: GAME_VERSION },
            { operation: "set-state", state: initialGameState },
            { operation: "process-action", logEntry: logEntries[0] },
            { operation: "process-action", logEntry: logEntries[1] },
            { operation: "process-action", logEntry: logEntries[2] },
            { operation: "set-version", version: GAME_VERSION },
            { operation: "set-state", state: { stateNo: 4 } },
            { operation: "process-action", logEntry: newEntry },
            { operation: "set-version", version: GAME_VERSION },
            { operation: "set-state", state: { stateNo: 5 } },
            { operation: "process-action", logEntry: newEntry2 },
        ]);

        assert.deepEqual(getAllLogBookEntries(logBook), [
            logEntries[0],
            logEntries[1],
            logEntries[2],
            newEntry,
            newEntry2,
        ]);

        assert.deepEqual(getAllStates(interactor, 5 /* expect 5 states (loads 6) */), [
            { stateNo: 2, converted: true },
            { stateNo: 3, converted: true },
            { stateNo: 4, converted: true },
            { stateNo: 5, converted: true },
            { stateNo: 6, converted: true },
            undefined,
        ]);
    });
});
