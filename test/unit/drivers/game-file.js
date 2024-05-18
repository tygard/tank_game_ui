import assert from "node:assert";
import { FILE_FORMAT_VERSION, GameManager, MINIMUM_SUPPORTED_FILE_FORMAT_VERSION, load, save } from "../../../src/drivers/game-file.js";
import path from "node:path";
import fs from"node:fs";
import { MockEngine } from "../game/execution/game-interactor.js";
import { hashFile } from "../../../src/drivers/file-utils.js";

const TEST_FILES = "test/unit/drivers/test-files";
const sampleFileBaseName = `tank_game_v3_format_v${FILE_FORMAT_VERSION}`;
const sampleFilePath = path.join(TEST_FILES, `${sampleFileBaseName}.json`);


function validateLogBook(logBook) {
    assert.equal(logBook.getMaxDay(), 16);
    assert.equal(logBook.getEntry(77).type, "shoot");
}

function validateSampleFile({logBook, initialGameState}) {
    // Sanity check a few properties to make sure we loaded the data
    validateLogBook(logBook);
    assert.equal(initialGameState.board.unit_board.length, 11);
    assert.equal(initialGameState.board.unit_board[0].length, 11);
    assert.deepEqual(initialGameState.council.council, []);
}


describe("GameFile", () => {
    it("can load and deserialize the latest format with version specific config", async () => {
        validateSampleFile(await load(sampleFilePath));
    });

    it("can load and deserialize the latest format without version specific config", async () => {
        validateSampleFile(await load(sampleFilePath));
    });

    for(let version = MINIMUM_SUPPORTED_FILE_FORMAT_VERSION; version < FILE_FORMAT_VERSION; ++version) {
        it(`loading version ${version} returns the same data as version ${FILE_FORMAT_VERSION}`, async () => {
            const oldFilePath = path.join(TEST_FILES, `tank_game_v3_format_v${version}.json`);

            const oldFile = await load(oldFilePath);
            const newFile = await load(sampleFilePath);

            assert.deepEqual(oldFile, newFile);
        });
    }

    it("loading and saving a file recreates the original file", async () => {
        const tempFile = path.join(TEST_FILES, `tank_game_temp_test_file-load-save.json`);

        await save(tempFile, await load(sampleFilePath));

        const orig = await hashFile(sampleFilePath);
        const recreated = await hashFile(tempFile);

        assert.equal(orig, recreated);

        // This only deletes the temp file on success so that it can be analyzed on failure.  The temp file
        // is in the git ignore.
        fs.unlinkSync(tempFile);
    });

    it("can load all of the games in a folder", async () => {
        const mockEngineFactory = () => new MockEngine();

        // This test logs load errors to the console as warnings.  You may want to set the LOG_LEVEL to info
        // in the package.json if you want to debug this test.
        const gameManager = new GameManager(TEST_FILES, mockEngineFactory);

        await gameManager.loaded;

        // Wait for all the games to load and swallow the load errors
        await Promise.all(
            gameManager.getAllGames()
                .map(name => gameManager.getGamePromise(name).catch(() => {}))
        );

        const {interactor: game} = await gameManager.getGamePromise(sampleFileBaseName);

        validateLogBook(game.getLogBook());

        // Files from previous versions should be loaded
        for(let version = MINIMUM_SUPPORTED_FILE_FORMAT_VERSION; version < FILE_FORMAT_VERSION; ++version) {
            assert.ok(gameManager.getGame(`tank_game_v3_format_v${version}`).loaded);
        }

        // The invalid file should not be loaded
        assert.equal(gameManager.getGame("bad_file").error, "File format version missing not a valid game file");
        assert.ok(!gameManager.getGame("bad_file").loaded);

        // Invalid games should return an error
        assert.equal(gameManager.getGame("unknown_file").error, "unknown_file is not a valid game");
    });
});