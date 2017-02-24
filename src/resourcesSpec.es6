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

function isPropertyTypeList(parentPropertyType, key){
    // Get the type
    let spec = getType(parentPropertyType);

    // Check if Type == List
    return (spec !== null && spec['Properties'][key].hasOwnProperty('Type') && spec['Properties'][key]['Type'] == "List");
}


function getSpecialPropertyType(type, key){
    let spec = getType(type);

    if(spec['Properties'].hasOwnProperty(key)){
        if(spec['Properties'][key].hasOwnProperty('ItemType')){
            if(spec['Properties'][key]['ItemType'] == 'Tag'){
                return 'Tag';
            }
            return type + '.' + spec['Properties'][key]['ItemType'];
        }else{
            if(spec['Properties'][key].hasOwnProperty('Type') && spec['Properties'][key]['Type']){
                return type + '.' + spec['Properties'][key]['Type'];
            }
        }
    }

    return 'Unknown';
}

function isPrimitiveTypeList(type, key) {
    let spec = getType(type);

    return spec['Properties'].hasOwnProperty(key) && spec['Properties'][key].hasOwnProperty('PrimitiveItemType');

}

exports.getType = getType;
exports.isValidProperty = isValidProperty;
exports.isRequiredProperty = isRequiredProperty;
exports.isPrimitiveProperty = isSinglePrimitivePropertyType;
exports.isArnProperty = isArnProperty;
exports.getRefOverride = getRefOverride;
exports.isPropertyTypeList = isPropertyTypeList;
exports.getSpecialPropertyType = getSpecialPropertyType;
exports.isPrimitiveTypeList = isPrimitiveTypeList;