// quizzes_nq.js - New Quizzes API helpers

const axios = require('axios');
const { errorCheck } = require('../utilities');

async function createNewQuiz(data) {
    // POST /api/quiz/v1/courses/:course_id/quizzes
    const axiosConfig = {
        method: 'post',
        url: `https://${data.domain}/api/quiz/v1/courses/${data.course_id}/quizzes`,
        headers: {
            Authorization: `Bearer ${data.token}`,
        },
        data: {
            quiz: {
                title: data.quiz_title,
                published: data.published ?? true,
                grading_type: data.grading_type ?? 'points',
                points_possible: 10, // default total points for the quiz
                // Additional quiz settings can be added here if needed
            },
        },
    };

    try {
        const request = async () => axios(axiosConfig);
        const response = await errorCheck(request);
        return response.data;
    } catch (error) {
        throw error;
    }
}

// -----------------------------------------------------------------------------
// New Quiz Item Builders (minimal viable payloads per Canvas New Quiz Items API)
// NOTE: At this stage we implement a conservative subset of question types that
// reliably succeed with minimal required fields. Unsupported types are skipped
// (logged) to avoid breaking the overall flow.
// Supported UI -> API mapping:
//  multiple_choice -> choice
//  true_false      -> true-false
//  essay           -> essay
//  numeric         -> numeric
//  fill_in_blank   -> rich-fill-blank (basic single blank example)
//  short_answer    -> rich-fill-blank (alias – treated same as fill_in_blank)
// Unsupported (for now, due to heavier data requirements): matching, categorization,
// hot_spot (needs image upload), etc.
// -----------------------------------------------------------------------------

const { randomUUID } = require('crypto');

function mapTypeToSlug(type) {
    switch (type) {
        case 'multiple_choice': return 'choice';
        case 'multi_answer': return 'multi-answer';
        case 'true_false': return 'true-false';
        case 'essay': return 'essay';
        case 'numeric': return 'numeric';
        case 'fill_in_blank': return 'rich-fill-blank';
        case 'matching': return 'matching';
        case 'categorization': return 'categorization';
        case 'file_upload': return 'file-upload';
        case 'formula': return 'formula';
        case 'ordering': return 'ordering';
        default: return null; // unsupported or not yet implemented
    }
}

