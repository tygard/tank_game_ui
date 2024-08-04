import assert from "node:assert";
import { LogEntry } from "../../../../../src/game/state/log-book/log-entry.js";
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

function makeMockActionSet() {
    return [
        {
            getActionName: () => "bad-action",
        },
        {
            getActionName: () => "shoot",
            getDiceFor: () => {
                return [new Dice(3, "hit die")];
            }
        }
    ];
}


function makeBasicHitEntry(roll) {
    const versionConfig = new MockVersionConfig();

    let hitEntry = new LogEntry({
        action: "shoot",
        subject: "Terence",
        target: "G5",
        hit_roll: {
            type: "die-roll",
            manual: true,
            roll,
        },
    });

    // Reset after calling the constructor
    versionConfig.formatArgs = [];

    return {versionConfig, hitEntry};
}

describe("LogEntry", () => {
    it("can convert dice rolls to be UI friendly", () => {
        let {hitEntry, versionConfig} = makeBasicHitEntry([true, false, true]);
        let actions = makeMockActionSet();
        hitEntry.updateMessageWithBoardState({
            logEntryFormatter: versionConfig,
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
        let actions = makeMockActionSet();
        hitEntry.finalizeEntry({
            gameState: { stateNo: 2 },
            actions,
        });

        // Hit field is unmodified for manual roll
        assert.deepEqual(hitEntry.rawLogEntry.hit_roll.roll, [true, false]);
    });
});
