import { AttributeHolder } from "../attribute.js";
import { objectMap } from "../../../utils.js";
import Entity from "./entity.js";
import { FloorTile } from "./floor-tile.js";
import { Position } from "./position.js";

export default class Board {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this._entities = {};
        this._floor = {};
    }

    static deserialize(rawBoard) {
        // Skip the constructor to avoid filling the board twice
        let board = new Board(rawBoard.width, rawBoard.height);
        board._entities = objectMap(rawBoard.entities,
            (entity, humanPos) => Entity.deserialize(entity, Position.fromHumanReadable(humanPos)));
        board._floor = objectMap(rawBoard.floor,
            (floor, humanPos) => FloorTile.deserialize(floor, Position.fromHumanReadable(humanPos)));
        return board;
    }

    serialize() {
        return {
            width: this.width,
            height: this.height,
            entities: objectMap(this._entities, entity => entity.serialize()),
            floor: objectMap(this._floor, tile => tile.serialize()),
        };
    }

    getEntityAt(position) {
        return this._entities[position.humanReadable] || (new Entity("empty", position, new AttributeHolder()));
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
        return this._floor[position.humanReadable] || (new FloorTile("empty", position));
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
}