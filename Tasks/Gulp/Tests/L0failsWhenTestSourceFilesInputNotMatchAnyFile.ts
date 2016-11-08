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
// });