import assert from "node:assert";
import { NamedFactorySet } from "../../../src/game/possible-actions/index.js";
import { GenericPossibleAction } from "../../../src/game/possible-actions/generic-possible-action.js";
import { LogFieldSpec } from "../../../src/game/possible-actions/log-field-spec.js";
import { buildTurnReducer, makeInitalState, resetPossibleActions, selectActionType, selectLocation, setActionSpecificField, setLastError, setLastRollEntry, setPossibleActions, setSubject } from "../../../src/interface-adapters/build-turn.js";

const swappingBaseSpec = new LogFieldSpec({
    name: "pick",
    type: "select",
    options: ["field", "thing", "yep"],
});

const swappingFieldSpec = new LogFieldSpec({
    name: "field",
    type: "select-position",
    options: ["A1", "B2", "C3"],
});

const swappingThingSpec = new LogFieldSpec({
    name: "thing",
    type: "input",
});

const swappingYepSpec = [
    new LogFieldSpec({
        name: "a",
        type: "input-number",
    }),
    new LogFieldSpec({
        name: "b",
        type: "select",
        options: ["only"],
    }),
];

class SwappingPossibleAction extends GenericPossibleAction {
    constructor() {
        super({ actionName: "swapper" })
    }

    getParameterSpec(currentLogEntry) {
        let specs = [swappingBaseSpec];

        switch(currentLogEntry?.pick) {
            case "field":
                specs.push(swappingFieldSpec);
                break;

            case "thing":
                specs.push(swappingThingSpec);
                break;

            case "yep":
                specs = specs.concat(swappingYepSpec);
                break;
        }

        return specs;
    }
}

const mutliplyFieldSpecs = [
    new LogFieldSpec({
        name: "left",
        type: "input-number",
    }),
    new LogFieldSpec({
        name: "right",
        type: "input-number",
    }),
];

const shootLocations = ["A3", "J12", "H1", "D7"];

const shootFieldSpecs = [
    new LogFieldSpec({
        name: "location",
        type: "select-position",
        options: shootLocations,
    }),
    new LogFieldSpec({
        name: "hit",
        type: "select",
        options: [true, false],
    }),
];

const possibleActions = new NamedFactorySet(
    new GenericPossibleAction({
        actionName: "shoot",
        fieldSpecs: shootFieldSpecs,
    }),
    new GenericPossibleAction({
        actionName: "make-team",
        fieldSpecs: [
            new LogFieldSpec({
                name: "team",
                type: "input",
            }),
        ],
    }),
    new GenericPossibleAction({
        actionName: "multiply",
        fieldSpecs: mutliplyFieldSpecs,
    }),
    new SwappingPossibleAction(),
);

function deepFreeze(object) {
    if(typeof object == "object") {
        Object.freeze(object);

        for(const key of Object.keys(object)) {
            deepFreeze(object[key]);
        }
    }
}

function compareState(state, expected) {
    deepFreeze(state);
    state = Object.assign({}, state);
    delete state._possibleActions;
    delete state._currentFactory;

    assert.deepEqual(state, expected);
}

const actions = [
    { name: "shoot" },
    { name: "make-team" },
    { name: "multiply" },
    { name: "swapper" },
];

