// State translation functions
//
// These functions serve to create an abstraction between tank_game_ui and TankGame engine.
// By doing so we limit the scope of the changes required to support new versions of the engine.

import Board from "../../../common/state/board/board.mjs";
import Entity from "../../../common/state/board/entity.mjs";
import { FloorTile } from "../../../common/state/board/floor-tile.mjs";
import { GameState } from "../../../common/state/game-state.mjs";
import Player from "../../../common/state/players/player.mjs";
import Players from "../../../common/state/players/players.mjs";
import { Position } from "../../../common/state/board/position.mjs";
import { Resource, ResourceHolder } from "../../../common/state/resource.mjs";


// User keys that should be treated as resources
const resourceKeys = {
    "tank": new Set(["health", "actions", "range", "gold", "bounty"]),
    "dead-tank": new Set(["health"]),
    "wall": new Set(["health"]),
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
    );

    gameState.__day = rawGameState.day;

    return gameState;
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
    const type = rawEntity.type == "tank" && rawEntity.dead ? "dead-tank" : rawEntity.type;

    // Resources are stored as properties directly on the rawEntity extract them
    const resources = Object.keys(rawEntity)
        .filter(name => (resourceKeys[type] || new Set()).has(name))
        .map(name => new Resource(name, rawEntity[name]));

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
        throw new Error(`Board ${boardName} has a length of ${board.length} but previous boards had a length of ${newBoard.height}`);
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
