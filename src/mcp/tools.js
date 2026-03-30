/**
 * MCP Tool Definitions for CanvaScripter
 * 
 * Each tool wraps an existing canvas-api module function.
 * Tools are consumed by both the MCP server (standalone) and the agent loop (Electron).
 * 
 * Tool format:
 * - name: unique tool identifier (snake_case with canvas_ prefix)
 * - description: clear description for LLM consumption
 * - destructive: whether the tool modifies data (triggers confirmation in agent loop)
 * - inputSchema: JSON Schema for parameters (domain included, token excluded - injected at runtime)
 * - execute: async function({ domain, token, ...params }) => result
 */

const path = require('path');
const CANVAS_API = path.join(__dirname, '..', 'shared', 'canvas-api');
const SHARED = path.join(__dirname, '..', 'shared');

// ============================================================================
// Course Tools
// ============================================================================

const courseTools = [
    {
        name: 'canvas_get_course',
        description: 'Get detailed information about a Canvas course including name, course code, workflow state, term, and dates. Use this to verify a course exists or check its current state before performing operations.',
        destructive: false,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain (e.g., myschool.instructure.com)' },
                courseId: { type: 'string', description: 'The Canvas course ID' }
            },
            required: ['domain', 'courseId']
        },
        execute: async ({ domain, token, courseId }) => {
            const { getCourseInfo } = require(path.join(CANVAS_API, 'courses'));
            const course = await getCourseInfo({ domain, token, bpCourseID: courseId });
            return {
                id: course.id, name: course.name, courseCode: course.course_code,
                workflowState: course.workflow_state, startAt: course.start_at,
                endAt: course.end_at, enrollmentTermId: course.enrollment_term_id,
                totalStudents: course.total_students
            };
        }
    },
    {
        name: 'canvas_create_course',
        description: 'Create a new Canvas course in the root account. Returns the new course details.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                name: { type: 'string', description: 'Course name' },
                publish: { type: 'boolean', description: 'Whether to publish the course immediately (default: false)' }
            },
            required: ['domain', 'name']
        },
        execute: async ({ domain, token, name, publish }) => {
            const { createSupportCourse } = require(path.join(CANVAS_API, 'courses'));
            const result = await createSupportCourse({
                domain, token,
                course: { name, publish: publish || false }
            });
            return { id: result.id, name: result.name, workflowState: result.workflow_state };
        }
    },
    {
        name: 'canvas_reset_course',
        description: 'Reset all content in a Canvas course. This is IRREVERSIBLE and removes all assignments, modules, pages, discussions, announcements, and other content. Use with extreme caution.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID to reset' }
            },
            required: ['domain', 'courseId']
        },
        execute: async ({ domain, token, courseId }) => {
            const { resetCourse } = require(path.join(CANVAS_API, 'courses'));
            const progressId = await resetCourse({ domain, token, course: courseId });
            return { success: true, progressId, message: 'Course reset initiated' };
        }
    },
    {
        name: 'canvas_publish_course',
        description: 'Publish or unpublish a Canvas course.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                published: { type: 'boolean', description: 'true to publish, false to unpublish' }
            },
            required: ['domain', 'courseId', 'published']
        },
        execute: async ({ domain, token, courseId, published }) => {
            const { updateCoursePublishState } = require(path.join(CANVAS_API, 'courses'));
            return await updateCoursePublishState({
                domain, token, course_id: courseId,
                eventType: published ? 'offer' : 'claim'
            });
        }
    },
];

// ============================================================================
// Assignment Tools
// ============================================================================

