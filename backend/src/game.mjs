import fs from "node:fs";
import {getEngine} from "./tank-game-engine.mjs";


function readJson(path) {
    return JSON.parse(fs.readFileSync(path, "utf-8"));
}


class Game {
    constructor() {
        this._states = [];
    }

    async loadFromFile(statePath, movesPath) {
        const engine = getEngine();

        await engine.setBoardState(readJson(statePath));
        this._states.push(await engine.getBoardState());

        for(const turn of readJson(movesPath)) {
            engine.processAction(turn);
            this._states.push(await engine.getBoardState());
        }

        console.log(`Loaded ${this._states.length - 1} turns`);

        engine.exit(); // Don't wait for the engine to exit
    }
}

export let game = new Game();
game.loadFromFile("example/initial.json", "example/moves.json")
    .catch(() => {}); // Currently the load fails due to an invalid mode.  Eat the error.
