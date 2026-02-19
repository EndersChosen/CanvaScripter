const { contextBridge, ipcRenderer } = require('electron');
// const axios = require('axios');

// contextBridge.exposeInMainWorld('eAPI', {
//     onUpdateCounter: (callback) => ipcRenderer.on('update-counter', callback),
//     helloTest: (channel, data) => ipcMain.send(channel, data),

// });

// Expose context menu API for sandbox mode
contextBridge.exposeInMainWorld('contextMenu', {
    show: (x, y) => ipcRenderer.send('show-context-menu', { x, y })
});

contextBridge.exposeInMainWorld('axios', {
    awsCheck: async (data) => {
        return await ipcRenderer.invoke('axios:awsCheck', data);
    },
    bounceCheck: async (domain, token, email) => {
        return await ipcRenderer.invoke('axios:bounceCheck', { domain, token, email });
    },
    getConvos: async (data) => {
        const result = await ipcRenderer.invoke('axios:getConvos', data);
        if (!result) {
            return false;
        }

        if (Array.isArray(result)) {
            console.log('in preload total result ', result.length);
        } else {
            const count = Array.isArray(result.messages) ? result.messages.length : 0;
            console.log('in preload total result ', count);
        }

        return result;
    },
    cancelGetConvos: async () => {
        return await ipcRenderer.invoke('axios:cancelGetConvos');
    },
    getDeletedConversations: async (data) => {
        console.log('preload.js > getDeletedConversations');
        return await ipcRenderer.invoke('axios:getDeletedConversations', data);
    },
    cancelGetDeletedConversations: async () => {
        console.log('preload.js > cancelGetDeletedConversations');
        return await ipcRenderer.invoke('axios:cancelGetDeletedConversations');
    },
    deleteConvos: async (data) => {
        console.log('inside deleteConvos');

        return await ipcRenderer.invoke('axios:deleteConvos', data);
        // const result = await ipcRenderer.invoke('axios:deleteConvos', data, url);
    },
    cancelDeleteConvos: async () => {
        return await ipcRenderer.invoke('axios:cancelDeleteConvos');
    },
    deleteFiles: async (data) => {
        console.log('inside deleteFiles');
        return await ipcRenderer.invoke('axios:deleteFiles', data);
    },
    checkCommChannel: async (data) => {
        console.log('inside preload checkCommChannel');
        return await ipcRenderer.invoke('axios:checkCommChannel', data);
    },
    checkCommDomain: async (data) => {
        console.log('Inside preload axios:checkCommDomain');
        return await ipcRenderer.invoke('axios:checkCommDomain', data);
    },
    saveSuppressedEmails: async (options) => {
        console.log('Inside preload axios:saveSuppressedEmails');
        return await ipcRenderer.invoke('axios:saveSuppressedEmails', options);
    },
    resetCommChannelsByPattern: async (data) => {
        console.log('Inside preload axios:resetCommChannelsByPattern');
        return await ipcRenderer.invoke('axios:resetCommChannelsByPattern', data);
    },
    cancelResetCommChannelsByPattern: async () => {
        console.log('Inside preload axios:cancelResetCommChannelsByPattern');
        return await ipcRenderer.invoke('axios:cancelResetCommChannelsByPattern');
    },
    createAssignments: async (data) => {
        console.log('inside preload createAssignments');

        return await ipcRenderer.invoke('axios:createAssignments', data);

    },
    deleteAssignments: async (data) => {
        console.log('inside preload deleteAssignments');
        return await ipcRenderer.invoke('axios:deleteAssignments', data);
    },
    cancelDeleteOperations: async () => {
        console.log('inside preload cancelDeleteOperations');
        return await ipcRenderer.invoke('axios:cancelDeleteOperations');
    },
    getEmptyAssignmentGroups: async (data) => {
        console.log('inside preload getEmptyAssignmentGroups');
        return await ipcRenderer.invoke('axios:getEmptyAssignmentGroups', data);
    },
    deleteEmptyAssignmentGroups: async (data) => {
        console.log('Inside axios:deleteEmptyAssignmentGroups');

        return await ipcRenderer.invoke('axios:deleteEmptyAssignmentGroups', data);
    },
    getNoSubmissionAssignments: async (data) => {
        console.log('preload > getNoSubmissionAssignments');

        try {
            const response = await ipcRenderer.invoke('axios:getNoSubmissionAssignments', data);
            return response;
        } catch (error) {
            throw error;
        }

    },
    deleteNoSubmissionAssignments: async (data) => {
        console.log('preload > deleteNoSubmissionAssignments');

        return await ipcRenderer.invoke('axios:deleteNoSubmissionAssignments', data);
    },
    getUnpublishedAssignments: async (data) => {
        console.log('preload > getUnpublishedAssignments');

        return await ipcRenderer.invoke('axios:getUnpublishedAssignments', data);
    },
    getNonModuleAssignments: async (data) => {
        console.log('preload > deleteNonModuleAssignments');

        return await ipcRenderer.invoke('axios:getNonModuleAssignments', data);
    },
    getOldAssignments: async (data) => {
        console.log('preload > getOldAssignments')

        return await ipcRenderer.invoke('axios:getOldAssignments', data);
    },
    getNoDueDateAssignments: async (data) => {
        console.log('preload > getNoDueDateAssignments');
        return await ipcRenderer.invoke('axios:getNoDueDateAssignments', data);
    },
    getAllAssignmentsForCombined: async (data) => {
        console.log('preload > getAllAssignmentsForCombined');
        return await ipcRenderer.invoke('axios:getAllAssignmentsForCombined', data);
    },
    cancelAllAssignmentsForCombined: async () => {
        console.log('preload > cancelAllAssignmentsForCombined');
        return await ipcRenderer.invoke('axios:cancelAllAssignmentsForCombined');
    },
    deleteOldAssignments: async (data) => {
        console.log('preload > deleteOldAssignments');

        return await ipcRenderer.invoke('axios:deleteOldAssignments', data);
    },
    getImportedAssignments: async (data) => {
        console.log('preload > getImportedAssignments');

        return await ipcRenderer.invoke('axios:getImportedAssignments', data);
    },
    getImportedAssets: async (data) => {
        console.log('preload > getImportedAssets');
        return await ipcRenderer.invoke('axios:getImportedAssets', data);
    },
    listContentMigrations: async (data) => {
        console.log('preload > listContentMigrations');
        return await ipcRenderer.invoke('axios:listContentMigrations', data);
    },
    getAssignmentsToMove: async (data) => {
        console.log('preload > getAssignmentsToMove');

        return await ipcRenderer.invoke('axios:getAssignmentsToMove', data);
    },
    keepAssignmentsInGroup: async (data) => {
        console.log('preload > keepAssignmentsInGroup');

        return await ipcRenderer.invoke('axios:keepAssignmentsInGroup', data);
    },
    moveAssignmentsToSingleGroup: async (data) => {
        console.log('preload > moveAssignmentsToSingleGroup');

        return await ipcRenderer.invoke('axios:moveAssignmentsToSingleGroup', data);
    },
    getAssignmentGroupById: async (data) => {
        console.log('preload > getAssignmentGroupById');

        return await ipcRenderer.invoke('axios:getAssignmentGroupById', data);
    },
    getAssignmentsInGroup: async (data) => {
        console.log('preload > getAssignmentsInGroup');
        return await ipcRenderer.invoke('axios:getAssignmentsInGroup', data);
    },
    deleteAssignmentsInGroup: async (data) => {
        console.log('preload > deleteAssignmentsInGroup');

        return await ipcRenderer.invoke('axios:deleteAssignmentsInGroup', data);
    },
    deleteAssignmentGroupAssignments: async (data) => {
        console.log('preload > deleteAssignmentGroupAssignments');

        return await ipcRenderer.invoke('axios:deleteAssignmentGroupAssignments', data);
    },
    createAssignmentGroups: async (data) => {
        console.log('preload.js > createAssignmentGroups');

        return await ipcRenderer.invoke('axios:createAssignmentGroups', data);
    },
    cancelCreateAssignmentGroups: async () => {
        console.log('preload.js > cancelCreateAssignmentGroups');

        return await ipcRenderer.invoke('axios:cancelCreateAssignmentGroups');
    },
    cancelDeleteEmptyAssignmentGroups: async () => {
        console.log('preload.js > cancelDeleteEmptyAssignmentGroups');

        return await ipcRenderer.invoke('axios:cancelDeleteEmptyAssignmentGroups');
    },
    bulkEnroll: async (data) => {
        console.log('preload.js > bulkEnroll');
        return await ipcRenderer.invoke('axios:bulkEnroll', data);
    },
    onBulkEnrollProgress: (callback) => {
        const handler = (_event, payload) => callback(payload);
        ipcRenderer.on('progress:enrollment', handler);
        return () => ipcRenderer.removeListener('progress:enrollment', handler);
    },
    cancelBulkEnroll: async () => {
        console.log('preload.js > cancelBulkEnroll');
        return await ipcRenderer.invoke('axios:cancelBulkEnroll');
    },
    deleteTheThings: async (data) => {
        console.log('preload.js > deleteTheThings');

        return await ipcRenderer.invoke('axios:deleteTheThings', data);
    },
    getPageViews: async (data) => {
        console.log('preload.js > getPageViews');

        return await ipcRenderer.invoke('axios:getPageViews', data);
    },
    restoreDeletedConversations: async (data) => {
        console.log('preload.js > restoreDeletedConversations');
        return await ipcRenderer.invoke('axios:restoreDeletedConversations', data);
    },
    cancelRestoreDeletedConversations: async () => {
        console.log('preload.js > cancelRestoreDeletedConversations');
        return await ipcRenderer.invoke('axios:cancelRestoreDeletedConversations');
    },
    restoreContent: async (data) => {
        console.log('preload.js > restoreContent');

        return await ipcRenderer.invoke('axios:restoreContent', data);
    },
    resetCourses: async (data) => {
        console.log('preload.js > resetCourses');

        return await ipcRenderer.invoke('axios:resetCourses', data);
    },
    cancelResetCourses: async () => {
        console.log('preload.js > cancelResetCourses');
        return await ipcRenderer.invoke('axios:cancelResetCourses');
    },
    restoreCourses: async (data) => {
        console.log('preload.js > restoreCourses');
        return await ipcRenderer.invoke('axios:restoreCourses', data);
    },
    cancelRestoreCourses: async () => {
        console.log('preload.js > cancelRestoreCourses');
        return await ipcRenderer.invoke('axios:cancelRestoreCourses');
    },
    checkCoursesDeleted: async (data) => {
        console.log('preload.js > checkCoursesDeleted');
        return await ipcRenderer.invoke('axios:checkCoursesDeleted', data);
    },
    getCourseInfo: async (data) => {
        console.log('preload.js > getCourseInfo');

        return await ipcRenderer.invoke('axios:getCourseInfo', data);
    },
    addAssociateCourse: async (data) => {
        console.log('preload.js > addAssociateCourse');

        return await ipcRenderer.invoke('axios:addAssociateCourse', data);
    },
    resetCommChannel: async (data) => {
        console.log('preload.js > rsetCommChannel');

        return await ipcRenderer.invoke('axios:resetCommChannel', data);
    },
    checkUnconfirmedEmails: async (data) => {
        console.log('preload.js > checkUnconfirmedEmails');

        return await ipcRenderer.invoke('axios:checkUnconfirmedEmails', data);
    },
    confirmEmails: async (data) => {
        console.log('preload.js > confirmEmails');

        return await ipcRenderer.invoke('axios:confirmEmails', data);
    },
    resetEmails: async (data) => {
        console.log('preload.js > resetEmails');

        return await ipcRenderer.invoke('axios:resetEmails', data);
    },
    cancelResetEmails: async () => {
        console.log('preload.js > cancelResetEmails');
        return await ipcRenderer.invoke('axios:cancelResetEmails');
    },
    createSupportCourse: async (data) => {
        console.log('preload.js > createSupportCourse');

        return await ipcRenderer.invoke('axios:createSupportCourse', data);
    },
    createBasicCourse: async (data) => {
        console.log('preload.js > createBasicCourse');

        return await ipcRenderer.invoke('axios:createBasicCourse', data);
    },
    associateCourses: async (data) => {
        console.log('preload.js > associateCourses');

        return await ipcRenderer.invoke('axios:associateCourses', data);
    },
    getClassicQuizzes: async (data) => {
        console.log('preload.js > getClassicQuizzes');

        const result = await ipcRenderer.invoke('axios:getClassicQuizzes', data);
        if (!result) {
            return false;
        }
        console.log('in preload total classic quizzes result ', result.length);
        return result;
    },
    createClassicQuizzes: async (data) => {
        console.log('preload.js > createClassicQuizzes');

        return await ipcRenderer.invoke('axios:createClassicQuizzes', data)
    },
    updateClassicQuiz: async (data) => {
        console.log('preload.js > updateClassicQuiz');

        return await ipcRenderer.invoke('axios:updateClassicQuiz', data);
    },
    createClassicQuestions: async (data) => {
        console.log('preload.js > createClassicQuestions');

        return await ipcRenderer.invoke('axios:createClassicQuestions', data);
    },
    deleteClassicQuizzes: async (data) => {
        console.log('preload.js > deleteClassicQuizzes');

        return await ipcRenderer.invoke('axios:deleteClassicQuizzes', data);
    },
    getRespondusQuizzes: async (data) => {
        console.log('preload.js > getRespondusQuizzes');

        const result = await ipcRenderer.invoke('axios:getRespondusQuizzes', data);
        if (!result) {
            return false;
        }
        console.log('in preload total respondus quizzes result ', result.length);
        return result;
    },
    updateRespondusQuizzes: async (data) => {
        console.log('preload.js > updateRespondusQuizzes');

        return await ipcRenderer.invoke('axios:updateRespondusQuizzes', data);
    },
    createNewQuizzes: async (data) => {
        console.log('preload.js > createNewQuizzes');

        return await ipcRenderer.invoke('axios:createNewQuizzes', data);
    },
    createNewQuizItems: async (data) => {
        console.log('preload.js > createNewQuizItems');

        return await ipcRenderer.invoke('axios:createNewQuizItems', data);
    },
    deleteDiscussions: async (data) => {
        console.log('preload.js > deleteDiscussions');
        return await ipcRenderer.invoke('axios:deleteDiscussions', data);
    },
    getAnnouncements: async (data) => {
        console.log('preload.js > getAnnouncements');
        return await ipcRenderer.invoke('axios:getAnnouncements', data);
    },
    deleteAnnouncementsGraphQL: async (data) => {
        console.log('preload.js > deleteAnnouncementsGraphQL');
        return await ipcRenderer.invoke('axios:deleteAnnouncementsGraphQL', data);
    },
    cancelOperation: async (operationId) => {
        console.log('preload.js > cancelOperation');
        return await ipcRenderer.invoke('axios:cancelOperation', operationId);
    },
    deleteFolders: async (data) => {
        console.log('preload.js > deleteFolders');
        return await ipcRenderer.invoke('axios:deleteFolders', data);
    },
    deleteAttachments: async (data) => {
        console.log('preload.js > deleteAttachments');
        return await ipcRenderer.invoke('axios:deleteAttachments', data);
    },
    deleteGroupCategories: async (data) => {
        console.log('preload.js > deleteGroupCategories');
        return await ipcRenderer.invoke('axios:deleteGroupCategories', data);
    },
    getFoldersMeta: async (data) => {
        console.log('preload.js > getFoldersMeta');
        return await ipcRenderer.invoke('axios:getFoldersMeta', data);
    },
    createNQQuestions: async (data) => {
        console.log('preload.js > createNQQuestions');

        return await ipcRenderer.invoke('axios:createNQQuestions', data);
    },

    getModules: async (data) => {
        console.log('preload.js > getModules');

        return await ipcRenderer.invoke('axios:getModules', data);
    },
    getAssignmentsInModules: async (data) => {
        console.log('preload.js > getAssignmentsInModules');
        return await ipcRenderer.invoke('axios:getAssignmentsInModules', data);
    },
    deleteModules: async (data) => {
        console.log('preload.js > deleteModules');

        return await ipcRenderer.invoke('axios:deleteModules', data);
    },
    deleteGradingStandards: async (data) => {
        console.log('preload.js > deleteGradingStandards');

        return await ipcRenderer.invoke('axios:deleteGradingStandards', data);
    },
    createModules: async (data) => {
        console.log('preload.js > createModules');

        return await ipcRenderer.invoke('axios:createModules', data);
    },
    getModulesSimple: async (data) => {
        console.log('preload.js > getModulesSimple');

        return await ipcRenderer.invoke('axios:getModulesSimple', data);
    },
    relockModules: async (data) => {
        console.log('preload.js > relockModules');

        return await ipcRenderer.invoke('axios:relockModules', data);
    },
    createDiscussions: async (data) => {
        console.log('preload.js > createDiscussions');
        return await ipcRenderer.invoke('axios:createDiscussions', data);
    },
    createAnnouncements: async (data) => {
        console.log('preload.js > createAnnouncements');
        return await ipcRenderer.invoke('axios:createAnnouncements', data);
    },
    createPages: async (data) => {
        console.log('preload.js > createPages');
        return await ipcRenderer.invoke('axios:createPages', data);
    },
    createSections: async (data) => {
        console.log('preload.js > createSections');
        return await ipcRenderer.invoke('axios:createSections', data);
    },
    updateNotifications: async (data) => {
        console.log('preload.js > updateNotifications');

        return await ipcRenderer.invoke('axios:updateNotifications', data);
    },
    getCommChannels: async (data) => {
        console.log('preload.js > getCommChannels');

        return await ipcRenderer.invoke('axios:getCommChannels', data);
    },
    getCourseInfo: async (data) => {
        console.log('preload.js > getCourseInfo');
        return await ipcRenderer.invoke('axios:getCourseInfo', data);
    },
    matchPermissions: async (data) => {
        console.log('preload.js > matchPermissions');
        return await ipcRenderer.invoke('axios:matchPermissions', data);
    },
    cancelMatchPermissions: async () => {
        console.log('preload.js > cancelMatchPermissions');
        return await ipcRenderer.invoke('axios:cancelMatchPermissions');
    },
    enableDisableAllPermissions: async (data) => {
        console.log('preload.js > enableDisableAllPermissions');
        return await ipcRenderer.invoke('axios:enableDisableAllPermissions', data);
    },
    cancelEnableDisablePermissions: async () => {
        console.log('preload.js > cancelEnableDisablePermissions');
        return await ipcRenderer.invoke('axios:cancelEnableDisablePermissions');
    }
});

