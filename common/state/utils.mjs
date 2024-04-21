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