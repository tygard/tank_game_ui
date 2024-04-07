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
import { LogBook } from "./ui/game_state/log_book.jsx";
import { useTurnStateManager } from "./api/turn-state-manager.js";

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

    const turnStateManager = useTurnStateManager(gameInfo?.turnMap, game);

    const users = useMemo(() => {
        return buildUserList(turnStateManager.turnState);
    }, [turnStateManager.turnState]);

    // No games currently selected show the options
    if(!game) {
        return (
            <GameSelector setGame={setGame}></GameSelector>
        );
    }

    const errorMessage = (!turnStateManager.turnState || turnStateManager.turnState.valid) ? null : (
        <div className="app-turn-invalid">
            {turnStateManager.turnState.error}
        </div>
    );

    return (
        <>
            <TurnSelector
                setGame={setGame}
                gameInfo={gameInfo}
                turnStateManager={turnStateManager}></TurnSelector>
            <div className="app-side-by-side centered">
                <div>
                    <LogBook gameInfo={gameInfo} currentTurn={turnStateManager.turnId} changeTurn={turnStateManager.playerSetTurn}></LogBook>
                </div>
                <div className="app-side-by-side-main">
                    <GameBoard boardState={turnStateManager.turnState?.gameState?.board}></GameBoard>
                </div>
                <div>
                    <p>Coffer: {turnStateManager.turnState?.gameState?.council?.coffer || ""}</p>
                    <UserList users={users}></UserList>
                </div>
            </div>
            <div className="centered">
                <div>
                    {errorMessage}
                    <SubmitTurn
                        game={game}
                        boardState={turnStateManager.turnState?.gameState?.board}
                        isLastTurn={turnStateManager.isLastTurn}
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
