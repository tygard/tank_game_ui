import assert from "node:assert";
import { Schedule } from "../../../../src/game/open-hours/schedule.js";
import { OpenHours } from "../../../../src/game/open-hours/index.js";
import { LogBook } from "../../../../src/game/state/log-book/log-book.js";
import { AutomaticStartOfDay } from "../../../../src/game/open-hours/automatic-start-of-day.js";

function checkIsOpen(scheduleName, schedule, date, expected) {
    assert.equal(schedule.isGameOpen(date), expected, `is ${scheduleName} game open ${date}`);
}

function checkNextStart(schedule, now, expected) {
    const next = schedule.getNextOpenHoursStart(now);
    assert.equal(next, expected.getTime(), `Expected ${new Date(next)} (${next}) to be ${expected} (${expected.getTime()})`);
}

function makeDate(year, month, day, hours, minutes) {
    let date = new Date();
    date.setFullYear(year);
    date.setMonth(month - 1);
    date.setDate(day);
    date.setHours(hours);
    date.setMinutes(minutes);
    date.setSeconds(0);
    date.setMilliseconds(0);
    return date;
}

const monday1133 = makeDate(2024, 4, 29, 11, 33);
const monday0217 = makeDate(2022, 12, 26, 14, 17);
const tuesday0348 = makeDate(2024, 2, 13, 15, 48);
const tuesday1159 = makeDate(2024, 2, 13, 11, 58);
const tuesday1200 = makeDate(2024, 2, 13, 12, 0);
const sunday0400 = makeDate(2024, 7, 7, 16, 0);
const friday0501 = makeDate(2024, 7, 19, 17, 5);

const nineToFive = Schedule.deserialize({ // 9am to 5pm week days
    daysOfWeek: ["M", "t", "w", "r", "f"], // M tests case insensitivity
    startTime: "9:00am",
    endTime: "5:00pm",
    autoStartOfDay: true,
});

const noonTo9 = new Schedule([2, 4, 0], 12 * 60, 21 * 60, true); // 12pm to 9pm Tu, Th, Su (autostart day)

describe("Schedule", () => {
    it("can determine if a given date/time is part of its schedule", () => {
        checkIsOpen("9to5", nineToFive, monday1133, true);
        checkIsOpen("9to5", nineToFive, monday0217, true);
        checkIsOpen("9to5", nineToFive, tuesday0348, true);
        checkIsOpen("9to5", nineToFive, sunday0400, false);
        checkIsOpen("9to5", nineToFive, friday0501, false);

        checkIsOpen("noonTo9", noonTo9, monday1133, false);
        checkIsOpen("noonTo9", noonTo9, monday0217, false);
        checkIsOpen("noonTo9", noonTo9, tuesday1200, true);
        checkIsOpen("noonTo9", noonTo9, tuesday0348, true);
        checkIsOpen("noonTo9", noonTo9, sunday0400, true);
        checkIsOpen("noonTo9", noonTo9, friday0501, false);
    });

    it("can determine it's next start time", () => {
        checkNextStart(nineToFive, monday1133, makeDate(2024, 4, 30, 9, 0));
        checkNextStart(nineToFive, monday0217, makeDate(2022, 12, 27, 9, 0));
        checkNextStart(nineToFive, tuesday0348, makeDate(2024, 2, 14, 9, 0));
        checkNextStart(nineToFive, sunday0400, makeDate(2024, 7, 8, 9, 0));
        checkNextStart(nineToFive, friday0501, makeDate(2024, 7, 22, 9, 0));

        checkNextStart(noonTo9, monday1133, makeDate(2024, 4, 30, 12, 0));
        checkNextStart(noonTo9, monday0217, makeDate(2022, 12, 27, 12, 0));
        checkNextStart(noonTo9, tuesday1159, tuesday1200);
        checkNextStart(noonTo9, tuesday1200, makeDate(2024, 2, 15, 12, 0));
        checkNextStart(noonTo9, tuesday0348, makeDate(2024, 2, 15, 12, 0));
        checkNextStart(noonTo9, sunday0400, makeDate(2024, 7, 9, 12, 0));
        checkNextStart(noonTo9, friday0501, makeDate(2024, 7, 21, 12, 0));
    });
});