const assignmentTools = [
    {
        name: 'canvas_list_assignments',
        description: 'List all assignments in a Canvas course. Returns assignment details including name, due date, points, published status, submission info, assignment group, and module membership. Use this before delete operations to identify which assignments to remove.',
        destructive: false,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' }
            },
            required: ['domain', 'courseId']
        },
        execute: async ({ domain, token, courseId }) => {
            const { getAllAssignmentsForCombined } = require(path.join(CANVAS_API, 'assignments'));
            const assignments = await getAllAssignmentsForCombined({ domain, token, course_id: courseId });
            return assignments.map(a => ({
                id: a._id, name: a.name, published: a.published,
                dueAt: a.dueAt, createdAt: a.createdAt,
                hasSubmissions: a.hasSubmittedSubmissions,
                gradedSubmissionsExist: a.gradedSubmissionsExist,
                assignmentGroup: a.assignmentGroup ? { id: a.assignmentGroup._id, name: a.assignmentGroup.name } : null,
                inModules: (a.modules && a.modules.length > 0) || (a.quiz?.modules?.length > 0) || (a.discussion?.modules?.length > 0)
            }));
        }
    },
    {
        name: 'canvas_create_assignments',
        description: 'Create one or more assignments in a Canvas course. Supports configuring submission type, points, grading type, peer reviews, and assignment group placement.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                number: { type: 'number', description: 'Number of assignments to create' },
                name: { type: 'string', description: 'Assignment name (numbered automatically if creating multiple)' },
                points: { type: 'number', description: 'Points possible (default: 10)' },
                submissionTypes: {
                    type: 'array', items: { type: 'string', enum: ['online_upload', 'online_text_entry', 'online_url', 'media_recording', 'none', 'on_paper', 'external_tool'] },
                    description: 'Submission types (default: online_upload)'
                },
                publish: { type: 'boolean', description: 'Whether to publish assignments (default: false)' },
                gradeType: { type: 'string', enum: ['points', 'percent', 'letter_grade', 'gpa_scale', 'pass_fail', 'not_graded'], description: 'Grading type (default: points)' },
                assignmentGroupId: { type: 'string', description: 'Assignment group ID to place assignments in' }
            },
            required: ['domain', 'courseId', 'number', 'name']
        },
        execute: async ({ domain, token, courseId, number, name, points, submissionTypes, publish, gradeType, assignmentGroupId }) => {
            const { createAssignments } = require(path.join(CANVAS_API, 'assignments'));
            const result = await createAssignments({
                domain, token, course_id: courseId,
                number, name,
                points: points ?? 10,
                submissionTypes: submissionTypes || ['online_upload'],
                publish: publish ? 'published' : 'unpublished',
                grade_type: gradeType || 'points',
                assignmentGroupId: assignmentGroupId || null
            });
            return result;
        }
    },
    {
        name: 'canvas_delete_assignments',
        description: 'Delete specific assignments from a Canvas course by their IDs. Always list assignments first to identify which ones to delete. This is irreversible.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                assignmentIds: {
                    type: 'array', items: { type: 'string' },
                    description: 'Array of assignment IDs to delete'
                }
            },
            required: ['domain', 'courseId', 'assignmentIds']
        },
        execute: async ({ domain, token, courseId, assignmentIds }) => {
            const { deleteAssignments } = require(path.join(CANVAS_API, 'assignments'));
            const batchHandler = require(path.join(SHARED, 'batchHandler'));
            const requests = assignmentIds.map(id => ({
                id,
                request: () => deleteAssignments({ domain, token, course_id: courseId, id })
            }));
            return await batchHandler(requests, { batchSize: 10, timeDelay: 1000 });
        }
    },
];

// ============================================================================
// Assignment Group Tools
// ============================================================================

const assignmentGroupTools = [
    {
        name: 'canvas_list_assignment_groups',
        description: 'List all assignment groups in a Canvas course. Optionally filter to show only empty groups (no assignments).',
        destructive: false,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                emptyOnly: { type: 'boolean', description: 'If true, return only empty assignment groups' }
            },
            required: ['domain', 'courseId']
        },
        execute: async ({ domain, token, courseId, emptyOnly }) => {
            if (emptyOnly) {
                const { getEmptyAssignmentGroups } = require(path.join(CANVAS_API, 'assignment_groups'));
                return await getEmptyAssignmentGroups({ domain, token, course: courseId });
            } else {
                const { getAssignmentGroups } = require(path.join(CANVAS_API, 'assignment_groups'));
                const groups = await getAssignmentGroups(domain, courseId, token);
                return groups.map(g => ({ id: g.id, name: g.name, position: g.position, groupWeight: g.group_weight }));
            }
        }
    },
    {
        name: 'canvas_create_assignment_groups',
        description: 'Create one or more assignment groups in a Canvas course.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                number: { type: 'number', description: 'Number of assignment groups to create' },
                name: { type: 'string', description: 'Group name prefix (numbered automatically)' }
            },
            required: ['domain', 'courseId', 'number']
        },
        execute: async ({ domain, token, courseId, number, name }) => {
            const { createAssignmentGroups } = require(path.join(CANVAS_API, 'assignment_groups'));
            return await createAssignmentGroups({
                domain, token, course_id: courseId,
                number, prefix: name || 'Assignment Group'
            });
        }
    },
    {
        name: 'canvas_delete_assignment_groups',
        description: 'Delete empty assignment groups from a Canvas course. Only groups with no assignments will be deleted.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' }
            },
            required: ['domain', 'courseId']
        },
        execute: async ({ domain, token, courseId }) => {
            const { deleteEmptyAssignmentGroup } = require(path.join(CANVAS_API, 'assignment_groups'));
            return await deleteEmptyAssignmentGroup({ domain, token, course_id: courseId });
        }
    },
];

