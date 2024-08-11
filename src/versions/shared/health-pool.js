import { FloorTileDescriptor, imageBackground } from "../base/descriptors.js"

export class HealthPoolDescriptor extends FloorTileDescriptor {
    getBackground() {
        return imageBackground("health-pool");
    }
}