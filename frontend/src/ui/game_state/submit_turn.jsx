import { usePossibleActions } from "../../api/game";
import "./submit_turn.css";
import { useCallback, useState } from "preact/hooks";

function capitalize(string) {
    return string.length === 0 ? "" : string[0].toUpperCase() + string.slice(1);
}

function buildActionTree(possibleActions) {
    let template = [
        // This represents a select element
        {
            type: "select",
            name: "user",
            options: []
        }
    ];

    for(const action of possibleActions) {
        const user = action.subject.type == "council" ?
            "council" : action.subject.name;
        const actionType = action.rules;

        // Location is a location if it's a space but if its a player it's a target
        const targetKey = action.target?.name ? "target" : "location";

        // Check if there's already an option for this user
        let userTemplate = template[0].options.find(option => option.value == user);
        if(!userTemplate) {
            // This is an option in the select
            userTemplate = {
                value: user,
                subfields: [
                    // This select appears when this user is selected
                    {
                        type: "select",
                        name: "action",
                        options: []
                    }
                ],
            };

            template[0].options.push(userTemplate);
        }

        // Check if there's already an option for this action type
        let actionTemplate = userTemplate.subfields[0].options.find(option => option.value == actionType);
        if(!actionTemplate) {
            actionTemplate = {
                value: actionType,
                subfields: []
            };

            userTemplate.subfields[0].options.push(actionTemplate);

            // Fill options
            if(actionType == "shoot") {
                actionTemplate.subfields.push({
                    type: "select",
                    name: "hit",
                    options: [
                        { value: true },
                        { value: false }
                    ]
                });
            }

            if(actionType == "buy_action") {
                actionTemplate.subfields.push({
                    type: "select",
                    name: "quantity",
                    displayName: "Gold (cost)",
                    options: [
                        { value: 3 },
                        { value: 5 },
                        { value: 10 },
                    ]
                });
            }

            if(action.target) {
                actionTemplate.subfields.push({
                    type: "select",
                    name: targetKey,
                    options: []
                });
            }
        }

        let actionTargetTemplate = actionTemplate.subfields.find(option => option.name === targetKey);

        // Convert target to a string
        actionTargetTemplate.options.push({ value: action.target.name || action.target.position });
    }

    return template;
}

function flattenObject(object) {
    let flatObject = {};

    const flatten = object => {
        for(const key of Object.keys(object)) {
            if(key == "value") continue;

            flatObject[key] = object[key].value;
            flatten(object[key]);
        }
    };

    flatten(object);
    return flatObject;
}

function isValidEntry(template, logBookEntry) {
    for(const field of template) {
        // Check if this value has been submitted
        if(logBookEntry[field.name] === undefined) return false;

        // Check any subfields
        if(!field.options) continue;

        const option = field.options.find(option => option.value == logBookEntry[field.name]);
        if(!option || !option.subfields) continue;

        if(!isValidEntry(option.subfields, logBookEntry)) return false;
    }

    return true;
}


export function SubmitTurn({ gameInfo }) {
    const users = gameInfo?.users || [];
    const [selectedUser, setSelectedUser] = useState();
    const [possibleActions, _] = usePossibleActions(selectedUser);

    const [logBookEntry, setLogBookEntry] = useState({});
    const flatLogBookEntry = flattenObject(logBookEntry);

    const template = possibleActions ? buildActionTree(possibleActions) : [];
    const isValid = isValidEntry(template, flatLogBookEntry)

    return (
        <>
            <h2>New action</h2>
            <div className="submit-turn">
                <form>
                    <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
                        {users.map(user => {
                            return <option>{user}</option>;
                        })}
                    </select>
                    <SubmissionForm template={template} values={logBookEntry} setValues={setLogBookEntry}></SubmissionForm>
                    <button type="submit" disabled={!isValid}>Submit action</button>
                </form>
            </div>
            <h3>Log book entry</h3>
            <pre>{JSON.stringify(flatLogBookEntry, null, 4)}</pre>
        </>
    );
}

function SubmissionForm({ template, values, setValues }) {
    return (
        <>
            {template.map(fieldTemplate => {
                if(fieldTemplate.type === "select") {
                    return <Select template={fieldTemplate} values={values[fieldTemplate.name] || {}} setValues={newValues => setValues({ ...values, [fieldTemplate.name]: newValues })}></Select>;
                }
                else {
                    return <span style="color: red;">Unknown field type: {fieldTemplate.type}</span>;
                }
            })}
        </>
    )
}

function Select({ template, values, setValues }) {
    const value = values.value;
    const subfields = template.options.find(option => option.value == value)?.subfields;

    const onChange = useCallback(e => {
        setValues({
            value: e.target.value == "<unset>" ? undefined : e.target.value,
        });
    }, [setValues]);

    return (
        <>
            <label className="submit-turn-field" key={template.name}>
                <b>{capitalize(template.name)}</b>
                <select onChange={onChange} value={value}>
                    <option key="unset">&lt;unset&gt;</option>
                    {template.options.map(element => {
                        return (
                            <option key={element.value.toString()}>{element.value.toString()}</option>
                        );
                    })}
                </select>
            </label>
            {subfields && <SubmissionForm template={subfields} values={values} setValues={setValues}></SubmissionForm>}
        </>
    );
}
