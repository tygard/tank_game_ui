import "./board.css";
import { targetSelectionState } from "../space-selecting-state";
import { Position } from "../../game/state/board/position.mjs";
import { EntityTile } from "./entity-tile.jsx";
import { useRef, useState } from "preact/hooks";
import { Popup } from "../generic/popup.jsx";
import { prettyifyName } from "../../utils.mjs";


export function GameBoard({ board, config, setSelectedUser, canSubmitAction, emptyMessage = "No board data supplied" }) {
    if(!board) return <p>{emptyMessage}</p>;

    try {
        return (
            <GameBoardView width={board.width} board={board} config={config} canSubmitAction={canSubmitAction} setSelectedUser={setSelectedUser}></GameBoardView>
        );
    }
    catch(err) {
        return (
            <p>Failed to render board: {err.message}</p>
        );
    }
}

export function GameBoardView({ board, config, setSelectedUser, canSubmitAction }) {
    const possibleTargets = targetSelectionState.usePossibleTargets();
    let selectedTarget = targetSelectionState.useSelectedTarget();
    selectedTarget = selectedTarget && Position.fromHumanReadable(selectedTarget);

    let letters = [<Tile key="empty-coord" className="board-space-coordinate"></Tile>];
    for(let x = 0; x < board.width; ++x) {
        const letter = new Position(x, 0).humanReadableX;
        letters.push(<Tile key={`coord-x-${x}`} className="board-space-coordinate">{letter}</Tile>);
    }

    let renderedBoard = [<div key="coords-row" className="game-board-row">{letters}</div>];

    for(let y = 0; y < board.width; ++y) {
        let renderedRow = [<Tile key={`coord-y-${y}`} className="board-space-coordinate">{y + 1}</Tile>];

        for(let x = 0; x < board.height; ++x) {
            const position = new Position(x, y);
            const disabled = possibleTargets && !possibleTargets.has(position.humanReadable);

            const onClick = possibleTargets && !disabled ? () => {
                targetSelectionState.setSelectedTarget(position.humanReadable);
            } : undefined;

            renderedRow.push(
                <Space
                    entity={board.getEntityAt(position)}
                    floorTile={board.getFloorTileAt(position)}
                    onClick={onClick}
                    disabled={disabled}
                    selected={selectedTarget && selectedTarget.x == x && selectedTarget.y == y}
                    config={config}
                    canSubmitAction={canSubmitAction}
                    setSelectedUser={setSelectedUser}></Space>
            );
        }

        renderedBoard.push(<div className="game-board-row">{renderedRow}</div>);
    }

    return (
        <div className="game-board">{renderedBoard}</div>
    )
}

function Space({ entity, floorTile, disabled, onClick, selected, config, setSelectedUser, canSubmitAction }) {
    let tile = null;

    // Try to place an entity in this space
    if(entity && entity.type != "empty") {
        tile = <EntityTile
            entity={entity}
            showPopupOnClick={!(onClick || disabled)}
            config={config}
            canSubmitAction={canSubmitAction}
            setSelectedUser={setSelectedUser}></EntityTile>;
    }

    return (
        <Tile floorTile={floorTile} disabled={disabled} onClick={onClick} selected={selected} config={config}>
            {tile}
        </Tile>
    );
}

function Tile({ className = "", children, floorTile, disabled, onClick, selected, config } = {}) {
    const [popupOpen, setPopupOpen] = useState(false);
    const anchorRef = useRef();

    if(onClick) {
        className += " board-space-selectable";
    }

    let style = {};
    if(floorTile) {
        if(config) {
            const spec = config.getFloorTileDescriptor(floorTile.type);
            if(spec) style.background = spec.color;
        }

        if(!onClick && !disabled && floorTile.type !== "empty" && children === null) {
            onClick = () => setPopupOpen(popupOpen => !popupOpen);
        }
        else if(popupOpen) {
            // We're doing something else with this space hide the popup
            setPopupOpen(false);
        }
    }

    if(disabled) {
        className += " board-space-disabled";
    }

    if(selected) {
        className += " board-space-selected";
    }

    return (
        <>
            <div
                className={`board-space board-space-centered ${className}`}
                onClick={onClick}
                style={style}
                ref={anchorRef}>
                    {children}
            </div>
            <Popup opened={popupOpen} anchorRef={anchorRef} onClose={() => setPopupOpen(false)}>
                <h2>{prettyifyName(floorTile?.type)}</h2>
            </Popup>
        </>
    );
}
