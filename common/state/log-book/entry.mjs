export class LogEntry {
    constructor(day, rawLogEntry, id, versionConfig) {
        this.id = id;
        this.day = day;
        this.type = rawLogEntry.action || "start_of_day";
        this.rawLogEntry = rawLogEntry;

        const formatter = versionConfig && versionConfig.getLogEntryFormatter(this.type);
        this.message = `You might want to define a formatter for ${this.type}`;

        if(formatter) {
            this.message = formatter.format(rawLogEntry);
        }
    }

    static deserialize(id, previousDay, rawEntry, versionConfig) {
        if(rawEntry.day) previousDay = rawEntry.day;

        return new LogEntry(previousDay, rawEntry, id, versionConfig);
    }

    serialize() {
        return this.rawLogEntry;
    }
}
