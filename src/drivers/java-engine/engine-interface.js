/* globals process */
import { spawn } from "node:child_process";
import fs from "node:fs";
import { logger } from "#platform/logging.js";
import path from "node:path";
import { gameStateFromRawState, gameStateToRawState } from "./board-state.js";
import { JavaEngineSource } from "./possible-action-source.js";
import { PromiseLock } from "../../utils.js";

const TANK_GAME_TIMEOUT = 3; // seconds

const ENGINE_SEARCH_DIR = process.env.TANK_GAME_ENGINE_SEARCH_DIR || "engine";
const TANK_GAME_ENGINE_COMMAND = (function() {
    let command = process.env.TANK_GAME_ENGINE_COMMAND;

    if(!command) {
        const jars = fs.readdirSync(ENGINE_SEARCH_DIR).filter(file => file.endsWith(".jar"));
        if(jars.length != 1) {
            logger.warn(`Expected exactly 1 tank game jar but found: ${jars}`);
            return;
        }

        command = ["java", "-jar", path.join(ENGINE_SEARCH_DIR, jars[0])];
    }

    if(typeof command == "string") command = command.split(" ");

    return command;
})();

const COUNCIL_ACTIONS = ["bounty", "grant_life", "stimulus"];

function convertLogEntry(logEntry) {
    let subject = COUNCIL_ACTIONS.includes(logEntry.type) ? "Council" : logEntry.rawLogEntry.subject;

    return {
        ...logEntry.rawLogEntry,
        subject,
    };
}

// Put ids on the engines so we can differentiate them in logs
let uniqueIdCounter = 0;

class TankGameEngine {
    constructor(command, timeout) {
        if(!Array.isArray(command) || command.length <= 0) {
            throw new Error(`Expected an array in the form ["command", ...args] but got ${command}`);
        }

        this._id = `java-${++uniqueIdCounter}`;
        this._command = command;
        this._stdout = "";
        this._timeout = timeout;
        this._lock = new PromiseLock();
    }

    _startTankGame() {
        if(this._proc) return;

        logger.debug({
            msg: "Starting tank game engine",
            id: this._id,
            args: this._command,
        });

        const args = this._command.slice(1);
        this._proc = spawn(this._command[0], args);

        this._proc.stderr.on("data", buffer => {
            logger.info({
                msg: "Tank game engine stderr",
                output: buffer.toString("utf-8").split(/\r?\n\t?/),
                id: this._id,
            });
        });

        this._proc.on("exit", status => {
            const logLevel = status > 0 ? "warn" : "debug";
            logger[logLevel]({
                msg: `Tank game engine exited with ${status}`,
                id: this._id,
            });
            this._proc = undefined;
        });
    }

    _sendRequest(request_data) {
        this._startTankGame();

        logger.trace({
            request_data,
            msg: "Send data to tank game engine",
            id: this._id,
        });

        return new Promise((resolve, reject) => {
            this._proc.stdin.write(JSON.stringify(request_data) + "\n", "utf-8", err => {
                if(err) reject(err);
                else resolve();
            });
        });
    }

    _waitForData() {
        if(this._isWaitingForData) {
            throw new Error("Already waiting for data");
        }

        this._isWaitingForData = true;

        logger.trace({
            msg: "Waiting for response",
            id: this._id,
        });
        const promise = new Promise((resolve, reject) => {
            const stdoutHandler = buffer => {
                this._stdout += buffer.toString("utf-8")
                parseData();
            };

            const parseData = () => {
                const newLineIndex = this._stdout.indexOf("\n");
                if(newLineIndex === -1) {
                    return;
                }

                const unparsedData = this._stdout.slice(0, newLineIndex);

                // Parse the data
                try {
                    const data = JSON.parse(unparsedData);

                    // Remove the first msg
                    this._stdout = this._stdout.slice(newLineIndex + 1);

                    this._proc.stdout.off("data", stdoutHandler);

                    logger.trace({
                        msg: "Recieve data from tank game engine",
                        response_data: data,
                        id: this._id,
                    });

                    clearTimeout(timeoutTimer);

                    if(data.type == "response" && data.error) {
                        reject(new Error(`EngineError: ${data.response}`));
                        return;
                    }

                    resolve(data);
                }
                catch(err) {
                    logger.error({
                        msg: "Got bad data from tank game engine",
                        err,
                        unparsedData: unparsedData.split(/\r?\n\t?/),
                        id: this._id,
                    });

                    reject(err);
                }
            };

            this._proc.stdout.on("data", stdoutHandler);

            const timeoutMs = this._timeout * 1000; // ms to seconds

            let timeoutTimer = setTimeout(() => {
                if(this._proc) this._proc.kill();
                logger.error({
                    msg: "Tank game engine took too long to respond with valid json",
                    stdout: this._stdout.split(/\r?\n\t?/),
                    timeout: this._timeout,
                    id: this._id,
                });
                reject(new Error("Tank game engine took too long to respond with valid json"))
            }, timeoutMs);

            // Attempt to parse any data waiting in the buffer
            parseData();
        });

        promise.catch(() => {}).then(() => {
            this._isWaitingForData = false;
        });

        return promise;
    }

    _sendRequestAndWait(request_data) {
        return this._lock.use(() => {
            this._sendRequest(request_data);
            return this._waitForData();
        });
    }

    _runCommand(command, data) {
        if(!data) data = {};

        data["type"] = "command";
        data["command"] = command;

        return this._sendRequestAndWait(data);
    }

    // Helper functions
    async shutdown() {
        try {
            await this._sendRequestAndWait({
                "type": "command",
                "command": "exit",
            });

            logger.info({ msg: "Exited", id: this._id });
        }
        catch(err) {
            logger.warn({ msg: "Exit command failed", err, id: this._id });
            if(this._proc) {
                this._proc.kill();
            }
        }
    }

    getGameStateFromEngineState(state) {
        return gameStateFromRawState(state);
    }

    getEngineStateFromGameState(state, gameVersion) {
        return gameStateToRawState(state, gameVersion);
    }

    async getBoardState() {
        return await this._runCommand("display");
    }

    async getPossibleActions(player) {
        return (await this._sendRequestAndWait({
            type: "possible_actions",
            player,
        })).actions;
    }

    setBoardState(state) {
        return this._sendRequestAndWait({
            type: "state",
            ...state,
        });
    }

    async processAction(action) {
        await this._sendRequestAndWait({
            type: "action",
            ...convertLogEntry(action),
        });

        return this.getBoardState();
    }

    async setGameVersion(version) {
        // TODO: Update version names
        if(!isNaN(version)) version = `default-v${version}`;

        await this._sendRequestAndWait({
            type: "version",
            version,
        });
    }

    getEngineSpecificSource(opts) {
        return new JavaEngineSource(opts);
    }

    async getLineOfSightFor(player) {
        const actions = await this.getPossibleActions(player);
        const shootAction = actions.find(action => action.rule == "shoot");
        if(!shootAction) {
            throw new Error("Failed to find shoot action");
        }

        const targets = shootAction.fields.find(field => field.name == "target");
        if(!targets) {
            throw new Error("Shoot action is missing the target parameter");
        }

        return targets.range;
    }
}

export function createEngine(timeout = TANK_GAME_TIMEOUT) {
    return new TankGameEngine(TANK_GAME_ENGINE_COMMAND, timeout);
}

export function isEngineAvailable() {
    return TANK_GAME_ENGINE_COMMAND !== undefined;
}