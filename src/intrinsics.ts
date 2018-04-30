import {getRef, fnGetAtt, fnFindInMap, isInteger, isString, BreadcrumbTrail} from './validator';
import util = require('util');
import objectMap = require('./util/objectMap');
import isObject = require('./util/isObject');
import { awsIntrinsicFunctions } from './awsData';
import CustomError = require('./util/CustomError');

const intrinsics: {[k: string]: Intrinsic<any, any>} = {};

export class IntrinsicError extends CustomError {
    boundIntrinsic: BoundIntrinsic<any, any>
    constructor(boundIntrinsic: BoundIntrinsic<any, any>, message: string) {
        super(message);
        this.boundIntrinsic = boundIntrinsic;

        CustomError.fixErrorInheritance(this, IntrinsicError)
    }
}

export class NoSuchIntrinsic extends CustomError {
    constructor() { super('No such intrinsic!') }
};

export type Resolveable<T> = T | BoundIntrinsic<any, T>;

export function _buildIntrinsic(fnName: string, arg: any, placeInTemplate: BreadcrumbTrail, workingInput: any) {
    if (!(fnName in intrinsics)) {
        throw new NoSuchIntrinsic();
    }

    return intrinsics[fnName].bind(arg, placeInTemplate, workingInput);
}

/*
export interface BoundIntrinsic<T> extends Intrinsic<any, T> {
    (): T;
    fnName: string
}
*/

function checkFunctionIsAllowed(fnName: string, containingFunction?: BoundIntrinsic<any, any>) {
    if (!containingFunction) { return true; }
    const supportedFunctions = awsIntrinsicFunctions[containingFunction.fnName].supportedFunctions;
    if (!supportedFunctions) { return true; }

    if (supportedFunctions.indexOf(fnName) >= 0) { return true; }

    throw new IntrinsicError(containingFunction, `${containingFunction.fnName} cannot contain ${fnName}. It can only contain ${supportedFunctions.join(',')}`);
}

function _resolve<T>(value: Resolveable<T>, containingFunction?: BoundIntrinsic<any, any>): T {
    if (value instanceof BoundIntrinsic) {
        checkFunctionIsAllowed(value.fnName, containingFunction);
        return value.call();
    }
    return value;
}

export function recursiveResolve<T>(value: Resolveable<T>, containingFunction?: BoundIntrinsic<any, any>): T {
    const primitiveOrContainer = _resolve(value, containingFunction);
    if (Array.isArray(primitiveOrContainer)) {
        return primitiveOrContainer.map(
            (e) => _resolve(e, containingFunction)
        ) as any as T;
    } else if (isObject(primitiveOrContainer)) {
        return objectMap(primitiveOrContainer,
            (e) => _resolve(e, containingFunction)
        ) as any as T;
    } else {
        return primitiveOrContainer;
    }
}

export type IntrinsicFunction<A, T> = (this: BoundIntrinsic<A, T>, arg: A, workingInput: any) => T;

export class Intrinsic<A, T> {
    private f: IntrinsicFunction<A, T>;
    fnName: string;

    constructor(fnName: string, f: IntrinsicFunction<A, T>) {
        this.f = f;
        this.fnName = fnName;
        intrinsics[fnName] = this;
    }

    bind(args: A, placeInTemplate: BreadcrumbTrail, workingInput: any): BoundIntrinsic<A, T> {
        return new BoundIntrinsic(this, this.f, args, placeInTemplate, workingInput);
    }

    test(args: any) {
        return this.bind(args, [], {}).call();
    }
}

export class BoundIntrinsic<A, T> {
    fnName: string;
    private f: () => T;
    placeInTemplate: BreadcrumbTrail;
    called: boolean;
    workingInput: any;

    constructor(
        intrinsic: Intrinsic<A, T>,
        f: IntrinsicFunction<A, T>,
        args: A,
        placeInTemplate: BreadcrumbTrail,
        workingInput: any
    ) {
        this.fnName = intrinsic.fnName;
        this.f = f.bind(this, args);
        this.placeInTemplate = placeInTemplate;
        this.called = false;
        this.workingInput = workingInput;
        Object.defineProperty(f, 'name', {value: this.fnName});
    }

    IntrinsicError(message: string) {
        return new IntrinsicError(this, message);
    }

    resolve<R>(value: Resolveable<R>) {
        return recursiveResolve(value, this);
    }

