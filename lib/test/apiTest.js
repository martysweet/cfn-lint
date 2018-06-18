"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var path = require("path");
var api = require("../api");
describe('api', function () {
    describe('validateFile', function () {
        it('should validate a file', function () {
            var file = path.join(__dirname, '../../testData/valid/yaml/1.yaml');
            var result = api.validateFile(file);
            chai_1.expect(result).to.have.property('templateValid', true);
            chai_1.expect(result.errors.crit).to.have.length(0);
        });
        it('should pass properties', function () {
            var file = path.join(__dirname, '../../testData/valid/yaml/2.yaml');
            var result = api.validateFile(file, {
                parameters: {
                    CertificateArn: 'arn:aws:something'
                }
            });
            chai_1.expect(result).to.have.property('templateValid', true);
            chai_1.expect(result.errors.crit).to.have.length(0);
        });
        it('should pass pseudo-parameters', function () {
            var file = path.join(__dirname, '../../testData/valid/yaml/pseudo-parameters.yaml');
            var result = api.validateFile(file, {
                pseudoParameters: {
                    'AWS::AccountId': '000000000000',
                    'AWS::Region': 'us-east-1'
                }
            });
            chai_1.expect(result).to.have.property('templateValid', true);
            chai_1.expect(result.errors.crit).to.have.length(0);
        });
        it('should reset validator state', function () {
            var file = path.join(__dirname, '../../testData/valid/yaml/2.yaml');
            var validator = require('../validator');
            validator.addParameterValue('CertificateArn', 'arn:aws:something');
            var result = api.validateFile(file);
            chai_1.expect(result).to.have.property('templateValid', false);
            chai_1.expect(result.errors.crit).to.have.length(1);
            chai_1.expect(result.errors.crit[0].message).to.contain('\'string_input_CertificateArn\'');
        });
    });
    describe('validateJsonObject', function () {
        it('should validate an object', function () {
            var cfn = require('../../testData/valid/json/1.json');
            var result = api.validateJsonObject(cfn);
            chai_1.expect(result).to.have.property('templateValid', true);
            chai_1.expect(result.errors.crit).to.have.length(0);
        });
    });
});
//# sourceMappingURL=apiTest.js.map