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

function buildBoard(width, height, entities, tiles) {
    let board = {
        entities: buildEmptyBoard(width, height),
        tiles: buildEmptyBoard(width, height),
    };

    for(const entity of entities) {
        if(entity.position) {
            board.entities[entity.position.y][entity.position.x] = entity;
        }
    }

    for(const tile of tiles) {
        for(const space of tile.spaces) {
            board.tiles[space.y][space.x] = tile;
        }
    }

    return board;
}

export function Board({ width, height, entities, tiles }) {
    // Track which tile entities we've rendered a label for so we only render them 1 time (max)
    let renderedAreaOfEffects = new Set();

    const boardState = buildBoard(width, height, entities, tiles)

    return (
        <div className="game-board">
            {boardState.entities.map((row, y) => (
                <div className="game-board-row">
                    {row.map((space, x) => {
                        return <Space space={space} tile={boardState.tiles[y][x]}
                            renderedAreaOfEffects={renderedAreaOfEffects}></Space>;
                    })}
                </div>
            ))}
        </div>
    )
}

function Space({ space, tile, renderedAreaOfEffects }) {
    const type = space && space.type;
    const tileType = tile && tile.type;
    let entity = null;

    // Try to place an entity in this space
    if(type == "tank") {
        entity = <Tank tank={space} tile={tile}></Tank>;
    }
    else if(type == "wall") {
        entity = <Wall wall={space} tile={tile}></Wall>;
    }
    // Try to place a tile in this space
    else if(tileType == "gold-mine" && !renderedAreaOfEffects.has(tile)) {
        renderedAreaOfEffects.add(tile);
        entity = <GoldMineLabel mine={tile}></GoldMineLabel>;
    }

    return (
        <Tile tile={tile}>
            {entity}
        </Tile>
    );
}

function Tile({ className = "", children, tile } = {}) {
    if(tile && tile.type == "gold-mine") {
        className += " board-space-gold-mine";
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