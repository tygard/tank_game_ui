export class LogEntryFormatter {
    constructor(formatFunctions) {
        this._formatFunctions = formatFunctions;
    }

    format(logEntry) {
        const formatFunction = this._formatFunctions[logEntry.type];
        if(!formatFunction) {
            throw new Error(`Log entry type ${logEntry.type} is not supported`);
        }

        return formatFunction(logEntry.rawLogEntry, this);
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
export const move = entry => `${entry.subject} moved to ${entry.target}`


export function shoot(entry) {
    const verb = entry.hit ? "shot" : "miss";
    return `${entry.subject} ${verb} ${entry.target}`
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