// ============================================================================
// Module Tools
// ============================================================================

const moduleTools = [
    {
        name: 'canvas_list_modules',
        description: 'List all modules in a Canvas course, including their items count. Optionally filter to only empty modules.',
        destructive: false,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                emptyOnly: { type: 'boolean', description: 'If true, return only empty modules (no items)' }
            },
            required: ['domain', 'courseId']
        },
        execute: async ({ domain, token, courseId, emptyOnly }) => {
            const { getModules } = require(path.join(CANVAS_API, 'modules'));
            const modules = await getModules({ domain, token, course_id: courseId, emptyModules: emptyOnly });
            return modules.map(m => ({
                id: m.node._id, name: m.node.name,
                itemCount: m.node.moduleItems ? m.node.moduleItems.length : 0
            }));
        }
    },
    {
        name: 'canvas_create_module',
        description: 'Create a new module in a Canvas course.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                name: { type: 'string', description: 'Module name' }
            },
            required: ['domain', 'courseId', 'name']
        },
        execute: async ({ domain, token, courseId, name }) => {
            const { createModule } = require(path.join(CANVAS_API, 'modules'));
            const result = await createModule({ domain, token, course_id: courseId, module_name: name });
            return { id: result.id, name: result.name, position: result.position };
        }
    },
    {
        name: 'canvas_delete_modules',
        description: 'Delete specific modules from a Canvas course by their IDs. List modules first to identify which to remove.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                moduleIds: {
                    type: 'array', items: { type: 'string' },
                    description: 'Array of module IDs to delete'
                }
            },
            required: ['domain', 'courseId', 'moduleIds']
        },
        execute: async ({ domain, token, courseId, moduleIds }) => {
            const { deleteModule } = require(path.join(CANVAS_API, 'modules'));
            const batchHandler = require(path.join(SHARED, 'batchHandler'));
            const requests = moduleIds.map(id => ({
                id,
                request: () => deleteModule({ domain, token, course_id: courseId, module_id: id })
            }));
            return await batchHandler(requests, { batchSize: 10, timeDelay: 1000 });
        }
    },
    {
        name: 'canvas_create_module_item',
        description: 'Add an item to a module. Supported types: Assignment, Quiz, File, Page, Discussion, SubHeader, ExternalUrl, ExternalTool.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                moduleId: { type: 'string', description: 'The module ID to add the item to' },
                title: { type: 'string', description: 'Display title for the item' },
                type: { type: 'string', enum: ['Assignment', 'Quiz', 'File', 'Page', 'Discussion', 'SubHeader', 'ExternalUrl', 'ExternalTool'], description: 'Type of content to add' },
                contentId: { type: 'string', description: 'The ID of the content item (required for Assignment, Quiz, File, Discussion)' },
                pageUrl: { type: 'string', description: 'The URL slug of the page (required for Page type)' },
                externalUrl: { type: 'string', description: 'External URL (required for ExternalUrl and ExternalTool types)' }
            },
            required: ['domain', 'courseId', 'moduleId', 'title', 'type']
        },
        execute: async ({ domain, token, courseId, moduleId, title, type, contentId, pageUrl, externalUrl }) => {
            const { createModuleItem } = require(path.join(CANVAS_API, 'modules'));
            return await createModuleItem({
                domain, token, course_id: courseId, module_id: moduleId,
                module_item: { title, type, content_id: contentId, page_url: pageUrl, external_url: externalUrl }
            });
        }
    },
];

// ============================================================================
// Page Tools
// ============================================================================

