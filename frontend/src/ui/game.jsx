import { GameBoard } from "./game_state/board.jsx";
import { useCallback, useState } from "preact/hooks";
import { useGameInfo } from "../api/game.js";
import { TurnSelector } from "./game_state/turn_selector.jsx"
import { SubmitTurn } from "./game_state/submit_turn.jsx";
import { UserList } from "./game_state/user_list.jsx";
import { useMemo } from "preact/hooks";
import { buildUserList } from "../api/user_list";
import { LogBook } from "./game_state/log_book.jsx";
import { useTurnStateManager } from "../api/turn-state-manager.js";


export function Game({ game, setGame, debug }) {
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

    const errorMessage = (!turnStateManager.turnState || turnStateManager.turnState.valid) ? null : (
        <div className="app-turn-invalid">
            {turnStateManager.turnState.error}
        </div>
    );

    return (
        <>
            <TurnSelector
                debug={debug}
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
                        refreshGameInfo={refreshGameInfo}
                        debug={debug}></SubmitTurn>
                    {debug ? <>
                        <details>
                            <summary>Users (JSON)</summary>
                            <pre>{JSON.stringify(users, null, 4)}</pre>
                        </details>
                        <details>
                            <summary>Current board state (JSON)</summary>
                            <pre>{JSON.stringify(turnStateManager?.turnState, null, 4)}</pre>
                        </details>
                    </> : undefined}
                </div>
            </div>
            <footer>
                <i>{APP_VERSION} - {gameInfo?.engine}</i>
            </footer>
        </>
    );
}