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

        const { domain, token, enrollments, enrollmentState, enrollmentTask } = params;
        const task = ['delete', 'conclude', 'deactivate'].includes(enrollmentTask) ? enrollmentTask : 'enroll';
        const results = {
            successful: 0,
            failed: 0,
            errors: []
        };

        const batchConfig = getBatchConfig();
        const concurrency = Math.max(1, Number(batchConfig.batchSize) || 1);
        const delayMs = Math.max(0, Math.floor((Number(batchConfig.timeDelay) || 0) / 10));
        let processed = 0;

        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        const sendProgress = (detail) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('progress:enrollment', {
                    current: processed,
                    total: enrollments.length,
                    detail
                });
            }
        };

        const processEnrollment = async (enrollment) => {
            if (cancellationState.get(rendererId)) {
                return;
            }

            try {
                const sectionId = enrollment.course_section_id;
                const targetCourseId = enrollment.course_id;
                const enrollmentId = enrollment.enrollment_id;

                if (task !== 'enroll') {
                    if (!targetCourseId) {
                        results.failed++;
                        results.errors.push({
                            user_id: enrollment.user_id || 'Unknown',
                            reason: `${task} requires course_id and cannot use section_id`
                        });
                    } else if (!enrollmentId) {
                        results.failed++;
                        results.errors.push({
                            user_id: enrollment.user_id || 'Unknown',
                            reason: `${task} requires enrollment_id`
                        });
                    } else {
                        const endpoint = `https://${domain}/api/v1/courses/${targetCourseId}/enrollments/${enrollmentId}`;

                        logDebug('[axios:bulkEnroll] Processing enrollment task', {
                            task,
                            enrollment_id: enrollmentId,
                            course_id: targetCourseId,
                            endpoint
                        });

                        const response = await axios.delete(endpoint, {
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            params: {
                                task
                            }
                        });

                        if (response.status === 200 || response.status === 204) {
                            results.successful++;
                            logDebug('[axios:bulkEnroll] Enrollment task successful', {
                                task,
                                enrollment_id: enrollmentId
                            });
                        } else {
                            results.failed++;
                            results.errors.push({
                                user_id: enrollment.user_id || 'Unknown',
                                reason: `Unexpected status code: ${response.status}`
                            });
                        }
                    }
                } else {
                    if (!sectionId && !targetCourseId) {
                        results.failed++;
                        results.errors.push({
                            user_id: enrollment.user_id,
                            reason: 'No section ID or course ID provided in file'
                        });
                    } else {
                        const enrollmentPayload = {
                            enrollment: {
                                user_id: enrollment.user_id,
                                enrollment_state: enrollmentState
                            }
                        };

                        if (enrollment.type) {
                            enrollmentPayload.enrollment.type = enrollment.type;
                        }

                        if (enrollment.role_id) {
                            enrollmentPayload.enrollment.role_id = enrollment.role_id;
                        } else if (enrollment.role) {
                            enrollmentPayload.enrollment.role = enrollment.role;
                        }

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

                        const endpoint = sectionId
                            ? `https://${domain}/api/v1/sections/${sectionId}/enrollments`
                            : `https://${domain}/api/v1/courses/${targetCourseId}/enrollments`;

                        logDebug('[axios:bulkEnroll] Enrolling user', {
                            user_id: enrollment.user_id,
                            endpoint,
                            payload: enrollmentPayload
                        });

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
                    }
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
            } finally {
                processed++;
                const detailText = task === 'enroll'
                    ? `Processed user ${enrollment.user_id || 'Unknown'}`
                    : `Processed enrollment ${enrollment.enrollment_id || 'Unknown'}`;
                sendProgress(detailText);
            }

            if (!cancellationState.get(rendererId) && delayMs > 0 && processed < enrollments.length) {
                await sleep(delayMs);
            }
        };

        for (let index = 0; index < enrollments.length; index += concurrency) {
            if (cancellationState.get(rendererId)) {
                logDebug('[axios:bulkEnroll] Enrollment cancelled by user');
                break;
            }

            const batch = enrollments.slice(index, index + concurrency);
            await Promise.allSettled(batch.map(enrollment => processEnrollment(enrollment)));
        }

        cancellationState.delete(rendererId);

        logDebug('[axios:bulkEnroll] Bulk enrollment complete', {
            successful: results.successful,
            failed: results.failed,
            processed,
            concurrency
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
