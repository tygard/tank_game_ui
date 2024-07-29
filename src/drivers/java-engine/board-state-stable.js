// State translation functions
//
// These functions serve to create an abstraction between tank_game_ui and TankGame engine.
// By doing so we limit the scope of the changes required to support new versions of the engine.
//
// This file specifically targets the current stable version v0.0.2

import Board from "../../game/state/board/board.js";
import Entity from "../../game/state/board/entity.js";
import { GameState } from "../../game/state/game-state.js";
import Player from "../../game/state/players/player.js";
import Players from "../../game/state/players/players.js";
import { Position } from "../../game/state/board/position.js";
import { logger } from "#platform/logging.js";

const deadTankAttributesToRemove = ["ACTIONS", "RANGE", "BOUNTY"];


export function gameStateFromRawState(rawGameState) {
    let councilPlayers = [];
    const playersByName = buildUserLists(rawGameState, councilPlayers);

    let board = convertBoard(undefined, rawGameState.board.unit_board, (newBoard, rawEntity, position) => {
        newBoard.setEntity(entityFromBoard(rawEntity, position, playersByName));
    });

    board = convertBoard(board, rawGameState.board.floor_board, (newBoard, space, position) => {
        newBoard.setFloorTile(new Entity({ type: space.type, position }));
    });

    let gameState = new GameState(
        new Players(Object.values(playersByName)),
        board,
        {
            council: convertCouncil(rawGameState.council, councilPlayers),
        },
    );

    let victoryInfo;

    if(rawGameState.winner?.length > 1) {
        victoryInfo = {
            type: rawGameState.winner == "Council" ? "armistice_vote" : "last_tank_standing",
            winners: rawGameState.winner == "Council" ?
                gameState.metaEntities.council.players :
                [gameState.players.getPlayerByName(rawGameState.winner)],
        };
    }

    return {
        gameState,
        victoryInfo,
    };
}

function getAttributeName(name, rawEntity) {
    name = name.toLowerCase();

    if(rawEntity.type == "tank" && !rawEntity.attributes.DEAD && name == "durability") {
        return "health";
    }

    return name;
}

function convertCouncil(rawCouncil, players) {
    let attributes = {
        coffer: rawCouncil.coffer,
    };

    if(rawCouncil.armistice_vote_cap !== undefined) {
        attributes.armistice = {
            value: rawCouncil.armistice_vote_count,
            max: rawCouncil.armistice_vote_cap
        };
    }

    return new Entity({ type: "council", attributes, players });
}

function shouldKeepAttribute(attributeName, rawEntity) {
    if(attributeName == "DEAD") {
        return false;
    }

    if(rawEntity.type == "tank" && rawEntity.attributes.DEAD) {
        return !deadTankAttributesToRemove.includes(attributeName);
    }

    return true;
}

function entityFromBoard(rawEntity, position, playersByName) {
    let attributes = {};

    if(rawEntity.attributes) {
        for(const attributeName of Object.keys(rawEntity.attributes)) {
            if(!shouldKeepAttribute(attributeName, rawEntity)) continue;

            const actualName = getAttributeName(attributeName, rawEntity);

            attributes[actualName] = rawEntity.attributes[attributeName];
        }
    }

    let player = playersByName[rawEntity.name];

    if(rawEntity.global_cooldown_end_time !== undefined) {
        player.attributes.global_cooldown_end_time = rawEntity.global_cooldown_end_time;
    }

    let entity = new Entity({ type: rawEntity.type, position, attributes });

    if(player) {
        entity.addPlayer(player);
    }

    return entity;
}

function convertBoard(newBoard, board, boardSpaceFactory) {
    if(!newBoard) {
        if(board.length === 0) throw new Error("Zero length boards are not allowed");

        newBoard = new Board(board[0].length, board.length);
    }

    if(newBoard.height != board.length) {
        throw new Error(`Board has a length of ${board.length} but previous boards had a length of ${newBoard.height}`);
    }

    for(let y = 0; y < board.length; ++y) {
        const row = board[y];

        if(newBoard.width != row.length) {
            throw new Error(`Row at index ${y} has a length of ${row.length} but previous rows had a length of ${newBoard.width}`);
        }

        for(let x = 0; x < row.length; ++x) {
            const position = new Position(x, y);
            boardSpaceFactory(newBoard, board[y][x], position);
        }
    }

    return newBoard;
}

