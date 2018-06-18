import validator = require('./validator');
export interface APIValidationOptions {
    parameters: {
        [parameterName: string]: any;
    };
    pseudoParameters: {
        [pseudoParameterName: string]: any;
    };
}
export declare type ValidationOptions = APIValidationOptions & validator.ValidateOptions;
export declare type ValidationResult = validator.ErrorObject;
/**
 * Synchronously validates a CloudFormation yaml or json file.
 * @param fileName
 * @param options
 */
export declare function validateFile(fileName: string, options?: Partial<ValidationOptions>): ValidationResult;
/**
 * Synchronously validates an object. The object should be what you
 * get from JSON.parse-ing or yaml.load-ing a CloudFormation template.
 * @param objectToValidate
 * @param options
 */
export declare function validateJsonObject(objectToValidate: any, options?: Partial<ValidationOptions>): ValidationResult;
