import { LogBook } from "../game/state/log-book/log-book.js";
import { OpenHours } from "../game/open-hours/index.js";
import { getGameVersion } from "../versions/index.js";
import { gameStateFromRawState } from "./java-engine/board-state-stable.js";
import { GameState } from "../game/state/game-state.js";
import Players from "../game/state/players/players.js";
import Board from "../game/state/board/board.js";
import { deserializer } from "../deserialization.js";
import { Position } from "../game/state/board/position.js";
import { logger } from "#platform/logging.js";

const FILE_FORMAT_VERSION = 7;
const MINIMUM_SUPPORTED_FILE_FORMAT_VERSION = 5;


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
    content.initialGameState = deserializer.serialize(gameStateFromRawState(content.initialGameState).gameState);
}

function migrateToV7(content) {
    content.openHours = {
        class: "open-hours-v1",
        schedules: content.openHours.map(schedule => ({
            ...schedule,
            class: "schedule",
        })),
    };

    // When translating from v5 games the game state is already in the latest format so don't touch it
    if(content.initialGameState.class === undefined) {
        // Starting in v7 players a referenced by a unique (to a state) ID we need to assign those
        let nextUniqueId = 0;
        let nameToIdMap = new Map();
        content.initialGameState.players = content.initialGameState.players.map(playerAttributes => {
            const uniqueId = (++nextUniqueId) + "";
            nameToIdMap.set(playerAttributes.name, uniqueId);

            return {
                class: "player-v1",
                uniqueId,
                attributes: playerAttributes,
            };
        });

        for(const name of Object.keys(content.initialGameState.metaEntities)) {
            migrateEntityToV7(content.initialGameState.metaEntities[name], nameToIdMap);
        }

        for(let boardArray of [content.initialGameState.board.entities, content.initialGameState.board.floor]) {
            for(let entity of boardArray) migrateEntityToV7(entity, nameToIdMap);
        }

        content.initialGameState.board.class = "board-v1";
        content.initialGameState.class = "game-state-v1";
    }

    content.logBook = {
        class: "log-book-v1",
        entries: content.logBook.map(entry => ({
            ...entry,
            class: "log-entry-v1",
        })),
    };

    content.gameVersion = `default-v${content.gameVersion}`;
    content.class = "file-data-v7";
}

function migrateEntityToV7(entity, nameToIdMap) {
    entity.class = "entity";

    if(entity.position !== undefined) {
        const position = new Position(entity.position);
        entity.position = {
            class: "position",
            x: position.x,
            y: position.y,
        };
    }

    entity.players = entity.players?.map?.(playerName => ({
        playerId: nameToIdMap.get(playerName),
        class: "player-ref-v1"
    }));
}

export function loadFromRaw(fileData) {
    let fileDataUpdated = false;

    // Upgrade legacy file formats
    if(fileData?.fileFormatVersion !== undefined) {
        if(fileData.fileFormatVersion > FILE_FORMAT_VERSION) {
            throw new Error(`File version ${fileData.fileFormatVersion} is not supported.  Try a newer Tank Game UI version.`);
        }

        if(fileData.fileFormatVersion < MINIMUM_SUPPORTED_FILE_FORMAT_VERSION) {
            throw new Error(`File version ${fileData.fileFormatVersion} is no longer supported.  Try an older Tank Game UI version.`);
        }

        if(fileData.fileFormatVersion < 6) {
            migrateToV6(fileData);
        }

        if(fileData.fileFormatVersion < 7) {
            migrateToV7(fileData);
        }

        fileDataUpdated = true;
    }

    const helpers = {
        updatedContent() {
            logger.debug({ msg: "File data update requested", key: this.getKey() });
            fileDataUpdated = true;
        },
    };

    fileData = deserializer.deserialize(fileData, helpers);

    return {
        fileData,
        fileDataUpdated,
    };
}

export function dumpToRaw(fileData) {
    return deserializer.serialize(fileData);
}

export function createEmptyFileData({gameVersion, width, height, metaEntities = {}}) {
    return new FileData({
        gameVersion,
        gameStateInitializer: {
            width,
            height,
            metaEntities,
        },
    });
}

class FileData {
    constructor({ gameVersion, openHours, logBook, gameSettings, initialGameState, gameStateInitializer }) {
        // Make sure we have the config required to load this game.  This
        // does not check if the engine supports this game version.
        if(!getGameVersion(gameVersion)) {
            throw new Error(`Game version ${gameVersion} is not supported`);
        }

        this.gameVersion = gameVersion;
        this.openHours = openHours === undefined ? new OpenHours([]) : openHours;
        this.logBook = logBook === undefined ? new LogBook([]) : logBook;
        this.gameSettings = gameSettings === undefined ? {} : gameSettings;

        if(initialGameState === undefined) {
            initialGameState = new GameState(
                [],
                new Board(gameStateInitializer.width, gameStateInitializer.height),
                gameStateInitializer.metaEntities,
            );
        }

        this.initialGameState = initialGameState;
    }

    static deserialize(rawFileData) {
        return new FileData(rawFileData);
    }

    serialize() {
        return {
            gameVersion: this.gameVersion,
            openHours: this.openHours,
            gameSettings: this.gameSettings,
            logBook: this.logBook.withoutStateInfo(),
            initialGameState: this.initialGameState,
        };
    }
}

deserializer.registerClass("file-data-v7", FileData);
