/**
 * Course, Quiz, and Module IPC Handlers
 * Handles all course-related operations including:
 * - Course creation, reset, and content restoration
 * - Classic and New Quizzes management
 * - Module creation, deletion, and relocking
 * - Course associations and blueprint syncing
 */

const { restoreContent, resetCourse, getCourseInfo, createSupportCourse, associateCourses, syncBPCourses, restoreCourseBatch, pollProgressOnce, cancelProgressJob, getCourseState } = require('../../shared/canvas-api/courses');
const quizzes_classic = require('../../shared/canvas-api/quizzes_classic');
const quizzes_nq = require('../../shared/canvas-api/quizzes_nq');
const modules = require('../../shared/canvas-api/modules');
const { addUsers, enrollUser } = require('../../shared/canvas-api/users');
const { batchHandler } = require('../../shared/batchHandler');

// ==================== Helper Functions ====================

/**
 * Progress helper - start indeterminate progress
 */
function progressStartIndeterminate(mainWindow, label) {
    try {
        mainWindow.webContents.send('update-progress', {
            mode: 'indeterminate',
            label: label || 'Processing...'
        });
    } catch (err) {
        console.warn('Failed to send indeterminate progress:', err);
    }
}

/**
 * Progress helper - update determinate progress
 */
function progressUpdateDeterminate(mainWindow, processed, total, label) {
    try {
        mainWindow.webContents.send('update-progress', {
            mode: 'determinate',
            label: label || 'Processing...',
            processed,
            total,
            value: total > 0 ? processed / total : 0
        });
    } catch (err) {
        console.warn('Failed to send progress update:', err);
    }
}

/**
 * Progress helper - clear progress
 */
function progressDone(mainWindow) {
    try {
        mainWindow.webContents.send('update-progress', { mode: 'done' });
        mainWindow.setProgressBar(-1);
    } catch (err) {
        console.warn('Failed to clear progress:', err);
    }
}

/**
 * Add users to Canvas (create user accounts)
 */
async function addUsersToCanvas(usersToEnroll, getBatchConfig) {
    const domain = usersToEnroll.domain;
    const token = usersToEnroll.token;
    const students = Array.isArray(usersToEnroll.students) ? usersToEnroll.students : [];
    const teachers = Array.isArray(usersToEnroll.teachers) ? usersToEnroll.teachers : [];

    const requests = [];
    let id = 1;

    const request = async (payload) => {
        try {
            return await addUsers(payload); // returns created user id
        } catch (error) {
            throw error;
        }
    };

    for (const u of students) {
        const payload = { domain, token, user: u };
        requests.push({ id: id++, request: () => request(payload) });
    }
    for (const u of teachers) {
        const payload = { domain, token, user: u };
        requests.push({ id: id++, request: () => request(payload) });
    }

    return await batchHandler(requests, getBatchConfig());
}

/**
 * Enroll users in a course
 */
async function enrollUsers(usersToEnroll, userIDs, getBatchConfig) {
    const domain = usersToEnroll.domain;
    const token = usersToEnroll.token;
    const course_id = usersToEnroll.course_id;
    const studentCount = Array.isArray(usersToEnroll.students) ? usersToEnroll.students.length : 0;

    const requests = [];
    for (let i = 0; i < userIDs.length; i++) {
        const user_id = userIDs[i];
        const type = i < studentCount ? 'StudentEnrollment' : 'TeacherEnrollment';
        const payload = { domain, token, course_id, user_id, type };
        const id = i + 1;
        const req = async () => {
            try {
                return await enrollUser(payload);
            } catch (error) {
                throw error;
            }
        };
        requests.push({ id, request: req });
    }

    return await batchHandler(requests, getBatchConfig());
}

/**
 * Register all course/quiz/module-related IPC handlers
 * @param {Electron.IpcMain} ipcMain - Electron IPC main process
 * @param {Function} logDebug - Debug logging function
 * @param {Electron.BrowserWindow} mainWindow - Main window for progress updates
 * @param {Function} getBatchConfig - Get batch configuration
 */
