import { useMemo } from "preact/hooks";
import { useActionTemplate } from "./game";

export function usePossibleActions(game, users, selectedUser) {
    const [actionTemplate, __] = useActionTemplate(game);

    return useMemo(() => {
        return buildPossibleActionsForUser(actionTemplate, users, selectedUser)
    }, [actionTemplate, users, selectedUser]);
}

function buildPossibleActionsForUser(actionTemplate, users, selectedUser) {
    if(!users || !actionTemplate || !selectedUser) return {};
    const user = users.usersByName[selectedUser];

    // Get the action template for this user's class
    const basicType = user.type == "senate" ? "council" : user.type;
    actionTemplate = actionTemplate[basicType];

    // No actions for this user class
    if(!actionTemplate) return {};

    let possibleActions = {};
    for(const actionName of Object.keys(actionTemplate)) {
        let uiActionSpec = possibleActions[actionName] = [];

        for(const fieldTemplate of actionTemplate[actionName].fields) {
            let uiFieldSpec = {
                name: fieldTemplate.name
            };

            uiActionSpec.push(uiFieldSpec);

            if(fieldTemplate.type == "integer") {
                uiFieldSpec.type = "input-number";
            }
            else {
                uiFieldSpec.type = "input";
            }
        }
    }

    return possibleActions;
}