import { deserializer } from "../../deserialization.js";
import { prettyifyName } from "../../utils.js";
import { Dice } from "./die.js";

export class DiceLogFieldSpec {
    constructor({ name, display, description, dice }) {
        this.name = name;
        this.discription = description;
        this.display = display || prettyifyName(name);
        this.type = "roll-dice";
        this.dice = dice;
        this.expandedDice = Dice.expandAll(this.dice);
    }

    static deserialize(rawSpec) {
        return new DiceLogFieldSpec(rawSpec);
    }

    serialize() {
        return {
            name: this.name,
            display: this.display,
            type: this.type,
            dice: this.dice,
        };
    }

    translateValue(uiValue) {
        if(uiValue !== undefined) {
            if(!uiValue.manual) {
                return {
                    type: "die-roll",
                    manual: false,
                };
            }

            // Bad dice count reject it
            if(uiValue.dice?.length != this.expandedDice.length) {
                return undefined;
            }

            return {
                type: "die-roll",
                manual: true,
                roll: uiValue.dice.map((value, idx) => this.expandedDice[idx].translateValue(value))
            };
        }
    }

    isValid(value) {
        if(value === undefined) return false;

        if(value?.manual) {
            // Manual roll
            if(value.roll?.length !== this.expandedDice.length) return false;

            // If all sides are defined assume they're valid
            return value.roll.reduce((previous, side) => previous && side !== undefined, true);
        }

        return true;
    }

    describeDice() {
        return this.dice.map(dice => dice.toString());
    }
}

deserializer.registerClass("dice-log-field-spec", DiceLogFieldSpec);