import { useCallback } from "preact/hooks";
import { useGameList } from "../api/fetcher";
import { ErrorMessage } from "./error_message.jsx";
import { AppContent } from "./app-content.jsx";

export function GameSelector({ setGame, debug }) {
    const [games, error] = useGameList();

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

    const selectGame = useCallback((e, newGame) => {
        e.preventDefault();
        setGame(newGame);
    }, [setGame]);

    return (
        <AppContent debugMode={debug}>
            <h1>Games</h1>
            <ul>
                {games.map(game => {
                    return (
                        <li>
                            <a href="#" onClick={e => selectGame(e, game)}>{game}</a>
                        </li>
                    );
                })}
            </ul>
        </AppContent>
    );
}