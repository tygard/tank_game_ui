import express from "express";
import fs from "node:fs";
import {getGame, getGameNames} from "./game.mjs";
import pinoHttp from "pino-http";
import { getLogger } from "./logging.mjs"
import { getEngineName } from "./tank-game-engine.mjs";
import path from "node:path";

const logger = getLogger(import.meta.url);

// If build info is supplied print it
const buildInfo = process.env.BUILD_INFO;
if(buildInfo) logger.info(`Build info: ${buildInfo}`);

const PORT = 3333;
const STATIC_DIR = "www";

const app = express();

app.use(pinoHttp({ logger }));

app.use(express.json());

try {
    fs.accessSync(STATIC_DIR);
    app.use(express.static(STATIC_DIR));
    logger.info(`Serving static files from: ${path.resolve(STATIC_DIR)}`);
}
catch(err) {}

async function checkGame(req, res) {
    const game = await getGame(req.params.gameName);

    if(!game) {
        logger.info(`Could not find game ${req.params.gameName}`)
        res.json({
            error: "Game not found"
        });
    }

    return game;
}


app.get("/api/games", async (req, res) => {
    res.json(await getGameNames());
});

app.get("/api/game/:gameName/header", async (req, res) => {
    const game = await checkGame(req, res);
    if(!game) return;

    res.json({
        turnMap: {
            days: game.getDayMappings(),
            maxTurnId: game.getMaxTurnId(),
            maxDay: Object.keys(game.getDayMappings()).map(key => +key).reduce((a, b) => b > a ? b : a, 0),
        },
        engine: getEngineName(),
    });
});

app.get("/api/game/:gameName/turn/:turnId", async (req, res) => {
    const game = await checkGame(req, res);
    if(!game) return;

    res.json(game.getStateById(req.params.turnId));
});

app.post("/api/game/:gameName/turn", async (req, res) => {
    const game = await checkGame(req, res);
    if(!game) return;

    const turnId = await game.addLogBookEntry(req.body);
    res.json({ success: true, turnId });
});

app.get("/api/game/:gameName/possible-actions", async (req, res) => {
    const game = await checkGame(req, res);
    if(!game) return;

    res.json(game.getPossibleActions());
});

app.use(function(req, res) {
    res.sendFile(path.resolve(path.join(STATIC_DIR, "index.html")));
});

app.listen(PORT, () => {
    logger.info(`Listening on ${PORT}`);
});
