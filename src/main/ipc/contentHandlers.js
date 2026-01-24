/**
 * Content Management IPC Handlers
 * Handles discussions, announcements, pages, sections, folders, files, grading standards, etc.
 */

// Import required Canvas API modules
const discussions = require('../../shared/canvas-api/discussions');
const pages = require('../../shared/canvas-api/pages');
const sections = require('../../shared/canvas-api/sections');
const imports = require('../../shared/canvas-api/imports');
const files = require('../../shared/canvas-api/files');
const folders = require('../../shared/canvas-api/folders');
const groupCategories = require('../../shared/canvas-api/group_categories');
const grading_standards = require('../../shared/canvas-api/grading_standards');
const { getPageViews, updateNotifications } = require('../../shared/canvas-api/users');

// State management for cancellation tracking
const { operationCancelFlags } = require('./operationCancelStore');
const deleteCancelFlags = new Map();

/**
 * Register all content-related IPC handlers
 * @param {Electron.IpcMain} ipcMain - The IPC main object
 * @param {Function} logDebug - Debug logging function
 * @param {Electron.BrowserWindow} mainWindow - Main window reference
 * @param {Function} getBatchConfig - Function to get batch handler configuration
 */
function registerContentHandlers(ipcMain, logDebug, mainWindow, getBatchConfig) {
    const { batchHandler } = require('../../shared/batchHandler');

    // ==================== DISCUSSIONS & ANNOUNCEMENTS ====================

    /**
     * Create discussions in batch
     */
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
                        title: it.title, message: it.message, published: !!it.published,
                        threaded: it.threaded, delayed_post_at: it.delayed_post_at
                    };
                    const resp = await discussions.createDiscussion(payload);
                    return resp;
                } finally { update(); }
            }
        }));
        const res = await batchHandler(requests, getBatchConfig());
        return res;
    });

    /**
     * Create announcements in batch
     */
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
            // Use provided titles array if available, otherwise append number to title
            const announcementTitle = data.titles && Array.isArray(data.titles) && data.titles[i - 1]
                ? data.titles[i - 1]
                : `${data.title} ${i}`;

            const requestData = {
                domain: data.domain,
                token: data.token,
                course_id: data.course_id,
                title: announcementTitle,
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

    /**
     * Delete discussions by IDs
     */
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

    /**
     * Get announcements from a course using GraphQL with pagination
     */
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

    /**
     * Delete discussion topics using GraphQL
     */
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

    // ==================== PAGES ====================

    /**
     * Create pages in batch
     */
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

    /**
     * Get pages (GraphQL)
     */
    ipcMain.handle('axios:getPagesGraphQL', async (_event, data) => {
        console.log('inside axios:getPagesGraphQL');
        try {
            const result = await pages.getPagesGraphQL(data);
            return result;
        } catch (error) {
            console.error('Error in axios:getPagesGraphQL:', error);
            throw error;
        }
    });

    /**
     * Delete pages in batch
     */
    ipcMain.handle('axios:deletePages', async (_event, data) => {
        console.log('inside axios:deletePages');
        const items = Array.isArray(data.requests) ? data.requests : [];
        let completed = 0;
        const total = items.length || 1;

        const update = () => {
            completed++;
            mainWindow?.webContents.send('update-progress', {
                mode: 'determinate',
                label: 'Deleting pages',
                processed: completed,
                total,
                value: completed / total
            });
        };

        const requests = items.map((it, idx) => ({
            id: idx + 1,
            request: async () => {
                try {
                    // Use URL or ID, prefer URL if available as per endpoint docs but typically ID works too or URL slug
                    // The graphQL query returns _id (canvas id) and url (usually title-slug)
                    // The REST endpoint takes url_or_id
                    const pageIdentifier = it.page_url || it.page_id;
                    const resp = await pages.deletePage({
                        domain: it.domain,
                        token: it.token,
                        course_id: it.course_id,
                        page_url: pageIdentifier
                    });
                    return resp;
                } finally { update(); }
            }
        }));

        const res = await batchHandler(requests, getBatchConfig());
        return res;
    });

    // ==================== SECTIONS ====================

    /**
     * Create sections in batch
     */
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

    // ==================== IMPORTS ====================

    /**
     * Get imported assets (unified)
     */
    ipcMain.handle('axios:getImportedAssets', async (event, data) => {
        console.log('main.js > axios:getImportedAssets');
        try {
            return await imports.getImportedAssets(data);
        } catch (error) {
            throw error.message;
        }
    });

    /**
     * List content migrations
     */
    ipcMain.handle('axios:listContentMigrations', async (event, data) => {
        console.log('main.js > axios:listContentMigrations');
        try {
            return await imports.listContentMigrations(data);
        } catch (error) {
            throw error.message;
        }
    });

    // ==================== FILES & ATTACHMENTS ====================

    /**
     * Delete attachments (files) in batch
     */
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

    // ==================== FOLDERS ====================

    /**
     * Delete folders in batch (with root folder protection)
     */
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

    /**
     * Get folder metadata and tag root folders
     */
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

    // ==================== GROUP CATEGORIES ====================

    /**
     * Delete group categories in batch
     */
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

    // ==================== GRADING STANDARDS ====================

    /**
     * Delete grading standards with cancellation support
     */
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

    // ==================== USER OPERATIONS ====================

    /**
     * Get page views for users
     */
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
                const { dialog } = require('electron');
                const fs = require('fs');
                const csvExporter = require('../shared/csvExporter');

                const userId = data.user || data.userIds[0];
                const filename = `${userId}_page_views.csv`;

                // Get file save location
                const result = await dialog.showSaveDialog({
                    defaultPath: filename,
                    filters: [{ name: 'CSV', extensions: ['csv'] }]
                });

                if (!result.canceled && result.filePath) {
                    await csvExporter.exportToCSV(response, result.filePath);
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
                const { dialog } = require('electron');
                const csvExporter = require('../shared/csvExporter');

                const filename = `user_${response.userId}_page_views.csv`;

                const result = await dialog.showSaveDialog({
                    defaultPath: filename,
                    filters: [{ name: 'CSV', extensions: ['csv'] }]
                });

                if (!result.canceled && result.filePath) {
                    await csvExporter.exportToCSV(response.data, result.filePath);
                    return { success: true, isZipped: false };
                } else {
                    return 'cancelled';
                }
            }

            // Multiple users or other enhanced response
            return response;
        }

        return { success: false };
    });

    /**
     * Update user notification preferences
     */
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

    // ==================== OPERATION CANCELLATION ====================

    /**
     * Cancel an operation by operationId
     */
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
}

/**
 * Cleanup function for content handler state
 * @param {number} [senderId] - Optional sender ID to cleanup specific state
 */
function cleanupContentState(senderId) {
    if (senderId !== undefined) {
        operationCancelFlags.delete(senderId);
        deleteCancelFlags.delete(senderId);
    } else {
        operationCancelFlags.clear();
        deleteCancelFlags.clear();
    }
}

module.exports = {
    registerContentHandlers,
    cleanupContentState
};