contextBridge.exposeInMainWorld('csv', {
    sendToCSV: async (data) => {
        console.log('inside csv exporter');

        //console.log(data);

        return await ipcRenderer.invoke('csv:sendToCSV', data);
    },
    writeAtPath: async (fullPath, data) => {
        return await ipcRenderer.invoke('csv:writeAtPath', { fullPath, data });
    },
    sendToText: async () => {
        console.log('inside preload sendToText');

        ipcRenderer.send('csv:sendToText');
    }
});

// File helpers for bulk user ID uploads and related actions
contextBridge.exposeInMainWorld('fileUpload', {
    getUserIdsFromFile: async () => {
        return await ipcRenderer.invoke('fileUpload:getUserIdsFromFile');
    },
    pickCsvOrZip: async () => {
        return await ipcRenderer.invoke('fileUpload:pickCsvOrZip');
    },
    readFile: async (fullPath) => {
        return await ipcRenderer.invoke('fileUpload:readFile', { fullPath });
    },
    readFileBuffer: async (fullPath) => {
        return await ipcRenderer.invoke('fileUpload:readFileBuffer', { fullPath });
    },
    analyzeEmailFile: async () => {
        return await ipcRenderer.invoke('fileUpload:analyzeEmailFile');
    },
    confirmEmails: async (data) => {
        return await ipcRenderer.invoke('fileUpload:confirmEmails', data);
    },
    resetCourse: async () => {
        return await ipcRenderer.invoke('fileUpload:resetCourses');
    },
    restoreCoursesFile: async () => {
        return await ipcRenderer.invoke('fileUpload:restoreCourses');
    },
    // Step 1: pick and parse emails file, return { fileContents, filePath, ext }
    resetEmails: async (data) => {
        return await ipcRenderer.invoke('fileUpload:resetEmails', data);
    },
    writeErrorsFile: async (dirPath, baseName, failed) => {
        return await ipcRenderer.invoke('fileUpload:writeErrorsFile', { dirPath, baseName, failed });
    },
    checkEmails: async () => {
        return await ipcRenderer.invoke('fileUpload:checkEmails');
    }
});

