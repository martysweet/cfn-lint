#!/usr/bin/env node

/**
 * Module dependencies.
 */

import program = require('commander');
import docsBaseImport = require('./docs');
import validatorBaseImport = require('./validator');

require('colors');
const util = require('util');
let version = require('../package').version;

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

function doNoCommand() {
    console.error('\n', 'No command provided!');
    process.exit(1);
}

function doNoArgument() {
    console.error('\n', 'Missing required argument!');
    process.exit(1);
}

program
    .version(version)
    .action(function() {
        program.help();
        doNoCommand();
    })
    .on('--help', function() {
        doNoCommand();
    });

program
    .command('validate')
    .option('-p, --parameters <items>', 'List of params', list)
    .option('-p, --pseudo <items>', 'List of pseudo overrides', list)
    .option('--guess-parameters', 'Guess any parameters that are not explicitely passed in and have no Default. This is the default behaviour.')
    .option('-G, --no-guess-parameters', 'Fail validation if a parameter with no Default is not passed')
    .option('-g, --only-guess-parameters <items>', 'Guess the provided parameters, and fail validation if a parameter with no Default is passed', list)
    .option('-v, --verbose', 'Verbose error messages')
    .action(function(file, cmd) {
        // Patch for CommanderJS bug that defaults this to true
        if (cmd.parent.rawArgs.indexOf('--guess-parameters') != -1) {
          cmd.guessParameters = true;
        }

        const validator = require('./validator') as typeof validatorBaseImport;
        if(cmd.parameters) {
            for(let param of cmd.parameters) {
                // Set the parameter
                let kv = param.split('=');
                validator.addParameterValue(kv[0], kv[1]);
            }
        }

        if(cmd.pseudo) {
            for(let pseudo of cmd.pseudo) {
                // Set the parameter
                let kv = pseudo.split('=');
                validator.addPseudoValue(kv[0], kv[1]);
            }
        }

        let guessParameters: string[] | undefined;
        if (cmd.guessParameters === false) {
            guessParameters = [];
        } else if (cmd.onlyGuessParameters) {
            guessParameters = cmd.onlyGuessParameters;
        } else {
            guessParameters = undefined;
        }

        const options = {
            guessParameters
        };

        let result = Object();
        try {
            result = validator.validateFile(file, options);
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
            if (cmd.verbose) {
                console.error(err);
            }
            process.exit(1);
        }

        // Show the errors
        console.log((result['errors']['info'].length + " infos").grey);
        for(let info of result['errors']['info']) {
            console.log('Resource: '+ info['resource'].grey);
            console.log('Message: '+ info['message'].grey);
            console.log('Documentation: '+ info['documentation'].grey + '\n');
        }

        console.log((result['errors']['warn'].length + " warn").yellow);
        for(let warn of result['errors']['warn']) {
            console.log('Resource: ' + warn['resource'].yellow);
            console.log('Message: ' + warn['message'].yellow);
            console.log('Documentation: ' + warn['documentation'].yellow + '\n');
        }

        console.log((result['errors']['crit'].length + " crit").red);
        for(let crit of result['errors']['crit']) {
            console.log('Resource: ' + crit['resource'].red);
            console.log('Message: ' + crit['message'].red);
            console.log('Documentation: ' + crit['documentation'].red + '\n');
        }

        if(result['templateValid'] === false) {
            console.log('Template invalid!'.red.bold);
            process.exit(1);
        } else {
            console.log('Template valid!'.green);
            process.exit(0);
        }
    })
    .on('--help', function() {
        doNoArgument();
    });

program
    .command('docs')
    .action(function(reference) {
        const docs = require('./docs') as typeof docsBaseImport;
        console.log(docs.getDoc(reference));
    })
    .on('--help', function() {
        doNoArgument();
    });

if (process.argv.length < 4) {
    process.argv.push('--help');
}

program.parse(process.argv);
