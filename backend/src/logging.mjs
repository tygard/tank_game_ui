import pino from "pino";
import path from "node:path";

const logger = pino({
    level: "debug",
});

export function getLogger(url) {
    const module = path.parse(url).name;
    return logger.child({ module });
}

process.on('uncaughtException', function (err) {
    logger.error({
        message: "Uncaught error",
        err
    });
});