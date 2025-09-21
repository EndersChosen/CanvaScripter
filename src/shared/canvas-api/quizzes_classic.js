// quizzes_classic.js

const axios = require('axios');
const pagination = require('../pagination.js');
const { errorCheck } = require('../utilities.js');

// Helper to POST a quiz question
async function sendQuestion(requestConfig, questionData) {
    // Canvas expects the payload wrapped under `question` when posting quiz questions
    requestConfig.data = { question: questionData };
    try {
        const request = async () => {
            return await axios(requestConfig);
        }
        const response = await errorCheck(request);
        return response.data;
    } catch (error) {
        throw error;
    }
}

// Fetch current quiz details to support a follow-up save
async function fetchQuiz(domain, token, course_id, quiz_id) {
    const axiosConfig = {
        method: 'GET',
        url: `https://${domain}/api/v1/courses/${course_id}/quizzes/${quiz_id}`,
        headers: { 'Authorization': `Bearer ${token}` }
    };
    try {
        const request = async () => {
            return await axios(axiosConfig);
        };
        const response = await errorCheck(request);
        return response.data;
    } catch (error) {
        throw error;
    }
}

// Issue a PUT to update the quiz with its existing fields (acts as a save)
async function saveQuiz(domain, token, course_id, quiz_id) {
    let quiz;
    try {
        quiz = await fetchQuiz(domain, token, course_id, quiz_id);
    } catch (e) {
        // Non-fatal: skip save if fetch fails
        return null;
    }

    const payload = {
        quiz: {
            title: quiz.title,
            quiz_type: quiz.quiz_type,
            allowed_attempts: quiz.allowed_attempts,
            published: quiz.published,
            description: quiz.description || undefined
        }
    };

    const axiosConfig = {
        method: 'PUT',
        url: `https://${domain}/api/v1/courses/${course_id}/quizzes/${quiz_id}`,
        headers: { 'Authorization': `Bearer ${token}` },
        data: payload
    };
    try {
        const request = async () => {
            return await axios(axiosConfig);
        };
        const response = await errorCheck(request);
        return response.data;
    } catch (error) {
        // Non-fatal
        return null;
    }
}

async function updateClassicQuiz(data) {
    const axiosConfig = {
        method: 'PUT',
        url: `https://${data.domain}/api/v1/courses/${data.course_id}/quizzes/${data.quiz_id}`,
        headers: {
            'Authorization': `Bearer ${data.token}`
        },
        data: data.payload || undefined
    };

    try {
        const request = async () => {
            return await axios(axiosConfig);
        };
        const response = await errorCheck(request);
        return response.data;
    } catch (error) {
        throw error;
    }
}

async function getClassicQuizzes(data) {
    console.log("Getting Classic Quizzes");

    const queryParams = `query MyQuery($courseID: ID, $nextPage: String) {
        course(id: $courseID) {
            quizzesConnection(first: 100, after: $nextPage) {
            pageInfo {
                hasNextPage
                endCursor
            }
            edges {
                node {
                _id
                type
                title
                }
            }
            
            }
        }
    }`;

    const variables = {
        courseID: data.courseID,
        nextPage: ""
    };

    const axiosConfig = {
        method: 'post',
        url: `https://${data.domain}/api/graphql`,
        headers: {
            'Authorization': `Bearer ${data.token}`
        },
        data: {
            query: queryParams,
            variables: variables
        }
    }

    const quizzes = [];
    let nextPage = true;
    while (nextPage) {
        try {
            const request = async () => {
                return await axios(axiosConfig);
            }
            const response = await errorCheck(request);
            const data = response.data.data.course.quizzesConnection;
            quizzes.push(...data.edges.map(edge => edge.node));
            nextPage = data.pageInfo.hasNextPage;
            if (nextPage) {
                variables.nextPage = data.pageInfo.endCursor;
                axiosConfig.data.variables = variables; // Update the next page cursor
            }
        } catch (error) {
            throw error;
        }
    }
    return quizzes;
}

async function deleteClassicQuiz(data) {
    console.log("Deleting Classic Quiz");
    const axiosConfig = {
        method: 'delete',
        url: `https://${data.domain}/api/v1/courses/${data.course_id}/quizzes/${data.quiz_id}`,
        headers: {
            'Authorization': `Bearer ${data.token}`
        }
    };

    try {
        const request = async () => {
            return await axios(axiosConfig);
        }
        const response = await errorCheck(request);
        return response.data;
    } catch (error) {
        throw error
    }
}

