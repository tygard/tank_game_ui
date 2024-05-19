export function imageBackground(url) {
    return `url("/assets/${url}.png")`;
}

export class EntityDescriptor {
    constructor(entity) {
        this.entity = entity;
    }

    // Get the badge to display in the bottom right corner of the tile
    // returns: Badge or undefined for no badge
    getBadge() {}

    // Get the indicators to display in the bottom left corner of the tile
    // returns: array of Indicators
    getIndicators() {
        return [];
    }

    // Get the background color to use for ALL of the indicators
    // returns: string
    getIndicatorBackground() {
        return "#000";
    }

    // Get the value to display in the center(ish) of the tile
    // returns: string or undefined for no featured attribute
    getFeaturedAttribute() {}

    // Get the color and background for this tile
    // returns: tile
    getTileStyle() {
        return new TileStyle({
            textColor: "#000",
            background: "#fff",
        });
    }

    // Get the name to display for this entity
    // returns: string or undefined to hide name tag
    getName() {}

    // Get a human readable string for when this entity is referenced in a log entry
    formatForLogEntry() {
        return this.getName() || this.entity.type;
    }
}


export class Badge {
    constructor({ text, textColor, background }) {
        this.text = text;
        this.style = {
            background,
            color: textColor,
        };
    }
}


export class Indicator {
    constructor({ symbol, textColor }) {
        this.symbol = symbol;
        this.style = {
            color: textColor,
        };
    }
}


export class TileStyle {
    constructor({ textColor, background }) {
        this.style = {
            background,
            color: textColor,
        };
    }
}


export class FloorTileDescriptor {
    constructor(floorTile) {
        this.floorTile = floorTile;
    }

    // Get the background to display for this floor tile
    // returns: string
    getBackground() {
        // If this floor tile has an icon and use that
        const icon = this.floorTile.icon;
        if(icon) return imageBackground(icon);

        return "#aaa";
    }

    // Get a human readable string for when this floor tile is referenced in a log entry
    formatForLogEntry() {
        return this.floorTile.type;
    }
}
