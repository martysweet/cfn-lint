import buildYamlSchema, * as yamlSchema from '../yamlSchema';
import yaml = require('js-yaml');
import assert = require('assert');

describe('yamlSchema', () => {
    describe('buildYamlSchema', () => {
        it('should build a yaml schema', () => {
            assert(buildYamlSchema() instanceof yaml.Schema, 'yamlSchema didn\'t return a yaml schema');
        })
    });

    describe('functionTag', () => {
        it('should work on a Fn::Thing', () => {
            assert.strictEqual(yamlSchema.functionTag('Fn::Name'), 'Name');
        })
        it('should work on a Thing', () => {
            assert.strictEqual(yamlSchema.functionTag('Name'), 'Name');
        })
    });

    describe('buildYamlType', () => {
        it('should return a type that builds the JSON representation of the yaml tag', () => {
            const type = yamlSchema.buildYamlType('Fn::Join', 'sequence');
            const input = ['asdf', 'asdf'];
            const representation = type.construct(input);
            assert.deepStrictEqual(representation, {'Fn::Join': ['asdf', 'asdf']});
        });

        it('should special-case Fn::GetAtt', () => {
            const type = yamlSchema.buildYamlType('Fn::GetAtt', 'scalar');
            const input = 'Resource.Attribute';
            const representation = type.construct(input);
            assert.deepStrictEqual(representation, {'Fn::GetAtt': ['Resource', 'Attribute']});
        })
    })


})