import fs from "node:fs";
import assert from "node:assert";
import { gameStateFromRawState } from "../../src/java-engine/board-state.mjs";

const SUPPORTED_VERSIONS = ["v3"];

describe("EngineInterop", () => {
    describe("BoardState", () => {
        for(const supportedVersion of SUPPORTED_VERSIONS) {
            it(`can deserialize ${supportedVersion} state`, () => {
                const tankGameJarState = JSON.parse(fs.readFileSync(`test/backend/test-files/jar-game-state-${supportedVersion}.json`, "utf8"));
                const expectedTankGameJarState = JSON.parse(fs.readFileSync(`test/backend/test-files/jar-game-state-${supportedVersion}-expected.json`, "utf8"));

                const gameState = gameStateFromRawState(tankGameJarState);

                assert.deepEqual(gameState.serialize(), expectedTankGameJarState);
            });
        }
    });
});