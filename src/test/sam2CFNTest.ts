import chai = require('chai');
const expect = chai.expect;

import childProcess = require('child_process');
const exec = childProcess.exec;

const proxyquire = require('proxyquire-2').noPreserveCache();

let realProcessARGV: any = null;
let realProcessExit: any = null;

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

describe('sam2CFN', () => {

    describe('CLI - unit tests', () => {

      beforeEach(() => {
        realProcessARGV = process.argv;
        realProcessExit = process.exit;
        logToConsole = false;
      });

      afterEach(() => {
        process.argv = realProcessARGV;
        process.exit = realProcessExit;
        logToConsole = true;
      });

      it('should be able to correctly process valid parameters', (done) => {
          process.exit = () => { return undefined as never; };
          process.argv = ['', '', '-s', 'somethingCool', '-c', 'somethingAwesome', '-o', 'somethingBeautiful'];
          let expectedReadFileSync = [
            {x: 'somethingCool', y: {encoding: 'utf8'}},
            {x: 'somethingAwesome', y: {encoding: 'utf8'}}
          ];
          let mockedReadFileSync = [
            '{}',
            '{}'
          ];
          proxyquire('../sam2CFN', {
            'fs': {
                readFileSync: (x: any, y: any) => {
                    logToConsole = true;
                    let expected: any = expectedReadFileSync.shift();
                    expect(x).to.equal(expected['x']);
                    expect(y).to.deep.equal(expected['y']);
                    logToConsole = false;
                    return mockedReadFileSync.shift();
                },
                writeFileSync: (x: any, y: any) => {
                    logToConsole = true;
                    expect(x).to.equal('somethingBeautiful');
                    expect(y).to.equal('{}');
                    done();
                    logToConsole = false;
                },
                '@global': true
            },
            './sam2CFNUtils': {
              samResourcesSpecification: (x: any, y: any) => { return {}; }
            }
          });
      }).timeout(5000);

    });

});
