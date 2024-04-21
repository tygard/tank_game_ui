import fs from "node:fs";
import assert from "node:assert";
import { gameStateFromRawState, gameStateToRawState } from "../../src/java-engine/board-state.mjs";

const tankGameJarState = JSON.parse(fs.readFileSync("test/backend/jar-game-state.json", "utf8"));

describe("EngineInterop", () => {
    describe("BoardState", () => {
        it("can serialize and deserialize", () => {
            const gameState = gameStateFromRawState(tankGameJarState);
            let rawState = gameStateToRawState(gameState);

            assert.deepEqual(rawState, tankGameJarState);
        });
    });
});