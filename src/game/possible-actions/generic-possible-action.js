import { deserializer } from "../../deserialization.js";
import "./dice-log-field-spec.js";
import "./log-field-spec.js";


export class GenericPossibleAction {
    constructor({ actionName, fieldSpecs, type = "generic-possible-action" }) {
        this.type = type;
        this._actionName = actionName;
        this._fieldSpecs = fieldSpecs;
    }

    getActionName() {
        return this._actionName;
    }

    static deserialize(rawGenericPossibleAction) {
        return new GenericPossibleAction({
            ...rawGenericPossibleAction,
            fieldSpecs: rawGenericPossibleAction.fieldSpecs,
        });
    }

    serialize() {
        return {
            actionName: this._actionName,
            fieldSpecs: this._fieldSpecs,
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

deserializer.registerClass("generic-possible-action", GenericPossibleAction);