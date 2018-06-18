"use strict";
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var yaml = require("js-yaml");
function functionTag(functionName) {
    var splitFunctionName = functionName.split('::');
    return splitFunctionName[splitFunctionName.length - 1];
}
exports.functionTag = functionTag;
function buildYamlSchema() {
    var intrinsicFunctions = require('../data/aws_intrinsic_functions.json');
    var yamlTypes = [];
    for (var fn in intrinsicFunctions) {
        yamlTypes.push.apply(yamlTypes, __spread(buildYamlTypes(fn)));
    }
    return yaml.Schema.create(yamlTypes);
}
exports.default = buildYamlSchema;
var kinds = ['scalar', 'mapping', 'sequence'];
function buildYamlTypes(fnName) {
    return kinds.map(function (kind) { return buildYamlType(fnName, kind); });
}
exports.buildYamlTypes = buildYamlTypes;
function buildYamlType(fnName, kind) {
    var tagName = functionTag(fnName);
    var tag = "!" + tagName;
    var constructFn = (fnName === 'Fn::GetAtt')
        ? function (data) { return ({ 'Fn::GetAtt': Array.isArray(data) ? data : data.split('.') }); }
        : function (data) {
            return (_a = {}, _a[fnName] = data, _a);
            var _a;
        };
    return new yaml.Type(tag, {
        kind: kind,
        construct: constructFn
    });
}
exports.buildYamlType = buildYamlType;
//# sourceMappingURL=yamlSchema.js.map