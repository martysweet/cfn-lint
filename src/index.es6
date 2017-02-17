let workingInput = null;
const logger = require('./logger');

main();

function main(){

    // todo: read input file

    // convert to json if required

    workingInput = require('../data/input.json');

    // process the input file
    assignOutputs(workingInput);

   // console.log(workingInput);
}
