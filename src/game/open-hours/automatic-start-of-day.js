import { logger } from "#platform/logging.js";

// HACK: Cap the amount of time the timer can be set for so we don't get thrown off by day light savings time
const MAX_TIMER_INTERVAL = 60 * 60 * 1000; // 1 hour in ms


export class AutomaticStartOfDay {
    constructor(game) {
        this._game = game;
    }

    hasGameDayBeenStartedToday(now) {
        if(!now) now = new Date();

        let logBook = this._game.getInteractor().getLogBook();
        const lastStartOfDay = logBook.getFirstEntryOfDay(logBook.getMaxDay());
        if(lastStartOfDay.type !== "start_of_day") {
            throw new Error(`First action of day ${logBook.getMaxDay()} is type ${lastStartOfDay.type} not start_of_day`);
        }

        const realWorldStartDate = lastStartOfDay.getTimestamp();

        return now.getFullYear() === realWorldStartDate.getFullYear() &&
            now.getMonth() === realWorldStartDate.getMonth() &&
            now.getDate() === realWorldStartDate.getDate();
    }

    attemptToStartDay(now) {
        // We already started the game day on this real day don't do it again
        if(this.hasGameDayBeenStartedToday(now)) return;

        // Game hasn't opened yet don't do anything
        if(this._game.getState() != "running") return;

        const interactor = this._game.getInteractor();
        let logBook = interactor.getLogBook();
        interactor.addLogBookEntry({
            type: "action",
            action: "start_of_day",
            day: logBook.getMaxDay() + 1
        });
    }

    start() {
        this.attemptToStartDay();
        this._setNextTimer();
    }

    stop() {
        clearTimeout(this._timer);
    }

    _setNextTimer() {
        const nextStartOfDay = this._game.getOpenHours().getNextOpenHoursStart() - Date.now();
        const duration = Math.min(MAX_TIMER_INTERVAL, nextStartOfDay);

        logger.debug({
            msg: "Set start of day timer",
            duration,
            minutes: duration / (60 * 1000), // (ms to minutes)
        });

        this._timer = setTimeout(() => {
            this.attemptToStartDay();
            this._setNextTimer();
        }, duration);
    }
}