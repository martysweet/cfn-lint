#!/usr/bin/env node
"use strict";
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
Object.defineProperty(exports, "__esModule", { value: true });
var yaml = require("js-yaml");
var program = require("commander");
require('colors');
var util = require('util');
var version = require('../package').version;
/**
 * Used for parsing comma separated commandline argument values whilst, taking into account backslash escapes.
 * Returns an array of strings (e.g. ["Arg1=Val1", "Arg2=Val2"]).
 */
function list(val) {
    // prepare for a negated lookahead
    val = val.replace(/\\,/g, ',\\');
    // split and remove escapes
    return val.split(/,(?!\\)/g)
        .map(function (x) {
        return x.replace(/,\\/g, ',');
    })
        .filter(function (x) {
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
    .action(function () {
    program.help();
    doNoCommand();
})
    .on('--help', function () {
    doNoCommand();
});
program
    .command('validate')
    .usage('<file> [options]')
    .option('-p, --parameters <items>', 'List of params', list)
    .option('-p, --pseudo <items>', 'List of pseudo overrides', list)
    .option('--guess-parameters', 'Guess any parameters that are not explicitely passed in and have no Default. This is the default behaviour.')
    .option('-G, --no-guess-parameters', 'Fail validation if a parameter with no Default is not passed')
    .option('-g, --only-guess-parameters <items>', 'Guess the provided parameters, and fail validation if a parameter with no Default is passed', list)
    .option('-c, --custom-resource-attributes <items>', 'List of attributes', list)
    .option('-v, --verbose', 'Verbose error messages')
    .action(function (file, cmd) {
    // Patch for CommanderJS bug that defaults this to true
    if (cmd.parent.rawArgs.indexOf('--guess-parameters') != -1) {
        cmd.guessParameters = true;
    }
    var validator = require('./validator');
    if (cmd.parameters) {
        try {
            for (var _a = __values(cmd.parameters), _b = _a.next(); !_b.done; _b = _a.next()) {
                var param = _b.value;
                // Set the parameter
                var kv = param.split('=');
                validator.addParameterValue(kv[0], kv[1]);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    if (cmd.pseudo) {
        try {
            for (var _d = __values(cmd.pseudo), _e = _d.next(); !_e.done; _e = _d.next()) {
                var pseudo = _e.value;
                // Set the parameter
                var kv = pseudo.split('=');
                validator.addPseudoValue(kv[0], kv[1]);
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_e && !_e.done && (_f = _d.return)) _f.call(_d);
            }
            finally { if (e_2) throw e_2.error; }
        }
    }
    if (cmd.customResourceAttributes) {
        try {
            for (var _g = __values(cmd.customResourceAttributes), _h = _g.next(); !_h.done; _h = _g.next()) {
                var customResourceAttribute = _h.value;
                // Set the parameter
                var kv = customResourceAttribute.split('=');
                var key_kv = kv[0].split('.');
                var resource = key_kv[0];
                var attribute = key_kv[1];
                var value = yaml.safeLoad(kv[1]);
                validator.addCustomResourceAttributeValue(resource, attribute, value);
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_h && !_h.done && (_j = _g.return)) _j.call(_g);
            }
            finally { if (e_3) throw e_3.error; }
        }
    }
    var guessParameters;
    if (cmd.guessParameters === false) {
        guessParameters = [];
    }
    else if (cmd.onlyGuessParameters) {
        guessParameters = cmd.onlyGuessParameters;
    }
    else {
        guessParameters = undefined;
    }
    var options = {
        guessParameters: guessParameters
    };
    var result = Object();
    try {
        result = validator.validateFile(file, options);
    }
    catch (err) {
        var error = function (msg, errors) {
            try {
                for (var _a = __values(Object.keys(errors)), _b = _a.next(); !_b.done; _b = _a.next()) {
                    var error_1 = _b.value;
                    if (RegExp(error_1).test(msg)) {
                        return errors[error_1];
                    }
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                }
                finally { if (e_4) throw e_4.error; }
            }
            return errors[''];
            var e_4, _c;
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
    try {
        for (var _k = __values(result['errors']['info']), _l = _k.next(); !_l.done; _l = _k.next()) {
            var info = _l.value;
            console.log('Resource: ' + info['resource'].grey);
            console.log('Message: ' + info['message'].grey);
            console.log('Documentation: ' + info['documentation'].grey + '\n');
        }
    }
    catch (e_5_1) { e_5 = { error: e_5_1 }; }
    finally {
        try {
            if (_l && !_l.done && (_m = _k.return)) _m.call(_k);
        }
        finally { if (e_5) throw e_5.error; }
    }
    console.log((result['errors']['warn'].length + " warn").yellow);
    try {
        for (var _o = __values(result['errors']['warn']), _p = _o.next(); !_p.done; _p = _o.next()) {
            var warn = _p.value;
            console.log('Resource: ' + warn['resource'].yellow);
            console.log('Message: ' + warn['message'].yellow);
            console.log('Documentation: ' + warn['documentation'].yellow + '\n');
        }
    }
    catch (e_6_1) { e_6 = { error: e_6_1 }; }
    finally {
        try {
            if (_p && !_p.done && (_q = _o.return)) _q.call(_o);
        }
        finally { if (e_6) throw e_6.error; }
    }
    console.log((result['errors']['crit'].length + " crit").red);
    try {
        for (var _r = __values(result['errors']['crit']), _s = _r.next(); !_s.done; _s = _r.next()) {
            var crit = _s.value;
            console.log('Resource: ' + crit['resource'].red);
            console.log('Message: ' + crit['message'].red);
            console.log('Documentation: ' + crit['documentation'].red + '\n');
        }
    }
    catch (e_7_1) { e_7 = { error: e_7_1 }; }
    finally {
        try {
            if (_s && !_s.done && (_t = _r.return)) _t.call(_r);
        }
        finally { if (e_7) throw e_7.error; }
    }
    if (result['templateValid'] === false) {
        console.log('Template invalid!'.red.bold);
        process.exit(1);
    }
    else {
        console.log('Template valid!'.green);
        process.exit(0);
    }
    var e_1, _c, e_2, _f, e_3, _j, e_5, _m, e_6, _q, e_7, _t;
})
    .on('--help', function () {
    doNoArgument();
});
program
    .command('docs')
    .usage('<reference> [options]')
    .action(function (reference) {
    var docs = require('./docs');
    console.log(docs.getDoc(reference));
})
    .on('--help', function () {
    doNoArgument();
});
if (process.argv.length < 4) {
    process.argv.push('--help');
}
program.parse(process.argv);
//# sourceMappingURL=index.js.map