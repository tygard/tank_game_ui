import { logger } from "#platform/logging.js";

// Remove _, - and capitalize names
export function prettyifyName(name, { capitalize = true } = {}) {
    if(name === undefined) return;

    return name.split(/_|-|\s+/)
        .map(word => word.length > 0 && capitalize ? (word[0].toUpperCase() + word.slice(1)) : word)
        .join(" ");
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
