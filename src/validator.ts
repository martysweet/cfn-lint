let workingInput: any = null;
let stopValidation = false;
import resourcesSpec = require('./resourcesSpec');
import logger = require('./logger');
import parser = require('./parser');
const mockArnPrefix = "arn:aws:mock:region:123456789012:";
import {
    awsParameterTypes as parameterTypesSpec,
    awsRefOverrides,
    awsIntrinsicFunctions,
    PrimitiveAttribute,
    ListAttribute
} from './awsData';
import docs = require('./docs');

import util = require('util');

import CustomError = require('./util/CustomError');

import sms = require('source-map-support');
sms.install();

require('./util/polyfills');

export type ParameterValue = string | string[];
let parameterRuntimeOverride: {[parameter: string]: ParameterValue | undefined} = {};
// Todo: Allow override for RefOverrides ex. Regions

export interface ErrorRecord {
    message: string,
    resource: string,
    documentation: string
}

export interface ErrorObject {
    templateValid: boolean,
    errors: {
        crit: ErrorRecord[],
        warn: ErrorRecord[],
        info: ErrorRecord[]
    },
    outputs: {[outputName: string]: string},
    exports: {[outputName: string]: string}
}
let errorObject: ErrorObject = {
    "templateValid": true,
    "errors": {
        "info": [],
        "warn": [],
        "crit": []
    },
    "outputs": {},
    "exports": {}
};

export function resetValidator(){
    errorObject = {"templateValid": true, "errors": {"info": [], "warn": [], "crit": []}, outputs: {}, exports: {}};
    stopValidation = false;
    parameterRuntimeOverride = {};
};

export interface ValidateOptions {
    /**
     * List of parameters for which guessing is allowed.
     * undefined implies all parameters can be guessed.
     */
    guessParameters: string[] | undefined;
}

const defaultValidateOptions: ValidateOptions = {
    guessParameters: undefined
};

export function validateFile(path: string, options?: Partial<ValidateOptions>){
    // Convert to object, this will throw an exception on an error
    workingInput = parser.openFile(path);
    // Let's go!
   return validateWorkingInput(options);
};

export function validateJsonObject(obj: any, options?: Partial<ValidateOptions>){
    workingInput = obj;
    return validateWorkingInput(options);
};

export function addParameterValue(parameter: string, value: ParameterValue){
    addParameterOverride(parameter, value);
};

export function addPseudoValue(parameter: string, value: string){
    // Silently drop requests to change AWS::NoValue
    if(parameter == 'AWS::NoValue') {
        return;
    }
    // Only process items which are already defined in overrides
    if(parameter in awsRefOverrides){
        // Put NotificationARNs in an array if required
        if(parameter == 'AWS::NotificationARNs'){
            if(awsRefOverrides['AWS::NotificationARNs'][0] == 'arn:aws:sns:us-east-1:123456789012:MyTopic'){
                awsRefOverrides['AWS::NotificationARNs'][0] = value;
            }else{
                awsRefOverrides['AWS::NotificationARNs'].push(value);
            }
        }else{
            // By default, replace the value
            awsRefOverrides[parameter] = value;
        }
    }else{
        addError('crit', parameter + " is not an allowed pseudo parameter", ['cli-options'], 'pseudo parameters');
    }
};

function addParameterOverride(parameter: string, value: ParameterValue){
    parameterRuntimeOverride[parameter] = value;
}

function validateWorkingInput(passedOptions?: Partial<ValidateOptions>) {
    // Ensure we are working from a clean slate
    //exports.resetValidator();
    const options = Object.assign({}, defaultValidateOptions, passedOptions);

    // Check AWS Template Format Version
    if(workingInput.hasOwnProperty(['AWSTemplateFormatVersion'])){

        let testValue  = workingInput['AWSTemplateFormatVersion'];

        if(typeof workingInput['AWSTemplateFormatVersion'] == 'object'){
            addError('warn', 'AWSTemplateFormatVersion is recommended to be of type string \'2010-09-09\'', ['AWSTemplateFormatVersion'], 'AWSTemplateFormatVersion')
            testValue = testValue.toUTCString();
        }

        let allowedDateRegex = /^Thu, 09 Sep 2010 00:00:00 GMT$|^2010-09-09$/;
        if(!allowedDateRegex.test(testValue)){
            addError('crit', 'AWSTemplateFormatVersion should be \'2010-09-09\'', ['AWSTemplateFormatVersion'], 'AWSTemplateFormatVersion');
        }

    }


    // TODO: Check keys for parameter are valid, ex. MinValue/MaxValue


    // Check parameters and assign outputs
    assignParametersOutput(options.guessParameters);

    // Evaluate Conditions
    assignConditionsOutputs();

    // Assign intrinsic resolvers
    assignIntrinsics();

    // Assign outputs to all the resources
    assignResourcesOutputs();
    if(stopValidation) {
        // Stop the validation early, we can't join stuff if we don't know what to expect
        if(process.env.DEBUG) {
            logger.error("Stopping validation early as a resource type is invalid.");
        }
        return errorObject;
    }

    // Use the outputs assigned to resources to resolve references
    resolveReferences();

    // Go through the hopefully resolved properties of each resource
    checkResourceProperties();

    // Assign template outputs to the error object
    collectOutputs();

    return errorObject;

}

