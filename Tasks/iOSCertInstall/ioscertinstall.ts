import path = require('path');
import tl = require('vsts-task-lib/task');
import sign = require('ios-signing-common/ios-signing-common');

import {ToolRunner} from 'vsts-task-lib/toolrunner';

async function run() {
    try {
        tl.setResourcePath(path.join( __dirname, 'task.json'));

        var certificate = tl.getInput('certificate', true);
        var password = tl.getInput('password', true);

        await sign.installCertInTemporaryKeychain('_tmpKeychain', 'tmpKeychainPW', certificate, password);
        tl.setResult(tl.TaskResult.Succeeded, "iOS certificate install succeeded");
    }
    catch(err) {
        tl.setResult(tl.TaskResult.Failed, err);
    } finally {
    }
}

run();
