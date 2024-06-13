import { buildDeserializer } from "../../utils.js";
import { DiceLogFieldSpec } from "./dice-log-field-spec.js";
import { GenericPossibleAction } from "./generic-possible-action.js";
import { LogFieldSpec } from "./log-field-spec.js";
import { ShootAction } from "./shoot.js";
import { StartOfDayFactory } from "./start-of-day-source.js";


// Build the default registry with all of the action types
const possibleActionsDeserializer = buildDeserializer([
    StartOfDayFactory,
    GenericPossibleAction,
    ShootAction,
]);


export class NamedFactorySet {
    constructor(...actions) {
        this._actionsByName = {};
        for(const action of actions) {
            this._mapActionToName(action);
        }
    }

    *[Symbol.iterator]() {
        for(const action of Object.values(this._actionsByName)) {
            yield action;
        }
    }

    push(action) {
        this._mapActionToName(action);
    }

    _mapActionToName(action) {
        const name = action.getActionName();

        if(this._actionsByName[name]) {
            throw new Error(`Multiple actions name ${name} (types = [${this._actionsByName[name].type}, ${action.type}])`);
        }

        this._actionsByName[name] = action;
    }

    serialize() {
        return Object.values(this._actionsByName).map(factory => {
            return {
                type: factory.type,
                ...factory.serialize()
            };
        });
    }

    static deserialize(factories, deserializer = possibleActionsDeserializer) {
        const f = factories.map(rawFactory => deserializer(rawFactory));
        return new NamedFactorySet(
            ...f,
        );
    }

    get(actionName) {
        return this._actionsByName[actionName];
    }
}

export class PossibleActionSourceSet {
    constructor(sources) {
        this._sources = sources;
    }

    addSource(source) {
        this._sources.push(source);
    }

    async getActionFactoriesForPlayer(params) {
        let factorySet = new NamedFactorySet();

        for(const source of this._sources) {
            const factories = await source.getActionFactoriesForPlayer(params);
            for(const factory of factories) factorySet.push(factory);
        }

        return factorySet;
    }
}
