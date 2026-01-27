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

// Helper function to get batch configuration from environment variables
const getBatchConfig = (overrides = {}) => {
    const batchSize = overrides.batchSize || Math.max(1, Number(process.env.BATCH_CONCURRENCY) || 35);
    const timeDelay = overrides.timeDelay || Math.max(0, Number(process.env.TIME_DELAY) || 2000);
    return { batchSize, timeDelay, ...overrides };
};

// Debug logging functions
function setDebugLogging(enabled) {
    debugLoggingEnabled = enabled;
    if (enabled && !logStream) {
        const logDir = path.join(os.homedir(), 'canvas-app-logs');
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
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
    const logEntry = `[${timestamp}] ${message} ${JSON.stringify(data)}\n`;
    if (logStream) logStream.write(logEntry);
    console.log(`[DEBUG] ${message}`, data);
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
                        const logDir = path.join(os.homedir(), 'canvas-app-logs');
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

app.whenReady().then(() => {
    setDebugLogging(true); // Enable debug logging by default; user can toggle via menu
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
    registerConversationHandlers(ipcMain, logDebug, mainWindow);

    // Communication channel handlers
    registerCommChannelHandlers(ipcMain, logDebug, mainWindow, getBatchConfig);

    // Assignment handlers
    registerAssignmentHandlers(ipcMain, logDebug, mainWindow, getBatchConfig);

    // Course/Quiz/Module handlers
    registerCourseHandlers(ipcMain, logDebug, mainWindow, getBatchConfig);

    // Content handlers (discussions, pages, etc.)
    registerContentHandlers(ipcMain, logDebug, mainWindow, getBatchConfig);

    logDebug('All IPC handlers registered successfully');
    console.log('✓ Phase 2 Migration Complete: All 86 handlers registered via modular system');

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
