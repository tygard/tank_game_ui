import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import { useGameState } from "./fetcher";
import { GameState } from "../../../common/state/game-state.mjs";


const TURN_SWITCH_FREQENCY = 700;  // 0.7 seconds in ms


function useAutoTurnAdvance(logBook, entryId, setEntryIdAndTrackLastEntry) {
    const [playback, setPlayback] = useState(false);
    const [lastAutoTurnAdvance, setLastAutoTurnAdvance] = useState();

    // If we stop playing clear the last auto entry advance we don't double advance on the first entry
    const setPlaybackWrapper = useCallback((newPlayback) => {
        if(!newPlayback) setLastAutoTurnAdvance(undefined);
        setPlayback(newPlayback);
    }, [setPlayback]);

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
    }, [logBook, entryId, setEntryIdAndTrackLastEntry, playback, lastAutoTurnAdvance, setLastAutoTurnAdvance]);

    return [playback, setPlaybackWrapper];
}


export function useGameStateManager(logBook, game) {
    const [entryId, setEntryId] = useState();
    const [trackingLastEntry, setTrackingLastEntry] = useState();
    const [state, error] = useGameState(game, entryId);

    // Change the current entry and track the latest entry if we set it to that
    const setEntryIdAndTrackLastEntry = useCallback((newEntryId) => {
        setEntryId(newEntryId);

        // If the user moves to the latest entry stay on the latest entry
        setTrackingLastEntry(newEntryId >= logBook.getLastEntryId());
    }, [setTrackingLastEntry, setEntryId, logBook]);


    // If entry hasn't been set jump to the latest entry
    if(logBook && entryId === undefined) {
        setEntryIdAndTrackLastEntry(logBook.getLastEntryId());
    }

    const [playback, setPlayback] = useAutoTurnAdvance(logBook, entryId, setEntryIdAndTrackLastEntry);

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


    const playerSetEntry = newEntryId => {
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
