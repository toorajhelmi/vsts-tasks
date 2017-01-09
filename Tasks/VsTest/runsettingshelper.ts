function setRunInParallellIfApplicable(vsVersion: number): void {
    if (!runInParallel || isNaN(vsVersion) || vsVersion >= 15 || vsVersion < 14) {
        return;
    }

    const vs14Common: string = tl.getVariable('VS140COMNTools');
    if (vs14Common && util.pathExistsAsFile(path.join(vs14Common, '..\\IDE\\CommonExtensions\\Microsoft\\TestWindow\\TE.TestModes.dll'))) {
        setRegistryKeyForParallelExecution(vsVersion);
        return;
    }
}

function setRegistryKeyForParallelExecution(vsVersion: number) {
    const regKey = 'HKCU\\SOFTWARE\\Microsoft\\VisualStudio\\' + vsVersion.toFixed(1) + '_Config\\FeatureFlags\\TestingTools\\UnitTesting\\Taef';
    regedit.createKey(regKey, function(err) {
        if (!err) {
            const values = {
                [regKey]: {
                    'Value': {
                        value: '1',
                        type: 'REG_DWORD'
                    }
                }
            };
            regedit.putValue(values, function(err) {
                if (err) {
                    tl.warning(tl.loc('ErrorOccuredWhileSettingRegistry', err));
                }
            });
        } else {
            tl.warning(tl.loc('ErrorOccuredWhileSettingRegistry', err));
        }
    });
}

function setupRunSettingsFileForParallel(settingsFile: string): string {
    if (settingsFile && settingsFile.split('.').pop().toLowerCase() === 'testsettings') {
        tl.warning(tl.loc('RunInParallelNotSupported'));
        return settingsFile;
    }

    if (!settingsFile || settingsFile.split('.').pop().toLowerCase() !== 'runsettings' || !pathExistsAsFile(settingsFile)) {
        tl.debug('No settings file provided or the provided settings file does not exist.');
        return util.createTempFile('vstest.runsettings', Constants.runSettingsForParallel);
    }

    const xmlContent = util.readXmlFileAsJson(settingsFile);
    if (!xmlContent || !xmlContent.RunSettings) {
        tl.warning(tl.loc('FailedToSetRunInParallel'));
        return settingsFile;
    }

    xmlContent.RunSettings = { RunConfiguration: { MaxCpuCount: 0 } };
    if (!xmlContent.RunSettings.RunConfiguration || !xmlContent.RunSettings.RunConfiguration[0]) {
        xmlContent.RunSettings.RunConfiguration = { MaxCpuCount: 0 };
    } else {
        const runConfigArray = xmlContent.RunSettings.RunConfiguration[0];
        runConfigArray.MaxCpuCount = 0;
    }
    util.writeJsonAsXmlFile(settingsFile, xmlContent);
    return settingsFile;
}

// TODO fix call if overrideTestrunParameters is set
function overrideTestRunParametersIfRequired(settingsFile: string, overrideTestrunParameters: string): string {
    if (!settingsFile || !util.pathExistsAsFile(settingsFile)
        || !overrideTestrunParameters || overrideTestrunParameters.trim().length === 0) {
        return settingsFile;
    }

    overrideTestrunParameters = overrideTestrunParameters.trim();
    const overrideParameters = {};

    const parameterStrings = overrideTestrunParameters.split(';');
    parameterStrings.forEach(function(parameterString: string) {
        const pair = parameterString.split('=', 2);
        if (pair.length === 2) {
            const key = pair[0];
            const value = pair[1];
            if (!overrideParameters[key]) {
                overrideParameters[key] = value;
            }
        }
    });

    const xmlContent = util.readXmlFileAsJson(settingsFile);
    if (xmlContent.RunSettings && xmlContent.RunSettings.TestRunParameters && xmlContent.RunSettings.TestRunParameters[0] &&
        xmlContent.RunSettings.TestRunParameters[0].Parameter) {
        const parametersArray = xmlContent.RunSettings.TestRunParameters[0].Parameter;
        parametersArray.forEach(function(parameter) {
            const key = parameter.$.name;
            if (overrideParameters[key]) {
                parameter.$.value = overrideParameters[key];
            }
        });

        //TODO fix this
        const runSettingsFile = util.createTempFile('vstest.runsettings', util.convertJsonToXml(xmlContent));
        return runSettingsFile;
    }

    return settingsFile;
}