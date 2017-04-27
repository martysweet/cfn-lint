# cfn-lint [![CircleCI](https://img.shields.io/circleci/project/github/martysweet/cfn-lint.svg)](https://circleci.com/gh/martysweet/cfn-lint) [![npm version](https://badge.fury.io/js/cfn-lint.svg)](https://www.npmjs.com/package/cfn-lint) [![npm](https://img.shields.io/npm/dm/cfn-lint.svg)](https://www.npmjs.com/package/cfn-lint)

A more friendly CloudFormation JSON and YAML Validator

`cfn-lint` is a tool used to improve your CloudFormation development cycle. If you are here, you are probably
fed up of waiting for 10 minutes or more before CloudFormation gives you an error due to a typo. This tool aims to 
remove that waste of time. The tool takes the CloudFormation template, and resolves all the Intrinsic functions 
defined before checking the Properties of Resources defined. 

The tool can be used over the commandline using `cfn-lint`, or can be used as a module within another JavaScript application.

*Note: This tool is currently case-sensitive in relation to AWS CloudFormation types, for example aws::lambda::function != AWS::Lambda::Function.*

## Installation

You can install with `npm`:

```
$ npm install -g cfn-lint
```

If you get `/usr/bin/env: 'node': No such file or directory` ensure your system has NodeJs installed. On Debian systems you may need to symlink node to nodejs due to namespacing issues (`ln -s /usr/bin/nodejs /usr/bin/node`).


## How to use?
`cfn-lint validate my_template.yaml`

`cfn-lint validate my_template.json`

`cfn-lint validate my_template.yaml --parameters key="my value",key2=value2,key3=3`

`cfn-lint validate my_template.yaml --pseudo AWS::StackName="My-Stack"`

`cfn-lint validate my_template.yaml --parameters key="my value" --pseudo AWS::Region=ap-northeast-1,AWS::AccountId=000000000000`

`cfn-lint docs AWS::Lambda::Function` 

`cfn-lint docs AWS::Lambda::Function.Code`

`cfn-lint docs AWS::Lambda::Function.Code.S3Bucket`

**Note: The order of `--parameters` and `--pseudo` currently matters. This should be addressed in a later release.**

### Example Output
```
0 infos
0 warn
2 crit
Resource: Resources > MyInstance > Properties
Message: Required property ImageId missing for type AWS::EC2::Instance
Documentation: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-instance.html

Resource: Resources > MyInstance > Properties
Message: Required property Value missing for type Tag
Documentation: http://docs.aws.amazon.com/search/doc-search.html?searchPath=documentation-guide&searchQuery=Tag&x=0&y=0&this_doc_product=AWS+CloudFormation&this_doc_guide=User+Guide&doc_locale=en_us#facet_doc_product=AWS%20CloudFormation&facet_doc_guide=User%20Guide

Template invalid!
```

### What can cfn-lint do?
* Read JSON + YAML (Including YAML short form)
* Detect invalid property names
* Detect invalid Ref
* Detect invalid mappings
* Detect invalid format
* Missing or invalid AWSTemplateFormatVersion
* Fn::FindInMap
* Fn::GetAtt
* Fn::GetAZs
* Fn::Join
* Fn::Base64
* Fn::Sub
* Fn::If
* Fn::Equals
* Fn::Not
* Fn::Or
* Fn::And
* Fn::ImportValue
* Condition support
* Ref
* Go to the documentation from Command Line (see above examples)
* Detecting invalid property types
* Detect missing required properties

### Feature backlog
* Verbose parsing errors when reading invalid JSON
* Fn::ImportValue - to support CLI injection (Like Params currently does)
* Fn::Select
* Fn::Split
* Test coverage for Conditions and Property checking
* Refactor Property checking to be clearer
* Circular dependency checking
* Suggest DependsOn when References to Resources are used
* Extended validation flag (calls AWS CloudFormation API)
* Watch file flag to revalidate on file save
* Download latest resources during build

### Features that would be nice, but aren't currently possible
* Detect conditional required properties (Information doesn't exist in AWS Resource Specification)

## Deploying your template

CloudFormation tends to involve a bit of trail and error. To enable quick development, 
the following method can be used to prevent the annoying 'ROLLBACK' scenarios where the whole stack
must be deleted and recreated.

Deploy a template with the following content, name it what you want your final stack to be called.
```yaml
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
```

After each change to your template, simply update the stack you just created. If the stack failed to deploy
for some reason you can perform an 'Update Stack' operation, without needing to delete and recreate
the stack from scratch. You can also use this method to keep parameters populated during the development 
phase. This method will work using the AWS Console or the CLI tools.


## FAQ

### No errors were thrown for my template but it still failed when deploying! Is this tool pointless?!
Hopefully `cfn-lint` caught some errors before you deployed your template, however, catching every single
error before deployment is extremely tricky. Please help out the community by explaining how you
managed to get an error from CloudFormation of which the validator did not detect, the following information
will help in adding a check to the utility:

* The Resource/Statement which caused the error
* The error thrown from CloudFormation
* The working Resource/Statement which resolves the error

You can add an issue on the [Github Issue Page](https://github.com/martysweet/cfn-lint/issues). Thanks for helping out!

### Doesn't the AWS API provide this functionality?
Partially. The AWS API `cloudformation validate-template` only checks the validity of the template, this includes the
expected parameters for intrinsic functions, resource types and general structure of the JSON or YAML template it has been given. The
AWS API does not detect incorrect resource property names or incorrect resource property types (e.g. string, bool, list) which are typically 
only detected when CloudFormation attempts to deploy the resources with the incorrect configurations.

### Got any other questions?
Ask a question on the [Github Issue Page](https://github.com/martysweet/cfn-lint/issues)!

## Development

### Unit Tests

Tests can be run using `npm test`. There should be a test case for every template error, 
for example an invalid parameter for `Fn::Join` or an incorrect reference for `Ref`. 
The tests depend on `Mocha` and `chai`.

### IDE Setup

If you use a JetBrains editor, the following Run Configuration can be setup 
for the Mocha test suite:

Node Options: --harmony
Extra Mocha Options: --compilers js:babel-register --require babel-polyfill
Test Directory: <working dir>\test

### Local testing of CLI

Environmental Variables
* DEBUG - Set to receive runtime debug messages

```
$ npm link
$ cfn-lint <some command>
```

### Resource Attribute Mocking
In order to simulate the intrinsic functions to catch errors before deployment,
attributes for Properties and Resources are mocked. This can be seen within the 
`assignResourcesOutputs()` and `assignParameterOutputs()` of [validator.es6](src/validator.es6).
A resource will always have a Ref of `mock-ref-RESOURCENAME` and will be attached other
attributes which can be used with the `Fn::GetAtt` function. This allows for checking
if attributes exist for a specific resource before deploying the template for real.

### Intrinsic Functions

Each intrinsic function has a signature of `doIntrinsicXYZ(ref, key)` and is called by the
`resolveIntrinsicFunction(ref, key)` function. The `doIntrinsic..` function should return
the resolved value of the function. For example, for Fn::Sub, an input of `"My ${MyInstance}"`
would return a string similar to `"My i-0a0a0a0a0a`.

## Contributions

Please check out the [Contributor's Guide](CONTRIBUTING.md) for more information on how to get started.
