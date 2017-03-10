import path = require('path');
import tl = require('vsts-task-lib/task');
import sign = require('ios-signing-common/ios-signing-common');

import { ToolRunner } from 'vsts-task-lib/toolrunner';

async function run() {
    try {
        tl.setResourcePath(path.join(__dirname, 'task.json'));

        //clean up the temporary keychain, so it is not used to search for code signing identity in future builds
        var keychainToDelete = tl.getVariable('XCODE_KEYCHAIN_TO_DELETE');
        if (keychainToDelete) {
            try {
                await sign.deleteKeychain(keychainToDelete);
            } catch (err) {
                tl.debug('Failed to delete temporary keychain. Error = ' + err);
                tl.warning(tl.loc('TempKeychainDeleteFailed', keychainToDelete));
            }
        }

        //delete provisioning profile if specified
        var profileToDelete = tl.getVariable('XCODE_PROFILE_TO_DELETE');
        if (profileToDelete) {
            try {
                await sign.deleteProvisioningProfile(profileToDelete);
            } catch (err) {
                tl.debug('Failed to delete provisioning profile. Error = ' + err);
                tl.warning(tl.loc('ProvProfileDeleteFailed', profileToDelete));
            }
        }

    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, err);
    }
}

run();