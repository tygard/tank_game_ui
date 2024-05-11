const encodedA = "A".charCodeAt(0);

export class Position {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    static fromHumanReadable(humanReadable) {
        return new Position(humanReadable.charCodeAt(0) - encodedA, +humanReadable.slice(1) - 1);
    }

    get humanReadableX() {
        return String.fromCharCode(encodedA + this.x);
    }

    get humanReadableY() {
        return (this.y + 1).toString();
    }

    get humanReadable() {
        return this.humanReadableX + this.humanReadableY;
    }
}
