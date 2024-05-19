import assert from "node:assert";
import { LogBook } from "../../../../../src/game/state/log-book/log-book.js";

const GAME_VERSION = 3;

// These should point to the start of day actions in the list below
const firstDayIndex = 0;
const secondDayIndex = 2;

const rawEntries = [
    {
        "type": "action",
        "day": 1,
    },
    {
        "type": "action",
        "subject": "Corey",
        "target": "I6",
        "hit": true,
        "action": "shoot"
    },
    {
        "type": "action",
        "day": 2,
    },
    {
        "type": "action",
        "subject": "Xavion",
        "gold": 5,
        "action": "buy_action"
    },
    {
        "type": "action",
        "subject": "Corey",
        "target": "H4",
        "action": "move"
    },
];

const rawLogBook = {
    gameVersion: GAME_VERSION,
    rawEntries
};

describe("LogBook", () => {
    describe("LogEntry", () => {
        it("can format messages based on the game version config", () => {
            const expectedMessages = [
                "Start of day 1",
                "Corey shot I6",
                "Start of day 2",
                "Xavion traded 5 gold for actions",
                "Corey moved to H4",
            ];

            const logBook = LogBook.deserialize(rawLogBook);
            for(let i = 0; i <= logBook.getLastEntryId(); ++i) {
                assert.equal(logBook.getEntry(i).message, expectedMessages[i]);
            }
        });
    });

    it("can deserialize and reserialize itself", () => {
        const logBook = LogBook.deserialize(rawLogBook);

        const serialized = logBook.serialize({ justRawEntries: true });
        assert.deepEqual(serialized, rawLogBook);

        const serializedWithMessage = LogBook.deserialize(logBook.serialize());
        assert.deepEqual(serializedWithMessage, logBook);
    });

    it("can determine its boundaries", () => {
        const logBook = LogBook.deserialize(rawLogBook);
        assert.equal(logBook.getFirstEntryId(), 0);
        assert.equal(logBook.getLastEntryId(), rawEntries.length - 1);
        assert.equal(logBook.getMinDay(), 1);
        assert.equal(logBook.getMaxDay(), 2);
    });

    it("can walk through entries by day", () => {
        const logBook = LogBook.deserialize(rawLogBook);

        const firstEntryFirstDay = logBook.getEntry(firstDayIndex);
        const firstEntrySecondDay = logBook.getEntry(secondDayIndex);

        // Confirm the indicies point to the correct things
        assert.equal(firstEntryFirstDay.type, "start_of_day");
        assert.equal(firstEntrySecondDay.type, "start_of_day");
        assert.equal(firstEntryFirstDay.day, 1);
        assert.equal(firstEntrySecondDay.day, 2);

        assert.equal(logBook.getFirstEntryOfDay(1), firstEntryFirstDay);
        assert.equal(logBook.getFirstEntryOfDay(2), firstEntrySecondDay);
        assert.equal(logBook.getFirstEntryOfDay(3), undefined);
    });

    it("can add entries", () => {
        let logBook = LogBook.deserialize(rawLogBook, () => 15);
        const newId = logBook.addEntry(logBook.makeEntryFromRaw({ type: "action", day: 3 }));

        assert.deepEqual(logBook.getEntry(newId).serialize({ justRawEntries: true }), {
            type: "action",
            timestamp: 15,
            day: 3,
        });

        assert.equal(newId, logBook.getLastEntryId());
        assert.equal(3, logBook.getMaxDay());
        assert.equal(newId, logBook.getFirstEntryOfDay(3).id);
    });
});