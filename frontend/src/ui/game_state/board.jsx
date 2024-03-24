import "./board.css";

function buildEmptyBoard(width, height) {
    let board = [];

    for(let y = 0; y < height; ++y) {
        board.push([]);

        for(let x = 0; x < width; ++x) {
            board[y].push({});
        }
    }

    return board;
}

function buildBoard(width, height, entities, areaOfEffects) {
    let board = {
        entities: buildEmptyBoard(width, height),
        areaOfEffects: buildEmptyBoard(width, height),
    };

    for(const entity of entities) {
        if(entity.position) {
            board.entities[entity.position.y][entity.position.x] = entity;
        }
    }

    for(const areaOfEffect of areaOfEffects) {
        for(const space of areaOfEffect.spaces) {
            board.areaOfEffects[space.y][space.x] = areaOfEffect;
        }
    }

    return board;
}

export function Board({ width, height, entities, areaOfEffects }) {
    // Track which areaOfEffect entities we've rendered a label for so we only render them 1 time (max)
    let renderedAreaOfEffects = new Set();

    const boardState = buildBoard(width, height, entities, areaOfEffects)

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
            {boardState.entities.map((row, y) => (
                <div className="game-board-row">
                    <Tile className="board-space-coordinate">{y + 1}</Tile>
                    {row.map((space, x) => {
                        const disabled = false;//!((3 <= x && x <= 5) && (3 <= y && y <= 5));

                        return <Space space={space} areaOfEffect={boardState.areaOfEffects[y][x]}
                            renderedAreaOfEffects={renderedAreaOfEffects} disabled={disabled}></Space>;
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
    else if(areaOfEffectType == "gold-mine" && !renderedAreaOfEffects.has(areaOfEffect)) {
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
    if(areaOfEffect && areaOfEffect.type == "gold-mine") {
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
            <div class="board-space-tank-title board-space-centered">
                {tank.name}
            </div>
            <div class="board-space-tank-stats">
                <div class="board-space-tank-lives board-space-centered">{tank.lives}</div>
                <div class="board-space-tank-range board-space-centered">{tank.range}</div>
                <div class="board-space-tank-gold board-space-centered">{tank.gold}</div>
                <div class="board-space-tank-actions board-space-centered">{tank.actions}</div>
            </div>
        </div>
    );
}

function Wall({ wall }) {
    return (
        <div className={`board-space-wall-${wall.durability} board-space-entity board-space-centered`}>
            {wall.durability}
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