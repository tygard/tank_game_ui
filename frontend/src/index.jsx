import "./colors.css";
import {render} from "preact";
import {Board} from "./ui/game_state/board.jsx";

function App() {
    const entities = [
        { type: "tank", name: "Tank 1", position: { x: 0, y: 0 }, lives: 3, range: 2, gold: 5, actions: 1 },
        { type: "tank", name: "Tank 2", position: { x: 5, y: 5 }, lives: 1, range: 7, gold: 3, actions: 5 },
        { type: "wall", durability: 3, position: { x: 7, y: 8 } },
        { type: "wall", durability: 2, position: { x: 3, y: 5 } },
        { type: "wall", durability: 1, position: { x: 6, y: 2 } },
        { type: "wall", durability: 2, position: { x: 5, y: 3 } },
        { type: "wall", durability: 3, position: { x: 9, y: 3 } },
    ];

    const tiles = [
        { type: "gold-mine", spaces: [
            { x: 3, y: 4 },
            { x: 3, y: 3 },
            { x: 3, y: 2 },
            { x: 2, y: 4 },
            { x: 2, y: 1 },
            { x: 2, y: 2 },
        ]}
    ];

    return (
        <Board width={10} height={9} entities={entities} tiles={tiles}></Board>
    );
}

render(<App></App>, document.body);
