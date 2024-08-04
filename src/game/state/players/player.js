import { deserializer } from "../../../deserialization.js";
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
        // Make sure the next ID we generate doesn't overlap with an existing ID
        if(!isNaN(+uniqueId)) {
            idGenerator = Math.max(idGenerator, uniqueId + 1);
        }

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
        return new Player(rawPlayer.attributes, rawPlayer.uniqueId);
    }

    /**
     * Serialize a player to a json object
     * @returns
     */
    serialize() {
        return this;
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

deserializer.registerClass("player-v1", Player);

/**
 * A handle to a player
 */
export class PlayerRef {
    constructor(player) {
        this._playerId = player.uniqueId;
    }

    static deserialize(rawPlayerRef) {
        return new PlayerRef({ uniqueId: rawPlayerRef.playerId });
    }

    serialize() {
        return {
            playerId: this._playerId,
        };
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

deserializer.registerClass("player-ref-v1", PlayerRef);
