#!/usr/bin/env node

/**
 * Module dependencies.
 */

let program = require('commander');
let colors = require('colors');
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
    let result = validator.validateFile(secondArg);

    // Show the errors
    console.log((result['errors']['info'].length + " infos").grey);
    for(let info of result['errors']['info']){
        console.log('Resource: '+ info['resource'].grey);
        console.log('Message: '+ info['message'].grey);
        console.log('Documentation: '+ info['documentation'].grey + '\n');
    }

    console.log((result['errors']['warn'].length + " warn").yellow);
    for(let warn of result['errors']['warn']){
        console.log('Resource: ' + warn['resource'].yellow);
        console.log('Message: ' + warn['message'].yellow);
        console.log('Documentation: ' + warn['documentation'].yellow + '\n');
    }

    console.log((result['errors']['crit'].length + " crit").red);
    for(let crit of result['errors']['crit']){
        console.log('Resource: ' + crit['resource'].red);
        console.log('Message: ' + crit['message'].red);
        console.log('Documentation: ' + crit['documentation'].red + '\n');
    }

    if(result['templateValid'] === false){
        console.log('Template invalid!'.red.bold);
    }else{
        console.log('Template valid!'.green);
    }


}else if(firstArg == "docs"){
    const docs = require('./docs');
    console.log(docs.getDoc(secondArg))
}
