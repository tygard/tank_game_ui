/* globals process */
import express from "express";
import { createGameManager } from "../game-file.js";
import { logger } from "#platform/logging.js"
import { makeHttpLogger } from "#platform/logging.js";
import { defineRoutes } from "./routes.js";
import { createEngine } from "../java-engine/engine-interface.js";

// If build info is supplied print it
const buildInfo = process.env.BUILD_INFO;

// Helper to make interacting with games easier for routes
function gameAccessor(gameManager) {
    return (req, res, next) => {
        function getGameIfAvailable() {
            const {loaded, error, interactor} = gameManager.getGame(req.params.gameName);

            if(error) {
                res.json({
                    error: `Failed to load game: ${error}`,
                });
                return {valid: false};
            }

            if(!loaded) {
                res.json({
                    error: {
                        message: "Game is still loading",
                        code: "game-loading",
                    }
                });
                return {valid: false};
            }

            return {valid: true, interactor};
        }

        req.games = {
            getGameIfAvailable,
            gameManager,
        };

        next();
    };
}

const port = 3333;

(async () => {
    let gameManager = await createGameManager(createEngine, true /* save updated files */);

    const app = express();

    app.use(makeHttpLogger());
    app.use(express.json());
    app.use(gameAccessor(gameManager));

    defineRoutes(app, buildInfo);

    app.listen(port, () => {
        logger.info(`Listening on ${port}`);
    });
})();