contextBridge.exposeInMainWorld('dataUpdate', {
    onUpdate: async (callback) => ipcRenderer.on('email-count', (_event, value) => callback(value))
})

// (Removed duplicate exposeInMainWorld('fileUpload') to avoid overriding methods)

contextBridge.exposeInMainWorld('progressAPI', {
    // Subscribe to progress; returns an unsubscribe function
    onUpdateProgress: (callback) => {
        const handler = (_event, payload) => callback(payload);
        ipcRenderer.on('update-progress', handler);
        return () => ipcRenderer.removeListener('update-progress', handler);
    },
    // Clear all progress listeners (useful when switching forms)
    removeAllProgressListeners: () => {
        ipcRenderer.removeAllListeners('update-progress');
    },
    // Subscribe to permissions matching progress
    onPermissionsMatchProgress: (callback) => {
        const handler = (_event, payload) => callback(payload);
        ipcRenderer.on('permissions-match-progress', handler);
        return () => ipcRenderer.removeListener('permissions-match-progress', handler);
    },
    // Clear permissions progress listeners
    removePermissionsProgressListeners: () => {
        ipcRenderer.removeAllListeners('permissions-match-progress');
    },
    // Subscribe to enable/disable permissions progress
    onEnableDisableProgress: (callback) => {
        const handler = (_event, payload) => callback(payload);
        ipcRenderer.on('enable-disable-progress', handler);
        return () => ipcRenderer.removeListener('enable-disable-progress', handler);
    },
    // Clear enable/disable progress listeners
    removeEnableDisableProgressListeners: () => {
        ipcRenderer.removeAllListeners('enable-disable-progress');
    }
});

