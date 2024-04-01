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


export function SubmitTurn({ possibleActions }) {
    if(!possibleActions) return null;

    const [logBookEntry, setLogBookEntry] = useState({});

    const template = buildActionTree(possibleActions);

    const getField = useCallback((fieldName) => {
        return logBookEntry[fieldName];
    }, [logBookEntry]);

    const setField = useCallback((fieldName, value) => {
        console.log(fieldName, value, logBookEntry);
        setLogBookEntry({
            ...logBookEntry,
            [fieldName]: value,
        });
    }, [logBookEntry, setLogBookEntry]);

    return (
        <>
            <h2>New action</h2>
            <div className="submit-turn">
                <SubmissionForm template={template} getField={getField} setField={setField}></SubmissionForm>
            </div>
            <h3>Log book entry</h3>
            <pre>{JSON.stringify(logBookEntry, null, 4)}</pre>
        </>
    );
}

function SubmissionForm({ template, getField, setField }) {
    return (
        <>
            {template.map(fieldTemplate => {
                if(fieldTemplate.type === "select") {
                    return <Select template={fieldTemplate} getField={getField} setField={setField}></Select>;
                }
                else {
                    return <span style="color: red;">Unknown field type: {fieldTemplate.type}</span>;
                }
            })}
        </>
    )
}

function findNamesRecursive(fields) {
    let fieldsToRemove = new Set();

    const processFields = fields => {
        for(const field of fields) {
            fieldsToRemove.add(field.name);

            for(const option of (field.options || [])) {
                if(option.subfields) {
                    processFields(option.subfields);
                }
            }
        }
    };

    processFields(fields);

    return Array.from(fieldsToRemove);
}

function Select({ template, getField, setField }) {
    const value = getField(template.name);
    const subfields = template.options.find(option => option.value == value)?.subfields;

    return (
        <>
            <label className="submit-turn-field" key={template.name}>
                <b>{capitalize(template.name)}</b>
                <select onChange={e => setField(template.name, e.target.value == "<unset>" ? undefined : e.target.value)}>
                    <option>&lt;unset&gt;</option>
                    {template.options.map(element => {
                        return (
                            <option selected={value == element}>{element.value.toString()}</option>
                        );
                    })}
                </select>
            </label>
            {subfields && <SubmissionForm template={subfields} getField={getField} setField={setField}></SubmissionForm>}
        </>
    );
}
