import { deserializer } from "../../../deserialization.js";
import { LogEntry } from "./log-entry.js";

export class LogBook {
    constructor(entries) {
        this._entries = entries;
        this._buildDayMap();
    }

    _buildDayMap() {
        this._dayMap = {};
        this._entriesPerDay = {};

        let day = 0;
        for(let id = 0; id < this._entries.length; ++id) {
            const entry = this._entries[id];

            if(entry.rawLogEntry.day != undefined) {
                if(day + 1 != entry.rawLogEntry.day) {
                    throw new Error(`Days must be consecutive and go in ascending order starting from 1.  Found day ${entry.rawLogEntry.day} after ${day}.`);
                }

                day = entry.rawLogEntry.day;

                this._dayMap[day] = id;

                if(this._minDay === undefined) this._minDay = day;
                this._maxDay = day;
            }

            if(this._entriesPerDay[day] == undefined) {
                this._entriesPerDay[day] = [];
            }

            this._entriesPerDay[day].push(entry);
        }
    }

    static deserialize(rawLogBook) {
        // 0 length log books are not supported start day 1 if we have no entries
        if(rawLogBook?.entries === undefined || rawLogBook.entries.length === 0) {
            rawLogBook.entries = [
                new LogEntry({ day: 1 }),
            ];
        }

        let previousTime = 0;
        rawLogBook.entries.forEach((entry, idx) => {
            if(previousTime > entry.rawLogEntry.timestamp && idx > 0) {
                throw new Error(`Entry timestamps must be ascending ${idx}: ${entry.rawLogEntry.timestamp} and ${idx - 1}: ${previousTime}`);
            }

            previousTime = entry.rawLogEntry.timestamp;

            return entry;
        });

        return new LogBook(rawLogBook.entries);
    }

    serialize() {
        return {
            entries: this._entries,
        };
    }

    withoutStateInfo() {
        const entries = this._entries.map(entry => entry.withoutStateInfo());
        return new LogBook(entries);
    }

    getEntry(entryId) {
        return this._entries[entryId];
    }

    makeEntryFromRaw(rawEntry) {
        return new LogEntry(rawEntry);
    }

    addEntry(entry) {
        // Sanity check start of day
        // Max day is undefined if we add a start of day entry in the constructor
        if(entry.rawLogEntry.day !== undefined && this.getMaxDay() !== undefined && entry.rawLogEntry.day != this.getMaxDay() + 1) {
            throw new Error(`Cannot start day ${entry.rawLogEntry.day} on day ${this.getMaxDay()}`);
        }

        this._entries.push(entry);
        this._buildDayMap();
        return this._entries.length - 1;
    }

    getFirstEntryId() {
        return 0;
    }

    getLastEntryId() {
        return Math.max(0, this._entries.length - 1);
    }

    getMinDay() {
        return this._minDay;
    }

    getMaxDay() {
        return this._maxDay;
    }

    getFirstEntryIdOfDay(day) {
        return this._dayMap[day];
    }

    getLastEntryIdOfDay(day) {
        let lastId = this.getLastEntryId();
        if(day < this.getMaxDay()) {
            lastId = this.getFirstEntryIdOfDay(day + 1) - 1;
        }

        return lastId;
    }

    *[Symbol.iterator]() {
        for(let i = this.getFirstEntryId(); i <= this.getLastEntryId(); ++i) {
            yield this.getEntry(i);
        }
    }

    getEntriesOnDay(day) {
        return this._entriesPerDay[day];
    }

    getAllDays() {
        return Object.keys(this._entriesPerDay);
    }

    getLength() {
        return this._entries.length;
    }

    getDayOfEntryId(entryId) {
        let previousDay = 0;

        for(let day of Object.keys(this._dayMap)) {
            day = +day;
            if(entryId < this._dayMap[day]) {
                break;
            }

            previousDay = day;
        }

        return previousDay;
    }
}

deserializer.registerClass("log-book-v1", LogBook);