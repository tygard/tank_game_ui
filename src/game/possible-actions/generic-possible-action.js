import { prettyifyName } from "../../utils.js";
import { LogFieldSpec } from "./log-field-spec.js";

export class GenericPossibleAction {
    constructor({ actionName, fieldSpecs }) {
        this._actionName = actionName;
        this._fieldSpecs = fieldSpecs;
    }

    getActionName() {
        return this._actionName;
    }

    getType() {
        return "generic-possible-action";
    }

    static deserialize(rawGenericPossibleAction) {
        return new GenericPossibleAction({
            ...rawGenericPossibleAction,
            fieldSpecs: rawGenericPossibleAction.fieldSpecs.map(spec => LogFieldSpec.deserialize(spec)),
        });
    }

    serialize() {
        return {
            actionName: this._actionName,
            fieldSpecs: this._fieldSpecs.map(spec => spec.serialize()),
        };
    }

    isValidEntry(logEntry) {
        for(const parameters of this.getParameterSpec(logEntry)) {
            if(!parameters.isValid(logEntry[parameters.name])) {
                return false;
            }
        }

        return true;
    }

    getParameterSpec(logEntry) {
        return this._fieldSpecs;
    }

    toString() {
        return prettyifyName(this._actionName);
    }
}