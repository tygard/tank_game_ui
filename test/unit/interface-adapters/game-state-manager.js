import assert from "node:assert";
import { currentLogGameStateReducer, goToEntryId, goToLatestTurn, goToNextDay, goToNextEntry, goToPreviousDay, goToPreviousEntry, setLogBook } from "../../../src/interface-adapters/game-state-manager.js";
import { LogBook } from "../../../src/game/state/log-book/log-book.js";


function compareStates(actual, expected) {
    actual = Object.assign({}, actual);
    delete actual._logBook;
    assert.deepEqual(actual, expected);
}

const testLogbook = LogBook.deserialize({
    gameVersion: "3",
    rawEntries: [
        { day: 1 },
        { subject: "Justin", action: "shoot", target: "A2" },
        { subject: "Corey", action: "move", target: "M13" },
        { day: 2 },
        { subject: "Sam", action: "buy_action", gold: 3 },
        { subject: "Corey", action: "move", target: "N12" },
        { subject: "Justin", action: "shoot", target: "A2" },
        { subject: "Sam", action: "move", target: "G4" },
        { subject: "Sam", action: "move", target: "G5" },
        { day: 3 },
        { subject: "Corey", action: "move", target: "M11" },
        { subject: "Corey", action: "buy_action", gold: 5 },
        { subject: "Corey", action: "shoot", target: "M10" },
    ]
});


const expectedFirstEntry = {
    canGoTo: {
        latestTurn: true,
        nextDay: true,
        nextTurn: true,
        previousDay: false,
        previousTurn: false,
    },
    today: 1,
    dayRelativeEntryId: 1,
    maxEntryIdToday: 3,
    entryId: 0,
    isLatestEntry: false,
};


const expectedEntryId1 = {
    canGoTo: {
        latestTurn: true,
        nextDay: true,
        nextTurn: true,
        previousDay: true,
        previousTurn: true,
    },
    today: 1,
    dayRelativeEntryId: 2,
    maxEntryIdToday: 3,
    entryId: 1,
    isLatestEntry: false,
};


const expectedEntryId3 = {
    canGoTo: {
        latestTurn: true,
        nextDay: true,
        nextTurn: true,
        previousDay: true,
        previousTurn: true,
    },
    today: 2,
    dayRelativeEntryId: 1,
    maxEntryIdToday: 6,
    entryId: 3,
    isLatestEntry: false,
};


const expectedLastTurnState = {
    canGoTo: {
        latestTurn: false,
        nextDay: false,
        nextTurn: false,
        previousDay: true,
        previousTurn: true,
    },
    today: 3,
    dayRelativeEntryId: 4,
    maxEntryIdToday: 4,
    entryId: 12,
    isLatestEntry: true,
};


