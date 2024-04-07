import "./turn_selector.css";

export function TurnSelector({ turnStateManager, gameInfo, setGame, debug }) {
    const turnMap = gameInfo?.turnMap;

    if(!turnMap || turnStateManager.turnId === undefined) {
        return (
            <div className="turn-selector">
                Loading...
            </div>
        )
    }

    const today = turnMap.findDayForTurn(turnStateManager.turnId);

    let turnText = turnStateManager.turnId == turnMap.getFirstTurn() ?
        "Start of game" :
        `day: ${today} turn: ${(turnStateManager.turnId - turnMap.getFirstTurnOfDay(today)) + 1}`;

    if(debug) turnText += ` (turnId: ${turnStateManager?.turnId})`;

    const playerSetTurn = turnStateManager.playerSetTurn;

    return (
        <div className="turn-selector centered">
            <button onClick={() => setGame(undefined)}>Back to games</button>
            <button onClick={() => turnStateManager.togglePlayback()} disabled={turnStateManager.isLastTurn}>{turnStateManager.isPlayingBack ? "Pause playback" : "Playback turns"}</button>
            <button onClick={() => playerSetTurn(turnMap.findPreviousDay(turnStateManager.turnId))} disabled={today <= turnMap.getMinDay()}>&lt;&lt; Day</button>
            <button onClick={() => playerSetTurn(turnMap.findPreviousTurn(turnStateManager.turnId))} disabled={turnStateManager.turnId <= turnMap.getFirstTurn()}>&lt; Turn</button>
            <span className="turn-selector-turn-text">{turnText}</span>
            <button onClick={() => playerSetTurn(turnMap.findNextTurn(turnStateManager.turnId))} disabled={turnStateManager.isLastTurn}>Turn &gt;</button>
            <button onClick={() => playerSetTurn(turnMap.findNextDay(turnStateManager.turnId))} disabled={today >= turnMap.getMaxDay()}>Day &gt;&gt;</button>
            <button onClick={() => playerSetTurn(turnMap.getLastTurn())} disabled={turnStateManager.isLastTurn}>Latest Turn</button>
        </div>
    );
}