// State translation functions
//
// These functions serve to create an abstraction between tank_game_ui and TankGame engine.
// By doing so we limit the scope of the changes required to support new versions of the engine.

import Board from "../../game/state/board/board.js";
import Entity from "../../game/state/board/entity.js";
import { GameState } from "../../game/state/game-state.js";
import Player from "../../game/state/players/player.js";
import Players from "../../game/state/players/players.js";
import { Position } from "../../game/state/board/position.js";
import { logger } from "#platform/logging.js";


const deadTankAttributesToRemove = ["$ACTIONS", "$RANGE", "$BOUNTY"];

function mapTypeToClass(type, boardType, gameVersion) {
    if(type == "empty") {
        return boardType == "entity" ? "EmptyUnit" : "WalkableFloor";
    }

    if(type == "tank") {
        switch(gameVersion) {
            case "3": return "GenericTank";
            case "4": return "GenericTank";
        }
    }

    const className = {
        wall: "Wall",
        gold_mine: "GoldMine",
    }[type];

    if(className === undefined) throw new Error(`Could not find class name for ${type}`);

    return className;
}

function mapClassToType(className) {
    const type = {
        Wall: "wall",
        GoldMine: "gold_mine",
        GenericTank: "tank",
        EmptyUnit: "empty",
        WalkableFloor: "empty",
        GlobalCooldownTank: "tank",
    }[className];

    if(type === undefined) throw new Error(`Could not find type for ${className}`);

    return type;
}


export function gameStateFromRawState(rawGameState) {
    const playersByName = buildUserLists(rawGameState);

    let board = convertBoard(undefined, rawGameState.$BOARD.unit_board, (newBoard, rawEntity, position) => {
        newBoard.setEntity(entityFromBoard(rawEntity, position, playersByName));
    });

    board = convertBoard(board, rawGameState.$BOARD.floor_board, (newBoard, space, position) => {
        newBoard.setFloorTile(new Entity({
            type: mapClassToType(space.class),
            position,
        }));
    });

    let gameState = new GameState(
        new Players(Object.values(playersByName)),
        board,
        {
            council: convertCouncil(rawGameState.$COUNCIL, playersByName),
        },
    );

    let victoryInfo;

    if(rawGameState.$WINNER?.length > 1) {
        victoryInfo = {
            type: rawGameState.$WINNER == "Council" ? "armistice_vote" : "last_tank_standing",
            winners: rawGameState.$WINNER == "Council" ?
                gameState.metaEntities.council.getPlayerRefs().map(ref => ref.getPlayer(gameState)) :
                [gameState.players.getPlayerByName(rawGameState.$WINNER)],
        };
    }

    return {
        gameState,
        victoryInfo,
    };
}

function getAttributeName(name, type, rawAttributes) {
    name = name.toLowerCase();

    if(name.startsWith("$")) {
        name = name.slice(1);
    }

    if(type == "tank" && !rawAttributes.$DEAD && name == "durability") {
        return "health";
    }

    return name;
}

function shouldKeepAttribute(attributeName, rawAttributes) {
    if(!attributeName.startsWith("$")) return false;

    if(["$DEAD", "$POSITION", "$PLAYER_REF"].includes(attributeName)) {
        return false;
    }

    if(rawAttributes.$DEAD) {
        return !deadTankAttributesToRemove.includes(attributeName);
    }

    return true;
}

function decodeAttributes(type, rawAttributes) {
    let attributes = {};

    for(const attributeName of Object.keys(rawAttributes)) {
        if(!shouldKeepAttribute(attributeName, rawAttributes)) continue;

        const actualName = getAttributeName(attributeName, type, rawAttributes);
        attributes[actualName] = rawAttributes[attributeName];
    }

    return attributes;
}

function convertPlayer(rawPlayer) {
    if(rawPlayer.class != "Player") throw new Error(`Expected player but got ${rawPlayer.class}`);

    return new Player(decodeAttributes(undefined, rawPlayer));
}

function getCouncilPlayers(rawCouncil, playersByName) {
    let councilPlayers = [];

    const councilGroups = [
        [rawCouncil.$COUNCILLORS.elements, "councilor"],
        [rawCouncil.$SENATORS.elements, "senator"]
    ];

    for(const [users, userType] of councilGroups) {
        for(const playerRef of users) {
            const {name} = playerRef;
            if(playersByName[name]) {
                // Being a councelor overrides the user's previous state
                playersByName[name].attributes.type = userType;
            }

            councilPlayers.push(playersByName[name]);
        }
    }

    return councilPlayers;
}

