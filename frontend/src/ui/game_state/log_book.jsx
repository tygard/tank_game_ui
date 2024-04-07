import { useCallback, useEffect, useMemo, useRef } from "preact/hooks";
import "./log_book.css";

export function LogBook({ gameInfo, changeTurn, currentTurn }) {
    const logBook = gameInfo?.statesSummary;

    if(!logBook) {
        return <p>Loading...</p>;
    }

    const actionsByDay = useMemo(() => {
        let currentDay = 0;
        let actionsByDay = {};
        let turnId = 1;

        for(const action of logBook) {
            if(action.logEntry.day) {
                currentDay = action.logEntry.day;
                actionsByDay[currentDay] = [];
            }

            actionsByDay[currentDay].push({
                action,
                turnId
            });

            ++turnId;
        }

        return actionsByDay;
    }, [logBook]);

    return (
        <div className="log-book">
            {Object.keys(actionsByDay).map(day => {
                return (
                    <DaySection day={day} actions={actionsByDay[day]} changeTurn={changeTurn} currentTurn={currentTurn}></DaySection>
                );
            })}
        </div>
    );
}

function DaySection({ day, actions, currentTurn, changeTurn }) {
    const selectAction = useCallback((e, turnId) => {
        e.preventDefault();
        changeTurn(turnId);
    }, [changeTurn]);

    return (
        <>
            <h3 class="log-book-day-heading">Day {day}</h3>
            {actions.map(action => {
                const isCurrent = currentTurn == action.turnId;
                const scrollRef = useRef();

                useEffect(() => {
                    if(isCurrent) {
                        scrollRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
                    }
                }, [scrollRef, isCurrent])

                let entryClasses = "log-entry";

                if(isCurrent) {
                    entryClasses += " log-entry-current-turn";
                }

                if(!action.action.valid) {
                    entryClasses += " log-entry-invalid";
                }

                return (
                    <div className={entryClasses} ref={scrollRef}>
                        <a className="log-book-link" href="#" onClick={e => selectAction(e, action.turnId)}>
                            {action.action.logEntryStr}
                        </a>
                    </div>
                );
            })}
        </>
    );
}