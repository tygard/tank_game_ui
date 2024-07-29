import { logger } from "#platform/logging.js";

// Remove _, - and capitalize names
export function prettyifyName(name, { capitalize = true, plural = false } = {}) {
    if(name === undefined) return;

    name = name.split(/_|-|\s+/)
        .map(word => word.length > 0 && capitalize ? (word[0].toUpperCase() + word.slice(1)) : word)
        .join(" ");

    if(plural) {
        // If the word ends in y replace it with ie
        if(name[name.length - 1] == "y") {
            name = name.slice(0, name.length - 1) + "ie";
        }

        name += "s";
    }

    return name;
}

export class PromiseLock {
    constructor() {
        this._lockingPromise = Promise.resolve();
    }

    use(callback) {
        const promiseForCurrentJob = this._lockingPromise.then(() => callback());

        // Swallow any errors so we don't get a string of failures
        this._lockingPromise = promiseForCurrentJob.catch(() => {});

        return promiseForCurrentJob;
    }
}

export function buildDeserializer(Types) {
    return (raw) => {
        let MatchingType;
        for(const Type of Types) {
            if(Type.canConstruct(raw.type)) {
                MatchingType = Type;
                break;
            }
        }

        if(!MatchingType) {
            logger.error({ msg: "Action factory not found", raw });
            throw new Error(`No action factory for ${raw.type}`);
        }

        return MatchingType.deserialize(raw);
    };
}

export function deepClone(object) {
    if(typeof object != "object") return object

    if(Array.isArray(object)) {
        return object.map(value => deepClone(value));
    }

    let newObject = {};
    for(const key of Object.keys(object)) {
        if(typeof object == "object") {
            newObject[key] = deepClone(object[key]);
        }
        else {
            newObject[key] = object[key];
        }
    }

    return newObject;
}

export const unixNow = () => Math.floor(Date.now() / 1000);
