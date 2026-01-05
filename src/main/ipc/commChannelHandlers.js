/**
 * IPC Handlers for Communication Channel Operations
 * Manages email communication channels, bounce lists, AWS suppression, and email validation
 * @module ipc/commChannelHandlers
 */

const { dialog } = require('electron');
const fs = require('fs');
const path = require('path');
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
} = require('../../shared/canvas-api/comm_channels');
const { getCommChannels } = require('../../shared/canvas-api/users');
const { batchHandler } = require('../../shared/batchHandler');
const { waitFunc, removeBlanks } = require('../../shared/utilities');

// Global state for suppressed emails
let suppressedEmails = [];

// Per-renderer cancellation flags
const resetEmailsCancelFlags = new Map();
const resetPatternCancelFlags = new Map();

/**
 * Helper function to combine reset results for resetEmails operation
 */
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
        batchResponse,
        awsResetResponse
    };
}

/**
 * Helper to parse emails from CSV content
 */
function parseEmailsFromCSV(csvContent) {
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const pathIdx = headers.indexOf('path');
    const typeIdx = headers.indexOf('type');

    const emails = [];
    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',');
        if (pathIdx !== -1 && row[pathIdx]?.includes('@')) {
            emails.push(row[pathIdx].trim());
        } else if (typeIdx !== -1 && row[typeIdx]?.includes('@')) {
            emails.push(row[typeIdx].trim());
        } else {
            for (const cell of row) {
                if (cell?.includes('@')) {
                    emails.push(cell.trim());
                    break;
                }
            }
        }
    }
    return Array.from(new Set(emails));
}

/**
 * Helper for progress updates
 */
function progressUpdateDeterminate(processed, total, mainWindow, customLabel) {
    try {
        mainWindow.webContents.send('update-progress', {
            mode: 'determinate',
            label: customLabel || 'Processing...',
            processed,
            total,
            value: total > 0 ? processed / total : 0
        });
    } catch { }
}

function progressStartIndeterminate(label, mainWindow) {
    try {
        mainWindow.webContents.send('update-progress', {
            mode: 'indeterminate',
            label: label || 'Processing...'
        });
    } catch { }
}

function progressDone(mainWindow) {
    try {
        mainWindow.webContents.send('update-progress', null);
        mainWindow.setProgressBar(-1);
    } catch { }
}

/**
 * Register all communication channel-related IPC handlers
 * @param {Electron.IpcMain} ipcMain - The Electron IPC main instance
 * @param {Function} logDebug - Debug logging function
 * @param {Electron.BrowserWindow} mainWindow - Main window for progress updates
 * @param {Function} getBatchConfig - Function to get batch configuration
 */
