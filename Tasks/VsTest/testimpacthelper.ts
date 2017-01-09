import * as tl from 'vsts-task-lib/task';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as uuid from 'node-uuid';

function updateResponseFile(argsArray: string[], responseFile: string): Q.Promise<string> {
    const defer = Q.defer<string>();
    argsArray.forEach(function(arr, i) {
        if (!arr.startsWith('/')) {
            argsArray[i] = '\"' + arr + '\"';
        }
    });
    fs.appendFile(responseFile, os.EOL + argsArray.join(os.EOL), function(err) {
        if (err) {
            defer.reject(err);
        }
        defer.resolve(responseFile);
    });
    return defer.promise;
}

function getTraceCollectorUri(): string {
    return 'file://' + path.join(__dirname, 'TestSelector/Microsoft.VisualStudio.TraceCollector.dll');
}

function generateResponseFile(discoveredTests: string): Q.Promise<string> {
    let endTime: number;
    let elapsedTime: number;
    const defer = Q.defer<string>();
    const respFile = path.join(os.tmpdir(), uuid.v1() + '.txt');
    tl.debug('Response file will be generated at ' + respFile);
    tl.debug('RunId file will be generated at ' + runIdFile);
    const selectortool = tl.tool(getTestSelectorLocation());
    selectortool.arg('GetImpactedtests');
    selectortool.arg('/TfsTeamProjectCollection:' + tl.getVariable('System.TeamFoundationCollectionUri'));
    selectortool.arg('/ProjectId:' + tl.getVariable('System.TeamProject'));

    if (context === 'CD') {
        // Release context. Passing Release Id.
        selectortool.arg('/buildid:' + tl.getVariable('Release.ReleaseId'));
        selectortool.arg('/releaseuri:' + tl.getVariable('release.releaseUri'));
        selectortool.arg('/releaseenvuri:' + tl.getVariable('release.environmentUri'));
    } else {
        // Build context. Passing build id.
        selectortool.arg('/buildid:' + tl.getVariable('Build.BuildId'));
    }

    selectortool.arg('/token:' + tl.getEndpointAuthorizationParameter('SystemVssConnection', 'AccessToken', false));
    selectortool.arg('/responsefile:' + respFile);
    selectortool.arg('/DiscoveredTests:' + discoveredTests);
    selectortool.arg('/runidfile:' + runIdFile);
    selectortool.arg('/testruntitle:' + testRunTitle);
    selectortool.arg('/BaseLineFile:' + baseLineBuildIdFile);
    selectortool.arg('/platform:' + platform);
    selectortool.arg('/configuration:' + configuration);
    selectortool.arg('/Context:' + context);

    selectortool.exec()
        .then(function(code) {
            defer.resolve(respFile);
        })
        .fail(function(err) {
            defer.reject(err);
        });

    return defer.promise;
}

function publishCodeChanges(): Q.Promise<string> {
    let endTime: number;
    let elapsedTime: number;
    const defer = Q.defer<string>();

    let newprovider = 'true';
    if (getTIALevel() === 'method') {
        newprovider = 'false';
    }

    const selectortool = tl.tool(getTestSelectorLocation());
    selectortool.arg('PublishCodeChanges');
    selectortool.arg('/TfsTeamProjectCollection:' + tl.getVariable('System.TeamFoundationCollectionUri'));
    selectortool.arg('/ProjectId:' + tl.getVariable('System.TeamProject'));

    if (context === 'CD') {
        // Release context. Passing Release Id.
        selectortool.arg('/buildid:' + tl.getVariable('Release.ReleaseId'));
        selectortool.arg('/Definitionid:' + tl.getVariable('release.DefinitionId'));
    } else {
        // Build context. Passing build id.
        selectortool.arg('/buildid:' + tl.getVariable('Build.BuildId'));
        selectortool.arg('/Definitionid:' + tl.getVariable('System.DefinitionId'));
    }

    selectortool.arg('/token:' + tl.getEndpointAuthorizationParameter('SystemVssConnection', 'AccessToken', false));
    selectortool.arg('/SourcesDir:' + sourcesDir);
    selectortool.arg('/newprovider:' + newprovider);
    selectortool.arg('/BaseLineFile:' + baseLineBuildIdFile);

    if (isPrFlow && isPrFlow.toUpperCase() === 'TRUE') {
        selectortool.arg('/IsPrFlow:' + 'true');
    }

    if (tiaRebaseLimit) {
        selectortool.arg('/RebaseLimit:' + tiaRebaseLimit);
    }
    selectortool.arg('/Context:' + context);

    selectortool.exec()
        .then(function(code) {
            endTime = perf();
            elapsedTime = endTime - startTime;
            tl.debug(tl.loc('PublishCodeChangesPerfTime', elapsedTime));
            defer.resolve(String(code));
        })
        .fail(function(err) {
            defer.reject(err);
        });

    return defer.promise;
}

