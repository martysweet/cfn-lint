"use strict";
var winston = require("winston");
var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({ json: false, timestamp: true, level: 'debug' }),
    ],
    exceptionHandlers: [
        new (winston.transports.Console)({ json: false, timestamp: true }),
    ],
    exitOnError: true
});
module.exports = logger;
//# sourceMappingURL=logger.js.map