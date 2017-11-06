let specification = require('../data/aws_resources_specification.json');
let resourceRefOverride = require('../data/aws_resource_ref_types.json');

function getResourceType(type){
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

function getPropertyType(type){
    if(specification.PropertyTypes.hasOwnProperty(type)){
        return specification.PropertyTypes[type]
    }else{
        return null;
    }
}

/**
 * Get a Resource or Property type from the specification.
 * @param type object or null
 */
function getType(type){
    if(isPropertyTypeFormat(type)){
        return getPropertyType(type);
    }else{
        return getResourceType(type);
    }
}

function isPropertyTypeFormat(type){
    if(typeof type == 'string') {
        return (type.indexOf('.') != -1) || type == 'Tag';
    }else{
        throw Error("Invalid type given " + type);
    }
}

function getRefOverride(resourceType){
    if(resourceRefOverride.hasOwnProperty(resourceType)){
        return resourceRefOverride[resourceType];
    }else{
        return null;
    }
}

/**
 * Checks a ResourceType or PropertyType for the presence of a propertyName
 * @param parentPropertyType string of a ResourceType or PropertyType
 * @param propertyName name of the property to check against the specification
 * @return {boolean} True if the property exists for the parentPropertyType
 */
function isValidProperty(parentPropertyType, propertyName){

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
 * @param parentPropertyType
 * @param propertyName
 * @return {boolean}
 */
function isRequiredProperty(parentPropertyType, propertyName){
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

function isArnProperty(propertyName){
    // Check if the parentPropertyType exists
    return (propertyName.indexOf('Arn') != -1);
}

function isSinglePrimitivePropertyType(parentPropertyType, propertyName){
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

function isAdditionalPropertiesEnabled(resourceType){
    let spec = getType(resourceType);
    return (spec.hasOwnProperty('AdditionalProperties') && spec['AdditionalProperties'] === true)
}

function isPropertyTypeList(parentPropertyType, key){
    // Get the type
    let spec = getType(parentPropertyType);
    // Check if Type == List
    return (spec !== null && spec['Properties'][key].hasOwnProperty('Type') && spec['Properties'][key]['Type'] == "List");
}


function getPropertyTypeApi(baseType, propType, key){
    let spec = getType(propType);

    if(spec['Properties'].hasOwnProperty(key)){
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

function hasPrimitiveItemType(type, key) {
    let spec = getType(type);

    return spec['Properties'].hasOwnProperty(key) && spec['Properties'][key].hasOwnProperty('PrimitiveItemType');

}

function getPrimitiveItemType(type, key){
    let spec = getType(type);

    if(hasPrimitiveItemType(type, key)){
        return spec['Properties'][key]['PrimitiveItemType'];
    }
}

function getRequiredProperties(type){
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

exports.getType = getType;
exports.isValidProperty = isValidProperty;
exports.isRequiredProperty = isRequiredProperty;
exports.isPrimitiveProperty = isSinglePrimitivePropertyType;
exports.isArnProperty = isArnProperty;
exports.getRefOverride = getRefOverride;
exports.isPropertyTypeList = isPropertyTypeList;
exports.getPropertyType = getPropertyTypeApi;
exports.getPrimitiveItemType = getPrimitiveItemType;
exports.hasPrimitiveItemType = hasPrimitiveItemType;
exports.getRequiredProperties = getRequiredProperties;
exports.isAdditionalPropertiesEnabled = isAdditionalPropertiesEnabled;