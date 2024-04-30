import { GameVersionConfig } from "./game-version.mjs";

export class Config {
    constructor(...configs) {
        // Rewrite paths to be relative to the config if we know the configs path
        for(let i = 0; i < configs.length; ++i) {
            let config = configs[i];
            if(config?.path && config?.config) {
                configs[i] = this._rewritePaths(config.path, config.config);
            }
        }

        // Merge all top level sections of the configs given
        for(const configSection of ["gameVersionConfigs", "backend"]) {
            const internalName = `_${configSection}`;
            if(!this[internalName]) this[internalName] = {};

            for(const config of configs) {
                if(config) {
                    Object.assign(this[internalName], config[configSection]);
                }
            }
        }

        for(const version of this.getSupportedGameVersions()) {
            this._gameVersionConfigs[version] = new GameVersionConfig(this._gameVersionConfigs[version])
        }
    }

    _rewritePaths(path, config) {
        let pathParts = path.split(/\/|\\/);
        // Remove the file name
        pathParts = pathParts.slice(0, pathParts.length - 1);
        let basePath = pathParts.join("/");

        const rewritePath = origPath => {
            return origPath.length > 0 && origPath[0] == "/" ? origPath : `${basePath}/${origPath}`;
        };

        if(config?.backend?.gamesFolder) {
            config.backend.gamesFolder = rewritePath(config?.backend?.gamesFolder);
        }

        return config;
    }

    static deserialize(rawConfig) {
        return new Config(rawConfig);
    }

    serialize() {
        let gameVersionConfigs = {};

        for(const versionName of this.getSupportedGameVersions()) {
            gameVersionConfigs[versionName] = this._gameVersionConfigs[versionName].serialize();
        }

        return {
            gameVersionConfigs,
        }
    }

    isGameVersionSupported(version) {
        return !!this.getGameVersion(version);
    }

    getGameVersion(version) {
        return this._gameVersionConfigs[version];
    }

    getSupportedGameVersions() {
        return Object.keys(this._gameVersionConfigs);
    }

    getGamesFolder() {
        return this._backend?.gamesFolder;
    }

    getPort() {
        return this._backend?.port;
    }
}