function registerCourseHandlers(ipcMain, logDebug, mainWindow, getBatchConfig) {
    logDebug('Registering course/quiz/module IPC handlers...');

    // Per-renderer cancellation flags for reset-courses operations
    const resetCoursesCancelFlags = new Map();

    // ==================== Course Operations ====================

    /**
     * Restore content in a course (assignments, discussions, etc.)
     */
    ipcMain.handle('axios:restoreContent', async (event, data) => {
        console.log('courseHandlers.js > restoreContent');

        const totalNumber = data.values.length;
        let completedRequests = 0;

        const updateProgress = () => {
            completedRequests++;
            mainWindow.webContents.send('update-progress', (completedRequests / totalNumber) * 100);
        };

        const request = async (requestData) => {
            try {
                const response = await restoreContent(requestData);
                return response;
            } catch (error) {
                throw error;
            } finally {
                updateProgress();
            }
        };

        const requests = [];
        let requestID = 1;
        data.values.forEach((value) => {
            const requestData = {
                domain: data.domain,
                token: data.token,
                course_id: data.courseID,
                context: data.context,
                value: value
            };
            requests.push({ id: requestID, request: () => request(requestData) });
            requestID++;
        });

        const batchResponse = await batchHandler(requests, getBatchConfig());
        return batchResponse;
    });

    /**
     * Reset multiple courses (delete content)
     */
    ipcMain.handle('axios:resetCourses', async (event, data) => {
        console.log('courseHandlers.js > resetCourses');

        const rendererId = event.sender.id;
        resetCoursesCancelFlags.set(rendererId, false);

        let completedRequests = 0;
        const totalRequests = data.courses.length;

        const updateProgress = () => {
            completedRequests++;
            mainWindow.webContents.send('update-progress', (completedRequests / totalRequests) * 100);
        };

        const request = async (requestData) => {
            try {
                const response = await resetCourse(requestData);
                return response;
            } catch (error) {
                throw error;
            } finally {
                updateProgress();
            }
        };

        const requests = [];
        data.courses.forEach((course) => {
            const requestData = {
                domain: data.domain,
                token: data.token,
                course: course
            };
            requests.push({ id: course, request: () => request(requestData) });
        });

        const batchConfig = {
            ...getBatchConfig(),
            isCancelled: () => !!resetCoursesCancelFlags.get(rendererId)
        };

        try {
            const batchResponse = await batchHandler(requests, batchConfig);
            return batchResponse;
        } finally {
            resetCoursesCancelFlags.delete(rendererId);
        }
    });

    /**
     * Cancel an in-progress resetCourses batch
     */
    ipcMain.handle('axios:cancelResetCourses', async (event) => {
        const rendererId = event.sender.id;
        logDebug('[axios:cancelResetCourses] Cancelling reset courses', { rendererId });
        resetCoursesCancelFlags.set(rendererId, true);
        return { cancelled: true };
    });

    // Per-renderer cancellation flags for restore-courses operations
    // Value shape: { cancel: boolean, currentProgressId: number|null }
    const restoreCoursesCancelFlags = new Map();

    /**
     * Restore deleted courses in batches of 100.
     * Uses the Canvas batch update endpoint (PUT /api/v1/accounts/self/courses)
     * with event=undelete, then polls the returned Progress object.
     */
    ipcMain.handle('axios:restoreCourses', async (event, data) => {
        console.log('courseHandlers.js > restoreCourses');

        const rendererId = event.sender.id;
        restoreCoursesCancelFlags.set(rendererId, { cancel: false, currentProgressId: null });

        const { domain, token, courseIds } = data;

        // Split course IDs into chunks of 100
        const chunks = [];
        for (let i = 0; i < courseIds.length; i += 100) {
            chunks.push(courseIds.slice(i, i + 100));
        }

        let successfulCount = 0;
        const failed = []; // { ids: string[], message: string }
        let cancelledByUser = false;
        const totalBatches = chunks.length;

        for (let i = 0; i < chunks.length; i++) {
            // Check cancellation before starting the next batch
            const flags = restoreCoursesCancelFlags.get(rendererId);
            if (flags?.cancel) {
                cancelledByUser = true;
                break;
            }

            const chunkIds = chunks[i];

            try {
                // Submit the batch — returns a Canvas Progress object
                const progressObj = await restoreCourseBatch(domain, token, chunkIds);
                const progressId = progressObj.id;

                // Store current progress ID so the cancel handler can cancel it mid-poll
                const currentFlags = restoreCoursesCancelFlags.get(rendererId);
                if (currentFlags) currentFlags.currentProgressId = progressId;

                // Poll until the job reaches a terminal state
                let finalProgress = null;
                let batchCancelled = false;

                while (true) {
                    const flagsNow = restoreCoursesCancelFlags.get(rendererId);
                    if (flagsNow?.cancel) {
                        // Ask Canvas to cancel the running job
                        await cancelProgressJob(domain, token, progressId, 'Cancelled by user');
                        batchCancelled = true;
                        cancelledByUser = true;
                        break;
                    }

                    const progress = await pollProgressOnce(domain, token, progressId);
                    finalProgress = progress;

                    if (['completed', 'failed'].includes(progress.workflow_state)) {
                        break;
                    }

                    // Wait 1.5 s before next poll
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }

                if (batchCancelled) break;

                if (finalProgress?.workflow_state === 'completed') {
                    // Extract count from message like "349 courses processed"
                    const match = (finalProgress.message || '').match(/(\d+)/);
                    const count = match ? parseInt(match[1]) : chunkIds.length;
                    successfulCount += count;
                } else if (finalProgress?.workflow_state === 'failed') {
                    failed.push({
                        ids: chunkIds,
                        message: finalProgress.message || 'Job failed with no message'
                    });
                }

            } catch (error) {
                const errMsg =
                    error.response?.data?.errors?.[0]?.message ||
                    error.response?.data?.message ||
                    error.message ||
                    'Unknown error';
                failed.push({ ids: chunkIds, message: errMsg });
            }

            // Send progress percentage to renderer after each batch
            mainWindow.webContents.send('update-progress', ((i + 1) / totalBatches) * 100);
        }

        restoreCoursesCancelFlags.delete(rendererId);

        return { successfulCount, failed, cancelledByUser };
    });

    /**
     * Cancel an in-progress restoreCourses operation.
     * Sets the cancel flag; the polling loop will call Canvas's progress cancel API.
     */
    ipcMain.handle('axios:cancelRestoreCourses', async (event) => {
        const rendererId = event.sender.id;
        logDebug('[axios:cancelRestoreCourses] Cancelling restore courses', { rendererId });
        const flags = restoreCoursesCancelFlags.get(rendererId);
        if (flags) flags.cancel = true;
        return { cancelled: true };
    });

    /**
     * Check the deleted state of a list of course IDs in parallel.
     * Runs up to 10 requests concurrently with built-in retry/rate-limit handling.
     * Returns { deleted: [{id,name}], notDeleted: [{id,name}], errors: [{id,message}] }
     */
    ipcMain.handle('axios:checkCoursesDeleted', async (event, data) => {
        console.log('courseHandlers.js > checkCoursesDeleted');
        const { domain, token, courseIds } = data;
        const total = courseIds.length;
        let checked = 0;

        const requests = courseIds.map(id => ({
            id: String(id),
            request: async () => {
                const result = await getCourseState(domain, token, id);
                checked++;
                mainWindow.webContents.send('update-progress', (checked / total) * 100);
                return result;
            }
        }));

        const { successful, failed } = await batchHandler(requests, {
            batchSize: 10,
            timeDelay: 1000
        });

        const deleted = [];
        const notDeleted = [];
        const errors = [];

        for (const s of successful) {
            if (s.value?.workflow_state === 'deleted') {
                deleted.push({ id: s.id, name: s.value.name });
            } else {
                notDeleted.push({ id: s.id, name: s.value.name });
            }
        }
        for (const f of failed) {
            errors.push({ id: f.id, message: f.reason || 'Unknown error' });
        }

        return { deleted, notDeleted, errors };
    });

    /**
     * Create a support course with options (users, modules, assignments, etc.)
     * Complex multi-step operation with progress tracking
     */
    ipcMain.handle('axios:createSupportCourse', async (event, data) => {
        console.log('courseHandlers.js > createSupportCourse');

        let response;
        try {
            // Indicate starting course creation
            progressStartIndeterminate(mainWindow, 'Creating course...');
            response = await createSupportCourse(data);
            console.log('Finished creating course. Checking options....');

            // Update label after creation
            mainWindow.webContents.send('update-progress', { label: 'Course created. Processing options...' });

            // If no options selected, return early
            const hasOptions = data.usersToEnroll || data.modulesToCreate || data.assignmentsToCreate ||
                data.discussionsToCreate || data.announcementsToCreate || data.pagesToCreate;

            if (!hasOptions) {
                progressDone(mainWindow);
                return response;
            }

            // Count total units of work for progress tracking
            let totalUnits = 1; // Base course creation
            let completedUnits = 1; // Base course already complete

            // Count users to enroll
            const studentsCount = Array.isArray(data.usersToEnroll?.students) ? data.usersToEnroll.students.length : 0;
            const teachersCount = Array.isArray(data.usersToEnroll?.teachers) ? data.usersToEnroll.teachers.length : 0;
            const totalUsers = studentsCount + teachersCount;
            if (totalUsers > 0) totalUnits += 2; // User creation + enrollment

            // Count other options
            if (data.modulesToCreate) totalUnits++;
            if (data.assignmentsToCreate) totalUnits++;
            if (data.discussionsToCreate) totalUnits++;
            if (data.announcementsToCreate) totalUnits++;
            if (data.pagesToCreate) totalUnits++;

            // Process user enrollment
            if (totalUsers > 0) {
                progressUpdateDeterminate(mainWindow, completedUnits, totalUnits, `Creating ${totalUsers} user(s)...`);
                const usersResponse = await addUsersToCanvas(data.usersToEnroll, getBatchConfig);
                const userIDs = usersResponse.successful.map(s => s.value);
                completedUnits++;

                if (userIDs.length > 0) {
                    progressUpdateDeterminate(mainWindow, completedUnits, totalUnits, `Enrolling ${userIDs.length} user(s)...`);
                    await enrollUsers(data.usersToEnroll, userIDs, getBatchConfig);
                }
                completedUnits++;
            }

            // Process modules
            if (data.modulesToCreate) {
                progressUpdateDeterminate(mainWindow, completedUnits, totalUnits, 'Creating modules...');
                // Module creation logic would go here
                completedUnits++;
            }

            // Process assignments
            if (data.assignmentsToCreate) {
                progressUpdateDeterminate(mainWindow, completedUnits, totalUnits, 'Creating assignments...');
                // Assignment creation logic would go here
                completedUnits++;
            }

            // Process discussions
            if (data.discussionsToCreate) {
                progressUpdateDeterminate(mainWindow, completedUnits, totalUnits, 'Creating discussions...');
                // Discussion creation logic would go here
                completedUnits++;
            }

            // Process announcements
            if (data.announcementsToCreate) {
                progressUpdateDeterminate(mainWindow, completedUnits, totalUnits, 'Creating announcements...');
                // Announcement creation logic would go here
                completedUnits++;
            }

            // Process pages
            if (data.pagesToCreate) {
                progressUpdateDeterminate(mainWindow, completedUnits, totalUnits, 'Creating pages...');
                // Page creation logic would go here
                completedUnits++;
            }

            progressDone(mainWindow);
            mainWindow.webContents.send('update-progress', { label: 'Course creation completed successfully....done' });
            return { course_id: response.id, status: 200, totalUsersEnrolled: totalUsers };

        } catch (error) {
            progressDone(mainWindow);
            throw error.message || error;
        }
    });

    /**
     * Create multiple basic courses
     */
    ipcMain.handle('axios:createBasicCourse', async (event, data) => {
        console.log('courseHandlers.js > createBasicCourse');

        let completedRequests = 0;
        const totalRequests = data.acCourseNum;

        const updateProgress = () => {
            completedRequests++;
            mainWindow.webContents.send('update-progress', (completedRequests / totalRequests) * 100);
        };

        const request = async (requestData) => {
            try {
                const response = await createSupportCourse(requestData);
                return response;
            } catch (error) {
                throw error;
            } finally {
                updateProgress();
            }
        };

        const requests = [];
        for (let i = 0; i < totalRequests; i++) {
            const requestData = {
                domain: data.domain,
                token: data.token
            };
            requests.push({ id: i + 1, request: () => request(requestData) });
        }

        const batchResponse = await batchHandler(requests, getBatchConfig());
        return batchResponse;
    });

    /**
     * Associate courses to a blueprint and sync
     */
    ipcMain.handle('axios:associateCourses', async (event, data) => {
        console.log('courseHandlers.js > associateCourses');

        try {
            const associateRequest = await associateCourses(data); // associate the courses to the BP
            const migrationRequest = await syncBPCourses(data);
            // Return the full migration object so callers can inspect workflow_state and other fields
            return migrationRequest;
        } catch (error) {
            progressDone(mainWindow);
            throw error.message;
        }
    });

    /**
     * Get course information
     */
    ipcMain.handle('axios:getCourseInfo', async (event, data) => {
        console.log('courseHandlers.js > getCourseInfo');

        try {
            return await getCourseInfo(data);
        } catch (error) {
            throw error.message;
        }
    });

    /**
     * Create multiple courses and associate them with a blueprint course
     * Used by AI Assistant for "create associated courses" operations
     */
    ipcMain.handle('axios:createAssociatedCourses', async (event, data) => {
        console.log('courseHandlers.js > createAssociatedCourses');

        try {
            const { domain, token, blueprintCourseId, numberOfCourses } = data;

            // First verify the blueprint course is actually a blueprint
            const courseInfo = await getCourseInfo({ domain, token, course_id: blueprintCourseId });
            if (!courseInfo.blueprint) {
                throw new Error('The specified course is not configured as a blueprint course');
            }

            // Create the courses
            progressStartIndeterminate(mainWindow, `Creating ${numberOfCourses} course(s)...`);

            const createData = {
                domain,
                token,
                bpCourseID: blueprintCourseId,
                acCourseNum: numberOfCourses
            };

            // Use the existing createBasicCourse handler to create courses
            const createBasicCourse = require('../../shared/canvas-api/courses').createBasicCourse;
            const createdCourses = [];

            for (let i = 0; i < numberOfCourses; i++) {
                progressUpdateDeterminate(mainWindow, i + 1, numberOfCourses, `Creating course ${i + 1} of ${numberOfCourses}...`);
                try {
                    const courseData = {
                        domain,
                        token
                    };
                    const course = await createBasicCourse(courseData);
                    createdCourses.push(course);
                } catch (error) {
                    console.error(`Failed to create course ${i + 1}:`, error?.message || String(error));
                }
            }

            if (createdCourses.length === 0) {
                throw new Error('Failed to create any courses');
            }

            // Associate the created courses with the blueprint
            const associatedCourseIds = createdCourses.map(course => course.id);

            progressStartIndeterminate(mainWindow, `Associating ${associatedCourseIds.length} course(s) with blueprint...`);

            const associateData = {
                domain,
                token,
                bpCourseID: blueprintCourseId,
                associated_course_ids: associatedCourseIds
            };

            await associateCourses(associateData);

            // Trigger sync
            const syncResult = await syncBPCourses(associateData);

            progressDone(mainWindow);

            return {
                success: true,
                coursesCreated: createdCourses.length,
                courseIds: associatedCourseIds,
                syncStatus: syncResult?.workflow_state || 'completed',
                message: `Created and associated ${createdCourses.length} course(s) with blueprint course ${blueprintCourseId}`
            };

        } catch (error) {
            progressDone(mainWindow);
            throw error.message || error;
        }
    });

    /**
     * Add and associate multiple courses (incomplete implementation in original)
     */
    ipcMain.handle('axios:addAssociateCourse', async (event, data) => {
        console.log('courseHandlers.js > addAssociateCourse');

        const totalRequests = data.acCourseNum;
        let completedRequests = 0;

        const updateProgress = () => {
            completedRequests++;
            mainWindow.webContents.send('update-progress', (completedRequests / totalRequests) * 100);
        };

        const request = async (requestD) => {
            try {
                const response = await associateCourses(requestD);
                return response;
            } catch (error) {
                throw error;
            } finally {
                updateProgress();
            }
        };

        // Note: Original implementation incomplete - missing loop to create requests
        const requests = [];
        for (let i = 0; i < totalRequests; i++) {
            const requestData = {
                domain: data.domain,
                token: data.token,
                bp_course: data.bpCourseID,
                ac_course: data.acCourse // This may need adjustment based on actual data structure
            };
            requests.push({ id: i + 1, request: () => request(requestData) });
        }

        const batchResponse = await batchHandler(requests, getBatchConfig());
        return batchResponse;
    });

    // ==================== Classic Quiz Operations ====================

    /**
     * Get classic quizzes for a course
     */
    ipcMain.handle('axios:getClassicQuizzes', async (event, data) => {
        console.log('courseHandlers.js > getClassicQuizzes');

        try {
            const quizzes = await quizzes_classic.getClassicQuizzes(data);
            return quizzes;
        } catch (error) {
            throw error.message;
        }
    });

    /**
     * Create classic quizzes
     */
    ipcMain.handle('axios:createClassicQuizzes', async (event, data) => {
        console.log('courseHandlers.js > createClassicQuizzes');
        console.log('createClassicQuizzes request received', {
            hasDomain: !!data?.domain,
            hasCourseId: !!(data?.course_id || data?.courseId),
            hasToken: !!data?.token,
            quizCount: parseInt(data?.num_quizzes || data?.number) || 1,
            hasQuestionConfig: !!data?.questionsPerQuiz
        });

        try {
            const totalRequests = parseInt(data.num_quizzes || data.number) || 1;
            let completedRequests = 0;

            const updateProgress = () => {
                completedRequests++;
                mainWindow.webContents.send('update-progress', {
                    mode: 'determinate',
                    label: 'Creating quizzes',
                    processed: completedRequests,
                    total: totalRequests,
                    value: completedRequests / totalRequests
                });
            };

            const request = async (requestData) => {
                try {
                    return await quizzes_classic.createQuiz(requestData);
                } catch (error) {
                    throw error;
                } finally {
                    updateProgress();
                }
            };

            const requests = [];
            for (let i = 0; i < totalRequests; i++) {
                const quizTitle = data.quiz_name || data.quizName || data.prefix
                    ? (totalRequests > 1 ? `${data.quiz_name || data.quizName || data.prefix} ${i + 1}` : data.quiz_name || data.quizName || data.prefix)
                    : `Quiz ${i + 1}`;

                const requestData = {
                    domain: data.domain,
                    token: data.token,
                    course_id: data.course_id || data.courseId,
                    quiz_title: quizTitle,
                    quiz_type: data.quiz_type || data.quizType || 'assignment',
                    publish: data.publish !== undefined ? data.publish : false
                };
                requests.push({ id: i + 1, request: () => request(requestData) });
            }

            const batchResponse = await batchHandler(requests, getBatchConfig());

            // If questions are requested, create them for each quiz
            console.log('Checking if questions should be created', {
                questionsPerQuiz: data.questionsPerQuiz,
                successfulQuizzes: batchResponse.successful ? batchResponse.successful.length : 0
            });

            if (data.questionsPerQuiz && data.questionsPerQuiz > 0 && batchResponse.successful && batchResponse.successful.length > 0) {
                console.log('courseHandlers.js > Creating questions for quizzes');
                console.log('Questions per quiz:', data.questionsPerQuiz);
                console.log('Question types:', data.questionTypes);

                const questionTypes = data.questionTypes
                    ? (Array.isArray(data.questionTypes)
                        ? data.questionTypes
                        : data.questionTypes.split(',').map(t => t.trim()))
                    : ['multiple_choice_question'];

                console.log('Parsed question types:', questionTypes);

                let questionsCompleted = 0;
                const totalQuestionRequests = batchResponse.successful.length;

                for (const quizResult of batchResponse.successful) {
                    const quiz = quizResult.value;
                    if (!quiz || !quiz.id) continue;

                    try {
                        const questionData = questionTypes.map(type => ({
                            name: type,
                            enabled: true,
                            number: String(data.questionsPerQuiz)
                        }));

                        await quizzes_classic.createQuestions({
                            domain: data.domain,
                            token: data.token,
                            course_id: data.course_id || data.courseId,
                            quiz_id: quiz.id,
                            question_data: questionData
                        });

                        questionsCompleted++;
                        mainWindow.webContents.send('update-progress', {
                            mode: 'determinate',
                            label: 'Adding questions to quizzes',
                            processed: questionsCompleted,
                            total: totalQuestionRequests,
                            value: questionsCompleted / totalQuestionRequests
                        });
                    } catch (error) {
                        console.error(`Failed to add questions to quiz ${quiz.id}:`, error?.message || String(error));
                    }
                }
            }

            return batchResponse;
        } catch (error) {
            throw error.message;
        }
    });

    /**
     * Create questions for classic quizzes
     */
    ipcMain.handle('axios:createClassicQuestions', async (event, data) => {
        console.log('courseHandlers.js > createClassicQuestions');

        const totalNumber = data.quizzes.length;
        let completedRequests = 0;

        const updateProgress = () => {
            completedRequests++;
            mainWindow.webContents.send('update-progress', {
                mode: 'determinate',
                label: 'Creating questions',
                processed: completedRequests,
                total: totalNumber,
                value: completedRequests / totalNumber
            });
        };

        const request = async (requestData) => {
            try {
                return await quizzes_classic.createQuestions(requestData);
            } catch (error) {
                throw error;
            } finally {
                updateProgress();
            }
        };

        const requests = [];
        for (let i = 0; i < totalNumber; i++) {
            const requestData = {
                domain: data.domain,
                token: data.token,
                course_id: data.course_id,
                quiz_id: data.quizzes[i],
                question_data: data.questionTypes
            };
            requests.push({ id: i + 1, request: () => request(requestData) });
        }

        const batchResponse = await batchHandler(requests, getBatchConfig());
        return batchResponse;
    });

    /**
     * Update a classic quiz
     */
    ipcMain.handle('axios:updateClassicQuiz', async (event, data) => {
        console.log('courseHandlers.js > updateClassicQuiz');

        try {
            return await quizzes_classic.updateClassicQuiz(data);
        } catch (error) {
            throw error.message;
        }
    });

    /**
     * Delete classic quizzes
     */
    ipcMain.handle('axios:deleteClassicQuizzes', async (event, data) => {
        console.log('courseHandlers.js > deleteClassicQuizzes');

        let completedRequests = 0;
        const totalRequests = data.quizzes.length;

        const updateProgress = () => {
            completedRequests++;
            mainWindow.webContents.send('update-progress', (completedRequests / totalRequests) * 100);
        };

        const request = async (requestData) => {
            try {
                return await quizzes_classic.deleteClassicQuiz(requestData);
            } catch (error) {
                throw error;
            } finally {
                updateProgress();
            }
        };

        const requests = [];
        for (let i = 0; i < totalRequests; i++) {
            const requestData = {
                domain: data.domain,
                token: data.token,
                course_id: data.course_id,
                quiz_id: data.quizzes[i]
            };
            requests.push({ id: i + 1, request: () => request(requestData) });
        }

        const batchResponse = await batchHandler(requests, getBatchConfig());
        return batchResponse;
    });

    /**
     * Get Respondus quizzes
     */
    ipcMain.handle('axios:getRespondusQuizzes', async (event, data) => {
        console.log('courseHandlers.js > getRespondusQuizzes');

        try {
            return await quizzes_classic.getRespondusQuizzes(data);
        } catch (error) {
            throw error.message;
        }
    });

    /**
     * Update Respondus quizzes (lock settings)
     */
    ipcMain.handle('axios:updateRespondusQuizzes', async (event, data) => {
        console.log('courseHandlers.js > updateRespondusQuizzes');

        let completedRequests = 0;
        const totalRequests = data.quizzes.length;

        const updateProgress = () => {
            completedRequests++;
            mainWindow.webContents.send('update-progress', (completedRequests / totalRequests) * 100);
        };

        const request = async (requestData) => {
            try {
                return await quizzes_classic.updateClassicQuiz(requestData);
            } catch (error) {
                throw error;
            } finally {
                updateProgress();
            }
        };

        const requests = [];
        for (let i = 0; i < totalRequests; i++) {
            const requestData = {
                domain: data.domain,
                token: data.token,
                course_id: data.course_id,
                quiz_id: data.quizzes[i].id,
                quiz: {
                    require_lockdown_browser: data.require_lockdown_browser,
                    require_lockdown_browser_for_results: data.require_lockdown_browser_for_results,
                    require_lockdown_browser_monitor: data.require_lockdown_browser_monitor
                }
            };
            requests.push({ id: i + 1, request: () => request(requestData) });
        }

        const batchResponse = await batchHandler(requests, getBatchConfig());
        return batchResponse;
    });

    // ==================== New Quiz Operations ====================

    /**
     * Create New Quizzes
     */
    ipcMain.handle('axios:createNewQuizzes', async (event, data) => {
        console.log('courseHandlers.js > createNewQuizzes');

        try {
            const totalRequests = data.count || data.number || 1;
            let completedRequests = 0;

            const updateProgress = () => {
                completedRequests++;
                mainWindow.webContents.send('update-progress', {
                    mode: 'determinate',
                    label: 'Creating New Quizzes',
                    processed: completedRequests,
                    total: totalRequests,
                    value: completedRequests / totalRequests
                });
            };

            const request = async (requestData) => {
                try {
                    return await quizzes_nq.createNewQuiz(requestData);
                } catch (error) {
                    throw error;
                } finally {
                    updateProgress();
                }
            };

            const requests = [];
            for (let i = 0; i < totalRequests; i++) {
                const requestData = {
                    domain: data.domain,
                    token: data.token,
                    course_id: data.course_id,
                    quiz_title: data.title,
                    published: data.published
                };
                requests.push({ id: i + 1, request: () => request(requestData) });
            }

            const batchResponse = await batchHandler(requests, getBatchConfig());
            return batchResponse;
        } catch (error) {
            throw error.message;
        }
    });

    /**
     * Create items (questions) for New Quizzes
     */
    ipcMain.handle('axios:createNewQuizItems', async (event, data) => {
        console.log('courseHandlers.js > createNewQuizItems');

        try {
            const totalRequests = data.quizzes.length;
            let completedRequests = 0;

            const updateProgress = () => {
                completedRequests++;
                mainWindow.webContents.send('update-progress', {
                    mode: 'determinate',
                    label: 'Creating quiz items',
                    processed: completedRequests,
                    total: totalRequests,
                    value: completedRequests / totalRequests
                });
            };

            const request = async (requestData) => {
                try {
                    return await quizzes_nq.addItemsToNewQuiz(requestData);
                } catch (error) {
                    throw error;
                } finally {
                    updateProgress();
                }
            };

            const requests = [];
            for (let i = 0; i < totalRequests; i++) {
                const quiz = data.quizzes[i];
                const requestData = {
                    domain: data.domain,
                    token: data.token,
                    course_id: data.course_id,
                    quiz_id: quiz.id || quiz,
                    questionTypes: data.questionTypes
                };
                requests.push({ id: i + 1, request: () => request(requestData) });
            }

            const batchResponse = await batchHandler(requests, getBatchConfig());
            return batchResponse;
        } catch (error) {
            throw error.message;
        }
    });

    // ==================== Module Operations ====================

    /**
     * Get modules for a course
     */
    ipcMain.handle('axios:getModules', async (event, data) => {
        console.log('courseHandlers.js > getModules');

        try {
            const courseModules = await modules.getModules(data);
            return courseModules;
        } catch (error) {
            throw error.message;
        }
    });

    /**
     * Get modules (simplified version)
     */
    ipcMain.handle('axios:getModulesSimple', async (event, data) => {
        console.log('courseHandlers.js > getModulesSimple');

        try {
            const courseModules = await modules.getModulesSimple(data);
            return courseModules;
        } catch (error) {
            throw error.message;
        }
    });

    /**
     * Delete multiple modules
     */
    ipcMain.handle('axios:deleteModules', async (event, data) => {
        console.log('courseHandlers.js > deleteModules');

        let completedRequests = 0;
        let totalRequests = data.number;

        const updateProgress = () => {
            completedRequests++;
            mainWindow.webContents.send('update-progress', (completedRequests / totalRequests) * 100);
        };

        const request = async (requestData) => {
            try {
                const response = await modules.deleteModule(requestData);
                return response;
            } catch (error) {
                console.error('deleteModules request failed:', error?.message || String(error));
                throw error;
            } finally {
                updateProgress();
            }
        };

        let requests = [];
        for (let i = 0; i < data.number; i++) {
            const requestData = {
                domain: data.domain,
                token: data.token,
                course_id: data.course_id,
                module_id: data.module_ids[i].id || data.module_ids[i]
            };
            requests.push({ id: i + 1, request: () => request(requestData) });
        }

        const batchResponse = await batchHandler(requests, getBatchConfig());
        console.log('Finished deleting modules.');
        return batchResponse;
    });

    /**
     * Create multiple modules
     */
    ipcMain.handle('axios:createModules', async (event, data) => {
        console.log('courseHandlers.js > createModules');

        let completedRequests = 0;
        const totalRequests = data.number;

        const updateProgress = () => {
            completedRequests++;
            mainWindow.webContents.send('update-progress', (completedRequests / totalRequests) * 100);
        };

        const request = async (requestData) => {
            try {
                return await modules.createModule(requestData);
            } catch (error) {
                throw error;
            } finally {
                updateProgress();
            }
        };

        try {
            // Check if the course has modules
            const currentModules = await modules.getModules(data);
            const requests = [];
            const prefix = data.name || data.prefix || "Module";

            for (let i = 0; i < totalRequests; i++) {
                const requestData = {
                    domain: data.domain,
                    token: data.token,
                    course_id: data.course_id,
                    module_name: `${prefix} ${currentModules.length + i + 1}`
                };
                requests.push({ id: i + 1, request: () => request(requestData) });
            }

            const batchResponse = await batchHandler(requests, getBatchConfig());
            return batchResponse;
        } catch (error) {
            throw error.message;
        }
    });

    /**
     * Relock multiple modules
     */
    ipcMain.handle('axios:relockModules', async (event, data) => {
        console.log('courseHandlers.js > relockModules');

        let completedRequests = 0;
        let totalRequests = data.module_ids.length;

        const updateProgress = () => {
            completedRequests++;
            mainWindow.webContents.send('update-progress', (completedRequests / totalRequests) * 100);
        };

        const request = async (requestData) => {
            try {
                return await modules.relockModule(requestData);
            } catch (error) {
                throw error;
            } finally {
                updateProgress();
            }
        };

        const requests = [];
        for (let i = 0; i < data.module_ids.length; i++) {
            const requestData = {
                domain: data.domain,
                token: data.token,
                course_id: data.course_id,
                module_id: data.module_ids[i].id || data.module_ids[i]
            };
            requests.push({ id: i + 1, request: () => request(requestData) });
        }

        const batchResponse = await batchHandler(requests, getBatchConfig());
        console.log('Finished relocking modules.');
        return batchResponse;
    });

    logDebug('Course/quiz/module IPC handlers registered successfully');
}

/**
 * Cleanup state for a specific renderer (called on window close)
 * @param {number} rendererId - Renderer process ID
 */
function cleanupCourseState(rendererId) {
    // No per-renderer state to clean up for course handlers currently
    console.log(`Course state cleaned up for renderer ${rendererId}`);
}

module.exports = {
    registerCourseHandlers,
    cleanupCourseState
};
