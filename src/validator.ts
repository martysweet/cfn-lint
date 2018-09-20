let workingInput: any = null;
let workingInputTransform: string[] = [];
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
    ListAttribute,
    AWSResourcesSpecification,
} from './awsData';
import * as awsData from './awsData';
import * as samData from './samData';
import docs = require('./docs');

import util = require('util');

import CustomError = require('./util/CustomError');

import sms = require('source-map-support');
sms.install();

const clone = require('clone');

const mergeOptions = require('merge-options');

const arrayIntersection = require('array-intersection');

const shajs = require('sha.js');

require('./util/polyfills');

export type ParameterValue = string | string[];
export type ImportValue = ParameterValue;
let parameterRuntimeOverride: {[parameter: string]: ParameterValue | undefined} = {};
let importRuntimeOverride: {[parameter: string]: ImportValue | undefined} = {};
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
    importRuntimeOverride = {};
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

export function addImportValue(parameter: string, value: ImportValue){
    addImportOverride(parameter, value);
}

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

export function addCustomResourceAttributeValue(resource: string, attribute: string, value: any){
    let attrType = inferValueType(value, []);

    let newSpec = {
      'Attributes': {
        [attribute]: {
          PrimitiveType: attrType,
          Value: value
        }
      }
    };

    // register resource type or logical name override
    if (!!~resource.indexOf('::')) {
        resourcesSpec.registerTypeOverride(resource, newSpec);
    } else {
        resourcesSpec.registerLogicalNameOverride(resource, newSpec);
    }
};

function addParameterOverride(parameter: string, value: ParameterValue){
    parameterRuntimeOverride[parameter] = value;
}

function addImportOverride(parameter: string, value: ImportValue){
    importRuntimeOverride[parameter] = value;
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

    // Check Transform
    if (workingInput.hasOwnProperty(['Transform'])) {
      // assign defined transforms to the validator
      workingInputTransform = workingInput['Transform'];
      // initialize transform output
      if (!!~workingInputTransform.indexOf('AWS::Serverless-2016-10-31')) {
          workingInput['SAMOutput'] = {}
      }
    }


    // TODO: Check keys for parameter are valid, ex. MinValue/MaxValue

    // Apply specification overrides
    applySpecificationOverrides();

    // Apply template overrides
    applyTemplateOverrides();

    // Check parameters and assign outputs
    assignParametersOutput(options.guessParameters);

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

    // Re-Apply template overrides
    applyTemplateOverrides();

    // Go through the hopefully resolved properties of each resource
    checkResourceProperties();

    // Assign template outputs to the error object
    collectOutputs();

    return errorObject;

}

function applySpecificationOverrides() {

    // extend resources specification with SAM specifics
    if (!!~workingInputTransform.indexOf('AWS::Serverless-2016-10-31')) {
        resourcesSpec.extendSpecification(samData.samResources20161031);
    }

    // normalize Tag property type access
    let tagPropertyTypes: any = {};
    for (let resourceKey of Object.keys(awsData.awsResources['ResourceTypes'])) {
        tagPropertyTypes[`${resourceKey}.Tag`] = awsData.awsResources['PropertyTypes']['Tag'];
    }

    resourcesSpec.extendSpecification({'PropertyTypes': tagPropertyTypes});
}

function inferPrimitiveValueType(v: any) {

    if (isInteger(v)) {
      return 'Integer';
    }
    if (isDouble(v)) {
      return 'Double';
    }
    if (isBoolean(v)) {
      return 'Boolean';
    }
    if (isJson(v)) {
      return 'Json';
    }
    if (isTimestamp(v)) {
      return 'Timestamp';
    }
    if (isString(v)) {
      return 'String';
    }

    return null;
}

