import { useMemo } from "preact/hooks";
import "./board.css";


function matchingAoeOrUndefined(space, typeToMatch) {
    return space && space.type == typeToMatch ? space : undefined;
}

function procesAOE(floorBoard) {
    let outFloorBoard = [];

    for(let y = 0; y < floorBoard.length; ++y) {
        // Add this row to the array
        outFloorBoard.push([]);

        for(let x = 0; x < floorBoard[y].length; ++x) {
            // Initilize this space with what ever the input had
            outFloorBoard[y].push(floorBoard[y][x])

            const areaOfEffectType = floorBoard[y][x].type;
            if(areaOfEffectType == "empty") continue;

            let upAreaOfEffect;
            let leftAreaOfEffect;

            // Check if there are any gold areas of effect to our left or above us
            if(x > 0) leftAreaOfEffect = matchingAoeOrUndefined(outFloorBoard[y][x - 1], areaOfEffectType);
            if(y > 0) upAreaOfEffect = matchingAoeOrUndefined(outFloorBoard[y - 1][x], areaOfEffectType);

            // If we have a area of effect above us and to our left but they are different areas of effect merge them
            if(upAreaOfEffect && leftAreaOfEffect && leftAreaOfEffect != upAreaOfEffect) {
                upAreaOfEffect.spaces = upAreaOfEffect.spaces.concat(leftAreaOfEffect.spaces);

                for(const space of leftAreaOfEffect.spaces) {
                    outFloorBoard[space.y][space.x] = upAreaOfEffect;
                }

                leftAreaOfEffect = undefined;
            }

            // If either area of effects exists add to that one
            let areaOfEffect = upAreaOfEffect || leftAreaOfEffect;

            if(!areaOfEffect) {
                // No area of effect next to us (yet) create a new one
                areaOfEffect = {
                    "type": areaOfEffectType,
                    "spaces": []
                };
            }

            areaOfEffect.spaces.push({ x, y });
            outFloorBoard[y][x] = areaOfEffect;
        }
    }

    return outFloorBoard;
}

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
        const floorBoard = useMemo(() => procesAOE(boardState.floor_board), [boardState.floor_board]);

        return (
            <GameBoardView width={width} entities={boardState.unit_board} areaOfEffects={floorBoard}></GameBoardView>
        );
    }
    catch(err) {
        return (
            <p>Failed to render board: {err.message}</p>
        );
    }
}

export function GameBoardView({ width, entities, areaOfEffects }) {
    // Track which areaOfEffect entities we've rendered a label for so we only render them 1 time (max)
    let renderedAreaOfEffects = new Set();

    let letters = [<Tile className="board-space-coordinate"></Tile>];
    const a = "A".charCodeAt(0);
    for(let x = 0; x < width; ++x) {
        const letter = String.fromCharCode(a + x);
        letters.push(<Tile className="board-space-coordinate">{letter}</Tile>);
    }

    return (
        <div className="game-board">
            <div className="game-board-row">
                {letters}
            </div>
            {entities.map((row, y) => (
                <div className="game-board-row">
                    <Tile className="board-space-coordinate">{y + 1}</Tile>
                    {row.map((space, x) => {
                        return <Space space={space} areaOfEffect={areaOfEffects[y][x]}
                            renderedAreaOfEffects={renderedAreaOfEffects}></Space>;
                    })}
                </div>
            ))}
        </div>
    )
}

function Space({ space, areaOfEffect, renderedAreaOfEffects, disabled }) {
    const type = space && space.type;
    const areaOfEffectType = areaOfEffect && areaOfEffect.type;
    let entity = null;

    // Try to place an entity in this space
    if(type == "tank") {
        entity = <Tank tank={space} areaOfEffect={areaOfEffect}></Tank>;
    }
    else if(type == "wall") {
        entity = <Wall wall={space} areaOfEffect={areaOfEffect}></Wall>;
    }
    // Try to place a areaOfEffect in this space
    else if(areaOfEffectType == "gold_mine" && !renderedAreaOfEffects.has(areaOfEffect)) {
        renderedAreaOfEffects.add(areaOfEffect);
        entity = <GoldMineLabel mine={areaOfEffect}></GoldMineLabel>;
    }

    return (
        <Tile areaOfEffect={areaOfEffect} disabled={disabled}>
            {entity}
        </Tile>
    );
}

function Tile({ className = "", children, areaOfEffect, disabled } = {}) {
    if(areaOfEffect && areaOfEffect.type == "gold_mine") {
        className += " board-space-gold-mine";
    }

    if(disabled) {
        className += " board-space-disabled";
    }

    return (
        <div className={`board-space board-space-centered ${className}`}>{children}</div>
    );
}

function Tank({ tank }) {
    return (
        <div className="board-space-entity">
            <div className="board-space-tank-title board-space-centered">
                <div className="board-space-tank-title-inner">{tank.name}</div>
            </div>
            <div className="board-space-tank-stats">
                <div className="board-space-tank-lives board-space-centered">{tank.health}</div>
                <div className="board-space-tank-range board-space-centered">{tank.range}</div>
                <div className="board-space-tank-gold board-space-centered">{tank.gold}</div>
                <div className="board-space-tank-actions board-space-centered">{tank.actions}</div>
            </div>
        </div>
    );
}

function Wall({ wall }) {
    return (
        <div className={`board-space-wall-${wall.health} board-space-entity board-space-centered`}>
            {wall.health}
        </div>
    );
}

function GoldMineLabel({ mine }) {
    return (
        <div className={`board-space-gold-mine-label board-space-entity board-space-centered`}>
            {mine.spaces.length}
        </div>
    );
}