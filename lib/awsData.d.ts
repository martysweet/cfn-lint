export declare const awsExtraDocs: {
    [k: string]: string;
};
export declare type AWSPrimitiveType = 'String' | 'Integer' | 'Boolean' | 'Json' | 'Double' | 'Long' | 'Timestamp';
export interface PropertyBase {
    Required: boolean;
    Documentation: string;
    UpdateType: 'Mutable' | 'Immutable' | 'Conditional';
}
export interface PrimitiveProperty extends PropertyBase {
    PrimitiveType: AWSPrimitiveType;
    Type: undefined;
    ItemType: undefined;
    PrimitiveItemType: undefined;
}
export interface ComplexProperty extends PropertyBase {
    Type: string;
    PrimitiveType: undefined;
    ItemType: undefined;
    PrimitiveItemType: undefined;
}
export interface ListPropertyBase extends PropertyBase {
    Type: 'List';
    DuplicatesAllowed: boolean;
    PrimitiveType: undefined;
}
export interface PrimitiveItemType {
    PrimitiveItemType: AWSPrimitiveType;
    ItemType: undefined;
}
export interface ItemType {
    ItemType: string;
    PrimitiveItemType: undefined;
}
export declare type ListProperty = ListPropertyBase & (PrimitiveItemType | ItemType);
export interface MapPropertyBase extends PropertyBase {
    Type: 'Map';
    DuplicatesAllowed: boolean;
    PrimitiveType: undefined;
    ItemType: undefined;
}
export declare type MapProperty = MapPropertyBase & (PrimitiveItemType | ItemType);
export declare type Property = PrimitiveProperty | ComplexProperty | ListProperty | MapProperty;
export interface ResourcePropertyType {
    Documentation: string;
    Properties: {
        [propertyName: string]: Property | undefined;
    };
    AdditionalProperties: undefined;
}
export interface ResourceType {
    Documentation: string;
    Properties: {
        [propertyName: string]: Property | undefined;
    };
    Attributes?: {
        [attributeName: string]: Attribute | undefined;
    };
    AdditionalProperties?: boolean;
}
export interface PrimitiveAttribute {
    PrimitiveType: AWSPrimitiveType;
}
export interface ListAttribute {
    Type: 'List';
    PrimitiveItemType: AWSPrimitiveType;
}
export declare type Attribute = PrimitiveAttribute | ListAttribute;
export declare const awsResources: {
    PropertyTypes: {
        [propertyName: string]: ResourcePropertyType | undefined;
    };
    ResourceTypes: {
        [resourceName: string]: ResourceType | undefined;
    };
};
export declare const awsResourceRefTypes: {
    [resourceName: string]: string | undefined;
};
export declare const awsParameterTypes: {
    [parameterName: string]: "string" | "number" | "array" | undefined;
};
export declare const awsIntrinsicFunctions: {
    [functionName: string]: {
        supportedFunctions: string[];
    };
};
export declare const awsRefOverrides: {
    [refOverride: string]: any;
    "AWS::AccountId": string;
    "AWS::NotificationARNs": string[];
    "AWS::NoValue": undefined;
    "AWS::Region": string;
    "AWS::StackId": string;
    "AWS::StackName": string;
    "AWS::URLSuffix": string;
};
