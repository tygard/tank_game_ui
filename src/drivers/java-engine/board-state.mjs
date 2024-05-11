// State translation functions
//
// These functions serve to create an abstraction between tank_game_ui and TankGame engine.
// By doing so we limit the scope of the changes required to support new versions of the engine.

import Board from "../../game/state/board/board.mjs";
import Entity from "../../game/state/board/entity.mjs";
import { FloorTile } from "../../game/state/board/floor-tile.mjs";
import { GameState } from "../../game/state/game-state.mjs";
import Player from "../../game/state/players/player.mjs";
import Players from "../../game/state/players/players.mjs";
import { Position } from "../../game/state/board/position.mjs";
import { Resource, ResourceHolder } from "../../game/state/resource.mjs";


// User keys that should be treated as resources
const resourceKeys = {
    "tank": new Set(["health", "actions", "range", "gold", "bounty"]),
    "dead-tank": new Set(["health", "gold"]),
    "wall": new Set(["health"]),
};

// The prefix used for the max value of an attribute
const MAX_PREFIX = "MAX_";

// Attributes to remove from all entities
const globalAttributesToDrop = ["dead"];

// Attributes to remove from specific entities
const attributesToDropByType = {
    "dead-tank": ["actions", "range", "bounty"],
};

// Attributes that have a different name in the board state from what is internally expected
const attributesToRenameByType = {
    "wall": {
        durability: "health",
    },
    "tank": {
        durability: "health",
    },
    "dead-tank": {
        durability: "health",
    },
};


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

function getAttributeName(name, type) {
    name = name.toLowerCase();
    return attributesToRenameByType[type]?.[name] || name;
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


function entityFromBoard(rawEntity, position, playersByName) {
    let resources;
    const isDead = (rawEntity.attributes !== undefined) ? rawEntity.attributes.DEAD : rawEntity.dead;
    const type = rawEntity.type == "tank" && isDead ? "dead-tank" : rawEntity.type;

    if(rawEntity.attributes) {
        resources = Object.keys(rawEntity.attributes)
            .filter(name => !name.startsWith(MAX_PREFIX))
            .map(name => {
                return new Resource(
                    getAttributeName(name, type),
                    rawEntity.attributes[name],
                    rawEntity.attributes[`${MAX_PREFIX}${name}`]);
            });
    }
    else {
        // Resources are stored as properties directly on the rawEntity extract them
        resources = Object.keys(rawEntity)
            .filter(name => (resourceKeys[type] || new Set()).has(name))
            .map(name => new Resource(getAttributeName(name, type), rawEntity[name]));
    }

    // Remove any attributes we don't want on this entity
    let attributesToDrop = (attributesToDropByType[type] || []).concat(globalAttributesToDrop);
    resources = resources.filter(resource => !attributesToDrop.includes(resource.name));

    resources = new ResourceHolder(resources);

    const player = playersByName[rawEntity.name];
    let entity = new Entity(type, position, resources);

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
