export function makeMockState(obj) {
    let state = Object.create({
        board: {
            getFloorTileAt() {},
            getEntityAt() {},
        },
    });

    Object.assign(state, obj);
    return state;
}

export class MockEngine {
    constructor() {
        this._returnIdx = 1;
        this.operations = [];
        this.throwOnNext = false;
        this.processingDelays = [];
        this._currentDelay = 0;
    }

    getEngineStateFromGameState(state) {
        return makeMockState({
            converted: false,
            ...state
        });
    }

    getGameStateFromEngineState(state) {
        return {
            gameState: makeMockState({
                converted: true,
                ...state
            }),
            victoryInfo: state.victoryInfo,
        };
    }

    wereAllDelaysApplied() {
        return this.processingDelays.length == this._currentDelay;
    }

    _delayOp() {
        if(this.processingDelays) {
            return new Promise(resolve => setTimeout(resolve, this.processingDelays[this._currentDelay++]));
        }
    }

    async processAction(logEntry) {
        if(this.throwOnNext) {
            this.throwOnNext = false;
            throw new Error("Oops");
        }

        await this._delayOp();

        let extraInfo = {};
        if(logEntry.type == "victory") {
            extraInfo.victoryInfo = "bla";
        }

        this.operations.push({ operation: "process-action",  logEntry });
        return makeMockState({ stateNo: ++this._returnIdx, ...extraInfo });
    }

    async setBoardState(state) {
        await this._delayOp();
        this.operations.push({ operation: "set-state",  state });
    }

    async setGameVersion(version) {
        await this._delayOp();
        this.operations.push({ operation: "set-version", version });
    }
}
