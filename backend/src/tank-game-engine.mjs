import { spawn } from "node:child_process";
import fs from "node:fs";
import { getLogger } from "./logging.mjs"
import path from "node:path";

const logger = getLogger(import.meta.url);

const TANK_GAME_TIMEOUT = 3000; // 3 seconds

const TANK_GAME_ENGINE_COMMAND = (function() {
    let command = process.env.TANK_GAME_ENGINE_COMMAND;

    if(!command) {
        const jars = fs.readdirSync("engine").filter(file => file.endsWith(".jar"));
        if(jars.length != 1) {
            logger.error(`Expected exactly 1 tank game jar but found: ${jars}`);
            process.exit(1);
        }

        command = ["java", "-jar", path.join("engine", jars[0])];
    }

    if(typeof command == "string") command = command.split(" ");

    return command;
})();

logger.info(`Tank game engine command: ${TANK_GAME_ENGINE_COMMAND.join(" ")}`);

export function getEngineName() {
    return path.basename(TANK_GAME_ENGINE_COMMAND[TANK_GAME_ENGINE_COMMAND.length - 1]);
}

class TankGameEngine {
    constructor(command) {
        this._command = command;
        this._stdout = "";
    }

    _startTankGame() {
        if(this._proc) return;

        logger.debug("Starting tank game engine");

        const args = this._command.slice(1);
        this._proc = spawn(this._command[0], args);

        this._proc.stderr.on("data", buffer => {
            logger.info({
                msg: "Tank game engine stderr",
                output: buffer.toString("utf-8"),
            });
        });

        this._proc.on("exit", status => {
            const logLevel = status > 0 ? "warning" : "debug";
            logger[logLevel](`Tank game engine exited with ${status}`);
            this._proc = undefined;
        });
    }

    _sendRequest(request_data) {
        this._startTankGame();

        logger.debug({
            request_data,
            msg: "Send data to tank game engine",
        });

        return new Promise((resolve, reject) => {
            this._proc.stdin.write(JSON.stringify(request_data) + "\n", "utf-8", err => {
                if(err) reject(err);
                else resolve();
            });
        });
    }

    _waitForData() {
        logger.debug("Waiting for response");
        return new Promise((resolve, reject) => {
            const stdoutHandler = buffer => {
                this._stdout += buffer.toString("utf-8")
                parseData();
            };

            const parseData = () => {
                const newLineIndex = this._stdout.indexOf("\n");
                if(newLineIndex === -1) {
                    return;
                }

                // Parse the data
                const data = JSON.parse(this._stdout.slice(0, newLineIndex));

                // Remove the first msg
                this._stdout = this._stdout.slice(newLineIndex + 1);

                this._proc.stdout.off("data", stdoutHandler);

                logger.debug({
                    msg: "Recieve data from tank game engine",
                    response_data: data,
                });

                clearTimeout(timeoutTimer);

                if(data.type == "response" && data.error) {
                    reject(new Error(`EngineError: ${data.response}`));;
                    return;
                }

                resolve(data);
            };

            this._proc.stdout.on("data", stdoutHandler);

            let timeoutTimer = setTimeout(() => {
                if(this._proc) this._proc.kill();
                logger.error({
                    msg: "Tank game engine took too long to respond with valid json",
                    stdout: this._stdout,
                });
                reject(new Error("Tank game engine took too long to respond with valid json"))
            }, TANK_GAME_TIMEOUT);

            // Attempt to parse any data waiting in the buffer
            parseData();
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
        return this._sendRequestAndWait({
            "type": "command",
            "command": "exit",
        });
    }

    getBoardState() {
        return this._runCommand("display");
    }

    async getActionTemplate() {
        return (await this._runCommand("rules")).rules;
    }

    setBoardState(state) {
        return this._sendRequestAndWait({
            type: "state",
            ...state,
        });
    }

    async processAction(action) {
        let result = {
            valid: true,
        };

        try {
            await this._sendRequestAndWait({
                type: "action",
                ...action,
            });
        }
        catch(err) {
            result.valid = false;
            result.error = err.message;
            logger.info({ msg: "Got error", result });
        }

        result.gameState = await this._runCommand("display");
        return result;
    }
}

export function getEngine() {
    return new TankGameEngine(TANK_GAME_ENGINE_COMMAND);
}
