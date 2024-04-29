import { parse } from "yaml";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { logger } from "./logging.mjs";
import { Config } from "../../common/state/config/config.mjs";
import { GameManager } from "./game-file.mjs";

const currentSourceFile = (new URL(import.meta.url)).pathname;
const DEFAULT_CONFIG = path.join(path.dirname(currentSourceFile), "..", "default-config.yaml");

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
        { path: DEFAULT_CONFIG, config: await parseYaml(DEFAULT_CONFIG) },
        { path: configPath, config: await loadRawConfig(configPath) },
    );
}

export async function loadConfigAndGames(createEngine, saveUpdatedFiles) {
    const config = await loadConfig(createEngine);
    const gameManager = new GameManager(config, createEngine, saveUpdatedFiles);
    return { config, gameManager };
}