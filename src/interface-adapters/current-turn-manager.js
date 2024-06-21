import { useEffect, useReducer } from "preact/hooks";

const TURN_SWITCH_FREQENCY = 700;  // 0.7 seconds in ms


function useAutoTurnAdvance(state, dispatch) {
    useEffect(() => {
        // Not playing nothing to do
        if(!state.playbackInProgress) return;

        // This effect block can update for lots of reasons so keep track of the last time we advanced the logEntry
        let timeSinceLastAutoAdvance = Date.now() - state.lastAutoAdvance;
        const timeBeforeNextAdvance = TURN_SWITCH_FREQENCY - timeSinceLastAutoAdvance;

        const handle = setTimeout(() => {
            dispatch(autoAdvanceEntry());
        }, timeBeforeNextAdvance);

        return () => clearTimeout(handle);
    }, [state, dispatch]);
}


export function useCurrentTurnManager(logBook) {
    // Set and empty log book to create an initial state
    const initFn = () => currentLogGameStateReducer(undefined, { type: "set-log-book" });
    const [state, dispatch] = useReducer(currentLogGameStateReducer, undefined, initFn);
    useAutoTurnAdvance(state, dispatch);

    useEffect(() => {
        dispatch(setLogBook(logBook));
    }, [dispatch, logBook]);

    return [state, dispatch];
}


function determineDayRelativeIds(state) {
    state.today = state._logBook.getDayOfEntryId(state.entryId) || 0;
    const firstIdOfDay = state._logBook.getFirstEntryIdOfDay(state.today) || 0;
    const lastIdOfDay = state._logBook.getLastEntryIdOfDay(state.today) || 0;
    state.maxEntryIdToday = (lastIdOfDay - firstIdOfDay) + 1;
    state.dayRelativeEntryId = (state.entryId - firstIdOfDay) + 1;
}


function processTurnUpdateAction(state, action) {
    // Handle user updates to the entry
    if(action.type == "next-entry" || action.type == "auto-advance-entry") {
        state.entryId = Math.min(state._logBook.getLastEntryId(), state.entryId + 1);
    }

    // Note the time that we so we can advance at a consisent rate
    if(action.type == "auto-advance-entry") {
        state.lastAutoAdvance = Date.now();
    }

    if(action.type == "previous-entry") {
        state.entryId = Math.max(state._logBook.getFirstEntryId(), state.entryId - 1);
    }

    const nextDay = Math.min(state._logBook.getMaxDay(), state.today + 1);
    if(action.type == "next-day") {
        state.entryId = state._logBook.getFirstEntryIdOfDay(nextDay);
    }

    if(action.type == "previous-day") {
        // Jump to the start of today (if not already there)
        let targetDay = state.today;

        if(state.dayRelativeEntryId === 1) {
            // Start of day go to previous day
            targetDay = Math.max(state._logBook.getMinDay(), state.today - 1);
        }

        state.entryId = state._logBook.getFirstEntryIdOfDay(targetDay);
    }

    if(action.type == "latest-turn") {
        state.entryId = state._logBook.getLastEntryId();
    }

    if(action.type == "toggle-playback") {
        state.playbackInProgress = !state.playbackInProgress;

        // Set the last auto advance time when we start playing so we don't immediately jump to the next turn
        state.lastAutoAdvance = state.playbackInProgress ? Date.now() : 0;
    }

    // If this was a player initiated turn change stop playback
    if(action.type != "auto-advance-entry" && action.type != "set-log-book" && action.type != "toggle-playback") {
        state.playbackInProgress = false;
        state.lastAutoAdvance = 0;
    }
}


export function currentLogGameStateReducer(state, action) {
    // Create the default state
    state = state ? Object.assign({}, state) : {};

    if(action.type == "go-to-entry") {
        state.entryId = action.entryId;
    }

    // If entry hasn't been set or we are already on the last entry jump to any new entries that come in
    const trackingLastEntry = state.entryId === undefined || state.entryId === state?._logBook?.getLastEntryId?.();

    if(action.type == "set-log-book") {
        state._logBook = action.logBook;
    }
    else if(!state._logBook && action.type != "go-to-entry") {
        throw new Error("set-log-book or go-to-entry must be dispatched before any other");
    }

    if(state._logBook && trackingLastEntry) {
        state.entryId = state._logBook.getLastEntryId();
    }

    if(state._logBook) {
        // Make sure our log entry is in bounds for the current log book
        state.entryId = Math.max(state._logBook.getFirstEntryId(), Math.min(state._logBook.getLastEntryId(), state.entryId));

        determineDayRelativeIds(state);
        processTurnUpdateAction(state, action);
        determineDayRelativeIds(state);

        // Tell the UI whether certain actions can be taken
        state.isLatestEntry = state.entryId === state._logBook.getLastEntryId();

        // We're on the most recent entry stop playback
        if(state.isLatestEntry) {
            state.playbackInProgress = false;
            state.lastAutoAdvance = 0;
        }

        state.canGoTo = {
            previousDay: state.entryId > state._logBook.getFirstEntryId(),
            previousTurn: state.entryId > state._logBook.getFirstEntryId(),
            nextTurn: !state.isLatestEntry,
            nextDay: state.today < state._logBook.getMaxDay(),
            latestTurn: !state.isLatestEntry,
        };
    }
    else {
        // Fill with defaults
        state.isLatestEntry = false;
        state.playbackInProgress = false;
        state.lastAutoAdvance = 0;
        state.today = 0;
        state.dayRelativeEntryId = state.entryId;
        state.maxEntryIdToday = state.entryId;

        state.canGoTo = {
            previousDay: false,
            previousTurn: false,
            nextTurn: false,
            nextDay: false,
            latestTurn: false,
        };
    }

    return state;
}

export const setLogBook = logBook => ({ type: "set-log-book", logBook });
export const goToNextEntry = () => ({ type: "next-entry" });
export const goToPreviousEntry = () => ({ type: "previous-entry" });
export const goToNextDay = () => ({ type: "next-day" });
export const goToPreviousDay = () => ({ type: "previous-day" });
export const goToLatestTurn = () => ({ type: "latest-turn" });
export const goToEntryId = entryId => ({ type: "go-to-entry", entryId });
export const togglePlayback = () => ({ type: "toggle-playback" });
export const autoAdvanceEntry = () => ({ type: "auto-advance-entry" });
