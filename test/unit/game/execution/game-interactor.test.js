import assert from "node:assert";
import { LogBook } from "../../../../src/game/state/log-book/log-book.js";
import { GameInteractor } from "../../../../src/game/execution/game-interactor.js";
import { LogEntry } from "../../../../src/game/state/log-book/entry.js";
import { PossibleActionSourceSet } from "../../../../src/game/possible-actions/index.js";

const GAME_VERSION = 3;


function makeMockState(obj) {
    let state = Object.create({
        board: {
            getFloorTileAt() {},
            getEntityAt() {},
        },
    });

    Object.assign(state, obj);
    return state;
}

export class MockEngine {
    constructor() {
        this._returnIdx = 1;
        this.operations = [];
        this.throwOnNext = false;
        this.processingDelays = [];
        this._currentDelay = 0;
    }

    getGameStateFromEngineState(state) {
        return makeMockState({
            converted: true,
            ...state
        });
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
        return makeMockState({ stateNo: ++this._returnIdx });
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

class MockAction {
    constructor(state) {
        this.state = state;
    }

    getActionName() { return "run"; }

    finalizeLogEntry(rawLogEntry) {
        return {
            panda: 12,
            ...rawLogEntry,
        };
    }
}

class MockActionFactory {
    async getActionFactoriesForPlayer(state) {
        return [new MockAction(state)];
    }
}

async function configureInteractor(logEntries, { saveHandler, waitForLoaded = true, processingDelays, versionConfig, actionFactories = [], onEntryAdded } = {}) {
    let logBook = new LogBook(GAME_VERSION, logEntries, versionConfig);
    let initialGameState = makeMockState({ stateNo: 1 });

    let mockEngine = new MockEngine();
    mockEngine.processingDelays = processingDelays;
    let interactor = new GameInteractor({
        engine: mockEngine,
        gameData: {
            logBook,
            initialGameState,
        },
        saveHandler,
        actionFactories: new PossibleActionSourceSet(actionFactories),
        onEntryAdded,
    });

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

const callsSym = Symbol();
class FakeVersionConfig {
    constructor() {
        this.reset();
    }

    reset() {
        this[callsSym] = [];
    }

    getCalls() {
        return this[callsSym];
    }

    formatLogEntry(logEntry, gameState) {
        // Ignore calls to formatLogEntry from the LogEntry constuctor
        if(gameState) {
            this[callsSym].push([logEntry, gameState]);
            return "";
        }
    }
}


describe("GameInteractor", () => {
    it("can process the actions in the logbook on startup", async () => {
        let versionConfig = new FakeVersionConfig();

        let logEntries = [
            new LogEntry(1, { action: "sit" }, 0, versionConfig),
            new LogEntry(1, { action: "stand" }, 1, versionConfig),
            new LogEntry(2, { action: "walk" }, 2, versionConfig),
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

        assert.deepEqual(versionConfig.getCalls(), [
            // First call is ignored because state is undefined
            [logEntries[0], { stateNo: 1, converted: true }],
            [logEntries[1], { stateNo: 2, converted: true }],
            [logEntries[2], { stateNo: 3, converted: true }],
        ]);
    });

    it("can process new actions", async () => {
        let versionConfig = new FakeVersionConfig();

        let logEntries = [
            new LogEntry(1, { action: "sit" }, 0, versionConfig),
        ];

        const { logBook, interactor, mockEngine } = await configureInteractor(logEntries, {versionConfig});

        // Reset operations after initialization
        mockEngine.operations = [];

        const rawEntry = { action: "run" };
        let newEntry = new LogEntry(1, rawEntry, 1, versionConfig);
        newEntry.updateMessageWithBoardState({
            previousState: { stateNo: 2 },
        });
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

        assert.deepEqual(versionConfig.getCalls(), [
            // First call is ignored because state is undefined
            [logEntries[0], { stateNo: 1, converted: true }],
            [newEntry, { stateNo: 2 }],
            [newEntry, { stateNo: 2, converted: true }],
        ]);
    });

    it("can save after processing actions", async () => {
        let versionConfig = new FakeVersionConfig();
        let saveHandler;
        let promise = new Promise(resolve => saveHandler = resolve);
        assert.ok(saveHandler);  // Sanity check that the promise callback has been called

        const { interactor, initialGameState, logBook } = await configureInteractor([], { saveHandler, versionConfig });

        await interactor.addLogBookEntry({ action: "run" });

        const saveData = await promise;
        assert.deepEqual(saveData, {
            initialGameState,
            logBook,
        });
    });

    it("can process valid actions after failing actions", async () => {
        let versionConfig = new FakeVersionConfig();

        const { interactor, mockEngine, logBook } = await configureInteractor([
            new LogEntry(1, { type: "action", day: 1 }, 0, versionConfig),
        ], {versionConfig});

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
        assert.equal(logBook.getLastEntryId(), 0);
        assert.deepEqual(getAllStates(interactor, 1 /* expect 0 states (loads 1) */), [
            { stateNo: 2, converted: true, },
            undefined,
        ]);

        await interactor.addLogBookEntry({ action: "passes" });

        // Make sure the good action did get added
        assert.equal(logBook.getLastEntryId(), 1);
        assert.deepEqual(getAllStates(interactor, 2 /* expect 2 states (loads 3) */), [
            { stateNo: 2, converted: true },
            { stateNo: 3, converted: true, },
            undefined,
        ]);
    });

    it("can process actions in order and all promises waits for all promises to resolve", async () => {
        let versionConfig = new FakeVersionConfig();

        let logEntries = [
            new LogEntry(1, { action: "sit" }, 0, versionConfig),
            new LogEntry(1, { action: "stand" }, 1, versionConfig),
            new LogEntry(2, { action: "walk" }, 2, versionConfig),
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
            versionConfig,
        });

        const rawEntry = { action: "run" };
        let newEntry = new LogEntry(2, rawEntry, 3, versionConfig);
        newEntry.updateMessageWithBoardState({
            previousState: { stateNo: 3 },
        });
        let newEntry2 = new LogEntry(2, rawEntry, 4, versionConfig);
        newEntry2.updateMessageWithBoardState({
            previousState: { stateNo: 4 },
        });
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

    it("can get the action objects for the current state", async () => {
        let versionConfig = new FakeVersionConfig();

        const { interactor, logBook, mockEngine } = await configureInteractor([], {
            waitForLoaded: true,
            versionConfig,
            actionFactories: [new MockActionFactory()],
        });

        let actions = await interactor.getActions("fred");
        assert.deepEqual(actions.get("run").state, {
            playerName: "fred",
            day: undefined,
            engine: mockEngine,
            // Initial state converted
            gameState: {
                converted: true,
                stateNo: 1,
            },
        });

        await interactor.addLogBookEntry({ day: 1 });
        await interactor.addLogBookEntry({ action: "stand" });
        await interactor.addLogBookEntry({ day: 2 });

        actions = await interactor.getActions("fred");
        assert.deepEqual(actions.get("run").state, {
            playerName: "fred",
            day: 2,
            engine: mockEngine,
            gameState: {
                converted: true,
                stateNo: 4,
            },
        });

        const rawEntry = { action: "run" };
        await interactor.addLogBookEntry(rawEntry);
        await interactor.addLogBookEntry({ day: 3 });

        actions = await interactor.getActions("bob");
        assert.deepEqual(actions.get("run").state, {
            playerName: "bob",
            day: 3,
            engine: mockEngine,
            gameState: {
                converted: true,
                stateNo: 6,
            },
        });

        assert.deepEqual(getAllLogBookEntries(logBook)[3],
            new LogEntry(2, { panda: 12, ...rawEntry }, 3, versionConfig, "", {}));
    });

    it("can trigger an entry added event for each entry we add", async () => {
        let versionConfig = new FakeVersionConfig();

        let lastEntryId = -1;
        let entryCount = 0;
        const onEntryAdded = entryId => {
            ++entryCount;
            assert.ok(lastEntryId < entryId);
            lastEntryId = entryId;
        };

        let logEntries = [
            new LogEntry(1, { action: "sit" }, 0, versionConfig),
            new LogEntry(1, { action: "stand" }, 1, versionConfig),
            new LogEntry(2, { action: "walk" }, 2, versionConfig),
        ];

        const { interactor } = await configureInteractor(logEntries, {
            waitForLoaded: false,
            onEntryAdded,
            versionConfig,
        });

        await interactor.loaded;

        assert.equal(entryCount, 3);
        assert.equal(lastEntryId, 2);

        const rawEntry = { action: "run" };
        await interactor.addLogBookEntry(rawEntry);
        await interactor.addLogBookEntry(rawEntry);

        assert.equal(entryCount, 5);
        assert.equal(lastEntryId, 4);
    });
});
