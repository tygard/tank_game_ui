import { prettyifyName } from "../../utils.mjs";
import { AttributeList } from "./attribute-list.jsx";
import "./council.css";

const EXCLUDED_ATTRIBUTES = new Set(["armistice"]);

export function Council({ gameState, config, setSelectedUser, canSubmitAction }) {
    if(!gameState || !config) {
        return "Loading...";
    }

    return (
        <>
            <ArmisticeClock armistice={gameState.council.armistice}></ArmisticeClock>
            <AttributeList attributes={gameState.council} excludedAttributes={EXCLUDED_ATTRIBUTES}></AttributeList>
            <div className="user-list">
                {config.getCouncilPlayerTypes().map(playerType => {
                    const players = gameState.players.getPlayersByType(playerType);

                    if(players.length === 0) return;

                    return (
                        <Section
                            key={playerType}
                            name={playerType}
                            users={players}
                            canSubmitAction={canSubmitAction}
                            setSelectedUser={setSelectedUser}></Section>
                    );
                })}
            </div>
        </>
    )
}


function Section({ name, users, setSelectedUser, canSubmitAction }) {
    return (
        <>
            <h3>{prettyifyName(name)}s</h3>
            <ul>
                {users.map(user => {
                    const actionButton = user.entities.length === 0 && canSubmitAction ? (
                        <button onClick={() => setSelectedUser(user.name)} className="council-action-button">
                            Take Action
                        </button>
                    ) : undefined;

                    return <li key={user.name}>{user.name}{actionButton}</li>
                })}
            </ul>
        </>
    );
}


function ArmisticeClock({ armistice }) {
    // We're on a pre armistice version of the game
    if(!armistice) return;

    const armisticePercent = Math.max(0, Math.min(1, armistice.value / armistice.max));
    const radius = 45;

    // Find the circumference of the circle
    const fullCircle = Math.ceil(radius * 2 * Math.PI);

    // Calculate the portion of the circumference that we want to show and hide
    const dashPercent = armisticePercent * fullCircle;
    const dashArray = `${dashPercent} ${fullCircle - dashPercent}`;

    // Start from the top of the circle not the far right
    const startPosition = fullCircle / 4;

    return (
        <>
            <h3>Armistice Votes</h3>
            <svg height="100" width="100" viewBox="0 0 100 100" className="armistice-clock">
                <circle cx="50" cy="50" r={radius} stroke-dasharray={dashArray} stroke-dashoffset={startPosition}/>
                <text x="50" y="50" dominant-baseline="middle" text-anchor="middle">
                    {armistice.toString()}
                </text>
            </svg>
        </>
    )
}
