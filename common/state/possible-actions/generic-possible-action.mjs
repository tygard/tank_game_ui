import { prettyifyName } from "../utils.mjs";

export class GenericPossibleAction {
    constructor({ subject, actionName, fieldSpecs }) {
        this._actionName = actionName;
        this._subject = subject;
        this._fieldSpecs = fieldSpecs;
    }

    getType() {
        return "generic-possible-action";
    }

    static deserialize(rawGenericPossibleAction) {
        return new GenericPossibleAction(rawGenericPossibleAction);
    }

    serialize() {
        return {
            actionName: this._actionName,
            fieldSpecs: this._fieldSpecs,
            subject: this._subject,
        };
    }

    areParemetersValid(actionSpecific) {
        for(const field of this._fieldSpecs) {
            if(actionSpecific[field.logBookField] === undefined) return false;
        }

        return true;
    }

    getParameterSpec() {
        return this._fieldSpecs;
    }

    buildRawEntry(actionSpecific) {
        return {
            type: "action",
            action: this._actionName,
            subject: this._subject,
            ...actionSpecific,
        };
    }

    toString() {
        return prettyifyName(this._actionName);
    }
}