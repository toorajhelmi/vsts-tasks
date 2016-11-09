import * as assert from 'assert';
import * as path from 'path';
import * as mocktest from 'vsts-task-lib/mock-test';

function setResponseFile(name: string) {
    process.env['MOCK_RESPONSES'] = path.join(__dirname, name);
}

describe('Gulp Suite', function () {
    this.timeout(20000);

    before((done) => {
        done();
    });

    after(function () {
    });

    it('runs a gulpfile using global gulp', (done: MochaDone) => {
        this.timeout(1000);

        let testPath = path.join(__dirname, 'L0runsGulpFileUsingGlobalGulp.js');
        let testRunner = new mocktest.MockTestRunner(testPath);
        testRunner.run();
        assert(testRunner.ran('/usr/local/bin/gulp --gulpfile gulpfile.js'), 'it should have run Gulp');
        assert(testRunner.invokedToolCount == 1, 'should have only run Gulp');
        assert(testRunner.stderr.length == 0, 'should not have written to stderr');
        assert(testRunner.succeeded, 'task should have succeeded');

        done();
    });

    it('runs a gulpfile using local gulp', (done: MochaDone) => {
        this.timeout(1000);

        let testPath = path.join(__dirname, 'L0runsGulpFileUsingLocalGulp.js');
        let testRunner = new mocktest.MockTestRunner(testPath);
        testRunner.run();
        if (process.platform == 'win32') {
            assert(testRunner.ran('/usr/local/bin/node c:\\fake\\wd\\node_modules\\gulp\\gulp.js --gulpfile gulpfile.js'), 'it should have run gulp');
        }
        else {
            assert(testRunner.ran('/usr/local/bin/node /fake/wd/node_modules/gulp/gulp.js --gulpfile gulpfile.js'), 'it should have run gulp');
        }

        assert(testRunner.invokedToolCount == 1, 'should have only run gulp');
        assert(testRunner.stderr.length == 0, 'should not have written to stderr');
        assert(testRunner.succeeded, 'task should have succeeded');

        done();
    });

    it('runs gulp when code coverage is enabled', (done: MochaDone) => {
        this.timeout(1000);

        let testPath = path.join(__dirname, 'L0runsGulpWhenCodeCoverageEnabled.js');
        let testRunner = new mocktest.MockTestRunner(testPath);
        testRunner.run();
        assert(testRunner.ran('/usr/local/bin/gulp --gulpfile gulpfile.js'), 'it should have run Gulp');
        assert(testRunner.invokedToolCount == 3, 'should have run npm, Gulp and istanbul');
        assert(testRunner.stderr.length == 0, 'should not have written to stderr');
        assert(testRunner.succeeded, 'task should have succeeded');

        done();
    });

    it('runs a gulpfile when publishJUnitTestResults is false', (done: MochaDone) => {
        this.timeout(1000);

        let testPath = path.join(__dirname, 'L0runsGulpFileWhenPublishJUnitTestResultsFalse.js');
        let testRunner = new mocktest.MockTestRunner(testPath);
        testRunner.run();
        assert(testRunner.ran('/usr/local/bin/gulp --gulpfile gulpfile.js'), 'it should have run Gulp');
        assert(testRunner.invokedToolCount == 1, 'should have only run Gulp');
        assert(testRunner.stderr.length == 0, 'should not have written to stderr');
        assert(testRunner.succeeded, 'task should have succeeded');

        done();
    });

    it('fails when gulpFile not set', (done: MochaDone) => {
        this.timeout(1000);

        let testPath = path.join(__dirname, 'L0failsWhenGulpFileNotSet.js');
        let testRunner = new mocktest.MockTestRunner(testPath);
        testRunner.run();
        assert(testRunner.failed, 'should have failed');
        var expectedErr = 'Input required: gulpFile';
        assert(testRunner.errorIssues.some(x => x.indexOf(expectedErr) >= 0), 'should have said: ' + expectedErr);
        assert(testRunner.failed, 'task should have set a result');
        assert(testRunner.invokedToolCount == 0, 'should exit before running Gulp');

        done();
    });

    it('fails when cwd not set', (done: MochaDone) => {
        this.timeout(1000);

        let testPath = path.join(__dirname, 'L0failsWhenCwdNotSet.js');
        let testRunner = new mocktest.MockTestRunner(testPath);
        testRunner.run();
        assert(testRunner.failed, 'should have failed');
        var expectedErr = 'Input required: cwd';
        assert(testRunner.errorIssues.some(x => x.indexOf(expectedErr) >= 0), 'should have said: ' + expectedErr);
        assert(testRunner.failed, 'task should have set a result');
        assert(testRunner.invokedToolCount == 0, 'should exit before running Gulp');

        done();
    });

    it('fails when gulpjs not set', (done: MochaDone) => {
        this.timeout(1000);

        let testPath = path.join(__dirname, 'L0failsWhenGulpjsNotSet.js');
        let testRunner = new mocktest.MockTestRunner(testPath);
        testRunner.run();
        assert(testRunner.failed, 'task should have set a result');
        assert(testRunner.errorIssues.some(x => x.indexOf('Input required: gulpjs') >= 0), 'should have created issue: Input required: gulpjs');
        assert(testRunner.failed, 'task should have failed');
        assert(testRunner.invokedToolCount == 0, 'should exit before running gulp');

        done();
    });

    it('fails when gulpFile not found', (done: MochaDone) => {
        this.timeout(1000);

        let testPath = path.join(__dirname, 'L0failsWhenGulpFileNotFound.js');
        let testRunner = new mocktest.MockTestRunner(testPath);
        testRunner.run();
        assert(testRunner.failed, 'should have failed');
        var expectedErr = 'Not found gulpfile.js';
        assert(testRunner.errorIssues.some(x => x.indexOf(expectedErr) >= 0), 'should have said: ' + expectedErr);
        assert(testRunner.invokedToolCount == 0, 'should exit before running Gulp');

        done();
    });

    it('fails when gulp not exist globally or locally', (done: MochaDone) => {
        this.timeout(1000);

        let testPath = path.join(__dirname, 'L0failsWhenGulpNotExistsGloballyOrLocally.js');
        let testRunner = new mocktest.MockTestRunner(testPath);
        testRunner.run();
        assert(testRunner.invokedToolCount == 0, 'should exit before running Gulp');
        assert(testRunner.errorIssues.some(x => x.indexOf('loc_mock_GulpNotInstalled') >= 0));
        assert(testRunner.failed, 'task should have failed');

        done();
    });

    it('fails when npm fails', (done: MochaDone) => {
        this.timeout(1000);

        let testPath = path.join(__dirname, 'L0failsWhenNpmFails.js');
        let testRunner = new mocktest.MockTestRunner(testPath);
        testRunner.run();
        assert(testRunner.invokedToolCount == 2, 'should have exited before running gulp');
        var expectedErr = 'loc_mock_NpmFailed';
        assert(testRunner.errorIssues.some(x => x.indexOf(expectedErr) >= 0), 'should have said: ' + expectedErr);
        assert(testRunner.failed, 'task should have failed');

        done();
    });

    it('fails if gulp fails', (done: MochaDone) => {
        this.timeout(1000);

        let testPath = path.join(__dirname, 'L0failsWhenGulpFails.js');
        let testRunner = new mocktest.MockTestRunner(testPath);
        testRunner.run();
        assert(testRunner.ran('/usr/local/bin/gulp --gulpfile gulpfile.js'), 'it should have run gulp');
        assert(testRunner.invokedToolCount == 1, 'should have run npm and gulp');
        var expectedErr = 'loc_mock_GulpFailed';
        assert(testRunner.errorIssues.some(x => x.indexOf(expectedErr) >= 0), 'should have said: ' + expectedErr);
        assert(testRunner.failed, 'task should have failed');

        done();
    });

    it('fails when istanbul fails', (done: MochaDone) => {
        this.timeout(1000);

        let testPath = path.join(__dirname, 'L0failsWhenInstanbulFails.js');
        let testRunner = new mocktest.MockTestRunner(testPath);
        testRunner.run();
        assert(testRunner.ran('/usr/local/bin/gulp --gulpfile gulpfile.js'), 'it should have run gulp');
        assert(testRunner.invokedToolCount == 3, 'should have run npm, gulp and istanbul');
        assert(testRunner.errorIssues.some(x => x.indexOf("loc_mock_IstanbulFailed") >= 0), 'Istanbul should fail');
        assert(testRunner.failed, 'task should have failed');

        done();
    });

    it('fails when test result files input is not provided', (done: MochaDone) => {
        this.timeout(1000);

        let testPath = path.join(__dirname, 'L0failsWhenTestResultFilesInputNotSet.js');
        let testRunner = new mocktest.MockTestRunner(testPath);
        testRunner.run();
        assert(testRunner.errorIssues.some(x => x.indexOf('Input required: testResultsFiles') >= 0));
        assert(testRunner.failed, 'task should have failed');
        assert(testRunner.invokedToolCount == 0, 'should exit before running gulp');

        done();
    });

    it('warns and runs when test result files input does not match any file', (done: MochaDone) => {
        this.timeout(1000);

        let testPath = path.join(__dirname, 'L0warnsWhenTestResultFilesInputNotMatchAnyFile.js');
        let testRunner = new mocktest.MockTestRunner(testPath);
        testRunner.run();
        assert(testRunner.ran('/usr/local/bin/gulp --gulpfile gulpfile.js'), 'it should have run gulp');
        assert(testRunner.invokedToolCount == 1, 'should run completely');
        assert(testRunner.errorIssues.length == 0, 'should not have created an error issue');
        assert(testRunner.createdWarningIssue('No test result files matching /nonmatching/input/* were found, so publishing JUnit test results is being skipped.'), 'should give a warning for test file pattern not matched.');
        assert(testRunner.succeeded, 'should have succeeded');

        done();
    });

    it('fails when test source files input is not provided for coverage', (done: MochaDone) => {
        this.timeout(1000);

        let testPath = path.join(__dirname, 'L0failsWhenTestSourceFilesInputNotProvidedForCoverage.js');
        let testRunner = new mocktest.MockTestRunner(testPath);
        testRunner.run();
        assert(testRunner.errorIssues.some(x => x.indexOf('Input required: testFiles') >= 0));
        assert(testRunner.failed, 'task should have failed');
        assert(testRunner.invokedToolCount == 0, 'should exit before running gulp');

        done();
    });

    it('fails when test source files input does not match any file', (done: MochaDone) => {
        this.timeout(1000);

        let testPath = path.join(__dirname, 'L0failsWhenTestSourceFilesInputNotMatchAnyFile.js');
        let testRunner = new mocktest.MockTestRunner(testPath);
        testRunner.run();
        assert(testRunner.failed, 'task should have failed');
        assert(testRunner.invokedToolCount == 3, 'should exit while running istanbul');
        assert(testRunner.errorIssues.some(x => x.indexOf('loc_mock_IstanbulFailed') >= 0), 'should have said Istanbul failed');

        done();
    });
});