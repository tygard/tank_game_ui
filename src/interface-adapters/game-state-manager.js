import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import { useGameState } from "../drivers/rest/fetcher.js";
import { GameState } from "../game/state/game-state.js";


const TURN_SWITCH_FREQENCY = 700;  // 0.7 seconds in ms


function useAutoTurnAdvance(logBook, entryId, setEntryIdAndTrackLastEntry) {
    const [playback, setPlayback] = useState(false);
    const [lastAutoTurnAdvance, setLastAutoTurnAdvance] = useState();

    // If we stop playing clear the last auto entry advance we don't double advance on the first entry
    const setPlaybackWrapper = useCallback((newPlayback) => {
        if(!newPlayback) setLastAutoTurnAdvance(undefined);
        setPlayback(newPlayback);
    }, [setPlayback, setLastAutoTurnAdvance]);

    useEffect(() => {
        // Not playing nothing to do
        if(!playback || !logBook) return () => {};

        // Hit the end stop playing
        if(entryId == logBook.getLastEntryId()) {
            setPlaybackWrapper(false);
            return () => {};
        }

        // This effect block can update for lots of reasons so keep track of the last time we advanced the logEntry
        let timeSinceLastAutoAdvance = Date.now() - lastAutoTurnAdvance;
        if(lastAutoTurnAdvance === undefined) {
            setLastAutoTurnAdvance(Date.now());
            timeSinceLastAutoAdvance = 0;
        }

        const timeBeforeNextAdvance = TURN_SWITCH_FREQENCY - timeSinceLastAutoAdvance;

        const handle = setTimeout(() => {
            setLastAutoTurnAdvance(Date.now());
            setEntryIdAndTrackLastEntry(Math.min(entryId + 1, logBook.getLastEntryId()));
        }, timeBeforeNextAdvance);

        return () => clearTimeout(handle);
    }, [logBook, entryId, setEntryIdAndTrackLastEntry, playback, lastAutoTurnAdvance, setLastAutoTurnAdvance, setPlaybackWrapper]);

    return [playback, setPlaybackWrapper];
}


export function useGameStateManager(logBook, game) {
    const [entryId, setEntryId] = useState();
    const [trackingLastEntry, setTrackingLastEntry] = useState();
    const [state, error] = useGameState(game, entryId);

    // Change the current entry and track the latest entry if we set it to that
    const setEntryIdAndTrackLastEntry = useCallback((newEntryId) => { // <-- internal?
        setEntryId(newEntryId);

        // If the user moves to the latest entry stay on the latest entry
        setTrackingLastEntry(newEntryId >= logBook.getLastEntryId());
    }, [setTrackingLastEntry, setEntryId, logBook]);


    // If entry hasn't been set jump to the latest entry
    if(logBook && entryId === undefined) { // <-- initialize?
        setEntryIdAndTrackLastEntry(logBook.getLastEntryId());
    }

    const [playback, setPlayback] = useAutoTurnAdvance(logBook, entryId, setEntryIdAndTrackLastEntry); // TBD

    const togglePlayback = useCallback(() => {
        setPlayback(!playback);
    }, [playback, setPlayback]);


    // If we're following the last entry and a new entry gets added change to that one
    useEffect(() => {
        if(trackingLastEntry && logBook) {
            setEntryId(logBook.getLastEntryId());
        }
    }, [logBook, trackingLastEntry, setEntryId]);


    const isLatestEntry = logBook ? entryId >= logBook.getLastEntryId() : false;


    const playerSetEntry = newEntryId => { // <-- action
        setEntryIdAndTrackLastEntry(newEntryId);
        // If the user changes the entry stop playback
        setPlayback(false);
    };

    const gameState = useMemo(() => state ? GameState.deserialize(state) : undefined, [state]);

    return {
        gameState,
        entryId,
        isLatestEntry,
        isPlayingBack: playback,
        togglePlayback,
        playerSetEntry,
        error,
    };
}

function determineDayRelativeIds(state) {
    const currentEntry = state._logBook.getEntry(state.entryId);
    state.today = currentEntry?.day || 0;
    const firstIdOfDay = state._logBook.getFirstEntryOfDay(state.today)?.id || 0;
    const lastIdOfDay = state._logBook.getLastEntryOfDay(state.today)?.id || 0;
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
        state.entryId = state._logBook.getFirstEntryOfDay(nextDay).id;
    }

    if(action.type == "previous-day") {
        // Jump to the start of today (if not already there)
        let targetDay = state.today;

        if(state.dayRelativeEntryId === 1) {
            // Start of day go to previous day
            targetDay = Math.max(state._logBook.getMinDay(), state.today - 1);
        }

        state.entryId = state._logBook.getFirstEntryOfDay(targetDay).id;
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
    if(!state) {
        state = {};
    }

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
