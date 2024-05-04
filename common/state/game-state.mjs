import Board from "./board/board.mjs";
import Players from "./players/players.mjs";
import { ResourceHolder } from "./resource.mjs";

export class GameState {
    constructor(players, board, councilAttributes) {
        this.players = players;
        this.board = board;
        this.council = councilAttributes;
    }

    static deserialize(rawGameState) {
        let board = Board.deserialize(rawGameState.board);

        return new GameState(
            Players.deserialize(rawGameState.players, board),
            board,
            ResourceHolder.deserialize(rawGameState.council),
        );
    }

    serialize() {
        return {
            players: this.players.serialize(),
            board: this.board.serialize(),
            council: this.council.serialize(),
        }
    }
}