function assignParametersOutput(guessParameters?: string[]) {
    if(!workingInput.hasOwnProperty('Parameters')){
        return false; // This isn't an issue
    }

    const guessAll = (guessParameters === undefined);
    const guessParametersSet = new Set(guessParameters || []);

    // For through each parameter
    for(let parameterName in workingInput['Parameters']) {

        const parameter = workingInput['Parameters'][parameterName];

        if (!parameter.hasOwnProperty('Type')) {
            // We are going to assume type if a string to continue validation, but will throw a critical
            addError('crit', `Parameter ${parameterName} does not have a Type defined.`, ['Parameters', parameterName], "Parameters");
            parameter['Type'] = 'String';
        }

        // if the user hasn't specified any parameters to mock, assume all are ok; otherwise,
        // only mock the allowed ones.
        const okToGuess = (guessAll) || (guessParametersSet.has(parameterName));

        let parameterValue = inferParameterValue(parameterName, parameter, okToGuess);


        if (parameter.hasOwnProperty('AllowedValues') && parameter['AllowedValues'].indexOf(parameterValue) < 0) {
            addError('crit', `Parameter value '${parameterValue}' for ${parameterName} is`
                            + ` not within the parameters AllowedValues`, ['Parameters', parameterName], "Parameters");

        }

        if(parameter['Type'] === "CommaDelimitedList" && typeof parameterValue === 'string') {
            parameterValue = parameterValue.split(',').map(x => x.trim());
            parameterValue.forEach(val => {
              if (val === ""){
                addError('crit', `Parameter ${parameterName} contains a CommaDelimitedList where the number of commas appears to be equal or greater than the list of items.`, ['Parameters', parameterName], "Parameters");
              }
            })
        }

        // The List<type> parameter value is inferred as string with comma delimited values and must be converted to array
        let listParameterTypesSpec = Object.keys(parameterTypesSpec).filter((x) => !!x.match(/List<.*>/));
        if (!!~listParameterTypesSpec.indexOf(parameter['Type']) && (typeof parameterValue === 'string')) {
            parameterValue = parameterValue.split(',').map(x => x.trim());
            parameterValue.forEach(val => {
              if (val === ""){
                addError('crit', `Parameter ${parameterName} contains a List<${parameter['Type']}> where the number of commas appears to be equal or greater than the list of items.`, ['Parameters', parameterName], "Parameters");
              }
            })
        }

        // Assign an Attribute Ref regardless of any failures above
        workingInput['Parameters'][parameterName]['Attributes'] = {};
        workingInput['Parameters'][parameterName]['Attributes']['Ref'] = parameterValue;
    
    }
}


function inferParameterValue(parameterName: string, parameter: any, okToGuess: boolean): string | string[] {

    const parameterDefaultsByType = {
        'string': `string_input_${parameterName}`,
        'array': undefined,
        'number': '42'
    }

    // Check if the Ref for the parameter has been defined at runtime
    const parameterOverride = parameterRuntimeOverride[parameterName]
    if (parameterOverride !== undefined) {
        // Check the parameter provided at runtime is within the allowed property list (if specified)
        return parameterOverride;
    } else if (parameter.hasOwnProperty('Default')) {
        // See if Default property is present and populate
        return parameter['Default'];
    } else {
        if (!okToGuess) {
            addError('crit', 'Value for parameter was not provided', ['Parameters', parameterName], 'Parameters')
        }
        if (parameter.hasOwnProperty('AllowedValues') && parameter['AllowedValues'].length > 0) {
            // See if AllowedValues has been specified
            return parameter['AllowedValues'][0];
        } else {
            const rawParameterType = parameter['Type'];

            const listMatch = /^List<(.+)>$/.exec(rawParameterType);
            let isList: boolean;
            let parameterType: string;

            if (listMatch) {
                isList = true;
                parameterType = listMatch[1];
            } else {
                parameterType = rawParameterType;
                isList = false;
            }

            if (!parameterTypesSpec.hasOwnProperty(parameterType)) {
                addError('crit', `Parameter ${parameterName} has an invalid type of ${rawParameterType}.`, ['Parameters', parameterName], "Parameters");
                parameterType = 'String';
            }

            let normalizedType = parameterTypesSpec[parameterType!];
            if (normalizedType == 'array') {
                isList = true;
                parameterType = 'String';
                normalizedType = 'string';
            }

            const parameterDefault = parameterDefaultsByType[parameterTypesSpec[parameterType]!]! 
            if (isList) {
                return [parameterDefault];
            } else {
                return parameterDefault;
            }
        }
    }
}

type Severity = keyof typeof errorObject.errors;

function addError(severity: Severity, message : string, resourceStack: typeof placeInTemplate = [], help?: string){
    let obj = {
        'message': message,
        'resource': resourceStack.join(' > '),
        'documentation': docs.getUrls(help).join(', ')
    };

    // Set the information
    errorObject.errors[severity].push(obj);

    // Template invalid if critical error
    if(severity == 'crit'){
        errorObject.templateValid = false;
    }

    // Debug
    if(process.env.DEBUG) {
        let strResourceStack = resourceStack.join(' > ');
        logger.debug(`Error thrown: ${severity}: ${message} (${strResourceStack})`);
    }
}

function assignConditionsOutputs(){

    let allowedIntrinsicFunctions = ['Fn::And', 'Fn::Equals', 'Fn::If', 'Fn::Not', 'Fn::Or'];

    if(!workingInput.hasOwnProperty('Conditions')){
        return;
    }

    // For through each condition
    placeInTemplate.push('Conditions');
    for(let cond in workingInput['Conditions']) {
        if (workingInput['Conditions'].hasOwnProperty(cond)) {
            placeInTemplate.push(cond);
            let condition = workingInput['Conditions'][cond];

            // Check the value of condition is an object
            if(typeof condition != 'object'){
                addError('crit', `Condition should consist of an intrinsic function of type ${allowedIntrinsicFunctions.join(', ')}`,
                                placeInTemplate,
                                'Conditions');
                workingInput['Conditions'][cond] = {};
                workingInput['Conditions'][cond]['Attributes'] = {};
                workingInput['Conditions'][cond]['Attributes']['Output'] = false;
            }else{
                // Check the value of this is Fn::And, Fn::Equals, Fn::If, Fn::Not or Fn::Or
                let keys = Object.keys(condition);
                if(allowedIntrinsicFunctions.indexOf(keys[0]) != -1){

                    // Resolve recursively
                    let val = resolveIntrinsicFunction(condition, keys[0]);

                    // Check is boolean type
                    workingInput['Conditions'][cond]['Attributes'] = {};
                    workingInput['Conditions'][cond]['Attributes']['Output'] = false;
                    if(val === true || val === false){
                        workingInput['Conditions'][cond]['Attributes']['Output'] = val;
                    }else{
                        addError('crit', `Condition did not resolve to a boolean value, got ${val}`, placeInTemplate, 'Conditions');
                    }

                }else{
                    // Invalid intrinsic function
                    addError('crit', `Condition does not allow function '${keys[0]}' here`, placeInTemplate, 'Conditions');
                }
            }


            placeInTemplate.pop();
        }
    }
    placeInTemplate.pop();

}

