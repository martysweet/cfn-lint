import { ResourceType, ResourcePropertyType, AWSPrimitiveType, Attribute } from './awsData';
import CustomError = require('./util/CustomError');
export declare class NoSuchProperty extends CustomError {
    type: string;
    propertyName: string;
    constructor(type: string, propertyName: string);
}
export declare class NoSuchResourceType extends CustomError {
    resourceType: string;
    constructor(type: string);
}
export declare class NoSuchPropertyType extends CustomError {
    propertyType: string;
    constructor(type: string);
}
export declare class NoSuchResourceTypeAttribute extends CustomError {
    resourceType: string;
    attributeName: string;
    constructor(type: string, attributeName: string);
}
export declare function getResourceType(type: string): ResourceType;
export declare function getResourceTypeAttribute(type: string, attributeName: string): Attribute;
/**
 * Get a Resource or Property type from the specification.
 */
export declare function getType(type: string): ResourceType | ResourcePropertyType;
export declare function getRefOverride(resourceType: string): string | null;
/**
 * Checks a ResourceType or PropertyType for the presence of a propertyName
 * @param parentPropertyType a ResourceType or PropertyType
 * @param propertyName name of the property to check against the specification
 */
export declare function isValidProperty(parentPropertyType: string, propertyName: string): boolean;
/**
 * Checks the resource type and returns true if the propertyName is required.
 */
export declare function isRequiredProperty(parentPropertyType: string, propertyName: string): boolean;
export declare function isArnProperty(propertyName: string): boolean;
declare function isSinglePrimitivePropertyType(parentPropertyType: string, propertyName: string): boolean;
export { isSinglePrimitivePropertyType as isPrimitiveProperty };
export declare function isAdditionalPropertiesEnabled(resourceType: string): boolean;
export declare function isPropertyTypeList(type: string, propertyName: string): boolean;
export declare function isPropertyTypeMap(type: string, propertyName: string): boolean;
declare function getPropertyTypeApi(baseType: string, propType: string, key: string): string | undefined;
export { getPropertyTypeApi as getPropertyType };
export declare function getItemType(baseType: string, propType: string, key: string): string | undefined;
export declare function hasPrimitiveItemType(type: string, propertyName: string): boolean;
export declare function getPrimitiveItemType(type: string, key: string): AWSPrimitiveType | undefined;
export declare function getPrimitiveType(type: string, key: string): AWSPrimitiveType | undefined;
export declare function getRequiredProperties(type: string): string[];
/**
 * Allows extending the AWS Resource Specification with custom definitions.
 */
export declare function extendSpecification(spec: any): void;
