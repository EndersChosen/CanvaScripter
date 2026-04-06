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
        description: 'Create a new Canvas course in the root account. Optionally creates random test users (students and/or teachers) and enrolls them in the course automatically. This mirrors the "Create Support Courses" form. When the user asks to create a course with users, use this tool — no need to create users separately. Random users get generated names and email addresses based on the provided email base (e.g., "ckruger" produces emails like ckruger+FirstNameLastName123@instructure.com). If no email is provided, the domain prefix is used.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                name: { type: 'string', description: 'Course name' },
                publish: { type: 'boolean', description: 'Whether to publish the course immediately (default: false)' },
                blueprint: { type: 'boolean', description: 'Whether to make this a blueprint course (default: false)' },
                students: { type: 'number', description: 'Number of random student users to create and enroll (default: 0)' },
                teachers: { type: 'number', description: 'Number of random teacher users to create and enroll (default: 0)' },
                email: { type: 'string', description: 'Email base for generated users (e.g., "ckruger"). Produces emails like ckruger+FirstNameLastName123@instructure.com. If omitted, derived from domain prefix.' }
            },
            required: ['domain', 'name']
        },
        execute: async ({ domain, token, name, publish, blueprint, students, teachers, email }) => {
            const { createSupportCourse, editCourse } = require(path.join(CANVAS_API, 'courses'));
            const { addUsers, enrollUser, createUsers } = require(path.join(CANVAS_API, 'users'));
            const { batchHandler } = require(path.join(SHARED, 'batchHandler'));

            // 1. Create the course
            const course = await createSupportCourse({
                domain, token,
                course: { name, publish: publish || false }
            });

            const result = {
                id: course.id,
                name: course.name,
                workflowState: course.workflow_state
            };

            // 2. Enable blueprint if requested
            if (blueprint) {
                await editCourse({ domain, token, course_id: course.id });
                result.blueprint = true;
            }

            // 3. Create and enroll random users if requested
            const studentCount = Math.max(0, parseInt(students) || 0);
            const teacherCount = Math.max(0, parseInt(teachers) || 0);
            const totalUsers = studentCount + teacherCount;

            if (totalUsers > 0) {
                // Derive email base from domain if not provided (e.g., "ckruger" from "ckruger.beta.instructure.com")
                const emailBase = email || domain.split('.')[0];

                const studentUsers = createUsers(studentCount, emailBase);
                const teacherUsers = createUsers(teacherCount, emailBase);
                const allUsers = [...studentUsers, ...teacherUsers];

                // Create user accounts in Canvas
                const createRequests = allUsers.map((u, i) => ({
                    id: i + 1,
                    request: async () => addUsers({ domain, token, user: u })
                }));
                const createResult = await batchHandler(createRequests, { batchSize: 10, timeDelay: 1000 });
                const userIds = createResult.successful.map(r => r.value);

                // Enroll users in the course
                const enrollRequests = userIds.map((userId, i) => ({
                    id: i + 1,
                    request: async () => enrollUser({
                        domain, token,
                        course_id: course.id,
                        user_id: userId,
                        type: i < studentCount ? 'StudentEnrollment' : 'TeacherEnrollment'
                    })
                }));
                await batchHandler(enrollRequests, { batchSize: 10, timeDelay: 1000 });

                result.usersCreated = {
                    students: studentCount,
                    teachers: teacherCount,
                    total: totalUsers,
                    enrolled: userIds.length
                };
            }

            return result;
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
    {
        name: 'canvas_restore_courses',
        description: 'Restore (undelete) one or more deleted Canvas courses by their IDs. Use this when courses were accidentally deleted and need to be recovered.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseIds: { type: 'array', items: { type: 'string' }, description: 'Array of course IDs to restore' }
            },
            required: ['domain', 'courseIds']
        },
        execute: async ({ domain, token, courseIds }) => {
            const { restoreCourseBatch } = require(path.join(CANVAS_API, 'courses'));
            return await restoreCourseBatch(domain, token, courseIds);
        }
    },
    {
        name: 'canvas_restore_content',
        description: 'Restore a single deleted content item in a Canvas course (e.g., assignment, quiz, module, page, discussion, rubric). You need the item type context prefix and the item ID. Context prefixes: "assignment_" for assignments, "quiz_" for quizzes, "context_module_" for modules, "wiki_page_" for pages, "discussion_topic_" for discussions, "rubric_" for rubrics, "attachment_" for files.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                context: { type: 'string', description: 'The item type context prefix (e.g., "assignment_", "quiz_", "context_module_", "wiki_page_", "discussion_topic_", "rubric_", "attachment_")' },
                itemId: { type: 'string', description: 'The ID of the deleted item to restore' }
            },
            required: ['domain', 'courseId', 'context', 'itemId']
        },
        execute: async ({ domain, token, courseId, context, itemId }) => {
            const { restoreContent } = require(path.join(CANVAS_API, 'courses'));
            return await restoreContent({ domain, token, course_id: courseId, context, value: itemId });
        }
    },
];

// ============================================================================
// Quiz Tools (Classic Quizzes & New Quizzes)
// ============================================================================

