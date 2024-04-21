import assert from "node:assert";
import { NamedFactorySet, buildRegistry } from "../../../common/state/possible-actions/index.mjs";


class MockPossibleAction {
    getType() {
        return "mock-action"
    }

    static deserialize(raw) {
        return { from: "main", flag: raw.flag };
    }

    serialize() {
        return { flag: 3 };
    }
}

class OtherMockPossibleAction {
    getType() {
        return "other-mock-action"
    }

    static deserialize(raw) {
        return { from: "other", otherFlag: raw.otherFlag, };
    }

    serialize() {
        return { otherFlag: 4 };
    }
}

const testRegistry = buildRegistry([MockPossibleAction, OtherMockPossibleAction]);


describe("NamedFactorySet", () => {
    it("can deserialize raw factories to their approriate data stucture", () => {
        const deserialized = NamedFactorySet.deserialize([
            {
                type: "mock-action",
                flag: 1,
            },
            {
                type: "other-mock-action",
                otherFlag: 2,
            },
        ], testRegistry);

        assert.deepEqual(deserialized, [
            {
                from: "main",
                flag: 1,
            },
            {
                from: "other",
                otherFlag: 2,
            },
        ]);
    });

    it("can serialize factories", () => {
        const set = new NamedFactorySet(
            new MockPossibleAction(),
            new OtherMockPossibleAction(),
        );

        assert.deepEqual(set.serialize(), [
            {
                type: "mock-action",
                flag: 3,
            },
            {
                type: "other-mock-action",
                otherFlag: 4,
            },
        ]);
    });
});