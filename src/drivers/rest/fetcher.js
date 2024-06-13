/* globals window, location, history, fetch */
import { useCallback, useEffect, useState } from "preact/hooks";
import { LogBook } from "../../game/state/log-book/log-book.js";
import { NamedFactorySet } from "../../game/possible-actions/index.js";
import { OpenHours } from "../../game/open-hours/index.js";
import { GameState } from "../../game/state/game-state.js";
import { LogEntry } from "../../game/state/log-book/entry.js";

const FETCH_FREQUENCY = 2; // seconds
const GAME_URL_EXPR = /^\/game\/([^/]+)$/g;

export class ServerError extends Error {
    constructor(error) {
        super(typeof error == "string" ? error : error.message);

        if(typeof error == "object") {
            this.code = error.code;
            this.rawError = error;
        }
    }
}

function makeReactDataFetchHelper(options) {
    return (...args) => {
        const [data, setData] = useState();
        const [error, setError] = useState();

        const fetchData = useCallback(async () => {
            try {
                if(options.resetBeforeFetch) {
                    setData(undefined);
                    setError(undefined);
                }

                if(options.shouldSendRequest && !options.shouldSendRequest(...args)) {
                    return;
                }

                let url = options.url;
                if(typeof options.url === "function") {
                    url = options.url(...args);
                }

                const res = await fetch(url);

                if(!res.ok) {
                    setData(undefined);
                    setError(new Error(`Failed to load data got ${res.statusText} (code: ${res.status})`));
                    return;
                }

                let recievedData = await res.json();

                if(recievedData.error) {
                    setData(undefined);
                    setError(new ServerError(recievedData.error));
                    return;
                }

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
        }, args.concat([setData, setError]));  // eslint-disable-line

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
        window.addEventListener("popstate", popStateHandler);

        return () => window.removeEventListener("popstate", popStateHandler);
    }, [popStateHandler]);

    return [game, setGameWrapper];
}

export const useGameList = makeReactDataFetchHelper({
    url: "/api/games",
    frequency: FETCH_FREQUENCY,
});

export const useGameInfo = makeReactDataFetchHelper({
    shouldSendRequest: game => game !== undefined,
    url: game => `/api/game/${game}/`,
    parse: data => {
        return {
            ...data,
            buildInfo: data.buildInfo,
            openHours: OpenHours.deserialize(data.openHours),
            logBook: LogBook.deserialize(data.logBook),
        };
    },
    frequency: FETCH_FREQUENCY,
});

export const useGameState = makeReactDataFetchHelper({
    shouldSendRequest: (game, entryId) => game !== undefined && entryId !== undefined,
    url: (game, entryId) => `/api/game/${game}/turn/${entryId}`,
    parse: rawGameState => GameState.deserialize(rawGameState),
});

export const usePossibleActionFactories = makeReactDataFetchHelper({
    resetBeforeFetch: true,
    shouldSendRequest: (game, user, entryId) => game !== undefined && user !== undefined && entryId !== undefined,
    url: (game, user, entryId) => `/api/game/${game}/possible-actions/${user}/${entryId}`,
    parse: rawActionFactories => NamedFactorySet.deserialize(rawActionFactories),
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

    if(!result.success) throw new Error(result.error);

    return LogEntry.deserialize(-1, -1, result.entry);
}