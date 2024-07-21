import Player from "./player.js";

/**
 * A searchable collection of players
 */
export default class Players {
    constructor(players) {
        this._playersById = {};
        this._playersByName = {};
        this._playersByType = {};

        for(const player of players) {
            this._playersById[player.uniqueId] = player;
            this._playersByName[player.name] = player;

            if(player.type !== undefined) {
                if(!this._playersByType[player.type]) {
                    this._playersByType[player.type] = [];
                }

                this._playersByType[player.type].push(player);
            }
        }
    }

    /**
     * Construct a players instance from a serialized json object
     * @param {*} rawPlayers
     * @returns
     */
    static deserialize(rawPlayers) {
        return new Players(
            rawPlayers.map(rawPlayer => Player.deserialize(rawPlayer))
        );
    }

    /**
     * Convert a players instance to a serialized json object
     * @returns
     */
    serialize() {
        return this.getAllPlayers()
            .map(player => player.serialize());
    }

    /**
     * Get an array of all the players
     * @returns
     */
    getAllPlayers() {
        return Object.values(this._playersByName);
    }

    /**
     * Get an array of player types (string) held by this instance
     * @returns
     */
    getAllPlayerTypes() {
        return Object.keys(this._playersByType);
    }

    /**
     * Look up a player by it's unique ID
     * @param {*} uniqueId
     * @returns
     */
    getPlayerById(uniqueId) {
        return this._playersById[uniqueId];
    }

    /**
     * Look up a player by it's name
     * @param {*} name
     * @returns
     */
    getPlayerByName(name) {
        return this._playersByName[name];
    }

    /**
     * Return an array of players of a given type
     * @param {*} userType
     * @returns
     */
    getPlayersByType(userType) {
        return this._playersByType[userType] || [];
    }
}