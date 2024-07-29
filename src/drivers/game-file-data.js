import { LogBook } from "../game/state/log-book/log-book.js";
import { OpenHours } from "../game/open-hours/index.js";
import { getGameVersion } from "../versions/index.js";
import { gameStateFromRawState } from "./java-engine/board-state-stable.js";
import { GameState } from "../game/state/game-state.js";
import Players from "../game/state/players/players.js";
import Board from "../game/state/board/board.js";
import { unixNow } from "../utils.js";

export const FILE_FORMAT_VERSION = 6;
export const MINIMUM_SUPPORTED_FILE_FORMAT_VERSION = 5;


function migrateToV6(content) {
    // Move game version to the top level
    content.gameVersion = content.logBook.gameVersion;

    // v5 log entries used strings for all types (due to a bug) coerce them to the correct types and convert the log book to an array
    content.logBook = content.logBook.rawEntries?.map?.(rawEntry => {
        delete rawEntry.type;

        if(rawEntry.action === undefined && rawEntry.day != undefined) {
            rawEntry.action = "start_of_day";
        }

        for(const intValue of ["donation", "gold", "bounty"]) {
            if(rawEntry[intValue] !== undefined) {
                rawEntry[intValue] = +rawEntry[intValue];
            }
        }

        if(rawEntry.hi !== undefined) {
            rawEntry.hit = typeof rawEntry.hit == "boolean" ?
                rawEntry.hit :
                rawEntry.hit == "true";
        }

        return rawEntry;
    });

    // Convert initial state to the ui state format
    content.initialGameState = gameStateFromRawState(content.initialGameState).gameState.serialize();
}


export function loadFromRaw(content, { makeTimeStamp } = {}) {
    if(makeTimeStamp === undefined) {
        makeTimeStamp = () => unixNow();
    }

    if(content?.fileFormatVersion === undefined) {
        throw new Error("File format version missing not a valid game file");
    }

    if(content.fileFormatVersion > FILE_FORMAT_VERSION) {
        throw new Error(`File version ${content.fileFormatVersion} is not supported.  Try a newer Tank Game UI version.`);
    }

    if(content.fileFormatVersion < MINIMUM_SUPPORTED_FILE_FORMAT_VERSION) {
        throw new Error(`File version ${content.fileFormatVersion} is no longer supported.  Try an older Tank Game UI version.`);
    }

    if(content.fileFormatVersion == 5) {
        migrateToV6(content);
    }

    // Make sure we have the config required to load this game.  This
    // does not check if the engine supports this game version.
    if(!getGameVersion(content.gameVersion)) {
        throw new Error(`Game version ${content.gameVersion} is not supported`);
    }

    const logBook = LogBook.deserialize(content.logBook, makeTimeStamp);
    const openHours = content.openHours ?
        OpenHours.deserialize(content.openHours) : new OpenHours([]);

    return {
        gameVersion: content.gameVersion,
        openHours,
        logBook,
        gameSettings: content.gameSettings,
        initialGameState: GameState.deserialize(content.initialGameState),
    };
}

export function dumpToRaw({gameVersion, logBook, initialGameState, openHours, gameSettings}) {
    return {
        fileFormatVersion: FILE_FORMAT_VERSION,
        gameVersion,
        gameSettings,
        openHours: openHours.serialize(),
        logBook: logBook.withoutStateInfo().serialize(),
        initialGameState: initialGameState.serialize(),
    };
}

export function createEmptyFileData({gameVersion, width, height, metaEntities = {}}) {
    return {
        gameVersion,
        openHours: new OpenHours([]),
        logBook: new LogBook([], unixNow),
        gameSettings: {},
        initialGameState: new GameState(
            new Players([]),
            new Board(width, height),
            metaEntities,
        ),
    };
}
