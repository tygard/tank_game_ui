# Tank Game

## Running release builds

For a quick and easy demo run `docker run --rm -it -p 3333:3333 --init ghcr.io/tankgameorg/ui` and visit [localhost:3333](http://localhost:3333/).  This has a sample game but will not save your changes across container restarts.

If you plan on using open hours make sure to add `-e TZ="<your locale>"` i.e. `docker run --rm -it -p 3333:3333 -e TZ=America/New_York --init ghcr.io/tankgameorg/ui`

If you want to save your games run run `docker run --rm -it -p 3333:3333 -v <path to your data folder>:/data --init ghcr.io/tankgameorg/ui` where <path to your data folder> is the absolute path to your data folder (if you're not sure `$(pwd)/tank-game` is a good start).

### Running releases with a custom tank game jar

You can sepecify a custom tank game engine with `TANK_GAME_ENGINE_COMMAND` or by placing a jar in `/app/engine/` ex `docker run --rm -it -p 3333:3333 --init -v $(pwd):/app/engine ghcr.io/tankgameorg/ui`.

### Debugging

If you encounter a strange behavior you can enter debug mode by typing `up arrow` `up arrow` `down arrow` `down arrow` `left arrow` `right arrow` which will display the extra state information which can be useful for debugging.

## Developing

1. Setup your environment
  * If you're using vscode install the dev containers extension and reopen in dev container. (go to step 2)
  * If you're not using vscode, checkout the engine submodule `git submodule init`, and `git submodule update`
  * Then build the engine `cd engine` and `mvn compile package`
  * Install the UI dependencies `npm install` (from the repo root)
2. Run `npm run develop-frontend` and `npm run develop-backend` to start the development servers.  Vscode users can run Ctrl+Shift+P Run task and select the corresponding tasks.
3. Then navigate to http://localhost:3000/.

When checking out new versions of tank game you may need to rerun step 1.  Vscode users can type Ctrl+Shift+P Rebuild Container.