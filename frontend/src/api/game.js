import { useEffect, useState } from "preact/hooks";

class TurnMap {
    constructor(gameHeader) {
        this._gameHeader = gameHeader;
        const days = Object.keys(this._gameHeader.days);
        this._minDay = +days[0]
        this._maxDay = +days[days.length - 1];
    }

    static async fetch() {
        const res = await fetch("/api/state/header");
        return new TurnMap(await res.json());
    }

    getFirstTurn() {
        return 0;
    }

    getLastTurn() {
        return this._gameHeader.maxTurnId;
    }

    findNextTurn(currentTurn) {
        return Math.min(currentTurn + 1, this.getLastTurn());
    }

    findPreviousTurn(currentTurn) {
        return Math.max(currentTurn - 1, this.getFirstTurn());
    }

    getMinDay() {
        return this._minDay;
    }

    getMaxDay() {
        return this._maxDay;
    }

    findDayForTurn(turn) {
        const day = Object.keys(this._gameHeader.days)
            .find(day => {
                day = +day;
                const minTurn = this._gameHeader.days[day];
                const maxTurn = this._gameHeader.days[day + 1] || Infinity;
                return minTurn <= turn && turn < maxTurn;
            });

        return day ? +day : 0;
    }

    findNextDay(turn) {
        const currentDay = this.findDayForTurn(turn);
        const newDay = Math.min(currentDay + 1, this.getMaxDay());
        return this._gameHeader.days[newDay];
    }

    findPreviousDay(turn) {
        const currentDay = this.findDayForTurn(turn);
        const newDay =  Math.max(currentDay - 1, this.getMinDay());
        return this._gameHeader.days[newDay];
    }

    getFirstTurnOfDay(day) {
        const turn = this._gameHeader.days[day];
        return turn || 0;
    }
}

export function useTurnMap() {
    const [turnMap, setTurnMap] = useState();

    useEffect(() => {
        TurnMap.fetch()
            .then(turnMap => setTurnMap(turnMap));
    }, [setTurnMap]);

    return turnMap;
}

export function useTurn(turnId) {
    const [turn, setTurn] = useState();

    useEffect(() => {
        if(turnId > 0) {
            fetch(`/api/state/turn/${turnId}`)
                .then(f => f.json())
                .then(state => setTurn(state));
        }
    }, [setTurn, turnId]);

    return turn;
}