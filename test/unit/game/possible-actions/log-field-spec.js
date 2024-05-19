import assert from "node:assert";
import { LogFieldSpec } from "../../../../src/game/possible-actions/log-field-spec.js";

const spec = new LogFieldSpec({
    type: "select",
    options: [
        { display: "Todd", value: 63 },
        { position: "B2", value: "Janis" },
        28,
    ]
});

describe("LogFieldSpec", () => {
    it("can translate option fields", () => {
        assert.deepEqual(spec.options, [
            "Todd",
            "B2",
            28,
        ]);

        assert.equal(spec.translateValue("Todd"), 63);
        assert.equal(spec.translateValue("B2"), "Janis");
        assert.equal(spec.translateValue(28), 28);
    });

    it("can validate user input", () => {
        assert.ok(spec.isValid(63));
        assert.ok(spec.isValid("Janis"));
        assert.ok(spec.isValid(28));
        assert.ok(!spec.isValid(undefined));
        assert.ok(!spec.isValid(93));

        const inputSpec = new LogFieldSpec({ type: "input" });
        assert.ok(inputSpec.isValid(28));
        assert.ok(inputSpec.isValid("Foo"));
        assert.ok(!inputSpec.isValid(undefined));
    });
});