import { Schedule, getCurrentTime } from "./schedule.js";

export class OpenHours {
    constructor(schedules, resolved) {
        this.schedules = schedules;
        this._resolved = resolved;
    }

    static deserialize(rawOpenHours) {
        let rawSchedules = rawOpenHours;
        let resolved;
        if(!Array.isArray(rawSchedules)) {
            rawSchedules = rawOpenHours.schedules;
            resolved = rawOpenHours.resolved;
        }

        return new OpenHours(
            rawSchedules.map(rawSchedule => Schedule.deserialize(rawSchedule)),
            resolved,
        );
    }

    serialize() {
        const rawSchedules = this.schedules.map(schedule => schedule.serialize());

        if(this._resolved !== undefined) {
            return {
                schedules: rawSchedules,
                resolved: this._resolved,
            };
        }
        else {
            return rawSchedules;
        }
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