async function createQuiz(data) {
    let url = `https://${data.domain}/api/v1/courses/${data.course_id}/quizzes`;

    const axiosConfig = {
        method: 'post',
        url: url,
        headers: {
            'Authorization': `Bearer ${data.token}`
        },
        data: {
            "quiz": {
                "title": data.quiz_title,
                "quiz_type": data.quiz_type,
                "allowed_attempts": -1,
                "published": data.publish
            }
        }
    }

    try {
        const request = async () => {
            return await axios(axiosConfig);
        }
        const response = await errorCheck(request);
        return response.data;
    } catch (error) {
        throw error
    }
}

async function createQuestions(data) {
    console.log("Creating Questions for quiz", data.quiz_id, "types:", Object.keys(data.question_data || {}));
    const axiosConfig = {
        method: 'POST',
        url: `https://${data.domain}/api/v1/courses/${data.course_id}/quizzes/${data.quiz_id}/questions`,
        headers: {
            'Authorization': `Bearer ${data.token}`
        }
    };

    // posting handled by sendQuestion helper
    // loop through all the question types
    // and add the number of questions specified for each type
    for (let qData of Object.keys(data.question_data)) {
        if (data.question_data[qData].enabled) {
            const total = Number(data.question_data[qData].number) || 1;
            console.log(`Adding ${total} question(s) of type ${data.question_data[qData].name} to quiz ${data.quiz_id}`);
            // loop through the number of question to add of the specific type
            for (let qNum = 0; qNum < total; qNum++) {
                switch (data.question_data[qData].name) {
                    case "calculated_question":
                        await addCalculatedQuestion(axiosConfig);
                        if (typeof data.onQuestionCreated === 'function') { try { data.onQuestionCreated({ type: 'calculated_question' }); } catch { } }
                        await saveQuiz(data.domain, data.token, data.course_id, data.quiz_id);
                        break;
                    case "essay_question":
                        await addEssayQuestion(axiosConfig);
                        if (typeof data.onQuestionCreated === 'function') { try { data.onQuestionCreated({ type: 'essay_question' }); } catch { } }
                        await saveQuiz(data.domain, data.token, data.course_id, data.quiz_id);
                        break;
                    case "file_upload_question":
                        await addFileUploadQuestion(axiosConfig);
                        if (typeof data.onQuestionCreated === 'function') { try { data.onQuestionCreated({ type: 'file_upload_question' }); } catch { } }
                        await saveQuiz(data.domain, data.token, data.course_id, data.quiz_id);
                        break;
                    case "fill_in_multiple_blanks_question":
                        await addFillInMultipleBlanksQuestion(axiosConfig);
                        if (typeof data.onQuestionCreated === 'function') { try { data.onQuestionCreated({ type: 'fill_in_multiple_blanks_question' }); } catch { } }
                        await saveQuiz(data.domain, data.token, data.course_id, data.quiz_id);
                        break;
                    case "matching_question":
                        await addMatchingQuestion(axiosConfig);
                        if (typeof data.onQuestionCreated === 'function') { try { data.onQuestionCreated({ type: 'matching_question' }); } catch { } }
                        await saveQuiz(data.domain, data.token, data.course_id, data.quiz_id);
                        break;
                    case "multiple_answers_question":
                        await addMultipleAnswerQuestion(axiosConfig);
                        if (typeof data.onQuestionCreated === 'function') { try { data.onQuestionCreated({ type: 'multiple_answers_question' }); } catch { } }
                        await saveQuiz(data.domain, data.token, data.course_id, data.quiz_id);
                        break;
                    case "multiple_choice_question":
                        await addMultipleChoiceQuestion(axiosConfig);
                        if (typeof data.onQuestionCreated === 'function') { try { data.onQuestionCreated({ type: 'multiple_choice_question' }); } catch { } }
                        await saveQuiz(data.domain, data.token, data.course_id, data.quiz_id);
                        break;
                    case "multiple_dropdowns_question":
                        await addMultipleDropdownsQuestion(axiosConfig);
                        if (typeof data.onQuestionCreated === 'function') { try { data.onQuestionCreated({ type: 'multiple_dropdowns_question' }); } catch { } }
                        await saveQuiz(data.domain, data.token, data.course_id, data.quiz_id);
                        break;
                    case "numerical_question":
                        await addNumericalQuestion(axiosConfig);
                        if (typeof data.onQuestionCreated === 'function') { try { data.onQuestionCreated({ type: 'numerical_question' }); } catch { } }
                        await saveQuiz(data.domain, data.token, data.course_id, data.quiz_id);
                        break;
                    case "short_answer_question":
                        await addShortAnswerQuestion(axiosConfig);
                        if (typeof data.onQuestionCreated === 'function') { try { data.onQuestionCreated({ type: 'short_answer_question' }); } catch { } }
                        await saveQuiz(data.domain, data.token, data.course_id, data.quiz_id);
                        break;
                    case "text_only_question":
                        await addTextOnlyQuestion(axiosConfig);
                        if (typeof data.onQuestionCreated === 'function') { try { data.onQuestionCreated({ type: 'text_only_question' }); } catch { } }
                        await saveQuiz(data.domain, data.token, data.course_id, data.quiz_id);
                        break;
                    case "true_false_question":
                        await addTrueFalseQuestion(axiosConfig);
                        if (typeof data.onQuestionCreated === 'function') { try { data.onQuestionCreated({ type: 'true_false_question' }); } catch { } }
                        await saveQuiz(data.domain, data.token, data.course_id, data.quiz_id);
                        break;
                    default:
                        console.warn('Unknown question type, skipping:', data.question_data[qData]);
                        break;
                }
            }
        }
    }

    // try {
    //     const request = async () => {
    //         return await axios(axiosConfig);
    //     }
    //     const response = await errorCheck(request);
    //     return response.data;
    // } catch (error) {
    //     throw error
    // }

}