const pageTools = [
    {
        name: 'canvas_list_pages',
        description: 'List all pages in a Canvas course. Returns page title, published status, and creation date. Optionally filter by title search term.',
        destructive: false,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                titleSearch: { type: 'string', description: 'Optional search term to filter pages by title' }
            },
            required: ['domain', 'courseId']
        },
        execute: async ({ domain, token, courseId, titleSearch }) => {
            const { getPagesGraphQL } = require(path.join(CANVAS_API, 'pages'));
            const pages = await getPagesGraphQL({ domain, token, course_id: courseId, title_search: titleSearch || '' });
            return pages.map(p => ({ id: p._id, title: p.title, published: p.published, createdAt: p.createdAt }));
        }
    },
    {
        name: 'canvas_create_pages',
        description: 'Create one or more pages in a Canvas course.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                number: { type: 'number', description: 'Number of pages to create (default: 1)' },
                title: { type: 'string', description: 'Page title (numbered automatically if creating multiple)' },
                body: { type: 'string', description: 'Page body content (HTML supported)' },
                published: { type: 'boolean', description: 'Whether to publish pages (default: true)' }
            },
            required: ['domain', 'courseId', 'title']
        },
        execute: async ({ domain, token, courseId, number, title, body, published }) => {
            const { createPage } = require(path.join(CANVAS_API, 'pages'));
            const batchHandler = require(path.join(SHARED, 'batchHandler'));
            const count = number || 1;
            const requests = [];
            for (let i = 1; i <= count; i++) {
                const pageTitle = count > 1 ? `${title} ${i}` : title;
                requests.push({
                    id: i,
                    request: () => createPage({ domain, token, course_id: courseId, title: pageTitle, body: body || '', published: published !== false })
                });
            }
            return await batchHandler(requests, { batchSize: 10, timeDelay: 1000 });
        }
    },
    {
        name: 'canvas_delete_pages',
        description: 'Delete specific pages from a Canvas course by their IDs. List pages first to identify which to delete.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                pageIds: {
                    type: 'array', items: { type: 'string' },
                    description: 'Array of page IDs to delete'
                }
            },
            required: ['domain', 'courseId', 'pageIds']
        },
        execute: async ({ domain, token, courseId, pageIds }) => {
            const { deletePage } = require(path.join(CANVAS_API, 'pages'));
            const batchHandler = require(path.join(SHARED, 'batchHandler'));
            const requests = pageIds.map(id => ({
                id,
                request: () => deletePage({ domain, token, course_id: courseId, page_id: id })
            }));
            return await batchHandler(requests, { batchSize: 10, timeDelay: 1000 });
        }
    },
];

// ============================================================================
// Discussion & Announcement Tools
// ============================================================================

const discussionTools = [
    {
        name: 'canvas_list_announcements',
        description: 'List all announcements in a Canvas course. Returns title, message preview, posted date, and author.',
        destructive: false,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' }
            },
            required: ['domain', 'courseId']
        },
        execute: async ({ domain, token, courseId }) => {
            const { getAnnouncements } = require(path.join(CANVAS_API, 'discussions'));
            const result = await getAnnouncements({ domain, token, course_id: courseId });
            const announcements = result.announcements || result;
            return Array.isArray(announcements) ? announcements.map(a => ({
                id: a._id || a.id, title: a.title, postedAt: a.postedAt || a.posted_at,
                published: a.published, message: a.message ? a.message.substring(0, 200) : ''
            })) : announcements;
        }
    },
    {
        name: 'canvas_create_announcement',
        description: 'Create an announcement in a Canvas course. Supports delayed posting and lock dates.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                title: { type: 'string', description: 'Announcement title' },
                message: { type: 'string', description: 'Announcement body/message (HTML supported)' },
                delayedPostAt: { type: 'string', description: 'ISO date string for delayed posting (optional)' },
                lockAt: { type: 'string', description: 'ISO date string for when to lock the announcement (optional)' }
            },
            required: ['domain', 'courseId', 'title', 'message']
        },
        execute: async ({ domain, token, courseId, title, message, delayedPostAt, lockAt }) => {
            const { createDiscussion } = require(path.join(CANVAS_API, 'discussions'));
            return await createDiscussion({
                domain, token, course_id: courseId,
                title, message, is_announcement: true, published: true,
                delayed_post_at: delayedPostAt || null,
                lock_at: lockAt || null
            });
        }
    },
    {
        name: 'canvas_create_discussion',
        description: 'Create a discussion topic in a Canvas course. Supports threaded discussions, require initial post, and peer review settings.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                title: { type: 'string', description: 'Discussion topic title' },
                message: { type: 'string', description: 'Discussion body/prompt (HTML supported)' },
                published: { type: 'boolean', description: 'Whether to publish (default: true)' },
                threaded: { type: 'boolean', description: 'Whether to enable threaded replies (default: true)' },
                requireInitialPost: { type: 'boolean', description: 'Whether students must post before seeing others (default: false)' }
            },
            required: ['domain', 'courseId', 'title']
        },
        execute: async ({ domain, token, courseId, title, message, published, threaded, requireInitialPost }) => {
            const { createDiscussion } = require(path.join(CANVAS_API, 'discussions'));
            return await createDiscussion({
                domain, token, course_id: courseId,
                title, message: message || '', is_announcement: false,
                published: published !== false,
                threaded: threaded !== false,
                requireInitialPost: requireInitialPost || false
            });
        }
    },
    {
        name: 'canvas_delete_announcements',
        description: 'Delete specific announcements from a Canvas course by their IDs. List announcements first to identify which to remove.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                announcementIds: {
                    type: 'array', items: { type: 'string' },
                    description: 'Array of announcement IDs to delete'
                }
            },
            required: ['domain', 'courseId', 'announcementIds']
        },
        execute: async ({ domain, token, courseId, announcementIds }) => {
            const { deleteDiscussionTopic } = require(path.join(CANVAS_API, 'discussions'));
            const batchHandler = require(path.join(SHARED, 'batchHandler'));
            const requests = announcementIds.map(id => ({
                id,
                request: () => deleteDiscussionTopic({ domain, token, course_id: courseId, topic_id: id })
            }));
            return await batchHandler(requests, { batchSize: 10, timeDelay: 1000 });
        }
    },
    {
        name: 'canvas_delete_discussions',
        description: 'Delete specific discussion topics from a Canvas course by their IDs.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                discussionIds: {
                    type: 'array', items: { type: 'string' },
                    description: 'Array of discussion topic IDs to delete'
                }
            },
            required: ['domain', 'courseId', 'discussionIds']
        },
        execute: async ({ domain, token, courseId, discussionIds }) => {
            const { deleteDiscussionTopic } = require(path.join(CANVAS_API, 'discussions'));
            const batchHandler = require(path.join(SHARED, 'batchHandler'));
            const requests = discussionIds.map(id => ({
                id,
                request: () => deleteDiscussionTopic({ domain, token, course_id: courseId, topic_id: id })
            }));
            return await batchHandler(requests, { batchSize: 10, timeDelay: 1000 });
        }
    },
];