function assignResourcesOutputs(){
    if(!workingInput.hasOwnProperty('Resources')){
        addError('crit', 'Resources section is not defined', [], "Resources");
        stopValidation = true;
        return false;
    }

    if(workingInput['Resources'].length == 0){
        addError('crit', 'Resources is empty', [], "Resources");
        stopValidation = true;
        return false;
    }

    // For through each resource
    for(let res in workingInput['Resources']){
        if(workingInput['Resources'].hasOwnProperty(res)){

            // Check if Type is defined
            let resourceType = null;
            let spec = null;
            if(!workingInput['Resources'][res].hasOwnProperty('Type')){
                stopValidation = true;
                addError('crit',
                        `Resource ${res} does not have a Type.`,
                        ['Resources', res],
                        "Resources"
                );
            }else{
                // Check if Type is valid
                resourceType = workingInput['Resources'][res]['Type'];
                try {
                    spec = resourcesSpec.getResourceType(workingInput['Resources'][res]['Type']);
                } catch (e) {
                    if (e instanceof resourcesSpec.NoSuchResourceType) {
                        addError('crit',
                            `Resource ${res} has an invalid Type of ${resourceType}.`,
                            ['Resources', res],
                            "Resources"
                        );
                    } else {
                        throw e;
                    }
                }
            }


            // Create a map for storing the output attributes for this Resource
            let refValue = "mock-ref-" + res;
            let refOverride = resourcesSpec.getRefOverride(resourceType);
            if(refOverride !== null){
                if(refOverride == "arn"){
                    refValue = mockArnPrefix + res;
                }else{
                    refValue = refOverride;
                }
            }

            // Create a return attributes for the resource, assume every resource has a Ref
            workingInput['Resources'][res]['Attributes'] = {};
            workingInput['Resources'][res]['Attributes']['Ref'] = refValue;

            //  Go through the attributes of the specification, and assign them
            if(spec != null && spec.Attributes){
                for(let attr in spec.Attributes){
                    if (attr.indexOf('Arn') != -1) {
                        workingInput['Resources'][res]['Attributes'][attr] = mockArnPrefix + res;
                    }else {
                        workingInput['Resources'][res]['Attributes'][attr] = "mockAttr_" + res;
                    }
                }
            }


        }
    }

}

function resolveReferences(){
    // TODO: Go through and resolve...
    // TODO: Ref, Attr, Join,

    // Resolve all Ref
    lastPositionInTemplate = workingInput;
    recursiveDescent(lastPositionInTemplate);


    let stop = workingInput;

}

let placeInTemplate: (string|number)[] = [];
let lastPositionInTemplate: any = null;
let lastPositionInTemplateKey: string | null = null;

function recursiveDescent(ref: any){
    // Step into next attribute
    for(let i=0; i < Object.keys(ref).length; i++){
        let key = Object.keys(ref)[i];

        // Resolve the function
        if(awsIntrinsicFunctions.hasOwnProperty(key)){

            // Check if an Intrinsic function is allowed here
            let inResourceProperty = (placeInTemplate[0] == "Resources" || placeInTemplate[2] == "Properties");
            let inResourceMetadata = (placeInTemplate[0] == "Resources" || placeInTemplate[2] == "Metadata");
            let inOutputs = (placeInTemplate[0] == "Outputs");
            let inConditions = (placeInTemplate[0] == "Conditions");
            // TODO Check for usage inside update policy

            if(!(inResourceProperty || inResourceMetadata || inOutputs || inConditions)){
                addError("crit", `Intrinsic function ${key} is not supported here`, placeInTemplate, key);
            } else {
                // Resolve the function
                const boundIntrinsic = buildIntrinsic(ref, key);
                // Overwrite the position with the resolved value
                lastPositionInTemplate[lastPositionInTemplateKey!] = boundIntrinsic;
            }
        }else if(key != 'Attributes' && ref[key] instanceof Object){
            placeInTemplate.push(key);
            lastPositionInTemplate = ref;
            lastPositionInTemplateKey = key;
            recursiveDescent(ref[key]);
        }


    }
    placeInTemplate.pop();
}

function resolveCondition(ref: any, key: string){
    let toGet = ref[key];
    let condition = false;

    if(workingInput.hasOwnProperty('Conditions') && workingInput['Conditions'].hasOwnProperty(toGet)){

        // Check the valid of the condition, returning argument 1 on true or 2 on failure
        if(typeof workingInput['Conditions'][toGet] == 'object') {
            if (workingInput['Conditions'][toGet].hasOwnProperty('Attributes') &&
                workingInput['Conditions'][toGet]['Attributes'].hasOwnProperty('Output')) {
                condition = workingInput['Conditions'][toGet]['Attributes']['Output'];
            }   // If invalid, we will default to false, a previous error would have been thrown
        }else{
            condition = workingInput['Conditions'][toGet];
        }

    }else{
        addError('crit', `Condition '${toGet}' must reference a valid condition`, placeInTemplate, 'Condition');
    }

    return condition;
}

function buildIntrinsic(ref: any, key: string) {
    const fnName = key;
    const arg = ref[key];

    if (!(fnName in intrinsics)) {
        addError("warn", `Unhandled Intrinsic Function ${key}, this needs implementing. Some errors might be missed.`, placeInTemplate, "Functions");
        return () => 'UNHANDLED_INTRINSIC';
    }

    return intrinsics[key](arg);
}

const intrinsics: {[k: string]: Intrinsic<any, any>} = {};

