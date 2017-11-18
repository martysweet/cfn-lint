type AWSExtraDocs = {[k: string]: string}

export const awsExtraDocs = require('../data/aws_extra_docs.json') as AWSExtraDocs;

export type AWSPrimitiveType = 'String' | 'Integer' | 'Boolean' | 'Json';

export interface PropertyBase {
    Required: string,
    Documentation: string,
    UpdateType: 'Mutable' | 'Immutable' | 'Conditional',
}

export interface PrimitiveProperty extends PropertyBase {
    PrimitiveType: AWSPrimitiveType,

    Type: undefined
    ItemType: undefined
    PrimitiveItemType: undefined
}

export interface ComplexProperty extends PropertyBase {
    Type: string,

    PrimitiveType: undefined
    ItemType: undefined
    PrimitiveItemType: undefined
}

export interface ListPropertyBase extends PropertyBase {
    Type: 'List',
    DuplicatesAllowed: boolean,

    PrimitiveType: undefined
}

export interface PrimitiveItemType {
    PrimitiveItemType: AWSPrimitiveType,

    ItemType: undefined
}

export interface ItemType {
    ItemType: string,

    PrimitiveItemType: undefined
}

export type ListProperty = ListPropertyBase & (PrimitiveItemType | ItemType)

export interface MapPropertyBase extends PropertyBase {
    Type: 'Map',
    DuplicatesAllowed: boolean,

    PrimitiveType: undefined
    ItemType: undefined
}

export type MapProperty = MapPropertyBase & (PrimitiveItemType | ItemType)

export type Property = PrimitiveProperty | ComplexProperty | ListProperty | MapProperty

export interface ResourcePropertyType {
    Documentation: string,
    Properties: {[propertyName: string]: Property}
}

export interface ResourceType {
    Documentation: string,
    Properties: {[propertyName: string]: Property},
    Attributes?: {[attributeName: string]: Attribute},
    AdditionalProperties?: boolean
}

export interface PrimitiveAttribute {
    ItemType: AWSPrimitiveType
}

export interface ListAttribute {
    Type: 'List',
    PrimitiveItemType: AWSPrimitiveType
}

export type Attribute = PrimitiveAttribute | ListAttribute;

type AWSResourcesSpecification = {
    PropertyTypes: {[propertyName: string]: ResourcePropertyType}
    ResourceTypes: {[resourceName: string]: ResourceType}
}

export const awsResources = require('../data/aws_resources_specification.json') as AWSResourcesSpecification;

type ResourceRefTypes = {[resourceName: string]: string};

export const awsResourceRefTypes = require('../data/aws_resource_ref_types.json') as ResourceRefTypes;

type ParameterTypes = {[parameterName: string]: 'string' | 'array'};

export const awsParameterTypes = require('../data/aws_parameter_types.json') as ParameterTypes;

type IntrinsicFunctions = {
    [functionName: string]: {
        supportedFunctions: string[]
    }
}

export const awsIntrinsicFunctions = require('../data/aws_intrinsic_functions.json') as IntrinsicFunctions;

// avoid "does this exist" checks everywhere
for (let functionName in awsIntrinsicFunctions) {
    awsIntrinsicFunctions[functionName].supportedFunctions = awsIntrinsicFunctions[functionName].supportedFunctions || [];
}

type RefOverrides = {
    "AWS::AccountId": string,
    "AWS::NotificationARNs": string[],
    "AWS::NoValue": "",
    "AWS::Region": string,
    "AWS::StackId": string,
    "AWS::StackName": string,
    [refOverride: string]: any
};

export const awsRefOverrides = require('../data/aws_ref_override.json') as RefOverrides;