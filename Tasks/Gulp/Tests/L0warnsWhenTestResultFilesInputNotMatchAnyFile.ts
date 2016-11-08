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
// });