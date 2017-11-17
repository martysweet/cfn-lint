import {expect} from 'chai';
import path = require('path');
import api = require('../api');

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
      validator.addParameterValue('CertificateArn', 'arn:aws:something');
      const result = api.validateFile(file);
      expect(result).to.have.property('templateValid', false);
      expect(result.errors.crit).to.have.length(1);
      expect(result.errors.crit[0].message).to.contain('\'string_input_CertificateArn\'');
    })
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