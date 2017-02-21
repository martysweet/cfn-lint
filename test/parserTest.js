const chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;
const parser = require('../src/parser');

describe('parser', () =>{

    describe('openFile', () => {

        it('valid yaml should return valid javascript object', () => {
            let result = parser.openFile("./test/data/valid/yaml/1.yaml");
            expect(result).to.not.equal(undefined);
            expect(result).to.not.equal(null);
            expect(result['Outputs']['PublicIP']['Value']).to.have.any.keys('Fn::GetAtt');
        });


    });

});
