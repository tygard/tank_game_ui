export function getCombinedKeys(objects) {
    let keys = [];
    for(const object of objects) {
        if(object) keys = keys.concat(Object.keys(object));
    }

    return keys;
}

function matchesAnyPaths(paths, path) {
    return paths.find(pathToMatch => {
        return pathToMatch.exec ? !!pathToMatch.exec(path) : pathToMatch == path;
    });
}

export function deepMerge(objects, options) {
    let merged = objects[0];
    for(let i = 1; i < objects.length; ++i) {
        merged = deepMergeTwoObjects(merged, objects[i], options);
    }

    return merged;
}

function removeIgnoredPaths(object, currentPath, pathsToIgnore) {
    if(typeof object != "object") return object;

    let clone = Array.isArray(object) ? [] : {};

    for(const key of Object.keys(object)) {
        const keyPath = `${currentPath}/${key}`;

        if(matchesAnyPaths(pathsToIgnore, keyPath)) continue;

        if(Array.isArray(object)) {
            clone.push(object[key]);
        }
        else {
            clone[key] = object[key];
        }
    }

    return clone;
}

function deepMergeTwoObjects(objectA, objectB, { currentPath = "", objectsToOverwrite = [], pathsToIgnore = [] } = {}) {
    objectA = removeIgnoredPaths(objectA, currentPath, pathsToIgnore);
    objectB = removeIgnoredPaths(objectB, currentPath, pathsToIgnore);

    if(objectB === undefined) {
        return objectA;
    }

    if(typeof objectA != "object" || typeof objectA != typeof objectB ||
            Array.isArray(objectA) != Array.isArray(objectB) ||
            matchesAnyPaths(objectsToOverwrite, currentPath)) {
        return objectB;
    }

    if(Array.isArray(objectA)) {
        return objectA.concat(objectB);
    }

    let combined = {};
    for(const key of getCombinedKeys([objectA, objectB])) {
        const keyPath = `${currentPath}/${key}`;

        combined[key] = deepMergeTwoObjects(objectA?.[key], objectB?.[key], {
            currentPath: keyPath,
            objectsToOverwrite,
            pathsToIgnore,
        });
    }

    return combined;
}