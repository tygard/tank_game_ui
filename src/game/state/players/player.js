export default class Player {
    constructor(attributes = {}) {
        this.entities = [];
        this.attributes = attributes;
    }

    get name() { return this.attributes.name; }
    get type() { return this.attributes.type; }

    static deserialize(rawPlayer) {
        return new Player(rawPlayer);
    }

    serialize() {
        return this.attributes;
    }
}