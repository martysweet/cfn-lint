#!/usr/bin/env node

/**
 * Module dependencies.
 */

import program = require('commander');
require('colors');
let version = require('../package').version;
let firstArg: string | undefined = undefined
let secondArg: string = undefined!;

/**
 * Used for parsing comma separated commandline argument values whilst, taking into account backslash escapes.
 * Returns an array of strings (e.g. ["Arg1=Val1", "Arg2=Val2"]).
 */
function list(val: string) {
    // prepare for a negated lookahead
    val = val.replace(/\\,/g, ',\\');

    // split and remove escapes
    return val.split(/,(?!\\)/g)
        .map((x) => {
            return x.replace(/,\\/g, ',');
        })
        .filter((x) => {
            return !!x;
        });
}

program
    .version(version)
    .arguments('<cmd> <file>')
    .option('-p, --parameters <items>', 'List of params', list)
    .option('-p, --pseudo <items>', 'List of pseudo overrides', list)
    // https://github.com/tj/commander.js/issues/108
    // might get fixed by https://github.com/tj/commander.js/issues/691
    // as a workaround, we can actually leave this out. It defaults to true and the unparsed parameter will be ignored.
//  .option('--guess-parameters', 'Guess any parameters that are not explicitely passed in and have no Default. This is the default behaviour.')
    .option('-G, --no-guess-parameters', 'Fail validation if a parameter with no Default is not passed')
    .option('-g, --only-guess-parameters <items>', 'Guess the provided parameters, and fail validation if a parameter with no Default is passed', list)
    .option('-v, --verbose', 'Verbose error messages')
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

    let guessParameters: string[] | undefined;
    if (program.guessParameters === false) {
        guessParameters = [];
    } else if (program.onlyGuessParameters) {
        guessParameters = program.onlyGuessParameters;
    } else {
        guessParameters = undefined;
    }

    const options = {
        guessParameters
    };

    let result = Object();
    try {
      result = validator.validateFile(secondArg, options);
    } catch(err) {
      let error: string = function(msg: string, errors: any) {
        for (let error of Object.keys(errors)) {
          if (RegExp(error).test(msg)) {
            return errors[error];
          }
        }
        return errors[''];
      }(err.message, {
        'Could not find file .*. Check the input path.': 'No such file.',
        '': 'Unable to parse template! Use --verbose for more information.'
      });
      console.log(error);
      if (program.verbose) {
        console.error(err);
      }
      process.exit(1);
    }

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
