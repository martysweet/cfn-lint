"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.awsExtraDocs = require('../data/aws_extra_docs.json');
exports.awsResources = require('../data/aws_resources_specification.json');
exports.awsResourceRefTypes = require('../data/aws_resource_ref_types.json');
exports.awsParameterTypes = require('../data/aws_parameter_types.json');
exports.awsIntrinsicFunctions = require('../data/aws_intrinsic_functions.json');
// avoid "does this exist" checks everywhere
for (var functionName in exports.awsIntrinsicFunctions) {
    exports.awsIntrinsicFunctions[functionName].supportedFunctions = exports.awsIntrinsicFunctions[functionName].supportedFunctions || [];
}
exports.awsRefOverrides = require('../data/aws_ref_override.json');
exports.awsRefOverrides["AWS::NoValue"] = undefined;
//# sourceMappingURL=awsData.js.map