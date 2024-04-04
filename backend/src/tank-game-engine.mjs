import { spawn } from "node:child_process";
import fs from "node:fs";
import { inspect } from "node:util";
import { getLogger } from "./logging.mjs"

const logger = getLogger(import.meta.url);

const TANK_GAME_TIMEOUT = 3000; // 3 seconds

const TANK_GAME_ENGINE_COMMAND = (function() {
    let jar = process.env.TANK_GAME_JAR_PATH;

    if(!jar) {
        const jars = fs.readdirSync(".").filter(file => file.endsWith(".jar"));
        if(jars.length != 1) {
            logger.error(`Expected exactly 1 tank game jar but found: ${jars}`);
            process.exit(1);
        }

        jar = jars[0];
    }

    // Make sure the path we're given is legit
    try {
        fs.accessSync(jar);
    }
    catch(err) {
        logger.error(`Failed to access tank game jar: ${err.message}`);
        process.exit(1);
    }

    return ["java", "-jar", jar];
})();

logger.info(`Tank game engine command: ${TANK_GAME_ENGINE_COMMAND.join(" ")}`);


function hackPossibleActions(response, user) {
    // No hack needed the engine returned a set of inputs
    if(response[0].name) {
        return response;
    }

    const possibleActions =  response.filter(action => action?.subject?.name == user);
    let actions = {};

    for(const action of possibleActions) {
        const actionType = action.rules;

        // Location is a location if it's a space but if its a player it's a target
        const targetKey = action.target?.name ? "target" : "location";

        let fields = actions[actionType];
        if(!fields) {
            actions[actionType] = fields = [];

            // Fill options
            if(action.target) {
                fields.push({
                    type: "select",
                    name: targetKey,
                    options: []
                });
            }

            if(actionType == "shoot") {
                fields.push({
                    type: "select",
                    name: "hit",
                    options: [
                        true,
                        false
                    ]
                });
            }

            if(actionType == "buy_action") {
                fields.push({
                    type: "select",
                    name: "quantity",
                    displayName: "Gold (cost)",
                    options: [
                        3,
                        5,
                        10,
                    ]
                });
            }

            if(actionType == "donate") {
                fields.push({
                    type: "input-number",
                    name: "quantity",
                    placeholder: "Gold",
                });
            }
        }

        let actionTargetTemplate = fields.find(option => option.name === targetKey);

        // Convert target to a string
        actionTargetTemplate.options.push(action.target.name || action.target.position);
    }

    return actions;
}

class TankGameEngine {
    constructor(command) {
        this._command = command;
    }

    _startTankGame() {
        if(this._proc) return;

        logger.debug("Starting tank game engine");

        const args = this._command.slice(1);
        this._proc = spawn(this._command[0], args);

        this._proc.stderr.on("data", buffer => {
            logger.info("Tank game engine stderr", {
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
            message: "Send data to tank game engine",
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
            let stdout = "";
            const stdoutHandler = buffer => {
                stdout += buffer.toString("utf-8")

                // The JSON data can be split into multiple chunks so everytime we get a new chunk
                // try parsing it until we can.
                try {
                    const data = JSON.parse(stdout);
                    this._proc.stdout.off("data", stdoutHandler);
                    logger.debug({
                        message: "Recieve data from tank game engine",
                        response_data: data,
                    });
                    clearTimeout(timeoutTimer);
                    resolve(data);
                }
                catch(err) {
                    logger.debug({
                        message: "Failed to parse json (waiting for more data)",
                        err,
                    });
                }
            };

            this._proc.stdout.on("data", stdoutHandler);

            let timeoutTimer = setTimeout(() => {
                if(this._proc) this._proc.kill();
                logger.error("Tank game engine took too long to respond with valid json", {
                    stdout,
                });
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

    async getPossibleActionsFor(user) {
        return hackPossibleActions(await this._runCommand("actions"), user);
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
