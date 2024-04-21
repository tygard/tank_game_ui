import { ResourceHolder } from "../resource.mjs";

export default class Entity {
    constructor(type, position, resources) {
        this.type = type;
        this.position = position;
        this.player = undefined;
        this.resources = new ResourceHolder(resources);
    }

    static deserialize(rawEntity, position) {
        return new Entity(rawEntity.type, position, ResourceHolder.deserialize(rawEntity.resources))
    }

    serialize() {
        return {
            type: this.type,
            resources: this.resources.serialize(),
        }
    }
}