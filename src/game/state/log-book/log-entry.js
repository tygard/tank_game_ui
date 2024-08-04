import { deserializer } from "../../../deserialization.js";
import { Dice } from "../../possible-actions/die.js";

export class LogEntry {
    constructor(rawLogEntry, message, dieRolls) {
        if(rawLogEntry.class !== undefined) throw new Error("Class present");

        this.type = rawLogEntry.action || "start_of_day";
        this.rawLogEntry = rawLogEntry;
        this.dieRolls = dieRolls;
        this.message = message;

        if(this.rawLogEntry.timestamp === undefined) {
            this.rawLogEntry.timestamp = LogEntry.makeTimeStamp();
        }
    }

    static deserialize(rawEntry) {
        let message;
        let dieRolls;
        if(rawEntry.savedData !== undefined) {
            message = rawEntry.savedData.message;
            dieRolls = rawEntry.savedData.dieRolls;
            rawEntry = Object.assign({}, rawEntry);
            delete rawEntry.savedData;
        }

        return new LogEntry(rawEntry, message, dieRolls);
    }

    serialize() {
        if(this.message == undefined) {
            return Object.assign({}, this.rawLogEntry);
        }

        return {
            ...this.rawLogEntry,
            savedData: {
                message: this.message,
                dieRolls: this.dieRolls,
            }
        }
    }

    static makeTimeStamp() {
        return Math.floor(Date.now() / 1000);
    }

    static enableTestModeTimeStamps() {
        let lastTime = 0;
        LogEntry.makeTimeStamp = () => {
            lastTime += 20 * 60; // 20 minutes in seconds
            return lastTime;
        };
    }

    withoutStateInfo() {
        return new LogEntry(this.rawLogEntry);
    }

    getTimestamp() {
        return new Date(this.rawLogEntry.timestamp * 1000);
    }

    updateMessageWithBoardState({ logEntryFormatter, previousState, actions }) {
        this.dieRolls = {};
        const rollFields = Object.keys(this.rawLogEntry)
            .map(key => ({ key, value: this.rawLogEntry[key] }))
            .filter(field => field.value?.type == "die-roll");

        for(const rollField of rollFields) {
            const dice = actions.find(action => action.getActionName() == this.type).getDiceFor(rollField.key, {
                rawLogEntry: this.rawLogEntry,
            });

            this.dieRolls[rollField.key] = Dice.expandAll(dice)
                .map((die, idx) => die.getSideFromValue(rollField.value.roll[idx]));
        }

        this.message = logEntryFormatter.formatLogEntry(this, previousState);
    }

    finalizeEntry({ actions }) {
        const action = actions.find(action => action.getActionName() == this.type);

        for(const field of Object.keys(this.rawLogEntry)) {
            const value = this.rawLogEntry[field];

            // Roll any unrolled dice
            if(value?.type == "die-roll" && !value.manual) {
                const dice = action.getDiceFor(field, {
                    rawLogEntry: this.rawLogEntry,
                });

                const expandedDice = Dice.expandAll(dice);
                this.rawLogEntry[field].roll = expandedDice.map(die => die.roll());
            }
        }

        // Apply any version specific transforms before submitting
        const newRawEntry = action?.finalizeLogEntry?.(this.rawLogEntry);
        if(newRawEntry) {
            this.rawLogEntry = newRawEntry
        }
    }
}

deserializer.registerClass("log-entry-v1", LogEntry);