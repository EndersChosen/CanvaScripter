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
        const isFromFile = enrollmentState === 'from_file';
        const globalTask = ['delete', 'conclude', 'deactivate'].includes(enrollmentTask) ? enrollmentTask : 'enroll';
        const results = {
            successful: 0,
            failed: 0,
            skipped: 0,
            errors: [],
            skippedRows: []
        };

        const batchConfig = getBatchConfig();
        const concurrency = Math.max(1, Number(batchConfig.batchSize) || 1);
        const delayMs = Math.max(0, Math.floor((Number(batchConfig.timeDelay) || 0) / 10));
        let processed = 0;

        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        // When processing from_file, sort enrollments by status group so that
        // all enrollments of the same effective task are processed together.
        // This prevents race conditions where concurrent requests for different
        // status types on the same course/section interfere with each other
        // (e.g. an 'enroll' hitting a section while a 'conclude' is mid-flight).
        let enrollmentsToProcess = enrollments;
        if (isFromFile) {
            const statusPriority = (enrollment) => {
                const state = (enrollment.enrollment_state || '').toLowerCase();
                if (state === 'active') return 0;
                if (state === 'inactive') return 1;
                if (state === 'invited') return 2;
                if (state === 'creation_pending') return 3;
                if (['conclude', 'concluded'].includes(state)) return 4;
                if (['delete', 'deleted'].includes(state)) return 5;
                if (state === 'deactivate') return 6;
                return 7; // unrecognized — last
            };
            enrollmentsToProcess = [...enrollments].sort((a, b) => statusPriority(a) - statusPriority(b));

            logDebug('[axios:bulkEnroll] Sorted enrollments by status for from_file processing', {
                order: ['active', 'inactive', 'invited', 'creation_pending', 'concluded', 'deleted', 'deactivate', 'other']
            });
        }

        const senderWebContents = event.sender;
        const sendProgress = (detail) => {
            if (senderWebContents && !senderWebContents.isDestroyed()) {
                senderWebContents.send('progress:enrollment', {
                    current: processed,
                    total: enrollmentsToProcess.length,
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

                // Determine task and state per-enrollment when using 'from_file'
                let task = globalTask;
                let rowEnrollmentState = enrollmentState;
                if (isFromFile) {
                    const fileState = (enrollment.enrollment_state || '').toLowerCase();
                    if (['delete', 'deleted'].includes(fileState)) {
                        task = 'delete';
                    } else if (['conclude', 'concluded'].includes(fileState)) {
                        task = 'conclude';
                    } else if (fileState === 'deactivate') {
                        task = 'deactivate';
                    } else if (['active', 'inactive', 'invited', 'creation_pending'].includes(fileState)) {
                        task = 'enroll';
                        rowEnrollmentState = fileState;
                    } else {
                        // Unrecognized state — skip this row
                        results.skipped++;
                        results.skippedRows.push({
                            user_id: enrollment.user_id || 'Unknown',
                            course_id: targetCourseId || '',
                            section_id: sectionId || '',
                            enrollment_id: enrollmentId || '',
                            enrollment_state: enrollment.enrollment_state || '',
                            reason: `Unrecognized status: ${enrollment.enrollment_state || '(empty)'}`
                        });
                        processed++;
                        sendProgress(`Skipped user ${enrollment.user_id || 'Unknown'} (unrecognized state)`);
                        return;
                    }
                }

                if (task !== 'enroll') {
                    if (!targetCourseId) {
                        results.failed++;
                        results.errors.push({
                            user_id: enrollment.user_id || 'Unknown',
                            course_id: targetCourseId || '',
                            section_id: sectionId || '',
                            role_id: enrollment.role_id || '',
                            reason: `${task} requires course_id and cannot use section_id`
                        });
                    } else if (!enrollmentId) {
                        results.failed++;
                        results.errors.push({
                            user_id: enrollment.user_id || 'Unknown',
                            course_id: targetCourseId || '',
                            section_id: sectionId || '',
                            role_id: enrollment.role_id || '',
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
                                course_id: targetCourseId || '',
                                section_id: sectionId || '',
                                role_id: enrollment.role_id || '',
                                reason: `Unexpected status code: ${response.status}`
                            });
                        }
                    }
                } else {
                    if (!sectionId && !targetCourseId) {
                        results.failed++;
                        results.errors.push({
                            user_id: enrollment.user_id,
                            course_id: targetCourseId || '',
                            section_id: sectionId || '',
                            role_id: enrollment.role_id || '',
                            reason: 'No section ID or course ID provided in file'
                        });
                    } else {
                        const enrollmentPayload = {
                            enrollment: {
                                user_id: enrollment.user_id,
                                enrollment_state: rowEnrollmentState
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
                                course_id: targetCourseId || '',
                                section_id: sectionId || '',
                                role_id: enrollment.role_id || '',
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
                    course_id: enrollment.course_id || '',
                    section_id: enrollment.course_section_id || '',
                    role_id: enrollment.role_id || '',
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
                let detailText = task === 'enroll'
                    ? `Processed user ${enrollment.user_id || 'Unknown'}`
                    : `Processed enrollment ${enrollment.enrollment_id || 'Unknown'}`;
                if (isFromFile) {
                    const stateLabel = (enrollment.enrollment_state || 'unknown').toLowerCase();
                    detailText += ` [${stateLabel}]`;
                }
                sendProgress(detailText);
            }

            if (!cancellationState.get(rendererId) && delayMs > 0 && processed < enrollmentsToProcess.length) {
                await sleep(delayMs);
            }
        };

        for (let index = 0; index < enrollmentsToProcess.length; index += concurrency) {
            if (cancellationState.get(rendererId)) {
                logDebug('[axios:bulkEnroll] Enrollment cancelled by user');
                break;
            }

            const batch = enrollmentsToProcess.slice(index, index + concurrency);
            await Promise.allSettled(batch.map(enrollment => processEnrollment(enrollment)));
        }

        cancellationState.delete(rendererId);

        logDebug('[axios:bulkEnroll] Bulk enrollment complete', {
            successful: results.successful,
            failed: results.failed,
            skipped: results.skipped,
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
     * Override concluded courses and retry enrollments.
     * For each selected course:
     *   1. GET course info to capture original term/date settings
     *   2. PUT course to temporarily clear end_at and set restrict_enrollments_to_course_dates=true
     *   3. Retry all failed enrollments for that course
     *   4. PUT course to restore original settings
     */
    // Track override cancellation state per renderer
    const overrideCancellation = new Map();

    ipcMain.handle('enrollment:cancelOverrideConcluded', async (event) => {
        const rendererId = event.sender.id;
        logDebug('[enrollment:cancelOverrideConcluded] Cancelling override', { rendererId });
        overrideCancellation.set(rendererId, true);
        return { cancelled: true };
    });

    ipcMain.handle('enrollment:overrideConcluded', async (event, params) => {
        const { domain, token, courseEnrollments, enrollmentState } = params;
        // courseEnrollments: { [courseId]: [ { user_id, course_id, course_section_id, type, role_id, role, ... } ] }

        const rendererId = event.sender.id;
        overrideCancellation.set(rendererId, false);

        const results = {
            successful: 0,
            failed: 0,
            errors: [],
            cancelled: false,
            courseResults: {} // { courseId: { restored: bool, error?: string } }
        };

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        const senderWebContents = event.sender;
        const sendProgress = (detail) => {
            if (senderWebContents && !senderWebContents.isDestroyed()) {
                senderWebContents.send('progress:concludedOverride', { detail });
            }
        };

        const isCancelled = () => overrideCancellation.get(rendererId);

        for (const [courseId, enrollments] of Object.entries(courseEnrollments)) {
            // Check cancellation before starting a new course
            if (isCancelled()) {
                logDebug('[enrollment:overrideConcluded] Cancelled by user before course', { courseId });
                results.cancelled = true;
                break;
            }

            let originalSettings = null;
            let courseModified = false;

            try {
                // Step 1: GET course info
                sendProgress(`Fetching course ${courseId} settings...`);
                logDebug('[enrollment:overrideConcluded] Fetching course info', { courseId });

                const courseResp = await axios.get(
                    `https://${domain}/api/v1/courses/${courseId}`,
                    { headers }
                );
                const course = courseResp.data;

                originalSettings = {
                    end_at: course.end_at,
                    restrict_enrollments_to_course_dates: course.restrict_enrollments_to_course_dates,
                    enrollment_term_id: course.enrollment_term_id,
                    workflow_state: course.workflow_state
                };

                logDebug('[enrollment:overrideConcluded] Original course settings', {
                    courseId,
                    ...originalSettings
                });

                // Step 2: PUT course to temporarily open it for enrollments
                sendProgress(`Temporarily opening course ${courseId}...`);

                const tempEndAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
                const courseUpdate = {
                    end_at: tempEndAt,
                    restrict_enrollments_to_course_dates: true
                };

                // If workflow_state is 'completed', publish it in the same call
                if (course.workflow_state === 'completed') {
                    courseUpdate.event = 'offer';
                    logDebug('[enrollment:overrideConcluded] Course is completed, publishing and opening', { courseId });
                }

                await axios.put(
                    `https://${domain}/api/v1/courses/${courseId}`,
                    { course: courseUpdate },
                    { headers }
                );
                courseModified = true;

                logDebug('[enrollment:overrideConcluded] Course temporarily opened', { courseId });

                // Step 3: Retry enrollments for this course
                sendProgress(`Enrolling ${enrollments.length} user(s) in course ${courseId}...`);

                for (const enrollment of enrollments) {
                    // Check cancellation between enrollments
                    if (isCancelled()) {
                        logDebug('[enrollment:overrideConcluded] Cancelled by user during enrollments', { courseId });
                        results.cancelled = true;
                        break;
                    }

                    try {
                        const sectionId = enrollment.course_section_id;

                        // When using 'from_file' mode, use the per-enrollment state
                        const effectiveState = enrollmentState === 'from_file'
                            ? (enrollment.enrollment_state || 'active')
                            : enrollmentState;

                        const enrollmentPayload = {
                            enrollment: {
                                user_id: enrollment.user_id,
                                enrollment_state: effectiveState
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
                            : `https://${domain}/api/v1/courses/${courseId}/enrollments`;

                        const response = await axios.post(endpoint, enrollmentPayload, { headers });

                        if (response.status === 200 || response.status === 201) {
                            results.successful++;
                            logDebug('[enrollment:overrideConcluded] Enrollment successful', {
                                user_id: enrollment.user_id,
                                courseId
                            });
                        } else {
                            results.failed++;
                            results.errors.push({
                                user_id: enrollment.user_id,
                                course_id: courseId,
                                section_id: enrollment.course_section_id || '',
                                role_id: enrollment.role_id || '',
                                reason: `Unexpected status code: ${response.status}`
                            });
                        }
                    } catch (enrollError) {
                        results.failed++;
                        const errorMessage = enrollError.response?.data?.errors?.[0]?.message ||
                            enrollError.response?.data?.message ||
                            enrollError.message;
                        results.errors.push({
                            user_id: enrollment.user_id,
                            course_id: courseId,
                            section_id: enrollment.course_section_id || '',
                            role_id: enrollment.role_id || '',
                            reason: errorMessage
                        });
                        logDebug('[enrollment:overrideConcluded] Enrollment failed during override', {
                            user_id: enrollment.user_id,
                            courseId,
                            error: errorMessage
                        });
                    }
                }
            } catch (error) {
                // Failed to fetch or open the course — mark all enrollments as failed
                const errorMessage = error.response?.data?.errors?.[0]?.message ||
                    error.response?.data?.message ||
                    error.message;
                for (const enrollment of enrollments) {
                    results.failed++;
                    results.errors.push({
                        user_id: enrollment.user_id,
                        course_id: courseId,
                        section_id: enrollment.course_section_id || '',
                        role_id: enrollment.role_id || '',
                        reason: `Failed to open course: ${errorMessage}`
                    });
                }
                results.courseResults[courseId] = { restored: false, error: errorMessage };
                logDebug('[enrollment:overrideConcluded] Failed to open course', { courseId, error: errorMessage });
                continue; // skip restore since we didn't modify
            }

            // Step 4: Restore original course settings
            if (courseModified) {
                try {
                    sendProgress(`Restoring course ${courseId} settings...`);

                    const restoreUpdate = {
                        end_at: originalSettings.end_at || null,
                        restrict_enrollments_to_course_dates: originalSettings.restrict_enrollments_to_course_dates
                    };

                    // If the course was originally 'completed', conclude it in the same call
                    if (originalSettings.workflow_state === 'completed') {
                        restoreUpdate.event = 'conclude';
                        logDebug('[enrollment:overrideConcluded] Re-concluding course', { courseId });
                    }

                    await axios.put(
                        `https://${domain}/api/v1/courses/${courseId}`,
                        { course: restoreUpdate },
                        { headers }
                    );

                    results.courseResults[courseId] = { restored: true };
                    logDebug('[enrollment:overrideConcluded] Course settings restored', { courseId });
                } catch (restoreError) {
                    const restoreMsg = restoreError.response?.data?.message || restoreError.message;
                    results.courseResults[courseId] = { restored: false, error: restoreMsg };
                    logDebug('[enrollment:overrideConcluded] Failed to restore course settings', {
                        courseId,
                        error: restoreMsg,
                        originalSettings
                    });
                }
            }

            // If cancelled, break out after restoring current course
            if (isCancelled()) break;
        }

        overrideCancellation.delete(rendererId);
        return results;
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
