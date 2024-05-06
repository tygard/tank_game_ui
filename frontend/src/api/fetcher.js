import { useCallback, useEffect, useState } from "preact/hooks";
import { LogBook } from "../../../common/state/log-book/log-book.mjs";
import { Config } from "../../../common/state/config/config.mjs";
import { NamedFactorySet } from "../../../common/state/possible-actions/index.mjs";
import { OpenHours } from "../../../common/open-hours/index.mjs";

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
                if(options.shouldSendRequest && !options.shouldSendRequest(...args)) {
                    return;
                }

                if(options.resetBeforeFetch) {
                    setData(undefined);
                    setError(undefined);
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
    shouldSendRequest: game => game !== undefined,
    url: game => `/api/game/${game}/`,
    parse: data => {
        const config = Config.deserialize(data.config);

        return {
            openHours: OpenHours.deserialize(data.openHours),
            logBook: LogBook.deserialize(data.logBook, config),
            config,
        };
    },
    frequency: FETCH_FREQUENCY,
});

export const useGameState = makeReactDataFetchHelper({
    shouldSendRequest: (game, entryId) => game !== undefined && entryId !== undefined,
    url: (game, entryId) => `/api/game/${game}/turn/${entryId}`
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

    return result.turnId;
}