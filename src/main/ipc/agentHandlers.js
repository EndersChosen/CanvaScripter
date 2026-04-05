/**
 * Agent Handlers - IPC bridge between the Electron renderer and the AgentLoop
 * 
 * Registers IPC handlers for:
 *   agent:chat           - Send a message to the agent
 *   agent:confirmTool    - Respond to a tool confirmation request
 *   agent:cancel         - Cancel the current agent operation
 *   agent:newSession     - Start a fresh conversation
 *   agent:getHistory     - Get conversation history
 */

const { ipcMain, dialog, BrowserWindow } = require('electron');
const { AgentLoop } = require('../agent/agentLoop');
const { getAIClientConfig } = require('../security/aiProviders');
const { getDecryptedKey, store } = require('./settingsHandlers');
const { getDefaultToken } = require('./tokenHandlers');
const fs = require('fs');
const path = require('path');

/** @type {AgentLoop|null} */
let agentInstance = null;

/** @type {Map<string, Function>} Pending confirmation resolvers: confirmId -> resolve(boolean) */
const pendingConfirmations = new Map();
/** @type {Map<string, Function>} Pending domain confirmation resolvers: confirmId -> resolve(string|null) */
const pendingDomainConfirmations = new Map();

let confirmIdCounter = 0;

function generateConfirmId() {
    return `confirm_${++confirmIdCounter}_${Date.now()}`;
}

/**
 * Get or create the singleton agent instance
 * @param {Electron.WebContents} sender - The renderer's webContents for sending events
 */
/** @type {{ domain: string|null, token: string|null }} */
let canvasCredentials = { domain: null, token: null };

function getAgent(sender) {
    if (!agentInstance) {
        agentInstance = new AgentLoop({
            getAIClient: () => {
                try {
                    return getAIClientConfig(getDecryptedKey, store);
                } catch (e) {
                    console.error('Failed to get AI client config:', e.message);
                    return null;
                }
            },
            getDomain: () => canvasCredentials.domain,
            getToken: () => canvasCredentials.token,
            onUpdate: (update) => {
                try {
                    if (sender && !sender.isDestroyed()) {
                        sender.send('agent:update', update);
                    }
                } catch (e) {
                    // Sender may be destroyed if window closed during operation
                }
            },
            onConfirmRequest: ({ toolName, description, args, count, items, totalGroups, groupIndex, allGroups }) => {
                return new Promise((resolve) => {
                    const confirmId = generateConfirmId();
                    pendingConfirmations.set(confirmId, resolve);

                    try {
                        if (sender && !sender.isDestroyed()) {
                            sender.send('agent:confirmRequest', {
                                confirmId,
                                toolName,
                                description,
                                args,
                                count,
                                items,
                                totalGroups,
                                groupIndex,
                                allGroups
                            });
                        } else {
                            // Can't reach renderer, deny by default
                            resolve(false);
                            pendingConfirmations.delete(confirmId);
                        }
                    } catch (e) {
                        resolve(false);
                        pendingConfirmations.delete(confirmId);
                    }

                    // Safety timeout - auto-deny after 5 minutes
                    setTimeout(() => {
                        if (pendingConfirmations.has(confirmId)) {
                            pendingConfirmations.get(confirmId)(false);
                            pendingConfirmations.delete(confirmId);
                        }
                    }, 5 * 60 * 1000);
                });
            },
            onDomainConfirmRequest: ({ domain, suggestions }) => {
                return new Promise((resolve) => {
                    const confirmId = generateConfirmId();
                    pendingDomainConfirmations.set(confirmId, resolve);

                    try {
                        if (sender && !sender.isDestroyed()) {
                            sender.send('agent:domainConfirmRequest', {
                                confirmId,
                                domain,
                                suggestions
                            });
                        } else {
                            resolve(null);
                            pendingDomainConfirmations.delete(confirmId);
                        }
                    } catch (e) {
                        resolve(null);
                        pendingDomainConfirmations.delete(confirmId);
                    }

                    // Safety timeout - auto-cancel after 2 minutes
                    setTimeout(() => {
                        if (pendingDomainConfirmations.has(confirmId)) {
                            pendingDomainConfirmations.get(confirmId)(null);
                            pendingDomainConfirmations.delete(confirmId);
                        }
                    }, 2 * 60 * 1000);
                });
            }
        });
    }
    return agentInstance;
}

