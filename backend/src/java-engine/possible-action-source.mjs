import { Position } from "../../../common/state/board/position.mjs";
import { GenericPossibleAction } from "../../../common/state/possible-actions/generic-possible-action.mjs";
import { prettyifyName } from "../../../common/state/utils.mjs";

export class JavaEngineSource {
    constructor(engine) {
        this._engine = engine;
    }

    async getActionFactoriesForPlayer({playerName, gameState}) {
        const player = gameState.players.getPlayerByName(playerName);
        if(!player) return [];

        const isCouncil = ["senator", "councilor"].includes(player.type);
        const subject = playerName;

        let possibleActions;
        if(isCouncil) {
            // getPossibleActions returns an error for Senators and tank actions for councilors
            possibleActions = (await this._engine.getRules())
                .filter(action => action.subject == "council");

            this._fillInPossibleTanks(possibleActions, gameState);
        }
        else {
            await this._engine.setBoardState(gameState);
            possibleActions = await this._engine.getPossibleActions(playerName);
        }

        return possibleActions.map(possibleAction => {
            const actionName = possibleAction.rule || possibleAction.name;

            return new GenericPossibleAction({
                subject,
                actionName: actionName,
                fieldSpecs: this._buildFieldSpecs(possibleAction.fields),
            });
        });
    }

    _fillInPossibleTanks(possibleActions, gameState) {
        const tankNames = gameState.players.getPlayersByType("tank");

        for(let action of possibleActions) {
            for(let field of action.fields) {
                if(field.data_type == "tank") {
                    field.range = tankNames;
                }
            }
        }
    }

    _buildFieldSpecs(fields) {
        return fields.map(field => {
            const commonFields = {
                name: prettyifyName(field.name),
                // TODO: Fix this
                logBookField: field.name,
            };

            // Handle the custom data types
            if(field.data_type == "tank") {
                return {
                    type: "select",
                    options: field.range.map(tank => tank.name),
                    ...commonFields,
                };
            }

            if(field.data_type == "position") {
                return {
                    type: "select-position",
                    options: field.range.map(({x, y}) => new Position(x, y).humanReadable),
                    ...commonFields,
                };
            }

            // Generic data type with a list of options
            if(field.range?.length > 0) {
                return {
                    type: "select",
                    options: field.range,
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
    }
}
