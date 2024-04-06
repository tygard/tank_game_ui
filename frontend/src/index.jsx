import "./index.css";
import {render} from "preact";
import {GameBoard} from "./ui/game_state/board.jsx";
import {useCallback, useState} from "preact/hooks";
import { useGame, useGameInfo, useTurn } from "./api/game.js";
import { TurnSelector } from "./ui/game_state/turn_selector.jsx"
import { SubmitTurn } from "./ui/game_state/submit_turn.jsx";
import { UserList } from "./ui/game_state/user_list.jsx";
import { useMemo } from "preact/hooks";
import { buildUserList } from "./api/user_list";
import { GameSelector } from "./ui/game_selector.jsx";

function App() {
    const [game, setGame] = useGame();

    // We want to be able to force refresh out game info after submitting an action
    // so we create this state that game info depends on so when change it game info
    // gets refreshed
    const [gameInfoTrigger, setGameInfoTrigger] = useState();
    const [gameInfo, _] = useGameInfo(game, gameInfoTrigger);
    const refreshGameInfo = useCallback(() => {
        setGameInfoTrigger(!gameInfoTrigger);
    }, [gameInfoTrigger, setGameInfoTrigger]);

    const [turn, setTurn] = useState();
    const [isLastTurn, setIsLastTurn] = useState(false);
    const [state, __] = useTurn(game, turn);

    const users = useMemo(() => {
        return buildUserList(state);
    }, [state]);

    // No games currently selected show the options
    if(!game) {
        return (
            <GameSelector setGame={setGame}></GameSelector>
        );
    }

    const errorMessage = (!state || state.valid) ? null : (
        <div className="app-turn-invalid">
            {state.error}
        </div>
    );

    return (
        <>
            <TurnSelector
                setGame={setGame}
                gameInfo={gameInfo}
                turn={turn} setTurn={setTurn}
                isLastTurn={isLastTurn} setIsLastTurn={setIsLastTurn}></TurnSelector>
            <div className="app-side-by-side centered">
                <div className="app-side-by-side-main">
                    <GameBoard boardState={state?.gameState?.board}></GameBoard>
                </div>
                <div>
                    <UserList users={users}></UserList>
                </div>
            </div>
            <div className="centered">
                <div>
                    {errorMessage}
                    <SubmitTurn
                        isLastTurn={isLastTurn}
                        gameInfo={gameInfo}
                        users={users}
                        refreshGameInfo={refreshGameInfo}></SubmitTurn>
                </div>
            </div>
            <footer>
                <i>{APP_VERSION} - {gameInfo?.engine}</i>
            </footer>
        </>
    );
}

render(<App></App>, document.body);
