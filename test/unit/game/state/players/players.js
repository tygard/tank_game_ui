import Player from "../../../../../src/game/state/players/player.js";
import assert from "node:assert";
import Players from "../../../../../src/game/state/players/players.js";
import Entity from "../../../../../src/game/state/board/entity.js";
import { Position } from "../../../../../src/game/state/board/position.js";
import { ResourceHolder } from "../../../../../src/game/state/resource.js";
import Board from "../../../../../src/game/state/board/board.js";

const ty = new Player("Ty", "councilor", []);
const corey = new Player("Corey", "tank", []);
const ryan = new Player("Ryan", "senator", []);
const lena = new Player("Lena", "councilor", []);
const xavion = new Player("Xavion", "tank", []);
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

        it("can be serialized and deserialized", () => {
            let board = new Board(2, 2);
            let beyerTank = new Entity("tank", new Position(1, 0), new ResourceHolder());
            let beyer = new Player("Beyer", "tank", [beyerTank]);
            beyerTank.player = beyer;
            board.setEntity(beyerTank);

            let players3 = new Players([beyer, ty]);

            const reSerializedPlayers = Players.deserialize(players3.serialize(), board);
            assert.deepEqual(reSerializedPlayers, players3);
        });
    });
});