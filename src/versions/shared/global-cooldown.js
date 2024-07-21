export function findGlobalCooldowns(gameState) {
    const now = Math.floor(Date.now() / 1000);

    return gameState.players.getAllPlayers()
        .filter(player => player.attributes.global_cooldown_end_time >= now)
        .map(player => {
            const playerName = player.name;
            const timeRemaining = (player.attributes.global_cooldown_end_time - now) + 1;

            return {
                playerName,
                timeRemaining,
            };
        });
}