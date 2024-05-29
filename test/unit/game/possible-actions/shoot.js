import assert from "node:assert";
import { Dice } from "../../../../src/game/possible-actions/die.js";
import { ShootAction } from "../../../../src/game/possible-actions/shoot.js";
import { LogFieldSpec } from "../../../../src/game/possible-actions/log-field-spec.js";
import { DiceLogFieldSpec } from "../../../../src/game/possible-actions/dice-log-field-spec.js";

const shoot = new ShootAction({
    targets: [
        { position: "B2", dice: [] },
        { position: "B4", dice: [new Dice(2, "hit die")] },
        { position: "A1", dice: [new Dice(5, "hit die")] },
    ]
});

describe("ShootAction", () => {
    it("can create the correct die rolling fields for a given target", () => {
        const positionSelector = new LogFieldSpec({
            name: "target",
            type: "select-position",
            options: ["B2", "B4", "A1"],
        });

        assert.deepEqual(shoot.getParameterSpec({}), [
            positionSelector,
        ]);

        assert.deepEqual(shoot.getParameterSpec({ target: "B2" }), [
            positionSelector,
            new LogFieldSpec({ name: "hit", type: "set-value", value: true }),
        ]);

        assert.deepEqual(shoot.getParameterSpec({ target: "B4" }), [
            positionSelector,
            new DiceLogFieldSpec({ name: "hit_roll", dice: [new Dice(2, "hit die")] }),
        ]);

        assert.deepEqual(shoot.getParameterSpec({ target: "A1" }), [
            positionSelector,
            new DiceLogFieldSpec({ name: "hit_roll", dice: [new Dice(5, "hit die")] }),
        ]);
    });

    it("can be serialized and deserialized", () => {
        const shootSerialized = ShootAction.deserialize(shoot.serialize());
        assert.deepEqual(shootSerialized, shoot);
    });
});