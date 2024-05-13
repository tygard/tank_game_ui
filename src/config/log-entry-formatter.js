const FORMATTER_EXPR = /\{([^}]+)\}/g;

export class LogEntryFormatter {
    constructor(formatString) {
        this._formatString = formatString;
    }

    format(rawLogEntry) {
        if(rawLogEntry.hit !== undefined) {
            rawLogEntry = {
                ...rawLogEntry,
                hit: rawLogEntry.hit ? "hit" : "miss",
            };
        }

        return this._formatString.replace(FORMATTER_EXPR, (_, name) => {
            return rawLogEntry[name];
        });
    }
}
