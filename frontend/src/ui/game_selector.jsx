import { useCallback } from "preact/hooks";
import { useGameList } from "../api/game";

export function GameSelector({ setGame }) {
    const [games, _] = useGameList();

    if(!games) {
        return (
            <div>Loading...</div>
        );
    }

    const selectGame = useCallback((e, newGame) => {
        e.preventDefault();
        setGame(newGame);
    }, [setGame]);

    return (
        <>
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
        </>
    );
}