function registerCommChannelHandlers(ipcMain, logDebug, mainWindow, getBatchConfig) {
    // AWS Suppression check (single email)
    ipcMain.handle('axios:awsCheck', async (event, data) => {
        logDebug('[axios:awsCheck] Checking AWS suppression', { email: data.email });
        try {
            const result = await awsCheck({ ...data, email: data.email });
            return result.status !== '404';
        } catch (error) {
            logDebug('[axios:awsCheck] Error', { error: error.message });
            throw error.message || error;
        }
    });

    // Bounce check (single email)
    ipcMain.handle('axios:bounceCheck', async (event, { domain, token, email }) => {
        logDebug('[axios:bounceCheck] Checking bounce status', { email });
        try {
            return await bounceCheck(domain, token, email);
        } catch (error) {
            logDebug('[axios:bounceCheck] Error', { error: error.message });
            throw error.message || error;
        }
    });

    // Check communication channel
    ipcMain.handle('axios:checkCommChannel', async (event, data) => {
        logDebug('[axios:checkCommChannel] Checking comm channel', { email: data.email });
        try {
            const response = await emailCheck(data);
            return response;
        } catch (error) {
            throw error.message;
        }
    });

    // Save suppressed emails to file
    ipcMain.handle('axios:saveSuppressedEmails', async (event, options) => {
        logDebug('[axios:saveSuppressedEmails] Saving suppressed emails', { count: suppressedEmails.length });
        try {
            if (suppressedEmails.length === 0) {
                throw new Error('No suppressed emails to save');
            }

            const result = await dialog.showSaveDialog(mainWindow, {
                defaultPath: options.defaultPath || 'suppressed_emails.csv',
                filters: options.filters || [
                    { name: 'CSV Files', extensions: ['csv'] },
                    { name: 'Text Files', extensions: ['txt'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });

            if (result.canceled) {
                return { success: false, cancelled: true };
            }

            const csvContent = suppressedEmails.join('\n');
            fs.writeFileSync(result.filePath, csvContent, 'utf8');

            return {
                success: true,
                filePath: result.filePath,
                count: suppressedEmails.length
            };
        } catch (error) {
            throw new Error(`Failed to save file: ${error.message}`);
        }
    });

    // Check communication domain (builds suppressedEmails list)
    ipcMain.handle('axios:checkCommDomain', async (event, data) => {
        logDebug('[axios:checkCommDomain] Checking domain');
        suppressedEmails = [];

        function processLargeArray(largeArray) {
            const chunkSize = 1000;
            for (let i = 0; i < largeArray.length; i += chunkSize) {
                const chunk = largeArray.slice(i, i + chunkSize);
                suppressedEmails.push(...chunk);
            }
        }

        try {
            const response = await checkCommDomain(data);
            processLargeArray(response);

            logDebug('[axios:checkCommDomain] Complete', { count: suppressedEmails.length });
            return {
                count: suppressedEmails.length,
                hasResults: suppressedEmails.length > 0
            };
        } catch (error) {
            throw error.message;
        }
    });

    // Reset single communication channel
    ipcMain.handle('axios:resetCommChannel', async (event, data) => {
        logDebug('[axios:resetCommChannel] Resetting channel', { email: data.email });
        try {
            const response = await resetEmail(data);
            return response;
        } catch (error) {
            throw error.message;
        }
    });

    // Check unconfirmed emails (returns CSV stream)
    ipcMain.handle('axios:checkUnconfirmedEmails', async (event, data) => {
        logDebug('[axios:checkUnconfirmedEmails] Checking unconfirmed emails');
        try {
            const response = await checkUnconfirmedEmails(data);

            const chunks = [];
            return new Promise((resolve, reject) => {
                response.on('data', (chunk) => chunks.push(chunk));
                response.on('end', () => {
                    const csvData = Buffer.concat(chunks).toString('utf-8');
                    resolve({ success: true, data: csvData });
                });
                response.on('error', (error) => reject(error));
            });
        } catch (error) {
            throw error.message;
        }
    });

    // Confirm emails (batch operation)
    ipcMain.handle('axios:confirmEmails', async (event, data) => {
        logDebug('[axios:confirmEmails] Confirming emails', { count: data.emails.length });

        let completedRequests = 0;
        const totalRequests = data.emails.length;

        const request = async (requestData) => {
            try {
                const response = await confirmEmail(requestData);
                completedRequests++;
                progressUpdateDeterminate(completedRequests, totalRequests, mainWindow, 'Confirming emails...');
                return response;
            } catch (error) {
                completedRequests++;
                progressUpdateDeterminate(completedRequests, totalRequests, mainWindow, 'Confirming emails...');
                throw error;
            }
        };

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
        });

        progressUpdateDeterminate(0, totalRequests, mainWindow, 'Confirming emails...');
        const batchResponse = await batchHandler(requests, getBatchConfig());
        progressDone(mainWindow);

        let confirmedCount = 0;
        batchResponse.successful.forEach((success) => {
            if (success.value && success.value.confirmed) {
                confirmedCount++;
            }
        });

        return {
            failed: batchResponse.failed,
            successful: batchResponse.successful,
            confirmed: confirmedCount,
            total: totalRequests
        };
    });

    // Reset emails (bounce + AWS suppression)
    ipcMain.handle('axios:resetEmails', async (event, data) => {
        logDebug('[axios:resetEmails] Starting email reset operation');

        const senderId = event.sender.id;
        resetEmailsCancelFlags.set(senderId, false);
        const isCancelled = () => resetEmailsCancelFlags.get(senderId) === true;

        let fileContents = data?.fileContents;
        if (!fileContents) {
            const result = await dialog.showOpenDialog(mainWindow, {
                properties: ['openFile'],
                filters: [{ name: 'All Files', extensions: ['*'] }]
            });
            if (result.canceled) throw new Error('Cancelled');
            const filePath = result.filePaths[0];
            fileContents = await fs.promises.readFile(filePath, 'utf8');
        }

        let rawEmailItems;
        if (Array.isArray(fileContents)) {
            rawEmailItems = fileContents;
        } else if (typeof fileContents === 'string') {
            rawEmailItems = fileContents.split(/\r?\n|\r|\,/);
        } else {
            throw new TypeError('Unsupported fileContents type for resetEmails');
        }

        const emails = Array.from(new Set(
            removeBlanks(rawEmailItems)
                .map((email) => String(email).trim())
                .filter((email) => email.includes('@'))
        ));

        const total = emails.length;
        let processed = 0;

        mainWindow.webContents.send('update-progress', {
            mode: 'determinate',
            label: 'Resetting communication channels',
            processed: 0,
            total,
            value: 0
        });

        const concurrency = Math.max(1, Number(process.env.BATCH_CONCURRENCY) || 35);

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
                const bounceRes = await bounceReset({
                    domain: reqData.domain,
                    token: reqData.token,
                    email: reqData.email
                });
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

        const batchResponse = await batchHandler(requests, {
            batchSize: concurrency,
            timeDelay: process.env.TIME_DELAY,
            isCancelled
        });

        // Bulk AWS reset
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

            if (isCancelled()) break;
            await waitFunc(process.env.TIME_DELAY);

            try {
                const awsRes = await bulkAWSReset({ region: data.region, token: data.token, emails: bulkArray });
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
            } catch (err) {
                awsResetResponse.errors++;
                awsResetResponse.failed_messages.push(err?.message || String(err));
                continue;
            }
        }

        mainWindow.webContents.send('update-progress', {
            mode: 'determinate',
            label: 'Resetting emails (AWS suppression list)...',
            processed: awsTotal,
            total: awsTotal,
            value: 1
        });

        const cancelled = isCancelled();
        resetEmailsCancelFlags.delete(senderId);
        const combinedResults = combineResetResults(awsResetResponse, batchResponse);

        logDebug('[axios:resetEmails] Complete', {
            total: emails.length,
            bounceResets: combinedResults.summary.bounceListResets,
            awsRemoved: awsResetResponse.removed,
            cancelled
        });

        return { combinedResults, cancelled };
    });

    // Cancel reset emails operation
    ipcMain.handle('axios:cancelResetEmails', async (event) => {
        const senderId = event.sender.id;
        logDebug('[axios:cancelResetEmails] Cancelling operation', { senderId });
        resetEmailsCancelFlags.set(senderId, true);
        return { cancelled: true };
    });

    // Reset communication channels by pattern (iterative bounce list clearing)
    ipcMain.handle('axios:resetCommChannelsByPattern', async (event, data) => {
        logDebug('[axios:resetCommChannelsByPattern] Starting pattern reset', { pattern: data.pattern });

        const senderId = event.sender.id;
        resetPatternCancelFlags.set(senderId, false);
        const isCancelled = () => resetPatternCancelFlags.get(senderId) === true;

        const normalizedPattern = String(data.pattern || '').trim();
        const base = { ...data, pattern: normalizedPattern };

        try {
            let allResults = [];
            let totalProcessed = 0;
            let iterationCount = 0;
            const maxIterations = 100;

            while (iterationCount < maxIterations) {
                iterationCount++;

                const batchLabel = iterationCount === 1 ?
                    'Checking bounce list...' :
                    `Checking bounce list again (found ${totalProcessed} so far)...`;
                progressStartIndeterminate(batchLabel, mainWindow);

                const bouncedRows = await getBouncedData(base);

                if (isCancelled()) {
                    progressDone(mainWindow);
                    resetPatternCancelFlags.delete(senderId);
                    return allResults;
                }

                const targets = new Set();
                if (Array.isArray(bouncedRows)) {
                    for (const row of bouncedRows) {
                        const em = Array.isArray(row) ? row[4] : null;
                        if (em) targets.add(String(em).trim());
                    }
                }

                const emails = Array.from(targets);

                if (emails.length === 0) {
                    logDebug('[axios:resetCommChannelsByPattern] No more emails found', { passes: iterationCount });
                    progressDone(mainWindow);
                    resetPatternCancelFlags.delete(senderId);
                    return allResults;
                }

                logDebug('[axios:resetCommChannelsByPattern] Pass iteration', {
                    pass: iterationCount,
                    count: emails.length
                });

                try {
                    const bounceLabel = iterationCount === 1 ?
                        `Clearing ${emails.length} email(s) from bounce list...` :
                        `Clearing ${emails.length} more email(s) from bounce list...`;
                    progressStartIndeterminate(bounceLabel, mainWindow);
                    await patternBounceReset(base, isCancelled);
                } catch (error) {
                    logDebug('[axios:resetCommChannelsByPattern] Bounce reset error', {
                        pass: iterationCount,
                        error: error.message
                    });
                }

                if (isCancelled()) {
                    progressDone(mainWindow);
                    resetPatternCancelFlags.delete(senderId);
                    return allResults;
                }

                let awsProcessed = 0;
                const awsTotal = emails.length;

                progressUpdateDeterminate(0, awsTotal, mainWindow, 'Resetting AWS suppression...');

                const updateAwsProgress = (email) => {
                    awsProcessed++;
                    const percentage = awsTotal > 0 ? awsProcessed / awsTotal : 0;
                    mainWindow.webContents.send('update-progress', {
                        mode: 'determinate',
                        label: `Resetting ${email} from AWS suppression (${awsProcessed}/${awsTotal})`,
                        processed: awsProcessed,
                        total: awsTotal,
                        value: percentage
                    });
                    try { mainWindow.setProgressBar(percentage, { mode: 'normal' }); } catch { }
                };

                const request = async (requestData) => {
                    try {
                        const res = await awsReset(requestData);
                        return res;
                    } catch (error) {
                        throw error;
                    } finally {
                        updateAwsProgress(requestData.email);
                    }
                };

                let requests = [];
                for (let i = 0; i < emails.length; i++) {
                    const requestData = {
                        region: data.region,
                        token: data.token,
                        email: emails[i]
                    };
                    requests.push({
                        id: totalProcessed + i + 1,
                        request: () => request(requestData),
                        email: emails[i]
                    });
                }

                const batchResponse = await batchHandler(requests, getBatchConfig());

                for (let i = 0; i < emails.length; i++) {
                    const email = emails[i];
                    const awsResult = batchResponse.successful?.find(s =>
                        requests.find(r => r.id === s.id)?.email === email
                    );

                    allResults.push({
                        email: email,
                        bounce: { reset: 1 },
                        suppression: awsResult?.value || { reset: 0 }
                    });
                }

                totalProcessed += emails.length;
                logDebug('[axios:resetCommChannelsByPattern] Pass complete', {
                    pass: iterationCount,
                    processed: emails.length,
                    total: totalProcessed
                });

                if (isCancelled()) {
                    progressDone(mainWindow);
                    resetPatternCancelFlags.delete(senderId);
                    return allResults;
                }

                await waitFunc(process.env.TIME_DELAY || 1000);
            }

            logDebug('[axios:resetCommChannelsByPattern] Max iterations reached', { maxIterations });
            progressDone(mainWindow);
            resetPatternCancelFlags.delete(senderId);
            return allResults;

        } catch (err) {
            progressDone(mainWindow);
            resetPatternCancelFlags.delete(senderId);
            throw err.message || err;
        }
    });

    // Cancel pattern reset operation
    ipcMain.handle('axios:cancelResetCommChannelsByPattern', async (event) => {
        const senderId = event.sender.id;
        logDebug('[axios:cancelResetCommChannelsByPattern] Cancelling', { senderId });
        resetPatternCancelFlags.set(senderId, true);
        return { cancelled: true };
    });

    // Get communication channels for user
    ipcMain.handle('axios:getCommChannels', async (event, data) => {
        logDebug('[axios:getCommChannels] Getting channels', { user: data.user });
        try {
            const { domain, token, user } = data;
            const channels = await getCommChannels(domain, user, token);
            return { success: true, data: channels };
        } catch (error) {
            logDebug('[axios:getCommChannels] Error', { error: error.message });
            return { success: false, error: error.message };
        }
    });

    // File upload: Confirm emails from file
    ipcMain.handle('fileUpload:confirmEmails', async (event, data) => {
        logDebug('[fileUpload:confirmEmails] Confirming emails from file', { count: data.emails?.length });

        const { emails } = data;

        if (!emails || !Array.isArray(emails) || emails.length === 0) {
            return { success: false, message: 'No emails provided' };
        }

        const totalRequests = emails.length;
        let processedCount = 0;

        const request = async (requestData) => {
            try {
                const response = await confirmEmail(requestData);
                processedCount++;
                progressUpdateDeterminate(processedCount, totalRequests, mainWindow, 'Confirming emails...');
                return response;
            } catch (error) {
                processedCount++;
                progressUpdateDeterminate(processedCount, totalRequests, mainWindow, 'Confirming emails...');
                throw error;
            }
        };

        const requests = [];
        for (let i = 0; i < emails.length; i++) {
            const email = emails[i];
            const requestData = {
                domain: data.domain,
                token: data.token,
                email: email
            };
            requests.push({ id: i + 1, request: () => request(requestData) });
        }

        progressUpdateDeterminate(0, totalRequests, mainWindow, 'Confirming emails...');
        const batchResponse = await batchHandler(requests, getBatchConfig());
        progressDone(mainWindow);

        let confirmedCount = 0;
        batchResponse.successful.forEach((success) => {
            if (success.value && success.value.confirmed) {
                confirmedCount++;
            }
        });

        return {
            success: true,
            failed: batchResponse.failed,
            successful: batchResponse.successful,
            confirmed: confirmedCount,
            total: totalRequests
        };
    });

    // File upload: Select and parse email file for reset
    ipcMain.handle('fileUpload:resetEmails', async (event, data) => {
        logDebug('[fileUpload:resetEmails] Selecting file for reset');
        const options = {
            properties: ['openFile'],
            filters: [{ name: 'All Files', extensions: ['*'] }],
            modal: true
        };
        const result = await dialog.showOpenDialog(mainWindow, options);
        if (result.canceled) return 'cancelled';

        const filePath = result.filePaths[0];
        const fileContents = await fs.promises.readFile(filePath, 'utf8');
        const ext = path.extname(filePath).toLowerCase();

        let normalized = fileContents;
        if (ext === '.csv') {
            try {
                normalized = parseEmailsFromCSV(fileContents);
            } catch (e) {
                throw new Error(`CSV parsing error: ${e.message}`);
            }
        } else if (ext === '.txt') {
            normalized = removeBlanks(fileContents.split(/\r?\n|\r|,/))
                .map(e => e.trim())
                .filter(e => e.length > 0);
        }

        return { fileContents: normalized, filePath, ext };
    });

    // File upload: Check emails from file
    ipcMain.handle('fileUpload:checkEmails', async (event, data) => {
        logDebug('[fileUpload:checkEmails] Checking emails from file');
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
            logDebug('[fileUpload:checkEmails] Error', { error: error.message });
            return {
                success: false,
                error: error.message || 'Failed to process file'
            };
        }
    });

    logDebug('[commChannelHandlers] 16 communication channel handlers registered');
}

/**
 * Cleanup function for renderer process cleanup
 * @param {number} rendererId - The renderer ID to clean up
 */
function cleanupCommChannelState(rendererId) {
    resetEmailsCancelFlags.delete(rendererId);
    resetPatternCancelFlags.delete(rendererId);
}

/**
 * Get suppressed emails list (for testing/debugging)
 * @returns {string[]} Array of suppressed email addresses
 */
function getSuppressedEmails() {
    return [...suppressedEmails];
}

/**
 * Clear suppressed emails list
 */
function clearSuppressedEmails() {
    suppressedEmails = [];
}

module.exports = {
    registerCommChannelHandlers,
    cleanupCommChannelState,
    getSuppressedEmails,
    clearSuppressedEmails
};