const quizTools = [
    {
        name: 'canvas_list_classic_quizzes',
        description: 'List all classic quizzes in a Canvas course. Returns quiz ID, title, and type. Use this before deleting quizzes or checking Respondus/LockDown Browser settings.',
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
            const { getClassicQuizzes } = require(path.join(CANVAS_API, 'quizzes_classic'));
            return await getClassicQuizzes({ domain, token, courseID: courseId });
        }
    },
    {
        name: 'canvas_delete_classic_quizzes',
        description: 'Delete specific classic quizzes from a Canvas course by their IDs. List quizzes first to identify which to remove.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                quizIds: { type: 'array', items: { type: 'string' }, description: 'Array of classic quiz IDs to delete' }
            },
            required: ['domain', 'courseId', 'quizIds']
        },
        execute: async ({ domain, token, courseId, quizIds }) => {
            const { deleteClassicQuiz } = require(path.join(CANVAS_API, 'quizzes_classic'));
            const { batchHandler } = require(path.join(SHARED, 'batchHandler'));
            const requests = quizIds.map(id => ({
                id,
                request: () => deleteClassicQuiz({ domain, token, course_id: courseId, quiz_id: id })
            }));
            return await batchHandler(requests, { batchSize: 10, timeDelay: 1000 });
        }
    },
    {
        name: 'canvas_create_classic_quiz',
        description: 'Create a classic quiz in a Canvas course. For creating New Quizzes, use canvas_create_new_quiz instead.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                title: { type: 'string', description: 'Quiz title' },
                quizType: { type: 'string', enum: ['practice_quiz', 'assignment', 'graded_survey', 'survey'], description: 'Quiz type (default: assignment)' },
                published: { type: 'boolean', description: 'Whether to publish the quiz (default: false)' }
            },
            required: ['domain', 'courseId', 'title']
        },
        execute: async ({ domain, token, courseId, title, quizType, published }) => {
            const { createQuiz } = require(path.join(CANVAS_API, 'quizzes_classic'));
            return await createQuiz({ domain, token, course_id: courseId, quiz_title: title, quiz_type: quizType || 'assignment', publish: published || false });
        }
    },
    {
        name: 'canvas_create_new_quiz',
        description: 'Create a New Quiz in a Canvas course using the New Quizzes engine (quiz-lti). For classic quizzes, use canvas_create_classic_quiz instead.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                title: { type: 'string', description: 'Quiz title' },
                published: { type: 'boolean', description: 'Whether to publish (default: true)' },
                instructions: { type: 'string', description: 'Quiz instructions shown to students' }
            },
            required: ['domain', 'courseId', 'title']
        },
        execute: async ({ domain, token, courseId, title, published, instructions }) => {
            const { createNewQuiz } = require(path.join(CANVAS_API, 'quizzes_nq'));
            return await createNewQuiz({ domain, token, course_id: courseId, quiz_title: title, published: published !== false, instructions: instructions || '' });
        }
    },
    {
        name: 'canvas_get_respondus_quizzes',
        description: 'Find classic quizzes that have Respondus LockDown Browser settings enabled. Returns quizzes with require_lockdown_browser, require_lockdown_browser_for_results, or require_lockdown_browser_monitor set to true.',
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
            const { getRespondusQuizzes } = require(path.join(CANVAS_API, 'quizzes_classic'));
            const quizzes = await getRespondusQuizzes({ domain, token, courseID: courseId });
            return quizzes.map(q => ({
                id: q.id, title: q.title, quizType: q.quiz_type,
                requireLockdownBrowser: q.require_lockdown_browser,
                requireLockdownBrowserForResults: q.require_lockdown_browser_for_results,
                requireLockdownBrowserMonitor: q.require_lockdown_browser_monitor
            }));
        }
    },
    {
        name: 'canvas_update_respondus_quiz',
        description: 'Enable or disable Respondus LockDown Browser settings on a classic quiz. Sets all three LockDown Browser flags (browser, results, monitor) to the specified state.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                quizId: { type: 'string', description: 'The classic quiz ID' },
                enable: { type: 'boolean', description: 'true to enable LockDown Browser, false to disable' }
            },
            required: ['domain', 'courseId', 'quizId', 'enable']
        },
        execute: async ({ domain, token, courseId, quizId, enable }) => {
            const { updateRespondusQuiz } = require(path.join(CANVAS_API, 'quizzes_classic'));
            return await updateRespondusQuiz({ domain, token, course_id: courseId, quiz_id: quizId, enable });
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
            const { batchHandler } = require(path.join(SHARED, 'batchHandler'));
            const requests = assignmentIds.map(id => ({
                id,
                request: () => deleteAssignments({ domain, token, course_id: courseId, id })
            }));
            return await batchHandler(requests, { batchSize: 10, timeDelay: 1000 });
        }
    },
    {
        name: 'canvas_find_new_quizzes_open_in_new_tab',
        description: 'Find New Quiz assignments in a course that are configured to open in a new tab. Returns assignments where the external tool launch URL contains "quiz-lti" and new_tab is enabled. Use this when a user asks about New Quizzes opening in a new tab or wants to audit quiz launch settings.',
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
            const { getAssignments } = require(path.join(CANVAS_API, 'assignments'));
            const assignments = await getAssignments(domain, courseId, token);
            const matching = assignments.filter(a => {
                const tool = a.external_tool_tag_attributes;
                return tool && typeof tool.url === 'string' &&
                    tool.url.toLowerCase().includes('quiz-lti') &&
                    tool.new_tab === true;
            });
            return {
                count: matching.length,
                assignments: matching.map(a => ({
                    id: a.id,
                    name: a.name,
                    htmlUrl: a.html_url,
                    published: a.published,
                    externalToolUrl: a.external_tool_tag_attributes?.url
                }))
            };
        }
    },
    {
        name: 'canvas_disable_new_tab_new_quizzes',
        description: 'Disable the "open in new tab" setting on New Quiz assignments in a course. If assignmentIds are provided, only those assignments are updated. Otherwise, automatically finds all New Quiz assignments with new_tab enabled and disables them. Returns a summary of updated assignments. Use canvas_find_new_quizzes_open_in_new_tab first to preview which assignments will be affected.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain (e.g., myschool.instructure.com)' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                assignmentIds: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Optional array of specific assignment IDs to update. If omitted, all New Quiz assignments with new_tab enabled will be updated.'
                }
            },
            required: ['domain', 'courseId']
        },
        execute: async ({ domain, token, courseId, assignmentIds }) => {
            const { getAssignments, updateAssignment } = require(path.join(CANVAS_API, 'assignments'));
            const { batchHandler } = require(path.join(SHARED, 'batchHandler'));

            let targetIds = assignmentIds;

            // If no specific IDs provided, find all NQ assignments with new_tab enabled
            if (!targetIds || targetIds.length === 0) {
                const allAssignments = await getAssignments(domain, courseId, token);
                const matching = allAssignments.filter(a => {
                    const tool = a.external_tool_tag_attributes;
                    return tool && typeof tool.url === 'string' &&
                        tool.url.toLowerCase().includes('quiz-lti') &&
                        tool.new_tab === true;
                });
                targetIds = matching.map(a => String(a.id));
                if (targetIds.length === 0) {
                    return { updated: 0, message: 'No New Quiz assignments found with new_tab enabled.' };
                }
            }

            const payload = {
                assignment: {
                    external_tool_tag_attributes: {
                        new_tab: false
                    }
                }
            };

            const requests = targetIds.map((id, index) => ({
                id: index + 1,
                request: async () => {
                    const result = await updateAssignment({
                        domain, token, course_id: courseId,
                        assignment_id: id, payload
                    });
                    return { id: result.id, name: result.name };
                }
            }));

            const results = await batchHandler(requests, { batchSize: 10, timeDelay: 1000 });

            return {
                updated: targetIds.length,
                assignmentIds: targetIds,
                message: `Successfully disabled new_tab on ${targetIds.length} New Quiz assignment(s).`,
                results
            };
        }
    },
    {
        name: 'canvas_update_assignment',
        description: 'Update a single assignment in a Canvas course. Can modify any assignment property such as name, due date, points, submission types, published state, or external tool settings (e.g., disabling "open in new tab" for New Quizzes).',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                assignmentId: { type: 'string', description: 'The assignment ID to update' },
                payload: { type: 'object', description: 'The assignment update payload (e.g., { assignment: { name: "New Name", due_at: "2024-01-01T00:00:00Z" } })', additionalProperties: true }
            },
            required: ['domain', 'courseId', 'assignmentId', 'payload']
        },
        execute: async ({ domain, token, courseId, assignmentId, payload }) => {
            const { updateAssignment } = require(path.join(CANVAS_API, 'assignments'));
            return await updateAssignment({ domain, token, course_id: courseId, assignment_id: assignmentId, payload });
        }
    },
    {
        name: 'canvas_get_no_submission_assignments',
        description: 'Find assignments in a course that have no student submissions. Useful for auditing or cleaning up unused assignments.',
        destructive: false,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                graded: { type: 'boolean', description: 'If true, only return graded assignments with no submissions; if false, ungraded (default: false)' }
            },
            required: ['domain', 'courseId']
        },
        execute: async ({ domain, token, courseId, graded }) => {
            const { getNoSubmissionAssignments } = require(path.join(CANVAS_API, 'assignments'));
            return await getNoSubmissionAssignments(domain, courseId, token, graded || false);
        }
    },
    {
        name: 'canvas_get_unpublished_assignments',
        description: 'Find all unpublished (draft) assignments in a course. Useful for auditing course content that students cannot see.',
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
            const { getUnpublishedAssignments } = require(path.join(CANVAS_API, 'assignments'));
            return await getUnpublishedAssignments(domain, courseId, token);
        }
    },
    {
        name: 'canvas_get_non_module_assignments',
        description: 'Find assignments that are not placed in any module. Useful for finding orphaned assignments that students may not be able to discover through course navigation.',
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
            const { getNonModuleAssignments } = require(path.join(CANVAS_API, 'assignments'));
            return await getNonModuleAssignments(domain, courseId, token);
        }
    },
    {
        name: 'canvas_get_no_due_date_assignments',
        description: 'Find assignments that have no due date set. Useful for auditing course setup and ensuring all assignments have proper due dates.',
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
            const { getNoDueDateAssignments } = require(path.join(CANVAS_API, 'assignments'));
            return await getNoDueDateAssignments(domain, courseId, token);
        }
    },
    {
        name: 'canvas_move_assignments_to_group',
        description: 'Move one or more assignments to a different assignment group. First use canvas_list_assignments and canvas_list_assignment_groups to identify the assignment IDs and target group ID.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                assignmentIds: { type: 'array', items: { type: 'string' }, description: 'Array of assignment IDs to move' },
                groupId: { type: 'string', description: 'Target assignment group ID' }
            },
            required: ['domain', 'courseId', 'assignmentIds', 'groupId']
        },
        execute: async ({ domain, token, courseId, assignmentIds, groupId }) => {
            const { moveAssignmentToGroup } = require(path.join(CANVAS_API, 'assignments'));
            const { batchHandler } = require(path.join(SHARED, 'batchHandler'));
            const url = `https://${domain}/api/v1/courses/${courseId}/assignments`;
            const requests = assignmentIds.map(id => ({
                id,
                request: () => moveAssignmentToGroup({ url, token, id, groupID: groupId })
            }));
            return await batchHandler(requests, { batchSize: 10, timeDelay: 1000 });
        }
    },
    {
        name: 'canvas_filter_and_delete_assignments',
        description: 'Find and delete assignments matching multiple combined filters (AND logic). Supports filtering by: unpublished, no due date, not in any module, no submissions, not graded, due before a date, created before a date, from a specific content migration/import, in a specific assignment group, or NOT in a specific assignment group. Returns a preview of matching assignments unless the execute flag is set to true. After deletion, optionally cleans up empty assignment groups.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                filters: {
                    type: 'object',
                    description: 'Filter criteria (AND logic — all specified filters must match)',
                    properties: {
                        unpublished: { type: 'boolean', description: 'Only unpublished assignments' },
                        noDueDate: { type: 'boolean', description: 'Only assignments with no due date' },
                        notInModule: { type: 'boolean', description: 'Only assignments not placed in any module' },
                        noSubmissions: { type: 'boolean', description: 'Only assignments with no student submissions' },
                        excludeGraded: { type: 'boolean', description: 'Exclude assignments that have graded submissions (default: true)' },
                        dueBefore: { type: 'string', description: 'Only assignments with due date before this ISO date' },
                        createdBefore: { type: 'string', description: 'Only assignments created before this ISO date' },
                        fromImportId: { type: 'string', description: 'Only assignments that came from this content migration/import ID' },
                        inGroupId: { type: 'string', description: 'Only assignments in this assignment group ID' },
                        notInGroupId: { type: 'string', description: 'Only assignments NOT in this assignment group ID' }
                    }
                },
                execute: { type: 'boolean', description: 'If true, delete matching assignments. If false (default), only preview/return the list without deleting.' },
                deleteEmptyGroups: { type: 'boolean', description: 'If true, also delete any assignment groups left empty after deletion (default: false)' }
            },
            required: ['domain', 'courseId', 'filters']
        },
        execute: async ({ domain, token, courseId, filters, execute, deleteEmptyGroups }) => {
            const { getAllAssignmentsForCombined, deleteAssignments, getImportedAssignments } = require(path.join(CANVAS_API, 'assignments'));
            const { deleteEmptyAssignmentGroup, getEmptyAssignmentGroups } = require(path.join(CANVAS_API, 'assignment_groups'));
            const { batchHandler } = require(path.join(SHARED, 'batchHandler'));

            let filtered = await getAllAssignmentsForCombined({ domain, token, course_id: courseId });

            if (filters.unpublished) filtered = filtered.filter(a => !a.published);
            if (filters.noDueDate) filtered = filtered.filter(a => !a.dueAt);
            if (filters.notInModule) {
                filtered = filtered.filter(a => {
                    const inCore = a.modules && a.modules.length > 0;
                    const inQuiz = a.quiz?.modules?.length > 0;
                    const inDisc = a.discussion?.modules?.length > 0;
                    return !(inCore || inQuiz || inDisc);
                });
            }
            if (filters.noSubmissions) filtered = filtered.filter(a => !a.hasSubmittedSubmissions);
            if (filters.excludeGraded !== false) filtered = filtered.filter(a => !a.gradedSubmissionsExist);
            if (filters.dueBefore) {
                const cutoff = new Date(filters.dueBefore);
                cutoff.setHours(23, 59, 59, 999);
                filtered = filtered.filter(a => a.dueAt && new Date(a.dueAt) < cutoff);
            }
            if (filters.createdBefore) {
                const cutoff = new Date(filters.createdBefore);
                cutoff.setHours(23, 59, 59, 999);
                filtered = filtered.filter(a => a.createdAt && new Date(a.createdAt) < cutoff);
            }
            if (filters.fromImportId) {
                const importedIds = await getImportedAssignments({ domain, token, course_id: courseId, import_id: filters.fromImportId });
                const idSet = new Set(importedIds.map(id => String(id).trim()));
                filtered = filtered.filter(a => idSet.has(String(a._id).trim()));
            }
            if (filters.inGroupId) {
                filtered = filtered.filter(a => String(a.assignmentGroup?._id || '') === String(filters.inGroupId));
            }
            if (filters.notInGroupId) {
                filtered = filtered.filter(a => String(a.assignmentGroup?._id || '') !== String(filters.notInGroupId));
            }

            const preview = filtered.map(a => ({
                id: a._id, name: a.name, published: a.published,
                dueAt: a.dueAt, createdAt: a.createdAt,
                hasSubmissions: a.hasSubmittedSubmissions,
                assignmentGroup: a.assignmentGroup ? { id: a.assignmentGroup._id, name: a.assignmentGroup.name } : null
            }));

            if (!execute) {
                return { mode: 'preview', matchCount: preview.length, assignments: preview };
            }

            if (filtered.length === 0) {
                return { mode: 'execute', deleted: 0, message: 'No assignments matched the filters.' };
            }

            const requests = filtered.map(a => ({
                id: a._id,
                request: () => deleteAssignments({ domain, token, course_id: courseId, id: a._id })
            }));
            const deleteResult = await batchHandler(requests, { batchSize: 10, timeDelay: 1000 });

            let emptyGroupsDeleted = 0;
            if (deleteEmptyGroups) {
                const emptyGroups = await getEmptyAssignmentGroups({ domain, token, course: courseId });
                if (emptyGroups && emptyGroups.length > 0) {
                    const groupRequests = emptyGroups.map(g => ({
                        id: g._id || g.id,
                        request: () => deleteEmptyAssignmentGroup({ domain, token, course_id: courseId, group_id: g._id || g.id })
                    }));
                    await batchHandler(groupRequests, { batchSize: 10, timeDelay: 1000 });
                    emptyGroupsDeleted = emptyGroups.length;
                }
            }

            return {
                mode: 'execute',
                deleted: filtered.length,
                emptyGroupsDeleted,
                assignments: preview,
                deleteResult
            };
        }
    },
    {
        name: 'canvas_get_assignments_from_import',
        description: 'Get assignment IDs that were created by a specific content migration/import. Use canvas_list_content_migrations first to find the import ID, then use this to identify which assignments came from that import. Useful for selectively deleting imported content.',
        destructive: false,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                importId: { type: 'string', description: 'The content migration/import ID' }
            },
            required: ['domain', 'courseId', 'importId']
        },
        execute: async ({ domain, token, courseId, importId }) => {
            const { getImportedAssignments, getAllAssignmentsForCombined } = require(path.join(CANVAS_API, 'assignments'));
            const importedIds = await getImportedAssignments({ domain, token, course_id: courseId, import_id: importId });
            const idSet = new Set(importedIds.map(id => String(id).trim()));

            // Enrich with assignment details
            const allAssignments = await getAllAssignmentsForCombined({ domain, token, course_id: courseId });
            const matching = allAssignments.filter(a => idSet.has(String(a._id).trim()));

            return {
                importId,
                count: matching.length,
                assignments: matching.map(a => ({
                    id: a._id, name: a.name, published: a.published,
                    dueAt: a.dueAt, assignmentGroup: a.assignmentGroup ? { id: a.assignmentGroup._id, name: a.assignmentGroup.name } : null
                }))
            };
        }
    },
    {
        name: 'canvas_get_old_assignments',
        description: 'Find assignments with due dates or creation dates before a specified cutoff date. Useful for auditing stale content or cleaning up old assignments.',
        destructive: false,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                dueBefore: { type: 'string', description: 'ISO date - find assignments with due date before this date (e.g., "2024-01-01")' },
                createdBefore: { type: 'string', description: 'ISO date - find assignments created before this date (e.g., "2024-01-01")' },
                excludeGraded: { type: 'boolean', description: 'Exclude assignments that have graded submissions (default: true)' }
            },
            required: ['domain', 'courseId']
        },
        execute: async ({ domain, token, courseId, dueBefore, createdBefore, excludeGraded }) => {
            const { getAllAssignmentsForCombined } = require(path.join(CANVAS_API, 'assignments'));
            let assignments = await getAllAssignmentsForCombined({ domain, token, course_id: courseId });

            if (excludeGraded !== false) assignments = assignments.filter(a => !a.gradedSubmissionsExist);

            let filtered = [];
            if (dueBefore) {
                const cutoff = new Date(dueBefore);
                cutoff.setHours(23, 59, 59, 999);
                filtered = assignments.filter(a => a.dueAt && new Date(a.dueAt) < cutoff);
            }
            if (createdBefore) {
                const cutoff = new Date(createdBefore);
                cutoff.setHours(23, 59, 59, 999);
                const byCreated = assignments.filter(a => a.createdAt && new Date(a.createdAt) < cutoff);
                // Union with dueBefore results if both specified
                if (dueBefore) {
                    const idSet = new Set(filtered.map(a => a._id));
                    for (const a of byCreated) { if (!idSet.has(a._id)) filtered.push(a); }
                } else {
                    filtered = byCreated;
                }
            }

            return {
                count: filtered.length,
                assignments: filtered.map(a => ({
                    id: a._id, name: a.name, published: a.published,
                    dueAt: a.dueAt, createdAt: a.createdAt,
                    hasSubmissions: a.hasSubmittedSubmissions,
                    gradedSubmissionsExist: a.gradedSubmissionsExist,
                    assignmentGroup: a.assignmentGroup ? { id: a.assignmentGroup._id, name: a.assignmentGroup.name } : null
                }))
            };
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
    {
        name: 'canvas_delete_empty_modules',
        description: 'Find and delete all empty modules (modules with no items) in a Canvas course. First fetches only empty modules, then deletes them in bulk. Returns the list of deleted modules.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                preview: { type: 'boolean', description: 'If true, only list empty modules without deleting them (default: false)' }
            },
            required: ['domain', 'courseId']
        },
        execute: async ({ domain, token, courseId, preview }) => {
            const { getModules, deleteModule } = require(path.join(CANVAS_API, 'modules'));
            const batchHandler = require(path.join(SHARED, 'batchHandler'));
            const emptyModules = await getModules({ domain, token, course_id: courseId, emptyModules: true });
            const moduleList = emptyModules.map(m => ({ id: m.node._id, name: m.node.name }));

            if (preview || moduleList.length === 0) {
                return { count: moduleList.length, modules: moduleList, deleted: false };
            }

            const requests = moduleList.map(m => ({
                id: m.id,
                request: () => deleteModule({ domain, token, course_id: courseId, module_id: m.id })
            }));
            const result = await batchHandler(requests, { batchSize: 10, timeDelay: 1000 });

            return { count: moduleList.length, modules: moduleList, deleted: true, result };
        }
    },
    {
        name: 'canvas_relock_modules',
        description: 'Relock one or more modules in a Canvas course. This resets module access restrictions so prerequisite requirements and date locks are re-applied. Useful after making changes to module prerequisites.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                moduleIds: { type: 'array', items: { type: 'string' }, description: 'Array of module IDs to relock' }
            },
            required: ['domain', 'courseId', 'moduleIds']
        },
        execute: async ({ domain, token, courseId, moduleIds }) => {
            const { relockModule } = require(path.join(CANVAS_API, 'modules'));
            const batchHandler = require(path.join(SHARED, 'batchHandler'));
            const requests = moduleIds.map(id => ({
                id,
                request: () => relockModule({ domain, token, course_id: courseId, module_id: id })
            }));
            return await batchHandler(requests, { batchSize: 10, timeDelay: 1000 });
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
    {
        name: 'canvas_update_enrollment_state',
        description: 'Change the state of one or more enrollments in a Canvas course. Supports deleting, concluding, or deactivating enrollments. Requires the enrollment ID for each enrollment to update. Use canvas_list_enrollments first to find enrollment IDs.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                enrollments: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            enrollmentId: { type: 'string', description: 'The enrollment ID to update' },
                            task: { type: 'string', enum: ['delete', 'conclude', 'deactivate'], description: 'The state change to apply' }
                        },
                        required: ['enrollmentId', 'task']
                    },
                    description: 'Array of enrollment state changes to apply'
                }
            },
            required: ['domain', 'courseId', 'enrollments']
        },
        execute: async ({ domain, token, courseId, enrollments }) => {
            const axios = require('axios');
            const batchHandler = require(path.join(SHARED, 'batchHandler'));

            const requests = enrollments.map((e, index) => ({
                id: index + 1,
                request: async () => {
                    const response = await axios.delete(
                        `https://${domain}/api/v1/courses/${courseId}/enrollments/${e.enrollmentId}`,
                        {
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            params: { task: e.task }
                        }
                    );
                    return { enrollmentId: e.enrollmentId, task: e.task, status: response.status };
                }
            }));

            return await batchHandler(requests, { batchSize: 10, timeDelay: 1000 });
        }
    },
    {
        name: 'canvas_enroll_user_by_email',
        description: 'Enroll an existing Canvas user in a course by searching for them by email address. Looks up the user by email, then enrolls them with the specified role. Use this when a user asks to add a specific person (by email) to a course. If no section is specified, the default section is used.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                email: { type: 'string', description: 'Email address of the user to enroll' },
                role: { type: 'string', enum: ['StudentEnrollment', 'TeacherEnrollment', 'TaEnrollment', 'ObserverEnrollment', 'DesignerEnrollment'], description: 'Enrollment role (default: StudentEnrollment)' },
                sectionId: { type: 'string', description: 'Optional section ID to enroll into (uses default section if omitted)' }
            },
            required: ['domain', 'courseId', 'email']
        },
        execute: async ({ domain, token, courseId, email, role, sectionId }) => {
            const axios = require('axios');
            const { enrollUser } = require(path.join(CANVAS_API, 'users'));

            // Search for user by email
            const searchResponse = await axios.get(
                `https://${domain}/api/v1/accounts/self/users`,
                {
                    headers: { 'Authorization': `Bearer ${token}` },
                    params: { search_term: email, 'include[]': 'email' }
                }
            );

            const users = searchResponse.data;
            if (!users || users.length === 0) {
                throw new Error(`No user found with email "${email}". The user must exist in Canvas before they can be enrolled. Use canvas_create_and_enroll_users to create new users.`);
            }

            // Find exact email match if possible, otherwise use first result
            const exactMatch = users.find(u =>
                u.email && u.email.toLowerCase() === email.toLowerCase() ||
                u.login_id && u.login_id.toLowerCase() === email.toLowerCase()
            );
            const user = exactMatch || users[0];

            const enrollResult = await enrollUser({
                domain, token,
                course_id: courseId,
                user_id: user.id,
                type: role || 'StudentEnrollment',
                section_id: sectionId
            });

            return {
                enrolled: true,
                userId: user.id,
                userName: user.name,
                userEmail: user.email || user.login_id,
                role: role || 'StudentEnrollment',
                courseId,
                sectionId: sectionId || 'default',
                enrollmentStatus: enrollResult
            };
        }
    },
    {
        name: 'canvas_create_and_enroll_users',
        description: 'Create new random test users and enroll them in an existing Canvas course. Generates users with random names and email addresses (e.g., ckruger+FirstNameLastName123@instructure.com). Use this when the user wants to add test students or teachers to an existing course without specifying individual user details. This mirrors the user creation feature of the "Create Support Courses" form.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID to enroll users into' },
                students: { type: 'number', description: 'Number of random student users to create and enroll (default: 0)' },
                teachers: { type: 'number', description: 'Number of random teacher users to create and enroll (default: 0)' },
                email: { type: 'string', description: 'Email base for generated users (e.g., "ckruger"). If omitted, derived from domain prefix.' },
                sectionId: { type: 'string', description: 'Optional section ID to enroll users into (uses default section if omitted)' }
            },
            required: ['domain', 'courseId']
        },
        execute: async ({ domain, token, courseId, students, teachers, email, sectionId }) => {
            const { addUsers, enrollUser, createUsers } = require(path.join(CANVAS_API, 'users'));
            const { batchHandler } = require(path.join(SHARED, 'batchHandler'));

            const studentCount = Math.max(0, parseInt(students) || 0);
            const teacherCount = Math.max(0, parseInt(teachers) || 0);
            const totalUsers = studentCount + teacherCount;

            if (totalUsers === 0) {
                return { message: 'No users requested. Specify students and/or teachers count.' };
            }

            const emailBase = email || domain.split('.')[0];

            const studentUsers = createUsers(studentCount, emailBase);
            const teacherUsers = createUsers(teacherCount, emailBase);
            const allUsers = [...studentUsers, ...teacherUsers];

            // Create user accounts in Canvas
            const createRequests = allUsers.map((u, i) => ({
                id: i + 1,
                request: async () => addUsers({ domain, token, user: u })
            }));
            const createResult = await batchHandler(createRequests, { batchSize: 10, timeDelay: 1000 });
            const userIds = createResult.successful.map(r => r.value);

            // Enroll users in the course
            const enrollRequests = userIds.map((userId, i) => ({
                id: i + 1,
                request: async () => enrollUser({
                    domain, token,
                    course_id: courseId,
                    user_id: userId,
                    type: i < studentCount ? 'StudentEnrollment' : 'TeacherEnrollment',
                    section_id: sectionId
                })
            }));
            const enrollResult = await batchHandler(enrollRequests, { batchSize: 10, timeDelay: 1000 });

            return {
                courseId,
                usersCreated: userIds.length,
                usersEnrolled: enrollResult.successful.length,
                students: studentCount,
                teachers: teacherCount,
                emailPattern: `${emailBase}+<RandomName><RandomNumber>@instructure.com`,
                sectionId: sectionId || 'default',
                failures: createResult.failed.length + enrollResult.failed.length > 0 ? {
                    createFailed: createResult.failed.length,
                    enrollFailed: enrollResult.failed.length
                } : undefined
            };
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
    {
        name: 'canvas_check_unconfirmed_emails',
        description: 'Check for unconfirmed email communication channels matching a pattern. Returns a CSV stream of unconfirmed email addresses. Use this to find users whose email is not confirmed in Canvas.',
        destructive: false,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                pattern: { type: 'string', description: 'Email pattern to match (e.g., "example.com" to find all unconfirmed @example.com emails)' }
            },
            required: ['domain', 'pattern']
        },
        execute: async ({ domain, token, pattern }) => {
            const { checkUnconfirmedEmails } = require(path.join(CANVAS_API, 'comm_channels'));
            return await checkUnconfirmedEmails({ domain, token, pattern });
        }
    },
    {
        name: 'canvas_confirm_email',
        description: 'Confirm an unconfirmed email communication channel in Canvas. Use canvas_check_unconfirmed_emails first to find unconfirmed emails.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                email: { type: 'string', description: 'The exact email address to confirm' }
            },
            required: ['domain', 'email']
        },
        execute: async ({ domain, token, email }) => {
            const { confirmEmail } = require(path.join(CANVAS_API, 'comm_channels'));
            return await confirmEmail({ domain, token, email });
        }
    },
];

