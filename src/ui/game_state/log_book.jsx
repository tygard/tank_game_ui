import { useCallback, useEffect, useMemo, useRef } from "preact/hooks";
import "./log_book.css";

export function LogBook({ logBook, changeEntryId, currentEntryId }) {
    if(!logBook) {
        return <p>Loading...</p>;
    }

    return (
        <div className="log-book">
            {logBook.getAllDays().map(day => {
                return (
                    <DaySection
                        key={day}
                        day={day}
                        logEntries={logBook.getEntriesOnDay(day)}
                        firstEntryId={logBook.getFirstEntryIdOfDay(day)}
                        changeEntryId={changeEntryId}
                        currentEntryId={currentEntryId}></DaySection>
                );
            })}
        </div>
    );
}

function DaySection({ day, logEntries, currentEntryId, changeEntryId, firstEntryId }) {
    const selectEntry = useCallback((e, entryId) => {
        e.preventDefault();
        changeEntryId(entryId);
    }, [changeEntryId]);

    return (
        <>
            <h3 className="log-book-day-heading">Day {day}</h3>
            {logEntries.map((logEntry, idx) => {
                const entryId = firstEntryId + idx;

                return (
                    <LogEntry
                        key={entryId}
                        entryId={entryId}
                        currentEntryId={currentEntryId}
                        logEntry={logEntry}
                        selectEntry={selectEntry}></LogEntry>
                );
            })}
        </>
    );
}

function LogEntry({ currentEntryId, logEntry, selectEntry, entryId }) {
    const isCurrent = currentEntryId == entryId;
    const scrollRef = useRef();

    useEffect(() => {
        if(isCurrent && scrollRef.current) {
            scrollRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
        }
    }, [scrollRef, isCurrent])

    let entryClasses = "log-entry";

    if(isCurrent) {
        entryClasses += " log-entry-current-turn";
    }

    return (
        <div className={entryClasses} ref={scrollRef} key={entryId}>
            <a className="log-book-link" href="#" onClick={e => selectEntry(e, entryId)}>
                {logEntry.message}
            </a>
        </div>
    );
}