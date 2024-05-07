import "./index.css";
import { render } from "preact";
import { useGame } from "./api/fetcher.js";
import { GameSelector } from "./ui/game_selector.jsx";
import { Game } from "./ui/game.jsx";
import { useDebugMode } from "./debug_mode.js";

function App() {
    const [game, setGame] = useGame();
    const debug = useDebugMode();

    if(game) {
        return <Game game={game} setGame={setGame} debug={debug}></Game>;
    }
    else {
        return <GameSelector setGame={setGame} debug={debug}></GameSelector>;
    }
}

render(<App></App>, document.body);
