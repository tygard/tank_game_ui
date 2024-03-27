import "./colors.css";
import {render} from "preact";
import {GameBoard} from "./ui/game_state/board.jsx";
import {useState, useEffect} from "preact/hooks";

function App() {
    const [data, setData] = useState();

    useEffect(() => {
        const getState = () => {
            fetch("/api/board-state")
                .then(f => f.json())
                .then(data => setData(data));
        };

        const handle = setInterval(getState, 250);
        return () => clearInterval(handle);
    }, [setData]);

    return (
        <>
            <div>day: {data && data.day}</div>
            <GameBoard boardState={data && data.board}></GameBoard>
        </>
    );
}

render(<App></App>, document.body);
