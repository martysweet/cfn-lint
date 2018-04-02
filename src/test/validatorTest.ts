import chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;
import validator = require('../validator');
import yaml = require('js-yaml');

import {awsResources} from '../awsData';
import util = require('util');
import { isObject } from 'util';

describe('validator', () => {

    beforeEach(() => {
        validator.resetValidator();
    });


    describe('validateJsonObject', () => {


        it('a valid (1.json) template should return an object with validTemplate = true, no crit errors', () => {
            const input = require('../../testData/valid/json/1.json');
            let result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });

        it('a valid (2.json) template should return an object with validTemplate = true, no crit errors', () => {
            const input = require('../../testData/valid/json/2.json');
            validator.addParameterValue('InstanceType', 't1.micro');
            let result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });

        it('a valid (3.json) template should return an object with validTemplate = true, no crit errors', () => {
            const input = require('../../testData/valid/json/3.json');
            let result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });

        it('a valid (4.json) template should return an object with validTemplate = true, no crit errors', () => {
            const input = require('../../testData/valid/json/4.json');
            validator.addParameterValue('InstanceType', 't1.micro');
            let result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });

        it('2 invalid resource types should return an object with validTemplate = false, 2 crit errors', () => {
            const input = require('../../testData/invalid/json/1_invalid_resource_type.json');
            let result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(2);
        });

        it('1 missing parameter type should return an object with validTemplate = false, 1 crit errors', () => {
            const input = require('../../testData/invalid/json/1_missing_parameter_type.json');
            let result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
        });

        it('1 invalid parameter type should return an object with validTemplate = false, 1 crit errors', () => {
            const input = require('../../testData/invalid/json/1_invalid_parameter_type.json');
            let result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
        });

        it('missing section resources should return an object with validTemplate = false, 1 crit errors', () => {
            const input = require('../../testData/invalid/json/no_resources.json');
            let result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
        });

        it('empty section resources should return an object with validTemplate = false, 1 crit errors', () => {
            const input = require('../../testData/invalid/json/empty_resources.json');
            let result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
        });

        it('1 invalid resource reference should return an object with validTemplate = false, 1 crit errors', () => {
            const input = require('../../testData/invalid/json/1_invalid_resource_reference.json');
            let result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
        });

        it('1 invalid parameter reference should return an object with validTemplate = false, 1 crit errors', () => {
            const input = require('../../testData/invalid/json/1_invalid_parameter_reference.json');
            let result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
        });

        it('2 invalid Fn::Join\'s should return an object with validTemplate = false, 2 crit errors', () => {
            const input = require('../../testData/invalid/json/2_invalid_intrinsic_join.json');
            let result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(2);
        });

        it('1 invalid Fn::GetAtt should return an object with validTemplate = false, 1 crit errors', () => {
            const input = require('../../testData/invalid/json/1_invalid_intrinsic_get_att.json');
            validator.addParameterValue('InstanceType', 't1.micro');
            let result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
        });

        it('1 invalid Fn::FindInMap should return an object with validTemplate = false, 1 crit errors', () => {
            const input = require('../../testData/invalid/json/1_invalid_intrinsic_mappings.json');
            let result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
        });

        it('1 invalid Ref within Parameters should return an object with validTemplate = false, 1 crit errors', () => {
            const input = require('../../testData/invalid/json/1_intrinsic_function_in_parameters.json');
            let result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
        });

        it('1 invalid GetAZs parameter should return an object with validTemplate = false, 1 crit errors', () => {
            const input = require('../../testData/invalid/json/1_invalid_get_azs_parameter.json');
            validator.addParameterValue('InstanceType', 't1.micro');
            let result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
        });

        it('1 reference non AWS::Region GetAZs parameter should return an object with validTemplate = false, 1 warn errors', () => {
            const input = require('../../testData/invalid/json/1_warning_ref_get_azs_parameter.json');
            validator.addParameterValue('InstanceType', 't1.micro');
            let result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['warn']).to.have.lengthOf(1);
        });


    });

    describe('Fn::Select JSON', () => {
        it("should pass validation, with flat list and intrinsic list", () => {
          const input = require('../../testData/valid/json/5_valid_intrinsic_select.json');
          let result = validator.validateJsonObject(input);
          expect(result).to.have.deep.property('templateValid', true);
          expect(result['errors']['crit']).to.have.lengthOf(0);
          expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it("should pass validation with Parameter Collection", () => {
          const input = require('../../testData/valid/json/5_valid_intrinsic_select_2.json');
          let result = validator.validateJsonObject(input);
          expect(result).to.have.deep.property('templateValid', true);
          expect(result['errors']['crit']).to.have.lengthOf(0);
          expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it("should error if index is greater than list size", () => {
          const input = require('../../testData/invalid/json/5_invalid_intrinsic_select_1.json');
          let result = validator.validateJsonObject(input);
          expect(result).to.have.deep.property('templateValid', false);
          expect(result['errors']['crit']).to.have.lengthOf(1);
          expect(result['errors']['crit'][0]['message'].indexOf('First element of Fn::Select exceeds the length of the list.')).to.be.greaterThan(-1); 
          expect(result['errors']['warn']).to.have.lengthOf(0);
        });       
        it("should error if second element is not a list or a function", () => {
          const input = require('../../testData/invalid/json/5_invalid_intrinsic_select_2.json');
          let result = validator.validateJsonObject(input);
          expect(result).to.have.deep.property('templateValid', false);
          expect(result['errors']['crit']).to.have.lengthOf(1);
          expect(result['errors']['crit'][0]['message'].indexOf("Fn::Select requires the second element to resolve to a list")).to.be.greaterThan(-1); 
          expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it("should error if first element is not a number or does not parse to a number", () => {
          const input = require('../../testData/invalid/json/5_invalid_intrinsic_select_3.json');
          let result = validator.validateJsonObject(input);
          expect(result).to.have.deep.property('templateValid', false);
          expect(result['errors']['crit']).to.have.lengthOf(1);
          expect(result['errors']['crit'][0]['message'].indexOf("First element of Fn::Select must be a number, or it must use an intrinsic fuction that returns a number")).to.be.greaterThan(-1); 
          expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it("should error if first element is not defined or is null", () => {
          const input = require('../../testData/invalid/json/5_invalid_intrinsic_select_4.json');
          let result = validator.validateJsonObject(input);
          expect(result).to.have.deep.property('templateValid', false);
          expect(result['errors']['crit']).to.have.lengthOf(1);
          expect(result['errors']['crit'][0]['message'].indexOf("Fn::Select first element cannot be null or undefined")).to.be.greaterThan(-1); 
          expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it("should error if only one element as argument list", () => {
          const input = require('../../testData/invalid/json/5_invalid_intrinsic_select_5.json');
          let result = validator.validateJsonObject(input);
          expect(result).to.have.deep.property('templateValid', false);
          expect(result['errors']['crit']).to.have.lengthOf(1);
          expect(result['errors']['crit'][0]['message'].indexOf("Fn::Select only supports an array of two elements")).to.be.greaterThan(-1); 
          expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it("should error if second element is null or undefined", () => {
          const input = require('../../testData/invalid/json/5_invalid_intrinsic_select_6.json');
          let result = validator.validateJsonObject(input);
          expect(result).to.have.deep.property('templateValid', false);
          expect(result['errors']['crit']).to.have.lengthOf(1);
          expect(result['errors']['crit'][0]['message'].indexOf("Fn::Select Second element cannot be null or undefined")).to.be.greaterThan(-1); 
          expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it("should error if second element does not resolve to a list", () => {
          const input = require('../../testData/invalid/json/5_invalid_intrinsic_select_7.json');
          let result = validator.validateJsonObject(input);
          expect(result).to.have.deep.property('templateValid', false);
          expect(result['errors']['crit']).to.have.lengthOf(1);
          expect(result['errors']['crit'][0]['message'].indexOf("Fn::Select requires the second element to be a list, function call did not resolve to a list.")).to.be.greaterThan(-1); 
          expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it("should error if first element does not resolve to a number", () => {
          const input = require('../../testData/invalid/json/5_invalid_intrinsic_select_8.json');
          let result = validator.validateJsonObject(input);
          expect(result).to.have.deep.property('templateValid', false);
          expect(result['errors']['crit']).to.have.lengthOf(1);
          expect(result['errors']['crit'][0]['message'].indexOf("Fn::Select's first argument did not resolve to a string for parsing or a numeric value.")).to.be.greaterThan(-1); 
          expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it("should error if first element attempts an invalid intrinsic function", () => {
          const input = require('../../testData/invalid/json/5_invalid_intrinsic_select_9.json');
          let result = validator.validateJsonObject(input);
          expect(result).to.have.deep.property('templateValid', false);
          expect(result['errors']['crit'][0]['message'].indexOf("Fn::Select does not support the Fn::Select function in argument 1")).to.be.greaterThan(-1); 
          expect(result['errors']['crit']).to.have.lengthOf(1);
          expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it("should error if first element is anything other than non-array object, number or string", () => {
          const input = require('../../testData/invalid/json/5_invalid_intrinsic_select_10.json');
          let result = validator.validateJsonObject(input);
          expect(result).to.have.deep.property('templateValid', false);
          expect(result['errors']['crit'][0]['message'].indexOf("Fn:Select's first argument must be a number or resolve to a number")).to.be.greaterThan(-1); 
          expect(result['errors']['crit']).to.have.lengthOf(1);
          expect(result['errors']['warn']).to.have.lengthOf(0);
        });
      
        it("should error if second element attempts an invalid intrinsic function", () => {
          const input = require('../../testData/invalid/json/5_invalid_intrinsic_select_11.json');
          let result = validator.validateJsonObject(input);
          expect(result).to.have.deep.property('templateValid', false);
          expect(result['errors']['crit'][0]['message'].indexOf("n::Select does not support the Fn::Select function in argument 2")).to.be.greaterThan(-1); 
          expect(result['errors']['crit']).to.have.lengthOf(1);
          expect(result['errors']['warn']).to.have.lengthOf(0);
        });
        it("should error if second element contains a list with null values", () => {
          const input = require('../../testData/invalid/json/5_invalid_intrinsic_select_12.json');
          let result = validator.validateJsonObject(input);
          expect(result['errors']['crit'][0]['message'].indexOf("Fn::Select requires that the list be free of null values")).to.be.greaterThan(-1); 
          expect(result).to.have.deep.property('templateValid', false);
          expect(result['errors']['crit']).to.have.lengthOf(1);
          expect(result['errors']['warn']).to.have.lengthOf(0);
        });
       
    });

    describe('Fn::Select YAML', () => {
      it('should validate in yaml with literal and intrinic elements in array', () => {
        const input = './testData/valid/yaml/5_valid_intrinsic_select.yaml';
        let result = validator.validateFile(input);
        expect(result).to.have.deep.property('templateValid', true);
        expect(result['errors']['crit']).to.have.lengthOf(0);
        expect(result['errors']['warn']).to.have.lengthOf(0);
      });
    
       it('should validate in yaml with Comma Separated List Param', () => {
        const input = './testData/valid/yaml/5_valid_intrinsic_select_2.yaml';
        let result = validator.validateFile(input);
        expect(result).to.have.deep.property('templateValid', true);
        expect(result['errors']['crit']).to.have.lengthOf(0);
        expect(result['errors']['warn']).to.have.lengthOf(0);
       });  


      it("should error if index is greater than list size", () => {
        const input = './testData/invalid/yaml/5_invalid_intrinsic_select_1.yaml';
        let result = validator.validateFile(input);
        expect(result).to.have.deep.property('templateValid', false);
        expect(result['errors']['crit']).to.have.lengthOf(1);
        expect(result['errors']['crit'][0]['message'].indexOf('First element of Fn::Select exceeds the length of the list.')).to.be.greaterThan(-1); 
        expect(result['errors']['warn']).to.have.lengthOf(0);
      });       
      it("should error if second element is not a list or a function", () => {
        const input = './testData/invalid/yaml/5_invalid_intrinsic_select_2.yaml';
        let result = validator.validateFile(input);
        expect(result).to.have.deep.property('templateValid', false);
        expect(result['errors']['crit']).to.have.lengthOf(1);
        expect(result['errors']['crit'][0]['message'].indexOf("Fn::Select requires the second element to resolve to a list")).to.be.greaterThan(-1);
        expect(result['errors']['warn']).to.have.lengthOf(0);
      });
      it("should error if first element is not a number or does not parse to a number", () => {
        const input = './testData/invalid/yaml/5_invalid_intrinsic_select_3.yaml';
        let result = validator.validateFile(input);
        expect(result).to.have.deep.property('templateValid', false);
        expect(result['errors']['crit']).to.have.lengthOf(1);
        expect(result['errors']['crit'][0]['message'].indexOf("First element of Fn::Select must be a number, or it must use an intrinsic fuction that returns a number")).to.be.greaterThan(-1); 
        expect(result['errors']['warn']).to.have.lengthOf(0);
      });
      it("should error if first element is not defined or is null", () => {
        const input = './testData/invalid/yaml/5_invalid_intrinsic_select_4.yaml';
        let result = validator.validateFile(input);
        expect(result).to.have.deep.property('templateValid', false);
        expect(result['errors']['crit']).to.have.lengthOf(1);
        expect(result['errors']['crit'][0]['message'].indexOf("Fn::Select first element cannot be null or undefined")).to.be.greaterThan(-1); 
        expect(result['errors']['warn']).to.have.lengthOf(0);
      });
      it("should error if only one element as argument list", () => {
        const input = './testData/invalid/yaml/5_invalid_intrinsic_select_5.yaml';
        let result = validator.validateFile(input);
        expect(result).to.have.deep.property('templateValid', false);
        expect(result['errors']['crit']).to.have.lengthOf(1);
        expect(result['errors']['crit'][0]['message'].indexOf("Fn::Select only supports an array of two elements")).to.be.greaterThan(-1); 
        expect(result['errors']['warn']).to.have.lengthOf(0);
      });
      it("should error if second element is null or undefined", () => {
        const input = './testData/invalid/yaml/5_invalid_intrinsic_select_6.yaml';
        let result = validator.validateFile(input);
        expect(result).to.have.deep.property('templateValid', false);
        expect(result['errors']['crit']).to.have.lengthOf(1);
        expect(result['errors']['crit'][0]['message'].indexOf("Fn::Select Second element cannot be null or undefined")).to.be.greaterThan(-1); 
        expect(result['errors']['warn']).to.have.lengthOf(0);
      });
      it("should error if second element does not resolve to a list", () => {
        const input = './testData/invalid/yaml/5_invalid_intrinsic_select_7.yaml';
        let result = validator.validateFile(input);
        expect(result).to.have.deep.property('templateValid', false);
        expect(result['errors']['crit']).to.have.lengthOf(1);
        expect(result['errors']['crit'][0]['message'].indexOf("Fn::Select requires the second element to be a list, function call did not resolve to a list.")).to.be.greaterThan(-1); 
        expect(result['errors']['warn']).to.have.lengthOf(0);
      });
      it("should error if first element does not resolve to a number", () => {
        const input = './testData/invalid/yaml/5_invalid_intrinsic_select_8.yaml';
        let result = validator.validateFile(input);
        expect(result).to.have.deep.property('templateValid', false);
        expect(result['errors']['crit']).to.have.lengthOf(1);
        expect(result['errors']['crit'][0]['message'].indexOf("Fn::Select's first argument did not resolve to a string for parsing or a numeric value.")).to.be.greaterThan(-1); 
        expect(result['errors']['warn']).to.have.lengthOf(0);
      });
      it("should error if first element attempts an invalid intrinsic function", () => {
        const input = './testData/invalid/yaml/5_invalid_intrinsic_select_9.yaml';
        let result = validator.validateFile(input);
        expect(result).to.have.deep.property('templateValid', false);
        expect(result['errors']['crit']).to.have.lengthOf(1);
        expect(result['errors']['crit'][0]['message'].indexOf("Fn::Select does not support the Fn::Select function in argument 1")).to.be.greaterThan(-1); 
        expect(result['errors']['warn']).to.have.lengthOf(0);
      });
      it("should error if first element is anything other than non-array object, number or string", () => {
        const input = './testData/invalid/yaml/5_invalid_intrinsic_select_10.yaml';
        let result = validator.validateFile(input);
        expect(result).to.have.deep.property('templateValid', false);
        expect(result['errors']['crit']).to.have.lengthOf(1);
        expect(result['errors']['crit'][0]['message'].indexOf("Fn:Select's first argument must be a number or resolve to a number")).to.be.greaterThan(-1); 
        expect(result['errors']['warn']).to.have.lengthOf(0);
      });
    
      it("should error if second element attempts an invalid intrinsic function", () => {
        const input = './testData/invalid/yaml/5_invalid_intrinsic_select_11.yaml';
        let result = validator.validateFile(input);
        expect(result).to.have.deep.property('templateValid', false);
        expect(result['errors']['crit']).to.have.lengthOf(1);
        expect(result['errors']['crit'][0]['message'].indexOf("n::Select does not support the Fn::Select function in argument 2")).to.be.greaterThan(-1); 
        expect(result['errors']['warn']).to.have.lengthOf(0);
      });
      it("should error if second element contains a list with null values", () => {
        const input = './testData/invalid/yaml/5_invalid_intrinsic_select_12.yaml';
        let result = validator.validateFile(input);
        expect(result).to.have.deep.property('templateValid', false);
        expect(result['errors']['crit']).to.have.lengthOf(1);
        expect(result['errors']['crit'][0]['message'].indexOf("Fn::Select requires that the list be free of null values")).to.be.greaterThan(-1); 
        expect(result['errors']['warn']).to.have.lengthOf(0);
      });



    });

    describe('Fn::Sub', () => {

        it('3 valid Fn::Sub should return an object with validTemplate = true, 0 crit errors', () => {
            const input = './testData/valid/yaml/valid_sub_operations.yaml';
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });

        it('a sub referencing an invalid resource should result in validTemplate = false, 1 crit errors, no warnings', () => {
            const input = 'testData/invalid/yaml/invalid_sub_reference.yaml';
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });

        it('a sub getatt an invalid resource should result in validTemplate = false, 1 crit errors, no warnings', () => {
            const input = 'testData/invalid/yaml/invalid_sub_getatt.yaml';
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });

    });

    describe('Fn::ImportValue', () => {

        it('1 invalid Fn::ImportValue should return an object with validTemplate = false, 1 crit errors', () => {
            const input = './testData/invalid/yaml/invalid_import_value_intrinsic_function.yaml';
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message']).to.contain('Fn::ImportValue does not support function');
        });

        it('1 invalid Fn::ImportValue should return an object with validTemplate = false, 1 crit errors', () => {
            const input = './testData/invalid/yaml/invalid_import_value_type.yaml';
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message']).to.contain('Expecting an integer');
        });

        it('a valid Fn::ImportValue should return an object with validTemplate = true, 0 crit errors', () => {
            const input = './testData/valid/yaml/valid_import_value.yaml';
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });

    });

    describe('Fn::GetAtt', () => {
        it('Fn::GetAtt for an arbitrary attribute on a custom resource should return a mock result', () => {
            const input = 'testData/valid/yaml/valid_getatt_custom_resource.yaml';
            let result = validator.validateFile(input);
            expect(result).to.have.property('templateValid', true);
            expect(validator.fnGetAtt('Custom', 'SomeAttribute')).to.equal('mockAttr_Custom_SomeAttribute');
            expect(validator.fnGetAtt('Custom2', 'SomeAttribute')).to.equal('mockAttr_Custom2_SomeAttribute');
        })
    })

    describe('conditions', () => {

        it('1 invalid if condition arguments should return an object with validTemplate = false, 1 crit errors', () => {
            const input = './testData/invalid/yaml/invalid_if_statement_arguments.yaml';
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message']).to.contain('Fn::If must have 3 arguments');
        });

        it('1 invalid if condition should return an object with validTemplate = false, 1 crit errors', () => {
            const input = './testData/invalid/yaml/invalid_if_statement_condition.yaml';
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message']).to.contain('Condition \'UseProdConditionnnnn\' must reference a valid condition');
        });

        it('1 invalid condition value should return an object with validTemplate = false, 1 crit errors', () => {
            const input = './testData/invalid/yaml/invalid_condition_value.yaml';
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message']).to.contain('Condition does not allow function \'Ref\' here');
        });

        it('1 invalid condition value type should return an object with validTemplate = false, 1 crit errors', () => {
            const input = './testData/invalid/yaml/invalid_condition_value_type.yaml';
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message']).to.contain('Condition should consist of an intrinsic function of type');
        });

    });

    describe('templateVersion', () => {

        it('1 invalid template version should return an object with validTemplate = false, 1 crit errors', () => {
            const input = './testData/invalid/yaml/invalid_template_format_version.yaml';
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message']).to.contain('AWSTemplateFormatVersion should be');
        });

        // Check for optional template version
        it('1 missing template version should return an object with validTemplate = true, 0 crit errors', () => {
            const input = './testData/valid/yaml/valid_missing_template_format_version.yaml';
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });

        it('1 unquouted template format version should return an object with validTemplate = true, no crit errors, 1 warn error', () => {
            const input = 'testData/valid/yaml/valid_unquoted_template_version.yaml';
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
            expect(result['errors']['warn']).to.have.lengthOf(1);
            expect(result['errors']['warn'][0]['message']).to.contain('AWSTemplateFormatVersion is recommended to be of type string');
        });
    });

    describe('propertyValidation', () => {

        it('1 invalid arn property should return an object with validTemplate = false, 1 crit errors', () => {
            const input = './testData/invalid/yaml/invalid_arn.yaml';
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message']).to.contain('Expecting an ARN');
        });

        it('1 invalid property name of ResourceType should return an object with validTemplate = false, 1 crit errors', () => {
            const input = './testData/invalid/yaml/invalid_resourcetype_property_name.yaml';
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message']).to.contain('is not a valid property of');
            expect(result['errors']['crit'][0]['resource']).to.contain('Resources > Rule');
        });

        it('1 invalid property name of PropertyType should return an object with validTemplate = false, 1 crit errors', () => {
            const input = './testData/invalid/yaml/invalid_propertytype_property_name.yaml';
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message']).to.contain('S3Buckettttt is not a valid property of AWS::Lambda::Function.Code');
        });

        it('1 invalid property name of Tag list should return an object with validTemplate = false, 1 crit errors', () => {
            const input = './testData/invalid/yaml/invalid_ec2_tags_property_name.yaml';
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message']).to.contain('Keyyyyy is not a valid property of');
        });

        it('1 string property should return an object with validTemplate = false, 1 crit errors', () => {
            const input = './testData/invalid/yaml/invalid_property_type_string.yaml';
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(2);
            expect(result['errors']['crit'][0]['message']).to.contain('Expecting a string');
            expect(result['errors']['crit'][1]['message']).to.contain('Expecting a string');
        });

        it('1 missing propertyType property should return an object with validTemplate = false, 1 crit errors', () => {
            const input = './testData/invalid/yaml/invalid_required_propertytype_prop_missing.yaml';
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message']).to.contain('Required property Key missing for type Tag');
        });

        it('1 missing resourceType  property should return an object with validTemplate = false, 1 crit errors', () => {
            const input = './testData/invalid/yaml/invalid_required_resourcetype_prop_missing.yaml';
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message']).to.contain('Required property Runtime missing for type AWS::Lambda::Function');
        });

        it('1 missing (via AWS::NoValue) property should return an object with validTemplate = false, 1 crit errors', () => {
            const input = './testData/invalid/yaml/invalid_required_resourcetype_prop_no_value.yaml';
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message']).to.contain('Required property Runtime missing for type AWS::Lambda::Function');
        });

        it('1 invalid boolean property should return an object with validTemplate = false, 1 crit errors', () => {
            const input = './testData/invalid/yaml/invalid_boolean_type.yaml';
            validator.addParameterValue('CertificateArn', 'arn:aws:region:something');
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message']).to.contain('Expecting a Boolean, got \'trueeeee\'');
            expect(result['errors']['crit'][0]['resource']).to.contain('Resources > CloudFrontDistribution > Properties > DistributionConfig > DefaultCacheBehavior > Compress');
        });

        it('4 invalid nested properties should return an object with validTemplate = false, 4 crit errors', () => {
            const input = './testData/invalid/yaml/invalid_missing_nested_property.yaml';
            let result = validator.validateFile(input);
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

        it('a valid template with a Map property should return an object with validTemplate = true, no crit errors', () => {
            const input = 'testData/valid/yaml/maps.yaml';
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });

        it('an invalid template with a Map property should return an object with validTemplate = false, 1 crit error', () => {
            const input = 'testData/invalid/yaml/invalid_maps.yaml';
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]['message']).to.contain('Expecting a string, got { not: \'a string\' }');
            expect(result['errors']['crit'][0]['resource']).to.contain('Resources > 0-ParameterGroupWithAMap > Properties > Parameters > key');
        });

        it('a valid (valid_timestamp.yaml) template with a Timestamp should return an objcet with validTemplate = true', () => {
            const input = 'testData/valid/yaml/valid_timestamp.yaml';
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        })

        it('a (invalid_timestamp.yaml) template with an invalid Timestamp should return an objcet with validTemplate = false, 2 crit errors', () => {
            const input = 'testData/invalid/yaml/invalid_timestamp.yaml';
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(3);
            expect(result['errors']['crit'][0]).to.have.property('message', 'Expecting an ISO8601-formatted string, got \'some random string\'');
            expect(result['errors']['crit'][1]).to.have.property('message', 'Expecting an ISO8601-formatted string, got \'2017-08-08 00:08\'');
            expect(result['errors']['crit'][2]).to.have.property('message', 'Expecting an ISO8601-formatted string, got 1502150400');
        })

        it('a valid template with APIG string results in validTemplate = true, 0 crit error', () => {
            const input = 'testData/valid/yaml/issue-81-api-gateway.yaml';
            let result = validator.validateFile(input);
            console.log(result['errors']['crit']);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });

    });

    describe('validateYamlFile', ()=> {

        it('a valid (1.yaml) template should return an object with validTemplate = true, no crit errors', () => {
            const input = 'testData/valid/yaml/1.yaml';
            validator.addParameterValue('InstanceType', 't1.micro');
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });

        it('a valid (2.yaml) template should return an object with validTemplate = true, no crit errors', () => {
            const input = 'testData/valid/yaml/2.yaml';
            validator.addParameterValue('CertificateArn', 'arn:aws:region:something');
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
            expect(result['errors']['warn']).to.have.lengthOf(0);
            expect(result['errors']['info']).to.have.lengthOf(0);
        });

        it('a valid (valid_minus_one_as_string.yaml) template should return an object with validTemplate = true, no crit errors', () => {
            const input = 'testData/valid/yaml/valid_minus_one_as_string.yaml';
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });
    });

    describe('issues', () => {
        it('a valid ASG template with Tags property should return an object with validTemplate = true, no crit errors', () => {
            const input = 'testData/valid/yaml/issue-24.yaml';
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });

        it('both methods of defining a custom resource should result in validTemplate = true, no crit errors', () => {
            const input = 'testData/valid/yaml/issue-28-custom-resource.yaml';
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });

        it('numeric properties should result in validTemplate = true, no crit errors, no warn errors', () => {
            const input = 'testData/valid/yaml/issue-27-numeric-properties.yaml';
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });

        it('IAM with ManagedPolicyName should result in validTemplate=true, no crit errors, no warn errors', () => {
            const input = 'testData/valid/yaml/issue-42-managed-policy-name.yaml';
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });

        it('Reference to RDS attribute validTemplate=true, no crit errors, no warn errors', () => {
            const input = 'testData/valid/yaml/issue-44-database-endpoint.yaml';
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });

        it('if condition not working as expected, no crit errors, no warn errors', () => {
            const input = 'testData/valid/yaml/issue-61.yaml';
            validator.addParameterValue('Env', 'Production');
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });

        it('if condition not working as expected, 2 crit errors, no warn errors', () => {
            const input = 'testData/valid/yaml/issue-61.yaml';
            validator.addParameterValue('Env', 'Dev');
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(2);
            expect(result['errors']['crit'][0]).to.have.property('message', 'Required property FunctionName missing for type AWS::Lambda::Version');
            expect(result['errors']['crit'][1]).to.have.property('message', 'Required property FunctionName missing for type AWS::Lambda::Version');
        });

        it('a list of an extended parameter type should be properly mocked without causing an exception', () => {
            const input = 'testData/valid/yaml/issue-94-list-security-group.yaml';
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });

        it('a null property value should not cause an exception', () => {
            const input = 'testData/invalid/yaml/null_value.yaml';
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]).to.have.property('message', 'Expecting a list, got null');
        });
    });

    describe('parameters-validation', () => {
        it('an unallowed parameter value provided at runtime gets rejected', () => {
            const input = 'testData/valid/yaml/parameters-allowed-values.yaml';
            validator.addParameterValue('Env', 'InvalidValue');
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
        });

        it('an allowed parameter value provided at runtime gets allowed', () => {
            const input = 'testData/valid/yaml/parameters-allowed-values.yaml';
            validator.addParameterValue('Env', 'Dev');
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });

        it('an empty parameter value provided at runtime picks up the empty default (which will throw an error)', () => {
            const input = 'testData/valid/yaml/parameters-allowed-values.yaml';
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]).to.has.property('message', 'Parameter value \'\' for Env is not within the parameters AllowedValues');
        });

        it('missing parameters should cause an error when guessParameters is set', () => {
            const input = 'testData/valid/yaml/parameters.yaml';
            let result = validator.validateFile(input, {guessParameters: []});
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]).to.has.property('message', 'Value for parameter was not provided');
        });

        it('parameters in guessParameters should be permitted to be guessed', () => {
            const input = 'testData/valid/yaml/parameters.yaml';
            let result = validator.validateFile(input, {guessParameters: ['Env']});
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
            expect(result['errors']['info']).to.have.lengthOf(0);
        })
    });

    describe('pseudo-parmeters', () => {
        it('defining an override for accountId should result in validTemplate = true, no crit errors, no warnings', () => {
            const input = 'testData/valid/yaml/pseudo-parameters.yaml';
            validator.addPseudoValue("AWS::AccountId", "000000000000");
            validator.addPseudoValue("AWS::Region", "us-east-1");
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });
    });

    describe('output-references', () => {

        it('an output referencing an invalid resource should result in validTemplate = false, 1 crit errors, no warnings', () => {
            const input = 'testData/invalid/yaml/issue-39-output-reference-invalid.yaml';
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(3);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });

        it('an output referencing an valid resource should result in validTemplate = true, 0 crit errors, no warnings', () => {
            const input = 'testData/valid/yaml/issue-39-output-reference-check.yaml';
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
            expect(result['errors']['warn']).to.have.lengthOf(0);
        });

        describe('a template with an output referencing a resource and a resource attribute', () => {
            let result: any;
            const input = 'testData/valid/yaml/outputs.yaml';
            result = validator.validateFile(input);

            it('should result in a valid template', () => {
                expect(result).to.have.deep.property('templateValid', true);
            });

            it('should populate errorObject outputs correctly', () => {
                expect(Object.keys(result['outputs'])).to.have.lengthOf(2);
                expect(result['outputs']['Bucket']).to.equal('mock-ref-Bucket');
                expect(result['outputs']['BucketArn']).to.match(/^arn:aws:/);
            });

            it('should populate errorObject exports correctly', () => {
                expect(Object.keys(result['exports'])).to.have.lengthOf(1);
                expect(result['exports']['my-global-bucket-export']).to.match(/^arn:aws:/);
            });
        });

        it('a template with an exported output missing a Name should result in validTemplate = false, 1 crit error', () => {
            const input = 'testData/invalid/yaml/invalid_outputs.yaml';
            let result = validator.validateFile(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(1);
            expect(result['errors']['crit'][0]).to.have.property('message', 'Output BucketArn exported with no Name');
            expect(result['errors']['crit'][0]).to.have.property('resource', 'Outputs > BucketArn');
        })

    });

    describe('type checking coverage', () => {
        it('should be able to determine the type of every property of every resource', () => {
            for (let resourceName in awsResources.ResourceTypes) {
                const resource = awsResources.ResourceTypes[resourceName]!;
                for (let propertyName in resource.Properties) {
                    expect(() => validator.getPropertyType({
                        'type': 'PROPERTY',
                        resourceType: resourceName,
                        parentType: resourceName,
                        propertyName: propertyName
                    })).not.to.throw();
                }
            }
        });

        it('should be able to determine the type of every property of every propertytype', () => {
            for (let propertyTypeName in awsResources.PropertyTypes) {
                const propertyType = awsResources.PropertyTypes[propertyTypeName]!;
                for (let propertyName in propertyType.Properties) {
                    expect(() => validator.getPropertyType({
                        'type': 'PROPERTY',
                        resourceType: 'TEST',
                        parentType: propertyTypeName,
                        propertyName: propertyName
                    })).not.to.throw();
                }
            }
        })
    });

    describe('type checking unit tests', () => {

        function runTests(checkFunction: (f: any) => boolean, valid: any[], invalid: any[]) {

            for (let validValue of valid) {
                it(`${util.inspect(validValue)} should be valid`, () => {
                    expect(checkFunction(validValue)).to.be.true;
                });
            };

            for (let invalidValue of invalid) {
                it(`${util.inspect(invalidValue)} should be invalid`, () => {
                    expect(checkFunction(invalidValue)).to.be.false;
                });
            };
        }

        describe('isObject', () => {
            const validObjects = [
                {},
                JSON.parse("{}"),
                yaml.safeLoad("{}")
            ];

            const invalidObjects = [
                'string',
                ['array'],
                42,
            ];

            // not checked: the pathlogical primitive wrapper objects (new Number()) etc. They will
            // return True if checked by isObject when arguably they should be False.
            // However in practice these are never used in this project.

            runTests(validator.isObject, validObjects, invalidObjects);

        });


        describe('isList', () => {
            const validLists = [
                ['a', 'b'],
                JSON.parse("[42]"),
            ];

            const invalidLists = [
                'string',
                42,
                {}
            ];

            runTests(validator.isList, validLists, invalidLists);
        });

        describe('isArn', () => {
            const validArns = [
                'arn:aws:region:something',
                'arn:aws::::'
            ];

            const invalidArns = [
                'notarn:aws:region:something',
                'not even close',
                42,
                {},
                ['arn:aws:region:something']
            ];

            runTests(validator.isArn, validArns, invalidArns);
        });

        describe('isString', () => {
            const validStrings = [
                'string',
                42 // because CloudFormation. e.g. Route53.Recordset.TTL is "String" but accepts an integer.
                   //  http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-route53-recordset.html#cfn-route53-recordset-ttl
            ];
            const invalidStrings = [
                ['asd'],
                {},
            ];

            runTests(validator.isString, validStrings, invalidStrings);
        });

        describe('isInteger', () => {
            const validIntegers = [
                123,
                '123',
                '-123',
                '0',
                '-0',
                '00',
            ];

            const invalidIntegers = [
                123.32,
                '123.32',
                '-123.32',
                '123asdf',
                'not even close'
            ];

            runTests(validator.isInteger, validIntegers, invalidIntegers);

        });

        describe('isDouble', () => {
            const validDoubles = [
                123,
                123.123,
                '123.123',
                '0',
                '0.0',
                '-123.0',
                '-123'
            ];

            const invalidDoubles = [
                '123.32asdf',
                'not even close',
                '123.123.123'
            ]

            runTests(validator.isDouble, validDoubles, invalidDoubles);

        });

        describe('isBoolean', () => {
            const validBooleans = [
                true,
                false,
                'TrUe',
                'FaLse',
                'true',
                'false'
            ];

            const invalidBooleans = [
                'true1',
                'y',
                1,
                0,
            ]

            runTests(validator.isBoolean, validBooleans, invalidBooleans);
        });

        describe('isJson', () => {
            const validJson = [
                {},
                {obj: {with: 'values'}},
                // these are accepted for some PrimitiveType: Json (e.g. IAM Policies, EMR::SecurityConfiguration),
                // but rejected for others, e.g. RDS cluster parameters. Yay cfn. Erring on the side of
                // accepting them here.
                JSON.stringify({}),
                JSON.stringify({obj: {with: 'values'}}),
            ]

            const invalidJson = [
                [],
                'string',
                JSON.stringify([]),
                JSON.stringify('string')
            ];

            runTests(validator.isJson, validJson, invalidJson);


        })

        describe('isTimestamp', () => {
            const validTimestamps = [
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


            const invalidTimestamps = [
                '2012',
                '2012-12',
                '2012-12-30T',
                '2012-12-30T10',
                '2012-12-30T20:12:22+1',
                '2012-12-30T20:12:22+100',
            ];

            runTests(validator.isTimestamp, validTimestamps, invalidTimestamps);
            
        })
    });
});
