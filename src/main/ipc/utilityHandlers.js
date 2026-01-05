/**
 * IPC Handlers for utility operations: HAR analysis, CSV/Excel parsing, file uploads
 * @module ipc/utilityHandlers
 */

const { dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { analyzeHAR } = require('../../shared/harAnalyzer');
const { parseEmailsFromCSVContent, parseEmailsFromExcelFile } = require('../../shared/csvExporter');
const { analyzeEmailPatternFromFile } = require('../../shared/email_pattern_analyzer');
const { rememberPath, isAllowedPath } = require('../security/ipcSecurity');

/**
 * Register all utility-related IPC handlers
 * @param {Electron.IpcMain} ipcMain - The Electron IPC main instance
 * @param {Function} logDebug - Debug logging function
 */
function registerUtilityHandlers(ipcMain, logDebug) {
    // Note: har:selectFile and har:analyze are registered in fileHandlers.js
    
    // CSV Parsing
    ipcMain.handle('parseEmailsFromCSV', async (event, csvContent) => {
        try {
            const emails = parseEmailsFromCSVContent(csvContent);
            return emails;
        } catch (error) {
            console.error('[parseEmailsFromCSV] Error:', error);
            throw error;
        }
    });

    // Excel Parsing
    ipcMain.handle('parseEmailsFromExcel', async (event, { filePath, fileBuffer }) => {
        const rendererId = event.sender.id;
        if (filePath && !isAllowedPath(rendererId, filePath, 'read')) {
            const error = `[parseEmailsFromExcel] Access denied: path not in allowlist: ${filePath}`;
            logDebug(error, { rendererId });
            throw new Error(error);
        }
        try {
            const emails = parseEmailsFromExcelFile(filePath, fileBuffer);
            return emails;
        } catch (error) {
            console.error('[parseEmailsFromExcel] Error:', error);
            throw error;
        }
    });

    // Email Pattern Analysis
    ipcMain.handle('analyzeEmailPattern', async (event, filePath, emailColumnIndex = 4) => {
        const rendererId = event.sender.id;
        if (!isAllowedPath(rendererId, filePath, 'read')) {
            const error = `[analyzeEmailPattern] Access denied: path not in allowlist: ${filePath}`;
            logDebug(error, { rendererId });
            throw new Error(error);
        }
        try {
            const analysis = analyzeEmailPatternFromFile(filePath, emailColumnIndex);
            return analysis;
        } catch (error) {
            console.error('[analyzeEmailPattern] Error:', error);
            throw error;
        }
    });

    // File Upload: Analyze Email File
    ipcMain.handle('fileUpload:analyzeEmailFile', async (event) => {
        const rendererId = event.sender.id;
        const result = await dialog.showOpenDialog({
            title: 'Select CSV or Excel File',
            properties: ['openFile'],
            filters: [
                { name: 'CSV Files', extensions: ['csv'] },
                { name: 'Excel Files', extensions: ['xlsx', 'xls'] }
            ]
        });

        if (result.canceled || result.filePaths.length === 0) {
            return { canceled: true };
        }

        const filePath = result.filePaths[0];
        rememberPath(rendererId, filePath, 'read');
        const ext = path.extname(filePath).toLowerCase();

        try {
            let emails = [];
            if (ext === '.csv') {
                const content = fs.readFileSync(filePath, 'utf8');
                emails = parseEmailsFromCSVContent(content);
            } else if (ext === '.xlsx' || ext === '.xls') {
                emails = parseEmailsFromExcelFile(filePath);
            }
            return { canceled: false, filePath, emails };
        } catch (error) {
            console.error('[fileUpload:analyzeEmailFile] Error:', error);
            throw error;
        }
    });

    // File Upload: Get User IDs from File
    ipcMain.handle('fileUpload:getUserIdsFromFile', async () => {
        const result = await dialog.showOpenDialog({
            title: 'Select File with User IDs',
            properties: ['openFile'],
            filters: [
                { name: 'CSV Files', extensions: ['csv'] },
                { name: 'Text Files', extensions: ['txt'] }
            ]
        });

        if (result.canceled || result.filePaths.length === 0) {
            return null;
        }

        const filePath = result.filePaths[0];
        const content = fs.readFileSync(filePath, 'utf8');
        const userIds = content.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
        return userIds;
    });

    // File Upload: Pick CSV or ZIP
    ipcMain.handle('fileUpload:pickCsvOrZip', async (event) => {
        const rendererId = event.sender.id;
        const result = await dialog.showOpenDialog({
            title: 'Select CSV or ZIP File',
            properties: ['openFile'],
            filters: [
                { name: 'CSV or ZIP', extensions: ['csv', 'zip'] }
            ]
        });

        if (result.canceled || result.filePaths.length === 0) {
            return null;
        }

        const filePath = result.filePaths[0];
        rememberPath(rendererId, filePath, 'read');
        return filePath;
    });

    // File Upload: Read File
    ipcMain.handle('fileUpload:readFile', async (event, payload) => {
        const rendererId = event.sender.id;
        const { filePath } = payload;
        if (!isAllowedPath(rendererId, filePath, 'read')) {
            throw new Error(`Access denied: ${filePath}`);
        }
        return fs.readFileSync(filePath, 'utf8');
    });

    // File Upload: Read File Buffer
    ipcMain.handle('fileUpload:readFileBuffer', async (event, payload) => {
        const rendererId = event.sender.id;
        const { filePath } = payload;
        if (!isAllowedPath(rendererId, filePath, 'read')) {
            throw new Error(`Access denied: ${filePath}`);
        }
        return fs.readFileSync(filePath);
    });

    // File Upload: Write Errors File
    ipcMain.handle('fileUpload:writeErrorsFile', async (event, payload) => {
        const rendererId = event.sender.id;
        const { filePath, content } = payload;
        const dir = path.dirname(filePath);

        const dirResult = await dialog.showOpenDialog({
            title: 'Select Save Location',
            properties: ['openDirectory']
        });

        if (dirResult.canceled || dirResult.filePaths.length === 0) {
            return { canceled: true };
        }

        const savePath = path.join(dirResult.filePaths[0], path.basename(filePath));
        rememberPath(rendererId, savePath, 'write');
        fs.writeFileSync(savePath, content, 'utf8');
        return { canceled: false, filePath: savePath };
    });
}

module.exports = { registerUtilityHandlers };
