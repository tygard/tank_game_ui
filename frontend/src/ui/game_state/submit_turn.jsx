import { submitTurn, usePossibleActions } from "../../api/game";
import "./submit_turn.css";
import { useCallback, useEffect, useState } from "preact/hooks";


function capitalize(string) {
    return string.length === 0 ? "" : string[0].toUpperCase() + string.slice(1);
}

function isValidEntry(spec, logBookEntry) {
    // Both action and type are required
    if(!logBookEntry.subject || !logBookEntry.action || !spec) return false;

    for(const field of spec) {
        // Check if this value has been submitted
        if(logBookEntry[field.name] === undefined) return false;
    }

    return true;
}


export function SubmitTurn({ gameInfo }) {
    const users = gameInfo?.users || [];
    const [selectedUser, setSelectedUser] = useState();
    const [actionType, setActionType] = useState();
    const [actionSpecific, setActionSpecific] = useState({});
    const [actionSpecs, _] = usePossibleActions(selectedUser);

    // Reset the action type
    useEffect(() => {
        setActionType(undefined);
    }, [selectedUser, setActionType]);

    // Reset any action specific fields if user or action type changes
    useEffect(() => {
        setActionSpecific({});
    }, [selectedUser, actionType, setActionSpecific]);

    const logBookEntry = {
        type: "action",
        subject: selectedUser,
        action: actionType,
        ...actionSpecific
    };

    const currentSpec = (actionSpecs && actionSpecs[actionType]) || [];
    const possibleActions = actionSpecs ? Object.keys(actionSpecs) : [];
    const isValid = isValidEntry(currentSpec, logBookEntry);

    const submitTurnHandler = e => {
        e.preventDefault();
        if(isValid) {
            submitTurn(logBookEntry);

            // Reset the form
            setActionType(undefined);
        }
    };

    return (
        <>
            <h2>New action</h2>
            <div className="submit-turn">
                <form onSubmit={submitTurnHandler}>
                    <LabelElement name="User">
                        <Select spec={{ options: users }} value={selectedUser} setValue={setSelectedUser}></Select>
                    </LabelElement>
                    <LabelElement name="Action">
                        <Select spec={{ options: possibleActions }} value={actionType} setValue={setActionType}></Select>
                    </LabelElement>
                    <SubmissionForm spec={currentSpec} values={actionSpecific} setValues={setActionSpecific}></SubmissionForm>
                    <button type="submit" disabled={!isValid}>Submit action</button>
                </form>
            </div>
            <h3>Log book entry</h3>
            <pre>{JSON.stringify(logBookEntry, null, 4)}</pre>
        </>
    );
}

function SubmissionForm({ spec, values, setValues }) {
    if(!spec) return;

    return (
        <>
            {spec.map(fieldSpec => {
                let Element;

                if(fieldSpec.type.startsWith("select")) {
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
                                value={values[fieldSpec.name]}
                                setValue={newValues => setValues({ ...values, [fieldSpec.name]: newValues })}></Element>
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
            <b>{capitalize(name)}</b>
            {children}
        </label>
    );
}

function Select({ spec, value, setValue }) {
    const onChange = useCallback(e => {
        setValue(e.target.value == "unset" ? undefined : e.target.value);
    }, [setValue]);

    return (
        <select onChange={onChange} value={value ? value : "unset"}>
            <option value="unset">&lt;unset&gt;</option>
            {spec.options.map(element => {
                const value = element.toString();

                return (
                    <option key={value}>{value}</option>
                );
            })}
        </select>
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
            placeholder={spec.placeholder || ""}/>
    );
}