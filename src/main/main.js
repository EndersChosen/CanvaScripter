require('dotenv').config();

const path = require('path');
const fs = require('fs');
const {
    app,
    BrowserWindow,
    ipcMain,
    dialog,
    clipboard,
    shell,
    Menu,
    nativeTheme
} = require('electron');
//const axios = require('axios');
const convos = require('../shared/canvas-api/conversations');
const csvExporter = require('../shared/csvExporter');
const assignmentGroups = require('../shared/canvas-api/assignment_groups');
const assignments = require('../shared/canvas-api/assignments');
const { getPageViews, createUsers, enrollUser, addUsers, getCommChannels, updateNotifications, searchUsers } = require('../shared/canvas-api/users');
const { searchAccounts } = require('../shared/canvas-api/accounts');
const { searchTerms } = require('../shared/canvas-api/terms');
const { searchUserLogins } = require('../shared/canvas-api/logins');
const { send } = require('process');
const { deleteRequester, waitFunc } = require('../shared/utilities');
const { batchHandler } = require('../shared/batchHandler');
const {
    emailCheck,
    getBouncedData,
    checkCommDomain,
    checkUnconfirmedEmails,
    confirmEmail,
    resetEmail,
    awsReset,
    awsCheck,
    bulkAWSReset,
    bounceReset,
    bounceCheck,
    patternBounceReset
} = require('../shared/canvas-api/comm_channels');
const {
    restoreContent,
    resetCourse,
    getCourseInfo,
    createSupportCourse,
    editCourse,
    associateCourses,
    syncBPCourses
} = require('../shared/canvas-api/courses');
const quizzes_classic = require('../shared/canvas-api/quizzes_classic');
const quizzes_nq = require('../shared/canvas-api/quizzes_nq');
const modules = require('../shared/canvas-api/modules');
const folders = require('../shared/canvas-api/folders');
const files = require('../shared/canvas-api/files');
const grading_standards = require('../shared/canvas-api/grading_standards');
const discussions = require('../shared/canvas-api/discussions');
const pages = require('../shared/canvas-api/pages');
const sections = require('../shared/canvas-api/sections');
const enrollments = require('../shared/canvas-api/enrollments');
const sisImports = require('../shared/canvas-api/sis_imports');
const imports = require('../shared/canvas-api/imports');
const groupCategories = require('../shared/canvas-api/group_categories');
const { analyzeEmailPattern } = require('../shared/email_pattern_analyzer');
const os = require('os');

let debugLoggingEnabled = false;
let logStream = null;

// === Local helpers (CSV + text normalization) ===
// NOTE: These were previously only in a test file (test_csv_parse.js). They are
// required at runtime by the fileUpload:resetEmails handler.
function parseCSVRow(row) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') {
            if (inQuotes && row[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

function parseEmailsFromCSV(csvContent) {
    const lines = csvContent.split(/\r?\n/);
    if (lines.length === 0) return [];

    // Handle Canvas bounced communication channels format specifically
    // Look for lines that start with numbers (User ID) and contain email addresses
    const emails = [];
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;

    // First try the standard CSV approach for properly formatted CSVs
    try {
        const headers = parseCSVRow(lines[0]);
        const emailColumnNames = ['path', 'email', 'email_address', 'communication_channel_path'];
        let emailColumnIndex = -1;

        for (let i = 0; i < headers.length; i++) {
            const headerLower = headers[i].toLowerCase().trim();
            if (emailColumnNames.includes(headerLower)) {
                emailColumnIndex = i;
                break;
            }
        }

        if (emailColumnIndex >= 0) {
            // Standard CSV parsing
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                const row = parseCSVRow(line);
                const value = row[emailColumnIndex];
                if (value && value.includes('@')) {
                    emails.push(value.trim());
                }
            }
        }
    } catch (error) {
        console.warn('Standard CSV parsing failed, falling back to pattern matching:', error.message);
    }

    // If standard parsing didn't work or didn't find emails, try pattern matching
    // This handles malformed Canvas exports with line breaks in error messages
    if (emails.length === 0) {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Skip header line
            if (line.toLowerCase().includes('user id') && line.toLowerCase().includes('path')) {
                continue;
            }

            // Look for lines that start with a number (User ID) and contain email
            if (/^\d+,/.test(line)) {
                const emailMatch = line.match(emailRegex);
                if (emailMatch) {
                    emails.push(emailMatch[1].trim());
                }
            }
        }
    }

    // Remove duplicates and return
    return Array.from(new Set(emails));
}

function parseEmailsFromExcel(fileBuffer) {
    try {
        // Try to import xlsx library
        let XLSX;
        try {
            XLSX = require('xlsx');
        } catch (error) {
            throw new Error('Excel parsing requires the "xlsx" library. Please install it with: npm install xlsx');
        }

        // Parse the Excel file from buffer
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        
        // Get the first worksheet
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
            throw new Error('No worksheets found in Excel file');
        }
        
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert worksheet to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length === 0) {
            return [];
        }

        const emails = [];
        const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;

        // Check if first row contains headers
        const firstRow = jsonData[0];
        let pathColumnIndex = -1;
        let startRowIndex = 0;

        // Look for the "Path" column (Canvas bounce report format)
        if (Array.isArray(firstRow)) {
            for (let i = 0; i < firstRow.length; i++) {
                const cellValue = String(firstRow[i] || '').toLowerCase().trim();
                if (['path', 'email', 'email_address', 'communication_channel_path'].includes(cellValue)) {
                    pathColumnIndex = i;
                    startRowIndex = 1; // Skip header row
                    break;
                }
            }
        }

        // If we found a path column, extract emails from that column
        if (pathColumnIndex >= 0) {
            for (let i = startRowIndex; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (Array.isArray(row) && row[pathColumnIndex]) {
                    const cellValue = String(row[pathColumnIndex]).trim();
                    if (cellValue.includes('@')) {
                        const emailMatch = cellValue.match(emailRegex);
                        if (emailMatch) {
                            emails.push(emailMatch[1]);
                        }
                    }
                }
            }
        } else {
            // Fallback: search all cells for email addresses
            for (let i = 0; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!Array.isArray(row)) continue;
                
                // Skip potential header row
                if (i === 0 && row.some(cell => 
                    String(cell || '').toLowerCase().includes('user id') || 
                    String(cell || '').toLowerCase().includes('path')
                )) {
                    continue;
                }

                for (let j = 0; j < row.length; j++) {
                    const cellValue = String(row[j] || '').trim();
                    if (cellValue.includes('@')) {
                        const emailMatch = cellValue.match(emailRegex);
                        if (emailMatch) {
                            emails.push(emailMatch[1]);
                        }
                    }
                }
            }
        }

        // Remove duplicates and return
        return Array.from(new Set(emails));
        
    } catch (error) {
        if (error.message.includes('xlsx')) {
            throw error; // Re-throw library installation error
        }
        throw new Error(`Failed to parse Excel file: ${error.message}`);
    }
}

function removeBlanks(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map(v => (v == null ? '' : String(v).trim()))
        .filter(v => v.length > 0);
}

// Simple settings persistence (stored in userData/settings.json)
const settingsFilePath = (() => {
    try { return path.join(app.getPath('userData'), 'settings.json'); } catch { return null; }
})();
let appSettings = null;

function loadSettings() {
    if (!settingsFilePath) return {};
    try {
        const raw = fs.readFileSync(settingsFilePath, 'utf8');
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

function saveSettings(settings) {
    if (!settingsFilePath) return;
    try {
        fs.mkdirSync(path.dirname(settingsFilePath), { recursive: true });
        fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2), 'utf8');
    } catch { /* ignore */ }
}

function getSettings() {
    if (!appSettings) appSettings = loadSettings();
    return appSettings;
}

async function getFileLocation(defaultFilename) {
    const result = await dialog.showSaveDialog({
        title: 'Save File',
        defaultPath: defaultFilename,
        filters: [
            { name: 'CSV Files', extensions: ['csv'] },
            { name: 'Text Files', extensions: ['txt'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });

    if (result.canceled || !result.filePath) {
        return null;
    }

    return result.filePath;
}

async function getFileContentsForEmails() {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            { name: 'CSV Files', extensions: ['csv'] },
            { name: 'Text Files', extensions: ['txt'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });

    if (result.canceled || !result.filePaths.length) {
        return 'cancelled';
    }

    try {
        const filePath = result.filePaths[0];
        const fileContent = fs.readFileSync(filePath, 'utf8');
        return fileContent;
    } catch (error) {
        console.error('Error reading file:', error);
        throw error;
    }
}

// DevTools docking behavior
// - overrideMode: 'right' | 'bottom' | 'undocked' | null (null = remember last/Chromium default)
// - initApplied: boolean, whether we've applied our initial default once
function getDevToolsOverrideMode() {
    const s = getSettings();
    return s.devToolsOverrideMode ?? null;
}

function setDevToolsOverrideMode(modeOrNull) {
    const allowed = new Set([null, 'right', 'bottom', 'undocked']);
    if (!allowed.has(modeOrNull)) return;
    const s = getSettings();
    s.devToolsOverrideMode = modeOrNull;
    saveSettings(s);
}

function getDevToolsInitApplied() {
    const s = getSettings();
    return !!s.devToolsInitApplied;
}

function setDevToolsInitApplied(applied) {
    const s = getSettings();
    s.devToolsInitApplied = !!applied;
    saveSettings(s);
}

// Determine a conventional logs directory (prefer Electron paths, fallback to OS paths)
function getLogDirectory() {
    try {
        if (typeof app.getPath === 'function') {
            // Prefer Electron's logs dir when available, otherwise userData/logs
            const logsBase = (() => {
                try { return app.getPath('logs'); } catch { return null; }
            })();
            if (logsBase) return logsBase; // already a logs folder
            const base = app.getPath('userData');
            return path.join(base, 'logs');
        }
    } catch { /* ignore */ }

    // Fallback by platform
    const home = os.homedir();
    switch (process.platform) {
        case 'win32':
            return path.join(home, 'AppData', 'Local', (app.getName?.() || 'App'), 'logs');
        case 'darwin':
            return path.join(home, 'Library', 'Logs', (app.getName?.() || 'App'));
        default:
            return path.join(home, '.local', 'share', (app.getName?.() || 'app'), 'logs');
    }
}

function setDebugLogging(enabled) {
    // Toggle debug file logging
    if (enabled === debugLoggingEnabled) return; // no-op
    debugLoggingEnabled = enabled;

    if (enabled) {
        const dir = getLogDirectory();
        try { fs.mkdirSync(dir, { recursive: true }); } catch { /* ignore */ }
        const now = new Date();
        const date = now.toISOString().slice(0, 10); // YYYY-MM-DD
        const time = now.toTimeString().slice(0, 8).replace(/:/g, '-'); // HH-mm-ss
        const appName = (app.getName?.() || 'app').replace(/\s+/g, '_');
        const logFile = path.join(dir, `${appName}-debug-${date}_${time}.log`);
        logStream = fs.createWriteStream(logFile, { flags: 'w' });
        logDebug(`Debug logging enabled. Writing to: ${logFile}`);
        // Mirror console to log when enabled
        enableConsoleMirroring();
        // Note IPC/Unhandled errors
        installErrorHooksOnce();
    } else {
        logDebug('Debug logging disabled.');
        try { logStream?.end(); } catch { /* ignore */ }
        logStream = null;
        disableConsoleMirroring();
    }
}

function logDebug(message, data = undefined) {
    if (!debugLoggingEnabled || !logStream) return;
    const ts = new Date().toISOString();
    const payload = (data !== undefined) ? ` | data=${safeStringify(data)}` : '';
    logStream.write(`[${ts}] ${message}${payload}\n`);
}

function safeStringify(obj) {
    try { return JSON.stringify(obj); } catch { return String(obj); }
}

// Console mirroring and IPC tracing
let originalConsole = null;
function enableConsoleMirroring() {
    if (originalConsole) return; // already enabled
    originalConsole = {
        log: console.log.bind(console),
        info: console.info.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console)
    };
    const forward = (level, args) => {
        try { originalConsole[level](...args); } catch { /* ignore */ }
        try { logDebug(`[console.${level}] ${args.map(a => typeof a === 'string' ? a : safeStringify(a)).join(' ')}`); } catch { /* ignore */ }
    };
    console.log = (...a) => forward('log', a);
    console.info = (...a) => forward('info', a);
    console.warn = (...a) => forward('warn', a);
    console.error = (...a) => forward('error', a);
}

function disableConsoleMirroring() {
    if (!originalConsole) return;
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    originalConsole = null;
}

let ipcPatched = false;
function installErrorHooksOnce() {
    if (!ipcPatched) {
        try {
            const origHandle = ipcMain.handle.bind(ipcMain);
            ipcMain.handle = (channel, listener) => {
                const wrapped = async (event, ...args) => {
                    if (debugLoggingEnabled) logDebug(`[ipcMain.handle] ${channel} invoked`, { args: redactArgs(args) });
                    try {
                        const res = await listener(event, ...args);
                        if (debugLoggingEnabled) logDebug(`[ipcMain.handle] ${channel} success`);
                        return res;
                    } catch (err) {
                        logDebug(`[ipcMain.handle] ${channel} error`, { message: err?.message, stack: err?.stack });
                        throw err;
                    }
                };
                return origHandle(channel, wrapped);
            };
            const origOn = ipcMain.on.bind(ipcMain);
            ipcMain.on = (channel, listener) => {
                const wrapped = (event, ...args) => {
                    if (debugLoggingEnabled) logDebug(`[ipcMain.on] ${channel} event`, { args: redactArgs(args) });
                    try { return listener(event, ...args); } catch (err) { logDebug(`[ipcMain.on] ${channel} error`, { message: err?.message, stack: err?.stack }); throw err; }
                };
                return origOn(channel, wrapped);
            };
            ipcPatched = true;
        } catch { /* ignore */ }
    }
    try { process.on('uncaughtException', (e) => logDebug('[uncaughtException]', { message: e?.message, stack: e?.stack })); } catch { }
    try { process.on('unhandledRejection', (r) => logDebug('[unhandledRejection]', { reason: safeStringify(r) })); } catch { }
}

function redactArgs(args) {
    const redact = (obj) => {
        if (obj && typeof obj === 'object') {
            const copy = Array.isArray(obj) ? [] : {};
            for (const k in obj) {
                const v = obj[k];
                if (/token|authorization|auth|password/i.test(k)) copy[k] = '***';
                else copy[k] = redact(v);
            }
            return copy;
        }
        return obj;
    };
    return redact(args);
}

// Install hooks early so subsequent ipcMain.handle/on registrations are wrapped
installErrorHooksOnce();

// Ensure log stream is closed on quit
app.on('before-quit', () => {
    try { logStream?.end(); } catch { /* ignore */ }
    logStream = null;
});

let mainWindow;
let suppressedEmails = [];

// Cancellation flags for comm-channel resets (module-level to avoid scope issues)
const resetEmailsCancelFlags = new Map(); // key: senderId -> boolean
const resetPatternCancelFlags = new Map(); // key: senderId -> boolean
const createAssignmentGroupsCancelFlags = new Map(); // key: senderId -> boolean
const deleteEmptyAssignmentGroupsCancelFlags = new Map(); // key: senderId -> boolean

// Global operation cancellation map (for operations identified by operationId)
const operationCancelFlags = new Map(); // key: operationId -> boolean

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1400,
        minWidth: 900,
        height: 900,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
            preload: path.join(__dirname, './preload.js')
        },
        titleBarStyle: 'hiddenInset'
    })

    // Hide DevTools on startup; uncomment to open automatically during development
    // mainWindow.webContents.openDevTools();
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    // Mirror renderer console messages to log when enabled
    mainWindow.webContents.on('console-message', (event) => {
        if (!debugLoggingEnabled) return;
        const levels = ['log', 'warn', 'error', 'info'];
        const lvl = levels[event.level] || 'log';
        logDebug(`[renderer.${lvl}] ${event.message}`, { line: event.line, sourceId: event.sourceId });
    });

    // When DevTools closes, blur any currently focused element to avoid unwanted focus jumps
    mainWindow.webContents.on('devtools-closed', () => {
        try {
            mainWindow.webContents.executeJavaScript(
                'if (document && document.activeElement) { document.activeElement.blur(); }',
                true
            );
        } catch { /* ignore */ }
        try { mainWindow.webContents.focus(); } catch { /* ignore */ }
    });
}

function toggleDevToolsForFocusedWindow() {
    const win = BrowserWindow.getFocusedWindow() || mainWindow;
    if (!win) return;
    const wc = win.webContents;
    try {
        if (wc.isDevToolsOpened()) {
            wc.closeDevTools();
        } else {
            const override = getDevToolsOverrideMode();
            if (override) {
                wc.openDevTools({ mode: override });
            } else if (!getDevToolsInitApplied()) {
                // Apply our one-time default of bottom on first programmatic open
                wc.openDevTools({ mode: 'bottom' });
                setDevToolsInitApplied(true);
            } else {
                // Let Chromium restore last dock position
                wc.openDevTools();
            }
        }
    } catch { /* ignore */ }
}

