///<reference path="./validator.d.ts" />

let workingInput: any = null;
let stopValidation = false;
import resourcesSpec = require('./resourcesSpec');
import logger = require('./logger');
import parser = require('./parser');
const mockArnPrefix = "arn:aws:mock:region:123456789012:";
import {
    awsParameterTypes as parameterTypesSpec,
    awsRefOverrides,
    awsIntrinsicFunctions
} from './awsData';
import docs = require('./docs');

import util = require('util');

import sms = require('source-map-support');
sms.install();

let parameterRuntimeOverride: {[parameter: string]: string | string[]} = {};
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

export function validateFile(path: string){
    // Convert to object, this will throw an exception on an error
    workingInput = parser.openFile(path);
    // Let's go!
   return validateWorkingInput();
};

export function validateJsonObject(obj: any){
    workingInput = obj;
    return validateWorkingInput();
};

export function addParameterValue(parameter: string, value: string){
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

function addParameterOverride(parameter: string, value: string){
    parameterRuntimeOverride[parameter] = value;
}

function validateWorkingInput(){
    // Ensure we are working from a clean slate
    //exports.resetValidator();

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
    assignParametersOutput();

    // Evaluate Conditions
    assignConditionsOutputs();

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

function assignParametersOutput(){
    if(!workingInput.hasOwnProperty('Parameters')){
        return false; // This isn't an issue
    }

    // For through each parameter
    for(let param in workingInput['Parameters']) {

        // Check if Type is defined
        let parameterRefAttribute: string | string[] | undefined = undefined;
        const parameterRefAttributes = {
            'string': `string_input_${param}`,
            'array': undefined,
            'number': '42'
        }

        // Check if the Ref for the parameter has been defined at runtime
        if(parameterRuntimeOverride.hasOwnProperty(param)){
            // Check the parameter provided at runtime is within the allowed property list (if specified)
            if(workingInput['Parameters'][param].hasOwnProperty('AllowedValues')){
                if(workingInput['Parameters'][param]['AllowedValues'].indexOf(parameterRuntimeOverride[param]) < 0){
                    addError('crit', `Provided parameter value '${parameterRuntimeOverride[param]}' for ${param} is`
                                    + ` not within the parameters AllowedValues`, ['Parameters', param], "Parameters");
                }
            }
            parameterRefAttribute = parameterRuntimeOverride[param];
        }else{
            // See if Default property is present and populate
            if(workingInput['Parameters'][param].hasOwnProperty('Default')){
                parameterRefAttribute = workingInput['Parameters'][param]['Default'];
            }
        }

        if (!workingInput['Parameters'][param].hasOwnProperty('Type')) {
            // We are going to assume type if a string to continue validation, but will throw a critical
            addError('crit', `Parameter ${param} does not have a Type defined.`, ['Parameters', param], "Parameters");
        }else{

            const rawParameterType = workingInput['Parameters'][param]['Type'];
            const listMatch = /^List<(\w+)>$/.exec(rawParameterType);
            let isList: boolean;
            let parameterType: string;
            if (rawParameterType === 'array') {
                isList = true;
                parameterType = 'string';
            } else if (listMatch) {
                isList = true;
                parameterType = listMatch[1];
            } else {
                isList = false;
                parameterType = rawParameterType;
            }

            // Check if the parameter type is valid
            if(!parameterTypesSpec.hasOwnProperty(parameterType)){
                addError('crit', `Parameter ${param} has an invalid type of ${rawParameterType}.`, ['Parameters', param], "Parameters");
            }else{
                if (!parameterRefAttribute) {
                    const parameterDefault = parameterRefAttributes[parameterTypesSpec[parameterType]!]! 
                    if (isList) {
                        parameterRefAttribute = [parameterDefault];
                    } else {
                        parameterRefAttribute = parameterDefault;
                    }
                }
            }
        }

        // Assign an Attribute Ref regardless of any failures above
        workingInput['Parameters'][param]['Attributes'] = {};
        workingInput['Parameters'][param]['Attributes']['Ref'] = parameterRefAttribute;
    
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
    recursiveDecent(lastPositionInTemplate);


    let stop = workingInput;

}

let placeInTemplate: (string|number)[] = [];
let lastPositionInTemplate: any = null;
let lastPositionInTemplateKey: string | null = null;

function recursiveDecent(ref: any){
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
            }else {
                // Resolve the function
                let functionOutput = resolveIntrinsicFunction(ref, key);
                if (functionOutput !== null && lastPositionInTemplateKey !== null) {
                    // Overwrite the position with the resolved value
                    lastPositionInTemplate[lastPositionInTemplateKey] = functionOutput;
                }
            }
        }else if(key != 'Attributes' && typeof ref[key] == "object"){
            placeInTemplate.push(key);
            lastPositionInTemplate = ref;
            lastPositionInTemplateKey = key;
            recursiveDecent(ref[key]);
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

function resolveIntrinsicFunction(ref: any, key: string) : string | boolean | string[] | undefined | null{
    switch(key){
        case 'Ref':
            return doIntrinsicRef(ref, key);
        case 'Condition':
            return resolveCondition(ref, key);
        case 'Fn::Join':
            return doIntrinsicJoin(ref, key);
        case 'Fn::Base64':
            return doIntrinsicBase64(ref, key);
        case 'Fn::GetAtt':
            return doIntrinsicGetAtt(ref, key);
        case 'Fn::FindInMap':
            return doIntrinsicFindInMap(ref, key);
        case 'Fn::GetAZs':
            return doIntrinsicGetAZs(ref, key);
        case 'Fn::Sub':
            return doIntrinsicSub(ref, key);
        case 'Fn::If':
            return doIntrinsicIf(ref, key);
        case 'Fn::Equals':
            return doIntrinsicEquals(ref, key);
        case 'Fn::Or':
            return doIntrinsicOr(ref, key);
        case 'Fn::Not':
            return doIntrinsicNot(ref, key);
        case 'Fn::ImportValue':
            return doIntrinsicImportValue(ref, key);
        default:
            addError("warn", `Unhandled Intrinsic Function ${key}, this needs implementing. Some errors might be missed.`, placeInTemplate, "Functions");
            return null;
    }
}

function doIntrinsicRef(ref: any, key: string){

    let refValue = ref[key];
    let resolvedVal = "INVALID_REF";

    // Check if it's of a String type
    if(typeof refValue != "string"){
        addError("crit", "Intrinsic Function Ref expects a string", placeInTemplate, "Ref");
    }else {
        // Check if the value of the Ref exists
        resolvedVal = getRef(refValue);
        if (resolvedVal === null) {
            addError('crit', `Referenced value ${refValue} does not exist`, placeInTemplate, "Ref");
            resolvedVal = "INVALID_REF";
        }
    }

    // Return the resolved value
    return resolvedVal;

}

function doIntrinsicBase64(ref: any, key: string){
    // Only base64 encode strings
    let toEncode = ref[key];
    if(typeof toEncode != "string"){
        toEncode = resolveIntrinsicFunction(ref[key], Object.keys(ref[key])[0]);
        if(typeof toEncode != "string"){
            addError("crit", "Parameter of Fn::Base64 does not resolve to a string", placeInTemplate, "Fn::Base64");
            return "INVALID_FN_BASE64";
        }
    }
    // Return base64
    return Buffer.from(toEncode).toString('base64');
}

function doIntrinsicJoin(ref: any, key: string){
    // Ensure that all objects in the join array have been resolved to string, otherwise
    // we need to resolve them.
    // Expect 2 parameters
    let join = ref[key][0];
    let parts = ref[key][1] || null;
    if(ref[key].length != 2 || parts == null){
        addError('crit', 'Invalid parameters for Fn::Join', placeInTemplate, "Fn::Join");
        // Specify this as an invalid string
        return "INVALID_JOIN";
    }else{
        // Join
        return fnJoin(join, parts);
    }
}

function doIntrinsicGetAtt(ref: any, key: string){
    let toGet = ref[key];
    if(toGet.length < 2){
        addError("crit", "Invalid parameters for Fn::GetAtt", placeInTemplate, "Fn::GetAtt");
        return "INVALID_GET_ATT"
    }else{
        if(typeof toGet[0] != "string"){ // TODO Implement unit test for this
            addError("crit", "Fn::GetAtt does not support functions for the logical resource name", placeInTemplate, "Fn::GetAtt");
        }

        // If we have more than 2 parameters, merge other parameters
        if(toGet.length > 2){
            let root = toGet[0];
            let parts = toGet.slice(1).join('.');
            toGet = [root, parts];
        }

        // The AttributeName could be a Ref, so check if it needs resolving
        if(typeof toGet[1] != "string"){
            let keys = Object.keys(toGet[1]);
            if(keys[0] == "Ref") { // TODO Implement unit test for this
                toGet[1] = resolveIntrinsicFunction(toGet[1], "Ref");
            }else{ // TODO Implement unit test for this
                addError("crit", "Fn::GetAtt only supports Ref within the AttributeName", placeInTemplate, "Fn::GetAtt");
            }
        }
        let attr = fnGetAtt(toGet[0], toGet[1]);
        if(attr != null){
            return attr;
        }else{
            return "INVALID_REFERENCE_OR_ATTR_ON_GET_ATT";
        }
    }
}

function doIntrinsicFindInMap(ref: any, key: string){
    let toGet = ref[key];
    if(toGet.length != 3){
        addError("crit", "Invalid parameters for Fn::FindInMap", placeInTemplate, "Fn::FindInMap");
        return "INVALID_FN_FIND_IN_MAP"
    }else {

        for(let x in toGet){
            if(toGet.hasOwnProperty(x)) {
                if (typeof toGet[x] != "string") {
                    toGet[x] = resolveIntrinsicFunction(toGet[x], Object.keys(toGet[x])[0]);
                }
            }
        }

        // Find in map
        let val = fnFindInMap(toGet[0], toGet[1], toGet[2]);
        if(val == null){
            addError("crit",
                `Could not find value in map ${toGet[0]}|${toGet[1]}|${toGet[2]}. Have you tried specifying input parameters?`,
                placeInTemplate,
                "Fn::FindInMap");
            return "INVALID_MAPPING";
        }else{
            return val;
        }

    }
}

function doIntrinsicGetAZs(ref: any, key: string){
    let toGet = ref[key];
    let region = awsRefOverrides['AWS::Region'];
    // If the argument is not a string, check it's Ref and resolve
    if(typeof toGet != "string"){
        let key = Object.keys(toGet)[0];
        if(key == "Ref") {
            if(toGet[key] != 'AWS::Region'){
                addError("warn", "Fn::GetAZs expects a region, ensure this reference returns a region", placeInTemplate, "Fn::GetAZs");
            }
            region = resolveIntrinsicFunction(toGet, "Ref") as string;
        }else{ // TODO Implement unit test for this
            addError("crit", "Fn::GetAZs only supports Ref or string as a parameter", placeInTemplate, "Fn::GetAZs");
        }
    }else{
        if(toGet != ""){    // TODO: Implement unit test
            region = toGet;
        }
    }

    // We now have a string, assume it's a real region
    // Lets create an array with 3 AZs
    let AZs = [];
    AZs.push(region + 'a');
    AZs.push(region + 'b');
    AZs.push(region + 'c');
    return AZs;

}

function doIntrinsicSub(ref: any, key: string){
    let toGet = ref[key];
    let replacementStr = null;
    let definedParams = null;
    // We have a simple replace
    if(typeof toGet == 'string'){
        replacementStr = toGet;
    }else{

        // We should have an array of parameters
        if(toGet[0]){

            if(typeof toGet[0] == 'string'){
                replacementStr = toGet[0];
            }else{
                addError('crit', 'Fn::Sub expects first argument to be a string', placeInTemplate, 'Fn::Sub');
            }

            if(typeof toGet[1] == 'object'){
                definedParams = toGet[1];
            }else{
                addError('crit', 'Fn::Sub expects second argument to be a variable map', placeInTemplate, 'Fn::Sub');
            }


        }else{
            addError('crit', 'Fn::Sub function malformed, first array element should be present', placeInTemplate, "Fn::Sub");
        }
    }

    // Extract the replacement parts
    let regex = /\${([A-Za-z0-9:.!]+)/gm;
    let matches = [];
    let match;
    while (match = regex.exec(replacementStr)) {
        matches.push(match[1]);
    }

    // Resolve the replacement and replace into string using Ref or GetAtt
    for(let m of matches){
        let replacementVal = "";

        if(m.indexOf('!') == 1){
            // Literal Value
            replacementVal = m;
        }else if(m.indexOf('.') != -1){
            // Check if m is within the key value map
            if(definedParams !== null && definedParams.hasOwnProperty(m) && typeof definedParams[m] !== 'string'){
                definedParams[m] = resolveIntrinsicFunction(definedParams[m], Object.keys(m)[0]);
                replacementVal = definedParams[m];
            }else{
                // Use Fn::GetAtt
                let parts = m.split('.');
                replacementVal = fnGetAtt(parts[0], parts[1]);
                if(replacementVal === null){
                    addError('crit', `Intrinsic Sub does not reference valid resource attribute '${m}'`, placeInTemplate, 'Fn::Sub');
                }
            }
        }else{
            if(definedParams !== null && definedParams.hasOwnProperty(m)){
                if(typeof definedParams[m] !== 'string') {
                    replacementVal = resolveIntrinsicFunction(definedParams[m], Object.keys(m)[0]) as string;
                }else{
                    replacementVal = definedParams[m];
                }
            }else {
                // Use Ref
                replacementVal = getRef(m);
                if(replacementVal === null){
                    addError('crit', `Intrinsic Sub does not reference valid resource or mapping '${m}'`, placeInTemplate, 'Fn::Sub');
                }
            }
        }

        // Do a string replace on the string
        replacementStr = replacementStr.replace("${" + m + "}", replacementVal);

    }

    // Set the resolved value as a string
    return replacementStr;
}

function doIntrinsicIf(ref: any, key: string){
    let toGet = ref[key];

    // Check the value of the condition
    if(toGet.length == 3){

        // Check toGet[0] is a valid condition
        toGet[0] = resolveCondition({'Condition': toGet[0]}, 'Condition');

        // Set the value
        let value = null;
        if(toGet[0]){
            value = toGet[1];
        }else{
            value = toGet[2];
        }

        if(value instanceof Array){
            // Go through each element in the array, resolving if needed.
            let resolvedValue = [];
            for(let i=0; i < value.length; i++) {
                let keys = Object.keys(value[i]);
                if (awsIntrinsicFunctions['Fn::If']['supportedFunctions'].indexOf(keys[0]) !== -1) {
                    resolvedValue.push(resolveIntrinsicFunction(value[i], keys[0]));
                }else{
                    addError('crit', `Fn::If does not allow ${keys[0]} as a nested function within an array`, placeInTemplate, 'Fn::If');
                }
            }
            // Return the resolved array
            return resolvedValue;
        }else if(typeof value === "object") {
            let keys = Object.keys(value);
            if (awsIntrinsicFunctions['Fn::If']['supportedFunctions'].indexOf(keys[0]) !== -1) {
                return resolveIntrinsicFunction(value, keys[0]);
            }else{
                addError('crit', `Fn::If does not allow ${keys[0]} as a nested function`, placeInTemplate, 'Fn::If');
            }
        }else {
            return value;
        }

    }else{
        addError('crit', `Fn::If must have 3 arguments, only ${toGet.length} given.`, placeInTemplate, 'Fn::If');
    }

    // Set the 1st or 2nd param as according to the condition

    return "INVALID_IF_STATEMENT";
}

function doIntrinsicEquals(ref: any, key: string) {
    let toGet = ref[key];

    // Check the value of the condition
    if (toGet.length == 2) {

        // Resolve first argument
        if(typeof toGet[0] == 'object'){
            let keys = Object.keys(toGet[0]);
            if(awsIntrinsicFunctions['Fn::If']['supportedFunctions'].indexOf(keys[0]) != -1) {
                toGet[0] = resolveIntrinsicFunction(toGet[0], keys[0]);
            }else{
                addError('crit', `Fn::Equals does not support the ${keys[0]} function in argument 1`);
            }
        }

        // Resolve second argument
        if(typeof toGet[1] == 'object'){
            let keys = Object.keys(toGet[1]);
            if(awsIntrinsicFunctions['Fn::If']['supportedFunctions'].indexOf(keys[0]) != -1) {
                toGet[0] = resolveIntrinsicFunction(toGet[1], keys[0]);
            }else{
                addError('crit', `Fn::Equals does not support the ${keys[1]} function in argument 2`);
            }
        }

        // Compare
        return (toGet[0] == toGet[1]);

    }else{
        addError('crit', `Fn::Equals expects 2 arguments, ${toGet.length} given.`, placeInTemplate, 'Fn::Equals');
    }

    return false;
}

function doIntrinsicOr(ref: any, key: string) {
    let toGet = ref[key];

    // Check the value of the condition
    if (toGet.length > 1 && toGet.length < 11) {
        let argumentIsTrue = false;

        // Resolve each argument
        for(let arg in toGet){
            if(toGet.hasOwnProperty(arg)) {
                if (typeof toGet[arg] == 'object') {
                    let keys = Object.keys(toGet[arg]);
                    if(awsIntrinsicFunctions['Fn::Or']['supportedFunctions'].indexOf(keys[0]) != -1) {
                        toGet[arg] = resolveIntrinsicFunction(toGet[arg], keys[0]);
                    }else{
                        addError('crit', `Fn::Or does not support function '${keys[0]}' here`, placeInTemplate, 'Fn::Or');
                    }
                }
                // Set to true if needed
                if (toGet[arg] === true) {
                    argumentIsTrue = true;
                }
            }
        }

        return argumentIsTrue;

    }else{
        addError('crit', `Expecting Fn::Or to have between 2 and 10 arguments`, placeInTemplate, 'Fn::Or');
    }
}

function doIntrinsicNot(ref: any, key: string){

    let toGet = ref[key];

    // Check the value of the condition
    if (toGet.length == 1){

        // Resolve if an object
        if(typeof toGet[0] == 'object') {
            let keys = Object.keys(toGet[0]);
            if (awsIntrinsicFunctions['Fn::Not']['supportedFunctions'].indexOf(keys[0]) != -1) {
                toGet[0] = resolveIntrinsicFunction(toGet[0], keys[0]);
            } else {
                addError('crit', `Fn::Not does not support function '${keys[0]}' here`, placeInTemplate, 'Fn::Or');
            }
        }

        // Negate
        if (toGet[0] === true || toGet[0] === false) {
            return !toGet[0];
        } else {
            addError('crit', `Fn::Not did not resolve to a boolean value, ${toGet[0]} given`, placeInTemplate, 'Fn::Not');
        }


    }else{
        addError('crit', `Expecting Fn::Not to have exactly 1 argument`, placeInTemplate, 'Fn::Not');
    }

    return false;
}

function doIntrinsicImportValue(ref: any, key: string){
    let toGet = ref[key];

    // If not string, resolve using the supported functions
    if(typeof toGet == 'object') {
        let keys = Object.keys(toGet);
        if (awsIntrinsicFunctions['Fn::ImportValue']['supportedFunctions'].indexOf(keys[0]) != -1) {
            toGet = resolveIntrinsicFunction(toGet, keys[0]);
        } else {
            addError('crit', `Fn::ImportValue does not support function '${keys[0]}' here`, placeInTemplate, 'Fn::ImportValue');
            return 'INVALID_FN_IMPORTVALUE';
        }
    }

    // Resolve
    if(typeof toGet == 'string'){
        return "IMPORTEDVALUE" + toGet; // TODO: Consider making this commandline defined
    }else{
        addError('warn', `Something went wrong when resolving references for a Fn::ImportValue`, placeInTemplate, 'Fn::ImportValue');
        return 'INVALID_FN_IMPORTVALUE';
    }


}

function fnJoin(join: any, parts: any){
    // Go through each parts and ensure they are resolved
    for(let p in parts){
        if(parts.hasOwnProperty(p)) {
            if (typeof parts[p] == "object") {
                // Something needs resolving
                // TODO Check the key is within the valid functions which can be called from a Fn::Join
                parts[p] = resolveIntrinsicFunction(parts[p], Object.keys(parts[p])[0]);
            }
        }
    }

    return parts.join(join);
}

export function fnGetAtt(reference: string, attribute: string){
    if(workingInput['Resources'].hasOwnProperty(reference)){
        const resource = workingInput['Resources'][reference];
        if (resource['Attributes'].hasOwnProperty(attribute)){
            return resource['Attributes'][attribute];
        } else if (resource['Type'].indexOf('Custom::') === 0 || resource['Type'] === 'AWS::CloudFormation::CustomResource') {
            return `mockAttr_${reference}_${attribute}`;
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


function check(objectType: ObjectType, objectToCheck: any) {
    // console.dir({objectType});
    // if we expect an object
    try {
        if ((objectType.type === 'RESOURCE') || (objectType.type === 'PROPERTY_TYPE')) {
            verify(isObject, objectToCheck);
            checkComplexObject(objectType, objectToCheck);
        } else {
            
            if (objectType.type === 'PROPERTY' && isPropertySchema(objectType)) {
                verify(isObject, objectToCheck);
                checkComplexObject(objectType, objectToCheck);
            }
            // else if we expect a list
            else if (objectType.type === 'PROPERTY' && isListSchema(objectType)) {
                verify(isList, objectToCheck);
                checkList(objectType, objectToCheck);
            }
            else if (objectType.type === 'PROPERTY' && isMapSchema(objectType)) {
                verify(isObject, objectToCheck);
                checkMap(objectType, objectToCheck);
            }
            else if (objectType.type === 'PROPERTY' && isArnSchema(objectType)) {
                verify(isArn, objectToCheck);
            }
            else if (isStringSchema(objectType)) {
                verify(isString, objectToCheck);
            }
            else if (isIntegerSchema(objectType)) {
                verify(isInteger, objectToCheck);
            }
            else if (isBooleanSchema(objectType)) {
                verify(isBoolean, objectToCheck);
            }
            else if (isJsonSchema(objectType)) {
                verify(isJson, objectToCheck);
            }
            else if (isDoubleSchema(objectType)) {
                verify(isDouble, objectToCheck);
            }
            else {
                // TODO
                console.log('unknown schema!!');
                const property = (objectType.type === 'PROPERTY')
                    ? resourcesSpec.getType(objectType.parentType).Properties[objectType.propertyName]
                    : undefined;
                console.dir({objectType, property})
                throw new Error (`TODO: unknown type ${util.inspect(objectType)}`);
                
            }
        }
    } catch (e) {
        if (e instanceof VerificationError) {
            addError('crit', e.message+`, got ${util.inspect(objectToCheck)}`, placeInTemplate, objectType.resourceType);
        } else {
            throw e;
        }
    }

    // else if we expect a primitive
}

function checkComplexObject(objectType: ResourceType | NamedProperty | PropertyType,  objectToCheck: any) {
    
    // Check for missing required properties
    checkForMissingProperties(objectToCheck, objectType);

    const objectTypeName = getTypeName(objectType);

    const isCustomPropertyAllowed = resourcesSpec.isAdditionalPropertiesEnabled(objectTypeName);


    for (const subPropertyName in objectToCheck) {

        placeInTemplate.push(subPropertyName);

        const isValidProperty = resourcesSpec.isValidProperty(objectTypeName, subPropertyName);
        if (isValidProperty) {

            const propertyValue = objectToCheck[subPropertyName];

            if (propertyValue === undefined) {
                // already handled in check for missing properties, above.
                continue;
            }
            //const propertyType = resourcesSpec.getPropertyType(objectType, propertyName);
            // console.dir({objectType, subPropertyName, objectTypeName});
            const subPropertyObjectType = {
                type: 'PROPERTY',
                resourceType: objectType.resourceType,
                parentType: objectTypeName,
                propertyName: subPropertyName
            } as NamedProperty;

            check(subPropertyObjectType, propertyValue)
        } else if (!isCustomPropertyAllowed) {
            addError("crit", `${subPropertyName} is not a valid property of ${objectTypeName}`, placeInTemplate, objectType.resourceType);
        }

        placeInTemplate.pop();
    }

    // TODO How to handle optional required parameters
}

class VerificationError extends Error {
    constructor(message: string) {
        super(message)
        Error.captureStackTrace(this, VerificationError);
    }
}

function verify(verifyTypeFunction: VerificationFunction, object: any) {
    if (!verifyTypeFunction(object)) {
        throw new VerificationError(verifyTypeFunction.failureMessage);
    }
}

const isList = function isList(objectToCheck: any) {
    return (typeof objectToCheck === 'object' && objectToCheck.constructor === Array);
} as any as VerificationFunction
isList.failureMessage = `Expecting a list`;

function checkList(objectType: NamedProperty, listToCheck: any[]) {
    const itemType = getItemType(objectType);
    for (const [index, item] of listToCheck.entries()) {
        placeInTemplate.push(index);
        check(itemType, item);
        placeInTemplate.pop();
    }
}

const isObject = function isObject(objectToCheck: any) {
    return (typeof objectToCheck === 'object' && objectToCheck.constructor === Object);
} as any as VerificationFunction;
isObject.failureMessage = `Expecting an object`;


function checkMap(objectType: NamedProperty, mapToCheck: {[k: string]: any}) {
    const itemType = getItemType(objectType);
    for (let key in mapToCheck) {
        placeInTemplate.push(key);
        const item = mapToCheck[key];
        check( itemType, item);
        placeInTemplate.pop();
    }
}


const isString = function isString(objectToCheck: any) {
    return (typeof objectToCheck === 'string');
} as any as VerificationFunction;
isString.failureMessage = 'Expecting a string';


const isArn = function isArn(objectToCheck: any) {
    if (typeof objectToCheck !== 'string') { return false; }
    return objectToCheck.indexOf('arn:aws') == 0;
} as any as VerificationFunction;
isArn.failureMessage = 'Expecting an ARN';


const integerRegex = /-?\d+/;
const isInteger = function isInteger(objectToCheck: any) {
    if (typeof objectToCheck === 'number') {
        return (objectToCheck === Math.round(objectToCheck));
    }
    else if (typeof objectToCheck === 'string') {
        return integerRegex.test(objectToCheck);
    }
    else { return false; }
} as any as VerificationFunction
isInteger.failureMessage = 'Expecting an integer';


const doubleRegex = /^-?\d+(.\d*)?([eE][-+]?\d+)?$/;
const isDouble = function isDouble(objectToCheck: any) {
    if (typeof objectToCheck === 'number') {
        return !isNaN(objectToCheck);
    }
    else if (typeof objectToCheck === 'string') {
        return doubleRegex.test(objectToCheck);
    }
} as any as VerificationFunction
isInteger.failureMessage = 'Expecting a double';


const isBoolean = function isBoolean(objectToCheck: any) {
    if (typeof objectToCheck === 'boolean') {
        return true
    } else if (typeof objectToCheck === 'string') {
        return objectToCheck === 'True' || objectToCheck === 'true' || objectToCheck === 'False' || objectToCheck === 'false';
    } else {
        return false;
    }
} as any as VerificationFunction;
isBoolean.failureMessage = 'Expecting a Boolean'


const isJson = function isJson(objectToCheck: any) {
    if (isObject(objectToCheck)) { return true; }
    else if (typeof objectToCheck === 'string') {
        try {
            const o = JSON.parse(objectToCheck);
            return isObject(o);
        } catch (e) {
            return false;
        }
    }
    else {
        return false;
    }
} as any as VerificationFunction;
isJson.failureMessage = 'Expecting a JSON object'


function getTypeName(objectType: ObjectType): string {
    switch (objectType.type) {
        case 'RESOURCE': return objectType.resourceType
        case 'PROPERTY':
            return resourcesSpec.getPropertyType(objectType.resourceType, objectType.parentType, objectType.propertyName)
        case 'PROPERTY_TYPE': return objectType.propertyType
        case 'PRIMITIVE_TYPE': return  objectType.primitiveType
        default:
            throw new Error('unknown type!');
    }
}


function getItemType(objectType: NamedProperty): PrimitiveType | PropertyType {
    const maybePrimitiveType = resourcesSpec.getPrimitiveItemType(objectType.parentType, objectType.propertyName)
    if (maybePrimitiveType) {
        return {
            type: 'PRIMITIVE_TYPE',
            primitiveType: maybePrimitiveType,
            resourceType: objectType.resourceType
        }
    } else {
        const propertyType = resourcesSpec.getPropertyType(objectType.resourceType, objectType.parentType, objectType.propertyName);
        return {
            type: 'PROPERTY_TYPE',
            propertyType: propertyType,
            resourceType: objectType.resourceType
        }
    }
}


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
const isIntegerSchema = wrapCheck((primitiveType) => primitiveType == 'Integer');
const isBooleanSchema = wrapCheck((primitiveType) => primitiveType == 'Boolean');
const isJsonSchema = wrapCheck((primitiveType) => primitiveType == 'Json');
const isDoubleSchema = wrapCheck((primitiveType) => primitiveType == 'Double');


function checkEachProperty(resourceType: string, ref: any, key: string){
    Object.keys(ref[key]).forEach((prop) => {
        checkResourceProperty(resourceType, ref[key], prop);
    });
}

function checkResourceProperty(resourcePropType: string, ref: any, key: string){

    // Using the Key, the the Resource Type, get the expected Property type
    // resourceSpec get type of property using resourceType and property name
    let isValidProperty = resourcesSpec.isValidProperty(resourcePropType, key);
    let isCustomPropertyAllowed = resourcesSpec.isAdditionalPropertiesEnabled(resourcePropType);

    if(isValidProperty){

        // Check if the property is a string
        let isPrimitiveProperty = resourcesSpec.isPrimitiveProperty(resourcePropType, key);

        // Check if list of primitives
        if(resourcesSpec.isPropertyTypeList(resourcePropType, key)) {
            // Check if the given property is an array
            if(typeof ref[key] == 'object' && ref[key].constructor === Array){
                for(let item in ref[key]){
                    if(ref[key].hasOwnProperty(item)) {
                        if (resourcesSpec.hasPrimitiveItemType(resourcePropType, key)) {
                            // Get the Primitive List Type
                            let primitiveItemType = resourcesSpec.getPrimitiveItemType(resourcePropType, key)!;
                            // Go through each item in list
                            for(let li in ref[key]){

                                if(ref[key].hasOwnProperty(li)){
                                    placeInTemplate.push(li);
                                    checkProperty(resourcePropType, ref[key], li, true, primitiveItemType);
                                    placeInTemplate.pop();
                                }

                            }
                        }else{
                            let propertyType = resourcesSpec.getPropertyType(baseResourceType, resourcePropType, key);
                            checkProperty(resourcePropType, ref[key], item, isPrimitiveProperty, propertyType!);
                        }
                    }
                }
            }else{
                // TODO: Check DuplicatesAllowed
                if(typeof ref[key] != 'string' && ref[key] != '') { // Allow an empty string instead of a list
                    addError("crit", `Expecting a list for ${key}`, placeInTemplate, `${baseResourceType}.${key}`);
                }
            }
        }else if(resourcesSpec.isPropertyTypeMap(resourcePropType, key)) {
            if (typeof ref[key] == 'object' && ref[key].constructor === Object) {
                const isPrimitiveProperty = resourcesSpec.hasPrimitiveItemType(resourcePropType, key);
                const propertyType = (isPrimitiveProperty)
                    ? resourcesSpec.getPrimitiveItemType(resourcePropType, key)!
                    : resourcesSpec.getPropertyType(baseResourceType, resourcePropType, key)!;

                for (const itemKey of Object.getOwnPropertyNames(ref[key])) {
                    placeInTemplate.push(itemKey);
                    checkProperty(resourcePropType, ref[key], itemKey, isPrimitiveProperty, propertyType);
                    placeInTemplate.pop();
                }
            }else{
                if (ref[key] !== '') {
                    addError('crit', `Expecting a map for ${key}`, placeInTemplate, `${baseResourceType}.${key}`);
                }
            }
        }else{
            // Expect a single value or object if isPrimitiveProperty == false
            let primTypeOf = typeof ref[key];
            let isPrimTypeOf = (primTypeOf == 'string' || primTypeOf == 'number' || primTypeOf == 'boolean');
            if((typeof ref[key] == 'object' && !isPrimitiveProperty) || (isPrimTypeOf && isPrimitiveProperty)) {
                placeInTemplate.push(key);
                let propertyType = resourcesSpec.getPropertyType(baseResourceType, resourcePropType, key)!;
                checkProperty(resourcePropType, ref, key, isPrimitiveProperty, propertyType);
                placeInTemplate.pop();
            }else{
                addError('warn', `Unhandled property for ${key}`, placeInTemplate, `${baseResourceType}.${key}`);
            }
        }
    }else{
        if(!isCustomPropertyAllowed) {
            addError("crit", `${key} is not a valid property of ${resourcePropType}`, placeInTemplate, resourcePropType);
        }
    }

}

function checkForMissingProperties(properties: {[k: string]: any}, objectType: ResourceType | PropertyType | NamedProperty){

    const propertyType = getTypeName(objectType);
    let requiredProperties = resourcesSpec.getRequiredProperties(propertyType);

    // Remove the properties we have from the required property list
    for(let propertyName in properties){
        const propertyValue = properties[propertyName];
        if (propertyValue !== undefined) {
            let indexOfRequired = requiredProperties.indexOf(propertyName);
            if(indexOfRequired !== -1){
                requiredProperties.splice(indexOfRequired, 1);
            }
        }
    }

    // If we have any items left over, they have not been defined
    if(requiredProperties.length > 0){
        for(let prop of requiredProperties){
            addError(`crit`, `Required property ${prop} missing for type ${propertyType}`, placeInTemplate, objectType.resourceType);
        }
    }
}

// Checks a single element of a property
function checkProperty(resourcePropType: string, ref: any, key: string, isPrimitiveType: boolean, propertyType: string){

    if(!isPrimitiveType){
        // Recursive solve this property
        // If we have a List
        if(typeof ref[key] == 'object' && ref[key].constructor === Array) {
            for (let k in ref[key]) {
                if(ref[key].hasOwnProperty(k)){
                    for (let a in ref[key][k]) {
                        if(ref[key][k].hasOwnProperty(a)) {
                            checkResourceProperty(propertyType, ref[key][k], a);
                        }
                    }
                }
            }
        }else{
            // If we have an object, Check for missing required properties
            checkForMissingProperties(ref[key], {type: 'PROPERTY_TYPE', resourceType: resourcePropType, propertyType});
            for(let k in ref[key]) {
                if(ref[key].hasOwnProperty(k)) {
                    checkResourceProperty(propertyType, ref[key], k);
                }
            }
        }

    }else{

        // Check for ARNs
        if(resourcesSpec.isArnProperty(key) && ref[key].indexOf('arn:aws') != 0){ // First position in string
            let k = ref[key];
            addError("crit", `${key} is expecting an Arn, '${k}' given. If this is a parameter, has it been specified with --parameters?`, placeInTemplate, `${resourcePropType}.${key}`);
        }

        // Switch statment to check primitive types
        checkPropertyType(ref, key, propertyType, resourcePropType);

    }
}

function checkPropertyType(ref: any, key: string, propertyType: string, resourcePropType: string){
    let val = ref[key];
    switch(propertyType){
        case 'String':  // A 'String' in CF can be an int or something starting with a number, it's a loose check
                        // Check the value starts with a letter or / or _
            if(!(/^[-\w\*\/]/.test(val))){
                addError('crit', `Expected type String for ${key}, got value '${val}'`, placeInTemplate, `${resourcePropType}.${key}`);
            }
            break;
        case 'Boolean':
            if(!(/^true$|^false$/i.test(val))){
                addError('crit', `Expected type Boolean for ${key}, got value '${val}'`, placeInTemplate, `${resourcePropType}.${key}`);
            }
            break;
        case 'Integer':
            try{
                parseInt(val);
            }catch(e){
                addError('crit', `Expected type Integer for ${key}, got value '${val}'`, placeInTemplate, `${resourcePropType}.${key}`);
            }
            break;
        case 'Json':
            if(typeof val != 'object'){
                addError('crit', `Expected a JSON document for ${key}, got value '${val}'`, placeInTemplate, `${resourcePropType}.${key}`);
            }
            break;
    }
}