function _resolveValue<T>(value: Resolveable<T>): T | string {
    if (isBoundIntrinsic(value)) {
        try {
            return value();
        } catch (e) {
            if (e instanceof IntrinsicError) {
                addError('crit', e.message, placeInTemplate, value.fnName);
                return `INVALID_${value.fnName}`;
            } else {
                throw e;
            }
        }
    } else {
        return value;
    }
}

function _resolve<T>(value: Resolveable<T>): T | string {
    const resolved = _resolveValue(value);
    if (Array.isArray(resolved)) {
        return resolved.map(_resolve) as any as T;
    } else if (isObject(resolved)) {
        return objectMap(resolved, _resolve) as any as T;
    } else {
        return resolved;
    }
}

class IntrinsicError extends Error {
    constructor(message: string) {
        super(message);
    }
}

type Resolveable<T> = T | BoundIntrinsic<T>;


interface BoundIntrinsic<T> {
    (): T;
    fnName: string
}

function Intrinsic<A, T> (fnName: string, f: (this: Intrinsic<A, T>, arg: A) => T): Intrinsic<A, T>  {
    const builder = (arg: A) => BoundIntrinsic(fnName, f, arg);
    const intrinsic: Intrinsic<A, T> = Object.setPrototypeOf(builder, Intrinsic.prototype);
    intrinsic.fnName = fnName;
    intrinsics[fnName] = intrinsic;
    return intrinsic;
}
Intrinsic.prototype = Object.create(Function.prototype, {
    resolve: {
        value: function<T> (r: Resolveable<T>) {
            return _resolve(r);
        }
    }
});

function BoundIntrinsic<A, T>(fnName: string, f: (a: A) => T, arg: A): BoundIntrinsic<T> {
    const boundF = Object.setPrototypeOf(f.bind(null, arg), BoundIntrinsic.prototype);
    return Object.assign(boundF, {fnName});
}
BoundIntrinsic.prototype = Object.create(Function.prototype);

interface Intrinsic<A, T> {
    (a: A): BoundIntrinsic<T>;
    resolve: <R>(r: Resolveable<R>) => R;
    fnName: string
}

function isBoundIntrinsic<T>(f: any): f is BoundIntrinsic<T> {
    return (f instanceof Intrinsic);
}

/*class Intrinsic<A, T> {

    constructor(f: (this: Intrinsic<A, T>, arg: A) => T): (arg: A) => BoundIntrinsic<T>  {
        const boundF = (arg: A) => f.bind(null, arg);
        Object.setPrototypeOf(boundF, Intrinsic);
    }

    bind(arg: A) {
        this.arg = arg;
    }

    resolve<T>(r: Resolveable<T>) {
        return resolve(r);
    }
}
*/

const Ref = Intrinsic('Ref', function (reference: string) {
    // Check if the value of the Ref exists
    const resolvedVal = getRef(reference);
    if (resolvedVal === null) {
        throw new IntrinsicError(`Referenced value ${reference} does not exist`)
    }
    return resolvedVal;
});

const Base64 = Intrinsic('Fn::Base64', function (value: string | BoundIntrinsic<string>) {
    const resolved = this.resolve(value);

    if (typeof value !== "string"){
        throw new IntrinsicError('Parameter of Fn::Base64 is not a string');
    }

    return Buffer.from(value).toString('base64');
})

const Join = Intrinsic('Fn::Join', function (args: [string, Resolveable<string>[]]) {

    if (!Array.isArray(args) || args.length !== 2) {
        throw new IntrinsicError('Invalid parameters for Fn::Join');
    }

    const joiner = args[0];
    const parts = args[1];

    const resolvedParts = parts.map((part) => this.resolve(part));

    return parts.join(joiner);

});

const GetAtt = Intrinsic('Fn::GetAtt', function (args: [string, Resolveable<string>]) {
    if (!Array.isArray(args) || args.length !== 2) {
        throw new IntrinsicError('Invalid parameters for Fn::GetAtt');
    }

    const reference = args[0];
    if (typeof reference !== 'string') {
        throw new IntrinsicError('Fn::GetAtt does not support functions for the logical resource name');
    }

    const attributeName = this.resolve(args[1]);
    if (typeof attributeName !== 'string') {
        throw new IntrinsicError('Fn::GetAtt needs a string for the attribute to get.');
    }

    const resolved = fnGetAtt(reference, attributeName);

    if (resolved === null) {
        throw new IntrinsicError(`Invalid GetAtt - ${reference}.${attributeName}`);
    }

    return resolved;
});

const FindInMap = Intrinsic('Fn::FindInMap', function (args: Resolveable<string>[]) {

    if (!Array.isArray(args) || args.length !== 3) {
        throw new IntrinsicError('Invalid parameters for Fn::FindInMap');
    }

    const toGet = args.map((arg) => this.resolve(arg));

    if (toGet.findIndex((r) => (typeof r !== 'string')) > -1) {
        throw new IntrinsicError('Invalid parameter for Fn::FindInMap. It needs a string.');
    }

    const value = fnFindInMap(toGet[0], toGet[1], toGet[2]);
    if (value == null) {
        throw new IntrinsicError(`Could not find value in map ${toGet[0]}|${toGet[1]}|${toGet[2]}. Have you tried specifying input parameters?`);
    }

    return value;

})

const GetAZs = Intrinsic('Fn::GetAZs', function (arg: Resolveable<string>) {
    const region = this.resolve(arg);

    if (typeof region !== 'string') {
        throw new IntrinsicError('Fn::GetAZs only supports Ref or string as a parameter');
    }

    // TODO
    // if(toGet[key] != 'AWS::Region'){
    //     addError("warn", "Fn::GetAZs expects a region, ensure this reference returns a region", placeInTemplate, "Fn::GetAZs");
    // }

    const AZs = ['a', 'b', 'c'].map((s) => `${region}${s}`);
    return AZs;
})

