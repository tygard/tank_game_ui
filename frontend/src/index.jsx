import "./colors.css";
import {render} from "preact";
import {GameBoard} from "./ui/game_state/board.jsx";
import {useState, useEffect} from "preact/hooks";

function App() {
    const [data, setData] = useState();

    useEffect(() => {
        fetch("/api/board-state")
            .then(f => f.json())
            .then(data => setData(data));
    }, [setData]);

    return (
        <GameBoard boardState={data && data.board}></GameBoard>
    );
}

render(<App></App>, document.body);
