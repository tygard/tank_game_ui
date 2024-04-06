import "./turn_selector.css";
import { useEffect, useState } from "preact/hooks";

const TURN_SWITCH_FREQENCY = 1000;

export function TurnSelector({ turn, setTurn, changeTurn, isLastTurn, setIsLastTurn, gameInfo, setGame, trackingLastTurn, setTrackingLastTurn }) {
    const turnMap = gameInfo?.turnMap;
    const [playback, setPlayback] = useState(false);

    // If turn hasn't been set jump to the last turn
    if(turnMap && turn === undefined) {
        changeTurn(turnMap.getLastTurn());
    }

    if(!turnMap || turn === undefined) {
        return (
            <div className="turn-selector">
                Loading...
            </div>
        )
    }

    useEffect(() => {
        // Not playing nothing to do
        if(!playback) return () => {};

        // Hit the end stop playing
        if(turn == turnMap.getLastTurn()) {
            setPlayback(false);
            return () => {};
        }

        const handle = setTimeout(() => {
            setTurn(turnMap.findNextTurn(turn));
        }, TURN_SWITCH_FREQENCY);

        return () => clearTimeout(handle);
    }, [turnMap, turn, setTurn, playback]);

    const today = turnMap.findDayForTurn(turn);

    const turnText = turn == turnMap.getFirstTurn() ?
        "Start of game" :
        `day: ${today} turn: ${(turn - turnMap.getFirstTurnOfDay(today)) + 1}`;

    // If the user changes the turn stop playback
    const userSetTurn = newTurn => {
        changeTurn(newTurn);
        setPlayback(false);
    };

    // If we're following the last turn and a new turn gets added stay on that one
    useEffect(() => {
        if(trackingLastTurn) {
            setTurn(turnMap.getLastTurn());
        }
    }, [turnMap, trackingLastTurn, setTurn]);

    const currentIsLastTurn = turn >= turnMap.getLastTurn();
    if(currentIsLastTurn != isLastTurn) {
        setIsLastTurn(currentIsLastTurn);
    }

    return (
        <div className="turn-selector centered">
            <button onClick={() => setGame(undefined)}>Back to games</button>
            <button onClick={() => setPlayback(!playback)} disabled={isLastTurn}>{playback ? "Pause playback" : "Playback turns"}</button>
            <button onClick={() => userSetTurn(turnMap.findPreviousDay(turn))} disabled={today <= turnMap.getMinDay()}>&lt;&lt; Day</button>
            <button onClick={() => userSetTurn(turnMap.findPreviousTurn(turn))} disabled={turn <= turnMap.getFirstTurn()}>&lt; Turn</button>
            <span className="turn-selector-turn-text">{turnText}</span>
            <button onClick={() => userSetTurn(turnMap.findNextTurn(turn))} disabled={isLastTurn}>Turn &gt;</button>
            <button onClick={() => userSetTurn(turnMap.findNextDay(turn))} disabled={today >= turnMap.getMaxDay()}>Day &gt;&gt;</button>
            <button onClick={() => userSetTurn(turnMap.getLastTurn())} disabled={isLastTurn}>Latest Turn</button>
        </div>
    );
}