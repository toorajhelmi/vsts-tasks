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

    it('fails when gulpFile not found', (done) => {
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

// 	it('fails if gulp no exist globally and locally', (done) => {
// 		setResponseFile('gulpNoGulp.json');

// //L0failsWhenGulpNotExistsGloballyOrLocally.ts
// 		var tr = new trm.TaskRunner('Gulp');
// 		tr.setInput('gulpFile', 'gulpfile.js');
// 		tr.setInput('publishJUnitResults', 'true');
// 		tr.setInput('testResultsFiles', '**/build/test-results/TEST-*.xml');
// 		tr.setInput('enableCodeCoverage', 'false');
// 		if (os.type().match(/^Win/)) {
// 			tr.setInput('cwd', 'c:/fake/wd');
// 		}
// 		else {
// 			tr.setInput('cwd', '/fake/wd');
// 		}
// 		tr.setInput('gulpjs', 'node_modules/gulp/gulp.js');
// 		tr.run()
// 			.then(() => {
// 				assert(tr.invokedToolCount == 0, 'should exit before running Gulp');
// 				assert(tr.resultWasSet, 'task should have set a result');
// 				assert(tr.stderr.length > 0, 'should have written to stderr');
// 				assert(tr.stdErrContained('Gulp is not installed globally (or is not in the path of the user the agent is running as) and it is not in the local working folder'));
// 				assert(tr.failed, 'task should have failed');
// 				done();
// 			})
// 			.fail((err) => {
// 				done(err);
// 			});
// 	})

// 	it('fails if npm fails', (done) => {
// 		setResponseFile('npmFails.json');

// //L0failsWhenNpmFails.ts
// 		var tr = new trm.TaskRunner('Gulp');
// 		tr.setInput('gulpFile', 'gulpfile.js');
// 		tr.setInput('publishJUnitResults', 'true');
// 		tr.setInput('testResultsFiles', '**/build/test-results/TEST-*.xml');
// 		tr.setInput('enableCodeCoverage', 'true');
// 		tr.setInput('testFramework', 'Mocha');
// 		tr.setInput('srcFiles', '**/build/src/*.js');
// 		tr.setInput('testFiles', '**/build/test/*.js');
// 		if (os.type().match(/^Win/)) {
// 			tr.setInput('cwd', 'c:/fake/wd');
// 		}
// 		else {
// 			tr.setInput('cwd', '/fake/wd');
// 		}
// 		tr.setInput('gulpjs', 'node_modules/gulp/gulp.js');
// 		tr.run()
// 			.then(() => {
// 				assert(tr.invokedToolCount == 2, 'should have exited before running gulp');

// 				// success scripts don't necessarily set a result
// 				var expectedErr = '/usr/local/bin/npm failed with return code: 1';
// 				assert(tr.stdErrContained(expectedErr), 'should have said: ' + expectedErr);
// 				assert(tr.stderr.length > 0, 'should have written to stderr');
// 				assert(tr.failed, 'task should have failed');
// 				done();
// 			})
// 			.fail((err) => {
// 				done(err);
// 			});
// 	})

// //L0failsWhenGulpFails.ts
// 	it('fails if gulp fails', (done) => {
// 		setResponseFile('gulpFails.json');

// 		var tr = new trm.TaskRunner('Gulp');
// 		tr.setInput('gulpFile', 'gulpfile.js');
// 		tr.setInput('publishJUnitResults', 'true');
// 		tr.setInput('testResultsFiles', '**/build/test-results/TEST-*.xml');
// 		tr.setInput('enableCodeCoverage', 'false');
// 		if (os.type().match(/^Win/)) {
// 			tr.setInput('cwd', 'c:/fake/wd');
// 		}
// 		else {
// 			tr.setInput('cwd', '/fake/wd');
// 		}
// 		tr.setInput('gulpjs', 'node_modules/gulp/gulp.js');
// 		tr.run()
// 			.then(() => {
// 				assert(tr.ran('/usr/local/bin/gulp --gulpfile gulpfile.js'), 'it should have run gulp');
// 				assert(tr.invokedToolCount == 1, 'should have run npm and gulp');

// 				// success scripts don't necessarily set a result
// 				var expectedErr = '/usr/local/bin/gulp failed with return code: 1';
// 				assert(tr.stdErrContained(expectedErr), 'should have said: ' + expectedErr);
// 				assert(tr.stderr.length > 0, 'should have written to stderr');
// 				assert(tr.failed, 'task should have failed');
// 				done();
// 			})
// 			.fail((err) => {
// 				done(err);
// 			});
// 	})

// //L0failsWhenInstanbulFails.ts
// 	it('fails if istanbul fails', (done) => {
// 		setResponseFile('istanbulFails.json');

// 		var tr = new trm.TaskRunner('Gulp');
// 		tr.setInput('gulpFile', 'gulpfile.js');
// 		tr.setInput('publishJUnitResults', 'true');
// 		tr.setInput('testResultsFiles', '**/build/test-results/TEST-*.xml');
// 		tr.setInput('enableCodeCoverage', 'true');
// 		tr.setInput('testFramework', 'Mocha');
// 		tr.setInput('srcFiles', '**/build/src/*.js');
// 		tr.setInput('testFiles', '**/build/test/*.js');
// 		if (os.type().match(/^Win/)) {
// 			tr.setInput('cwd', 'c:/fake/wd');
// 		}
// 		else {
// 			tr.setInput('cwd', '/fake/wd');
// 		}
// 		tr.setInput('gulpjs', 'node_modules/gulp/gulp.js');
// 		tr.run()
// 			.then(() => {
// 				assert(tr.ran('/usr/local/bin/gulp --gulpfile gulpfile.js'), 'it should have run gulp');
// 				assert(tr.invokedToolCount == 3, 'should have run npm, gulp and istanbul');
// 				assert(tr.stdErrContained("Istanbul failed with error"), 'Istanbul should fail');
// 				assert(tr.stderr.length > 0, 'should have written to stderr');
// 				assert(tr.failed, 'task should have failed');
// 				done();
// 			})
// 			.fail((err) => {
// 				done(err);
// 			});
// 	})

// //L0failsWhenTestResultFilesInputNotSet.ts
// 	it('Fails when test result files input is not provided', (done) => {
//         setResponseFile('gulpGlobalGood.json');

//         var tr = new trm.TaskRunner('Gulp');
//         tr.setInput('gulpFile', 'gulpfile.js');
// 		tr.setInput('publishJUnitResults', 'true');
// 		tr.setInput('enableCodeCoverage', 'false');

// 		if (os.type().match(/^Win/)) {
// 			tr.setInput('cwd', 'c:/fake/wd');
// 		}
// 		else {
// 			tr.setInput('cwd', '/fake/wd');
// 		}
// 		tr.setInput('gulpjs', 'node_modules/gulp/gulp.js');

//         tr.run()
//             .then(() => {
// 				assert(tr.stderr.length > 0, 'should have written to stderr');
//                 assert(tr.stdErrContained('Input required: testResultsFiles'));
//                 assert(tr.failed, 'task should have failed');
//                 assert(tr.invokedToolCount == 0, 'should exit before running gulp');

//                 done();
//             })
//             .fail((err) => {
//                 done(err);
//             });
//     })

// //L0warnsWhenTestResultFilesInputNotMatchAnyFile
// 	it('gives warning and runs when test result files input does not match any file', (done) => {
//         setResponseFile('gulpGlobalGood.json');

//         var tr = new trm.TaskRunner('Gulp');
//         tr.setInput('gulpFile', 'gulpfile.js');
// 		tr.setInput('publishJUnitResults', 'true');
// 		tr.setInput('testResultsFiles', '/invalid/input');
// 		tr.setInput('enableCodeCoverage', 'false');

// 		if (os.type().match(/^Win/)) {
// 			tr.setInput('cwd', 'c:/fake/wd');
// 		}
// 		else {
// 			tr.setInput('cwd', '/fake/wd');
// 		}
// 		tr.setInput('gulpjs', 'node_modules/gulp/gulp.js');

//         tr.run()
//             .then(() => {
// 				assert(tr.ran('/usr/local/bin/gulp --gulpfile gulpfile.js'), 'it should have run gulp');
// 				assert(tr.stderr.length == 0, 'should not have written to stderr');
//                 assert(tr.invokedToolCount == 1, 'should run completely');
//                 assert(tr.stdout.search('No pattern found in testResultsFiles parameter') >= 0, 'should give a warning for test file pattern not matched.');
// 				done();
//             })
//             .fail((err) => {
//                 done(err);
//             });
//     })

// //L0failsWhenTestSourceFilesInputNotProvidedForCoverage.ts
// 	it('Fails when test source files input is not provided for coverage', (done) => {
//         setResponseFile('gulpGlobalGood.json');

//         var tr = new trm.TaskRunner('Gulp');
//         tr.setInput('gulpFile', 'gulpfile.js');
// 		tr.setInput('publishJUnitResults', 'true');
// 		tr.setInput('testResultsFiles', '**/build/test-results/TEST-*.xml');
// 		tr.setInput('enableCodeCoverage', 'true');
// 		tr.setInput('testFramework', 'Mocha');
// 		tr.setInput('srcFiles', '**/build/src/*.js');

// 		if (os.type().match(/^Win/)) {
// 			tr.setInput('cwd', 'c:/fake/wd');
// 		}
// 		else {
// 			tr.setInput('cwd', '/fake/wd');
// 		}
// 		tr.setInput('gulpjs', 'node_modules/gulp/gulp.js');

//         tr.run()
//             .then(() => {
// 				assert(tr.stderr.length > 0, 'should have written to stderr');
//                 assert(tr.stdErrContained('Input required: testFiles'));
//                 assert(tr.failed, 'task should have failed');
//                 assert(tr.invokedToolCount == 0, 'should exit before running gulp');

//                 done();
//             })
//             .fail((err) => {
//                 done(err);
//             });
//     })

// //L0failsWhenTestSourceFilesInputNotMatchAnyFile.ts
// 	it('fails when test source files input does not match any file', (done) => {
//         setResponseFile('invalidTestSource.json');

//         var tr = new trm.TaskRunner('Gulp');
//         tr.setInput('gulpFile', 'gulpfile.js');
// 		tr.setInput('publishJUnitResults', 'true');
// 		tr.setInput('testResultsFiles', '**/build/test-results/TEST-*.xml');
// 		tr.setInput('enableCodeCoverage', 'true');
// 		tr.setInput('testFramework', 'Mocha');
// 		tr.setInput('srcFiles', '**/build/src/*.js');
// 		tr.setInput('testFiles', '/invalid/input');

// 		if (os.type().match(/^Win/)) {
// 			tr.setInput('cwd', 'c:/fake/wd');
// 		}
// 		else {
// 			tr.setInput('cwd', '/fake/wd');
// 		}
// 		tr.setInput('gulpjs', 'node_modules/gulp/gulp.js');

//         tr.run()
//             .then(() => {
// 				assert(tr.stderr.length > 0, 'should have written to stderr');
// 				assert(tr.failed, 'task should have failed');
// 				assert(tr.invokedToolCount == 3, 'should exit while running istanbul');
// 				assert(tr.stdErrContained('Istanbul failed with error'));
// 				done();
//             })
//             .fail((err) => {
//                 done(err);
//             });
//     })
});