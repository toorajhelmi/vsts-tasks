/// <reference path="../../definitions/node.d.ts" />

import * as tl from 'vsts-task-lib/task';
import * as tr from 'vsts-task-lib/toolrunner';
import * as path from 'path';
import * as Q from 'q';
import * as fs from 'fs';
import * as regedit from 'regedit';
import * as pref from 'performance-now';
import * as util from './utilities';
import * as trh from './testresultshelper';
import {Constants} from './constants';

interface ExecutabaleInfo {
    version: number;
    location: string;
}

tl.setResourcePath(path.join(__dirname, 'task.json'));

// get all the task inputs. keep them const and never change what's the user input
const vsTestVersion: string = tl.getInput('vsTestVersion');
const vstestLocationMethod: string = tl.getInput('vstestLocationMethod');
const vstestLocation: string = tl.getPathInput('vsTestLocation');
const testAssembly: string[] = tl.getDelimitedInput('testAssemblyVer2', '\n', true);
const testFiltercriteria: string = tl.getInput('testFiltercriteria');
const runSettingsFile: string = tl.getPathInput('runSettingsFile');
const codeCoverageEnabled: boolean = tl.getBoolInput('codeCoverageEnabled');
const pathtoCustomTestAdapters: string = tl.getInput('pathtoCustomTestAdapters');
const overrideTestrunParameters: string = tl.getInput('overrideTestrunParameters');
const otherConsoleOptions: string = tl.getInput('otherConsoleOptions');
const testRunTitle: string = tl.getInput('testRunTitle');
const platform: string = tl.getInput('platform');
const configuration: string = tl.getInput('configuration');
const publishRunAttachments: string = tl.getInput('publishRunAttachments');
const runInParallel: boolean = tl.getBoolInput('runInParallel');
const tiaEnabled: boolean = tl.getBoolInput('runOnlyImpactedTests');

// default inputs
const releaseUri = tl.getVariable('release.releaseUri');
const workingDir = tl.getVariable('System.DefaultWorkingDirectory');
const vs15HelperPath = path.join(__dirname, 'vs15Helper.ps1');

// some internal variables which are not coming from user
//The name of input "runOnlyImpactedTests" need to be updated for purpose of logging onprem telemetry as well.
const tiaRebaseLimit: string = tl.getInput('runAllTestsAfterXBuilds');
const searchFolder: string = tl.getInput('searchFolder');
const fileLevel = tl.getVariable('tia.filelevel');
const sourcesDir = tl.getVariable('build.sourcesdirectory');
const useNewCollectorFlag = tl.getVariable('tia.useNewCollector');
const isPrFlow = tl.getVariable('tia.isPrFlow');
const ignoreVstestFailure: string = tl.getVariable('vstest.ignoretestfailures');
const useNewCollector: boolean = useNewCollectorFlag && useNewCollectorFlag.toUpperCase() === 'TRUE';
const context: string = releaseUri ? 'CD' : 'CI';

// parameters required from test impact. 
// TODO fix - kick these only when test impact is on
const runIdFile = path.join(os.tmpdir(), uuid.v1() + '.txt');
const baseLineBuildIdFile = path.join(os.tmpdir(), uuid.v1() + '.txt');
const vstestDiagFile = path.join(os.tmpdir(), uuid.v1() + '.txt');
const disableTIA = tl.getVariable('DisableTestImpactAnalysis');


// TODO print all the inputs

const testAssemblyFiles: string[] = getTestAssemblies(searchFolder, workingDir);
if (!testAssemblyFiles || testAssemblyFiles.length === 0) {
    tl.command('task.issue', {type: 'warning', code: '002004'}, tl.loc('NoMatchingTestAssemblies'));
    tl.setResult(tl.TaskResult.Succeeded, 'Task Succeeded');
    return;
}

// ################ Core functions ########################


const testResultsDir = trh.getTestResultsDirectory(runSettingsFile, path.join(workingDir, 'TestResults'));

