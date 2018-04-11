import chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;
import resourceSpec = require('../resourcesSpec');
import {
    PrimitiveAttribute,
    ListAttribute
} from "../awsData"

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

        it('should throw for invalid type', () => {
            expect(
                () => resourceSpec.getType("AWS::Lambda::InvalidFunction")
            ).to.throw(resourceSpec.NoSuchResourceType);
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

        it('should throw for AWS::Lambda::InvalidFunction > Code', () => {
            expect(
                () => resourceSpec.isValidProperty("AWS::Lambda::InvalidFunction", "Code")
            ).to.throw(resourceSpec.NoSuchResourceType);
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

        it('should throw for AWS::Lambda::InvalidFunction > Description', () => {
            expect(
                () => resourceSpec.isRequiredProperty("AWS::Lambda::InvalidFunction", "Description")
            ).to.throw(resourceSpec.NoSuchResourceType);
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
            expect(
                () => resourceSpec.isPrimitiveProperty("AWS::Lambda::InvalidFunction", "Code")
            ).to.throw(resourceSpec.NoSuchResourceType);
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

    describe('getResourceTypeAttribute', () => {

        it('should return "String" for AWS::ECS::Service attribute Name', () => {
            let result = resourceSpec.getResourceTypeAttribute("AWS::ECS::Service","Name");
            let res = result as PrimitiveAttribute;
            expect(res.PrimitiveType).to.equal("String");
        });

        it('should return "List of String" for AWS::Route53::HostedZone attribute NameServers', () => {
            let result = resourceSpec.getResourceTypeAttribute("AWS::Route53::HostedZone","NameServers");
            let res = result as ListAttribute;
            expect(res.Type).to.equal("List");
            expect(res.PrimitiveItemType).to.equal("String");
        });

        it('should throw NoSuchResourceTypeAttribute for any attrbute on a type with no attributes', () => {
            expect(
                () => resourceSpec.getResourceTypeAttribute("AWS::CloudFormation::WaitConditionHandle", "Anything")
            ).to.throw(resourceSpec.NoSuchResourceTypeAttribute);
        });

        it('should throw NoSuchResourceTypeAttribute for an attrbute that does not exist on a type', () => {
            expect(
                () => resourceSpec.getResourceTypeAttribute("AWS::ECS::Service", "AttributeThatDoesNotExist")
            ).to.throw(resourceSpec.NoSuchResourceTypeAttribute);
        });


    });

});
