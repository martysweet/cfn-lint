export = function objectMap<O, T>(o: O, map: (v: O[keyof O]) => T) {
    const ret = {} as {[k in keyof O]: T};
    for (const k in o) {
        ret[k] = map(o[k]);
    }
    return ret;
}
