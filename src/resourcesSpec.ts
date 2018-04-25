import {
    awsResources as specification,
    awsResourceRefTypes as resourceRefOverride,
    ResourceType,
    ResourcePropertyType,
    Property,
    AWSPrimitiveType,
    Attribute
} from './awsData';

import CustomError = require('./util/CustomError');
export class NoSuchProperty extends CustomError {
    type: string;
    propertyName: string;
    constructor(type: string, propertyName: string) {
        super(`No such property ${propertyName} on ${type}`);

        CustomError.fixErrorInheritance(this, NoSuchProperty)

        this.type = type;
        this.propertyName = propertyName;
    }
}

export class NoSuchResourceType extends CustomError {
    resourceType: string;
    constructor(type: string) {
        super(`No such resource ${type}`);
        CustomError.fixErrorInheritance(this, NoSuchResourceType)
    }
}

export class NoSuchPropertyType extends CustomError {
    propertyType: string;
    constructor(type: string) {
        super(`No such property type ${type}`);
        CustomError.fixErrorInheritance(this, NoSuchPropertyType)
    }
}

export class NoSuchResourceTypeAttribute extends CustomError {
    resourceType: string;
    attributeName: string;
    constructor(type: string, attributeName: string) {
        super(`No such attribute ${attributeName} on ${type}`);

        CustomError.fixErrorInheritance(this, NoSuchResourceTypeAttribute)

        this.resourceType = type;
        this.attributeName = attributeName;
    }
}

export function getResourceType(type: string){
    // If the type starts with Custom::, it's a custom resource.
    if(type.indexOf('Custom::') === 0){
        return specification.ResourceTypes['AWS::CloudFormation::CustomResource']!;
    }
    // A normal resource type
    const resourceType = specification.ResourceTypes[type];
    if (!resourceType){
        throw new NoSuchResourceType(type);
    }
    return resourceType;
}

export function getResourceTypeAttribute(type: string, attributeName: string): Attribute {
    const resourceAttributes = getResourceType(type).Attributes
    if (!resourceAttributes) {
        throw new NoSuchResourceTypeAttribute(type, attributeName);
    }
    const resourceAttribute = resourceAttributes[attributeName]
    if (!resourceAttribute) {
        throw new NoSuchResourceTypeAttribute(type, attributeName);
    }
    return resourceAttribute
}

function getPropertyType(type: string){
    const propertyType =  specification.PropertyTypes[type];
    if (!propertyType) {
        throw new NoSuchPropertyType(type);
    }
    return propertyType;
}

/**
 * Get a Resource or Property type from the specification.
 */
export function getType(type: string): ResourceType | ResourcePropertyType {
    if(isPropertyTypeFormat(type)){
        return getPropertyType(type);
    }else{
        return getResourceType(type);
    }
}

function getProperty(type: string, propertyName: string) {
    const spec = getType(type);
    const property = spec.Properties[propertyName];
    if (!property) {
        throw new NoSuchProperty(type, propertyName);
    }
    return property;
}

function isPropertyTypeFormat(type: string){
    return (type.indexOf('.') != -1) || type == 'Tag';
}

export function getRefOverride(resourceType: string){
    return resourceRefOverride[resourceType] || null;
}

/**
 * Checks a ResourceType or PropertyType for the presence of a propertyName
 * @param parentPropertyType a ResourceType or PropertyType
 * @param propertyName name of the property to check against the specification
 */
export function isValidProperty(parentPropertyType: string, propertyName: string){
    return getType(parentPropertyType).Properties.hasOwnProperty(propertyName);
}

/**
 * Checks the resource type and returns true if the propertyName is required.
 */
export function isRequiredProperty(parentPropertyType: string, propertyName: string){
    return getProperty(parentPropertyType, propertyName).Required;
}

export function isArnProperty(propertyName: string){
    // Check if the parentPropertyType exists
    return (propertyName.indexOf('Arn') != -1);
}

function isSinglePrimitivePropertyType(parentPropertyType: string, propertyName: string){
    return Boolean(getProperty(parentPropertyType, propertyName).PrimitiveType);
}
export { isSinglePrimitivePropertyType as isPrimitiveProperty };

export function isAdditionalPropertiesEnabled(resourceType: string){
    return getType(resourceType).AdditionalProperties === true;
}

export function isPropertyTypeList(type: string, propertyName: string) {
    return getProperty(type, propertyName).Type === 'List';
}

export function isPropertyTypeMap(type: string, propertyName: string)  {
    return getProperty(type, propertyName).Type === 'Map';
}


function getPropertyTypeApi(baseType: string, propType: string, key: string) {
    const property = getProperty(propType, key);
    
    if (!property.Type) {
        return undefined
    }
    
    return baseType + '.' + property.Type;
}
export { getPropertyTypeApi as getPropertyType };

export function getItemType(baseType: string, propType: string, key: string) {
    const property = getProperty(propType, key);

    if (!property.ItemType) {
        return undefined;
    } else if (property.ItemType === 'Tag') {
        return 'Tag'
    } else {
        return baseType + '.' + property.ItemType;
    }
}

export function hasPrimitiveItemType(type: string, propertyName: string) {
    return Boolean(getProperty(type, propertyName).PrimitiveItemType);
}

export function getPrimitiveItemType(type: string, key: string): AWSPrimitiveType | undefined {
    return getProperty(type, key).PrimitiveItemType;
}

export function getPrimitiveType(type: string, key: string): AWSPrimitiveType | undefined {
    return getProperty(type, key).PrimitiveType;
}

export function getRequiredProperties(type: string){
    let spec = getType(type);
    let requiredProperties = [];

    for(let prop in spec['Properties']){
        if(spec['Properties'][prop]!['Required'] === true){
            requiredProperties.push(prop);
        }
    }

    return requiredProperties;
}
