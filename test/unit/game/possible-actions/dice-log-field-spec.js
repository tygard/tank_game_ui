import assert from "node:assert";
import { DiceLogFieldSpec } from "../../../../src/game/possible-actions/dice-log-field-spec.js";
import { Dice } from "../../../../src/game/possible-actions/die.js";

const hitField = new DiceLogFieldSpec({
    dice: [
        new Dice(2, "hit die"),
    ],
});

describe("DiceLogFieldSpec", () => {
    it("can translate a uiFieldValue to a logbook field", () => {
        // Automatic
        assert.deepEqual(hitField.translateValue({}),
            { type: "die-roll", manual: false });

        assert.deepEqual(hitField.translateValue({ manual: false }),
            { type: "die-roll", manual: false });

        // Manual
        assert.deepEqual(hitField.translateValue({ manual: true }),
            undefined);

        assert.deepEqual(hitField.translateValue({
            manual: true,
            dice: ["miss", undefined],
        }), {
            type: "die-roll",
            manual: true,
            roll: [false, undefined],
        });

        assert.deepEqual(hitField.translateValue({
            manual: true,
            dice: ["miss", "hit"],
        }), {
            type: "die-roll",
            manual: true,
            roll: [false, true],
        });
    });

    it("can check if a log field is valid", () => {
        assert.ok(!hitField.isValid(undefined));

        assert.ok(hitField.isValid({
            type: "die-roll",
            manual: false,
        }));

        assert.ok(!hitField.isValid({
            type: "die-roll",
            manual: true,
        }));

        assert.ok(!hitField.isValid({
            type: "die-roll",
            manual: true,
            roll: [false],
        }));

        assert.ok(!hitField.isValid({
            type: "die-roll",
            manual: true,
            roll: [false, undefined],
        }));

        assert.ok(hitField.isValid({
            type: "die-roll",
            manual: true,
            roll: [false, true],
        }));
    });
});
