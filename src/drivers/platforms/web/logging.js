/* global console */
export let logger = {};

function logAdaptor(logFunction, message)  {
    let args = [message];

    if(message?.msg) {
        args = [
            message.msg,
            Object.assign({}, message)
        ];
    }

    logFunction(...args);
}


for(const name of ["trace", "debug", "info", "warn", "error"]) {
    logger[name] = logAdaptor.bind(null, console[name].bind(console));
}
