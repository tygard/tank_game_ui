import { LogEntryFormatter } from "./log-entry-formatter.mjs";

export class GameVersionConfig {
    constructor(gameVersionConfig) {
        this._gameVersionConfig = gameVersionConfig;
    }

    getLogEntryFormatter(logEntryType) {
        const formatters = this._gameVersionConfig?.logEntryFormatters;
        if(!formatters || !formatters[logEntryType]) return;

        return new LogEntryFormatter(formatters[logEntryType]);
    }

    getEntityDescriptor(type) {
        let {entityDescriptors} = this._gameVersionConfig;

        return entityDescriptors && entityDescriptors[type];
    }

    getFloorTileDescriptor(type) {
        let {floorTileDescriptors} = this._gameVersionConfig;

        return floorTileDescriptors && floorTileDescriptors[type];
    }

    getCouncilPlayerTypes() {
        return this._gameVersionConfig.councilPlayerTypes || [];
    }
}