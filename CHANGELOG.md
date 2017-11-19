# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic
Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/martysweet/cfn-lint/compare/v1.3.4...HEAD
[1.3.4]: https://github.com/martysweet/cfn-lint/compare/v1.2.0...v1.3.4
[1.2.0]: https://github.com/martysweet/cfn-lint/compare/v1.1.7...v1.2.0
[1.1.7]: https://github.com/martysweet/cfn-lint/compare/v1.1.6...v1.1.7
[1.1.6]: https://github.com/martysweet/cfn-lint/compare/v1.1.5...v1.1.6
[1.1.5]: https://github.com/martysweet/cfn-lint/compare/v1.1.4...v1.1.5
[1.1.4]: https://github.com/martysweet/cfn-lint/compare/v1.1.3...v1.1.4
[1.1.3]: https://github.com/martysweet/cfn-lint/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/martysweet/cfn-lint/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/martysweet/cfn-lint/compare/v1.1.0...v1.1.1
