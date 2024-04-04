import "./index.css";
import {render} from "preact";
import {GameBoard} from "./ui/game_state/board.jsx";
import {useCallback, useState} from "preact/hooks";
import { useGameInfo, useTurn } from "./api/game.js";
import { TurnSelector } from "./ui/game_state/turn_selector.jsx"
import { SubmitTurn } from "./ui/game_state/submit_turn.jsx";

function App() {
    // We want to be able to force refresh out game info after submitting an action
    // so we create this state that game info depends on so when change it game info
    // gets refreshed
    const [gameInfoTrigger, setGameInfoTrigger] = useState();
    const [gameInfo, _] = useGameInfo(gameInfoTrigger);
    const refreshGameInfo = useCallback(() => {
        setGameInfoTrigger(!gameInfoTrigger);
    }, [gameInfoTrigger, setGameInfoTrigger]);

    const [turn, setTurn] = useState();
    const [isLastTurn, setIsLastTurn] = useState(false);
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
            <p>Hello {gameInfo?.whoami}</p>
            <TurnSelector
                gameInfo={gameInfo}
                turn={turn} setTurn={setTurn}
                isLastTurn={isLastTurn} setIsLastTurn={setIsLastTurn}></TurnSelector>
            <GameBoard boardState={state?.gameState?.board}></GameBoard>
            {errorMessage}
            <SubmitTurn
                isLastTurn={isLastTurn}
                gameInfo={gameInfo}
                refreshGameInfo={refreshGameInfo}></SubmitTurn>
            <footer>
                <i>{APP_VERSION}</i>
            </footer>
        </>
    );
}

render(<App></App>, document.body);
