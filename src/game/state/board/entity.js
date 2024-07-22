import { deepClone } from "../../../utils.js";
import { Position } from "./position.js";

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
     * Load this entity from a json serialized object
     * @param {*} rawEntity The json serialized object to load
     * @param {*} players The Players object for this game state to look up referenced players in
     * @returns
     */
    static deserialize(rawEntity, players) {
        let attributes = deepClone(rawEntity);
        delete attributes.type;
        delete attributes.players;

        let position;
        if(attributes.position !== undefined) {
            position = new Position(attributes.position);
        }

        delete attributes.position;

        const myPlayers = (rawEntity.players || [])
            .map(playerName => players.getPlayerByName(playerName));
        return new Entity({ type: rawEntity.type, attributes, players: myPlayers, position });
    }

    /**
     * Serialize this entity to a json object
     * @param {*} gameState The game state this entity is a part of to look up player names
     * @returns
     */
    serialize(gameState) {
        return {
            ...this.attributes,
            type: this.type,
            position: this.position?.humanReadable,
            players: this._playerRefs.length === 0 ?
                undefined : // Don't include a players field if it's empty
                this._playerRefs.map(player => player.getPlayer(gameState).name),
        };
    }
}