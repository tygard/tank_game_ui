import { spawn } from "node:child_process";
import fs from "node:fs";
import { inspect } from "node:util";

const TANK_GAME_TIMEOUT = 3000; // 3 seconds

const DEBUG = ["y", "yes"].includes((process.env.DEBUG || "").toLowerCase());

function debug(message) {
    if(DEBUG) console.log(`[DEBUG] ${message}`);
}


const TANK_GAME_ENGINE_COMMAND = (function() {
    let jar = process.env.TANK_GAME_JAR_PATH;

    if(!jar) {
        const jars = fs.readdirSync(".").filter(file => file.endsWith(".jar"));
        if(jars.length != 1) {
            debug(`Expected exactly 1 tank game jar but found: ${jars}`);
            process.exit(1);
        }

        jar = jars[0];
    }

    // Make sure the path we're given is legit
    try {
        fs.accessSync(jar);
    }
    catch(err) {
        console.log(`Failed to access tank game jar: ${err.message}`);
        process.exit(1);
    }

    return ["java", "-jar", jar];
})();

console.log(`Tank game engine command: ${TANK_GAME_ENGINE_COMMAND.join(" ")}`);

class TankGameEngine {
    constructor(command) {
        this._command = command;
    }

    _startTankGame() {
        if(this._proc) return;

        debug("Starting tank game engine");

        const args = this._command.slice(1);
        this._proc = spawn(this._command[0], args);

        let stderr = "";
        this._proc.stderr.on("data", buffer => stderr += buffer.toString("utf-8"));

        this._proc.on("exit", status => {
            console.log(`Tank game engine exited with ${status}`);
            if(stderr.length > 0) {
                console.log(`STDERR\n==============================\n${stderr}\n==============================`);
            }
            this._proc = undefined;
        });
    }

    _sendRequest(request_data) {
        this._startTankGame();

        debug(`Send ${inspect(request_data)}`);

        return new Promise((resolve, reject) => {
            this._proc.stdin.write(JSON.stringify(request_data) + "\n", "utf-8", err => {
                if(err) reject(err);
                else resolve();
            });
        });
    }

    _waitForData() {
        debug("Waiting for response");
        return new Promise((resolve, reject) => {
            let stdout = "";
            const stdoutHandler = buffer => {
                stdout += buffer.toString("utf-8")

                // The JSON data can be split into multiple chunks so everytime we get a new chunk
                // try parsing it until we can.
                try {
                    const data = JSON.parse(stdout);
                    this._proc.stdout.off("data", stdoutHandler);
                    debug(`Recieve ${inspect(data)}`);
                    clearTimeout(timeoutTimer);
                    resolve(data);
                }
                catch(err) {
                    debug(`Failed to parse json: ${err} (waiting for more data)`);
                }
            };

            this._proc.stdout.on("data", stdoutHandler);

            let timeoutTimer = setTimeout(() => {
                if(this._proc) this._proc.kill();
                console.log("Tank game engine took too long to respond with valid json");
                console.log(`STDOUT\n==============================\n${stdout}\n==============================`);
                reject(new Error("Tank game engine took too long to respond with valid json"))
            }, TANK_GAME_TIMEOUT);
        });
    }

    _sendRequestAndWait(request_data) {
        this._sendRequest(request_data);
        return this._waitForData();
    }

    _runCommand(command, data) {
        if(!data) data = {};

        data["type"] = "command";
        data["command"] = command;

        return this._sendRequestAndWait(data);
    }

    // Version 3 helper functions
    exit() {
        return this._sendRequest({
            "type": "command",
            "command": "exit",
        });
    }

    getPossibleActions() {
        return this._runCommand("actions");
    }

    getBoardState() {
        return this._runCommand("display");
    }

    setBoardState(state) {
        return this._sendRequest({
            type: "state",
            ...state,
        });
    }

    async processAction(action) {
        // NOTE: Action will either return an error or nothing
        await this._sendRequest({
            type: "action",
            ...action,
        });

        const gameState = await this._runCommand("display");

        if(gameState.error) {
            return {
                valid: false,
                error: gameState,
                // Since process action returns an error the response to
                // the display command is still comming
                gameState: await this._waitForData()
            }
        }
        else {
            return {
                valid: true,
                gameState
            };
        }
    }
}

export function getEngine() {
    return new TankGameEngine(TANK_GAME_ENGINE_COMMAND);
}
