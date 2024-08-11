import "./submit-turn.css";
import { submitTurn, usePossibleActionFactories } from "../../../drivers/rest/fetcher.js";
import { ErrorMessage } from "../../error_message.jsx";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import { resetPossibleActions, selectActionType, setActionSpecificField, setLastError, setLastRollEntry, setPossibleActions, setSubject } from "../../../interface-adapters/build-turn.js";
import { prettyifyName } from "../../../utils.js";
import { LabelElement } from "./base.jsx";
import { Select, SelectPosition } from "./select.jsx";
import { Input } from "./input.jsx";
import { DieRollResults, RollDice } from "./roll-dice.jsx";

export function SubmitTurn({ isLatestEntry, canSubmitAction, refreshGameInfo, game, debug, entryId, builtTurnState, buildTurnDispatch, allowManualRolls }) {
    // Set this to undefined so we don't send a request for anthing other than the last turn
    const possibleActionsEntryId = canSubmitAction && isLatestEntry ? entryId : undefined;
    const [actionFactories, error] = usePossibleActionFactories(game, builtTurnState.subject, possibleActionsEntryId);
    const [status, setStatus] = useState();

    useEffect(() => {
        buildTurnDispatch(setPossibleActions(actionFactories));
    }, [actionFactories, buildTurnDispatch]);

    const submitTurnHandler = useCallback(async e => {
        e.preventDefault();
        if(builtTurnState.isValid) {
            setStatus("Submitting action...");
            buildTurnDispatch(setLastError(undefined));

            try {
                const lastEntry = await submitTurn(game, builtTurnState.logBookEntry);

                // Reset the form
                refreshGameInfo();
                buildTurnDispatch(resetPossibleActions());
                buildTurnDispatch(setLastRollEntry(lastEntry));
            }
            catch(err) {
                buildTurnDispatch(setLastError(err.message));
            }

            setStatus(undefined);
        }
    }, [builtTurnState, buildTurnDispatch, refreshGameInfo, setStatus, game]);

    // Reuse the select widget for choosing an action
    const possibleActions = useMemo(() => {
        let prettyToInternal = {};
        let internalToPretty = {};
        let options = [];

        for(const action of builtTurnState.actions) {
            const pretty = prettyifyName(action.name);
            options.push(pretty);
            prettyToInternal[pretty] = action.name;
            internalToPretty[action.name] = pretty;
        }

        return {
            options,
            prettyToInternal,
            internalToPretty,
        };
    }, [builtTurnState]);

    const selectAction = actionName => {
        return buildTurnDispatch(selectActionType(possibleActions.prettyToInternal[actionName]));
    };

    if(builtTurnState.lastRollEntry) {
        return <DieRollResults
            rollLogEntry={builtTurnState.lastRollEntry}
            onClose={() => buildTurnDispatch(setLastRollEntry(undefined))}/>;
    }

    // Game over no more actions to submit
    if(!canSubmitAction) {
        return;
    }

    if(error) {
        return <ErrorMessage error={error}></ErrorMessage>
    }

    // Actions aren't available yet
    if(builtTurnState.loading) return;

    if(!isLatestEntry) {
        return (
            <p>You can only submit actions on the most recent turn.</p>
        );
    }

    if(status) {
        return <p>{status}</p>;
    }

    const actionSubmissionForm = builtTurnState.actions.length > 0 ? (
        <>
            <LabelElement name="Action">
                <Select
                    spec={possibleActions}
                    value={possibleActions.internalToPretty[builtTurnState.currentActionName]}
                    setValue={selectAction}></Select>
            </LabelElement>
            <SubmissionForm
                builtTurnState={builtTurnState}
                buildTurnDispatch={buildTurnDispatch}
                allowManualRolls={allowManualRolls}></SubmissionForm>
        </>
    ) : <p>There are not actions that you can perform at this time</p>;

    return (
        <div className="submit-turn-box">
            <div className="submit-turn-title">
                <h2>Submit action as {builtTurnState.subject}</h2>
                <div>
                <button onClick={() => buildTurnDispatch(setSubject(undefined))}>Close</button>
                </div>
            </div>
            <div className="submit-turn">
                <form onSubmit={submitTurnHandler} className="submit-turn-form">
                    <div className="submit-turn-field-wrapper">
                        {actionSubmissionForm}
                    </div>
                    <div className="submit-action-button-wrapper">
                        <button type="submit" disabled={!builtTurnState.isValid}>Submit action</button>
                    </div>
                    {builtTurnState.lastError !== undefined ? (
                        <div className="submission-error-wrapper">
                            <div className="submission-error-title">
                                <h3>Failed to submit action</h3>
                            </div>
                            <div>
                                <code>{builtTurnState.lastError}</code>
                            </div>
                        </div>
                    ) : undefined}
                </form>
                {debug ? <div>
                    <details>
                        <summary>Log book entry (JSON)</summary>
                        <pre>{JSON.stringify(builtTurnState.logBookEntry, null, 4)}</pre>
                    </details>
                </div> : undefined}
            </div>
        </div>
    );
}

function SubmissionForm({ builtTurnState, buildTurnDispatch, allowManualRolls }) {
    return (
        <>
            {builtTurnState.currentSpecs.map(fieldSpec => {
                // Don't display this field at all
                if(fieldSpec.hidden) return;

                let Element;

                if(fieldSpec.type == "select-position") {
                    Element = SelectPosition;
                }
                else if(fieldSpec.type == "roll-dice") {
                    Element = RollDice;
                }
                else if(fieldSpec.type.startsWith("select")) {
                    Element = Select;
                }
                else if(fieldSpec.type.startsWith("input")) {
                    Element = Input;
                }

                const setValue = newValue => {
                    buildTurnDispatch(setActionSpecificField(fieldSpec.name, newValue));
                };

                if(Element) {
                    return (
                        <LabelElement key={fieldSpec.name} name={fieldSpec.display}>
                            <Element
                                type={fieldSpec.type}
                                builtTurnState={builtTurnState}
                                spec={fieldSpec}
                                value={builtTurnState.uiFieldValues[fieldSpec.name]}
                                setValue={setValue}
                                allowManualRolls={allowManualRolls}></Element>
                        </LabelElement>
                    );
                }
                else {
                    return <span key={fieldSpec.type} style="color: red;">Unknown field type: {fieldSpec.type}</span>;
                }
            })}
        </>
    )
}
