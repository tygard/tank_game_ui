import { useEffect, useState } from "preact/hooks";

// Game board needs to be able to set the internal state of submit turn.  This is not best practice
// but implementing it a more "proper" way would complicate the code way more.  I couldn't find a good
// way to achieve this using functional comonents so this calls stores the state that's shared between the two.
class TargetSelectionState {
    constructor() {
        this.isSelectingTargets = false;
    }

    clearPossibleTargets() {
        console.log("Clear");
        this.setPossibleTargets(undefined);
        this.setSelectedTarget(undefined);
    }

    setPossibleTargets(value) {
        this.possibleTargets = value;
        if(this._possibleTargetsCb) this._possibleTargetsCb(value);
    }

    setSelectedTarget(value) {
        this.selectedTarget = value;
        if(this._selectedTargetCb) this._selectedTargetCb(value);
        if(this._selectedTargetCbUse) this._selectedTargetCbUse(value);
    }

    usePossibleTargets() {
        const [value, setValue] = useState(this._possibleTargets);

        useEffect(() => {
            this._possibleTargetsCb = setValue;

            return () => this._possibleTargetsCb = undefined;
        }, [setValue])

        return value;
    }

    useSelectedTarget() {
        const [value, setValue] = useState(this._selectedTarget);

        useEffect(() => {
            this._selectedTargetCbUse = setValue;

            return () => this._selectedTargetCbUse = undefined;
        }, [setValue])

        return value;
    }

    setSelectedTargetCallback(callback) {
        this._selectedTargetCb = callback;
    }
}

export let targetSelectionState = new TargetSelectionState();