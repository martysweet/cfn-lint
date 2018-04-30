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

    assignIntrinsics(workingInput);

    // Evaluate Conditions
    checkConditions(workingInput['Conditions'], ['Conditions']);

    // Assign intrinsic resolvers

    // Assign outputs to all the resources
    assignResourcesOutputs();
    if(stopValidation) {
        // Stop the validation early, we can't join stuff if we don't know what to expect
        if(process.env.DEBUG) {
            logger.error("Stopping validation early as a resource type is invalid.");
        }
        return errorObject;
    }

    // Go through the hopefully resolved properties of each resource
    checkResourceProperties();

    checkUncalledIntrinsics();

    // Assign template outputs to the error object
    collectOutputs();

    return errorObject;

}

function assignIntrinsics(tree: any) {
    const placeInTemplate: BreadcrumbTrail = [];

    _assignIntrinsics(
        tree['Conditions'],
        placeInTemplate.concat(['Conditions']),
        ['Fn::And', 'Fn::Equals', 'Fn::If', 'Fn::Not', 'Fn::Or']
    );
    _assignIntrinsics(tree['Resources'], placeInTemplate.concat(['Resources']));
    _assignIntrinsics(tree['Metadata'], placeInTemplate.concat(['Metadata']));
    _assignIntrinsics(tree['Outputs'], placeInTemplate.concat(['Outputs']));
}

export function isIntrinsic(object: any, placeInTemplate: BreadcrumbTrail, allowedIntrinsicFunctions?: string[]): false | intrinsics.BoundIntrinsic<any, any> {
    if (typeof object !== 'object') { return false; }
    const objectPrototype = Object.getPrototypeOf(object);
    if (!(objectPrototype === Object.prototype || objectPrototype === null)) { return false; }

    const keys = Object.keys(object);
    const firstKey = keys[keys.length-1];

    if (!(firstKey in awsIntrinsicFunctions)) { return false; }

    if (allowedIntrinsicFunctions !== undefined
        && allowedIntrinsicFunctions.indexOf(firstKey) < 0) {
        addError('crit', `${firstKey} is not allowed to be used here. You can only used one of ${allowedIntrinsicFunctions.join(',')}.`, placeInTemplate)
    }

    if (keys.length > 1) {
        addError('warn', 'You have passed an intrinsic function with more than one key, this is probably an error.', placeInTemplate, 'Intrinsic Functions');
    }

    const fnName = firstKey;
    const args = object[firstKey];

    return buildIntrinsic(fnName, args, placeInTemplate.concat([fnName]));
}

// Depth first search, assigning intrinsics
export function _assignIntrinsics(tree: any, placeInTemplate: BreadcrumbTrail, allowedIntrinsicFunctions?: string[]) {
    if (Array.isArray(tree)) {
        for (const index in tree) {
            tree[index] = _assignIntrinsics(tree[index], placeInTemplate.concat([index]), allowedIntrinsicFunctions);
        }
    } else if (typeof tree === 'object' && (Object.getPrototypeOf(tree) === Object.prototype)) {
        for (const index in tree) {
            tree[index] = _assignIntrinsics(tree[index], placeInTemplate.concat([index]), allowedIntrinsicFunctions);
        }
    }

    const maybeIntrinsic = isIntrinsic(tree, placeInTemplate);
    return (maybeIntrinsic === false)
        ? tree
        : maybeIntrinsic;
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

function checkConditions(conditionsTree: any, placeInTemplate: BreadcrumbTrail) {

    for (const conditionName in conditionsTree) {

        const condition = conditionsTree[conditionName];

        const allowedIntrinsicFunctions: string[] = []; // TODO
        // Check the value of condition is an object
        if (!(condition instanceof intrinsics.BoundIntrinsic)) {
            addError('crit', `Condition should consist of an intrinsic function of type ${allowedIntrinsicFunctions.join(', ')}`,
                            placeInTemplate,
                            'Conditions');
        } else {
            resolveIntrinsic(condition);
        }
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

export type BreadcrumbTrail = (string|number)[];
let placeInTemplate: BreadcrumbTrail = [];
let lastPositionInTemplate: any = null;
let lastPositionInTemplateKey: string | null = null;
const boundIntrinsics: intrinsics.BoundIntrinsic<any, any>[] = [];


import * as intrinsics from './intrinsics';
import {Resolveable} from './intrinsics';

function buildIntrinsic(fnName: string, arg: any, placeInTemplate: BreadcrumbTrail) {
    try {
        const intrinsic = intrinsics._buildIntrinsic(fnName, arg, placeInTemplate, workingInput);
        boundIntrinsics.push(intrinsic);
        return intrinsic;
    } catch (e) {
        if (e instanceof intrinsics.NoSuchIntrinsic) {
            addError("warn", `Unhandled Intrinsic Function ${fnName}, this needs implementing. Some errors might be missed.`, placeInTemplate, "Functions");
            return intrinsics.UnhandledIntrinsic.bind(undefined, placeInTemplate, workingInput);
        } else {
            throw e;
        }
    }
}

function resolveIntrinsic<T>(value: Resolveable<T>): T | string {
    try {
        return intrinsics.recursiveResolve(value);
    } catch (e) {
        if (e instanceof intrinsics.IntrinsicError) {
            addError('crit', e.message, placeInTemplate, e.boundIntrinsic.fnName);
            return `INVALID_${e.boundIntrinsic.fnName}`;
        } else {
            throw e;
        }
    }
}

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

export function fnFindInMap(map: any, first: string, second: string){
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

export function getRef(reference: string){
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

function checkUncalledIntrinsics() {
    for (const boundIntrinsic of boundIntrinsics.filter((i) => !i.called)) {
        resolveIntrinsic(boundIntrinsic); // this raises any necessary errors
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

function check(objectType: ObjectType, objectOrIntrinsic: any) {
    try {
        // objectOrIntrinsic may be an instrinsic that needs resolving.
        const objectToCheck = resolveIntrinsic(objectOrIntrinsic);
        console.dir({objectToCheck});
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
            addError('crit', e.message+`, got ${util.inspect(objectOrIntrinsic)}`, placeInTemplate, objectType.resourceType);
        } else {
            // generic error handler; let us keep checking what we can instead of crashing.
            addError('crit', `Unexpected error: ${e.message} while checking ${util.inspect(objectOrIntrinsic)} against ${objectType}`, placeInTemplate, objectType.resourceType);
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