// ============================================================================
// Section Tools
// ============================================================================

const sectionTools = [
    {
        name: 'canvas_list_sections',
        description: 'List all sections in a Canvas course including enrollment counts.',
        destructive: false,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' }
            },
            required: ['domain', 'courseId']
        },
        execute: async ({ domain, token, courseId }) => {
            const { getCourseSectionsGraphQL } = require(path.join(CANVAS_API, 'sections'));
            return await getCourseSectionsGraphQL({ domain, token, course_id: courseId });
        }
    },
    {
        name: 'canvas_create_section',
        description: 'Create a new section in a Canvas course.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                name: { type: 'string', description: 'Section name' }
            },
            required: ['domain', 'courseId', 'name']
        },
        execute: async ({ domain, token, courseId, name }) => {
            const { createSection } = require(path.join(CANVAS_API, 'sections'));
            return await createSection({ domain, token, course_id: courseId, section_name: name });
        }
    },
    {
        name: 'canvas_delete_sections',
        description: 'Delete specific sections from a Canvas course by their IDs.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                sectionIds: {
                    type: 'array', items: { type: 'string' },
                    description: 'Array of section IDs to delete'
                }
            },
            required: ['domain', 'courseId', 'sectionIds']
        },
        execute: async ({ domain, token, courseId, sectionIds }) => {
            const { deleteSection } = require(path.join(CANVAS_API, 'sections'));
            const batchHandler = require(path.join(SHARED, 'batchHandler'));
            const requests = sectionIds.map(id => ({
                id,
                request: () => deleteSection({ domain, token, course_id: courseId, section_id: id })
            }));
            return await batchHandler(requests, { batchSize: 10, timeDelay: 1000 });
        }
    },
];

// ============================================================================
// Enrollment Tools
// ============================================================================

const enrollmentTools = [
    {
        name: 'canvas_list_enrollments',
        description: 'List enrollments in a Canvas course. Returns user name, role, enrollment state, and dates.',
        destructive: false,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' }
            },
            required: ['domain', 'courseId']
        },
        execute: async ({ domain, token, courseId }) => {
            const { getCourseEnrollments } = require(path.join(CANVAS_API, 'enrollments'));
            return await getCourseEnrollments(domain, token, courseId);
        }
    },
    {
        name: 'canvas_enroll_user',
        description: 'Enroll a user in a Canvas course with a specific role.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                userId: { type: 'string', description: 'The Canvas user ID to enroll' },
                role: { type: 'string', enum: ['StudentEnrollment', 'TeacherEnrollment', 'TaEnrollment', 'ObserverEnrollment', 'DesignerEnrollment'], description: 'Enrollment role (default: StudentEnrollment)' },
                sectionId: { type: 'string', description: 'Optional section ID to enroll into' }
            },
            required: ['domain', 'courseId', 'userId']
        },
        execute: async ({ domain, token, courseId, userId, role, sectionId }) => {
            const { enrollUser } = require(path.join(CANVAS_API, 'users'));
            return await enrollUser({
                domain, token, course_id: courseId,
                user_id: userId,
                role: role || 'StudentEnrollment',
                section_id: sectionId
            });
        }
    },
];

// ============================================================================
// Conversation Tools
// ============================================================================

