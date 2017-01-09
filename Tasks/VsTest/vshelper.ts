import * as tl from 'vsts-task-lib/task';
import * as regedit from 'regedit';
import * as util from './utilities';
import * as path from 'path';

const vs15PsScript = path.join(__dirname, 'vs15Helper.ps1');

export interface ExecutabaleInfo {
    version: number;
    location: string;
}

//TODO why WMIC
function getVsTestVersion(vstestLocation: string): number[] {
    const vstestLocationEscaped = vstestLocation.replace(/\\/g, '\\\\');
    const wmicTool = tl.tool('wmic');
    const wmicArgs = ['datafile', 'where', 'name=`${vstestLocationEscaped}`', 'get', 'Version', '/Value'];
    wmicTool.arg(wmicArgs);
    const output = wmicTool.execSync();

    const verSplitArray = output.stdout.split('=');
    if (verSplitArray.length !== 2) {
        tl.warning(tl.loc('ErrorReadingVstestVersion'));
        return null;
    }

    const versionArray = verSplitArray[1].split('.');
    if (versionArray.length !== 4) {
        tl.warning(tl.loc('UnexpectedVersionString', output.stdout));
        return null;
    }

    const vsVersion: number[] = [];
    vsVersion[0] = parseInt(versionArray[0]);
    vsVersion[1] = parseInt(versionArray[1]);
    vsVersion[2] = parseInt(versionArray[2]);

    if (isNaN(vsVersion[0]) || isNaN(vsVersion[1]) || isNaN(vsVersion[2])) {
        tl.warning(tl.loc('UnexpectedVersionNumber', verSplitArray[1]));
        return null;
    }

    return vsVersion;
}

function locateVSVersion(version: string): ExecutabaleInfo {
    const vsVersion: number = parseFloat(version);
    if (isNaN(vsVersion) || vsVersion === 15) {
        // latest
        tl.debug('Searching for latest Visual Studio');
        const vstestconsole15Path = getVSTestConsole15Path();
        if (vstestconsole15Path) {
            return {version: 15, location: vstestconsole15Path};
        } else {
            return getLatestVSTestConsolePathFromRegistry();
        }
    } else {
        return {version: vsVersion, location: getVSTestLocation(vsVersion)};
    }
}

function getVSTestConsole15Path(vs15PsScript: string): string {
    const powershellTool = tl.tool('powershell');
    const powershellArgs = ['-file', vs15PsScript]
    powershellTool.arg(powershellArgs);

    const json = util.convertXmlStringToJson(powershellTool.execSync().stdout);
    if (json && json.Objs && json.Objs.S && json.Objs.S[0]){
        return json.Objs.S[0];
    }

    return null;
}

function getLatestVSTestConsolePathFromRegistry(): ExecutabaleInfo {
    const regPath = 'HKLM\\SOFTWARE\\Microsoft\\VisualStudio';
    regedit.list(regPath).on('data', (entry) => {
        const subkeys = entry.data.keys;
        const versions = util.getFloatsFromStringArray(subkeys);
        if (versions && versions.length > 0) {
            versions.sort((a, b) => a - b);
            const selectedVersion = versions[versions.length - 1];
            tl.debug('Registry entry found. Selected version is ' + selectedVersion.toString());
            return {version: selectedVersion, location: getVSTestLocation(selectedVersion)};
        } else {
            return null;
        }
    }).on('error', () => {
        return null;
    });

    return null;
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