function getTestSelectorLocation(): string {
    return path.join(__dirname, 'TestSelector/TestSelector.exe');
}

function isEmptyResponseFile(responseFile: string): boolean {
    if (pathExistsAsFile(responseFile) && tl.stats(responseFile).size) {
        return false;
    }
    return true;
}

function isTiaAllowed(): boolean {
    if (tiaEnabled && getTestSelectorLocation()) {
        return true;
    }
    return false;
}

function getTIALevel() {
    if (fileLevel && fileLevel.toUpperCase() === 'FALSE') {
        return 'method';
    }
    return 'file';
}

function responseContainsNoTests(filePath: string): Q.Promise<boolean> {
    return readFileContents(filePath, 'utf-8').then(function(resp) {
        if (resp === '/Tests:') {
            return true;
        }
        else {
            return false;
        }
    });
}

function setupSettingsFileForTestImpact(settingsFile: string): string {
    //TODO fix this
    const exitErrorMessage = 'Error occured while setting in test impact data collector. Continuing...';

    if (settingsFile && settingsFile.split('.').pop().toLowerCase() === 'testsettings') {
        updateTestSettingsFileForTestImpact(settingsFile);
    } else if (!settingsFile || settingsFile.split('.').pop().toLowerCase() !== 'runsettings' || !pathExistsAsFile(settingsFile)) {
        return createRunSettingsForTestImpact(settingsFile);
    } else {
        updateRunSettingsFileForTestImpact(settingsFile);
    }

    return settingsFile;
}

function createRunSettingsForTestImpact(settingsFile: string): string {
    let runSettingsForTIA = '<?xml version="1.0" encoding="utf-8"?><RunSettings><DataCollectionRunSettings><DataCollectors>' +
        '<DataCollector uri="' + Constants.testImpactCollectorURI + '" ' +
        'assemblyQualifiedName="' + Constants.testImpactAssemblyQualifiedName + '" ' +
        'friendlyName="' + Constants.testImpactFriendlyName + '" ';

    if (useNewCollector) {
        runSettingsForTIA = runSettingsForTIA +
            'codebase="' + getTraceCollectorUri() + '"';
    }

    runSettingsForTIA = runSettingsForTIA +
        ' >' +
        '<Configuration>' +
        '<ImpactLevel>' + getTIALevel() + '</ImpactLevel>';

    if (getTIALevel() === 'file') {
        runSettingsForTIA = runSettingsForTIA +
            '<LogFilePath>' + 'true' + '</LogFilePath>';
    }

    runSettingsForTIA = runSettingsForTIA +
        '<RootPath>' + (context === 'CD' ? '' : sourcesDir) + '</RootPath>' +
        '</Configuration>' +
        '</DataCollector>' +
        '</DataCollectors></DataCollectionRunSettings></RunSettings>';

    return util.createTempFile('vstest.runsettings', runSettingsForTIA);
}

function updateTestSettingsFileForTestImpact(settingsFile: string): void {
    const defer = Q.defer<string>();
    tl.debug('Adding test impact data collector element to testsettings file provided.');
    const xmlContent = util.readXmlFileAsJson(settingsFile);
    if (xmlContent) {
        updatTestSettings(xmlContent);
    }else{
        // TODO write warning
    }
}

