#!/usr/bin/env node

/**
 * Module dependencies.
 */

import program = require('commander');
require('colors');
let version = require('../package').version;
let firstArg: string | undefined = undefined
let secondArg: string = undefined!;

function list(val: string) {
    return val.split(',');
}

program
    .version(version)
    .arguments('<cmd> <file>')
    .option('-p, --parameters <items>', 'List of params', list)
    .option('-p, --pseudo <items>', 'List of pseudo overrides', list)
    .option('-G, --no-guess-parameters', 'Fail validation if a parameter with no Default is not passed')
    .action(function (arg1, arg2) {
        firstArg = arg1;
        secondArg = arg2;
    });


program.parse(process.argv);

if (typeof firstArg === 'undefined') {
    console.error('no command given!');
    process.exit(1);
}

import validatorBaseImport = require('./validator');
import docsBaseImport = require('./docs');

if(firstArg == "validate"){

    const validator = require('./validator') as typeof validatorBaseImport;

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

    const options = {
        guessParameterValues: (program.guessParameters !== false)
    };

    let result = validator.validateFile(secondArg, options);
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
        process.exit(1)
    }else{
        console.log('Template valid!'.green);
        process.exit(0)
    }

}else if(firstArg == "docs"){
    const docs = require('./docs') as typeof docsBaseImport;
    console.log(docs.getDoc(secondArg))
}
