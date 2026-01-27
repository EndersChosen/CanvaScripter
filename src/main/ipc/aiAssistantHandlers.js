/**
 * AI Assistant Handlers
 * Provides natural language interface to Canvas operations
 */

const { ipcMain } = require('electron');
const { getDecryptedKey } = require('./settingsHandlers');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

/**
 * Generate unique announcement titles using AI
 * @param {number} count - Number of titles to generate
 * @param {string} message - The announcement message/body for context
 * @param {string} titleBase - Base theme or context for title generation
 * @returns {Promise<string[]>} Array of unique titles
 */
async function generateAnnouncementTitles(count, message, titleBase) {
    try {
        // Try Anthropic first, fallback to OpenAI
        let apiKey = getDecryptedKey('anthropic');
        let provider = 'anthropic';

        if (!apiKey) {
            apiKey = getDecryptedKey('openai');
            provider = 'openai';
        }

        if (!apiKey) {
            throw new Error('No AI API key available for title generation');
        }

        const prompt = `Generate ${count} unique, creative, and professional announcement titles.

Context:
- Base theme/topic: "${titleBase}"
- Announcement message: "${message}"

Requirements:
- Each title should be distinct and varied
- Titles should be 3-8 words long
- Make them engaging and relevant to the context
- If message provides context, use it for inspiration
- Avoid generic numbered titles like "Announcement 1", "Announcement 2"
- Return ONLY a JSON array of strings, nothing else

Example output format:
["Important Class Update", "Upcoming Schedule Changes", "Assignment Deadline Reminder", ...]`;

        let responseText = '';

        if (provider === 'openai') {
            const openai = new OpenAI({ apiKey });
            const completion = await openai.chat.completions.create({
                messages: [
                    { role: 'system', content: 'You are a helpful assistant that generates creative announcement titles. Respond only with a JSON array of strings.' },
                    { role: 'user', content: prompt }
                ],
                model: 'gpt-4o',
                response_format: { type: "json_object" }
            });
            responseText = completion.choices[0].message.content;
            // OpenAI might wrap in an object, extract the array
            const parsed = JSON.parse(responseText);
            return Array.isArray(parsed) ? parsed : (parsed.titles || Object.values(parsed)[0]);
        } else {
            const anthropic = new Anthropic({ apiKey });
            const msg = await anthropic.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 1024,
                messages: [{
                    role: "user",
                    content: prompt
                }]
            });
            responseText = msg.content[0].text;
            // Strip markdown if present
            let cleanedText = responseText.trim();
            if (cleanedText.startsWith('```')) {
                cleanedText = cleanedText.replace(/^```[a-z]*\n?/, '').replace(/```\s*$/, '').trim();
            }
            return JSON.parse(cleanedText);
        }
    } catch (error) {
        console.error('Error generating announcement titles:', error);
        // Fallback to simple numbered titles with base
        return Array.from({ length: count }, (_, i) => `${titleBase} ${i + 1}`);
    }
}

async function getAssignmentGroupsList(fullParams, event) {
    const handler = ipcMain._invokeHandlers?.get('axios:getAssignmentGroups');
    if (!handler) {
        throw new Error('Assignment group lookup handler not found');
    }

    const mockEvent = {
        sender: event.sender,
        senderFrame: event.senderFrame,
        reply: event.reply
    };

    const groups = await handler(mockEvent, {
        domain: normalizeDomain(fullParams.domain),
        token: fullParams.token,
        course_id: fullParams.courseId || fullParams.course_id
    });

    if (!Array.isArray(groups)) {
        throw new Error('Failed to load assignment groups. Check the Canvas domain and API token.');
    }

    return groups;
}

function findAssignmentGroupIdByName(groups, groupName) {
    if (!Array.isArray(groups) || !groupName) return null;

    const exact = groups.find(g => g?.name === groupName);
    if (exact) {
        return exact.id || exact._id;
    }

    const lower = groupName.toLowerCase();
    const caseInsensitive = groups.filter(g => (g?.name || '').toLowerCase() === lower);
    if (caseInsensitive.length === 1) {
        return caseInsensitive[0].id || caseInsensitive[0]._id;
    }

    return null;
}

async function resolveAssignmentGroupId(fullParams, event) {
    if (fullParams.assignmentGroupId || fullParams.groupId || fullParams.group_id) {
        return { id: fullParams.assignmentGroupId || fullParams.groupId || fullParams.group_id, groups: [] };
    }

    const groupName = fullParams.groupName || fullParams.assignmentGroupName;
    if (!groupName) {
        return { id: null, groups: [] };
    }

    const groups = await getAssignmentGroupsList(fullParams, event);
    const groupId = findAssignmentGroupIdByName(groups, groupName);
    return { id: groupId, groups };
}

function extractSubjectFromPrompt(promptText) {
    if (!promptText) return null;

    const doubleQuoteMatch = promptText.match(/subject\s*["“”]([\s\S]*?)["“”]/i);
    if (doubleQuoteMatch) return doubleQuoteMatch[1];

    const singleQuoteMatch = promptText.match(/subject\s*'([\s\S]*?)'/i);
    if (singleQuoteMatch) return singleQuoteMatch[1];

    return null;
}

function extractCourseIdFromPrompt(promptText) {
    if (!promptText) return null;
    const match = promptText.match(/\/courses\/(\d+)/i);
    return match ? match[1] : null;
}

function extractDomainFromPrompt(promptText) {
    if (!promptText) return null;
    const match = promptText.match(/https?:\/\/([^/\s]+)/i);
    return match ? match[1] : null;
}

