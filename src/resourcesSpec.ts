import {
    awsResources as specification,
    awsResourceRefTypes as resourceRefOverride,
    ResourceType,
    ResourcePropertyType,
    AWSPrimitiveType
} from './awsData';

function getResourceType(type: string){
    // If the type starts with Custom::, it's a custom resource.
    if(type.indexOf('Custom::') === 0){
        return specification.ResourceTypes['AWS::CloudFormation::CustomResource'];
    }
    // A normal resource type
    if(specification.ResourceTypes.hasOwnProperty(type)){
        return specification.ResourceTypes[type]
    }

    return null;
}

function getPropertyType(type: string){
    if(specification.PropertyTypes.hasOwnProperty(type)){
        return specification.PropertyTypes[type]
    }else{
        return null;
    }
}

/**
 * Get a Resource or Property type from the specification.
 */
function getType(type: string){
    if(isPropertyTypeFormat(type)){
        return getPropertyType(type);
    }else{
        return getResourceType(type);
    }
}

function isPropertyTypeFormat(type: string){
    if(typeof type == 'string') {
        return (type.indexOf('.') != -1) || type == 'Tag';
    }else{
        throw Error("Invalid type given " + type);
    }
}

function getRefOverride(resourceType: string){
    if(resourceRefOverride.hasOwnProperty(resourceType)){
        return resourceRefOverride[resourceType];
    }else{
        return null;
    }
}

/**
 * Checks a ResourceType or PropertyType for the presence of a propertyName
 * @param parentPropertyType a ResourceType or PropertyType
 * @param propertyName name of the property to check against the specification
 */
function isValidProperty(parentPropertyType: string, propertyName: string){

    // Check if the parentPropertyType exists
    let spec = getType(parentPropertyType);
    if(spec === null){
        // TODO: Throw an error
        return false;
    }

    // Check if the property exists
    return spec['Properties'].hasOwnProperty(propertyName);
}

/**
 * Checks the resource type and returns true if the propertyName is required.
 */
function isRequiredProperty(parentPropertyType: string, propertyName: string){
    // Check if the parentPropertyType exists
    let spec = getType(parentPropertyType);
    if(spec === null){
        // TODO: Throw an error
        return false;
    }

    // Check if the property exists before getting the required attribute
    if(spec['Properties'].hasOwnProperty(propertyName)){
        return spec['Properties'][propertyName]['Required'];
    }else{
        // TOOD: Throw an error
        return false;
    }
}

function isArnProperty(propertyName: string){
    // Check if the parentPropertyType exists
    return (propertyName.indexOf('Arn') != -1);
}

function isSinglePrimitivePropertyType(parentPropertyType: string, propertyName: string){
    // Check if the parentPropertyType exists
    let spec = getType(parentPropertyType);
    if(spec === null){
        // TODO: Throw an error
        return false;
    }

    // Check if the property exists before getting the required attribute
    if(spec['Properties'].hasOwnProperty(propertyName)){
        return spec['Properties'][propertyName].hasOwnProperty('PrimitiveType');
    }else{
        // TODO: Throw an error
        return false;
    }
}

function isAdditionalPropertiesEnabled(resourceType: string){
    let spec = getResourceType(resourceType);
    return (spec !== null && spec['AdditionalProperties'] === true)
}

function isPropertyTypeList(parentPropertyType: string, key: string){
    // Get the type
    let spec = getType(parentPropertyType);
    // Check if Type == List
    return (spec !== null && spec['Properties'][key]['Type'] === "List");
}

function isPropertyTypeMap(parentPropertyType: string, key: string){
    // Get the type
    let spec = getType(parentPropertyType);
    // Check if Type == Map
    return (spec !== null && spec['Properties'][key].hasOwnProperty('Type') && spec['Properties'][key]['Type'] == "Map");
}


function getPropertyTypeApi(baseType: string, propType: string, key: string){
    let spec = getType(propType);

    if(spec !== null && spec['Properties'].hasOwnProperty(key)){
        if(spec['Properties'][key].hasOwnProperty('PrimitiveType')){
            return  spec['Properties'][key]['PrimitiveType'];
        }
        else if(spec['Properties'][key].hasOwnProperty('ItemType')){
            if(spec['Properties'][key]['ItemType'] == 'Tag'){
                return 'Tag';
            }
            return baseType + '.' + spec['Properties'][key]['ItemType'];
        }else{
            if(spec['Properties'][key].hasOwnProperty('Type') && spec['Properties'][key]['Type']){
                return baseType + '.' + spec['Properties'][key]['Type'];
            }
        }
    }

    return 'Unknown';
}

function hasPrimitiveItemType(type: string, key: string) {
    let spec = getType(type);

    return (spec !== null) && spec['Properties'].hasOwnProperty(key) && spec['Properties'][key].hasOwnProperty('PrimitiveItemType');

}

function getPrimitiveItemType(type: string, key: string): AWSPrimitiveType | undefined {
    let spec = getType(type);

    if(spec !== null && hasPrimitiveItemType(type, key)){
        return spec['Properties'][key]['PrimitiveItemType'];
    }
}

function getRequiredProperties(type: string){
    let spec = getType(type);
    let requiredProperties = [];

    if(spec){
        for(let prop in spec['Properties']){
            if(spec['Properties'].hasOwnProperty(prop)){
                if(spec['Properties'][prop]['Required'] === true){
                    requiredProperties.push(prop);
                }
            }
        }
    }

    return requiredProperties;
}

export = {
    getType,
    getResourceType,
    isValidProperty,
    isRequiredProperty,
    isPrimitiveProperty: isSinglePrimitivePropertyType,
    isArnProperty,
    getRefOverride,
    isPropertyTypeList,
    isPropertyTypeMap,
    getPropertyType: getPropertyTypeApi,
    getPrimitiveItemType,
    hasPrimitiveItemType,
    getRequiredProperties,
    isAdditionalPropertiesEnabled
};