async function addCalculatedQuestion(requestConfig) {
    const questionData = {
        "question_name": "Question",
        "assessment_question_id": null,
        "question_type": "calculated_question",
        "points_possible": 1,
        "correct_comments_html": null,
        "incorrect_comments_html": null,
        "neutral_comments_html": null,
        "question_text": "<p>What is 5 plus [x]</p>",
        "regrade_option": null,
        "position": 0,
        "text_after_answers": null,
        "matching_answer_incorrect_matches": null,
        "formulas": ["5 + x"],
        "variables": [
            {
                "name": "x",
                "min": 1,
                "max": 10,
                "scale": 0
            }
        ],
        "answer_tolerance": 0,
        "formula_decimal_places": 0,
        "answers": [
            { "variables": [{ "name": "x", "value": 8 }], "answer_text": "13" },
            { "variables": [{ "name": "x", "value": 7 }], "answer_text": "12" },
            { "variables": [{ "name": "x", "value": 7 }], "answer_text": "12" },
            { "variables": [{ "name": "x", "value": 9 }], "answer_text": "14" },
            { "variables": [{ "name": "x", "value": 5 }], "answer_text": "10" },
            { "variables": [{ "name": "x", "value": 3 }], "answer_text": "8" },
            { "variables": [{ "name": "x", "value": 10 }], "answer_text": "15" },
            { "variables": [{ "name": "x", "value": 6 }], "answer_text": "11" },
            { "variables": [{ "name": "x", "value": 4 }], "answer_text": "9" },
            { "variables": [{ "name": "x", "value": 9 }], "answer_text": "14" }
        ]
    };
    return await sendQuestion(requestConfig, questionData);
}

async function addEssayQuestion(requestConfig) {
    const questionData = {
        question_name: "Question",
        assessment_question_id: null,
        question_type: "essay_question",
        points_possible: 1,
        correct_comments_html: null,
        incorrect_comments_html: null,
        neutral_comments_html: null,
        question_text: "<p>Essay Question</p>",
        regrade_option: null,
        position: 0,
        text_after_answers: null,
        matching_answer_incorrect_matches: null
    };
    return await sendQuestion(requestConfig, questionData);
}

async function addFileUploadQuestion(requestConfig) {
    const questionData = {
        question_name: "Question",
        assessment_question_id: null,
        question_type: "file_upload_question",
        points_possible: 1,
        correct_comments_html: null,
        incorrect_comments_html: null,
        neutral_comments_html: null,
        question_text: "<p>File Upload</p>",
        regrade_option: null,
        position: 0,
        text_after_answers: null,
        matching_answer_incorrect_matches: null
    };
    return await sendQuestion(requestConfig, questionData);
}

