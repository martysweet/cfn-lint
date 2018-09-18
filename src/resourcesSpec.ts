import {
    awsResources as specification,
    awsResourceRefTypes as resourceRefOverride,
} from './awsData';
import * as awsData from './awsData';

import clone = require('clone');
import CustomError = require('./util/CustomError');

const mergeOptions = require('merge-options');

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

export function getResourceType(type: string): awsData.ResourceType {

    // destructure resource name
    let typeName = type, typeArgument = '';
    if (isParameterizedTypeFormat(type)) {
        typeName = getParameterizedTypeName(type);
        typeArgument = getParameterizedTypeArgument(type);
    }

    // If the type starts with Custom::, it's a custom resource otherwise it's a normal resource type
    if(typeName.indexOf('Custom::') == 0){
        // return the generic type if there's no such custom type defined
        if (!specification.ResourceTypes.hasOwnProperty(typeName)) {
          typeName = 'AWS::CloudFormation::CustomResource';
        }
    }

    // acquire base resource type specification
    let spec = specification.ResourceTypes[typeName];
    if (!spec){
        throw new NoSuchResourceType(typeName);
    }

    // specialize parameterized type
    if (!!typeArgument && hasType(typeArgument)) {
        spec = mergeOptions(spec, getType(typeArgument));
    }

    return spec as awsData.ResourceType;
}