contextBridge.exposeInMainWorld('testAPI', {
    testing: () => {
        console.log('preload > testAPI:testing');
        ipcRenderer.send('testAPI:testing');
    }
});

contextBridge.exposeInMainWorld('menus', {
    rightclick: () => {
        ipcRenderer.send('right-click');
    },
    onMenuCommand: (callback) => {
        ipcRenderer.on('context-menu-command', (_event, data) => callback(data));
    },
    writeText: (data) => {
        ipcRenderer.send('write-text', (data));
    }
});

contextBridge.exposeInMainWorld('shell', {
    openExternal: (data) => {
        ipcRenderer.send('shell:openExternal', data);
    }
});

contextBridge.exposeInMainWorld('electronAPI', {
    selectFolder: async () => {
        return await ipcRenderer.invoke('sis:selectFolder');
    },
    selectFile: async (options) => {
        return await ipcRenderer.invoke('sis:selectFile', options);
    },
    readFile: async (filePath) => {
        return await ipcRenderer.invoke('sis:readFile', filePath);
    },
    saveFile: async (options) => {
        return await ipcRenderer.invoke('file:save', options);
    },
    showSaveDialog: async (options) => {
        return await ipcRenderer.invoke('file:save', options);
    },
    writeFile: async (filePath, content) => {
        return await ipcRenderer.invoke('file:write', filePath, content);
    },
    previewSISData: async (fileType, rowCount, emailDomain, authProviderId, allOptions) => {
        return await ipcRenderer.invoke('sis:previewData', fileType, rowCount, emailDomain, authProviderId, allOptions);
    },
    createSISFile: async (fileType, rowCount, outputPath, emailDomain, authProviderId, allOptions) => {
        return await ipcRenderer.invoke('sis:createFile', fileType, rowCount, outputPath, emailDomain, authProviderId, allOptions);
    },
    createBulkSISFiles: async (fileTypes, rowCounts, outputPath, createZip, emailDomain, authProviderId, enrollmentOptions) => {
        return await ipcRenderer.invoke('sis:createBulkFiles', fileTypes, rowCounts, outputPath, createZip, emailDomain, authProviderId, enrollmentOptions);
    },
    createMultiSISFiles: async (fileConfigurations, outputPath) => {
        return await ipcRenderer.invoke('sis:createMultiFiles', fileConfigurations, outputPath);
    },
    fetchAuthProviders: async (domain, token, accountId) => {
        return await ipcRenderer.invoke('sis:fetchAuthProviders', domain, token, accountId);
    },
    searchUsers: async (domain, token, searchTerm) => {
        return await ipcRenderer.invoke('users:search', domain, token, searchTerm);
    },
    searchAccounts: async (domain, token, searchTerm) => {
        return await ipcRenderer.invoke('accounts:search', domain, token, searchTerm);
    },
    searchTerms: async (domain, token, searchTerm) => {
        return await ipcRenderer.invoke('terms:search', domain, token, searchTerm);
    },
    searchSections: async (domain, token, searchTerm) => {
        return await ipcRenderer.invoke('sections:search', domain, token, searchTerm);
    },
    searchEnrollments: async (domain, token, searchTerm, searchType) => {
        return await ipcRenderer.invoke('enrollments:search', domain, token, searchTerm, searchType);
    },
    searchLogins: async (domain, token, userId, idType) => {
        return await ipcRenderer.invoke('logins:search', domain, token, userId, idType);
    },
    searchCanvasData: async (fileType, searchParams) => {
        // Extract domain and token from searchParams
        const { domain, token } = searchParams;

        if (!domain || !token) {
            return { success: false, error: 'Please enter both Canvas domain and API token' };
        }

        switch (fileType) {
            case 'users':
                return await ipcRenderer.invoke('users:search', domain, token, searchParams.search_term);
            case 'accounts':
                return await ipcRenderer.invoke('accounts:search', domain, token, searchParams.search_term);
            case 'courses':
                return await ipcRenderer.invoke('courses:search', domain, token, searchParams.search_term);
            case 'terms':
                return await ipcRenderer.invoke('terms:search', domain, token, searchParams.search_term);
            case 'sections':
                return await ipcRenderer.invoke('sections:search', domain, token, searchParams.search_term);
            case 'enrollments':
                return await ipcRenderer.invoke('enrollments:search', domain, token, searchParams.search_type, searchParams.id);
            case 'logins':
                return await ipcRenderer.invoke('logins:search', domain, token, searchParams.user_id, searchParams.id_type);
            default:
                return { success: false, error: 'Unknown file type' };
        }
    },
    onPageViewsProgress: (callback) => {
        ipcRenderer.on('page-views-progress', callback);
    },
    removePageViewsProgressListener: (callback) => {
        ipcRenderer.removeListener('page-views-progress', callback);
    }
});