function buildUserLists(rawGameState, councilPlayers) {
    let playersByName = {};
    processCouncil(rawGameState, playersByName, councilPlayers);
    findUsersOnGameBoard(rawGameState, playersByName);

    return playersByName;
}

function processCouncil(rawGameState, playersByName, councilPlayers) {
    // Ensure that players remain in the same order
    rawGameState.council.council.sort();
    rawGameState.council.senate.sort();

    const councilGroups = [
        [rawGameState.council.council, "councilor"],
        [rawGameState.council.senate, "senator"]
    ];

    for(const [users, userType] of councilGroups) {
        for(const userName of users) {
            if(playersByName[userName]) {
                // Being a councelor overrides the user's previous state
                playersByName[userName].type = userType;
            }
            else {
                playersByName[userName] = new Player({ name: userName, type: userType });
            }

            councilPlayers.push(playersByName[userName]);
        }
    }
}

function findUsersOnGameBoard(rawGameState, playersByName) {
    for(const row of rawGameState.board.unit_board) {
        for(const rawEntity of row) {
            if(rawEntity.name) {
                let player = playersByName[rawEntity.name];
                if(!player) {
                    player = new Player({
                        name: rawEntity.name,
                        type: rawEntity.dead ? "council" : "tank",
                    });
                    playersByName[rawEntity.name] = player;
                }
            }
        }
    }
}

////////////////////////////////////////////////////////////////////////////////

function buildBoard(board, entityFn) {
    let rawBoard = [];

    for(let y = 0; y < board.height; ++y) {
        let row = [];
        rawBoard.push(row);

        for(let x = 0; x < board.width; ++x) {
            row.push(entityFn(new Position(x, y), board));
        }
    }

    return rawBoard;
}

function buildUnit(position, board, gameState) {
    const entity = board.getEntityAt(position);

    let attributes = {};
    for(const attributeName of Object.keys(entity.attributes)) {
        attributes[attributeName.toUpperCase()] = entity.attributes[attributeName];
    }

    if(entity.type == "tank") {
        attributes.DEAD = entity.attributes.durability !== undefined;

        for(const removedAttibute of deadTankAttributesToRemove) {
            if(attributes[removedAttibute] === undefined) {
                attributes[removedAttibute] = 0;
            }
        }

        if(attributes.DURABILITY === undefined) {
            attributes.DURABILITY = attributes.HEALTH;
            delete attributes.HEALTH;
        }
    }

    return {
        type: entity.type,
        name: entity.getPlayerRefs()[0]?.getPlayer(gameState)?.attributes?.name,
        position: entity.position.humanReadable,
        attributes,
    };
}

function buildFloor(position, board) {
    const tile = board.getFloorTileAt(position);

    return {
        type: tile.type,
    };
}

function makeCouncilList(council, playerType, gameState) {
    return council.getPlayerRefs()
        .map(playerRef => playerRef.getPlayer(gameState))
        .filter(player => player.type == playerType)
        .map(player => player.name);
}

function makeCouncil(councilEntity, gameState) {
    let additionalAttributes = {};

    if(councilEntity.attributes.armistice !== undefined) {
        additionalAttributes = {
            ...additionalAttributes,
            armistice_vote_count: councilEntity.attributes.armistice.value,
            armistice_vote_cap: councilEntity.attributes.armistice.max,
        };
    }

    return {
        type: "council",
        coffer: councilEntity.attributes.coffer,
        ...additionalAttributes,
        council: makeCouncilList(councilEntity, "councilor", gameState),
        senate: makeCouncilList(councilEntity, "senator", gameState),
    };
}

export function gameStateToRawState(gameState) {
    return {
        type: "state",
        // It's assumed that we only interact with the engine when the game is active
        running: true,
        winner: "",
        day: 0,
        board: {
            type: "board",
            unit_board: buildBoard(gameState.board, (position, board) => buildUnit(position, board, gameState)),
            floor_board: buildBoard(gameState.board, buildFloor),
        },
        council: makeCouncil(gameState.metaEntities.council, gameState),
    };
}
