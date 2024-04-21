import "./board.css";
import { targetSelectionState } from "../../api/space-selecting-state";
import { Position } from "../../../../common/state/board/position.mjs";
import { Tank } from "./board_tiles/tank.jsx";
import { Wall } from "./board_tiles/wall.jsx";

export function GameBoard({ board, emptyMessage = "No board data supplied" }) {
    if(!board) return <p>{emptyMessage}</p>;

    try {
        return (
            <GameBoardView width={board.width} board={board}></GameBoardView>
        );
    }
    catch(err) {
        return (
            <p>Failed to render board: {err.message}</p>
        );
    }
}

export function GameBoardView({ board }) {
    const possibleTargets = targetSelectionState.usePossibleTargets();
    let selectedTarget = targetSelectionState.useSelectedTarget();
    selectedTarget = selectedTarget && Position.fromHumanReadable(selectedTarget);

    let letters = [<Tile className="board-space-coordinate"></Tile>];
    for(let x = 0; x < board.width; ++x) {
        const letter = new Position(x, 0).humanReadableX;
        letters.push(<Tile className="board-space-coordinate">{letter}</Tile>);
    }

    let renderedBoard = [<div className="game-board-row">{letters}</div>];

    for(let y = 0; y < board.width; ++y) {
        let renderedRow = [<Tile className="board-space-coordinate">{y + 1}</Tile>];

        for(let x = 0; x < board.height; ++x) {
            const position = new Position(x, y);
            const disabled = possibleTargets && !possibleTargets.has(position.humanReadable);

            const onClick = possibleTargets && !disabled ? () => {
                targetSelectionState.setSelectedTarget(position.humanReadable);
            } : undefined;

            renderedRow.push(
                <Space
                    space={board.getEntityAt(position)}
                    floorTile={board.getFloorTileAt(position)}
                    onClick={onClick}
                    disabled={disabled}
                    selected={selectedTarget && selectedTarget.x == x && selectedTarget.y == y}></Space>
            );
        }

        renderedBoard.push(<div className="game-board-row">{renderedRow}</div>);
    }

    return (
        <div className="game-board">{renderedBoard}</div>
    )
}

function Space({ space, floorTile, disabled, onClick, selected }) {
    const type = space && space.type;
    let entity = null;

    // Try to place an entity in this space
    if(type == "tank" || type == "dead-tank") {
        entity = <Tank tank={space} floorTile={floorTile}></Tank>;
    }
    else if(type == "wall") {
        entity = <Wall wall={space} floorTile={floorTile}></Wall>;
    }
    else if(type != "empty") {
        throw new Error(`Failed to render entity of type ${type}`);
    }

    return (
        <Tile floorTile={floorTile} disabled={disabled} onClick={onClick} selected={selected}>
            {entity}
        </Tile>
    );
}

function Tile({ className = "", children, floorTile, disabled, onClick, selected } = {}) {
    if(floorTile) {
        className += ` board-space-floor-${floorTile.type}`;
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
