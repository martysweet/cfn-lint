# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic
Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.9.1] - 2018-10-30
### Changed
- Update CloudFormation specification (downloaded 30-Oct-2018) - version: 2.10.0

## [1.9.0] - 2018-10-30
### Added
- Merge PR #167, adding support for SAM template validation

### Changed
- Update CloudFormation specification (downloaded 07-Oct-2018) - version: 2.8.0

### Fixed
- Fix CHANGELOG broken link for v1.8.1
- Merge PR #197, fixing Fn::Sub fixed nested Intrinsic functions and Literal Values

## [1.8.1] - 2018-09-07
### Changed
- Update CloudFormation specification (downloaded 05-Sep-2018) - version: 2.6.0

### Fixed
- Merge PR #192, fixing incorrect exit codes from the test suite during CI/CD

## [1.8.0] - 2018-08-02
### Added
- Merge PR #185, implement CLI argument support for import values

## [1.7.4] - 2018-07-18
### Fixed
- Merge PR #177, fix nested resources within an if condition not being resolved. Fix resolution of AWS::NoValue.
- Merge PR #179, fixing support for AWS::Partition pseudo parameter

### Changed
- Update CloudFormation specification (downloaded 18-Jul-2018) - version: 2.5.0

## [1.7.3] - 2018-06-30
### Fixed
- Merge PR #174, fixing validation support for AWS::URLSuffix
- Merge PR #171, fixing support for Fn::ImportValue to Fn::Split intrinsic function

## [1.7.2] - 2018-06-02
### Changed
- Merge PR #162, add release instructions to README.md
- Merge PR #168, updating CloudFormation specification (downloaded 01-Jun-2018) - version: 2.4.0

## [1.7.1] - 2018-05-08
### Fixed
- Merge PR #165, fixing GetAtt shorthand not accepting array parameters

## [1.7.0] - 2018-05-06
### Fixed
- Merge PR #155, fixing GetAtt not throwing errors on invalid resource

### Changed
- Merge PR #157, adding licence attribute to package.json
- Merge PR #148, removing cloudformation-js-yaml-schema in favour of custom handling of intrinsic functions
- Update CloudFormation specification (downloaded 06-May-2018) - version: 2.1.0
- Merge PR #159, improving readability of README.md

### Added
- Merge PR #148, adding Fn::split functionality


## [1.6.2] - 2018-04-26
### Fixed
- Merge PR #150, allow AWS::CloudFormation::Stack to return custom attributes when used in Fn::GetAtt

## [1.6.1] - 2018-04-25
### Fixed
- Merge PR #135, fixing parts.join exception when !Join was called on non-array
- Merge PR #141, allowing lists of values to be specified on the command line
- Merge PR #139, allowing Fn::GetAtt to return an array of values

### Changed
- Merge PR #136, updated usage prompt for a better CLI experience
- Merge PR #146, updated build environment to circleci/node:boron-stretch to support npm v6.0.0

## [1.6.0] - 2018-04-05
### Fixed
- Merge PR #120, fixing dependency issue with "@types/colors"
- Merge PR #130, implementing "safe-buffer" polyfill to be compatible with older NodeJS versions
- Merge PR #126, improving null value validation when null is passed into a template

### Changed
- Merge PR #124, adding the `--verbose` flag and returning exit code `1` on a fatal exception or parsing error
- Merge PR #131, making Winston exitOnError true

### Added
- Merge PR #128, implement NodeJS compatibility test in CI/CD

## [1.5.1] - 2018-03-12
### Added
- Merge PR #113, adding a Spanish translation for README.md
- Merge PR #116, adding node_modules to .gitignore

### Changed
- Update README.md to link to translation
- Update CloudFormation specification (downloaded 12-Mar-2018) - version: 2.0.0
- Patched CloudFormation specification with proper Tag specification
- Force specific dependency versions, fixing issue #117

## [1.5.0] - 2018-02-15
### Added
- Merge PR #104, adding Fn::Select functionality, add support for CommaDelimitedList parameter types

## [1.4.1] - 2018-01-31
### Changed
- Update CloudFormation specification (downloaded 31-Jan-2018) - version: 1.13.0

## [1.4.0] - 2017-11-29
### Changed
- Update CloudFormation specification (downloaded 29-Nov-2017) - version: 1.11.0

### Fixed
- Merge PR #96, fix invalid List<ParameterValue> validation

### Added
- Merge PR #97, allow control over whether parameters are guessed or not.

## [1.3.4] - 2017-11-19
### Changed
- Merge PR #72, JavaScript to TypeScript
- Merge PR #76, Refactor validation
- Merge PR #84, CircleCI 2.0
- Merge PR #85, Update README/CONTRIBUTING

### Fixed
- Merge PR #80, Fn::GetAtt with CustomResource

