import Board from "./board/board.js";
import Entity from "./board/entity.js";
import Players from "./players/players.js";

export class GameState {
    constructor(players, board, metaEntities) {
        this.players = players;
        this.board = board;
        this.metaEntities = metaEntities;
    }

    static deserialize(rawGameState) {
        let players = Players.deserialize(rawGameState.players);

        let metaEntities = {};
        for(const name of Object.keys(rawGameState.metaEntities)) {
            metaEntities[name] = Entity.deserialize(rawGameState.metaEntities[name], players);
        }

        return new GameState(
            players,
            Board.deserialize(rawGameState.board, players),
            metaEntities,
        );
    }

    serialize() {
        let metaEntities = {};
        for(const entityName of Object.keys(this.metaEntities)) {
            metaEntities[entityName] = this.metaEntities[entityName].serialize(this);
        }

        let raw = {
            players: this.players.serialize(),
            board: this.board.serialize(this),
            metaEntities,
        };

        return raw;
    }

    modify({ players, board, metaEntities } = {}) {
        return new GameState(
            players || this.players,
            board || this.board,
            metaEntities || this.metaEntities);
    }

    _getAllEntities() {
        let allEntities = Object.values(this.metaEntities);
        allEntities = allEntities.concat(this.board.getAllEntities());
        return allEntities;
    }

    getEntitiesByPlayer(player) {
        return this._getAllEntities()
            .filter(entity => {
                return !!entity.getPlayerRefs().find(playerRef => playerRef.isFor(player));
            });
    }
}