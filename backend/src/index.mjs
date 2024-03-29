import express from "express";
import fs from "node:fs";
import path from "node:path";
import {getGame} from "./game.mjs";

const PORT = 3333;
const STATIC_DIR = "www";

const app = express();

app.use(express.json());

try {
    fs.accessSync(STATIC_DIR);
    app.use(express.static(STATIC_DIR));
    console.log(`Serving static files from: ${path.resolve(STATIC_DIR)}`);
}
catch(err) {}

async function checkGame(req, res) {
    const game = await getGame(req.params.gameName);

    if(!game) {
        console.log(`Could not find game ${req.params.gameName}`)
        res.json({
            error: "Game not found"
        });
    }

    return game;
}

app.get("/api/game/:gameName/header", async (req, res) => {
    const game = await checkGame(req, res);

    res.json({
        days: game.getDayMappings(),
        maxTurnId: game.getMaxTurnId(),
        maxDay: Object.keys(game.getDayMappings()).map(key => +key).reduce((a, b) => b > a ? b : a, 0),
    });
});

app.get("/api/game/:gameName/turn/:turnId", async (req, res) => {
    const game = await checkGame(req, res);
    res.json(game.getStateById(req.params.turnId));
});

app.post("/api/game/:gameName/turn", async (req, res) => {
    const game = await checkGame(req, res);

    await game.addLogBookEntry(req.body);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Listening on ${PORT}`);
});