### Added
- Merge PR #82, allow inclusion as a module

## [1.3.3] - 2017-11-19 [YANKED]
## [1.3.2] - 2017-11-19 [YANKED]
## [1.3.1] - 2017-11-19 [YANKED]
## [1.3.0] - 2017-11-19 [YANKED]

## [1.2.0] - 2017-11-08
### Changed
- Merge PR #67, change format of CHANGELOG to standardised approach
- Merge PR #62, exiting the CLI with 1 if the template is invalid
- Update CloudFormation specification (downloaded 7th November 2017)

### Fixed
- Merge PR #60, allowing a single wildcard as a string within the template
- Merge PR #65, allowing forked branches to run tests
- Merge PR #71, fixing maps, see #69 and #68 
- Merge PR #63, fixing if intrinsic functions, see 

## [1.1.7] - 2017-10-07
### Changed
- Update CloudFormation specification (downloaded 7th October 2017)
- Merge PR #53, using the package version for the command line version output

## [1.1.6] - 2017-07-16
### Changed
- Update CloudFormation specification (downloaded 16th July 2017)

## [1.1.5] - 2017-06-07
### Fixed
- Fix bugs in issues #42 and #44

## [1.1.4] - 2017-05-17
### Changed
- Update CloudFormation specification (downloaded 17th May 2017), see the [AWS Blog](https://aws.amazon.com/about-aws/whats-new/2017/05/cloudformation-support-for-aws-waf-on-alb/)

## [1.1.3] - 2017-05-11
### Fixed
- Fix Fn::Sub not throwing errors on invalid reference ([Issue #39](https://github.com/martysweet/cfn-lint/issues/39))

## [1.1.2] - 2017-05-05
### Changed
- Update CloudFormation specification (downloaded 5th May 2017), see  the [AWS Blog](https://aws.amazon.com/about-aws/whats-new/2017/04/aws-cloudformation-adds-support-for-amazon-cognito-ebs-elastic-volumes-and-updates-resource-coverage/) post for changes.

## [1.1.1] - 2017-04-27
### Added
- Add pseudo parameter support

[Unreleased]: https://github.com/martysweet/cfn-lint/compare/v1.9.1...HEAD
[1.9.1]: https://github.com/martysweet/cfn-lint/compare/v1.9.0...v1.9.1
[1.9.0]: https://github.com/martysweet/cfn-lint/compare/v1.8.1...v1.9.0
[1.8.1]: https://github.com/martysweet/cfn-lint/compare/v1.8.0...v1.8.1
[1.8.0]: https://github.com/martysweet/cfn-lint/compare/v1.7.4...v1.8.0
[1.7.4]: https://github.com/martysweet/cfn-lint/compare/v1.7.3...v1.7.4
[1.7.3]: https://github.com/martysweet/cfn-lint/compare/v1.7.2...v1.7.3
[1.7.2]: https://github.com/martysweet/cfn-lint/compare/v1.7.1...v1.7.2
[1.7.1]: https://github.com/martysweet/cfn-lint/compare/v1.7.0...v1.7.1
[1.7.0]: https://github.com/martysweet/cfn-lint/compare/v1.6.2...v1.7.0
[1.6.2]: https://github.com/martysweet/cfn-lint/compare/v1.6.1...v1.6.2
[1.6.1]: https://github.com/martysweet/cfn-lint/compare/v1.6.0...v1.6.1
[1.6.0]: https://github.com/martysweet/cfn-lint/compare/v1.5.1...v1.6.0
[1.5.1]: https://github.com/martysweet/cfn-lint/compare/v1.5.0...v1.5.1
[1.5.0]: https://github.com/martysweet/cfn-lint/compare/v1.4.1...v1.5.0
[1.4.1]: https://github.com/martysweet/cfn-lint/compare/v1.4.0...v1.4.1
[1.4.0]: https://github.com/martysweet/cfn-lint/compare/v1.3.4...v1.4.0
[1.3.4]: https://github.com/martysweet/cfn-lint/compare/v1.2.0...v1.3.4
[1.2.0]: https://github.com/martysweet/cfn-lint/compare/v1.1.7...v1.2.0
[1.1.7]: https://github.com/martysweet/cfn-lint/compare/v1.1.6...v1.1.7
[1.1.6]: https://github.com/martysweet/cfn-lint/compare/v1.1.5...v1.1.6
[1.1.5]: https://github.com/martysweet/cfn-lint/compare/v1.1.4...v1.1.5
[1.1.4]: https://github.com/martysweet/cfn-lint/compare/v1.1.3...v1.1.4
[1.1.3]: https://github.com/martysweet/cfn-lint/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/martysweet/cfn-lint/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/martysweet/cfn-lint/compare/v1.1.0...v1.1.1
