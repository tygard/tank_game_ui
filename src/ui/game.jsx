import { GameBoard } from "./game_state/board.jsx";
import { useCallback, useState } from "preact/hooks";
import { useGameInfo, useGameState } from "../drivers/rest/fetcher.js";
import { LogEntrySelector } from "./game_state/log_entry_selector.jsx"
import { SubmitTurn } from "./game_state/submit_turn.jsx";
import { Council } from "./game_state/council.jsx";
import { LogBook } from "./game_state/log_book.jsx";
import { ErrorMessage } from "./error_message.jsx";
import { OpenHours } from "./open-hours.jsx";
import { AppContent } from "./app-content.jsx";
import { GameManual } from "./game-manual.jsx";
import { goToEntryId, goToLatestTurn, useCurrentTurnManager } from "../interface-adapters/current-turn-manager.js";


export function Game({ game, setGame, debug }) {
    // We want to be able to force refresh out game info after submitting an action
    // so we create this state that game info depends on so when change it game info
    // gets refreshed
    const [gameInfoTrigger, setGameInfoTrigger] = useState();
    const [gameInfo, infoError] = useGameInfo(game, gameInfoTrigger);
    const refreshGameInfo = useCallback(() => {
        setGameInfoTrigger(!gameInfoTrigger);
    }, [gameInfoTrigger, setGameInfoTrigger]);

    const [currentTurnMgrState, distachLogEntryMgr] = useCurrentTurnManager(gameInfo?.logBook);
    const [gameState, stateError] = useGameState(game, currentTurnMgrState.entryId);
    const gameIsClosed = gameInfo?.openHours?.isGameOpen?.() === false /* Don't show anything if undefined */;

    const error = infoError || stateError;

    // The user that's currently submitting actions
    const [selectedUser, setSelectedUserDirect] = useState();
    const canSubmitAction = gameState?.running && !gameIsClosed;

    const setSelectedUser = user => {
        setSelectedUserDirect(user);
        distachLogEntryMgr(goToLatestTurn());
    };

    const backToGamesButton = <button onClick={() => setGame(undefined)}>Back to games</button>;

    // The backend is still loading the game
    if(error?.code == "game-loading") {
        return <AppContent>
            {backToGamesButton}
            <p>Loading Game...</p>
        </AppContent>;
    }

    if(error) {
        return <AppContent>
            {backToGamesButton}
            <ErrorMessage error={error}></ErrorMessage>
        </AppContent>;
    }

    const versionConfig = gameInfo?.config?.getGameVersion?.(gameInfo?.logBook?.gameVersion);

    let gameMessage;
    if(gameState?.winner !== undefined) {
        gameMessage = <div className="success message">{gameState?.winner} is victorious!</div>;
    }

    if(!gameMessage && gameIsClosed) {
        gameMessage =(
            <div className="warning message">
                You are currently outside of this game's scheduled hours.  Action submission is disabled.
            </div>
        );
    }

    const toolBar = (
        <LogEntrySelector
            extraButtonsLeft={backToGamesButton}
            debug={debug}
            logBook={gameInfo?.logBook}
            setGame={setGame}
            currentTurnMgrState={currentTurnMgrState}
            distachLogEntryMgr={distachLogEntryMgr}></LogEntrySelector>
    );

    return (
        <>
            <div className="app-sidebar">
                <LogBook
                    logBook={gameInfo?.logBook}
                    currentEntryId={currentTurnMgrState.entryId}
                    changeEntryId={entryId => distachLogEntryMgr(goToEntryId(entryId))}></LogBook>
            </div>
            <AppContent withSidebar debugMode={debug} toolbar={toolBar} buildInfo={gameInfo?.buildInfo}>
                <div className="app-side-by-side centered">
                    <div className="app-side-by-side-main">
                        {gameMessage !== undefined ? <div>{gameMessage}</div> : undefined}
                        <GameBoard
                            board={gameState?.board}
                            config={versionConfig}
                            canSubmitAction={canSubmitAction}
                            setSelectedUser={setSelectedUser}></GameBoard>
                    </div>
                    <div>
                        <Council
                            gameState={gameState}
                            config={versionConfig}
                            setSelectedUser={setSelectedUser}
                            canSubmitAction={canSubmitAction}></Council>
                        <OpenHours openHours={gameInfo?.openHours} debug={debug}></OpenHours>
                        <GameManual manualPath={versionConfig?.getManual?.()}></GameManual>
                    </div>
                </div>
                <div className="centered">
                    <div>
                        {gameIsClosed ? undefined : <SubmitTurn
                            game={game}
                            selectedUser={selectedUser}
                            setSelectedUser={setSelectedUser}
                            canSubmitAction={canSubmitAction}
                            refreshGameInfo={refreshGameInfo}
                            debug={debug}
                            entryId={currentTurnMgrState.entryId}
                            isLatestEntry={currentTurnMgrState.isLatestEntry}></SubmitTurn>}
                    </div>
                </div>
            </AppContent>
        </>
    );
}