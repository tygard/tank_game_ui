import Entity from "../../../../../src/game/state/board/entity.js";
import { Position } from "../../../../../src/game/state/board/position.js";
import Player from "../../../../../src/game/state/players/player.js";
import { Attribute, AttributeHolder } from "../../../../../src/game/state/attribute.js";
import assert from "node:assert";

describe("Board", () => {
    describe("Player", () => {
        it("can get a list of attributes that they control", () => {
            const gold = new Attribute("gold", 5);
            const health = new Attribute("health", 3);
            const straw = new Attribute("straw", 16);

            let ty = new Player("Ty", "tank", [
                new Entity("tank", new Position(0, 0), new AttributeHolder([
                    gold,
                    health,
                ])),
                new Entity("stable", new Position(5, 2), new AttributeHolder([
                    straw,
                ])),
            ]);

            assert.deepEqual(
                ty.getControlledAttributes(),
                new AttributeHolder([gold, health, straw]));
        });
    });
});