async function addFillInMultipleBlanksQuestion(requestConfig) {
    const questionData = {
        question_name: "Question",
        assessment_question_id: null,
        question_type: "fill_in_multiple_blanks_question",
        points_possible: 1,
        correct_comments_html: null,
        incorrect_comments_html: null,
        neutral_comments_html: null,
        question_text: "<p>Roses are [color1], violets are [color2]</p>",
        regrade_option: null,
        position: 0,
        text_after_answers: null,
        matching_answer_incorrect_matches: null,
        answers: [
            {
                answer_exact: 0,
                answer_error_margin: 0,
                answer_range_start: 0,
                answer_range_end: 0,
                answer_approximate: 0,
                answer_precision: 10,
                answer_weight: 100,
                numerical_answer_type: "exact_answer",
                blank_id: "color1",
                answer_text: "red",
                answer_comment: null,
                answer_html: null,
                answer_match_left_html: null,
                answer_comment_html: null
            },
            {
                answer_exact: 0,
                answer_error_margin: 0,
                answer_range_start: 0,
                answer_range_end: 0,
                answer_approximate: 0,
                answer_precision: 10,
                answer_weight: 100,
                numerical_answer_type: "exact_answer",
                blank_id: "color2",
                answer_text: "blue",
                answer_comment: null,
                answer_html: null,
                answer_match_left_html: null,
                answer_comment_html: null
            }
        ]
    };
    return await sendQuestion(requestConfig, questionData);
}

async function addMatchingQuestion(requestConfig) {
    const questionData = {
        question_name: "Question",
        assessment_question_id: null,
        question_type: "matching_question",
        points_possible: 1,
        correct_comments_html: null,
        incorrect_comments_html: null,
        neutral_comments_html: null,
        question_text: "<p>Matching</p>",
        regrade_option: null,
        position: 0,
        text_after_answers: null,
        matching_answer_incorrect_matches: null,
        answers: [
            {
                answer_weight: 100,
                answer_match_left: "Left",
                answer_match_right: "Right"
            },
            {
                answer_weight: 100,
                answer_match_left: "Up",
                answer_match_right: "Down"
            },
            {
                answer_weight: 100,
                answer_match_left: "Black",
                answer_match_right: "White"
            }
        ]
    };
    return await sendQuestion(requestConfig, questionData);
}

async function addMultipleAnswerQuestion(requestConfig) {
    const questionData = {
        question_name: "Question",
        assessment_question_id: null,
        question_type: "multiple_answers_question",
        points_possible: 1,
        correct_comments_html: null,
        incorrect_comments_html: null,
        neutral_comments_html: null,
        question_text: "<p>Multiple Answer</p>",
        regrade_option: null,
        position: 0,
        text_after_answers: null,
        matching_answer_incorrect_matches: null,
        answers: [
            {
                answer_exact: 0,
                answer_error_margin: 0,
                answer_range_start: 0,
                answer_range_end: 0,
                answer_approximate: 0,
                answer_precision: 10,
                answer_weight: 0,
                numerical_answer_type: "exact_answer",
                answer_text: "a",
                answer_comment: null,
                answer_html: null,
                answer_match_left_html: null,
                answer_comment_html: null
            },
            {
                answer_exact: 0,
                answer_error_margin: 0,
                answer_range_start: 0,
                answer_range_end: 0,
                answer_approximate: 0,
                answer_precision: 10,
                answer_weight: 100,
                numerical_answer_type: "exact_answer",
                answer_text: "b",
                answer_comment: null,
                answer_html: null,
                answer_match_left_html: null,
                answer_comment_html: null
            },
            {
                answer_exact: 0,
                answer_error_margin: 0,
                answer_range_start: 0,
                answer_range_end: 0,
                answer_approximate: 0,
                answer_precision: 10,
                answer_weight: 100,
                numerical_answer_type: "exact_answer",
                answer_text: "c",
                answer_comment: null,
                answer_html: null,
                answer_match_left_html: null,
                answer_comment_html: null
            },
            {
                answer_exact: 0,
                answer_error_margin: 0,
                answer_range_start: 0,
                answer_range_end: 0,
                answer_approximate: 0,
                answer_precision: 10,
                answer_weight: 0,
                numerical_answer_type: "exact_answer",
                answer_text: "All the above",
                answer_comment: null,
                answer_html: null,
                answer_match_left_html: null,
                answer_comment_html: null
            }
        ]
    };
    return await sendQuestion(requestConfig, questionData);
}

