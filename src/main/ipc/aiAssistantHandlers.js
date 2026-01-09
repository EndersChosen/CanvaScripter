/**
 * AI Assistant Handlers
 * Provides natural language interface to Canvas operations
 */

const { ipcMain } = require('electron');
const { getDecryptedKey } = require('./settingsHandlers');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

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

    // ==================== Conversation Operations ====================
    'get-conversations': {
        handler: 'axios:getConvos',
        description: 'Get conversations by subject',
        requiredParams: ['domain', 'token', 'subject'],
        needsFetch: false
    },
    'delete-conversations': {
        fetchHandler: 'axios:getConvos',
        deleteHandler: 'axios:deleteConvos',
        description: 'Delete conversations with specific subject',
        requiredParams: ['domain', 'token', 'subject'],
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
        handler: 'axios:relockModules',
        description: 'Relock modules in a course',
        requiredParams: ['domain', 'token', 'courseId', 'modules'],
        needsFetch: false
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
        description: 'Delete announcements from a course',
        requiredParams: ['domain', 'token', 'courseId', 'announcements'],
        needsFetch: false
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
   - number: How many items to create
   - name: Base name/prefix for items
   - points: Point value (default 0)
   - submissionTypes: Array like ["online_upload"], ["online_text_entry"], etc.
   - publish: true/false (default false)
7. summary: Human-readable description of what will be done
8. warnings: Any potential issues or confirmations needed

Common submission types:
- "online_upload" = file upload
- "online_text_entry" = text entry
- "online_url" = website URL
- "on_paper" = on paper
- "external_tool" = external tool

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
    "importId": "12345",
    "number": 10,
    "name": "Assignment Name",
    "points": 10,
    "submissionTypes": ["online_upload"],
    "publish": false
  },
  "summary": "Clear description of the action",
  "warnings": ["Warning 1", "Warning 2"],
  "confidence": 0.0-1.0
}

If the request is unclear or unsupported, set confidence to 0 and explain in summary.`;

            let responseText = '';

            if (provider === 'openai') {
                const openai = new OpenAI({ apiKey });
                const completion = await openai.chat.completions.create({
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: prompt }
                    ],
                    model: 'gpt-4o',
                    response_format: { type: "json_object" }
                });
                responseText = completion.choices[0].message.content;
            } else {
                const anthropic = new Anthropic({ apiKey });
                const msg = await anthropic.messages.create({
                    model: 'claude-sonnet-4-5-20250929',
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
            const missingParams = opInfo.requiredParams.filter(param => !parameters[param]);
            if (missingParams.length > 0) {
                return {
                    success: false,
                    error: `Missing required parameters: ${missingParams.join(', ')}`
                };
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
            const fetchParams = {
                domain: fullParams.domain,
                token: fullParams.token,
                course_id: fullParams.courseId || fullParams.course_id,
                filters: opInfo.filters
            };

            console.log('AI Assistant: Fetching items for confirmation:', fetchParams);
            const fetchResult = await fetchHandler(mockEvent, fetchParams);

            // Determine the data key
            const dataKey = fetchResult.assignments ? 'assignments' :
                (fetchResult.groups ? 'groups' :
                    (fetchResult.content ? 'content' :
                        (fetchResult.conversations ? 'conversations' :
                            (fetchResult.modules ? 'modules' :
                                (Array.isArray(fetchResult) ? 'array' : null)))));

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
            }

            return {
                success: true,
                needsConfirmation: true,
                itemCount: items.length,
                items: items.slice(0, 5).map(item => ({ // Return first 5 items as preview
                    name: item.name || item.title || item.subject || 'Unnamed',
                    id: item._id || item.id
                })),
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

            // Check if this operation needs to fetch items first (like assignments)
            if (opInfo.needsFetch) {
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
                const fetchParams = {
                    domain: fullParams.domain,
                    token: fullParams.token,
                    course_id: fullParams.courseId || fullParams.course_id,
                    filters: opInfo.filters
                };

                console.log('AI Assistant: Fetching items with params:', fetchParams);
                const fetchResult = await fetchHandler(mockEvent, fetchParams);

                // Determine the data key - could be 'assignments', 'groups', 'content', 'conversations', 'modules', etc.
                const dataKey = fetchResult.assignments ? 'assignments' :
                    (fetchResult.groups ? 'groups' :
                        (fetchResult.content ? 'content' :
                            (fetchResult.conversations ? 'conversations' :
                                (fetchResult.modules ? 'modules' :
                                    (Array.isArray(fetchResult) ? 'array' : null)))));

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
                        conversations: normalizedItems
                    };
                } else if (operation.includes('modules')) {
                    // Modules format
                    deleteParams = {
                        domain: fullParams.domain,
                        token: fullParams.token,
                        course_id: fullParams.courseId || fullParams.course_id,
                        number: normalizedItems.length,
                        module_ids: normalizedItems
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
                if (operation.includes('create')) {
                    // Use 'course' for assignment group operations, 'course_id' for others
                    const courseParam = operation.includes('assignment-group') ? 'course' : 'course_id';

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
