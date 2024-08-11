import { GenericPossibleAction } from "../../game/possible-actions/generic-possible-action.js";
import { logger } from "#platform/logging.js";
import { LogFieldSpec } from "../../game/possible-actions/log-field-spec.js";
import Player from "../../game/state/players/player.js";
import { Position } from "../../game/state/board/position.js";

export class JavaEngineSource {
    constructor({ actionsToSkip = [] } = {}) {
        this._actionsToSkip = new Set(actionsToSkip);
    }

    async getActionFactoriesForPlayer({playerName, gameState, engine}) {
        const player = gameState.players.getPlayerByName(playerName);
        if(!player) return [];

        let playerToRequest = playerName;
        if(!engine._isMainBranch) {
            const isCouncil = ["senator", "councilor"].includes(player.type);
            if(isCouncil) {
                playerToRequest = "Council";
            }
        }

        const possibleActions = await engine.getPossibleActions(playerToRequest);

        return possibleActions.map(possibleAction => {
            const actionName = possibleAction.rule;

            // This action will be handled by another factory
            if(this._actionsToSkip.has(actionName)) return;

            // This action can't be submitted don't generate it
            if(possibleAction.errors?.length > 0) return;

            const fieldSpecs = this._buildFieldSpecs(possibleAction.fields, gameState);

            // There is no way this action could be taken
            if(!fieldSpecs) return;

            return new GenericPossibleAction({
                subject: playerName,
                actionName: actionName,
                fieldSpecs,
            });
        })

        // Remove any actions that can never be taken
        .filter(possibleAction => possibleAction !== undefined);
    }

    _getPositionFromJava(tank) {
        return new Position(tank.$POSITION !== undefined ? tank.$POSITION : tank.position);
    }

    _buildFieldSpecs(fields, gameState) {
        let unSubmitableAction = false;
        const specs = fields.map(field => {
            const commonFields = {
                name: field.name,
            };

            // No possible inputs for this action
            if(field.range?.length === 0) {
                unSubmitableAction = true;
                return undefined;
            }

            // Handle the custom data types
            if(field.data_type == "tank") {
                return new LogFieldSpec({
                    type: "select-position",
                    options: field.range.map(tank => {
                        const entities = tank instanceof Player && gameState.getEntitiesByPlayer(tank);
                        const position = (entities?.[0]?.position || this._getPositionFromJava(tank)).humanReadable;
                        if(typeof position !== "string") {
                            logger.error({
                                msg: "Expected a object with position or player",
                                obj: tank,
                            });
                            throw new Error(`Got bad data expected a position but got ${position}`);
                        }

                        const name = tank.name || tank.$PLAYER_REF.name;

                        return {
                            position,
                            value: name,
                        };
                    }),
                    ...commonFields,
                });
            }

            if(field.data_type == "position") {
                return new LogFieldSpec({
                    type: "select-position",
                    options: field.range.map(position => {
                        position = new Position(position).humanReadable;

                        return {
                            position,
                            value: position,
                        };
                    }),
                    ...commonFields,
                });
            }

            // Generic data type with a list of options
            if(field.range?.length > 0) {
                let options = field.range;
                let description;

                return new LogFieldSpec({
                    type: "select",
                    options,
                    description,
                    ...commonFields,
                });
            }

            // Data types with no options
            if(field.data_type == "integer") {
                return new LogFieldSpec({
                    type: "input-number",
                    ...commonFields,
                });
            }

            return new LogFieldSpec({
                type: "input",
                ...commonFields,
            });
        });

        return unSubmitableAction ? undefined : specs;
    }
}
