"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var awsData_1 = require("./awsData");
var mergeOptions = require('merge-options');
var CustomError = require("./util/CustomError");
var NoSuchProperty = /** @class */ (function (_super) {
    __extends(NoSuchProperty, _super);
    function NoSuchProperty(type, propertyName) {
        var _this = _super.call(this, "No such property " + propertyName + " on " + type) || this;
        CustomError.fixErrorInheritance(_this, NoSuchProperty);
        _this.type = type;
        _this.propertyName = propertyName;
        return _this;
    }
    return NoSuchProperty;
}(CustomError));
exports.NoSuchProperty = NoSuchProperty;
var NoSuchResourceType = /** @class */ (function (_super) {
    __extends(NoSuchResourceType, _super);
    function NoSuchResourceType(type) {
        var _this = _super.call(this, "No such resource " + type) || this;
        CustomError.fixErrorInheritance(_this, NoSuchResourceType);
        return _this;
    }
    return NoSuchResourceType;
}(CustomError));
exports.NoSuchResourceType = NoSuchResourceType;
var NoSuchPropertyType = /** @class */ (function (_super) {
    __extends(NoSuchPropertyType, _super);
    function NoSuchPropertyType(type) {
        var _this = _super.call(this, "No such property type " + type) || this;
        CustomError.fixErrorInheritance(_this, NoSuchPropertyType);
        return _this;
    }
    return NoSuchPropertyType;
}(CustomError));
exports.NoSuchPropertyType = NoSuchPropertyType;
var NoSuchResourceTypeAttribute = /** @class */ (function (_super) {
    __extends(NoSuchResourceTypeAttribute, _super);
    function NoSuchResourceTypeAttribute(type, attributeName) {
        var _this = _super.call(this, "No such attribute " + attributeName + " on " + type) || this;
        CustomError.fixErrorInheritance(_this, NoSuchResourceTypeAttribute);
        _this.resourceType = type;
        _this.attributeName = attributeName;
        return _this;
    }
    return NoSuchResourceTypeAttribute;
}(CustomError));
exports.NoSuchResourceTypeAttribute = NoSuchResourceTypeAttribute;
function getResourceType(type) {
    // If the type starts with Custom::, it's a custom resource.
    if (type.indexOf('Custom::') === 0) {
        // return the generic type if there's no such custom type defined
        if (!awsData_1.awsResources.ResourceTypes[type]) {
            type = 'AWS::CloudFormation::CustomResource';
        }
        return awsData_1.awsResources.ResourceTypes[type];
    }
    // A normal resource type
    var resourceType = awsData_1.awsResources.ResourceTypes[type];
    if (!resourceType) {
        throw new NoSuchResourceType(type);
    }
    return resourceType;
}
exports.getResourceType = getResourceType;
function getResourceTypeAttribute(type, attributeName) {
    var resourceAttributes = getResourceType(type).Attributes;
    if (!resourceAttributes) {
        throw new NoSuchResourceTypeAttribute(type, attributeName);
    }
    var resourceAttribute = resourceAttributes[attributeName];
    if (!resourceAttribute) {
        throw new NoSuchResourceTypeAttribute(type, attributeName);
    }
    return resourceAttribute;
}
exports.getResourceTypeAttribute = getResourceTypeAttribute;
function getPropertyType(type) {
    var propertyType = awsData_1.awsResources.PropertyTypes[type];
    if (!propertyType) {
        throw new NoSuchPropertyType(type);
    }
    return propertyType;
}
/**
 * Get a Resource or Property type from the specification.
 */
function getType(type) {
    if (isPropertyTypeFormat(type)) {
        return getPropertyType(type);
    }
    else {
        return getResourceType(type);
    }
}
exports.getType = getType;
function getProperty(type, propertyName) {
    var spec = getType(type);
    var property = spec.Properties[propertyName];
    if (!property) {
        throw new NoSuchProperty(type, propertyName);
    }
    return property;
}
function isPropertyTypeFormat(type) {
    return (type.indexOf('.') != -1) || type == 'Tag';
}
function getRefOverride(resourceType) {
    return awsData_1.awsResourceRefTypes[resourceType] || null;
}
exports.getRefOverride = getRefOverride;
/**
 * Checks a ResourceType or PropertyType for the presence of a propertyName
 * @param parentPropertyType a ResourceType or PropertyType
 * @param propertyName name of the property to check against the specification
 */
function isValidProperty(parentPropertyType, propertyName) {
    return getType(parentPropertyType).Properties.hasOwnProperty(propertyName);
}
exports.isValidProperty = isValidProperty;
/**
 * Checks the resource type and returns true if the propertyName is required.
 */
function isRequiredProperty(parentPropertyType, propertyName) {
    return getProperty(parentPropertyType, propertyName).Required;
}
exports.isRequiredProperty = isRequiredProperty;
function isArnProperty(propertyName) {
    // Check if the parentPropertyType exists
    return (propertyName.indexOf('Arn') != -1);
}
exports.isArnProperty = isArnProperty;
function isSinglePrimitivePropertyType(parentPropertyType, propertyName) {
    return Boolean(getProperty(parentPropertyType, propertyName).PrimitiveType);
}
exports.isPrimitiveProperty = isSinglePrimitivePropertyType;
function isAdditionalPropertiesEnabled(resourceType) {
    return getType(resourceType).AdditionalProperties === true;
}
exports.isAdditionalPropertiesEnabled = isAdditionalPropertiesEnabled;
function isPropertyTypeList(type, propertyName) {
    return getProperty(type, propertyName).Type === 'List';
}
exports.isPropertyTypeList = isPropertyTypeList;
function isPropertyTypeMap(type, propertyName) {
    return getProperty(type, propertyName).Type === 'Map';
}
exports.isPropertyTypeMap = isPropertyTypeMap;
function getPropertyTypeApi(baseType, propType, key) {
    var property = getProperty(propType, key);
    if (!property.Type) {
        return undefined;
    }
    return baseType + '.' + property.Type;
}
exports.getPropertyType = getPropertyTypeApi;
function getItemType(baseType, propType, key) {
    var property = getProperty(propType, key);
    if (!property.ItemType) {
        return undefined;
    }
    else if (property.ItemType === 'Tag') {
        return 'Tag';
    }
    else {
        return baseType + '.' + property.ItemType;
    }
}
exports.getItemType = getItemType;
function hasPrimitiveItemType(type, propertyName) {
    return Boolean(getProperty(type, propertyName).PrimitiveItemType);
}
exports.hasPrimitiveItemType = hasPrimitiveItemType;
function getPrimitiveItemType(type, key) {
    return getProperty(type, key).PrimitiveItemType;
}
exports.getPrimitiveItemType = getPrimitiveItemType;
function getPrimitiveType(type, key) {
    return getProperty(type, key).PrimitiveType;
}
exports.getPrimitiveType = getPrimitiveType;
function getRequiredProperties(type) {
    var spec = getType(type);
    var requiredProperties = [];
    for (var prop in spec['Properties']) {
        if (spec['Properties'][prop]['Required'] === true) {
            requiredProperties.push(prop);
        }
    }
    return requiredProperties;
}
exports.getRequiredProperties = getRequiredProperties;
/**
 * Allows extending the AWS Resource Specification with custom definitions.
 */
function extendSpecification(spec) {
    Object.assign(awsData_1.awsResources, mergeOptions(awsData_1.awsResources, spec));
}
exports.extendSpecification = extendSpecification;
//# sourceMappingURL=resourcesSpec.js.map