/**
 * Enrollment Handlers
 * Handle bulk enrollment operations via Canvas API
 */

const axios = require('axios');
const { ipcMain } = require('electron');
const { addUsers, enrollUser, createUsers } = require('../../shared/canvas-api/users');
const { batchHandler } = require('../../shared/batchHandler');
const { serializeErrorForIPC } = require('../../shared/errorUtils');

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

    /**
     * Get course sections
     * Fetches all sections for a given course ID
     */
    ipcMain.handle('enrollment:getCourseSections', async (event, params) => {
        logDebug('[enrollment:getCourseSections] Fetching sections', { courseId: params.courseId });

        const { domain, token, courseId } = params;
        const url = `https://${domain}/api/v1/courses/${courseId}/sections?per_page=100`;

        try {
            let allSections = [];
            let nextUrl = url;

            while (nextUrl) {
                const response = await axios.get(nextUrl, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                allSections = allSections.concat(response.data);

                // Check for pagination
                const linkHeader = response.headers?.link || '';
                const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
                nextUrl = nextMatch ? nextMatch[1] : null;
            }

            logDebug('[enrollment:getCourseSections] Found sections', { count: allSections.length });
            return allSections.map(s => ({ id: s.id, name: s.name }));
        } catch (error) {
            logDebug('[enrollment:getCourseSections] Error', { error: error.message });
            throw serializeErrorForIPC(error);
        }
    });

    /**
     * Get course roles
     * Fetches all course-level roles available for the account that owns the course
     */
    ipcMain.handle('enrollment:getCourseRoles', async (event, params) => {
        logDebug('[enrollment:getCourseRoles] Fetching roles', { courseId: params.courseId });

        const { domain, token, courseId } = params;

        try {
            // Step 1: Get the course to find its account_id
            const courseResp = await axios.get(
                `https://${domain}/api/v1/courses/${courseId}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            const accountId = courseResp.data.account_id;

            // Step 2: Fetch all roles for that account (including inherited)
            let allRoles = [];
            let nextUrl = `https://${domain}/api/v1/accounts/${accountId}/roles?show_inherited=true&per_page=100`;

            while (nextUrl) {
                const response = await axios.get(nextUrl, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                allRoles = allRoles.concat(response.data);

                const linkHeader = response.headers?.link || '';
                const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
                nextUrl = nextMatch ? nextMatch[1] : null;
            }

            // Filter to only course-level roles (not account roles)
            const courseRoles = allRoles
                .filter(role => !role.is_account_role)
                .map(role => ({ id: role.id, name: role.label, base_role_type: role.base_role_type }));

            logDebug('[enrollment:getCourseRoles] Found roles', { count: courseRoles.length });
            return courseRoles;
        } catch (error) {
            logDebug('[enrollment:getCourseRoles] Error', { error: error.message });
            throw serializeErrorForIPC(error);
        }
    });

    /**
     * Manual Enroll Users
     * Creates random user accounts and enrolls them into a course.
     * Supports optional section targeting and custom role selection.
     * Also supports enrolling existing users by ID.
     */
    ipcMain.handle('axios:manualEnroll', async (event, params) => {
        logDebug('[axios:manualEnroll] Starting manual enrollment', {
            courseId: params.courseId,
            numStudents: params.numStudents,
            numTeachers: params.numTeachers,
            sectionId: params.sectionId,
            roleId: params.roleId,
            roleType: params.roleType,
            isNewUsers: params.isNewUsers,
            existingUserIds: params.existingUserIds
        });

        const {
            domain, token, courseId, emailPrefix,
            numStudents, numTeachers,
            sectionId, roleId, roleType,
            isNewUsers, existingUserIds, userCount
        } = params;

        const results = {
            usersCreated: 0,
            usersEnrolled: 0,
            usersFailed: 0,
            enrollFailed: 0,
            errors: []
        };

        const sendProgress = (label, detail, percent) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('progress:manualEnrollment', { label, detail, percent });
            }
        };

        try {
            const batchConfig = getBatchConfig();

            if (isNewUsers === false && existingUserIds && existingUserIds.length > 0) {
                // ---- Mode: Enroll existing users by ID ----
                const totalUsers = existingUserIds.length;
                const enrollType = roleType || 'StudentEnrollment';

                sendProgress(`Enrolling ${totalUsers} existing user(s)...`, '', 10);

                const enrollRequests = existingUserIds.map((uid, i) => ({
                    id: i + 1,
                    request: async () => {
                        return await enrollUser({
                            domain,
                            token,
                            course_id: courseId,
                            section_id: sectionId || null,
                            user_id: uid,
                            type: enrollType,
                            role_id: roleId || null
                        });
                    }
                }));

                const enrollResults = await batchHandler(enrollRequests, batchConfig);

                results.usersEnrolled = enrollResults.successful.length;
                for (const f of enrollResults.failed) {
                    results.enrollFailed++;
                    results.errors.push(`Enrollment failed for user: ${f.reason || 'Unknown error'}`);
                }

                sendProgress('Done!', '', 100);
            } else if (roleType) {
                // ---- Mode: Create new users with a specified role ----
                const count = userCount || 0;
                if (count < 1) throw 'Number of users must be at least 1';

                sendProgress(`Generating ${count} user(s)...`, '', 5);
                const users = createUsers(count, emailPrefix);
                const allUsers = users.map(u => ({ userData: u, role: roleType }));

                sendProgress(`Creating ${count} user(s) on Canvas...`, '', 10);
                const createdUsers = [];

                const createRequests = allUsers.map((u, i) => ({
                    id: i + 1,
                    request: async () => {
                        const userId = await addUsers({ domain, token, user: u.userData });
                        return { userId, role: u.role };
                    }
                }));

                const createResults = await batchHandler(createRequests, batchConfig);

                for (const s of createResults.successful) {
                    createdUsers.push(s.value);
                    results.usersCreated++;
                }
                for (const f of createResults.failed) {
                    results.usersFailed++;
                    results.errors.push(`User creation failed: ${f.reason || 'Unknown error'}`);
                }

                sendProgress(`Created ${results.usersCreated}/${count} user(s). Enrolling...`, '', 50);

                if (createdUsers.length > 0) {
                    const enrollRequests = createdUsers.map((u, i) => ({
                        id: i + 1,
                        request: async () => {
                            return await enrollUser({
                                domain,
                                token,
                                course_id: courseId,
                                section_id: sectionId || null,
                                user_id: u.userId,
                                type: u.role,
                                role_id: roleId || null
                            });
                        }
                    }));

                    const enrollResults = await batchHandler(enrollRequests, batchConfig);
                    results.usersEnrolled = enrollResults.successful.length;
                    for (const f of enrollResults.failed) {
                        results.enrollFailed++;
                        results.errors.push(`Enrollment failed: ${f.reason || 'Unknown error'}`);
                    }
                }

                sendProgress('Done!', '', 100);
            } else {
                // ---- Mode: Original Students + Teachers flow ----
                const totalUsers = (numStudents || 0) + (numTeachers || 0);
                if (totalUsers < 1) throw 'Total number of users must be at least 1';

                sendProgress(`Generating ${totalUsers} user(s)...`, '', 5);
                const students = createUsers(numStudents || 0, emailPrefix);
                const teachers = createUsers(numTeachers || 0, emailPrefix);
                const allUsers = [
                    ...students.map(u => ({ userData: u, role: 'StudentEnrollment' })),
                    ...teachers.map(u => ({ userData: u, role: 'TeacherEnrollment' }))
                ];

                sendProgress(`Creating ${totalUsers} user(s) on Canvas...`, '', 10);
                const createdUsers = [];

                const createRequests = allUsers.map((u, i) => ({
                    id: i + 1,
                    request: async () => {
                        const userId = await addUsers({ domain, token, user: u.userData });
                        return { userId, role: u.role };
                    }
                }));

                const createResults = await batchHandler(createRequests, batchConfig);

                for (const s of createResults.successful) {
                    createdUsers.push(s.value);
                    results.usersCreated++;
                }
                for (const f of createResults.failed) {
                    results.usersFailed++;
                    results.errors.push(`User creation failed: ${f.reason || 'Unknown error'}`);
                }

                sendProgress(
                    `Created ${results.usersCreated}/${totalUsers} user(s). Enrolling...`,
                    '',
                    50
                );

                if (createdUsers.length > 0) {
                    const enrollRequests = createdUsers.map((u, i) => ({
                        id: i + 1,
                        request: async () => {
                            return await enrollUser({
                                domain,
                                token,
                                course_id: courseId,
                                section_id: sectionId || null,
                                user_id: u.userId,
                                type: u.role,
                                role_id: roleId || null
                            });
                        }
                    }));

                    const enrollResults = await batchHandler(enrollRequests, batchConfig);
                    results.usersEnrolled = enrollResults.successful.length;
                    for (const f of enrollResults.failed) {
                        results.enrollFailed++;
                        results.errors.push(`Enrollment failed: ${f.reason || 'Unknown error'}`);
                    }
                }

                sendProgress('Done!', '', 100);
            }

            logDebug('[axios:manualEnroll] Manual enrollment complete', {
                usersCreated: results.usersCreated,
                usersEnrolled: results.usersEnrolled,
                usersFailed: results.usersFailed,
                enrollFailed: results.enrollFailed
            });

            return results;

        } catch (error) {
            logDebug('[axios:manualEnroll] Manual enrollment error', {
                error: error.message || String(error)
            });
            throw serializeErrorForIPC(error);
        }
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
