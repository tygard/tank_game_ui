import assert from "node:assert";
import Board from "../../../../../src/game/state/board/board.js";
import Entity from "../../../../../src/game/state/board/entity.js";
import { Position } from "../../../../../src/game/state/board/position.js";
import Player from "../../../../../src/game/state/players/player.js";
import Players from "../../../../../src/game/state/players/players.js";

let board = new Board(7, 5);

const tank1 = new Entity({ type: "tank", position: new Position("A1") });
const destroyedTank = new Entity({ type: "dead-tank", position: new Position("C4") });
let tank2 = new Entity({ type: "tank", position: new Position("G5") });
const baloon = new Entity({ type: "baloon", position: new Position("B2") });

let josh = new Player({ name: "Josh", type: "tank" });
tank2.addPlayer(josh);

board.setEntity(tank1);
board.setEntity(destroyedTank);
board.setEntity(tank2);
board.setEntity(baloon);

const goldMine1 = new Entity({ type: "gold_mine", position: new Position("E5") });
const goldMine2 = new Entity({ type: "gold_mine", position: new Position("B4") });
const base = new Entity({ type: "base", position: new Position("C4") });
board.setFloorTile(goldMine1);
board.setFloorTile(goldMine2);
board.setFloorTile(base);

const empty = new Entity({ type: "empty", position: new Position("D3") });
const emptyTile = new Entity({ type: "empty", position: new Position("G5") });


describe("Board", () => {
    it("can find the entity at a space", () => {
        assert.deepEqual(board.getEntityAt(new Position("A1")), tank1);
        assert.deepEqual(board.getEntityAt(new Position("C4")), destroyedTank);
        assert.deepEqual(board.getEntityAt(new Position("D3")), empty);
    });

    it("can find the floor tile at a space", () => {
        assert.deepEqual(board.getFloorTileAt(new Position("B4")), goldMine2);
        assert.deepEqual(board.getFloorTileAt(new Position("C4")), base);
        assert.deepEqual(board.getFloorTileAt(new Position("G5")), emptyTile);
    });

    it("can be serialize and deserialized", () => {
        let players = new Players([josh]);
        const reSerializedBoard = Board.deserialize(board.serialize({players}), players);
        assert.deepEqual(reSerializedBoard, board);
    });

    it("can check if a position is in bounds", () => {
        assert.ok(!board.isInBounds(new Position(7, 5)));
        assert.ok(!board.isInBounds(new Position(7, 0)));
        assert.ok(!board.isInBounds(new Position(0, 5)));
        assert.ok(!board.isInBounds(new Position(50, 50)));
    });

    it("can be shrunk", () => {
        const leftShrunkBoard = board.cloneAndResize({ left: -1, bottom: -1 });
        assert.equal(leftShrunkBoard.width, 6);
        assert.equal(leftShrunkBoard.height, 4);
        assert.equal(leftShrunkBoard.getEntityAt(new Position("A1")).type, "empty");
        assert.equal(leftShrunkBoard.getEntityAt(new Position("A2")).type, "baloon");

        const shrunkBoard = board.cloneAndResize({ left: -2, bottom: -1, top: -3, right: -4 });
        assert.equal(shrunkBoard.width, 1);
        assert.equal(shrunkBoard.height, 1);
        assert.equal(shrunkBoard.getEntityAt(new Position("A1")).type, "dead-tank");
        assert.equal(shrunkBoard.getFloorTileAt(new Position("A1")).type, "base");
    });

    it("can be grown", () => {
        const grownBoard = board.cloneAndResize({ left: 1, bottom: 4, top: 2, right: 3 });
        assert.equal(grownBoard.width, 11);
        assert.equal(grownBoard.height, 11);
        assert.equal(grownBoard.getEntityAt(new Position("B3")).type, "tank");
        assert.equal(grownBoard.getEntityAt(new Position("D6")).type, "dead-tank");
        assert.equal(grownBoard.getFloorTileAt(new Position("F7")).type, "gold_mine");
    });

    it("can be shift (grow + shrink) the board", () => {
        const shiftedBoard = board.cloneAndResize({ left: -1, bottom: 2, top: -2, right: 1 });
        assert.equal(shiftedBoard.width, 7);
        assert.equal(shiftedBoard.height, 5);
        assert.equal(shiftedBoard.getEntityAt(new Position("B2")).type, "dead-tank");
        assert.equal(shiftedBoard.getEntityAt(new Position("F3")).type, "tank");
        assert.equal(shiftedBoard.getFloorTileAt(new Position("D3")).type, "gold_mine");
    });
});