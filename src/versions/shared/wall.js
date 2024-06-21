import { EntityDescriptor, TileStyle, imageBackground } from "../base/descriptors.js";

export class Wall extends EntityDescriptor {
    static wallUrls = {};

    getTileStyle() {
        const durability = this.entity.attributes.durability;
        const url = this.wallUrls[durability];
        if(!url) {
            throw new Error(`Walls can't have a durability of ${durability}`);
        }

        return new TileStyle({
            background: imageBackground(url),
        });
    }
}