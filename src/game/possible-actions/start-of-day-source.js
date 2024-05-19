import { GenericPossibleAction } from "./generic-possible-action.js";
import { LogFieldSpec } from "./log-field-spec.js";

export class StartOfDaySource {
    async getActionFactoriesForPlayer({logEntry}) {
        return [new StartOfDayFactory(logEntry.day + 1)];
    }
}

export class StartOfDayFactory extends GenericPossibleAction {
    constructor(dayToStart) {
        super({ actionName: "start_of_day" });
        this._dayToStart = dayToStart;
    }

    getType() {
        return "start-of-day";
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
                hidden: true,
            }),
        ];
    }

    toString() {
        return "Start day";
    }
}