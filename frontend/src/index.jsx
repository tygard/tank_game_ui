import "./index.css";
import {render} from "preact";
import {GameBoard} from "./ui/game_state/board.jsx";
import {useState} from "preact/hooks";
import { useGameInfo, useTurn } from "./api/game.js";
import { TurnSelector } from "./ui/game_state/turn_selector.jsx"
import { SubmitTurn } from "./ui/game_state/submit_turn.jsx";

function App() {
    const [turn, setTurn] = useState();
    const [isLastTurn, setIsLastTurn] = useState(false);
    const [gameInfo, _] = useGameInfo();
    const [state, __] = useTurn(turn);

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
                gameInfo={gameInfo}
                turn={turn} setTurn={setTurn}
                isLastTurn={isLastTurn} setIsLastTurn={setIsLastTurn}></TurnSelector>
            <GameBoard boardState={state?.gameState?.board}></GameBoard>
            {errorMessage}
            <SubmitTurn gameInfo={gameInfo} possibleActions={state?.gameState?.possible_actions}></SubmitTurn>
            <footer>
                <i>{APP_VERSION}</i>
            </footer>
        </>
    );
}

render(<App></App>, document.body);
