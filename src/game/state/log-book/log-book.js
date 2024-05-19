import { getGameVersion } from "../../../versions/index.js";
import { LogEntry } from "./entry.js";

const defaultMakeTimeStamp = () => Math.floor(Date.now() / 1000);

const DEFAULT_TIME_INTERVAL = 20 * 60; // 20 minutes


export class LogBook {
    constructor(gameVersion, entries, versionConfig, makeTimeStamp = defaultMakeTimeStamp) {
        this.gameVersion = gameVersion;
        this._entries = entries;
        this._versionConfig = versionConfig;
        this._makeTimeStamp = makeTimeStamp;
        this._buildDayMap();
    }

    _buildDayMap() {
        this._dayMap = {};
        this._entriesPerDay = {};

        let previousDay = 0;
        for(const entry of this._entries) {
            if(entry.day != previousDay) {
                this._dayMap[entry.day] = entry.id;
            }

            if(this._minDay === undefined) this._minDay = entry.day;
            this._maxDay = entry.day;

            previousDay = entry.day;

            if(!this._entriesPerDay[entry.day]) {
                this._entriesPerDay[entry.day] = [];
            }

            this._entriesPerDay[entry.day].push(entry);
        }
    }

    static deserialize({gameVersion, rawEntries}, makeTimeStamp) {
        // 0 length log books are not supported start day 1 if we have no entries
        if(rawEntries === undefined || rawEntries.length === 0) {
            rawEntries = [
                {
                    type: "action",
                    day: 1,
                }
            ];
        }

        const versionConfig = getGameVersion(gameVersion);

        let previousDay = 0;
        let previousTime = 0;
        const entries = rawEntries.map((rawEntry, idx) => {
            if(rawEntry.timestamp === undefined) {
                rawEntry.timestamp = previousTime + DEFAULT_TIME_INTERVAL;
            }

            if(previousTime > rawEntry.timestamp && idx > 0) {
                throw new Error(`Entry timestamps must be ascending ${idx}: ${rawEntry.timestamp} and ${idx - 1}: ${previousTime}`);
            }

            previousTime = rawEntry.timestamp;

            const entry = LogEntry.deserialize(idx, previousDay, rawEntry, versionConfig);
            previousDay = entry.day;
            return entry;
        });

        return new LogBook(gameVersion, entries, versionConfig, makeTimeStamp);
    }

    serialize({ justRawEntries } = {}) {
        return {
            gameVersion: this.gameVersion,
            rawEntries: this._entries.map(entry => entry.serialize({ justRawEntries })),
        }
    }

    getEntry(entryId) {
        return this._entries[entryId];
    }

    makeEntryFromRaw(rawEntry) {
        const day = rawEntry.day || this.getMaxDay();
        rawEntry.timestamp = this._makeTimeStamp();
        return new LogEntry(day, rawEntry, this._entries.length, this._versionConfig);
    }

    addEntry(entry) {
        // Sanity check start of day
        // Max day is undefined if we add a start of day entry in the constructor
        if(entry.rawLogEntry.day !== undefined && this.getMaxDay() !== undefined && entry.rawLogEntry.day != this.getMaxDay() + 1) {
            throw new Error(`Cannot start day ${entry.rawLogEntry.day} on day ${this.getMaxDay()}`);
        }

        this._entries.push(entry);
        this._buildDayMap();
        return entry.id;
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

    getFirstEntryOfDay(day) {
        return this.getEntry(this._dayMap[day]);
    }

    getLastEntryOfDay(day) {
        let lastId = this.getLastEntryId();
        if(day < this.getMaxDay()) {
            lastId = this.getFirstEntryOfDay(day + 1).id - 1;
        }

        return this.getEntry(lastId);
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
}