export function getResourceTypeAttribute(type: string, attributeName: string): awsData.Attribute {
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

function getPropertyType(type: string): awsData.ResourcePropertyType {

    // destructure property name
    let baseType, baseTypeName = '', baseTypeArgument = '';
    baseType = baseTypeName = getPropertyTypeBaseName(type);
    if (isParameterizedTypeFormat(baseType)) {
        baseTypeName = getParameterizedTypeName(baseType);
        baseTypeArgument = getParameterizedTypeArgument(baseType);
    }

    let propertyType, propertyTypeName = '', propertyTypeArgument = '';
    propertyType = propertyTypeName = getPropertyTypePropertyName(type);
    if (isParameterizedTypeFormat(propertyType)) {
        propertyTypeName = getParameterizedTypeName(propertyType);
        propertyTypeArgument = getParameterizedTypeArgument(propertyType);
    }

    // acquire base property type specification
    let basePropertyType = `${baseTypeName}.${propertyTypeName}`;
    let spec = specification.PropertyTypes[basePropertyType];
    if (!spec) {
        debugger;
        throw new NoSuchPropertyType(basePropertyType);
    }

    // specialize parameterized type
    if (!!propertyTypeArgument && hasType(propertyTypeArgument)) {
        spec = mergeOptions(spec, getType(propertyTypeArgument));
    }

    return spec as awsData.ResourcePropertyType;
}

/**
 * Get a Resource or Property type from the specification.
 */
export function getType(type: string): awsData.Type {
    if (isPropertyTypeFormat(type)) {
        return getPropertyType(type);
    } else {
        return getResourceType(type);
    }
}

/**
 * Returns an empty type specification
 */
export function makeType(): awsData.Type {
    return clone(awsData.awsTypeTemplate);
}

function getParameterizedTypeNameParts(type: any): any {
    if (isPropertyTypeFormat(type)) {
      type = getPropertyTypePropertyName(type);
    }
    let parts = [];
    let partsRe = /<.*>$/;
    if (RegExp(partsRe).test(type)) {
      parts = type.match(partsRe);
    }
    return parts;
}

/**
 * Returns if a given type name has type arguments.
 */
export function isParameterizedTypeFormat(type: string): boolean {
    if (getParameterizedTypeNameParts(type).length > 0) {
      return true;
    }
    return false;
}

/**
 * Get the argument of a parameterized type.
 */
export function getParameterizedTypeArgument(type: string): string {
    if (!isParameterizedTypeFormat(type)) {
        throw new Error(`Invalid parameterized type: ${type}`);
    }
    return getParameterizedTypeNameParts(type).shift().slice(1, -1) as string;
}

/**
 * Get the name of a parameterized type.
 */
export function getParameterizedTypeName(type: string): string {
    let typeArg = getParameterizedTypeArgument(type);
    return type.replace(`<${typeArg}>`, '');
}

/**
 * Converts a generic type name to parameterized format
 */
export function parameterizeTypeFormat(type: string, parameter: string, allowSubParameterization: boolean = false): string {
    if (isParameterizedTypeFormat(type)) {
        if (allowSubParameterization) {
            let typeArg = getParameterizedTypeArgument(type);
            parameter = `${typeArg}<${parameter}>`;
            type = getParameterizedTypeName(type);
        } else {
            throw new Error(`Type is already parameterized: ${type}`);
        }
    }
    return `${type}<${parameter}>`;
}

/**
 * Strips type parameterization
 */
export function stripTypeParameters(input: string): string {
    let typeParamRe = /(<.*>(?=\.))|(<.*>$)/gm;
    input = input.replace(typeParamRe, '');
    return input;
}

function getPropertyTypeNameParts(type: any): any {
    let parts = [];
    let partsRe = /^([^<>]*(?:<.*>)?)\.([^<>]*(?:<.*>)?)$/;
    if (RegExp(partsRe).test(type)) {
      parts = type.match(partsRe).slice(1);
    }
    return parts;
}

/**
 * Returns the base type name of a property type name
 */
export function getPropertyTypeBaseName(type: string): string {
    if (!isPropertyTypeFormat(type)) {
        throw new Error(`Invalid property type name: ${type}`);
    }
    return getPropertyTypeNameParts(type)[0] as string;
}

/**
 * Returns the property name of a property type name
 */
export function getPropertyTypePropertyName(type: string): string {
    if (!isPropertyTypeFormat(type)) {
        throw new Error(`Invalid property type name: ${type}`);
    }
    return getPropertyTypeNameParts(type)[1] as string;
}

export function isTypeFormat(type: string): boolean {
    return (type.indexOf('::') != -1);
}

export function isPropertyTypeFormat(type: string): boolean {
    return (getPropertyTypeNameParts(type).length > 0);
}

export function isResourceTypeFormat(type: string): boolean {
    return (isTypeFormat(type) && !isPropertyTypeFormat(type));
}

export function rebaseTypeFormat(baseType: string, type: string): string {

    if (isPropertyTypeFormat(type)) {
        type = getPropertyTypePropertyName(type);
    }

    if (isParameterizedTypeFormat(type)) {
        let typeName = getParameterizedTypeName(type);
        let typeArgument = getParameterizedTypeArgument(type);

        // recurse on name
        typeName = rebaseTypeFormat(baseType, typeName);

        // recurse on argument
        typeArgument = rebaseTypeFormat(baseType, typeArgument);

        return parameterizeTypeFormat(typeName, typeArgument);
    }

    if (isPrimitiveType(type) || isComplexType(type)) {
      return type;
    }

    return `${baseType}.${type}`;
}

export function isPrimitiveType(type: string) {
    if (isParameterizedTypeFormat(type)) {
        type = getParameterizedTypeName(type);
    }
    if (!!~awsData.awsPrimitiveTypes.indexOf(type)) {
        return true;
    }
    return false;
}

export function isComplexType(type: string) {
    if (isParameterizedTypeFormat(type)) {
        type = getParameterizedTypeName(type);
    }
    if (!!~awsData.awsComplexTypes.indexOf(type)) {
        return true;
    }
    return false;
}

export function getProperty(type: string, propertyName: string) {
    const spec = getType(type);

    // destructure parameterized property
    let propertyArgument: any;
    if (isParameterizedTypeFormat(propertyName)) {
      propertyArgument = getParameterizedTypeArgument(propertyName);
      propertyName = getParameterizedTypeName(propertyName);
    }

    // validate property
    let property = spec.Properties[propertyName];
    if (!property) {
        throw new NoSuchProperty(type, propertyName);
    }

    // specialize parameterized property
    if (!!propertyArgument) {
      property = makeProperty(propertyArgument) as awsData.Property;
    }

    return property;
}

/**
 * Returns a specification based on a parameterized property type
 */
export function makeProperty(propertyType?: string): awsData.PropertyBase | awsData.Property {
    let property = clone(awsData.awsPropertyTemplate);

    if (!!propertyType) {

      let propertyTypeArgument = '';
      if (isParameterizedTypeFormat(propertyType)) {
          propertyTypeArgument = getParameterizedTypeArgument(propertyType);
      }

      // make primitive type specification
      if (isPrimitiveType(propertyType)) {
          (<awsData.PrimitiveProperty>property)['PrimitiveType'] = propertyType as awsData.AWSPrimitiveType;

      // make list type specification
      } else if(propertyType.indexOf('List<') == 0) {
          (<awsData.ListProperty>property)['Type'] = 'List';
          if (isPrimitiveType(propertyTypeArgument)) {
              (<awsData.ListProperty>property)['PrimitiveItemType'] = propertyTypeArgument as awsData.AWSPrimitiveType;
          } else {
              (<awsData.ListProperty>property)['ItemType'] = propertyTypeArgument;
          }

      // make map type specification
      } else if(propertyType.indexOf('Map<') == 0) {
          (<awsData.MapProperty>property)['Type'] = 'Map';
          if (isPrimitiveType(propertyTypeArgument)) {
              (<awsData.MapProperty>property)['PrimitiveItemType'] = propertyTypeArgument as awsData.AWSPrimitiveType;
          } else {
              (<awsData.MapProperty>property)['ItemType'] = propertyTypeArgument;
          }

      // make complex type specification
      } else {
          (<awsData.ComplexProperty>property)['Type'] = propertyType;
      }
    }

    return property;
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
    const propertyType = getProperty(type, propertyName).Type;
    if (!!propertyType) {
        return propertyType.indexOf('List') == 0;
    }
    return false;
}

export function isPropertyTypeMap(type: string, propertyName: string)  {
    const propertyType = getProperty(type, propertyName).Type;
    if (!!propertyType) {
        return propertyType.indexOf('Map') == 0;
    }
    return false;
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
    } else if (isComplexType(property.ItemType)) {
        return property.ItemType;
    } else {
        return baseType + '.' + property.ItemType;
    }
}

