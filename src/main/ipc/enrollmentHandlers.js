/**
 * Enrollment Handlers
 * Handle bulk enrollment operations via Canvas API
 */

const axios = require('axios');
const { ipcMain } = require('electron');

// Track cancellation state per renderer
const cancellationState = new Map();

function registerEnrollmentHandlers(ipcMain, logDebug, mainWindow, getBatchConfig) {
    logDebug('Registering enrollment handlers...');

    /**
     * Bulk Enroll Users
     * Processes multiple enrollment requests from parsed file data
     */
    ipcMain.handle('axios:bulkEnroll', async (event, params) => {
        const rendererId = event.sender.id;
        cancellationState.set(rendererId, false);

        logDebug('[axios:bulkEnroll] Starting bulk enrollment', {
            enrollmentCount: params.enrollments.length
        });

        const { domain, token, enrollments, enrollmentState } = params;
        const results = {
            successful: 0,
            failed: 0,
            errors: []
        };

        const batchConfig = getBatchConfig();
        let processed = 0;

        for (const enrollment of enrollments) {
            // Check for cancellation
            if (cancellationState.get(rendererId)) {
                logDebug('[axios:bulkEnroll] Enrollment cancelled by user');
                break;
            }

            try {
                // Send progress update
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('progress:enrollment', {
                        current: processed + 1,
                        total: enrollments.length,
                        detail: `Enrolling user ${enrollment.user_id}...`
                    });
                }

                // Determine if we use section or course endpoint
                const sectionId = enrollment.course_section_id;
                const targetCourseId = enrollment.course_id;

                if (!sectionId && !targetCourseId) {
                    results.failed++;
                    results.errors.push({
                        user_id: enrollment.user_id,
                        reason: 'No section ID or course ID provided in file'
                    });
                    processed++;
                    continue;
                }

                // Build enrollment payload
                const enrollmentPayload = {
                    enrollment: {
                        user_id: enrollment.user_id,
                        enrollment_state: enrollmentState
                    }
                };

                // Add type if available
                if (enrollment.type) {
                    enrollmentPayload.enrollment.type = enrollment.type;
                }

                // Prioritize role_id over role
                if (enrollment.role_id) {
                    enrollmentPayload.enrollment.role_id = enrollment.role_id;
                } else if (enrollment.role) {
                    enrollmentPayload.enrollment.role = enrollment.role;
                }

                // Add optional fields
                if (enrollment.start_at) {
                    enrollmentPayload.enrollment.start_at = enrollment.start_at;
                }
                if (enrollment.end_at) {
                    enrollmentPayload.enrollment.end_at = enrollment.end_at;
                }
                if (enrollment.limit_privileges_to_course_section !== undefined) {
                    enrollmentPayload.enrollment.limit_privileges_to_course_section =
                        enrollment.limit_privileges_to_course_section;
                }

                // Choose endpoint based on section ID availability
                const endpoint = sectionId
                    ? `https://${domain}/api/v1/sections/${sectionId}/enrollments`
                    : `https://${domain}/api/v1/courses/${targetCourseId}/enrollments`;

                logDebug('[axios:bulkEnroll] Enrolling user', {
                    user_id: enrollment.user_id,
                    endpoint,
                    payload: enrollmentPayload
                });

                // Make API call
                const response = await axios.post(endpoint, enrollmentPayload, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.status === 200 || response.status === 201) {
                    results.successful++;
                    logDebug('[axios:bulkEnroll] Enrollment successful', {
                        user_id: enrollment.user_id,
                        enrollment_id: response.data.id
                    });
                } else {
                    results.failed++;
                    results.errors.push({
                        user_id: enrollment.user_id,
                        reason: `Unexpected status code: ${response.status}`
                    });
                }

            } catch (error) {
                results.failed++;
                const errorMessage = error.response?.data?.errors?.[0]?.message ||
                    error.response?.data?.message ||
                    error.message;

                results.errors.push({
                    user_id: enrollment.user_id,
                    reason: errorMessage,
                    status: error.response?.status
                });

                logDebug('[axios:bulkEnroll] Enrollment failed', {
                    user_id: enrollment.user_id,
                    error: errorMessage,
                    status: error.response?.status
                });
            }

            processed++;

            // Rate limiting delay between requests
            if (processed < enrollments.length) {
                await new Promise(resolve => setTimeout(resolve, batchConfig.timeDelay / 10));
            }
        }

        cancellationState.delete(rendererId);

        logDebug('[axios:bulkEnroll] Bulk enrollment complete', {
            successful: results.successful,
            failed: results.failed
        });

        return results;
    });

    /**
     * Cancel bulk enrollment operation
     */
    ipcMain.handle('axios:cancelBulkEnroll', async (event) => {
        const rendererId = event.sender.id;
        logDebug('[axios:cancelBulkEnroll] Cancelling bulk enrollment', { rendererId });
        cancellationState.set(rendererId, true);
        return { cancelled: true };
    });

    logDebug('Enrollment handlers registered successfully');
}

/**
 * Cleanup function for renderer destruction
 */
function cleanupEnrollmentState(rendererId) {
    cancellationState.delete(rendererId);
}

module.exports = {
    registerEnrollmentHandlers,
    cleanupEnrollmentState
};
