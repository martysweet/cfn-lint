let workingInput = null;
const logger = require('./logger');
let resourcesSpec = require('./resourcesSpec');

const mockArnPrefix = "arn:aws:mock:region:123456789012:";

main();

function main(){

    // todo: read input file

    // convert to json if required

    workingInput = require('../data/input.json');

    // process the input file
    assignOutputs(workingInput);

   // console.log(workingInput);
}

/**
 * Goes through resources as assigns valid output parameters to the resources
 */
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

}