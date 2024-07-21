import { useEffect, useState } from "preact/hooks";

export function CooldownList({ gameState, versionConfig }) {
    const [cooldowns, setCooldowns] = useState([]);

    useEffect(() => {
        // No state nothing to search
        if(!gameState) return;

        const updateCooldowns = () => setCooldowns(versionConfig.findCooldowns(gameState));

        updateCooldowns();

        const handle = setInterval(updateCooldowns, 500);
        return () => clearInterval(handle);
    }, [versionConfig, gameState, setCooldowns]);

    if(cooldowns.length === 0) return;

    return (
        <p>
            <h3>Cooldowns</h3>
            <table className="pretty-table">
                <tr>
                    <th>Player</th>
                    <th>Time Remaining</th>
                </tr>
                {cooldowns.map(cooldown => {
                    return (
                        <tr key={cooldown.playerName}>
                            <td>{cooldown.playerName}</td>
                            <td align="right">{prettyPrintTime(cooldown.timeRemaining)}</td>
                        </tr>
                    )
                })}
            </table>
        </p>
    )
}

function prettyPrintTime(timeRemaining) {
    let seconds = Math.floor(timeRemaining % 60);
    let minutes = Math.floor(timeRemaining / 60);

    if(seconds < 10) seconds = `0${seconds}`;
    if(minutes < 10) minutes = `0${minutes}`;

    return `${minutes}:${seconds}`;
}