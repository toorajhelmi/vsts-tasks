import * as tl from 'vsts-task-lib/task';
import * as Q from 'q';
import * as fs from 'fs';
import * as path from 'path';
import * as xml2js from 'xml2js';
import * as str from 'string';
import * as uuid from 'node-uuid';
import * as os from 'os';

let stripbom = require('strip-bom');

export interface GetOrCreateResult<T> {
    created: boolean;
    result: T;
}

// returns true if path exists and it is a directory else false.
export function isDirectoryExists(path: string): boolean {
    try {
        return tl.stats(path).isDirectory();
    } catch (error) {
        return false;
    }
}

// returns true if path exists and it is a file else false.
export function isFileExists(path: string): boolean {
    try {
        return tl.stats(path).isFile();
    } catch (error) {
        return false;
    }
}

// returns true if given string is null or whitespace.
export function isNullOrWhitespace(input) {
    if (typeof input === 'undefined' || input == null) {
        return true;
    }
    return input.replace(/\s/g, '').length < 1;
}

// returns empty string if the given value is undefined or null.
export function trimToEmptyString(input) {
    if (typeof input === 'undefined' || input == null) {
        return '';
    }
    return input.trim();
}

export function readXmlFileAsJson(filePath: string): Q.Promise<any> {
    tl.debug('Reading XML file: ' + filePath);
    return readFile(filePath, 'utf-8')
        .then(convertXmlStringToJson);
}

export function convertJsonToXml(jsonContent: any): string {
    const builder = new xml2js.Builder();
    let xml = builder.buildObject(jsonContent);
    xml = str(xml).replaceAll('&#xD;', '').s;
    return xml;
}

export function writeJsonAsXmlFile(filePath: string, jsonContent: any): Q.Promise<void> {
    return writeFile(filePath, convertJsonToXml(jsonContent));
}
export function readFile(filePath: string, encoding: string): Q.Promise<string> {
    return Q.nfcall<string>(fs.readFile, filePath, encoding);
}

export function writeFile(filePath: string, fileContent: string): Q.Promise<void> {
    return Q.nfcall<void>(fs.writeFile, filePath, fileContent, { encoding: 'utf-8' });
}

export function convertXmlStringToJson(xmlContent: string): Q.Promise<any> {
    tl.debug('Converting XML file to JSON');
    return Q.nfcall<any>(xml2js.parseString, stripbom(xmlContent));
}

export function pathExistsAsFile(path: string) {
    return tl.exist(path) && tl.stats(path).isFile();
}

export function pathExistsAsDirectory(path: string) {
    return tl.exist(path) && tl.stats(path).isDirectory();
}

export function createTempFile(fileName: string, fileContent: string): string{
    const filePath = path.join(os.tmpdir(), uuid.v1(), fileName);
    fs.writeFileSync(filePath, fileContent);
    return filePath;
}

export function getFloatsFromStringArray(inputArray: string[]): number[] {
    const outputArray: number[] = [];
    let count;
    if (inputArray) {
        for (count = 0; count < inputArray.length; count++) {
            const floatValue = parseFloat(inputArray[count]);
            if (!isNaN(floatValue)) {
                outputArray.push(floatValue);
            }
        }
    }
    return outputArray;
}

