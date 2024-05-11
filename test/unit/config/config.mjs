import assert from "node:assert";
import { deepMerge } from "../../../src/config/merge.mjs";
import { mergeConfig } from "../../../src/config/config.mjs";
import { evalExpression, takeFirstMatch } from "../../../src/config/expressions.mjs";

describe("Config", () => {
    it("can merge two objects", () => {
        const objectA = {
            primative: 1,
            notInB: "yeah",
            array: [1, 2],
            nonMergedArray: [0],
            foo: {
                bar: {
                    notInB: 1,
                    dontMerge: { bop: 1 }
                },
                other: {
                    no: 2,
                    yes: false,
                }
            },
            bop: {
                bink: true,
            },
        };

        const objectB = {
            primative: 2,
            notInA: "also yeah",
            array: [3, 4],
            nonMergedArray: [1, 2, 3],
            foo: {
                bar: {
                    notInA: 1,
                    dontMerge: { baz: 2 },
                },
                other: {
                    yes: true,
                },
            },
        };

        const merged = deepMerge([objectA, objectB], {
            objectsToOverwrite: [
                "/nonMergedArray",
                "/foo/bar/dontMerge",
                "/bop",
            ],
        });

        assert.deepEqual(merged, {
            primative: 2,
            notInB: "yeah",
            notInA: "also yeah",
            array: [1, 2, 3, 4],
            nonMergedArray: [1, 2, 3],
            foo: {
                bar: {
                    notInB: 1,
                    notInA: 1,
                    dontMerge: { baz: 2 },
                },
                other: {
                    no: 2,
                    yes: true,
                },
            },
            bop: {
                bink: true,
            },
        });
    });

    it("can ignore specified paths", () => {
        const objectA = {
            primative: 1,
            iAm: "ignored",
            foo: {
                bar: "ignored",
                baz: true,
            },
            also: {
                a: { ignored: true },
                b: { ignored: true },
                c: { ignored: true },
            }
        };

        const objectB = {
            primative: 2,
            foo: {
                bar: "ignored",
                baz: false,
            }
        };

        const merged = deepMerge([objectA, objectB], {
            pathsToIgnore: [
                "/iAm",
                "/foo/bar",
                /\/also\/.+/
            ],
        });

        assert.deepEqual(merged, {
            primative: 2,
            foo: {
                baz: false,
            },
            also: {},
        });
    });

    it("can handle not having values on the default or user config", () => {
        const basicConfig = { foo: 1, bar: 2 };
        const expectedConfig = {
            config: {
                foo: 1,
                bar: 2,
            },
            defaultGameVersion: {},
            gameVersions: {},
        };

        assert.deepEqual(mergeConfig(Object.assign({}, basicConfig), undefined), expectedConfig);
        assert.deepEqual(mergeConfig(undefined, basicConfig), expectedConfig);
    });

    it("can merges default game version into all game versions", () => {
        const defaultConfig = {
            defaultGameVersion: {
                foo: 1,
                bar: 1,
                baz: 1,
                bop: 1,
            },
            gameVersions: {
                3: {
                    baz: 3,
                    bop: 3,
                },
            },
        };

        const userConfig = {
            defaultGameVersion: {
                bar: 2,
                baz: 2,
                bop: 2,
            },
            gameVersions: {
                3: {
                    bop: 4,
                },
            },
        };

        assert.deepEqual(mergeConfig(defaultConfig, userConfig), {
            config: {},
            defaultGameVersion: {
                foo: 1,
                bar: 2,
                baz: 2,
                bop: 2,
            },
            gameVersions: {
                3: {
                    foo: 1,
                    bar: 2,
                    baz: 3,
                    bop: 4,
                },
            },
        });
    });

    it("can process basic expressions", () => {
        const getVarValue = name => name.length;

        // ===
        assert.ok(evalExpression({ var: "foo", eq: 3 }, getVarValue));
        assert.ok(evalExpression({ var: "foobar", eq: 6 }, getVarValue));
        assert.ok(!evalExpression({ var: "foobar", eq: 5 }, getVarValue));

        // !==
        assert.ok(!evalExpression({ var: "foobar", neq: 6 }, getVarValue));
        assert.ok(evalExpression({ var: "foobar", neq: 5 }, getVarValue));

        // <
        assert.ok(evalExpression({ var: "foobar", lt: 9 }, getVarValue));
        assert.ok(evalExpression({ var: "foobar", lt: 7 }, getVarValue));
        assert.ok(!evalExpression({ var: "foobar", lt: 3 }, getVarValue));

        // >
        assert.ok(evalExpression({ var: "foobar", gt: 2 }, getVarValue));
        assert.ok(evalExpression({ var: "foobar", gt: 5 }, getVarValue));
        assert.ok(!evalExpression({ var: "foobar", gt: 9 }, getVarValue));

        // <=
        assert.ok(evalExpression({ var: "foobar", le: 9 }, getVarValue));
        assert.ok(evalExpression({ var: "foobar", le: 6 }, getVarValue));
        assert.ok(!evalExpression({ var: "foobar", le: 3 }, getVarValue));

        // >=
        assert.ok(evalExpression({ var: "foobar", ge: 2 }, getVarValue));
        assert.ok(evalExpression({ var: "foobar", ge: 6 }, getVarValue));
        assert.ok(!evalExpression({ var: "foobar", ge: 8 }, getVarValue));

        assert.ok(evalExpression(undefined, getVarValue));
    });

    it("can process basic expressions", () => {
        const makeVarValue = obj => name => obj[name];

        const choices = [
            { expr: { var: "a", eq: 3 } },
            { expr: { var: "a", lt: 3 } },
            { expr: { var: "b", gt: 5 } },
            { this: "is a thing" },
        ];

        assert.deepEqual(
            takeFirstMatch(choices, makeVarValue({ a: 1, b: 3 })),
            { expr: { var: "a", lt: 3 } });

        assert.deepEqual(
            takeFirstMatch(choices, makeVarValue({ a: 3, b: 1 })),
            { expr: { var: "a", eq: 3 } });

        assert.deepEqual(
            takeFirstMatch(choices, makeVarValue({ a: 4, b: 6 })),
            { expr: { var: "b", gt: 5 } });

        assert.deepEqual(
            takeFirstMatch(choices, makeVarValue({ a: 7, b: 2 })),
            { this: "is a thing" });
    });
});