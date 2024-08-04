import { deserializer } from "../../deserialization.js";
import { prettyifyName } from "../../utils.js";

const VALID_TYPES = [
    "select",
    "select-position",
    "input",
    "input-number",
    "set-value",
];

export class LogFieldSpec {
    constructor({ name, display, type, options, value, description }) {
        if(!VALID_TYPES.includes(type)) {
            throw new Error(`Invalid log field spec type ${type}`);
        }

        if((options === undefined || !Array.isArray(options)) && type.startsWith("select")) {
            throw new Error("Selects must have a list of options");
        }

        if(type == "set-value") {
            options = [value];
        }

        this.name = name;
        this.display = display || prettyifyName(name);
        this.description = description;
        this.type = type;
        this.hidden = type == "set-value";

        if(options) {
            this._origOptions = options;

            // Get the value that the ui can show to the user (or give to the board)
            this.options = options.map(this._getDisplayKey);

            // Build a map from user facing values to
            this._optionToValue = {};
            for(const option of options) {
                const display = this._getDisplayKey(option);

                if(this._optionToValue[display] !== undefined) {
                    throw new Error(`While building log field spec ${name} (${type}) found duplicate display value: ${JSON.stringify(display)}`);
                }

                this._optionToValue[display] = option.value !== undefined ? option.value : option;
            }

            // Get a list of the translated values that we expect to see in the log entry
            this._logEntryValidValues = new Set(Object.values(this._optionToValue));
        }
    }

    _getDisplayKey(option) {
        if(option.display !== undefined) return option.display;
        if(option.position !== undefined) return option.position;
        return option;
    }

    static deserialize(rawSpec) {
        return new LogFieldSpec(rawSpec);
    }

    serialize() {
        return {
            name: this.name,
            display: this.display,
            type: this.type,
            options: this._origOptions,
            value: this.options?.[0],
            description: this.description,
        };
    }

    translateValue(displayName) {
        const value = this._optionToValue?.[displayName];
        return value !== undefined ? value : displayName;
    }

    isValid(value) {
        if(value === undefined) return false;

        if(this._logEntryValidValues) {
            return this._logEntryValidValues.has(value);
        }

        return true;
    }
}

deserializer.registerClass("log-field-spec", LogFieldSpec);