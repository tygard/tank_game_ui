/* global URL */
import path from "node:path";
import fs from "node:fs";

const TEST_FILES_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), "test-files/");
const TEST_FILE_EXPR = /(^|\/)tank_game_v3_format_v(\d+)\.json/;

let allTestFiles = fs.readdirSync(TEST_FILES_DIR)
    .filter(fileName => TEST_FILE_EXPR.exec(fileName))
    .map(fileName => path.join(TEST_FILES_DIR, fileName));

allTestFiles.sort((fileA, fileB) => {
    const versionA = +TEST_FILE_EXPR.exec(fileA)[1];
    const versionB = +TEST_FILE_EXPR.exec(fileB)[1];

    return versionA - versionB;
});


/**
 * Get the test file for the most recent version
 */
export function getLatestFilePath() {
    return allTestFiles[allTestFiles.length - 1];
}

/**
 * Get the name of the test file for the most recent version
 */
export function getLatestFileName() {
    return path.parse(getLatestFilePath()).name;
}


/**
 * Get's all test files in order by version
 */
export function getAllFilePaths() {
    return allTestFiles;
}

/**
 * Get's the names of all test files in order by version
 */
export function getAllFileNames() {
    return allTestFiles
        .map(fileName => path.parse(fileName).name);
}