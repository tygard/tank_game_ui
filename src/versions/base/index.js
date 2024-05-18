import { EntityDescriptor, FloorTileDescriptor } from "./descriptors.js";

export class GameVersion {
    constructor({ logFormatter, entryDescriptors, floorTileDescriptors, councilPlayerTypes, manualPath }) {
        this._logFormatter = logFormatter;
        this._entryDescriptors = entryDescriptors;
        this._floorTileDescriptors = floorTileDescriptors;
        this._councilPlayerTypes = councilPlayerTypes;
        this._manualPath = manualPath;
    }

    formatLogEntry(logEntry) {
        return this._logFormatter.format(logEntry);
    }

    getEntityDescriptor(entity) {
        const Descriptor = this._entryDescriptors[entity.type] || EntityDescriptor;
        return new Descriptor(entity);
    }

    getFloorTileDescriptor(floorTile) {
        const Descriptor = this._floorTileDescriptors[floorTile.type] || FloorTileDescriptor;
        return new Descriptor(floorTile);
    }

    getCouncilPlayerTypes() {
        return this._councilPlayerTypes || [];
    }

    getManual() {
        return this._manualPath;
    }
}