const Select = Intrinsic('Fn::Select', function (arg: [Resolveable<string|number>, Resolveable<any[]>]) {
    if (!Array.isArray(arg) || arg.length !== 2) {
        throw new IntrinsicError('Fn::Select only supports an array ot two elements');
    }

    const indexStr = this.resolve(arg[0]);
    if (!isInteger(indexStr)) {
        throw new IntrinsicError("Fn::Select's first argument did not resolve to a string for parsing or a numeric value.");
    }

    const index = parseInt(indexStr as string);
    if (!isNaN(index)) {
        throw new IntrinsicError('First element of Fn::Select must be a number, or it must use an intrinsic fuction that returns a number')
    }

    const list = this.resolve(arg[1]);
    if (!Array.isArray(list)) {
        throw new IntrinsicError(`Fn::Select requires the second element to be a list, function call did not resolve to a list. It contains value ${list}`);
    }

    if (index < 0 || index >= list.length) {
        throw new IntrinsicError("First element of Fn::Select exceeds the length of the list.");
    }

    return list[index];
})

function objectMap<O, T>(o: O, map: (v: O[keyof O]) => T) {
    const ret = {} as {[k in keyof O]: T};
    for (const k in o) {
        ret[k] = map(o[k]);
    }
    return ret;
}

function fnSub(replacementString: string, vars: {[k: string]: any}) {
    const regex = /\${([A-Za-z0-9:.!]+)/gm;

    return replacementString.replace(regex, (_: string, subMatch: string) => {
        if (subMatch.indexOf('!') === 1) {
            return subMatch;
        } else if (subMatch in vars) {
            return vars[subMatch];
        } else if (subMatch.indexOf('.') !== -1) {
            const [resource, ...attributes] = subMatch.split('.');
            const joinedAttribute = attributes.join('.');
            const resolved = fnGetAtt(resource, joinedAttribute);
            if (resolved == null) {
                throw new IntrinsicError(`Intrinsic Sub does not reference valid resource attribute '${subMatch}'`);
            }
            return resolved;
        } else {
            const resolved = getRef(subMatch);
            if (resolved == null) {
                throw new IntrinsicError(`Intrinsic Sub does not reference valid resource or mapping '${subMatch}'`);
            }
            return resolved;
        }
    });

}

function doSubOnString(str: string) {
    return fnSub(str, {});
}

function doSubOnArray(this: any, arg: [string, {[k: string]: any}]) {
    const replacementString = arg[0];
    if (typeof replacementString !== 'string') {
        throw new IntrinsicError('Fn::Sub expects first argument to be a string');
    }

    const mapping = this.resolve(arg[1]);
    if (typeof mapping !== 'object') {
        throw new IntrinsicError('Fn::Sub expects second argument to be a variable map');
    }

    const vars = objectMap(mapping, (v) => this.resolve(v));

    return fnSub(replacementString, vars);
}

const Sub = Intrinsic('Fn::Sub', function (arg: string | [string, {[k: string]: any}]) {

    if (typeof arg === 'string') {
        return doSubOnString(arg);
    } else if (Array.isArray(arg) && arg.length === 2) {
        return doSubOnArray(arg);
    } else {
        throw new IntrinsicError('Fn::Sub needs a string or an array of length 2.');
    }

})

const If = Intrinsic('Fn::If', function (arg: [string, Resolveable<any>, Resolveable<any>]) {
    if (!Array.isArray(arg) || arg.length !== 3) {
        throw new IntrinsicError(`Fn::If must be an array with 3 arguments.`);
    }

    const condition = arg[0];
    const ifTrue = arg[1];
    const ifFalse = arg[2];
    const conditionValue = resolveCondition({'Condition': arg[0]}, 'Condition');

    if (conditionValue) {
        return this.resolve(ifTrue);
    } else {
        return this.resolve(ifFalse);
    }
})

const Equals = Intrinsic('Fn::Equals', function (arg: [Resolveable<any>, Resolveable<any>]) {
    if (!Array.isArray(arg) || arg.length !== 2) {
        throw new IntrinsicError('Fn::Equals expects an array with 2 arguments.');
    }

    const v1 = this.resolve(arg[0]);
    const v2 = this.resolve(arg[1]);

    return (v1 == v2);
})

const Or = Intrinsic('Fn::Or', function (arg: any[]) {
    if (!Array.isArray(arg) || arg.length < 2 || arg.length > 10) {
        throw new IntrinsicError('Fn::Or wants an array of between 2 and 10 arguments');
    }

    return Boolean(arg.find((condition) => this.resolve(condition === true)));
});

const Not = Intrinsic('Fn::Not', function (arg: [Resolveable<boolean>]) {
    if (!Array.isArray(arg) || arg.length !== 1) {
        throw new IntrinsicError('Fn::Not expects an array of length 1');
    }

    const condition = this.resolve(arg);

    if (typeof condition !== 'boolean') {
        throw new IntrinsicError(`Fn::Not did not resolve to a boolean value, ${condition} given`);
    }

    return !condition;
})

const ImportValue = Intrinsic('Fn::ImportValue', function (arg: Resolveable<string>) {
    const importName = this.resolve(arg);
    if (importName !== 'string') {
        throw new IntrinsicError('Something went wrong when resolving references for a Fn::ImportValue');
    }

    return `IMPORTEDVALUE${importName}`;
});

const Split = Intrinsic('Fn::Split', function (args: [string, Resolveable<string>]) {

    if (!Array.isArray(args) || args.length !== 2) {
        throw new IntrinsicError('Invalid parameter for Fn::Split. It needs an Array of length 2.');
    }

    const delimiter = args[0];
    if (typeof delimiter !== 'string') {
        throw new IntrinsicError(`Invalid parameter for Fn::Split. The delimiter, ${util.inspect(delimiter)}, needs to be a string.`);
    }

    const stringToSplit = this.resolve(args[1]);
    if (typeof stringToSplit !== 'string') {
        throw new IntrinsicError(`Invalid parameters for Fn::Split. The parameter, ${stringToSplit}, needs to be a string or a supported intrinsic function.`);
    }

    return stringToSplit.split(delimiter);

});

export function fnGetAtt(reference: string, attributeName: string){
    if(workingInput['Resources'].hasOwnProperty(reference)){
        const resource = workingInput['Resources'][reference];
        if (resource['Type'].indexOf('Custom::') === 0) {
            return `mockAttr_${reference}_${attributeName}`;
        } else if (resource['Type'] === 'AWS::CloudFormation::CustomResource') {
            return `mockAttr_${reference}_${attributeName}`;
        } else if (resource['Type'] === 'AWS::CloudFormation::Stack') {
            return `mockAttr_${reference}_${attributeName}`;
        }
        else {
            try {
                // Lookup attribute
                const attribute = resourcesSpec.getResourceTypeAttribute(resource['Type'], attributeName)
                const primitiveAttribute = attribute as PrimitiveAttribute
                if(!!primitiveAttribute['PrimitiveType']) {
                    return resource['Attributes'][attributeName];
                }
                const listAttribute = attribute as ListAttribute
                if(listAttribute['Type'] == 'List') {
                    return [ resource['Attributes'][attributeName], resource['Attributes'][attributeName] ]
                }
            } catch (e) {
                if (e instanceof resourcesSpec.NoSuchResourceTypeAttribute) {
                    addError('crit',
                        e.message,
                        placeInTemplate,
                        resource['Type']
                    );
                } else {
                    throw e;
                }
            }
        }
    }
    // Return null if not found
    return null;
}

function fnFindInMap(map: any, first: string, second: string){
    if(workingInput.hasOwnProperty('Mappings')){
        if(workingInput['Mappings'].hasOwnProperty(map)){
            if(workingInput['Mappings'][map].hasOwnProperty(first)){
                if(workingInput['Mappings'][map][first].hasOwnProperty(second)){
                    return workingInput['Mappings'][map][first][second];
                }
            }
        }
    }
    return null;
}

function getRef(reference: string){
    // Check in Resources
    if(workingInput['Resources'].hasOwnProperty(reference)){
        return workingInput['Resources'][reference]['Attributes']['Ref'];
    }

    // Check in Parameters
    if(workingInput['Parameters'] && workingInput['Parameters'].hasOwnProperty(reference)){
        return workingInput['Parameters'][reference]['Attributes']['Ref'];
    }

    // Check for customs refs
    if(awsRefOverrides.hasOwnProperty(reference)){
        return awsRefOverrides[reference];
    }

    // We have not found a ref
    return null;
}

function collectOutputs() {
    placeInTemplate.push('Outputs');

    const outputs = workingInput['Outputs'] || {};
    for (let outputName in outputs) {
        placeInTemplate.push(outputName);

        try {
            const output = outputs[outputName];
            const outputValue = output['Value'];
            if (outputValue === undefined) { continue; }

            errorObject['outputs'][outputName] = outputValue;

            if (output['Export']) {
                const exportName = output['Export']['Name']
                if (!exportName) {
                    addError('crit', `Output ${outputName} exported with no Name`, placeInTemplate, 'Outputs');
                    continue;
                }
                errorObject['exports'][exportName] = outputValue;
            }
        } finally {
            placeInTemplate.pop();
        }
    }

    placeInTemplate.pop();
}

let baseResourceType: string = null!;

// these types all represent schemas that the working input may need to be validated against.
export interface ResourceType {
    type: 'RESOURCE',
    resourceType: string
}

export interface NamedProperty {
    type: 'PROPERTY',
    resourceType: string,
    parentType: string // perhaps property type or resource type
    propertyName: string
}

export interface PropertyType {
    type: 'PROPERTY_TYPE',
    propertyType: string,
    resourceType: string
  }

export interface PrimitiveType {
    type: 'PRIMITIVE_TYPE',
    resourceType: string,
    primitiveType: string
}

export type ObjectType = ResourceType | NamedProperty | PropertyType | PrimitiveType;

/**
 * get the name of the ResourceType or PropertyType that this ObjectType refers to.
 */
function getTypeName(objectType: ResourceType | NamedProperty | PropertyType ): string | undefined {
    switch (objectType.type) {
        case 'RESOURCE':
            return objectType.resourceType
        case 'PROPERTY':
            return resourcesSpec.getPropertyType(objectType.resourceType, objectType.parentType, objectType.propertyName);
        case 'PROPERTY_TYPE':
            return objectType.propertyType
        default:
            throw new Error('unknown type!');
    }
}

/**
 *
 */
function getItemType(objectType: NamedProperty): PrimitiveType | PropertyType {
    const maybePrimitiveType = resourcesSpec.getPrimitiveItemType(objectType.parentType, objectType.propertyName);
    const maybePropertyType = resourcesSpec.getItemType(objectType.resourceType, objectType.parentType, objectType.propertyName);
    if (maybePrimitiveType) {
        return {
            type: 'PRIMITIVE_TYPE',
            primitiveType: maybePrimitiveType,
            resourceType: objectType.resourceType
        }
    } else if (maybePropertyType) {
        return {
            type: 'PROPERTY_TYPE',
            propertyType: maybePropertyType,
            resourceType: objectType.resourceType
        }
    } else {
        throw new Error(`${objectType.parentType}.${objectType.propertyName} is not a container type, but we tried to get an item type for it anyway.`);
    }
}


function checkResourceProperties() {

    // Go into resources
    placeInTemplate.push('Resources');
    let resources = workingInput['Resources'];

    // Go through each resource
    for (let res in resources) {

        // Check the property exists
        try {
            resourcesSpec.getType(resources[res]['Type']);
        } catch (e) {
            if (e instanceof resourcesSpec.NoSuchResourceType) {
                continue;
            } else {
                throw e;
            }
        }

        // Add the resource name to stack
        placeInTemplate.push(res);

        // Set the baseResourceType for PropertyType derivation
        baseResourceType = resources[res]['Type'];

        // Do property validation if Properties in present
        if(resources[res].hasOwnProperty('Properties')) {

            // Add Properties to the location stack
            placeInTemplate.push('Properties');

            let resourceType = resources[res]['Type'];
            check({type: 'RESOURCE', resourceType}, resources[res]['Properties']);

            // Remove Properties
            placeInTemplate.pop();
        }

        // Remove resources
        placeInTemplate.pop();
    }

    // Remove Resource
    placeInTemplate.pop();
}

export enum KnownTypes {
    ComplexObject,
    List,
    Map,
    Arn,
    String,
    Integer,
    Boolean,
    Json,
    Double,
    Timestamp
}

export function getPropertyType(objectType: NamedProperty | PrimitiveType) {
    if (objectType.type === 'PROPERTY' && isPropertySchema(objectType)) {
        return KnownTypes.ComplexObject;
    } else if (objectType.type === 'PROPERTY' && isListSchema(objectType)) {
        return KnownTypes.List;
    } else if (objectType.type === 'PROPERTY' && isMapSchema(objectType)) {
        return KnownTypes.Map;
    } else if (objectType.type === 'PROPERTY' && isArnSchema(objectType)) {
        return KnownTypes.Arn;
    } else if (isStringSchema(objectType)) {
        return KnownTypes.String;
    } else if (isIntegerSchema(objectType)) {
        return KnownTypes.Integer;
    } else if (isBooleanSchema(objectType)) {
        return KnownTypes.Boolean;
    } else if (isJsonSchema(objectType)) {
        return KnownTypes.Json
    } else if (isDoubleSchema(objectType)) {
        return KnownTypes.Double;
    } else if (isTimestampSchema(objectType)) {
        return KnownTypes.Timestamp;
    } else {
        // this should never happen in production; there are tests in place to ensure
        // we can determine the type of every property in the resources and propertytype specs.
        throw new Error (`could not determine type of ${util.inspect(objectType)}`);
    }
}

function check(objectType: ObjectType, objectToCheck: any) {
    try {
        // if we are checking against a resource or propertytype, it must be against
        // an object with subproperties.
        if ((objectType.type === 'RESOURCE') || (objectType.type === 'PROPERTY_TYPE')) {
            verify(isObject, objectToCheck);
            checkComplexObject(objectType, objectToCheck);
        // otherwise, we have a named property of some resource or propertytype,
        // or just a primitive.
        } else {
            const propertyType = getPropertyType(objectType);
            switch (propertyType) {
                case KnownTypes.ComplexObject:
                    verify(isObject, objectToCheck);
                    checkComplexObject(objectType as NamedProperty, objectToCheck);
                    break;
                case KnownTypes.Map:
                    verify(isObject, objectToCheck);
                    checkMap(objectType as NamedProperty, objectToCheck);
                    break;
                case KnownTypes.List:
                    verify(isList, objectToCheck);
                    checkList(objectType as NamedProperty, objectToCheck);
                    break;
                case KnownTypes.Arn:                    
                    verify(isArn, objectToCheck);
                    break;
                case KnownTypes.String:
                    verify(isString, objectToCheck);
                    break;
                case KnownTypes.Integer:
                    verify(isInteger, objectToCheck);
                    break;
                case KnownTypes.Boolean:
                    verify(isBoolean, objectToCheck);
                    break;
                case KnownTypes.Json:
                    verify(isJson, objectToCheck);
                    break;
                case KnownTypes.Double:
                    verify(isDouble, objectToCheck);
                    break;
                case KnownTypes.Timestamp:
                    verify(isTimestamp, objectToCheck);
                    break;
                default:
                    // this causes a typescript error if we forget to handle a KnownType.
                    const check: never = propertyType;
            }
        }
    } catch (e) {
        if (e instanceof VerificationError) {
            addError('crit', e.message+`, got ${util.inspect(objectToCheck)}`, placeInTemplate, objectType.resourceType);
        } else {
            // generic error handler; let us keep checking what we can instead of crashing.
            addError('crit', `Unexpected error: ${e.message} while checking ${util.inspect(objectToCheck)} against ${objectType}`, placeInTemplate, objectType.resourceType);
            console.error(e);
        }
    }
}


//
// Functions to work out what types our properties are expecting.
//

function isPropertySchema(objectType: NamedProperty | PrimitiveType) {
    if (objectType.type === 'PRIMITIVE_TYPE') {
        return false;
    } else {
        return !(resourcesSpec.isPrimitiveProperty(objectType.parentType, objectType.propertyName))
            && !(resourcesSpec.isPropertyTypeList(objectType.parentType, objectType.propertyName))
            && !(resourcesSpec.isPropertyTypeMap(objectType.parentType, objectType.propertyName))
    }
}

const isListSchema = (property: NamedProperty) =>
    resourcesSpec.isPropertyTypeList(property.parentType, property.propertyName);

const isMapSchema = (property: NamedProperty) =>
    resourcesSpec.isPropertyTypeMap(property.parentType, property.propertyName);

const isArnSchema = (property: NamedProperty) =>
    resourcesSpec.isArnProperty(property.propertyName);

function wrapCheck(f: (primitiveType: string) => boolean) {
    function wrapped(objectType: NamedProperty | PrimitiveType) {
        const primitiveType = (objectType.type === 'PRIMITIVE_TYPE')
            ? objectType.primitiveType
            : resourcesSpec.getPrimitiveType(objectType.parentType, objectType.propertyName)!;

        return f(primitiveType);
    }

    return wrapped;
}

const isStringSchema = wrapCheck((primitiveType) => primitiveType == 'String');
const isIntegerSchema = wrapCheck((primitiveType) => primitiveType == 'Integer' || primitiveType == 'Long');
const isBooleanSchema = wrapCheck((primitiveType) => primitiveType == 'Boolean');
const isJsonSchema = wrapCheck((primitiveType) => primitiveType == 'Json');
const isDoubleSchema = wrapCheck((primitiveType) => primitiveType == 'Double');
const isTimestampSchema = wrapCheck((primitiveType) => primitiveType == 'Timestamp');


//
// Functions to verify incoming data shapes against their expected types.
//

class VerificationError extends CustomError {
    constructor(message: string) {
        super(message)
        CustomError.fixErrorInheritance(this, VerificationError);
    }
}

export interface VerificationFunction {
    (o: any): boolean,
    failureMessage: string
}

function verify(verifyTypeFunction: VerificationFunction, object: any) {
    if (!verifyTypeFunction(object)) {
        throw new VerificationError(verifyTypeFunction.failureMessage);
    }
}

function verificationFunction(f: (o: any) => boolean, message: string): VerificationFunction {
    return Object.assign(f, {failureMessage: message});
}

export const isList = verificationFunction(
    (o: any) => (o instanceof Object && o.constructor === Array),
    'Expecting a list'
);

export const isObject = verificationFunction(
    (o: any) => (o instanceof Object && o.constructor === Object),
    'Expecting an object'
);

export const isString = verificationFunction(
    (o: any) => (typeof o === 'string') || (typeof o === 'number'), // wtf cfn.
    'Expecting a string'
);

export const isArn = verificationFunction(
    (o: any) => (typeof o === 'string') && o.indexOf('arn:aws') == 0,
    'Expecting an ARN'
);

const integerRegex = /^-?\d+$/;
export const isInteger = verificationFunction(
    (o: any) => {
        if (typeof o === 'number') {
            return (o === Math.round(o));
        } else if (typeof o === 'string') {
            return integerRegex.test(o);
        } else {
            return false;
        }
    },
    'Expecting an integer'
);

const doubleRegex = /^-?\d+(.\d*)?([eE][-+]?\d+)?$/;
export const isDouble = verificationFunction(
    (o: any) => {
        if (typeof o === 'number') {
            return !isNaN(o);
        } else if (typeof o === 'string') {
            return doubleRegex.test(o);
        } else {
            return false;
        }
    },
    'Expecting a double'
);

export const isBoolean = verificationFunction(
        (o: any) => {
        if (typeof o === 'boolean') {
            return true
        } else if (typeof o === 'string') {
            const oLower = o.toLowerCase();
            return oLower === 'true' || oLower === 'false';
        } else {
            return false;
        }
    },
    'Expecting a Boolean'
);

export const isJson = verificationFunction(
    (o: any) => {
        if (isObject(o)) {
            return true;
        } else if (typeof o === 'string') {
            try {
                const obj = JSON.parse(o);
                return isObject(obj);
            } catch (e) {
                return false;
            }
        } else {
            return false;
        }
    },
    'Expecting a JSON object'
);

const r = String.raw;
// adapted from https://github.com/segmentio/is-isodate (and fixed slightly)
const timestampRegex = RegExp(
    r`^\d{4}-\d{2}-\d{2}`         +  // Match YYYY-MM-DD
    r`(` +                           // time part
        r`(T\d{2}:\d{2}(:\d{2})?)`   +  // Match THH:mm:ss
        r`(\.\d{1,6})?`               +  // Match .sssss
        r`(Z|(\+|-)\d{2}(\:?\d{2}))?` +  // Time zone (Z or +hh:mm or +hhmm)
    r`)?$`
);
export const isTimestamp = verificationFunction(
    (o: any) => (typeof o === 'string') && timestampRegex.test(o) && !isNaN(Date.parse(o)),
    'Expecting an ISO8601-formatted string'
);


//
// Functions to descend into complex structures (schema'd objects, Maps, and Lists).
//

function _isKnownProperty(objectTypeName: string, objectType: ObjectType, isCustomPropertyAllowed: boolean, subPropertyName: string) {
    const isKnownProperty = resourcesSpec.isValidProperty(objectTypeName, subPropertyName);
    if (!isKnownProperty && !isCustomPropertyAllowed) {
        addError("crit", `${subPropertyName} is not a valid property of ${objectTypeName}`, placeInTemplate, objectType.resourceType);
    }
    return isKnownProperty;
}

function _checkForMissingProperties(properties: {[k: string]: any}, objectTypeName: string){
    const requiredProperties = resourcesSpec.getRequiredProperties(objectTypeName);

    // Remove the properties we have from the required property list
    const remainingProperties = requiredProperties.filter((propertyName) => properties[propertyName] === undefined);

    // If we have any items left over, they have not been defined
    if(remainingProperties.length > 0){
        for(let prop of remainingProperties){
            addError(`crit`, `Required property ${prop} missing for type ${objectTypeName}`, placeInTemplate, objectTypeName);
        }
    }
}

function checkComplexObject(objectType: ResourceType | NamedProperty | PropertyType,  objectToCheck: any) {
    const objectTypeName = getTypeName(objectType);

    if (!objectTypeName) {
        const namedProperty = objectType as NamedProperty;
        throw new Error(`${namedProperty.parentType}.${namedProperty.propertyName} is not a ResourceType or PropertyType, but we tried to get its type anyway.`);
    }

    // Check for missing required properties
    _checkForMissingProperties(objectToCheck, objectTypeName);

    const isCustomPropertyAllowed = resourcesSpec.isAdditionalPropertiesEnabled(objectTypeName);

    for (const subPropertyName in objectToCheck) {
        placeInTemplate.push(subPropertyName);
        const propertyValue = objectToCheck[subPropertyName];
        try {
            // check if property is recognized
            if (!_isKnownProperty(objectTypeName, objectType, isCustomPropertyAllowed, subPropertyName)) { continue; }

            // already handled in check for missing properties, above.
            if (propertyValue === undefined) { continue; }

            const subPropertyObjectType = {
                type: 'PROPERTY',
                resourceType: objectType.resourceType,
                parentType: objectTypeName,
                propertyName: subPropertyName
            } as NamedProperty;
        
            check(subPropertyObjectType, propertyValue)

        } finally {
            placeInTemplate.pop();
        }
    }
    // TODO How to handle optional required parameters
}

function checkList(objectType: NamedProperty, listToCheck: any[]) {
    const itemType = getItemType(objectType);
    for (const [index, item] of listToCheck.entries()) {
        placeInTemplate.push(index);
        check(itemType, item);
        placeInTemplate.pop();
    }
}

function checkMap(objectType: NamedProperty, mapToCheck: {[k: string]: any}) {
    const itemType = getItemType(objectType);
    for (let key in mapToCheck) {
        placeInTemplate.push(key);
        const item = mapToCheck[key];
        check( itemType, item);
        placeInTemplate.pop();
    }
}

