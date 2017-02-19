let workingInput = null;
let stopValidation = false;
let errorObject;
const resourcesSpec = require('./resourcesSpec');
const logger = require('./logger');
const mockArnPrefix = "arn:aws:mock:region:123456789012:";
const parameterTypesSpec = require('../data/aws_parameter_types.json');
const awsRefOverrides = require('../data/aws_ref_override.json');

// Todo: Allow override for RefOverrides ex. Regions

exports.clearErrors = function clearErrors(){
    errorObject = {"templateValid": true, "errors": {"info": [], "warn": [], "crit": []}};
    stopValidation = false;
};

exports.validateJson = function validateJson(json){
    // TODO: Convert to object

    // Let's go!
   return validateWorkingInput();
};

exports.validateYaml = function validateYaml(yaml){
    // TODO: Convert to object
    let json = {};
    // Let's go!
    return validateWorkingInput(json);
};

exports.validateJsonObject = function validateJsonObject(obj){
    workingInput = obj;
    return validateWorkingInput();
};


function validateWorkingInput(){
    // Ensure we are working from a clean slate
    exports.clearErrors();

    // TODO: Check for base keys such as version

    // TODO: Check keys for parameter are valid, ex. MinValue/MaxValue

    // Check parameters and assign outputs
    assignParametersOutput();

    // Assign outputs to all the resources
    assignResourcesOutputs();
    if(stopValidation) {
        // Stop the validation early, we can't join stuff if we don't know what to expect
        logger.error("Stopping validation early as a resource type is invalid.");
        return errorObject;
    }

    // Use the outputs assigned to resources to resolve references
    resolveReferences();
    // TODO: See if this would ever set the stopValidation flag


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
            if (!workingInput['Parameters'][param].hasOwnProperty('Type')) {
                // We are going to assume type if a string to continue validation, but will throw a critical
                // TODO: Link to CFN Parameter Type documentation
                addError('crit', `Parameter ${param} does not have a Type defined.`, ['Parameters', param], null);
            }else{

                let parameterType = workingInput['Parameters'][param]['Type'];

                // Check if the parameter type is valid
                if(!parameterTypesSpec.hasOwnProperty(parameterType)){
                    // TODO: Link to CFN Parameter Type documentation
                    addError('crit', `Parameter ${param} has an invalid type of ${parameterType}.`, ['Parameters', param], null);
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
        'help': help
    };

    // Set the information
    errorObject.errors[severity].push(obj);

    // Template invalid if critical error
    if(severity == 'crit'){
        errorObject.templateValid = false;
    }

    // Debug
    let strResourceStack = resourceStack.join(' > ');
    logger.debug(`Error thrown: ${severity}: ${message} (${strResourceStack})`);
}

function assignResourcesOutputs(){
    if(!workingInput.hasOwnProperty('Resources')){
        addError('crit', 'Resources section is not defined', [], null);
        stopValidation = true;
        return false;
    }

    if(workingInput['Resources'].length == 0){
        addError('crit', 'Resources is empty', [], null);
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
                        null // TODO: Go to the resources help page
                );
            }else{
                // Check if Type is valid
                resourceType = workingInput['Resources'][res]['Type'];
                spec = resourcesSpec.getType(workingInput['Resources'][res]['Type']);
                if(spec === null){
                    addError('crit',
                        `Resource ${res} has an invalid Type of ${resourceType}.`,
                        ['Resources', res],
                        null // TODO: go to resources help page
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
        let intrinsicFunctions = ['Ref', 'Fn::Base64', 'Fn::Join', 'Fn::GetAtt'];

        if(intrinsicFunctions.indexOf(key) != -1){
            let functionOutput = resolveIntrinsicFunction(ref, key);
            if(functionOutput !== null) {
                // Overwrite the position with the resolved value
                lastPositionInTemplate[lastPositionInTemplateKey] = functionOutput;
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
        default:
            return null;
            break;
    }
}

function doIntrinsicRef(ref, key){

    // Check if the value of the Ref exists
    let refValue = ref[key];
    let resolvedVal = getRef(refValue);
    if (resolvedVal == null) {
        addError('crit', `Referenced value ${refValue} does not exist`, placeInTemplate, null);
        resolvedVal = "INVALID_REF";
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
            addError("crit", "Parameter of Fn::Base64 does not resolve to a string", placeInTemplate, null); // TODO: base64 doc
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
        addError('crit', 'Invalid parameters for Fn::Join', placeInTemplate, null); // TODO: Docs to Fn::Join
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
        addError("crit", "Invalid parameters for Fn::GetAtt", placeInTemplate, null); // TODO: Add GetAtt Doc
        return "INVALID_GET_ATT"
    }else{
        if(typeof toGet[0] != "string"){ // TODO Implement unit test for this
            addError("crit", "Fn::GetAtt does not support functions for the logical resource name", placeInTemplate, null); // TODO: Add GetAtt Doc
        }

        // The AttributeName could be a Ref, so check if it needs resolving
        if(typeof toGet[1] != "string"){
            let keys = Object.keys(toGet[1]);
            if(keys[0] == "Ref") { // TODO Implement unit test for this
                toGet[1] = resolveIntrinsicFunction(toGet[1], "Ref");
            }else{ // TODO Implement unit test for this
                addError("crit", "Fn::GetAtt only supports Ref within the AttributeName", placeInTemplate, null); // TODO: Add GetAtt Doc
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