describe("BuildTurn", () => {
    it("can build basic actions", () => {
        let state = makeInitalState();
        state = buildTurnReducer(state, setSubject("Teddy"));
        state = buildTurnReducer(state, setPossibleActions(possibleActions));

        compareState(state, {
            lastError: undefined,
            subject: "Teddy",
            actions,
            lastRollEntry: undefined,
            currentSpecs: [],
            isValid: false,
            locationSelector: {
                isSelecting: false,
            },
            logBookEntry: {},
            uiFieldValues: {}
        });

        state = buildTurnReducer(state, selectActionType("multiply"));

        compareState(state, {
            lastError: undefined,
            subject: "Teddy",
            actions,
            lastRollEntry: undefined,
            currentActionName: "multiply",
            currentSpecs: mutliplyFieldSpecs,
            isValid: false,
            locationSelector: {
                isSelecting: false,
            },
            logBookEntry: {
                type: "action",
                subject: "Teddy",
                action: "multiply",
                left: undefined,
                right: undefined,
            },
            uiFieldValues: {}
        });

        state = buildTurnReducer(state, setActionSpecificField("left", 5));
        state = buildTurnReducer(state, setActionSpecificField("right", 8));

        compareState(state, {
            lastError: undefined,
            subject: "Teddy",
            actions,
            lastRollEntry: undefined,
            currentActionName: "multiply",
            currentSpecs: mutliplyFieldSpecs,
            isValid: true,
            locationSelector: {
                isSelecting: false,
            },
            logBookEntry: {
                type: "action",
                subject: "Teddy",
                action: "multiply",
                left: 5,
                right: 8,
            },
            uiFieldValues: {
                left: 5,
                right: 8,
            }
        });

        state = buildTurnReducer(state, selectActionType("shoot"));

        compareState(state, {
            lastError: undefined,
            subject: "Teddy",
            actions,
            lastRollEntry: undefined,
            currentActionName: "shoot",
            currentSpecs: shootFieldSpecs,
            isValid: false,
            locationSelector: {
                isSelecting: true,
                _specName: "location",
                selectableLocations: shootLocations,
            },
            logBookEntry: {
                type: "action",
                subject: "Teddy",
                action: "shoot",
                location: undefined,
                hit: undefined,
            },
            uiFieldValues: {}
        });

        state = buildTurnReducer(state, setActionSpecificField("hit", true));

        compareState(state, {
            lastError: undefined,
            subject: "Teddy",
            actions,
            lastRollEntry: undefined,
            currentActionName: "shoot",
            currentSpecs: shootFieldSpecs,
            isValid: false,
            locationSelector: {
                isSelecting: true,
                _specName: "location",
                selectableLocations: shootLocations,
            },
            logBookEntry: {
                type: "action",
                subject: "Teddy",
                action: "shoot",
                location: undefined,
                hit: true,
            },
            uiFieldValues: {
                hit: true,
            }
        });

        state = buildTurnReducer(state, selectLocation("J12"));

        compareState(state, {
            lastError: undefined,
            subject: "Teddy",
            actions,
            lastRollEntry: undefined,
            currentActionName: "shoot",
            currentSpecs: shootFieldSpecs,
            isValid: true,
            locationSelector: {
                isSelecting: true,
                _specName: "location",
                selectableLocations: shootLocations,
                location: "J12"
            },
            logBookEntry: {
                type: "action",
                subject: "Teddy",
                action: "shoot",
                location: "J12",
                hit: true,
            },
            uiFieldValues: {
                hit: true,
            }
        });
    });

    it("can reset its state", () => {
        let state = makeInitalState();
        state = buildTurnReducer(state, setSubject("Pam"));
        state = buildTurnReducer(state, setPossibleActions(possibleActions));
        state = buildTurnReducer(state, selectActionType("shoot"));
        state = buildTurnReducer(state, setActionSpecificField("hit", false));
        state = buildTurnReducer(state, selectLocation("H1"));
        const preResetState = state = buildTurnReducer(state, setLastRollEntry("foo"));

        compareState(preResetState, {
            lastError: undefined,
            subject: "Pam",
            actions,
            lastRollEntry: "foo",
            currentSpecs: shootFieldSpecs,
            currentActionName: "shoot",
            isValid: true,
            locationSelector: {
                isSelecting: true,
                _specName: "location",
                selectableLocations: shootLocations,
                location: "H1"
            },
            logBookEntry: {
                type: "action",
                subject: "Pam",
                action: "shoot",
                location: "H1",
                hit: false,
            },
            uiFieldValues: {
                hit: false,
            }
        });

        state = buildTurnReducer(preResetState, resetPossibleActions());

        compareState(state, {
            lastError: undefined,
            subject: "Pam",
            actions: [],
            lastRollEntry: undefined,
            currentSpecs: [],
            isValid: false,
            locationSelector: {
                isSelecting: false,
            },
            logBookEntry: {},
            uiFieldValues: {}
        });

        state = buildTurnReducer(preResetState, setSubject("Walter"));

        compareState(state, {
            lastError: undefined,
            subject: "Walter",
            actions,
            lastRollEntry: undefined,
            currentSpecs: [],
            isValid: false,
            locationSelector: {
                isSelecting: false,
            },
            logBookEntry: {},
            uiFieldValues: {}
        });

        state = buildTurnReducer(preResetState, setPossibleActions(undefined));

        compareState(state, {
            lastError: undefined,
            subject: "Pam",
            lastRollEntry: "foo",
            actions: [],
            currentSpecs: [],
            isValid: false,
            locationSelector: {
                isSelecting: false,
            },
            logBookEntry: {},
            uiFieldValues: {}
        });

        state = buildTurnReducer(preResetState, setPossibleActions(possibleActions));

        compareState(state, {
            lastError: undefined,
            subject: "Pam",
            lastRollEntry: "foo",
            actions,
            currentSpecs: [],
            isValid: false,
            locationSelector: {
                isSelecting: false,
            },
            logBookEntry: {},
            uiFieldValues: {}
        });
    });

    it("can handle specs changing as values are set", () => {
        let state = makeInitalState();
        state = buildTurnReducer(state, setSubject("George"));
        state = buildTurnReducer(state, setPossibleActions(possibleActions));
        state = buildTurnReducer(state, selectActionType("swapper"));

        compareState(state, {
            lastError: undefined,
            subject: "George",
            actions,
            lastRollEntry: undefined,
            currentSpecs: [swappingBaseSpec],
            currentActionName: "swapper",
            isValid: false,
            locationSelector: {
                isSelecting: false,
            },
            logBookEntry: {
                type: "action",
                action: "swapper",
                subject: "George",
                pick: undefined,
            },
            uiFieldValues: {},
        });

        state = buildTurnReducer(state, setActionSpecificField("pick", "field"));

        compareState(state, {
            lastError: undefined,
            subject: "George",
            actions,
            lastRollEntry: undefined,
            currentSpecs: [swappingBaseSpec, swappingFieldSpec],
            currentActionName: "swapper",
            isValid: false,
            locationSelector: {
                isSelecting: true,
                _specName: "field",
                selectableLocations: ["A1", "B2", "C3"],
            },
            logBookEntry: {
                type: "action",
                action: "swapper",
                subject: "George",
                pick: "field",
                field: undefined,
            },
            uiFieldValues: {
                pick: "field",
            },
        });

        state = buildTurnReducer(state, selectLocation("B2"));
        state = buildTurnReducer(state, setActionSpecificField("pick", "yep"));

        compareState(state, {
            lastError: undefined,
            subject: "George",
            actions,
            lastRollEntry: undefined,
            currentSpecs: [swappingBaseSpec, ...swappingYepSpec],
            currentActionName: "swapper",
            isValid: false,
            locationSelector: {
                isSelecting: false,
            },
            logBookEntry: {
                type: "action",
                action: "swapper",
                subject: "George",
                pick: "yep",
                a: undefined,
                b: "only",
            },
            uiFieldValues: {
                pick: "yep",
                b: "only",
            },
        });

        state = buildTurnReducer(state, setActionSpecificField("pick", "thing"));

        compareState(state, {
            lastError: undefined,
            subject: "George",
            actions,
            lastRollEntry: undefined,
            currentSpecs: [swappingBaseSpec, swappingThingSpec],
            currentActionName: "swapper",
            isValid: false,
            locationSelector: {
                isSelecting: false,
            },
            logBookEntry: {
                type: "action",
                action: "swapper",
                subject: "George",
                pick: "thing",
                thing: undefined,
            },
            uiFieldValues: {
                pick: "thing",
            },
        });
    });

    it("can set the turn state and have it reset by another action", () => {
        let state = makeInitalState();
        assert.equal(state.lastError, undefined);
        state = buildTurnReducer(state, setLastError("Something went wrong"));
        assert.equal(state.lastError, "Something went wrong");
        state = buildTurnReducer(state, setLastError("It happened again maybe we should fix it"));
        assert.equal(state.lastError, "It happened again maybe we should fix it");
        state = buildTurnReducer(state, setSubject(undefined));
        assert.equal(state.lastError, undefined);
    });
});
