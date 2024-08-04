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