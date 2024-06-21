import { prettyifyName } from "../../utils.js";

export function imageBackground(url) {
    return url?.length > 0 ? `url("/assets/${url}.png")` : undefined;
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


export class AttributeDescriptor {
    // Make a simple attribute descriptor
    static make({ category, background, displayAs, textColor }) {
        return class extends AttributeDescriptor {
            getCategory() {
                return category !== undefined ? category : super.getCategory();
            }

            getBackground() {
                return background !== undefined ? background : super.getBackground();
            }

            displayAs() {
                return displayAs !== undefined ? displayAs : super.displayAs();
            }

            getTextColor() {
                return textColor !== undefined ? textColor : super.getTextColor();
            }
        };
    }

    constructor(name, attribute) {
        this.name = name;
        this.attribute = attribute;
    }

    // The category these attributes belong in so they can be put with similar resources
    // Common categories:
    //    attributes (generic catch all)
    //    resources (things the player can aquire and spend)
    //    statuses (effects placed on a player by actions they take, location)
    getCategory() {
        return "attributes";
    }

    // How should this attribute be displayed
    //   text - plain text: attribute  value
    //   pill - display the attribute in a bubble with some optional secondary text
    displayAs() {
        return "text";
    }

    // Get the background color for rendering the attibute (used by displayAs: pill)
    getBackground() {
        return "#f00";
    }

    // The background color for the value text in a pill
    getSecondaryBackground() {
        return "#800";
    }

    // Get the color to use for the attibute text
    getTextColor() {
        return "#000";
    }

    // The text color for the value in a pill
    getSecondaryTextColor() {
        return "#fff";
    }

    // Get the name of this attribute
    getNameText() {
        return prettyifyName(this.name);
    }

    // Convert the value to a string (if undefined the value will not be displayed)
    getValueText() {
        if(typeof this.attribute?.max == "number") {
            return `${this.attribute.value} / ${this.attribute.max}`;
        }

        return this.attribute;
    }
}