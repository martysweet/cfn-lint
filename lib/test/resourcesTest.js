"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai = require("chai");
var expect = chai.expect;
var assert = chai.assert;
var resourceSpec = require("../resourcesSpec");
describe('resourceSpec', function () {
    describe('getType', function () {
        it('should return a resource type', function () {
            var result = resourceSpec.getType("AWS::Lambda::Function");
            expect(result).to.not.equal(null);
        });
        it('should return a property type', function () {
            var result = resourceSpec.getType("AWS::Lambda::Function.Code");
            expect(result).to.not.equal(null);
        });
        it('should throw for invalid type', function () {
            expect(function () { return resourceSpec.getType("AWS::Lambda::InvalidFunction"); }).to.throw(resourceSpec.NoSuchResourceType);
        });
    });
    describe('isValidProperty', function () {
        it('should return True for AWS::Lambda::Function > Code', function () {
            var result = resourceSpec.isValidProperty("AWS::Lambda::Function", "Code");
            expect(result).to.equal(true);
        });
        it('should return False for AWS::Lambda::Function > MyCode', function () {
            var result = resourceSpec.isValidProperty("AWS::Lambda::Function", "MyCode");
            expect(result).to.equal(false);
        });
        it('should throw for AWS::Lambda::InvalidFunction > Code', function () {
            expect(function () { return resourceSpec.isValidProperty("AWS::Lambda::InvalidFunction", "Code"); }).to.throw(resourceSpec.NoSuchResourceType);
        });
    });
    describe('isRequiredProperty', function () {
        it('should return True for AWS::IAM::User.Policy > PolicyName', function () {
            var result = resourceSpec.isRequiredProperty("AWS::IAM::User.Policy", "PolicyName");
            expect(result).to.equal(true);
        });
        it('should return True for AWS::Lambda::Function > Code', function () {
            var result = resourceSpec.isRequiredProperty("AWS::Lambda::Function", "Code");
            expect(result).to.equal(true);
        });
        it('should return False for AWS::Lambda::Function > Description', function () {
            var result = resourceSpec.isRequiredProperty("AWS::Lambda::Function", "Description");
            expect(result).to.equal(false);
        });
        it('should throw for AWS::Lambda::InvalidFunction > Description', function () {
            expect(function () { return resourceSpec.isRequiredProperty("AWS::Lambda::InvalidFunction", "Description"); }).to.throw(resourceSpec.NoSuchResourceType);
        });
    });
    describe('isSinglePrimitivePropertyType', function () {
        it('should return True for AWS::Lambda::Function > Description', function () {
            var result = resourceSpec.isPrimitiveProperty("AWS::Lambda::Function", "Description");
            expect(result).to.equal(true);
        });
        it('should return False for AWS::Lambda::Function > Code', function () {
            var result = resourceSpec.isPrimitiveProperty("AWS::Lambda::Function", "Code");
            expect(result).to.equal(false);
        });
        it('should return False for AWS::Lambda::InvalidFunction > Code', function () {
            expect(function () { return resourceSpec.isPrimitiveProperty("AWS::Lambda::InvalidFunction", "Code"); }).to.throw(resourceSpec.NoSuchResourceType);
        });
    });
    describe('isArnProperty', function () {
        it('should return True for KmsKeyArn', function () {
            var result = resourceSpec.isArnProperty("KmsKeyArn");
            expect(result).to.equal(true);
        });
        // TODO: Check for ARNs
        it('should return True for TopicArn', function () {
            var result = resourceSpec.isArnProperty("TopicArn");
            expect(result).to.equal(true);
        });
        it('should return False for Code', function () {
            var result = resourceSpec.isArnProperty("Code");
            expect(result).to.equal(false);
        });
    });
    describe('getRefOverride', function () {
        it('should return "arn" for AWS::ECS::Service', function () {
            var result = resourceSpec.getRefOverride("AWS::ECS::Service");
            expect(result).to.equal("arn");
        });
        it('should return null for AWS::Lambda::Function', function () {
            var result = resourceSpec.getRefOverride("AWS::Lambda::Function");
            expect(result).to.equal(null);
        });
    });
    describe('getResourceTypeAttribute', function () {
        it('should return "String" for AWS::ECS::Service attribute Name', function () {
            var result = resourceSpec.getResourceTypeAttribute("AWS::ECS::Service", "Name");
            var res = result;
            expect(res.PrimitiveType).to.equal("String");
        });
        it('should return "List of String" for AWS::Route53::HostedZone attribute NameServers', function () {
            var result = resourceSpec.getResourceTypeAttribute("AWS::Route53::HostedZone", "NameServers");
            var res = result;
            expect(res.Type).to.equal("List");
            expect(res.PrimitiveItemType).to.equal("String");
        });
        it('should throw NoSuchResourceTypeAttribute for any attrbute on a type with no attributes', function () {
            expect(function () { return resourceSpec.getResourceTypeAttribute("AWS::CloudFormation::WaitConditionHandle", "Anything"); }).to.throw(resourceSpec.NoSuchResourceTypeAttribute);
        });
        it('should throw NoSuchResourceTypeAttribute for an attrbute that does not exist on a type', function () {
            expect(function () { return resourceSpec.getResourceTypeAttribute("AWS::ECS::Service", "AttributeThatDoesNotExist"); }).to.throw(resourceSpec.NoSuchResourceTypeAttribute);
        });
    });
});
//# sourceMappingURL=resourcesTest.js.map