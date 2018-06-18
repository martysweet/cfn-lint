"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai = require("chai");
var expect = chai.expect;
var assert = chai.assert;
var docs = require("../docs");
describe('docs', function () {
    it('resource type', function () {
        var result = docs.getDoc("AWS::Lambda::Function", false);
        expect(result).to.contain("aws-resource-lambda-function.html");
    });
    it('resource type property', function () {
        var result = docs.getDoc("AWS::Lambda::Function.Handler", false);
        expect(result).to.contain("aws-resource-lambda-function.html#cfn-lambda-function-handler");
    });
    it('parameter type', function () {
        var result = docs.getDoc("AWS::Lambda::Function.Code", false);
        expect(result).to.contain("aws-properties-lambda-function-code.html");
        expect(result).to.contain("aws-resource-lambda-function.html#cfn-lambda-function-code");
    });
    it('parameter type property', function () {
        var result = docs.getDoc("AWS::Lambda::Function.Code.S3Bucket", false);
        expect(result).to.contain("aws-properties-lambda-function-code.html#cfn-lambda-function-code-s3bucket");
    });
});
//# sourceMappingURL=docsTest.js.map