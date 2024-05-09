import express from "express";
import fs from "node:fs";
import path from "node:path";
import { logger } from "./logging.mjs";

const STATIC_DIR = "../www";

export function defineRoutes(app, buildInfo) {
    try {
        fs.accessSync(STATIC_DIR);
        app.use(express.static(STATIC_DIR));
        logger.info(`Serving static files from: ${path.resolve(STATIC_DIR)}`);
    }
    catch(err) {}

    app.get("/api/games", async (req, res) => {
        res.json(req.games.gameManager.getAllGames());
    });

    app.get("/api/game/:gameName/", (req, res) => {
        const {valid, interactor} = req.games.getGameIfAvailable();
        if(!valid) return;

        res.json({
            buildInfo,
            openHours: interactor.getOpenHours().serialize({ resolved: true }),
            logBook: interactor.getLogBook().serialize(),
            config: req.games.config.serialize(),
        });
    });

    app.get("/api/game/:gameName/turn/:turnId", (req, res) => {
        const {valid, interactor} = req.games.getGameIfAvailable();
        if(!valid) return;

        const state = interactor.getGameStateById(+req.params.turnId);
        res.json(state && state.serialize());
    });

    app.post("/api/game/:gameName/turn", async (req, res) => {
        const {valid, interactor} = req.games.getGameIfAvailable();
        if(!valid) return;

        const log = req.log || logger;

        try {
            await interactor.addLogBookEntry(req.body);
            log.info({ msg: "Added log book entry", entry: req.body });
            res.json({ success: true });
        }
        catch(err) {
            log.info({
                msg: "Rejected log book entry",
                entry: req.body,
                err
            });
            res.json({ success: false, error: err.message });
        }
    });

    app.get("/api/game/:gameName/possible-actions/:playerName/:lastTurnId", async (req, res) => {
        const {valid, interactor, sourceSet} = req.games.getGameIfAvailable();
        if(!valid) return;

        const logBook = interactor.getLogBook();
        const lastId = logBook.getLastEntryId();

        if((+req.params.lastTurnId) !== lastId) {
            res.json({
                error: `Invalid last turn (expected ${lastId} but got ${req.params.lastTurnId})`,
            });

            return;
        }

        const factories = await sourceSet.getActionFactoriesForPlayer({
            playerName: req.params.playerName,
            logBook,
            logEntry: logBook.getEntry(lastId),
            gameState: interactor.getGameStateById(lastId),
            interactor: interactor,
            config: req.games.config,
        });

        res.json(factories.serialize());
    });

    app.use(function(req, res) {
        res.sendFile(path.resolve(path.join(STATIC_DIR, "index.html")));
    });
}