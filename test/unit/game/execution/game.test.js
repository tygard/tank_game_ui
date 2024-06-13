import assert from "node:assert";
import { Game } from "../../../../src/game/execution/game.js";
import { MockEngine } from "./game-interactor.test.js";
import { LogBook } from "../../../../src/game/state/log-book/log-book.js";
import { PossibleActionSourceSet } from "../../../../src/game/possible-actions/index.js";

class MockInteractor {
    constructor(opts) {
        this.opts = opts;
    }

    getLogBook() {
        return this.opts.gameData.logBook;
    }

    getGameStateById(id) {
        if(id === 0) {
            return {
                running: true,
            };
        }

        return {
            running: false,
            winner: "Ted",
        };
    }
}

class MockVersionConfig {
    getActionFactories(opts) {
        this.opts = opts;
        return new PossibleActionSourceSet([]);
    }
}

function addDayTwo(game) {
    const logbook = game.getInteractor().getLogBook()
    logbook.addEntry(logbook.makeEntryFromRaw({ day: 2 }));
    game.getInteractor().opts.onEntryAdded(1);
}

async function buildTestGame({ autoStartOfDay, isGameOpen = () => true, waitForLoad = true, gameSettings = {} } = {}) {
    const createAutoStartOfDay = autoStartOfDay ?
        () => ({ start() {}, }) :
        () => { throw new Error("Auto start of day should not be construced"); };

    let game = new Game({
        createEngine,
        createInteractor,
        getGameVersion,
        createAutoStartOfDay,
        gameDataPromise: Promise.resolve({
            gameSettings,
            logBook: LogBook.deserialize({
                gameVersion: "3",
                rawEntries: [
                    { day: 1 },
                ],
            }),
            openHours: {
                isGameOpen,
                hasAutomaticStartOfDay() { return autoStartOfDay; },
            },
        }),
    });

    if(waitForLoad) await game.loaded;

    return game;
}

const createEngine = () => new MockEngine();
const createInteractor = opts => new MockInteractor(opts);
const getGameVersion = () => new MockVersionConfig();

describe("Game", () => {
    it("can load a basic game", async () => {
        let gameOpen = true;
        let game = await buildTestGame({ isGameOpen: () => gameOpen, waitForLoad: false });

        assert.equal(game.getStatusText(), "Loading...");
        assert.equal(game.getState(), "loading");

        await game.loaded;

        game.getInteractor().opts.onEntryAdded(0);

        assert.equal(game.getStatusText(), "Playing, last action: Start of day 1");
        assert.equal(game.getState(), "running");

        gameOpen = false;

        assert.equal(game.getStatusText(), "Outside of this games scheduled hours");
        assert.equal(game.getState(), "off-hours");

        addDayTwo(game);

        assert.equal(game.getStatusText(), "Game over, Ted is victorious!");
        assert.equal(game.getState(), "game-over");
    });

    it("rejects actions when the game is not running", async () => {
        let gameOpen = false;
        let game = await buildTestGame({ isGameOpen: () => gameOpen, waitForLoad: false });

        assert.deepEqual(game.checkUserCreatedEntry({ action: "sleep" }), {
            canSubmit: false,
            error: "Cannot submit actions while the game is in the loading state"
        });

        await game.loaded;

        assert.deepEqual(game.checkUserCreatedEntry({ action: "sleep" }), {
            canSubmit: false,
            error: "Cannot submit actions while the game is in the off-hours state"
        });

        gameOpen = true;

        assert.deepEqual(game.checkUserCreatedEntry({ action: "sleep" }), {
            canSubmit: true,
        });

        addDayTwo(game);

        assert.deepEqual(game.checkUserCreatedEntry({ action: "sleep" }), {
            canSubmit: false,
            error: "Cannot submit actions while the game is in the game-over state"
        });
    });

    it("rejects start of day actions with automatic start of day", async () => {
        let game = await buildTestGame({ autoStartOfDay: true });

        assert.deepEqual(game.checkUserCreatedEntry({ day: 2 }), {
            canSubmit: false,
            error: "Automated start of day is enabled users may not start new days",
        });

        assert.deepEqual(game.checkUserCreatedEntry({ action: "start_of_day" }), {
            canSubmit: false,
            error: "Automated start of day is enabled users may not start new days",
        });

        game = await buildTestGame();

        assert.deepEqual(game.checkUserCreatedEntry({ day: 2 }), {
            canSubmit: true,
        });
    });

    it("manual rolls can only be submitted if allowed by the game settings", async () => {
        let game = await buildTestGame({
            gameSettings: {
                allowManualRolls: false,
            },
        });

        const entryWithManualRoll = {
            hit_roll: {
                type: "die-roll",
                manual: true,
            },
        };

        const entryWithAutoRoll = {
            hit_roll: {
                type: "die-roll",
                manual: false,
            },
        };

        assert.deepEqual(game.checkUserCreatedEntry(entryWithManualRoll), {
            canSubmit: false,
            error: "Manual die rolls are disabled for this game",
        });

        assert.deepEqual(game.checkUserCreatedEntry(entryWithAutoRoll), {
            canSubmit: true,
        });

        game = await buildTestGame();

        assert.deepEqual(game.checkUserCreatedEntry(entryWithManualRoll), {
            canSubmit: true,
        });
    });
});
