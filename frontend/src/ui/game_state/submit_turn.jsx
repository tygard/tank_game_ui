import { submitTurn, usePossibleActionFactories } from "../../api/fetcher";
import { targetSelectionState } from "../../api/space-selecting-state";
import { ErrorMessage } from "../error_message.jsx";
import "./submit_turn.css";
import { useCallback, useEffect, useState } from "preact/hooks";

export function SubmitTurn({ isLatestEntry, canSubmitAction, refreshGameInfo, game, debug, entryId, selectedUser, setSelectedUser }) {
    const [currentFactory, setCurrentFactory] = useState();
    const [actionSpecific, setActionSpecific] = useState({});
    // Set this to undefined so we don't send a request for anthing other than the last turn
    const possibleActionsEntryId = canSubmitAction && isLatestEntry ? entryId : undefined;
    const [actionFactories, error] = usePossibleActionFactories(game, selectedUser, possibleActionsEntryId);
    const [status, setStatus] = useState();

    // Reset the action type
    useEffect(() => {
        setCurrentFactory(undefined);
    }, [selectedUser, setCurrentFactory]);

    // Reset any action specific fields if user or action type changes
    useEffect(() => {
        setActionSpecific({});
        targetSelectionState.clearPossibleTargets();
    }, [selectedUser, currentFactory, setActionSpecific]);

    // Game over no more actions to submit or we haven't picked a user yet
    if(!canSubmitAction || !selectedUser) {
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

    const possibleActions = actionFactories || [];

    const logBookEntry = (currentFactory && currentFactory != "unset") && currentFactory.buildRawEntry(actionSpecific);
    const isValid = currentFactory && currentFactory.areParemetersValid(logBookEntry);

    const submitTurnHandler = useCallback(async e => {
        e.preventDefault();
        if(isValid) {
            targetSelectionState.clearPossibleTargets();
            setStatus("Submitting action...");

            try {
                await submitTurn(game, logBookEntry);
            }
            catch(err) {
                alert(`Failed to submit action: ${err.message}`);
            }

            // Reset the form
            setCurrentFactory(undefined);
            refreshGameInfo();
            setStatus(undefined);
        }
    }, [setCurrentFactory, refreshGameInfo, isValid, setStatus, logBookEntry]);

    return (
        <div className="submit-turn-box">
            <div className="submit-turn-title">
                <h2>Submit action as {selectedUser}</h2>
                <div>
                <button onClick={() => setSelectedUser(undefined)}>Close</button>
                </div>
            </div>
            <div className="submit-turn">
                <form onSubmit={submitTurnHandler} className="submit-turn-form">
                    <div className="submit-turn-field-wrapper">
                        {possibleActions?.length > 0 ? <LabelElement name="Action">
                            <Select spec={{ options: possibleActions }} value={currentFactory} setValue={setCurrentFactory}></Select>
                        </LabelElement> : undefined}
                        <SubmissionForm factory={currentFactory} values={actionSpecific} setValues={setActionSpecific}></SubmissionForm>
                    </div>
                    <div className="submit-action-button-wrapper">
                        <button type="submit" disabled={!isValid}>Submit action</button>
                    </div>
                </form>
                {debug ? <div>
                    <details>
                        <summary>Log book entry (JSON)</summary>
                        <pre>{JSON.stringify(logBookEntry, null, 4)}</pre>
                    </details>
                    <details>
                        <summary>Log book entry factory (JSON)</summary>
                        <p>Displaying: {currentFactory ? "Factory" : "Actions + Factories"}</p>
                        <pre>{JSON.stringify(currentFactory || actionFactories, null, 4)}</pre>
                    </details>
                </div> : undefined}
            </div>
        </div>
    );
}

function SubmissionForm({ factory, values, setValues }) {
    if(!factory) return;

    const spec = factory.getParameterSpec();

    return (
        <>
            {spec.map(fieldSpec => {
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

                if(Element) {
                    return (
                        <LabelElement key={fieldSpec.name} name={fieldSpec.name}>
                            <Element
                                type={fieldSpec.type}
                                spec={fieldSpec}
                                value={values[fieldSpec.logBookField]}
                                setValue={newValues => setValues({ ...values, [fieldSpec.logBookField]: newValues })}></Element>
                        </LabelElement>
                    );
                }
                else {
                    return <span style="color: red;">Unknown field type: {fieldSpec.type}</span>;
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
                    <div className="radio-button-wrapper">
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

function SelectPosition({ spec, value, setValue }) {
    useEffect(() => {
        targetSelectionState.setPossibleTargets(new Set(spec.options.map(option => option.position)));
        targetSelectionState.setSelectedTargetCallback(position => {
            const option = spec.options.find(option => option.position == position);
            setValue(option?.value);
        });

        return () => targetSelectionState.setSelectedTargetCallback(undefined);
    }, [setValue]);

    const message = value ?
        `${value} (select a different space to change)` :
        `Select a location on the board`;

    return (
        <span>{message}</span>
    );
}