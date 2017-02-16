let specification = require('../data/aws_resources_specification.json');
let refOverride = require('../data/aws_ref_override.json');

function getResourceType(type){
    if(specification.ResourceTypes.hasOwnProperty(type)){
        return specification.ResourceTypes[type]
    }else{
        return null;
    }
}

function getPropertyType(type){
    if(specification.PropertyTypes.hasOwnProperty(type)){
        return specification.PropertyTypes[type]
    }else{
        return null;
    }
}

function getType(type){
    if(isPropertyTypeFormat(type)){
        return getPropertyType(type);
    }else{
        return getResourceType(type);
    }
}

function isPropertyTypeFormat(type){
    return (type.indexOf('.') != -1)
}

function getRefOverride(resourceType){
    if(refOverride.hasOwnProperty(resourceType)){
        return refOverride[resourceType];
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

function isPrimitiveProperty(parentPropertyType, propertyName){
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

exports.getType = getType;
exports.isValidProperty = isValidProperty;
exports.isRequiredProperty = isRequiredProperty;
exports.isPrimitiveProperty = isPrimitiveProperty;
exports.isArnProperty = isArnProperty;
exports.getRefOverride = getRefOverride;