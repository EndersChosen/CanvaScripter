/**
 * File Operations IPC Handlers
 * 
 * Registers IPC handlers for file system operations with security controls:
 * - File/folder selection dialogs
 * - File reading with allowlist validation
 * - File writing with allowlist validation
 * - CSV/Excel parsing
 * - HAR file analysis
 */

const { ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

/**
 * Register all file operation IPC handlers
 * @param {Object} options - Configuration options
 * @param {BrowserWindow} options.mainWindow - Main application window
 * @param {Object} options.security - Security module (ipcSecurity.js)
 * @param {Object} options.parsers - File parsing functions
 * @param {Object} options.harAnalyzer - HAR analyzer module
 */
function registerFileHandlers({ mainWindow, security, parsers, harAnalyzer }) {
    const { rememberPath, isAllowedPath, allowedReadPaths, allowedWritePaths, allowedDirPaths } = security;

    // Folder selection
    ipcMain.handle('sis:selectFolder', async (event) => {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory']
        });
        if (result.canceled) return null;
        const folderPath = result.filePaths[0];
        rememberPath(allowedDirPaths, event.sender.id, folderPath);
        return folderPath;
    });

    // File selection
    ipcMain.handle('sis:selectFile', async (event, options = {}) => {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openFile'],
            filters: options.filters || [{ name: 'All Files', extensions: ['*'] }]
        });
        if (result.canceled) return null;
        const filePath = result.filePaths[0];
        rememberPath(allowedReadPaths, event.sender.id, filePath);
        return { filePath };
    });

    // File reading with security check
    ipcMain.handle('sis:readFile', async (event, filePath) => {
        try {
            if (!isAllowedPath(allowedReadPaths, event.sender.id, filePath)) {
                throw new Error('Access denied: file was not selected via dialog');
            }
            const content = fs.readFileSync(filePath, 'utf8');
            return content;
        } catch (error) {
            throw new Error(`Failed to read file: ${error.message}`);
        }
    });

    // Save dialog
    ipcMain.handle('file:save', async (event, options = {}) => {
        const result = await dialog.showSaveDialog(mainWindow, {
            defaultPath: options.defaultPath || 'download.txt',
            filters: options.filters || [{ name: 'All Files', extensions: ['*'] }]
        });
        if (result.canceled) return null;
        if (result.filePath) {
            rememberPath(allowedWritePaths, event.sender.id, result.filePath);
        }
        return { filePath: result.filePath };
    });

    // File writing with security check
    ipcMain.handle('file:write', async (event, filePath, content) => {
        try {
            if (!isAllowedPath(allowedWritePaths, event.sender.id, filePath)) {
                throw new Error('Access denied: file path was not chosen via save dialog');
            }
            fs.writeFileSync(filePath, content, 'utf8');
            return { success: true };
        } catch (error) {
            throw new Error(`Failed to write file: ${error.message}`);
        }
    });

    // HAR file selection
    ipcMain.handle('har:selectFile', async (event) => {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openFile'],
            filters: [
                { name: 'HAR Files', extensions: ['har'] },
                { name: 'JSON Files', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        if (result.canceled) return { canceled: true };
        const filePath = result.filePaths[0];
        rememberPath(allowedReadPaths, event.sender.id, filePath);
        return { canceled: false, filePath };
    });

    // HAR analysis with security check
    ipcMain.handle('har:analyze', async (event, filePath) => {
        try {
            if (!isAllowedPath(allowedReadPaths, event.sender.id, filePath)) {
                throw new Error('Access denied: HAR file was not selected via dialog');
            }
            const harContent = fs.readFileSync(filePath, 'utf8');
            const harData = JSON.parse(harContent);
            const analyzer = new harAnalyzer.HARAnalyzer(harData);
            const report = analyzer.generateReport();
            report.diagnosis = analyzer.diagnoseIncompleteAuth();
            return report;
        } catch (error) {
            throw new Error(`Failed to analyze HAR file: ${error.message}`);
        }
    });

    // CSV/ZIP picker
    ipcMain.handle('fileUpload:pickCsvOrZip', async (event) => {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openFile'],
            filters: [
                { name: 'CSV/ZIP/JSON', extensions: ['csv', 'zip', 'json'] },
                { name: 'All Files', extensions: ['*'] }
            ],
            modal: true
        });
        if (result.canceled) return null;
        const filePath = result.filePaths[0];
        rememberPath(allowedReadPaths, event.sender.id, filePath);
        return filePath;
    });

    // File reading (fileUpload variant)
    ipcMain.handle('fileUpload:readFile', async (event, payload) => {
        const { fullPath } = payload || {};
        if (!fullPath) throw new Error('fullPath required');
        if (!isAllowedPath(allowedReadPaths, event.sender.id, fullPath)) {
            throw new Error('Access denied: file was not selected via dialog');
        }
        return await fs.promises.readFile(fullPath, 'utf8');
    });

    // File buffer reading
    ipcMain.handle('fileUpload:readFileBuffer', async (event, payload) => {
        const { fullPath } = payload || {};
        if (!fullPath) throw new Error('fullPath required');
        if (!isAllowedPath(allowedReadPaths, event.sender.id, fullPath)) {
            throw new Error('Access denied: file was not selected via dialog');
        }
        const buf = await fs.promises.readFile(fullPath);
        return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    });

    // CSV parsing handlers
    ipcMain.handle('parseEmailsFromCSV', async (event, csvContent) => {
        try {
            const emails = parsers.parseEmailsFromCSV(csvContent);
            return {
                success: true,
                emails,
                count: emails.length
            };
        } catch (error) {
            console.error('Error parsing CSV content:', error);
            return {
                success: false,
                error: error.message || 'Failed to parse CSV content'
            };
        }
    });

    // Excel parsing handlers
    ipcMain.handle('parseEmailsFromExcel', async (event, { filePath, fileBuffer }) => {
        try {
            const emails = parsers.parseEmailsFromExcel(fileBuffer);
            return {
                success: true,
                emails,
                count: emails.length
            };
        } catch (error) {
            console.error('Error parsing Excel content:', error);
            return {
                success: false,
                error: error.message || 'Failed to parse Excel content'
            };
        }
    });
}

module.exports = { registerFileHandlers };
