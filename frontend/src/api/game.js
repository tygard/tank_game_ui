import { useCallback, useEffect, useState } from "preact/hooks";

const FETCH_FREQUENCY = 2; // seconds

class TurnMap {
    constructor(gameHeader) {
        this._gameHeader = gameHeader;
        const days = Object.keys(this._gameHeader.days);
        this._minDay = +days[0]
        this._maxDay = +days[days.length - 1];
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

function makeReactDataFetchHelper(options) {
    return (...args) => {
        const [data, setData] = useState();
        const [error, setError] = useState();

        const fetchData = useCallback(async () => {
            try {
                if(options.shouldSendRequest && !options.shouldSendRequest(...args)) {
                    return;
                }

                let url = options.url;
                if(typeof options.url === "function") {
                    url = options.url(...args);
                }

                const res = await fetch(url);
                let recievedData = await res.json();

                if(options.parse) {
                    recievedData = options.parse(recievedData);
                }

                setData(recievedData);
                setError(undefined);
            }
            catch(err) {
                setError(err);
                setData(undefined);
            }
        }, args.concat([setData, setError]));

        useEffect(() => {
            fetchData();

            if(options.frequency) {
                const handle = setInterval(fetchData, options.frequency * 1000 /* seconds to ms */);
                return () => clearInterval(handle);
            }
        }, [fetchData]);

        return [data, error];
    };
}

export const useGameInfo = makeReactDataFetchHelper({
    url: "/api/game/tank_game_v3/header",
    parse: data => ({
        ...data,
        turnMap: new TurnMap(data.turnMap),
    }),
    frequency: FETCH_FREQUENCY,
});

export const useTurn = makeReactDataFetchHelper({
    shouldSendRequest: turnId => turnId !== undefined,
    url: turnId => `/api/game/tank_game_v3/turn/${turnId}`
});

export const usePossibleActions = makeReactDataFetchHelper({
    shouldSendRequest: user => !!user,
    url: user => `/api/game/tank_game_v3/user/${user}/possible-actions`,
    frequency: FETCH_FREQUENCY,
});
