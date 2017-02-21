#!/usr/bin/env node

/**
 * Module dependencies.
 */

let program = require('commander');
let firstArg, secondArg = null;

program
    .version('0.0.1')
    .arguments('<cmd> <file>')
    .action(function (arg1, arg2) {
        firstArg = arg1;
        secondArg = arg2;
    });

program.parse(process.argv);

if (typeof firstArg === 'undefined') {
    console.error('no command given!');
    process.exit(1);
}

if(firstArg == "validate"){
    const validator = require('./validator');
    // TODO Add parameter override using flags
    console.log(validator.validateFile(secondArg))
}else if(firstArg == "docs"){
    const docs = require('./docs');
    console.log(docs.getDoc(secondArg))
}
