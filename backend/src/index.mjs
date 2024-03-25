import express from "express";
import { spawn } from "node:child_process";

const PORT = 3333;
const ARGS = process.argv.slice(2);

const app = express();

app.get("/api/board-state", (req, res) => {
    const proc = spawn(ARGS[0], ARGS.slice(1));

    res.writeHead(200, {
        "content-type": "application/json"
    });

    proc.stdout.pipe(res);
});

app.listen(PORT, () => {
    console.log(`Listening on ${PORT}`);
});