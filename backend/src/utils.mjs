const FORMATTER_EXPR = /\{([^}]+)\}/g;

export function format(formatString, values) {
    return formatString.replace(FORMATTER_EXPR, (_, name) => {
        return values[name];
    });
}