const conversationTools = [
    {
        name: 'canvas_get_conversations',
        description: 'Get conversations for a specific user, optionally filtered by subject. Uses GraphQL for efficient retrieval.',
        destructive: false,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                userId: { type: 'string', description: 'The Canvas user ID' },
                subject: { type: 'string', description: 'Optional subject filter to match conversations' }
            },
            required: ['domain', 'userId']
        },
        execute: async ({ domain, token, userId, subject }) => {
            const { getConversationsGraphQL } = require(path.join(CANVAS_API, 'conversations'));
            return await getConversationsGraphQL({ domain, token, user_id: userId, subject: subject || '' });
        }
    },
    {
        name: 'canvas_delete_conversations',
        description: 'Delete conversations for a specific user matching a subject. Fetches matching conversations then deletes them.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                userId: { type: 'string', description: 'The Canvas user ID' },
                subject: { type: 'string', description: 'Subject to match for deletion' }
            },
            required: ['domain', 'userId', 'subject']
        },
        execute: async ({ domain, token, userId, subject }) => {
            const { deleteForAll } = require(path.join(CANVAS_API, 'conversations'));
            return await deleteForAll({ domain, token, user_id: userId, subject });
        }
    },
    {
        name: 'canvas_get_deleted_conversations',
        description: 'Get deleted conversations from Canvas, optionally filtered by user ID and date range.',
        destructive: false,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                userId: { type: 'string', description: 'Optional user ID to filter by' },
                deletedAfter: { type: 'string', description: 'ISO date string - only show conversations deleted after this date' },
                deletedBefore: { type: 'string', description: 'ISO date string - only show conversations deleted before this date' }
            },
            required: ['domain']
        },
        execute: async ({ domain, token, userId, deletedAfter, deletedBefore }) => {
            const { getDeletedConversations } = require(path.join(CANVAS_API, 'conversations'));
            return await getDeletedConversations({
                domain, token,
                user_id: userId,
                deleted_after: deletedAfter,
                deleted_before: deletedBefore
            });
        }
    },
    {
        name: 'canvas_restore_conversations',
        description: 'Restore previously deleted conversations by their conversation IDs.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                conversationIds: {
                    type: 'array', items: { type: 'string' },
                    description: 'Array of conversation IDs to restore'
                }
            },
            required: ['domain', 'conversationIds']
        },
        execute: async ({ domain, token, conversationIds }) => {
            const { restoreConversationById } = require(path.join(CANVAS_API, 'conversations'));
            const batchHandler = require(path.join(SHARED, 'batchHandler'));
            const requests = conversationIds.map(id => ({
                id,
                request: () => restoreConversationById({ domain, token, conversation_id: id })
            }));
            return await batchHandler(requests, { batchSize: 10, timeDelay: 1000 });
        }
    },
];

// ============================================================================
// User Tools
// ============================================================================

const userTools = [
    {
        name: 'canvas_search_users',
        description: 'Search for Canvas users by name, email, or login ID. Returns matching users with their details.',
        destructive: false,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                searchTerm: { type: 'string', description: 'Search term (name, email, or login ID)' }
            },
            required: ['domain', 'searchTerm']
        },
        execute: async ({ domain, token, searchTerm }) => {
            // searchUsers uses axios.defaults, so we need to set them temporarily
            const axios = require('axios');
            const prevBaseURL = axios.defaults.baseURL;
            const prevAuth = axios.defaults.headers.common['Authorization'];
            try {
                axios.defaults.baseURL = `https://${domain}`;
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                const { searchUsers } = require(path.join(CANVAS_API, 'users'));
                return await searchUsers(searchTerm, ['email']);
            } finally {
                axios.defaults.baseURL = prevBaseURL;
                if (prevAuth) {
                    axios.defaults.headers.common['Authorization'] = prevAuth;
                } else {
                    delete axios.defaults.headers.common['Authorization'];
                }
            }
        }
    },
];

// ============================================================================
// Communication Channel Tools
// ============================================================================

const commChannelTools = [
    {
        name: 'canvas_check_email_bounce',
        description: 'Check if an email address is bounced in Canvas. Returns bounce status and details.',
        destructive: false,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                email: { type: 'string', description: 'Email address to check' }
            },
            required: ['domain', 'email']
        },
        execute: async ({ domain, token, email }) => {
            const { bounceCheck } = require(path.join(CANVAS_API, 'comm_channels'));
            return await bounceCheck(domain, token, email);
        }
    },
    {
        name: 'canvas_reset_email_bounce',
        description: 'Reset a bounced email address in Canvas so the user can receive emails again.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                userId: { type: 'string', description: 'The Canvas user ID' },
                channelId: { type: 'string', description: 'The communication channel ID' }
            },
            required: ['domain', 'userId', 'channelId']
        },
        execute: async ({ domain, token, userId, channelId }) => {
            const { resetEmail } = require(path.join(CANVAS_API, 'comm_channels'));
            return await resetEmail({ domain, token, user_id: userId, channel_id: channelId });
        }
    },
];

