import assert from "node:assert";
import Board from "../../../../../src/game/state/board/board.js";
import Entity from "../../../../../src/game/state/board/entity.js";
import { Position } from "../../../../../src/game/state/board/position.js";
import { ResourceHolder } from "../../../../../src/game/state/resource.js";
import { FloorTile } from "../../../../../src/game/state/board/floor-tile.js";

let board = new Board(7, 5);

const tank1 = new Entity("tank", new Position(0, 0), new ResourceHolder());
const destroyedTank = new Entity("dead-tank", new Position(2, 3), new ResourceHolder());
const tank2 = new Entity("tank", new Position(6, 4), new ResourceHolder());
const baloon = new Entity("baloon", new Position(1, 1), new ResourceHolder());

board.setEntity(tank1);
board.setEntity(destroyedTank);
board.setEntity(tank2);
board.setEntity(baloon);

const goldMine1 = new FloorTile("gold_mine", new Position(4, 4));
const goldMine2 = new FloorTile("gold_mine", new Position(1, 3));
const base = new FloorTile("base", new Position(2, 3));
board.setFloorTile(goldMine1);
board.setFloorTile(goldMine2);
board.setFloorTile(base);

const empty = new Entity("empty", new Position(3, 2), new ResourceHolder());
const emptyTile = new FloorTile("empty", new Position(6, 4));


describe("Board", () => {
    it("can find the entity at a space", () => {
        assert.deepEqual(board.getEntityAt(new Position(0, 0)), tank1);
        assert.deepEqual(board.getEntityAt(new Position(2, 3)), destroyedTank);
        assert.deepEqual(board.getEntityAt(new Position(3, 2)), empty);
    });

    it("can find the floor tile at a space", () => {
        assert.deepEqual(board.getFloorTileAt(new Position(1, 3)), goldMine2);
        assert.deepEqual(board.getFloorTileAt(new Position(2, 3)), base);
        assert.deepEqual(board.getFloorTileAt(new Position(6, 4)), emptyTile);
    });

    it("can be serialize and deserialized", () => {
        const reSerializedBoard = Board.deserialize(board.serialize());
        assert.deepEqual(reSerializedBoard, board);
    });
});