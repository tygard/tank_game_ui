export class Resource {
    constructor(name, value) {
        this.name = name;
        this.value = value;
    }

    static deserialize(rawResource, name) {
        return new Resource(name, rawResource);
    }

    serialize() {
        return this.value;
    }
}


export class ResourceHolder {
    constructor(resources = []) {
        for(const resource of resources) {
            this[resource.name] = resource;
        }
    }

    static deserialize(rawResources) {
        return new ResourceHolder(
            Object.keys(rawResources).map(resourceName => Resource.deserialize(rawResources[resourceName], resourceName)));
    }

    serialize() {
        let serialized = {};

        Object.keys(this)
            .map(resourceName => serialized[resourceName] = this[resourceName].serialize());

        return serialized;
    }

    // Helper to reduce the number of Object.keys calls
    *[Symbol.iterator]() {
        for(const resourceName of Object.keys(this)) {
            yield this[resourceName];
        }
    }
}