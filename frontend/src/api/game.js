import { useCallback, useEffect, useState } from "preact/hooks";

const FETCH_FREQUENCY = 2; // seconds
const GAME_URL_EXPR = /^\/game\/([^/]+)$/g;

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

function getGameFromUrl() {
    const match = GAME_URL_EXPR.exec(location.pathname);
    return match && match[1];
}

export function useGame() {
    const [game, setGame] = useState(getGameFromUrl());

    const setGameWrapper = useCallback(newGame => {
        setGame(newGame);

        const newUrl = newGame === undefined ? "/" : `/game/${newGame}`;
        history.pushState(undefined, undefined, newUrl);
    }, [setGame]);

    const popStateHandler = useCallback(() => {
        setGame(getGameFromUrl());
    }, [setGame]);

    useEffect(() => {
        addEventListener("popstate", popStateHandler);

        return () => removeEventListener("popstate", popStateHandler);
    }, [popStateHandler]);

    return [game, setGameWrapper];
}

export const useGameList = makeReactDataFetchHelper({
    url: "/api/games",
});

export const useGameInfo = makeReactDataFetchHelper({
    shouldSendRequest: game => !!game,
    url: game => `/api/game/${game}/header`,
    parse: data => ({
        ...data,
        turnMap: new TurnMap(data.turnMap),
    }),
    frequency: FETCH_FREQUENCY,
});

export const useTurn = makeReactDataFetchHelper({
    shouldSendRequest: (game, turnId) => game && turnId !== undefined,
    url: (game, turnId) => `/api/game/${game}/turn/${turnId}`
});

export const usePossibleActions = makeReactDataFetchHelper({
    shouldSendRequest: game => !!game,
    url: game => `/api/game/${game}/possible-actions`,
});

export async function submitTurn(game, logbookEntry) {
    const res = await fetch(`/api/game/${game}/turn`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(logbookEntry),
    });

    const result = await res.json();

    if(!result.success) throw new Error("Failed to submit turn");

    return result.turnId;
}