import fs from "node:fs";
import {getEngine} from "./tank-game-engine.mjs";


function readJson(path) {
    return JSON.parse(fs.readFileSync(path, "utf-8"));
}

class Game {
    constructor() {
        this._states = [];
        this._dayMap = {};
    }

    async loadFromFiles(statePath, movesPath) {
        const engine = getEngine();

        await engine.setBoardState(readJson(statePath));
        this._states.push({
            valid: true,
            gameState: await engine.getBoardState()
        });

        const moves = readJson(movesPath);

        for(const turn of moves) {
            process.stdout.write(`\rLoading... ${((this._states.length / moves.length) * 100) |0}%`);
            const state = await engine.processAction(turn);
            this._states.push(state);
        }

        process.stdout.write("\n");

        this._buildDayMap();

        console.log(`Loaded ${this._states.length - 1} turns`);

        engine.exit(); // Don't wait for the engine to exit
    }

    _buildDayMap() {
        this._dayMap = {};
        let day = 0;
        this._states.forEach((state, idx) => {
            if(!state.gameState) {
                console.log(state);
                return;
            }

            state = state.gameState;

            if(day != state.day && state.day) this._dayMap[state.day] = idx;
            day = state.day;
        });
    }

    getStateById(id) {
        return this._states[id];
    }

    getDayMappings() {
        return this._dayMap;
    }

    getMaxTurnId() {
        return this._states.length - 1;
    }
}

export let game = new Game();
game.loadFromFiles("../example/initial.json", "../example/moves.json");
