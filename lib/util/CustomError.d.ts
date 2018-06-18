/// <reference types="node" />
declare const _default: {
    new (message: string): {
        name: string;
        message: string;
        stack?: string | undefined;
    };
    fixErrorInheritance(e: Error, constructor: Function): void;
    captureStackTrace(targetObject: Object, constructorOpt?: Function | undefined): void;
    prepareStackTrace?: ((err: Error, stackTraces: NodeJS.CallSite[]) => any) | undefined;
    stackTraceLimit: number;
};
export = _default;
