import Entity from "./entity.js";
import { Position } from "./position.js";

export default class Board {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this._entities = {};
        this._floor = {};
    }

    static deserialize(rawBoard, players) {
        let board = new Board(rawBoard.width, rawBoard.height);

        for(const rawEntry of rawBoard.entities) {
            board.setEntity(Entity.deserialize(rawEntry, players));
        }

        for(const rawFloorTile of rawBoard.floor) {
            board.setFloorTile(Entity.deserialize(rawFloorTile, players));
        }

        return board;
    }

    serialize(gameState) {
        return {
            width: this.width,
            height: this.height,
            entities: Object.values(this._entities).map(entity => entity.serialize(gameState)),
            floor: Object.values(this._floor).map(tile => tile.serialize(gameState)),
        };
    }

    clone() {
        let clone = new Board(this.width, this.height);
        Object.assign(clone._entities, this._entities);
        Object.assign(clone._floor, this._floor);
        return clone;
    }

    _verifyPositon(position, entitiesObject, type) {
        const {humanReadable} = position;

        if(entitiesObject[humanReadable] != undefined && entitiesObject[humanReadable].position.humanReadable != humanReadable) {
            throw new Error(`${type} at ${humanReadable} thinks it should be at ${entitiesObject[humanReadable].position.humanReadable}`);
        }
    }

    getAllEntities() {
        return Object.values(this._entities);
    }

    getEntityAt(position) {
        this._verifyPositon(position, this._entities, "Entity");
        return this._entities[position.humanReadable] || (new Entity({ type: "empty", position }));
    }

    setEntity(entity) {
        if(!this.isInBounds(entity.position)) {
            throw new Error(`Can not set entity ${entity.type} to position ${entity.position.humanReadable} which is outside the bounds of this board ${this.width}x${this.height}`);
        }

        if(entity.type == "empty") {
            delete this._entities[entity.position.humanReadable];
        }
        else {
            this._entities[entity.position.humanReadable] = entity;
        }
    }

    getFloorTileAt(position) {
        this._verifyPositon(position, this._floor, "Floor tile");
        return this._floor[position.humanReadable] || (new Entity({ type: "empty", position }));
    }

    setFloorTile(tile) {
        if(!this.isInBounds(tile.position)) {
            throw new Error(`Can not set floor tile ${tile.type} to position ${tile.position.humanReadable} which is outside the bounds of this board ${this.width}x${this.height}`);
        }

        if(tile.type == "empty") {
            delete this._floor[tile.position.humanReadable];
        }
        else {
            this._floor[tile.position.humanReadable] = tile;
        }
    }

    isInBounds(position) {
        return position.x < this.width && position.y < this.height;
    }

    cloneAndResize({ left = 0, right = 0, top = 0, bottom = 0 } = {}) {
        const newWidth = this.width + left + right;
        const newHeight = this.height + top + bottom;
        let newBoard = new Board(newWidth, newHeight);

        const boardLayers = [
            ["entity", this._entities],
            ["floorTile", this._floor],
        ];

        for(const [targetType, targets] of boardLayers) {
            for(const entity of Object.values(targets)) {
                const newX = entity.position.x + left;
                const newY = entity.position.y + top;

                if(0 <= newX && newX < newWidth && 0 <= newY && newY < newHeight) {
                    let newEntity = entity.clone();
                    newEntity.position = new Position(newX, newY);

                    if(targetType == "entity") {
                        newBoard.setEntity(newEntity);
                    }
                    else {
                        newBoard.setFloorTile(newEntity);
                    }
                }
            }
        }

        return newBoard;
    }
}