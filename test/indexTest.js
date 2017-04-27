const chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;

describe('index', () => {


    describe('CLI', () => {


        it('no parameters', (done) => {
            let exec = require('child_process').exec;
            exec('node lib/index.js', function(error, stdout, stderr) {
                expect(stderr).to.contain('no command given!');
                done();
            });
        }).timeout(5000);;

        it('missing file parameter', (done) => {
            let exec = require('child_process').exec;
            exec('node lib/index.js validate', function(error, stdout, stderr) {
                expect(stderr).to.contain('missing required argument');
                done();
            });
        }).timeout(5000);;


        it('validate simple yaml', (done) => {

            let exec = require('child_process').exec;
            exec('node lib/index.js validate test/data/valid/yaml/issue-28-custom-resource.yaml', function(error, stdout, stderr) {
                console.log(stderr);
                console.log(stdout);
                expect(stdout).to.contain('0 crit');
                done();
            });
        }).timeout(5000);

        it('validate parameter flag', (done) => {

            let exec = require('child_process').exec;
            exec('node lib/index.js validate test/data/valid/json/2.json --parameters InstanceType="t1.micro"', function(error, stdout, stderr) {
                expect(stdout).to.contain('0 crit');
                done();
            });
        }).timeout(5000);

        it('validate pseudo flag', (done) => {

            let exec = require('child_process').exec;
            exec('node lib/index.js validate test/data/valid/yaml/pseudo-parameters.yaml ' +
                '--pseudo AWS::Region=us-east-1,AWS::AccountId=000000000000', function(error, stdout, stderr) {
                expect(stdout).to.contain('0 crit');
                done();
            });
        }).timeout(5000);


        it('validate pseudo + parameter flag', (done) => {

            let exec = require('child_process').exec;
            exec('node lib/index.js validate test/data/valid/yaml/pseudo-w-parameter.yaml ' +
                '--parameters MyInput=abcd --pseudo AWS::Region=us-east-1', function(error, stdout, stderr) {
                expect(stdout).to.contain('0 crit');
                done();
            });
        }).timeout(5000);

        it('invalid pseudo flag throws 2 critical error', (done) => {

            let exec = require('child_process').exec;
            exec('node lib/index.js validate test/data/valid/yaml/pseudo-parameters.yaml ' +
                '--pseudo AWS::Region=us-east-1,Something=000000000000', function(error, stdout, stderr) {
                expect(stdout).to.contain('2 crit');
                done();
            });
        }).timeout(5000);

    });

});