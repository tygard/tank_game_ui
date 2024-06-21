import assert from "node:assert";
import { LogBook } from "../../../../../src/game/state/log-book/log-book.js";

// These should point to the start of day actions in the list below
const firstDayIndex = 0;
const secondDayIndex = 2;

const rawLogBook = [
    {
        "day": 1,
    },
    {
        "subject": "Corey",
        "target": "I6",
        "hit": true,
        "action": "shoot"
    },
    {
        "day": 2,
    },
    {
        "subject": "Xavion",
        "gold": 5,
        "action": "buy_action"
    },
    {
        "subject": "Corey",
        "target": "H4",
        "action": "move"
    },
];

describe("LogBook", () => {
    it("can deserialize and reserialize itself", () => {
        const logBook = LogBook.deserialize(rawLogBook);

        const serialized = logBook.withoutStateInfo().serialize();
        assert.deepEqual(serialized, rawLogBook);

        const serializedWithMessage = LogBook.deserialize(logBook.serialize());
        assert.deepEqual(serializedWithMessage, logBook);
    });

    it("can determine its boundaries", () => {
        const logBook = LogBook.deserialize(rawLogBook);
        assert.equal(logBook.getFirstEntryId(), 0);
        assert.equal(logBook.getLastEntryId(), rawLogBook.length - 1);
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

        assert.equal(logBook.getDayOfEntryId(firstDayIndex), 1);
        assert.equal(logBook.getDayOfEntryId(secondDayIndex), 2);

        assert.equal(logBook.getFirstEntryIdOfDay(1), firstDayIndex);
        assert.equal(logBook.getFirstEntryIdOfDay(2), secondDayIndex);
        assert.equal(logBook.getFirstEntryIdOfDay(3), undefined);
    });

    it("can add entries", () => {
        let logBook = LogBook.deserialize(rawLogBook, () => 15);
        const newId = logBook.addEntry(logBook.makeEntryFromRaw({ day: 3 }));

        assert.deepEqual(logBook.getEntry(newId).withoutStateInfo().serialize(), {
            timestamp: 15,
            day: 3,
        });

        assert.equal(newId, logBook.getLastEntryId());
        assert.equal(3, logBook.getMaxDay());
        assert.equal(newId, logBook.getFirstEntryIdOfDay(3));
    });
});