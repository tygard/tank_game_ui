import { GenericPossibleAction } from "../../game/possible-actions/generic-possible-action.js";
import { prettyifyName } from "../../utils.js";
import { logger } from "#platform/logging.js";

export class JavaEngineSource {
    constructor(engine) {
        this._engine = engine;
    }

    async getActionFactoriesForPlayer({playerName, gameState, interactor}) {
        const player = gameState.players.getPlayerByName(playerName);
        if(!player) return [];

        const isCouncil = ["senator", "councilor"].includes(player.type);
        const subject = playerName;

        await interactor.sendPreviousState();
        let possibleActions = await this._engine.getPossibleActions(isCouncil ? "Council" : playerName);

        return possibleActions.map(possibleAction => {
            const actionName = possibleAction.rule || possibleAction.name;
            const fieldSpecs = this._buildFieldSpecs(possibleAction.fields);

            // There is no way this action could be taken
            if(!fieldSpecs) return;

            return new GenericPossibleAction({
                subject,
                actionName: actionName,
                fieldSpecs,
            });
        })

        // Remove any actions that can never be taken
        .filter(possibleAction => possibleAction !== undefined);
    }

    _buildFieldSpecs(fields) {
        let unSubmitableAction = false;
        const specs = fields.map(field => {
            const commonFields = {
                name: prettyifyName(field.name),
                logBookField: field.name,
            };

            // No possible inputs for this action
            if(field.range?.length === 0) {
                unSubmitableAction = true;
                return undefined;
            }

            // Handle the custom data types
            if(field.data_type == "tank") {
                return {
                    type: "select-position",
                    options: field.range.map(tank => {
                        const position = tank.entities?.[0]?.position?.humanReadable || tank.position;
                        if(typeof position !== "string") {
                            logger.error({
                                msg: "Expected a object with position or player",
                                obj: tank,
                            });
                            throw new Error(`Got bad data expected a position but got ${position}`);
                        }

                        return {
                            position,
                            value: tank.name,
                        };
                    }),
                    ...commonFields,
                };
            }

            if(field.data_type == "position") {
                return {
                    type: "select-position",
                    options: field.range.map(position => ({ position, value: position })),
                    ...commonFields,
                };
            }

            // Generic data type with a list of options
            if(field.range?.length > 0) {
                let options = field.range;

                if(field.data_type == "boolean") {
                    options = [true, false];
                }

                return {
                    type: "select",
                    options,
                    ...commonFields,
                };
            }

            // Data types with no options
            if(field.data_type == "integer") {
                return {
                    type: "input-number",
                    ...commonFields,
                };
            }

            return {
                type: "input",
                ...commonFields,
            };
        });

        return unSubmitableAction ? undefined : specs;
    }
}
