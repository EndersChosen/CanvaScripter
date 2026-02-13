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

const csvExporter = require('../shared/csvExporter');
const { parseEmailsFromCSV, parseEmailsFromExcel } = require('../shared/emailParsers');
const { HARAnalyzer } = require('../shared/harAnalyzer');
const { analyzeHAR } = require('../shared/harAnalyzer');
const os = require('os');
const Store = require('electron-store');

// Import modular IPC handlers
const { registerFileHandlers } = require('./ipc/fileHandlers');
const { registerUtilityHandlers } = require('./ipc/utilityHandlers');
const { registerSearchHandlers } = require('./ipc/searchHandlers');
const { registerSISHandlers } = require('./ipc/sisHandlers');
const { registerConversationHandlers, cleanupConversationState } = require('./ipc/conversationHandlers');
const { registerCommChannelHandlers, cleanupCommChannelState } = require('./ipc/commChannelHandlers');
const { registerAssignmentHandlers, cleanupAssignmentState } = require('./ipc/assignmentHandlers');
const { registerCourseHandlers, cleanupCourseState } = require('./ipc/courseHandlers');
const { registerContentHandlers, cleanupContentState } = require('./ipc/contentHandlers');
const { registerSettingsHandlers } = require('./ipc/settingsHandlers');
const { registerAIAssistantHandlers } = require('./ipc/aiAssistantHandlers');
const { registerEnrollmentHandlers, cleanupEnrollmentState } = require('./ipc/enrollmentHandlers');
const { registerPermissionsHandlers, cleanupPermissionsState } = require('./ipc/permissionsHandlers');

// Import security and state management
const {
    rememberPath,
    isAllowedPath,
    allowedReadPaths,
    allowedWritePaths,
    allowedDirPaths,
    clearRendererPaths,
    validateExternalUrl
} = require('./security/ipcSecurity');

const StateManager = require('./state/stateManager');

let debugLoggingEnabled = false;
let logStream = null;
const appStore = new Store();
const MAX_LOG_FILES = 25;
const LOG_RETENTION_DAYS = 30;
const LOG_DIR_NAME = 'canvas-app-logs';
const LOGGING_CONSENT_SHOWN_KEY = 'logging.consentShown';
const LOGGING_ENABLED_KEY = 'logging.enabled';

const SENSITIVE_KEY_PATTERN = /(token|authorization|auth|password|secret|api[_-]?key|cookie|set-cookie)/i;
const PII_KEY_PATTERN = /(email|search.?term|subject|pattern|login_id)/i;
const BEARER_TOKEN_PATTERN = /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

function sanitizeLogString(value) {
    if (typeof value !== 'string') return value;
    const redacted = value
        .replace(BEARER_TOKEN_PATTERN, 'Bearer [REDACTED]')
        .replace(EMAIL_PATTERN, '[REDACTED_EMAIL]');
    return redacted.length > 1000 ? `${redacted.slice(0, 1000)}...[truncated]` : redacted;
}

function sanitizeLogData(value, depth = 0, seen = new WeakSet()) {
    if (value === null || value === undefined) return value;
    if (typeof value === 'string') return sanitizeLogString(value);
    if (typeof value !== 'object') return value;
    if (value instanceof Date) return value.toISOString();
    if (value instanceof Error) {
        return {
            name: value.name,
            message: sanitizeLogString(value.message),
            stack: sanitizeLogString(value.stack || '')
        };
    }
    if (depth > 6) return '[MaxDepth]';
    if (seen.has(value)) return '[Circular]';
    seen.add(value);

    if (Array.isArray(value)) {
        const limited = value.slice(0, 50).map(item => sanitizeLogData(item, depth + 1, seen));
        if (value.length > 50) limited.push(`[${value.length - 50} more items omitted]`);
        return limited;
    }

    const output = {};
    for (const [key, val] of Object.entries(value)) {
        if (SENSITIVE_KEY_PATTERN.test(key) || PII_KEY_PATTERN.test(key)) {
            output[key] = '[REDACTED]';
        } else {
            output[key] = sanitizeLogData(val, depth + 1, seen);
        }
    }
    return output;
}

function safeLogStringify(data) {
    try {
        return JSON.stringify(data);
    } catch {
        return '[Unserializable data]';
    }
}

