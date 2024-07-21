import { Badge, EntityDescriptor, Indicator, TileStyle, imageBackground } from "../base/descriptors.js";

const TANK_TEAMS_WITH_ICONS = new Set([
    "abrams",
    "centurion",
    "leopard",
    "olifant",
]);

export class TankDescriptor extends EntityDescriptor {
    getFeaturedAttribute() {
        const {health, durability} = this.entity.attributes;
        return health || durability;
    }

    getTileStyle() {
        const isDead = this.entity.attributes.durability !== undefined;

        let icon = isDead ? "DeadTank" : "Tank"

        const team = this._getPlayer()?.attributes?.team?.toLowerCase?.();
        if(TANK_TEAMS_WITH_ICONS.has(team)) {
            icon = `Tank-${team}${isDead ? "-dead" : ""}`;
        }

        return new TileStyle({
            textColor: "#fff",
            background: imageBackground(icon),
        });
    }

    getBadge() {
        const {actions} = this.entity.attributes;
        if(actions === undefined) return;

        return new Badge({
            text: actions,
            textColor: "#fff",
            background: "#00f",
        });
    }

    getIndicators() {
        const bounty = this.entity.attributes.bounty;
        if(bounty !== undefined && bounty > 0) {
            return [
                new Indicator({
                    symbol: "B",
                    textColor: "orange",
                }),
            ];
        }

        return [];
    }

    _getPlayer() {
        const playerRef = this.entity.getPlayerRefs()[0];
        if(playerRef) {
            return playerRef.getPlayer(this.gameState);
        }
    }

    getName() {
        return this._getPlayer()?.name;
    }

    formatForLogEntry() {
        let formatted = this.getName();

        if(this.entity.attributes.durability !== undefined) {
            formatted += " [dead]";
        }

        return formatted;
    }
}