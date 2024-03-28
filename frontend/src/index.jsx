import "./colors.css";
import {render} from "preact";
import {GameBoard} from "./ui/game_state/board.jsx";
import {useState, useEffect, useCallback} from "preact/hooks";

function App() {
    const [header, setHeader] = useState();
    const [page, setPage] = useState();
    const [state, setState] = useState();

    useEffect(() => {
        const getState = () => {
            fetch("/api/state/header")
                .then(f => f.json())
                .then(data => {
                    setHeader(data);
                    if(!page) setPage(data.maxTurnId);
                });
        };

        const handle = setInterval(getState, 1000);
        return () => clearInterval(handle);
    }, [setHeader, setPage, page]);

    useEffect(() => {
        if(page > 0) {
            fetch(`/api/state/turn/${page}`)
                .then(f => f.json())
                .then(state => setState(state));
        }
    }, [setState, page]);

    if(!state) return <p>Loading...</p>;

    const today = state.gameState && state.gameState.day;

    const errorMessage = state.valid ? null : (
        <div>
            <pre style="color: red;">
                Error: {JSON.stringify(state.error, null, 4)}
            </pre>
        </div>
    );

    const nextTurn = useCallback(() => {
        setPage(Math.min(header.maxTurnId, page + 1))
    }, [setPage, header, page]);

    return (
        <>
            {errorMessage}
            <div>
                <button onClick={() => setPage(header.days[Math.max(1, today - 1)])}>&lt;&lt; Day</button>
                <button onClick={() => setPage(Math.max(page - 1, 0))}>&lt; Turn</button>
                <span>day: {state && today} turn: {page - header.days[today]} ({page})</span>
                <button onClick={nextTurn}>Turn &gt;</button>
                <button onClick={() => setPage(header.days[Math.min(header.maxDay, today + 1)])}>Day &gt;&gt;</button>
            </div>
            <GameBoard boardState={state && state.gameState && state.gameState.board}></GameBoard>
        </>
    );
}

render(<App></App>, document.body);
