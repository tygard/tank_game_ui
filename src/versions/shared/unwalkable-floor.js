import { FloorTileDescriptor, imageBackground } from "../base/descriptors.js"

export class UnwalkableFloor extends FloorTileDescriptor {
    getBackground() {
        return imageBackground("unwalkable-floor");
    }
}