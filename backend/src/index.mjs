import express from "express";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PORT = 3333;
const STATIC_DIR = "www";

const TANK_GAME_ENGINE_COMMAND = (function() {
    let jar = process.env.TANK_GAME_JAR_PATH;

    if(!jar) {
        const jars = fs.readdirSync(".").filter(file => file.endsWith(".jar"));
        if(jars.length != 1) {
            console.log(`Expected exactly 1 tank game jar but found: ${jars}`);
            process.exit(1);
        }

        jar = jars[0];
    }

    // Make sure the path we're given is legit
    try {
        fs.accessSync(jar);
    }
    catch(err) {
        console.log(`Failed to access tank game jar: ${err.message}`);
        process.exit(1);
    }

    return ["java", "-jar", jar];
})();


console.log(`Tank game engine command: ${TANK_GAME_ENGINE_COMMAND.join(" ")}`);

const app = express();

function executeGame() {
    return new Promise((resolve, reject) => {
        const proc = spawn(TANK_GAME_ENGINE_COMMAND[0], TANK_GAME_ENGINE_COMMAND.slice(1));
        let stdout = "";
        let stderr = "";

        proc.stdout.on("data", buffer => stdout += buffer.toString("utf-8"));
        proc.stderr.on("data", buffer => stderr += buffer.toString("utf-8"));

        proc.on("exit", status => {
            if(status != 0) {
                reject(new Error(`Failed to process tank game: ${stderr}`));
            }
            else {
                resolve(stdout);
            }
        });
    });
}

try {
    fs.accessSync(STATIC_DIR);
    app.use(express.static(STATIC_DIR));
    console.log(`Serving static files from: ${path.resolve(STATIC_DIR)}`);
}
catch(err) {}


app.get("/api/board-state", (req, res) => {
    executeGame().then(result => {
        res.writeHead(200, {
            "content-type": "application/json"
        });

        res.write(result);
        res.end();
    }).catch(error => {
        console.log(error.message);

        res.writeHead(500);
        res.write("Failed to execute game (check logs).");
        res.end();
    });
});

app.listen(PORT, () => {
    console.log(`Listening on ${PORT}`);
});