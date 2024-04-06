export function buildUserList(state) {
    let usersByName = {};
    let usersByType = {};

    if(state?.gameState) {
        const gameState = state.gameState;

        processCouncil(gameState, usersByName);
        processGameBoard(gameState, usersByName);

        for(const userName of Object.keys(usersByName)) {
            const user = usersByName[userName];

            if(!usersByType[user.type]) usersByType[user.type] = [];

            usersByType[user.type].push(user);
        }
    }

    for(const type of Object.keys(usersByType)) {
        usersByType[type].sort((a, b) => a.name > b.name);
    }

    return {
        usersByName,
        usersByType,
    };
}

function processCouncil(gameState, usersByName) {
    const councilGroups = [
        [gameState.council.council, "council"],
        [gameState.council.senate, "senate"]
    ];

    for(const [users, userType] of councilGroups) {
        for(const userName of users) {
            usersByName[userName] = {
                name: userName,
                type: userType,
            };
        }
    }
}

function processGameBoard(gameState, usersByName) {
    for(const row of gameState.board.unit_board) {
        for(const space of row) {
            if(space.name && !usersByName[space.name]) {
                usersByName[space.name] = space;
            }
        }
    }
}