invokeVSTest(testResultsDir)
    .then(function(code) {
        try {
            if (!isTiaAllowed()) {
                trh.publishTestResults(resultsDirectory);
            }
            tl.setResult(code, tl.loc('VstestReturnCode', code));
            deleteVstestDiagFile();
        }
        catch (error) {
            deleteVstestDiagFile();
            tl._writeLine('##vso[task.logissue type=error;code=' + error + ';TaskName=VSTest]');
            throw error;
        }
    })
    .fail(function(err) {
        deleteVstestDiagFile();
        tl._writeLine('##vso[task.logissue type=error;code=' + err + ';TaskName=VSTest]');
        throw err;
    });


function getTestAssemblies(searchFolder: string, defaultDir: string): string[] {
    if (isNullOrWhitespace(searchFolder)) {
        searchFolder = defaultDir;
        tl.debug('Search directory empty, defaulting to ' + searchFolder);
    }
    tl.debug('Searching for test assemblies in: ' + searchFolder);
    return tl.findMatch(searchFolder, testAssembly);
}



function getVstestArguments(settingsFile: string, tiaEnabled: boolean): string[] {
    const argsArray: string[] = [];
    testAssemblyFiles.forEach(function(testAssembly) {
        let testAssemblyPath = testAssembly;
        //To maintain parity with the behaviour when test assembly was filepath, try to expand it relative to build sources directory.
        if (workingDir && !pathExistsAsFile(testAssembly)) {
            const expandedPath = path.join(workingDir, testAssembly);
            if (pathExistsAsFile(expandedPath)) {
                testAssemblyPath = expandedPath;
            }
        }
        argsArray.push(testAssemblyPath);
    });
    if (testFiltercriteria) {
        if (!tiaEnabled) {
            argsArray.push('/TestCaseFilter:' + testFiltercriteria);
        }
        else {
            tl.debug('Ignoring TestCaseFilter because Test Impact is enabled');

        }
    }
    if (settingsFile && pathExistsAsFile(settingsFile)) {
        argsArray.push('/Settings:' + settingsFile);
    }
    if (codeCoverageEnabled) {
        argsArray.push('/EnableCodeCoverage');
    }
    if (otherConsoleOptions) {
        argsArray.push(otherConsoleOptions);
    }
    argsArray.push('/logger:trx');
    if (pathtoCustomTestAdapters) {
        if (pathExistsAsDirectory(pathtoCustomTestAdapters)) {
            argsArray.push('/TestAdapterPath:\"' + pathtoCustomTestAdapters + '\"');
        }
        else {
            argsArray.push('/TestAdapterPath:\"' + path.dirname(pathtoCustomTestAdapters) + '\"');
        }
    }
    else if (workingDir && isNugetRestoredAdapterPresent(workingDir)) {
        argsArray.push('/TestAdapterPath:\"' + workingDir + '\"');
    }

    const sysDebug = tl.getVariable('System.Debug');
    if (sysDebug !== undefined && sysDebug.toLowerCase() === 'true') {
        if (vsTestVersionForTIA !== null && (vsTestVersionForTIA[0] > 15 || (vsTestVersionForTIA[0] === 15 && (vsTestVersionForTIA[1] > 0 || vsTestVersionForTIA[2] > 25428)))) {
            argsArray.push('/diag:' + vstestDiagFile);
        }
        else {
            tl.warning(tl.loc('VstestDiagNotSupported'));
        }
    }

    return argsArray;
}

function addVstestArgs(argsArray: string[], vstest: any) {
    argsArray.forEach(function(arr: string) {
        vstest.arg(arr);
    });
}



function getVSTestLocation(vsVersion: number): string {
    if (vstestLocationMethod.toLowerCase() === 'version') {
        const vsCommon: string = tl.getVariable('VS' + vsVersion + '0COMNTools');
        if (!vsCommon) {
            throw (new Error(tl.loc('VstestNotFound', vsVersion)));
        } else {
            return path.join(vsCommon, '..\\IDE\\CommonExtensions\\Microsoft\\TestWindow\\vstest.console.exe');
        }
    } else if (vstestLocationMethod.toLowerCase() === 'location') {
        if (!util.pathExistsAsFile(vstestLocation)) {
            if (util.pathExistsAsDirectory(vstestLocation)) {
                return path.join(vstestLocation, 'vstest.console.exe');
            } else {
                throw (new Error(tl.loc('PathDoesNotExist', vstestLocation)));
            }
        } else {
            return vstestLocation;
        }
    }
}

