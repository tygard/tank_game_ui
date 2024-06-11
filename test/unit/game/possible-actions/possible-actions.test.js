import assert from "node:assert";
import { NamedFactorySet } from "../../../../src/game/possible-actions/index.js";
import { buildDeserializer } from "../../../../src/utils.js";


class MockPossibleAction {
    constructor(flag) {
        this.flag = flag;
        this.type = "mock-action";
    }

    getActionName() {
        return "mock";
    }

    static canConstruct(type) {
        return type == "mock-action";
    }

    static deserialize(raw) {
        return new MockPossibleAction(raw.flag);
    }

    serialize() {
        return { flag: this.flag };
    }
}

class OtherMockPossibleAction {
    constructor(otherFlag) {
        this.type = "other-mock-action";
        this.otherFlag = otherFlag;
    }

    getActionName() {
        return "other";
    }

    static canConstruct(type) {
        return type == "other-mock-action";
    }

    static deserialize(raw) {
        return new OtherMockPossibleAction(raw.otherFlag + 3);
    }

    serialize() {
        return { otherFlag: this.otherFlag };
    }
}

const testDeserializer = buildDeserializer([MockPossibleAction, OtherMockPossibleAction]);


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
        ], testDeserializer);

        assert.deepEqual(Array.from(deserialized), [
            {
                type: "mock-action",
                flag: 1,
            },
            {
                type: "other-mock-action",
                otherFlag: 5,
            },
        ]);
    });

    it("can serialize factories", () => {
        const set = new NamedFactorySet(
            new MockPossibleAction(3),
            new OtherMockPossibleAction(4),
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