// Restricted IPC invoke surface: allowlist only.
// This prevents arbitrary access to main-process IPC handlers.
const ALLOWED_INVOKE_CHANNELS = new Set([
    // HAR analyzer
    'har:selectFile',
    'har:analyze',
    'har:analyzeAi',

    // QTI analyzer
    'qti:selectFile',
    'qti:analyze',

    // Diff checker
    'diff:selectFile',
    'diff:compareFiles',
    'diff:compareText',
    'diff:exportDiff',

    // UTF-8 checker
    'utf8:selectFile',
    'utf8:validate',
    'utf8:fix',

    // Settings / API Keys
    'settings:getApiKey',
    'settings:saveApiKey',
    'settings:hasApiKey',
    'settings:deleteApiKey',
    'settings:getMaskedApiKey',

    // AI Assistant
    'ai-assistant:parseIntent',
    'ai-assistant:getOperationDetails',
    'ai-assistant:fetchItems',
    'ai-assistant:executeOperation',
    'ai-assistant:sendSlackFeedback',

    // Email parsing helpers
    'parseEmailsFromCSV',
    'parseEmailsFromExcel'
]);

contextBridge.exposeInMainWorld('ipcRenderer', {
    invoke: (channel, ...args) => {
        if (!ALLOWED_INVOKE_CHANNELS.has(channel)) {
            throw new Error(`Blocked IPC channel: ${channel}`);
        }
        return ipcRenderer.invoke(channel, ...args);
    },
    on: (channel, callback) => {
        // Allow specific receive channels
        const allowedReceiveChannels = ['open-ai-settings'];
        if (!allowedReceiveChannels.includes(channel)) {
            throw new Error(`Blocked IPC receive channel: ${channel}`);
        }
        ipcRenderer.on(channel, callback);
    },
    send: (channel, ...args) => {
        // Allow specific send channels
        const allowedSendChannels = ['open-external-url'];
        if (!allowedSendChannels.includes(channel)) {
            throw new Error(`Blocked IPC send channel: ${channel}`);
        }
        ipcRenderer.send(channel, ...args);
    }
});

// Small utilities - Properly exposed via contextBridge
contextBridge.exposeInMainWorld('utilities', {
    createDownloadLink: function (data, filename, linkText = 'Download') {
        const csv = typeof data === 'string' ? data : data.map(row =>
            Array.isArray(row) ? row.join(',') : String(row)
        ).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.textContent = linkText;
        link.className = 'btn btn-sm btn-outline-primary me-2';
        link.style.marginTop = '10px';

        // Clean up the URL when the link is clicked
        link.addEventListener('click', () => {
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        });

        return link;
    }
});