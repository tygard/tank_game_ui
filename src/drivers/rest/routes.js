import express from "express";
import fs from "node:fs";
import path from "node:path";
import { logger } from "#platform/logging.js";

const STATIC_DIR = "www";

export function defineRoutes(app, buildInfo) {
    try {
        fs.accessSync(STATIC_DIR);
        app.use(express.static(STATIC_DIR));
        logger.info(`Serving static files from: ${path.resolve(STATIC_DIR)}`);
    }
    catch(err) {} // eslint-disable-line no-unused-vars, no-empty

    app.get("/api/games", async (req, res) => {
        res.json(req.games.gameManager.getAllGames().map(game => ({
            title: game.title,
            name: game.name,
            state: game.getState(),
            statusText: game.getStatusText(),
        })));
    });

    app.get("/api/game/:gameName/", (req, res) => {
        const {valid, interactor, game} = req.games.getGameIfAvailable();
        if(!valid) return;

        res.json({
            buildInfo,
            engineInfo: game.getEngineVersionInfo(),
            game: game.getBasicGameInfo(),
            gameSettings: game.getSettings(),
            openHours: game.getOpenHours().asResolved().serialize(),
            logBook: interactor.getLogBook().serialize(),
        });
    });

    app.get("/api/game/:gameName/turn/:turnId", (req, res) => {
        const {valid, interactor} = req.games.getGameIfAvailable();
        if(!valid) return;

        const state = interactor.getGameStateById(+req.params.turnId);
        res.json(state && state.serialize());
    });

    app.post("/api/game/:gameName/turn", async (req, res) => {
        const {valid, interactor, game} = req.games.getGameIfAvailable();
        if(!valid) return;

        const log = req.log || logger;

        try {
            const {canSubmit, error} = game.checkUserCreatedEntry(req.body);
            if(!canSubmit) {
                log.info({
                    msg: "Rejected log book entry (pre submit)",
                    entry: req.body,
                    reason: error,
                });

                res.json({ success: false, error });
                return;
            }

            const entry = await interactor.addLogBookEntry(req.body);
            res.json({ success: true, entry: entry.serialize() });
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
        const {valid, interactor} = req.games.getGameIfAvailable();
        if(!valid) return;

        const logBook = interactor.getLogBook();
        const lastId = logBook.getLastEntryId();

        if((+req.params.lastTurnId) !== lastId) {
            res.json({
                error: `Invalid last turn (expected ${lastId} but got ${req.params.lastTurnId})`,
            });

            return;
        }

        const factories = await interactor.getActions(req.params.playerName);
        res.json(factories.serialize());
    });

    app.use(function(req, res) {
        res.sendFile(path.resolve(path.join(STATIC_DIR, "index.html")));
    });
}