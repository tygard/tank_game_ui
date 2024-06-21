/* global URL */
import assert from "node:assert";
import path from "node:path";
import { gameStateFromRawState, gameStateToRawState } from "../../../../src/drivers/java-engine/board-state.js";
import { FILE_FORMAT_VERSION, load } from "../../../../src/drivers/game-file.js";

const SAMPLE_STATE = path.join(path.dirname(new URL(import.meta.url).pathname), `../test-files/tank_game_v3_format_v${FILE_FORMAT_VERSION}.json`);

describe("EngineInterop", () => {
    it("can translate to and from the engine state format", async () => {
        const {initialGameState} = await load(SAMPLE_STATE);

        const translated = gameStateFromRawState(gameStateToRawState(initialGameState)).gameState;
        assert.deepEqual(translated, initialGameState);
    });
});