/* global alert */
import { submitTurn, usePossibleActionFactories } from "../../drivers/rest/fetcher.js";
import { ErrorMessage } from "../error_message.jsx";
import "./submit_turn.css";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import { resetPossibleActions, selectActionType, setActionSpecificField, setPossibleActions, setSubject } from "../../interface-adapters/build-turn.js";
import { prettyifyName } from "../../utils.js";

export function SubmitTurn({ isLatestEntry, canSubmitAction, refreshGameInfo, game, debug, entryId, builtTurnState, buildTurnDispatch }) {
    // Set this to undefined so we don't send a request for anthing other than the last turn
    const possibleActionsEntryId = canSubmitAction && isLatestEntry ? entryId : undefined;
    const [actionFactories, error] = usePossibleActionFactories(game, builtTurnState.subject, possibleActionsEntryId);
    useEffect(() => {
        buildTurnDispatch(setPossibleActions(actionFactories));
    }, [actionFactories, buildTurnDispatch]);

    const [status, setStatus] = useState();

    const submitTurnHandler = useCallback(async e => {
        e.preventDefault();
        if(builtTurnState.isValid) {
            setStatus("Submitting action...");

            try {
                await submitTurn(game, builtTurnState.logBookEntry);
            }
            catch(err) {
                alert(`Failed to submit action: ${err.message}`);
            }

            // Reset the form
            buildTurnDispatch(resetPossibleActions());
            refreshGameInfo();
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

    // Game over no more actions to submit or we haven't picked a user yet
    if(!canSubmitAction || builtTurnState.actions.length === 0) {
        return;
    }

    if(!isLatestEntry) {
        return (
            <p>You can only submit actions on the most recent turn.</p>
        );
    }

    if(error) {
        return <ErrorMessage error={error}></ErrorMessage>
    }

    if(status) {
        return <p>{status}</p>;
    }

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
                        <LabelElement name="Action">
                            <Select
                                spec={possibleActions}
                                value={possibleActions.internalToPretty[builtTurnState.currentActionName]}
                                setValue={selectAction}></Select>
                        </LabelElement>
                        <SubmissionForm
                            builtTurnState={builtTurnState}
                            buildTurnDispatch={buildTurnDispatch}></SubmissionForm>
                    </div>
                    <div className="submit-action-button-wrapper">
                        <button type="submit" disabled={!builtTurnState.isValid}>Submit action</button>
                    </div>
                </form>
                {debug ? <div>
                    <details>
                        <summary>Log book entry (JSON)</summary>
                        <pre>{JSON.stringify(builtTurnState.logBookEntry, null, 4)}</pre>
                    </details>
                    <details>
                        <summary>Build turn state (JSON)</summary>
                        <pre>{JSON.stringify(builtTurnState, null, 4)}</pre>
                    </details>
                </div> : undefined}
            </div>
        </div>
    );
}

function SubmissionForm({ builtTurnState, buildTurnDispatch }) {
    return (
        <>
            {builtTurnState.currentSpecs.map(fieldSpec => {
                // Don't display this field at all
                if(fieldSpec.hidden) return;

                let Element;

                if(fieldSpec.type == "select-position") {
                    Element = SelectPosition;
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
                        <LabelElement key={fieldSpec.name} name={fieldSpec.name}>
                            <p className="submit-turn-description">{fieldSpec.description}</p>
                            <Element
                                type={fieldSpec.type}
                                builtTurnState={builtTurnState}
                                spec={fieldSpec}
                                value={builtTurnState.uiFieldValues[fieldSpec.name]}
                                setValue={setValue}></Element>
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

function LabelElement({ name, children }) {
    return (
        <label className="submit-turn-field" key={name}>
            <h3>{name}</h3>
            {children}
        </label>
    );
}

function Select({ spec, value, setValue }) {
    const onChange = useCallback(e => {
        setValue(e.target.value == "unset" ? undefined : spec.options[+e.target.value]);
    }, [setValue, spec]);

    const currentIndex = value !== undefined ? spec.options.indexOf(value) : -1;

    return (
        <div className="radio-container">
            {spec.options.map((element, index) => {
                const value = element.toString();

                return (
                    <div key={index} className="radio-button-wrapper">
                        <label>
                            <input type="radio" value={index} onChange={onChange} checked={index === currentIndex}/>
                            {value}
                        </label>
                    </div>
                );
            })}
        </div>
    );
}

function Input({ spec, type, value, setValue }) {
    const inputType = type.split("-")[1];
    const convert = value => {
        return inputType == "number" ? +value : value;
    };

    return (
        <input
            type={inputType || "text"}
            value={value}
            onInput={e => setValue(convert(e.target.value))}
            placeholder={spec.placeholder || spec.name}/>
    );
}

function SelectPosition({ builtTurnState }) {
    const {location} = builtTurnState.locationSelector;
    const message = location ?
        `${location} (select a different space to change)` :
        `Select a location on the board`;

    return (
        <span>{message}</span>
    );
}