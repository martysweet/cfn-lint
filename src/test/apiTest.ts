import {expect} from 'chai';
import path = require('path');
import api = require('../api');
const util = require('util');
describe('api', () => {
  describe('validateFile', () => {
    it('should validate a file', () => {
      const file = path.join(__dirname, '../../testData/valid/yaml/1.yaml');
      const result = api.validateFile(file);
      expect(result).to.have.property('templateValid', true);
      expect(result.errors.crit).to.have.length(0);
    });

    it('should pass properties', () => {
      const file = path.join(__dirname, '../../testData/valid/yaml/2.yaml');
      const result = api.validateFile(file, {
        parameters: {
          CertificateArn: 'arn:aws:something'
        }
      });
      expect(result).to.have.property('templateValid', true);
      expect(result.errors.crit).to.have.length(0);
    });

    it('should pass pseudo-parameters', () => {
      const file = path.join(__dirname, '../../testData/valid/yaml/pseudo-parameters.yaml');
      const result = api.validateFile(file, {
        pseudoParameters: {
          'AWS::AccountId': '000000000000',
          'AWS::Region': 'us-east-1'
        }
      });
      expect(result).to.have.property('templateValid', true);
      expect(result.errors.crit).to.have.length(0);
    });

    it('should reset validator state', () => {
      const file = path.join(__dirname, '../../testData/valid/yaml/2.yaml');
      const validator = require('../validator');
      let result;

      // we first pass the validation because of an invalid parameter value
      validator.addParameterValue('CertificateArn', 'invalid_arn_string');
      result = validator.validateFile(file);
      // console.log(util.inspect(result, false, null));
      expect(result).to.have.property('templateValid', false);
      expect(result.errors.crit).to.have.length(1);

      // we try to reset the system
      validator.resetValidator();

      // we try again in hopes the system has forgotten the previously defined parameter value
      result = validator.validateFile(file);
      // console.log(util.inspect(result, false, null));
      expect(result).to.have.property('templateValid', true);
      expect(result.errors.crit).to.have.length(0);
    });
  });

  describe('validateJsonObject', () => {
    it('should validate an object', () => {
      const cfn = require('../../testData/valid/json/1.json');
      const result = api.validateJsonObject(cfn);
      expect(result).to.have.property('templateValid', true);
      expect(result.errors.crit).to.have.length(0);
    });
  });
});
