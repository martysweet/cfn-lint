const chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;
const resourceSpec = require('../src/resourcesSpec');

describe('resourceSpec', () =>{

    describe('getType', () => {

        it('should return a resource type', () => {
            let result = resourceSpec.getType("AWS::Lambda::Function");
            expect(result).to.not.equal(null);
        });

        it('should return a property type', () => {
            let result = resourceSpec.getType("AWS::Lambda::Function.Code");
            expect(result).to.not.equal(null);
        });

        it('should return null for invalid type', () => {
            let result = resourceSpec.getType("AWS::Lambda::InvalidFunction");
            expect(result).to.equal(null);
        });

    });

    describe('isValidProperty', () => {

        it('should return True for AWS::Lambda::Function > Code', () => {
            let result = resourceSpec.isValidProperty("AWS::Lambda::Function", "Code");
            expect(result).to.equal(true);
        });

        it('should return False for AWS::Lambda::Function > MyCode', () => {
            let result = resourceSpec.isValidProperty("AWS::Lambda::Function", "MyCode");
            expect(result).to.equal(false);
        });

        it('should return False for AWS::Lambda::InvalidFunction > Code', () => {
            let result = resourceSpec.isValidProperty("AWS::Lambda::InvalidFunction", "Code");
            expect(result).to.equal(false);
        });

    });

    describe('isRequiredProperty', () => {

        it('should return True for AWS::IAM::User.Policy > PolicyName', () => {
            let result = resourceSpec.isRequiredProperty("AWS::IAM::User.Policy", "PolicyName");
            expect(result).to.equal(true);
        });

        it('should return True for AWS::Lambda::Function > Code', () => {
            let result = resourceSpec.isRequiredProperty("AWS::Lambda::Function", "Code");
            expect(result).to.equal(true);
        });

        it('should return False for AWS::Lambda::Function > Description', () => {
            let result = resourceSpec.isRequiredProperty("AWS::Lambda::Function", "Description");
            expect(result).to.equal(false);
        });

        it('should return False for AWS::Lambda::InvalidFunction > Description', () => {
            let result = resourceSpec.isRequiredProperty("AWS::Lambda::InvalidFunction", "Description");
            expect(result).to.equal(false);
        });

    });

    describe('isSinglePrimitivePropertyType', () => {

        it('should return True for AWS::Lambda::Function > Description', () => {
            let result = resourceSpec.isPrimitiveProperty("AWS::Lambda::Function", "Description");
            expect(result).to.equal(true);
        });

        it('should return False for AWS::Lambda::Function > Code', () => {
            let result = resourceSpec.isPrimitiveProperty("AWS::Lambda::Function", "Code");
            expect(result).to.equal(false);
        });

        it('should return False for AWS::Lambda::InvalidFunction > Code', () => {
            let result = resourceSpec.isPrimitiveProperty("AWS::Lambda::InvalidFunction", "Code");
            expect(result).to.equal(false);
        });

    });

    describe('isArnProperty', () => {

        it('should return True for KmsKeyArn', () => {
            let result = resourceSpec.isArnProperty("KmsKeyArn");
            expect(result).to.equal(true);
        });

        // TODO: Check for ARNs
        it('should return True for TopicArn', () => {
            let result = resourceSpec.isArnProperty("TopicArn");
            expect(result).to.equal(true);
        });

        it('should return False for Code', () => {
            let result = resourceSpec.isArnProperty("Code");
            expect(result).to.equal(false);
        });

    });

    describe('getRefOverride', () => {

        it('should return "arn" for AWS::ECS::Service', () => {
            let result = resourceSpec.getRefOverride("AWS::ECS::Service");
            expect(result).to.equal("arn");
        });

        it('should return null for AWS::Lambda::Function', () => {
            let result = resourceSpec.getRefOverride("AWS::Lambda::Function");
            expect(result).to.equal(null);
        });

    });

});
