import "./tank.css";

export function Tank({ tank }) {
    let tankStats;
    if(tank.type == "dead-tank") {
        tankStats = (
            <div className={`board-space-centered board-space-tank-dead board-space-wall-${tank.resources.health.value}`}>
                {tank.resources.health.value}
            </div>
        );
    }
    else {
        tankStats = (
            <div className="board-space-tank-stats">
                <div className="board-space-tank-lives board-space-centered">{tank.resources.health.value}</div>
                <div className="board-space-tank-range board-space-centered">{tank.resources.range.value}</div>
                <div className="board-space-tank-gold board-space-centered">{tank.resources.gold.value}</div>
                <div className="board-space-tank-actions board-space-centered">{tank.resources.actions.value}</div>
            </div>
        );
    }

    return (
        <div className="board-space-entity">
            <div className="board-space-tank-title board-space-centered">
                <div className="board-space-tank-title-inner">{tank.player.name}</div>
            </div>
            {tankStats}
        </div>
    );
}