function normalizeDomain(domain) {
    if (!domain) return domain;
    const trimmed = String(domain).trim();
    if (!trimmed) return trimmed;
    try {
        if (/^https?:\/\//i.test(trimmed)) {
            return new URL(trimmed).hostname;
        }
    } catch {
        // fall through to basic normalization
    }
    return trimmed.replace(/^https?:\/\//i, '').split('/')[0];
}

function extractAssignmentGroupNameFromPrompt(promptText) {
    if (!promptText) return null;
    const quoted = promptText.match(/assignment group\s+(?:named|called|titled|with name|with the name|in)\s*["“”']([\s\S]*?)["“”']/i);
    if (quoted) return quoted[1];

    const inQuoted = promptText.match(/in\s+the\s*["“”']([\s\S]*?)["“”']\s+assignment group/i);
    if (inQuoted) return inQuoted[1];

    return null;
}

// Map of supported operations to their handlers and required parameters
const OPERATION_MAP = {
    // ==================== Assignment Operations ====================
    'delete-unpublished-assignments': {
        fetchHandler: 'axios:getAllAssignmentsForCombined',
        deleteHandler: 'axios:deleteAssignments',
        description: 'Delete unpublished assignments from a course',
        requiredParams: ['domain', 'token', 'courseId'],
        filters: {
            unpublished: true,
            includeGraded: false
        },
        needsFetch: true
    },
    'delete-no-submission-assignments': {
        fetchHandler: 'axios:getAllAssignmentsForCombined',
        deleteHandler: 'axios:deleteAssignments',
        description: 'Delete assignments with no submissions',
        requiredParams: ['domain', 'token', 'courseId'],
        filters: {
            noSubmissions: true,
            includeGraded: false
        },
        needsFetch: true
    },
    'delete-old-assignments': {
        fetchHandler: 'axios:getAllAssignmentsForCombined',
        deleteHandler: 'axios:deleteAssignments',
        description: 'Delete old assignments (due date before specified date)',
        requiredParams: ['domain', 'token', 'courseId', 'beforeDate'],
        filters: {
            beforeDate: true,
            includeGraded: false
        },
        needsFetch: true
    },
    'delete-no-due-date-assignments': {
        fetchHandler: 'axios:getAllAssignmentsForCombined',
        deleteHandler: 'axios:deleteAssignments',
        description: 'Delete assignments with no due date',
        requiredParams: ['domain', 'token', 'courseId'],
        filters: {
            noDueDate: true,
            includeGraded: false
        },
        needsFetch: true
    },
    'delete-non-module-assignments': {
        fetchHandler: 'axios:getAllAssignmentsForCombined',
        deleteHandler: 'axios:deleteAssignments',
        description: 'Delete assignments not in any module',
        requiredParams: ['domain', 'token', 'courseId'],
        filters: {
            notInModules: true,
            includeGraded: false
        },
        needsFetch: true
    },
    'delete-assignments': {
        fetchHandler: 'axios:getAllAssignmentsForCombined',
        deleteHandler: 'axios:deleteAssignments',
        description: 'Delete assignments from a course',
        requiredParams: ['domain', 'token', 'courseId'],
        filters: {
            includeGraded: false
        },
        needsFetch: true
    },
    'delete-imported-assignments': {
        fetchHandler: 'axios:getAllAssignmentsForCombined',
        deleteHandler: 'axios:deleteAssignments',
        description: 'Delete assignments that were imported from a specific import',
        requiredParams: ['domain', 'token', 'courseId', 'importId'],
        filters: {
            fromImport: true,
            includeGraded: false
        },
        needsFetch: true,
        needsConfirmation: 'import-choice' // Special flag to prompt for import ID or all imports
    },
    'delete-all-imported-assignments': {
        fetchHandler: 'axios:getAllAssignmentsForCombined',
        deleteHandler: 'axios:deleteAssignments',
        description: 'Delete all assignments that were imported from any import',
        requiredParams: ['domain', 'token', 'courseId'],
        filters: {
            fromAllImports: true,
            includeGraded: false
        },
        needsFetch: true
    },
    'create-assignments': {
        handler: 'axios:createAssignments',
        description: 'Create assignments in a course',
        requiredParams: ['domain', 'token', 'courseId', 'number', 'name'],
        optionalParams: ['points', 'submissionTypes', 'publish', 'grade_type', 'peer_reviews', 'peer_review_count', 'anonymous', 'assignmentGroupId', 'assignment_group_id'],
        needsFetch: false
    },

    'get-empty-assignment-groups': {
        handler: 'axios:getEmptyAssignmentGroups',
        description: 'Get empty assignment groups in a course',
        requiredParams: ['domain', 'token', 'courseId'],
        needsFetch: false,
        isQuery: true
    },
    'create-assignments-in-empty-groups': {
        fetchHandler: 'axios:getEmptyAssignmentGroups',
        createHandler: 'axios:createAssignments',
        description: 'Create an assignment in each empty assignment group in a course',
        requiredParams: ['domain', 'token', 'courseId'],
        optionalParams: ['name', 'points', 'submissionTypes', 'publish', 'number'],
        needsFetch: true,
        isCreateInEach: true
    },

    // ==================== Assignment Group Operations ====================
    'delete-empty-assignment-groups': {
        fetchHandler: 'axios:getEmptyAssignmentGroups',
        deleteHandler: 'axios:deleteEmptyAssignmentGroups',
        description: 'Delete empty assignment groups from a course',
        requiredParams: ['domain', 'token', 'courseId'],
        needsFetch: true
    },
    'create-assignment-groups': {
        handler: 'axios:createAssignmentGroups',
        description: 'Create assignment groups in a course',
        requiredParams: ['domain', 'token', 'courseId', 'number'],
        optionalParams: ['prefix', 'name', 'groupPrefix', 'assignmentsPerGroup', 'assignments_per_group', 'assignmentName', 'assignment_name'],
        needsFetch: false
    },
    'delete-assignment-group-with-assignments': {
        handler: 'axios:deleteAssignmentGroupAssignments',
        description: 'Delete an assignment group and all its assignments',
        requiredParams: ['domain', 'token', 'courseId', 'groupId'],
        needsFetch: false
    },
    'delete-assignments-in-assignment-group': {
        fetchHandler: 'axios:getAllAssignmentsForCombined',
        deleteHandler: 'axios:deleteAssignments',
        description: 'Delete assignments in a specific assignment group',
        requiredParams: ['domain', 'token', 'courseId'],
        filters: {
            assignmentGroupId: true,
            includeGraded: false
        },
        needsFetch: true
    },
    'delete-assignments-not-in-group': {
        fetchHandler: 'axios:getAllAssignmentsForCombined',
        deleteHandler: 'axios:deleteAssignments',
        description: 'Delete all assignments NOT in a specific assignment group (keep only assignments in the group)',
        requiredParams: ['domain', 'token', 'courseId', 'keepGroupId'],
        filters: {
            notInGroupId: true,
            includeGraded: false
        },
        needsFetch: true
    },
    'move-assignments-to-group': {
        fetchHandler: 'axios:getAssignmentsToMove',
        moveHandler: 'axios:moveAssignmentsToSingleGroup',
        description: 'Move all assignments to a specific assignment group',
        requiredParams: ['domain', 'token', 'courseId', 'targetGroupId'],
        needsFetch: true,
        isMoveOperation: true
    },

    // ==================== Conversation Operations ====================
    'get-conversations': {
        handler: 'axios:getConvos',
        description: 'Get conversations by subject for a specific user',
        requiredParams: ['domain', 'token', 'userId', 'subject'],
        needsFetch: false
    },
    'delete-conversations': {
        fetchHandler: 'axios:getConvos',
        deleteHandler: 'axios:deleteConvos',
        description: 'Delete conversations with specific subject for a user',
        requiredParams: ['domain', 'token', 'userId', 'subject'],
        needsFetch: true
    },
    'get-deleted-conversations': {
        handler: 'axios:getDeletedConversations',
        description: 'Get deleted conversations for a user with optional date filters',
        requiredParams: ['domain', 'token'],
        optionalParams: ['userId', 'user_id', 'deletedAfter', 'deleted_after', 'deletedBefore', 'deleted_before'],
        needsFetch: false,
        isQuery: true
    },
    'restore-deleted-conversations': {
        handler: 'axios:restoreDeletedConversations',
        description: 'Restore deleted conversations',
        requiredParams: ['domain', 'token', 'conversations'],
        needsFetch: false
    },

    // ==================== Course Operations ====================
    'reset-course': {
        handler: 'axios:resetCourses',
        description: 'Reset course content',
        requiredParams: ['domain', 'token', 'courseId'],
        needsFetch: false
    },
    'restore-course-content': {
        handler: 'axios:restoreContent',
        description: 'Restore deleted course content by providing content type and IDs',
        requiredParams: ['domain', 'token', 'courseId', 'contentType', 'contentIds'],
        optionalParams: [],
        needsFetch: false
    },
    'create-associated-courses': {
        handler: 'axios:createAssociatedCourses',
        description: 'Create multiple courses and associate them with a blueprint course',
        requiredParams: ['domain', 'token', 'blueprintCourseId', 'numberOfCourses'],
        optionalParams: [],
        needsFetch: false
    },
    'create-support-course': {
        handler: 'axios:createSupportCourse',
        description: 'Create a support course with sample content',
        requiredParams: ['domain', 'token', 'accountId'],
        needsFetch: false
    },
    'create-course': {
        handler: 'axios:createBasicCourse',
        description: 'Create a new course with optional content (users, assignment groups, assignments, discussions, pages, modules, sections, quizzes)',
        requiredParams: ['domain', 'token'],
        optionalParams: [
            'courseName', 'courseCode', 'publish',
            'students', 'teachers', 'email',
            'assignmentGroups', 'assignmentsPerGroup', 'groupPrefix',
            'assignments', 'assignmentName',
            'discussions', 'discussionTitle',
            'pages', 'pageTitle',
            'modules', 'modulePrefix',
            'sections', 'sectionPrefix',
            'classicQuizzes', 'quizName', 'quizType', 'questionsPerQuiz', 'questionTypes'
        ],
        needsFetch: false
    },
    'create-basic-course': {
        handler: 'axios:createBasicCourse',
        description: 'Create a basic course',
        requiredParams: ['domain', 'token', 'accountId', 'courseName', 'courseCode'],
        needsFetch: false
    },
    'get-course-info': {
        handler: 'axios:getCourseInfo',
        description: 'Get course information',
        requiredParams: ['domain', 'token', 'courseId'],
        needsFetch: false
    },

    // ==================== Module Operations ====================
    'get-modules': {
        handler: 'axios:getModules',
        description: 'Get all modules in a course',
        requiredParams: ['domain', 'token', 'courseId'],
        needsFetch: false
    },
    'delete-modules': {
        fetchHandler: 'axios:getModules',
        deleteHandler: 'axios:deleteModules',
        description: 'Delete modules from a course',
        requiredParams: ['domain', 'token', 'courseId'],
        needsFetch: true
    },
    'create-modules': {
        handler: 'axios:createModules',
        description: 'Create modules in a course',
        requiredParams: ['domain', 'token', 'courseId', 'number', 'prefix'],
        optionalParams: ['name'],
        needsFetch: false
    },
    'relock-modules': {
        fetchHandler: 'axios:getModules',
        deleteHandler: 'axios:relockModules',
        description: 'Relock modules in a course',
        requiredParams: ['domain', 'token', 'courseId'],
        needsFetch: true
    },

    // ==================== Quiz Operations ====================
    'get-classic-quizzes': {
        handler: 'axios:getClassicQuizzes',
        description: 'Get classic quizzes in a course',
        requiredParams: ['domain', 'token', 'courseId'],
        needsFetch: false
    },
    'create-classic-quizzes': {
        handler: 'axios:createClassicQuizzes',
        description: 'Create classic quizzes in a course with optional questions',
        requiredParams: ['domain', 'token', 'courseId'],
        optionalParams: ['number', 'prefix', 'quizName', 'quizType', 'publish', 'questionsPerQuiz', 'questionTypes'],
        needsFetch: false
    },
    'delete-classic-quizzes': {
        handler: 'axios:deleteClassicQuizzes',
        description: 'Delete classic quizzes from a course',
        requiredParams: ['domain', 'token', 'courseId', 'quizzes'],
        needsFetch: false
    },
    'get-respondus-quizzes': {
        handler: 'axios:getRespondusQuizzes',
        description: 'Get Respondus-locked quizzes',
        requiredParams: ['domain', 'token', 'courseId'],
        needsFetch: false
    },
    'update-respondus-quizzes': {
        handler: 'axios:updateRespondusQuizzes',
        description: 'Update Respondus quiz settings',
        requiredParams: ['domain', 'token', 'courseId', 'quizzes'],
        needsFetch: false
    },
    'create-new-quizzes': {
        handler: 'axios:createNewQuizzes',
        description: 'Create new quizzes (Quiz LTI)',
        requiredParams: ['domain', 'token', 'courseId', 'number', 'prefix'],
        needsFetch: false
    },

    // ==================== Discussion Operations ====================
    'create-discussions': {
        handler: 'axios:createDiscussions',
        description: 'Create discussion topics in a course',
        requiredParams: ['domain', 'token', 'courseId', 'number', 'prefix'],
        optionalParams: ['message', 'published', 'threaded', 'delayed_post_at'],
        needsFetch: false
    },
    'delete-discussions': {
        handler: 'axios:deleteDiscussions',
        description: 'Delete discussions from a course',
        requiredParams: ['domain', 'token', 'courseId', 'discussions'],
        needsFetch: false
    },
    'create-announcements': {
        handler: 'axios:createAnnouncements',
        description: 'Create announcements in a course',
        requiredParams: ['domain', 'token', 'courseId', 'number', 'title'],
        optionalParams: ['message', 'delayed_post_at', 'lock_at'],
        needsFetch: false
    },
    'get-announcements': {
        handler: 'axios:getAnnouncements',
        description: 'Get announcements from a course',
        requiredParams: ['domain', 'token', 'courseId'],
        needsFetch: false
    },
    'delete-announcements': {
        handler: 'axios:deleteAnnouncementsGraphQL',
        description: 'Delete specific announcements from a course (requires announcement IDs)',
        requiredParams: ['domain', 'token', 'courseId', 'announcements'],
        needsFetch: false
    },
    'delete-all-announcements': {
        fetchHandler: 'axios:getAnnouncements',
        deleteHandler: 'axios:deleteAnnouncementsGraphQL',
        description: 'Delete all announcements from a course',
        requiredParams: ['domain', 'token', 'courseId'],
        filters: {},
        needsFetch: true
    },
    'delete-announcements-by-title': {
        fetchHandler: 'axios:getAnnouncements',
        deleteHandler: 'axios:deleteAnnouncementsGraphQL',
        description: 'Delete announcements matching a specific title',
        requiredParams: ['domain', 'token', 'courseId', 'titleFilter'],
        filters: {
            byTitle: true
        },
        needsFetch: true
    },

    // ==================== Page Operations ====================
    'create-pages': {
        handler: 'axios:createPages',
        description: 'Create pages in a course',
        requiredParams: ['domain', 'token', 'courseId', 'number', 'prefix'],
        optionalParams: ['body', 'published'],
        needsFetch: false
    },
    'delete-pages': {
        fetchHandler: 'axios:getPagesGraphQL',
        deleteHandler: 'axios:deletePages',
        description: 'Delete pages from a course',
        requiredParams: ['domain', 'token', 'courseId'],
        optionalParams: ['filter'], // 'all', 'unpublished', 'title_search', etc.
        needsFetch: true
    },

    // ==================== Section Operations ====================
    'create-sections': {
        handler: 'axios:createSections',
        description: 'Create sections in a course',
        requiredParams: ['domain', 'token', 'courseId', 'number', 'prefix'],
        needsFetch: false
    },

    // ==================== File & Folder Operations ====================
    'delete-attachments': {
        handler: 'axios:deleteAttachments',
        description: 'Delete file attachments from a course',
        requiredParams: ['domain', 'token', 'attachments'],
        needsFetch: false
    },
    'delete-folders': {
        handler: 'axios:deleteFolders',
        description: 'Delete folders from a course',
        requiredParams: ['domain', 'token', 'folders'],
        needsFetch: false
    },
    'get-folders-meta': {
        handler: 'axios:getFoldersMeta',
        description: 'Get folder metadata',
        requiredParams: ['domain', 'token', 'courseId'],
        needsFetch: false
    },

    // ==================== Group & Grading Operations ====================
    'delete-group-categories': {
        handler: 'axios:deleteGroupCategories',
        description: 'Delete group categories from a course',
        requiredParams: ['domain', 'token', 'courseId', 'categories'],
        needsFetch: false
    },
    'delete-grading-standards': {
        handler: 'axios:deleteGradingStandards',
        description: 'Delete grading standards from a course',
        requiredParams: ['domain', 'token', 'courseId', 'standards'],
        needsFetch: false
    },

    // ==================== Communication Channel Operations ====================
    'check-bounce': {
        handler: 'axios:bounceCheck',
        description: 'Check if an email address is bouncing',
        requiredParams: ['domain', 'token', 'email'],
        needsFetch: false
    },
    'check-comm-channel': {
        handler: 'axios:checkCommChannel',
        description: 'Check communication channel status',
        requiredParams: ['domain', 'token', 'userId'],
        needsFetch: false
    },
    'reset-comm-channel': {
        handler: 'axios:resetCommChannel',
        description: 'Reset communication channel for a user',
        requiredParams: ['domain', 'token', 'userId', 'channelId'],
        needsFetch: false
    },
    'check-unconfirmed-emails': {
        handler: 'axios:checkUnconfirmedEmails',
        description: 'Check for unconfirmed email addresses',
        requiredParams: ['domain', 'token', 'userIds'],
        needsFetch: false
    },
    'confirm-emails': {
        handler: 'axios:confirmEmails',
        description: 'Confirm email addresses for users',
        requiredParams: ['domain', 'token', 'users'],
        needsFetch: false
    },
    'reset-emails': {
        handler: 'axios:resetEmails',
        description: 'Reset email addresses for users',
        requiredParams: ['domain', 'token', 'users'],
        needsFetch: false
    },
    'reset-comm-channels-by-pattern': {
        handler: 'axios:resetCommChannelsByPattern',
        description: 'Reset communication channels matching a pattern',
        requiredParams: ['domain', 'token', 'pattern', 'userIds'],
        needsFetch: false
    },

    // ==================== Search Operations ====================
    'search-users': {
        handler: 'users:search',
        description: 'Search for users',
        requiredParams: ['domain', 'token', 'searchTerm'],
        needsFetch: false
    },
    'search-accounts': {
        handler: 'accounts:search',
        description: 'Search for accounts',
        requiredParams: ['domain', 'token', 'searchTerm'],
        needsFetch: false
    },
    'search-terms': {
        handler: 'terms:search',
        description: 'Search for terms',
        requiredParams: ['domain', 'token', 'searchTerm'],
        needsFetch: false
    },
    'search-sections': {
        handler: 'sections:search',
        description: 'Search for sections',
        requiredParams: ['domain', 'token', 'searchTerm'],
        needsFetch: false
    },
    'search-logins': {
        handler: 'logins:search',
        description: 'Search for user logins',
        requiredParams: ['domain', 'token', 'userId', 'idType'],
        needsFetch: false
    },
    'search-enrollments': {
        handler: 'enrollments:search',
        description: 'Search for enrollments',
        requiredParams: ['domain', 'token', 'searchType', 'id'],
        needsFetch: false
    },

    // ==================== Analytics Operations ====================
    'get-page-views': {
        handler: 'axios:getPageViews',
        description: 'Get page view analytics',
        requiredParams: ['domain', 'token', 'userId'],
        needsFetch: false
    },

    // ==================== Information Query Operations ====================
    'get-announcements-info': {
        handler: 'axios:getAnnouncements',
        description: 'Get information about announcements in a course (count, list, etc.)',
        requiredParams: ['domain', 'token', 'courseId'],
        needsFetch: false,
        isQuery: true
    },
    'get-assignments-info': {
        handler: 'axios:getAllAssignmentsForCombined',
        description: 'Get information about assignments in a course (count, list, etc.)',
        requiredParams: ['domain', 'token', 'courseId'],
        needsFetch: false,
        isQuery: true
    },
    'get-modules-info': {
        handler: 'axios:getModules',
        description: 'Get information about modules in a course (count, list, etc.)',
        requiredParams: ['domain', 'token', 'courseId'],
        needsFetch: false,
        isQuery: true
    },
    'get-assignment-groups-info': {
        handler: 'axios:getAssignmentGroups',
        description: 'Get information about assignment groups in a course (count, list, etc.)',
        requiredParams: ['domain', 'token', 'courseId'],
        needsFetch: false,
        isQuery: true
    },
    'get-course-info': {
        handler: 'axios:getCourseInfo',
        description: 'Get detailed information about a course',
        requiredParams: ['domain', 'token', 'courseId'],
        needsFetch: false,
        isQuery: true
    },

    // ==================== Notification Operations ====================
    'update-notifications': {
        handler: 'axios:updateNotifications',
        description: 'Update notification preferences',
        requiredParams: ['domain', 'token', 'userId', 'notifications'],
        needsFetch: false
    }
};

function registerAIAssistantHandlers() {

    // Parse user intent using AI
    ipcMain.handle('ai-assistant:parseIntent', async (event, { prompt, model }) => {
        try {
            const provider = model.includes('gpt') ? 'openai' : 'anthropic';
            const apiKey = getDecryptedKey(provider);

            if (!apiKey) {
                const providerName = provider === 'openai' ? 'OpenAI' : 'Anthropic';
                throw new Error(`API Key missing for ${providerName}. Please configure your ${providerName} API key in the HAR Analyzer settings before using the AI Assistant.`);
            }

            const systemPrompt = `You are a Canvas LMS operations assistant. Parse user requests into structured actions.

Available operations:
${Object.entries(OPERATION_MAP).map(([key, op]) => `- ${key}: ${op.description}`).join('\n')}

Extract:
1. operation: The operation key from the list above (single-step requests)
    - For multi-step requests, omit operation and instead return "steps" (see below)
2. domain: Canvas domain (e.g., "school.instructure.com")
3. courseId: Course ID from URL (e.g., "6986" from "/courses/6986")
4. importId: Import/migration ID if the user specifies "from import X" or "migration ID X"
5. filters: Any conditions (unpublished, no_submissions, by_subject, etc.)
6. For CREATE operations, also extract:
   - number: How many items to create (default 1 if not specified)
   - name: Base name/prefix for items
   - points: Point value (default 0)
   - submissionTypes: Array like ["online_upload"], ["online_text_entry"], etc.
   - publish: true/false (default false)
7. For INFORMATION/QUERY operations (get-*-info), extract:
   - queryType: What information the user wants (e.g., "count", "list", "details")
   - Set operation to the appropriate get-*-info operation
   - These operations fetch data and return it to the user without modifying anything
8. summary: Human-readable description of what will be done
9. warnings: Any potential issues or confirmations needed

=== COURSE OPERATIONS ===
Supported course operations:

1. reset-course: Reset course content to default state
   - Required: courseId
   - Removes all content from a course

2. restore-course-content: Restore deleted course content
   - Required: courseId, contentType, contentIds
   - contentType values: "assignment_", "assignment_group_", "discussion_topic_", "quiz_", "wiki_page_", "context_module_", "rubric_", "group_", "group_category_"
   - contentIds: comma-separated IDs or array of IDs to restore

3. create-associated-courses: Create multiple courses and associate them with a blueprint course
   - Required: blueprintCourseId, numberOfCourses
   - Creates the specified number of courses and associates them with the blueprint

4. get-course-info: Get information about a course
   - Required: courseId
   - Returns course details including whether it's a blueprint

Course operation examples:
- "Reset course 123"
    -> operation: "reset-course", courseId: "123"
- "Restore assignments 456, 789 in course 123"
    -> operation: "restore-course-content", courseId: "123", contentType: "assignment_", contentIds: ["456", "789"]
- "Restore module 555 in course 123"
    -> operation: "restore-course-content", courseId: "123", contentType: "context_module_", contentIds: ["555"]
- "Create 5 associated courses for blueprint course 100"
    -> operation: "create-associated-courses", blueprintCourseId: "100", numberOfCourses: 5
- "Get info for course 123"
    -> operation: "get-course-info", courseId: "123"

=== COMPREHENSIVE COURSE CREATION ===
When user wants to create a course WITH content (users, assignments, discussions, etc.), use the single "create-course" operation with all parameters.

IMPORTANT: Do NOT use multi-step for course creation with content. Use the SINGLE "create-course" operation with these parameters:
- courseName: Name of the course (required)
- publish: true/false (default false)
- students: Number of students to create and enroll (requires email parameter)
- teachers: Number of teachers to create and enroll (requires email parameter)
- email: Your email address prefix for generating test users (e.g., "jsmith" from "jsmith@instructure.com")
- assignmentGroups: Number of assignment groups to create
- assignmentsPerGroup: Number of assignments per group (default 1 if assignmentGroups specified)
- groupPrefix: Prefix for assignment group names (default "Assignment Group")
- assignments: Number of standalone assignments (outside groups)
- assignmentName: Name prefix for assignments
- discussions: Number of discussions to create
- discussionTitle: Title prefix for discussions
- pages: Number of pages to create
- pageTitle: Title prefix for pages
- modules: Number of modules to create
- modulePrefix: Prefix for module names
- sections: Number of sections to create
- sectionPrefix: Prefix for section names

Examples:
- "Create a course named 'Test Course' with 3 students, 5 assignment groups with 2 assignments each, and 10 modules"
  -> operation: "create-course", parameters: { 
       courseName: "Test Course", 
       students: 3, 
       email: (ask user for email if not provided),
       assignmentGroups: 5, 
       assignmentsPerGroup: 2, 
       modules: 10 
     }

- "Create a course with 1 discussion, 1 page, and 3 sections"
  -> operation: "create-course", parameters: { 
       discussions: 1, 
       pages: 1, 
       sections: 3 
     }

- "Create course 'My Course' with 2 teachers, 5 students, 10 modules and 3 sections"
  -> operation: "create-course", parameters: { 
       courseName: "My Course", 
       teachers: 2, 
       students: 5, 
       modules: 10, 
       sections: 3 
     }

=== MULTI-STEP PARSING ===
If the user asks for multiple actions in sequence that CANNOT be combined into create-course, return a "steps" array.

IMPORTANT: For creating assignment groups WITH assignments in each group, use the SINGLE operation "create-assignment-groups" with "assignmentsPerGroup" parameter - do NOT use multi-step for this common case.

Example: "Create 10 assignment groups with 2 assignments each in course 123"
-> Single operation: { "operation": "create-assignment-groups", "parameters": { "number": 10, "assignmentsPerGroup": 2, "courseId": "123", ... } }

Only use multi-step when operations are truly sequential and independent (e.g., creating a course and then doing something that requires the course ID in a separate context):
"steps": [
    { "operation": "create-course", "parameters": { "accountId": "1", "courseName": "My Course", "courseCode": "MC101" } },
    { "operation": "create-assignment-groups", "parameters": { "courseId": "{{steps.0.result.course.id}}", "number": 10, "assignmentsPerGroup": 2 } }
]

Use "summary" to describe the overall workflow.
If a later step needs data from an earlier step, you may reference template tokens like:
- "{{steps.0.result.course.id}}" - course ID from step 0
- "{{steps.0.result.course_id}}" - alternative course ID path
- "{{steps.1.result.groupIds}}" - array of group IDs from step 1
You may also use "forEach" to repeat a step for a list (e.g., for each group ID):
{ "operation": "create-assignments", "forEach": "groupIds", "parameters": { "assignment_group_id": "{{item}}", ... } }

For conversation operations:
- Extract userId: Canvas user ID for the sender (e.g., "user 123")
- Extract subject: exact subject text to match (case-sensitive, must be exact)

=== CONVERSATION OPERATIONS ===
Supported conversation operations:

1. get-conversations: Search for conversations by subject for a specific user
   - Required: userId, subject
   - Returns conversations matching the exact subject text

2. delete-conversations: Delete conversations with a specific subject
   - Required: userId, subject
   - Searches for sent conversations and deletes them for all recipients

3. get-deleted-conversations: Retrieve deleted conversations
   - Required: domain, token
   - Optional: userId (to filter by specific user), deletedAfter (ISO date), deletedBefore (ISO date)
   - Returns deleted conversations, optionally filtered by date range

4. restore-deleted-conversations: Restore previously deleted conversations
   - Required: conversations (array of conversation objects with message_id, user_id, conversation_id)
   - This is typically used with data from a file upload (CSV/JSON)

Conversation examples:
- "Delete all messages sent by user 123 with subject 'Test Message'"
    -> operation: "delete-conversations", userId: "123", subject: "Test Message"
- "Find conversations from user 456 with subject 'Hello'"
    -> operation: "get-conversations", userId: "456", subject: "Hello"
- "Get deleted conversations for user 789"
    -> operation: "get-deleted-conversations", userId: "789"
- "Get deleted conversations deleted after January 1, 2024"
    -> operation: "get-deleted-conversations", deletedAfter: "2024-01-01"
- "Show me deleted messages from user 123 between March 1 and March 15, 2024"
    -> operation: "get-deleted-conversations", userId: "123", deletedAfter: "2024-03-01", deletedBefore: "2024-03-15"

=== INFORMATION QUERY PARSING ===
When users ask questions about course content, use the appropriate get-*-info operation:

Query patterns to recognize:
- "How many [items] in/are in [course]" -> get-[items]-info with queryType: "count"
- "How many [filter] [items]" -> get-[items]-info with queryType: "count" and appropriate filters
- "List [items] in [course]" -> get-[items]-info with queryType: "list"
- "List [filter] [items]" -> get-[items]-info with queryType: "list" and appropriate filters
- "Show me [items] from [course]" -> get-[items]-info with queryType: "list"
- "What [items] are in [course]" -> get-[items]-info with queryType: "list"
- "Get information about [course]" -> get-course-info with queryType: "details"

Supported info operations:
- get-announcements-info: For questions about announcements
- get-assignments-info: For questions about assignments (supports filters: unpublished, published, no submissions, etc.)
- get-modules-info: For questions about modules
- get-assignment-groups-info: For questions about assignment groups (supports filters: empty)
- get-course-info: For general course information

IMPORTANT: Extract filter conditions for info queries:
For assignment queries, detect these filter keywords:
- "unpublished" -> add filters: { unpublished: true }
- "published" -> add filters: { published: true }
- "no submissions" or "without submissions" -> add filters: { noSubmissions: true }
- "no due date" or "without due date" -> add filters: { noDueDate: true }
- "not in modules" -> add filters: { notInModules: true }

For assignment group queries, detect:
- "empty" or "with no assignments" -> add filters: { empty: true }

For deleting assignments in a specific assignment group by name:
- Extract groupName (exact name inside quotes if provided)
- Use delete-assignments-in-assignment-group operation

For announcement queries, detect:
- "titled [X]" or "named [X]" -> add titleFilter parameter

Examples:
- "How many announcements are in https://school.com/courses/123?"
  -> operation: "get-announcements-info", queryType: "count"
- "How many unpublished assignments are in course 456"
  -> operation: "get-assignments-info", queryType: "count", filters: { unpublished: true }
- "List all published assignments in course 456"
  -> operation: "get-assignments-info", queryType: "list", filters: { published: true }
- "Show me assignments with no submissions from course 789"
  -> operation: "get-assignments-info", queryType: "list", filters: { noSubmissions: true }
- "How many assignment groups are in course 123?"
  -> operation: "get-assignment-groups-info", queryType: "count"
- "How many empty assignment groups are in course 123?"
  -> operation: "get-assignment-groups-info", queryType: "count", filters: { empty: true }
- "List assignment groups in course 456"
  -> operation: "get-assignment-groups-info", queryType: "list"
- "How many announcements titled 'Test' are in course 123?"
  -> operation: "get-announcements-info", queryType: "count", titleFilter: "Test"

Assignment group example:
- "Delete all assignments in the 'Assignments #2' assignment group from https://school.com/courses/123"
    -> operation: "delete-assignments-in-assignment-group", groupName: "Assignments #2"

=== MOVE ASSIGNMENTS TO A SINGLE GROUP ===
When user wants to move all assignments to a specific assignment group:
- Use operation: "move-assignments-to-group"
- Required: targetGroupId - the assignment group ID to move assignments to
- This moves all assignments in the course to the specified group

Examples:
- "Move all assignments to assignment group 12345 in course 123"
    -> operation: "move-assignments-to-group", targetGroupId: "12345"
- "Move all assignments in https://school.com/courses/123 to group 67890"
    -> operation: "move-assignments-to-group", targetGroupId: "67890"
- "Consolidate all assignments into assignment group 54321 in course 456"
    -> operation: "move-assignments-to-group", targetGroupId: "54321"

=== KEEP ONLY ASSIGNMENTS IN A SPECIFIC GROUP ===
When user wants to delete all assignments EXCEPT those in a specific group:
- Use operation: "delete-assignments-not-in-group"
- Required: keepGroupId - the assignment group ID to keep (delete all others)
- This deletes assignments NOT in the specified group

Examples:
- "Delete all assignments except those in group 12345 from course 123"
    -> operation: "delete-assignments-not-in-group", keepGroupId: "12345"
- "Keep only assignments in assignment group 67890, delete the rest from course 456"
    -> operation: "delete-assignments-not-in-group", keepGroupId: "67890"
- "Remove all assignments not in the 'Final Exams' group from https://school.com/courses/123"
    -> operation: "delete-assignments-not-in-group", groupName: "Final Exams"

=== CREATING ASSIGNMENTS IN EMPTY GROUPS ===
When user wants to create assignment(s) in every empty assignment group:
- Use operation: "create-assignments-in-empty-groups"
- This automatically finds all empty groups and creates assignment(s) in each
- Parameters: name (assignment name), number (assignments per group, default 1), points, submissionTypes, publish

Examples:
- "Create an assignment in every empty assignment group in course 123"
    -> operation: "create-assignments-in-empty-groups", number: 1
- "Add 2 assignments to each empty group in https://school.com/courses/456"
    -> operation: "create-assignments-in-empty-groups", number: 2
- "Fill empty assignment groups with assignments named 'Placeholder' in course 789"
    -> operation: "create-assignments-in-empty-groups", name: "Placeholder"

For creating assignment groups AND assignments in each group:
- Use operation "create-assignment-groups"
- Set number to the number of groups
- Set assignmentsPerGroup to how many assignments to create per group
- Use groupPrefix (or prefix/name) for group naming
- Use assignmentName for the assignments' base name

   - publish: true/false (default false)
7. summary: Human-readable description of what will be done
8. warnings: Any potential issues or confirmations needed

Common submission types:
- "online_upload" = file upload
- "online_text_entry" = text entry
- "online_url" = website URL
- "on_paper" = on paper
- "external_tool" = external tool

=== ASSIGNMENT CREATION PARSING ===
For create-assignments operation, extract these parameters:
- name: Assignment name/title (required)
- number: How many assignments to create (default 1)
- points: Point value for the assignment (default 0)
- submissionTypes: Array of submission types (default ["online_upload"])
  * "online_upload" = file upload
  * "online_text_entry" = text entry  
  * "online_url" = website URL
  * "on_paper" = on paper
  * "external_tool" = external tool
- publish: true/false - whether to publish the assignment (default false)
- grade_type: Grading type - "points", "percent", "pass_fail", "letter_grade", "gpa_scale", "not_graded" (default "points")
- peer_reviews: true/false - enable peer reviews (default false)
- peer_review_count: Number of peer reviews required per student (only if peer_reviews is true)
- anonymous: true/false - enable anonymous grading (default false)
- assignmentGroupId: ID of the assignment group to place the assignment in

Examples:
- "Create 5 assignments named 'Homework' worth 10 points each in course 123"
    -> operation: "create-assignments", name: "Homework", number: 5, points: 10
- "Create an assignment called 'Essay' with text entry submission in course 456"
    -> operation: "create-assignments", name: "Essay", submissionTypes: ["online_text_entry"]
- "Create a peer review assignment with 3 reviews per student named 'Peer Review Essay' in course 789"
    -> operation: "create-assignments", name: "Peer Review Essay", peer_reviews: true, peer_review_count: 3
- "Create an assignment with anonymous grading called 'Final Exam' worth 100 points"
    -> operation: "create-assignments", name: "Final Exam", points: 100, anonymous: true
- "Create a pass/fail assignment named 'Attendance' that accepts on paper submissions"
    -> operation: "create-assignments", name: "Attendance", grade_type: "pass_fail", submissionTypes: ["on_paper"]

=== ANNOUNCEMENT CREATION PARSING ===
For create-announcements operation, extract these parameters:
- title: The announcement title/name. Look for phrases like:
  * "titled X", "called X", "named X", 'announcement "X"', "title: X"
  * If only body is provided without title, use a generic title like "Announcement"
  * For MULTIPLE announcements (number > 1):
    - If user wants varied/random/unique titles: set generateTitles to true
    - AI will generate unique titles inspired by the message content
    - If user specifies a base title like "Week Update", use that as titleBase
- generateTitles: Set to true when:
  * User asks for "different titles", "random titles", "unique titles", "varied titles"
  * Creating multiple announcements (number > 1) without a specific repeated title pattern
  * User wants creative/diverse announcement names
- titleBase: Optional base/theme for title generation (e.g., "Weekly Update", "Class Reminder")
  * Extracted from phrases like "based on X", "themed around X", "about X"
  * Used as inspiration when generateTitles is true
- message: The announcement body/content. Look for phrases like:
  * "with message X", "saying X", "with body X", "body: X", "message: X"
  * "with the message", "letting students know", "explaining X"
  * Content in quotes after the title is usually the message
- delayed_post_at: When to publish the announcement (ISO 8601 format). Look for:
  * "delay posting until", "delay until", "schedule for", "post on"
  * "set to appear on", "should go live on", "scheduled for"
  * Convert dates to ISO format (e.g., "March 1, 2024" -> "2024-03-01T00:00:00Z")
- lock_at: When to lock the announcement (ISO 8601 format). Look for:
  * "lock on", "lock it on", "lock after", "lock date"
  * "locked on", "locks on"
  * Convert dates to ISO format

Date format examples to recognize:
- "March 15, 2024" or "March 15th, 2024" -> "2024-03-15T00:00:00Z"
- "03/15/2024" or "3/15/2024" -> "2024-03-15T00:00:00Z"
- "Jan 25, 2024" -> "2024-01-25T00:00:00Z"
- "February 20th" (assume current year if not specified)

Announcement prompt examples:
- "Create announcement 'Midterm Exam' for https://school.com/courses/123 with message 'Exam on March 15th'"
  -> title: "Midterm Exam", message: "Exam on March 15th", number: 1
- "Add announcement to course 123 titled 'Lab Safety' saying 'Review protocols before lab'"
  -> title: "Lab Safety", message: "Review protocols before lab", number: 1
- "Post 'Office Hours Update' to course 456, delay until March 1, lock on March 15"
  -> title: "Office Hours Update", delayed_post_at: ISO date, lock_at: ISO date
- "Create 5 announcements named 'Weekly Update' in course 789"
  -> title: "Weekly Update", number: 5
- "Create 11 announcements with different titles about exam prep"
  -> number: 11, generateTitles: true, titleBase: "exam prep"
- "Make 10 unique announcements saying 'Class cancelled today'"
  -> number: 10, generateTitles: true, message: "Class cancelled today"

=== ANNOUNCEMENT DELETION PARSING ===
For announcement deletion operations, extract these parameters:
- titleFilter: The title/name to match for delete-announcements-by-title. Look for:
  * "delete announcements titled X", "delete announcements named X"
  * "remove announcements called X", "delete announcement 'X'"
  * "delete all announcements with title X"
  * Case-insensitive partial matching (e.g., "test" matches "Test Announcement")

Deletion operation selection:
1. delete-all-announcements: Use when user wants to delete ALL announcements
   * "delete all announcements", "remove all announcements"
   * "clear all announcements", "delete every announcement"
   * No title filter specified

2. delete-announcements-by-title: Use when user specifies a title/name to match
   * "delete announcements titled X", "delete announcements named X"
   * "remove announcements called X", "delete announcement 'X'"
   * "delete announcements with title X"
   * Set titleFilter parameter to the extracted title

3. delete-announcements: Use when user provides specific announcement IDs
   * "delete announcement ID 12345", "remove announcements 123, 456"
   * This is rare - most users will use title-based or all deletion
   * Set announcements parameter to array of IDs

Announcement deletion examples:
- "Delete all announcements from https://school.com/courses/123"
  -> operation: "delete-all-announcements", no titleFilter
- "Remove announcements titled 'Test' from course 456"
  -> operation: "delete-announcements-by-title", titleFilter: "Test"
- "Delete announcements named 'Weekly Update' in course 789"
  -> operation: "delete-announcements-by-title", titleFilter: "Weekly Update"
- "Clear all announcements from my course 999"
  -> operation: "delete-all-announcements", no titleFilter

=== DISCUSSION CREATION PARSING ===
For create-discussions operation, extract these parameters:
- prefix: The discussion title prefix/name (required). Look for phrases like:
  * "titled X", "called X", "named X", 'discussion "X"', "title: X"
  * Numbers are appended automatically (e.g., "Week Discussion" -> "Week Discussion 1", "Week Discussion 2")
- number: How many discussions to create (default 1)
- message: The discussion body/prompt text (optional). Look for:
  * "with message X", "with body X", "with prompt X"
  * "saying X", "asking X", "about X"
- published: true/false - whether to publish immediately (default true)
  * Look for "unpublished", "draft", "not published" -> false
  * Look for "published", "visible" -> true
- threaded: true/false - whether to enable threaded replies (default true)
  * Look for "threaded", "allow replies" -> true
  * Look for "focused", "non-threaded", "side comment" -> false
- delayed_post_at: When to post the discussion (ISO 8601 format). Look for:
  * "delay until", "schedule for", "post on", "available on"
  * Convert dates to ISO format (e.g., "March 1, 2024" -> "2024-03-01T00:00:00Z")

Discussion creation examples:
- "Create 5 discussions named 'Week Discussion' in course 123"
  -> operation: "create-discussions", prefix: "Week Discussion", number: 5
- "Create a discussion titled 'Introduce Yourself' with message 'Share your background'"
  -> operation: "create-discussions", prefix: "Introduce Yourself", number: 1, message: "Share your background"
- "Create 3 unpublished discussions called 'Draft Discussion' in course 456"
  -> operation: "create-discussions", prefix: "Draft Discussion", number: 3, published: false
- "Create discussion 'Final Project Discussion' scheduled for March 15, 2024"
  -> operation: "create-discussions", prefix: "Final Project Discussion", delayed_post_at: "2024-03-15T00:00:00Z"
- "Create a focused (non-threaded) discussion named 'Q&A Session'"
  -> operation: "create-discussions", prefix: "Q&A Session", threaded: false

IMPORTANT: For import-related assignments:
- If user asks to delete "imported assignments" or "assignments from an/the import" WITHOUT specifying an import ID:
  * Set operation to "delete-imported-assignments"
  * Set confidence to 0.5
  * Set needsImportChoice to true
  * Add to summary: "This will prompt you to choose between a specific import ID or all imports"
- If user specifies a specific import ID (e.g., "from import 12345"):
  * Set operation to "delete-imported-assignments"
  * Include importId in parameters
  * Set confidence normally
- If user explicitly says "from all imports" or "from every import":
  * Set operation to "delete-all-imported-assignments"
  * Set confidence normally

=== MODULE OPERATIONS PARSING ===
For module operations, extract these parameters:
- number: How many modules to create (default 1)
- prefix: Base name for modules (default "Module")
  * "create 5 modules" -> prefix="Module"
  * "create 3 modules named 'Week'" -> prefix="Week"
- filters: { empty: true } for "delete empty modules"
  * Set this when user says "delete empty modules", "remove empty modules", etc.

Module examples:
- "Create 5 modules in course 123"
  -> operation: "create-modules", number: 5, prefix: "Module"
- "Create 10 modules named 'Unit' in course 456"
  -> operation: "create-modules", number: 10, prefix: "Unit"
- "Delete all empty modules from course 789"
  -> operation: "delete-modules", filters: { empty: true }
- "Relock modules in course 123"
  -> operation: "relock-modules"
- "Count modules in course 123"
  -> operation: "get-modules", queryType: "count"

=== PAGE OPERATIONS PARSING ===

For create-pages operation, extract these parameters:
- prefix: The page title prefix/name (required). Look for phrases like:
  * "titled X", "called X", "named X", 'page "X"', "title: X"
  * Numbers are appended automatically (e.g., "Page 1", "Page 2")
- number: How many pages to create (default 1)
- body: The page content/HTML (optional). Look for:
  * "with content X", "with body X", "saying X"
- published: true/false - whether to publish immediately (default true)
  * Look for "unpublished", "draft" -> false

For delete-pages operation, extract specific filters into the "filter" parameter:
- "unpublished": Use when user asks to delete "unpublished" or "draft" pages
  -> filter: "unpublished"
- "published": Use when user asks to delete "published" pages
  -> filter: "published"
- "all": Use when user asks to delete "all" pages (CAUTION)
  -> filter: "all"
- Date filters:
  * "created before [date]" -> filter: "created_before:YYYY-MM-DD"
  * "created after [date]" -> filter: "created_after:YYYY-MM-DD"
- Title search:
  * "title containing 'X'", "with title 'X'", "matching 'X'" -> filter: "title_search:X"

Page operation examples:
- "Create 5 pages in course 123"
  -> operation: "create-pages", number: 5, prefix: "Page"
- "Create a page called 'Welcome' with content '<h1>Hello</h1>'"
  -> operation: "create-pages", number: 1, prefix: "Welcome", body: "<h1>Hello</h1>"
- "Create 3 unpublished pages named 'Draft'"
  -> operation: "create-pages", number: 3, prefix: "Draft", published: false
- "Delete all unpublished pages in course 123"
  -> operation: "delete-pages", filter: "unpublished"
- "Delete pages created before 2024-01-01 in course 456"
  -> operation: "delete-pages", filter: "created_before:2024-01-01"
- "Delete pages with title containing 'Syllabus' in course 789"
  -> operation: "delete-pages", filter: "title_search:Syllabus"

Respond ONLY with valid JSON in this exact format:
{
  "operation": "operation-key",
  "needsImportChoice": true,
    "steps": [
        {
            "operation": "operation-key",
            "forEach": "optionalContextArrayName",
            "parameters": { "domain": "..." }
        }
    ],
  "parameters": {
    "domain": "extracted-domain",
    "courseId": "extracted-id",
        "userId": "canvas-user-id",
        "groupName": "assignment group name",
        "assignmentGroupId": "optional assignment group id",
        "targetGroupId": "target group ID for move operations",
        "keepGroupId": "group ID to keep when deleting others",
        "blueprintCourseId": "blueprint course ID for associated courses",
        "numberOfCourses": "number of courses to create",
        "contentType": "content type prefix for restore (e.g., assignment_, context_module_)",
        "contentIds": ["id1", "id2"],
    "importId": "12345",
    "number": 10,
    "assignmentsPerGroup": 2,
    "groupPrefix": "Assignment Group",
    "assignmentName": "Assignment",
    "name": "Assignment Name",
    "title": "Announcement Title",
    "generateTitles": true,
    "titleBase": "optional theme/base for title generation",
    "message": "Announcement body content",
    "delayed_post_at": "2024-03-01T00:00:00Z",
    "lock_at": "2024-03-15T00:00:00Z",
    "points": 10,
    "submissionTypes": ["online_upload"],
    "publish": false,
    "subject": "exact conversation subject text",
    "deletedAfter": "2024-01-01 (date filter for deleted conversations)",
    "deletedBefore": "2024-12-31 (date filter for deleted conversations)",
    "queryType": "count or list or details (for info operations)",
    "filters": { "unpublished": true, "noSubmissions": true },
    "titleFilter": "optional title filter for announcements"
  },
  "summary": "Clear description of the action",
  "warnings": ["Warning 1", "Warning 2"],
  "confidence": 0.0-1.0
}

Note: For announcements, use "title" (not "name") and include "message", "delayed_post_at", "lock_at" as needed.
Set generateTitles to true when creating multiple announcements with varied/unique titles.
For information queries (get-*-info operations), include queryType parameter and filters object when applicable.
For conversation operations, use "subject" for exact subject matching (case-sensitive) and include date filters when querying deleted conversations.

If the request is unclear or unsupported, set confidence to 0 and explain in summary.`;

            let responseText = '';

            if (provider === 'openai') {
                const openai = new OpenAI({ apiKey });
                // Map model identifier to actual API model name
                const modelMap = {
                    'gpt-5-nano': 'gpt-5-nano',
                    'gpt-5.2': 'gpt-5.2',
                    'gpt-4o': 'gpt-4o'
                };
                const apiModel = modelMap[model] || 'gpt-4o';
                const completion = await openai.chat.completions.create({
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: prompt }
                    ],
                    model: apiModel,
                    response_format: { type: "json_object" }
                });
                responseText = completion.choices[0].message.content;
            } else {
                const anthropic = new Anthropic({ apiKey });
                // Map model identifier to actual API model name
                const modelMap = {
                    'claude-sonnet-4.5': 'claude-sonnet-4-5-20250929',
                    'claude-haiku-4.5': 'claude-haiku-4-5-20251001'
                };
                const apiModel = modelMap[model] || 'claude-sonnet-4-5-20250929';
                const msg = await anthropic.messages.create({
                    model: apiModel,
                    max_tokens: 2048,
                    messages: [{
                        role: "user",
                        content: `${systemPrompt}\n\nUser request: ${prompt}`
                    }]
                });
                responseText = msg.content[0].text;
            }

            // Strip markdown code blocks if present (```json ... ```)
            let cleanedText = responseText.trim();
            if (cleanedText.startsWith('```')) {
                // Remove opening fence (```json or ```)
                cleanedText = cleanedText.replace(/^```[a-z]*\n?/, '');
                // Remove closing fence (```)
                cleanedText = cleanedText.replace(/\n?```$/, '');
            }

            // Parse and validate the response
            let parsed;
            try {
                parsed = JSON.parse(cleanedText);
            } catch (parseError) {
                // Attempt to extract the first JSON object from mixed content
                const firstBrace = cleanedText.indexOf('{');
                const lastBrace = cleanedText.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                    const jsonSlice = cleanedText.slice(firstBrace, lastBrace + 1);
                    parsed = JSON.parse(jsonSlice);
                } else {
                    throw parseError;
                }
            }

            // Preserve exact subject (including whitespace) for conversation operations
            if (parsed?.operation && parsed.operation.includes('conversation')) {
                const exactSubject = extractSubjectFromPrompt(prompt);
                if (exactSubject !== null) {
                    parsed.parameters = parsed.parameters || {};
                    parsed.parameters.subject = exactSubject;
                }
            }

            if (parsed?.parameters) {
                const normalizedDomain = normalizeDomain(parsed.parameters.domain || extractDomainFromPrompt(prompt));
                if (normalizedDomain) {
                    parsed.parameters.domain = normalizedDomain;
                }

                if (!parsed.parameters.courseId) {
                    const courseId = extractCourseIdFromPrompt(prompt);
                    if (courseId) {
                        parsed.parameters.courseId = courseId;
                    }
                }

                if ((parsed.operation === 'delete-assignments-in-assignment-group' || parsed.operation === 'delete-assignment-group-with-assignments')
                    && !parsed.parameters.groupName
                    && !parsed.parameters.assignmentGroupName
                    && !parsed.parameters.assignmentGroupId
                    && !parsed.parameters.groupId
                    && !parsed.parameters.group_id) {
                    const groupName = extractAssignmentGroupNameFromPrompt(prompt);
                    if (groupName) {
                        parsed.parameters.groupName = groupName;
                    }
                }
            }

            // Handle multi-step responses
            if (Array.isArray(parsed.steps) && parsed.steps.length > 0) {
                const fallbackDomain = normalizeDomain(parsed?.parameters?.domain || extractDomainFromPrompt(prompt));
                const fallbackCourseId = parsed?.parameters?.courseId || extractCourseIdFromPrompt(prompt);

                parsed.steps = parsed.steps.map((step, index) => {
                    const stepOp = step.operation;
                    if (!stepOp || !OPERATION_MAP[stepOp]) {
                        throw new Error(`Unknown operation in steps[${index}]`);
                    }
                    const stepParams = step.parameters || {};

                    const normalizedDomain = normalizeDomain(stepParams.domain || fallbackDomain);
                    if (normalizedDomain) stepParams.domain = normalizedDomain;

                    if (!stepParams.courseId) {
                        const courseId = stepParams.course_id || fallbackCourseId;
                        if (courseId) stepParams.courseId = courseId;
                    }

                    return {
                        ...step,
                        parameters: stepParams,
                        operationInfo: OPERATION_MAP[stepOp]
                    };
                });

                parsed.operation = 'multi-step';
                parsed.operationInfo = { description: 'Multi-step workflow' };
            } else {
                // Validate operation exists
                if (parsed.operation && !OPERATION_MAP[parsed.operation]) {
                    return {
                        success: false,
                        error: 'Unknown operation',
                        parsed
                    };
                }

                // Add operation metadata
                if (parsed.operation && OPERATION_MAP[parsed.operation]) {
                    parsed.operationInfo = OPERATION_MAP[parsed.operation];
                }
            }

            return {
                success: true,
                parsed
            };

        } catch (error) {
            console.error('AI Assistant Parse Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    });

    // Get operation details for preview
    ipcMain.handle('ai-assistant:getOperationDetails', async (event, { operation, parameters }) => {
        try {
            const opInfo = OPERATION_MAP[operation];
            if (!opInfo) {
                throw new Error('Unknown operation');
            }

            // Validate required parameters
            const missingParams = opInfo.requiredParams.filter(param => {
                if (param === 'userId') {
                    return !(parameters.userId || parameters.user_id);
                }
                if (param === 'groupId') {
                    return !(parameters.groupId || parameters.group_id || parameters.assignmentGroupId || parameters.groupName || parameters.assignmentGroupName);
                }
                return !parameters[param];
            });
            if (missingParams.length > 0) {
                return {
                    success: false,
                    error: `Missing required parameters: ${missingParams.join(', ')}`
                };
            }

            if (operation === 'delete-assignments-in-assignment-group') {
                const hasGroup = parameters.groupName || parameters.assignmentGroupName || parameters.assignmentGroupId || parameters.groupId || parameters.group_id;
                if (!hasGroup) {
                    return {
                        success: false,
                        error: 'Missing assignment group name or ID.'
                    };
                }
            }

            return {
                success: true,
                operation: opInfo,
                parameters
            };

        } catch (error) {
            console.error('Get Operation Details Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    });

    // Fetch items for confirmation (pre-execution step)
    ipcMain.handle('ai-assistant:fetchItems', async (event, { operation, parameters, token }) => {
        try {
            const opInfo = OPERATION_MAP[operation];
            if (!opInfo) {
                throw new Error('Unknown operation');
            }

            if (!opInfo.needsFetch) {
                return {
                    success: true,
                    needsConfirmation: false
                };
            }

            const fullParams = { ...parameters, token };

            if (operation === 'delete-assignments-in-assignment-group') {
                const { id: resolvedGroupId, groups } = await resolveAssignmentGroupId(fullParams, event);
                if (!resolvedGroupId) {
                    return {
                        success: true,
                        needsGroupChoice: true,
                        groupName: fullParams.groupName || fullParams.assignmentGroupName || '',
                        groups: (groups || []).map(g => ({
                            id: g.id || g._id,
                            name: g.name
                        }))
                    };
                }
                fullParams.assignmentGroupId = resolvedGroupId;
            }

            // Step 1: Fetch the items with filters
            const fetchHandler = ipcMain._invokeHandlers?.get(opInfo.fetchHandler);
            if (!fetchHandler) {
                throw new Error(`Fetch handler ${opInfo.fetchHandler} not found.`);
            }

            const mockEvent = {
                sender: event.sender,
                senderFrame: event.senderFrame,
                reply: event.reply
            };

            // Prepare fetch parameters
            // Special handling for conversations and assignment groups
            const isConversationOp = operation.includes('conversation');
            const isEmptyGroupsOp = operation === 'create-assignments-in-empty-groups' || operation === 'delete-empty-assignment-groups';
            const fetchParams = isConversationOp ? {
                domain: fullParams.domain,
                token: fullParams.token,
                user_id: fullParams.userId || fullParams.user_id,
                subject: fullParams.subject
            } : (operation.includes('assignment-group') || isEmptyGroupsOp ? {
                domain: fullParams.domain,
                token: fullParams.token,
                course: fullParams.courseId || fullParams.course_id,
                filters: opInfo.filters
            } : {
                domain: fullParams.domain,
                token: fullParams.token,
                course_id: fullParams.courseId || fullParams.course_id,
                filters: opInfo.filters
            });

            console.log('AI Assistant: Fetching items for confirmation:', fetchParams);
            const fetchResult = await fetchHandler(mockEvent, fetchParams);

            // Determine the data key
            const dataKey = fetchResult.assignments ? 'assignments' :
                (fetchResult.groups ? 'groups' :
                    (fetchResult.content ? 'content' :
                        (fetchResult.conversations ? 'conversations' :
                            (fetchResult.modules ? 'modules' :
                                (fetchResult.announcements ? 'announcements' :
                                    (Array.isArray(fetchResult) ? 'array' : null))))));

            let items;
            if (dataKey === 'array') {
                items = fetchResult;
            } else if (!fetchResult || !dataKey) {
                items = [];
            } else {
                items = fetchResult[dataKey];
            }

            // Apply client-side filters
            if (opInfo.filters && items.length > 0) {
                const filters = opInfo.filters;

                if (filters.unpublished) {
                    items = items.filter(a => !a.published);
                }
                if (filters.noSubmissions) {
                    items = items.filter(a => !a.hasSubmittedSubmissions);
                }
                if (filters.noDueDate) {
                    items = items.filter(a => !a.dueAt);
                }
                if (filters.notInModules) {
                    items = items.filter(a => {
                        const inCore = Array.isArray(a.modules) && a.modules.length > 0;
                        const inQuiz = Array.isArray(a.quiz?.modules) && a.quiz.modules.length > 0;
                        const inDisc = Array.isArray(a.discussion?.modules) && a.discussion.modules.length > 0;
                        return !(inCore || inQuiz || inDisc);
                    });
                }
                if (filters.beforeDate && fullParams.beforeDate) {
                    const cutoff = new Date(fullParams.beforeDate);
                    cutoff.setHours(23, 59, 59, 999);
                    items = items.filter(a => {
                        if (!a.dueAt) return false;
                        const localDueDate = new Date(a.dueAt);
                        return localDueDate < cutoff;
                    });
                }
                if (filters.includeGraded === false) {
                    items = items.filter(a => !a.gradedSubmissionsExist);
                }
                if (filters.assignmentGroupId && fullParams.assignmentGroupId) {
                    const groupId = String(fullParams.assignmentGroupId).trim();
                    items = items.filter(a => {
                        const assignmentGroupId = String(
                            a.assignmentGroup?._id ||
                            a.assignmentGroupId ||
                            a.assignment_group_id ||
                            ''
                        ).trim();
                        return assignmentGroupId === groupId;
                    });
                }
                if (filters.fromImport && fullParams.importId) {
                    // Fetch assignments from the specific import
                    const importHandler = ipcMain._invokeHandlers?.get('axios:getImportedAssignments');
                    if (importHandler) {
                        try {
                            const mockEvent = {
                                sender: event.sender,
                                senderFrame: event.senderFrame,
                                reply: event.reply
                            };
                            const importedIds = await importHandler(mockEvent, {
                                domain: fullParams.domain,
                                token: fullParams.token,
                                course_id: fullParams.courseId,
                                import_id: fullParams.importId
                            });

                            if (importedIds && importedIds.length > 0) {
                                const importedSet = new Set(importedIds.map(id => String(id).trim()));
                                items = items.filter(a => importedSet.has(String(a._id).trim()));
                            } else {
                                items = [];
                            }
                        } catch (error) {
                            console.error('Error filtering by import:', error);
                            items = [];
                        }
                    }
                }
                if (filters.fromAllImports) {
                    // Fetch ALL content migrations and get assignments from each
                    const listImportsHandler = ipcMain._invokeHandlers?.get('axios:listContentMigrations');
                    const getImportedHandler = ipcMain._invokeHandlers?.get('axios:getImportedAssignments');

                    if (listImportsHandler && getImportedHandler) {
                        try {
                            const mockEvent = {
                                sender: event.sender,
                                senderFrame: event.senderFrame,
                                reply: event.reply
                            };

                            // Get all content migrations for the course
                            const migrations = await listImportsHandler(mockEvent, {
                                domain: fullParams.domain,
                                token: fullParams.token,
                                course_id: fullParams.courseId,
                                per_page: 100
                            });

                            // Collect all imported assignment IDs from all migrations
                            const allImportedIds = new Set();

                            for (const migration of migrations) {
                                try {
                                    const importedIds = await getImportedHandler(mockEvent, {
                                        domain: fullParams.domain,
                                        token: fullParams.token,
                                        course_id: fullParams.courseId,
                                        import_id: migration.id
                                    });

                                    if (importedIds && importedIds.length > 0) {
                                        importedIds.forEach(id => allImportedIds.add(String(id).trim()));
                                    }
                                } catch (error) {
                                    // Skip migrations that don't have assignment data
                                    console.log(`Skipping migration ${migration.id}:`, error.message);
                                }
                            }

                            // Filter items to only those in the collected set
                            if (allImportedIds.size > 0) {
                                items = items.filter(a => allImportedIds.has(String(a._id).trim()));
                            } else {
                                items = [];
                            }
                        } catch (error) {
                            console.error('Error filtering by all imports:', error);
                            items = [];
                        }
                    }
                }
                // Filter announcements by title (case-insensitive partial match)
                if (filters.byTitle && fullParams.titleFilter) {
                    const titleLower = fullParams.titleFilter.toLowerCase();
                    items = items.filter(a => {
                        const itemTitle = (a.title || a.name || '').toLowerCase();
                        return itemTitle.includes(titleLower);
                    });
                }
            }

            // For relock-modules, return all items so user can see full list with checkboxes
            // For other operations, only return first 5 as preview
            const itemsToReturn = operation === 'relock-modules' ? items : items.slice(0, 5);

            // Custom message for create-in-each operations
            const isCreateInEach = opInfo.isCreateInEach;
            const actionMessage = isCreateInEach
                ? `Will create assignment(s) in ${items.length} empty assignment group(s)`
                : undefined;

            return {
                success: true,
                needsConfirmation: true,
                itemCount: items.length,
                itemsRaw: items,
                items: itemsToReturn.map(item => {
                    // Handle GraphQL edge structure for modules
                    const actualItem = item.node || item;
                    return {
                        name: actualItem.name || actualItem.title || actualItem.subject || 'Unnamed',
                        id: actualItem._id || actualItem.id
                    };
                }),
                operation: operation,
                filters: opInfo.filters,
                isCreateInEach: isCreateInEach,
                actionMessage: actionMessage
            };

        } catch (error) {
            console.error('Fetch Items Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    });

    function resolvePathValue(source, path) {
        if (!source || !path) return undefined;
        const tokens = String(path)
            .replace(/\[(\d+)\]/g, '.$1')
            .split('.')
            .filter(Boolean);

        let current = source;
        for (const token of tokens) {
            if (current == null) return undefined;
            current = current[token];
        }
        return current;
    }

    function resolveTemplateString(text, context) {
        if (typeof text !== 'string') return text;
        return text.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, path) => {
            const value = resolvePathValue(context, path.trim());
            if (value === undefined || value === null) return '';
            if (typeof value === 'object') return JSON.stringify(value);
            return String(value);
        });
    }

    function resolveTemplatesDeep(value, context) {
        if (typeof value === 'string') return resolveTemplateString(value, context);
        if (Array.isArray(value)) return value.map(item => resolveTemplatesDeep(item, context));
        if (value && typeof value === 'object') {
            return Object.entries(value).reduce((acc, [key, val]) => {
                acc[key] = resolveTemplatesDeep(val, context);
                return acc;
            }, {});
        }
        return value;
    }

    function resolveForEachList(forEachDef, context) {
        if (!forEachDef) return null;
        if (typeof forEachDef === 'string') {
            return resolvePathValue(context, forEachDef);
        }
        if (typeof forEachDef === 'object' && forEachDef.list) {
            return resolvePathValue(context, forEachDef.list);
        }
        return null;
    }

    async function executeSingleOperation(event, { operation, parameters, token, confirmed }) {
        try {
            const opInfo = OPERATION_MAP[operation];
            if (!opInfo) {
                throw new Error('Unknown operation');
            }

            // Add token to parameters
            const fullParams = { ...parameters, token };

            let result;

            // Check if this is an information query operation
            if (opInfo.isQuery) {
                console.log('AI Assistant: Processing information query:', operation);

                const handler = ipcMain._invokeHandlers?.get(opInfo.handler);
                if (!handler) {
                    throw new Error(`Query handler ${opInfo.handler} not found.`);
                }

                const mockEvent = {
                    sender: event.sender,
                    senderFrame: event.senderFrame,
                    reply: event.reply
                };

                // Prepare query parameters - handle special cases
                let queryParams;
                if (operation === 'get-deleted-conversations') {
                    // Special handling for deleted conversations with optional filters
                    queryParams = {
                        domain: fullParams.domain,
                        token: fullParams.token,
                        user_id: fullParams.userId || fullParams.user_id,
                        deleted_after: fullParams.deletedAfter || fullParams.deleted_after,
                        deleted_before: fullParams.deletedBefore || fullParams.deleted_before
                    };
                } else {
                    queryParams = {
                        domain: fullParams.domain,
                        token: fullParams.token,
                        course_id: fullParams.courseId || fullParams.course_id
                    };
                }

                console.log('AI Assistant: Fetching data with params:', queryParams);
                const fetchResult = await handler(mockEvent, queryParams);

                // Determine the data structure
                let items, dataType;
                if (fetchResult.announcements) {
                    items = fetchResult.announcements;
                    dataType = 'announcements';
                } else if (fetchResult.assignments) {
                    items = fetchResult.assignments;
                    dataType = 'assignments';
                } else if (fetchResult.modules) {
                    items = fetchResult.modules;
                    dataType = 'modules';
                } else if (fetchResult.groups) {
                    items = fetchResult.groups;
                    dataType = 'assignment groups';
                } else if (operation === 'get-empty-assignment-groups' && Array.isArray(fetchResult)) {
                    items = fetchResult;
                    dataType = 'assignment groups';
                } else if (operation === 'get-deleted-conversations' && Array.isArray(fetchResult)) {
                    items = fetchResult;
                    dataType = 'deleted conversations';
                } else if (fetchResult.discussions) {
                    items = fetchResult.discussions;
                    dataType = 'discussions';
                } else if (Array.isArray(fetchResult)) {
                    items = fetchResult;
                    dataType = 'items';
                } else {
                    // For get-course-info or other single object responses
                    return {
                        success: true,
                        result: {
                            queryType: fullParams.queryType || 'details',
                            data: fetchResult,
                            summary: `Retrieved course information`
                        }
                    };
                }

                const queryType = fullParams.queryType || 'count';

                // Apply filters if provided
                if (fullParams.filters && items.length > 0) {
                    const filters = fullParams.filters;
                    console.log('AI Assistant: Applying filters to query results:', filters);

                    if (filters.unpublished) {
                        items = items.filter(a => !a.published);
                    }
                    if (filters.published) {
                        items = items.filter(a => a.published);
                    }
                    if (filters.noSubmissions) {
                        items = items.filter(a => !a.hasSubmittedSubmissions);
                    }
                    if (filters.noDueDate) {
                        items = items.filter(a => !a.dueAt);
                    }
                    if (filters.notInModules) {
                        items = items.filter(a => {
                            const inCore = Array.isArray(a.modules) && a.modules.length > 0;
                            const inQuiz = Array.isArray(a.quiz?.modules) && a.quiz.modules.length > 0;
                            const inDisc = Array.isArray(a.discussion?.modules) && a.discussion.modules.length > 0;
                            return !(inCore || inQuiz || inDisc);
                        });
                    }
                    if (filters.beforeDate && fullParams.beforeDate) {
                        const cutoff = new Date(fullParams.beforeDate);
                        cutoff.setHours(23, 59, 59, 999);
                        items = items.filter(a => {
                            if (!a.dueAt) return false;
                            const localDueDate = new Date(a.dueAt);
                            return localDueDate < cutoff;
                        });
                    }
                    if (filters.includeGraded === false) {
                        items = items.filter(a => !a.gradedSubmissionsExist);
                    }
                    if (filters.assignmentGroupId && fullParams.assignmentGroupId) {
                        const groupId = String(fullParams.assignmentGroupId).trim();
                        items = items.filter(a => {
                            const assignmentGroupId = String(
                                a.assignmentGroup?._id ||
                                a.assignmentGroupId ||
                                a.assignment_group_id ||
                                ''
                            ).trim();
                            return assignmentGroupId === groupId;
                        });
                    }
                    // Filter empty assignment groups
                    if (filters.empty && dataType === 'assignment groups') {
                        items = items.filter(group => {
                            // Check for assignments array or assignmentsConnection.nodes
                            const hasNoAssignments = (Array.isArray(group.assignments) && group.assignments.length === 0) ||
                                (group.assignmentsConnection?.nodes && Array.isArray(group.assignmentsConnection.nodes) && group.assignmentsConnection.nodes.length === 0);
                            return hasNoAssignments;
                        });
                    }
                }

                // Apply titleFilter for announcements
                if (fullParams.titleFilter && items.length > 0) {
                    const titleLower = fullParams.titleFilter.toLowerCase();
                    items = items.filter(a => {
                        const itemTitle = (a.title || a.name || '').toLowerCase();
                        return itemTitle.includes(titleLower);
                    });
                }

                console.log(`AI Assistant: After filtering query results: ${items.length} items`);

                if (queryType === 'count') {
                    return {
                        success: true,
                        result: {
                            queryType: 'count',
                            count: items.length,
                            dataType: dataType,
                            summary: `Found ${items.length} ${dataType} in the course`
                        }
                    };
                } else if (queryType === 'list') {
                    // Return a summary list with key info
                    const summary = items.slice(0, 20).map(item => ({
                        id: item.id || item._id,
                        name: item.title || item.name,
                        published: item.published,
                        ...(item.dueAt && { dueAt: item.dueAt })
                    }));

                    return {
                        success: true,
                        result: {
                            queryType: 'list',
                            count: items.length,
                            dataType: dataType,
                            items: summary,
                            ...(operation === 'get-empty-assignment-groups' && {
                                groupIds: items.map(item => item.id || item._id).filter(Boolean)
                            }),
                            summary: `Found ${items.length} ${dataType}. Showing first ${summary.length}.`
                        }
                    };
                } else {
                    // Return full details
                    return {
                        success: true,
                        result: {
                            queryType: 'details',
                            count: items.length,
                            dataType: dataType,
                            items: items,
                            ...(operation === 'get-empty-assignment-groups' && {
                                groupIds: items.map(item => item.id || item._id).filter(Boolean)
                            }),
                            summary: `Retrieved ${items.length} ${dataType} with full details`
                        }
                    };
                }
            }

            // Check if this operation needs to fetch items first (like assignments)
            if (opInfo.needsFetch) {
                if (operation === 'delete-assignments-in-assignment-group') {
                    const { id: resolvedGroupId, groups } = await resolveAssignmentGroupId(fullParams, event);
                    if (!resolvedGroupId) {
                        const suggestionText = (groups || []).map(g => g?.name).filter(Boolean).slice(0, 10).join(', ');
                        throw new Error(`Assignment group not found. Available groups (first 10): ${suggestionText || 'none'}`);
                    }
                    fullParams.assignmentGroupId = resolvedGroupId;
                }

                // Resolve group name to ID for delete-assignments-not-in-group
                if (operation === 'delete-assignments-not-in-group') {
                    if (fullParams.groupName && !fullParams.keepGroupId) {
                        const { id: resolvedGroupId, groups } = await resolveAssignmentGroupId({ ...fullParams, groupName: fullParams.groupName }, event);
                        if (!resolvedGroupId) {
                            const suggestionText = (groups || []).map(g => g?.name).filter(Boolean).slice(0, 10).join(', ');
                            throw new Error(`Assignment group "${fullParams.groupName}" not found. Available groups (first 10): ${suggestionText || 'none'}`);
                        }
                        fullParams.keepGroupId = resolvedGroupId;
                    }
                    if (!fullParams.keepGroupId) {
                        throw new Error('keepGroupId or groupName is required for delete-assignments-not-in-group operation');
                    }
                }

                // Step 1: Fetch the items with filters
                const fetchHandler = ipcMain._invokeHandlers?.get(opInfo.fetchHandler);
                if (!fetchHandler) {
                    throw new Error(`Fetch handler ${opInfo.fetchHandler} not found.`);
                }

                const mockEvent = {
                    sender: event.sender,
                    senderFrame: event.senderFrame,
                    reply: event.reply
                };

                // Prepare fetch parameters - map courseId to course_id
                // Special handling for conversations and assignment groups
                const isConversationOp = operation.includes('conversation');
                const isEmptyGroupsOp = operation === 'create-assignments-in-empty-groups' || operation === 'delete-empty-assignment-groups';
                const fetchParams = isConversationOp ? {
                    domain: fullParams.domain,
                    token: fullParams.token,
                    user_id: fullParams.userId || fullParams.user_id,
                    subject: fullParams.subject
                } : (operation.includes('assignment-group') || isEmptyGroupsOp ? {
                    domain: fullParams.domain,
                    token: fullParams.token,
                    course: fullParams.courseId || fullParams.course_id,
                    filters: opInfo.filters
                } : {
                    domain: fullParams.domain,
                    token: fullParams.token,
                    course_id: fullParams.courseId || fullParams.course_id,
                    filters: opInfo.filters,
                    // Pass specific filters that handlers implementation supports directly
                    emptyModules: fullParams.filters?.empty
                });

                console.log('AI Assistant: Fetching items with params:', fetchParams);
                const fetchResult = await fetchHandler(mockEvent, fetchParams);

                // Determine the data key - could be 'assignments', 'groups', 'content', 'conversations', 'modules', 'announcements', etc.
                const dataKey = fetchResult.assignments ? 'assignments' :
                    (fetchResult.groups ? 'groups' :
                        (fetchResult.content ? 'content' :
                            (fetchResult.conversations ? 'conversations' :
                                (fetchResult.modules ? 'modules' :
                                    (fetchResult.announcements ? 'announcements' :
                                        (Array.isArray(fetchResult) ? 'array' : null))))));

                let items;
                if (dataKey === 'array') {
                    items = fetchResult;
                } else if (!fetchResult || !dataKey || fetchResult[dataKey].length === 0) {
                    return {
                        success: true,
                        result: {
                            message: 'No matching items found',
                            count: 0,
                            items: []
                        }
                    };
                } else {
                    items = fetchResult[dataKey];
                }

                // Apply client-side filters (since getAllAssignmentsForCombined fetches all)
                if (opInfo.filters && items.length > 0) {
                    const filters = opInfo.filters;
                    console.log('AI Assistant: Applying filters:', filters);

                    if (filters.unpublished) {
                        items = items.filter(a => !a.published);
                    }
                    if (filters.noSubmissions) {
                        items = items.filter(a => !a.hasSubmittedSubmissions);
                    }
                    if (filters.noDueDate) {
                        items = items.filter(a => !a.dueAt);
                    }
                    if (filters.notInModules) {
                        items = items.filter(a => {
                            const inCore = Array.isArray(a.modules) && a.modules.length > 0;
                            const inQuiz = Array.isArray(a.quiz?.modules) && a.quiz.modules.length > 0;
                            const inDisc = Array.isArray(a.discussion?.modules) && a.discussion.modules.length > 0;
                            return !(inCore || inQuiz || inDisc);
                        });
                    }
                    if (filters.beforeDate && fullParams.beforeDate) {
                        const cutoff = new Date(fullParams.beforeDate);
                        cutoff.setHours(23, 59, 59, 999);
                        items = items.filter(a => {
                            if (!a.dueAt) return false;
                            const localDueDate = new Date(a.dueAt);
                            return localDueDate < cutoff;
                        });
                    }
                    if (filters.includeGraded === false) {
                        items = items.filter(a => !a.gradedSubmissionsExist);
                    }
                    if (filters.assignmentGroupId && fullParams.assignmentGroupId) {
                        const groupId = String(fullParams.assignmentGroupId).trim();
                        items = items.filter(a => {
                            const assignmentGroupId = String(
                                a.assignmentGroup?._id ||
                                a.assignmentGroupId ||
                                a.assignment_group_id ||
                                ''
                            ).trim();
                            return assignmentGroupId === groupId;
                        });
                    }
                    // Filter to keep only assignments NOT in a specific group (inverse of assignmentGroupId filter)
                    if (filters.notInGroupId && fullParams.keepGroupId) {
                        const keepGroupId = String(fullParams.keepGroupId).trim();
                        items = items.filter(a => {
                            const assignmentGroupId = String(
                                a.assignmentGroup?._id ||
                                a.assignmentGroupId ||
                                a.assignment_group_id ||
                                ''
                            ).trim();
                            return assignmentGroupId !== keepGroupId;
                        });
                    }
                    // Filter announcements by title (case-insensitive partial match)
                    if (filters.byTitle && fullParams.titleFilter) {
                        const titleLower = fullParams.titleFilter.toLowerCase();
                        items = items.filter(a => {
                            const itemTitle = (a.title || a.name || '').toLowerCase();
                            return itemTitle.includes(titleLower);
                        });
                    }

                    console.log(`AI Assistant: After filtering: ${items.length} items`);
                }

                // Apply dynamic filter parameter (e.g. for delete-pages)
                if (fullParams.filter && items.length > 0) {
                    console.log(`AI Assistant: Applying dynamic filter '${fullParams.filter}' to ${items.length} items`);

                    if (fullParams.filter === 'unpublished') {
                        items = items.filter(i => i.published === false);
                    } else if (fullParams.filter === 'published') {
                        items = items.filter(i => i.published === true);
                    } else if (fullParams.filter.startsWith('created_before:')) {
                        const dateStr = fullParams.filter.split('created_before:')[1];
                        const cutoff = new Date(dateStr);
                        if (!isNaN(cutoff.getTime())) {
                            // End of day for "before"
                            cutoff.setHours(23, 59, 59, 999);
                            items = items.filter(i => {
                                const d = new Date(i.createdAt || i.created_at);
                                return !isNaN(d.getTime()) && d < cutoff;
                            });
                        }
                    } else if (fullParams.filter.startsWith('created_after:')) {
                        const dateStr = fullParams.filter.split('created_after:')[1];
                        const cutoff = new Date(dateStr);
                        if (!isNaN(cutoff.getTime())) {
                            // Start of day for "after"
                            cutoff.setHours(0, 0, 0, 0);
                            items = items.filter(i => {
                                const d = new Date(i.createdAt || i.created_at);
                                return !isNaN(d.getTime()) && d > cutoff;
                            });
                        }
                    } else if (fullParams.filter.startsWith('title_search:')) {
                        const searchStr = fullParams.filter.split('title_search:')[1].toLowerCase();
                        items = items.filter(i => (i.title || i.name || '').toLowerCase().includes(searchStr));
                    }

                    console.log(`AI Assistant: After dynamic filtering: ${items.length} items`);
                }

                if (items.length === 0) {
                    return {
                        success: true,
                        result: {
                            message: 'No matching items found after applying filters',
                            count: 0,
                            items: []
                        }
                    };
                }

                // Normalize assignment IDs (_id to id for compatibility)
                const normalizedItems = items.map(item => {
                    if (item._id && !item.id) {
                        return { ...item, id: item._id };
                    }
                    return item;
                });

                // Special handling for create-in-each operations (e.g., create assignments in empty groups)
                if (opInfo.isCreateInEach) {
                    const createHandler = ipcMain._invokeHandlers?.get(opInfo.createHandler);
                    if (!createHandler) {
                        throw new Error(`Create handler ${opInfo.createHandler} not found.`);
                    }

                    const assignmentsPerGroup = Number(fullParams.number) || 1;
                    const assignmentName = fullParams.name || fullParams.assignmentName || 'Assignment';
                    const createResults = [];
                    const totalGroups = normalizedItems.length;

                    console.log(`AI Assistant: Creating ${assignmentsPerGroup} assignment(s) in each of ${totalGroups} empty groups`);

                    // Send initial progress
                    sendProgress(event, {
                        mode: 'determinate',
                        value: 0,
                        processed: 0,
                        total: totalGroups,
                        label: `Creating assignments in ${totalGroups} empty groups...`
                    });

                    for (let i = 0; i < normalizedItems.length; i++) {
                        const group = normalizedItems[i];
                        const groupId = group.id || group._id;
                        const groupName = group.name || `Group ${groupId}`;

                        // Send progress update for this group
                        sendProgress(event, {
                            mode: 'determinate',
                            value: i / totalGroups,
                            processed: i,
                            total: totalGroups,
                            label: `Creating assignment(s) in group ${i + 1}/${totalGroups}: ${groupName}`
                        });

                        try {
                            const createParams = {
                                domain: fullParams.domain,
                                token: fullParams.token,
                                course_id: fullParams.courseId || fullParams.course_id,
                                number: assignmentsPerGroup,
                                name: assignmentName,
                                points: fullParams.points || 0,
                                submissionTypes: fullParams.submissionTypes || ['online_upload'],
                                publish: fullParams.publish !== undefined ? fullParams.publish : false,
                                grade_type: fullParams.grade_type || 'points',
                                peer_reviews: fullParams.peer_reviews || false,
                                peer_review_count: fullParams.peer_review_count || 0,
                                anonymous: fullParams.anonymous || false,
                                assignment_group_id: groupId,
                                operationId: `ai-assistant-${Date.now()}-${groupId}`
                            };

                            const createResult = await createHandler(mockEvent, createParams);
                            createResults.push({
                                groupId,
                                groupName,
                                result: createResult,
                                success: true
                            });
                        } catch (error) {
                            console.error(`Failed to create assignments in group ${groupId}:`, error);
                            createResults.push({
                                groupId,
                                groupName,
                                error: error.message,
                                success: false
                            });
                        }
                    }

                    // Send completion progress
                    sendProgress(event, {
                        mode: 'done',
                        value: 1,
                        processed: totalGroups,
                        total: totalGroups,
                        label: `Completed creating assignments in ${totalGroups} groups`
                    });

                    const successCount = createResults.filter(r => r.success).length;
                    const totalAssignmentsCreated = createResults
                        .filter(r => r.success)
                        .reduce((sum, r) => sum + (r.result?.successful?.length || assignmentsPerGroup), 0);

                    return {
                        success: true,
                        result: {
                            message: `Created ${totalAssignmentsCreated} assignment(s) across ${successCount} empty assignment groups`,
                            groupsProcessed: normalizedItems.length,
                            groupsSuccessful: successCount,
                            groupsFailed: createResults.filter(r => !r.success).length,
                            assignmentsCreated: totalAssignmentsCreated,
                            details: createResults
                        }
                    };
                }

                // Special handling for move operations (e.g., move assignments to a single group)
                if (opInfo.isMoveOperation) {
                    const moveHandler = ipcMain._invokeHandlers?.get(opInfo.moveHandler);
                    if (!moveHandler) {
                        throw new Error(`Move handler ${opInfo.moveHandler} not found.`);
                    }

                    const targetGroupId = fullParams.targetGroupId;
                    if (!targetGroupId) {
                        throw new Error('Target assignment group ID is required for move operation');
                    }

                    // Filter out assignments already in the target group
                    const assignmentsToMove = normalizedItems.filter(a => {
                        const currentGroupId = String(
                            a.assignmentGroup?._id ||
                            a.assignmentGroupId ||
                            a.assignment_group_id ||
                            ''
                        ).trim();
                        return currentGroupId !== String(targetGroupId).trim();
                    });

                    if (assignmentsToMove.length === 0) {
                        return {
                            success: true,
                            result: {
                                message: 'All assignments are already in the target group',
                                count: 0,
                                movedCount: 0,
                                alreadyInGroup: normalizedItems.length
                            }
                        };
                    }

                    // Prepare move parameters
                    const moveParams = {
                        url: fullParams.domain,
                        token: fullParams.token,
                        course: fullParams.courseId || fullParams.course_id,
                        number: assignmentsToMove.length,
                        assignments: assignmentsToMove,
                        groupID: targetGroupId
                    };

                    console.log(`AI Assistant: Moving ${assignmentsToMove.length} assignments to group ${targetGroupId}`);
                    const moveResult = await moveHandler(mockEvent, moveParams);

                    return {
                        success: true,
                        result: {
                            message: `Moved ${moveResult.successful?.length || assignmentsToMove.length} assignment(s) to the target group`,
                            movedCount: moveResult.successful?.length || assignmentsToMove.length,
                            failedCount: moveResult.failed?.length || 0,
                            alreadyInGroup: normalizedItems.length - assignmentsToMove.length,
                            successful: moveResult.successful || assignmentsToMove.length,
                            failed: moveResult.failed || 0
                        }
                    };
                }

                // Step 2: Delete/process the fetched items
                const deleteHandler = ipcMain._invokeHandlers?.get(opInfo.deleteHandler);
                if (!deleteHandler) {
                    throw new Error(`Delete handler ${opInfo.deleteHandler} not found.`);
                }

                // Prepare delete parameters - format depends on the operation
                let deleteParams;
                if (operation.includes('assignment-groups')) {
                    // Assignment groups use a different format
                    deleteParams = {
                        url: fullParams.domain,
                        token: fullParams.token,
                        content: normalizedItems
                    };
                } else if (operation.includes('conversations')) {
                    // Conversations format
                    deleteParams = {
                        domain: fullParams.domain,
                        token: fullParams.token,
                        subject: fullParams.subject,
                        messages: normalizedItems
                    };
                } else if (operation.includes('modules')) {
                    // Modules format
                    // If user selected specific modules via checkboxes, use those instead of all fetched items
                    let modulesToProcess = normalizedItems;
                    if (fullParams.selectedModules && fullParams.selectedModules.length > 0) {
                        // User has specifically selected modules from the UI
                        // Need to get the full module data that matches the selected IDs
                        const selectedIds = new Set(fullParams.selectedModules.map(m => String(m.id)));
                        modulesToProcess = normalizedItems.filter(item => {
                            const itemId = String((item.node && item.node._id) || item._id || item.id);
                            return selectedIds.has(itemId);
                        });
                        console.log(`AI Assistant: User selected ${fullParams.selectedModules.length} modules, filtered to ${modulesToProcess.length} items`);
                    }

                    // Extract proper module IDs from GraphQL structure
                    const moduleIds = modulesToProcess.map(item => {
                        // Handle GraphQL edge structure
                        if (item.node) {
                            return { id: item.node._id, name: item.node.name };
                        }
                        return { id: item._id || item.id, name: item.name };
                    });

                    deleteParams = {
                        domain: fullParams.domain,
                        token: fullParams.token,
                        course_id: fullParams.courseId || fullParams.course_id,
                        number: moduleIds.length,
                        module_ids: moduleIds
                    };
                } else if (operation.includes('announcements')) {
                    // Announcements format (uses discussions array since announcements are discussion topics)
                    deleteParams = {
                        domain: fullParams.domain,
                        token: fullParams.token,
                        course_id: fullParams.courseId || fullParams.course_id,
                        discussions: normalizedItems,
                        operationId: `ai-assistant-${Date.now()}`
                    };
                } else if (operation.includes('pages')) {
                    // Pages format - construct requests for batch handler
                    deleteParams = {
                        requests: normalizedItems.map(item => ({
                            domain: fullParams.domain,
                            token: fullParams.token,
                            course_id: fullParams.courseId || fullParams.course_id,
                            page_url: item.url, // URL from GraphQL
                            page_id: item.id || item._id
                        }))
                    };
                } else {
                    // Default assignments format
                    deleteParams = {
                        domain: fullParams.domain,
                        token: fullParams.token,
                        course_id: fullParams.courseId || fullParams.course_id,
                        number: normalizedItems.length,
                        assignments: normalizedItems,
                        operationId: `ai-assistant-${Date.now()}`
                    };
                }

                console.log('AI Assistant: Deleting items:', normalizedItems.length);
                console.log('AI Assistant: Delete params:', JSON.stringify(deleteParams, null, 2));
                result = await deleteHandler(mockEvent, deleteParams);
                console.log('AI Assistant: Delete result:', JSON.stringify(result, null, 2));

                // Combine fetch and delete results
                result = {
                    ...result,
                    fetchedCount: normalizedItems.length,
                    deletedCount: result.successful?.length || result.succeeded?.length || result.length || 0,
                    failedCount: result.failed?.length || 0
                };

            } else {
                // Single-step operation - just call the handler directly
                const handler = ipcMain._invokeHandlers?.get(opInfo.handler);
                if (!handler) {
                    throw new Error(`Handler ${opInfo.handler} not found.`);
                }

                const mockEvent = {
                    sender: event.sender,
                    senderFrame: event.senderFrame,
                    reply: event.reply
                };

                // Special case: create assignment groups and then create assignments in each group
                if (operation === 'create-assignment-groups') {
                    const assignmentsPerGroup = Number(fullParams.assignmentsPerGroup || fullParams.assignments_per_group || 0);
                    if (assignmentsPerGroup > 0) {
                        const groupPrefix = fullParams.groupPrefix || fullParams.prefix || fullParams.name || 'Assignment Group';
                        const assignmentName = fullParams.assignmentName || fullParams.assignment_name || fullParams.assignmentTitle || 'Assignment';
                        const numGroups = fullParams.number || 1;

                        // Step 1: Create assignment groups
                        sendProgress(event, {
                            mode: 'indeterminate',
                            label: `Step 1/2: Creating ${numGroups} assignment group(s)...`
                        });

                        const groupParams = {
                            domain: fullParams.domain,
                            token: fullParams.token,
                            course: fullParams.courseId || fullParams.course_id,
                            number: numGroups,
                            name: groupPrefix,
                            operationId: `ai-assistant-${Date.now()}`
                        };

                        const groupResult = await handler(mockEvent, groupParams);
                        const createdGroupIds = (groupResult?.successful || [])
                            .map(item => item?.value)
                            .filter(Boolean);

                        if (createdGroupIds.length === 0) {
                            sendProgress(event, { mode: 'done', label: 'No assignment groups created' });
                            return {
                                success: true,
                                result: {
                                    groupResult,
                                    assignmentsResult: [],
                                    message: 'No assignment groups were created; assignments were not created.'
                                }
                            };
                        }

                        const createAssignmentsHandler = ipcMain._invokeHandlers?.get('axios:createAssignments');
                        if (!createAssignmentsHandler) {
                            throw new Error('Handler axios:createAssignments not found.');
                        }

                        // Step 2: Create assignments in each group
                        const assignmentResults = [];
                        const totalGroups = createdGroupIds.length;
                        const totalAssignments = totalGroups * assignmentsPerGroup;

                        for (let i = 0; i < createdGroupIds.length; i++) {
                            const groupId = createdGroupIds[i];

                            sendProgress(event, {
                                mode: 'determinate',
                                value: i / totalGroups,
                                processed: i * assignmentsPerGroup,
                                total: totalAssignments,
                                label: `Step 2/2: Creating assignments in group ${i + 1}/${totalGroups} (${i * assignmentsPerGroup}/${totalAssignments} total)`
                            });

                            const assignmentParams = {
                                domain: fullParams.domain,
                                token: fullParams.token,
                                course_id: fullParams.courseId || fullParams.course_id,
                                number: assignmentsPerGroup,
                                name: assignmentName,
                                points: fullParams.points || 0,
                                submissionTypes: fullParams.submissionTypes || ['online_upload'],
                                publish: fullParams.publish !== undefined ? fullParams.publish : false,
                                grade_type: fullParams.grade_type || 'points',
                                peer_reviews: fullParams.peer_reviews || false,
                                peer_review_count: fullParams.peer_review_count || 0,
                                anonymous: fullParams.anonymous || false,
                                assignment_group_id: groupId,
                                operationId: `ai-assistant-${Date.now()}-${groupId}`
                            };

                            const assignmentResult = await createAssignmentsHandler(mockEvent, assignmentParams);
                            assignmentResults.push({ groupId, result: assignmentResult });
                        }

                        sendProgress(event, {
                            mode: 'done',
                            label: `Created ${totalGroups} groups with ${totalAssignments} total assignments`
                        });

                        return {
                            success: true,
                            result: {
                                groupResult,
                                assignmentsResult: assignmentResults,
                                message: `Created ${totalGroups} assignment groups with ${assignmentsPerGroup} assignment(s) each (${totalAssignments} total)`
                            }
                        };
                    }
                }

                // Special case: create-course needs to call the Canvas API directly with proper structure
                // and optionally create all requested content (users, groups, assignments, etc.)
                if (operation === 'create-course' || operation === 'create-basic-course') {
                    const { createSupportCourse } = require('../../shared/canvas-api/courses');
                    const { createAssignmentGroups } = require('../../shared/canvas-api/assignment_groups');
                    const { createAssignments } = require('../../shared/canvas-api/assignments');
                    const { createDiscussion } = require('../../shared/canvas-api/discussions');
                    const { createPage } = require('../../shared/canvas-api/pages');
                    const { createModule } = require('../../shared/canvas-api/modules');
                    const { createSection } = require('../../shared/canvas-api/sections');

                    // Calculate total steps for progress tracking
                    const hasUsers = (fullParams.students > 0 || fullParams.teachers > 0) && fullParams.email;
                    const hasAssignmentGroups = fullParams.assignmentGroups > 0;
                    const hasAssignments = fullParams.assignments > 0;
                    const hasDiscussions = fullParams.discussions > 0;
                    const hasPages = fullParams.pages > 0;
                    const hasModules = fullParams.modules > 0;
                    const hasSections = fullParams.sections > 0;
                    const hasQuizzes = fullParams.classicQuizzes > 0;

                    let totalSteps = 1; // Course creation
                    if (hasUsers) totalSteps += 2; // Create users + enroll
                    if (hasAssignmentGroups) totalSteps += 1;
                    if (hasAssignments) totalSteps += 1;
                    if (hasDiscussions) totalSteps += 1;
                    if (hasPages) totalSteps += 1;
                    if (hasModules) totalSteps += 1;
                    if (hasSections) totalSteps += 1;
                    if (hasQuizzes) totalSteps += 2; // Create quizzes + questions

                    let currentStep = 0;
                    const results = {};

                    try {
                        // Step 1: Create the course
                        sendProgress(event, {
                            mode: 'determinate',
                            processed: currentStep,
                            total: totalSteps,
                            label: 'Creating course...'
                        });

                        const courseData = {
                            domain: fullParams.domain,
                            token: fullParams.token,
                            course: {
                                name: fullParams.courseName || fullParams.name || 'New Course',
                                publish: fullParams.publish || false
                            }
                        };

                        const course = await createSupportCourse(courseData);
                        results.course = course;
                        currentStep++;

                        const courseId = course.id;
                        const baseParams = {
                            domain: fullParams.domain,
                            token: fullParams.token,
                            course_id: courseId
                        };

                        // Step 2: Create users and enroll them (if requested)
                        if (hasUsers) {
                            sendProgress(event, {
                                mode: 'determinate',
                                processed: currentStep,
                                total: totalSteps,
                                label: `Creating ${(fullParams.students || 0) + (fullParams.teachers || 0)} users...`
                            });

                            try {
                                const { addUsers, enrollUser } = require('../../shared/canvas-api/users');
                                const usersCreated = [];
                                const emailPrefix = fullParams.email.includes('@')
                                    ? fullParams.email.split('@')[0]
                                    : fullParams.email;

                                // Helper function to generate a random string for unique IDs
                                const randomSuffix = () => Math.floor(Math.random() * 10000);

                                // Create student accounts
                                for (let i = 1; i <= (fullParams.students || 0); i++) {
                                    const uniqueId = `student${i}_${randomSuffix()}`;
                                    const studentData = {
                                        domain: fullParams.domain,
                                        token: fullParams.token,
                                        user: {
                                            user: {
                                                name: `Test Student ${i}`,
                                                skip_registration: true
                                            },
                                            pseudonym: {
                                                unique_id: uniqueId,
                                                send_confirmation: false
                                            },
                                            communication_channel: {
                                                type: 'email',
                                                address: `${emailPrefix}+${uniqueId}@instructure.com`,
                                                skip_confirmation: true
                                            }
                                        }
                                    };
                                    try {
                                        const userId = await addUsers(studentData);
                                        usersCreated.push({ userId, role: 'StudentEnrollment' });
                                    } catch (e) {
                                        console.error(`Failed to create student ${i}:`, e);
                                    }
                                }

                                // Create teacher accounts
                                for (let i = 1; i <= (fullParams.teachers || 0); i++) {
                                    const uniqueId = `teacher${i}_${randomSuffix()}`;
                                    const teacherData = {
                                        domain: fullParams.domain,
                                        token: fullParams.token,
                                        user: {
                                            user: {
                                                name: `Test Teacher ${i}`,
                                                skip_registration: true
                                            },
                                            pseudonym: {
                                                unique_id: uniqueId,
                                                send_confirmation: false
                                            },
                                            communication_channel: {
                                                type: 'email',
                                                address: `${emailPrefix}+${uniqueId}@instructure.com`,
                                                skip_confirmation: true
                                            }
                                        }
                                    };
                                    try {
                                        const userId = await addUsers(teacherData);
                                        usersCreated.push({ userId, role: 'TeacherEnrollment' });
                                    } catch (e) {
                                        console.error(`Failed to create teacher ${i}:`, e);
                                    }
                                }

                                currentStep++;

                                // Enroll users
                                sendProgress(event, {
                                    mode: 'determinate',
                                    processed: currentStep,
                                    total: totalSteps,
                                    label: `Enrolling ${usersCreated.length} users...`
                                });

                                for (const { userId, role } of usersCreated) {
                                    try {
                                        await enrollUser({
                                            domain: fullParams.domain,
                                            token: fullParams.token,
                                            course_id: courseId,
                                            user_id: userId,
                                            type: role
                                        });
                                    } catch (e) {
                                        console.error(`Failed to enroll user:`, e);
                                    }
                                }

                                results.users = usersCreated.length;
                                currentStep++;
                            } catch (e) {
                                console.error('User creation/enrollment failed:', e);
                                results.usersError = e.message || String(e);
                            }
                        }

                        // Step 3: Create assignment groups (with optional assignments in each)
                        if (hasAssignmentGroups) {
                            sendProgress(event, {
                                mode: 'determinate',
                                processed: currentStep,
                                total: totalSteps,
                                label: `Creating ${fullParams.assignmentGroups} assignment groups...`
                            });

                            try {
                                const groupData = {
                                    domain: fullParams.domain,
                                    token: fullParams.token,
                                    course: courseId,
                                    number: fullParams.assignmentGroups,
                                    name: fullParams.groupPrefix || 'Assignment Group'
                                };

                                const groupResult = await createAssignmentGroups(groupData);
                                results.assignmentGroups = groupResult;

                                // If assignmentsPerGroup specified, create assignments in each group
                                if (fullParams.assignmentsPerGroup > 0 && groupResult.successful) {
                                    const assignmentsPerGroup = fullParams.assignmentsPerGroup || 1;
                                    const assignmentName = fullParams.assignmentName || 'Assignment';
                                    let assignmentCount = 0;

                                    for (const group of groupResult.successful) {
                                        const groupId = group.value?.id || group.value;
                                        if (!groupId) continue;

                                        const assignData = {
                                            domain: fullParams.domain,
                                            token: fullParams.token,
                                            course_id: courseId,
                                            number: assignmentsPerGroup,
                                            name: assignmentName,
                                            points: fullParams.points || 0,
                                            submissionTypes: fullParams.submissionTypes || ['online_upload'],
                                            publish: fullParams.publish || false,
                                            assignment_group_id: groupId
                                        };

                                        try {
                                            await createAssignments(assignData);
                                            assignmentCount += assignmentsPerGroup;
                                        } catch (e) {
                                            console.error(`Failed to create assignments in group ${groupId}:`, e);
                                        }
                                    }
                                    results.assignmentsInGroups = assignmentCount;
                                }
                            } catch (e) {
                                console.error('Assignment group creation failed:', e);
                                results.assignmentGroupsError = e.message || String(e);
                            }
                            currentStep++;
                        }

                        // Step 4: Create standalone assignments (if requested)
                        if (hasAssignments) {
                            sendProgress(event, {
                                mode: 'determinate',
                                processed: currentStep,
                                total: totalSteps,
                                label: `Creating ${fullParams.assignments} assignments...`
                            });

                            try {
                                const assignData = {
                                    ...baseParams,
                                    number: fullParams.assignments,
                                    name: fullParams.assignmentName || 'Assignment',
                                    points: fullParams.points || 0,
                                    submissionTypes: fullParams.submissionTypes || ['online_upload'],
                                    publish: fullParams.publish || false
                                };
                                const assignResult = await createAssignments(assignData);
                                results.assignments = assignResult;
                            } catch (e) {
                                console.error('Assignment creation failed:', e);
                                results.assignmentsError = e.message || String(e);
                            }
                            currentStep++;
                        }

                        // Step 5: Create discussions
                        if (hasDiscussions) {
                            sendProgress(event, {
                                mode: 'determinate',
                                processed: currentStep,
                                total: totalSteps,
                                label: `Creating ${fullParams.discussions} discussions...`
                            });

                            try {
                                const discussionsCreated = [];
                                for (let i = 1; i <= fullParams.discussions; i++) {
                                    const discussionData = {
                                        ...baseParams,
                                        title: `${fullParams.discussionTitle || 'Discussion'} ${i}`,
                                        message: '',
                                        published: fullParams.publish || false
                                    };
                                    const disc = await createDiscussion(discussionData);
                                    discussionsCreated.push(disc);
                                }
                                results.discussions = discussionsCreated.length;
                            } catch (e) {
                                console.error('Discussion creation failed:', e);
                                results.discussionsError = e.message || String(e);
                            }
                            currentStep++;
                        }

                        // Step 6: Create pages
                        if (hasPages) {
                            sendProgress(event, {
                                mode: 'determinate',
                                processed: currentStep,
                                total: totalSteps,
                                label: `Creating ${fullParams.pages} pages...`
                            });

                            try {
                                const pagesCreated = [];
                                for (let i = 1; i <= fullParams.pages; i++) {
                                    const pageData = {
                                        ...baseParams,
                                        title: `${fullParams.pageTitle || 'Page'} ${i}`,
                                        body: '',
                                        published: fullParams.publish || false
                                    };
                                    const page = await createPage(pageData);
                                    pagesCreated.push(page);
                                }
                                results.pages = pagesCreated.length;
                            } catch (e) {
                                console.error('Page creation failed:', e);
                                results.pagesError = e.message || String(e);
                            }
                            currentStep++;
                        }

                        // Step 7: Create modules
                        if (hasModules) {
                            sendProgress(event, {
                                mode: 'determinate',
                                processed: currentStep,
                                total: totalSteps,
                                label: `Creating ${fullParams.modules} modules...`
                            });

                            try {
                                const modulesCreated = [];
                                for (let i = 1; i <= fullParams.modules; i++) {
                                    const moduleData = {
                                        ...baseParams,
                                        module_name: `${fullParams.modulePrefix || 'Module'} ${i}`
                                    };
                                    const mod = await createModule(moduleData);
                                    modulesCreated.push(mod);
                                }
                                results.modules = modulesCreated.length;
                            } catch (e) {
                                console.error('Module creation failed:', e);
                                results.modulesError = e.message || String(e);
                            }
                            currentStep++;
                        }

                        // Step 8: Create sections
                        if (hasSections) {
                            sendProgress(event, {
                                mode: 'determinate',
                                processed: currentStep,
                                total: totalSteps,
                                label: `Creating ${fullParams.sections} sections...`
                            });

                            try {
                                const sectionsCreated = [];
                                for (let i = 1; i <= fullParams.sections; i++) {
                                    const sectionData = {
                                        ...baseParams,
                                        name: `${fullParams.sectionPrefix || 'Section'} ${i}`
                                    };
                                    const section = await createSection(sectionData);
                                    sectionsCreated.push(section);
                                }
                                results.sections = sectionsCreated.length;
                            } catch (e) {
                                console.error('Section creation failed:', e);
                                results.sectionsError = e.message || String(e);
                            }
                            currentStep++;
                        }

                        // Step 9: Create classic quizzes with questions
                        if (hasQuizzes) {
                            sendProgress(event, {
                                mode: 'determinate',
                                processed: currentStep,
                                total: totalSteps,
                                label: `Creating ${fullParams.classicQuizzes} classic quizzes...`
                            });

                            try {
                                const { createQuiz } = require('../../shared/canvas-api/quizzes_classic');
                                const { createQuestions } = require('../../shared/canvas-api/quizzes_classic');
                                const quizzesCreated = [];

                                for (let i = 1; i <= fullParams.classicQuizzes; i++) {
                                    const quizData = {
                                        domain: fullParams.domain,
                                        token: fullParams.token,
                                        course_id: courseId,
                                        quiz_title: fullParams.quizName ? `${fullParams.quizName} ${i}` : `Quiz ${i}`,
                                        quiz_type: fullParams.quizType || 'assignment',
                                        publish: fullParams.publish || false
                                    };
                                    const quiz = await createQuiz(quizData);
                                    quizzesCreated.push(quiz);
                                }
                                results.quizzes = quizzesCreated.length;
                                currentStep++;

                                // Step 10: Add questions to quizzes
                                if (fullParams.questionsPerQuiz > 0) {
                                    sendProgress(event, {
                                        mode: 'determinate',
                                        processed: currentStep,
                                        total: totalSteps,
                                        label: `Adding ${fullParams.questionsPerQuiz} questions to each quiz...`
                                    });

                                    // Parse question types if provided, default to multiple_choice
                                    const questionTypes = fullParams.questionTypes
                                        ? (Array.isArray(fullParams.questionTypes)
                                            ? fullParams.questionTypes
                                            : fullParams.questionTypes.split(',').map(t => t.trim()))
                                        : ['multiple_choice_question'];

                                    let totalQuestionsCreated = 0;
                                    for (const quiz of quizzesCreated) {
                                        // Build question data for this quiz
                                        const questionData = questionTypes.map(type => ({
                                            name: type,
                                            enabled: true,
                                            number: String(fullParams.questionsPerQuiz)
                                        }));

                                        try {
                                            await createQuestions({
                                                domain: fullParams.domain,
                                                token: fullParams.token,
                                                course_id: courseId,
                                                quiz_id: quiz.id,
                                                question_data: questionData
                                            });
                                            totalQuestionsCreated += fullParams.questionsPerQuiz;
                                        } catch (e) {
                                            console.error(`Failed to add questions to quiz ${quiz.id}:`, e);
                                        }
                                    }
                                    results.quizQuestions = totalQuestionsCreated;
                                }
                                currentStep++;
                            } catch (e) {
                                console.error('Quiz creation failed:', e);
                                results.quizzesError = e.message || String(e);
                            }
                        }

                        // Build summary message with course link
                        const courseUrl = `https://${fullParams.domain}/courses/${course.id}`;
                        const summaryParts = [
                            `Created course "${course.name}" (ID: ${course.id})`,
                            `Link: ${courseUrl}`
                        ];
                        if (results.users) summaryParts.push(`${results.users} users enrolled`);
                        if (results.assignmentGroups?.successful?.length) {
                            summaryParts.push(`${results.assignmentGroups.successful.length} assignment groups`);
                        }
                        if (results.assignmentsInGroups) summaryParts.push(`${results.assignmentsInGroups} assignments in groups`);
                        if (results.assignments) summaryParts.push(`${results.assignments.successful?.length || fullParams.assignments} standalone assignments`);
                        if (results.discussions) summaryParts.push(`${results.discussions} discussions`);
                        if (results.pages) summaryParts.push(`${results.pages} pages`);
                        if (results.modules) summaryParts.push(`${results.modules} modules`);
                        if (results.sections) summaryParts.push(`${results.sections} sections`);
                        if (results.quizzes) {
                            const quizPart = `${results.quizzes} quizzes`;
                            if (results.quizQuestions) {
                                summaryParts.push(`${quizPart} with ${results.quizQuestions} total questions`);
                            } else {
                                summaryParts.push(quizPart);
                            }
                        }

                        sendProgress(event, {
                            mode: 'done',
                            label: summaryParts.join(', ')
                        });

                        return {
                            success: true,
                            result: {
                                course: course,
                                course_id: course.id,
                                course_url: courseUrl,
                                ...results,
                                message: summaryParts.join(', ')
                            }
                        };
                    } catch (error) {
                        console.error('Failed to create course:', error);
                        throw new Error(`Failed to create course: ${error.message || error}`);
                    }
                }

                // Map parameters for create operations
                let handlerParams = { ...fullParams };
                if (operation.includes('conversation')) {
                    handlerParams.user_id = handlerParams.user_id || handlerParams.userId;
                }
                // Special handling for restore-course-content - map AI params to handler format
                if (operation === 'restore-course-content') {
                    const contentIds = Array.isArray(fullParams.contentIds)
                        ? fullParams.contentIds
                        : (typeof fullParams.contentIds === 'string'
                            ? fullParams.contentIds.split(',').map(id => id.trim())
                            : []);
                    handlerParams = {
                        domain: fullParams.domain,
                        token: fullParams.token,
                        courseID: fullParams.courseId || fullParams.course_id,
                        context: fullParams.contentType,
                        values: contentIds
                    };
                }
                // Special handling for create-associated-courses
                if (operation === 'create-associated-courses') {
                    handlerParams = {
                        domain: fullParams.domain,
                        token: fullParams.token,
                        blueprintCourseId: fullParams.blueprintCourseId || fullParams.bpCourseID,
                        numberOfCourses: parseInt(fullParams.numberOfCourses || fullParams.number || 1)
                    };
                }
                if (operation === 'delete-assignment-group-with-assignments') {
                    const { id: resolvedGroupId, groups } = await resolveAssignmentGroupId(handlerParams, event);
                    if (!resolvedGroupId) {
                        const suggestionText = (groups || []).map(g => g?.name).filter(Boolean).slice(0, 10).join(', ');
                        throw new Error(`Assignment group not found. Available groups (first 10): ${suggestionText || 'none'}`);
                    }
                    handlerParams.group_id = resolvedGroupId;
                    handlerParams.course_id = handlerParams.courseId || handlerParams.course_id;
                }
                if (operation.includes('create')) {
                    // Use 'course' for assignment group operations, 'course_id' for others
                    const courseParam = operation.includes('assignment-group') ? 'course' : 'course_id';

                    // Handle announcement-specific parameters
                    if (operation === 'create-announcements') {
                        // Check if we need to generate unique titles
                        if (fullParams.generateTitles && fullParams.number > 1) {
                            try {
                                // Generate unique titles using AI
                                const titlesList = await generateAnnouncementTitles(
                                    fullParams.number,
                                    fullParams.message || '',
                                    fullParams.titleBase || fullParams.title || 'Announcement'
                                );

                                handlerParams = {
                                    domain: fullParams.domain,
                                    token: fullParams.token,
                                    course_id: fullParams.courseId || fullParams.course_id,
                                    number: fullParams.number || 1,
                                    titles: titlesList, // Array of unique titles
                                    message: fullParams.message || '',
                                    delayed_post_at: fullParams.delayed_post_at || null,
                                    lock_at: fullParams.lock_at || null,
                                    operationId: `ai-assistant-${Date.now()}`
                                };
                            } catch (error) {
                                console.error('Failed to generate titles, falling back to numbered titles:', error);
                                // Fallback to default behavior
                                handlerParams = {
                                    domain: fullParams.domain,
                                    token: fullParams.token,
                                    course_id: fullParams.courseId || fullParams.course_id,
                                    number: fullParams.number || 1,
                                    title: fullParams.title || fullParams.name || 'Announcement',
                                    message: fullParams.message || '',
                                    delayed_post_at: fullParams.delayed_post_at || null,
                                    lock_at: fullParams.lock_at || null,
                                    operationId: `ai-assistant-${Date.now()}`
                                };
                            }
                        } else {
                            handlerParams = {
                                domain: fullParams.domain,
                                token: fullParams.token,
                                course_id: fullParams.courseId || fullParams.course_id,
                                number: fullParams.number || 1,
                                title: fullParams.title || fullParams.name || 'Announcement',
                                message: fullParams.message || '',
                                delayed_post_at: fullParams.delayed_post_at || null,
                                lock_at: fullParams.lock_at || null,
                                operationId: `ai-assistant-${Date.now()}`
                            };
                        }
                    } else if (operation === 'create-discussions') {
                        // Handle discussion-specific parameters - build requests array
                        const number = fullParams.number || 1;
                        const prefix = fullParams.prefix || fullParams.name || 'Discussion';
                        const requests = [];

                        for (let i = 1; i <= number; i++) {
                            requests.push({
                                domain: fullParams.domain,
                                token: fullParams.token,
                                course_id: fullParams.courseId || fullParams.course_id,
                                title: `${prefix} ${i}`,
                                message: fullParams.message || '',
                                published: fullParams.published !== undefined ? fullParams.published : true,
                                threaded: fullParams.threaded !== undefined ? fullParams.threaded : true,
                                delayed_post_at: fullParams.delayed_post_at || null
                            });
                        }

                        handlerParams = { requests };
                    } else if (operation === 'create-pages') {
                        // Handle page-specific parameters - build requests array
                        const number = fullParams.number || 1;
                        const prefix = fullParams.prefix || fullParams.name || 'Page';
                        const requests = [];

                        for (let i = 1; i <= number; i++) {
                            requests.push({
                                domain: fullParams.domain,
                                token: fullParams.token,
                                course_id: fullParams.courseId || fullParams.course_id,
                                title: `${prefix} ${i}`,
                                body: fullParams.body || '',
                                published: fullParams.published !== undefined ? fullParams.published : true
                            });
                        }

                        handlerParams = { requests };
                    } else if (operation === 'create-classic-quizzes') {
                        // Handle classic quiz creation with questions
                        console.log('AI Assistant: Mapping create-classic-quizzes parameters');
                        console.log('fullParams:', JSON.stringify(fullParams, null, 2));

                        // Extract question info from nested structure or flat parameters
                        const questionsPerQuiz = fullParams.questions?.number || fullParams.questionsPerQuiz || 0;
                        const questionType = fullParams.questions?.type || fullParams.questionType || 'multiple_choice';

                        // Map question type to Canvas API format
                        const questionTypeMapping = {
                            'multiple_choice': 'multiple_choice_question',
                            'true_false': 'true_false_question',
                            'short_answer': 'short_answer_question',
                            'essay': 'essay_question',
                            'fill_in_blank': 'short_answer_question',
                            'matching': 'matching_question',
                            'numerical': 'numerical_question',
                            'calculated': 'calculated_question'
                        };

                        const mappedQuestionType = questionTypeMapping[questionType] || questionType + '_question';

                        handlerParams = {
                            domain: fullParams.domain,
                            token: fullParams.token,
                            course_id: fullParams.courseId || fullParams.course_id,
                            courseId: fullParams.courseId || fullParams.course_id,
                            number: fullParams.number || 1,
                            quiz_name: fullParams.quizName || fullParams.name || fullParams.prefix,
                            quizName: fullParams.quizName || fullParams.name || fullParams.prefix,
                            quiz_type: fullParams.quizType || 'assignment',
                            quizType: fullParams.quizType || 'assignment',
                            publish: fullParams.publish !== undefined ? fullParams.publish : false,
                            questionsPerQuiz: questionsPerQuiz,
                            questionTypes: fullParams.questionTypes || [mappedQuestionType]
                        };

                        console.log('AI Assistant: Mapped handlerParams:', JSON.stringify(handlerParams, null, 2));
                    } else {
                        // Default create operation parameters (assignments, etc.)
                        const defaultName = operation === 'create-assignments' ? 'Assignment' : 'Assignment Group';
                        handlerParams = {
                            domain: fullParams.domain,
                            token: fullParams.token,
                            [courseParam]: fullParams.courseId || fullParams.course_id,
                            number: fullParams.number || 1,
                            name: fullParams.name || fullParams.prefix || defaultName,
                            points: fullParams.points || 0,
                            submissionTypes: fullParams.submissionTypes || ['online_upload'],
                            publish: fullParams.publish !== undefined ? fullParams.publish : false,
                            grade_type: fullParams.grade_type || 'points',
                            peer_reviews: fullParams.peer_reviews || false,
                            peer_review_count: fullParams.peer_review_count || 0,
                            anonymous: fullParams.anonymous || false,
                            assignment_group_id: fullParams.assignmentGroupId || fullParams.assignment_group_id,
                            operationId: `ai-assistant-${Date.now()}`
                        };
                    }
                }

                result = await handler(mockEvent, handlerParams);
            }

            return {
                success: true,
                result
            };

        } catch (error) {
            console.error('Execute Operation Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    function sendProgress(event, payload) {
        try {
            if (event?.sender?.send) {
                event.sender.send('update-progress', payload);
            }
        } catch (error) {
            console.warn('AI Assistant: Progress update failed:', error.message);
        }
    }

    async function executeMultiStepOperation(event, { steps, token, confirmed }) {
        const stepResults = [];
        const context = { steps: stepResults, outputs: stepResults };
        const totalSteps = steps.length || 1;

        for (let index = 0; index < steps.length; index++) {
            const step = steps[index];
            if (!step?.operation || !OPERATION_MAP[step.operation]) {
                throw new Error(`Unknown operation in steps[${index}]`);
            }

            const stepTitle = step.operationInfo?.description || step.operation;
            sendProgress(event, {
                mode: 'indeterminate',
                label: `Step ${index + 1}/${totalSteps}: ${stepTitle}`
            });

            const baseParams = resolveTemplatesDeep(step.parameters || {}, context);
            const list = resolveForEachList(step.forEach, context);
            const itemVar = (step.forEach && step.forEach.itemVar) ? step.forEach.itemVar : 'item';

            if (Array.isArray(list)) {
                const loopResults = [];
                const loopTotal = list.length || 1;
                for (let itemIndex = 0; itemIndex < list.length; itemIndex++) {
                    const loopContext = { ...context, [itemVar]: list[itemIndex] };
                    const loopParams = resolveTemplatesDeep(baseParams, loopContext);
                    const stepResult = await executeSingleOperation(event, {
                        operation: step.operation,
                        parameters: loopParams,
                        token,
                        confirmed
                    });

                    if (!stepResult.success) {
                        throw new Error(stepResult.error || `Step ${index + 1} failed`);
                    }

                    loopResults.push({
                        index: itemIndex,
                        operation: step.operation,
                        parameters: loopParams,
                        result: stepResult.result
                    });

                    const overallValue = (index + (itemIndex + 1) / loopTotal) / totalSteps;
                    sendProgress(event, {
                        mode: 'determinate',
                        value: overallValue,
                        processed: itemIndex + 1,
                        total: loopTotal,
                        label: `Step ${index + 1}/${totalSteps}: ${stepTitle} (${itemIndex + 1}/${loopTotal})`
                    });
                }

                stepResults.push({
                    index,
                    operation: step.operation,
                    parameters: baseParams,
                    forEach: step.forEach,
                    result: loopResults
                });
            } else if (step.forEach) {
                throw new Error(`Step ${index + 1} forEach resolved to a non-array value`);
            } else {
                const stepResult = await executeSingleOperation(event, {
                    operation: step.operation,
                    parameters: baseParams,
                    token,
                    confirmed
                });

                if (!stepResult.success) {
                    throw new Error(stepResult.error || `Step ${index + 1} failed`);
                }

                stepResults.push({
                    index,
                    operation: step.operation,
                    parameters: baseParams,
                    result: stepResult.result
                });

                sendProgress(event, {
                    mode: 'determinate',
                    value: (index + 1) / totalSteps,
                    label: `Completed step ${index + 1}/${totalSteps}: ${stepTitle}`
                });
            }
        }

        sendProgress(event, { mode: 'done', label: 'All steps complete' });

        return {
            success: true,
            result: {
                steps: stepResults,
                summary: `Completed ${stepResults.length} steps`
            }
        };
    }

    // Execute the parsed operation
    ipcMain.handle('ai-assistant:executeOperation', async (event, { operation, parameters, token, confirmed }) => {
        try {
            if (operation === 'multi-step' || Array.isArray(parameters?.steps)) {
                const steps = Array.isArray(parameters?.steps) ? parameters.steps : [];
                return await executeMultiStepOperation(event, { steps, token, confirmed });
            }

            return await executeSingleOperation(event, { operation, parameters, token, confirmed });
        } catch (error) {
            console.error('Execute Operation Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    });

    // Send feedback to Slack
    ipcMain.handle('ai-assistant:sendSlackFeedback', async (event, data) => {
        try {
            const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

            if (!slackWebhookUrl) {
                throw new Error('Slack webhook URL not configured. Set SLACK_WEBHOOK_URL environment variable.');
            }

            // Format the feedback message
            let message = {
                blocks: [
                    {
                        type: "header",
                        text: {
                            type: "plain_text",
                            text: `🤖 AI Assistant Feedback: ${data.type === 'query-results' ? 'Query Results Issue' : 'Operation Results Issue'}`
                        }
                    },
                    {
                        type: "section",
                        fields: [
                            {
                                type: "mrkdwn",
                                text: `*User Prompt:*\n${data.prompt}`
                            },
                            {
                                type: "mrkdwn",
                                text: `*Operation:*\n${data.operation}`
                            }
                        ]
                    },
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `*User Feedback:*\n${data.feedback}`
                        }
                    }
                ]
            };

            // Add context based on feedback type
            if (data.type === 'query-results') {
                message.blocks.push({
                    type: "section",
                    fields: [
                        {
                            type: "mrkdwn",
                            text: `*Items Found:*\n${data.itemCount}`
                        },
                        {
                            type: "mrkdwn",
                            text: `*Preview:*\n${data.items.map(i => i.name).join(', ')}`
                        }
                    ]
                });
            } else if (data.type === 'operation-results') {
                const resultsText = Object.entries(data.results || {})
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(', ');
                message.blocks.push({
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `*Results:*\n${resultsText || 'No results data'}`
                    }
                });
                message.blocks.push({
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `*Parameters:*\n\`\`\`${JSON.stringify(data.parameters, null, 2)}\`\`\``
                    }
                });
            }

            // Send to Slack
            const axios = require('axios');
            await axios.post(slackWebhookUrl, message, {
                headers: { 'Content-Type': 'application/json' }
            });

            console.log('Feedback sent to Slack successfully');
            return { success: true };

        } catch (error) {
            console.error('Failed to send Slack feedback:', error);
            throw error;
        }
    });
}

module.exports = { registerAIAssistantHandlers };