// ============================================================================
// Permission Tools
// ============================================================================

const permissionTools = [
    {
        name: 'canvas_enable_disable_all_permissions',
        description: 'Enable or disable ALL permissions for a specific role in a Canvas account. Resolves role by name or ID, fetches current permissions, consolidates grouped permissions, and applies a bulk update. Use this when a user wants to reset a role to all-enabled or all-disabled.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                accountId: { type: 'string', description: 'The Canvas account ID (use "self" for root account)' },
                role: { type: 'string', description: 'Role name (e.g., "Teacher") or numeric role ID' },
                action: { type: 'string', enum: ['enable', 'disable'], description: 'Whether to enable or disable all permissions' }
            },
            required: ['domain', 'accountId', 'role', 'action']
        },
        execute: async ({ domain, token, accountId, role, action }) => {
            const axios = require('axios');
            const enablePermissions = action === 'enable';

            // Resolve role ID
            let roleId;
            if (/^\d+$/.test(role)) {
                roleId = role;
            } else {
                // Fetch all roles and find by label
                let allRoles = [];
                let page = 1;
                while (true) {
                    const resp = await axios.get(
                        `https://${domain}/api/v1/accounts/${accountId}/roles?per_page=100&page=${page}`,
                        { headers: { 'Authorization': `Bearer ${token}` } }
                    );
                    allRoles = allRoles.concat(resp.data);
                    if (resp.data.length < 100) break;
                    page++;
                }
                const matched = allRoles.find(r => r.label && r.label.toLowerCase() === role.toLowerCase());
                if (!matched) throw new Error(`Role "${role}" not found in account ${accountId}`);
                roleId = matched.id;
            }

            // Fetch current permissions
            const roleResp = await axios.get(
                `https://${domain}/api/v1/accounts/${accountId}/roles/${roleId}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            const currentPermissions = roleResp.data.permissions || {};

            // Build consolidated permissions (group dedup)
            const updatedPermissions = {};
            const processedGroups = new Set();
            for (const [permKey, permValue] of Object.entries(currentPermissions)) {
                if (permValue.group) {
                    if (!processedGroups.has(permValue.group)) {
                        updatedPermissions[permValue.group] = { enabled: enablePermissions, locked: false, explicit: true };
                        processedGroups.add(permValue.group);
                    }
                } else {
                    updatedPermissions[permKey] = { enabled: enablePermissions, locked: false, explicit: true };
                }
            }

            // Apply bulk update
            await axios.put(
                `https://${domain}/api/v1/accounts/${accountId}/roles/${roleId}`,
                { permissions: updatedPermissions },
                { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
            );

            return {
                success: true,
                roleId,
                roleLabel: roleResp.data.label || role,
                totalPermissions: Object.keys(currentPermissions).length,
                updatesApplied: Object.keys(updatedPermissions).length,
                action
            };
        }
    },
    {
        name: 'canvas_match_permissions',
        description: 'Copy all permissions from a source role to a target role. Fetches the source role permissions, consolidates grouped permissions, then applies them one-by-one to the target role. Source and target can be on different accounts/domains. Use this to synchronize role configurations.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                sourceAccountId: { type: 'string', description: 'Source account ID' },
                sourceRole: { type: 'string', description: 'Source role name or numeric ID' },
                targetAccountId: { type: 'string', description: 'Target account ID' },
                targetRole: { type: 'string', description: 'Target role name or numeric ID' }
            },
            required: ['domain', 'sourceAccountId', 'sourceRole', 'targetAccountId', 'targetRole']
        },
        execute: async ({ domain, token, sourceAccountId, sourceRole, targetAccountId, targetRole }) => {
            const axios = require('axios');

            // Helper to resolve role ID
            const resolveRole = async (acctId, role) => {
                if (/^\d+$/.test(role)) return role;
                let allRoles = [];
                let page = 1;
                while (true) {
                    const resp = await axios.get(
                        `https://${domain}/api/v1/accounts/${acctId}/roles?per_page=100&page=${page}`,
                        { headers: { 'Authorization': `Bearer ${token}` } }
                    );
                    allRoles = allRoles.concat(resp.data);
                    if (resp.data.length < 100) break;
                    page++;
                }
                const matched = allRoles.find(r => r.label && r.label.toLowerCase() === role.toLowerCase());
                if (!matched) throw new Error(`Role "${role}" not found in account ${acctId}`);
                return String(matched.id);
            };

            const sourceRoleId = await resolveRole(sourceAccountId, sourceRole);
            const targetRoleId = await resolveRole(targetAccountId, targetRole);

            // Fetch source permissions
            const sourceResp = await axios.get(
                `https://${domain}/api/v1/accounts/${sourceAccountId}/roles/${sourceRoleId}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            const sourcePermissions = sourceResp.data.permissions || {};

            // Consolidate grouped permissions
            const permissionsToApply = {};
            const processedGroups = new Set();
            for (const [permKey, permValue] of Object.entries(sourcePermissions)) {
                if (permValue.group) {
                    if (!processedGroups.has(permValue.group)) {
                        permissionsToApply[permValue.group] = { enabled: permValue.enabled, locked: permValue.locked || false, explicit: true };
                        processedGroups.add(permValue.group);
                    }
                } else {
                    permissionsToApply[permKey] = { enabled: permValue.enabled, locked: permValue.locked || false, explicit: true };
                }
            }

            // Apply permissions one at a time to target
            const successful = [];
            const failed = [];
            for (const [permKey, permVal] of Object.entries(permissionsToApply)) {
                try {
                    await axios.put(
                        `https://${domain}/api/v1/accounts/${targetAccountId}/roles/${targetRoleId}`,
                        { permissions: { [permKey]: permVal } },
                        { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
                    );
                    successful.push(permKey);
                } catch (error) {
                    failed.push({ permission: permKey, error: error.response?.data?.errors?.[0]?.message || error.message });
                }
            }

            return {
                success: true,
                sourceRoleId,
                targetRoleId,
                sourcePermissionCount: Object.keys(sourcePermissions).length,
                updatesApplied: Object.keys(permissionsToApply).length,
                successCount: successful.length,
                failCount: failed.length,
                failedPermissions: failed
            };
        }
    },
];

