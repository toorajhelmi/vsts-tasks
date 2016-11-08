// /// <reference path="../../../definitions/mocha.d.ts"/>
// /// <reference path="../../../definitions/node.d.ts"/>

// import assert = require('assert');
// import trm = require('../../lib/taskRunner');
// import psm = require('../../lib/psRunner');
// import path = require('path');
// import shell = require('shelljs');
// import os = require('os');

// function setResponseFile(name: string) {
// 	process.env['MOCK_RESPONSES'] = path.join(__dirname, name);
// }

// describe('Gulp Suite', function () {
//     this.timeout(20000);

// 	before((done) => {
// 		// init here
// 		done();
// 	});

// 	after(function () {

// 	});

// 	it('fails if gulp no exist globally and locally', (done) => {
// 		setResponseFile('gulpNoGulp.json');

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
// });