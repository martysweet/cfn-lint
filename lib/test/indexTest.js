"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai = require("chai");
var expect = chai.expect;
var assert = chai.assert;
var childProcess = require("child_process");
var exec = childProcess.exec;
var proxyquire = require('proxyquire-2').noPreserveCache();
var logToConsole = true;
var _log = console.log;
console.log = function () {
    if (logToConsole) {
        return _log.apply(this, arguments);
    }
};
var _err = console.error;
console.error = function () {
    if (logToConsole) {
        return _err.apply(this, arguments);
    }
};
describe('index', function () {
    describe('CLI', function () {
        it('no parameters', function (done) {
            exec('node lib/index.js', function (error, stdout, stderr) {
                expect(stderr).to.contain('No command provided!');
                done();
            });
        }).timeout(5000);
        ;
        it('missing file parameter', function (done) {
            exec('node lib/index.js validate', function (error, stdout, stderr) {
                expect(stderr).to.contain('Missing required argument!');
                done();
            });
        }).timeout(5000);
        ;
        it('validate simple yaml', function (done) {
            exec('node lib/index.js validate testData/valid/yaml/issue-28-custom-resource.yaml', function (error, stdout, stderr) {
                expect(stdout).to.contain('0 crit');
                done();
            });
        }).timeout(5000);
        it('validate parameter flag', function (done) {
            exec('node lib/index.js validate testData/valid/json/2.json --parameters InstanceType="t1.micro"', function (error, stdout, stderr) {
                expect(stdout).to.contain('0 crit');
                done();
            });
        }).timeout(5000);
        it('validate pseudo flag', function (done) {
            exec('node lib/index.js validate testData/valid/yaml/pseudo-parameters.yaml ' +
                '--pseudo AWS::Region=us-east-1,AWS::AccountId=000000000000', function (error, stdout, stderr) {
                expect(stdout).to.contain('0 crit');
                done();
            });
        }).timeout(5000);
        it('validate pseudo + parameter flag', function (done) {
            exec('node lib/index.js validate testData/valid/yaml/pseudo-w-parameter.yaml ' +
                '--parameters MyInput=abcd --pseudo AWS::Region=us-east-1', function (error, stdout, stderr) {
                expect(stdout).to.contain('0 crit');
                done();
            });
        }).timeout(5000);
        it('invalid pseudo flag throws 2 critical error', function (done) {
            exec('node lib/index.js validate testData/valid/yaml/pseudo-parameters.yaml ' +
                '--pseudo AWS::Region=us-east-1,Something=000000000000', function (error, stdout, stderr) {
                expect(stdout).to.contain('2 crit');
                done();
            });
        }).timeout(5000);
        it('guess-parameters should explicitely opt in to parameter mocking', function (done) {
            exec('node lib/index.js validate testData/valid/yaml/no-guess-parameters.yaml --guess-parameters', function (error, stdout, stderr) {
                expect(stdout).to.contain('0 crit');
                done();
            });
        }).timeout(5000);
        it('no-guess-parameters throws errors if we leave out parameters', function (done) {
            exec('node lib/index.js validate testData/valid/yaml/no-guess-parameters.yaml --no-guess-parameters', function (error, stdout, stderr) {
                expect(stdout).to.contain('2 crit');
                expect(stdout).to.contain('Value for parameter was not provided');
                done();
            });
        }).timeout(5000);
        it('only-guess-parameters should allow opting in to parameter mocking', function (done) {
            exec('node lib/index.js validate testData/valid/yaml/no-guess-parameters.yaml --only-guess-parameters Param1', function (error, stdout, stderr) {
                expect(stdout).to.contain('1 crit');
                expect(stdout).to.contain('Value for parameter was not provided');
                done();
            });
        }).timeout(5000);
        it('only-guess-parameters should allow opting in to parameter mocking with multiple params', function (done) {
            exec('node lib/index.js validate testData/valid/yaml/no-guess-parameters.yaml --only-guess-parameters Param1,Param2', function (error, stdout, stderr) {
                expect(stdout).to.contain('0 crit');
                done();
            });
        }).timeout(5000);
        it('handle validation exceptions - non-verbose', function (done) {
            exec('node lib/index.js validate testData/invalid/yaml/invalid_yaml.yaml', function (error, stdout, stderr) {
                expect(error).to.have.property('code', 1);
                expect(stdout).to.contain('Unable to parse template! Use --verbose for more information.');
                expect(stderr).to.be.empty;
                done();
            });
        }).timeout(5000);
        it('handle validation exceptions - verbose', function (done) {
            exec('node lib/index.js validate testData/invalid/yaml/invalid_yaml.yaml --verbose', function (error, stdout, stderr) {
                expect(error).to.have.property('code', 1);
                expect(stdout).to.contain('Unable to parse template! Use --verbose for more information.');
                expect(stderr).to.contain('Error: Could not determine file type');
                done();
            });
        }).timeout(5000);
        it('parameters of the CommaDelimitedList type should accept lists as values', function (done) {
            exec('node lib/index.js validate testData/valid/yaml/parameters_type_commadelimitedlist.yaml --parameters SomeParam="test\\,dev\\,prod"', function (error, stdout, stderr) {
                expect(stdout).to.contain('0 warn');
                expect(stdout).to.contain('0 crit');
                expect(stderr).to.be.empty;
                done();
            });
        }).timeout(5000);
        it('parameters of the List<Number> type should accept lists as values', function (done) {
            exec('node lib/index.js validate testData/valid/yaml/parameters_type_list_number.yaml --parameters SomeParam="1\\,2\\,3"', function (error, stdout, stderr) {
                expect(stdout).to.contain('0 warn');
                expect(stdout).to.contain('0 crit');
                expect(stderr).to.be.empty;
                done();
            });
        }).timeout(5000);
        it('custom resource attribute parameter should accept an arbitrary attribute value using resource-type notation', function (done) {
            process.exit = function () { return undefined; };
            process.argv = ['', '', 'validate', 'testData/valid/yaml/smoke.yaml', '--custom-resource-attributes', 'AWS::CloudFormation::CustomResource.SomeAttribute=[1\\,2]'];
            logToConsole = false;
            proxyquire('../index', {
                './validator': {
                    addCustomResourceAttributeValue: function (x, y, z) {
                        logToConsole = true;
                        expect(x).to.equal('AWS::CloudFormation::CustomResource');
                        expect(y).to.equal('SomeAttribute');
                        expect(z).to.deep.equal([1, 2]);
                        done();
                        logToConsole = false;
                    },
                    validateFile: function () { return { errors: { info: [], warn: [], crit: [] } }; },
                    '@global': true
                }
            });
            logToConsole = true;
        }).timeout(5000);
        it('custom resource attribute parameter should accept an arbitrary attribute value using logical-name notation', function (done) {
            process.exit = function () { return undefined; };
            process.argv = ['', '', 'validate', 'testData/valid/yaml/smoke.yaml', '--custom-resource-attributes', 'SomethingBeautiful.SomeAttribute=test'];
            logToConsole = false;
            proxyquire('../index', {
                './validator': {
                    addCustomResourceAttributeValue: function (x, y, z) {
                        logToConsole = true;
                        expect(x).to.equal('SomethingBeautiful');
                        expect(y).to.equal('SomeAttribute');
                        expect(z).to.equal('test');
                        done();
                        logToConsole = false;
                    },
                    validateFile: function () { return { errors: { info: [], warn: [], crit: [] } }; },
                    '@global': true
                }
            });
            logToConsole = true;
        }).timeout(5000);
        it('custom resource attribute parameter should accept an arbitrary attribute value using mixed notation', function (done) {
            process.exit = function () { return undefined; };
            process.argv = ['', '', 'validate', 'testData/valid/yaml/smoke.yaml', '--custom-resource-attributes', 'AWS::CloudFormation::CustomResource.SomeAttribute=hello,SomethingBeautiful.SomeAttribute=test,Custom::Dooby.SomeAttribute=blabla'];
            logToConsole = false;
            var expectedValues = [
                ['AWS::CloudFormation::CustomResource', 'SomeAttribute', 'hello'],
                ['SomethingBeautiful', 'SomeAttribute', 'test'],
                ['Custom::Dooby', 'SomeAttribute', 'blabla'],
            ];
            proxyquire('../index', {
                './validator': {
                    addCustomResourceAttributeValue: function (x, y, z) {
                        logToConsole = true;
                        var expected = expectedValues.shift();
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
                    validateFile: function () { return { errors: { info: [], warn: [], crit: [] } }; },
                    '@global': true
                }
            });
            logToConsole = true;
        }).timeout(5000);
    });
});
//# sourceMappingURL=indexTest.js.map