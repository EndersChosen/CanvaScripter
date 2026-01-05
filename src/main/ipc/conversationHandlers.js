/**
 * IPC Handlers for Conversation Operations
 * Manages Canvas conversation operations including fetching, deleting, and restoring
 * @module ipc/conversationHandlers
 */

const convos = require('../../shared/canvas-api/conversations');

// Per-renderer state tracking
const getConvosControllers = new Map(); // senderId -> AbortController
const getDeletedConvosControllers = new Map(); // senderId -> AbortController
const restoreConvosCancelFlags = new Map(); // senderId -> boolean
const deleteConvosCancelFlags = new Map(); // senderId -> boolean

/**
 * Rate-limited handler for Canvas API requests with retry logic
 * Handles throttling, retries, and progress tracking
 */
async function canvasRateLimitedHandler(requests, options = {}, mainWindow) {
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
                    if (inflight === 0) return resolve({ successful, failed, cancelled: true });
                    return;
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
                        const looksThrottled = /throttl|rate.?limit|too many|try again later|exceed/i.test(msg) || 
                            String(headers['x-rate-limit-remaining'] || headers['X-Rate-Limit-Remaining'] || '').trim() === '0' || 
                            typeof headers['retry-after'] !== 'undefined' || typeof headers['Retry-After'] !== 'undefined';
                        const isRetryable = [429, 500, 502, 503, 504].includes(status) || (!status) || (status === 403 && looksThrottled);
                        
                        if (attempt < maxRetries && isRetryable) {
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
                        try { mainWindow?.webContents?.send('update-progress', pct); } catch (_) { }
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

/**
 * Register all conversation-related IPC handlers
 * @param {Electron.IpcMain} ipcMain - The Electron IPC main instance
 * @param {Function} logDebug - Debug logging function
 * @param {Electron.BrowserWindow} mainWindow - Main window for progress updates
 */
function registerConversationHandlers(ipcMain, logDebug, mainWindow) {
    // Get conversations with GraphQL - cancellable operation with progress tracking
    ipcMain.handle('axios:getConvos', async (event, data) => {
        logDebug('[axios:getConvos] Fetching conversations', { domain: data.domain });
        const senderId = event.sender.id;
        try {
            // Abort previous fetch for this renderer
            if (getConvosControllers.has(senderId)) {
                try { getConvosControllers.get(senderId).abort('superseded'); } catch { }
            }
            const controller = new AbortController();
            getConvosControllers.set(senderId, controller);
            
            const sentMessages = await convos.getConversationsGraphQL({ ...data, signal: controller.signal });
            
            // Clean up if still the active controller
            if (getConvosControllers.get(senderId) === controller) {
                getConvosControllers.delete(senderId);
            }
            return sentMessages;
        } catch (error) {
            // Clean up on error
            try {
                const current = getConvosControllers.get(senderId);
                if (!current || current.signal.aborted || current === undefined) {
                    getConvosControllers.delete(senderId);
                }
            } catch { }
            logDebug('[axios:getConvos] Error', { error: error.message });
            throw error.message || error;
        }
    });

    // Cancel conversation fetch
    ipcMain.handle('axios:cancelGetConvos', async (event) => {
        const senderId = event.sender.id;
        logDebug('[axios:cancelGetConvos] Cancelling fetch', { senderId });
        try {
            const controller = getConvosControllers.get(senderId);
            if (controller) {
                controller.abort('user_cancelled');
                getConvosControllers.delete(senderId);
                return { cancelled: true };
            }
            return { cancelled: false };
        } catch (e) {
            return { cancelled: false };
        }
    });

    // Get deleted conversations
    ipcMain.handle('axios:getDeletedConversations', async (event, data) => {
        logDebug('[axios:getDeletedConversations] Fetching deleted conversations', { domain: data.domain });
        const senderId = event.sender.id;
        try {
            // Abort previous fetch for this renderer
            if (getDeletedConvosControllers.has(senderId)) {
                try { getDeletedConvosControllers.get(senderId).abort('superseded'); } catch { }
            }
            const controller = new AbortController();
            getDeletedConvosControllers.set(senderId, controller);
            
            const results = await convos.getDeletedConversations({ ...data, signal: controller.signal });
            
            // Clean up if still the active controller
            if (getDeletedConvosControllers.get(senderId) === controller) {
                getDeletedConvosControllers.delete(senderId);
            }
            return results;
        } catch (error) {
            // Clean up on error
            try {
                const current = getDeletedConvosControllers.get(senderId);
                if (!current || current.signal.aborted || current === undefined) {
                    getDeletedConvosControllers.delete(senderId);
                }
            } catch { }
            logDebug('[axios:getDeletedConversations] Error', { error: error.message });
            throw error.message || error;
        }
    });

    // Cancel deleted conversations fetch
    ipcMain.handle('axios:cancelGetDeletedConversations', async (event) => {
        const senderId = event.sender.id;
        logDebug('[axios:cancelGetDeletedConversations] Cancelling fetch', { senderId });
        try {
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

    // Restore deleted conversations from CSV data with batch processing
    ipcMain.handle('axios:restoreDeletedConversations', async (event, data) => {
        logDebug('[axios:restoreDeletedConversations] Starting restoration', { rowCount: data.rows?.length });
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
        logDebug('[axios:restoreDeletedConversations] Validated rows', { valid: valid.length, skipped });
        
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
        }, mainWindow);
        
        // Fallback probe if no results
        if ((response.successful?.length || 0) + (response.failed?.length || 0) === 0 && valid.length > 0) {
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
        
        // Clean up cancel flag and include cancelled state
        const cancelled = restoreConvosCancelFlags.get(senderId) === true;
        restoreConvosCancelFlags.delete(senderId);
        
        logDebug('[axios:restoreDeletedConversations] Complete', { 
            successful: response.successful.length, 
            failed: response.failed.length, 
            cancelled 
        });
        
        return { ...response, cancelled };
    });

    // Cancel restoration of deleted conversations
    ipcMain.handle('axios:cancelRestoreDeletedConversations', async (event) => {
        const senderId = event.sender.id;
        logDebug('[axios:cancelRestoreDeletedConversations] Cancelling restoration', { senderId });
        try {
            restoreConvosCancelFlags.set(senderId, true);
            return { cancelled: true };
        } catch (e) {
            return { cancelled: false };
        }
    });

    // Delete conversations
    ipcMain.handle('axios:deleteConvos', async (event, data) => {
        logDebug('[axios:deleteConvos] Starting deletion', { count: data.messages?.length });
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
            // Check cancellation before starting batch
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
                    failed.push({ 
                        id: vv?.id, 
                        reason: (vv?.err?.message || vv?.err || 'Unknown error'), 
                        status: vv?.err?.status 
                    });
                }
            }
            
            // Delay between batches if not cancelled
            if (i + batchSize < requests.length && !deleteConvosCancelFlags.get(senderId)) {
                await new Promise(r => setTimeout(r, timeDelay));
            }
        }

        const cancelled = deleteConvosCancelFlags.get(senderId) === true;
        deleteConvosCancelFlags.delete(senderId);
        
        logDebug('[axios:deleteConvos] Complete', { 
            successful: successful.length, 
            failed: failed.length, 
            cancelled 
        });
        
        return { successful, failed, cancelled };
    });

    // Cancel conversation deletion
    ipcMain.handle('axios:cancelDeleteConvos', async (event) => {
        const senderId = event.sender.id;
        logDebug('[axios:cancelDeleteConvos] Cancelling deletion', { senderId });
        try {
            deleteConvosCancelFlags.set(senderId, true);
            return { cancelled: true };
        } catch {
            return { cancelled: false };
        }
    });

    logDebug('[conversationHandlers] 9 conversation handlers registered');
}

/**
 * Cleanup function for renderer process cleanup
 * @param {number} rendererId - The renderer ID to clean up
 */
function cleanupConversationState(rendererId) {
    // Clean up AbortControllers
    const getConvosController = getConvosControllers.get(rendererId);
    if (getConvosController) {
        try { getConvosController.abort('renderer_closed'); } catch { }
        getConvosControllers.delete(rendererId);
    }
    
    const getDeletedConvosController = getDeletedConvosControllers.get(rendererId);
    if (getDeletedConvosController) {
        try { getDeletedConvosController.abort('renderer_closed'); } catch { }
        getDeletedConvosControllers.delete(rendererId);
    }
    
    // Clean up cancel flags
    restoreConvosCancelFlags.delete(rendererId);
    deleteConvosCancelFlags.delete(rendererId);
}

module.exports = { 
    registerConversationHandlers,
    cleanupConversationState
};