    call() {
        this.called = true;
        return this.f();
    }
}

/*
function Intrinsic<A, T> (fnName: string, f: (this: Intrinsic<A, T>, arg: A) => T): Intrinsic<A, T>  {
    const builder = (arg: A) => BoundIntrinsic(fnName, f, arg);
    const intrinsic: Intrinsic<A, T> = Object.setPrototypeOf(builder, Intrinsic.prototype);
    intrinsic.fnName = fnName;
    intrinsic.constructor = Intrinsic;

    intrinsics[fnName] = intrinsic;
    return intrinsic;
}
Intrinsic.prototype = Object.create(Function.prototype, {
    resolve: {
        value: function<T> (r: Resolveable<T>) {
            return resolve(r);
        }
    },
    IntrinsicError: {
        value: function (msg: string) { return new IntrinsicError(this.fnName, msg) }
    }
});
*/

/*
export function BoundIntrinsic<A, T>(fnName: string, f: (a: A) => T, arg: A): BoundIntrinsic<T> {
    const boundF = Object.setPrototypeOf(f.bind(f, arg), BoundIntrinsic.prototype);
    return Object.assign(boundF, {fnName});
}
BoundIntrinsic.prototype = Object.create(Intrinsic.prototype);
*/
/*
export interface Intrinsic<A, T> {
    (a: A): BoundIntrinsic<T>;
    resolve: <R>(r: Resolveable<R>) => R;
    IntrinsicError: (s: string) => IntrinsicError;
    fnName: string
}
*/

/*class Intrinsic<A, T> {

    constructor(f: (this: Intrinsic<A, T>, arg: A) => T): (arg: A) => BoundIntrinsic<T>  {
        const boundF = (arg: A) => f.bind(null, arg);
        Object.setPrototypeOf(boundF, Intrinsic);
    }

    bind(arg: A) {
        this.arg = arg;
    }

    resolve<T>(r: Resolveable<T>) {
        return resolve(r);
    }
}
*/

export const Ref = new Intrinsic('Ref', function (reference: string) {
    // Check if the value of the Ref exists
    const resolvedVal = getRef(reference);
    if (resolvedVal === null) {
        throw this.IntrinsicError(`Referenced value ${reference} does not exist`)
    }
    return resolvedVal;
});

export const Base64 = new Intrinsic('Fn::Base64', function (value: Resolveable<string>) {
    const resolved = this.resolve(value);

    if (typeof resolved !== "string"){
        throw this.IntrinsicError('Parameter of Fn::Base64 is not a string');
    }

    return Buffer.from(resolved).toString('base64');
})

export const Join = new Intrinsic('Fn::Join', function (args: [string, Resolveable<string>[]]) {

    if (!Array.isArray(args) || args.length !== 2) {
        throw this.IntrinsicError('Invalid parameters for Fn::Join. It needs [string, string[]].');
    }

    const joiner = args[0];
    if (typeof joiner !== 'string') {
        throw this.IntrinsicError('Fn::Join needs its delimiter to be, or resolve to, a string.');
    }

    const parts = args[1];
    if (!Array.isArray(parts)) {
        throw this.IntrinsicError('Fn::Join needs its second parameter to be a list of values.');
    }

    const resolvedParts = this.resolve(parts);
    let naughty: any;
    if (naughty = resolvedParts.find((p) => !isString(p))) {
        throw this.IntrinsicError(`Fn::Join can only join strings. You provided ${naughty}.`);
    }

    return parts.join(joiner);

});

export const GetAtt = new Intrinsic('Fn::GetAtt', function (args: [string, Resolveable<string>]) {
    if (!Array.isArray(args) || args.length !== 2) {
        throw this.IntrinsicError('Invalid parameters for Fn::GetAtt');
    }

    const reference = args[0];
    if (typeof reference !== 'string') {
        throw this.IntrinsicError('Fn::GetAtt does not support functions for the logical resource name');
    }

    const attributeName = this.resolve(args[1]);
    if (typeof attributeName !== 'string') {
        throw this.IntrinsicError('Fn::GetAtt needs a string for the attribute to get.');
    }

    const resolved = fnGetAtt(reference, attributeName);

    if (resolved === null) {
        throw this.IntrinsicError(`Invalid GetAtt - ${reference}.${attributeName}`);
    }

    return resolved;
});