function buildMinimalEntryForType(uiType, position) {
    const slug = mapTypeToSlug(uiType);
    if (!slug) return null;
    const titleBase = uiType.replace(/_/g, ' ');
    const common = {
        title: `${titleBase} Question ${position}`,
        calculator_type: 'none',
        interaction_type_slug: slug,
        // Basic stem body – kept intentionally simple.
        item_body: `<p>Auto-generated ${titleBase} question (${position}).</p>`
    };

    // Each type must supply interaction_data, scoring_data, scoring_algorithm.
    switch (slug) {
        case 'choice': { // multiple choice single correct
            const correctId = randomUUID();
            const distractor1 = randomUUID();
            const distractor2 = randomUUID();
            return {
                ...common,
                interaction_data: {
                    choices: [
                        { id: correctId, position: 1, item_body: '<p>Correct</p>' },
                        { id: distractor1, position: 2, item_body: '<p>Wrong A</p>' },
                        { id: distractor2, position: 3, item_body: '<p>Wrong B</p>' }
                    ]
                },
                properties: { shuffle_rules: { choices: { to_lock: [], shuffled: true } }, vary_points_by_answer: false },
                scoring_data: { value: correctId },
                scoring_algorithm: 'Equivalence'
            };
        }
        case 'multi-answer': { // multiple answer with partial scoring placeholder
            const c1 = randomUUID();
            const c2 = randomUUID();
            const c3 = randomUUID();
            return {
                ...common,
                interaction_data: {
                    choices: [
                        { id: c1, position: 1, item_body: '<p>Answer A</p>' },
                        { id: c2, position: 2, item_body: '<p>Answer B</p>' },
                        { id: c3, position: 3, item_body: '<p>Answer C</p>' }
                    ]
                },
                properties: { shuffle_rules: { choices: { to_lock: [], shuffled: true } } },
                scoring_data: { value: [c1, c2] },
                scoring_algorithm: 'AllOrNothing'
            };
        }
        case 'true-false': {
            return {
                ...common,
                interaction_data: { true_choice: 'True', false_choice: 'False' },
                properties: {},
                scoring_data: { value: true },
                scoring_algorithm: 'Equivalence'
            };
        }
        case 'essay': {
            return {
                ...common,
                interaction_data: { rce: true, essay: null, word_count: true, word_limit_enabled: false },
                properties: {},
                scoring_data: { value: 'Grading notes placeholder.' },
                scoring_algorithm: 'None'
            };
        }
        case 'numeric': {
            const answerId = randomUUID();
            return {
                ...common,
                interaction_data: {},
                properties: {},
                scoring_data: { value: [{ id: answerId, type: 'exactResponse', value: '42' }] },
                scoring_algorithm: 'Numeric'
            };
        }
        case 'rich-fill-blank': {
            // Minimal: one blank with equivalence scoring.
            const blankId = randomUUID();
            return {
                ...common,
                item_body: '<p>The color of the sky is ____.</p>',
                interaction_data: {
                    blanks: [{ id: blankId, answer_type: 'openEntry' }],
                    prompt: '<p>Provide the missing word.</p>',
                    stem_items: [
                        { id: randomUUID(), type: 'text', value: 'The color of the sky is ', position: 1 },
                        { id: randomUUID(), type: 'blank', blank_id: blankId, position: 2 }
                    ]
                },
                properties: { shuffle_rules: { blanks: { children: { '0': { children: null } } } } },
                scoring_data: { value: [{ id: blankId, scoring_data: { value: 'blue', blank_text: 'blue' }, scoring_algorithm: 'TextContainsAnswer' }] },
                scoring_algorithm: 'MultipleMethods'
            };
        }
        case 'matching': {
            // Simple matching: 3 Q/A pairs
            const q1 = randomUUID();
            const q2 = randomUUID();
            const q3 = randomUUID();
            return {
                ...common,
                interaction_data: {
                    questions: [
                        { id: q1, item_body: 'Apple' },
                        { id: q2, item_body: 'Carrot' },
                        { id: q3, item_body: 'Banana' }
                    ],
                    answers: ['Fruit', 'Vegetable', 'Fruit', 'Fruit']
                },
                properties: { shuffle_rules: { questions: { shuffled: true } } },
                scoring_data: {
                    value: {
                        [q1]: 'Fruit',
                        [q2]: 'Vegetable',
                        [q3]: 'Fruit'
                    },
                    edit_data: {
                        matches: [
                            { question_id: q1, question_body: 'Apple', answer_body: 'Fruit' },
                            { question_id: q2, question_body: 'Carrot', answer_body: 'Vegetable' },
                            { question_id: q3, question_body: 'Banana', answer_body: 'Fruit' }
                        ],
                        distractors: ['Fruit']
                    }
                },
                scoring_algorithm: 'DeepEquals'
            };
        }
        case 'categorization': {
            // Minimal categorization: 2 categories, 2 answers each
            const cat1 = randomUUID();
            const cat2 = randomUUID();
            const a1 = randomUUID();
            const a2 = randomUUID();
            const a3 = randomUUID();
            const a4 = randomUUID();
            return {
                ...common,
                interaction_data: {
                    categories: {
                        [cat1]: { id: cat1, item_body: 'Mammals' },
                        [cat2]: { id: cat2, item_body: 'Birds' }
                    },
                    distractors: {
                        [a1]: { id: a1, item_body: 'Dog' },
                        [a2]: { id: a2, item_body: 'Cat' },
                        [a3]: { id: a3, item_body: 'Eagle' },
                        [a4]: { id: a4, item_body: 'Sparrow' }
                    },
                    category_order: [cat1, cat2]
                },
                properties: { shuffle_rules: { questions: { shuffled: false } } },
                scoring_data: {
                    value: [
                        { id: cat1, scoring_data: { value: [a1, a2] }, scoring_algorithm: 'AllOrNothing' },
                        { id: cat2, scoring_data: { value: [a3, a4] }, scoring_algorithm: 'AllOrNothing' }
                    ],
                    score_method: 'all_or_nothing'
                },
                scoring_algorithm: 'Categorization'
            };
        }
        case 'file-upload': {
            return {
                ...common,
                interaction_data: { files_count: '1', restrict_count: true },
                properties: { allowed_types: '.pdf,.docx', restrict_types: false },
                scoring_data: { value: '' },
                scoring_algorithm: 'None'
            };
        }
        case 'formula': {
            return {
                ...common,
                interaction_data: {},
                properties: {},
                scoring_data: { value: { formula: '2 + y', numeric: { type: 'marginOfError', margin: '0', margin_type: 'absolute' }, variables: [{ max: '10', min: '1', name: 'y', precision: 0 }], answer_count: '1', generated_solutions: [] } },
                scoring_algorithm: 'Numeric'
            };
        }
        case 'ordering': {
            const c1 = randomUUID();
            const c2 = randomUUID();
            const c3 = randomUUID();
            return {
                ...common,
                interaction_data: {
                    choices: {
                        [c1]: { id: c1, item_body: '<p>First</p>' },
                        [c2]: { id: c2, item_body: '<p>Second</p>' },
                        [c3]: { id: c3, item_body: '<p>Third</p>' }
                    }
                },
                properties: { top_label: 'Start', bottom_label: 'End', include_labels: true, display_answers_paragraph: false, shuffle_rules: null },
                scoring_data: { value: [c1, c2, c3] },
                scoring_algorithm: 'DeepEquals'
            };
        }
        default:
            return null;
    }
}

async function addItemsToNewQuiz(data) {
    // POST /api/quiz/v1/courses/:course_id/quizzes/:assignment_id/items
    // We treat quiz_id passed in as the assignment_id (Canvas API param name).
    const created = [];
    let position = 1;
    for (const uiType of data.questionTypes) {
        const entry = buildMinimalEntryForType(uiType, position);
        if (!entry) {
            console.log(`[new-quiz-items] Skipping unsupported type: ${uiType}`);
            continue;
        }
        const itemPayload = {
            entry_type: 'Item',
            points_possible: 1,
            position,
            entry
        };
        const axiosConfig = {
            method: 'post',
            url: `https://${data.domain}/api/quiz/v1/courses/${data.course_id}/quizzes/${data.quiz_id}/items`,
            headers: { Authorization: `Bearer ${data.token}`, 'Content-Type': 'application/json' },
            data: { item: itemPayload }
        };
        try {
            const request = async () => axios(axiosConfig);
            const response = await errorCheck(request);
            created.push(response.data);
            if (typeof data.onQuestionCreated === 'function') {
                try { data.onQuestionCreated(response.data); } catch { /* ignore */ }
            }
            position++;
        } catch (error) {
            console.log(`[new-quiz-items] Failed to create ${uiType} item:`, error?.response?.status, error?.response?.data || error.message);
            // continue with next
        }
    }
    return created;
}

module.exports = { createNewQuiz, addItemsToNewQuiz };
