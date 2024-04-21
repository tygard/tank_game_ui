import Board from "./board/board.mjs";
import { Council } from "./players/council.mjs";
import Players from "./players/players.mjs";

export class GameState {
    constructor(players, board, council) {
        this.players = players;
        this.board = board;
        this.council = council;
    }

    static deserialize(rawGameState) {
        let board = Board.deserialize(rawGameState.board);

        return new GameState(
            Players.deserialize(rawGameState.players, board),
            board,
            Council.deserialize(rawGameState.council),
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