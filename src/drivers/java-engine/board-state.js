// State translation functions
//
// These functions serve to create an abstraction between tank_game_ui and TankGame engine.
// By doing so we limit the scope of the changes required to support new versions of the engine.

import Board from "../../game/state/board/board.js";
import Entity from "../../game/state/board/entity.js";
import { FloorTile } from "../../game/state/board/floor-tile.js";
import { GameState } from "../../game/state/game-state.js";
import Player from "../../game/state/players/player.js";
import Players from "../../game/state/players/players.js";
import { Position } from "../../game/state/board/position.js";
import { Resource, ResourceHolder } from "../../game/state/resource.js";

// The prefix used for the max value of an attribute
const MAX_PREFIX = "MAX_";

const deadTankAttributesToRemove = ["ACTIONS", "RANGE", "BOUNTY"];


export function gameStateFromRawState(rawGameState) {
    const playersByName = buildUserLists(rawGameState);

    let board = convertBoard(undefined, rawGameState.board.unit_board, (newBoard, rawEntity, position) => {
        newBoard.setEntity(entityFromBoard(rawEntity, position, playersByName));
    });

    board = convertBoard(board, rawGameState.board.floor_board, (newBoard, space, position) => {
        newBoard.setFloorTile(new FloorTile(space.type, position));
    });

    let gameState = new GameState(
        new Players(Object.values(playersByName)),
        board,
        convertCouncil(rawGameState.council),
        rawGameState.running,
        rawGameState.winner,
    );

    gameState.__day = rawGameState.day;

    return gameState;
}

function getAttributeName(name, rawEntity) {
    name = name.toLowerCase();

    if(rawEntity.type == "tank" && !rawEntity.attributes.DEAD && name == "durability") {
        return "health";
    }

    return name;
}


function convertCouncil(rawCouncil) {
    let resources = [
        new Resource("coffer", rawCouncil.coffer),
    ];

    if(rawCouncil.armistice_vote_cap !== undefined) {
        resources.push(new Resource("armistice", rawCouncil.armistice_vote_count, rawCouncil.armistice_vote_cap));
    }

    return new ResourceHolder(resources);
}

function shouldKeepAttribute(attributeName, rawEntity) {
    if(attributeName == "DEAD" || attributeName.startsWith(MAX_PREFIX)) {
        return false;
    }

    if(rawEntity.type == "tank" && rawEntity.attributes.DEAD) {
        return !deadTankAttributesToRemove.includes(attributeName);
    }

    return true;
}


function entityFromBoard(rawEntity, position, playersByName) {
    let resources = [];

    if(rawEntity.attributes) {
        resources = Object.keys(rawEntity.attributes)
            .filter(name => shouldKeepAttribute(name, rawEntity))
            .map(name => {
                return new Resource(
                    getAttributeName(name, rawEntity),
                    rawEntity.attributes[name],
                    rawEntity.attributes[`${MAX_PREFIX}${name}`]);
            });
    }

    resources = new ResourceHolder(resources);

    const player = playersByName[rawEntity.name];
    let entity = new Entity(rawEntity.type, position, resources);

    if(player) {
        player.adopt(entity);
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


function buildUserLists(rawGameState) {
    let playersByName = {};
    processCouncil(rawGameState, playersByName);
    findUsersOnGameBoard(rawGameState, playersByName);

    return playersByName;
}


function processCouncil(rawGameState, playersByName) {
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
                playersByName[userName] = new Player(userName, userType, []);
            }
        }
    }
}


function findUsersOnGameBoard(rawGameState, playersByName) {
    for(const row of rawGameState.board.unit_board) {
        for(const rawEntity of row) {
            if(rawEntity.name) {
                let player = playersByName[rawEntity.name];
                if(!player) {
                    player = new Player(rawEntity.name, rawEntity.dead ? "council" : "tank", []);
                    playersByName[rawEntity.name] = player;
                }
            }
        }
    }
}