function executeVstest(testResultsDirectory: string, parallelRunSettingsFile: string, vsVersion: number, argsArray: string[]): any {
    const vstest = tl.tool(vstestLocation);
    addVstestArgs(argsArray, vstest);

    tl.rmRF(testResultsDirectory, true);
    tl.mkdirP(testResultsDirectory);
    tl.cd(workingDirectory);

    const ignoreTestFailures = ignoreVstestFailure && ignoreVstestFailure.toLowerCase() === 'true';
    return await vstest.exec(<tr.IExecOptions>{ failOnStdErr: !ignoreTestFailures });
}

function getVstestTestsList(vsVersion: number): Q.Promise<string> {
    const defer = Q.defer<string>();
    const tempFile = path.join(os.tmpdir(), uuid.v1() + '.txt');
    tl.debug('Discovered tests listed at: ' + tempFile);
    const argsArray: string[] = [];

    testAssemblyFiles.forEach(function(testAssembly) {
        let testAssemblyPath = testAssembly;
        if (workingDir && !pathExistsAsFile(testAssembly)) {
            const expandedPath = path.join(workingDir, testAssembly);
            if (pathExistsAsFile(expandedPath)) {
                testAssemblyPath = expandedPath;
            }
        }
        argsArray.push(testAssemblyPath);
    });

    tl.debug('The list of discovered tests is generated at ' + tempFile);

    argsArray.push('/ListFullyQualifiedTests');
    argsArray.push('/ListTestsTargetPath:' + tempFile);
    if (testFiltercriteria) {
        argsArray.push('/TestCaseFilter:' + testFiltercriteria);
    }
    if (pathtoCustomTestAdapters) {
        if (pathExistsAsDirectory(pathtoCustomTestAdapters)) {
            argsArray.push('/TestAdapterPath:\"' + pathtoCustomTestAdapters + '\"');
        }
        else {
            argsArray.push('/TestAdapterPath:\"' + path.dirname(pathtoCustomTestAdapters) + '\"');
        }
    }
    else if (workingDir && isNugetRestoredAdapterPresent(workingDir)) {
        argsArray.push('/TestAdapterPath:\"' + workingDir + '\"');
    }

    if ((otherConsoleOptions && otherConsoleOptions.toLowerCase().indexOf('usevsixextensions:true') !== -1) || (pathtoCustomTestAdapters && pathtoCustomTestAdapters.toLowerCase().indexOf('usevsixextensions:true') !== -1)) {
        argsArray.push('/UseVsixExtensions:true');
    }

    const vstest = tl.tool(vstestLocation);
    addVstestArgs(argsArray, vstest);

    tl.cd(workingDirectory);
    vstest.exec(<tr.IExecOptions>{ failOnStdErr: true })
        .then(function(code) {
            defer.resolve(tempFile);
        })
        .fail(function(err) {
            tl.debug('Listing tests from VsTest failed.');
            tl.error(err);
            defer.resolve(err);
        });
    return defer.promise;
}

function cleanFiles(responseFile: string, listFile: string): void {
    tl.debug('Deleting the response file ' + responseFile);
    tl.rmRF(responseFile, true);
    tl.debug('Deleting the discovered tests file ' + listFile);
    tl.rmRF(listFile, true);
    tl.debug('Deleting the baseline build id file ' + baseLineBuildIdFile);
    tl.rmRF(baseLineBuildIdFile, true);
}

function runVsTest(testResultsDirectory: string, settingsFile: string, vsVersion: number): number {
    return await executeVstest(testResultsDirectory, settingsFile, vsVersion, getVstestArguments(settingsFile, false));
}

