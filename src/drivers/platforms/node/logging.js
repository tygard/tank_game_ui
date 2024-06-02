/* globals process */
import pino from "pino";
import pinoHttp from "pino-http";
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
        }

        // If we get any other error code than folder already exists throw it
        if(err.code != "EEXIST") throw err;
    }
}

export let logger;

export function configureLogging({ logFile, logLevel, overwrite } = {}) {
    if(logFile) {
        mkdirpSync(path.dirname(logFile));

        // Remove the old log file
        if(overwrite) {
            try {
                fs.unlinkSync(logFile);
            }
            catch(err){} // eslint-disable-line no-unused-vars, no-empty
        }
    }

    logger = pino(
        {
            level: logLevel || "info",
        },
        pinoPretty({
            colorize: !logFile,
            destination: logFile || 1 // 1 = stdout
        })
    );
}

export function makeHttpLogger() {
    return pinoHttp({
        logger,
        serializers: {
            req: (req) => ({
                id: req.id,
                method: req.method,
                url: req.url,
            }),

            res: (res) => ({
                statusCode: res.statusCode,
            }),
        },
    });
}

process.on('uncaughtException', function (err) {
    logger.error({
        msg: "Uncaught error",
        err
    });
});


configureLogging({
    logFile: process.env.LOG_FILE,
    logLevel: process.env.LOG_LEVEL,
});