export function hasPrimitiveItemType(type: string, propertyName: string) {
    return Boolean(getProperty(type, propertyName).PrimitiveItemType);
}

export function getPrimitiveItemType(type: string, key: string): awsData.AWSPrimitiveType | undefined {
    return getProperty(type, key).PrimitiveItemType;
}

export function getPrimitiveType(type: string, key: string): awsData.AWSPrimitiveType | undefined {
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

/**
 * Allows extending the AWS Resource Specification with custom definitions.
 */
export function extendSpecification(spec: any){
    Object.assign(specification, mergeOptions(specification, spec));
}

/**
 * Allows overriding definitions based on logical name.
 * Subsequent registrations DO clobber prior ones.
 * //TODO: perhaps user defined overrides should take precedence?
 */
export function registerLogicalNameOverride(name: string, spec: any) {

    // determine type section
    let typeSection = 'ResourceTypes';
    if (isPropertyTypeFormat(name)) {
      typeSection = 'PropertyTypes';
    }

    // determine prior specification
    let oldSpec: any = {};
    try {
        oldSpec = getType(name);
    } catch(e) {}

    // override
    extendSpecification({
        [typeSection]: {[name]: mergeOptions(oldSpec, spec)}
    });

}

/**
 * Allows overriding definitions based on type.
 * Subsequent registrations DO clobber prior ones.
 */
export function registerTypeOverride(name: string, spec: any) {

    // determine type section
    let typeSection = 'ResourceTypes';
    if (isPropertyTypeFormat(name)) {
      typeSection = 'PropertyTypes';
    }

    // determine prior specification
    let oldSpec: any = {};
    try {
        oldSpec = getType(name);
    } catch(e) {}

    // override
    extendSpecification({
        [typeSection]: {[name]: mergeOptions(oldSpec, spec)}
    });

}

export function hasType(type: string): boolean {
  let spec: any = specification.ResourceTypes[type];
  if (!spec) {
      spec = specification.PropertyTypes[type];
  }
  return !!spec;
}

export function hasProperty(type: string, propertyName: string): boolean {
  let spec: any = {};
  try {
      spec = getProperty(type, propertyName);
      return true;
  } catch(e) {}
  return false;
}

export function hasLogicalNameOverride(logicalName: string): boolean {
    return hasType(logicalName);
}
