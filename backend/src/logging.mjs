import pino from "pino";
import pinoHttp from "pino-http";
import pinoPretty from "pino-pretty";
import fs from "node:fs";

// Remove the old log file
if(process.env.LOG_FILE) {
    try {
        fs.unlinkSync(process.env.LOG_FILE);
    }
    catch(err){}
}

export const logger = pino(
    {
        level: process.env.LOG_LEVEL || "info",
    },
    pinoPretty({
        colorize: !process.env.LOG_FILE,
        destination: process.env.LOG_FILE || 1 // 1 = stdout
    })
);

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