import { logger } from "#platform/logging.js";
import { prettyifyName } from "../../utils.js";
import { getGameVersion as defaultGetGameVersion } from "../../versions/index.js";
import { AutomaticStartOfDay } from "../open-hours/automatic-start-of-day.js";
import { StartOfDaySource } from "../possible-actions/start-of-day-source.js";
import { GameInteractor } from "./game-interactor.js";


const createDefaultInteractor = opts => new GameInteractor(opts);
const createDefaultAutoStartOfDay = game => new AutomaticStartOfDay(game);


export class Game {
    constructor(opts) {
        this._state = "loading";
        this._hasBeenShutDown = false;
        this.name = opts.name;
        this.title = prettyifyName(this.name);
        this.loaded = this._initializeGame(opts.gameDataPromise);
        this._saveHandler = opts.saveHandler;
        this._factories = {
            createEngine: opts.createEngine,
            createInteractor: opts.createInteractor || createDefaultInteractor,
            getGameVersion:  opts.getGameVersion || defaultGetGameVersion,
            createAutoStartOfDay: opts.createAutoStartOfDay || createDefaultAutoStartOfDay,
        };
    }

    async _saveErrorInState(callback) {
        try {
            await callback();
        }
        catch(err) {
            logger.warn({ msg: "Failed to load game", err });
            this._state = "error";
            this._error = err.message;
            return;  // failed to load the game bail
        }
    }

    async _initializeGame(gameDataPromise) {
        await this._saveErrorInState(async () => {
            this._gameData = await gameDataPromise;
            this._openHours = this._gameData.openHours;
            this._gameSettings = this._gameData.gameSettings;

            if(this._gameData.title !== undefined) {
                this.title = this._gameData.title;
            }
        });

        if(this.getState() == "error") return;

        await this._runGame();
    }

    async _runGame() {
        await this._saveErrorInState(async () => {
            // Shutdown was called during load bail before we create the interactor
            // After this point shutdown with directly terminte the interactor
            if(this._hasBeenShutDown) return;

            const gameVersion = this._factories.getGameVersion(this._gameData.logBook.gameVersion);
            const engine = this._factories.createEngine();
            let actionFactories = gameVersion.getActionFactories(engine);

            // If we don't automate the start of day process let users submit it as an action
            if(!this.hasAutomaticStartOfDay()) {
                actionFactories.addSource(new StartOfDaySource());
            }

            this._interactor = this._factories.createInteractor({
                engine,
                gameData: this._gameData,
                saveHandler: this._saveHandler,
                onEntryAdded: this._setStateFromLastEntry.bind(this),
                actionFactories,
            });

            await this._interactor.loaded;

            this._state = "running";
        });

        // Shutdown was called while the interactor was starting bail before we start auto start of day
        // After this point shutdown with directly cancel auto start of day
        if(this._hasBeenShutDown) return;

        if(this._state == "running" && this._openHours?.hasAutomaticStartOfDay?.()) {
            this._automaticStartOfDay = this._factories.createAutoStartOfDay(this);
            this.loaded.then(() => this._automaticStartOfDay.start());
        }
    }

    getState() {
        const isGameOpen = this._openHours !== undefined ?
            this._openHours.isGameOpen() : true;

        if(!isGameOpen && this._state == "running") {
            return "off-hours";
        }

        return this._state;
    }

    _setStateFromLastEntry(entryId) {
        const {running} = this._interactor.getGameStateById(entryId);
        this._state = running ? "running" : "game-over";
    }

    _getLastState() {
        const lastEntryId = this._interactor.getLogBook().getLastEntryId();
        return this._interactor.getGameStateById(lastEntryId);
    }

    getOpenHours() {
        return this._openHours;
    }

    getStatusText() {
        if(this.getState() == "loading") {
            return "Loading...";
        }

        if(this.getState() == "error") {
            return `Failed to load: ${this._error}`;
        }

        if(this.getState() == "off-hours") {
            return "Outside of this games scheduled hours";
        }

        const logBook = this._interactor.getLogBook();

        if(this.getState() == "running") {
            const lastEntry = logBook.getEntry(logBook.getLastEntryId());
            return `Playing, last action: ${lastEntry.message}`;
        }

        if(this.getState() == "game-over") {
            const {winner} = this._getLastState();
            return `Game over, ${winner} is victorious!`;
        }
    }

    async shutdown() {
        this._hasBeenShutDown = true;

        if(this._automaticStartOfDay) {
            this._automaticStartOfDay.stop();
        }

        if(this._interactor) {
            await this._interactor.shutdown();
        }
    }

    hasAutomaticStartOfDay() {
        return !!this._automaticStartOfDay;
    }

    getInteractor() {
        if(!this._interactor) {
            throw new Error(`Game '${this.name}' is in the state ${this.getState()} and does not have an interactor. (status = ${this.getStatusText()})`);
        }

        return this._interactor;
    }

    getSettings() {
        let settings = this._gameSettings || {};

        if(settings.allowManualRolls === undefined) {
            settings.allowManualRolls = true;
        }

        return settings;
    }

    checkUserCreatedEntry(rawLogEntry) {
        if(this.getState() != "running") {
            return {
                canSubmit: false,
                error: `Cannot submit actions while the game is in the ${this.getState()} state`,
            }
        }

        if(this.hasAutomaticStartOfDay() && (rawLogEntry.day !== undefined || rawLogEntry.action == "start_of_day")) {
            return {
                canSubmit: false,
                error: "Automated start of day is enabled users may not start new days",
            };
        }

        if(!this.getSettings().allowManualRolls) {
            for(const key of Object.keys(rawLogEntry)) {
                const value = rawLogEntry[key];

                if(value?.type == "die-roll" && value?.manual) {
                    return {
                        canSubmit: false,
                        error: "Manual die rolls are disabled for this game",
                    };
                }
            }
        }

        return { canSubmit: true };
    }
}