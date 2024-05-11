import Entity from "../../../../../src/game/state/board/entity.mjs";
import { Position } from "../../../../../src/game/state/board/position.mjs";
import Player from "../../../../../src/game/state/players/player.mjs";
import { Resource, ResourceHolder } from "../../../../../src/game/state/resource.mjs";
import assert from "node:assert";

describe("Board", () => {
    describe("Player", () => {
        it("can get a list of resources that they control", () => {
            const gold = new Resource("gold", 5);
            const health = new Resource("health", 3);
            const straw = new Resource("straw", 16);

            let ty = new Player("Ty", "tank", [
                new Entity("tank", new Position(0, 0), new ResourceHolder([
                    gold,
                    health,
                ])),
                new Entity("stable", new Position(5, 2), new ResourceHolder([
                    straw,
                ])),
            ]);

            assert.deepEqual(
                ty.getControlledResources(),
                new ResourceHolder([gold, health, straw]));
        });
    });
});