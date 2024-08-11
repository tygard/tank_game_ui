import { logger } from "#platform/logging.js";


export class EngineManager {
    constructor(allFactories) {
        this._allFactories = allFactories.flat();

        const gameVersions = this._allFactories
            .flatMap(factory => factory.getSupportedGameVersions())

        this._factoryForVersion = {};
        let enginesForVersion = {};
        for(const supportedVersion of gameVersions) {
            this._factoryForVersion[supportedVersion] = this._getEnginesForVersion(supportedVersion)[0];

            enginesForVersion[supportedVersion] = this._factoryForVersion[supportedVersion].getEngineVersion();
        }

        logger.info({ enginesForVersion });
    }

    getEngineFactory(gameVersion) {
        const factory = this._factoryForVersion[gameVersion];
        if(factory === undefined) {
            throw new Error(`None of the available engines support game version ${gameVersion}`);
        }

        return factory;
    }

    _getEnginesForVersion(gameVersion) {
        return this._allFactories
            .filter(engineFactory => engineFactory.getSupportedGameVersions().includes(gameVersion));
    }

    listAvailableEngines() {
        let versions = [];
        for(const gameVersion of Object.keys(this._factoryForVersion)) {
            versions.push({
                gameVersion,
                engines: this._getEnginesForVersion(gameVersion).map(engineFactory => ({
                    selected: engineFactory == this._factoryForVersion[gameVersion],
                    engineId: this._allFactories.indexOf(engineFactory),
                    version: engineFactory.getEngineVersion(),
                })),
            })
        }

        return versions;
    }

    selectEngineForVersion(gameVersion, engineId) {
        const engineFactory = this._allFactories[engineId];
        if(engineFactory?.getSupportedGameVersions === undefined) {
            throw new Error(`Engine ID ${engineId} doesn't map to an engine`);
        }

        if(!engineFactory.getSupportedGameVersions().includes(gameVersion)) {
            throw new Error(`Engine ${engineFactory.getEngineVersion()} does not support ${gameVersion}`);
        }

        this._factoryForVersion[gameVersion] = engineFactory;
    }
}
