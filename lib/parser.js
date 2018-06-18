"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var yaml = require("js-yaml");
var fs = require("fs");
var yamlSchema_1 = require("./yamlSchema");
var yamlSchema = yamlSchema_1.default();
function openFile(path) {
    // Check the file path is valid
    if (!fs.existsSync(path)) {
        throw Error("Could not find file " + path + ". Check the input path.");
    }
    // Try JSON loading
    try {
        return openJson(path);
    }
    catch (e) {
    }
    // Try YAML loading
    try {
        return openYaml(path);
    }
    catch (e) {
        throw Error("Could not determine file type. Check your template is not malformed. " + e.message);
    }
}
exports.openFile = openFile;
;
function openYaml(path) {
    // Try and load the Yaml
    var yamlParse = yaml.safeLoad(fs.readFileSync(path, 'utf8'), {
        filename: path,
        schema: yamlSchema,
        onWarning: function (warning) {
            console.error(warning);
        }
    });
    if (typeof yamlParse == 'object') {
        return yamlParse;
    }
    // Yaml Parsing error
    throw new Error("YAML could not be parsed.");
}
function openJson(path) {
    return JSON.parse(fs.readFileSync(path, 'utf8'));
}
//# sourceMappingURL=parser.js.map