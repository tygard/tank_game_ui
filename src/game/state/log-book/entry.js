import { Dice } from "../../possible-actions/die.js";

export class LogEntry {
    constructor(day, rawLogEntry, id, versionConfig, message, dieRolls) {
        this.id = id;
        this.day = day;
        this.type = rawLogEntry.action || "start_of_day";
        this.rawLogEntry = rawLogEntry;
        this.dieRolls = dieRolls;
        this.message = message || versionConfig?.formatLogEntry?.(this) || "";
        this._versionConfig = versionConfig;
    }

    static deserialize(id, previousDay, rawEntry, versionConfig) {
        if(rawEntry.day) previousDay = rawEntry.day;

        let message;
        let dieRolls;
        if(rawEntry.savedData !== undefined) {
            message = rawEntry.savedData.message;
            dieRolls = rawEntry.savedData.dieRolls;
            rawEntry = Object.assign({}, rawEntry);
            delete rawEntry.savedData;
        }

        return new LogEntry(previousDay, rawEntry, id, versionConfig, message, dieRolls);
    }

    serialize({ justRawEntries } = {}) {
        if(justRawEntries) return this.rawLogEntry;

        return {
            ...this.rawLogEntry,
            savedData: {
                message: this.message,
                dieRolls: this.dieRolls,
            }
        }
    }

    getTimestamp() {
        return new Date(this.rawLogEntry.timestamp * 1000);
    }

    updateMessageWithBoardState({ previousState, actions }) {
        this.dieRolls = {};
        const rollFields = Object.keys(this.rawLogEntry)
            .map(key => ({ key, value: this.rawLogEntry[key] }))
            .filter(field => field.value?.type == "die-roll");

        for(const rollField of rollFields) {
            const dice = actions.get(this.type).getDiceFor(rollField.key, {
                gameState: previousState,
                rawLogEntry: this.rawLogEntry,
            });

            this.dieRolls[rollField.key] = Dice.expandAll(dice)
                .map((die, idx) => die.getSideFromValue(rollField.value.roll[idx]));
        }

        this.message = this._versionConfig.formatLogEntry(this, previousState);
    }

    finalizeEntry({ gameState, allowManualRolls, actions }) {
        const action = actions.get(this.type);

        for(const field of Object.keys(this.rawLogEntry)) {
            const value = this.rawLogEntry[field];

            // Roll any unrolled dice
            if(value?.type == "die-roll") {
                if(!allowManualRolls) value.manual = false;

                if(!value.manual) {
                    const dice = action.getDiceFor(field, {
                        gameState,
                        rawLogEntry: this.rawLogEntry,
                    });

                    const expandedDice = Dice.expandAll(dice);
                    this.rawLogEntry[field].roll = expandedDice.map(die => die.roll());
                }
            }
        }

        // Apply any version specific transforms before submitting
        const newRawEntry = action?.finalizeLogEntry?.(this.rawLogEntry);
        if(newRawEntry) {
            this.rawLogEntry = newRawEntry
        }
    }
}
