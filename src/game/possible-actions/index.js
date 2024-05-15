import { GenericPossibleAction } from "./generic-possible-action.js";
import { StartOfDayFactory } from "./start-of-day-source.js";


export function buildRegistry(Types) {
    let registry = {};
    for(const Type of Types) {
        registry[Type.prototype.getType()] = Type;
    }

    return registry;
}

// Build the default registry with all of the action types
const defaultRegistry = buildRegistry([
    StartOfDayFactory,
    GenericPossibleAction,
]);


export class NamedFactorySet extends Array {
    serialize() {
        return this.map(factory => {
            return({
                type: factory.getType(),
                ...factory.serialize()
            })
        });
    }

    static deserialize(factories, registry = defaultRegistry) {
        return new NamedFactorySet(
            ...factories.map(rawFactory => {
                const Type = registry[rawFactory.type];

                if(!Type) {
                    throw new Error(`No action factory for ${rawFactory.type}`);
                }

                return Type.deserialize(rawFactory);
            })
        );
    }
}

export class PossibleActionSourceSet {
    constructor(sources) {
        this._sources = sources;
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
