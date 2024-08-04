import { deserializer } from "../../deserialization.js";
import { getCurrentTime } from "./schedule.js";

export class OpenHours {
    constructor(schedules, resolved) {
        this.schedules = schedules;
        this._resolved = resolved;
    }

    static deserialize(rawOpenHours) {
        return new OpenHours(rawOpenHours.schedules, rawOpenHours.resolved);
    }

    serialize() {
        return {
            schedules: this.schedules,
            resolved: this._resolved,
        };
    }

    asResolved(now) {
        if(this._resolved !== undefined) {
            return this;
        }

        // Compute (resolve) certain values on the server so we have 1 source of truth for the current time
        const resolved = {
            isGameOpen: this.isGameOpen(now),
            currentTime: getCurrentTime(now),
        };

        return new OpenHours(this.schedules, resolved);
    }

    getCurrentTime(now) {
        if(this._resolved !== undefined) {
            return this._resolved.currentTime;
        }

        return getCurrentTime(now);
    }

    isGameOpen(now) {
        if(this._resolved !== undefined) {
            return this._resolved.isGameOpen;
        }

        // No schedules specified then we're always open
        if(this.schedules.length === 0) {
            return true;
        }

        return !!this.schedules.find(schedule => schedule.isGameOpen(now));
    }

    getNextOpenHoursStart(now) {
        let nextStart = Infinity;
        for(const schedule of this.schedules) {
            // This schedule doesn't support auto start of day
            if(!schedule.autoStartOfDay) continue;

            nextStart = Math.min(nextStart, schedule.getNextOpenHoursStart(now));
        }

        return nextStart;
    }

    hasAutomaticStartOfDay() {
        return !!this.schedules.find(schedule => schedule.autoStartOfDay);
    }
}

deserializer.registerClass("open-hours-v1", OpenHours);