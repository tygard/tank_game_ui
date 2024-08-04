import Player from "../../../../../src/game/state/players/player.js";
import assert from "node:assert";
import Players from "../../../../../src/game/state/players/players.js";

const ty = new Player({ name: "Ty", type: "councilor" });
const corey = new Player({ name: "Corey", type: "tank" });
const ryan = new Player({ name: "Ryan", type: "senator" });
const lena = new Player({ name: "Lena", type: "councilor" });
const xavion = new Player({ name: "Xavion", type: "tank" });
const players = new Players([ty, ryan, corey, lena, xavion]);
const players2 = new Players([ty, lena, xavion]);


describe("Board", () => {
    describe("Players", () => {
        it("can get a list of players for a given type", () => {
            assert.deepEqual(players.getPlayersByType("tank"), [corey, xavion]);
            assert.deepEqual(players.getPlayersByType("senator"), [ryan]);
            assert.deepEqual(players.getPlayersByType("councilor"), [ty, lena]);
        });

        it("can list all types it knows about", () => {
            assert.deepEqual(players.getAllPlayerTypes(), ["councilor", "senator", "tank"]);
            assert.deepEqual(players2.getAllPlayerTypes(), ["councilor", "tank"]);
        });

        it("can find players by name", () => {
            assert.deepEqual(players.getPlayerByName("Xavion"), xavion);
            assert.deepEqual(players.getPlayerByName("Ty"), ty);
            assert.deepEqual(players.getPlayerByName("Dan"), undefined);
        });

        it("can list all players", () => {
            assert.deepEqual(players.getAllPlayers(), [ty, ryan, corey, lena, xavion]);
            assert.deepEqual(players2.getAllPlayers(), [ty, lena, xavion]);
        });
    });
});