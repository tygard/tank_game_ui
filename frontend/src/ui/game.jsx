import { GameBoard } from "./game_state/board.jsx";
import { useCallback, useState } from "preact/hooks";
import { ServerError, useGameInfo } from "../api/fetcher.js";
import { LogEntrySelector } from "./game_state/log_entry_selector.jsx"
import { SubmitTurn } from "./game_state/submit_turn.jsx";
import { UserList } from "./game_state/user_list.jsx";
import { LogBook } from "./game_state/log_book.jsx";
import { useGameStateManager } from "../api/game-state-manager.js";
import { ErrorMessage } from "./error_message.jsx";


export function Game({ game, setGame, debug }) {
    // We want to be able to force refresh out game info after submitting an action
    // so we create this state that game info depends on so when change it game info
    // gets refreshed
    const [gameInfoTrigger, setGameInfoTrigger] = useState();
    const [gameInfo, error] = useGameInfo(game, gameInfoTrigger);
    const refreshGameInfo = useCallback(() => {
        setGameInfoTrigger(!gameInfoTrigger);
    }, [gameInfoTrigger, setGameInfoTrigger]);

    const gameStateManager = useGameStateManager(gameInfo?.logBook, game);

    // The backend is still loading the game
    if(error?.code == "game-loading") {
        return <p>Loading Game...</p>;
    }

    if(error || gameStateManager.error) {
        return <ErrorMessage error={error || gameStateManager.error}></ErrorMessage>
    }

    return (
        <>
            <LogEntrySelector
                debug={debug}
                logBook={gameInfo?.logBook}
                setGame={setGame}
                gameStateManager={gameStateManager}></LogEntrySelector>
            <div className="app-side-by-side centered">
                <div>
                    <LogBook logBook={gameInfo?.logBook} currentEntryId={gameStateManager.entryId} changeEntryId={gameStateManager.playerSetEntry}></LogBook>
                </div>
                <div className="app-side-by-side-main">
                    <GameBoard board={gameStateManager.gameState?.board}></GameBoard>
                </div>
                <div>
                    <p>Coffer: {gameStateManager.gameState?.council?.coffer}</p>
                    <UserList gameState={gameStateManager.gameState}></UserList>
                </div>
            </div>
            <div className="centered">
                <div>
                    <SubmitTurn
                        game={game}
                        isLastTurn={gameStateManager.isLatestEntry}
                        refreshGameInfo={refreshGameInfo}
                        debug={debug}
                        gameState={gameStateManager.gameState}
                        entryId={gameStateManager.entryId}></SubmitTurn>
                    {debug ? <div>
                        <details>
                            <summary>Current board state (JSON)</summary>
                            <pre>{gameStateManager?.gameState && JSON.stringify(gameStateManager?.gameState.serialize(), null, 4)}</pre>
                        </details>
                        <details>
                            <summary>Current logbook (JSON)</summary>
                            <pre>{gameInfo?.logBook && JSON.stringify(gameInfo?.logBook.serialize(), null, 4)}</pre>
                        </details>
                        <details>
                            <summary>Current config (JSON)</summary>
                            <pre>{gameInfo?.config && JSON.stringify(gameInfo?.config.serialize(), null, 4)}</pre>
                        </details>
                    </div> : undefined}
                </div>
            </div>
            <footer>
                <i>{APP_VERSION}</i>
            </footer>
        </>
    );
}