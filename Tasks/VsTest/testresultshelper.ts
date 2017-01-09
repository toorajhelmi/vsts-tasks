import * as tl from 'vsts-task-lib/task';
import * as path from 'path';
import * as util from './utilities';
import * as pref from 'performance-now';

export interface PublishTestResultsModel {
    platform: string;
    configuration: string;
    testRunTitle: string;
    publishRunAttachments: string;
    testResultsDirectory: string;
    mergeResults: boolean;
}

export function publishTestResults(testResultsDirectory: string) {
    if (!testResultsDirectory) {
        tl._writeLine('##vso[task.logissue type=warning;code=002003;]');
        tl.warning(tl.loc('NoResultsToPublish'));
        return;
    }

    // TODO accept TestResults Model
    const resultFiles = tl.findMatch(testResultsDirectory, path.join(testResultsDirectory, '*.trx'));
    if (resultFiles && resultFiles.length !== 0) {
        const tp = new tl.TestPublisher('VSTest');
        tp.publish(resultFiles, 'false', platform, configuration, testRunTitle, publishRunAttachments);
    } else {
        tl._writeLine('##vso[task.logissue type=warning;code=002003;]');
        tl.warning(tl.loc('NoResultsToPublish'));
    }
}

export function getTestResultsDirectory(settingsFile: string, defaultResultsDirectory: string): string {
    if (!settingsFile || !util.pathExistsAsFile(settingsFile)) {
        return defaultResultsDirectory;
    }

    const xmlContent = await util.readXmlFileAsJson(settingsFile);
    if (!xmlContent) {
        tl.warning('Error occured while reading test result directory from run settings. Continuing...');
        return defaultResultsDirectory;
    }

    if (xmlContent.RunSettings && xmlContent.RunSettings.RunConfiguration && xmlContent.RunSettings.RunConfiguration[0] &&
            xmlContent.RunSettings.RunConfiguration[0].ResultsDirectory) {
            const resultDirectory = xmlContent.RunSettings.RunConfiguration[0].ResultsDirectory[0];

            if (resultDirectory && resultDirectory[0].length > 0) {
                // path.resolve will take care if the result directory given in settings files is not absolute.
                return path.resolve(path.dirname(settingsFile), resultDirectory[0].trim());
            }
    }
    return defaultResultsDirectory;
}

export function uploadTestResults(testResultsDirectory: string): string {
    let resultFiles;
    if (!util.isNullOrWhitespace(testResultsDirectory)) {
        resultFiles = tl.findMatch(testResultsDirectory, path.join(testResultsDirectory, '*.trx'));
    }

    const selectortool = tl.tool(getTestSelectorLocation());
    selectortool.arg('UpdateTestResults');
    selectortool.arg('/TfsTeamProjectCollection:' + tl.getVariable('System.TeamFoundationCollectionUri'));
    selectortool.arg('/ProjectId:' + tl.getVariable('System.TeamProject'));
    selectortool.arg('/buildid:' + tl.getVariable('Build.BuildId'));
    selectortool.arg('/token:' + tl.getEndpointAuthorizationParameter('SystemVssConnection', 'AccessToken', false));

    if (resultFiles && resultFiles[0]) {
        selectortool.arg('/ResultFile:' + resultFiles[0]);
    }
    selectortool.arg('/runidfile:' + runIdFile);
    selectortool.arg('/Context:' + context);
    return await selectortool.exec();
}

function getTestSelectorLocation(): string {
    return path.join(__dirname, 'TestSelector/TestSelector.exe');
}