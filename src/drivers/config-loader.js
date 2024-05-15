/* globals URL, process */
import { parse } from "yaml";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { logger } from "#platform/logging.js";
import { Config, mergeConfig } from "../config/config.js";
import { GameManager } from "./game-file.js";

const currentSourceFile = (new URL(import.meta.url)).pathname;
const DEFAULT_CONFIG = path.join(path.dirname(currentSourceFile), "..", "..", "default-config.yaml");

const parseYaml = async yamlPath => parse(await readFile(yamlPath, "utf-8")) || {};

async function loadRawConfig(configPath) {
    logger.info(`Loading config from: ${configPath}`);

    try {
        return await parseYaml(configPath);
    }
    catch(err) {
        // Ignore file not found errors
        if(err.code != "ENOENT") throw err;
    }
}

export async function loadConfig() {
    const configPath = process.env.TANK_GAME_UI_CONFIG || "tank-game-ui.yaml";

    return new Config(
        mergeConfig(
            await parseYaml(DEFAULT_CONFIG),
            await loadRawConfig(configPath),
        )
    );
}

export async function loadConfigAndGames(createEngine, saveUpdatedFiles) {
    const config = await loadConfig();
    const gameManager = new GameManager(config, createEngine, { saveBack: saveUpdatedFiles });
    return { config, gameManager };
}