import { prettyifyName } from "../../utils.mjs";

// Mappings from human readable days of the week to js integers
const DAY_OF_WEEK_SHORTHAND = {
    monday: 1,
    m: 1,
    tuesday: 2,
    t: 2,
    wednesday: 3,
    w: 3,
    thursday: 4,
    r: 4,
    friday: 5,
    f: 5,
    saturday: 6,
    s: 6,
    sunday: 0,
    u: 0,
};

const TIME_EXPR = /(\d+):(\d+)(AM|PM|am|pm)?/;


function parseTimeString(timeString) {
    const match = TIME_EXPR.exec(timeString);
    if(!match) {
        throw new Error(`Unable to parse time string ${timeString}`);
    }

    let hour = +match[1]
    if(hour === 12) hour = 0;

    if(match[3]?.toLocaleLowerCase?.() == "pm") {
        hour += 12;
    }

    return (hour * 60) + (+match[2]);
}

function serializeToTimeString(minutes) {
    let hours = Math.floor(minutes / 60);
    let isPm = false;

    if(hours >= 12) {
        hours -= 12;
        isPm = true;
    }

    if(hours === 0) hours = 12;

    minutes = minutes % 60;
    if(minutes < 10) minutes = `0${minutes}`;

    return `${hours}:${minutes}${isPm ? "pm" : "am"}`;
}

export function getCurrentTime(now) {
    if(!now) now = new Date();
    return serializeToTimeString((now.getHours() * 60) + now.getMinutes())
}


export class Schedule {
    constructor(daysOfWeek, startMinutes, endMinutes, autoStartOfDay) {
        this._daysOfWeek = daysOfWeek;
        this._startMinutes = startMinutes;
        this._endMinutes = endMinutes;
        this.autoStartOfDay = autoStartOfDay;
        if(startMinutes > endMinutes) {
            throw new Error(`Scheduled time cannot be before start time (start = ${serializeToTimeString(this._startMinutes)}, end = ${serializeToTimeString(this._endMinutes)})`);
        }
    }

    static deserialize(rawSchedule) {
        return new Schedule(
            rawSchedule.daysOfWeek.map(day => {
                const dayValue = DAY_OF_WEEK_SHORTHAND[day.toLocaleLowerCase()];
                if(dayValue === undefined) {
                    throw new Error(`Invalid day of the week: ${dayValue}`);
                }

                return dayValue;
            }),
            parseTimeString(rawSchedule.startTime),
            parseTimeString(rawSchedule.endTime),
            rawSchedule.autoStartOfDay,
        );
    }

    serialize() {
        return {
            daysOfWeek: this.daysOfWeek,
            startTime: this.startTime,
            endTime: this.endTime,
            autoStartOfDay: this.autoStartOfDay,
        };
    }

    isGameOpen(now) {
        if(!now) now = new Date();

        // Not a valid date for this schedule
        if(!this._daysOfWeek.includes(now.getDay())) {
            return false;
        }

        const currentMinutes = (now.getHours() * 60) + now.getMinutes();
        return this._startMinutes <= currentMinutes && currentMinutes < this._endMinutes;
    }

    get daysOfWeek() {
        return this._daysOfWeek.map(day => {
            return  prettyifyName(
                Object.keys(DAY_OF_WEEK_SHORTHAND)
                    .find(dayName => DAY_OF_WEEK_SHORTHAND[dayName] == day)
            );
        });
    }

    get startTime() {
        return serializeToTimeString(this._startMinutes);
    }

    get endTime() {
        return serializeToTimeString(this._endMinutes);
    }

    getNextOpenHoursStart(now) {
        if(!now) now = new Date();
        let nextStartDate = new Date(now.getTime());

        nextStartDate.setHours(Math.floor(this._startMinutes / 60));
        nextStartDate.setMinutes(this._startMinutes % 60);
        nextStartDate.setSeconds(0);
        nextStartDate.setMilliseconds(0);

        // Find the next play day (assumption: it can't be more than 1 week away)
        for(let dayOffset = 0; dayOffset < 7; ++dayOffset) {
            nextStartDate.setDate(now.getDate() + dayOffset);

            // We're in the past keep looking
            if(now.getTime() >= nextStartDate.getTime()) continue;

            if(this._daysOfWeek.includes(nextStartDate.getDay())) break;
        }

        return nextStartDate.getTime();
    }
}