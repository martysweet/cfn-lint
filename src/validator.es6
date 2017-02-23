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

function addParameterOverride(parameter, value){
    parameterRuntimeOverride[parameter] = value;
}

function validateWorkingInput(){
    // Ensure we are working from a clean slate
    //exports.resetValidator();

    // TODO: Check for base keys such as version

    // TODO: Check keys for parameter are valid, ex. MinValue/MaxValue

    // Check parameters and assign outputs
    assignParametersOutput();

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
                parameterRefAttribute = parameterRuntimeOverride[param];
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
            let refValue = "example-ref-" + res;
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

function resolveIntrinsicFunction(ref, key){
    switch(key){
        case 'Ref':
            return doIntrinsicRef(ref, key);
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
    if(toGet.length != 2){
        addError("crit", "Invalid parameters for Fn::GetAtt", placeInTemplate, "Fn::GetAtt");
        return "INVALID_GET_ATT"
    }else{
        if(typeof toGet[0] != "string"){ // TODO Implement unit test for this
            addError("crit", "Fn::GetAtt does not support functions for the logical resource name", placeInTemplate, "Fn::GetAtt");
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
    // We have a simple replace
    if(typeof toGet == 'string'){
        replacementStr = toGet;
    }else{
        // We should have an array
        if(toGet.hasOwnProperty(0)){
            if(typeof toGet[0] == 'string'){
                replacementStr = toGet[0];
            }else{
                // TODO Implement recursive resolving of all the parameters
            }
        }else{
            addError('crit', 'Fn::Sub function malformed, first array element should be present', placeInTemplate, "Fn::Sub");
        }
        replacementStr = "TO_BE_IMPLEMENTED";
    }

    // Extract the replacement parts
    let regex = /\${([A-Za-z:.!]+)/gm
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
            // Use Fn::GetAtt
            let parts = m.split('.');
            replacementVal = fnGetAtt(parts[0], parts[1]);
        }else{
            // Use Ref
            replacementVal = getRef(m);
        }

        // Do a string replace on the string
        replacementStr = replacementStr.replace("${" + m + "}", replacementVal);

    }

    // Set the resolved value as a string
    return replacementStr;
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

function checkResourceProperties() {
    let resources = workingInput['Resources'];
    for (let res in resources) {
        if (resources.hasOwnProperty(res) && resourcesSpec.getType(resources[res]['Type']) !== null) {
            if(resources[res].hasOwnProperty('Properties')) {
                let resourceType = resources[res]['Type'];
                // TODO Check if any required properties are missing

                // TODO How to handle optional required parameters
                for (let [prop, value] of Object.entries(resources[res]['Properties'])) {
                    checkResourceProperty(resourceType, resources[res]['Properties'], prop);
                }
            }
        }
    }
}

function checkResourceProperty(resourcePropType, ref, key){

    // Using the Key, the the Resource Type, get the expected Property type
    // resourceSpec get type of property using resourceType and property name
    if(resourcesSpec.isValidProperty(resourcePropType, key)){

        // Check if the property is a string
        let isPrimitiveProperty = resourcesSpec.isPrimitiveProperty(resourcePropType, key);

        // Check if list of primitives
        if(resourcesSpec.isPropertyTypeList(resourcePropType, key)) {
            // Check if the given property is an array
            if(typeof ref[key] == 'object' && ref[key].constructor === Array){
                for(let item in ref[key]){
                    if(ref[key].hasOwnProperty(item)) {
                        checkProperty(resourcePropType, ref[key], item, isPrimitiveProperty);
                    }
                }
            }else{
                // TODO: Check DuplicatesAllowed
                addError("crit", `Expecting a list for ${key}`, placeInTemplate, `${resourcePropType}.${key}`);
            }
        }else{
            // Expect a single value or object if isPrimitiveProperty == false
            if(typeof ref[key] == 'object' && (typeof ref[key == 'string'] && isPrimitiveProperty === false)){
                checkProperty(resourcePropType, ref, key, isPrimitiveProperty);
            }
        }
    }else{
        addError("crit", ` ${key} is not a valid property of ${resourcePropType}`, placeInTemplate, resourcePropType);
    }

}


// Checks a single element of a property
function checkProperty(resourcePropType, ref, key, isPrimitive){
console.log("check");
    if(!isPrimitive){
        // Recursive solve this property

    }else{

        // Check for ARNs
        if(resourcesSpec.isArnProperty(key) && ref[key].indexOf('aws:arn') == -1){
            let k = ref[key];
            addError("crit", `${key} is expecting an Arn, '${k}' given.`, placeInTemplate, `${resourcePropType}.${key}`);
        }

        // Switch statment to check primitive types

    }
    // Check each item for ARN validation
    // Check if the property need to resolve to an ARN


    // Check each item against primitive type, bool/long/string, if custom type, recurse
}