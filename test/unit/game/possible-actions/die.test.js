import assert from "node:assert";
import { Dice } from "../../../../src/game/possible-actions/die.js";

const dice = new Dice(3, "hit die");

describe("Dice", () => {
    it("can translate die sides", () => {
        assert.equal(dice.die.translateValue("hit"), true);
        assert.equal(dice.die.translateValue("miss"), false);
    });

    it("can get info from a side dice", () => {
        assert.deepEqual(dice.die.getSideFromValue(true), { display: "hit", icon: "hit" });
        assert.deepEqual(dice.die.getSideFromValue(false), { display: "miss", icon: "" });
    });

    it("can expand dice sets", () => {
        assert.deepEqual(dice.expandDice(), [dice.die, dice.die, dice.die]);
        assert.deepEqual(Dice.expandAll([dice, dice]),
            [dice.die, dice.die, dice.die, dice.die, dice.die, dice.die]);
    });
});
