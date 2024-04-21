export class FloorTile {
    constructor(type, position) {
        this.type = type;
        this.position = position;
    }

    static deserialize(rawTile, position) {
        return new FloorTile(rawTile, position);
    }

    serialize() {
        return this.type;
    }
}