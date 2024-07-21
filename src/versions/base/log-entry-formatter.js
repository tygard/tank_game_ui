import { Position } from "../../game/state/board/position.js";
import { prettyifyName } from "../../utils.js";

export class LogEntryFormatter {
    constructor(formatFunctions) {
        this._formatFunctions = formatFunctions;
    }

    format(logEntry, gameState, version) {
        const formatFunction = this._formatFunctions[logEntry.type];
        if(!formatFunction) {
            throw new Error(`Log entry type ${logEntry.type} is not supported`);
        }

        return formatFunction(logEntry.rawLogEntry, new FormatingHelpers(gameState, version, logEntry));
    }
}

class FormatingHelpers {
    constructor(gameState, version, logEntry) {
        this._gameState = gameState;
        this._version = version;
        this._logEntry = logEntry;
    }

    describeLocation(location, { locationInParenthisis, entity = true, floor = false }) {
        if(locationInParenthisis === undefined) {
            throw new Error("Argument locationInParenthisis must be specified")
        }

        if(this._gameState === undefined) return location;
        const position = new Position(location);

        let info;
        if(entity) {
            const entityAtLocation = this._gameState.board.getEntityAt(position);
            // Don't set info for empty entities so players can see the floor
            if(entityAtLocation && entityAtLocation.type != "empty") {
                const descriptor = this._version.getEntityDescriptor(entityAtLocation, this._gameState);
                info = descriptor.formatForLogEntry();
            }
        }

        if(!info && floor) {
            const floorTileAtLocation = this._gameState.board.getFloorTileAt(position);
            if(floorTileAtLocation && floorTileAtLocation.type != "empty") {
                const descriptor = this._version.getFloorTileDescriptor(floorTileAtLocation);
                info = descriptor.formatForLogEntry();
            }
        }

        // Nothing here
        if(!info) info = "empty";

        // No info to give the user just return the location
        if(!info) return location;

        info = prettyifyName(info, { capitalize: false });

        if(locationInParenthisis) return `${info} (${location})`;
        return `${location} (${info})`;
    }

    dieRoll(field, { prefix="", suffix="" }) {
        const roll = this._logEntry.dieRolls?.[field];
        if(!roll) return "";

        return `${prefix}${roll.map(dieSide => dieSide.display).join(", ")}${suffix}`;
    }
}


// Common log entries
export const startOfDay = entry => `Start of day ${entry.day}`;
export const buyAction = entry => `${entry.subject} traded ${entry.gold} gold for actions`
export const donate = entry => `${entry.subject} donated ${entry.donation} pre-tax gold to ${entry.target}`
export const upgradeRange = entry => `${entry.subject} upgraded their range`
export const bounty = entry => `${entry.subject} placed a ${entry.bounty} gold bounty on ${entry.target}`
export const stimulus = entry => `${entry.subject} granted a stimulus of 1 action to ${entry.target}`
export const grantLife = entry => `${entry.subject} granted 1 life to ${entry.target}`


export function move(entry, formatter) {
    const location = formatter.describeLocation(entry.target, {
        locationInParenthisis: false,
        entity: false,
        floor: true,
    });

    return `${entry.subject} moved to ${location}`;
}


export function shoot(entry, formatter) {
    const verb = entry.hit ? "shot" : "missed";
    const target = formatter.describeLocation(entry.target, {
        locationInParenthisis: false,
    });

    return `${entry.subject} ${verb} ${target}${formatter.dieRoll("hit_roll", { prefix: " [", suffix: "]" })}`
}


export const baseEntryFunctions = {
    move,
    shoot,
    donate,
    bounty,
    stimulus,
    start_of_day: startOfDay,
    buy_action: buyAction,
    upgrade_range: upgradeRange,
    grant_life: grantLife,
};