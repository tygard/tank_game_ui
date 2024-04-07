# Tank Game

## Running

For a quick and easy demo run `docker run --rm -it -p 3333:3333 --init ghcr.io/ryan3r/tank_game_ui` and visit [localhost:3333](http://localhost:3333/).  This has a sample game but will not save your changes across container restarts.

If you want to save your games run run `docker run --rm -it -p 3333:3333 -v <path to your data folder>:/data --init ghcr.io/ryan3r/tank_game_ui` where <path to your data folder> is the absolute path to your data folder (if you're not sure `$(pwd)/tank-game` is a good start).

## Developing

If you're using vscode open the devcontainer.  Then run `cd frontend && npm run develop` and `cd backend && npm run develop` to start the development servers.  You may need to run `npm install` in one or both of those folders.  You will also need a copy of TankGame.jar which you can get by running `scripts/aquire_jar` outside the container or by building [TrevorBrunette/tankgame](https://github.com/TrevorBrunette/tankgame.git) directly.  Then navigate to http://localhost:3000/.

### Running with custom tank game jar

You can sepecify a custom tank game jar with `TANK_GAME_JAR_PATH` ex `docker run --rm -it -p 3333:3333 --init -e TANK_GAME_JAR_PATH=/mnt/tank_game.jar -v /mnt:/mnt ryan3r/tank-game`.