function inferStructureValueType(v: any, candidateTypes: string[]) {
    let type: string | null = null;
    if (isObject(v)) {
        if (v.hasOwnProperty('Type')) {
          let objectType = v['Type'];
          for (let candidateType of candidateTypes!) {
            if (!!~candidateType.indexOf(objectType)) {
              type = candidateType;
            }
          }
        } else {
          let objectKeys = [];
          if (v.hasOwnProperty('Properties')) {
            objectKeys = Object.keys(v['Properties']);
          } else {
            objectKeys = Object.keys(v);
          }
          let lastMatchCount = 0;
          for (let candidateType of candidateTypes!) {
              let candidate = resourcesSpec.getType(candidateType);
              let candidateKeys = Object.keys(candidate['Properties']);
              let matchCount = arrayIntersection(objectKeys, candidateKeys).length;
              if (matchCount > lastMatchCount) {
                type = candidateType;
                lastMatchCount = matchCount;
              }
          }
        }
    }
    return type;
}

function inferAggregateValueType(v: any, candidateItemTypes: string[]): string | null {
    let item: any = null;
    let type: string | null = null;
    let itemType: string | null = null;

    if (isList(v)) {
        type = 'List';
        item = v.pop();
    }
    else if (isObject(v)) {
        type = 'Map';
        item = v[Object.keys(v).pop()!];
    }

    if (!!item) {
      itemType = inferValueType(item, candidateItemTypes);
      // aggregate type nesting is not currently supported
      if (!!itemType && resourcesSpec.isComplexType(itemType)) {
          return 'Json';
      }
    }

    return (!!type && !!itemType) ? `${type}<${itemType}>` : null;
}

function inferValueType(v: any, candidateTypes: string[]) {
     candidateTypes = candidateTypes.filter((x) => !resourcesSpec.isPrimitiveType(x));
     let candidateStructureTypes: string[] = candidateTypes.filter((x) => {
        if (resourcesSpec.isParameterizedTypeFormat(x) &&
            resourcesSpec.isComplexType(resourcesSpec.getParameterizedTypeName(x))) {
            return false;
        }
        return true;
    });
    let candidateAggregateTypes: string[] = candidateTypes.filter((x) => {
       if (resourcesSpec.isParameterizedTypeFormat(x) &&
           resourcesSpec.isComplexType(resourcesSpec.getParameterizedTypeName(x))) {
           return true;
       }
       return false;
    });
    candidateAggregateTypes = candidateAggregateTypes.map((x) => resourcesSpec.getParameterizedTypeArgument(x));

    let type: string | null = inferStructureValueType(v, candidateStructureTypes);
    if (!type) {
        type = inferAggregateValueType(v, candidateAggregateTypes);
        if (!type) {
            type = inferPrimitiveValueType(v);
        }
    }
    return type;
}

function formatCandidateTypes(baseType: string, candidateTypes: string[]) {
    // remove generic name part
    candidateTypes = candidateTypes.map((x) => resourcesSpec.getParameterizedTypeArgument(x));

    // format property types
    candidateTypes = candidateTypes.map((x) => resourcesSpec.rebaseTypeFormat(baseType, x));

    return candidateTypes;
}

function applySAMPropertyOverrides(baseType: string, baseName: string, type: string, name: string,
                                                spec: awsData.Property, template: any) {
    // early exit for unsupported template or base type
    if (!~workingInputTransform.indexOf('AWS::Serverless-2016-10-31') || !~baseType.indexOf('AWS::Serverless')) { return; }

    let localizedType = baseType == type ? type : `${baseType}.${type}<${name}>`;

    // specialize property based on inferred Type
    let specType: any = spec['Type'];
    if (Array.isArray(specType)) {

        // skip if template has unresolved intrinsic functions
        if (arrayIntersection(Object.keys(awsIntrinsicFunctions), Object.keys(template)).length > 0) {
            return;
        }
        let candidateTypes = formatCandidateTypes(baseType, specType);

        // infer property spec based on value in template
        let inferredCandidateType: string | null;
        if (!!(inferredCandidateType = inferValueType(template, candidateTypes))) {
            inferredCandidateType = inferredCandidateType.replace(`${baseType}.`, '');

            // determine spec based on a parameterized type matching the inferred candidate type
            if (resourcesSpec.hasProperty(localizedType, `${name}<${inferredCandidateType}>`)) {
                let candidateSpec = resourcesSpec.getProperty(localizedType, `${name}<${inferredCandidateType}>`);

                // override property spec
                for (let property of Object.keys(spec)) {
                    if (!candidateSpec.hasOwnProperty(property)) {
                      delete (<any>spec)[property];
                    }
                }

                Object.assign(spec, clone(candidateSpec));
            }
        }
    }
}

