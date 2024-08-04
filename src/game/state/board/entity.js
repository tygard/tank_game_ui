import { deserializer } from "../../../deserialization.js";
import { deepClone } from "../../../utils.js";

/**
 * An entity which could be on the board, a floor tile, or a meta entity (i.e. council)
 */
export default class Entity {
    /**
     * Construct an entity
     * @param {*} type The type of the entity
     * @param {*} position The position of the entity (optional)
     * @param {*} attributes The attributes of the entity
     * @param {*} players The players or PlayerRefs that control this entity
     */
    constructor({ type, position, attributes = {}, players = [] }) {
        this.type = type;
        this.position = position;
        this._playerRefs = [];
        this.attributes = attributes;
        for(const player of players) {
            this.addPlayer(player);
        }
    }

    /**
     * Add a player that controls this entity
     * @param {*} player the player or PlayerRef to add
     */
    addPlayer(player) {
        this._playerRefs.push(player.asRef !== undefined ? player.asRef() : player);
    }

    /**
     * Get the PlayerRefs for all of the players that control this entity
     * @returns
     */
    getPlayerRefs() {
        return this._playerRefs;
    }

    /**
     * Clone this entity (PlayerRefs are shallow copied)
     * @param {*} removePlayers Don't copy players to the cloned entity
     * @returns
     */
    clone({ removePlayers = false } = {}) {
        return new Entity({
            type: this.type,
            position: this.position,
            players: removePlayers ? [] : this._playerRefs.slice(0),
            attributes: deepClone(this.attributes),
        });
    }

    /**
     * Load an entity from a json serialized object
     * @param {*} rawEntity the json serialized object to load
     * @returns
     */
    static deserialize(rawEntity) {
        let attributes = deepClone(rawEntity);
        delete attributes.type;
        delete attributes.players;
        delete attributes.position;

        return new Entity({
            type: rawEntity.type,
            attributes,
            players: rawEntity.players,
            position: rawEntity.position,
        });
    }

    /**
     * Serialize this entity to a json object
     * @returns
     */
    serialize() {
        return {
            ...this.attributes,
            type: this.type,
            position: this.position,
            players: this._playerRefs.length === 0 ?
                undefined : // Don't include a players field if it's empty
                this._playerRefs,
        };
    }
}

deserializer.registerClass("entity", Entity);