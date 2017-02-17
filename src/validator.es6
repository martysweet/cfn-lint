let workingInput = null;
let stopValidation = false;
let errorObject = {"templateValid": false, "errors": {"info": [], "warn": [], "crit": []}};
const logger = require('./logger');

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
    // TODO: Check parameters and outputs

    // Assign outputs to all the resources
    assignOutputs();
    if(stopValidation) {
        logger.error("Stopping validation early as a resource type is invalid.");
        return errorObject;
    }

    // Use the outputs assigned to resources to resolve references
    resolveReferences();
    // TODO: See if this would ever set the stopValidation flag


    return errorObject;

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
}

function assignOutputs(){
    if(!workingInput.hasOwnProperty('Resources')){
        return false;
    }

    // For through each resource
    for(let res in workingInput['Resources']){
        if(workingInput['Resources'].hasOwnProperty(res)){

            // Check if Type is defined
            if(!workingInput['Resources'][res].hasOwnProperty('Type')){
                // TODO: Throw validation error
                // TODO: Set flag so we can't continue
                logger.error(`Resource ${res} does not have a Type.`);
                continue;
            }

            // Check if Type is valid
            let resourceType = workingInput['Resources'][res]['Type'];
            let spec = resourcesSpec.getType(workingInput['Resources'][res]['Type']);
            if(spec === null){
                // TODO: Throw validation error
                // TODO: Set flah so we can't continue
                logger.error(`Resource ${res} has an invalid Type.`);
                continue;
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
            if(spec.hasOwnProperty('Attributes')){
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
}