// ============================================================================
// Content Migration Tools
// ============================================================================

const contentMigrationTools = [
    {
        name: 'canvas_list_content_migrations',
        description: 'List recent content migrations (imports) for a Canvas course. Returns migration IDs, type, dates, and status. Use this to find import IDs before inspecting imported assets.',
        destructive: false,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                perPage: { type: 'number', description: 'Number of results to return (default: 50)' }
            },
            required: ['domain', 'courseId']
        },
        execute: async ({ domain, token, courseId, perPage }) => {
            const { listContentMigrations } = require(path.join(CANVAS_API, 'imports'));
            return await listContentMigrations({ domain, token, course_id: courseId, per_page: perPage || 50 });
        }
    },
    {
        name: 'canvas_get_imported_assets',
        description: 'Get the assets (assignments, discussions, quizzes, etc.) that were created by a specific content migration/import. Use canvas_list_content_migrations first to find the migration ID.',
        destructive: false,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                importId: { type: 'string', description: 'The content migration/import ID' }
            },
            required: ['domain', 'courseId', 'importId']
        },
        execute: async ({ domain, token, courseId, importId }) => {
            const { getImportedAssets } = require(path.join(CANVAS_API, 'imports'));
            return await getImportedAssets({ domain, token, course_id: courseId, import_id: importId });
        }
    },
    {
        name: 'canvas_delete_imported_content',
        description: 'Delete content that was created by one or more content migrations/imports. Fetches imported assets for each migration, then deletes selected asset types. Supports: assignments, pages, modules, discussions, quizzes, attachments (files), folders, grading_standards, group_categories, announcements. Deduplicates IDs across multiple imports. Use canvas_list_content_migrations and canvas_get_imported_assets first to preview.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                importIds: { type: 'array', items: { type: 'string' }, description: 'Array of content migration/import IDs to process' },
                assetTypes: {
                    type: 'array',
                    items: { type: 'string', enum: ['assignments', 'pages', 'modules', 'discussions', 'quizzes', 'attachments', 'folders', 'grading_standards', 'group_categories', 'announcements'] },
                    description: 'Which asset types to delete from the imports'
                }
            },
            required: ['domain', 'courseId', 'importIds', 'assetTypes']
        },
        execute: async ({ domain, token, courseId, importIds, assetTypes }) => {
            const { getImportedAssets } = require(path.join(CANVAS_API, 'imports'));
            const batchHandler = require(path.join(SHARED, 'batchHandler'));

            // Asset type to Canvas API class mapping
            const classMap = {
                assignments: 'Assignment', pages: 'WikiPage', modules: 'ContextModule',
                discussions: 'DiscussionTopic', quizzes: 'Quizzes::Quiz',
                attachments: 'Attachment', folders: 'Folder',
                grading_standards: 'GradingStandard', group_categories: 'GroupCategory',
                announcements: 'Announcement'
            };

            // Collect and deduplicate asset IDs across imports
            const aggregated = {};
            for (const type of assetTypes) aggregated[type] = new Set();

            for (const importId of importIds) {
                const assets = await getImportedAssets({ domain, token, course_id: courseId, import_id: importId });
                if (assets && Array.isArray(assets)) {
                    for (const asset of assets) {
                        for (const type of assetTypes) {
                            if (asset.type === classMap[type] || asset['class'] === classMap[type]) {
                                aggregated[type].add(String(asset.id));
                            }
                        }
                    }
                }
            }

            const results = {};
            const deleters = {
                assignments: async (ids) => {
                    const { deleteAssignments } = require(path.join(CANVAS_API, 'assignments'));
                    const reqs = ids.map(id => ({ id, request: () => deleteAssignments({ domain, token, course_id: courseId, id }) }));
                    return await batchHandler(reqs, { batchSize: 10, timeDelay: 1000 });
                },
                pages: async (ids) => {
                    const { deletePage } = require(path.join(CANVAS_API, 'pages'));
                    const reqs = ids.map(id => ({ id, request: () => deletePage({ domain, token, course_id: courseId, page_id: id }) }));
                    return await batchHandler(reqs, { batchSize: 10, timeDelay: 1000 });
                },
                modules: async (ids) => {
                    const { deleteModule } = require(path.join(CANVAS_API, 'modules'));
                    const reqs = ids.map(id => ({ id, request: () => deleteModule({ domain, token, course_id: courseId, module_id: id }) }));
                    return await batchHandler(reqs, { batchSize: 10, timeDelay: 1000 });
                },
                discussions: async (ids) => {
                    const { deleteDiscussionTopic } = require(path.join(CANVAS_API, 'discussions'));
                    const reqs = ids.map(id => ({ id, request: () => deleteDiscussionTopic({ domain, token, course_id: courseId, topic_id: id }) }));
                    return await batchHandler(reqs, { batchSize: 10, timeDelay: 1000 });
                },
                quizzes: async (ids) => {
                    const { deleteClassicQuiz } = require(path.join(CANVAS_API, 'quizzes_classic'));
                    const reqs = ids.map(id => ({ id, request: () => deleteClassicQuiz({ domain, token, course_id: courseId, quiz_id: id }) }));
                    return await batchHandler(reqs, { batchSize: 10, timeDelay: 1000 });
                },
                attachments: async (ids) => {
                    const { deleteFile } = require(path.join(CANVAS_API, 'files'));
                    const reqs = ids.map(id => ({ id, request: () => deleteFile({ domain, token, id }) }));
                    return await batchHandler(reqs, { batchSize: 10, timeDelay: 1000 });
                },
                folders: async (ids) => {
                    const { deleteFolder } = require(path.join(CANVAS_API, 'folders'));
                    const reqs = ids.map(id => ({ id, request: () => deleteFolder({ domain, token, id }) }));
                    return await batchHandler(reqs, { batchSize: 10, timeDelay: 1000 });
                },
                grading_standards: async (ids) => {
                    const { deleteGradingStandards } = require(path.join(CANVAS_API, 'grading_standards'));
                    return await deleteGradingStandards({ domain, token, course_id: courseId, grading_standards: ids.map(id => ({ id })) });
                },
                group_categories: async (ids) => {
                    const { deleteGroupCategory } = require(path.join(CANVAS_API, 'group_categories'));
                    const reqs = ids.map(id => ({ id, request: () => deleteGroupCategory({ domain, token, id }) }));
                    return await batchHandler(reqs, { batchSize: 10, timeDelay: 1000 });
                },
                announcements: async (ids) => {
                    const { deleteDiscussionTopic } = require(path.join(CANVAS_API, 'discussions'));
                    const reqs = ids.map(id => ({ id, request: () => deleteDiscussionTopic({ domain, token, course_id: courseId, topic_id: id }) }));
                    return await batchHandler(reqs, { batchSize: 10, timeDelay: 1000 });
                }
            };

            for (const type of assetTypes) {
                const ids = Array.from(aggregated[type]);
                if (ids.length > 0 && deleters[type]) {
                    results[type] = { count: ids.length, result: await deleters[type](ids) };
                } else {
                    results[type] = { count: 0, result: 'No assets found' };
                }
            }

            return {
                importIds,
                assetTypes,
                results
            };
        }
    },
];

