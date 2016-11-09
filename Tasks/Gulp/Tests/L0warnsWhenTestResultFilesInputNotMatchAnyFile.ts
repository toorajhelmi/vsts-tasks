import * as mockanswer from 'vsts-task-lib/mock-answer';
import * as mockrun from 'vsts-task-lib/mock-run';
import * as fs from 'fs';
import * as path from 'path';

let taskPath = path.join(__dirname, '..', 'gulptask.js');
let taskRunner = new mockrun.TaskMockRunner(taskPath);
let answersPath = path.join(__dirname, 'gulpGlobalGood.json');
let answers: mockanswer.TaskLibAnswers = JSON.parse(fs.readFileSync(answersPath).toString()) as mockanswer.TaskLibAnswers;
taskRunner.setAnswers(answers);
taskRunner.setInput('gulpFile', 'gulpfile.js');
taskRunner.setInput('publishJUnitResults', 'true');
taskRunner.setInput('testResultsFiles', '/nonmatching/input/*');
taskRunner.setInput('enableCodeCoverage', 'false');
if (process.platform == 'win32') {
    taskRunner.setInput('cwd', 'c:/fake/wd');
}
else {
    taskRunner.setInput('cwd', '/fake/wd');
}

taskRunner.setInput('gulpjs', 'node_modules/gulp/gulp.js');
taskRunner.run();

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