import "./wall.css";

export function Wall({ wall }) {
    const deadTankClass = wall.type == "tank" ? "board-space-wall-tank" : "";

    return (
        <div className={`board-space-wall-${wall.resources.health.value} board-space-entity board-space-centered ${deadTankClass}`}>
            {wall.resources.health.value}
        </div>
    );
}