function runVsTestWithTestImpact(testResultsDirectory: string, settingsFile: string, vsVersion: number): Q.Promise<number> {
    await publishCodeChanges();
    await getVstestTestsList(vsVersion);
    await generateResponseFile(listFile);
    const isEmptyFile: boolean = await isEmptyResponseFile(responseFile);
    if(isEmptyFile){
                                    tl.debug('Empty response file detected. All tests will be executed.');
                                    executeVstest(testResultsDirectory, settingsFile, vsVersion, getVstestArguments(settingsFile, false))
                                        .then(function(vscode) {
                                            uploadTestResults(testResultsDirectory)
                                                .then(function(code) {
                                                    if (!isNaN(+code) && +code !== 0) {
                                                        defer.resolve(+code);
                                                    }
                                                    else if (vscode !== 0) {
                                                        defer.resolve(vscode);
                                                    }

                                                    defer.resolve(0);
                                                })
                                                .fail(function(code) {
                                                    tl.debug('Test Run Updation failed!');
                                                    defer.resolve(1);
                                                })
                                                .finally(function() {
                                                    cleanFiles(responseFile, listFile);
                                                    tl.debug('Deleting the run id file' + runIdFile);
                                                    tl.rmRF(runIdFile, true);
                                                });
                                        })
                                        .fail(function(code) {
                                            defer.resolve(code);
                                        })
                                        .finally(function() {
                                            cleanFiles(responseFile, listFile);
                                        });
                                }
                                else {
                                    responseContainsNoTests(responseFile)
                                        .then(function(noTestsAvailable) {
                                            if (noTestsAvailable) {
                                                tl.debug('No tests impacted. Not running any tests.');
                                                uploadTestResults('')
                                                    .then(function(code) {
                                                        if (!isNaN(+code) && +code !== 0) {
                                                            defer.resolve(+code);
                                                        }
                                                        defer.resolve(0);
                                                    })
                                                    .fail(function(code) {
                                                        tl.debug('Test Run Updation failed!');
                                                        defer.resolve(1);
                                                    })
                                                    .finally(function() {
                                                        cleanFiles(responseFile, listFile);
                                                        tl.debug('Deleting the run id file' + runIdFile);
                                                        tl.rmRF(runIdFile, true);
                                                    });
                                            }
                                            else {
                                                updateResponseFile(getVstestArguments(settingsFile, true), responseFile)
                                                    .then(function(updatedFile) {
                                                        executeVstest(testResultsDirectory, settingsFile, vsVersion, ['@' + updatedFile])
                                                            .then(function(vscode) {
                                                                uploadTestResults(testResultsDirectory)
                                                                    .then(function(code) {
                                                                        if (!isNaN(+code) && +code !== 0) {
                                                                            defer.resolve(+code);
                                                                        }
                                                                        else if (vscode !== 0) {
                                                                            defer.resolve(vscode);
                                                                        }

                                                                        defer.resolve(0);
                                                                    })
                                                                    .fail(function(code) {
                                                                        tl.debug('Test Run Updation failed!');
                                                                        defer.resolve(1);
                                                                    })
                                                                    .finally(function() {
                                                                        cleanFiles(responseFile, listFile);
                                                                        tl.debug('Deleting the run id file' + runIdFile);
                                                                        tl.rmRF(runIdFile, true);
                                                                    });
                                                            })
                                                            .fail(function(code) {
                                                                defer.resolve(code);
                                                            })
                                                            .finally(function() {
                                                                cleanFiles(responseFile, listFile);
                                                            });
                                                    })
                                                    .fail(function(err) {
                                                        tl.error(err);
                                                        tl.warning(tl.loc('ErrorWhileUpdatingResponseFile', responseFile));
                                                        executeVstest(testResultsDirectory, settingsFile, vsVersion, getVstestArguments(settingsFile, false))
                                                            .then(function(vscode) {
                                                                uploadTestResults(testResultsDirectory)
                                                                    .then(function(code) {
                                                                        if (!isNaN(+code) && +code !== 0) {
                                                                            defer.resolve(+code);
                                                                        }
                                                                        else if (vscode !== 0) {
                                                                            defer.resolve(vscode);
                                                                        }

                                                                        defer.resolve(0);
                                                                    })
                                                                    .fail(function(code) {
                                                                        tl.debug('Test Run Updation failed!');
                                                                        defer.resolve(1);
                                                                    })
                                                                    .finally(function() {
                                                                        cleanFiles(responseFile, listFile);
                                                                        tl.debug('Deleting the run id file' + runIdFile);
                                                                        tl.rmRF(runIdFile, true);
                                                                    });
                                                            })
                                                            .fail(function(code) {
                                                                defer.resolve(code);
                                                            }).finally(function() {
                                                                cleanFiles(responseFile, listFile);
                                                            });
                                                    });
                                            }
                                        });
                                }
                            })
                            .fail(function(err) {
                                tl.error(err);
                                tl.warning(tl.loc('ErrorWhileCreatingResponseFile'));
                                executeVstest(testResultsDirectory, settingsFile, vsVersion, getVstestArguments(settingsFile, false))
                                    .then(function(vscode) {
                                        uploadTestResults(testResultsDirectory)
                                            .then(function(code) {
                                                if (!isNaN(+code) && +code !== 0) {
                                                    defer.resolve(+code);
                                                }
                                                else if (vscode !== 0) {
                                                    defer.resolve(vscode);
                                                }

                                                defer.resolve(0);
                                            })
                                            .fail(function(code) {
                                                tl.debug('Test Run Updation failed!');
                                                defer.resolve(1);
                                            })
                                            .finally(function() {
                                                tl.debug('Deleting the discovered tests file' + listFile);
                                                tl.rmRF(listFile, true);
                                            });
                                    })
                                    .fail(function(code) {
                                        defer.resolve(code);
                                    });
                            });
                    })
                    .fail(function(err) {
                        tl.error(err);
                        tl.warning(tl.loc('ErrorWhileListingDiscoveredTests'));
                        defer.resolve(1);
                    });
            })
            .fail(function(err) {
                tl.error(err);
                tl.warning(tl.loc('ErrorWhilePublishingCodeChanges'));
                executeVstest(testResultsDirectory, settingsFile, vsVersion, getVstestArguments(settingsFile, false))
                    .then(function(code) {
                        publishTestResults(testResultsDirectory);
                        defer.resolve(code);
                    })
                    .fail(function(code) {
                        defer.resolve(code);
                    });
            });
    }
}

