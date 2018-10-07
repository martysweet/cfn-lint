#!/usr/bin/env node

import sms = require('source-map-support');
sms.install();

import {
  samSchema20161031Filepath,
  samCustomSpecification20161031Filepath,
  samResources20161031Filepath
} from './samData';

import {
  samResourcesSpecification
} from './sam2CFNUtils';

import * as fs from 'fs';
import * as process from 'process';

import program = require('commander');

require('colors');
const version = require('../package').version;


program
    .version(version)
    .option('-s, --schema [filepath]', 'input SAM JSON schema file', samSchema20161031Filepath)
    .option('-c, --custom-specification [filepath]', 'input CFN overrides file', samCustomSpecification20161031Filepath)
    .option('-o, --output [filepath]', 'output CFN file', samResources20161031Filepath)
    .parse(process.argv);

// convert and persist the schema
let samSchema: any = JSON.parse(fs.readFileSync(program.schema, {encoding: 'utf8'}));
let customSpecification: any = JSON.parse(fs.readFileSync(program.customSpecification, {encoding: 'utf8'}));
fs.writeFileSync(program.output, JSON.stringify(samResourcesSpecification(samSchema, customSpecification)));

console.log('Done.');