function convertCouncil(rawCouncil, playersByName) {
    let attributes = {
        coffer: rawCouncil.$COFFER,
    };

    if(rawCouncil.$ARMISTICE_MAX !== undefined) {
        attributes.armistice = {
            value: rawCouncil.$ARMISTICE_COUNT,
            max: rawCouncil.$ARMISTICE_MAX,
        };
    }

    const players = getCouncilPlayers(rawCouncil, playersByName);
    return new Entity({ type: "council", attributes, players });
}

function entityFromBoard(rawEntity, position, playersByName) {
    const type = mapClassToType(rawEntity.class);
    let attributes = decodeAttributes(type, rawEntity);

    let entity = new Entity({
        type,
        position,
        attributes,
    });

    const {$PLAYER_REF} = rawEntity;
    if($PLAYER_REF) {
        const player = playersByName[$PLAYER_REF.name];
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

function buildUserLists(rawGameState) {
    let playersByName = {};

    for(const rawPlayer of rawGameState.$PLAYERS.elements) {
        playersByName[rawPlayer.$NAME] = convertPlayer(rawPlayer);
    }

    return playersByName;
}

////////////////////////////////////////////////////////////////////////////////

function buildPosition(position) {
    return {
        class: "Position",
        x: position.x,
        y: position.y,
    };
}

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

function buildPlayerRef(player) {
    return {
        class: "PlayerRef",
        name: player.name,
    };
}

function buildPlayer(player) {
    let attributes = {};

    for(const attributeName of Object.keys(player.attributes)) {
        attributes["$" + attributeName.toUpperCase()] = player.attributes[attributeName];
    }

    return {
        class: "Player",
        ...attributes,
    };
}

function buildUnit(position, board, gameVersion, gameState) {
    const entity = board.getEntityAt(position);

    let attributes = {};
    for(const attributeName of Object.keys(entity.attributes)) {
        attributes["$" + attributeName.toUpperCase()] = entity.attributes[attributeName];
    }

    if(entity.type == "tank") {
        attributes.$DEAD = entity.attributes.durability !== undefined;

        for(const removedAttibute of deadTankAttributesToRemove) {
            if(attributes[removedAttibute] === undefined) {
                attributes[removedAttibute] = 0;
            }
        }

        if(attributes.$DURABILITY === undefined) {
            attributes.$DURABILITY = attributes.$HEALTH;
            delete attributes.$HEALTH;
        }
    }

    attributes.$POSITION = buildPosition(entity.position);

    if(entity.getPlayerRefs().length > 0) {
        attributes.$PLAYER_REF = buildPlayerRef(entity.getPlayerRefs()[0].getPlayer(gameState));
    }

    return {
        class: mapTypeToClass(entity.type, "entity", gameVersion),
        ...attributes,
    };
}

function buildFloor(position, board, gameVersion) {
    const tile = board.getFloorTileAt(position);

    return {
        class: mapTypeToClass(tile.type, "floorTile", gameVersion),
        $POSITION: buildPosition(tile.position),
    };
}

function makeCouncilList(council, playerType, gameState) {
    const players = council.getPlayerRefs()
        .map(playerRef => playerRef.getPlayer(gameState))
        .filter(player => player.type == playerType)
        .map(player => buildPlayerRef(player));

    return {
        "class": "AttributeList",
        elements: players,
    }
}

function makeCouncil(councilEntity, gameState) {
    let additionalAttributes = {};

    if(councilEntity.attributes.armistice !== undefined) {
        additionalAttributes = {
            ...additionalAttributes,
            $ARMISTICE_COUNT: councilEntity.attributes.armistice.value,
            $ARMISTICE_MAX: councilEntity.attributes.armistice.max,
        };
    }

    return {
        class: "Council",
        $COFFER: councilEntity.attributes.coffer,
        ...additionalAttributes,
        $COUNCILLORS: makeCouncilList(councilEntity, "councilor", gameState),
        $SENATORS: makeCouncilList(councilEntity, "senator", gameState),
    };
}

export function gameStateToRawState(gameState, gameVersion) {
    return {
        class: "State",
        // It's assumed that we only interact with the engine when the game is active
        $RUNNING: true,
        $TICK: 0,
        $BOARD: {
            class: "Board",
            unit_board: buildBoard(gameState.board, (position, board) => buildUnit(position, board, gameVersion, gameState)),
            floor_board: buildBoard(gameState.board, (position, board) => buildFloor(position, board, gameVersion)),
        },
        $COUNCIL: makeCouncil(gameState.metaEntities.council, gameState),
        $PLAYERS: {
            class: "AttributeList",
            elements: gameState.players.getAllPlayers().map(player => buildPlayer(player)),
        },
    };
}
