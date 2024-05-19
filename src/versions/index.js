import { version3 } from "./3.js";
import { version4 } from "./4.js";

const gameVersions = {
    3: version3,
    4: version4,
};


export function getGameVersion(version) {
    return gameVersions[version];
}

export function getAllVersions() {
    return Object.keys(gameVersions);
}