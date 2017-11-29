import validator = require('./validator');

export interface APIValidationOptions {
  parameters: {[parameterName: string]: any}
  pseudoParameters: {[pseudoParameterName: string]: any}
}

export type ValidationOptions = APIValidationOptions & validator.ValidateOptions;

export type ValidationResult = validator.ErrorObject;

const defaultOptions: ValidationOptions = {
  parameters: {},
  pseudoParameters: {},
  guessParameters: undefined
}

/**
 * Synchronously validates a CloudFormation yaml or json file.
 * @param fileName 
 * @param options 
 */
export function validateFile(fileName: string, options?: Partial<ValidationOptions>): ValidationResult {
  setupValidator(options);
  return validator.validateFile(fileName, options);
}

/**
 * Synchronously validates an object. The object should be what you
 * get from JSON.parse-ing or yaml.load-ing a CloudFormation template.
 * @param objectToValidate
 * @param options 
 */
export function validateJsonObject(objectToValidate: any, options?: Partial<ValidationOptions>): ValidationResult {
  setupValidator(options);
  return validator.validateJsonObject(objectToValidate, options);
}

function setupValidator(passedOptions?: Partial<ValidationOptions>) {
  validator.resetValidator();
  const options = Object.assign({}, defaultOptions, passedOptions);
  for (let parameterName in options.parameters) {
    const parameterValue = options.parameters[parameterName];
    validator.addParameterValue(parameterName, parameterValue)
  }

  for (let pseudoName in options.pseudoParameters) {
    const pseudoValue = options.pseudoParameters[pseudoName];
    validator.addPseudoValue(pseudoName, pseudoValue)
  }
}