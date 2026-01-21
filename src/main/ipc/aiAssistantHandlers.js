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
        optionalParams: ['points', 'submissionTypes', 'publish', 'grade_type', 'peer_reviews', 'peer_review_count', 'anonymous'],
        needsFetch: false
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
        requiredParams: ['domain', 'token', 'courseId', 'number', 'prefix'],
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
        description: 'Get deleted conversations',
        requiredParams: ['domain', 'token'],
        needsFetch: false
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
        description: 'Restore deleted course content',
        requiredParams: ['domain', 'token', 'courseId'],
        needsFetch: false
    },
    'create-support-course': {
        handler: 'axios:createSupportCourse',
        description: 'Create a support course with sample content',
        requiredParams: ['domain', 'token', 'accountId'],
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
        description: 'Create classic quizzes in a course',
        requiredParams: ['domain', 'token', 'courseId', 'number', 'prefix'],
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
        needsFetch: false
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
1. operation: The operation key from the list above
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

For conversation operations:
- Extract userId: Canvas user ID for the sender (e.g., "user 123")
- Extract subject: exact subject text to match

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

Conversation examples:
- "Delete all messages sent by user 123 with subject 'Test Message'"
    -> operation: "delete-conversations", userId: "123", subject: "Test Message"
- "Find conversations from user 456 with subject 'Hello'"
    -> operation: "get-conversations", userId: "456", subject: "Hello"

Assignment group example:
- "Delete all assignments in the 'Assignments #2' assignment group from https://school.com/courses/123"
    -> operation: "delete-assignments-in-assignment-group", groupName: "Assignments #2"

   - publish: true/false (default false)
7. summary: Human-readable description of what will be done
8. warnings: Any potential issues or confirmations needed

Common submission types:
- "online_upload" = file upload
- "online_text_entry" = text entry
- "online_url" = website URL
- "on_paper" = on paper
- "external_tool" = external tool

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

Respond ONLY with valid JSON in this exact format:
{
  "operation": "operation-key",
  "needsImportChoice": true,
  "parameters": {
    "domain": "extracted-domain",
    "courseId": "extracted-id",
        "userId": "canvas-user-id",
        "groupName": "assignment group name",
    "importId": "12345",
    "number": 10,
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
            const parsed = JSON.parse(cleanedText);

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
            const fetchParams = isConversationOp ? {
                domain: fullParams.domain,
                token: fullParams.token,
                user_id: fullParams.userId || fullParams.user_id,
                subject: fullParams.subject
            } : (operation.includes('assignment-group') ? {
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
                filters: opInfo.filters
            };

        } catch (error) {
            console.error('Fetch Items Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    });

    // Execute the parsed operation
    ipcMain.handle('ai-assistant:executeOperation', async (event, { operation, parameters, token, confirmed }) => {
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

                // Prepare query parameters
                const queryParams = {
                    domain: fullParams.domain,
                    token: fullParams.token,
                    course_id: fullParams.courseId || fullParams.course_id
                };

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
                const fetchParams = isConversationOp ? {
                    domain: fullParams.domain,
                    token: fullParams.token,
                    user_id: fullParams.userId || fullParams.user_id,
                    subject: fullParams.subject
                } : (operation.includes('assignment-group') ? {
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

                // Map parameters for create operations
                let handlerParams = { ...fullParams };
                if (operation.includes('conversation')) {
                    handlerParams.user_id = handlerParams.user_id || handlerParams.userId;
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
                    } else {
                        // Default create operation parameters (assignments, etc.)
                        handlerParams = {
                            domain: fullParams.domain,
                            token: fullParams.token,
                            [courseParam]: fullParams.courseId || fullParams.course_id,
                            number: fullParams.number || 1,
                            name: fullParams.name || fullParams.prefix || 'Assignment Group',
                            points: fullParams.points || 0,
                            submissionTypes: fullParams.submissionTypes || ['online_upload'],
                            publish: fullParams.publish !== undefined ? fullParams.publish : false,
                            grade_type: fullParams.grade_type || 'points',
                            peer_reviews: fullParams.peer_reviews || false,
                            peer_review_count: fullParams.peer_review_count || 0,
                            anonymous: fullParams.anonymous || false,
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
