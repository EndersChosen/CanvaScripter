/**
 * Assignment & Assignment Group IPC Handlers
 * Handles all assignment and assignment group operations including:
 * - Creation, deletion, and moving of assignments
 * - Assignment group management
 * - Assignment filtering and querying
 * - Bulk operations with progress tracking
 */

const assignmentGroups = require('../../shared/canvas-api/assignment_groups');
const assignments = require('../../shared/canvas-api/assignments');
const { batchHandler } = require('../../shared/batchHandler');

// ==================== State Management ====================

// Operation-level cancellation (shared across handlers)
const { operationCancelFlags } = require('./operationCancelStore');

// Sender-level cancellation for specific operations
const deleteCancelFlags = new Map();
const deleteEmptyAssignmentGroupsCancelFlags = new Map();
const createAssignmentGroupsCancelFlags = new Map();
const combinedFetchControllers = new Map(); // AbortController instances

/**
 * Register all assignment-related IPC handlers
 * @param {Electron.IpcMain} ipcMain - Electron IPC main process
 * @param {Function} logDebug - Debug logging function
 * @param {Electron.BrowserWindow} mainWindow - Main window for progress updates
 * @param {Function} getBatchConfig - Get batch configuration
 */
function registerAssignmentHandlers(ipcMain, logDebug, mainWindow, getBatchConfig) {
    logDebug('Registering assignment IPC handlers...');

    // ==================== Assignment CRUD Operations ====================

    /**
     * Create multiple assignments with progress tracking
     * Supports cancellation via operationId
     */
    ipcMain.handle('axios:createAssignments', async (event, data) => {
        console.log('assignmentHandlers.js > createAssignments');
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
        };

        const request = async (requestData) => {
            try {
                const response = await assignments.createAssignments(requestData);
                return response;
            } catch (error) {
                throw error;
            } finally {
                updateProgress();
            }
        };

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
                assignment_group_id: data.assignment_group_id || data.assignmentGroupId,
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

    /**
     * Delete multiple assignments with progress tracking
     * Supports cancellation via operationId
     */
    ipcMain.handle('axios:deleteAssignments', async (event, data) => {
        console.log('assignmentHandlers.js > deleteAssignments');
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
        };

        const request = async (requestData) => {
            try {
                const response = await assignments.deleteAssignments(requestData);
                return response;
            } catch (error) {
                throw error;
            } finally {
                updateProgress();
            }
        };

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

    /**
     * Cancel delete operations for the current sender
     */
    ipcMain.handle('axios:cancelDeleteOperations', async (event) => {
        const senderId = event.sender.id;
        deleteCancelFlags.set(senderId, true);
        console.log(`Delete operations cancelled for sender ${senderId}`);
        return { cancelled: true };
    });

    // ==================== Assignment Group Operations ====================

    /**
     * Get all empty assignment groups for a course
     */
    ipcMain.handle('axios:getEmptyAssignmentGroups', async (event, data) => {
        console.log('assignmentHandlers.js > getEmptyAssignmentGroups');

        try {
            const aGroups = await assignmentGroups.getEmptyAssignmentGroups(data);
            return aGroups;
        } catch (error) {
            throw error.message;
        }
    });

    /**
     * Delete empty assignment groups
     * Supports both single group deletion and batch deletion
     */
    ipcMain.handle('axios:deleteEmptyAssignmentGroups', async (event, data) => {
        console.log('assignmentHandlers.js > deleteEmptyAssignmentGroups');

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
                };

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
                };

                let requests = [];
                let requestCounter = 1;
                data.content.forEach((group) => {
                    const requestData = {
                        domain: data.url,
                        token: data.token,
                        groupID: group._id,
                        id: requestCounter
                    };
                    requests.push(() => request(requestData));
                    requestCounter++;
                });

                // Execute batch requests sequentially
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
            console.error('Error in deleteEmptyAssignmentGroups handler:', error?.message || String(error));
            throw error;
        } finally {
            // Clean up the cancellation flag if it was set for batch deletion
            if (data.content && Array.isArray(data.content)) {
                deleteEmptyAssignmentGroupsCancelFlags.delete(senderId);
            }
        }
    });

    /**
     * Create multiple assignment groups with progress tracking
     */
    ipcMain.handle('axios:createAssignmentGroups', async (event, data) => {
        console.log('assignmentHandlers.js > createAssignmentGroups');

        const senderId = event.sender.id;
        createAssignmentGroupsCancelFlags.set(senderId, false);

        let completedRequests = 0;
        let totalRequests = data.number;

        const updateProgress = () => {
            completedRequests++;
            mainWindow.webContents.send('update-progress', (completedRequests / totalRequests) * 100);
        };

        const request = async (requestData, index) => {
            // Check if cancellation was requested
            if (createAssignmentGroupsCancelFlags.get(senderId)) {
                throw new Error('Request cancelled');
            }

            try {
                const response = await assignmentGroups.createAssignmentGroups(requestData);
                return response;
            } catch (error) {
                throw error;
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

    /**
     * Cancel assignment group creation
     */
    ipcMain.handle('axios:cancelCreateAssignmentGroups', async (event) => {
        const senderId = event.sender.id;
        console.log(`Cancelling assignment group creation for sender ${senderId}`);
        createAssignmentGroupsCancelFlags.set(senderId, true);
        return { cancelled: true };
    });

    /**
     * Cancel delete empty assignment groups
     */
    ipcMain.handle('axios:cancelDeleteEmptyAssignmentGroups', async (event) => {
        const senderId = event.sender.id;
        console.log(`Cancelling delete empty assignment groups for sender ${senderId}`);
        deleteEmptyAssignmentGroupsCancelFlags.set(senderId, true);
        return { cancelled: true };
    });

    /**
     * Get all assignment groups for a course
     */
    ipcMain.handle('axios:getAssignmentGroups', async (event, data) => {
        console.log('assignmentHandlers.js > getAssignmentGroups');

        try {
            const groups = await assignmentGroups.getAssignmentGroups(data.domain, data.course_id, data.token);
            return { groups };
        } catch (error) {
            throw error.message;
        }
    });

    /**
     * Get assignment group by ID
     */
    ipcMain.handle('axios:getAssignmentGroupById', async (event, data) => {
        console.log('assignmentHandlers.js > getAssignmentGroupById');

        try {
            const result = await assignmentGroups.getAssignmentGroupById(data);
            return result;
        } catch (error) {
            throw error.message;
        }
    });

    /**
     * Delete assignment group and all its assignments
     */
    ipcMain.handle('axios:deleteAssignmentGroupAssignments', async (event, data) => {
        console.log('assignmentHandlers.js > deleteAssignmentGroupAssignments');

        try {
            const response = await assignments.deleteAssignmentGroupWithAssignments(data);
            return response.data;
        } catch (error) {
            console.error('deleteAssignmentGroupAssignments failed:', error?.message || String(error));
            throw error.message;
        }
    });

    // ==================== Assignment Query Operations ====================

    /**
     * Get assignments without submission types
     */
    ipcMain.handle('axios:getNoSubmissionAssignments', async (event, data) => {
        console.log('assignmentHandlers.js > getNoSubmissionAssignments');

        try {
            const result = await assignments.getNoSubmissionAssignments(
                data.domain,
                data.course_id,
                data.token,
                data.graded
            );
            return result;
        } catch (error) {
            console.error('getNoSubmissionAssignments failed:', error?.message || String(error));
            throw error.message;
        }
    });

    /**
     * Get unpublished assignments
     */
    ipcMain.handle('axios:getUnpublishedAssignments', async (event, data) => {
        console.log('assignmentHandlers.js > getUnpublishedAssignments');

        try {
            const results = await assignments.getUnpublishedAssignments(
                data.domain,
                data.course,
                data.token
            );
            return results;
        } catch (error) {
            throw error.message;
        }
    });

    /**
     * Get assignments not in any module
     */
    ipcMain.handle('axios:getNonModuleAssignments', async (event, data) => {
        console.log('assignmentHandlers.js > getNonModuleAssignments');

        try {
            const results = await assignments.getNonModuleAssignments(
                data.domain,
                data.course,
                data.token
            );
            return results;
        } catch (error) {
            throw error.message;
        }
    });

    /**
     * Get old assignments using GraphQL
     */
    ipcMain.handle('axios:getOldAssignments', async (event, data) => {
        console.log('assignmentHandlers.js > getOldAssignments');

        try {
            const response = await assignments.getOldAssignmentsGraphQL(data);
            return response;
        } catch (error) {
            throw error.message;
        }
    });

    /**
     * Get assignments without due dates
     */
    ipcMain.handle('axios:getNoDueDateAssignments', async (event, data) => {
        console.log('assignmentHandlers.js > getNoDueDateAssignments');

        try {
            const results = await assignments.getNoDueDateAssignments(
                data.domain,
                data.course_id,
                data.token
            );
            return results;
        } catch (error) {
            throw error.message;
        }
    });

    /**
     * Get all assignments for combined delete flow
     * Supports cancellation via AbortController
     */
    ipcMain.handle('axios:getAllAssignmentsForCombined', async (event, data) => {
        console.log('assignmentHandlers.js > getAllAssignmentsForCombined');

        try {
            // Abort any previous fetch for this sender
            const senderId = event.sender.id;
            if (combinedFetchControllers.has(senderId)) {
                try {
                    combinedFetchControllers.get(senderId).abort('superseded');
                } catch { /* ignore */ }
            }

            const controller = new AbortController();
            combinedFetchControllers.set(senderId, controller);

            const results = await assignments.getAllAssignmentsForCombined({
                ...data,
                signal: controller.signal
            });

            // Clear on success
            if (combinedFetchControllers.get(senderId) === controller) {
                combinedFetchControllers.delete(senderId);
            }

            return results;
        } catch (error) {
            // Clear controller if it belongs to this request
            try {
                const senderId = event.sender.id;
                if (combinedFetchControllers.get(senderId)?.signal?.aborted) {
                    combinedFetchControllers.delete(senderId);
                }
            } catch { /* ignore */ }
            throw error.message || error;
        }
    });

    /**
     * Cancel getAllAssignmentsForCombined fetch
     */
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

    /**
     * Delete old assignments (placeholder)
     */
    ipcMain.handle('axios:deleteOldAssignments', async (event, data) => {
        console.log('assignmentHandlers.js > deleteOldAssignments');
        console.log('deleteOldAssignments request received', {
            hasDomain: !!data?.domain,
            hasCourseId: !!(data?.course_id || data?.courseId),
            hasToken: !!data?.token
        });
        // Placeholder - implementation needed
        return;
    });

    /**
     * Get imported assignments
     */
    ipcMain.handle('axios:getImportedAssignments', async (event, data) => {
        console.log('assignmentHandlers.js > getImportedAssignments');

        try {
            const importedAssignments = await assignments.getImportedAssignments(data);
            return importedAssignments;
        } catch (error) {
            throw error.message;
        }
    });

    /**
     * Get assignments in specific modules
     */
    ipcMain.handle('axios:getAssignmentsInModules', async (event, data) => {
        console.log('assignmentHandlers.js > getAssignmentsInModules');

        try {
            const result = await assignments.getAssignmentsInModules(data);
            return result;
        } catch (error) {
            throw error.message;
        }
    });

    // ==================== Assignment Movement Operations ====================

    /**
     * Get assignments in other groups (for keeping assignments in a group)
     */
    ipcMain.handle('axios:keepAssignmentsInGroup', async (event, data) => {
        console.log('assignmentHandlers.js > keepAssignmentsInGroup');

        try {
            const response = await assignments.getAssignmentsInOtherGroups(data);
            return response;
        } catch (error) {
            throw error.message;
        }
    });

    /**
     * Get assignments to move to a single group
     */
    ipcMain.handle('axios:getAssignmentsToMove', async (event, data) => {
        console.log('assignmentHandlers.js > getAssignmentsToMove');

        try {
            const results = await assignments.getAssignmentsToMove(
                data.domain,
                data.course,
                data.token
            );
            return results;
        } catch (error) {
            throw error.message;
        }
    });

    /**
     * Move multiple assignments to a single group with progress tracking
     */
    ipcMain.handle('axios:moveAssignmentsToSingleGroup', async (event, data) => {
        console.log('assignmentHandlers.js > moveAssignmentsToSingleGroup');

        const operationId = data.operationId || null;
        if (operationId) {
            operationCancelFlags.set(operationId, false);
        }

        let completedRequests = 0;
        let totalRequests = Number(data.number) || 0;

        if (totalRequests <= 0 || !Array.isArray(data.assignments) || data.assignments.length === 0) {
            if (operationId) {
                operationCancelFlags.delete(operationId);
            }
            return { successful: [], failed: [] };
        }

        const updateProgress = () => {
            completedRequests++;
            mainWindow.webContents.send('update-progress', (completedRequests / totalRequests) * 100);
        };

        const request = async (requestData) => {
            try {
                const response = await assignments.moveAssignmentToGroup(requestData);
                return response;
            } catch (error) {
                const status = error?.status || error?.response?.status || null;
                const message = error?.message || 'Unknown error';
                const wrappedError = new Error(`status code ${status || 'unknown'} - ${message}`);
                if (status) wrappedError.status = status;
                if (error?.code) wrappedError.code = error.code;
                throw wrappedError;
            } finally {
                updateProgress();
            }
        };

        const requests = [];
        let requestCounter = 1;
        for (let assignment of data.assignments) {
            const requestData = {
                url: data.url,
                token: data.token,
                id: assignment._id,
                groupID: data.groupID
            };
            requests.push({ id: requestCounter, request: () => request(requestData) });
            requestCounter++;
        }

        const isCancelled = operationId ? () => operationCancelFlags.get(operationId) === true : null;

        try {
            const batchResponse = await batchHandler(requests, {
                ...getBatchConfig(),
                isCancelled,
                operationId
            });

            const wasCancelled = operationId && operationCancelFlags.get(operationId) === true;
            return {
                ...batchResponse,
                cancelled: !!wasCancelled,
                operationId
            };
        } finally {
            if (operationId) {
                operationCancelFlags.delete(operationId);
            }
        }
    });

    /**
     * Get assignments in a specific group
     */
    ipcMain.handle('axios:getAssignmentsInGroup', async (event, data) => {
        console.log('assignmentHandlers.js > getAssignmentsInGroup');

        try {
            const assignmentsInGroup = await assignments.getAssignmentsInGroup(
                data.domain,
                data.token,
                data.group_id
            );
            return assignmentsInGroup;
        } catch (error) {
            throw error.message;
        }
    });

    logDebug('Assignment IPC handlers registered successfully');
}

/**
 * Cleanup state for a specific renderer (called on window close)
 * @param {number} rendererId - Renderer process ID
 */
function cleanupAssignmentState(rendererId) {
    deleteCancelFlags.delete(rendererId);
    deleteEmptyAssignmentGroupsCancelFlags.delete(rendererId);
    createAssignmentGroupsCancelFlags.delete(rendererId);
    combinedFetchControllers.delete(rendererId);
    console.log(`Assignment state cleaned up for renderer ${rendererId}`);
}

module.exports = {
    registerAssignmentHandlers,
    cleanupAssignmentState
};
