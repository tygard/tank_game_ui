import { AttributeHolder } from "../attribute.js";

export default class Entity {
    constructor(type, position, attributes) {
        this.type = type;
        this.position = position;
        this.player = undefined;
        this.attributes = new AttributeHolder(attributes);
    }

    static deserialize(rawEntity, position) {
        return new Entity(rawEntity.type, position, AttributeHolder.deserialize(rawEntity.attributes))
    }

    serialize() {
        return {
            type: this.type,
            attributes: this.attributes.serialize(),
        }
    }
}