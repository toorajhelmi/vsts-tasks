import * as mockanswer from 'vsts-task-lib/mock-answer';
import * as mockrun from 'vsts-task-lib/mock-run';
import * as fs from 'fs';
import * as path from 'path';

let taskPath = path.join(__dirname, '..', 'gulptask.js');
let taskRunner = new mockrun.TaskMockRunner(taskPath);
let answersPath = path.join(__dirname, 'gulpLocalGood.json');
let answers: mockanswer.TaskLibAnswers = JSON.parse(fs.readFileSync(answersPath).toString()) as mockanswer.TaskLibAnswers;
taskRunner.setAnswers(answers);
taskRunner.setInput('gulpFile', 'gulpfile.js');
taskRunner.setInput('publishJUnitResults', 'true');
taskRunner.setInput('testResultsFiles', '**/build/test-results/TEST-*.xml');
taskRunner.setInput('enableCodeCoverage', 'false');
if (process.platform == 'win32') {
    taskRunner.setInput('cwd', 'c:/fake/wd');
}
else {
    taskRunner.setInput('cwd', '/fake/wd');
}

taskRunner.setInput('gulpjs', 'node_modules/gulp/gulp.js');
taskRunner.run();