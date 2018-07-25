import chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;

import childProcess = require('child_process');
import { doesNotThrow } from 'assert';
const exec = childProcess.exec;

const proxyquire = require('proxyquire-2').noPreserveCache();

let logToConsole = true;
let _log = console.log;
console.log = function() {
  if (logToConsole) {
      return _log.apply(this, arguments);
  }
}
let _err = console.error;
console.error = function() {
  if (logToConsole) {
      return _err.apply(this, arguments);
  }
}

describe('index', () => {


    describe('CLI', () => {


        it('no parameters', (done) => {
            exec('node lib/index.js', function(error, stdout, stderr) {
                expect(stderr).to.contain('No command provided!');
                done();
            });
        }).timeout(5000);;

        it('missing file parameter', (done) => {
            exec('node lib/index.js validate', function(error, stdout, stderr) {
                expect(stderr).to.contain('Missing required argument!');
                done();
            });
        }).timeout(5000);;


        it('validate simple yaml', (done) => {

            exec('node lib/index.js validate testData/valid/yaml/issue-28-custom-resource.yaml', function(error, stdout, stderr) {
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

        it('validate importValue flag', (done) => {
            exec('node lib/index.js validate testData/valid/yaml/valid_import_value_type.yaml --importValues ImportedValueOutputPort="20"', function(error, stdout, stderr) {
                expect(stdout).to.contain('0 crit');
                done();
            })
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


        it('guess-parameters should explicitely opt in to parameter mocking', (done) => {
            exec('node lib/index.js validate testData/valid/yaml/no-guess-parameters.yaml --guess-parameters', function(error, stdout, stderr) {
                expect(stdout).to.contain('0 crit');
                done();
            });
        }).timeout(5000);

        it('no-guess-parameters throws errors if we leave out parameters', (done) => {
            exec('node lib/index.js validate testData/valid/yaml/no-guess-parameters.yaml --no-guess-parameters', function(error, stdout, stderr) {
                expect(stdout).to.contain('2 crit');
                expect(stdout).to.contain('Value for parameter was not provided');
                done();
            });
        }).timeout(5000);

        it('only-guess-parameters should allow opting in to parameter mocking', (done) => {
            exec('node lib/index.js validate testData/valid/yaml/no-guess-parameters.yaml --only-guess-parameters Param1', function(error, stdout, stderr) {
                expect(stdout).to.contain('1 crit');
                expect(stdout).to.contain('Value for parameter was not provided');
                done();
            });
        }).timeout(5000);

        it('only-guess-parameters should allow opting in to parameter mocking with multiple params', (done) => {
            exec('node lib/index.js validate testData/valid/yaml/no-guess-parameters.yaml --only-guess-parameters Param1,Param2', function(error, stdout, stderr) {
                expect(stdout).to.contain('0 crit');
                done();
            });
        }).timeout(5000);

        it('handle validation exceptions - non-verbose', (done) => {
            exec('node lib/index.js validate testData/invalid/yaml/invalid_yaml.yaml', function(error, stdout, stderr) {
                expect(error).to.have.property('code', 1);
                expect(stdout).to.contain('Unable to parse template! Use --verbose for more information.');
                expect(stderr).to.be.empty;
                done();
            });
        }).timeout(5000);

        it('handle validation exceptions - verbose', (done) => {
            exec('node lib/index.js validate testData/invalid/yaml/invalid_yaml.yaml --verbose', function(error, stdout, stderr) {
                expect(error).to.have.property('code', 1);
                expect(stdout).to.contain('Unable to parse template! Use --verbose for more information.');
                expect(stderr).to.contain('Error: Could not determine file type');
                done();
            });
        }).timeout(5000);

        it('parameters of the CommaDelimitedList type should accept lists as values', (done) => {
            exec('node lib/index.js validate testData/valid/yaml/parameters_type_commadelimitedlist.yaml --parameters SomeParam="test\\,dev\\,prod"', function(error, stdout, stderr) {
                expect(stdout).to.contain('0 warn');
                expect(stdout).to.contain('0 crit');
                expect(stderr).to.be.empty;
                done();
            });
        }).timeout(5000);

        it('parameters of the List<Number> type should accept lists as values', (done) => {
            exec('node lib/index.js validate testData/valid/yaml/parameters_type_list_number.yaml --parameters SomeParam="1\\,2\\,3"', function(error, stdout, stderr) {
                expect(stdout).to.contain('0 warn');
                expect(stdout).to.contain('0 crit');
                expect(stderr).to.be.empty;
                done();
            });
        }).timeout(5000);

        it('custom resource attribute parameter should accept an arbitrary attribute value using resource-type notation', (done) => {
            process.exit = () => { return undefined as never; };
            process.argv = ['', '', 'validate', 'testData/valid/yaml/smoke.yaml', '--custom-resource-attributes', 'AWS::CloudFormation::CustomResource.SomeAttribute=[1\\,2]'];
            logToConsole = false;
            proxyquire('../index', {
              './validator': {
                  addCustomResourceAttributeValue: (x: any, y: any, z: any) => {
                      logToConsole = true;
                      expect(x).to.equal('AWS::CloudFormation::CustomResource');
                      expect(y).to.equal('SomeAttribute');
                      expect(z).to.deep.equal([1, 2]);
                      done();
                      logToConsole = false;
                  },
                  validateFile: () => { return {errors: {info: [], warn: [], crit: []}}},
                  '@global': true
              }
            });
            logToConsole = true;
        }).timeout(5000);

        it('custom resource attribute parameter should accept an arbitrary attribute value using logical-name notation', (done) => {
            process.exit = () => { return undefined as never; };
            process.argv = ['', '', 'validate', 'testData/valid/yaml/smoke.yaml', '--custom-resource-attributes', 'SomethingBeautiful.SomeAttribute=test'];
            logToConsole = false;
            proxyquire('../index', {
              './validator': {
                  addCustomResourceAttributeValue: (x: any, y: any, z: any) => {
                      logToConsole = true;
                      expect(x).to.equal('SomethingBeautiful');
                      expect(y).to.equal('SomeAttribute');
                      expect(z).to.equal('test');
                      done();
                      logToConsole = false;
                  },
                  validateFile: () => { return {errors: {info: [], warn: [], crit: []}}},
                  '@global': true
              }
            });
            logToConsole = true;
        }).timeout(5000);

        it('custom resource attribute parameter should accept an arbitrary attribute value using mixed notation', (done) => {
            process.exit = () => { return undefined as never; };
            process.argv = ['', '', 'validate', 'testData/valid/yaml/smoke.yaml', '--custom-resource-attributes', 'AWS::CloudFormation::CustomResource.SomeAttribute=hello,SomethingBeautiful.SomeAttribute=test,Custom::Dooby.SomeAttribute=blabla'];
            logToConsole = false;
            let expectedValues = [
              ['AWS::CloudFormation::CustomResource', 'SomeAttribute', 'hello'],
              ['SomethingBeautiful', 'SomeAttribute', 'test'],
              ['Custom::Dooby', 'SomeAttribute', 'blabla'],
            ];
            proxyquire('../index', {
              './validator': {
                  addCustomResourceAttributeValue: (x: any, y: any, z: any) => {
                      logToConsole = true;
                      let expected = expectedValues.shift();
                      if (!!expected) {
                        expect(x).to.equal(expected[0]);
                        expect(y).to.equal(expected[1]);
                        expect(z).to.equal(expected[2]);
                      }
                      if (expectedValues.length == 0) {
                        done();
                      }
                      logToConsole = false;
                  },
                  validateFile: () => { return {errors: {info: [], warn: [], crit: []}}},
                  '@global': true
              }
            });
            logToConsole = true;
        }).timeout(5000);
    });

});
