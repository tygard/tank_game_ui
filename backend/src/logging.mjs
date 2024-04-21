import pino from "pino";
import pinoHttp from "pino-http";

export const logger = pino({
    level: process.env.LOG_LEVEL || "info"
});

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