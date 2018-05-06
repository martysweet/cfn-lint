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

`cfn-lint validate my_template.yaml --parameters key="my value",key2=value2 --no-guess-parameters`

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

### Flags

#### Input Parameters
`--parameters <param values>`: Provide a list of comma-separated key=value pairs of parameters to use when validating your template. If a parameter is not specified here, `cfn-lint` will guess a mock value based on the Parameter's Type and AllowedValues. e.g.`--parameters InstanceType=t2.micro,Memory=512`

#### AWS Pseudo Parameter Override
`--pseudo <psuedo param values>`: Provide a list of comma-separated key=value pairs of CloudFormation pseudo-parameters to use when validating your template. e.g.`--pseudo AWS::Region=ap-southeast-2`

#### Parameter Guessing
`--guess-parameters`: Guess any parameters if they don't have any Default value in the template. Parameters will be guessed/mocked based on their `AllowedValues` or `Type`. This is the default behaviour; it's only included as an option for explicitness.

`--no-guess-parameters`: Disable the guessing of parameters if they don't have a Default. If you don't provide them on the CLI in this situation, a critical error will be raised instead of the parameter value being mocked.

`--only-guess-parameters <param names>`: Only guess the provided parameters, and disable the guessing of all others without Defaults. A critical error will be raised for missing parameters, as above. e.g. `--only-guess-parameters InstanceType,Memory`

#### User-defined Resource Attributes
`--custom-resource-attributes <attribute values>`: Provide a list of comma-separated key=value pairs of resource attributes using either resource-type notation (e.g. `AWS::CloudFormation::CustomResource.SomeAttribute`) or logical-name notation (e.g. `SomethingPretty.SomeAttribute`) and their expected values, to use when validating your template. If a custom resource attribute is not specified here, `cfn-lint` will guess a mock value. e.g.`--custom-resource-attributes AWS::CloudFormation::CustomResource.SomeAttribute=[1\\,2],Custom::Dooby.SomeAttribute=[1\\,2],SomethingPretty.SomeAttribute=123`

#### Verbose Output
`--verbose`: Provide verbose output and stack traces when template parsing fails.

** Note ** : Parameter values that contain commas must be escaped using a backslash (e.g. `Param1=[1\,2\,3]`). Depending on your command-line interpreter you may have to use double backslashes or enclose the entire argument in quotes, such is the case with *Bash* and other *Bourne*-based shells (e.g. `--parameters 'Param1=[1\,2\,3]'`).

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
* Fn::Select
* Fn::Split
* Condition support
* Ref
* Go to the documentation from Command Line (see above examples)
* Detecting invalid property types
* Detect missing required properties

### Feature backlog
* Verbose parsing errors when reading invalid JSON
* Fn::ImportValue - to support CLI injection (Like Params currently does)
* Test coverage for Conditions and Property checking
* Refactor Property checking to be clearer
* Circular dependency checking
* Extended validation flag (calls AWS CloudFormation API)
* Watch file flag to revalidate on file save
* Download latest resources during build

### Features that would be nice, but aren't currently possible
* Detect conditional required properties (Information doesn't exist in AWS Resource Specification)

### API
`cfn-lint` can also be used as a Node library:
```ts
const cfnLint = require('cfn-lint')
```

The following methods are considered public:

```ts
cfnLint.validateFile(fileName: string, options?: ValidationOptions): ValidationResult
```
Validates a file, and returns an ValidationResult with the results.


```ts
cfnLint.validateJsonObject(object: any, options?: ValidationOptions): ValidationResult
```
Validates an object, and returns an ValidationResult with the results. The object
is what you might get from `JSON.parse`ing a Cloudformation template.


```ts
interface ValidationOptions {
  parameters?: {
    Param1: Param1value,
    // ...
  }
  pseudoParameters?: {
    'AWS::Region': 'ap-southeast-2',
    // ...
  },
  guessParameters?: string[] | undefined // default undefined
}
```
`parameters` get passed into the template's Parameters before validation, and `pseudoParameters` are used to override AWS' pseudo-parameters, like `AWS::Region`, `AWS::AccountId`, etc.

If `guessParameters` is set to a list of parameter names, a critical error will be raised if any Parameter with no Default is not specified in the `parameters` or `guessParameters` options. An empty list can be used to enforce that all parameters must be specified in `parameters`. Leaving as `undefined` preserves the default loose behaviour, where parameters are guessed as needed without causing an error.

```ts
interface ErrorRecord {
  message: string,
  resource: string,
  documentation: string
}
interface ValidationResult {
  templateValid: boolean,
  errors: {
    crit: ErrorRecord[],
    warn: ErrorRecord[],
    info: ErrorRecord[]
  },
  outputs: {
      [outputName: string]: string;
  };
  exports: {
      [outputName: string]: string;
  };
}
```
Represents the result of a validation.


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

### How does cfn-lint know what is valid?
AWS provide a CloudFormation specification file for each region. cfn-lint uses the US East (N. Virginia) CloudFormationResourceSpecification.json
file available on the [AWS CloudFormation Resource Specification](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-resource-specification.html) page.
Currently, updates of this JSON file are manual and baked into each major, minor or bug fix release as needed.

### Got any other questions?
Ask a question on the [Github Issue Page](https://github.com/martysweet/cfn-lint/issues)!

## Development

### Language

This project is written in [TypeScript](http://www.typescriptlang.org/docs/home.html), a
superset of JavaScript which allows for type checking at compile time. The project currently
aims to support Node 4 and above.

### Unit Tests

Tests can be run using `npm test`. There should be a test case for every template error, 
for example an invalid parameter for `Fn::Join` or an incorrect reference for `Ref`. 
The tests depend on `Mocha` and `chai`.

### IDE Setup

If you use a JetBrains editor, the following Run Configuration can be setup 
for the Mocha test suite:

Node Options: None
Extra Mocha Options: None
Test Directory: <working dir>/lib/test

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

## Translations
This document is available in:

- [English](https://github.com/martysweet/cfn-lint/blob/master/README.md)
- [Español](https://github.com/martysweet/cfn-lint/blob/master/README_es.md)

If you wish to translate this document to another language, we welcome your contribution!
