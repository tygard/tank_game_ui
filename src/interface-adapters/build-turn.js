import { useReducer } from "preact/hooks";

export function makeInitalState() {
    return {
        actions: [],
        currentSpecs: [],
        uiFieldValues: {},
        locationSelector: {
            isSelecting: false,
        },
        isValid: false,
        logBookEntry: {},
        lastError: undefined,
        lastRollEntry: undefined,
        loading: true,
    };
}

function buildLogEntry(state, currentSpecs, locationSelector) {
    // Build the log book entry from the UI values
    let logBookEntry = {
        subject: state.subject,
        action: state._currentFactory.getActionName(),
    };

    for(const spec of currentSpecs) {
        const value = spec.name == locationSelector._specName ?
            locationSelector.locations?.[0] :
            state.uiFieldValues[spec.name];

        logBookEntry[spec.name] = spec.translateValue(value);
    }

    return logBookEntry;
}

function pruneUiFields(currentSpecs, uiFieldValues) {
    uiFieldValues = Object.assign({}, uiFieldValues);

    let keys = new Set(Object.keys(uiFieldValues));
    for(const spec of currentSpecs) {
        keys.delete(spec.name);
    }

    for(const key of keys) {
        delete uiFieldValues[key];
    }

    return uiFieldValues;
}

function fillDefaultFieldValues(currentSpecs, uiFieldValues) {
    for(const spec of currentSpecs) {
        if(spec.options?.length == 1) {
            uiFieldValues[spec.name] = spec.options[0];
        }
    }

    return uiFieldValues;
}

function updateActionData(state) {
    if(!state._currentFactory) {
        throw new Error("An action must be selected before modifing action fields");
    }

    // Build the entry to inform our factory
    let logBookEntry = buildLogEntry(state, state.currentSpecs, state.locationSelector);
    const currentSpecs = state._currentFactory.getParameterSpec(logBookEntry);

    // Configure the location selector with the new specs
    let locationSelector = {
        isSelecting: false,
    };

    const locationSpecs = currentSpecs.filter(spec => spec.type == "select-position");
    if(locationSpecs.length == 1) {
        locationSelector.isSelecting = true;
        locationSelector.selectableLocations = locationSpecs[0].options;
        locationSelector._specName = locationSpecs[0].name;

        // Reuse the location if it still makes sense
        if(locationSelector._specName == state.locationSelector._specName &&
                state.locationSelector.locations !== undefined &&
                locationSelector.selectableLocations.includes(state.locationSelector.locations[0])) {
            locationSelector.locations = state.locationSelector.locations;
        }
    }
    else if(locationSpecs.length > 1) {
        throw new Error("Only one select-position is allowed at a time");
    }

    state = {
        ...state,
        uiFieldValues:
            fillDefaultFieldValues(currentSpecs,
                pruneUiFields(currentSpecs, state.uiFieldValues)),
    };

    // Rebuild the log entry with the updated specs and locations
    logBookEntry = buildLogEntry(state, currentSpecs, locationSelector);

    return {
        ...state,
        currentSpecs,
        locationSelector,
        logBookEntry,
        isValid: state._currentFactory.isValidEntry(logBookEntry),
    };
}

export function buildTurnReducer(state, invocation) {
    if(invocation.type == "set-last-error") {
        return {
            ...state,
            lastError: invocation.error,
        };
    }
    else {
        // Clear the last error on any user interaction
        state = {
            ...state,
            lastError: undefined,
        };
    }

    if(invocation.type == "set-last-roll-entry") {
        return {
            ...state,
            lastRollEntry: invocation.lastRollEntry,
        };
    }
    else if(invocation.type != "set-possible-actions") {
        // Reset for anything except for possible actions being set
        state = {
            ...state,
            lastRollEntry: undefined,
        };
    }

    if(invocation.type == "set-subject") {
        return {
            ...makeInitalState(),
            subject: invocation.subject,
            loading: state._possibleActions === undefined,
            _possibleActions: state._possibleActions,
            actions: state.actions,
        }
    }
    else if(invocation.type == "set-possible-actions") {
        return {
            ...makeInitalState(),
            subject: state.subject,
            loading: invocation.possibleActions === undefined,
            _possibleActions: invocation.possibleActions,
            lastRollEntry: state.lastRollEntry,
            actions: Array.from(invocation.possibleActions || []).map(factory => ({
                name: factory.getActionName(),
            })),
        };
    }
    else if(invocation.type == "reset") {
        return {
            ...makeInitalState(),
            subject: state.subject,
        };
    }

    // No possible actions reset our state
    if(state._possibleActions === undefined || state.subject === undefined) {
        return makeInitalState();
    }

    let currentFactory;
    switch(invocation.type) {
        case "select-action-type":
            currentFactory = Array.from(state._possibleActions).find(factory => factory.getActionName() == invocation.actionName);
            if(!currentFactory) {
                throw new Error(`${invocation.actionName} does not match any known possible actions`);
            }

            return updateActionData({
                ...state,
                currentActionName: invocation.actionName,
                _currentFactory: currentFactory,
                locationSelector: {
                    isSelecting: false,
                },
                uiFieldValues: {},
                logBookEntry: {},
            });

        case "set-action-specific-field":
            return updateActionData({
                ...state,
                uiFieldValues: {
                    ...state.uiFieldValues,
                    [invocation.name]: invocation.value,
                }
            });

        case "select-location":
            if(!state.locationSelector.isSelecting) {
                throw new Error("Cannot select a location because location selection is not active");
            }

            return updateActionData({
                ...state,
                locationSelector: {
                    ...state.locationSelector,
                    locations: [invocation.location],
                },
            });
    }
}

export const resetPossibleActions = () => ({ type: "reset" });
export const setSubject = subject => ({ type: "set-subject", subject });
export const setPossibleActions = possibleActions => ({ type: "set-possible-actions", possibleActions });
export const selectActionType = actionName => ({ type: "select-action-type", actionName });
export const setActionSpecificField = (name, value) => ({ type: "set-action-specific-field", name, value });
export const selectLocation = location => ({ type: "select-location", location });
export const setLastError = error => ({ type: "set-last-error", error });
export const setLastRollEntry = lastRollEntry => ({ type: "set-last-roll-entry", lastRollEntry });

export function useBuildTurn() {
    return useReducer(buildTurnReducer, undefined, makeInitalState);
}