function registerAgentHandlers() {
    // File selection for chat attachments
    ipcMain.handle('agent:selectFile', async () => {
        const win = BrowserWindow.getFocusedWindow();
        const result = await dialog.showOpenDialog(win, {
            properties: ['openFile'],
            filters: [
                { name: 'Supported Files', extensions: ['xml', 'zip', 'json', 'csv', 'txt', 'har', 'html', 'htm', 'md'] },
                { name: 'QTI Files', extensions: ['xml', 'zip'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        if (result.canceled) return { canceled: true };
        return { canceled: false, filePath: result.filePaths[0], fileName: path.basename(result.filePaths[0]) };
    });

    // Main chat handler - sends a message and returns the response
    ipcMain.handle('agent:chat', async (event, { message, domain, token, filePath }) => {
        try {
            // Update credentials from the renderer's form fields
            if (domain) canvasCredentials.domain = domain;
            if (token) canvasCredentials.token = token;

            // Fall back to stored defaults when form fields are empty
            if (!canvasCredentials.domain) {
                canvasCredentials.domain = store.get('canvasDefaultDomain', '') || 'canvas.instructure.com';
            }
            if (!canvasCredentials.token) {
                const defaultToken = getDefaultToken();
                if (defaultToken) canvasCredentials.token = defaultToken;
            }

            // Persist domain so background services (GraphQL scan) can use it
            if (domain) store.set('canvasDefaultDomain', domain);

            // If a file was attached, read it and augment the message
            let augmentedMessage = message;
            if (filePath) {
                try {
                    const ext = path.extname(filePath).toLowerCase();
                    const fileName = path.basename(filePath);
                    const MAX_FILE_SIZE = 500 * 1024; // 500KB text limit

                    if (ext === '.zip') {
                        // For ZIP files, try QTI analysis
                        try {
                            const { QTIAnalyzer } = require('../../shared/qtiAnalyzer');
                            const zipBuffer = fs.readFileSync(filePath);
                            const qtiData = await QTIAnalyzer.analyzePackage(zipBuffer);
                            augmentedMessage += '\n\n--- Attached File: ' + fileName + ' ---\n'
                                + 'QTI Analysis Results:\n'
                                + JSON.stringify(qtiData, null, 2).substring(0, 30000);
                        } catch (qtiErr) {
                            augmentedMessage += '\n\n--- Attached File: ' + fileName + ' (ZIP) ---\n'
                                + 'Could not analyze as QTI package: ' + qtiErr.message;
                        }
                    } else {
                        // Text-based files
                        const stats = fs.statSync(filePath);
                        if (stats.size > MAX_FILE_SIZE) {
                            augmentedMessage += '\n\n--- Attached File: ' + fileName + ' (truncated, ' + Math.round(stats.size / 1024) + 'KB) ---\n'
                                + fs.readFileSync(filePath, 'utf8').substring(0, MAX_FILE_SIZE);
                        } else {
                            augmentedMessage += '\n\n--- Attached File: ' + fileName + ' ---\n'
                                + fs.readFileSync(filePath, 'utf8');
                        }
                    }
                } catch (fileErr) {
                    augmentedMessage += '\n\n[Failed to read attached file: ' + fileErr.message + ']';
                }
            }

            const agent = getAgent(event.sender);
            const result = await agent.chat(augmentedMessage);
            return { success: true, ...result };
        } catch (error) {
            console.error('Agent chat error:', error);
            return { success: false, error: error.message };
        }
    });

    // Tool confirmation response
    ipcMain.handle('agent:confirmTool', async (_event, { confirmId, approved, approveAll }) => {
        const resolve = pendingConfirmations.get(confirmId);
        if (resolve) {
            resolve(approveAll ? 'approveAll' : approved);
            pendingConfirmations.delete(confirmId);
            return { success: true };
        }
        return { success: false, error: 'Confirmation request not found or expired' };
    });

    // Domain confirmation response — user picks original, a suggestion, or cancels
    ipcMain.handle('agent:confirmDomain', async (_event, { confirmId, domain }) => {
        const resolve = pendingDomainConfirmations.get(confirmId);
        if (resolve) {
            // domain is null if cancelled, or the chosen domain string
            resolve(domain);
            pendingDomainConfirmations.delete(confirmId);
            return { success: true };
        }
        return { success: false, error: 'Domain confirmation request not found or expired' };
    });

    // Cancel current operation
    ipcMain.handle('agent:cancel', async () => {
        if (agentInstance) {
            agentInstance.cancel();
        }
        // Also resolve any pending confirmations as denied
        for (const [id, resolve] of pendingConfirmations) {
            resolve(false);
            pendingConfirmations.delete(id);
        }
        for (const [id, resolve] of pendingDomainConfirmations) {
            resolve(null);
            pendingDomainConfirmations.delete(id);
        }
        return { success: true };
    });

    // Start a new session (clear history)
    ipcMain.handle('agent:newSession', async () => {
        if (agentInstance) {
            agentInstance.reset();
        }
        return { success: true };
    });

    // Get conversation history
    ipcMain.handle('agent:getHistory', async () => {
        if (!agentInstance) return { success: true, history: [] };
        return { success: true, history: agentInstance.getHistory() };
    });
}

module.exports = { registerAgentHandlers };