// ============================================================================
// Page Views / Analytics Tools
// ============================================================================

const pageViewTools = [
    {
        name: 'canvas_get_page_views',
        description: 'Get page view analytics for one or more Canvas users. Returns a list of page views including URL, timestamp, user agent, and interaction type. Useful for auditing user activity or investigating access patterns.',
        destructive: false,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                userIds: { type: 'array', items: { type: 'string' }, description: 'Array of user IDs to get page views for' },
                startDate: { type: 'string', description: 'ISO date string for start of date range (e.g., "2024-01-01T00:00:00Z")' },
                endDate: { type: 'string', description: 'ISO date string for end of date range (e.g., "2024-12-31T23:59:59Z")' }
            },
            required: ['domain', 'userIds', 'startDate', 'endDate']
        },
        execute: async ({ domain, token, userIds, startDate, endDate }) => {
            const { getPageViews } = require(path.join(CANVAS_API, 'users'));
            return await getPageViews({ domain, token, userIds, start: startDate, end: endDate });
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
// Search Tools
// ============================================================================

const searchTools = [
    {
        name: 'canvas_search_accounts',
        description: 'Search for a Canvas account by its ID. Returns the account name, SIS ID, parent account SIS ID, and status. Useful for looking up account details before creating courses or SIS imports.',
        destructive: false,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                accountId: { type: 'string', description: 'The Canvas account ID to look up' }
            },
            required: ['domain', 'accountId']
        },
        execute: async ({ domain, token, accountId }) => {
            const axios = require('axios');
            const prevBaseURL = axios.defaults.baseURL;
            const prevAuth = axios.defaults.headers.common['Authorization'];
            try {
                axios.defaults.baseURL = `https://${domain}/api/v1`;
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                const { searchAccounts } = require(path.join(CANVAS_API, 'accounts'));
                return await searchAccounts(accountId);
            } finally {
                axios.defaults.baseURL = prevBaseURL;
                if (prevAuth) { axios.defaults.headers.common['Authorization'] = prevAuth; }
                else { delete axios.defaults.headers.common['Authorization']; }
            }
        }
    },
    {
        name: 'canvas_search_courses_sis',
        description: 'Search for a Canvas course by its ID and return SIS-formatted data including SIS ID, short name, long name, account SIS ID, term SIS ID, and status. Useful for auditing SIS data or verifying course setup.',
        destructive: false,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID to look up' }
            },
            required: ['domain', 'courseId']
        },
        execute: async ({ domain, token, courseId }) => {
            const axios = require('axios');
            const prevBaseURL = axios.defaults.baseURL;
            const prevAuth = axios.defaults.headers.common['Authorization'];
            try {
                axios.defaults.baseURL = `https://${domain}/api/v1`;
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                const { searchCourses } = require(path.join(CANVAS_API, 'courses'));
                return await searchCourses(courseId);
            } finally {
                axios.defaults.baseURL = prevBaseURL;
                if (prevAuth) { axios.defaults.headers.common['Authorization'] = prevAuth; }
                else { delete axios.defaults.headers.common['Authorization']; }
            }
        }
    },
    {
        name: 'canvas_search_terms',
        description: 'Search for a Canvas enrollment term by its ID. Returns term details including name, dates, and SIS ID.',
        destructive: false,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                termId: { type: 'string', description: 'The enrollment term ID to look up' }
            },
            required: ['domain', 'termId']
        },
        execute: async ({ domain, token, termId }) => {
            const axios = require('axios');
            const prevBaseURL = axios.defaults.baseURL;
            const prevAuth = axios.defaults.headers.common['Authorization'];
            try {
                axios.defaults.baseURL = `https://${domain}/api/v1`;
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                const { searchTerms } = require(path.join(CANVAS_API, 'terms'));
                return await searchTerms(termId);
            } finally {
                axios.defaults.baseURL = prevBaseURL;
                if (prevAuth) { axios.defaults.headers.common['Authorization'] = prevAuth; }
                else { delete axios.defaults.headers.common['Authorization']; }
            }
        }
    },
    {
        name: 'canvas_search_user_logins',
        description: 'Get login records for a Canvas user by Canvas user ID or SIS user ID. Returns login unique IDs, SIS user IDs, and authentication provider IDs. Useful for auditing user authentication setup.',
        destructive: false,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                userId: { type: 'string', description: 'The user ID to look up logins for' },
                idType: { type: 'string', enum: ['canvas_id', 'sis_user_id'], description: 'Type of user ID provided (default: canvas_id)' }
            },
            required: ['domain', 'userId']
        },
        execute: async ({ domain, token, userId, idType }) => {
            const { searchUserLogins } = require(path.join(CANVAS_API, 'logins'));
            return await searchUserLogins(domain, token, userId, idType || 'canvas_id');
        }
    },
];

