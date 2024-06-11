import assert from "node:assert";
import { LogBook } from "../../../../../src/game/state/log-book/log-book.js";
import { rawLogBook } from "./log-book.test.js";
import { LogEntry } from "../../../../../src/game/state/log-book/entry.js";
import { Dice } from "../../../../../src/game/possible-actions/die.js";

class MockVersionConfig {
    constructor() {
        this.formatArgs = [];
    }

    formatLogEntry(logEntry, gameState) {
        this.formatArgs.push([logEntry, gameState]);
        return "My formatted message";
    }
}

class MockActionSet {
    constructor() {
        this.getArgs = [];
        this.diceArgs = [];
    }

    get(actionName) {
        this.getArgs.push(actionName);
        return {
            getDiceFor: (...args) => {
                this.diceArgs.push(args);
                return [new Dice(3, "hit die")];
            }
        };
    }
}


function makeBasicHitEntry(roll) {
    const versionConfig = new MockVersionConfig();

    let hitEntry = new LogEntry(-1, {
        action: "shoot",
        subject: "Terence",
        target: "G5",
        hit_roll: {
            type: "die-roll",
            manual: true,
            roll,
        },
    }, -1, versionConfig);

    // Reset after calling the constructor
    versionConfig.formatArgs = [];

    return {versionConfig, hitEntry};
}

describe("LogEntry", () => {
    it("can format messages based on the game version config", () => {
        const expectedMessages = [
            "Start of day 1",
            "Corey shot I6",
            "Start of day 2",
            "Xavion traded 5 gold for actions",
            "Corey moved to H4",
        ];

        const logBook = LogBook.deserialize(rawLogBook);
        for(let i = 0; i <= logBook.getLastEntryId(); ++i) {
            assert.equal(logBook.getEntry(i).message, expectedMessages[i]);
        }
    });

    it("can convert dice rolls to be UI friendly", () => {
        let {hitEntry, versionConfig} = makeBasicHitEntry([true, false, true]);
        let actions = new MockActionSet();
        hitEntry.updateMessageWithBoardState({
            previousState: { stateNo: 2 },
            actions,
        });

        assert.equal(hitEntry.message, "My formatted message")
        assert.deepEqual(versionConfig.formatArgs, [
            [hitEntry, { stateNo: 2 }],
        ]);

        assert.deepEqual(hitEntry.dieRolls, {
            hit_roll: [
                { display: "hit", icon: "hit" },
                { display: "miss", icon: "" },
                { display: "hit", icon: "hit" },
            ],
        });
    });

    it("can finalize the log entry", () => {
        let {hitEntry} = makeBasicHitEntry([true, false]);
        let actions = new MockActionSet();
        hitEntry.finalizeEntry({
            gameState: { stateNo: 2 },
            allowManualRolls: true,
            actions,
        });

        // Hit field is unmodified for manual roll
        assert.deepEqual(hitEntry.rawLogEntry.hit_roll.roll, [true, false]);

        hitEntry.finalizeEntry({
            gameState: { stateNo: 2 },
            allowManualRolls: false,
            actions,
        });

        assert.deepEqual(actions.getArgs, ["shoot", "shoot"]);

        assert.deepEqual(actions.diceArgs, [
            ["hit_roll", {
                rawLogEntry: hitEntry.rawLogEntry
            }],
        ]);

        // Manual rolls are disabled so this should be forced to be automatic
        // and use the number of dice specified by the rules not the client
        assert.equal(hitEntry.rawLogEntry.hit_roll.manual, false);
        assert.equal(hitEntry.rawLogEntry.hit_roll.roll.length, 3);
    });
});
