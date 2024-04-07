import fs from "node:fs/promises";

const FILE_FORMAT_VERSION = 2;

async function readJson(path) {
    return JSON.parse(await fs.readFile(path, "utf-8"));
}

async function writeJson(path, data) {
    return await fs.writeFile(path, JSON.stringify(data, null, 4));
}

export class GameFile {
    constructor(path, gameVersion, initialState, logBook) {
        this.gameVersion = gameVersion;
        this._path = path;
        this._initialState = initialState;
        this._logBook = logBook || [];
    }

    static async load(filePath) {
        let content = await readJson(filePath);

        if(content?.versions?.fileFormat > FILE_FORMAT_VERSION) {
            throw new Error(`File version ${content?.versions?.fileFormat} is not supported`);
        }

        // Version 1 used a states array instead of initialState and only supported game version 3
        if(content?.versions?.fileFormat == 1) {
            content.initialState = content.gameStates[0];
            delete content.states;
            content.versions.game = 3;
        }

        return new GameFile(filePath, content.versions.game, content.initialState, content.logBook, content.possibleActions);
    }

    async save() {
        await writeJson(this._path, {
            versions: {
                fileFormat: FILE_FORMAT_VERSION,
                game: this.gameVersion,
            },
            logBook: this._logBook,
            initialState: this._initialState,
        });
    }

    getLogEntryAt(index) {
        return this._logBook[index];
    }

    addLogBookEntry(entry) {
        this._logBook.push(entry);
        return this._logBook.length - 1;
    }

    getNumLogEntries() {
        return this._logBook.length;
    }

    getInitialState() {
        return this._initialState;
    }
}