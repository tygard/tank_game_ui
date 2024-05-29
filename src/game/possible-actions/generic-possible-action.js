import { buildDeserializer } from "../../utils.js";
import { DiceLogFieldSpec } from "./dice-log-field-spec.js";
import { LogFieldSpec } from "./log-field-spec.js";


// Build a registry of all logfield types
export const logFieldSpecDeserializer = buildDeserializer([
    LogFieldSpec,
    DiceLogFieldSpec,
]);


export class GenericPossibleAction {
    constructor({ actionName, fieldSpecs, type = "generic-possible-action" }) {
        this.type = type;
        this._actionName = actionName;
        this._fieldSpecs = fieldSpecs;
    }

    getActionName() {
        return this._actionName;
    }

    static canConstruct(type) {
        return type == "generic-possible-action";
    }

    static deserialize(rawGenericPossibleAction) {
        return new GenericPossibleAction({
            ...rawGenericPossibleAction,
            fieldSpecs: rawGenericPossibleAction.fieldSpecs.map(spec => logFieldSpecDeserializer(spec)),
        });
    }

    serialize() {
        return {
            actionName: this._actionName,
            fieldSpecs: this._fieldSpecs.map(spec => spec.serialize()),
        };
    }

    isValidEntry(logEntry, context) {
        for(const parameters of this.getParameterSpec(logEntry, context)) {
            if(!parameters.isValid(logEntry[parameters.name])) {
                return false;
            }
        }

        return true;
    }

    getParameterSpec(logEntry) {
        return this._fieldSpecs;
    }
}