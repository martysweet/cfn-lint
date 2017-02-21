# cfn-lint
Hopefully a comprehensive CloudFormation Linting tool, just what you need to speed development

## What does it do?
`cfn-lint` is a tool used to improve your CloudFormation development cycle. If you are here, you are probably
fed up of waiting for 10 minutes or more before CloudFormation gives you an error due to a typo. This tool aims to 
remove that waste of time. The tool takes the CloudFormation template, and resolves all the Intrinsic functions 
defined before checking the Properties of Resources defined. There is a test defined for each error which can be caught,
the invalid templates which will throw errors can be found in the [tests/invalid](https://github.com/martysweet/cfn-lint/tree/master/test/data/invalid) directory.

The tool can be used over the commandline using `cfn-lint`, or can be used as a module within another JavaScript application.

### Example Commands
`cfn-lint validate-template my_template.yaml` 

`cfn-lint validate-template my_template.json`

`cfn-lint docs AWS::Lambda::Function` 

`cfn-lint docs AWS::Lambda::Function.code`


### Cloudformation Checks

#### Intrinsic Functions

#### Resource Attributes

A critical error will be thrown if an invalid resource property is defined or a resource does not specify a property which is required.

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

## Contributions
