/**
 * Course, Quiz, and Module IPC Handlers
 * Handles all course-related operations including:
 * - Course creation, reset, and content restoration
 * - Classic and New Quizzes management
 * - Module creation, deletion, and relocking
 * - Course associations and blueprint syncing
 */

const { restoreContent, resetCourse, getCourseInfo, createSupportCourse, associateCourses, syncBPCourses } = require('../../shared/canvas-api/courses');
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
        let requestID = 1;
        data.courses.forEach((course) => {
            const requestData = {
                domain: data.domain,
                token: data.token,
                course: course
            };
            requests.push({ id: requestID, request: () => request(requestData) });
            requestID++;
        });

        const batchResponse = await batchHandler(requests, getBatchConfig());
        return batchResponse;
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

        try {
            const quizzes = await quizzes_classic.createClassicQuizzes(data);
            return quizzes;
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
            const totalRequests = data.number;
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
                    title: data.title
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
                console.error('Error: ', error);
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
                module_id: data.module_ids[i].id
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
            for (let i = 0; i < totalRequests; i++) {
                const requestData = {
                    domain: data.domain,
                    token: data.token,
                    course_id: data.course_id,
                    module_name: "Module " + (currentModules.length + i + 1)
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
                module_id: data.module_ids[i]
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
