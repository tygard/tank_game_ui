import { FloorTileDescriptor } from "../base/descriptors.js"

export class GoldMineDescriptor extends FloorTileDescriptor {
    getBackground() {
        return "var(--tank-game-orange)";
    }
}