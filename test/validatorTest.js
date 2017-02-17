const chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;
const validator = require('../src/validator');

describe('validator', () => {

    describe('validateJsonObject', () => {

        it('a valid template should return an object with validTemplate = true, no crit errors', () => {
            const input = require('./data/valid/1.json');
            let result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', true);
            expect(result['errors']['crit']).to.have.lengthOf(0);
        });

        it('2 invalid resource types should return an object with validTemplate = false, 2 crit errors', () => {
            const input = require('./data/invalid/1_invalid_resource_type.json');
            let result = validator.validateJsonObject(input);
            expect(result).to.have.deep.property('templateValid', false);
            expect(result['errors']['crit']).to.have.lengthOf(2);
        });

    });

});