function cleanupOldDebugLogs(logDir) {
    try {
        const files = fs.readdirSync(logDir)
            .filter(name => /^debug-.*\.log$/i.test(name))
            .map(name => {
                const fullPath = path.join(logDir, name);
                const stat = fs.statSync(fullPath);
                return { name, fullPath, mtimeMs: stat.mtimeMs };
            })
            .sort((a, b) => b.mtimeMs - a.mtimeMs);

        const cutoff = Date.now() - (LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
        const filesToDelete = [];

        for (const file of files) {
            if (file.mtimeMs < cutoff) {
                filesToDelete.push(file.fullPath);
            }
        }

        if (files.length > MAX_LOG_FILES) {
            files.slice(MAX_LOG_FILES).forEach(file => filesToDelete.push(file.fullPath));
        }

        const uniqueFiles = Array.from(new Set(filesToDelete));
        uniqueFiles.forEach(filePath => {
            try { fs.unlinkSync(filePath); } catch { }
        });
    } catch { }
}

function getLogDirectory() {
    return path.join(os.homedir(), LOG_DIR_NAME);
}

function getSavedLoggingPreference() {
    try {
        const value = appStore.get(LOGGING_ENABLED_KEY);
        return typeof value === 'boolean' ? value : null;
    } catch {
        return null;
    }
}

function setSavedLoggingPreference(enabled) {
    try {
        appStore.set(LOGGING_ENABLED_KEY, !!enabled);
    } catch { }
}

function hasShownLoggingConsentPrompt() {
    try {
        return !!appStore.get(LOGGING_CONSENT_SHOWN_KEY);
    } catch {
        return false;
    }
}

function markLoggingConsentPromptShown() {
    try {
        appStore.set(LOGGING_CONSENT_SHOWN_KEY, true);
    } catch { }
}

async function resolveInitialLoggingPreference() {
    const saved = getSavedLoggingPreference();
    if (saved !== null) return saved;

    if (!hasShownLoggingConsentPrompt()) {
        const logDir = getLogDirectory();
        const result = await dialog.showMessageBox({
            type: 'question',
            buttons: ['Enable Logging', 'Disable Logging'],
            defaultId: 0,
            cancelId: 1,
            noLink: true,
            title: 'Logging Preference',
            message: 'CanvaScripter includes built-in debug logging.',
            detail: `Logs are saved locally on this machine at:\n${logDir}\n\nWould you like to enable debug logging?`
        });

        const enabled = result.response === 0;
        setSavedLoggingPreference(enabled);
        markLoggingConsentPromptShown();
        return enabled;
    }

    return true;
}

// Helper function to get batch configuration from environment variables
const getBatchConfig = (overrides = {}) => {
    const batchSize = overrides.batchSize || Math.max(1, Number(process.env.BATCH_CONCURRENCY) || 35);
    const timeDelay = overrides.timeDelay || Math.max(0, Number(process.env.TIME_DELAY) || 2000);
    return { batchSize, timeDelay, ...overrides };
};

// Debug logging functions
function setDebugLogging(enabled) {
    debugLoggingEnabled = enabled;
    setSavedLoggingPreference(enabled);
    if (enabled && !logStream) {
        const logDir = getLogDirectory();
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
        cleanupOldDebugLogs(logDir);
        const logFile = path.join(logDir, `debug-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
        logStream = fs.createWriteStream(logFile, { flags: 'a' });
        console.log(`Debug logging enabled. Writing to: ${logFile}`);
    } else if (!enabled && logStream) {
        logStream.end();
        logStream = null;
        console.log('Debug logging disabled.');
    }
}

function logDebug(message, data = {}) {
    if (!debugLoggingEnabled) return;
    const timestamp = new Date().toISOString();
    const safeMessage = sanitizeLogString(String(message));
    const safeData = sanitizeLogData(data);
    const logEntry = `[${timestamp}] ${safeMessage} ${safeLogStringify(safeData)}\n`;
    if (logStream) logStream.write(logEntry);
    console.log(`[DEBUG] ${safeMessage}`, safeData);
}

// Application state
let mainWindow;
let aiSettingsWindow = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        },
        icon: path.join(__dirname, '../../assets/icon.png')
    });

    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    // Cleanup on window close
    mainWindow.webContents.on('destroyed', () => {
        const rendererId = mainWindow.webContents.id;
        clearRendererPaths(rendererId);
        cleanupConversationState(rendererId);
        cleanupCommChannelState(rendererId);
        cleanupAssignmentState(rendererId);
        cleanupCourseState(rendererId);
        cleanupContentState(rendererId);
        cleanupEnrollmentState(rendererId);
        cleanupPermissionsState(rendererId);
        StateManager.cleanupRenderer(rendererId);
    });

    mainWindow.on('closed', () => {
        if (aiSettingsWindow && !aiSettingsWindow.isDestroyed()) {
            aiSettingsWindow.close();
        }
        aiSettingsWindow = null;
        mainWindow = null;
    });

    createMenu();
}

function openAISettingsWindow() {
    if (!mainWindow) return;

    if (aiSettingsWindow && !aiSettingsWindow.isDestroyed()) {
        if (aiSettingsWindow.isMinimized()) aiSettingsWindow.restore();
        aiSettingsWindow.focus();
        return;
    }

    aiSettingsWindow = new BrowserWindow({
        width: 720,
        height: 760,
        parent: mainWindow,
        modal: true,
        title: 'AI Integrations',
        resizable: false,
        minimizable: false,
        maximizable: false,
        autoHideMenuBar: true,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        }
    });

    aiSettingsWindow.on('closed', () => {
        aiSettingsWindow = null;
    });

    aiSettingsWindow.loadFile(path.join(__dirname, '../renderer/ai_settings_window.html'))
        .then(() => {
            if (aiSettingsWindow && !aiSettingsWindow.isDestroyed()) {
                aiSettingsWindow.show();
            }
        })
        .catch((error) => {
            logDebug('Failed to open AI settings window', { error: error.message });
            if (aiSettingsWindow && !aiSettingsWindow.isDestroyed()) {
                aiSettingsWindow.close();
            }
            aiSettingsWindow = null;
        });
}

function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'AI Integrations...',
                    accelerator: 'CmdOrCtrl+,',
                    click: () => openAISettingsWindow()
                },
                { type: 'separator' },
                {
                    label: 'Reload',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => mainWindow.webContents.reload()
                },
                { type: 'separator' },
                {
                    label: 'Exit',
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => app.quit()
                }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'close' }
            ]
        },
        {
            label: 'Debug',
            submenu: [
                {
                    label: 'Toggle Debug Logging',
                    type: 'checkbox',
                    checked: debugLoggingEnabled,
                    click: (menuItem) => {
                        setDebugLogging(menuItem.checked);
                    }
                },
                {
                    label: 'Open Logs Folder',
                    click: () => {
                        const logDir = getLogDirectory();
                        shell.openPath(logDir);
                    }
                }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Documentation',
                    click: async () => {
                        await shell.openExternal('https://github.com/yourusername/canvas-electron-app');
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

app.whenReady().then(async () => {
    const initialLoggingEnabled = await resolveInitialLoggingPreference();
    setDebugLogging(initialLoggingEnabled);
    console.log('BATCH_CONCURRENCY (env):', process.env.BATCH_CONCURRENCY);
    console.log('TIME_DELAY (env):', process.env.TIME_DELAY);

    // Create main window
    createWindow();

    // Register all modular IPC handlers
    logDebug('Registering modular IPC handlers...');

    // File operations
    registerFileHandlers({
        mainWindow,
        security: {
            rememberPath,
            isAllowedPath,
            allowedReadPaths,
            allowedWritePaths,
            allowedDirPaths
        },
        parsers: { parseEmailsFromCSV, parseEmailsFromExcel },
        harAnalyzer: { HARAnalyzer, analyzeHAR }
    });

    // Utility operations
    registerUtilityHandlers(ipcMain, logDebug);

    // Search operations
    registerSearchHandlers(ipcMain, logDebug);

    // SIS data generation
    registerSISHandlers(ipcMain, logDebug);

    // Settings
    registerSettingsHandlers();

    // AI Assistant
    registerAIAssistantHandlers();

    // Conversation handlers
    registerConversationHandlers(ipcMain, logDebug, mainWindow, getBatchConfig);

    // Communication channel handlers
    registerCommChannelHandlers(ipcMain, logDebug, mainWindow, getBatchConfig);

    // Assignment handlers
    registerAssignmentHandlers(ipcMain, logDebug, mainWindow, getBatchConfig);

    // Course/Quiz/Module handlers
    registerCourseHandlers(ipcMain, logDebug, mainWindow, getBatchConfig);

    // Content handlers (discussions, pages, etc.)
    registerContentHandlers(ipcMain, logDebug, mainWindow, getBatchConfig);

    // Enrollment handlers
    registerEnrollmentHandlers(ipcMain, logDebug, mainWindow, getBatchConfig);

    // Permissions handlers
    registerPermissionsHandlers(ipcMain, logDebug, getBatchConfig);

    logDebug('All IPC handlers registered successfully');
    console.log('✓ Phase 2 Migration Complete: All 88 handlers registered via modular system');

    // Open external URL handler
    ipcMain.on('open-external-url', (event, url) => {
        logDebug(`Opening external URL: ${url}`);
        shell.openExternal(url);
    });

    // Context menu IPC handler (for sandbox mode compatibility)
    ipcMain.on('show-context-menu', (event, { x, y }) => {
        console.log('Context menu requested from renderer:', { x, y });
        const template = [
            { role: 'cut' },
            { role: 'copy' },
            { role: 'paste' },
            { role: 'selectAll' },
            { type: 'separator' },
            {
                label: 'Inspect Element',
                click: () => {
                    const win = BrowserWindow.fromWebContents(event.sender);
                    if (win) {
                        win.webContents.inspectElement(x, y);
                    }
                }
            },
            { type: 'separator' },
            { role: 'reload' },
            { role: 'forceReload' },
            { role: 'toggleDevTools' }
        ];

        const menu = Menu.buildFromTemplate(template);
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            menu.popup({ window: win });
        }
    });

    // CSV Export handlers
    ipcMain.handle('csv:sendToCSV', async (event, data, filename = 'download.csv') => {
        logDebug('[csv:sendToCSV] Exporting to CSV', { filename });
        try {
            const result = await dialog.showSaveDialog(mainWindow, {
                defaultPath: filename,
                filters: [{ name: 'CSV', extensions: ['csv'] }]
            });
            if (!result.canceled && result.filePath) {
                await csvExporter.exportToCSV(data, result.filePath);
                return { success: true, filePath: result.filePath };
            }
            return { success: false, cancelled: true };
        } catch (error) {
            logDebug('[csv:sendToCSV] Error', { error: error.message });
            throw new Error(`Failed to export CSV: ${error.message}`);
        }
    });

    ipcMain.handle('csv:writeAtPath', async (event, data, filePath) => {
        logDebug('[csv:writeAtPath] Writing CSV', { filePath });
        try {
            await csvExporter.exportToCSV(data, filePath);
            return { success: true, filePath };
        } catch (error) {
            logDebug('[csv:writeAtPath] Error', { error: error.message });
            throw new Error(`Failed to write CSV: ${error.message}`);
        }
    });

    // Utility IPC handlers
    ipcMain.handle('open-external', async (event, url) => {
        logDebug('[open-external] Opening URL', { url });
        try {
            const validatedUrl = validateExternalUrl(url);
            await shell.openExternal(validatedUrl);
            return { success: true };
        } catch (error) {
            logDebug('[open-external] Error', { error: error.message });
            throw new Error(error.message);
        }
    });

    // Shell openExternal handler (one-way send from preload)
    ipcMain.on('shell:openExternal', (event, url) => {
        logDebug('[shell:openExternal] Opening URL', { url });
        try {
            const validatedUrl = validateExternalUrl(url);
            shell.openExternal(validatedUrl);
        } catch (error) {
            logDebug('[shell:openExternal] Error', { error: error.message });
            console.error('Failed to open external URL:', error.message);
        }
    });

    ipcMain.handle('copy-to-clipboard', async (event, text) => {
        logDebug('[copy-to-clipboard] Copying text');
        clipboard.writeText(text);
        return { success: true };
    });

    ipcMain.handle('toggle-theme', async (event) => {
        logDebug('[toggle-theme] Toggling theme');
        nativeTheme.themeSource = nativeTheme.shouldUseDarkColors ? 'light' : 'dark';
        return { theme: nativeTheme.themeSource };
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Graceful shutdown
app.on('before-quit', () => {
    if (logStream) {
        logStream.end();
        logStream = null;
    }
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    logDebug('[uncaughtException]', { error: error.message, stack: error.stack });
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    logDebug('[unhandledRejection]', { reason: String(reason) });
});
