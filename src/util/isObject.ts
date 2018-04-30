export = function (obj: any) {
    return (typeof obj === 'object')
        && Object.getPrototypeOf(obj) === Object.prototype;
}
