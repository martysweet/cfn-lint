"use strict";
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
Object.defineProperty(exports, "__esModule", { value: true });
var chai = require("chai");
var expect = chai.expect;
var assert = chai.assert;
var validator = require("../validator");
var yaml = require("js-yaml");
var awsData_1 = require("../awsData");
var util = require("util");
describe('validator', function () {
    beforeEach(function () {
        validator.resetValidator();
    });
    describe('validateJsonObject', function () {
        it('a valid (1.json) template should return an object with validTemplate = true, no crit errors', function () {
            var input = require('../../testData/valid/json/1.json');
            var result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });
        it('a valid (2.json) template should return an object with validTemplate = true, no crit errors', function () {
            var input = require('../../testData/valid/json/2.json');
            validator.addParameterValue('InstanceType', 't1.micro');
            var result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });
        it('a valid (3.json) template should return an object with validTemplate = true, no crit errors', function () {
            var input = require('../../testData/valid/json/3.json');
            var result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });
        it('a valid (4.json) template should return an object with validTemplate = true, no crit errors', function () {
            var input = require('../../testData/valid/json/4.json');
            validator.addParameterValue('InstanceType', 't1.micro');
            var result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });
        it('2 invalid resource types should return an object with validTemplate = false, 2 crit errors', function () {
            var input = require('../../testData/invalid/json/1_invalid_resource_type.json');
            var result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(2);
        });
        it('1 missing parameter type should return an object with validTemplate = false, 1 crit errors', function () {
            var input = require('../../testData/invalid/json/1_missing_parameter_type.json');
            var result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
        });
        it('1 invalid parameter type should return an object with validTemplate = false, 1 crit errors', function () {
            var input = require('../../testData/invalid/json/1_invalid_parameter_type.json');
            var result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
        });
        it('missing section resources should return an object with validTemplate = false, 1 crit errors', function () {
            var input = require('../../testData/invalid/json/no_resources.json');
            var result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
        });
        it('empty section resources should return an object with validTemplate = false, 1 crit errors', function () {
            var input = require('../../testData/invalid/json/empty_resources.json');
            var result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
        });
        it('1 invalid resource reference should return an object with validTemplate = false, 1 crit errors', function () {
            var input = require('../../testData/invalid/json/1_invalid_resource_reference.json');
            var result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
        });
        it('1 invalid parameter reference should return an object with validTemplate = false, 1 crit errors', function () {
            var input = require('../../testData/invalid/json/1_invalid_parameter_reference.json');
            var result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
        });
        it('2 invalid Fn::Join\'s should return an object with validTemplate = false, 2 crit errors', function () {
            var input = require('../../testData/invalid/json/2_invalid_intrinsic_join.json');
            var result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(2);
        });
        it('1 invalid Fn::GetAtt should return an object with validTemplate = false, 1 crit errors', function () {
            var input = require('../../testData/invalid/json/1_invalid_intrinsic_get_att.json');
            validator.addParameterValue('InstanceType', 't1.micro');
            var result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
        });
        it('1 invalid Fn::FindInMap should return an object with validTemplate = false, 1 crit errors', function () {
            var input = require('../../testData/invalid/json/1_invalid_intrinsic_mappings.json');
            var result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
        });
        it('1 invalid Ref within Parameters should return an object with validTemplate = false, 1 crit errors', function () {
            var input = require('../../testData/invalid/json/1_intrinsic_function_in_parameters.json');
            var result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
        });
        it('1 invalid GetAZs parameter should return an object with validTemplate = false, 1 crit errors', function () {
            var input = require('../../testData/invalid/json/1_invalid_get_azs_parameter.json');
            validator.addParameterValue('InstanceType', 't1.micro');
            var result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
        });
        it('1 reference non AWS::Region GetAZs parameter should return an object with validTemplate = false, 1 warn errors', function () {
            var input = require('../../testData/invalid/json/1_warning_ref_get_azs_parameter.json');
            validator.addParameterValue('InstanceType', 't1.micro');
            var result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['warn']).to.have.lengthOf(1);
        });
    });
    describe('Fn::Join', function () {
        it('should error if it attempts to join anything but a list of values', function () {
            var input = './testData/invalid/yaml/invalid_join_parts.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message']).to.include('Invalid parameters for Fn::Join');
        });
    });
    describe('Fn::Select JSON', function () {
        it("should pass validation, with flat list and intrinsic list", function () {
            var input = require('../../testData/valid/json/5_valid_intrinsic_select.json');
            var result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it("should pass validation with Parameter Collection", function () {
            var input = require('../../testData/valid/json/5_valid_intrinsic_select_2.json');
            var result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it("should error if index is greater than list size", function () {
            var input = require('../../testData/invalid/json/5_invalid_intrinsic_select_1.json');
            var result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message'].indexOf('First element of Fn::Select exceeds the length of the list.')).to.be.greaterThan(-1);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it("should error if second element is not a list or a function", function () {
            var input = require('../../testData/invalid/json/5_invalid_intrinsic_select_2.json');
            var result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message'].indexOf("Fn::Select requires the second element to resolve to a list")).to.be.greaterThan(-1);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it("should error if first element is not a number or does not parse to a number", function () {
            var input = require('../../testData/invalid/json/5_invalid_intrinsic_select_3.json');
            var result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message'].indexOf("First element of Fn::Select must be a number, or it must use an intrinsic fuction that returns a number")).to.be.greaterThan(-1);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it("should error if first element is not defined or is null", function () {
            var input = require('../../testData/invalid/json/5_invalid_intrinsic_select_4.json');
            var result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message'].indexOf("Fn::Select first element cannot be null or undefined")).to.be.greaterThan(-1);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it("should error if only one element as argument list", function () {
            var input = require('../../testData/invalid/json/5_invalid_intrinsic_select_5.json');
            var result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message'].indexOf("Fn::Select only supports an array of two elements")).to.be.greaterThan(-1);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it("should error if second element is null or undefined", function () {
            var input = require('../../testData/invalid/json/5_invalid_intrinsic_select_6.json');
            var result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message'].indexOf("Fn::Select Second element cannot be null or undefined")).to.be.greaterThan(-1);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it("should error if second element does not resolve to a list", function () {
            var input = require('../../testData/invalid/json/5_invalid_intrinsic_select_7.json');
            var result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message'].indexOf("Fn::Select requires the second element to be a list, function call did not resolve to a list.")).to.be.greaterThan(-1);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it("should error if first element does not resolve to a number", function () {
            var input = require('../../testData/invalid/json/5_invalid_intrinsic_select_8.json');
            var result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message'].indexOf("Fn::Select's first argument did not resolve to a string for parsing or a numeric value.")).to.be.greaterThan(-1);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it("should error if first element attempts an invalid intrinsic function", function () {
            var input = require('../../testData/invalid/json/5_invalid_intrinsic_select_9.json');
            var result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit'][0]['message'].indexOf("Fn::Select does not support the Fn::Select function in argument 1")).to.be.greaterThan(-1);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it("should error if first element is anything other than non-array object, number or string", function () {
            var input = require('../../testData/invalid/json/5_invalid_intrinsic_select_10.json');
            var result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit'][0]['message'].indexOf("Fn:Select's first argument must be a number or resolve to a number")).to.be.greaterThan(-1);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it("should error if second element attempts an invalid intrinsic function", function () {
            var input = require('../../testData/invalid/json/5_invalid_intrinsic_select_11.json');
            var result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit'][0]['message'].indexOf("n::Select does not support the Fn::Select function in argument 2")).to.be.greaterThan(-1);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it("should error if second element contains a list with null values", function () {
            var input = require('../../testData/invalid/json/5_invalid_intrinsic_select_12.json');
            var result = validator.validateJsonObject(input);
            expect(result['errors']['crit'][0]['message'].indexOf("Fn::Select requires that the list be free of null values")).to.be.greaterThan(-1);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
    });
    describe('Fn::Select YAML', function () {
        it('should validate in yaml with literal and intrinic elements in array', function () {
            var input = './testData/valid/yaml/5_valid_intrinsic_select.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it('should validate in yaml with Comma Separated List Param', function () {
            var input = './testData/valid/yaml/5_valid_intrinsic_select_2.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it("should error if index is greater than list size", function () {
            var input = './testData/invalid/yaml/5_invalid_intrinsic_select_1.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message'].indexOf('First element of Fn::Select exceeds the length of the list.')).to.be.greaterThan(-1);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it("should error if second element is not a list or a function", function () {
            var input = './testData/invalid/yaml/5_invalid_intrinsic_select_2.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message'].indexOf("Fn::Select requires the second element to resolve to a list")).to.be.greaterThan(-1);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it("should error if first element is not a number or does not parse to a number", function () {
            var input = './testData/invalid/yaml/5_invalid_intrinsic_select_3.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message'].indexOf("First element of Fn::Select must be a number, or it must use an intrinsic fuction that returns a number")).to.be.greaterThan(-1);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it("should error if first element is not defined or is null", function () {
            var input = './testData/invalid/yaml/5_invalid_intrinsic_select_4.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message'].indexOf("Fn::Select first element cannot be null or undefined")).to.be.greaterThan(-1);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it("should error if only one element as argument list", function () {
            var input = './testData/invalid/yaml/5_invalid_intrinsic_select_5.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message'].indexOf("Fn::Select only supports an array of two elements")).to.be.greaterThan(-1);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it("should error if second element is null or undefined", function () {
            var input = './testData/invalid/yaml/5_invalid_intrinsic_select_6.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message'].indexOf("Fn::Select Second element cannot be null or undefined")).to.be.greaterThan(-1);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it("should error if second element does not resolve to a list", function () {
            var input = './testData/invalid/yaml/5_invalid_intrinsic_select_7.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message'].indexOf("Fn::Select requires the second element to be a list, function call did not resolve to a list.")).to.be.greaterThan(-1);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it("should error if first element does not resolve to a number", function () {
            var input = './testData/invalid/yaml/5_invalid_intrinsic_select_8.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message'].indexOf("Fn::Select's first argument did not resolve to a string for parsing or a numeric value.")).to.be.greaterThan(-1);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it("should error if first element attempts an invalid intrinsic function", function () {
            var input = './testData/invalid/yaml/5_invalid_intrinsic_select_9.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message'].indexOf("Fn::Select does not support the Fn::Select function in argument 1")).to.be.greaterThan(-1);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it("should error if first element is anything other than non-array object, number or string", function () {
            var input = './testData/invalid/yaml/5_invalid_intrinsic_select_10.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message'].indexOf("Fn:Select's first argument must be a number or resolve to a number")).to.be.greaterThan(-1);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it("should error if second element attempts an invalid intrinsic function", function () {
            var input = './testData/invalid/yaml/5_invalid_intrinsic_select_11.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message'].indexOf("n::Select does not support the Fn::Select function in argument 2")).to.be.greaterThan(-1);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it("should error if second element contains a list with null values", function () {
            var input = './testData/invalid/yaml/5_invalid_intrinsic_select_12.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message'].indexOf("Fn::Select requires that the list be free of null values")).to.be.greaterThan(-1);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
    });
    describe('Fn::Sub', function () {
        it('3 valid Fn::Sub should return an object with validTemplate = true, 0 crit errors', function () {
            var input = './testData/valid/yaml/valid_sub_operations.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });
        it('a sub referencing an invalid resource should result in validTemplate = false, 1 crit errors, no warnings', function () {
            var input = 'testData/invalid/yaml/invalid_sub_reference.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it('a sub getatt an invalid resource should result in validTemplate = false, 2 crit errors, no warnings', function () {
            var input = 'testData/invalid/yaml/invalid_sub_getatt.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(2);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
    });
    describe('Fn::ImportValue', function () {
        it('1 invalid Fn::ImportValue should return an object with validTemplate = false, 1 crit errors', function () {
            var input = './testData/invalid/yaml/invalid_import_value_intrinsic_function.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message']).to.contain('Fn::ImportValue does not support function');
        });
        it('1 invalid Fn::ImportValue should return an object with validTemplate = false, 1 crit errors', function () {
            var input = './testData/invalid/yaml/invalid_import_value_type.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message']).to.contain('Expecting an integer');
        });
        it('a valid Fn::ImportValue should return an object with validTemplate = true, 0 crit errors', function () {
            var input = './testData/valid/yaml/valid_import_value.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });
    });
    describe('Fn::GetAtt', function () {
        it('Fn::GetAtt for an arbitrary attribute on a custom resource should return a mock result', function () {
            var input = 'testData/valid/yaml/valid_getatt_custom_resource.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.property('templateValid', true);
            expect(validator.fnGetAtt('Custom', 'SomeAttribute')).to.equal('mockAttr_Custom_SomeAttribute');
            expect(validator.fnGetAtt('Custom2', 'SomeAttribute')).to.equal('mockAttr_Custom2_SomeAttribute');
        });
        it("should pass validation where !GetAtt returns a list", function () {
            var input = 'testData/valid/yaml/issue-134-valid-fngetatt-returns-array.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it("should not pass validation where !GetAtt returns a list", function () {
            var input = 'testData/valid/yaml/issue-134-invalid-fngetatt-returns-array.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it("should not pass validation with !GetAtt where attribute does not exist", function () {
            var input = 'testData/valid/yaml/issue-134-invalid-fngetatt-att-does-not-exist.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(2);
            expect(result['errors']['crit'][0]).to.have.property('message', 'No such attribute VeryLostNameServers on AWS::Route53::HostedZone');
            expect(result['errors']['crit'][0]).to.have.property('resource', 'Resources > DNSVPCDelegation > Properties > ResourceRecords');
            expect(result['errors']['crit'][0]).to.have.property('documentation', 'http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-route53-hostedzone.html');
            expect(result['errors']['crit'][1]).to.have.property('message', "Expecting a list, got 'INVALID_REFERENCE_OR_ATTR_ON_GET_ATT'");
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it("should pass validation where !GetAtt returns some unexpected attribute for AWS::CloudFormation::Stack", function () {
            var input = 'testData/valid/yaml/issue-149-valid-fngetatt-aws_cloudformation_stack.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it("should not pass validation with !GetAtt where the resource does not exist", function () {
            var input = 'testData/invalid/yaml/issue_51_missing_resource.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]).to.have.property('message', 'No resource with logical name of Database!');
            expect(result['errors']['crit'][0]).to.have.property('resource', 'Outputs > DBDNS > Value');
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
    });
    describe('conditions', function () {
        it('1 invalid if condition arguments should return an object with validTemplate = false, 1 crit errors', function () {
            var input = './testData/invalid/yaml/invalid_if_statement_arguments.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message']).to.contain('Fn::If must have 3 arguments');
        });
        it('1 invalid if condition should return an object with validTemplate = false, 1 crit errors', function () {
            var input = './testData/invalid/yaml/invalid_if_statement_condition.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message']).to.contain('Condition \'UseProdConditionnnnn\' must reference a valid condition');
        });
        it('1 invalid condition value should return an object with validTemplate = false, 1 crit errors', function () {
            var input = './testData/invalid/yaml/invalid_condition_value.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message']).to.contain('Condition does not allow function \'Ref\' here');
        });
        it('1 invalid condition value type should return an object with validTemplate = false, 1 crit errors', function () {
            var input = './testData/invalid/yaml/invalid_condition_value_type.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message']).to.contain('Condition should consist of an intrinsic function of type');
        });
    });
    describe('Fn::Split', function () {
        it('should split a basic string', function () {
            var input = {
                'Fn::Split': ['-', 'asdf-fdsa']
            };
            var result = validator.doInstrinsicSplit(input, 'Fn::Split');
            expect(result).to.deep.equal(['asdf', 'fdsa']);
        });
        it('should split a string that doesn\'t contain the delimiter', function () {
            var input = {
                'Fn::Split': ['-', 'asdffdsa']
            };
            var result = validator.doInstrinsicSplit(input, 'Fn::Split');
            expect(result).to.deep.equal(['asdffdsa']);
        });
        it('should resolve an intrinsic function', function () {
            var input = {
                'Fn::Split': ['-', {
                        'Fn::Select': [1, ['0-0', '1-1', '2-2']]
                    }]
            };
            var result = validator.doInstrinsicSplit(input, 'Fn::Split');
            expect(result).to.deep.equal(['1', '1']);
        });
        it('should reject a parameter that is an object', function () {
            var input = {
                'Fn::Split': {}
            };
            var result = validator.doInstrinsicSplit(input, 'Fn::Split');
            expect(result).to.deep.equal(['INVALID_SPLIT']);
        });
        it('should reject a parameter that is a string', function () {
            var input = {
                'Fn::Split': 'split-me-plz'
            };
            var result = validator.doInstrinsicSplit(input, 'Fn::Split');
            expect(result).to.deep.equal(['INVALID_SPLIT']);
        });
        it('should reject a parameter that is an empty array', function () {
            var input = {
                'Fn::Split': []
            };
            var result = validator.doInstrinsicSplit(input, 'Fn::Split');
            expect(result).to.deep.equal(['INVALID_SPLIT']);
        });
        it('should reject a parameter that is a single length array', function () {
            var input = {
                'Fn::Split': ['delim']
            };
            var result = validator.doInstrinsicSplit(input, 'Fn::Split');
            expect(result).to.deep.equal(['INVALID_SPLIT']);
        });
        it('should reject a delimiter that isn\'t a string', function () {
            var input = {
                'Fn::Split': [{}, 'asd-asd-asd']
            };
            var result = validator.doInstrinsicSplit(input, 'Fn::Split');
            expect(result).to.deep.equal(['INVALID_SPLIT']);
        });
        describe('validator test', function () {
            var result;
            before(function () {
                validator.resetValidator();
                var input = './testData/valid/yaml/split.yaml';
                result = validator.validateFile(input);
            });
            it('should have no errors', function () {
                console.dir(result['errors']);
                expect(result).to.have.deep.property('templateValid', true);
                expect(result['errors']['crit']).to.have.lengthOf(0);
            });
            it('should resolve a simple split', function () {
                expect(result['outputs']['Simple']).to.deep.equal(['asdf', 'fdsa']);
            });
            it('should resolve a split of a join', function () {
                expect(result['outputs']['Nested']).to.deep.equal(['asdf', 'fdsa_asdf', 'fdsa']);
            });
            it('should resolve a select of a split', function () {
                expect(result['outputs']['SelectASplit']).to.deep.equal('b');
            });
        });
    });
    describe('templateVersion', function () {
        it('1 invalid template version should return an object with validTemplate = false, 1 crit errors', function () {
            var input = './testData/invalid/yaml/invalid_template_format_version.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message']).to.contain('AWSTemplateFormatVersion should be');
        });
        // Check for optional template version
        it('1 missing template version should return an object with validTemplate = true, 0 crit errors', function () {
            var input = './testData/valid/yaml/valid_missing_template_format_version.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });
        it('1 unquouted template format version should return an object with validTemplate = true, no crit errors, 1 warn error', function () {
            var input = 'testData/valid/yaml/valid_unquoted_template_version.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
            expect(result['errors']['warn']).to.have.lengthOf(1);
            expect(result['errors']['warn'][0]['message']).to.contain('AWSTemplateFormatVersion is recommended to be of type string');
        });
    });
    describe('propertyValidation', function () {
        it('1 invalid arn property should return an object with validTemplate = false, 1 crit errors', function () {
            var input = './testData/invalid/yaml/invalid_arn.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message']).to.contain('Expecting an ARN');
        });
        it('1 invalid property name of ResourceType should return an object with validTemplate = false, 1 crit errors', function () {
            var input = './testData/invalid/yaml/invalid_resourcetype_property_name.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message']).to.contain('is not a valid property of');
            expect(result['errors']['crit'][0]['resource']).to.contain('Resources > Rule');
        });
        it('1 invalid property name of PropertyType should return an object with validTemplate = false, 1 crit errors', function () {
            var input = './testData/invalid/yaml/invalid_propertytype_property_name.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message']).to.contain('S3Buckettttt is not a valid property of AWS::Lambda::Function.Code');
        });
        it('1 invalid property name of Tag list should return an object with validTemplate = false, 1 crit errors', function () {
            var input = './testData/invalid/yaml/invalid_ec2_tags_property_name.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message']).to.contain('Keyyyyy is not a valid property of');
        });
        it('1 string property should return an object with validTemplate = false, 1 crit errors', function () {
            var input = './testData/invalid/yaml/invalid_property_type_string.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(2);
            expect(result['errors']['crit'][0]['message']).to.contain('Expecting a string');
            expect(result['errors']['crit'][1]['message']).to.contain('Expecting a string');
        });
        it('1 missing propertyType property should return an object with validTemplate = false, 1 crit errors', function () {
            var input = './testData/invalid/yaml/invalid_required_propertytype_prop_missing.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message']).to.contain('Required property Key missing for type Tag');
        });
        it('1 missing resourceType  property should return an object with validTemplate = false, 1 crit errors', function () {
            var input = './testData/invalid/yaml/invalid_required_resourcetype_prop_missing.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message']).to.contain('Required property Runtime missing for type AWS::Lambda::Function');
        });
        it('1 missing (via AWS::NoValue) property should return an object with validTemplate = false, 1 crit errors', function () {
            var input = './testData/invalid/yaml/invalid_required_resourcetype_prop_no_value.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message']).to.contain('Required property Runtime missing for type AWS::Lambda::Function');
        });
        it('1 invalid boolean property should return an object with validTemplate = false, 1 crit errors', function () {
            var input = './testData/invalid/yaml/invalid_boolean_type.yaml';
            validator.addParameterValue('CertificateArn', 'arn:aws:region:something');
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message']).to.contain('Expecting a Boolean, got \'trueeeee\'');
            expect(result['errors']['crit'][0]['resource']).to.contain('Resources > CloudFrontDistribution > Properties > DistributionConfig > DefaultCacheBehavior > Compress');
        });
        it('4 invalid nested properties should return an object with validTemplate = false, 4 crit errors', function () {
            var input = './testData/invalid/yaml/invalid_missing_nested_property.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(4);
            expect(result['errors']['crit'][0]['message']).to.contain('Required property TargetOriginId missing for type AWS::CloudFront::Distribution.DefaultCacheBehavior');
            expect(result['errors']['crit'][0]['resource']).to.contain('Resources > CloudFrontDistribution > Properties > DistributionConfig > DefaultCacheBehavior');
            expect(result['errors']['crit'][1]['message']).to.contain('Required property Forward missing for type AWS::CloudFront::Distribution.Cookies');
            expect(result['errors']['crit'][1]['resource']).to.contain('Resources > CloudFrontDistribution > Properties > DistributionConfig > DefaultCacheBehavior > ForwardedValues > Cookies');
            expect(result['errors']['crit'][2]['message']).to.contain('Something is not a valid property of AWS::CloudFront::Distribution.Cookies');
            expect(result['errors']['crit'][2]['resource']).to.contain('Resources > CloudFrontDistribution > Properties > DistributionConfig > DefaultCacheBehavior > ForwardedValues > Cookies');
            expect(result['errors']['crit'][3]['message']).to.contain('Required property Bucket missing for type AWS::CloudFront::Distribution.Logging');
            expect(result['errors']['crit'][3]['resource']).to.contain('Resources > CloudFrontDistribution > Properties > DistributionConfig > Logging');
        });
        it('a valid template with a Map property should return an object with validTemplate = true, no crit errors', function () {
            var input = 'testData/valid/yaml/maps.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });
        it('an invalid template with a Map property should return an object with validTemplate = false, 1 crit error', function () {
            var input = 'testData/invalid/yaml/invalid_maps.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message']).to.contain('Expecting a string, got { not: \'a string\' }');
            expect(result['errors']['crit'][0]['resource']).to.contain('Resources > 0-ParameterGroupWithAMap > Properties > Parameters > key');
        });
        it('a valid (valid_timestamp.yaml) template with a Timestamp should return an objcet with validTemplate = true', function () {
            var input = 'testData/valid/yaml/valid_timestamp.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });
        it('a (invalid_timestamp.yaml) template with an invalid Timestamp should return an objcet with validTemplate = false, 2 crit errors', function () {
            var input = 'testData/invalid/yaml/invalid_timestamp.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(3);
            expect(result['errors']['crit'][0]).to.have.property('message', 'Expecting an ISO8601-formatted string, got \'some random string\'');
            expect(result['errors']['crit'][1]).to.have.property('message', 'Expecting an ISO8601-formatted string, got \'2017-08-08 00:08\'');
            expect(result['errors']['crit'][2]).to.have.property('message', 'Expecting an ISO8601-formatted string, got 1502150400');
        });
        it('a valid template with APIG string results in validTemplate = true, 0 crit error', function () {
            var input = 'testData/valid/yaml/issue-81-api-gateway.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });
    });
    describe('validateYamlFile', function () {
        it('a valid (1.yaml) template should return an object with validTemplate = true, no crit errors', function () {
            var input = 'testData/valid/yaml/1.yaml';
            validator.addParameterValue('InstanceType', 't1.micro');
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });
        it('a valid (2.yaml) template should return an object with validTemplate = true, no crit errors', function () {
            var input = 'testData/valid/yaml/2.yaml';
            validator.addParameterValue('CertificateArn', 'arn:aws:region:something');
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
            expect(result['errors']['warn']).to.have.lengthOf(0);
            expect(result['errors']['info']).to.have.lengthOf(0);
        });
        it('a valid (valid_minus_one_as_string.yaml) template should return an object with validTemplate = true, no crit errors', function () {
            var input = 'testData/valid/yaml/valid_minus_one_as_string.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });
    });
    describe('issues', function () {
        it('a valid ASG template with Tags property should return an object with validTemplate = true, no crit errors', function () {
            var input = 'testData/valid/yaml/issue-24.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });
        it('both methods of defining a custom resource should result in validTemplate = true, no crit errors', function () {
            var input = 'testData/valid/yaml/issue-28-custom-resource.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });
        it('numeric properties should result in validTemplate = true, no crit errors, no warn errors', function () {
            var input = 'testData/valid/yaml/issue-27-numeric-properties.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it('IAM with ManagedPolicyName should result in validTemplate=true, no crit errors, no warn errors', function () {
            var input = 'testData/valid/yaml/issue-42-managed-policy-name.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });
        it('Reference to RDS attribute validTemplate=true, no crit errors, no warn errors', function () {
            var input = 'testData/valid/yaml/issue-44-database-endpoint.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });
        it('if condition not working as expected, no crit errors, no warn errors', function () {
            var input = 'testData/valid/yaml/issue-61.yaml';
            validator.addParameterValue('Env', 'Production');
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });
        it('if condition not working as expected, 2 crit errors, no warn errors', function () {
            var input = 'testData/valid/yaml/issue-61.yaml';
            validator.addParameterValue('Env', 'Dev');
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(2);
            expect(result['errors']['crit'][0]).to.have.property('message', 'Required property FunctionName missing for type AWS::Lambda::Version');
            expect(result['errors']['crit'][1]).to.have.property('message', 'Required property FunctionName missing for type AWS::Lambda::Version');
        });
        it('a list of an extended parameter type should be properly mocked without causing an exception', function () {
            var input = 'testData/valid/yaml/issue-94-list-security-group.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });
        it('a null property value should not cause an exception', function () {
            var input = 'testData/invalid/yaml/null_value.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]).to.have.property('message', 'Expecting a list, got null');
        });
    });
    describe('parameters-validation', function () {
        it('an unallowed parameter value provided at runtime gets rejected', function () {
            var input = 'testData/valid/yaml/parameters-allowed-values.yaml';
            validator.addParameterValue('Env', 'InvalidValue');
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
        });
        it('an allowed parameter value provided at runtime gets allowed', function () {
            var input = 'testData/valid/yaml/parameters-allowed-values.yaml';
            validator.addParameterValue('Env', 'Dev');
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });
        it('an empty parameter value provided at runtime picks up the empty default (which will throw an error)', function () {
            var input = 'testData/valid/yaml/parameters-allowed-values.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]).to.has.property('message', 'Parameter value \'\' for Env is not within the parameters AllowedValues');
        });
        it('missing parameters should cause an error when guessParameters is set', function () {
            var input = 'testData/valid/yaml/parameters.yaml';
            var result = validator.validateFile(input, { guessParameters: [] });
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]).to.has.property('message', 'Value for parameter was not provided');
        });
        it('parameters in guessParameters should be permitted to be guessed', function () {
            var input = 'testData/valid/yaml/parameters.yaml';
            var result = validator.validateFile(input, { guessParameters: ['Env'] });
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
            expect(result['errors']['info']).to.have.lengthOf(0);
        });
        it('List<AWS::EC2::AvailabilityZone::Name> should return a list', function () {
            var input = './testData/valid/yaml/parameters_type_list_aws_ec2_availabilityzone_name.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['info']).to.have.lengthOf(0);
            expect(result['errors']['warn']).to.have.lengthOf(0);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });
        it('List<AWS::EC2::Image::Id> should return a list', function () {
            var input = './testData/valid/yaml/parameters_type_list_aws_ec2_image_id.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['info']).to.have.lengthOf(0);
            expect(result['errors']['warn']).to.have.lengthOf(0);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });
        it('List<AWS::EC2::Instance::Id> should return a list', function () {
            var input = './testData/valid/yaml/parameters_type_list_aws_ec2_instance_id.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['info']).to.have.lengthOf(0);
            expect(result['errors']['warn']).to.have.lengthOf(0);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });
        it('List<AWS::EC2::SecurityGroup::GroupName> should return a list', function () {
            var input = './testData/valid/yaml/parameters_type_list_aws_ec2_securitygroup_groupname.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['info']).to.have.lengthOf(0);
            expect(result['errors']['warn']).to.have.lengthOf(0);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });
        it('List<AWS::EC2::SecurityGroup::Id> should return a list', function () {
            var input = './testData/valid/yaml/parameters_type_list_aws_ec2_securitygroup_id.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['info']).to.have.lengthOf(0);
            expect(result['errors']['warn']).to.have.lengthOf(0);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });
        it('List<AWS::EC2::Subnet::Id> should return a list', function () {
            var input = './testData/valid/yaml/parameters_type_list_aws_ec2_subnet_id.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['info']).to.have.lengthOf(0);
            expect(result['errors']['warn']).to.have.lengthOf(0);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });
        it('List<AWS::EC2::Volume::Id> should return a list', function () {
            var input = './testData/valid/yaml/parameters_type_list_aws_ec2_volume_id.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['info']).to.have.lengthOf(0);
            expect(result['errors']['warn']).to.have.lengthOf(0);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });
        it('List<AWS::EC2::VPC::Id> should return a list', function () {
            var input = './testData/valid/yaml/parameters_type_list_aws_ec2_vpc_id.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['info']).to.have.lengthOf(0);
            expect(result['errors']['warn']).to.have.lengthOf(0);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });
        it('List<AWS::Route53::HostedZone::Id> should return a list', function () {
            var input = './testData/valid/yaml/parameters_type_list_aws_route53_hostedzone_id.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['info']).to.have.lengthOf(0);
            expect(result['errors']['warn']).to.have.lengthOf(0);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });
    });
    describe('pseudo-parmeters', function () {
        it('defining an override for accountId should result in validTemplate = true, no crit errors, no warnings', function () {
            var input = 'testData/valid/yaml/pseudo-parameters.yaml';
            validator.addPseudoValue("AWS::AccountId", "000000000000");
            validator.addPseudoValue("AWS::Region", "us-east-1");
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
    });
    describe('custom-resource-attributes', function () {
        it('should validate using custom resource attribute values for generic and custom types', function () {
            var input = 'testData/valid/yaml/valid_custom_resource_attributes.yaml';
            validator.addCustomResourceAttributeValue('Custom::Dooby', 'SomeAttribute', 'test');
            validator.addCustomResourceAttributeValue('AWS::CloudFormation::CustomResource', 'SomeAttribute', [1, 2, 3]);
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it('should validate using custom resource attribute values for logical-names', function () {
            var input = 'testData/valid/yaml/valid_custom_resource_attributes.yaml';
            validator.addCustomResourceAttributeValue('Custom', 'SomeAttribute', 'test');
            validator.addCustomResourceAttributeValue('Custom2', 'SomeAttribute', [1, 2, 3]);
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it('should validate using custom resource attribute values for generic-type and logical-name', function () {
            var input = 'testData/valid/yaml/valid_custom_resource_attributes.yaml';
            validator.addCustomResourceAttributeValue('Custom', 'SomeAttribute', 'test');
            validator.addCustomResourceAttributeValue('AWS::CloudFormation::CustomResource', 'SomeAttribute', [1, 2, 3]);
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it('should validate using custom resource attribute values for custom-type and logical-name', function () {
            var input = 'testData/valid/yaml/valid_custom_resource_attributes.yaml';
            validator.addCustomResourceAttributeValue('Custom::Dooby', 'SomeAttribute', 'test');
            validator.addCustomResourceAttributeValue('Custom2', 'SomeAttribute', [1, 2, 3]);
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it('should validate when a logical-name overrides a resource-type custom attribute value', function () {
            var input = 'testData/valid/yaml/valid_custom_resource_attributes.yaml';
            validator.addCustomResourceAttributeValue('Custom::Dooby', 'SomeAttribute', [1, 2, 3]);
            validator.addCustomResourceAttributeValue('AWS::CloudFormation::CustomResource', 'SomeAttribute', [1, 2, 3]);
            validator.addCustomResourceAttributeValue('Custom', 'SomeAttribute', 'test');
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
    });
    describe('output-references', function () {
        it('an output referencing an invalid resource should result in validTemplate = false, 1 crit errors, no warnings', function () {
            var input = 'testData/invalid/yaml/issue-39-output-reference-invalid.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(3);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it('an output referencing an valid resource should result in validTemplate = true, 0 crit errors, no warnings', function () {
            var input = 'testData/valid/yaml/issue-39-output-reference-check.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        describe('a template with an output referencing a resource and a resource attribute', function () {
            var result;
            var input = 'testData/valid/yaml/outputs.yaml';
            result = validator.validateFile(input);
            it('should result in a valid template', function () {
                expect(result).to.have.deep.property('templateValid', true);
            });
            it('should populate errorObject outputs correctly', function () {
                expect(Object.keys(result['outputs'])).to.have.lengthOf(2);
                expect(result['outputs']['Bucket']).to.equal('mock-ref-Bucket');
                expect(result['outputs']['BucketArn']).to.match(/^arn:aws:/);
            });
            it('should populate errorObject exports correctly', function () {
                expect(Object.keys(result['exports'])).to.have.lengthOf(1);
                expect(result['exports']['my-global-bucket-export']).to.match(/^arn:aws:/);
            });
        });
        it('a template with an exported output missing a Name should result in validTemplate = false, 1 crit error', function () {
            var input = 'testData/invalid/yaml/invalid_outputs.yaml';
            var result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]).to.have.property('message', 'Output BucketArn exported with no Name');
            expect(result['errors']['crit'][0]).to.have.property('resource', 'Outputs > BucketArn');
        });
    });
    describe('type checking coverage', function () {
        it('should be able to determine the type of every property of every resource', function () {
            var _loop_1 = function (resourceName) {
                var resource = awsData_1.awsResources.ResourceTypes[resourceName];
                var _loop_2 = function (propertyName) {
                    expect(function () { return validator.getPropertyType({
                        'type': 'PROPERTY',
                        resourceType: resourceName,
                        parentType: resourceName,
                        propertyName: propertyName
                    }); }).not.to.throw();
                };
                for (var propertyName in resource.Properties) {
                    _loop_2(propertyName);
                }
            };
            for (var resourceName in awsData_1.awsResources.ResourceTypes) {
                _loop_1(resourceName);
            }
        });
        it('should be able to determine the type of every property of every propertytype', function () {
            var _loop_3 = function (propertyTypeName) {
                var propertyType = awsData_1.awsResources.PropertyTypes[propertyTypeName];
                var _loop_4 = function (propertyName) {
                    expect(function () { return validator.getPropertyType({
                        'type': 'PROPERTY',
                        resourceType: 'TEST',
                        parentType: propertyTypeName,
                        propertyName: propertyName
                    }); }).not.to.throw();
                };
                for (var propertyName in propertyType.Properties) {
                    _loop_4(propertyName);
                }
            };
            for (var propertyTypeName in awsData_1.awsResources.PropertyTypes) {
                _loop_3(propertyTypeName);
            }
        });
    });
    describe('type checking unit tests', function () {
        function runTests(checkFunction, valid, invalid) {
            var _loop_5 = function (validValue) {
                it(util.inspect(validValue) + " should be valid", function () {
                    expect(checkFunction(validValue)).to.be.true;
                });
            };
            try {
                for (var valid_1 = __values(valid), valid_1_1 = valid_1.next(); !valid_1_1.done; valid_1_1 = valid_1.next()) {
                    var validValue = valid_1_1.value;
                    _loop_5(validValue);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (valid_1_1 && !valid_1_1.done && (_a = valid_1.return)) _a.call(valid_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            ;
            var _loop_6 = function (invalidValue) {
                it(util.inspect(invalidValue) + " should be invalid", function () {
                    expect(checkFunction(invalidValue)).to.be.false;
                });
            };
            try {
                for (var invalid_1 = __values(invalid), invalid_1_1 = invalid_1.next(); !invalid_1_1.done; invalid_1_1 = invalid_1.next()) {
                    var invalidValue = invalid_1_1.value;
                    _loop_6(invalidValue);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (invalid_1_1 && !invalid_1_1.done && (_b = invalid_1.return)) _b.call(invalid_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
            ;
            var e_1, _a, e_2, _b;
        }
        describe('isObject', function () {
            var validObjects = [
                {},
                JSON.parse("{}"),
                yaml.safeLoad("{}")
            ];
            var invalidObjects = [
                'string',
                ['array'],
                42,
            ];
            // not checked: the pathlogical primitive wrapper objects (new Number()) etc. They will
            // return True if checked by isObject when arguably they should be False.
            // However in practice these are never used in this project.
            runTests(validator.isObject, validObjects, invalidObjects);
        });
        describe('isList', function () {
            var validLists = [
                ['a', 'b'],
                JSON.parse("[42]"),
            ];
            var invalidLists = [
                'string',
                42,
                {}
            ];
            runTests(validator.isList, validLists, invalidLists);
        });
        describe('isArn', function () {
            var validArns = [
                'arn:aws:region:something',
                'arn:aws::::'
            ];
            var invalidArns = [
                'notarn:aws:region:something',
                'not even close',
                42,
                {},
                ['arn:aws:region:something']
            ];
            runTests(validator.isArn, validArns, invalidArns);
        });
        describe('isString', function () {
            var validStrings = [
                'string',
                42 // because CloudFormation. e.g. Route53.Recordset.TTL is "String" but accepts an integer.
                //  http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-route53-recordset.html#cfn-route53-recordset-ttl
            ];
            var invalidStrings = [
                ['asd'],
                {},
            ];
            runTests(validator.isString, validStrings, invalidStrings);
        });
        describe('isInteger', function () {
            var validIntegers = [
                123,
                '123',
                '-123',
                '0',
                '-0',
                '00',
            ];
            var invalidIntegers = [
                123.32,
                '123.32',
                '-123.32',
                '123asdf',
                'not even close'
            ];
            runTests(validator.isInteger, validIntegers, invalidIntegers);
        });
        describe('isDouble', function () {
            var validDoubles = [
                123,
                123.123,
                '123.123',
                '0',
                '0.0',
                '-123.0',
                '-123'
            ];
            var invalidDoubles = [
                '123.32asdf',
                'not even close',
                '123.123.123'
            ];
            runTests(validator.isDouble, validDoubles, invalidDoubles);
        });
        describe('isBoolean', function () {
            var validBooleans = [
                true,
                false,
                'TrUe',
                'FaLse',
                'true',
                'false'
            ];
            var invalidBooleans = [
                'true1',
                'y',
                1,
                0,
            ];
            runTests(validator.isBoolean, validBooleans, invalidBooleans);
        });
        describe('isJson', function () {
            var validJson = [
                {},
                { obj: { with: 'values' } },
                // these are accepted for some PrimitiveType: Json (e.g. IAM Policies, EMR::SecurityConfiguration),
                // but rejected for others, e.g. RDS cluster parameters. Yay cfn. Erring on the side of
                // accepting them here.
                JSON.stringify({}),
                JSON.stringify({ obj: { with: 'values' } }),
            ];
            var invalidJson = [
                [],
                'string',
                JSON.stringify([]),
                JSON.stringify('string')
            ];
            runTests(validator.isJson, validJson, invalidJson);
        });
        describe('isTimestamp', function () {
            var validTimestamps = [
                '2012-12-30',
                '2012-12-30T20:10',
                '2012-12-30T20:12Z',
                '2012-12-30T20:12:22',
                '2012-12-30T20:12:22+01:00',
                // valid ISO8601 but invalid Javascript date string (Date.parse -> NaN).
                // Cloudformation does actually accept this format but
                // it will be a huge pain for us to support.
                // '2012-12-30T20:12:22+01',
                '2012-12-30T20:12:22+0100',
                '2012-12-30T20:12:22-05:00',
                '2012-12-30T20:12:22.222',
                '2012-12-30T20:12:22.222Z',
                '2012-12-30T20:12:22.222222'
            ];
            var invalidTimestamps = [
                '2012',
                '2012-12',
                '2012-12-30T',
                '2012-12-30T10',
                '2012-12-30T20:12:22+1',
                '2012-12-30T20:12:22+100',
            ];
            runTests(validator.isTimestamp, validTimestamps, invalidTimestamps);
        });
    });
});
//# sourceMappingURL=validatorTest.js.map