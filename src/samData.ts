import sms = require('source-map-support');
sms.install();

import * as awsData from './awsData';

export const samPrimitiveTypes = ['string', 'number', 'boolean'];

export const samSchema20161031Filepath = '../data/sam_20161031_schema.json';
export const samSchema20161031 = require(samSchema20161031Filepath);

export const samImplicitResources20161031Filepath = '../data/sam_20161031_implicit_resources.json';
export const samImplicitResources20161031 = require(samImplicitResources20161031Filepath);

export const samCustomSpecification20161031Filepath = '../data/sam_20161031_custom_specification.json';
export const samCustomSpecification20161031 = require(samCustomSpecification20161031Filepath);

export const samResources20161031Filepath = '../data/sam_20161031_cfn.json';
export const samResources20161031: awsData.AWSResourcesSpecification = require(samResources20161031Filepath);
