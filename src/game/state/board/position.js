const encodedA = "A".charCodeAt(0);
const POSITION_EXPR = /([A-Za-z]+)(\d+)/;

function fromHumanReadable(humanReadable) {
    const match = humanReadable?.match?.(POSITION_EXPR);
    if(!match) throw new Error(`Invalid human reabale position: ${JSON.stringify(humanReadable)}`);

    let x = -1;
    let xStr = match[1];

    for(let i = 0; i < xStr.length; ++i) {
        x = (x + 1) * 26;
        x += xStr[i].toUpperCase().charCodeAt(0) - encodedA;
    }

    return {
        x,
        y: +match[2] - 1,
    };
}

export class Position {
    constructor(x, y) {
        if(typeof x == "string") {
            x = fromHumanReadable(x); // Convert to x = {x, y}, y = undefined
        }

        if(typeof x?.x == "number" && typeof x?.y == "number") {
            y = x.y;
            x = x.x;
        }

        if(typeof x != "number" || typeof y != "number" || x < 0 || y < 0) {
            throw new Error(`Invalid position (${x}, ${y})`);
        }

        this.x = x;
        this.y = y;
    }

    get humanReadableX() {
        let strPosition = "";
        let x = this.x;

        for(;;) {
            strPosition = String.fromCharCode(encodedA + (x % 26)) + strPosition;

            const remaining = Math.floor(x / 26);
            if(remaining === 0) break;
            x = remaining - 1;
        }

        return strPosition;
    }

    get humanReadableY() {
        return (this.y + 1).toString();
    }

    get humanReadable() {
        return this.humanReadableX + this.humanReadableY;
    }

    distanceTo(position) {
        const xDiff = Math.abs(position.x - this.x);
        const yDiff = Math.abs(position.y - this.y);
        const sqrt = Math.sqrt(xDiff ** 2 + yDiff ** 2);
        return Math.floor(sqrt);
    }
}