function updatTestSettings(result: any) {
    let dataCollectorNode = null;
    if (!result.TestSettings) {
        tl.debug('Updating testsettings file from TestSettings node');
        result.TestSettings = { Execution: { AgentRule: { DataCollectors: { DataCollector: { Configuration: roothPathGenerator() } } } } };
        result.TestSettings.Execution.AgentRule.$ = { name: Constants.testImpactTestSettingsAgentNameTag };
        result.TestSettings.$ = { name: Constants.testImpactTestSettingsNameTag,
            id: Constants.testImpactTestSettingsIDTag, xmlns: Constants.testImpactTestSettingsXmlnsTag };
        dataCollectorNode = result.TestSettings.Execution.AgentRule.DataCollectors.DataCollector;
    }
    else if (!result.TestSettings.Execution) {
        tl.debug('Updating testsettings file from Execution node');
        result.TestSettings.Execution = { AgentRule: { DataCollectors: { DataCollector: { Configuration: roothPathGenerator() } } } };
        result.TestSettings.Execution.AgentRule.$ = { name: Constants.testImpactTestSettingsAgentNameTag };
        dataCollectorNode = result.TestSettings.Execution.AgentRule.DataCollectors.DataCollector;
    }
    else if (!result.TestSettings.Execution[0].AgentRule) {
        tl.debug('Updating testsettings file from AgentRule node');
        result.TestSettings.Execution[0] = { AgentRule: { DataCollectors: { DataCollector: { Configuration: roothPathGenerator() } } } };
        result.TestSettings.Execution[0].AgentRule.$ = { name: Constants.testImpactTestSettingsAgentNameTag };
        dataCollectorNode = result.TestSettings.Execution[0].AgentRule.DataCollectors.DataCollector;
    }
    else if (!result.TestSettings.Execution[0].AgentRule[0].DataCollectors) {
        tl.debug('Updating testsettings file from DataCollectors node');
        result.TestSettings.Execution[0].AgentRule[0] = { DataCollectors: { DataCollector: { Configuration: roothPathGenerator() } } };
        dataCollectorNode = result.TestSettings.Execution[0].AgentRule[0].DataCollectors.DataCollector;
    }
    else {
        const dataCollectorArray = result.TestSettings.Execution[0].AgentRule[0].DataCollectors[0].DataCollector;
        if (!dataCollectorArray) {
            tl.debug('Updating testsettings file from DataCollector node');
            result.TestSettings.Execution[0].AgentRule[0].DataCollectors[0] = { DataCollector: { Configuration: roothPathGenerator() } };
            dataCollectorNode = result.TestSettings.Execution[0].AgentRule[0].DataCollectors[0].DataCollector;
        }
        else {
            if (!isTestImapctCollectorPresent(dataCollectorArray)) {
                tl.debug('Updating testsettings file, adding a DataCollector node');
                dataCollectorArray.push({ Configuration: roothPathGenerator() });
                dataCollectorNode = dataCollectorArray[dataCollectorArray.length - 1];
            }
            else {
                pushImpactLevelAndRootPathIfNotFound(dataCollectorArray);
            }
        }
    }
    if (dataCollectorNode) {
        tl.debug('Setting attributes for test impact data collector');
        if (useNewCollector) {
            dataCollectorNode.$ = getTestImpactAttributes();
        }
        else {
            dataCollectorNode.$ = getTestImpactAttributesWithoutNewCollector(vsVersion);
        }
    }
}

function updateRunSettings(result: any) {
    let dataCollectorNode = null;
    if (!result.RunSettings) {
        tl.debug('Updating runsettings file from RunSettings node');
        result.RunSettings = { DataCollectionRunSettings: { DataCollectors: { DataCollector: { Configuration: roothPathGenerator() } } } };
        dataCollectorNode = result.RunSettings.DataCollectionRunSettings.DataCollectors.DataCollector;
    } else if (!result.RunSettings.DataCollectionRunSettings) {
        tl.debug('Updating runsettings file from DataCollectionSettings node');
        result.RunSettings.DataCollectionRunSettings = { DataCollectors: { DataCollector: { Configuration: roothPathGenerator() } } };
        dataCollectorNode = result.RunSettings.DataCollectionRunSettings.DataCollectors.DataCollector;
    } else if (!result.RunSettings.DataCollectionRunSettings[0].DataCollectors) {
        tl.debug('Updating runsettings file from DataCollectors node');
        result.RunSettings.DataCollectionRunSettings[0] = { DataCollectors: { DataCollector: { Configuration: roothPathGenerator() } } };
        dataCollectorNode = result.RunSettings.DataCollectionRunSettings[0].DataCollectors.DataCollector;
    } else {
        const dataCollectorArray = result.RunSettings.DataCollectionRunSettings[0].DataCollectors[0].DataCollector;
        if (!dataCollectorArray) {
            tl.debug('Updating runsettings file from DataCollector node');
            result.RunSettings.DataCollectionRunSettings[0] = { DataCollectors: { DataCollector: { Configuration: roothPathGenerator() } } };
            dataCollectorNode = result.RunSettings.DataCollectionRunSettings[0].DataCollectors.DataCollector;
        } else {
            if (!isTestImapctCollectorPresent(dataCollectorArray)) {
                tl.debug('Updating runsettings file, adding a DataCollector node');
                dataCollectorArray.push({ Configuration: roothPathGenerator() });
                dataCollectorNode = dataCollectorArray[dataCollectorArray.length - 1];
            } else {
                pushImpactLevelAndRootPathIfNotFound(dataCollectorArray);
            }
        }
    }
    if (dataCollectorNode) {
        tl.debug('Setting attributes for test impact data collector');
        if (useNewCollector) {
            dataCollectorNode.$ = getTestImpactAttributes();
        } else {
            dataCollectorNode.$ = getTestImpactAttributesWithoutNewCollector();
        }
    }
}