// ============================================================================
// Blueprint Course Tools
// ============================================================================

const blueprintTools = [
    {
        name: 'canvas_associate_blueprint_courses',
        description: 'Associate one or more courses with a blueprint course. The blueprint course must already be configured as a blueprint. Associated courses will receive content syncs from the blueprint.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                blueprintCourseId: { type: 'string', description: 'The blueprint course ID' },
                courseIds: { type: 'array', items: { type: 'string' }, description: 'Array of course IDs to associate with the blueprint' }
            },
            required: ['domain', 'blueprintCourseId', 'courseIds']
        },
        execute: async ({ domain, token, blueprintCourseId, courseIds }) => {
            const { associateCourses } = require(path.join(CANVAS_API, 'courses'));
            return await associateCourses({ domain, token, bpCourseID: blueprintCourseId, associated_course_ids: courseIds });
        }
    },
    {
        name: 'canvas_sync_blueprint',
        description: 'Trigger a blueprint sync to push content from a blueprint course to all associated courses. Returns the migration/sync job details.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                blueprintCourseId: { type: 'string', description: 'The blueprint course ID to sync from' }
            },
            required: ['domain', 'blueprintCourseId']
        },
        execute: async ({ domain, token, blueprintCourseId }) => {
            const { syncBPCourses } = require(path.join(CANVAS_API, 'courses'));
            return await syncBPCourses({ domain, token, bpCourseID: blueprintCourseId });
        }
    },
    {
        name: 'canvas_get_course_state',
        description: 'Check the workflow state of a Canvas course (e.g., available, unpublished, completed, deleted). Useful for verifying course status before performing operations.',
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
            const { getCourseState } = require(path.join(CANVAS_API, 'courses'));
            return await getCourseState(domain, token, courseId);
        }
    },
];

