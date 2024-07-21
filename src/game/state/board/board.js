import Entity from "./entity.js";

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

    serialize() {
        return {
            width: this.width,
            height: this.height,
            entities: Object.values(this._entities).map(entity => entity.serialize()),
            floor: Object.values(this._floor).map(tile => tile.serialize()),
        };
    }

    _verifyPositon(position, entitiesObject, type) {
        const {humanReadable} = position;

        if(entitiesObject[humanReadable] != undefined && entitiesObject[humanReadable].position.humanReadable != humanReadable) {
            throw new Error(`${type} at ${humanReadable} thinks it should be at ${entitiesObject[humanReadable].position.humanReadable}`);
        }
    }

    getEntityAt(position) {
        this._verifyPositon(position, this._entities, "Entity");
        return this._entities[position.humanReadable] || (new Entity({ type: "empty", position }));
    }

    setEntity(entity) {
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

    getAllEntities() {
        return Object.values(this._entities);
    }
}