describe("GameStateManager", () => {
    it("can initialize it's default state with an empty log book", () => {
        const logBook = new LogBook("3", []);
        const actual = currentLogGameStateReducer(undefined, setLogBook(logBook));
        compareStates(actual, {
            canGoTo: {
                latestTurn: false,
                nextDay: false,
                nextTurn: false,
                previousDay: false,
                previousTurn: false,
            },
            today: 0,
            dayRelativeEntryId: 1,
            maxEntryIdToday: 1,
            entryId: 0,
            isLatestEntry: true,
        });
    });

    it("can initialize it's default state with a full log book", () => {
        const actual = currentLogGameStateReducer(undefined, setLogBook(testLogbook));
        compareStates(actual, expectedLastTurnState);
    });

    it("can jump to an entry it without having a log book", () => {
        const actual = currentLogGameStateReducer(undefined, goToEntryId(15));
        compareStates(actual, {
            canGoTo: {
                latestTurn: false,
                nextDay: false,
                nextTurn: false,
                previousDay: false,
                previousTurn: false,
            },
            today: 0,
            dayRelativeEntryId: 15,
            maxEntryIdToday: 15,
            entryId: 15,
            isLatestEntry: false,
        });
    });

    it("can go backwards by turns and days", () => {
        let state = currentLogGameStateReducer(undefined, setLogBook(testLogbook));

        // Go back 1 turn
        state = currentLogGameStateReducer(state, goToPreviousEntry());
        compareStates(state, {
            canGoTo: {
                latestTurn: true,
                nextDay: false,
                nextTurn: true,
                previousDay: true,
                previousTurn: true,
            },
            today: 3,
            dayRelativeEntryId: 3,
            maxEntryIdToday: 4,
            entryId: 11,
            isLatestEntry: false,
        });

        // Go back 1 more turn
        state = currentLogGameStateReducer(state, goToPreviousEntry());
        compareStates(state, {
            canGoTo: {
                latestTurn: true,
                nextDay: false,
                nextTurn: true,
                previousDay: true,
                previousTurn: true,
            },
            today: 3,
            dayRelativeEntryId: 2,
            maxEntryIdToday: 4,
            entryId: 10,
            isLatestEntry: false,
        });

        // go back to the previous day
        state = currentLogGameStateReducer(state, goToPreviousEntry());
        state = currentLogGameStateReducer(state, goToPreviousEntry());
        compareStates(state, {
            canGoTo: {
                latestTurn: true,
                nextDay: true,
                nextTurn: true,
                previousDay: true,
                previousTurn: true,
            },
            today: 2,
            dayRelativeEntryId: 6,
            maxEntryIdToday: 6,
            entryId: 8,
            isLatestEntry: false,
        });

        // Jump to the start of the day
        state = currentLogGameStateReducer(state, goToPreviousDay());
        compareStates(state, {
            canGoTo: {
                latestTurn: true,
                nextDay: true,
                nextTurn: true,
                previousDay: true,
                previousTurn: true,
            },
            today: 2,
            dayRelativeEntryId: 1,
            maxEntryIdToday: 6,
            entryId: 3,
            isLatestEntry: false,
        });

        // Jump to the start of the previous day also the first day of the log book
        state = currentLogGameStateReducer(state, goToPreviousDay());
        compareStates(state, expectedFirstEntry);

        // Make sure we can't walk off the end of the log book
        state = currentLogGameStateReducer(state, goToPreviousDay());
        compareStates(state, expectedFirstEntry);
        state = currentLogGameStateReducer(state, goToPreviousEntry());
        compareStates(state, expectedFirstEntry);

        // Check that can go back is set correctly for entry 1 (and implicitly test goToEntryId)
        state = currentLogGameStateReducer(state, goToEntryId(1));
        compareStates(state, expectedEntryId1);
    });

    it("can go forwards by turns and days", () => {
        let state = currentLogGameStateReducer(undefined, setLogBook(testLogbook));
        state = currentLogGameStateReducer(state, goToEntryId(0));

        // Go to the next entry
        state = currentLogGameStateReducer(state, goToNextEntry());
        compareStates(state, {
            canGoTo: {
                latestTurn: true,
                nextDay: true,
                nextTurn: true,
                previousDay: true,
                previousTurn: true,
            },
            today: 1,
            dayRelativeEntryId: 2,
            maxEntryIdToday: 3,
            entryId: 1,
            isLatestEntry: false,
        });

        // Go forward another entry
        state = currentLogGameStateReducer(state, goToNextEntry());
        compareStates(state, {
            canGoTo: {
                latestTurn: true,
                nextDay: true,
                nextTurn: true,
                previousDay: true,
                previousTurn: true,
            },
            today: 1,
            dayRelativeEntryId: 3,
            maxEntryIdToday: 3,
            entryId: 2,
            isLatestEntry: false,
        });

        // Advance to the next day
        state = currentLogGameStateReducer(state, goToNextEntry());
        compareStates(state, expectedEntryId3);

        // Jump to the start of the next day
        state = currentLogGameStateReducer(state, goToNextDay());
        compareStates(state, {
            canGoTo: {
                latestTurn: true,
                nextDay: false,
                nextTurn: true,
                previousDay: true,
                previousTurn: true,
            },
            today: 3,
            dayRelativeEntryId: 1,
            maxEntryIdToday: 4,
            entryId: 9,
            isLatestEntry: false,
        });

        // Advance to the end
        state = currentLogGameStateReducer(state, goToNextEntry());
        state = currentLogGameStateReducer(state, goToNextEntry());
        state = currentLogGameStateReducer(state, goToNextEntry());
        compareStates(state, expectedLastTurnState);
    });

    it("can jump to the latest day", () => {
        let state = currentLogGameStateReducer(undefined, setLogBook(testLogbook));
        state = currentLogGameStateReducer(state, goToEntryId(0));

        state = currentLogGameStateReducer(state, goToLatestTurn());
        compareStates(state, expectedLastTurnState);
    });

    it("can jump to a turn before loading a log book", () => {
        let state = currentLogGameStateReducer(undefined, goToEntryId(1));
        state = currentLogGameStateReducer(state, setLogBook(testLogbook));
        compareStates(state, expectedEntryId1);
    });
});