let workingInput = null;
let stopValidation = false;
let errorObject = {"templateValid": true, "errors": {"info": [], "warn": [], "crit": []}};
const resourcesSpec = require('./resourcesSpec');
const logger = require('./logger');
const parser = require('./parser');
const mockArnPrefix = "arn:aws:mock:region:123456789012:";
const parameterTypesSpec = require('../data/aws_parameter_types.json');
const awsRefOverrides = require('../data/aws_ref_override.json');
const awsIntrinsicFunctions = require('../data/aws_intrinsic_functions.json');
const docs = require('./docs');
let parameterRuntimeOverride= {};
// Todo: Allow override for RefOverrides ex. Regions

exports.resetValidator = function resetValidator(){
    errorObject = {"templateValid": true, "errors": {"info": [], "warn": [], "crit": []}};
    stopValidation = false;
    parameterRuntimeOverride = {};
};

exports.validateFile = function validateFile(path){
    // Convert to object, this will throw an exception on an error
    workingInput = parser.openFile(path);
    // Let's go!
   return validateWorkingInput();
};

exports.validateJsonObject = function validateJsonObject(obj){
    workingInput = obj;
    return validateWorkingInput();
};

exports.addParameterValue = function addParameterValue(parameter, value){
    addParameterOverride(parameter, value);
};

exports.addPseudoValue = function addPseudoValue(parameter, value){
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

function addParameterOverride(parameter, value){
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

    return errorObject;

}

function assignParametersOutput(){
    if(!workingInput.hasOwnProperty('Parameters')){
        return false; // This isn't an issue
    }

    // For through each parameter
    for(let param in workingInput['Parameters']) {
        if (workingInput['Parameters'].hasOwnProperty(param)) {

            // Check if Type is defined
            let parameterRefAttribute = `string_input_${param}`;

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

                let parameterType = workingInput['Parameters'][param]['Type'];

                // Check if the parameter type is valid
                if(!parameterTypesSpec.hasOwnProperty(parameterType)){
                    addError('crit', `Parameter ${param} has an invalid type of ${parameterType}.`, ['Parameters', param], "Parameters");
                }else{

                        // Check the Type of an array specification, otherwise assume string
                        if(parameterTypesSpec[parameterType] == "array"){
                            parameterRefAttribute = ['param1', 'param2', 'param3'];
                        }
                    }
            }

            // Assign an Attribute Ref regardless of any failures above
            workingInput['Parameters'][param]['Attributes'] = {};
            workingInput['Parameters'][param]['Attributes']['Ref'] = parameterRefAttribute;
        }
    }
}

