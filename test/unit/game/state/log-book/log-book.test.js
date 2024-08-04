import assert from "node:assert";
import { LogBook } from "../../../../../src/game/state/log-book/log-book.js";
import { LogEntry } from "../../../../../src/game/state/log-book/log-entry.js";
import { deserializer } from "../../../../../src/deserialization.js";

// These should point to the start of day actions in the list below
const firstDayIndex = 0;
const secondDayIndex = 2;

const entries = [
    new LogEntry({
        "day": 1,
    }),
    new LogEntry({
        "subject": "Corey",
        "target": "I6",
        "hit": true,
        "action": "shoot"
    }),
    new LogEntry({
        "day": 2,
    }),
    new LogEntry({
        "subject": "Xavion",
        "gold": 5,
        "action": "buy_action"
    }),
    new LogEntry({
        "subject": "Corey",
        "target": "H4",
        "action": "move"
    }),
];

describe("LogBook", () => {
    it("can deserialize and reserialize itself", () => {
        const logBook = new LogBook(entries);
        const rawLogBook = deserializer.serialize(logBook.withoutStateInfo());
        assert.deepEqual(logBook, deserializer.deserialize(rawLogBook));

        const serializedWithMessage = deserializer.deserialize(deserializer.serialize(logBook));
        assert.deepEqual(serializedWithMessage, logBook);
    });

    it("can determine its boundaries", () => {
        const logBook = new LogBook(entries);
        assert.equal(logBook.getFirstEntryId(), 0);
        assert.equal(logBook.getLastEntryId(), entries.length - 1);
        assert.equal(logBook.getMinDay(), 1);
        assert.equal(logBook.getMaxDay(), 2);
    });

    it("can walk through entries by day", () => {
        const logBook = new LogBook(entries);

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
        LogEntry.enableTestModeTimeStamps();
        let logBook = new LogBook(entries);
        const newId = logBook.addEntry(new LogEntry({ day: 3 }));

        assert.deepEqual(logBook.getEntry(newId).withoutStateInfo().serialize(), {
            timestamp: 1200,
            day: 3,
        });

        assert.equal(newId, logBook.getLastEntryId());
        assert.equal(3, logBook.getMaxDay());
        assert.equal(newId, logBook.getFirstEntryIdOfDay(3));
    });
});