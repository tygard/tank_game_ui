export const SERIALIZER_KEY = Symbol("serializer");
export const DESERIALIZER_KEY = "class";

/**
 * A helper for cloning and modifying an object
 * @param {*} object the object to clone
 * @param {*} transform a function to call on every key of the object
 * @returns
 */
function cloneObject(object, transform) {
    let value = object;
    if(typeof value == "object") {
        value = Array.isArray(value) ? [] : {};
        for(const key of Object.keys(object)) {
            value[key] = transform(key, object[key]);
        }

        if(object[SERIALIZER_KEY]) {
            value[SERIALIZER_KEY] = object[SERIALIZER_KEY];
        }
    }

    return value;
}

/**
 * A helper for serializing and deserializing classes to JSON
 */
export class Deserializer {
    constructor() {
        this._deserializers = new Map();
        this._serializers = new Map();
    }

    /**
     * Serialize an object
     * @param {*} object the object to serialize
     * @returns the json object
     */
    serialize(object) {
        return this._serializeRecursive("", object);
    }

    /**
     * Convert a json object to an object
     * @param {*} jsonString the json object to parse
     * @param {*} helpers an object containing helpers to be passed to all deserialize methods
     * @returns the parsed object
     */
    deserialize(jsonString, helpers = {}) {
        return this._deserializeRecursive("", jsonString, helpers);
    }

    /**
     * Recursivly serialize an object (order root to leaves)
     * @param {*} key the key that object was pulled from
     * @param {*} object the object to serialize
     * @returns
     */
    _serializeRecursive(key, object) {
        object = this._serialize(key, object);
        return cloneObject(object, (key, value) => this._serializeRecursive(key, value));
    }

    /**
     * Recursivly deserialize an object (order leaves to root)
     * @param {*} key the key that object was pulled from
     * @param {*} object the object to deserialize
     * @param {*} helpers an object containing helpers to be passed to all deserialize methods
     * @returns
     */
    _deserializeRecursive(key, object, helpers) {
        object = cloneObject(object, (key, value) => this._deserializeRecursive(key, value, helpers));
        return this._deserialize(key, object, helpers);
    }

    /**
     * Serialize a single object using a registered serializer
     * @param {*} key the key that object was pulled from
     * @param {*} value the object to serialize
     * @returns
     */
    _serialize(key, value) {
        if(typeof value != "object" || typeof value[SERIALIZER_KEY] != "string") {
            return value;
        }

        const className = value[SERIALIZER_KEY];

        const transformer = this._serializers.get(className);
        if(transformer === undefined) {
            throw new Error(`Could not find a serializer for ${value[SERIALIZER_KEY]}`);
        }

        let serialized = transformer(value);
        if(serialized[DESERIALIZER_KEY] === undefined) {
            serialized = Object.assign({}, serialized);
            serialized[DESERIALIZER_KEY] = className;
        }

        return serialized;
    }

    /**
     * Deserialize a single object using a registered deserializer
     * @param {*} key the key that object was pulled from
     * @param {*} value the object to deserialize
     * @param {*} helpers an object containing helpers to be passed to all deserialize methods
     * @returns
     */
    _deserialize(key, value, helpers) {
        if(typeof value != "object" || typeof value[DESERIALIZER_KEY] != "string") {
            return value;
        }

        const className = value[DESERIALIZER_KEY];

        delete value[DESERIALIZER_KEY];

        const transformer = this._deserializers.get(className);
        if(transformer === undefined) {
            throw new Error(`Could not find a deserializer for ${value[DESERIALIZER_KEY]}`);
        }

        helpers.getKey = () => key;
        let transformed = transformer(value, helpers);

        if(transformed[SERIALIZER_KEY] === undefined) {
            throw new Error(`Deserializer for ${className} failed to set ${SERIALIZER_KEY.toString()} (key = ${key})`);
        }

        return transformed;
    }

    /**
     * Register a class with serialize and deserialize methods (can be used as a decorator)
     * @param {*} className the name used to identify this class for serialization and deserialization
     * @param {*} Class the class to register
     * @returns
     */
    registerClass(className, Class) {
        if(Class === undefined) {
            return this.registerClass.bind(this, className);
        }

        Class.prototype[SERIALIZER_KEY] = className;

        let serialize;
        if(Class.serialize !== undefined) {
            serialize = Class.serialize;
        }

        if(serialize === undefined && Class.prototype.serialize !== undefined) {
            serialize = object => Class.prototype.serialize.call(object);
        }

        if(serialize === undefined) {
            throw new Error(`Class ${className} does not define a serialize function`);
        }

        this.registerSerializer(className, serialize);
        this.registerDeserializer(className, Class.deserialize)
    }

    /**
     * Register a function for serializing a class (can be used as a decorator)
     * @param {*} className the name used to identify this class for serialization and deserialization
     * @param {*} serializer a function that converts an instance into a json friendly object
     * @returns
     */
    registerSerializer(className, serializer) {
        if(serializer === undefined) {
            return this.registerClass.bind(this, className);
        }

        this._serializers.set(className, serializer);
    }

    /**
     * Register a function for deserializing a class (can be used as a decorator)
     * @param {*} className the name used to identify this class for serialization and deserialization
     * @param {*} deserializer a function that converts from a json friendly object an instance
     * @returns
     */
    registerDeserializer(className, deserializer) {
        if(deserializer === undefined) {
            return this.registerClass.bind(this, className);
        }

        this._deserializers.set(className, deserializer);
    }
}

/**
 * Global deserializer used for files, game state, and possible actions
 */
export let deserializer = new Deserializer();