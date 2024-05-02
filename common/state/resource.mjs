export class Resource {
    constructor(name, value, max) {
        this.name = name;
        this.value = value;
        this.max = max;
    }

    static deserialize(rawResource, name) {
        return new Resource(name, rawResource.value, rawResource.max);
    }

    serialize() {
        let serialized = {
            value: this.value,
        };

        if(this.max !== undefined) {
            serialized.max = this.max;
        }

        return serialized;
    }

    toString() {
        return this.max === undefined ?
            this.value : `${this.value} / ${this.max}`;
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