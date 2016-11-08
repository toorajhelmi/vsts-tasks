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
// });