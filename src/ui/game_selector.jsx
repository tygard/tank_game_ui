import "./game_selector.css";
import { useCallback } from "preact/hooks";
import { useGameList } from "../drivers/rest/fetcher.js";
import { ErrorMessage } from "./error_message.jsx";
import { AppContent } from "./app-content.jsx";

export function GameSelector({ navigate, debug }) {
    const [games, error] = useGameList();

    const selectGame = useCallback((e, newGame) => {
        e.preventDefault();
        navigate("play-game", { gameName: newGame });
    }, [navigate]);

    const toolbar = debug ? (<>
        <button onClick={() => navigate("backstage")}>Backstage</button>
    </>) : undefined;

    if(error) {
        return (
            <AppContent debugMode={debug} toolbar={toolbar}>
                <ErrorMessage error={error}></ErrorMessage>
            </AppContent>
        );
    }

    if(!games) {
        return (
            <AppContent debugMode={debug} toolbar={toolbar}>Loading...</AppContent>
        );
    }

    return (
        <AppContent debugMode={debug} toolbar={toolbar}>
            <h1>Games</h1>
            <div>
                {games.map(game => {
                    return (
                        <div key={game.name} className="selectable-game" onClick={e => selectGame(e, game.name)}>
                            <h2>{game.title}</h2>
                            <p>{game.statusText}</p>
                        </div>
                    );
                })}
            </div>
        </AppContent>
    );
}