"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var validator = require("./validator");
var defaultOptions = {
    parameters: {},
    pseudoParameters: {},
    guessParameters: undefined
};
/**
 * Synchronously validates a CloudFormation yaml or json file.
 * @param fileName
 * @param options
 */
function validateFile(fileName, options) {
    setupValidator(options);
    return validator.validateFile(fileName, options);
}
exports.validateFile = validateFile;
/**
 * Synchronously validates an object. The object should be what you
 * get from JSON.parse-ing or yaml.load-ing a CloudFormation template.
 * @param objectToValidate
 * @param options
 */
function validateJsonObject(objectToValidate, options) {
    setupValidator(options);
    return validator.validateJsonObject(objectToValidate, options);
}
exports.validateJsonObject = validateJsonObject;
function setupValidator(passedOptions) {
    validator.resetValidator();
    var options = Object.assign({}, defaultOptions, passedOptions);
    for (var parameterName in options.parameters) {
        var parameterValue = options.parameters[parameterName];
        validator.addParameterValue(parameterName, parameterValue);
    }
    for (var pseudoName in options.pseudoParameters) {
        var pseudoValue = options.pseudoParameters[pseudoName];
        validator.addPseudoValue(pseudoName, pseudoValue);
    }
}
//# sourceMappingURL=api.js.map