async function addMultipleChoiceQuestion(requestConfig) {
    console.log("Adding Multiple Choice Question");
    const questionData = {
        question_name: "Question",
        assessment_question_id: null,
        question_type: "multiple_choice_question",
        points_possible: 1,
        correct_comments_html: null,
        incorrect_comments_html: null,
        neutral_comments_html: null,
        question_text: "<p>Multiple Choice</p>",
        regrade_option: null,
        position: 0,
        text_after_answers: null,
        matching_answer_incorrect_matches: null,
        answers: [
            {
                answer_exact: 0,
                answer_error_margin: 0,
                answer_range_start: 0,
                answer_range_end: 0,
                answer_approximate: 0,
                answer_precision: 10,
                answer_weight: 100,
                numerical_answer_type: "exact_answer",
                answer_text: "a",
                answer_comment: null,
                answer_html: null,
                answer_match_left_html: null,
                answer_comment_html: null
            },
            {
                answer_exact: 0,
                answer_error_margin: 0,
                answer_range_start: 0,
                answer_range_end: 0,
                answer_approximate: 0,
                answer_precision: 10,
                answer_weight: 0,
                numerical_answer_type: "exact_answer",
                answer_text: "b",
                answer_comment: null,
                answer_html: null,
                answer_match_left_html: null,
                answer_comment_html: null
            },
            {
                answer_exact: 0,
                answer_error_margin: 0,
                answer_range_start: 0,
                answer_range_end: 0,
                answer_approximate: 0,
                answer_precision: 10,
                answer_weight: 0,
                numerical_answer_type: "exact_answer",
                answer_text: "c",
                answer_comment: null,
                answer_html: null,
                answer_match_left_html: null,
                answer_comment_html: null
            },
            {
                answer_exact: 0,
                answer_error_margin: 0,
                answer_range_start: 0,
                answer_range_end: 0,
                answer_approximate: 0,
                answer_precision: 10,
                answer_weight: 0,
                numerical_answer_type: "exact_answer",
                answer_text: "d",
                answer_comment: null,
                answer_html: null,
                answer_match_left_html: null,
                answer_comment_html: null
            }
        ]
    };
    return await sendQuestion(requestConfig, questionData);

}
async function addMultipleDropdownsQuestion(requestConfig) {
    const questionData = {
        question_name: "Question",
        assessment_question_id: null,
        question_type: "multiple_dropdowns_question",
        points_possible: 1,
        correct_comments_html: null,
        incorrect_comments_html: null,
        neutral_comments_html: null,
        question_text: "<p>Roses are [color1], violets are [color2]</p>",
        regrade_option: null,
        position: 0,
        text_after_answers: null,
        matching_answer_incorrect_matches: null,
        answers: [
            {
                answer_exact: 0,
                answer_error_margin: 0,
                answer_range_start: 0,
                answer_range_end: 0,
                answer_approximate: 0,
                answer_precision: 10,
                answer_weight: 100,
                numerical_answer_type: "exact_answer",
                blank_id: "color1",
                answer_text: "red",
                answer_comment: null,
                answer_html: null,
                answer_match_left_html: null,
                answer_comment_html: null
            },
            {
                answer_exact: 0,
                answer_error_margin: 0,
                answer_range_start: 0,
                answer_range_end: 0,
                answer_approximate: 0,
                answer_precision: 10,
                answer_weight: 0,
                numerical_answer_type: "exact_answer",
                blank_id: "color1",
                answer_text: "black",
                answer_comment: null,
                answer_html: null,
                answer_match_left_html: null,
                answer_comment_html: null
            },
            {
                answer_exact: 0,
                answer_error_margin: 0,
                answer_range_start: 0,
                answer_range_end: 0,
                answer_approximate: 0,
                answer_precision: 10,
                answer_weight: 100,
                numerical_answer_type: "exact_answer",
                blank_id: "color2",
                answer_text: "blue",
                answer_comment: null,
                answer_html: null,
                answer_match_left_html: null,
                answer_comment_html: null
            },
            {
                answer_exact: 0,
                answer_error_margin: 0,
                answer_range_start: 0,
                answer_range_end: 0,
                answer_approximate: 0,
                answer_precision: 10,
                answer_weight: 0,
                numerical_answer_type: "exact_answer",
                blank_id: "color2",
                answer_text: "yellow",
                answer_comment: null,
                answer_html: null,
                answer_match_left_html: null,
                answer_comment_html: null
            }
        ]
    };
    return await sendQuestion(requestConfig, questionData);
}

