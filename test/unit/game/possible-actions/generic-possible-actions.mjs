import assert from "node:assert";
import { GenericPossibleAction } from "../../../../src/game/possible-actions/generic-possible-action.mjs";

const possibleAction = new GenericPossibleAction({
    subject: "John",
    actionName: "buy_action",
    fieldSpecs: [
        { logBookField: "foo" },
        { logBookField: "bar" },
    ]
});

describe("GenericPossibleAction", () => {
    it("can validate that all fields have been supplied", () => {
        assert.ok(possibleAction.areParemetersValid({
            foo: 1,
            bar: "bla",
        }));

        assert.ok(!possibleAction.areParemetersValid({
            foo: 1,
        }));

        assert.ok(!possibleAction.areParemetersValid({}));
    });

    it("can generate a log entry", () => {
        const entry = possibleAction.buildRawEntry({
            foo: true,
            bar: 23,
        });

        assert.deepEqual(entry, {
            type: "action",
            action: "buy_action",
            subject: "John",
            foo: true,
            bar: 23,
        });
    });

    it("can serialize and deserialize actions", () => {
        const newAction = GenericPossibleAction.deserialize(possibleAction.serialize());
        assert.deepEqual(newAction, possibleAction);
    });

    it("can return a human readable name", () => {
        assert.deepEqual(possibleAction.toString(), "Buy Action");
    });
});