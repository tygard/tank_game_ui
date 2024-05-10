import { useCallback } from "preact/hooks";
import "./log_entry_selector.css";

export function LogEntrySelector({ gameStateManager, logBook, debug, extraButtonsLeft }) {
    if(!logBook || gameStateManager.entryId === undefined) {
        return (
            <div className="turn-selector">
                Loading...
            </div>
        )
    }

    const today = logBook.getEntry(gameStateManager.entryId).day;

    // Build the day relative header
    const firstIdOfDay = logBook.getFirstEntryOfDay(today).id;
    const maxEntryIdToday = (logBook.getLastEntryOfDay(today).id - firstIdOfDay) + 1;
    const dayRelativeEntryId = (gameStateManager.entryId - firstIdOfDay) + 1;
    let turnText = `day: ${today} turn: ${dayRelativeEntryId} / ${maxEntryIdToday}`;

    if(debug) turnText += ` (turnId: ${gameStateManager?.entryId})`;

    const {playerSetEntry} = gameStateManager;

    // Find the adjacent days for clicking the buttons
    const previousDay = Math.max(logBook.getMinDay(), today - 1);
    const nextDay = Math.min(logBook.getMaxDay(), today + 1);
    const previousEntryId = Math.max(logBook.getFirstEntryId(), gameStateManager.entryId - 1);
    const nextEntryId = Math.min(logBook.getLastEntryId(), gameStateManager.entryId + 1);

    const isFirstEntryOfDay = dayRelativeEntryId === 1;

    const goToPreviousDay = useCallback(() => {
        // Jump to the start of today
        let targetDay = today;

        if(isFirstEntryOfDay) {
            // Start of day go to previous day
            targetDay = previousDay;
        }

        playerSetEntry(logBook.getFirstEntryOfDay(targetDay).id);
    }, [today, previousDay, isFirstEntryOfDay, playerSetEntry, logBook]);

    return (
        <div className="turn-selector centered">
            {extraButtonsLeft}
            <button
                onClick={() => gameStateManager.togglePlayback()}
                disabled={gameStateManager.isLatestEntry}>
                    {gameStateManager.isPlayingBack ? "Pause playback" : "Playback turns"}
            </button>
            <button
                onClick={goToPreviousDay}
                disabled={gameStateManager.entryId <= logBook.getFirstEntryId()}>
                    &lt;&lt; Day
            </button>
            <button
                onClick={() => playerSetEntry(previousEntryId)}
                disabled={gameStateManager.entryId <= logBook.getFirstEntryId()}>
                    &lt; Turn
            </button>
            <span className="turn-selector-turn-text">{turnText}</span>
            <button
                onClick={() => playerSetEntry(nextEntryId)}
                disabled={gameStateManager.isLatestEntry}>
                    Turn &gt;
            </button>
            <button
                onClick={() => playerSetEntry(logBook.getFirstEntryOfDay(nextDay).id)}
                disabled={today == nextDay}>
                    Day &gt;&gt;
            </button>
            <button
                onClick={() => playerSetEntry(logBook.getLastEntryId())}
                disabled={gameStateManager.isLatestEntry}>
                    Latest Turn
            </button>
        </div>
    );
}