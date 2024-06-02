
import assert from "node:assert";
import { loadGameFromFile } from "../../../src/drivers/game-file.js";
import { logger } from "#platform/logging.js";
import { buildTurnReducer, makeInitalState, selectActionType, selectLocation, setActionSpecificField, setPossibleActions, setSubject } from "../../../src/interface-adapters/build-turn.js";

// Random numbers to give input-number fields
const NUMBERS_TO_TRY = [1, 2, 3];


async function buildAllDieRolls(actionBuilder, specIdx, dieIdx, dieSides, callback) {
    const spec = actionBuilder.currentSpecs[specIdx];

    // We've filled out this die continue filling out the action
    if(dieIdx === spec.expandedDice.length) {
        const value = {
            manual: true,
            dice: dieSides,
        };

        const currentBuilder = buildTurnReducer(actionBuilder, setActionSpecificField(spec.name, value));

        await buildAllPossibleActions(currentBuilder, specIdx + 1, callback);
        return;
    }

    const die = spec.expandedDice[dieIdx];

    for(const sideName of die.sideNames) {
        const currentSides = [...dieSides, sideName];
        await buildAllDieRolls(actionBuilder, specIdx, dieIdx + 1, currentSides, callback);
    }
}

async function buildAllPossibleActions(actionBuilder, specIdx, callback) {
    // We've built a full action spit it out
    if(specIdx == actionBuilder.currentSpecs.length) {
        await callback(actionBuilder);
        return;
    }

    const spec = actionBuilder.currentSpecs[specIdx];

    if(spec.type == "roll-dice") {
        // Build and submit a turn with an automatic roll
        const currentBuilder = buildTurnReducer(actionBuilder,
            setActionSpecificField(spec.name, { manual: false }));

        await buildAllPossibleActions(currentBuilder, specIdx + 1, callback);

        // Build all possible manual rolls
        await buildAllDieRolls(actionBuilder, specIdx, 0, [], callback);
        return;
    }

    const options = spec.type == "input-number" ? NUMBERS_TO_TRY : spec.options;

    // nothing to iterate
    if(!options?.length) {
        return;
    }

    for(const option of options) {
        let currentBuilder;
        if(spec.type == "select-position") {
            currentBuilder = buildTurnReducer(actionBuilder, selectLocation(option));
        }
        else {
            currentBuilder = buildTurnReducer(actionBuilder, setActionSpecificField(spec.name, option));
        }

        await buildAllPossibleActions(currentBuilder, specIdx + 1, callback);
    }
}

export async function testPossibleActions(createEngine, possibleActionsPath) {
    let lastTime = 0;
    const makeTimeStamp = () => {
        lastTime += 20 * 60; // 20 minutes in seconds
        return lastTime;
    };

    const interactor = await loadGameFromFile(possibleActionsPath, createEngine, {makeTimeStamp});
    try {
        const logBook = interactor.getLogBook();
        const lastId = logBook.getLastEntryId();

        const players = interactor.getGameStateById(lastId).players.getAllPlayers();
        if(players.length === 0) {
            throw new Error("Expected at least on player");
        }

        for(const player of players) {
            const factories = await interactor.getActions(player.name);

            let actionBuilder = buildTurnReducer(makeInitalState(), setSubject(player.name));
            actionBuilder = buildTurnReducer(actionBuilder, setPossibleActions(factories));

            for(const action of actionBuilder.actions) {
                actionBuilder = buildTurnReducer(actionBuilder, selectActionType(action.name));

                let actionsAttempted = 0;
                await buildAllPossibleActions(actionBuilder, 0, async finalizedBuilder => {
                    if(finalizedBuilder.isValid) {
                        ++actionsAttempted;

                        logger.info({
                            msg: "Testing action",
                            logEntry: finalizedBuilder.logEntry,
                        });

                        // It's possible that a possible action could fail due to players not having
                        // enough resouces so we can rettry until one passes.  We just care that
                        // it can generate at least one valid action
                        assert.ok(await interactor.canProcessAction(finalizedBuilder.logBookEntry),
                            `Processing ${JSON.stringify(finalizedBuilder.logBookEntry, null, 4)}`);
                    }
                    else {
                        logger.warn({
                            msg: `Failed to build a possible action for ${action.name}`,
                            finalizedBuilder,
                        });
                    }
                });

                assert.ok(actionsAttempted > 0, `Didn't attempt any actions for ${player.name} ${action.name}`);
            }
        }
    }
    finally {
        await interactor.shutdown();
    }
}