function addError(severity, message, resourceStack, help){
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
                spec = resourcesSpec.getType(workingInput['Resources'][res]['Type']);
                if(spec === null){
                    addError('crit',
                        `Resource ${res} has an invalid Type of ${resourceType}.`,
                        ['Resources', res],
                        "Resources"
                    );
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
            if(spec != null && spec.hasOwnProperty('Attributes')){
                for(let attr in spec['Attributes']){
                    if(spec['Attributes'].hasOwnProperty(attr)) {
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

}

function resolveReferences(){
    // TODO: Go through and resolve...
    // TODO: Ref, Attr, Join,

    // Resolve all Ref
    lastPositionInTemplate = workingInput;
    recursiveDecent(lastPositionInTemplate);


    let stop = workingInput;

}

let placeInTemplate = [];
let lastPositionInTemplate = null;
let lastPositionInTemplateKey = null;

function recursiveDecent(ref){
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
                if (functionOutput !== null) {
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

function resolveCondition(ref, key){
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

function resolveIntrinsicFunction(ref, key){
    switch(key){
        case 'Ref':
            return doIntrinsicRef(ref, key);
            break;
        case 'Condition':
            return resolveCondition(ref, key);
            break;
        case 'Fn::Join':
            return doIntrinsicJoin(ref, key);
            break;
        case 'Fn::Base64':
            return doIntrinsicBase64(ref, key);
            break;
        case 'Fn::GetAtt':
            return doIntrinsicGetAtt(ref, key);
            break;
        case 'Fn::FindInMap':
            return doIntrinsicFindInMap(ref, key);
            break;
        case 'Fn::GetAZs':
            return doIntrinsicGetAZs(ref, key);
            break;
        case 'Fn::Sub':
            return doIntrinsicSub(ref, key);
            break;
        case 'Fn::If':
            return doIntrinsicIf(ref, key);
            break;
        case 'Fn::Equals':
            return doIntrinsicEquals(ref, key);
            break;
        case 'Fn::Or':
            return doIntrinsicOr(ref, key);
            break;
        case 'Fn::Not':
            return doIntrinsicNot(ref, key);
            break;
        case 'Fn::ImportValue':
            return doIntrinsicImportValue(ref, key);
            break;
        default:
            addError("warn", `Unhandled Intrinsic Function ${key}, this needs implementing. Some errors might be missed.`, placeInTemplate, "Functions");
            return null;
            break;
    }
}

function doIntrinsicRef(ref, key){

    let refValue = ref[key];
    let resolvedVal = "INVALID_REF";

    // Check if it's of a String type
    if(typeof refValue != "string"){
        addError("crit", "Intrinsic Function Ref expects a string", placeInTemplate, "Ref");
    }else {
        // Check if the value of the Ref exists
        resolvedVal = getRef(refValue);
        if (resolvedVal == null) {
            addError('crit', `Referenced value ${refValue} does not exist`, placeInTemplate, "Ref");
            resolvedVal = "INVALID_REF";
        }
    }

    // Return the resolved value
    return resolvedVal;

}

function doIntrinsicBase64(ref, key){
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

function doIntrinsicJoin(ref, key){
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

function doIntrinsicGetAtt(ref, key){
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

function doIntrinsicFindInMap(ref, key){
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

function doIntrinsicGetAZs(ref, key){
    let toGet = ref[key];
    let region = awsRefOverrides['AWS::Region'];
    // If the argument is not a string, check it's Ref and resolve
    if(typeof toGet != "string"){
        let key = Object.keys(toGet)[0];
        if(key == "Ref") {
            if(toGet[key] != 'AWS::Region'){
                addError("warn", "Fn::GetAZs expects a region, ensure this reference returns a region", placeInTemplate, "Fn::GetAZs");
            }
            region = resolveIntrinsicFunction(toGet, "Ref");
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

function doIntrinsicSub(ref, key){
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
                    replacementVal = resolveIntrinsicFunction(definedParams[m], Object.keys(m)[0]);
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

function doIntrinsicIf(ref, key){
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

function doIntrinsicEquals(ref, key) {
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

function doIntrinsicOr(ref, key) {
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

function doIntrinsicNot(ref, key){

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

function doIntrinsicImportValue(ref, key){
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
        addError(`warn`, `Something went wrong when resolving references for a Fn::ImportValue`, placeInTemplate, 'Fn::ImportValue');
        return 'INVALID_FN_IMPORTVALUE';
    }


}

function fnJoin(join, parts){
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

function fnGetAtt(reference, attribute){
    if(workingInput['Resources'].hasOwnProperty(reference)){
        if(workingInput['Resources'][reference]['Attributes'].hasOwnProperty(attribute)){
            return workingInput['Resources'][reference]['Attributes'][attribute];
        }
    }
    // Return null if not found
    return null;
}

function fnFindInMap(map, first, second){
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

function getRef(reference){
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

let baseResourceType = null;

function checkResourceProperties() {

    // Go into resources
    placeInTemplate.push('Resources');
    let resources = workingInput['Resources'];

    // Go through each resource
    for (let res in resources) {

        // Check the property exists
        if (resources.hasOwnProperty(res) && resourcesSpec.getType(resources[res]['Type']) !== null) {

            // Add the resource name to stack
            placeInTemplate.push(res);

            // Set the baseResourceType for PropertyType derivation
            baseResourceType = resources[res]['Type'];

            // Do property validation if Properties in present
            if(resources[res].hasOwnProperty('Properties')) {

                // Add Properties to the location stack
                placeInTemplate.push('Properties');
                let resourceType = resources[res]['Type'];

                // Check for missing required properties
                checkForMissingProperties(resources[res]['Properties'], resourceType);

                // TODO How to handle optional required parameters

                // Process each Property
                checkEachProperty(resourceType, resources[res], 'Properties');

                // Remove Properties
                placeInTemplate.pop();
            }

            // Remove resources
            placeInTemplate.pop();
        }
    }

    // Remove Resource
    placeInTemplate.pop();
}

function checkEachProperty(resourceType, ref, key){
    Object.keys(ref[key]).forEach((prop) => {
        checkResourceProperty(resourceType, ref[key], prop);
    });
}

function checkResourceProperty(resourcePropType, ref, key){

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
                        if (resourcesSpec.isPrimitiveTypeList(resourcePropType, key)) {
                            // Get the Primitive List Type
                            let primitiveItemType = resourcesSpec.getPrimitiveItemType(resourcePropType, key);
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
                            checkProperty(resourcePropType, ref[key], item, isPrimitiveProperty, propertyType);
                        }
                    }
                }
            }else{
                // TODO: Check DuplicatesAllowed
                if(typeof ref[key] != 'string' && ref[key] != '') { // Allow an empty string instead of a list
                    addError("crit", `Expecting a list for ${key}`, placeInTemplate, `${baseResourceType}.${key}`);
                }
            }
        }else{
            // Expect a single value or object if isPrimitiveProperty == false
            let primTypeOf = typeof ref[key];
            let isPrimTypeOf = (primTypeOf == 'string' || primTypeOf == 'number' || primTypeOf == 'boolean');
            if((typeof ref[key] == 'object' && !isPrimitiveProperty) || (isPrimTypeOf && isPrimitiveProperty)) {
                placeInTemplate.push(key);
                let propertyType = resourcesSpec.getPropertyType(baseResourceType, resourcePropType, key);
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

function checkForMissingProperties(properties, resourceType){
    let requiredProperties = resourcesSpec.getRequiredProperties(resourceType);

    // Remove the properties we have from the required property list
    for(let prop in properties){
        if(properties.hasOwnProperty(prop)){
            let indexOfRequired = requiredProperties.indexOf(prop);
            if(indexOfRequired !== -1){
                requiredProperties.splice(indexOfRequired, 1);
            }
        }
    }

    // If we have any items left over, they have not been defined
    if(requiredProperties.length > 0){
        for(let prop of requiredProperties){
            addError(`crit`, `Required property ${prop} missing for type ${resourceType}`, placeInTemplate, resourceType);
        }
    }
}

// Checks a single element of a property
function checkProperty(resourcePropType, ref, key, isPrimitiveType, propertyType){

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
            checkForMissingProperties(ref[key], propertyType);
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

function checkPropertyType(ref, key, propertyType, resourcePropType){
    let val = ref[key];
    switch(propertyType){
        case 'String':  // A 'String' in CF can be an int or something starting with a number, it's a loose check
                        // Check the value starts with a letter or / or _
            if(!(/^[-\w\/]/.test(val))){
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