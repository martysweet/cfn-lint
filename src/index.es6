let workingInput = null;
const logger = require('./logger');
let resourcesSpec = require('./resourcesSpec');

const mockArnPrefix = "arn:aws:mock:region:123456789012:";

main();

function main(){

    // todo: read input file

    // convert to json if required

    workingInput = require('../data/input.json');

    // process the input file
    assignOutputs(workingInput);

   // console.log(workingInput);
}
