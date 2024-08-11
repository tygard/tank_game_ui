/* globals process, console */
import pino from "pino";
import pinoPretty from "pino-pretty";
import fs from "node:fs";
import path from "node:path";

function mkdirpSync(folder) {
    try {
        fs.mkdirSync(folder);
    }
    catch(err) {
        if(err.code == "ENOENT") {
            mkdirpSync(path.dirname(folder));

            // Use regular mkdir to avoid infine loops if something else goes wrong
            fs.mkdirSync(folder);
            return;
        }

        // If we get any other error code than folder already exists throw it
        if(err.code != "EEXIST") throw err;
    }
}

export let logger;

export function configureLogging({ logFile, logLevel, overwrite, logToConsole = false } = {}) {
    logLevel || (logLevel = "info");
    let streams = [];

    if(logFile) {
        mkdirpSync(path.dirname(logFile));

        // Remove the old log file
        if(overwrite) {
            try {
                fs.unlinkSync(logFile);
            }
            catch(err){} // eslint-disable-line no-unused-vars, no-empty
        }

        streams.push({
            level: logLevel,
            stream: pinoPretty({
                colorize: false,
                destination: logFile,
            }),
        });
    }

    if(logToConsole) {
        streams.push({
            level: logLevel,
            stream: pinoPretty({
                colorize: process.stdout.isTTY,
                destination: 1, // stdout
            }),
        })
    }

    logger = pino(
        {
            level: logLevel,
        },
        pino.multistream(streams),
    );
}


process.on('uncaughtException', function (err) {
    if(logger) {
        logger.error({
            msg: "Uncaught error",
            err
        });
    }
    else {
        console.log(err);
    }
});


let logFile;
if(process.env.TANK_GAME_LOGS_FOLDER) {
    const today = new Date();
    logFile = path.join(process.env.TANK_GAME_LOGS_FOLDER, `tank-game-${today.getFullYear()}-${today.getMonth()}-${today.getDate()}.log`);
}

configureLogging({
    logToConsole: true,
    overwrite: false,
    logFile,
    logLevel: process.env.LOG_LEVEL,
});