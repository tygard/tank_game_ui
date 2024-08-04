import "./generic-possible-action.js";
import  "./shoot.js";
import  "./start-of-day-source.js";

export class PossibleActionSourceSet {
    constructor(sources) {
        this._sources = sources;
    }

    addSource(source) {
        this._sources.push(source);
    }

    async getActionFactoriesForPlayer(params) {
        let factorySet = [];

        for(const source of this._sources) {
            const factories = await source.getActionFactoriesForPlayer(params);
            for(const factory of factories) factorySet.push(factory);
        }

        return factorySet;
    }
}
