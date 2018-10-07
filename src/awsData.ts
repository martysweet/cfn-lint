type AWSExtraDocs = {[k: string]: string}

export const awsExtraDocs = require('../data/aws_extra_docs.json') as AWSExtraDocs;

export const awsPrimitiveTypes = ['String', 'Integer', 'Boolean', 'Json', 'Double', 'Long', 'Timestamp'];

export const awsComplexTypes = ['Map', 'List'];

export type AWSPrimitiveType = 'String' | 'Integer' | 'Boolean' | 'Json' | 'Double' | 'Long' | 'Timestamp';

export interface PropertyBase {
    Required: boolean,
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
    Type: string | string[],

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
}

export type MapProperty = MapPropertyBase & (PrimitiveItemType | ItemType)

export type Property = PrimitiveProperty | ComplexProperty | ListProperty | MapProperty

export const awsPropertyTemplate: PropertyBase = {
  Documentation: '',
  Required: false,
  UpdateType: 'Mutable'
};

export interface ResourcePropertyType {
    Documentation: string,
    Properties: {[propertyName: string]: Property | undefined}
    AdditionalProperties?: undefined;
}

export interface ResourceType {
    Documentation: string,
    Properties: {[propertyName: string]: Property | undefined},
    Attributes?: {[attributeName: string]: Attribute | undefined},
    AdditionalProperties?: boolean
}

export type Type = ResourceType | ResourcePropertyType;

export const awsResourceTypeTemplate: ResourceType = {
  Documentation: '',
  AdditionalProperties: false,
  Properties: {}
};

export const awsResourcePropertyTypeTemplate: ResourcePropertyType = {
  Documentation: '',
  Properties: {}
};

export interface PrimitiveAttribute {
    PrimitiveType: AWSPrimitiveType
}

export interface ListAttribute {
    Type: 'List',
    PrimitiveItemType: AWSPrimitiveType
}

export type Attribute = PrimitiveAttribute | ListAttribute;

export type AWSResourcesSpecification = {
    PropertyTypes: {[propertyName: string]: ResourcePropertyType | undefined}
    ResourceTypes: {[resourceName: string]: ResourceType | undefined}
}

export const awsResources = require('../data/aws_resources_specification.json') as AWSResourcesSpecification;

type ResourceRefTypes = {[resourceName: string]: string | undefined};

export const awsResourceRefTypes = require('../data/aws_resource_ref_types.json') as ResourceRefTypes;

type ParameterTypes = {[parameterName: string]: 'string' | 'number' | 'array' | undefined};

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
    "AWS::NoValue": undefined,
    "AWS::Region": string,
    "AWS::StackId": string,
    "AWS::StackName": string,
    "AWS::URLSuffix": string,
    "AWS::Partition": string,
    [refOverride: string]: any
};

export const awsRefOverrides = require('../data/aws_ref_override.json') as RefOverrides;
awsRefOverrides["AWS::NoValue"] = undefined;
