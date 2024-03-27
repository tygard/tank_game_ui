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

let idx = 0;
app.get("/api/board-state", async (req, res) => {
    console.log(`Using state ${idx}`);
    res.json(game._states[idx++]);

    if(idx == game._states) idx = 0;
});

app.listen(PORT, () => {
    console.log(`Listening on ${PORT}`);
});
