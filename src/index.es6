#!/usr/bin/env node

/**
 * Module dependencies.
 */

let program = require('commander');
let colors = require('colors');
let firstArg, secondArg, params = null;

function list(val) {
    return val.split(',');
}

program
    .version('0.0.1')
    .arguments('<cmd> <file>')
    .option('-p, --parameters <items>', 'List of params', list)
    .option('-p, --pseudo <items>', 'List of pseudo overrides', list)
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

    if(program.parameters){
        for(let param of program.parameters){
            // Set the parameter
            let kv = param.split('=');
            validator.addParameterValue(kv[0], kv[1]);
        }
    }

    if(program.pseudo){
        for(let pseudo of program.pseudo){
            // Set the parameter
            let kv = pseudo.split('=');
            validator.addPseudoValue(kv[0], kv[1]);
        }
    }

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
