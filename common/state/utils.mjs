export function objectMap(obj, mapFn) {
    let mappedObject = {};

    for(const key of Object.keys(obj)) {
        mappedObject[key] = mapFn(obj[key], key);
    }

    return mappedObject;
}

// Remove _, - and capitalize names
export function prettyifyName(name) {
    return name.split(/_|-|\s+/)
        .map(word => word.length > 0 ? (word[0].toUpperCase() + word.slice(1)) : "")
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