function invokeVSTest(vsTestVersion: string, testResultsDirectory: string): Q.Promise<number> {
    if (vsTestVersion.toLowerCase() === 'latest') {
        vsTestVersion = null;
        //TODO what sort of logic is this
    }

    const overriddenRunSettingsFile = overrideTestRunParametersIfRequired(runSettingsFile, overrideTestrunParameters);
    //TODO if nothing found?
    const vsExecInfo: ExecutabaleInfo = locateVSVersion(vsTestVersion);
    let tiaEnabled: boolean = false;
    if (disableTIA !== undefined && disableTIA.toLowerCase() === 'true') {
        tiaEnabled = false;
    }

    if (tiaEnabled) {
        const vsTestVersionForTIA: number[] = getVsTestVersion();
        if (vsTestVersionForTIA === null || vsTestVersionForTIA[0] < 15
            || (vsTestVersionForTIA[0] === 15 && vsTestVersionForTIA[1] === 0 && vsTestVersionForTIA[2] < 25727) {
            tl.warning(tl.loc('VstestTIANotSupported'));
            tiaEnabled = false;
        }
    }

    const settingsFile = setupSettingsFileForTestImpact(overriddenRunSettingsFile);

    // TODO fix run only in parallel
    setRunInParallellIfApplicable(vsExecInfo.version);
    setupRunSettingsFileForParallel(settingsFile);
    
    if (tiaEnabled) {
        runVsTestWithTestImpact(testResultsDirectory, settingsFile, vsExecInfo.version);
    }else{
        runVsTest(testResultsDirectory, settingsFile, vsExecInfo.version);
    }
}

function cleanUp(temporarySettingsFile: string) {
    //cleanup the runsettings file
    if (temporarySettingsFile && runSettingsFile !== temporarySettingsFile) {
        try {
            tl.rmRF(temporarySettingsFile, true);
        }
        catch (error) {
            //ignore. just cleanup.
        }
    }
}

function isNugetRestoredAdapterPresent(rootDirectory: string): boolean {
    const allFiles = tl.find(rootDirectory);
    const adapterFiles = tl.match(allFiles, '**\\packages\\**\\*TestAdapter.dll', { matchBase: true });
    if (adapterFiles && adapterFiles.length !== 0) {
        for (let i = 0; i < adapterFiles.length; i++) {
            const adapterFile = adapterFiles[i];
            const packageIndex = adapterFile.indexOf('packages') + 7;
            const packageFolder = adapterFile.substr(0, packageIndex);
            const parentFolder = path.dirname(packageFolder);
            const solutionFiles = tl.match(allFiles, path.join(parentFolder, '*.sln'), { matchBase: true });
            if (solutionFiles && solutionFiles.length !== 0) {
                return true;
            }
        }
    }
    return false;
}







