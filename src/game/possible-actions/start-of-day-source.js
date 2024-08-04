import { deserializer } from "../../deserialization.js";
import { GenericPossibleAction } from "./generic-possible-action.js";
import { LogFieldSpec } from "./log-field-spec.js";

export class StartOfDaySource {
    async getActionFactoriesForPlayer({day}) {
        return [new StartOfDayFactory(day + 1)];
    }
}

export class StartOfDayFactory extends GenericPossibleAction {
    constructor(dayToStart) {
        super({ actionName: "start_of_day", type: "start-of-day" });
        this._dayToStart = dayToStart;
    }

    static deserialize(rawStartOfDayFactory) {
        return new StartOfDayFactory(rawStartOfDayFactory.dayToStart);
    }

    serialize() {
        return {
            dayToStart: this._dayToStart,
        };
    }

    getParameterSpec() {
        return [
            new LogFieldSpec({
                name: "day",
                type: "set-value",
                value: this._dayToStart,
            }),
        ];
    }
}

deserializer.registerClass("start-of-day-factory", StartOfDayFactory);