# Test

Most classes have unit tests (classname.spec.ts), though we also want to test the whole code in an "End-To-End" way.
These tests are written in a separate test-folder, which can be found on the same level as src.

## How do we write tests?
Generally, we create two describe blocks per public-function. 
One tests the function in case we have a miranum.json, the other the case in which we don't have a miranum.json.

Each describe block than contains multiple tests for good and bad cases. As keyword for the tests we use **it**.
The name that follows this keyword should describe what the test is doing as good as possible.

Constants and functions that are used in multiple tests are to be outsourced.
Therefore, you can use global variables and helper-functions.
If you are working on an End-To-End-Test and you notice that certain checks or variables are used in multiple test-files, 
you may also create a [testHelper](../apps/miranum-cli/tests/testHelpers.ts) file.

Also check out the company guide about [testing](https://www.notion.so/miragon/Testing-ede1de9b0e2e4013b099d070d4c11e98).

## Cases to keep in mind whiles writing tests
Always test both cases, with and without a miranum.json, not only one of them.
A good showcase would be the [plugin.spec](../libs/miranum-core/src/lib/generate/plugins.spec.ts) for generating artifacts in our lib.

If working on the lib, you have to consider all apps, not only the one you are currently working on. 
Most of the time the issue isn't in the lib, but in the app itself.
