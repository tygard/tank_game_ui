import express from "express";
import fs from "node:fs";
import path from "node:path";
import {game} from "./game.mjs";

const PORT = 3333;
const STATIC_DIR = "www";

const app = express();

try {
    fs.accessSync(STATIC_DIR);
    app.use(express.static(STATIC_DIR));
    console.log(`Serving static files from: ${path.resolve(STATIC_DIR)}`);
}
catch(err) {}

app.get("/api/state/header", async (req, res) => {
    res.json({
        days: game.getDayMappings(),
        maxTurnId: game.getMaxTurnId(),
        maxDay: Object.keys(game.getDayMappings()).map(key => +key).reduce((a, b) => b > a ? b : a, 0),
    });
});

app.get("/api/state/turn/:turnId", async (req, res) => {
    res.json(game.getStateById(req.params.turnId));
});

app.listen(PORT, () => {
    console.log(`Listening on ${PORT}`);
});
