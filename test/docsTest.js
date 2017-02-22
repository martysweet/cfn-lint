const chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;
const docs = require('../src/docs');

describe('docs', () =>{



    it('should return a resource type', () => {
        let result = docs.getDoc("AWS::Lambda::Function");
        console.log(result);
        expect(result).to.not.equal(null);
    });


});