// Global menu creator
function createMenu() {
    const isMac = process.platform === 'darwin';

    const template = [
        // App menu (macOS only)
        ...(isMac ? [{
            label: app.getName(),
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        }] : []),

        // File menu
        {
            label: 'File',
            submenu: [
                {
                    label: 'Enable Debug Logging',
                    type: 'checkbox',
                    checked: true,
                    click: (menuItem) => {
                        setDebugLogging(menuItem.checked);
                    }
                },
                {
                    label: 'Open Log Folder',
                    click: () => {
                        shell.openPath(getLogDirectory());
                    }
                },
                { type: 'separator' },
                ...(isMac ? [
                    { role: 'close' }
                ] : [
                    { role: 'quit' }
                ])
            ]
        },

        // Edit menu
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                ...(isMac ? [
                    { role: 'pasteAndMatchStyle' },
                    { role: 'delete' },
                    { role: 'selectAll' },
                    { type: 'separator' },
                    {
                        label: 'Speech',
                        submenu: [
                            { role: 'startSpeaking' },
                            { role: 'stopSpeaking' }
                        ]
                    }
                ] : [
                    { role: 'delete' },
                    { type: 'separator' },
                    { role: 'selectAll' }
                ])
            ]
        },

        // View menu
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                {
                    label: 'Toggle DevTools',
                    accelerator: process.platform === 'darwin' ? 'CmdOrCtrl+Alt+I' : 'Ctrl+Shift+I',
                    click: () => toggleDevToolsForFocusedWindow()
                },
                {
                    label: 'Toggle DevTools (F12)',
                    accelerator: 'F12',
                    visible: process.platform !== 'darwin',
                    click: () => toggleDevToolsForFocusedWindow()
                },
                { type: 'separator' },
                {
                    label: 'DevTools Position',
                    submenu: [
                        {
                            label: 'Remember Last',
                            type: 'radio',
                            checked: getDevToolsOverrideMode() === null,
                            click: () => {
                                setDevToolsOverrideMode(null);
                                const win = BrowserWindow.getFocusedWindow() || mainWindow;
                                if (win && win.webContents.isDevToolsOpened()) {
                                    try { win.webContents.openDevTools(); } catch { /* ignore */ }
                                }
                            }
                        },
                        {
                            label: 'Bottom',
                            type: 'radio',
                            checked: getDevToolsOverrideMode() === 'bottom',
                            click: () => {
                                setDevToolsOverrideMode('bottom');
                                const win = BrowserWindow.getFocusedWindow() || mainWindow;
                                if (win && win.webContents.isDevToolsOpened()) {
                                    try { win.webContents.openDevTools({ mode: 'bottom' }); } catch { /* ignore */ }
                                }
                            }
                        },
                        {
                            label: 'Right',
                            type: 'radio',
                            checked: getDevToolsOverrideMode() === 'right',
                            click: () => {
                                setDevToolsOverrideMode('right');
                                const win = BrowserWindow.getFocusedWindow() || mainWindow;
                                if (win && win.webContents.isDevToolsOpened()) {
                                    try { win.webContents.openDevTools({ mode: 'right' }); } catch { /* ignore */ }
                                }
                            }
                        },
                        {
                            label: 'Undocked',
                            type: 'radio',
                            checked: getDevToolsOverrideMode() === 'undocked',
                            click: () => {
                                setDevToolsOverrideMode('undocked');
                                const win = BrowserWindow.getFocusedWindow() || mainWindow;
                                if (win && win.webContents.isDevToolsOpened()) {
                                    try { win.webContents.openDevTools({ mode: 'undocked' }); } catch { /* ignore */ }
                                }
                            }
                        }
                    ]
                },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },

        // Window menu
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'close' },
                ...(isMac ? [
                    { type: 'separator' },
                    { role: 'front' },
                    { type: 'separator' },
                    { role: 'window' }
                ] : [])
            ]
        },

        // Help menu
        {
            role: 'help',
            submenu: [
                {
                    label: 'About',
                    click: async () => {
                        const { shell } = require('electron');
                        await shell.openExternal('https://github.com/EndersChosen/CanvaTweaks');
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// Register SIS Import related IPC handlers (called from app.whenReady)
function registerSisIpcHandlers() {
    // Defensive de-dupe for dev/hot-reload
    const sisChannels = [
        'sis:selectFolder',
        'sis:previewData',
        'sis:fetchAuthProviders',
        'sis:createFile',
        'sis:createBulkFiles',
        'sis:createMultiFiles'
    ];
    sisChannels.forEach(ch => { try { ipcMain.removeHandler(ch); } catch { } });

    // SIS Import IPC Handlers
    ipcMain.handle('sis:selectFolder', async () => {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory']
        });
        if (result.canceled) return null;
        return result.filePaths[0];
    });

    ipcMain.handle('sis:previewData', async (event, fileType, rowCount, emailDomain = '@school.edu', authProviderId = '', allOptions = {}) => {
        try {
            let csvContent = '';

            // Extract individual options from the consolidated object
            const enrollmentOptions = allOptions.enrollmentOptions || {};
            const userOptions = allOptions.userOptions || {};
            const accountOptions = allOptions.accountOptions || {};
            const termOptions = allOptions.termOptions || {};
            const courseOptions = allOptions.courseOptions || {};
            const sectionOptions = allOptions.sectionOptions || {};
            const groupCategoryOptions = allOptions.groupCategoryOptions || {};
            const groupOptions = allOptions.groupOptions || {};
            const groupMembershipOptions = allOptions.groupMembershipOptions || {};
            const adminOptions = allOptions.adminOptions || {};
            const loginOptions = allOptions.loginOptions || {};
            const crossListingOptions = allOptions.crossListingOptions || {};
            const userObserverOptions = allOptions.userObserverOptions || {};
            const changeSisIdOptions = allOptions.changeSisIdOptions || {};
            const differentiationTagSetOptions = allOptions.differentiationTagSetOptions || {};
            const differentiationTagOptions = allOptions.differentiationTagOptions || {};
            const differentiationTagMembershipOptions = allOptions.differentiationTagMembershipOptions || {};

            switch (fileType) {
                case 'users':
                    csvContent = sisImports.generateUsersCSV(rowCount, emailDomain, authProviderId, userOptions);
                    break;
                case 'accounts':
                    csvContent = sisImports.generateAccountsCSV(rowCount, accountOptions);
                    break;
                case 'terms':
                    csvContent = sisImports.generateTermsCSV(rowCount, termOptions);
                    break;
                case 'courses':
                    csvContent = sisImports.generateCoursesCSV(rowCount, courseOptions);
                    break;
                case 'sections':
                    csvContent = sisImports.generateSectionsCSV(rowCount, sectionOptions);
                    break;
                case 'enrollments':
                    csvContent = sisImports.generateEnrollmentsCSV(rowCount, enrollmentOptions);
                    break;
                case 'group_categories':
                    csvContent = sisImports.generateGroupCategoriesCSV(rowCount, groupCategoryOptions);
                    break;
                case 'groups':
                    csvContent = sisImports.generateGroupsCSV(rowCount, groupOptions);
                    break;
                case 'group_memberships':
                    csvContent = sisImports.generateGroupMembershipsCSV(rowCount, groupMembershipOptions);
                    break;
                case 'differentiation_tag_sets':
                    csvContent = sisImports.generateDifferentiationTagSetsCSV(rowCount, differentiationTagSetOptions);
                    break;
                case 'differentiation_tags':
                    csvContent = sisImports.generateDifferentiationTagsCSV(rowCount, differentiationTagOptions);
                    break;
                case 'differentiation_tag_membership':
                    csvContent = sisImports.generateDifferentiationTagMembershipCSV(rowCount, differentiationTagMembershipOptions);
                    break;
                case 'xlists':
                    csvContent = sisImports.generateXlistsCSV(rowCount, crossListingOptions);
                    break;
                case 'user_observers':
                    csvContent = sisImports.generateUserObserversCSV(rowCount, userObserverOptions);
                    break;
                case 'logins':
                    csvContent = sisImports.generateLoginsCSV(rowCount, emailDomain, authProviderId, loginOptions);
                    break;
                case 'change_sis_id':
                case 'change_sis_ids':
                    csvContent = sisImports.generateChangeSisIdCSV(rowCount, changeSisIdOptions);
                    break;
                case 'admins':
                    csvContent = sisImports.generateAdminsCSV(rowCount, emailDomain, adminOptions);
                    break;
                default:
                    throw new Error(`Unsupported file type: ${fileType}`);
            }

            return {
                success: true,
                preview: csvContent,
                data: csvContent
            };
        } catch (error) {
            console.error('Error in sis:previewData:', error);
            return {
                success: false,
                error: error.message || 'Unknown error occurred'
            };
        }
    });

    ipcMain.handle('sis:fetchAuthProviders', async (event, domain, token, accountId = 1) => {
        try {
            const providers = await sisImports.fetchAuthenticationProviders(domain, token, accountId);
            return providers;
        } catch (error) {
            throw new Error(`Error fetching authentication providers: ${error.message}`);
        }
    });

    ipcMain.handle('sis:createFile', async (event, fileType, rowCount, outputPath, emailDomain = '@school.edu', authProviderId = '', allOptions = {}) => {
        try {
            const enrollmentOptions = allOptions.enrollmentOptions || {};
            const userOptions = allOptions.userOptions || {};
            const accountOptions = allOptions.accountOptions || {};
            const termOptions = allOptions.termOptions || {};
            const courseOptions = allOptions.courseOptions || {};
            const sectionOptions = allOptions.sectionOptions || {};
            const groupCategoryOptions = allOptions.groupCategoryOptions || {};
            const groupOptions = allOptions.groupOptions || {};
            const groupMembershipOptions = allOptions.groupMembershipOptions || {};
            const adminOptions = allOptions.adminOptions || {};
            const loginOptions = allOptions.loginOptions || {};
            const crossListingOptions = allOptions.crossListingOptions || {};
            const userObserverOptions = allOptions.userObserverOptions || {};
            const changeSisIdOptions = allOptions.changeSisIdOptions || {};
            const differentiationTagSetOptions = allOptions.differentiationTagSetOptions || {};
            const differentiationTagOptions = allOptions.differentiationTagOptions || {};
            const differentiationTagMembershipOptions = allOptions.differentiationTagMembershipOptions || {};

            // Pass search data through options for file types that support it
            if (allOptions.searchData) {
                if (fileType === 'logins') {
                    loginOptions.searchData = allOptions.searchData;
                }
                if (fileType === 'change_sis_id' || fileType === 'change_sis_ids') {
                    changeSisIdOptions.searchData = allOptions.searchData;
                }
                if (fileType === 'users') {
                    userOptions.searchData = allOptions.searchData;
                }
                if (fileType === 'courses') {
                    courseOptions.searchData = allOptions.searchData;
                }
                if (fileType === 'accounts') {
                    accountOptions.searchData = allOptions.searchData;
                }
            }

            // Pass field values to all options for customization
            if (allOptions.fieldValues) {
                Object.assign(loginOptions, allOptions.fieldValues);
                Object.assign(userOptions, allOptions.fieldValues);
                Object.assign(enrollmentOptions, allOptions.fieldValues);
                Object.assign(courseOptions, allOptions.fieldValues);
                Object.assign(sectionOptions, allOptions.fieldValues);
                Object.assign(termOptions, allOptions.fieldValues);
                Object.assign(accountOptions, allOptions.fieldValues);
                Object.assign(groupCategoryOptions, allOptions.fieldValues);
                Object.assign(groupOptions, allOptions.fieldValues);
                Object.assign(groupMembershipOptions, allOptions.fieldValues);
                Object.assign(adminOptions, allOptions.fieldValues);
                Object.assign(crossListingOptions, allOptions.fieldValues);
                Object.assign(userObserverOptions, allOptions.fieldValues);
                Object.assign(changeSisIdOptions, allOptions.fieldValues);
                Object.assign(differentiationTagSetOptions, allOptions.fieldValues);
                Object.assign(differentiationTagOptions, allOptions.fieldValues);
                Object.assign(differentiationTagMembershipOptions, allOptions.fieldValues);
            }

            const filePath = await sisImports.createSISImportFile(
                fileType,
                rowCount,
                outputPath,
                emailDomain,
                authProviderId,
                enrollmentOptions,
                userOptions,
                accountOptions,
                termOptions,
                courseOptions,
                sectionOptions,
                groupCategoryOptions,
                groupOptions,
                groupMembershipOptions,
                adminOptions,
                loginOptions,
                crossListingOptions,
                userObserverOptions,
                changeSisIdOptions,
                differentiationTagSetOptions,
                differentiationTagOptions,
                differentiationTagMembershipOptions
            );
            const fileName = path.basename(filePath);

            return { success: true, filePath, fileName };
        } catch (error) {
            throw new Error(`Error creating SIS file: ${error.message}`);
        }
    });

    ipcMain.handle('sis:createBulkFiles', async (event, fileTypes, rowCounts, outputPath, createZip, emailDomain = '@school.edu', authProviderId = '', enrollmentOptions = {}) => {
        try {
            const createdFiles = await sisImports.createBulkSISImport(fileTypes, rowCounts, outputPath, emailDomain, authProviderId, enrollmentOptions);

            let zipPath = null;
            if (createZip && createdFiles.length > 0) {
                const JSZip = require('jszip');
                const zip = new JSZip();

                for (const filePath of createdFiles) {
                    const fileName = path.basename(filePath);
                    const fileContent = fs.readFileSync(filePath, 'utf8');
                    zip.file(fileName, fileContent);
                }

                const zipContent = await zip.generateAsync({ type: 'nodebuffer' });
                zipPath = path.join(outputPath, 'sis_import_package.zip');
                fs.writeFileSync(zipPath, zipContent);
            }

            return { success: true, files: createdFiles.map(f => path.basename(f)), zipPath };
        } catch (error) {
            throw new Error(`Error creating bulk SIS files: ${error.message}`);
        }
    });

    ipcMain.handle('sis:createMultiFiles', async (event, fileConfigurations, outputPath) => {
        try {
            const createdFiles = [];

            for (const config of fileConfigurations) {
                const fileName = await sisImports.createSISImportFile(
                    config.fileType,
                    config.rowCount,
                    outputPath,
                    config.emailDomain,
                    config.authProviderId,
                    config.options.enrollmentOptions || {},
                    config.options.userOptions || {},
                    config.options.accountOptions || {},
                    config.options.termOptions || {},
                    config.options.courseOptions || {},
                    config.options.sectionOptions || {},
                    config.options.groupCategoryOptions || {},
                    config.options.groupOptions || {},
                    config.options.groupMembershipOptions || {},
                    config.options.adminOptions || {},
                    config.options.loginOptions || {},
                    config.options.crossListingOptions || {},
                    config.options.userObserverOptions || {},
                    config.options.changeSisIdOptions || {},
                    config.options.differentiationTagSetOptions || {},
                    config.options.differentiationTagOptions || {},
                    config.options.differentiationTagMembershipOptions || {}
                );
                createdFiles.push(fileName);
            }

            const JSZip = require('jszip');
            const zip = new JSZip();

            for (const filePath of createdFiles) {
                const fileName = path.basename(filePath);
                const fileContent = fs.readFileSync(filePath, 'utf8');
                zip.file(fileName, fileContent);
            }

            const zipContent = await zip.generateAsync({ type: 'nodebuffer' });
            const zipPath = path.join(outputPath, 'sis_multi_import_package.zip');
            fs.writeFileSync(zipPath, zipContent);

            return { success: true, files: createdFiles.map(f => path.basename(f)), zipPath };
        } catch (error) {
            throw new Error(`Error creating multi SIS files: ${error.message}`);
        }
    });

    // User search IPC handler
    ipcMain.handle('users:search', async (event, domain, token, searchTerm) => {
        console.log('main.js > users:search IPC handler');
        try {
            // Set up axios defaults for the request
            const axios = require('axios');
            axios.defaults.baseURL = `https://${domain}/api/v1`;
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            const users = await searchUsers(searchTerm, ['email']);
            
            console.log('Raw Canvas users data:', JSON.stringify(users, null, 2));
            
            // Transform Canvas user data to SIS CSV format
            const sisUsers = users.map(user => {
                // Split name into parts more carefully
                const nameParts = (user.name || '').trim().split(/\s+/);
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || '';
                
                return {
                    user_id: user.sis_user_id || '',
                    login_id: user.login_id || '',
                    first_name: firstName,
                    last_name: lastName,
                    full_name: user.name || '',
                    sortable_name: user.sortable_name || '',
                    short_name: user.short_name || '',
                    email: user.email || '',
                    status: 'active'
                };
            });
            
            console.log('Transformed SIS users data:', JSON.stringify(sisUsers, null, 2));
            
            return { success: true, data: sisUsers };
        } catch (error) {
            console.error('Error searching users:', error);
            return { success: false, error: error.message };
        }
    });

    // Account search IPC handler
    ipcMain.handle('accounts:search', async (event, domain, token, searchTerm) => {
        console.log('main.js > accounts:search IPC handler');
        try {
            // Set up axios defaults for the request
            const axios = require('axios');
            axios.defaults.baseURL = `https://${domain}/api/v1`;
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            const accounts = await searchAccounts(searchTerm);
            
            // Transform Canvas account data to SIS CSV format
            const sisAccounts = accounts.map(account => ({
                account_id: account.sis_account_id || '',
                parent_account_id: account.parent_account_id || '',
                name: account.name || '',
                status: 'active'
            }));
            
            return { success: true, data: sisAccounts };
        } catch (error) {
            console.error('Error searching accounts:', error);
            return { success: false, error: error.message };
        }
    });

    // Terms search IPC handler
    ipcMain.handle('terms:search', async (event, domain, token, searchTerm) => {
        console.log('main.js > terms:search IPC handler');
        try {
            // Set up axios defaults for the request
            const axios = require('axios');
            axios.defaults.baseURL = `https://${domain}/api/v1`;
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            const terms = await searchTerms(searchTerm);
            
            // Transform Canvas term data to SIS CSV format
            const sisTerms = terms.map(term => ({
                term_id: term.sis_term_id || '',
                name: term.name || '',
                status: 'active',
                start_date: term.start_at || '',
                end_date: term.end_at || ''
            }));
            
            return { success: true, data: sisTerms };
        } catch (error) {
            console.error('Error searching terms:', error);
            return { success: false, error: error.message };
        }
    });

    // Sections search IPC handler
    ipcMain.handle('sections:search', async (event, domain, token, searchTerm) => {
        console.log('main.js > sections:search IPC handler');
        try {
            const result = await sections.searchSection(domain, token, searchTerm);
            return result;
        } catch (error) {
            console.error('Error searching sections:', error);
            return { success: false, error: error.message };
        }
    });

    // Enrollments search IPC handler
    ipcMain.handle('enrollments:search', async (event, domain, token, searchTerm, searchType) => {
        console.log('main.js > enrollments:search IPC handler');
        try {
            let result;

            // Determine which search function to use based on searchType
            switch (searchType) {
                case 'user':
                    result = await enrollments.getUserEnrollments(domain, token, searchTerm);
                    break;
                case 'course':
                    result = await enrollments.getCourseEnrollments(domain, token, searchTerm);
                    break;
                case 'section':
                    result = await enrollments.getSectionEnrollments(domain, token, searchTerm);
                    break;
                default:
                    return { success: false, error: 'Invalid search type. Use user, course, or section.' };
            }

            return result;
        } catch (error) {
            console.error('Error searching enrollments:', error);
            return { success: false, error: error.message };
        }
    });

    // Logins search IPC handler
    ipcMain.handle('logins:search', async (event, domain, token, userId, idType) => {
        console.log('main.js > logins:search IPC handler');
        try {
            const logins = await searchUserLogins(domain, token, userId, idType);
            return { success: true, data: logins };
        } catch (error) {
            console.error('Error searching user logins:', error);
            return { success: false, error: error.message };
        }
    });
}

app.whenReady().then(() => {

    setDebugLogging(true); // Enable debug logging by default; user can toggle via menu
    console.log('BATCH_CONCURRENCY (env):', process.env.BATCH_CONCURRENCY);
    console.log('TIME_DELAY (env):', process.env.TIME_DELAY);
    
    // Helper function to get batch configuration from environment variables
    const getBatchConfig = (overrides = {}) => {
        const batchSize = overrides.batchSize || Math.max(1, Number(process.env.BATCH_CONCURRENCY) || 35);
        const timeDelay = overrides.timeDelay || Math.max(0, Number(process.env.TIME_DELAY) || 2000);
        return { batchSize, timeDelay, ...overrides };
    };

    // Cancellable subject search (per renderer)
    const getConvosControllers = new Map(); // senderId -> AbortController

    // Get conversations with GraphQL - cancellable operation with progress tracking
    ipcMain.handle('axios:getConvos', async (event, data) => {
        console.log('Inside main:getConvos');
        const senderId = event.sender.id;
        try {
            if (getConvosControllers.has(senderId)) {
                try { getConvosControllers.get(senderId).abort('superseded'); } catch { }
            }
            const controller = new AbortController();
            getConvosControllers.set(senderId, controller);
            const sentMessages = await convos.getConversationsGraphQL({ ...data, signal: controller.signal });
            if (getConvosControllers.get(senderId) === controller) getConvosControllers.delete(senderId);
            return sentMessages;
        } catch (error) {
            try {
                const current = getConvosControllers.get(senderId);
                if (!current || current.signal.aborted || current === undefined) {
                    getConvosControllers.delete(senderId);
                }
            } catch { }
            throw error.message || error;
        }
    });

    // Cancelling fetch for conversations (per renderer)
    ipcMain.handle('axios:cancelGetConvos', async (event) => {
        try {
            const senderId = event.sender.id;
            const controller = getConvosControllers.get(senderId);
            if (controller) {
                controller.abort('user_cancelled');
                getConvosControllers.delete(senderId);
                return { cancelled: true };
            }
            return { cancelled: false };
        } catch (e) { return { cancelled: false }; }
    });

    // Cancellable fetch for deleted conversations (per renderer)
    const getDeletedConvosControllers = new Map(); // key: senderId -> AbortController

    // Query for deleted conversations
    ipcMain.handle('axios:getDeletedConversations', async (event, data) => {
        console.log('Inside axios:getDeletedConversations');
        const senderId = event.sender.id;
        try {
            // Abort any previous fetch for this sender
            if (getDeletedConvosControllers.has(senderId)) {
                try { getDeletedConvosControllers.get(senderId).abort('superseded'); } catch { }
            }
            const controller = new AbortController();
            getDeletedConvosControllers.set(senderId, controller);
            const results = await convos.getDeletedConversations({ ...data, signal: controller.signal });
            // Clear controller if it still matches
            if (getDeletedConvosControllers.get(senderId) === controller) getDeletedConvosControllers.delete(senderId);
            return results;
        } catch (error) {
            // Clear controller if aborted or errored and matches
            try {
                const current = getDeletedConvosControllers.get(senderId);
                if (!current || current.signal.aborted || current === undefined) {
                    getDeletedConvosControllers.delete(senderId);
                }
            } catch { }
            throw error.message || error;
        }
    });

    // Cancel getting deleted conversations operation
    ipcMain.handle('axios:cancelGetDeletedConversations', async (event) => {
        try {
            const senderId = event.sender.id;
            const controller = getDeletedConvosControllers.get(senderId);
            if (controller) {
                controller.abort('user_cancelled');
                getDeletedConvosControllers.delete(senderId);
                return { cancelled: true };
            }
            return { cancelled: false };
        } catch (e) {
            return { cancelled: false };
        }
    });

    // Cancellation flags for restoring deleted conversations (per renderer)
    const restoreConvosCancelFlags = new Map(); // key: senderId -> boolean

    // Restore deleted conversations from CSV data with batch processing
    ipcMain.handle('axios:restoreDeletedConversations', async (event, data) => {
        console.log('Inside axios:restoreDeletedConversations');

        const senderId = event.sender.id;
        // Reset cancel flag for this invocation
        restoreConvosCancelFlags.set(senderId, false);

        const rows = Array.isArray(data.rows) ? data.rows : [];
        const toInt = (v) => {
            const n = parseInt(v, 10);
            return Number.isFinite(n) ? n : null;
        };
        const normalized = rows.map(r => ({
            user_id: toInt(r.user_id),
            message_id: toInt(r.message_id),
            conversation_id: toInt(r.conversation_id)
        }));
        const valid = normalized.filter(r => r.user_id !== null && r.message_id !== null && r.conversation_id !== null);
        const skipped = rows.length - valid.length;
        console.log(`restoreDeletedConversations: processing ${valid.length} row(s), skipped ${skipped}.`);
        const total = valid.length || 1;

        const requests = valid.map((row, idx) => ({
            id: idx + 1,
            request: async () => convos.restoreConversation({
                domain: data.domain,
                token: data.token,
                user_id: row.user_id,
                message_id: row.message_id,
                conversation_id: row.conversation_id
            })
        }));

        let response = await canvasRateLimitedHandler(requests, {
            maxConcurrent: 35,
            baseDelayMs: 100,
            jitterMs: 150,
            maxRetries: 3,
            isCancelled: () => restoreConvosCancelFlags.get(senderId) === true
        });
        if ((response.successful?.length || 0) + (response.failed?.length || 0) === 0 && valid.length > 0) {
            // Fallback probe to surface a concrete error reason
            try {
                const probe = await convos.restoreConversation({
                    domain: data.domain,
                    token: data.token,
                    user_id: valid[0].user_id,
                    message_id: valid[0].message_id,
                    conversation_id: valid[0].conversation_id
                });
                response.successful.push({ id: 0, status: 'fulfilled', value: probe });
            } catch (err) {
                const status = err?.response?.status || err?.status || 0;
                const reason = err?.message || 'Unknown error';
                response.failed.push({ id: 0, status, reason });
            }
        }
        // Clean up cancel flag and include cancelled state in response
        const cancelled = restoreConvosCancelFlags.get(senderId) === true;
        restoreConvosCancelFlags.delete(senderId);
        return { ...response, cancelled };
    });

    // Cancelling restoration of deleted conversations (per renderer)
    ipcMain.handle('axios:cancelRestoreDeletedConversations', async (event) => {
        console.log('Inside axios:cancelRestoreDeletedConversations');
        try {
            const senderId = event.sender.id;
            // Lazily create the map if not present in some edge scope
            // but it's defined above; this is just defensive.
            if (typeof restoreConvosCancelFlags.set === 'function') {
                restoreConvosCancelFlags.set(senderId, true);
                return { cancelled: true };
            }
            return { cancelled: false };
        } catch (e) {
            return { cancelled: false };
        }
    });

    // Cancellable deletion of conversations (per renderer)
    const deleteConvosCancelFlags = new Map(); // senderId -> boolean

    // Deleting conversations (per renderer)
    ipcMain.handle('axios:deleteConvos', async (event, data) => {
        console.log('inside axios:deleteConvos');

        const senderId = event.sender.id;
        deleteConvosCancelFlags.set(senderId, false);

        let completedRequests = 0;
        const totalRequests = data.messages.length;
        const updateProgress = () => {
            completedRequests++;
            try {
                mainWindow.webContents.send('update-progress', {
                    mode: 'determinate',
                    label: 'Deleting conversations',
                    processed: completedRequests,
                    total: totalRequests,
                    value: totalRequests ? (completedRequests / totalRequests) : 0
                });
            } catch { }
        };

        const requests = data.messages.map((msg, i) => ({
            id: i + 1,
            requestData: { domain: data.domain, token: data.token, message: msg.id }
        }));

        const successful = [];
        const failed = [];
        const batchSize = 35;
        const timeDelay = 2000;
        for (let i = 0; i < requests.length; i += batchSize) {
            // cancel check before starting a batch
            if (deleteConvosCancelFlags.get(senderId)) break;
            const batch = requests.slice(i, i + batchSize);
            const results = await Promise.allSettled(batch.map(r =>
                convos.deleteForAll(r.requestData)
                    .then(res => ({ ok: true, res, id: r.id }))
                    .catch(err => ({ ok: false, err, id: r.id }))
                    .finally(() => updateProgress())
            ));
            for (const r of results) {
                const val = r.value || r.reason;
                if (r.status === 'fulfilled' && val?.ok) {
                    successful.push({ id: val.id, value: val.res });
                } else {
                    const vv = r.status === 'fulfilled' ? r.value : r.reason;
                    failed.push({ id: vv?.id, reason: (vv?.err?.message || vv?.err || 'Unknown error'), status: vv?.err?.status });
                }
            }
            if (i + batchSize < requests.length && !deleteConvosCancelFlags.get(senderId)) {
                await new Promise(r => setTimeout(r, timeDelay));
            }
        }

        const cancelled = deleteConvosCancelFlags.get(senderId) === true;
        deleteConvosCancelFlags.delete(senderId);
        return { successful, failed, cancelled };
    });

    // Cancelling deletion of conversations (per renderer)
    ipcMain.handle('axios:cancelDeleteConvos', async (event) => {
        try {
            const senderId = event.sender.id;
            deleteConvosCancelFlags.set(senderId, true);
            return { cancelled: true };
        } catch { return { cancelled: false }; }
    });

    // === COMMUNICATION CHANNELS SECTION ===

    // AWS Suppression check (single email)
    ipcMain.handle('axios:awsCheck', async (event, data) => {
        try {
            const result = await awsCheck({ ...data, email: data.email });
            // awsReset returns { status, reset, error }, but for check we want true/false
            return result.status !== '404';
        } catch (error) {
            throw error.message || error;
        }
    });

    // Bounce check (single email)
    ipcMain.handle('axios:bounceCheck', async (event, { domain, token, email }) => {
        try {
            return await bounceCheck(domain, token, email);
        } catch (error) {
            throw error.message || error;
        }
    });

    // Checking communication channel (per renderer)
    ipcMain.handle('axios:checkCommChannel', async (event, data) => {
        console.log('inside axios:checkCommChannel');

        try {
            const response = await emailCheck(data);
            return response;
        } catch (error) {
            throw error.message;
        }

    });

    // Checking communication domain (per renderer)
    ipcMain.handle('axios:checkCommDomain', async (event, data) => {
        console.log('inside axios:checkCommDomain');
        suppressedEmails = [];

        // handle 1000 items at a time to prevent max call stack size exceeded
        function processLargeArray(largeArray) {
            const chunkSize = 1000;
            for (let i = 0; i < largeArray.length; i += chunkSize) {
                const chunk = largeArray.slice(i, i + chunkSize);
                suppressedEmails.push(...chunk);
            }
        }
        // const fakeEmails = Array.from({ length: 20 }, (_, i) => `fake${i + 1}@example.com`);
        // suppressedEmails.push(...fakeEmails);

        try {
            const response = await checkCommDomain(data);
            processLargeArray(response);

            // suppressedEmails.push(...response);
            if (suppressedEmails.length > 0) {
                return true;
            } else {
                return false;
            }
        } catch (error) {
            throw error.message;
        }
    });

    // Removed duplicate handler for 'axios:resetCommChannelsByPattern' (see single definition near bottom)

    // === ASSIGNMENTS SECTION ===

    // Create assignments (per renderer)
    ipcMain.handle('axios:createAssignments', async (event, data) => {
        console.log('inside axios:createAssignments');
        console.log('Received operation ID:', data.operationId);

        const operationId = data.operationId || null;
        
        // Initialize cancellation flag for this operation
        if (operationId) {
            console.log('Initializing cancellation flag for:', operationId);
            operationCancelFlags.set(operationId, false);
            console.log('Current cancel flags after init:', Array.from(operationCancelFlags.entries()));
        } else {
            console.log('No operation ID provided - cancellation not available');
        }

        let completedRequests = 0;
        let totalRequests = data.number;

        const updateProgress = () => {
            completedRequests++;
            mainWindow.webContents.send('update-progress', {
                mode: 'determinate',
                label: `Creating assignments (${completedRequests}/${totalRequests})`,
                processed: completedRequests,
                total: totalRequests,
                value: completedRequests / totalRequests
            });
        }

        const request = async (requestData) => {
            try {
                const response = await assignments.createAssignments(requestData);
                return response;
            } catch (error) {
                throw error;
            } finally {
                updateProgress();
            }
        }

        let requests = [];
        for (let i = 0; i < data.number; i++) {
            // When creating multiple assignments, append a counter to the name
            let assignmentName = data.name;
            if (data.number > 1) {
                assignmentName = `${data.name} ${i + 1}`;
            }

            const requestData = {
                domain: data.domain,
                token: data.token,
                course_id: data.course_id,
                anonymous: data.anonymous,
                grade_type: data.grade_type,
                name: assignmentName,
                peer_reviews: data.peer_reviews,
                peer_review_count: data.peer_review_count,
                points: data.points,
                publish: data.publish,
                submissionTypes: data.submissionTypes
            };
            requests.push({ id: i + 1, request: () => request(requestData) });
        }

        // Cancellation check function for batchHandler
        const isCancelled = operationId ? () => operationCancelFlags.get(operationId) === true : null;
        
        const batchConfig = getBatchConfig();
        const batchResponse = await batchHandler(requests, {
            ...batchConfig,
            isCancelled,
            operationId
        });

        // Check if operation was cancelled
        const wasCancelled = operationId && operationCancelFlags.get(operationId) === true;
        
        // Clean up cancellation flag
        if (operationId) {
            operationCancelFlags.delete(operationId);
        }

        console.log(`Finished creating assignments. ${wasCancelled ? '(Cancelled)' : ''}`);
        return { ...batchResponse, cancelled: wasCancelled };
    });

    // Global cancellation flags for delete operations
    const deleteCancelFlags = new Map();

    ipcMain.handle('axios:cancelDeleteOperations', async (event) => {
        const senderId = event.sender.id;
        deleteCancelFlags.set(senderId, true);
        console.log(`Delete operations cancelled for sender ${senderId}`);
        return { cancelled: true };
    });

    // 
    ipcMain.handle('axios:deleteAssignments', async (event, data) => {
        console.log('inside axios:deleteAssignments');
        console.log('Received operation ID:', data.operationId);

        const operationId = data.operationId || null;
        
        // Initialize cancellation flag for this operation
        if (operationId) {
            console.log('Initializing cancellation flag for:', operationId);
            operationCancelFlags.set(operationId, false);
            console.log('Current cancel flags after init:', Array.from(operationCancelFlags.entries()));
        } else {
            console.log('No operation ID provided - cancellation not available');
        }

        let completedRequests = 0;
        let totalRequests = data.number;

        const updateProgress = () => {
            completedRequests++;
            mainWindow.webContents.send('update-progress', (completedRequests / totalRequests) * 100);
        }

        const request = async (requestData) => {
            try {
                // const response = await window.axios.deleteTheThings(messageData);
                const response = await assignments.deleteAssignments(requestData);
                return response;
            } catch (error) {
                // console.error('Error: ', error);
                throw error;
            } finally {
                updateProgress();
            }
        }

        let requests = [];
        for (let i = 0; i < data.assignments.length; i++) {
            const requestData = {
                domain: data.domain,
                token: data.token,
                course_id: data.course_id,
                id: data.assignments[i]?.id || data.assignments[i]
            };
            requests.push({ id: i + 1, request: () => request(requestData) });
        }

        // Cancellation check function for batchHandler
        const isCancelled = operationId ? () => operationCancelFlags.get(operationId) === true : null;
        
        const batchResponse = await batchHandler(requests, getBatchConfig({ isCancelled, operationId }));
        
        // Check if operation was cancelled
        const wasCancelled = operationId && operationCancelFlags.get(operationId) === true;
        
        // Clean up cancellation flag
        if (operationId) {
            operationCancelFlags.delete(operationId);
        }
        
        console.log(`Finished deleting assignments. ${wasCancelled ? '(Cancelled)' : ''}`);
        return { ...batchResponse, cancelled: wasCancelled };
    });

    ipcMain.handle('axios:getEmptyAssignmentGroups', async (event, data) => {
        console.log('Inside axios:getEmptyAssignmentGroups')

        try {
            const aGroups = await assignmentGroups.getEmptyAssignmentGroups(data);

            return aGroups;
        } catch (error) {
            throw error.message;
        }

    });

    ipcMain.handle('axios:deleteEmptyAssignmentGroups', async (event, data) => {
        console.log('Inside axios:deleteEmptyAssignmentGroups')

        const senderId = event.sender.id;

        try {
            // Handle single group deletion (called from assignments_renderer.js)
            if (data.groupID && !data.content) {
                const response = await assignmentGroups.deleteEmptyAssignmentGroup(data);
                return response;
            }

            // Handle batch deletion (if called with content array)
            if (data.content && Array.isArray(data.content)) {
                deleteEmptyAssignmentGroupsCancelFlags.set(senderId, false);

                let completedRequests = 0;
                const totalRequests = data.content.length;

                const updateProgress = () => {
                    completedRequests++;
                    mainWindow.webContents.send('update-progress', (completedRequests / totalRequests) * 100);
                }

                const request = async (requestData) => {
                    // Check if cancellation was requested
                    if (deleteEmptyAssignmentGroupsCancelFlags.get(senderId)) {
                        throw new Error('Request cancelled');
                    }
                    
                    try {
                        const response = await assignmentGroups.deleteEmptyAssignmentGroup(requestData);
                        return response;
                    } catch (error) {
                        throw error;
                    } finally {
                        updateProgress();
                    }
                }

                let requests = [];
                let requestCounter = 1;
                data.content.forEach((group) => {
                    const requestData = {
                        domain: data.url,
                        token: data.token,
                        groupID: group._id,
                        id: requestCounter
                    }
                    requests.push(() => request(requestData));
                    requestCounter++;
                });

                // Execute batch requests (implementation would go here)
                // For now, just execute them sequentially
                const results = [];
                for (const requestFn of requests) {
                    try {
                        const result = await requestFn();
                        results.push(result);
                    } catch (error) {
                        results.push({ error: error.message });
                    }
                }

                console.log('Finished deleting assignment groups.');
                return results;
            }

            throw new Error('Invalid data format: missing groupID or content array');
        } catch (error) {
            console.error('Error in deleteEmptyAssignmentGroups handler:', error);
            throw error;
        } finally {
            // Clean up the cancellation flag if it was set for batch deletion
            if (data.content && Array.isArray(data.content)) {
                deleteEmptyAssignmentGroupsCancelFlags.delete(senderId);
            }
        }
    });

    // === DISCUSSIONS & CONTENT CREATION SECTION ===

    // Create Discussions (REST) and Announcements (REST with is_announcement)
    ipcMain.handle('axios:createDiscussions', async (_event, data) => {
        console.log('inside axios:createDiscussions');
        const items = Array.isArray(data.requests) ? data.requests : [];
        let completed = 0;
        const total = items.length || 1;
        const update = () => {
            completed++;
            mainWindow?.webContents.send('update-progress', {
                mode: 'determinate', label: 'Creating discussions', processed: completed, total, value: completed / total
            });
        };
        const requests = items.map((it, idx) => ({
            id: idx + 1,
            request: async () => {
                try {
                    const payload = {
                        domain: it.domain, token: it.token, course_id: it.course_id,
                        title: it.title, message: it.message, published: !!it.published
                    };
                    const resp = await discussions.createDiscussion(payload);
                    return resp;
                } finally { update(); }
            }
        }));
        const res = await batchHandler(requests, getBatchConfig());
        return res;
    });

    ipcMain.handle('axios:createAnnouncements', async (event, data) => {
        const operationId = `create-announcements-${Date.now()}`;
        console.log(`[${operationId}] Starting - ${data.number} announcements requested`);
        
        let completedRequests = 0;
        let totalRequests = data.number;
        const processedIds = new Set(); // Track which requests have been processed for progress

        const updateProgress = (requestId) => {
            // Only increment progress once per unique request ID
            if (!processedIds.has(requestId)) {
                processedIds.add(requestId);
                completedRequests++;
                mainWindow.webContents.send('update-progress', {
                    mode: 'determinate',
                    label: `Creating announcements (${completedRequests}/${totalRequests})`,
                    processed: completedRequests,
                    total: totalRequests,
                    value: completedRequests / totalRequests
                });
            }
        };

        const request = async (requestData, requestId) => {
            try {
                const response = await discussions.createDiscussion(requestData);
                return response;
            } catch (error) {
                throw error;
            } finally {
                updateProgress(requestId);
            }
        };

        let requests = [];
        for (let i = 1; i <= data.number; i++) {
            const requestData = {
                domain: data.domain,
                token: data.token,
                course_id: data.course_id,
                title: `${data.title} ${i}`,
                message: data.message || '',
                published: true,  // Announcements are always published
                is_announcement: true,
                delayed_post_at: data.delayed_post_at || null,
                lock_at: data.lock_at || null
            };
            requests.push({ id: i, request: () => request(requestData, i) });
        }

        // Support cancellation per-sender
        const senderId = event.sender.id;
        const createAnnouncementsCancelFlags = new Map();
        const isCancelled = () => createAnnouncementsCancelFlags.get(senderId) === true;
        
        console.log(`[${operationId}] Calling batchHandler...`);
        const batchResponse = await batchHandler(requests, getBatchConfig({ isCancelled, operationId }));

        console.log(`[${operationId}] Finished creating announcements. Successful: ${batchResponse.successful.length}, Failed: ${batchResponse.failed.length}`);
        return batchResponse;
    });

    ipcMain.handle('axios:createPages', async (_event, data) => {
        console.log('inside axios:createPages');
        const items = Array.isArray(data.requests) ? data.requests : [];
        let completed = 0;
        const total = items.length || 1;
        const update = () => {
            completed++;
            mainWindow?.webContents.send('update-progress', {
                mode: 'determinate', label: 'Creating pages', processed: completed, total, value: completed / total
            });
        };
        const requests = items.map((it, idx) => ({
            id: idx + 1,
            request: async () => {
                try {
                    const resp = await pages.createPage({
                        domain: it.domain, token: it.token, course_id: it.course_id,
                        title: it.title, body: it.body, published: !!it.published
                    });
                    return resp;
                } finally { update(); }
            }
        }));
        const res = await batchHandler(requests, getBatchConfig());
        return res;
    });

    ipcMain.handle('axios:createSections', async (_event, data) => {
        console.log('inside axios:createSections');
        const items = Array.isArray(data.requests) ? data.requests : [];
        let completed = 0;
        const total = items.length || 1;
        const update = () => {
            completed++;
            mainWindow?.webContents.send('update-progress', {
                mode: 'determinate', label: 'Creating sections', processed: completed, total, value: completed / total
            });
        };
        const requests = items.map((it, idx) => ({
            id: idx + 1,
            request: async () => {
                try {
                    const resp = await sections.createSection({
                        domain: it.domain, token: it.token, course_id: it.course_id, name: it.name
                    });
                    return resp;
                } finally { update(); }
            }
        }));
        const res = await batchHandler(requests, getBatchConfig());
        return res;
    });

    ipcMain.handle('axios:getNoSubmissionAssignments', async (event, data) => {
        console.log('main.js > axios:getNoSubmissionAssignments');

        try {
            const result = await assignments.getNoSubmissionAssignments(data.domain, data.course_id, data.token, data.graded);

            return result;
        } catch (error) {
            console.log(error);
            throw error.message;
        }

    });

    ipcMain.handle('axios:getUnpublishedAssignments', async (event, data) => {
        console.log('main.js > axios:getUnpublishedAssignments');

        try {
            const results = await assignments.getUnpublishedAssignments(data.domain, data.course, data.token);

            return results;
        } catch (error) {
            throw error.message;
        }
    });

    ipcMain.handle('axios:getNonModuleAssignments', async (event, data) => {
        console.log('main.js > axios:getNonModuleAssignments');

        try {
            const results = await assignments.getNonModuleAssignments(data.domain, data.course, data.token);
            return results;
        } catch (error) {
            throw error.message;
        }
    });

    ipcMain.handle('axios:getOldAssignments', async (event, data) => {
        console.log('main.js > axios:getOldAssignments');

        try {
            const response = await assignments.getOldAssignmentsGraphQL(data);
            return response;
        } catch (error) {
            throw error.message
        }
    })

    ipcMain.handle('axios:getNoDueDateAssignments', async (event, data) => {
        console.log('main.js > axios:getNoDueDateAssignments');
        try {
            const results = await assignments.getNoDueDateAssignments(data.domain, data.course_id, data.token);
            return results;
        } catch (error) {
            throw error.message;
        }
    });

    // Unified fetch for combined delete assignments flow
    // Track cancellable requests by sender
    const combinedFetchControllers = new Map(); // key: senderId, value: AbortController

    ipcMain.handle('axios:getAllAssignmentsForCombined', async (event, data) => {
        console.log('main.js > axios:getAllAssignmentsForCombined');
        try {
            // Abort any previous fetch for this sender
            const senderId = event.sender.id;
            if (combinedFetchControllers.has(senderId)) {
                try { combinedFetchControllers.get(senderId).abort('superseded'); } catch { }
            }
            const controller = new AbortController();
            combinedFetchControllers.set(senderId, controller);
            const results = await assignments.getAllAssignmentsForCombined({ ...data, signal: controller.signal });
            // clear on success
            if (combinedFetchControllers.get(senderId) === controller) combinedFetchControllers.delete(senderId);
            return results;
        } catch (error) {
            // Clear controller if it belongs to this request
            try {
                const senderId = event.sender.id;
                if (combinedFetchControllers.get(senderId)?.signal?.aborted) combinedFetchControllers.delete(senderId);
            } catch { }
            throw error.message || error;
        }
    });

    ipcMain.handle('axios:cancelAllAssignmentsForCombined', async (event) => {
        try {
            const senderId = event.sender.id;
            const controller = combinedFetchControllers.get(senderId);
            if (controller) {
                controller.abort('user_cancelled');
                combinedFetchControllers.delete(senderId);
                return { cancelled: true };
            }
            return { cancelled: false };
        } catch (e) {
            return { cancelled: false };
        }
    });

    // Cancellation flags defined at module scope

    ipcMain.handle('axios:deleteOldAssignments', async (event, data) => {
        console.log('main.js > axios:deleteOldAssignments');

        console.log('The data in main: ', data);
        return;
    });

    ipcMain.handle('axios:getImportedAssignments', async (event, data) => {
        console.log('main.js > axios:getImportedAssignments');

        try {
            const importedAssignments = await assignments.getImportedAssignments(data);
            return importedAssignments;
        } catch (error) {
            throw error.message;
        }
    });

    // New unified imported assets fetch
    ipcMain.handle('axios:getImportedAssets', async (event, data) => {
        console.log('main.js > axios:getImportedAssets');
        try {
            return await imports.getImportedAssets(data);
        } catch (error) {
            // Surface clearer guidance for 404 (likely wrong import id)
            // if (String(error.message).includes('status code 404')) {
            //     throw new Error('404 Not Found: The Import ID may be invalid for this course. Use "List Imports" to find a valid Import ID.');
            // }
            throw error.message;
        }
    });

    ipcMain.handle('axios:listContentMigrations', async (event, data) => {
        console.log('main.js > axios:listContentMigrations');
        try {
            return await imports.listContentMigrations(data);
        } catch (error) {
            throw error.message;
        }
    });

    // Batch delete discussions by ids
    ipcMain.handle('axios:deleteDiscussions', async (event, data) => {
        console.log('main.js > axios:deleteDiscussions');

        const totalRequests = data.discussions.length;
        let completedRequests = 0;
        const updateProgress = () => {
            completedRequests++;
            mainWindow.webContents.send('update-progress', (completedRequests / totalRequests) * 100);
        };

        const request = async (reqData) => {
            try {
                return await discussions.deleteDiscussion(reqData);
            } catch (error) {
                throw error;
            } finally {
                updateProgress();
            }
        };

        const requests = [];
        for (let i = 0; i < totalRequests; i++) {
            const reqData = {
                domain: data.domain,
                token: data.token,
                course_id: data.course_id,
                discussion_id: data.discussions[i]?.id || data.discussions[i]
            };
            requests.push({ id: i + 1, request: () => request(reqData) });
        }

        const batchResponse = await batchHandler(requests, getBatchConfig());
        return batchResponse;
    });

    // Get announcements from a course using GraphQL with pagination
    ipcMain.handle('axios:getAnnouncements', async (event, data) => {
        console.log('main.js > axios:getAnnouncements');
        const { domain, token, course_id } = data;
        
        let allAnnouncements = [];
        let hasNextPage = true;
        let after = null;
        let pageCount = 0;

        try {
            while (hasNextPage) {
                pageCount++;
                
                // Send progress update to renderer
                mainWindow?.webContents.send('update-progress', {
                    mode: 'indeterminate',
                    label: `Fetching announcements (page ${pageCount})...`
                });

                const response = await discussions.getAnnouncements({
                    domain,
                    token,
                    course_id,
                    first: 100,
                    after: after
                });

                allAnnouncements.push(...response.nodes);
                hasNextPage = response.pageInfo.hasNextPage;
                after = response.pageInfo.endCursor;
            }

            console.log(`Fetched ${allAnnouncements.length} announcements across ${pageCount} page(s)`);
            return { 
                announcements: allAnnouncements, 
                count: allAnnouncements.length 
            };
        } catch (error) {
            console.error('Error getting announcements:', error);
            throw error.message;
        }
    });

    // Delete discussion topics using GraphQL
    ipcMain.handle('axios:deleteAnnouncementsGraphQL', async (_event, data) => {
        console.log('main.js > axios:deleteAnnouncementsGraphQL');
        const items = Array.isArray(data.discussions) ? data.discussions : [];
        const operationId = data.operationId || null;
        
        // Initialize cancellation flag for this operation
        if (operationId) {
            operationCancelFlags.set(operationId, false);
        }
        
        let completed = 0;
        const total = items.length || 1;
        const update = () => {
            completed++;
            mainWindow?.webContents.send('update-progress', {
                mode: 'determinate', label: 'Deleting announcements', processed: completed, total, value: completed / total
            });
        };
        
        // Cancellation check function for batchHandler
        const isCancelled = operationId ? () => operationCancelFlags.get(operationId) === true : null;
        
        const requests = items.map((discussion, idx) => ({
            id: idx + 1,
            request: async () => {
                try {
                    const resp = await discussions.deleteDiscussionTopic({
                        domain: data.domain,
                        token: data.token,
                        discussion_id: discussion._id || discussion.id
                    });
                    return resp;
                } finally { update(); }
            }
        }));
        
        const batchConfig = getBatchConfig();
        const res = await batchHandler(requests, {
            ...batchConfig,
            isCancelled,
            operationId
        });

        // Check if operation was cancelled
        const wasCancelled = operationId && operationCancelFlags.get(operationId) === true;
        
        // Clean up cancellation flag
        if (operationId) {
            operationCancelFlags.delete(operationId);
        }
        
        console.log(`Finished deleting announcements. ${wasCancelled ? '(Cancelled)' : ''}`);
        return { ...res, cancelled: wasCancelled };
    });

    // Cancel an operation by operationId
    ipcMain.handle('axios:cancelOperation', async (_event, operationId) => {
        console.log(`main.js > axios:cancelOperation - ${operationId}`);
        console.log('Operation exists in map:', operationCancelFlags.has(operationId));
        console.log('Current cancel flags:', Array.from(operationCancelFlags.entries()));
        
        if (operationId && operationCancelFlags.has(operationId)) {
            console.log('Setting cancellation flag to true for:', operationId);
            operationCancelFlags.set(operationId, true);
            return { cancelled: true, operationId };
        }
        console.log('Cannot cancel - operation not found in map');
        return { cancelled: false, operationId };
    });

    // Batch delete attachments (files)
    ipcMain.handle('axios:deleteAttachments', async (event, data) => {
        console.log('main.js > axios:deleteAttachments');

        const totalRequests = data.attachments.length;
        let completedRequests = 0;
        const updateProgress = () => {
            completedRequests++;
            mainWindow.webContents.send('update-progress', (completedRequests / totalRequests) * 100);
        };

        const request = async (reqData) => {
            try {
                return await files.deleteFile(reqData);
            } catch (error) {
                throw error;
            } finally {
                updateProgress();
            }
        };

        const requests = [];
        for (let i = 0; i < totalRequests; i++) {
            const reqData = {
                domain: data.domain,
                token: data.token,
                file_id: data.attachments[i]?.id || data.attachments[i]
            };
            requests.push({ id: i + 1, request: () => request(reqData) });
        }

        const batchResponse = await batchHandler(requests, getBatchConfig());
        return batchResponse;
    });

    // Batch delete group categories (for Content Tags handling)
    ipcMain.handle('axios:deleteGroupCategories', async (event, data) => {
        console.log('main.js > axios:deleteGroupCategories');
        const totalRequests = data.group_categories.length;
        let completedRequests = 0;
        const updateProgress = () => {
            completedRequests++;
            mainWindow.webContents.send('update-progress', (completedRequests / totalRequests) * 100);
        };

        const request = async (reqData) => {
            try {
                return await groupCategories.deleteGroupCategory(reqData);
            } catch (error) {
                throw error;
            } finally {
                updateProgress();
            }
        };

        const requests = [];
        for (let i = 0; i < totalRequests; i++) {
            const reqData = {
                domain: data.domain,
                token: data.token,
                group_category_id: data.group_categories[i]?.id || data.group_categories[i]
            };
            requests.push({ id: i + 1, request: () => request(reqData) });
        }

        const batchResponse = await batchHandler(requests, getBatchConfig());
        return batchResponse;
    });

    // Batch delete folders by ids
    ipcMain.handle('axios:deleteFolders', async (event, data) => {
        console.log('main.js > axios:deleteFolders');

        const totalRequests = data.folders.length;
        let completedRequests = 0;
        const updateProgress = () => {
            completedRequests++;
            mainWindow.webContents.send('update-progress', (completedRequests / totalRequests) * 100);
        };

        const request = async (reqData) => {
            try {
                // Pre-check folder to avoid deleting root folders
                const info = await folders.getFolder(reqData);
                // Canvas returns root folders with parent_folder_id null
                if (
                    info && (
                        info.parent_folder_id === null ||
                        typeof info.parent_folder_id === 'undefined' ||
                        info.parent_folder_id === 'null'
                    )
                ) {
                    const err = new Error(`Folder ${info.id || reqData.folder_id} is a root folder and cannot be deleted.`);
                    err.status = 422; // Unprocessable / business rule
                    throw err;
                }
                return await folders.deleteFolder(reqData);
            } catch (error) {
                throw error;
            } finally {
                updateProgress();
            }
        };

        const requests = [];
        for (let i = 0; i < totalRequests; i++) {
            const reqData = {
                domain: data.domain,
                token: data.token,
                folder_id: data.folders[i]?.id || data.folders[i]
            };
            requests.push({ id: i + 1, request: () => request(reqData) });
        }

        const batchResponse = await batchHandler(requests, getBatchConfig());
        return batchResponse;
    });

    // Get folder metadata for a list of folder IDs and tag root folders
    ipcMain.handle('axios:getFoldersMeta', async (event, data) => {
        console.log('main.js > axios:getFoldersMeta');
        const ids = (data.folders || []).map(f => (f?.id || f));
        const requests = ids.map((id, idx) => ({
            id: idx + 1,
            request: async () => folders.getFolder({ domain: data.domain, token: data.token, folder_id: id })
        }));
        const result = await batchHandler(requests, getBatchConfig({ timeDelay: 200 }));
        const meta = [];
        // successful is array of {id,status,value}
        for (const s of result.successful) {
            const f = s.value;
            meta.push({ id: f.id, parent_folder_id: f.parent_folder_id, isRoot: (f.parent_folder_id === null || f.parent_folder_id === 'null' || typeof f.parent_folder_id === 'undefined') });
        }
        // failed items: include ids for visibility
        for (const f of result.failed) {
            meta.push({ id: ids[(f.id - 1)] || null, error: f.reason, isRoot: false });
        }
        return meta;
    });

    ipcMain.handle('axios:keepAssignmentsInGroup', async (event, data) => {
        console.log('main.js > axios:keepAssignmentsInGroup');

        try {
            const response = await assignments.getAssignmentsInOtherGroups(data);
            return response;
        } catch (error) {
            throw error.message;
        }
    });

    ipcMain.handle('axios:getAssignmentsToMove', async (event, data) => {
        console.log('main.js > axios:getAssignmentsToMove');

        // 1. Get all assignments
        // 2. Get assignment group id of first assignment
        // 3. Move all assignments to that group

        try {
            const results = await assignments.getAssignmentsToMove(data.domain, data.course, data.token);
            return results;
        } catch (error) {
            throw error.message;
        }
    });

    ipcMain.handle('axios:moveAssignmentsToSingleGroup', async (event, data) => {
        console.log('main.js > axios:moveAssignmentsToSingleGroup');

        let completedRequests = 0;
        let totalRequests = data.number;

        const updateProgress = () => {
            completedRequests++;
            mainWindow.webContents.send('update-progress', (completedRequests / totalRequests) * 100);
        }

        const request = async (data) => {
            try {
                const response = await assignments.moveAssignmentToGroup(data)
                return response;
            } catch (error) {
                throw `status code ${error.status} - ${error.message}`;
            } finally {
                updateProgress();
            }
        }

        const requests = [];
        let requestCounter = 1;
        for (let assignment of data.assignments) {
            const requestData = {
                url: data.url,
                token: data.token,
                id: assignment._id,
                groupID: data.groupID
            }
            requests.push({ id: requestCounter, request: () => request(requestData) });
            requestCounter++;
        }

        const batchResponse = await batchHandler(requests, getBatchConfig());
        return batchResponse;
    });

    ipcMain.handle('axios:getAssignmentGroupById', async (event, data) => {
        console.log('main.js > axios:getAssignmentGroupById');

        try {
            const result = await assignmentGroups.getAssignmentGroupById(data);
            return result;
        } catch (error) {
            throw error.message;
        }
    });

    ipcMain.handle('axios:getAssignmentsInGroup', async (event, data) => {
        console.log('main.js > axios:getAssignmentsInGroup');

        try {
            const assignmentsInGroup = await assignments.getAssignmentsInGroup(data.domain, data.token, data.group_id);
            return assignmentsInGroup;
        } catch (error) {
            throw error.message;
        }
    });

    ipcMain.handle('axios:deleteAssignmentGroupAssignments', async (event, data) => {
        console.log('main.js > axios:deleteAssignmentGroupAssignments');

        let completedRequests = 0;
        let totalRequests = data.number;

        const updateProgress = () => {
            completedRequests++;
            mainWindow.webContents.send('update-progress', (completedRequests / totalRequests) * 100);
        }

        // try to delete the assignment group and all assignments
        const request = async (requestData) => {
            return await assignments.deleteAssignmentGroupWithAssignments(requestData)
        }
        try {
            const response = await request(data);
            return response.data;
        } catch (error) {
            console.log(error);
            throw error.message;
        }

        // const requests = [];
        // let requestCounter = 1;
        // for (let assignment of data.assignments) {
        //     const requestData = {
        //         url: data.url,
        //         token: data.token,
        //         id: assignment._id,
        //         groupID: data.groupID
        //     }
        //     requests.push({ id: requestCounter, request: () => request(requestData) });
        //     requestCounter++;
        // }

        // const batchResponse = await batchHandler(requests);
        // return batchResponse;
    });


    ipcMain.handle('axios:createAssignmentGroups', async (event, data) => {
        console.log('Inside axios:createAssignmentGroups')

        const senderId = event.sender.id;
        createAssignmentGroupsCancelFlags.set(senderId, false);

        let completedRequests = 0;
        let totalRequests = data.number;

        const updateProgress = () => {
            completedRequests++;
            mainWindow.webContents.send('update-progress', (completedRequests / totalRequests) * 100);
        }

        const request = async (requestData, index) => {
            // Check if cancellation was requested
            if (createAssignmentGroupsCancelFlags.get(senderId)) {
                throw new Error('Request cancelled');
            }
            
            try {
                const response = await assignmentGroups.createAssignmentGroups(requestData);
                return response;
            } catch (error) {
                throw error
            } finally {
                updateProgress();
            }
        };

        const requests = [];
        for (let i = 0; i < totalRequests; i++) {
            // Build request data with name suffix if creating multiple groups
            const requestData = {
                domain: data.domain,
                token: data.token,
                course: data.course,
                name: totalRequests > 1 ? `${data.name} ${i + 1}` : data.name,
                position: i + 1
            };
            requests.push({ id: i + 1, request: () => request(requestData, i) });
        }

        try {
            const batchResponse = await batchHandler(requests, getBatchConfig());
            return batchResponse;
        } finally {
            // Clean up the cancellation flag
            createAssignmentGroupsCancelFlags.delete(senderId);
        }
    });

    // Cancel assignment group creation
    ipcMain.handle('axios:cancelCreateAssignmentGroups', async (event) => {
        const senderId = event.sender.id;
        console.log(`Cancelling assignment group creation for sender ${senderId}`);
        createAssignmentGroupsCancelFlags.set(senderId, true);
        return { cancelled: true };
    });

    // Cancel delete empty assignment groups
    ipcMain.handle('axios:cancelDeleteEmptyAssignmentGroups', async (event) => {
        const senderId = event.sender.id;
        console.log(`Cancelling delete empty assignment groups for sender ${senderId}`);
        deleteEmptyAssignmentGroupsCancelFlags.set(senderId, true);
        return { cancelled: true };
    });

    // ipcMain.handle('axios:deleteTheThings', async (event, data) => {
    //     console.log('Inside axios:deleteTheThings')

    //     // const result = deleteRequester(data.content, data.url, null, data.token);
    //     // const result = await assignmentGroups.deleteEmptyAssignmentGroups(data.domain, data.course, data.token, data.groups);
    //     const batchResponse = await batchHandler(data, data.action);

    //     return result;
    // });

    ipcMain.handle('axios:getPageViews', async (event, data) => {
        console.log('main.js > axios:getPageViews');

        let response;
        try {
            // Pass mainWindow reference for progress updates
            response = await getPageViews(data, mainWindow);
        } catch (error) {
            throw error.message;
        }

        // Handle different response types from the enhanced getPageViews function
        if (typeof response === 'string' && response === 'cancelled') {
            return 'cancelled';
        }

        // Handle single user response (legacy format)
        if (Array.isArray(response)) {
            if (response.length > 0) {
                const userId = data.user || data.userIds[0];
                const filename = `${userId}_page_views.csv`;
                const fileDetails = await getFileLocation(filename);
                if (fileDetails) {
                    await csvExporter.exportToCSV(response, fileDetails);
                    return { success: true, isZipped: false };
                } else {
                    return 'cancelled';
                }
            } else {
                console.log('no page views');
                return { success: false };
            }
        }

        // Handle enhanced response object (multiple users or single user with metadata)
        if (response && typeof response === 'object') {
            if (response.success === false) {
                return response;
            }

            // If it's a single user response with data array
            if (response.data && Array.isArray(response.data)) {
                const filename = `user_${response.userId}_page_views.csv`;
                const fileDetails = await getFileLocation(filename);
                if (fileDetails) {
                    await csvExporter.exportToCSV(response.data, fileDetails);
                    return { success: true, isZipped: false };
                } else {
                    return 'cancelled';
                }
            }

            // If it's a zipped response, the ZIP file has already been created
            if (response.isZipped) {
                return response;
            }

            return response;
        }

        // Fallback for unexpected response format
        console.log('no page views or unexpected response format');
        return { success: false };
    });

    // === COURSE MANAGEMENT SECTION ===

    // Restore content in courses from deleted state
    ipcMain.handle('axios:restoreContent', async (event, data) => {
        console.log('main.js > axios:restoreContent');

        const totalNumber = data.values.length;
        let completedRequests = 0;

        const updateProgress = () => {
            completedRequests++;
            mainWindow.webContents.send('update-progress', (completedRequests / totalNumber) * 100);
        };

        const request = async (requestData) => {
            try {
                const response = await restoreContent(requestData);
                return response;
            } catch (error) {
                throw error
            } finally {
                updateProgress();
            }
        };

        const requests = [];
        let requestID = 1;
        data.values.forEach((value) => {
            const requestData = {
                domain: data.domain,
                token: data.token,
                course_id: data.courseID,
                context: data.context,
                value: value
            };
            requests.push({ id: requestID, request: () => request(requestData) });
            requestID++;
        });

        const batchResponse = await batchHandler(requests, getBatchConfig());
        return batchResponse;
    });

    ipcMain.handle('axios:resetCourses', async (event, data) => {
        console.log('main.js > axios:resetCourses');

        let completedRequests = 0;
        const totalRequests = data.courses.length;

        const updateProgress = () => {
            completedRequests++;
            mainWindow.webContents.send('update-progress', (completedRequests / totalRequests) * 100)
        }

        const request = async (requestData) => {
            try {
                const response = await resetCourse(requestData);
                return response;
            } catch (error) {
                throw error;
            } finally {
                updateProgress();
            }
        }

        const requests = [];
        let requestID = 1;
        data.courses.forEach((course) => {
            const requestData = {
                domain: data.domain,
                token: data.token,
                course: course
            };
            requests.push({ id: requestID, request: () => request(requestData) });
            requestID++;
        })

        const batchResponse = await batchHandler(requests, getBatchConfig());
        return batchResponse;
    });

    // Helpers: create users and enroll them (placed before handler for visibility)
    async function addUsersToCanvas(usersToEnroll) {
        const domain = usersToEnroll.domain;
        const token = usersToEnroll.token;
        const students = Array.isArray(usersToEnroll.students) ? usersToEnroll.students : [];
        const teachers = Array.isArray(usersToEnroll.teachers) ? usersToEnroll.teachers : [];

        const requests = [];
        let id = 1;

        const request = async (payload) => {
            try {
                return await addUsers(payload); // returns created user id
            } catch (error) {
                throw error;
            }
        };

        for (const u of students) {
            const payload = { domain, token, user: u };
            requests.push({ id: id++, request: () => request(payload) });
        }
        for (const u of teachers) {
            const payload = { domain, token, user: u };
            requests.push({ id: id++, request: () => request(payload) });
        }

        return await batchHandler(requests, getBatchConfig());
    }

    async function enrollUsers(usersToEnroll, userIDs) {
        const domain = usersToEnroll.domain;
        const token = usersToEnroll.token;
        const course_id = usersToEnroll.course_id;
        const studentCount = Array.isArray(usersToEnroll.students) ? usersToEnroll.students.length : 0;

        const requests = [];
        for (let i = 0; i < userIDs.length; i++) {
            const user_id = userIDs[i];
            const type = i < studentCount ? 'StudentEnrollment' : 'TeacherEnrollment';
            const payload = { domain, token, course_id, user_id, type };
            const id = i + 1;
            const req = async () => {
                try {
                    return await enrollUser(payload);
                } catch (error) {
                    throw error;
                }
            };
            requests.push({ id, request: req });
        }

        return await batchHandler(requests, getBatchConfig());
    }

    ipcMain.handle('axios:createSupportCourse', async (event, data) => {
        console.log("Inside axios:createSupportCourse");
        // 1. Create the course
        // 2. Add options

        // creating the course
        let response;
        try {
            // Indicate starting course creation
            progressStartIndeterminate('Creating course...');
            response = await createSupportCourse(data);
            console.log('Finished creating course. Checking options....');
            // Update label after creation
            mainWindow.webContents.send('update-progress', { label: 'Course created. Processing options...' });
            // Count base course creation as first completed unit toward overall progress
            // (Do this after counts are built so baseCourse appears in total units.)
            // We defer building counts until after course creation; adjust logic below if moved.
        } catch (error) {
            throw `${error.message}`;
        }

        data.course_id = response.id;
        let totalUsers = null;

        // Overall progress accounting across selected content operations
        const toInt = (v) => Math.max(0, parseInt(v ?? 0, 10) || 0);
        const counts = {
            associatedCourses: data.course.blueprint?.state ? toInt(data.course.blueprint.associated_courses) : 0,
            assignments: data.course.addAssignments?.state ? toInt(data.course.addAssignments.number) : 0,
            classicQuizzes: data.course.addCQ?.state ? toInt(data.course.addCQ.number) : 0,
            newQuizzes: data.course.addNQ?.state ? toInt(data.course.addNQ.number) : 0,
            discussions: data.course.addDiscussions?.state ? toInt(data.course.addDiscussions.number) : 0,
            pages: data.course.addPages?.state ? toInt(data.course.addPages.number) : 0,
            modules: data.course.addModules?.state ? toInt(data.course.addModules.number) : 0,
            sections: data.course.addSections?.state ? toInt(data.course.addSections.number) : 0,
            baseCourse: 1
        };
        // If classic quizzes will include questions, account for each question as a distinct unit so 100% only shows after questions are created.
        if (counts.classicQuizzes > 0 && data.course.addCQ?.addQuestions) {
            // Currently we add 1 question per selected type per quiz.
            const questionTypesCount = Array.isArray(data.course.addCQ?.questionTypes) ? data.course.addCQ.questionTypes.length : 0;
            if (questionTypesCount > 0) {
                counts.classicQuizQuestions = counts.classicQuizzes * questionTypesCount;
            }
        }
        // New Quizzes question items (1 item per selected type per quiz)
        if (counts.newQuizzes > 0 && data.course.newQuizQuestions?.addQuestions) {
            const nqTypesCount = Array.isArray(data.course.newQuizQuestions?.questionTypes) ? data.course.newQuizQuestions.questionTypes.length : 0;
            if (nqTypesCount > 0) {
                counts.newQuizItems = counts.newQuizzes * nqTypesCount;
            }
        }
        const totalOverallUnits = Object.values(counts).reduce((a, b) => a + b, 0);
        let processedOverallUnits = 0; // we'll increment after each completed unit including the base course

        function sendOverall(label, processedSection, totalSection) {
            const percent = totalOverallUnits > 0 ? (processedOverallUnits / totalOverallUnits) * 100 : 0;
            mainWindow.webContents.send('update-progress', {
                mode: 'determinate',
                processed: processedOverallUnits,
                total: totalOverallUnits,
                percent,
                label: label ?? (totalSection > 0 ? `Processing (${processedSection}/${totalSection})...` : 'Processing...')
            });
        }
        // Immediately record the base course creation as done
        processedOverallUnits++;
        sendOverall('Course created. Processing options...');

        // check other options 
        try {
            if (data.course.blueprint.state) { // do we need to make it a blueprint course 
                console.log('Enabling blueprint...');
                mainWindow.webContents.send('update-progress', { label: 'Enabling blueprint...' });
                await enableBlueprint(data);
                mainWindow.webContents.send('update-progress', { label: 'Enabling blueprint....done' });

                const associatedCourses = data.course.blueprint.associated_courses;

                if (associatedCourses > 0) {
                    // loop through and create basic courses to be associated to the blueprint
                    const requests = [];
                    for (let i = 0; i < associatedCourses; i++) {
                        const courseData = {
                            ...data,
                            course: { ...data.course }
                        };
                        courseData.course.name = `${data.course.name} - AC ${1 + i}`;

                        const request = async (courseData) => {
                            try {
                                return await createSupportCourse(courseData);
                            } catch (error) {
                                throw error;
                            }
                        };
                        requests.push({ id: i + 1, request: () => request(courseData) });
                    }

                    // create the courses to be used to associate
                    console.log('Creating any associated courses...');
                    mainWindow.webContents.send('update-progress', { label: `Creating ${associatedCourses} associated courses...` });
                    // Track progress while creating associated courses
                    let completedRequestsAC = 0;
                    const totalRequestsAC = associatedCourses;
                    let processedAC = 0;
                    const requestWithProgress = (fn) => async () => {
                        try {
                            return await fn();
                        } finally {
                            completedRequestsAC++;
                            processedAC++;
                            processedOverallUnits++;
                            sendOverall(`Creating associated courses (${processedAC}/${totalRequestsAC})...`, processedAC, totalRequestsAC);
                        }
                    };
                    const progressWrapped = requests.map((r) => ({ id: r.id, request: requestWithProgress(r.request) }));
                    const newCourses = await batchHandler(progressWrapped, getBatchConfig());
                    const newCourseIDS = newCourses.successful.map(course => course.value.id);
                    console.log('Finished creating associated courses.')
                    mainWindow.webContents.send('update-progress', { label: `Creating ${associatedCourses} associated courses....done` });

                    const acCourseData = {
                        domain: data.domain,
                        token: data.token,
                        bpCourseID: data.course_id,
                        associated_course_ids: newCourseIDS
                    };

                    console.log('Linking associated courses to blueprint...')
                    mainWindow.webContents.send('update-progress', { label: 'Associating courses to blueprint and syncing...' });
                    const associateRequest = await associateCourses(acCourseData); // associate the courses to the BP
                    // await waitFunc(2000);
                    const migrationRequest = await syncBPCourses(acCourseData);
                    console.log('Finished associating courses.');
                    mainWindow.webContents.send('update-progress', { label: 'Associating courses to blueprint and syncing....done' });
                }
            }

            if (data.course.addUsers.state) { // do we need to add users
                const usersToEnroll = {
                    domain: data.domain,
                    token: data.token,
                    course_id: data.course_id,
                    students: null,
                    teachers: null
                };

                // genereate randomUsers to add to Canvas
                usersToEnroll.students = createUsers(data.course.addUsers.students, data.email);
                usersToEnroll.teachers = createUsers(data.course.addUsers.teachers, data.email);

                const totalStudents = data.course.addUsers.students || 0;
                const totalTeachers = data.course.addUsers.teachers || 0;
                const totalNewUsers = totalStudents + totalTeachers;

                // add users to Canvas
                console.log('Adding users to Canvas')
                mainWindow.webContents.send('update-progress', { label: `Creating ${totalNewUsers} users (${totalStudents} students, ${totalTeachers} teachers)...` });
                const userResponse = await addUsersToCanvas(usersToEnroll);
                const userIDs = userResponse.successful.map(user => user.value); // store the successfully created user IDs
                console.log('Finished adding users to Canvas.');
                mainWindow.webContents.send('update-progress', { label: `Creating ${totalNewUsers} users....done` });

                // enroll users to course
                console.log('Enrolling users to course.');
                mainWindow.webContents.send('update-progress', { label: `Enrolling ${totalNewUsers} users...` });
                const enrollResponse = await enrollUsers(usersToEnroll, userIDs);
                totalUsers = enrollResponse.successful.length;
                console.log('Finished enrolling users in the course.');
                mainWindow.webContents.send('update-progress', { label: `Enrolling ${totalNewUsers} users....done` });
            }

            if (data.course.addAssignments.state) {     // do we need to add assignments
                console.log('creating assignments....');
                const assignmentCount = data.course.addAssignments.number;
                mainWindow.webContents.send('update-progress', { label: `Creating ${assignmentCount} assignments...` });

                const request = async (requestData) => {
                    try {
                        return await assignments.createAssignments(requestData);
                    } catch (error) {
                        throw error;
                    }
                };

                const requests = [];
                const totalRequestsAssignments = data.course.addAssignments.number;
                let processedAssignments = 0;
                const updateProgressAssignments = () => {
                    processedAssignments++;
                    processedOverallUnits++;
                    sendOverall(`Creating assignments (${processedAssignments}/${totalRequestsAssignments})...`, processedAssignments, totalRequestsAssignments);
                };
                for (let i = 0; i < totalRequestsAssignments; i++) {
                    const requestData = {
                        domain: data.domain,
                        token: data.token,
                        course_id: data.course_id,
                        name: `Assignment ${i + 1}`,
                        submissionTypes: ["online_upload"],
                        grade_type: "points",
                        points: 10,
                        publish: data.course?.contentPublish?.assignments ? "published" : "unpublished",
                        peer_reviews: false,
                        anonymous: false
                    };
                    const req = async () => {
                        try { return await request(requestData); } finally { updateProgressAssignments(); }
                    };
                    requests.push({ id: i + 1, request: req });
                }

                const assignmentResponses = await batchHandler(requests, getBatchConfig());
                console.log('finished creating assignments.');
                mainWindow.webContents.send('update-progress', { label: `Creating ${assignmentCount} assignments....done` });
            }

            // Create Classic Quizzes if requested
            if (data.course.addCQ.state && data.course.addCQ.number > 0) {
                console.log('creating classic quizzes....');
                const cqCount = data.course.addCQ.number;
                mainWindow.webContents.send('update-progress', { label: `Creating ${cqCount} classic quizzes...` });
                try {
                    await createClassicQuizzes({
                        domain: data.domain,
                        token: data.token,
                        course_id: data.course_id,
                        quiz_type: 'assignment',
                        publish: !!data.course?.contentPublish?.classicQuizzes,
                        num_quizzes: data.course.addCQ.number,
                        addQuestions: data.course.addCQ.addQuestions,
                        questionTypes: data.course.addCQ.questionTypes || [],
                        onQuizCreated: () => {
                            processedOverallUnits++;
                            sendOverall(`Creating classic quizzes (${processedOverallUnits}/${totalOverallUnits})...`);
                        },
                        onQuestionCreated: () => {
                            // Each created question is another unit
                            processedOverallUnits++;
                            sendOverall('Adding quiz questions...');
                        }
                    });
                    console.log('finished creating classic quizzes.');
                    mainWindow.webContents.send('update-progress', { label: `Creating ${cqCount} classic quizzes....done` });
                } catch (error) {
                    throw error;
                }
            }

            // Create New Quizzes if requested
            if (data.course.addNQ.state && data.course.addNQ.number > 0) {
                console.log('creating new quizzes....');
                const nqCount = data.course.addNQ.number;
                mainWindow.webContents.send('update-progress', { label: `Creating ${nqCount} new quizzes...` });
                const totalRequests = data.course.addNQ.number;
                let processedNQ = 0;
                const updateProgress = () => {
                    processedNQ++;
                    processedOverallUnits++;
                    sendOverall(`Creating new quizzes (${processedNQ}/${totalRequests})...`, processedNQ, totalRequests);
                };

                const request = async (requestData) => {
                    try {
                        return await quizzes_nq.createNewQuiz(requestData);
                    } catch (error) {
                        throw error;
                    } finally {
                        updateProgress();
                    }
                };

                const requests = [];
                for (let i = 0; i < totalRequests; i++) {
                    const requestData = {
                        domain: data.domain,
                        token: data.token,
                        course_id: data.course_id,
                        quiz_title: `New Quiz ${i + 1}`,
                        published: !!data.course?.contentPublish?.newQuizzes,
                        grading_type: 'points',
                    };
                    requests.push({ id: i + 1, request: () => request(requestData) });
                }

                const nqBatch = await batchHandler(requests, getBatchConfig());
                console.log('finished creating new quizzes.');
                mainWindow.webContents.send('update-progress', { label: `Creating ${nqCount} new quizzes....done` });

                // Add question items if requested
                if (data.course.newQuizQuestions?.addQuestions && Array.isArray(data.course.newQuizQuestions.questionTypes) && data.course.newQuizQuestions.questionTypes.length > 0) {
                    const types = data.course.newQuizQuestions.questionTypes;
                    // Single log entry at start
                    mainWindow.webContents.send('update-progress', { label: 'Adding new quiz items...' });
                    let sentInterim = false; // prevent multiple identical interim labels
                    for (const quizRes of nqBatch.successful) {
                        const quizId = quizRes.value?.id || quizRes.value?._id;
                        if (!quizId) continue;
                        try {
                            await quizzes_nq.addItemsToNewQuiz({
                                domain: data.domain,
                                token: data.token,
                                course_id: data.course_id,
                                quiz_id: quizId,
                                questionTypes: types,
                                onQuestionCreated: () => {
                                    processedOverallUnits++;
                                    // Only update percent; avoid spamming label. Renderer uses percent for bar.
                                    if (!sentInterim) {
                                        sendOverall('Adding new quiz items...');
                                        sentInterim = true; // first callback sets label; subsequent will only change percent via same label (dedup logic upstream)
                                    } else {
                                        sendOverall();
                                    }
                                }
                            });
                        } catch (e) { /* ignore per quiz */ }
                    }
                    // Final done log
                    mainWindow.webContents.send('update-progress', { label: 'Adding new quiz items....done' });
                }
            }

            // Create Discussions if requested
            if (data.course.addDiscussions.state && data.course.addDiscussions.number > 0) {
                console.log('creating discussions....');
                const discussionCount = data.course.addDiscussions.number;
                mainWindow.webContents.send('update-progress', { label: `Creating ${discussionCount} discussions...` });
                const totalRequests = data.course.addDiscussions.number;
                let processedDiscussions = 0;
                const updateProgress = () => {
                    processedDiscussions++;
                    processedOverallUnits++;
                    sendOverall(`Creating discussions (${processedDiscussions}/${totalRequests})...`, processedDiscussions, totalRequests);
                };
                const request = async (requestData) => {
                    try {
                        return await discussions.createDiscussion(requestData);
                    } catch (error) {
                        throw error;
                    } finally {
                        updateProgress();
                    }
                };
                const requests = [];
                for (let i = 0; i < totalRequests; i++) {
                    const requestData = {
                        domain: data.domain,
                        token: data.token,
                        course_id: data.course_id,
                        title: `Discussion ${i + 1}`,
                        message: '',
                        published: !!data.course?.contentPublish?.discussions,
                    };
                    requests.push({ id: i + 1, request: () => request(requestData) });
                }
                await batchHandler(requests, getBatchConfig());
                console.log('finished creating discussions.');
                mainWindow.webContents.send('update-progress', { label: `Creating ${discussionCount} discussions....done` });
            }

            // Create Pages if requested
            if (data.course.addPages.state && data.course.addPages.number > 0) {
                console.log('creating pages....');
                const pageCount = data.course.addPages.number;
                mainWindow.webContents.send('update-progress', { label: `Creating ${pageCount} pages...` });
                const totalRequests = data.course.addPages.number;
                let processedPages = 0;
                const updateProgress = () => {
                    processedPages++;
                    processedOverallUnits++;
                    sendOverall(`Creating pages (${processedPages}/${totalRequests})...`, processedPages, totalRequests);
                };
                const request = async (requestData) => {
                    try {
                        return await pages.createPage(requestData);
                    } catch (error) {
                        throw error;
                    } finally {
                        updateProgress();
                    }
                };
                const requests = [];
                for (let i = 0; i < totalRequests; i++) {
                    const requestData = {
                        domain: data.domain,
                        token: data.token,
                        course_id: data.course_id,
                        title: `Page ${i + 1}`,
                        body: '',
                        published: !!data.course?.contentPublish?.pages,
                    };
                    requests.push({ id: i + 1, request: () => request(requestData) });
                }
                await batchHandler(requests, getBatchConfig());
                console.log('finished creating pages.');
                mainWindow.webContents.send('update-progress', { label: `Creating ${pageCount} pages....done` });
            }

            // Create Modules if requested
            if (data.course.addModules.state && data.course.addModules.number > 0) {
                console.log('creating modules....');
                const moduleCount = data.course.addModules.number;
                mainWindow.webContents.send('update-progress', { label: `Creating ${moduleCount} modules...` });
                const totalRequests = data.course.addModules.number;
                let processedMods = 0;
                const updateProgress = () => {
                    processedMods++;
                    processedOverallUnits++;
                    sendOverall(`Creating modules (${processedMods}/${totalRequests})...`, processedMods, totalRequests);
                };
                const request = async (requestData) => {
                    try {
                        return await modules.createModule(requestData);
                    } catch (error) {
                        throw error;
                    } finally {
                        updateProgress();
                    }
                };
                const requests = [];
                for (let i = 0; i < totalRequests; i++) {
                    const requestData = {
                        domain: data.domain,
                        token: data.token,
                        course_id: data.course_id,
                        module_name: `Module ${i + 1}`,
                    };
                    requests.push({ id: i + 1, request: () => request(requestData) });
                }
                await batchHandler(requests, getBatchConfig());
                console.log('finished creating modules.');
                mainWindow.webContents.send('update-progress', { label: `Creating ${moduleCount} modules....done` });
            }

            // Create Sections if requested
            if (data.course.addSections.state && data.course.addSections.number > 0) {
                console.log('creating sections....');
                const sectionCount = data.course.addSections.number;
                mainWindow.webContents.send('update-progress', { label: `Creating ${sectionCount} sections...` });
                const totalRequests = data.course.addSections.number;
                let processedSections = 0;
                const updateProgress = () => {
                    processedSections++;
                    processedOverallUnits++;
                    sendOverall(`Creating sections (${processedSections}/${totalRequests})...`, processedSections, totalRequests);
                };
                const request = async (requestData) => {
                    try {
                        return await sections.createSection(requestData);
                    } catch (error) {
                        throw error;
                    } finally {
                        updateProgress();
                    }
                };
                const requests = [];
                for (let i = 0; i < totalRequests; i++) {
                    const requestData = {
                        domain: data.domain,
                        token: data.token,
                        course_id: data.course_id,
                        name: `Section ${i + 1}`,
                    };
                    requests.push({ id: i + 1, request: () => request(requestData) });
                }
                await batchHandler(requests, getBatchConfig());
                console.log('finished creating sections.');
                mainWindow.webContents.send('update-progress', { label: `Creating ${sectionCount} sections....done` });
            }
        } catch (error) {
            throw error.message;
        }

        progressDone();
        // Send a final completion message
        mainWindow.webContents.send('update-progress', { label: 'Course creation completed successfully....done' });
        return { course_id: data.course_id, status: 200, totalUsersEnrolled: totalUsers };
    });

    ipcMain.handle('axios:createBasicCourse', async (event, data) => {
        console.log('main.js > axios:createBasicCourse');

        let completedRequests = 0;
        const totalRequests = data.acCourseNum;

        const updateProgress = () => {
            completedRequests++;
            mainWindow.webContents.send('update-progress', (completedRequests / totalRequests) * 100);
        };

        const request = async (requestData) => {
            try {
                const response = await createSupportCourse(requestData)
                return response;
            } catch (error) {
                throw error;
            } finally {
                updateProgress();
            }
        };

        const requests = [];
        for (let i = 0; i < totalRequests; i++) {
            const requestData = {
                domain: data.domain,
                token: data.token
            };
            requests.push({ id: i + 1, request: () => request(requestData) });
        }

        const batchResponse = await batchHandler(requests, getBatchConfig());
        return batchResponse;
    });


    ipcMain.handle('axios:associateCourses', async (event, data) => {
        console.log('main.js > axios:associateCourses');

        // first associate the courses to the BP
        try {
            const associateRequest = await associateCourses(data); // associate the courses to the BP
            const migrationRequest = await syncBPCourses(data);
            // Return the full migration object so callers can inspect workflow_state and other fields
            return migrationRequest;
        } catch (error) {
            progressDone();
            throw error.message;
        }
    });

    ipcMain.handle('axios:getCourseInfo', async (event, data) => {
        console.log('getting course info');

        try {
            return await getCourseInfo(data);
        } catch (error) {
            throw error.message;
        }
    });

    ipcMain.handle('axios:addAssociateCourse', async (event, data) => {
        console.log('main.js > axios:addAssociateCourse');

        const totalRequests = data.acCourseNum;
        let completedRequests = 0;

        const updateProgress = () => {
            completedRequests++;
            mainWindow.webContents.send('update-progress', (completedRequests / totalRequests) * 100);
        };

        const request = async (requestD) => {
            try {
                const response = await associateCourses(requestD);
                return response;
            } catch (error) {
                throw error;
            } finally {
                updateProgress();
            }
        };

        const requests = [];
        for (let i = 0; i < totalRequests; i++) {
            const requestData = {
                domain: data.domain,
                token: data.token,
                bp_course: data.bpCourseID,
                ac_course
            }
        }
    });

    ipcMain.handle('axios:resetCommChannel', async (event, data) => {
        try {
            const response = await resetEmail(data);
            return response;
        } catch (error) {
            throw error.message;
        }
    });

    ipcMain.handle('axios:checkUnconfirmedEmails', async (event, data) => {
        console.log('main.js > axios:checkUnconfirmedEmails');

        try {
            const response = await checkUnconfirmedEmails(data); //returns a data stream to write to file
            const filePath = getFileLocation('unconfirmed_emails.csv')
            const wStream = fs.createWriteStream(filePath);

            response.pipe(wStream);

            return new Promise((resolve, reject) => {
                wStream.on('finish', resolve)
                wStream.on('error', (error) => {
                    reject(error);
                })
            }).catch((error) => {
                if (error.code === 'EBUSY') {
                    throw new Error('File write failed. resource busy, locked or open. Make sure you\'re not trying to overwrite a file currently open.');
                }
                throw new Error('File write failed: ', error.message);
            });
        } catch (error) {
            throw error.message;
        }
    });

    ipcMain.handle('axios:confirmEmails', async (event, data) => {
        console.log('main.js > axios:resetCourses');

        let completedRequests = 0;
        const totalRequests = data.emails.length;

        const updateProgress = () => {
            completedRequests++;
            mainWindow.webContents.send('update-progress', (completedRequests / totalRequests) * 100)
        }

        const request = async (requestData) => {
            try {
                const response = await confirmEmail(requestData);
                return response;
            } catch (error) {
                throw error;
            } finally {
                updateProgress();
            }
        }

        const requests = [];
        let requestID = 1;
        data.emails.forEach((email) => {
            const requestData = {
                domain: data.domain,
                token: data.token,
                email: email
            };
            requests.push({ id: requestID, request: () => request(requestData) });
            requestID++;
        })

        const batchResponse = await batchHandler(requests, getBatchConfig());
        let confirmedCount = 0;
        batchResponse.successful.forEach((success) => {
            if (success.id.confirmed) {
                confirmedCount++;
            }
        });
        const reMappedResponse = {
            failed: batchResponse.failed,
            successful: batchResponse.successful,
            confirmed: confirmedCount
        };
        return reMappedResponse;
    })

    // === EMAIL COMMUNICATION RESET SECTION ===

    // Reset email communication channels (bounce list and suppression list)
    ipcMain.handle('axios:resetEmails', async (event, data) => {
        console.log('main.js > axios:resetEmails');

        // Allow renderer to pass in previously selected file contents (two-step flow)
        let fileContents = data?.fileContents;
        if (!fileContents) {
            fileContents = await getFileContentsForEmails();
        }
        if (fileContents === 'cancelled') throw new Error('Cancelled');

        // Normalize to array of raw email-ish strings first
        let rawEmailItems;
        if (Array.isArray(fileContents)) {
            rawEmailItems = fileContents; // already extracted by parseEmailsFromCSV
        } else if (typeof fileContents === 'string') {
            rawEmailItems = fileContents.split(/\r?\n|\r|\,/);
        } else {
            throw new TypeError('Unsupported fileContents type for resetEmails');
        }

        // Parse, normalize and dedupe emails
        const emails = Array.from(new Set(
            removeBlanks(rawEmailItems)
                .map((email) => String(email).trim())
                .filter((email) => email.includes('@'))
        ));
        // get email pattern from file content
        // const emailPattern = analyzeEmailPattern(fileContents);

        const total = emails.length;
        let processed = 0;
        const results = { successful: [], failed: [] };
        const idByEmail = new Map();
        const aws422Emails = new Set();
        const concurrency = Math.max(1, Number(process.env.BATCH_CONCURRENCY) || 35);

        // Initial progress
        mainWindow.webContents.send('update-progress', {
            mode: 'determinate',
            label: 'Resetting communication channels',
            processed: 0,
            total,
            value: total > 0 ? 0 : 0
        });

        // const { bounceReset, awsReset, bounceCheck } = require('./comm_channels');

        // Set up per-sender cancellation
        const senderId = event.sender.id;
        resetEmailsCancelFlags.set(senderId, false);
        const isCancelled = () => resetEmailsCancelFlags.get(senderId) === true;

        // Use batchHandler to process resets with retry/backoff and progress updates
        const updateProgress = (customLabel) => {
            processed++;
            mainWindow.webContents.send('update-progress', {
                mode: 'determinate',
                label: customLabel || 'Resetting communication channels...',
                processed,
                total,
                value: total > 0 ? processed / total : 0
            });
        };

        const request = async (reqData) => {
            try {
                console.log('Resetting email:', reqData.email);
                const bounceRes = await bounceReset({ domain: reqData.domain, token: reqData.token, email: reqData.email });
                console.log('Bounce reset response:', bounceRes);
                // if (Number(bounceRes?.reset || 0) > 0) {
                //     await waitFunc(800);
                //     try { await bounceCheck(reqData.domain, reqData.token, reqData.email); } catch { /* ignore */ }
                // }
                // console.log('Clearing from Suppression list', reqData.email);
                // const awsRes = await awsReset({ region: reqData.region, token: reqData.token, email: reqData.email });
                // console.log('AWS reset response:', awsRes);
                // // Track throttled requests (422) for later retry
                // if (String(awsRes?.status) === '422') aws422Emails.add(reqData.email);
                return { bounce: bounceRes };
            } catch (err) {
                throw err;
            } finally {
                updateProgress('Resetting bounced emails...');
            }
        };

        const requests = emails.map((email, idx) => ({
            id: idx + 1,
            email,
            request: () => request({ domain: data.domain, token: data.token, region: data.region, email })
        }));
        for (const r of requests) idByEmail.set(r.email, r.id);

        // Sequential processing (one at a time) — keep for reference
        // for (let i = 0; i < emails.length; i++) {
        //     if (isCancelled()) break;
        //     const email = emails[i];
        //     try {
        //         // Direct resets (idempotent): bounce then suppression
        //         const bounceRes = await bounceReset({ domain: data.domain, token: data.token, email });
        //         // Give Canvas a moment if it scheduled a clear, then optionally recheck
        //         if (Number(bounceRes?.reset || 0) > 0) {
        //             await waitFunc(800);
        //             try { await bounceCheck(data.domain, data.token, email); } catch { }
        //         }
        //         const awsRes = await awsReset({ region: data.region, token: data.token, email });
        //         results.successful.push({ id: i + 1, status: 'fulfilled', value: { bounce: bounceRes, suppression: awsRes } });
        //     } catch (err) {
        //         results.failed.push({ id: i + 1, reason: err?.message || String(err), email });
        //     } finally {
        //         processed++;
        //         mainWindow.webContents.send('update-progress', {
        //             mode: 'determinate',
        //             label: 'Resetting communication channels',
        //             processed,
        //             total,
        //             value: total > 0 ? processed / total : 0
        //         });
        //     }
        // }

        const batchResponse = await batchHandler(requests, { batchSize: concurrency, timeDelay: process.env.TIME_DELAY, isCancelled });

        // bulk awsReset
        // const bulkEmailArray = [{ "value": [] }]; // copy
        const chunksize = 200;
        const awsResetResponse = {
            removed: 0,
            not_removed: 0,
            not_found: 0,
            errors: 0,
            failed_messages: [],
            data: {
                removed: [],
                not_removed: [],
                not_found: []
            }
        };
        
        // Reset progress for AWS stage
        let awsProcessed = 0;
        const awsTotal = emails.length;
        
        for (let i = 0; i < emails.length; i += chunksize) {
            awsProcessed = i;
            mainWindow.webContents.send('update-progress', {
                mode: 'determinate',
                label: 'Resetting emails (AWS suppression list)...',
                processed: awsProcessed,
                total: awsTotal,
                value: awsTotal > 0 ? awsProcessed / awsTotal : 0
            });
            const bulkArray = [{ value: emails.slice(i, i + chunksize) }];
            let awsRes = [];

            if (isCancelled()) break;
            await waitFunc(process.env.TIME_DELAY); // to avoid throttling
            try {
                awsRes = await bulkAWSReset({ region: data.region, token: data.token, emails: bulkArray });
                if (awsRes.status === 204) {
                    awsResetResponse.removed += bulkArray[0].value.length;
                } else {
                    awsResetResponse.removed += awsRes.removed || 0;
                    awsResetResponse.not_removed += awsRes.not_removed || 0;
                    awsResetResponse.not_found += awsRes.not_found || 0;
                    awsResetResponse.data.not_removed.push(...awsRes.data.not_removed);
                    awsResetResponse.data.not_found.push(...awsRes.data.not_found);
                    awsResetResponse.data.removed.push(...awsRes.data.removed);
                }
                
                // // Track specific emails that were not found or not removed (regardless of status)
                // if (awsRes.data && awsRes.data.not_found) {
                //     awsResetResponse.notFoundEmails.push(...awsRes.data.not_found);
                // }
                // if (awsRes.data && awsRes.data.not_removed) {
                //     awsResetResponse.notRemovedEmails.push(...awsRes.data.not_removed);
                // }
            } catch (err) {
                awsResetResponse.errors++;
                awsResetResponse.failed_messages.push(err?.message || String(err));
                continue;
            }
        }
        
        // Send final AWS progress update showing completion
        mainWindow.webContents.send('update-progress', {
            mode: 'determinate',
            label: 'Resetting emails (AWS suppression list)...',
            processed: awsTotal,
            total: awsTotal,
            value: 1
        });

        // console.log('Bulk AWS reset response:', awsResetResponse);
        // const awsResetResponse = await batchHandler(awsResetRequests, { batchSize: concurrency, timeDelay: process.env.TIME_DELAY, isCancelled });


        // Optional post-pass retry for AWS throttled (422) emails
        // let retryInfo = { attempted: 0, succeeded: 0, failed: 0 };
        // if (!isCancelled() && aws422Emails.size > 0) {
        //     const toRetry = Array.from(aws422Emails);
        //     retryInfo.attempted = toRetry.length;
        //     try {
        //         mainWindow.webContents.send('update-progress', { label: `Retrying throttled AWS resets (${toRetry.length})...` });
        //     } catch { /* ignore */ }
        //     await waitFunc(3000);

        //     const retryRequests = toRetry.map((email) => ({
        //         id: idByEmail.get(email) || email,
        //         request: async () => {
        //             const awsRes = await awsReset({ region: data.region, token: data.token, email });
        //             return { email, awsRes };
        //         }
        //     }));
        //     const retryRes = await batchHandler(retryRequests, { batchSize: concurrency, timeDelay: 2000, isCancelled });
        //     // Merge successes back into the main successful array (update suppression value)
        //     for (const s of retryRes.successful) {
        //         try {
        //             const id = s.id;
        //             const awsRes = s.value.awsRes;
        //             const idx = batchResponse.successful.findIndex((x) => x.id === id);
        //             if (idx >= 0) {
        //                 const old = batchResponse.successful[idx];
        //                 batchResponse.successful[idx] = { ...old, value: { ...old.value, suppression: awsRes } };
        //             } else {
        //                 // If the first pass failed, upgrade it by pushing a success-like record
        //                 batchResponse.successful.push({ id, status: 'fulfilled', value: { bounce: { reset: 0, status: null, error: null }, suppression: awsRes } });
        //             }
        //             retryInfo.succeeded++;
        //         } catch { /* ignore */ }
        //     }
        //     // Record failed retries
        //     for (const f of retryRes.failed) {
        //         batchResponse.failed.push({ id: f.id, reason: f.reason, status: f.status });
        //         retryInfo.failed++;
        //     }
        // }

        // After all requests, check the very last email once
        // const lastEmail = emails[emails.length - 1];
        // try {
        //     const isBounced = await bounceCheck(data.domain, data.token, lastEmail);
        //     if (isBounced) {
        //         console.log(`Email ${lastEmail} is still on the bounce list.`);
        //     } else {
        //         console.log(`All emails cleared from the bounce list.`);
        //     }
        // } catch (e) {
        //     console.warn('bounceCheck final verification failed:', e?.message || String(e));
        // }

        const cancelled = isCancelled();
        resetEmailsCancelFlags.delete(senderId);
        const combinedResults = combineResetResults(awsResetResponse, batchResponse);
        return { combinedResults, cancelled };

    });

    ipcMain.handle('axios:cancelResetEmails', async (event) => {
        const senderId = event.sender.id;
        resetEmailsCancelFlags.set(senderId, true);
        return { cancelled: true };
    });

    ipcMain.handle('axios:getClassicQuizzes', async (event, data) => {
        console.log('main.js > axios:getClassicQuizzes');
        try {
            const quizzes = await quizzes_classic.getClassicQuizzes(data);
            return quizzes;
        } catch (error) {
            throw error.message;
        }
    });

    ipcMain.handle('axios:createClassicQuizzes', async (event, data) => {
        console.log('main.js > axios:createClassicQuizzes');

        try {
            const quizzes = await createClassicQuizzes(data);
            // get the IDs of the successfully created quizzes to then create questions in
            return quizzes;
        } catch (error) {
            throw error.message;
        }
    })

    ipcMain.handle('axios:createClassicQuestions', async (event, data) => {
        console.log('main.js > axios:createClassicQuestions');

        const totalNumber = data.quizzes.length;
        let completedRequests = 0;

        const updateProgress = () => {
            completedRequests++;
            mainWindow.webContents.send('update-progress', {
                mode: 'determinate',
                label: 'Creating questions',
                processed: completedRequests,
                total: totalNumber,
                value: completedRequests / totalNumber
            });
        }

        const request = async (requestData) => {
            try {
                return await quizzes_classic.createQuestions(requestData);
            } catch (error) {
                throw error
            } finally {
                updateProgress();
            }
        };

        const requests = [];
        for (let i = 0; i < totalNumber; i++) {
            const requestData = {
                domain: data.domain,
                token: data.token,
                course_id: data.course_id,
                quiz_id: data.quizzes[i],
                question_data: data.questionTypes
            };
            requests.push({ id: i + 1, request: () => request(requestData) });
        }

        const batchResponse = await batchHandler(requests, getBatchConfig());
        return batchResponse;

    });

    ipcMain.handle('axios:updateClassicQuiz', async (event, data) => {
        console.log('main.js > axios:updateClassicQuiz');

        try {
            return await quizzes_classic.updateClassicQuiz(data);
        } catch (error) {
            throw error.message;
        }
    });

    ipcMain.handle('axios:deleteClassicQuizzes', async (event, data) => {
        console.log('main.js > axios:deleteClassicQuizzes');

        try {
            const totalNumber = data.quizzes.length;
            let completedRequests = 0;

            const updateProgress = () => {
                completedRequests++;
                mainWindow.webContents.send('update-progress', (completedRequests / totalNumber) * 100);
            }

            const request = async (requestData) => {
                try {
                    return await quizzes_classic.deleteClassicQuiz(requestData);
                } catch (error) {
                    throw error;
                } finally {
                    updateProgress();
                }
            };
            const requests = [];
            for (let i = 0; i < totalNumber; i++) {
                const requestData = {
                    domain: data.domain,
                    token: data.token,
                    course_id: data.courseID,
                    quiz_id: data.quizzes[i]._id
                };
                requests.push({ id: i + 1, request: () => request(requestData) });
            }
            const batchResponse = await batchHandler(requests, getBatchConfig());
            return batchResponse;
        } catch (error) {
            throw error.message;
        }
    });

    ipcMain.handle('axios:getRespondusQuizzes', async (event, data) => {
        console.log('main.js > axios:getRespondusQuizzes');
        try {
            const quizzes = await quizzes_classic.getRespondusQuizzes(data);
            return quizzes;
        } catch (error) {
            throw error.message;
        }
    });

    ipcMain.handle('axios:updateRespondusQuizzes', async (event, data) => {
        console.log('main.js > axios:updateRespondusQuizzes');

        try {
            const totalNumber = data.quizIds.length;
            let completedRequests = 0;

            const updateProgress = () => {
                completedRequests++;
                mainWindow.webContents.send('update-progress', (completedRequests / totalNumber) * 100);
            }

            const request = async (requestData) => {
                try {
                    await quizzes_classic.updateRespondusQuiz(requestData);
                    return { success: true, quiz_id: requestData.quiz_id };
                } catch (error) {
                    return { success: false, quiz_id: requestData.quiz_id, error: error.message };
                } finally {
                    updateProgress();
                }
            };

            const requests = [];
            for (let i = 0; i < totalNumber; i++) {
                const requestData = {
                    domain: data.domain,
                    token: data.token,
                    course_id: data.courseID,
                    quiz_id: data.quizIds[i],
                    enable: data.enable
                };
                requests.push({ id: i + 1, request: () => request(requestData) });
            }

            const batchResponse = await batchHandler(requests, getBatchConfig());
            
            // batchHandler returns { successful: [], failed: [] }
            // Convert to simple array of results
            const results = [];
            
            if (batchResponse.successful) {
                batchResponse.successful.forEach(item => {
                    results.push(item.value);
                });
            }
            
            if (batchResponse.failed) {
                batchResponse.failed.forEach(item => {
                    results.push({ 
                        success: false, 
                        quiz_id: item.id, 
                        error: item.reason 
                    });
                });
            }
            
            return results;
        } catch (error) {
            throw error.message;
        }
    });

    ipcMain.handle('axios:createNQQuestions', async (event, data) => {
        console.log('main.js > axios:createNQQuestions');

        let completedRequests = 0;
        const totalRequests = data.num_questions;

        const updateProgress = () => {
            completedRequests++;
            mainWindow.webContents.send('update-progress', (completedRequests / totalRequests) * 100);
        }


        const request = async (requestData) => {
            try {
                return await quizzes.createNQQuestions(requestData);
            } catch (error) {
                throw error;
            } finally {
                updateProgress();
            }
        }

        const requests = [];
        for (let i = 0; i < totalRequests; i++) {
            const requestData = {
                domain: data.domain,
                token: data.token,
                course_id: data.course_id,
                quiz_id: data.quiz_id,
                question_type: data.question_type
            }
            requests.push({ id: i + 1, request: () => request(requestData) });
        }

        const batchResponse = await batchHandler(requests, getBatchConfig());

        return batchResponse;
    })

    // New Quiz (New Quizzes) IPC Handlers
    ipcMain.handle('axios:createNewQuizzes', async (event, data) => {
        console.log('main.js > axios:createNewQuizzes');

        try {
            const totalRequests = data.count || 1;
            let completedRequests = 0;

            const updateProgress = () => {
                completedRequests++;
                mainWindow.webContents.send('update-progress', {
                    mode: 'determinate',
                    label: 'Creating new quizzes',
                    processed: completedRequests,
                    total: totalRequests,
                    value: completedRequests / totalRequests,
                });
            };

            const request = async (requestData) => {
                try {
                    return await quizzes_nq.createNewQuiz(requestData);
                } catch (error) {
                    throw error;
                } finally {
                    updateProgress();
                }
            };

            const requests = [];
            for (let i = 0; i < totalRequests; i++) {
                const requestData = {
                    domain: data.domain,
                    token: data.token,
                    course_id: data.course_id,
                    quiz_title: totalRequests > 1 ? `${data.title} ${i + 1}` : data.title,
                    published: data.published,
                    grading_type: 'points',
                };
                requests.push({ id: i + 1, request: () => request(requestData) });
            }

            const batchResponse = await batchHandler(requests, getBatchConfig());
            return batchResponse;
        } catch (error) {
            throw error.message;
        }
    });

    ipcMain.handle('axios:createNewQuizItems', async (event, data) => {
        console.log('main.js > axios:createNewQuizItems');

        try {
            const totalRequests = data.quizzes.length;
            let completedRequests = 0;

            const updateProgress = () => {
                completedRequests++;
                mainWindow.webContents.send('update-progress', {
                    mode: 'determinate',
                    label: 'Creating quiz items',
                    processed: completedRequests,
                    total: totalRequests,
                    value: completedRequests / totalRequests,
                });
            };

            const request = async (requestData) => {
                try {
                    return await quizzes_nq.addItemsToNewQuiz(requestData);
                } catch (error) {
                    throw error;
                } finally {
                    updateProgress();
                }
            };

            const requests = [];
            for (let i = 0; i < totalRequests; i++) {
                const quiz = data.quizzes[i];
                const requestData = {
                    domain: data.domain,
                    token: data.token,
                    course_id: data.course_id,
                    quiz_id: quiz.id || quiz,
                    questionTypes: data.questionTypes
                };
                requests.push({ id: i + 1, request: () => request(requestData) });
            }

            const batchResponse = await batchHandler(requests, getBatchConfig());
            return batchResponse;
        } catch (error) {
            throw error.message;
        }
    });

    ipcMain.handle('axios:getModules', async (event, data) => {
        console.log('main.js > axios:getModules');

        try {
            const courseModules = await modules.getModules(data);
            return courseModules;
        } catch (error) {
            throw error.message;
        }
    });

    ipcMain.handle('axios:getAssignmentsInModules', async (event, data) => {
        console.log('main.js > axios:getAssignmentsInModules');
        try {
            const result = await assignments.getAssignmentsInModules(data);
            return result;
        } catch (error) {
            throw error.message;
        }
    });

    ipcMain.handle('axios:deleteModules', async (event, data) => {
        console.log('main.js > axios:deleteModules');

        let completedRequests = 0;
        let totalRequests = data.number;

        const updateProgress = () => {
            completedRequests++;
            mainWindow.webContents.send('update-progress', (completedRequests / totalRequests) * 100);
        }

        const request = async (data) => {
            try {
                // const response = await window.axios.deleteTheThings(messageData);
                const response = await modules.deleteModule(data);
                return response;
            } catch (error) {
                console.error('Error: ', error);
                throw error;
            } finally {
                updateProgress();
            }
        }

        let requests = [];
        for (let i = 0; i < data.number; i++) {
            const requestData = {
                domain: data.domain,
                token: data.token,
                course_id: data.course_id,
                module_id: data.module_ids[i].id
            };
            requests.push({ id: i + 1, request: () => request(requestData) });
        }

        const batchResponse = await batchHandler(requests, getBatchConfig());
        console.log('Finished deleting assignments.');
        return batchResponse;
    })

    ipcMain.handle('axios:createModules', async (event, data) => {
        console.log('main.js > axios:createModules');

        let completedRequests = 0;
        const totalRequests = data.number;

        const updateProgress = () => {
            completedRequests++;
            mainWindow.webContents.send('update-progress', (completedRequests / totalRequests) * 100);
        }

        const request = async (requestData) => {
            try {
                return await modules.createModule(requestData);
            } catch (error) {
                throw error;
            } finally {
                updateProgress();
            }
        }

        try {
            // check if the course has modules  
            const currentModules = await modules.getModules(data);
            const requests = [];
            for (let i = 0; i < totalRequests; i++) {
                const requestData = {
                    domain: data.domain,
                    token: data.token,
                    course_id: data.course_id,
                    module_name: "Module " + (currentModules.length + i + 1)
                };
                requests.push({ id: i + 1, request: () => request(requestData) });
            }

            const batchResponse = await batchHandler(requests, getBatchConfig());
            return batchResponse;
        } catch (error) {
            throw error.message;
        }
    })

    ipcMain.handle('axios:getModulesSimple', async (event, data) => {
        console.log('main.js > axios:getModulesSimple');

        try {
            const courseModules = await modules.getModulesSimple(data);
            return courseModules;
        } catch (error) {
            throw error.message;
        }
    });

    ipcMain.handle('axios:relockModules', async (event, data) => {
        console.log('main.js > axios:relockModules');

        let completedRequests = 0;
        let totalRequests = data.module_ids.length;

        const updateProgress = () => {
            completedRequests++;
            mainWindow.webContents.send('update-progress', (completedRequests / totalRequests) * 100);
        }

        const request = async (requestData) => {
            try {
                return await modules.relockModule(requestData);
            } catch (error) {
                throw error;
            } finally {
                updateProgress();
            }
        }

        const requests = [];
        for (let i = 0; i < data.module_ids.length; i++) {
            const requestData = {
                domain: data.domain,
                token: data.token,
                course_id: data.course_id,
                module_id: data.module_ids[i]
            };
            requests.push({ id: i + 1, request: () => request(requestData) });
        }

        const batchResponse = await batchHandler(requests, getBatchConfig());
        console.log('Finished relocking modules.');
        return batchResponse;
    })

    ipcMain.handle('axios:deleteGradingStandards', async (event, data) => {
        console.log('main.js > axios:deleteGradingStandards');

        let completedRequests = 0;
        const totalRequests = data.grading_standards ? data.grading_standards.length : 0;

        const updateProgress = () => {
            completedRequests++;
            mainWindow.webContents.send('update-progress', {
                mode: 'determinate',
                label: 'Deleting grading standards',
                processed: completedRequests,
                total: totalRequests,
                value: totalRequests ? (completedRequests / totalRequests) : 0
            });
        };

        // Support cancellation
        const senderId = event.sender.id;
        deleteCancelFlags.set(senderId, false); // Reset flag
        const isCancelled = () => deleteCancelFlags.get(senderId) === true;

        try {
            const result = await grading_standards.deleteGradingStandards(data, updateProgress, isCancelled);
            console.log('Finished deleting grading standards.');
            return result;
        } catch (error) {
            console.error('Error deleting grading standards:', error);
            throw error.message;
        } finally {
            // Clean up flag
            deleteCancelFlags.delete(senderId);
        }
    });

    ipcMain.handle('axios:updateNotifications', async (event, data) => {
        console.log('main.js > axios:updateNotifications');

        try {
            const { domain, token, user, commChannel, frequency } = data;

            await updateNotifications(frequency, domain, user, commChannel, token);

            return { success: true, data: 'Notifications updated successfully' };
        } catch (error) {
            console.error('Error updating notifications:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('axios:getCommChannels', async (event, data) => {
        console.log('main.js > axios:getCommChannels');

        try {
            const { domain, token, user } = data;

            const channels = await getCommChannels(domain, user, token);

            return { success: true, data: channels };
        } catch (error) {
            console.error('Error fetching communication channels:', error);
            return { success: false, error: error.message };
        }
    })

    // === FILE UPLOAD & PROCESSING SECTION ===

    // Confirm emails from uploaded file
    ipcMain.handle('fileUpload:confirmEmails', async (event, data) => {

        let emails = [];
        // get the file contents
        try {

            const fileContent = await getFileContentsForEmails();
            if (fileContent === 'cancelled') {
                // User cancelled file picker
                return { success: false, message: 'File selection cancelled' };
            }
            emails = removeBlanks(fileContent.split(/\r?\n|\r|\,/))
                .map((email) => { // remove spaces
                    return email.trim();
                });
        } catch (error) {
            throw error;
        }

        // ********************************
        // handle the bulk requests for 
        //  confirming the emails
        // ********************************
        const totalRequests = emails.length;
        let completedRequests = 0;

        mainWindow.webContents.send('email-count', totalRequests);

        const updateProgress = () => {
            completedRequests++;
            mainWindow.webContents.send('update-progress', (completedRequests / totalRequests) * 100);
        };

        const request = async (data) => {
            try {
                const response = await confirmEmail(data);
                return response;
            } catch (error) {
                throw error;
            } finally {
                updateProgress();
            }
        }

        const requests = [];
        for (let email of emails) {
            data.email = email;
            requests.push(() => request(data));
        };

        const batchResponse = await batchHandler(requests, getBatchConfig());
        let confirmedCount = 0;
        batchResponse.successful.forEach((success) => {
            if (success.id.confirmed) {
                confirmedCount++;
            }
        });
        const reMappedResponse = {
            failed: batchResponse.failed,
            successful: batchResponse.successful,
            confirmed: confirmedCount
        };
        return reMappedResponse;
    })

    ipcMain.handle('fileUpload:resetEmails', async (event, data) => {
        // Return the selected file details to the renderer without processing
        const options = {
            properties: ['openFile'],
            filters: [
                { name: 'All Files', extensions: ['*'] }
            ],
            modal: true
        };
        const result = await dialog.showOpenDialog(mainWindow, options);
        if (result.canceled) return 'cancelled';
        const filePath = result.filePaths[0];
        const fileContents = await fs.promises.readFile(filePath, 'utf8');
        const ext = path.extname(filePath).toLowerCase();

        // Reuse parseEmailsFromCSV for csv; return normalized text emails
        let normalized = fileContents;
        if (ext === '.csv') {
            try { normalized = parseEmailsFromCSV(fileContents); } catch (e) { throw new Error(`CSV parsing error: ${e.message}`); }
        } else if (ext === '.txt') {
            normalized = removeBlanks(fileContents.split(/\r?\n|\r|,/)).map(e => e.trim()).filter(e => e.length > 0);
        }

        return { fileContents: normalized, filePath, ext };
    });
    ipcMain.handle('fileUpload:resetCourses', async (event) => {
        let courses = [];
        try {
            const fileContent = await getFileContents('txt');
            courses = removeBlanks(fileContent.split(/\r?\n|\r|\,/))
                .filter((course) => !isNaN(Number(course)))
                .map((course) => { // remove spaces
                    return course.trim();
                });
        } catch (error) {
            throw error;
        }
        return courses;
    })

    ipcMain.handle('csv:sendToCSV', async (event, data) => {
        sendToCSV(data);
    });

    // Write CSV directly to a provided full path (no dialog)
    ipcMain.handle('csv:writeAtPath', async (event, payload) => {
        try {
            const { fullPath, data } = payload || {};
            if (!fullPath || !data) throw new Error('fullPath and data are required');
            await csvExporter.exportToCSV(data, fullPath);
            return true;
        } catch (err) {
            console.error('csv:writeAtPath error:', err);
            throw err;
        }
    });

    ipcMain.on('csv:sendToText', () => {
        console.log('csv:sendToText');

        try {
            sendToTxt(suppressedEmails);
        } catch (error) {
            console.log('There was an error in the sendToText');
        }
    })

    ipcMain.on('testAPI:testing', () => {
        console.log('main.js > testAPI:testing');
    });

    // right click menu
    ipcMain.on('right-click', (event) => {
        const template = [
            {
                label: 'Cut',
                accelerator: 'CmdOrCtrl+X',
                click: () => {
                    event.sender.send('context-menu-command', { command: 'cut' });
                }
            },
            {
                label: 'Copy',
                accelerator: 'CmdOrCtrl+C',
                click: () => {
                    event.sender.send('context-menu-command', { command: 'copy' });
                }
            },
            {
                label: 'Paste',
                accelerator: 'CmdOrCtrl+V',
                click: () => {
                    event.sender.send('context-menu-command', { command: 'paste' });
                }
            },
            { type: 'separator' },
            {
                label: 'Reload',
                accelerator: 'CmdOrCtrl+R',
                click: () => {
                    event.sender.reload();
                }
            },
            { type: 'separator' },
            {
                label: 'Inspect',
                click: () => {
                    // Open DevTools honoring override mode; otherwise let Chromium remember last
                    const override = getDevToolsOverrideMode();
                    try {
                        if (override) event.sender.openDevTools({ mode: override });
                        else event.sender.openDevTools();
                    } catch { /* ignore */ }
                }
            }
        ]
        const menu = Menu.buildFromTemplate(template)
        menu.popup({ window: BrowserWindow.fromWebContents(event.sender) })
    });

    ipcMain.on('shell:openExternal', (event, data) => {
        console.log('main.js > shell:openExternal');
        shell.openExternal(data);
    })

    ipcMain.on('write-text', (event, data) => {
        clipboard.writeText(data);
    });

    // Select and parse a list of user IDs (txt or csv)
    ipcMain.handle('fileUpload:getUserIdsFromFile', async () => {
        // Reuse getFileContentsForEmails dialog and parsing flow, then map to numeric IDs
        const fileContent = await getFileContentsForEmails();
        if (fileContent === 'cancelled') return 'cancelled';

        // fileContent comes back as raw text with newlines when txt, or joined emails for csv parser.
        const tokens = removeBlanks(fileContent.split(/\r?\n|\r|,|\s+/));
        // Keep only numeric values for user IDs
        const ids = tokens.filter((v) => v && !isNaN(Number(v))).map((v) => v.trim());
        return ids;
    });

    // Let renderer pick a CSV or ZIP and return its full path
    ipcMain.handle('fileUpload:pickCsvOrZip', async () => {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openFile'],
            filters: [
                { name: 'CSV/ZIP/JSON', extensions: ['csv', 'zip', 'json'] },
                { name: 'All Files', extensions: ['*'] }
            ],
            modal: true
        });
        if (result.canceled) return null;
        return result.filePaths[0];
    });

    ipcMain.handle('fileUpload:readFile', async (event, payload) => {
        const { fullPath } = payload || {};
        if (!fullPath) throw new Error('fullPath required');
        return await fs.promises.readFile(fullPath, 'utf8');
    });

    ipcMain.handle('fileUpload:readFileBuffer', async (event, payload) => {
        const { fullPath } = payload || {};
        if (!fullPath) throw new Error('fullPath required');
        const buf = await fs.promises.readFile(fullPath);
        return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    });

    // Write a JSON errors file alongside the uploaded file
    ipcMain.handle('fileUpload:writeErrorsFile', async (event, payload) => {
        try {
            const { dirPath, baseName, failed } = payload || {};
            if (!dirPath || !baseName || !Array.isArray(failed)) throw new Error('dirPath, baseName and failed[] required');
            const stem = path.basename(baseName, path.extname(baseName));
            const outPath = path.join(dirPath, `${stem}_restore_errors.json`);
            await fs.promises.writeFile(outPath, JSON.stringify(failed, null, 2), 'utf8');
            return outPath;
        } catch (err) {
            console.error('writeErrorsFile error:', err);
            throw err;
        }
    });

    // Handle email checking from CSV files (including bounced communication channels format)
    ipcMain.handle('fileUpload:checkEmails', async (event, data) => {
        try {
            const { filePaths } = await dialog.showOpenDialog({
                properties: ['openFile'],
                filters: [
                    { name: 'CSV Files', extensions: ['csv'] },
                    { name: 'Text Files', extensions: ['txt'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });

            if (!filePaths || filePaths.length === 0) {
                return { cancelled: true };
            }

            const filePath = filePaths[0];
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const emails = parseEmailsFromCSV(fileContent);

            if (emails.length === 0) {
                throw new Error('No valid email addresses found in the file. For bounced communication channels CSV, make sure the file has "Path" and "Type" columns with email addresses.');
            }

            return {
                success: true,
                emails,
                fileName: path.basename(filePath),
                count: emails.length,
                message: `Found ${emails.length} email address(es) in ${path.basename(filePath)}`
            };

        } catch (error) {
            console.error('Error in fileUpload:checkEmails:', error);
            return {
                success: false,
                error: error.message || 'Failed to process file'
            };
        }
    });

    // Parse emails from CSV content (used by renderer for immediate parsing)
    ipcMain.handle('parseEmailsFromCSV', async (event, csvContent) => {
        try {
            const emails = parseEmailsFromCSV(csvContent);
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

    // Parse emails from Excel content (used by renderer for immediate parsing)
    ipcMain.handle('parseEmailsFromExcel', async (event, { filePath, fileBuffer }) => {
        try {
            const emails = parseEmailsFromExcel(fileBuffer);
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

    // Analyze email patterns in CSV files
    ipcMain.handle('analyzeEmailPattern', async (event, filePath, emailColumnIndex = 4) => {
        try {
            console.log('Analyzing email pattern for file:', filePath);
            const result = analyzeEmailPattern(filePath, emailColumnIndex);
            return result;
        } catch (error) {
            console.error('Error analyzing email pattern:', error);
            return {
                success: false,
                error: error.message,
                pattern: null,
                details: null
            };
        }
    });

    // Reset communication channels by pattern - bulk reset bounce/suppression for emails matching a pattern
    ipcMain.handle('axios:resetCommChannelsByPattern', async (event, data) => {
        console.log('inside axios:resetCommChannelsByPattern');

        const senderId = event.sender.id;
        resetPatternCancelFlags.set(senderId, false);
        const isCancelled = () => resetPatternCancelFlags.get(senderId) === true;

        // Normalize pattern once
        const normalizedPattern = String(data.pattern || '').trim().toLowerCase();
        const base = { ...data, pattern: normalizedPattern };

        try {
            progressStartIndeterminate('Collecting and resetting bounced emails...');

            // Use pattern bounce reset function
            const result = await patternBounceReset(base, isCancelled);

            if (isCancelled()) {
                progressDone();
                resetPatternCancelFlags.delete(senderId);
                return { cancelled: true };
            }

            progressDone();
            resetPatternCancelFlags.delete(senderId);
            return result;
        } catch (err) {
            progressDone();
            resetPatternCancelFlags.delete(senderId);
            throw err.message || err;
        }
    });

    // Cancel reset of communication channels by pattern
    ipcMain.handle('axios:cancelResetCommChannelsByPattern', async (event) => {
        const senderId = event.sender.id;
        resetPatternCancelFlags.set(senderId, true);
        return { cancelled: true };
    });

    createWindow();
    createMenu();
    registerSisIpcHandlers();

    // for mac os creates new window when activated
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    })


})

// for windows and linux closes app when all windows are closed
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
})

async function createClassicQuizzes(data) {
    // console.log('The data: ', data);

    // first create the quizzes
    const totalRequests = data.num_quizzes;
    let completedRequests = 0;

    const updateProgress = () => {
        completedRequests++;
        mainWindow.webContents.send('update-progress', {
            mode: 'determinate',
            label: 'Creating quizzes',
            processed: completedRequests,
            total: totalRequests,
            value: completedRequests / totalRequests,
        });
    };

    const request = async (requestData) => {
        try {
            const res = await quizzes_classic.createQuiz(requestData);
            // Notify per-quiz creation progress if provided
            if (typeof data.onQuizCreated === 'function') {
                try { data.onQuizCreated(res); } catch { }
            }
            return res;
        } catch (error) {
            throw error;
        } finally {
            // keep internal section progress updates for label context only; renderer ignores these for bar width
            updateProgress();
        }
    };

    const requests = [];
    const hasQuestions = data.addQuestions && Array.isArray(data.questionTypes) && data.questionTypes.length > 0;
    const publishAtCreate = data.publish && !hasQuestions;
    for (let i = 0; i < totalRequests; i++) {
        const requestData = {
            domain: data.domain,
            token: data.token,
            course_id: data.course_id,
            quiz_type: data.quiz_type,
            publish: !!publishAtCreate,
            num_quizzes: data.num_quizzes,
            quiz_title: (() => {
                const base = data.quiz_name && data.quiz_name.length > 0 ? data.quiz_name : 'Quiz';
                // If creating multiple, suffix with index; otherwise use as-is
                return totalRequests > 1 ? `${base} ${i + 1}` : base;
            })(),
        };
        requests.push({ id: i + 1, request: () => request(requestData) });
    }

    const batchResponse = await batchHandler(requests, getBatchConfig());
    console.log('Classic quizzes created:', batchResponse.successful.map(s => s.value?.id));
    console.log('Questions requested?', { addQuestions: data.addQuestions, questionTypes: data.questionTypes });

    // If questions were requested, add them to each successfully created quiz
    if (hasQuestions && batchResponse.successful && batchResponse.successful.length > 0) {
        console.log('Adding questions to quizzes...');
        mainWindow.webContents.send('update-progress', { label: 'Adding questions to quizzes...' });

        // Convert frontend question types array to the format expected by createQuestions
        const questionData = {};
        (data.questionTypes || []).forEach((questionType) => {
            if (typeof questionType === 'string' && questionType.length > 0) {
                questionData[questionType] = {
                    name: questionType,
                    enabled: true,
                    number: 1, // Add 1 question of each selected type
                };
            }
        });

        let quizzesWithQuestions = 0;
        for (const quizResult of batchResponse.successful) {
            const quizId = quizResult.value?.id;
            if (!quizId) continue;
            try {
                console.log(`Adding questions to quiz ${quizId}`);
                await quizzes_classic.createQuestions({
                    domain: data.domain,
                    token: data.token,
                    course_id: data.course_id,
                    quiz_id: quizId,
                    question_data: questionData,
                    onQuestionCreated: typeof data.onQuestionCreated === 'function' ? data.onQuestionCreated : undefined
                });
                quizzesWithQuestions++;

                if (data.publish) {
                    console.log(`Publishing quiz ${quizId}`);
                    await quizzes_classic.publishQuiz({
                        domain: data.domain,
                        token: data.token,
                        course_id: data.course_id,
                        quiz_id: quizId,
                    });
                }
            } catch (error) {
                console.error(`Failed to add questions to quiz ${quizId}:`, error);
            }
        }

        console.log('Finished adding questions to quizzes. Count:', quizzesWithQuestions);
        mainWindow.webContents.send('update-progress', { label: `Adding questions to ${quizzesWithQuestions} quiz(zes)....done` });
    }

    return batchResponse;
}

// Progress helpers (main process)
let _lastProgressKey = null;
function _sendProgress(payload) {
    try {
        const key = JSON.stringify(payload);
        if (key === _lastProgressKey) return; // de-dup consecutive identical messages
        _lastProgressKey = key;
        mainWindow.webContents.send('update-progress', payload);
    } catch { /* ignore */ }
}

function progressStartIndeterminate(label = 'Working...') {
    if (!mainWindow) return;
    _sendProgress({ mode: 'indeterminate', label });
    // Windows taskbar indeterminate
    try { mainWindow.setProgressBar(0.5, { mode: 'indeterminate' }); } catch { }
}

function progressUpdateDeterminate(processed, total) {
    if (!mainWindow) return;
    const value = total > 0 ? processed / total : 0;
    _sendProgress({ mode: 'determinate', value, processed, total });
    try { mainWindow.setProgressBar(value, { mode: 'normal' }); } catch { }
}

// (moved addUsersToCanvas and enrollUsers above the handler)

function progressTickUnknown(processed, label) {
    if (!mainWindow) return;
    _sendProgress({ mode: 'indeterminate', processed, label });
    try { mainWindow.setProgressBar(0.5, { mode: 'indeterminate' }); } catch { }
}

function progressDone() {
    if (!mainWindow) return;
    _sendProgress({ mode: 'done' });
    try { mainWindow.setProgressBar(-1, { mode: 'none' }); } catch { }
}

// Example: unknown total flow (fixes undefined completedRequests/totalRequests bug)
// ipcMain.handle('axios:resetCommChannelsByPattern', async (event, data) => {
//     console.log('inside axios:resetCommChannelsByPattern');
//     const senderId = event.sender.id;
//     resetPatternCancelFlags.set(senderId, false);
//     const isCancelled = () => resetPatternCancelFlags.get(senderId) === true;

//     // Normalize pattern once
//     const normalizedPattern = String(data.pattern || '').trim().toLowerCase();
//     const base = { ...data, pattern: normalizedPattern };

//     try {
//         progressStartIndeterminate('Collecting emails to reset...');

//         // 1) Gather bounced emails (Canvas) and suppressed emails (AWS) for this pattern
//         // const [bouncedRows, suppressedList] = await Promise.all([
//         //     getBouncedData(base), // array of row arrays; row[4] is the email
//         //     checkCommDomain(base) // array of email strings
//         // ]);

//         // --- Getting initial bounced rows from pattern
//         const bouncedRows = await getBouncedData(base);

//         if (isCancelled()) {
//             progressDone();
//             resetPatternCancelFlags.delete(senderId);
//             return [];
//         }

//         // 2) Build a unique set of emails for aws reset (lowercased)
//         const targets = new Set();
//         if (Array.isArray(bouncedRows)) {
//             for (const row of bouncedRows) {
//                 const em = Array.isArray(row) ? row[4] : null;
//                 if (em) targets.add(String(em).trim().toLowerCase());
//             }
//         }
//         if (Array.isArray(suppressedList)) {
//             for (const em of suppressedList) {
//                 if (em) targets.add(String(em).trim().toLowerCase());
//             }
//         }

//         const emails = Array.from(targets);
//         const total = emails.length;
//         if (total === 0) {
//             progressDone();
//             resetPatternCancelFlags.delete(senderId);
//             return [];
//         }

//         // 3) Reset both bounce and suppression for each unique email with a small worker pool
//         // const { bounceReset, awsReset, bounceCheck } = require('./comm_channels');
//         let processed = 0;
//         progressUpdateDeterminate(0, total);

//         const maxWorkers = Math.max(1, Math.min(10, Number(process.env.BATCH_CONCURRENCY) || 8));
//         let idx = 0;
//         const results = [];

//         const worker = async () => {
//             while (idx < emails.length && !isCancelled()) {
//                 const myIdx = idx++;
//                 const email = emails[myIdx];
//                 try {
//                     // --- Removing bounce reset logic to process by batter in bulk outside the loop

//                     // await waitFunc(100 + Math.floor(Math.random() * 100));
//                     // const bounceRes = await bounceReset({ domain: data.domain, token: data.token, email });
//                     // if (Number(bounceRes?.reset || 0) > 0) {
//                     //     await waitFunc(800);
//                     //     try { await bounceCheck(data.domain, data.token, email); } catch { }
//                     // }
//                     const awsRes = await awsReset({ region: data.region, token: data.token, email });
//                     results.push({ suppression: awsRes, email });
//                 } catch (e) {
//                     // Record failure as a result with error flags (optional)
//                     results.push({ suppression: { reset: 0, error: e?.message || String(e) }, email });
//                 } finally {
//                     processed++;
//                     progressUpdateDeterminate(processed, total);
//                 }
//             }
//         };

//         const workers = [];
//         for (let w = 0; w < maxWorkers; w++) workers.push(worker());
//         await Promise.all(workers);
//         // end of initial processing of pattern reset

//         progressDone();
//         resetPatternCancelFlags.delete(senderId);
//         return results;
//     } catch (err) {
//         progressDone();
//         resetPatternCancelFlags.delete(senderId);
//         throw err.message || err;
//     }
// });

// Adaptive rate-limited runner for Canvas API with concurrency control and backoff
async function canvasRateLimitedHandler(requests, options = {}) {
    const {
        maxConcurrent = 35,
        baseDelayMs = 200,
        jitterMs = 200,
        maxRetries = 3,
        isCancelled = () => false
    } = options;

    let successful = [];
    let failed = [];
    let completed = 0;
    const total = requests.length || 1;

    const sleep = (ms) => new Promise(res => setTimeout(res, ms));
    const withJitter = (ms) => ms + Math.floor(Math.random() * jitterMs);

    const queue = [...requests];
    let inflight = 0;

    return await new Promise((resolve) => {
        const startNext = () => {
            while (inflight < maxConcurrent && queue.length > 0) {
                if (isCancelled && isCancelled()) {
                    // Stop launching new tasks; resolve when inflight drains
                    if (inflight === 0) return resolve({ successful, failed, cancelled: true });
                    return; // let inflight complete, no more dequeues
                }
                const item = queue.shift();
                inflight++;

                const run = async (attempt = 0) => {
                    try {
                        const value = await item.request();
                        successful.push({ id: item.id, status: 'fulfilled', value });
                    } catch (err) {
                        const status = err?.response?.status || err?.status || 0;
                        const headers = err?.response?.headers || {};
                        const data = err?.response?.data || {};
                        const msg = (Array.isArray(data?.errors) ? data.errors.map(e => e?.message || '').join(' ') : (data?.message || '')) + '';
                        // Canvas throttling commonly returns 403 with throttling language; also honor 429/5xx
                        const looksThrottled = /throttl|rate.?limit|too many|try again later|exceed/i.test(msg) || String(headers['x-rate-limit-remaining'] || headers['X-Rate-Limit-Remaining'] || '').trim() === '0' || typeof headers['retry-after'] !== 'undefined' || typeof headers['Retry-After'] !== 'undefined';
                        const isRetryable = [429, 500, 502, 503, 504].includes(status) || (!status) || (status === 403 && looksThrottled);
                        if (attempt < maxRetries && isRetryable) {
                            // Prefer Retry-After if present; otherwise exponential backoff with jitter
                            const retryAfter = Number(headers['retry-after'] ?? headers['Retry-After']);
                            const base = isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : baseDelayMs * Math.pow(2, attempt);
                            const delay = withJitter(base);
                            await sleep(delay);
                            return run(attempt + 1);
                        }
                        failed.push({ id: item.id, status, reason: err?.message || 'Request failed' });
                    } finally {
                        completed++;
                        const pct = Math.round((completed / total) * 100);
                        try { mainWindow?.webContents?.send('update-progress', pct); } catch (_) { /* noop */ }
                        inflight--;
                        if (queue.length > 0 && !(isCancelled && isCancelled())) startNext();
                        else if (inflight === 0) resolve({ successful, failed, cancelled: isCancelled && isCancelled() });
                    }
                };

                run(0);
            }
        };

        if (queue.length === 0) return resolve({ successful, failed });
        startNext();
    });
}

// Add this helper function to combine reset results
function combineResetResults(awsResetResponse, batchResponse) {
    const totalProcessed = batchResponse.successful.length + batchResponse.failed.length;
    const bounceResets = batchResponse.successful.filter(s => s.value?.bounce?.reset > 0).length;

    return {
        summary: {
            totalEmailsProcessed: totalProcessed,
            bounceListResets: bounceResets,
            bounceListFailed: batchResponse.failed.length,
            suppressionListRemoved: awsResetResponse.removed,
            suppressionListNotRemoved: awsResetResponse.not_removed,
            suppressionListNotFound: awsResetResponse.not_found,
            suppressionListErrors: awsResetResponse.errors
        },
        details: {
            bounceResults: batchResponse,
            suppressionResults: {
                ...awsResetResponse,
                // Use the data arrays that are actually being populated
                // notFoundEmails: awsResetResponse.data?.not_found || [],
                // notRemovedEmails: awsResetResponse.data?.not_removed || []
            }
        }
    };
}
