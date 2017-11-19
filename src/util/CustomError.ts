


export = class CustomError extends Error {
  constructor(message: string) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }

  // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
  // safe to remove when targeting es6
  static fixErrorInheritance(e: Error, constructor: Function) {
    (e as any).__proto__ = constructor.prototype;
  }
}
