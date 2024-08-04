import { version3 } from "./default-v3.js";
import { version4 } from "./default-v4.js";

const gameVersions = {
    "default-v3": version3,
    "default-v4": version4,
};


export function getGameVersion(version) {
    return gameVersions[version];
}

export function getAllVersions() {
    return Object.keys(gameVersions);
}