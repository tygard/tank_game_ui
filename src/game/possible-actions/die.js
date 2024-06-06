class Die {
    constructor({ name, namePlural, sides }) {
        this.name = name;
        this.namePlural = namePlural || name + "s";
        this.sides = sides;

        this._displayToRaw = {};
        this._rawToDisplay = {};
        this.sideNames = [];
        for(const side of sides) {
            const display = side.display !== undefined ? side.display : side;
            const value = side.value !== undefined ? side.value : side;
            this.sideNames.push(display);
            this._displayToRaw[display] = value;
            this._rawToDisplay[value] = { display, icon: side.icon };
        }
    }

    roll() {
        const sideIdx = Math.floor(Math.random() * this.sides.length);
        return this.sides[sideIdx].value;
    }

    translateValue(display) {
        return this._displayToRaw[display];
    }

    getSideFromValue(value) {
        return this._rawToDisplay[value];
    }
}


export class Dice {
    constructor(count, dieName) {
        this.count = count;
        this.die = commonDice[dieName];
    }

    static expandAll(dice) {
        return dice.flatMap(dice => dice.expandDice());
    }

    static deserialize(rawDice) {
        return new Dice(rawDice.count, rawDice.die);
    }

    serialize() {
        return {
            count: this.count,
            die: this.die.name,
        };
    }

    expandDice() {
        let dice = [];
        for(let i = 0; i < this.count; ++i) {
            dice.push(this.die);
        }
        return dice;
    }

    toString() {
        const dieName = this.count == 1 ? this.die.name : this.die.namePlural;
        return `${this.count}x ${dieName}`;
    }
}

const commonDice = {
    "hit die": new Die({
        name: "hit die",
        namePlural: "hit dice",
        sides: [
            { display: "hit", value: true, icon: "hit" },
            { display: "miss", value: false, icon: "" },
        ]
    }),
};