function updateRunSettingsFileForTestImpact(settingsFile: string): void {
    tl.debug('Adding test impact data collector element to runsettings file provided.');

    const xmlContent = util.readXmlFileAsJson(settingsFile);
    if(xmlContent){
        updateRunSettings(xmlContent);
        util.writeJsonAsXmlFile(settingsFile, xmlContent);
    }else{
        //TODO write something
    }
}

function roothPathGenerator(): any {
    if (context) {
        if (context === 'CD') {
            return { ImpactLevel: getTIALevel(), RootPath: '' };
        } else {
            return { ImpactLevel: getTIALevel(), RootPath: sourcesDir };
        }
    }
}

function pushImpactLevelAndRootPathIfNotFound(dataCollectorArray): void {
    tl.debug('Checking for ImpactLevel and RootPath nodes in TestImpact collector');
    const tiaFriendlyName = Constants.testImpactFriendlyName.toUpperCase();
    const arrayLength = dataCollectorArray.length;
    for (let i = 0; i < arrayLength; i++) {
        if (dataCollectorArray[i].$.friendlyName && dataCollectorArray[i].$.friendlyName.toUpperCase() === tiaFriendlyName) {
            if (!dataCollectorArray[i].Configuration) {
                dataCollectorArray[i] = { Configuration: {} };
            }
            if (dataCollectorArray[i].Configuration.TestImpact && !dataCollectorArray[i].Configuration.RootPath) {
                if (context && context === 'CD') {
                    dataCollectorArray[i].Configuration = { RootPath: '' };
                } else {
                    dataCollectorArray[i].Configuration = { RootPath: sourcesDir };
                }
            } else if (!dataCollectorArray[i].Configuration.TestImpact && dataCollectorArray[i].Configuration.RootPath) {
                if (getTIALevel() === 'file') {
                    dataCollectorArray[i].Configuration = { ImpactLevel: getTIALevel(), LogFilePath: 'true' };
                } else {
                    dataCollectorArray[i].Configuration = { ImpactLevel: getTIALevel() };
                }
            } else if (dataCollectorArray[i].Configuration && !dataCollectorArray[i].Configuration.TestImpact && !dataCollectorArray[i].Configuration.RootPath) {
                if (context && context === 'CD') {
                    if (getTIALevel() === 'file') {
                        dataCollectorArray[i].Configuration = { ImpactLevel: getTIALevel(), LogFilePath: 'true', RootPath: '' };
                    } else {
                        dataCollectorArray[i].Configuration = { ImpactLevel: getTIALevel(), RootPath: '' };
                    }
                } else {
                    if (getTIALevel() === 'file') {
                        dataCollectorArray[i].Configuration = { ImpactLevel: getTIALevel(), LogFilePath: 'true', RootPath: sourcesDir };
                    } else {
                        dataCollectorArray[i].Configuration = { ImpactLevel: getTIALevel(), RootPath: sourcesDir };
                    }
                }
            }

            //Adding the codebase attribute to TestImpact collector 
            tl.debug('Adding codebase attribute to the existing test impact collector');
            if (useNewCollector) {
                if (!dataCollectorArray[i].$.codebase) {
                    dataCollectorArray[i].$.codebase = getTraceCollectorUri();
                }
            }
        }
    }
}


function getTestImpactAttributes() {
    return {
        uri: Constants.testImpactCollectorURI,
        assemblyQualifiedName: Constants.testImpactAssemblyQualifiedName,
        friendlyName: Constants.testImpactFriendlyName,
        codebase: getTraceCollectorUri()
    };
}

function getTestImpactAttributesWithoutNewCollector() {
    return {
        uri: Constants.testImpactCollectorURI,
        assemblyQualifiedName: Constants.testImpactAssemblyQualifiedName,
        friendlyName: Constants.testImpactFriendlyName
    };
}

function isTestImapctCollectorPresent(dataCollectorArray: any): boolean {
    for (const node of dataCollectorArray) {
        if (node.$.friendlyName && node.$.friendlyName.toUpperCase() === Constants.testImpactFriendlyName.toUpperCase()) {
            tl.debug('Test impact data collector already present, will not add the node.');
            return true;
        }
    }
    return false;
}

