export class LogEntry {
    constructor(day, rawLogEntry, id, versionConfig) {
        this.id = id;
        this.day = day;
        this.type = rawLogEntry.action || "start_of_day";
        this.rawLogEntry = rawLogEntry;
        this.message = versionConfig ? versionConfig.formatLogEntry(this) : "";
    }

    static deserialize(id, previousDay, rawEntry, versionConfig) {
        if(rawEntry.day) previousDay = rawEntry.day;

        return new LogEntry(previousDay, rawEntry, id, versionConfig);
    }

    serialize() {
        return this.rawLogEntry;
    }

    getTimestamp() {
        return new Date(this.rawLogEntry.timestamp * 1000);
    }
}
