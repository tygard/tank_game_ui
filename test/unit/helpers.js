import Player, { PlayerRef } from "../../src/game/state/players/player";
import Players from "../../src/game/state/players/players";

/**
 * A helper to strip player ids from game state objects to fix miscompares
 * @param {*} object
 */
export function stripPlayerIds(object) {
    if(object instanceof Player) {
        delete object.uniqueId;
    }
    else if(object instanceof PlayerRef) {
        delete object._playerId;
    }
    else if(object instanceof Players) {
        delete object._playersById;
    }

    if(typeof object == "object") {
        Object.values(object).forEach(object => stripPlayerIds(object));
    }
}