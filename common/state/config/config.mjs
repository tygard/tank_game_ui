import { GameVersionConfig } from "./game-version.mjs";
import { deepMerge, getCombinedKeys } from "./merge.mjs";

const GAME_VERSION_MERGE_OPTIONS = {
    objectsToOverwrite: [
        // The following paths are conditionals and should be not be merged
        /^\/entityDescriptors\/[^/]+\/(tileColor|indicators)/
    ]
};

export function mergeConfig(defaultConfig, userConfig) {
    // Merge everything but the game version config
    const config = deepMerge([defaultConfig, userConfig], {
        pathsToIgnore: [
            "/gameVersions",
            "/defaultGameVersion",
        ]
    });

    const defaultGameVersion = deepMerge([
        defaultConfig?.defaultGameVersion,
        userConfig?.defaultGameVersion,
        {},
    ], GAME_VERSION_MERGE_OPTIONS);

    let gameVersions = {};

    const allVersionNames = getCombinedKeys([
        defaultConfig?.gameVersions,
        userConfig?.gameVersions,
    ]);

    for(const gameVersion of allVersionNames) {
        gameVersions[gameVersion] = deepMerge([
            defaultGameVersion,
            defaultConfig?.gameVersions?.[gameVersion],
            userConfig?.gameVersions?.[gameVersion],
        ], GAME_VERSION_MERGE_OPTIONS);
    }

    return {
        gameVersions,
        defaultGameVersion,
        config,
    };
}

export class Config {
    constructor({ gameVersions, defaultGameVersion, config }) {
        this._config = config;
        this._gameVersions = gameVersions;
        this._defaultGameVersion = defaultGameVersion;
    }

    static deserialize(rawConfig) {
        return new Config(rawConfig);
    }

    serialize() {
        return {
            config: this._config,
            defaultGameVersion: this._defaultGameVersion,
            gameVersions: this._gameVersions,
        };
    }

    isGameVersionSupported(version) {
        return !!this._gameVersions[version];
    }

    getSupportedGameVersions() {
        return Object.keys(this._gameVersions);
    }

    getGameVersion(version) {
        return new GameVersionConfig(
            this._gameVersions[version] || this._defaultGameVersion
        );
    }

    getConfig() {
        return this._config;
    }
}