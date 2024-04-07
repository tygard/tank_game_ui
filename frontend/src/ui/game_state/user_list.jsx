import "./user_list.css";
import { keysToIgnore, orderedKeys, userTypeToHeaders, fieldAlignment, defaultAlignment } from "../../config.js";

function capitalize(text) {
    if(text.length == 0) return "";

    return text[0].toUpperCase() + text.slice(1);
}

function getKeysFromUser(user) {
    let keys = new Set(
        orderedKeys.filter(key => user.hasOwnProperty(key))
    );

    let newKeys = Object.keys(user)
        .filter(key => !keysToIgnore.has(key));

    newKeys.sort();
    newKeys.forEach(key => keys.add(key));

    return Array.from(keys);
}

export function UserList({ users }) {
    const sections = users.usersByType;

    return (
        <div className="user-list">
            {Object.keys(sections).map(sectionName => {
                return (
                    <Section name={sectionName} users={sections[sectionName]}></Section>
                );
            })}
        </div>
    )
}


function Section({ name, users }) {
    // Each section is guarenteed to have at least 1 user
    const tableHeader = getKeysFromUser(users[0]);

    let content;

    // No extra fields just make a list
    if(tableHeader.length == 1 && tableHeader[0] == "name") {
        content = (
            <ul>
                {users.map(user => <li>{user.name}</li>)}
            </ul>
        );
    }
    else {
        content = (
            <table className="user-list-table">
                <tr>
                    {tableHeader.map(name => <th>{capitalize(name)}</th>)}
                </tr>
                {users.map(user => (
                    <UserInfo user={user} tableHeader={tableHeader}></UserInfo>
                ))}
            </table>
        );
    }

    const displayName = userTypeToHeaders[name] || (capitalize(name) + "s");

    return (
        <>
            <h3>{displayName}</h3>
            {content}
        </>
    );
}


function UserInfo({ user, tableHeader }) {
    return (
        <tr>
            {tableHeader.map(key => {
                const alignment = fieldAlignment[key] || defaultAlignment;

                return (
                    <td style={`text-align: ${alignment};`}>{user[key]}</td>
                );
            })}
        </tr>
    );
}