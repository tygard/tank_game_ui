import assert from "node:assert";
import { Deserializer, DESERIALIZER_KEY, SERIALIZER_KEY } from "../../src/deserialization";

class Foo {
    constructor(foo) {
        this.foo = foo;
        this[SERIALIZER_KEY] = "foo";
        Object.freeze(this);
    }

    static deserialize(object, helpers) {
        helpers?.poke?.();
        return new Foo(object.foo);
    }

    serialize() {
        return {
            foo: this.foo,
            [DESERIALIZER_KEY]: "foo",
        };
    }

    toString() {
        return `foo ${this.foo}`;
    }
}

class Bar {
    constructor(bar) {
        this.bar = bar;
        this[SERIALIZER_KEY] = "bar";
        Object.freeze(this);
    }

    toString() {
        return `bar ${this.bar}`;
    }
}

let deserializer = new Deserializer();
deserializer.registerClass("foo", Foo);
deserializer.registerSerializer("bar", bar => ({ bar: bar.bar, [DESERIALIZER_KEY]: "bar" }));
deserializer.registerDeserializer("bar", bar => new Bar(bar.bar));


describe("Deserialization", () => {
    it("it can do basic serialization and deserialization", () => {
        const rawFoo = {
            foo: "my string",
            [DESERIALIZER_KEY]: "foo",
        };

        const foo = deserializer.deserialize(rawFoo);
        assert.equal(foo.toString(), "foo my string");
        assert.deepEqual(rawFoo, deserializer.serialize(foo));

        const rawBar = {
            bar: "my other string",
            [DESERIALIZER_KEY]: "bar",
        };

        const bar = deserializer.deserialize(rawBar);
        assert.equal(bar.toString(), "bar my other string");
        assert.deepEqual(rawBar, deserializer.serialize(bar));
    });

    it("can do nested serialization and deserialization", () => {
        const nested = {
            foo: new Foo("object1"),
            bar: "object2",
            baz: new Bar(new Foo("bop")),
        };

        const recreated = deserializer.deserialize(deserializer.serialize(nested));
        assert.deepEqual(recreated, nested);
        assert.equal(recreated.foo.toString(), "foo object1");
        assert.equal(recreated.baz.toString(), "bar foo bop");
    });

    it("can do nested serialization and deserialization with helpers", () => {
        const nested = {
            foo: new Foo("object1"),
            baz: new Bar(new Foo("bop")),
        };

        let counter = 0;
        const helpers = {
            poke: () => ++counter,
        };

        deserializer.deserialize(deserializer.serialize(nested), helpers);
        assert.equal(counter, 2);
    });
});