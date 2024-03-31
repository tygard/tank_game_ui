import "./index.css";
import {render} from "preact";
import {GameBoard} from "./ui/game_state/board.jsx";
import {useState} from "preact/hooks";
import { useTurn } from "./api/game.js";
import { TurnSelector } from "./ui/game_state/turn_selector.jsx"

function App() {
    const [turn, setTurn] = useState();
    const [isLastTurn, setIsLastTurn] = useState(false);
    const state = useTurn(turn);

    const errorMessage = (!state || state.valid) ? null : (
        <div>
            <pre style="color: red;">
                Error: {JSON.stringify(state.error, null, 4)}
            </pre>
        </div>
    );

    return (
        <>
            <TurnSelector
                turn={turn} setTurn={setTurn}
                isLastTurn={isLastTurn} setIsLastTurn={setIsLastTurn}></TurnSelector>
            <GameBoard boardState={state && state.gameState && state.gameState.board}></GameBoard>
            {errorMessage}
            <footer>
                <i>{APP_VERSION}</i>
            </footer>
        </>
    );
}

render(<App></App>, document.body);