// ============================================================================
// Quiz Question Tools
// ============================================================================

const quizQuestionTools = [
    {
        name: 'canvas_create_classic_quiz_questions',
        description: 'Add sample questions to an existing classic quiz. Creates questions of specified types with pre-built content. Supported types: calculated_question, essay_question, file_upload_question, fill_in_multiple_blanks_question, matching_question, multiple_answers_question, multiple_choice_question, multiple_dropdowns_question, numerical_question, short_answer_question, text_only_question, true_false_question. Use canvas_list_classic_quizzes first to find the quiz ID.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                quizId: { type: 'string', description: 'The classic quiz ID to add questions to' },
                questions: {
                    type: 'object',
                    description: 'Object mapping question type keys to { enabled: true, number: N, name: "type_name" }. Example: { "0": { "enabled": true, "number": 2, "name": "multiple_choice_question" }, "1": { "enabled": true, "number": 1, "name": "essay_question" } }',
                    additionalProperties: true
                }
            },
            required: ['domain', 'courseId', 'quizId', 'questions']
        },
        execute: async ({ domain, token, courseId, quizId, questions }) => {
            const { createQuestions } = require(path.join(CANVAS_API, 'quizzes_classic'));
            await createQuestions({
                domain, token,
                course_id: courseId,
                quiz_id: quizId,
                question_data: questions
            });
            return { success: true, quizId, message: 'Questions added to classic quiz.' };
        }
    },
    {
        name: 'canvas_create_new_quiz_questions',
        description: 'Add sample questions to an existing New Quiz. Creates questions of specified types with pre-built content. Supported types: multiple_choice, multi_answer, true_false, essay, numeric, fill_in_blank, matching, categorization, file_upload, formula, ordering, stimulus. Use canvas_create_new_quiz first to create the quiz, then add questions.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                quizId: { type: 'string', description: 'The New Quiz assignment ID' },
                questionTypes: {
                    type: 'array',
                    items: { type: 'string', enum: ['multiple_choice', 'multi_answer', 'true_false', 'essay', 'numeric', 'fill_in_blank', 'matching', 'categorization', 'file_upload', 'formula', 'ordering', 'stimulus'] },
                    description: 'Array of question types to add (one question per type entry, repeat for multiples)'
                }
            },
            required: ['domain', 'courseId', 'quizId', 'questionTypes']
        },
        execute: async ({ domain, token, courseId, quizId, questionTypes }) => {
            const { addItemsToNewQuiz } = require(path.join(CANVAS_API, 'quizzes_nq'));
            const created = await addItemsToNewQuiz({ domain, token, course_id: courseId, quiz_id: quizId, questionTypes });
            return { success: true, quizId, questionsCreated: created.length, items: created };
        }
    },
];

// ============================================================================
// Advanced Enrollment Tools
// ============================================================================

const advancedEnrollmentTools = [
    {
        name: 'canvas_get_section_enrollments',
        description: 'Get all enrollments in a specific course section. Returns user details, roles, and enrollment status for each enrollment in the section.',
        destructive: false,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                sectionId: { type: 'string', description: 'The Canvas section ID' }
            },
            required: ['domain', 'sectionId']
        },
        execute: async ({ domain, token, sectionId }) => {
            const { getSectionEnrollments } = require(path.join(CANVAS_API, 'enrollments'));
            return await getSectionEnrollments(domain, token, sectionId);
        }
    },
    {
        name: 'canvas_get_user_enrollments',
        description: 'Get all enrollments for a specific Canvas user across all courses. Returns course IDs, roles, section IDs, and enrollment status.',
        destructive: false,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                userId: { type: 'string', description: 'The Canvas user ID' }
            },
            required: ['domain', 'userId']
        },
        execute: async ({ domain, token, userId }) => {
            const { getUserEnrollments } = require(path.join(CANVAS_API, 'enrollments'));
            return await getUserEnrollments(domain, token, userId);
        }
    },
];

