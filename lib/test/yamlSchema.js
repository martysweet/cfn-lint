"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var yamlSchema_1 = require("../yamlSchema"), yamlSchema = yamlSchema_1;
var yaml = require("js-yaml");
var assert = require("assert");
describe('yamlSchema', function () {
    describe('buildYamlSchema', function () {
        it('should build a yaml schema', function () {
            assert(yamlSchema_1.default() instanceof yaml.Schema, 'yamlSchema didn\'t return a yaml schema');
        });
    });
    describe('functionTag', function () {
        it('should work on a Fn::Thing', function () {
            assert.strictEqual(yamlSchema.functionTag('Fn::Name'), 'Name');
        });
        it('should work on a Thing', function () {
            assert.strictEqual(yamlSchema.functionTag('Name'), 'Name');
        });
    });
    describe('buildYamlType', function () {
        it('should return a type that builds the JSON representation of the yaml tag', function () {
            var type = yamlSchema.buildYamlType('Fn::Join', 'sequence');
            var input = ['asdf', 'asdf'];
            var representation = type.construct(input);
            assert.deepStrictEqual(representation, { 'Fn::Join': ['asdf', 'asdf'] });
        });
        it('should special-case Fn::GetAtt', function () {
            var type = yamlSchema.buildYamlType('Fn::GetAtt', 'scalar');
            var input = 'Resource.Attribute';
            var representation = type.construct(input);
            assert.deepStrictEqual(representation, { 'Fn::GetAtt': ['Resource', 'Attribute'] });
        });
    });
});
//# sourceMappingURL=yamlSchema.js.map