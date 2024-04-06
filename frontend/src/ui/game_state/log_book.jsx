import { useCallback, useMemo } from "preact/hooks";
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
            <h2>Log Book</h2>
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
            <h3>Day {day}</h3>
            <ul>
                {actions.map(action => {
                    let entryClasses = "";

                    if(currentTurn == action.turnId) {
                        entryClasses += " log-entry-current-turn";
                    }

                    if(!action.action.valid) {
                        entryClasses += " log-entry-invalid";
                    }

                    return (
                        <li className={entryClasses}>
                            <a className="log-book-link" href="#" onClick={e => selectAction(e, action.turnId)}>
                                {action.action.logEntryStr}
                            </a>
                        </li>
                    );
                })}
            </ul>
        </>
    );
}