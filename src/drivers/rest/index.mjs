/* globals process */
import express from "express";
import { logger } from "#platform/logging.mjs"
import { makeHttpLogger } from "#platform/logging.mjs";
import { loadConfigAndGames } from "../config-loader.mjs";
import { defineRoutes } from "./routes.mjs";
import { createEngine } from "../java-engine/engine-interface.mjs";

// If build info is supplied print it
const buildInfo = process.env.BUILD_INFO;
if(buildInfo) logger.info(`Build info: ${buildInfo}`);

// Helper to make interacting with games easier for routes
function gameAccessor(gameManager, config) {
    return (req, res, next) => {
        function getGameIfAvailable() {
            const {loaded, error, sourceSet, interactor} = gameManager.getGame(req.params.gameName);

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

            return {valid: true, interactor, sourceSet};
        }

        req.games = {
            getGameIfAvailable,
            gameManager,
            config
        };

        next();
    };
}


(async () => {
    let { config, gameManager } = await loadConfigAndGames(createEngine, true /* save updated files */);
    const {port, disableHttpLogging} = config.getConfig().backend;

    const app = express();

    if(!disableHttpLogging) app.use(makeHttpLogger());

    app.use(express.json());
    app.use(gameAccessor(gameManager, config));

    defineRoutes(app, buildInfo);

    app.listen(port, () => {
        logger.info(`Listening on ${port}`);
    });
})();