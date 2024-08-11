import { GameVersion } from "./base/index.js";
import { rawV4Config } from "./default-v4.js";
import { DestructibleFloor } from "./shared/destructible-floor.js";
import { HealthPoolDescriptor } from "./shared/health-pool.js";
import { UnwalkableFloor } from "./shared/unwalkable-floor.js";

export const rawV5Config = {
    ...rawV4Config,
    floorTileDescriptors: {
        ...rawV4Config.floorTileDescriptors,
        health_pool: HealthPoolDescriptor,
        unwalkable_floor: UnwalkableFloor,
        destructible_floor: DestructibleFloor,
    },
};

export const version5 = new GameVersion(rawV5Config);
