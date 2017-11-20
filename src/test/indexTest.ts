import chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;

import childProcess = require('child_process');
const exec = childProcess.exec;

describe('index', () => {


    describe('CLI', () => {


        it('no parameters', (done) => {
            exec('node lib/index.js', function(error, stdout, stderr) {
                expect(stderr).to.contain('no command given!');
                done();
            });
        }).timeout(5000);;

        it('missing file parameter', (done) => {
            exec('node lib/index.js validate', function(error, stdout, stderr) {
                expect(stderr).to.contain('missing required argument');
                done();
            });
        }).timeout(5000);;


        it('validate simple yaml', (done) => {

            exec('node lib/index.js validate testData/valid/yaml/issue-28-custom-resource.yaml', function(error, stdout, stderr) {
                console.log(stderr);
                console.log(stdout);
                expect(stdout).to.contain('0 crit');
                done();
            });
        }).timeout(5000);

        it('validate parameter flag', (done) => {

            exec('node lib/index.js validate testData/valid/json/2.json --parameters InstanceType="t1.micro"', function(error, stdout, stderr) {
                expect(stdout).to.contain('0 crit');
                done();
            });
        }).timeout(5000);

        it('validate pseudo flag', (done) => {

            exec('node lib/index.js validate testData/valid/yaml/pseudo-parameters.yaml ' +
                '--pseudo AWS::Region=us-east-1,AWS::AccountId=000000000000', function(error, stdout, stderr) {
                expect(stdout).to.contain('0 crit');
                done();
            });
        }).timeout(5000);


        it('validate pseudo + parameter flag', (done) => {

            exec('node lib/index.js validate testData/valid/yaml/pseudo-w-parameter.yaml ' +
                '--parameters MyInput=abcd --pseudo AWS::Region=us-east-1', function(error, stdout, stderr) {
                expect(stdout).to.contain('0 crit');
                done();
            });
        }).timeout(5000);

        it('invalid pseudo flag throws 2 critical error', (done) => {

            exec('node lib/index.js validate testData/valid/yaml/pseudo-parameters.yaml ' +
                '--pseudo AWS::Region=us-east-1,Something=000000000000', function(error, stdout, stderr) {
                expect(stdout).to.contain('2 crit');
                done();
            });
        }).timeout(5000);

        
        it('no-guess-parameters throws errors if we leave out parameters', (done) => {
            exec('node lib/index.js validate testData/valid/json/2.json --no-guess-parameters', function(error, stdout, stderr) {
                expect(stdout).to.contain('4 crit');
                expect(stdout).to.contain('Guessing parameter value');
                done();
            });
        }).timeout(5000);
    });

});