function doSAMTransform(baseType:string, type: string, name: string, template: any, parentTemplate: any) {
    // early exit for unsupported template or base type
    if (!~workingInputTransform.indexOf('AWS::Serverless-2016-10-31') || !~baseType.indexOf('AWS::Serverless')) { return; }

    // destructure name
    let nameParts = name.split('#');
    let logicalID = nameParts.shift();
    let propertyName = nameParts.shift();
    let itemID = nameParts.shift();

    // determine transform key
    let transformKey = baseType;
    if (!!propertyName) {
        transformKey = `${transformKey}#${propertyName}`;
    }
    if (!!itemID) {
        let itemType = type;
        transformKey = `${transformKey}#ItemID<${itemType}>`;
    }

    // determine available properties
    let localProperties: any = null;
    if (!!template && template.hasOwnProperty('Properties')) {
      localProperties = template['Properties'];
    }

    let parentProperties: any = null;
    if (!!parentTemplate && parentTemplate.hasOwnProperty('Properties')) {
      parentProperties = parentTemplate['Properties'];
    }

    // create supporting resources
    let output = workingInput['SAMOutput'];
    let transform = samData.samImplicitResources20161031[transformKey];
    if (!!transform) {
        let resourceTypes = Object.keys(transform);
        for (let resourceType of resourceTypes) {

            // build resource logical ID
            let resourceLogicalID = transform[resourceType]['logicalId'];
            resourceLogicalID = resourceLogicalID.replace('<LogicalID>', logicalID);
            resourceLogicalID = resourceLogicalID.replace('<ItemID>', itemID);

            switch (transformKey) {
              case 'AWS::Serverless::Function#AutoPublishAlias':
                switch (resourceType) {
                  case 'AWS::Lambda::Alias':
                    if (!!parentProperties && parentProperties.hasOwnProperty('AutoPublishAlias')) {
                      let autoPublishAlias = parentProperties['AutoPublishAlias'];
                      resourceLogicalID = resourceLogicalID.replace('<AutoPublishAlias>', autoPublishAlias);
                    }
                    break;

                  case 'AWS::Lambda::Version':
                    // TODO: this may be non-deterministic and does not handle the case when CodeUri refers to local path
                    let codeDict: any = null;

                    if (!!parentProperties && parentProperties.hasOwnProperty('CodeUri')) {
                      if (parentProperties['CodeUri'].hasOwnProperty('Bucket')) {
                        codeDict['S3Bucket'] = parentProperties['CodeUri']['Bucket'];
                      }
                      if (parentProperties['CodeUri'].hasOwnProperty('Key')) {
                        codeDict['S3Key'] = parentProperties['CodeUri']['Key'];
                      }
                      if (parentProperties['CodeUri'].hasOwnProperty('Version')) {
                        codeDict['S3ObjectVersion'] = parentProperties['CodeUri']['Version'];
                      }
                    } else if (!!parentProperties && parentProperties.hasOwnProperty('InlineCode')) {
                      codeDict['ZipFile'] = parentProperties['InlineCode'];
                    } else {
                      // TODO: perhaps raise validation error if neither CodeUri or InlineCode have been provided
                    }

                    if (!!codeDict) {
                      codeDict = JSON.stringify(codeDict);
                      let codeID = shajs('sha256').update(codeDict).digest('hex').substr(0, 10);
                      resourceLogicalID = resourceLogicalID.replace('<CodeID>', codeID);
                    }
                    break;
                }
                break;

              case 'AWS::Serverless::Function#Events#ItemID<ApiEvent>':
                // TODO: we currently have no way of knowing the DefinitionID
                break;

              case 'AWS::Serverless::Api':
                // TODO: this may be non-deterministic and does not handle the case when DefinitionUri refers to local path
                switch (resourceType) {
                  case 'AWS::ApiGateway::Deployment':
                    let definition: any = null;

                    if (!!localProperties && localProperties.hasOwnProperty('DefinitionUri')) {
                      definition = {};
                      if (localProperties['DefinitionUri'].hasOwnProperty('Bucket')) {
                        definition['Bucket'] = localProperties['DefinitionUri']['Bucket'];
                      }
                      if (localProperties['DefinitionUri'].hasOwnProperty('Key')) {
                        definition['Key'] = localProperties['DefinitionUri']['Key'];
                      }
                      if (localProperties['DefinitionUri'].hasOwnProperty('Version')) {
                        definition['Version'] = localProperties['DefinitionUri']['Version'];
                      }
                    } else if (!!localProperties && localProperties.hasOwnProperty('DefinitionBody')) {
                      definition = localProperties['DefinitionBody'];
                    } else {
                      // TODO: perhaps raise validation error if neither DefinitionUri or DefinitionBody have been provided
                    }

                    if (!!definition) {
                      definition = JSON.stringify(definition);
                      let definitionID = shajs('sha256').update(definition).digest('hex').substr(0, 10);
                      resourceLogicalID = resourceLogicalID.replace('<DefinitionID>', definitionID);
                    }
                    break;

                  case 'AWS::ApiGateway::Stage':
                    if (!!localProperties && localProperties.hasOwnProperty('StageName')) {
                      let stageName = localProperties['StageName'];
                      resourceLogicalID = resourceLogicalID.replace('<StageName>', stageName);
                    }
                    break;
                }
                break;
            }

            // build resource template
            let resourceTemplate: any = {
              'Type': resourceType,
              'Attributes': {}
            };
            let resourceSpec: any = resourcesSpec.getType(resourceType);
            if (resourceSpec.hasOwnProperty('Attributes')) {
                for (let attribute of Object.keys(resourceSpec['Attributes'])) {
                    let attributeValue = `mockAttr_${attribute}`;
                    if (!!~attribute.indexOf('Arn')) {
                        attributeValue = mockArnPrefix;
                    }
                    resourceTemplate['Attributes'][attribute] = attributeValue;
                    resourceTemplate['Attributes']['Ref'] = attributeValue;
                }
            }

            // assign resource output
            output[resourceLogicalID] = resourceTemplate;

            // link supporting resource to referable property of source
            let sourceRefProperty = transform[resourceType]['refProperty']
            if (!!sourceRefProperty) {
                output[`${logicalID}.${sourceRefProperty}`] = output[resourceLogicalID];
            }
        }
    }
}

