import { targetSelectionState } from "../../api/space-selecting-state";
import { Position } from "../../position";
import "./board.css";

export function GameBoard({ boardState, emptyMessage = "No board data supplied" }) {

    if(!boardState) return <p>{emptyMessage}</p>;

    const height = boardState.unit_board.length;
    if(height === 0) {
        return (
            <p>Zero height boards are not supported</p>
        );
    }

    const width = boardState.unit_board[0].length;

    try {
        return (
            <GameBoardView width={width} entities={boardState.unit_board} floorBoard={boardState.floor_board}></GameBoardView>
        );
    }
    catch(err) {
        return (
            <p>Failed to render board: {err.message}</p>
        );
    }
}

export function GameBoardView({ width, entities, floorBoard }) {
    let letters = [<Tile className="board-space-coordinate"></Tile>];
    for(let x = 0; x < width; ++x) {
        const letter = new Position(x, 0).humanReadableX();
        letters.push(<Tile className="board-space-coordinate">{letter}</Tile>);
    }

    const possibleTargets = targetSelectionState.usePossibleTargets();
    let selectedTarget = targetSelectionState.useSelectedTarget();
    selectedTarget = selectedTarget && Position.fromHumanReadable(selectedTarget);

    return (
        <div className="game-board">
            <div className="game-board-row">
                {letters}
            </div>
            {entities.map((row, y) => (
                <div className="game-board-row">
                    <Tile className="board-space-coordinate">{y + 1}</Tile>
                    {row.map((space, x) => {
                        const position = new Position(x, y).humanReadable();
                        const disabled = possibleTargets && !possibleTargets.has(position);

                        const onClick = possibleTargets && !disabled ? () => {
                            targetSelectionState.setSelectedTarget(position);
                        } : undefined;

                        return <Space space={space} onClick={onClick} areaOfEffect={floorBoard[y][x]} disabled={disabled}
                            selected={selectedTarget && selectedTarget.x == x && selectedTarget.y == y}></Space>;
                    })}
                </div>
            ))}
        </div>
    )
}

function Space({ space, areaOfEffect, disabled, onClick, selected }) {
    const type = space && space.type;
    let entity = null;

    // Try to place an entity in this space
    if(type == "tank") {
        entity = <Tank tank={space} areaOfEffect={areaOfEffect}></Tank>;
    }
    else if(type == "wall") {
        entity = <Wall wall={space} areaOfEffect={areaOfEffect}></Wall>;
    }

    return (
        <Tile areaOfEffect={areaOfEffect} disabled={disabled} onClick={onClick} selected={selected}>
            {entity}
        </Tile>
    );
}

function Tile({ className = "", children, areaOfEffect, disabled, onClick, selected } = {}) {
    if(areaOfEffect && areaOfEffect.type == "gold_mine") {
        className += " board-space-gold-mine";
    }

    if(disabled) {
        className += " board-space-disabled";
    }

    if(onClick) {
        className += " board-space-selectable";
    }

    if(selected) {
        className += " board-space-selected";
    }

    return (
        <div className={`board-space board-space-centered ${className}`} onClick={onClick}>{children}</div>
    );
}

function Tank({ tank }) {
    let tankStats;
    if(tank.dead) {
        tankStats = (
            <div className={`board-space-centered board-space-tank-dead board-space-wall-${tank.health}`}>
                {tank.health}
            </div>
        );
    }
    else {
        tankStats = (
            <div className="board-space-tank-stats">
                <div className="board-space-tank-lives board-space-centered">{tank.health}</div>
                <div className="board-space-tank-range board-space-centered">{tank.range}</div>
                <div className="board-space-tank-gold board-space-centered">{tank.gold}</div>
                <div className="board-space-tank-actions board-space-centered">{tank.actions}</div>
            </div>
        );
    }

    return (
        <div className="board-space-entity">
            <div className="board-space-tank-title board-space-centered">
                <div className="board-space-tank-title-inner">{tank.name}</div>
            </div>
            {tankStats}
        </div>
    );
}

function Wall({ wall }) {
    const deadTankClass = wall.type == "tank" ? "board-space-wall-tank" : "";

    return (
        <div className={`board-space-wall-${wall.health} board-space-entity board-space-centered ${deadTankClass}`}>
            {wall.health}
        </div>
    );
}
