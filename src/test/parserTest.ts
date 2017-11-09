import chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;
import parser = require('../parser');

describe('parser', () =>{

    describe('openFile', () => {

        it('valid yaml should return valid javascript object', () => {
            let result = parser.openFile("./testData/valid/yaml/1.yaml");
            expect(result).to.not.equal(undefined);
            expect(result).to.not.equal(null);
            expect(result['Outputs']['PublicIP']['Value']).to.have.any.keys('Fn::GetAtt');
            expect(result['Resources']['WebServer']['Properties']['ImageId']['Fn::FindInMap']).to.not.equal(null);
            expect(result['Resources']['WebServer']['Properties']['ImageId']['Fn::FindInMap'][1]['Ref']).to.equal("AWS::Region");
        });

        it('valid yaml with shorthand should return valid javascript object', () => {
            let result = parser.openFile("./testData/valid/yaml/valid_shorthand_sub.yaml");
            expect(result).to.not.equal(undefined);
            expect(result).to.not.equal(null);
        });

        it('invalid yaml should throw an Error', () => {
            let fn = function(){ parser.openFile("./testData/invalid/yaml/invalid_yaml.yaml"); };
            expect(fn).to.throw(/Could not determine file type. Check your template is not malformed./);
        });

        it('invalid json should throw an Error', () => {
            let fn = function(){ parser.openFile("./testData/invalid/json/invalid_json.json"); };
            expect(fn).to.throw(/Could not determine file type. Check your template is not malformed./);
        });

        it('invalid file path should throw an Error', () => {
            let fn = function(){ parser.openFile("some_invalid_path"); };
            expect(fn).to.throw(/Could not find file/);
        });


    });

});
