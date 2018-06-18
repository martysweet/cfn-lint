export declare type ParameterValue = string | string[];
export interface ErrorRecord {
    message: string;
    resource: string;
    documentation: string;
}
export interface ErrorObject {
    templateValid: boolean;
    errors: {
        crit: ErrorRecord[];
        warn: ErrorRecord[];
        info: ErrorRecord[];
    };
    outputs: {
        [outputName: string]: string;
    };
    exports: {
        [outputName: string]: string;
    };
}
export declare function resetValidator(): void;
export interface ValidateOptions {
    /**
     * List of parameters for which guessing is allowed.
     * undefined implies all parameters can be guessed.
     */
    guessParameters: string[] | undefined;
}
export declare function validateFile(path: string, options?: Partial<ValidateOptions>): ErrorObject;
export declare function validateJsonObject(obj: any, options?: Partial<ValidateOptions>): ErrorObject;
export declare function addParameterValue(parameter: string, value: ParameterValue): void;
export declare function addPseudoValue(parameter: string, value: string): void;
export declare function addCustomResourceAttributeValue(resource: string, attribute: string, value: any): void;
export declare function doInstrinsicSplit(ref: any, key: string): string[];
export declare function fnGetAtt(reference: string, attributeName: string): any;
export interface ResourceType {
    type: 'RESOURCE';
    resourceType: string;
}
export interface NamedProperty {
    type: 'PROPERTY';
    resourceType: string;
    parentType: string;
    propertyName: string;
}
export interface PropertyType {
    type: 'PROPERTY_TYPE';
    propertyType: string;
    resourceType: string;
}
export interface PrimitiveType {
    type: 'PRIMITIVE_TYPE';
    resourceType: string;
    primitiveType: string;
}
export declare type ObjectType = ResourceType | NamedProperty | PropertyType | PrimitiveType;
export declare enum KnownTypes {
    ComplexObject = 0,
    List = 1,
    Map = 2,
    Arn = 3,
    String = 4,
    Integer = 5,
    Boolean = 6,
    Json = 7,
    Double = 8,
    Timestamp = 9,
}
export declare function getPropertyType(objectType: NamedProperty | PrimitiveType): KnownTypes;
export interface VerificationFunction {
    (o: any): boolean;
    failureMessage: string;
}
export declare const isList: VerificationFunction;
export declare const isObject: VerificationFunction;
export declare const isString: VerificationFunction;
export declare const isArn: VerificationFunction;
export declare const isInteger: VerificationFunction;
export declare const isDouble: VerificationFunction;
export declare const isBoolean: VerificationFunction;
export declare const isJson: VerificationFunction;
export declare const isTimestamp: VerificationFunction;
