import { Position } from "./position.js";

export default class Entity {
    constructor({ type, position, attributes = {}, players = [] }) {
        this.type = type;
        this.position = position;
        this.players = [];
        this.attributes = attributes;

        for(let player of players) this.addPlayer(player);
    }

    addPlayer(player) {
        player.entities.push(this);
        this.players.push(player);
    }

    static deserialize(rawEntity, players) {
        let attributes = Object.assign({}, rawEntity);
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

    serialize() {
        return {
            ...this.attributes,
            type: this.type,
            position: this.position?.humanReadable,
            players: this.players.length === 0 ?
                undefined : // Don't include a players field if it's empty
                this.players.map(player => player.name),
        };
    }
}