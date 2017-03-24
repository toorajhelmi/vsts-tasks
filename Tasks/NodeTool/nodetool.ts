//import toolLib = require('vsts-task-tool-lib/tool');
//import taskLib = require('vsts-task-lib/task');
import * as toolLib from 'vsts-task-tool-lib/tool';
import * as taskLib from 'vsts-task-lib/task';
import * as restm from 'typed-rest-client/RestClient';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

let osPlat: string = os.platform();
let osArch: string = os.arch();

async function run() {
    try {
        let versionSpec = taskLib.getInput('versionSpec', true);
        let onlyLTS: boolean = taskLib.getBoolInput('onlyLTS', false);

        await getNode(versionSpec, onlyLTS);
    }
    catch (error) {
        taskLib.setResult(taskLib.TaskResult.Failed, error.message);
    }
}

//
// Node versions interface
// see https://nodejs.org/dist/index.json
//
interface INodeVersion {
    version: string,
    lts: any,
    files: string[]
}

//
// Basic pattern:
//     version = find and evaluate local versions
//          use latest match 
//     if version not found locally
//          // let's query
//          if versionSpec is explicit version
//               versionToGet = versionSpec
//          else
//               versionToGet = query and evaluate internet tool provider
//          
//          download versionToGet
//          Extract or move to cache download
//
//      find tool path by version
//      prepend $PATH with toolpath
//
async function getNode(versionSpec: string, onlyLTS: boolean) {
    //
    // Let's try and resolve the versions spec locally first
    //
    let localVersions: string[] = toolLib.findLocalToolVersions('node');
    let version: string = toolLib.evaluateVersions(localVersions, versionSpec);

    if (version) {
        console.log('Resolved from tool cache: %s', version);
    }
    else {
        //
        // Let's query and resolve the latest version for the versionSpec
        // If the version is an explicit version (1.1.1 or v1.1.1) then no need to query    
        //
        if (toolLib.isExplicitVersion(versionSpec)) {
            // given exact version to get
            toolLib.debug('explicit match ' + versionSpec);
            version = versionSpec;
        }
        else {
            // let's query for version
            let versions: string[] = [];

            // node offers a json list of versions
            let dataFileName: string;
            switch (osPlat) {
                case "linux": dataFileName = "linux-" + osArch; break;
                case "darwin": dataFileName = "osx-" + osArch + '-tar'; break;
                case "win32": dataFileName = "win-" + osArch + '-exe'; break;
                default: throw new Error(`Unexpected OS '${osPlat}'`);
            }

            let dataUrl = "https://nodejs.org/dist/index.json";
            let ltsMap : {[version: string]: string} = {};
            let rest: restm.RestClient = new restm.RestClient('tool-sample');
            let nodeVersions: INodeVersion[] = (await rest.get<INodeVersion[]>(dataUrl)).result;
            nodeVersions.forEach((nodeVersion:INodeVersion) => {
                // ensure this version supports your os and platform
                let compatible: boolean = nodeVersion.files.indexOf(dataFileName) >= 0;

                if (compatible) {
                    if (!onlyLTS || (nodeVersion.lts && onlyLTS)) {
                        versions.push(nodeVersion.version);
                    }
                    
                    if (nodeVersion.lts) {
                        ltsMap[nodeVersion.version] = nodeVersion.lts;
                    }
                }
            });

            //
            // get the latest version that matches the version spec
            //
            version = toolLib.evaluateVersions(versions, versionSpec);
            if (!version) {
                throw new Error(`Unable to find Node version '${versionSpec}' for platform ${osPlat} and architecture ${osArch}.`);
            }

            toolLib.debug('version from index.json ' + version);
            toolLib.debug('isLTS:' + ltsMap[version]);
        }

        //
        // Download and Install
        //
        toolLib.debug('download ' + version);

        // a tool installer intimately knows how to get that tools (and construct urls)
        let fileName: string = osPlat == 'win32'? 'node-' + version + '-win-' + os.arch() :
                                            'node-' + version + '-' + osPlat + '-' + os.arch();  
        let urlFileName: string = osPlat == 'win32'? fileName + '.7z':
                                                     fileName + '.tar.gz';  

        let downloadUrl = 'https://nodejs.org/dist/' + version + '/' + urlFileName; 

        let downloadPath: string = await toolLib.downloadTool(downloadUrl);

        //
        // Extract the tar and install it into the local tool cache
        //
        let extPath: string;
        if (osPlat == 'win32') {
            taskLib.assertAgent('2.115.0');
            extPath = taskLib.getVariable('Agent.TempDirectory');
            if (!extPath) {
                throw new Error('Expected Agent.TempDirectory to be set');
            }

            extPath = path.join(extPath, 'n'); // use as short a path as possible due to nested node_modules folders
            extPath = await toolLib.extract7z(downloadPath, extPath);
        }
        else {
            extPath = await toolLib.extractTar(downloadPath);
        }

        // node extracts with a root folder that matches the fileName downloaded
        let toolRoot = path.join(extPath, fileName);
        
        toolLib.cacheDir(toolRoot, 'node', version);
    }

    console.log('using version: ' + version);

    //
    // a tool installer initimately knows details about the layout of that tool
    // for example, node binary is in the bin folder after the extract on Mac/Linux.
    // layouts could change by version, by platform etc... but that's the tool installers job
    //
    let toolPath: string = toolLib.findLocalTool('node', version);
    if (osPlat != 'win32') {
        toolPath = path.join(toolPath, 'bin');
    }

    console.log('using tool path: ' + toolPath);

    //
    // prepend the tools path. instructs the agent to prepend for future tasks
    //
    toolLib.prependPath(toolPath);
    console.log();
}

run();
