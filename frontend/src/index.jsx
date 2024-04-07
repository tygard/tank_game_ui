import "./index.css";
import { render } from "preact";
import { useGame } from "./api/game.js";
import { GameSelector } from "./ui/game_selector.jsx";
import { Game } from "./ui/game.jsx";
import { useDebugMode } from "./debug_mode.js";

function App() {
    const [game, setGame] = useGame();
    const [debug, debugModeMessage] = useDebugMode();

    let content;

    if(game) {
        content = <Game game={game} setGame={setGame} debug={debug}></Game>;
    }
    else {
        content = <GameSelector setGame={setGame}></GameSelector>;
    }

    return (
        <>
            {debugModeMessage}
            {content}
        </>
    );
}

console.log("You can toggle debug mode by running: toggleTankGameDebug()");

render(<App></App>, document.body);