export const FindInMap = new Intrinsic('Fn::FindInMap', function (args: Resolveable<string>[]) {

    if (!Array.isArray(args) || args.length !== 3) {
        throw this.IntrinsicError('Invalid parameters for Fn::FindInMap');
    }

    const toGet = args.map((arg) => this.resolve(arg));

    if (toGet.findIndex((r) => (typeof r !== 'string')) > -1) {
        throw this.IntrinsicError('Invalid parameter for Fn::FindInMap. It needs a string.');
    }

    const value = fnFindInMap(toGet[0], toGet[1], toGet[2]);
    if (value == null) {
        throw this.IntrinsicError(`Could not find value in map ${toGet[0]}|${toGet[1]}|${toGet[2]}. Have you tried specifying input parameters?`);
    }

    return value;

})

export const GetAZs = new Intrinsic('Fn::GetAZs', function (arg: Resolveable<string>) {
    const region = this.resolve(arg);

    if (typeof region !== 'string') {
        throw this.IntrinsicError('Fn::GetAZs only supports Ref or string as a parameter');
    }

    // TODO
    // if(toGet[key] != 'AWS::Region'){
    //     addError("warn", "Fn::GetAZs expects a region, ensure this reference returns a region", placeInTemplate, "Fn::GetAZs");
    // }

    const AZs = ['a', 'b', 'c'].map((s) => `${region}${s}`);
    return AZs;
})

export const Select = new Intrinsic('Fn::Select', function (arg: [Resolveable<string|number>, Resolveable<any[]>]) {
    if (!Array.isArray(arg) || arg.length !== 2) {
        throw this.IntrinsicError('Fn::Select only supports an array ot two elements');
    }

    const indexStr = this.resolve(arg[0]);
    if (!isInteger(indexStr)) {
        throw this.IntrinsicError("Fn::Select's first argument did not resolve to a string for parsing or a numeric value.");
    }

    const index = parseInt(indexStr as string);

    const list = this.resolve(arg[1]);
    if (!Array.isArray(list)) {
        throw this.IntrinsicError(`Fn::Select requires the second element to be a list, function call did not resolve to a list. It contains value ${list}`);
    }

    if (index < 0 || index >= list.length) {
        throw this.IntrinsicError("First element of Fn::Select exceeds the length of the list.");
    }

    return list[index] as any;
}) as Intrinsic<[Resolveable<string|number>, Resolveable<any>], any>

function getSubArgs(_this: BoundIntrinsic<any, any>, arg: string | [string, {[k: string]: any}]): [string, {[k: string]: any}] {

    if (typeof arg === 'string') {
        return [arg, {}];
    } else if (Array.isArray(arg) && arg.length === 2) {

        const replacementString = arg[0];
        if (typeof replacementString !== 'string') {
            throw _this.IntrinsicError('Fn::Sub expects first argument to be a string');
        }

        const mapping = _this.resolve(arg[1]);
        if (typeof mapping !== 'object') {
            throw _this.IntrinsicError('Fn::Sub expects second argument to be a variable map');
        }

        const vars = objectMap(mapping, (v) => _this.resolve(v));

        return [replacementString, vars];

    } else {
        throw _this.IntrinsicError('Fn::Sub needs a string or an array of length 2.');
    }

}

