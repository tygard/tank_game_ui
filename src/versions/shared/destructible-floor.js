import { FloorTileDescriptor, imageBackground } from "../base/descriptors.js"

const NUM_DESTRUCTIBLE_FLOOR_STAGES = 5;


export class DestructibleFloor extends FloorTileDescriptor {
    getBackground() {
        const durability = this.floorTile.attributes.durability;

        let status = "";
        if(this.floorTile.attributes.destroyed) {
            status = "destroyed";
        }
        else if(durability.max !== undefined) {
            status = Math.round((durability.value / durability.max) * NUM_DESTRUCTIBLE_FLOOR_STAGES);
        }
        else {
            status = Math.min(durability, NUM_DESTRUCTIBLE_FLOOR_STAGES);
        }

        return imageBackground(`destructible-floor-${status}`);
    }
}