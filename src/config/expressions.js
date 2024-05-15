export function takeFirstMatch(choices, getVarValue) {
    for(const choice of choices) {
        if(evalExpression(choice.expr, getVarValue)) {
            return choice;
        }
    }
}

export function takeAllMatches(choices, getVarValue) {
    return choices.filter(choice => evalExpression(choice.expr, getVarValue));
}

export function evalExpression(expression, getVarValue) {
    if(expression === undefined) {
        return true;
    }

    const value = getVarValue(expression.var);

    if(expression.eq !== undefined) {
        return value === expression.eq;
    }

    if(expression.neq !== undefined) {
        return value !== expression.neq;
    }

    if(expression.lt !== undefined) {
        return value < expression.lt;
    }

    if(expression.gt !== undefined) {
        return value > expression.gt;
    }

    if(expression.le !== undefined) {
        return value <= expression.le;
    }

    if(expression.ge !== undefined) {
        return value >= expression.ge;
    }

    throw new Error(`Unsupported expression ${JSON.stringify(expression)}`);
}