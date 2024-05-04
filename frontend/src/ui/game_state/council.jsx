import { prettyifyName } from "../../../../common/state/utils.mjs";
import { AttributeList } from "./attribute-list.jsx";
import "./council.css";

const EXCLUDED_ATTRIBUTES = new Set(["armistice"]);

export function Council({ gameState, config }) {
    if(!gameState || !config) {
        return "Loading...";
    }

    return (
        <>
            <ArmisticeClock armistice={gameState.council.armistice}></ArmisticeClock>
            <AttributeList attributes={gameState.council} excludedAttributes={EXCLUDED_ATTRIBUTES}></AttributeList>
            <div className="user-list">
                {config.getCouncilPlayerTypes().map(playerType => {
                    return (
                        <Section name={playerType} users={gameState.players.getPlayersByType(playerType)}></Section>
                    );
                })}
            </div>
        </>
    )
}


function Section({ name, users }) {
    return (
        <>
            <h3>{prettyifyName(name)}s</h3>
            <ul>
                {users.map(user => <li>{user.name}</li>)}
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