// ============================================================================
// Canvas API Reference Tool (searches cached Swagger spec)
// ============================================================================

const apiRefTools = [
    {
        name: 'canvas_api_reference',
        description: 'Search the Canvas REST API reference documentation for endpoints not covered by the other tools. Use this when the user asks about Canvas API endpoints you don\'t have a dedicated tool for, or when you need to provide guidance on how to call a specific API. Returns matching endpoint details including HTTP method, path, parameters, and description.',
        destructive: false,
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search terms to find relevant Canvas API endpoints (e.g., "rubrics", "grading standards", "calendar events", "content migrations")' },
                limit: { type: 'number', description: 'Maximum number of results to return (default: 10)' }
            },
            required: ['query']
        },
        execute: async ({ query, limit }) => {
            const { searchSpec, getSpecMeta } = require('../main/canvasApiSpec');
            const meta = getSpecMeta();
            if (!meta) {
                return {
                    error: 'Canvas API reference has not been loaded yet. Ask the user to scan the Canvas API from File menu → Re-scan Canvas API, or wait for the initial scan to complete.'
                };
            }
            const results = searchSpec(query, limit || 10);
            if (results.length === 0) {
                return {
                    message: `No Canvas API endpoints found matching "${query}". Try different search terms.`,
                    specInfo: { domain: meta.domain, totalEndpoints: meta.endpointCount, fetchedAt: meta.fetchedAt }
                };
            }
            return {
                matchCount: results.length,
                endpoints: results.map(ep => ({
                    method: ep.method,
                    path: ep.path,
                    summary: ep.summary,
                    resource: ep.resource,
                    description: ep.description,
                    parameters: ep.parameters.filter(p => p.required || p.paramType === 'path')
                }))
            };
        }
    }
];

// ============================================================================
// Canvas GraphQL Tools (schema browsing + query execution)
// ============================================================================

const graphqlTools = [
    {
        name: 'canvas_graphql_schema',
        description: 'Search the Canvas GraphQL API schema for available queries, mutations, and types. Use this FIRST (before canvas_api_reference) when exploring what Canvas API operations are available. Returns matching query fields, mutation fields, and type definitions with their arguments. If the schema has not been loaded yet, it will be introspected automatically.',
        destructive: false,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                query: { type: 'string', description: 'Search terms to find relevant GraphQL types, queries, or mutations (e.g., "assignment", "rubric", "submission", "enrollment")' },
                category: { type: 'string', enum: ['all', 'query', 'mutation', 'type'], description: 'Filter results by category (default: "all")' },
                limit: { type: 'number', description: 'Maximum number of results (default: 10)' }
            },
            required: ['domain', 'query']
        },
        execute: async ({ domain, token, query, category, limit }) => {
            const { searchGraphQLSchema, getGraphQLSchemaMeta, scanAndCacheGraphQLSchema } = require('../main/canvasGraphQL');

            // Auto-introspect if schema not cached
            let meta = getGraphQLSchemaMeta();
            if (!meta) {
                if (!token) {
                    return { error: 'GraphQL schema has not been loaded yet and no token is available. Ask the user to scan the Canvas API from File menu → Re-scan Canvas API.' };
                }
                const scanResult = await scanAndCacheGraphQLSchema(domain, token);
                if (!scanResult.success) {
                    return { error: `Failed to introspect GraphQL schema: ${scanResult.error}` };
                }
                meta = getGraphQLSchemaMeta();
            }

            const results = searchGraphQLSchema(query, category || 'all', limit || 10);
            if (results.length === 0) {
                return {
                    message: `No GraphQL schema entries found matching "${query}". Try different search terms.`,
                    schemaInfo: { domain: meta.domain, types: meta.typeCount, queries: meta.queryCount, mutations: meta.mutationCount }
                };
            }
            return { matchCount: results.length, results };
        }
    },
    {
        name: 'canvas_graphql_query',
        description: 'Execute a read-only GraphQL query against the Canvas LMS API. Use this to fetch data that the dedicated tools do not cover. Only SELECT/query operations are allowed — mutations are blocked. Write the complete GraphQL query string including field selections. Always search the schema first with canvas_graphql_schema to understand available fields and types.',
        destructive: false,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                query: { type: 'string', description: 'A valid GraphQL query string (must start with "query" or "{", NOT "mutation")' },
                variables: { type: 'object', description: 'Optional variables for the query', additionalProperties: true }
            },
            required: ['domain', 'query']
        },
        execute: async ({ domain, token, query, variables }) => {
            const { executeGraphQLQuery } = require('../main/canvasGraphQL');
            return await executeGraphQLQuery(domain, token, query, variables);
        }
    },
    {
        name: 'canvas_graphql_mutation',
        description: 'Execute a GraphQL mutation against the Canvas LMS API. Use this for write operations (create, update, delete) via GraphQL when no dedicated tool exists. The user will be asked to approve before execution. Always search the schema first with canvas_graphql_schema to discover available mutations, their input types, and return fields.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                mutation: { type: 'string', description: 'A valid GraphQL mutation string (must start with "mutation")' },
                variables: { type: 'object', description: 'Optional variables for the mutation', additionalProperties: true }
            },
            required: ['domain', 'mutation']
        },
        execute: async ({ domain, token, mutation, variables }) => {
            const { executeGraphQLMutation } = require('../main/canvasGraphQL');
            return await executeGraphQLMutation(domain, token, mutation, variables);
        }
    }
];

