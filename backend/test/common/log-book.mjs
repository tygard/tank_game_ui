import assert from "node:assert";
import { Config } from "../../../common/state/config/config.mjs";
import { LogBook } from "../../../common/state/log-book/log-book.mjs";

const GAME_VERSION = 3;

const config = new Config({
    defaultGameVersion: {},
    gameVersions: {
        3: {
            logEntryFormatters: {
                shoot: "{subject} took aim at {position} and {hit}",
                buy_action: "{subject} traded {quantity} gold for actions.  Big spender.",
            },
        },
        5: {
            logEntryFormatters: {
                shoot: "This better now show up (shoot)",
                move: "This better now show up (move)",
            },
        },
    },
});

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
        "position": "I6",
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
        "quantity": 5,
        "action": "buy_action"
    },
    {
        "type": "action",
        "subject": "Corey",
        "position": "H4",
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
                "You might want to define a formatter for start_of_day",
                "Corey took aim at I6 and hit",
                "You might want to define a formatter for start_of_day",
                "Xavion traded 5 gold for actions.  Big spender.",
                "You might want to define a formatter for move",
            ];

            const logBook = LogBook.deserialize(rawLogBook, config);
            for(let i = 0; i <= logBook.getLastEntryId(); ++i) {
                assert.equal(logBook.getEntry(i).message, expectedMessages[i]);
            }
        });
    });

    it("can deserialize and reserialize itself", () => {
        const logBook = LogBook.deserialize(rawLogBook, config);
        const serialized = logBook.serialize();

        assert.deepEqual(serialized, rawLogBook);
    });

    it("can determine its boundaries", () => {
        const logBook = LogBook.deserialize(rawLogBook, config);
        assert.equal(logBook.getFirstEntryId(), 0);
        assert.equal(logBook.getLastEntryId(), rawEntries.length - 1);
        assert.equal(logBook.getMinDay(), 1);
        assert.equal(logBook.getMaxDay(), 2);
    });

    it("can walk through entries by day", () => {
        const logBook = LogBook.deserialize(rawLogBook, config);

        const firstEntryFirstDay = logBook.getEntry(firstDayIndex);
        const firstEntrySecondDay = logBook.getEntry(secondDayIndex);
        const secondEntrySecondDay = logBook.getEntry(secondDayIndex + 1);

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
        let logBook = LogBook.deserialize(rawLogBook, config);
        const newId = logBook.addEntry(logBook.makeEntryFromRaw({ type: "action", day: 3 }));

        assert.deepEqual(logBook.getEntry(newId).serialize(), {
            type: "action",
            day: 3,
        });

        assert.equal(newId, logBook.getLastEntryId());
    });
});