function applyTemplatePropertyOverrides(baseType: string, baseName:string, type: string, name: string, spec: awsData.Property,
                                        template: any, parentTemplate: any) {
    applySAMPropertyOverrides(baseType, baseName, type, name, spec, template);
    doSAMTransform(baseType, type, `${baseName}#${name}`, template, parentTemplate);
}

function applyTemplateTypeOverrides(baseType: string, type: string, name: string, template: any, parentTemplate: any) {

    // process type overrides
    doSAMTransform(baseType, type, name, template, parentTemplate);

    // early exit for invalid type
    let localizedType = baseType == type ? type : `${baseType}.${type}<${name}>`;
    if (!resourcesSpec.hasType(localizedType)) {
      return;
    }

    // initialize specification override
    let originalSpec = resourcesSpec.getType(localizedType);
    let overrideSpec = clone(originalSpec);

    // determine properties section
    let templateProperties = template;
    if (baseType == type) {
        templateProperties = template['Properties'];
    }

    // apply property overrides
    if (!!templateProperties && (typeof templateProperties == 'object')) {
        for (let propertyName of Object.keys(templateProperties)) {

            // acquire property template
            let templateProperty = templateProperties[propertyName];
            if (!templateProperty) {
              continue;
            }

            // process property
            let specProperty = overrideSpec['Properties'][propertyName] as awsData.Property;
            if (!!specProperty) {
                applyTemplatePropertyOverrides(baseType, name, type, propertyName, specProperty, templateProperty, template);

                // descend into nested types
                if (specProperty.hasOwnProperty('ItemType')) {
                    let subType = specProperty['ItemType'] as string;
                    for (let subKey of Object.keys(templateProperty)) {
                        let subTemplate = templateProperty[subKey];
                        applyTemplateTypeOverrides(baseType, subType, `${name}#${propertyName}#${subKey}`, subTemplate, template);
                    }
                } else if (specProperty.hasOwnProperty('Type')) {
                    let subType = specProperty['Type'] as string;
                    applyTemplateTypeOverrides(baseType, subType, `${name}#${propertyName}`, templateProperty, template);
                }
            }
        }
    }

    // register specification overrides
    if (JSON.stringify(originalSpec) !== JSON.stringify(overrideSpec)) {
        resourcesSpec.registerLogicalNameOverride(name, overrideSpec);
    }
}

