import { useCallback } from "preact/hooks";
import { useGameList } from "../drivers/rest/fetcher.js";
import { ErrorMessage } from "./error_message.jsx";
import { AppContent } from "./app-content.jsx";

export function GameSelector({ setGame, debug }) {
    const [games, error] = useGameList();

    const selectGame = useCallback((e, newGame) => {
        e.preventDefault();
        setGame(newGame);
    }, [setGame]);

    if(error) {
        return (
            <AppContent debugMode={debug}>
                <ErrorMessage error={error}></ErrorMessage>
            </AppContent>
        );
    }

    if(!games) {
        return (
            <AppContent debugMode={debug}>Loading...</AppContent>
        );
    }

    return (
        <AppContent debugMode={debug}>
            <h1>Games</h1>
            <ul>
                {games.map(game => {
                    return (
                        <li key={game}>
                            <a href="#" onClick={e => selectGame(e, game)}>{game}</a>
                        </li>
                    );
                })}
            </ul>
        </AppContent>
    );
}