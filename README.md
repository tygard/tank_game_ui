# Tank Game

## Developing

If you're using vscode open the devcontainer.  Then run `cd frontend && npm run serve` and `cd backend && npm run develop` to start the development servers.  Then navigate to http://localhost:3000/.

## Building and running

To build run `scripts/build`

To run `docker run --rm -it -p 3333:3333 --init ryan3r/tank-game` and visit [localhost:3333](http://localhost:3333/). You can sepecify a custom tank game jar with `TANK_GAME_JAR_PATH` ex `docker run --rm -it -p 3333:3333 --init -e TANK_GAME_JAR_PATH=/mnt/tank_game.jar -v /mnt:/mnt ryan3r/tank-game`.
