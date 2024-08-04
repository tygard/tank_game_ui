/* global URL */
import assert from "node:assert";
import path from "node:path";
import * as boardStateMain from "../../../../src/drivers/java-engine/board-state-main.js";
import * as boardStateStable from "../../../../src/drivers/java-engine/board-state-stable.js";
import { load } from "../../../../src/drivers/game-file.js";
import { stripPlayerIds } from "../../helpers.js";
import { getLatestFilePath } from "../test-file-helper.js";

const SAMPLE_STATE = getLatestFilePath();

const BOARD_STATE_VERSIONS = [
    ["stable", boardStateStable],
    ["main", boardStateMain],
];

describe("EngineInterop", () => {
    for(const [branch, library] of BOARD_STATE_VERSIONS) {
        it(`can translate to and from the engine state format (${branch})`, async () => {
            const {initialGameState} = await load(SAMPLE_STATE);

            const translated = library.gameStateFromRawState(library.gameStateToRawState(initialGameState, "default-v3")).gameState;

            stripPlayerIds(translated);
            stripPlayerIds(initialGameState);

            assert.deepEqual(translated, initialGameState);
        });
    }
});