async function addNumericalQuestion(requestConfig) {
    const questionData = {
        question_name: "Question",
        assessment_question_id: null,
        question_type: "numerical_question",
        points_possible: 1,
        correct_comments_html: null,
        incorrect_comments_html: null,
        neutral_comments_html: null,
        question_text: "<p>Numerical Answer</p>",
        regrade_option: null,
        position: 0,
        text_after_answers: null,
        matching_answer_incorrect_matches: null,
        answers: [
            {
                answer_exact: 10,
                answer_error_margin: 0,
                answer_range_start: 0,
                answer_range_end: 0,
                answer_approximate: 0,
                answer_precision: 10,
                answer_weight: 100,
                numerical_answer_type: "exact_answer",
                blank_id: null,
                id: null,
                match_id: null,
                answer_text: null,
                answer_match_left: null,
                answer_match_right: null,
                answer_comment: null,
                answer_html: null,
                answer_match_left_html: null,
                answer_comment_html: null
            }
        ]
    };
    return await sendQuestion(requestConfig, questionData);
}

async function addShortAnswerQuestion(requestConfig) {
    const questionData = {
        question_name: "Question",
        assessment_question_id: null,
        question_type: "short_answer_question",
        points_possible: 1,
        correct_comments_html: null,
        incorrect_comments_html: null,
        neutral_comments_html: null,
        question_text: "<p>roses are&nbsp;</p>",
        regrade_option: false,
        position: 0,
        text_after_answers: null,
        matching_answer_incorrect_matches: null,
        answers: [
            {
                answer_exact: 0,
                answer_error_margin: 0,
                answer_range_start: 0,
                answer_range_end: 0,
                answer_approximate: 0,
                answer_precision: 10,
                answer_weight: 100,
                numerical_answer_type: "exact_answer",
                blank_id: null,
                id: null,
                match_id: null,
                answer_text: "red",
                answer_match_left: null,
                answer_match_right: null,
                answer_comment: null,
                answer_html: null,
                answer_match_left_html: null,
                answer_comment_html: null
            }
        ]
    };
    return await sendQuestion(requestConfig, questionData);
}
async function addTextOnlyQuestion(requestConfig) {
    const questionData = {
        question_name: "Question",
        assessment_question_id: null,
        question_type: "text_only_question",
        points_possible: 0,
        correct_comments_html: null,
        incorrect_comments_html: null,
        neutral_comments_html: null,
        question_text: "<p>Text Only</p>",
        regrade_option: null,
        position: 0,
        text_after_answers: null,
        matching_answer_incorrect_matches: null
    };
    return await sendQuestion(requestConfig, questionData);
}
async function addTrueFalseQuestion(requestConfig) {
    const questionData = {
        question_name: "Question",
        assessment_question_id: null,
        question_type: "true_false_question",
        points_possible: 1,
        correct_comments_html: null,
        incorrect_comments_html: null,
        neutral_comments_html: null,
        question_text: "<p>True or False</p>",
        regrade_option: null,
        position: 0,
        text_after_answers: null,
        matching_answer_incorrect_matches: null,
        answers: [
            {
                answer_exact: 0,
                answer_error_margin: 0,
                answer_range_start: 0,
                answer_range_end: 0,
                answer_approximate: 0,
                answer_precision: 10,
                answer_weight: 100,
                numerical_answer_type: "exact_answer",
                blank_id: null,
                id: null,
                match_id: null,
                answer_text: "True",
                answer_match_left: null,
                answer_match_right: null,
                answer_comment: null,
                answer_html: null,
                answer_match_left_html: null,
                answer_comment_html: null
            },
            {
                answer_exact: 0,
                answer_error_margin: 0,
                answer_range_start: 0,
                answer_range_end: 0,
                answer_approximate: 0,
                answer_precision: 10,
                answer_weight: 0,
                numerical_answer_type: "exact_answer",
                blank_id: null,
                id: null,
                match_id: null,
                answer_text: "False",
                answer_match_left: null,
                answer_match_right: null,
                answer_comment: null,
                answer_html: null,
                answer_match_left_html: null,
                answer_comment_html: null
            }
        ]
    };
    return await sendQuestion(requestConfig, questionData);
}

async function publishQuiz(data) {
    const axiosConfig = {
        method: 'PUT',
        url: `https://${data.domain}/api/v1/courses/${data.course_id}/quizzes/${data.quiz_id}`,
        headers: {
            'Authorization': `Bearer ${data.token}`
        },
        data: {
            quiz: {
                published: true
            }
        }
    };

    try {
        const request = async () => {
            return await axios(axiosConfig);
        };
        const response = await errorCheck(request);
        return response.data;
    } catch (error) {
        throw error;
    }
}

module.exports = {
    createQuiz, createQuestions, getClassicQuizzes, deleteClassicQuiz, updateClassicQuiz, publishQuiz
}