export const Sub = new Intrinsic('Fn::Sub', function (arg: string | [string, {[k: string]: any}]) {

    const [replacementString, vars] = getSubArgs(this, arg);

    const regex = /\${([A-Za-z0-9:.!]+)/gm;

        return replacementString.replace(regex, (_: string, subMatch: string) => {
            if (subMatch.indexOf('!') === 1) {
                return subMatch;
            } else if (subMatch in vars) {
                return vars[subMatch];
            } else if (subMatch.indexOf('.') !== -1) {
                const [resource, ...attributes] = subMatch.split('.');
                const joinedAttribute = attributes.join('.');
                const resolved = fnGetAtt(resource, joinedAttribute);
                if (resolved == null) {
                    throw this.IntrinsicError(`Intrinsic Sub does not reference valid resource attribute '${subMatch}'`);
                }
                return resolved;
            } else {
                const resolved = getRef(subMatch);
                if (resolved == null) {
                    throw this.IntrinsicError(`Intrinsic Sub does not reference valid resource or mapping '${subMatch}'`);
                }
                return resolved;
            }
        });

})

export const If = new Intrinsic('Fn::If', function (arg: [string, Resolveable<any>, Resolveable<any>]) {
    if (!Array.isArray(arg) || arg.length !== 3) {
        throw this.IntrinsicError(`Fn::If must be an array with 3 arguments.`);
    }

    const ifTrue = arg[1];
    const ifFalse = arg[2];
    const condition = implicitCondition(arg[0], this.placeInTemplate, this.workingInput);
    const conditionValue = this.resolve(condition);

    if (conditionValue) {
        return this.resolve(ifTrue);
    } else {
        return this.resolve(ifFalse);
    }
})

export const Equals = new Intrinsic('Fn::Equals', function (arg: [Resolveable<any>, Resolveable<any>]) {
    if (!Array.isArray(arg) || arg.length !== 2) {
        throw this.IntrinsicError('Fn::Equals expects an array with 2 arguments.');
    }

    const v1 = this.resolve(arg[0]);
    const v2 = this.resolve(arg[1]);

    return (v1 == v2);
})

export const Or = new Intrinsic('Fn::Or', function (arg: any[]) {
    if (!Array.isArray(arg) || arg.length < 2 || arg.length > 10) {
        throw this.IntrinsicError('Fn::Or wants an array of between 2 and 10 arguments');
    }

    return Boolean(arg.find((condition) => this.resolve(condition) === true));
});

export const Not = new Intrinsic('Fn::Not', function (arg: [Resolveable<boolean>]) {
    if (!Array.isArray(arg) || arg.length !== 1) {
        throw this.IntrinsicError('Fn::Not expects an array of length 1');
    }

    const condition = this.resolve(arg[0]);

    if (typeof condition !== 'boolean') {
        throw this.IntrinsicError(`Fn::Not did not resolve to a boolean value, ${util.inspect(condition)} given`);
    }

    return !condition;
})

export const ImportValue = new Intrinsic('Fn::ImportValue', function (arg: Resolveable<string>) {
    const importName = this.resolve(arg);
    if (importName !== 'string') {
        throw this.IntrinsicError('Something went wrong when resolving references for a Fn::ImportValue');
    }

    return `IMPORTEDVALUE${importName}`;
});

export const Split = new Intrinsic('Fn::Split', function (args: [string, Resolveable<string>]) {

    if (!Array.isArray(args) || args.length !== 2) {
        throw this.IntrinsicError('Invalid parameter for Fn::Split. It needs an Array of length 2.');
    }

    const delimiter = args[0];
    if (typeof delimiter !== 'string') {
        throw this.IntrinsicError(`Invalid parameter for Fn::Split. The delimiter, ${util.inspect(delimiter)}, needs to be a string.`);
    }

    const stringToSplit = this.resolve(args[1]);
    if (typeof stringToSplit !== 'string') {
        throw this.IntrinsicError(`Invalid parameters for Fn::Split. The parameter, ${stringToSplit}, needs to be a string or a supported intrinsic function.`);
    }

    return stringToSplit.split(delimiter);

});

export const Condition = new Intrinsic('Condition', function (arg: string, workingInput: any) {
    if (typeof arg !== 'string') {
        throw this.IntrinsicError('Invalid parameter for Condition. It needs a string.');
    }

    return resolveCondition(this, arg, workingInput);
});

function implicitCondition(conditionName: string, placeInTemplate: BreadcrumbTrail, workingInput: any) {
    return Condition.bind(conditionName, placeInTemplate, workingInput);
}

function resolveCondition(_this: BoundIntrinsic<any, any>, conditionName: string, workingInput: any) {

    if (!workingInput.Conditions || !workingInput.Conditions[conditionName]) {
        throw _this.IntrinsicError(`Condition ${conditionName} must reference a valid condition.`);
    }

    const condition = workingInput.Conditions[conditionName];

    // TODO: containing function
    const resolvedCondition = recursiveResolve(condition, undefined)

    if (typeof resolvedCondition !== 'boolean') {
        throw _this.IntrinsicError(`Condition ${conditionName} returned ${resolveCondition}, it should have returned a boolean.`);
    }

    return resolvedCondition;
}

export const UnhandledIntrinsic = new Intrinsic('X::UnhandledIntrinsic', function (arg: any) {
    return 'UNHANDLED_INTRINSIC';
});
