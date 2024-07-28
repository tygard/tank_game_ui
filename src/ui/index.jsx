/* global document */
import "./index.css";
import { render } from "preact";
import { GameSelector } from "./game_selector.jsx";
import { Game } from "./game.jsx";
import { useDebugMode } from "./debug_mode.jsx";
import { useRouter } from "./urls.js";
import { Backstage } from "./backstage.jsx";

const ROUTES = [
    { name: "home", matcher: /^\/$/g, matchNames: [], makeUrl: () => "/" },
    { name: "play-game", matcher: /^\/game\/([^/]+)$/g, matchNames: ["gameName"], makeUrl: ({gameName}) => `/game/${gameName}` },
    { name: "backstage", matcher: /^\/backstage\/$/g, matches: [], makeUrl: () => "/backstage/" },
];

function App() {
    const [currentPage, navigate] = useRouter(ROUTES);
    const debug = useDebugMode();

    if(currentPage?.name == "play-game") {
        return <Game game={currentPage.params.gameName} navigate={navigate} debug={debug}></Game>;
    }
    else if(currentPage?.name == "home") {
        return <GameSelector navigate={navigate} debug={debug}></GameSelector>;
    }
    else if(currentPage?.name == "backstage") {
        return <Backstage debug={debug}></Backstage>
    }
    else {
        return <p>404 page not found. <a href="/">Go Home</a></p>;
    }
}

render(<App></App>, document.body);
