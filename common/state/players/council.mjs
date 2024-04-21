export class Council {
    constructor(coffer) {
        this.coffer = coffer;
    }

    static deserialize(rawCouncil) {
        return new Council(rawCouncil.coffer);
    }

    serialize() {
        return {
            coffer: this.coffer,
        };
    }
}