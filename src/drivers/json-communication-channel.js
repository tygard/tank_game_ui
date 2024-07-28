import { spawn } from "node:child_process";
import { logger } from "#platform/logging.js";
import { PromiseLock } from "../utils.js";


export class JsonCommunicationChannel {
    constructor(command, timeout, id) {
        if(!Array.isArray(command) || command.length <= 0) {
            throw new Error(`Expected an array in the form ["command", ...args] but got ${command}`);
        }

        this._id = id;
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

    sendRequestAndWait(request_data) {
        return this._lock.use(() => {
            this._sendRequest(request_data);
            return this._waitForData();
        });
    }

    kill() {
        if(this._proc) {
            this._proc.kill();
        }
    }
}