// ============================================================================
// User Management Tools
// ============================================================================

const userManagementTools = [
    {
        name: 'canvas_get_user_comm_channels',
        description: 'Get all communication channels (email, SMS, push) for a Canvas user. Returns channel type, address, position, and workflow state. Useful for auditing or debugging notification delivery issues.',
        destructive: false,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                userId: { type: 'string', description: 'The Canvas user ID' }
            },
            required: ['domain', 'userId']
        },
        execute: async ({ domain, token, userId }) => {
            const { getCommChannels } = require(path.join(CANVAS_API, 'users'));
            return await getCommChannels(domain, userId, token);
        }
    },
    {
        name: 'canvas_update_notifications',
        description: 'Update notification preferences for a user on a specific communication channel. Sets the frequency for all notification categories (e.g., due dates, grading, discussions, announcements). Frequency options: immediately, daily, weekly, never.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                userId: { type: 'string', description: 'The Canvas user ID' },
                commChannelId: { type: 'string', description: 'The communication channel ID (get from canvas_get_user_comm_channels)' },
                frequency: { type: 'string', enum: ['immediately', 'daily', 'weekly', 'never'], description: 'Notification frequency to set for all categories' }
            },
            required: ['domain', 'userId', 'commChannelId', 'frequency']
        },
        execute: async ({ domain, token, userId, commChannelId, frequency }) => {
            const { updateNotifications } = require(path.join(CANVAS_API, 'users'));
            return await updateNotifications(frequency, domain, userId, commChannelId, token);
        }
    },
];

// ============================================================================
// File & Folder Tools
// ============================================================================

const fileTools = [
    {
        name: 'canvas_delete_file',
        description: 'Delete a file from Canvas by its file ID. This permanently removes the file.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                fileId: { type: 'string', description: 'The Canvas file ID to delete' }
            },
            required: ['domain', 'fileId']
        },
        execute: async ({ domain, token, fileId }) => {
            const { deleteFile } = require(path.join(CANVAS_API, 'files'));
            const result = await deleteFile({ domain, token, id: fileId });
            return { success: true, deletedFileId: result };
        }
    },
    {
        name: 'canvas_get_folder',
        description: 'Get metadata for a Canvas folder by its ID. Returns folder name, full path, parent folder ID, files count, and folders count.',
        destructive: false,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                folderId: { type: 'string', description: 'The Canvas folder ID' }
            },
            required: ['domain', 'folderId']
        },
        execute: async ({ domain, token, folderId }) => {
            const { getFolder } = require(path.join(CANVAS_API, 'folders'));
            return await getFolder({ domain, token, id: folderId });
        }
    },
    {
        name: 'canvas_delete_folder',
        description: 'Delete a Canvas folder by its ID. This permanently removes the folder and may affect files within it.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                folderId: { type: 'string', description: 'The Canvas folder ID to delete' }
            },
            required: ['domain', 'folderId']
        },
        execute: async ({ domain, token, folderId }) => {
            const { deleteFolder } = require(path.join(CANVAS_API, 'folders'));
            const result = await deleteFolder({ domain, token, id: folderId });
            return { success: true, deletedFolderId: result };
        }
    },
];

// ============================================================================
// SIS Import Tools
// ============================================================================

const sisImportTools = [
    {
        name: 'canvas_generate_sis_csv',
        description: 'Generate SIS-formatted CSV data for Canvas. Returns the CSV content as a string. Supported file types: users, accounts, terms, courses, sections, enrollments, group_categories, groups, group_memberships, admins, logins, xlists (cross-listings), user_observers, change_sis_ids, differentiation_tag_sets, differentiation_tags, differentiation_tag_memberships. Use this for creating test data or preparing SIS imports.',
        destructive: false,
        inputSchema: {
            type: 'object',
            properties: {
                fileType: {
                    type: 'string',
                    enum: ['users', 'accounts', 'terms', 'courses', 'sections', 'enrollments', 'group_categories', 'groups', 'group_memberships', 'admins', 'logins', 'xlists', 'user_observers', 'change_sis_ids', 'differentiation_tag_sets', 'differentiation_tags', 'differentiation_tag_memberships'],
                    description: 'Type of SIS data to generate'
                },
                rowCount: { type: 'number', description: 'Number of rows to generate (default: 10)' },
                emailDomain: { type: 'string', description: 'Email domain for generated users (default: @school.edu)' },
                options: { type: 'object', description: 'Type-specific options (e.g., for enrollments: { courseId, sectionId, role })', additionalProperties: true }
            },
            required: ['fileType']
        },
        execute: async ({ fileType, rowCount, emailDomain, options }) => {
            const sis = require(path.join(CANVAS_API, 'sis_imports'));
            const count = rowCount || 10;
            const domain = emailDomain || '@school.edu';

            const generators = {
                users: () => sis.generateUsersCSV(count, { emailDomain: domain, ...options }),
                accounts: () => sis.generateAccountsCSV(count, options || {}),
                terms: () => sis.generateTermsCSV(count, options || {}),
                courses: () => sis.generateCoursesCSV(count, options || {}),
                sections: () => sis.generateSectionsCSV(count, options || {}),
                enrollments: () => sis.generateEnrollmentsCSV(count, options || {}),
                group_categories: () => sis.generateGroupCategoriesCSV(count, options || {}),
                groups: () => sis.generateGroupsCSV(count, options || {}),
                group_memberships: () => sis.generateGroupMembershipsCSV(count, options || {}),
                admins: () => sis.generateAdminsCSV(count, options || {}),
                logins: () => sis.generateLoginsCSV(count, options || {}),
                xlists: () => sis.generateXlistsCSV(count, options || {}),
                user_observers: () => sis.generateUserObserversCSV(count, options || {}),
                change_sis_ids: () => sis.generateChangeSisIdCSV(count, options || {}),
                differentiation_tag_sets: () => sis.generateDifferentiationTagSetsCSV(count, options || {}),
                differentiation_tags: () => sis.generateDifferentiationTagsCSV(count, options || {}),
                differentiation_tag_memberships: () => sis.generateDifferentiationTagMembershipCSV(count, options || {}),
            };

            const generator = generators[fileType];
            if (!generator) throw new Error(`Unsupported SIS file type: ${fileType}`);

            const csv = generator();
            return { fileType, rowCount: count, csv };
        }
    },
];

// ============================================================================
// Grading Standard & Group Category Tools
// ============================================================================

const gradingGroupTools = [
    {
        name: 'canvas_delete_grading_standards',
        description: 'Delete grading standards from a Canvas course by their IDs.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                courseId: { type: 'string', description: 'The Canvas course ID' },
                gradingStandardIds: { type: 'array', items: { type: 'string' }, description: 'Array of grading standard IDs to delete' }
            },
            required: ['domain', 'courseId', 'gradingStandardIds']
        },
        execute: async ({ domain, token, courseId, gradingStandardIds }) => {
            const { deleteGradingStandards } = require(path.join(CANVAS_API, 'grading_standards'));
            return await deleteGradingStandards({
                domain, token, course_id: courseId,
                grading_standards: gradingStandardIds.map(id => ({ id }))
            });
        }
    },
    {
        name: 'canvas_delete_group_category',
        description: 'Delete a group category from Canvas by its ID.',
        destructive: true,
        inputSchema: {
            type: 'object',
            properties: {
                domain: { type: 'string', description: 'Canvas instance domain' },
                groupCategoryId: { type: 'string', description: 'The group category ID to delete' }
            },
            required: ['domain', 'groupCategoryId']
        },
        execute: async ({ domain, token, groupCategoryId }) => {
            const { deleteGroupCategory } = require(path.join(CANVAS_API, 'group_categories'));
            const result = await deleteGroupCategory({ domain, token, id: groupCategoryId });
            return { success: true, deletedGroupCategoryId: result };
        }
    },
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
    ...quizTools,
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
    ...permissionTools,
    ...contentMigrationTools,
    ...pageViewTools,
    ...searchTools,
    ...blueprintTools,
    ...quizQuestionTools,
    ...advancedEnrollmentTools,
    ...userManagementTools,
    ...fileTools,
    ...sisImportTools,
    ...gradingGroupTools,
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
    quizTools,
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
    permissionTools,
    contentMigrationTools,
    pageViewTools,
    searchTools,
    blueprintTools,
    quizQuestionTools,
    advancedEnrollmentTools,
    userManagementTools,
    fileTools,
    sisImportTools,
    gradingGroupTools,
};
