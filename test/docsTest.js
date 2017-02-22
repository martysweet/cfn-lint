const chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;
const docs = require('../src/docs');

describe('docs', () =>{



    it('resource type', () => {
        let result = docs.getDoc("AWS::Lambda::Function", false);
        expect(result).to.contain("aws-resource-lambda-function.html");
    });

    it('resource type property', () => {
        let result = docs.getDoc("AWS::Lambda::Function.Handler", false);
        expect(result).to.contain("aws-resource-lambda-function.html#cfn-lambda-function-handler");
    });

    it('parameter type', () => {
        let result = docs.getDoc("AWS::Lambda::Function.Code", false);
        expect(result).to.contain("aws-properties-lambda-function-code.html");
        expect(result).to.contain("aws-resource-lambda-function.html#cfn-lambda-function-code");
    });

    it('parameter type property', () => {
        let result = docs.getDoc("AWS::Lambda::Function.Code.S3Bucket", false);
        expect(result).to.contain("aws-properties-lambda-function-code.html#cfn-lambda-function-code-s3bucket");
    });




});