// ============================================================================
// Canvas REST API Call Tool (generic write access)
// ============================================================================

const restCallTools = [
    {
        name: 'canvas_rest_call',
        description: 'Execute a REST API call against the Canvas LMS API. Use this for operations not covered by dedicated tools. Supports GET, POST, PUT, PATCH, and DELETE methods. Non-GET requests require user approval before execution. Always search the API reference first with canvas_api_reference to find the correct endpoint, method, and parameters.',
        get destructive() { return true; },
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], description: 'HTTP method' },
                endpoint: { type: 'string', description: 'REST API endpoint path (e.g., "/api/v1/courses/123/assignments"). Must start with /api/' },
                body: { type: 'object', description: 'Request body for POST/PUT/PATCH requests', additionalProperties: true },
                queryParams: { type: 'object', description: 'URL query parameters', additionalProperties: true }
            },
            required: ['domain', 'method', 'endpoint']
        },
        execute: async ({ domain, token, method, endpoint, body, queryParams }) => {
            const axios = require('axios');

            // Validate endpoint starts with /api/ to prevent SSRF
            if (!/^\/api\//i.test(endpoint)) {
                throw new Error('Endpoint must start with /api/ (e.g., /api/v1/courses/123)');
            }

            const url = `https://${domain}${endpoint}`;
            const config = {
                method: method.toUpperCase(),
                url,
                headers: { 'Authorization': `Bearer ${token}` },
                timeout: 30000,
                ...(queryParams && { params: queryParams }),
                ...(body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) && { data: body })
            };

            const response = await axios(config);
            return response.data;
        }
    }
];

// ============================================================================
// Export all tools
// ============================================================================

const ALL_TOOLS = [
    ...courseTools,
    ...assignmentTools,
    ...assignmentGroupTools,
    ...moduleTools,
    ...pageTools,
    ...discussionTools,
    ...sectionTools,
    ...enrollmentTools,
    ...conversationTools,
    ...userTools,
    ...commChannelTools,
    ...graphqlTools,
    ...apiRefTools,
    ...restCallTools,
];

// Build lookup map for fast tool retrieval
const TOOL_MAP = new Map(ALL_TOOLS.map(t => [t.name, t]));

/**
 * Convert tools to OpenAI function calling format (for LLM)
 * Strips token from schemas since it's injected at runtime
 * @param {Object} [options]
 * @param {boolean} [options.excludeDomain] - If true, strip domain from schemas (used in Electron where domain is auto-injected)
 */
function toOpenAITools(tools = ALL_TOOLS, { excludeDomain = false } = {}) {
    return tools.map(tool => {
        let schema = tool.inputSchema;
        if (excludeDomain && schema.properties && schema.properties.domain) {
            const { domain, ...restProps } = schema.properties;
            const required = (schema.required || []).filter(r => r !== 'domain');
            schema = { ...schema, properties: restProps, required };
        }
        return {
            type: 'function',
            function: {
                name: tool.name,
                description: tool.description,
                parameters: schema
            }
        };
    });
}

/**
 * Get a specific tool definition by name
 */
function getTool(name) {
    return TOOL_MAP.get(name);
}

module.exports = {
    ALL_TOOLS,
    TOOL_MAP,
    toOpenAITools,
    getTool,
    // Category exports for selective use
    courseTools,
    assignmentTools,
    assignmentGroupTools,
    moduleTools,
    pageTools,
    discussionTools,
    sectionTools,
    enrollmentTools,
    conversationTools,
    userTools,
    commChannelTools,
};