describe("OpenHours", () => {
    const mockClosedSchedule = { isGameOpen() { return false; } };
    const mockOpenIfTrueSchedule = {
        isGameOpen(date) { return !date; }
    };

    it("can check if any of it's schedules are open", () => {
        const closedHours = new OpenHours([mockClosedSchedule, mockClosedSchedule]);
        const maybeOpenHours = new OpenHours([mockClosedSchedule, mockOpenIfTrueSchedule, mockClosedSchedule]);

        assert.ok(!closedHours.isGameOpen(), "Closed hours are closed");
        assert.ok(!maybeOpenHours.isGameOpen(new Date()), "Maybe open hours are closed with date");
        assert.ok(maybeOpenHours.isGameOpen(), "Maybe open hours are open without date");
    });

    it("can resolve values on the server side", () => {
        const maybeOpenHours = new OpenHours([nineToFive]);

        assert.ok(!maybeOpenHours.isGameOpen(friday0501));

        const resolvedMaybeOpenHours = OpenHours.deserialize(maybeOpenHours.serialize({
            resolved: true,
            now: monday0217,
        }));

        assert.ok(resolvedMaybeOpenHours.isGameOpen(friday0501));
    });

    it("empty open hours is always open", () => {
        const empty = new OpenHours([]);
        assert.ok(empty.isGameOpen());
    });

    it("can be serialized and deserialized to the same thing", () => {
        const openHours = new OpenHours([nineToFive, noonTo9]);
        const recreated = OpenHours.deserialize(openHours.serialize());
        assert.deepEqual(recreated, openHours);
    });

    it("can find the next start of day out of all of its schedules", () => {
        const openHours = new OpenHours([nineToFive, noonTo9]);

        checkNextStart(openHours, monday1133, makeDate(2024, 4, 30, 9, 0));
        checkNextStart(openHours, monday0217, makeDate(2022, 12, 27, 9, 0));
        checkNextStart(openHours, tuesday1159, tuesday1200);
        checkNextStart(openHours, tuesday1200, makeDate(2024, 2, 14, 9, 0));
        checkNextStart(openHours, tuesday0348, makeDate(2024, 2, 14, 9, 0));
        checkNextStart(openHours, sunday0400, makeDate(2024, 7, 8, 9, 0));
        checkNextStart(openHours, friday0501, makeDate(2024, 7, 21, 12, 0));
    });
});

const logBook = LogBook.deserialize({
    gameVersion: "3",
    rawEntries: [
        {
            day: 1,
        },
        {
            action: "move",
        },
        {
            day: 2,
            timestamp: makeDate(2024, 7, 21, 12, 0).getTime() / 1000,
        },
        {
            action: "shoot",
        },
        {
            action: "move",
        },
    ],
});

describe("Automatic start of day", () => {
    it("can check if a start of day entry has been added today already", () => {
        const automaticStart = new AutomaticStartOfDay({
            getLogBook() { return logBook; },
            isGameOpen() { return true; },
        });

        assert.ok(automaticStart.hasGameDayBeenStartedToday(makeDate(2024, 7, 21, 2, 0)), "Day has been started on 7/21/2024");
        assert.ok(!automaticStart.hasGameDayBeenStartedToday(makeDate(2024, 7, 15, 2, 0)), "Day has not been started on 7/15/2024");
        assert.ok(!automaticStart.hasGameDayBeenStartedToday(makeDate(2024, 3, 21, 2, 0)), "Day has not been started on 3/21/2024");
        assert.ok(!automaticStart.hasGameDayBeenStartedToday(makeDate(2025, 7, 21, 2, 0)), "Day has not been started on 7/21/2025");
    });

    it("can add a start of day entry if the day hasn't already started", () => {
        let addedEntry;
        const automaticStart = new AutomaticStartOfDay({
            getLogBook() { return logBook; },
            addLogBookEntry(entry) { addedEntry = entry; },
            isGameOpen() { return true; },
        });

        // Day has already started this won't do anything
        automaticStart.attemptToStartDay(makeDate(2024, 7, 21, 2, 0));
        assert.deepEqual(addedEntry, undefined);

        // This will start day 3
        automaticStart.attemptToStartDay(makeDate(2024, 7, 22, 2, 0));
        assert.deepEqual(addedEntry, {
            type: "action",
            day: 3,
        });
    });
});