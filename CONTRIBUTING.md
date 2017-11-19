# Contributing to cfn-lint


### Submitting Issues
When submitting an issue, please follow these instructions:

1. Search for issues similar to yours in [GitHub search](https://github.com/martysweet/cfn-lint/search?type=Issues). 
2. Feature requests are welcome; simply add an issue with a clear definition of what you think will make cfn-lint better.
3. If there's an open issue, please contribute to that issue.
4. If there's a closed issue, open a new issue and link the url of the already closed issue(s).
5. If there is no issue, open a new issue and specify the following:
  - A short description of your issue in the title
  - The cloudformation template used
  - Detailed explanation of how to recreate the issue
6. If you are experiencing more than one problem, create a separate issue for each one. If you think they might be related, please reference the other issues you've created.

## Writing Tests

Ideally, all code contributions should be accompanied by functional and/or unit tests (as appropriate).
You can see a number of the current tests written in the [test](test) directory. As this is a validation
tool you should aim for a minimum of 2 tests per feature:
* One which causes the template validation to fail
* One which causes the template validation to succeed

Each test should have it's own Cloudformation file, either JSON or YAML and should be named clearly about the test it should
fail, for example `1_ref_not_string_param.json`. If your feature has many possible failure scenarios, please create tests for all of these.

## Submitting Pull Requests

0. If you don't know how to fork and PR, [see here](https://help.github.com/articles/about-pull-requests/).
1. Fork the repo and create a new branch based from the master branch
2. Write your code
3. Add a test for your change. Only refactoring and documentation changes require no new tests. If you are adding functionality or fixing a bug, add some tests!
4. Make the tests pass and make sure you follow our syntax guidelines.
5. Push to your fork and submit a pull request to the appropriate branch, the CI will hopefully confirm all the tests pass!