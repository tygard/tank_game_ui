import { deepClone } from "../../../utils.js";

let idGenerator = 0;

/**
 * An instance of a player/user
 */
export default class Player {
    /**
     * Construct a player
     * @param {*} attributes The player's attributes
     * @param {*} uniqueId The unique ID for this player (optional)
     */
    constructor(attributes = {}, uniqueId) {
        this.uniqueId = uniqueId || (++idGenerator + "");
        this.attributes = attributes;
    }

    /**
     * Get the name of this player
     */
    get name() { return this.attributes.name; }

    /**
     * Get the type of this player
     */
    get type() { return this.attributes.type; }

    /**
     * Construct a player from a json serialized object
     * @param {*} rawPlayer
     * @returns
     */
    static deserialize(rawPlayer) {
        return new Player(rawPlayer);
    }

    /**
     * Serialize a player to a json object
     * @returns
     */
    serialize() {
        return this.attributes;
    }

    /**
     * Duplicate this player
     * @returns
     */
    clone() {
        return new Player(deepClone(this.attributes), this.uniqueId);
    }

    /**
     * Get a PlayerRef for this player
     * @returns
     */
    asRef() {
        return new PlayerRef(this);
    }
}

/**
 * A handle to a player
 */
export class PlayerRef {
    constructor(player) {
        this._playerId = player.uniqueId;
    }

    /**
     * Get the player referenced by this handle
     * @param {*} gameState the game state to get the player from
     * @returns
     */
    getPlayer(gameState) {
        return gameState.players.getPlayerById(this._playerId);
    }

    /**
     * Check if a handle refers to a given player
     * @param {*} player
     * @returns
     */
    isFor(player) {
        return this._playerId == player.uniqueId;
    }
}