function applyTemplateOverrides() {
    // process input
    if (workingInput.hasOwnProperty('Resources')) {
        let workingInputResources = workingInput['Resources'];
        if (!!workingInputResources && (typeof workingInputResources == 'object')) {
            for (let name of Object.keys(workingInputResources)) {
                let template = workingInputResources[name];
                if (!!template) {
                    if (template.hasOwnProperty('Type')) {
                        let type = template['Type'];
                        if (!!type) {
                            applyTemplateTypeOverrides(type, type, name, template, null);
                        }
                    }
                }
            }
        }
    }
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

function addError(severity: Severity, message : string, resourceStack: typeof placeInTemplate = [], help: string = ''){
    let obj = {
        'message': resourcesSpec.stripTypeParameters(message),
        'resource': resourceStack.join(' > '),
        'documentation': docs.getUrls(resourcesSpec.stripTypeParameters(help)).join(', ')
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
            let resourceType = '';
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
                resourceType = `${workingInput['Resources'][res]['Type']}<${res}>`;
                try {
                    spec = resourcesSpec.getResourceType(resourceType);
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
                    let value: any = null;

                    // use user-defined attribute value if provided for the specific type
                    try {
                        let attrSpec: any = resourcesSpec.getResourceTypeAttribute(resourceType, attr);
                        if (attrSpec.hasOwnProperty('Value')) {
                            value = attrSpec['Value'];
                        }
                    } catch(e) {}

                    // otherwise use an implicit mock value
                    if (!value) {
                      if (attr.indexOf('Arn') != -1) {
                          value = mockArnPrefix + res;
                      }else {
                          value = "mockAttr_" + res;
                      }
                    }

                    workingInput['Resources'][res]['Attributes'][attr] = value;
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

    // Save the current variables to allow for nested decents
    let placeInTemplateX = placeInTemplate;
    let lastPositionInTemplateX = lastPositionInTemplate;
    let lastPositionInTemplateKeyX = lastPositionInTemplateKey;

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
        }else if(key != 'Attributes' && ref[key] instanceof Object){
            placeInTemplate.push(key);
            lastPositionInTemplate = ref;
            lastPositionInTemplateKey = key;
            recursiveDecent(ref[key]);
        }


    }
    placeInTemplate.pop();

    // Restore the variables to support nested resolving
    placeInTemplate = placeInTemplateX;
    lastPositionInTemplate = lastPositionInTemplateX;
    lastPositionInTemplateKey = lastPositionInTemplateKeyX;
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
        case 'Fn::Select':
            return doIntrinsicSelect(ref, key);
        case 'Fn::Split':
            return doInstrinsicSplit(ref, key);
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

function doIntrinsicSelect(ref: any, key: string){
    let toGet = ref[key];
    if(!Array.isArray(toGet) || toGet.length < 2) {
        addError('crit', "Fn::Select only supports an array of two elements", placeInTemplate, "Fn::Select");
        return 'INVALID_SELECT';
    }
    if (toGet[0] === undefined || toGet[0] === null) {
        addError('crit', "Fn::Select first element cannot be null or undefined", placeInTemplate, "Fn::Select");
        return 'INVALID_SELECT';
    }
    let index: number;
    if (typeof toGet[0]  == 'object' && !Array.isArray(toGet[0])) {
        let keys = Object.keys(toGet[0]);
        if(awsIntrinsicFunctions['Fn::Select::Index']['supportedFunctions'].indexOf(keys[0]) != -1) {
            let resolvedIndex = resolveIntrinsicFunction(toGet[0], keys[0]);
            if(typeof resolvedIndex === 'string') {
                index = parseInt(resolvedIndex);
            } else if (typeof resolvedIndex === 'number') {
                index = resolvedIndex;
            } else {
                addError('crit', "Fn::Select's first argument did not resolve to a string for parsing or a numeric value.", placeInTemplate, "Fn::Select");
                return 'INVALID_SELECT';
            }

        } else {
            addError('crit', `Fn::Select does not support the ${keys[0]} function in argument 1`);
            return 'INVALID_SELECT';
        }
    } else if (typeof toGet[0] === 'string') {
          index = parseInt(toGet[0])
    } else if (typeof toGet[0] === 'number'){
          index = toGet[0];
    } else {
      addError('crit', `Fn:Select's first argument must be a number or resolve to a number, it appears to be a ${typeof(toGet[0])}`, placeInTemplate, "Fn::Select");
      return 'INVALID_SELECT';
    }

    if (typeof index === undefined || typeof index !== 'number' || isNaN(index)) {
        addError('crit', "First element of Fn::Select must be a number, or it must use an intrinsic fuction that returns a number", placeInTemplate, "Fn::Select");
        return 'INVALID_SELECT';
    }
    if (toGet[1] === undefined || toGet[1] === null) {
        addError('crit', "Fn::Select Second element cannot be null or undefined", placeInTemplate, "Fn::Select");
        return 'INVALID_SELECT';
    }

    let list = toGet[1]
    if (!Array.isArray(list)) {
        //we may need to resolve it
        if (typeof list !== 'object') {
            addError('crit', `Fn::Select requires the second element to resolve to a list, it appears to be a ${typeof list}`, placeInTemplate, "Fn::Select");
            return 'INVALID_SELECT';
        } else if(typeof list  == 'object'){
            let keys = Object.keys(list);
            if(awsIntrinsicFunctions['Fn::Select::List']['supportedFunctions'].indexOf(keys[0]) != -1) {
                list = resolveIntrinsicFunction(list, keys[0]);
            } else {
                addError('crit', `Fn::Select does not support the ${keys[0]} function in argument 2`);
                return 'INVALID_SELECT';
            }
          if (keys[0] === "Ref" ) {
              // check if it was a paramter which might be converted to a list
              const parameterName = toGet[1][keys[0]];
            if (workingInput['Parameters'][parameterName] !== undefined ) {
                list = workingInput['Parameters'][parameterName]['Attributes']['Ref'];
              }
            }
        }


        if (!Array.isArray(list)) {
            addError('crit', `Fn::Select requires the second element to be a list, function call did not resolve to a list. It contains value ${list}`, placeInTemplate, "Fn::Select");
            return 'INVALID_SELECT';
        }
    } else if (list.indexOf(null) > -1) {
        addError('crit', "Fn::Select requires that the list be free of null values", placeInTemplate, "Fn::Select");
    
    }
    if (index >= 0 && index < list.length) {
        return list[index];
    } else {
        addError('crit', "First element of Fn::Select exceeds the length of the list.", placeInTemplate, "Fn::Select");
        return 'INVALID_SELECT';
    }


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
                // TODO: Do we need to make sure this isn't an attempt at an invalid supportedFunction?
                recursiveDecent(value);
                return value
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
        const importValue = importRuntimeOverride[toGet];
        if(importValue !== undefined) {
            return importValue;
        }

        // If an import wasn't provided, construct a default value for backwards compatibility
        return "IMPORTEDVALUE" + toGet;
    }else{
        addError('warn', `Something went wrong when resolving references for a Fn::ImportValue`, placeInTemplate, 'Fn::ImportValue');
        return 'INVALID_FN_IMPORTVALUE';
    }
}

export function doInstrinsicSplit(ref: any, key: string): string[] {
    const args = ref[key];

    if (!Array.isArray(args) || args.length !== 2) {
        addError('crit', 'Invalid parameter for Fn::Split. It needs an Array of length 2.', placeInTemplate, 'Fn::Split');
        return ['INVALID_SPLIT'];
    }

    const delimiter: string = args[0];

    if (typeof delimiter !== 'string') {
        addError ('crit', `Invalid parameter for Fn::Split. The delimiter, ${util.inspect(delimiter)}, needs to be a string.`, placeInTemplate, 'Fn::Split');
        return ['INVALID_SPLIT'];
    }

    const stringOrInstrinsic = args[1];
    let stringToSplit: string;

    if (typeof stringOrInstrinsic === 'object') {
        const fnName = Object.keys(stringOrInstrinsic)[0];

        if (awsIntrinsicFunctions['Fn::Split']['supportedFunctions'].indexOf(fnName) == -1) {
            addError('crit', `Fn::Split does not support function '${fnName}' here`, placeInTemplate, 'Fn::Split');
            return ['INVALID_SPLIT'];
        }

        stringToSplit = resolveIntrinsicFunction(stringOrInstrinsic, fnName) as string;
    } else if (typeof stringOrInstrinsic === 'string') {
        stringToSplit = stringOrInstrinsic;
    } else {
        addError('crit', `Invalid parameters for Fn::Split. The parameter, ${stringOrInstrinsic}, needs to be a string or a supported intrinsic function.`, placeInTemplate, 'Fn::Split');
        return ['INVALID_SPLIT'];
    }

    return fnSplit(delimiter, stringToSplit);
}

function fnSplit(delimiter: string, stringToSplit: string): string[] {
    return stringToSplit.split(delimiter);
}

function fnJoin(join: any, parts: any){
    // Resolve instrinsic functions that return the parts array
    if (!Array.isArray(parts)) {
      // TODO Check the key is within the valid functions which can be called from a Fn::Join
      parts = resolveIntrinsicFunction(parts, Object.keys(parts)[0]);

      if (!Array.isArray(parts)) {
        addError('crit', 'Invalid parameters for Fn::Join', placeInTemplate, "Fn::Join");
        // Specify this as an invalid string
        return "INVALID_JOIN";
      }
    }

    // Otherwise go through each parts and ensure they are resolved
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

export function fnGetAtt(reference: string, attributeName: string){
    // determine resource template
    let resource: any;
    if (!!~workingInputTransform.indexOf('AWS::Serverless-2016-10-31') &&
               workingInput['SAMOutput'].hasOwnProperty(reference)) {
        resource = workingInput['SAMOutput'][reference];
    } else if (workingInput['Resources'].hasOwnProperty(reference)) {
        resource = workingInput['Resources'][reference];
    } else {
      addError('crit',
          `No resource with logical name of ${reference}!`,
          placeInTemplate,
          reference);
    }
    // determine attribute value
    if (!!resource) {
        const resourceType = `${resource['Type']}<${reference}>`;
        try {
            // Lookup attribute
            const attribute = resourcesSpec.getResourceTypeAttribute(resourceType, attributeName)
            const primitiveAttribute = attribute as PrimitiveAttribute
            if(!!primitiveAttribute['PrimitiveType']) {
                return resource['Attributes'][attributeName];
            }
            const listAttribute = attribute as ListAttribute
            if(listAttribute['Type'] == 'List') {
                return [ resource['Attributes'][attributeName], resource['Attributes'][attributeName] ]
            }
        } catch (e) {
            // Coerce missing custom resource attribute value to string
            if ((resourceType.indexOf('Custom::') == 0) ||
                (resourceType.indexOf('AWS::CloudFormation::CustomResource') == 0) ||
                (resourceType.indexOf('AWS::CloudFormation::Stack') == 0)) {
                return `mockAttr_${reference}_${attributeName}`;
            }

            if (e instanceof resourcesSpec.NoSuchResourceTypeAttribute) {
                addError('crit',
                    e.message,
                    placeInTemplate,
                    resourceType
                );
            } else {
                throw e;
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

    // Check in SAMOutput
    if (!!~workingInputTransform.indexOf('AWS::Serverless-2016-10-31') &&
        workingInput['SAMOutput'].hasOwnProperty(reference)) {
          return workingInput['SAMOutput'][reference]['Attributes']['Ref'];

    // Check in Resources
    } else if(workingInput['Resources'].hasOwnProperty(reference)){
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

function getImportValue(reference: string) {
    if(workingInput['Imports'] && workingInput['Imports'].hasOwnProperty(reference)) {
        return workingInput['Imports'][reference];
    }
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
        const resourceType = `${resources[res]['Type']}<${res}>`;

        // Check the property exists
        try {
            let spec = resourcesSpec.getType(resourceType);
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
        baseResourceType = resourceType;

        // Do property validation if Properties in present
        if(resources[res].hasOwnProperty('Properties')) {

            // Add Properties to the location stack
            placeInTemplate.push('Properties');

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
            addError('crit', `Unexpected error: ${e.message} while checking ${util.inspect(objectToCheck)} against ${util.inspect(objectType)}`, placeInTemplate, objectType.resourceType);
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

function localizeType(type: string) {
    // determine localized name
    let typePlaceInTemplate: any = clone(placeInTemplate);
    typePlaceInTemplate.splice(0, 1); // remove 'Resources'
    typePlaceInTemplate.splice(1, 1); // remove 'Properties'
    typePlaceInTemplate = typePlaceInTemplate.join('#');
    // don't localize primitive, complex or already localized types
    let localType = type;
    if (!resourcesSpec.isPrimitiveType(type) &&
        !resourcesSpec.isComplexType(type) &&
        !resourcesSpec.isParameterizedTypeFormat(type)) {
        localType = `${type}<${typePlaceInTemplate}>`;
    }
    return localType
}

function checkComplexObject(objectType: ResourceType | NamedProperty | PropertyType,  objectToCheck: any) {
    let objectTypeName = getTypeName(objectType);
    if (!objectTypeName) {
        const namedProperty = objectType as NamedProperty;
        throw new Error(`${namedProperty.parentType}.${namedProperty.propertyName} is not a ResourceType or PropertyType, but we tried to get its type anyway.`);
    }
    objectTypeName = localizeType(objectTypeName);

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
    for (const [index, item] of listToCheck.entries()) {
        placeInTemplate.push(index);
        if(!util.isUndefined(item)){
            let itemType = getItemType(objectType);
            if (itemType.type == 'PROPERTY_TYPE') {
                itemType.propertyType = localizeType(itemType.propertyType);
            }
            check(itemType, item);
        }
        placeInTemplate.pop();
    }
}

function checkMap(objectType: NamedProperty, mapToCheck: {[k: string]: any}) {
    for (let key in mapToCheck) {
        placeInTemplate.push(key);
        const item = mapToCheck[key];
        let itemType = getItemType(objectType);
        if (itemType.type == 'PROPERTY_TYPE') {
            itemType.propertyType = localizeType(itemType.propertyType);
        }
        check(itemType, item);
        placeInTemplate.pop();
    }
}


// EXPOSE INTERNAL FUNCTIONS FOR TESTING PURPOSES
export const __TESTING__: any = {
  'resourcesSpec': resourcesSpec,
  'inferPrimitiveValueType': inferPrimitiveValueType,
  'inferStructureValueType': inferStructureValueType,
  'inferAggregateValueType': inferAggregateValueType,
  'inferValueType': inferValueType
};
