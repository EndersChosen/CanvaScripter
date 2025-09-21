// assignments.js
// ---------------
// createAssignments(course,number)
// ------------------------------
// getAssignments(course)
// -------------------------------
// deleteNoSubmissionAssignments(course)
// ----------------------------------

// const config = require('./config.js');
const pagination = require('../pagination.js');
const csvExporter = require('../csvExporter');
const axios = require('axios');
const { deleteRequester, errorCheck } = require('../utilities.js');
const modulesAPI = require('./modules');
// const questionAsker = require('../questionAsker');
// const readline = require('readline');

//const qAsker = questionAsker.questionDetails;
// const axios = config.instance;

async function createAssignments(data) {
    console.log('assignments.js > createAssignments');
    // console.log('The data', data);

    // console.log(`Creating ${data.number} assignment(s)`);

    // let url = `courses/${course}/assignments`;
    // const data = {
    //     assignment: {
    //         name: 'Assignment 1',
    //         submission_types: [
    //             'online_upload',
    //         ],
    //         allowed_extensions: [
    //         ],
    //         points_possible: 10,
    //         grading_type: 'points',
    //         post_to_sis: false,
    //         due_at: null,
    //         lock_at: null,
    //         unlock_at: null,
    //         description: 'This is the assignment description',
    //         published: false,
    //         anonymous_grading: false,
    //         allowed_attempts: -1,
    //     }
    // }

    // try {
    //     let counter = 0;
    //     let startTime = performance.now();
    //     for (let num = 1; num <= number; num++) {
    //         data.assignment.name = `Assignment ${num}`;
    //         const response = await axios.post(url, data);
    //         counter++;
    //     }
    //     let endTime = performance.now();
    //     console.log(`Created ${counter} assignment(s) in ${Math.floor(endTime - startTime) / 1000} seconds`)
    // } catch (error) {
    //     if (error.response) {
    //         console.log(error.response.status);
    //         console.log(error.response.headers);
    //     } else if (error.request) {
    //         console.log(error.request);
    //     } else {
    //         console.log('A different error', error.message);
    //     }
    // }


    //*******************************************
    //
    // Using Graph QL to create assignments
    //
    //********************************************

    const createAssignmentMutation = `mutation createAssignments($courseId: ID!,$name: String!, $submissionTypes: [SubmissionType!], $gradingType: GradingType, $pointsPossible: Float, $state: AssignmentState, $peerReviews: Boolean, $anonymous: Boolean) {
        createAssignment(input: {
            courseId: $courseId,
            name: $name,
            description: "I'm a cool description",
            pointsPossible: $pointsPossible,
            gradingType: $gradingType,
            submissionTypes: $submissionTypes
            state: $state,
            anonymousGrading: $anonymous,
            peerReviews: {enabled: $peerReviews},
            postToSis: false
        }) {
            assignment {
                _id
            }
            errors {
                attribute
                message
            }
        }
    }`

    const mutationVariables = {
        "courseId": data.course_id,
        "name": data.name,
        "submissionTypes": data.submissionTypes,
        "gradingType": data.grade_type,
        "pointsPossible": data.points,
        "state": data.publish,
        "peerReviews": data.peer_reviews,
        "anonymous": data.anonymous
    };

    try {
        const request = async () => {
            return await axios.post(`https://${data.domain}/api/graphql`, {
                query: createAssignmentMutation,
                variables: mutationVariables
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': `Bearer ${data.token}`
                }
            })
        };

        const response = await errorCheck(request);

        return response.data.data.createAssignment.assignment._id;

        // if (response.data.errors?.length > 0) {
        //     newError = {
        //         status: "Unknown",
        //         message: response.data.errors[0].message
        //     }
        //     throw newError;
        // }
    } catch (error) {
        throw error;
        // console.log('there was an error');
        // if (error.code && error.code === 'ERR_TLS_CERT_ALTNAME_INVALID') {
        //     newError = {
        //         status: '',
        //         message: `${error.code} - Check the domain to make sure it's valid.`
        //     }
        //     throw newError;

        // } else {
        //     throw new Error(`${error.status} - ${error.message}`);
        // }

    }
}

async function deleteAssignments(data) {
    console.log('Deleting assignment ', data.id);
    const url = `https://${data.domain}/api/v1/courses/${data.course_id}/assignments/${data.id}`;

    try {
        const request = async () => {
            return await axios.delete(url, {
                headers: {
                    'Authorization': `Bearer ${data.token}`
                }
            });
        };

        const response = await errorCheck(request);

        return response.data.id;
    } catch (error) {
        console.log(error.request);
        throw error;
    }
}

async function getAssignments(domain, courseID, token) {
    console.log('Getting assignment(s)');

    let assignmentList = [];
    let myURL = `https://${domain}/api/v1/courses/${courseID}/assignments?per_page=100`;

    while (myURL) {
        console.log('inside while', myURL);
        try {
            const request = async () => {
                return await axios.get(myURL, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            };

            const response = await errorCheck(request);

            if (response.headers.get('link')) {
                myURL = pagination.getNextPage(response.headers.get('link'));
            } else {
                myURL = false;
            }

            assignmentList.push(...response.data);
            // for (let assignment of response.data) {
            //     assignmentList.push(assignment);
            // }
        } catch (error) {
            throw error;
            // console.log('there was an error');
            // let newError;
            // if (error.response) {
            //     console.log('error with response');
            //     console.log(error.response.status);
            //     console.log(error.response.headers);
            //     newError = {
            //         status: error.response.status,
            //         message: `${error.message} - ${error.response.data.errors[0].message}`
            //     }
            // } else if (error.request) {
            //     console.log('error with request');
            //     console.log(error.request);
            //     newError = { status: "No Response", message: error.message }
            // } else {
            //     console.log('A different error', error.message);
            //     newError = { status: "Unknown error", message: error.message }
            // }
            // throw new Error(`${error.message} - ${error.response.data.errors[0].message}`);
        }


    }

    return assignmentList;
}

async function getOldAssignmentsGraphQL(data) {
    let url = `https://${data.domain}/api/graphql`;
    const dateFilter = data.date_filter;
    const dateType = data.date_type;

    const query = `
        query MyQuery($courseID: ID, $nextPage: String) {
            course(id: $courseID) {
                assignmentsConnection(after: $nextPage, first: 200, filter: {gradingPeriodId: null}) {
                    nodes {
                        createdAt
                        dueAt
                        _id
                        hasSubmittedSubmissions
                        gradedSubmissionsExist
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }
        }`;

    const variables = {
        "courseID": data.course_id,
        "nextPage": ""
    };

    const axiosConfig = {
        method: 'post',
        url: url,
        headers: {
            'Authorization': `Bearer ${data.token}`
        },
        data: {
            query: query,
            variables: variables
        }
    };

    const assignments = [];
    let nextPage = true;
    while (nextPage) {
        try {
            const request = async () => {
                return await axios(axiosConfig);
            };

            const response = await errorCheck(request);
            assignments.push(...response.data.data.course.assignmentsConnection.nodes);
            if (response.data.data.course.assignmentsConnection.pageInfo.hasNextPage) {
                variables.nextPage = response.data.data.course.assignmentsConnection.pageInfo.endCursor;
            } else {
                nextPage = false;
            }
        } catch (error) {
            throw error
        }
    }

    // filtering out the ones before the date
    const filteredAssignments = assignments.filter(assignment => {
        if (assignment[dateType]) {
            const date1 = new Date(dateFilter);
            const date2 = new Date(assignment[dateType].split('T')[0]);

            if (date2.getTime() <= date1.getTime()) {
                return assignment;
            }
        }
    });

    // checking to make sure the assignments don't have grades or submissions
    const hasGradesOrSubmissions = filteredAssignments.filter(assignment => {
        return !(assignment.hasSubmittedSubmissions || assignment.gradedSubmissionsExist)
    })

    return hasGradesOrSubmissions;
}

async function getImportedAssignments(data) {
    console.log('inside getImportedAssignments');

    let assignments = [];

    let url = `https://${data.domain}/api/v1/courses/${data.course_id}/content_migrations/${data.import_id}`;
    const axiosConfig = {
        method: 'get',
        url: url,
        headers: {
            'Authorization': `Bearer ${data.token}`
        }
    };

    try {
        const request = async (data) => {
            return await axios(axiosConfig)
        }
        const response = await errorCheck(request);
        const assignmentString = response.data.audit_info.migration_settings.imported_assets.Assignment;
        assignments = assignmentString.split(',');
        return assignments;
    } catch (error) {
        console.log('There was an error.', error);
        throw error;
    }


}

async function getNoSubmissionAssignments(domain, courseID, token, graded) {

    // **********************************************************************
    //
    // GraphQL doesn't have 'graded_submissions_exist' field to quickly
    // -- see if an assignment has graded assignments so you'd need to get
    // -- all submissions vs REST API where you can check that field 
    // -- for the individual assignment
    //
    // **********************************************************************

    const query = `query getNoSubmissionAssignments($courseID: ID, $nextPage: String) {
        course(id: $courseID) {
            assignmentsConnection(first: 200, after: $nextPage, filter: {gradingPeriodId: null}) {
                pageInfo {
                    hasNextPage
                    endCursor
                }
                edges {
                    node {
                        _id
                        hasSubmittedSubmissions
                        gradedSubmissionsExist
                        name
                    }
                }
            }
        }
    }`

    const variables = {
        "courseID": courseID,
        "nextPage": ''
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    const axiosConfig = {
        method: 'post',
        url: `https://${domain}/api/graphql`,
        headers: headers,
        data: {
            query: query,
            variables: variables
        }
    }

    let nextPage = true;
    const assignments = [];
    while (nextPage) {
        try {
            const request = async () => {
                return await axios(axiosConfig);
            }

            const response = await errorCheck(request);

            assignments.push(...response.data.data.course.assignmentsConnection.edges);
            if (response.data.data.course.assignmentsConnection.pageInfo.hasNextPage
            ) {
                variables.nextPage = response.data.data.course.assignmentsConnection.pageInfo.endCursor;
            } else {
                nextPage = false;
            }
        } catch (error) {
            throw error;
        }
    }

    const noSubmissionAssignments = assignments.filter(assignment => {
        if (graded) {
            console.log(assignment.node.hasSubmittedSubmissions)
            return !assignment.node.hasSubmittedSubmissions;
        } else {
            console.log(assignment.node.hasSubmittedSubmissions)
            console.log(assignment.node.hasSubmittedSubmissions && assignment.node.gradedSubmissionsExist)
            return (
                !assignment.node.hasSubmittedSubmissions &&
                !assignment.node.gradedSubmissionsExist
            );
        }
    });

    return noSubmissionAssignments;

    // try {
    //     const assignments = await getAssignments(domain, courseID, token);

    //     const noSubmissionAssignments = assignments.filter(assignment => {
    //         if (graded) {
    //             if (!assignment.has_submitted_submissions) {
    //                 return assignment;
    //             }
    //         } else {
    //             if (!assignment.has_submitted_submissions &&
    //                 !assignment.graded_submissions_exist) {
    //                 return assignment;
    //             }
    //         }
    //     });


    //     return noSubmissionAssignments;
    // } catch (error) {
    //     throw error;
    // }

}

async function deleteNoSubmissionAssignments(domain, course, token, assignments) {
    console.log('Deleting assignments with no submissions');
    const baseURL = `https://${domain}/api/v1/courses/${course}/assignments`;

    return await deleteRequester(assignments, baseURL, null, token);

    // let myURL = `https://courses/${courseID}/assignments/`;
    // let assignments = [];

    // try {
    //     // getting all assignments to filter later
    //     assignments = await getAssignments(courseID);
    // } catch (error) {
    //     console.log('This is the error', error)
    // }

    // filtering only unsubmitted assignments
    // const noSubmissionAssignments = assignments.filter(assignment => {
    //     if (!assignment.has_submitted_submissions) {
    //         return assignment;
    //     }
    // });
    // if (noSubmissionAssignments.length === 0) {
    //     console.log('No assignments to delete');
    //     return;
    // }
    // // ------------------------------------
    // // Figure out how to prompt user if they're sure
    // // ------------------------------------

    // const answer = await questionAsker.questionDetails(`Found ${noSubmissionAssignments.length} assignments with no submissions. \nAre you sure you want to delete them?`);
    // questionAsker.close();
    // if (answer === 'no') {
    //     return;
    // }

    // csvExporter.exportToCSV(noSubmissionAssignments, 'No_Submissions');

    // console.log('Total assignments', assignments.length);
    // console.log('Total with no submissions', noSubmissionAssignments.length);


    // console.log('Deleting assignments with no submissions');
    // const startTime = performance.now();
    // let deleteCounter = 0;

    // //***********************************************
    // // Make this better using promise.all()
    // //***********************************************
    // for (let assignment of noSubmissionAssignments) {
    //     try {
    //         console.log('deleting ', assignment.id);
    //         await axios.delete(myURL + assignment.id);
    //     } catch (error) {
    //         console.log('The Error deleting the assignment is ', error);
    //     }
    //     deleteCounter++;
    // }
    // const endTime = performance.now();
    // console.log(`Deleted ${deleteCounter} assignment(s) in ${Math.floor(endTime - startTime) / 1000} seconds`);
}

async function getUnpublishedAssignments(domain, course, token) {
    console.log('Getting unpublished assignments');

    let query = `query getUnpublishedAssignments($courseId: ID, $nextPage: String) { 
        course(id: $courseId) {
            assignmentsConnection(first: 500, after: $nextPage, filter: {gradingPeriodId: null}) {
                nodes {
                    name
                    _id
                    published
                    gradedSubmissionsExist
                },
                pageInfo {
                    endCursor,
                    hasNextPage
                }
            }
        }
    }`;

    let variables = {
        "courseId": course,
        "nextPage": ""
    };

    const axiosConfig = {
        method: 'post',
        url: `https://${domain}/api/graphql`,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        data: {
            query: query,
            variables: variables
        }
    };

    let next_page = true;
    let assignments = [];
    while (next_page) {
        try {
            const request = async () => {
                return await axios(axiosConfig);
            }

            const response = await errorCheck(request);

            if (response.data.data.course?.assignmentsConnection.nodes) {
                assignments.push(...response.data.data.course.assignmentsConnection.nodes);
                if (response.data.data.course.assignmentsConnection.pageInfo.hasNextPage) {
                    variables.nextPage = response.data.data.course.assignmentsConnection.pageInfo.endCursor;
                } else {
                    next_page = false;
                }
            } else {
                let newError = {
                    status: "Unknown",
                    message: "Error course ID couldn't be found."
                }
                throw newError;
            }

        } catch (error) {
            throw error;
        }
    }
    let unPublishedAssignments = assignments.filter(assignment => {
        return !assignment.published && !assignment.gradedSubmissionsExist;
    });

    // let ungradedUnpublished = unPublishedAssignments.filter(assignment => assignment.gradedSubmissionsExist);
    return unPublishedAssignments;

    // const assignments = await getAssignments(domain, courseID, token);

    // const unPublishedAssignments = assignments.filter(assignment => {
    //     if (assignment.workflow_state !== 'published') {
    //         return assignment;
    //     }
    // });

    // return unPublishedAssignments;
}

async function getNoDueDateAssignments(domain, courseID, token) {
    console.log('assignments.js > getNoDueDateAssignments');
    const query = `query getNoDueDateAssignments($courseId: ID, $nextPage: String) {
        course(id: $courseId) {
            assignmentsConnection(first: 500, after: $nextPage, filter: {gradingPeriodId: null}) {
                nodes {
                    _id
                    name
                    dueAt
                    hasSubmittedSubmissions
                    gradedSubmissionsExist
                }
                pageInfo { endCursor hasNextPage }
            }
        }
    }`;
    const variables = { courseId: courseID, nextPage: "" };
    const axiosConfig = {
        method: 'post',
        url: `https://${domain}/api/graphql`,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        data: { query, variables }
    };
    let next_page = true;
    const all = [];
    while (next_page) {
        try {
            const request = async () => axios(axiosConfig);
            const response = await errorCheck(request);
            if (response.data.data.course?.assignmentsConnection.nodes) {
                all.push(...response.data.data.course.assignmentsConnection.nodes);
                if (response.data.data.course.assignmentsConnection.pageInfo.hasNextPage) {
                    variables.nextPage = response.data.data.course.assignmentsConnection.pageInfo.endCursor;
                } else {
                    next_page = false;
                }
            } else {
                let newError = { status: 'Unknown', message: "Error course ID couldn't be found." };
                throw newError;
            }
        } catch (error) {
            throw error;
        }
    }
    const noDue = all.filter(a => !a.dueAt);
    const noGradesOrSubs = noDue.filter(a => !(a.hasSubmittedSubmissions || a.gradedSubmissionsExist));
    // Return uniform id objects for deletion flow
    return noGradesOrSubs.map(a => ({ id: a._id, name: a.name }));
}

async function getAssignmentsInOtherGroups(data) {
    const query = `query getAssignmentsInOtherGroups($courseID: ID, $nextPage: String) {
        course(id: $courseID) {
            assignmentsConnection(first: 200, after: $nextPage, filter: {gradingPeriodId: null}) {
                pageInfo {
                    endCursor
                    hasNextPage
                }
                edges {
                    node {
                        assignmentGroupId
                        _id
                    }
                }
            }
        }
    }`;

    const variables = {
        "courseID": data.courseID,
        "nextPage": ''
    };

    const axiosConfig = {
        method: 'post',
        url: `https://${data.domain}/api/graphql`,
        headers: {
            'Authorization': `Bearer ${data.token}`,
            'Content-Type': 'application/json'
        },
        data: {
            query: query,
            variables: variables
        }
    };

    let nextPage = true;
    const assignments = [];
    while (nextPage) {
        try {
            const reqeust = async () => {
                return await axios(axiosConfig);
            }
            const response = await errorCheck(reqeust);

            if (response.status === 200) {
                assignments.push(...response.data.data.course.assignmentsConnection.edges);
                if (response.data.data.course.assignmentsConnection.pageInfo.hasNextPage) {
                    variables.nextPage = response.data.data.course.assignmentsConnection.pageInfo.endCursor;
                } else {
                    nextPage = false;
                }
            }
        } catch (error) {
            throw error;
        }
    }

    // filtering assignments not in the right group to be deleted
    const filteredAssignments = assignments.filter(assignment => {
        return assignment.node.assignmentGroupId !== data.groupID;
    });

    // remapping to be more uniform id values
    const reMappedAssignments = filteredAssignments.map(assignment => {
        return {
            id: assignment.node._id
        }
    });

    return reMappedAssignments;
}

async function getAssignmentsInGroup(domain, token, groupID) {
    console.log('Getting assignments in group');
    const query = `query getAssignmentsInGroup($groupID: ID, $nextPage: String) {
        assignmentGroup(id: $groupID) {
            assignmentsConnection(first: 100, after: $nextPage, filter: {gradingPeriodId: null}) {
                pageInfo {
                    endCursor
                    hasNextPage
                }
                nodes {
                    _id
                    hasSubmittedSubmissions
                    gradedSubmissionsExist
                }
            }
        }
    }`;
    const variables = {
        "groupID": groupID,
        "nextPage": ''
    };
    const axiosConfig = {
        method: 'post',
        url: `https://${domain}/api/graphql`,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        data: {
            query: query,
            variables: variables
        }
    };
    let nextPage = true;
    const assignments = [];
    while (nextPage) {
        try {
            const request = async () => {
                return await axios(axiosConfig);
            }
            const response = await errorCheck(request);
            if (response.status === 200) {
                assignments.push(...response.data.data.assignmentGroup.assignmentsConnection.nodes);
                if (response.data.data.assignmentGroup.assignmentsConnection.pageInfo.hasNextPage) {
                    variables.nextPage = response.data.data.assignmentGroup.assignmentsConnection.pageInfo.endCursor;
                } else {
                    nextPage = false;
                }
            }
        }
        catch (error) {
            throw error;
        }
    }
    // filtering assignments that have submissions or graded submissions
    const noGradesOrSubmissions = assignments.filter((assignment) => {
        return !(assignment.gradedSubmissionsExist || assignment.hasSubmittedSubmissions)
    });

    // remapping to be more uniform id values
    const reMappedAssignments = noGradesOrSubmissions.map(assignment => {
        return {
            id: assignment._id,
        }
    });
    return reMappedAssignments;
}

async function getAssignmentsToMove(domain, courseID, token) {
    console.log('Getting assignments to move to single group');
    let query = `query GetAssignmentsToMove($courseId: ID!, $nextPage: String) {
                    course(id: $courseId) {
                        assignmentsConnection(after: $nextPage, first: 500, filter: {gradingPeriodId: null}) {
                            nodes {
                                _id
                                assignmentGroupId
                            }
                            pageInfo {
                                endCursor
                                hasNextPage
                            }
                        }
                    }
                }`;

    let variables = {
        "courseId": courseID,
        "nextPage": ""
    };

    const axiosConfig = {
        method: 'post',
        url: `https://${domain}/api/graphql`,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        data: {
            query: query,
            variables: variables
        }
    };

    let next_page = true;
    let assignments = [];
    while (next_page) {
        try {
            const request = async () => {
                return await axios(axiosConfig);
            };

            const response = await errorCheck(request);

            if (response.data.data.course?.assignmentsConnection.nodes) {
                assignments.push(...response.data.data.course.assignmentsConnection.nodes);
                if (response.data.data.course.assignmentsConnection.pageInfo.hasNextPage) {
                    variables.nextPage = response.data.data.course.assignmentsConnection.pageInfo.endCursor;
                } else {
                    next_page = false;
                }
            } else {
                let newError = {
                    status: "Unknown",
                    message: "Error course ID couldn't be found."
                }
                throw newError;
            }
        } catch (error) {
            throw error;
        }
    }
    return assignments;
}

async function moveAssignmentToGroup(data) {

    const url = `${data.url}/${data.id}`;
    const groupID = data.groupID;

    const axiosConfig = {
        method: 'put',
        url: url,
        headers: {
            'Authorization': `Bearer ${data.token}`
        },
        data: {
            "assignment": {
                "assignment_group_id": groupID
            }
        }
    }
    try {
        const response = await axios(axiosConfig);
        return response.data;
    } catch (error) {
        console.log('There was an error: ', error);
        throw error;
    }
}

// deletes the assignment group and any assignments inside
async function deleteAssignmentGroupWithAssignments(data) {
    let url = `https://${data.domain}/api/v1/courses/${data.course_id}/assignment_groups/${data.group_id}`;

    const axiosConfig = {
        method: 'delete',
        url: url,
        headers: {
            'Authorization': `Bearer ${data.token}`
        }
    };

    const request = async () => {
        return await axios(axiosConfig);
    }

    try {
        const response = await errorCheck(request);
        return response.data;
    } catch (error) {
        throw error;
    }
}

// Unified fetch for combined-filters workflow: returns array of nodes with
// {_id, name, published, dueAt, createdAt, hasSubmittedSubmissions, gradedSubmissionsExist,
//   modules { _id id name }, quiz { modules { _id id name } }, discussion { modules { _id id name } }}
async function getAllAssignmentsForCombined(data) {
    // data: { domain, token, course_id }
    const query = `
        query AllAssignmentsForCombined($courseId: ID, $nextPage: String) {
            course(id: $courseId) {
                assignmentsConnection(first: 500, after: $nextPage, filter: {gradingPeriodId: null}) {
                    nodes {
                        _id
                        name
                        published
                        dueAt
                        createdAt
                        hasSubmittedSubmissions
                        gradedSubmissionsExist
                        assignmentGroup { _id }
                        modules { _id id name }
                        quiz { modules { _id id name } }
                        discussion { modules { _id id name } }
                    }
                    pageInfo { endCursor hasNextPage }
                }
            }
        }`;

    const variables = { courseId: data.course_id, nextPage: "" };
    const axiosConfig = {
        method: 'post',
        url: `https://${data.domain}/api/graphql`,
        headers: {
            'Authorization': `Bearer ${data.token}`,
            'Content-Type': 'application/json'
        },
        signal: data.signal,
        data: { query, variables }
    };

    let next_page = true;
    const all = [];
    while (next_page) {
        try {
            const request = async () => axios(axiosConfig);
            const response = await errorCheck(request);
            if (response.data.data.course?.assignmentsConnection.nodes) {
                all.push(...response.data.data.course.assignmentsConnection.nodes);
                if (response.data.data.course.assignmentsConnection.pageInfo.hasNextPage) {
                    variables.nextPage = response.data.data.course.assignmentsConnection.pageInfo.endCursor;
                } else {
                    next_page = false;
                }
            } else {
                let newError = { status: 'Unknown', message: "Error course ID couldn't be found." };
                throw newError;
            }
        } catch (error) {
            throw error;
        }
    }
    return all;
}

// async function deleteUnPublishedAssignments(data) {
//     console.log('Deleting unpublished assignments');
//     const assignments = await getAssignments(data.domain, data.course, data.token);

//     const unPublishedAssignments = assignments.filter(assignment => {
//         if (assignment.workflow_state !== 'published') {
//             return assignment;
//         }
//     });

//     if (unPublishedAssignments.length === 0) {
//         console.log('No unpublished assignments to delete');
//         return { status: true, message: 'No unpublished assignments to delete' };
//     } else {
//         return await deleteRequester(unPublishedAssignments, `https://${data.domain}/api/v1/courses/${data.course}/assignments`, null, data.token);
//     }
// }
// async function deleteAllAssignments(courseID, assignments) {
//     //let assignments = await getAssignments(courseID);
//     for (const assignment of assignments) {
//         //console.log('assignment id ', assignment._id);
//         let url = `https://${domain}/api/v1/courses/5909/assignments/${assignment._id}`;
//         //console.log(url);
//         try {
//             const response = await axios.delete(url);
//         } catch (error) {
//             console.log('There was an error', error.message);
//         }
//     }
// }

//***************************************************
//
//    DELETE ALL ASSIGNMENTS NOT IN MODULES
//
//***************************************************
async function getNonModuleAssignments(domain, courseID, token) {
    console.log('assignments.js > getNonModuleAssignments');
    const assignments = [];

    let query = `
        query myQuery($courseId: ID,$nextPage: String)  {
            course(id: $courseId) {
                assignmentsConnection(first:500, after: $nextPage, filter: {gradingPeriodId: null}) {
                    nodes {
                        name
                        _id
                        modules {
                            name
                        }
                        quiz {
                            modules {
                                name
                            }
                        }
                        discussion {
                            modules {
                                name
                            }
                        }
                        gradedSubmissionsExist
                        hasSubmittedSubmissions
                    }
                    pageInfo {
                        endCursor,
                        hasNextPage
                    }
                }
            }
        }`;
    let variables = { courseId: courseID, nextPage: "" };

    const axiosConfig = {
        method: 'post',
        url: `https://${domain}/api/graphql`,
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-type": "application/json",
            "Accept": "application/json"
        },
        data: {
            query,
            variables: variables
        }
    };

    let next_page = true;
    //let startTime = performance.now();
    while (next_page) {
        try {
            const request = async () => {
                return await axios(axiosConfig);
            }

            const response = await errorCheck(request);

            if (response.data.data.course?.assignmentsConnection.nodes) {
                assignments.push(...response.data.data.course.assignmentsConnection.nodes);
                if (response.data.data.course.assignmentsConnection.pageInfo.hasNextPage) {
                    variables.nextPage = response.data.data.course.assignmentsConnection.pageInfo.endCursor;
                } else {
                    next_page = false;
                }
            } else {
                let newError = {
                    status: "Unknown",
                    message: "Error course ID couldn't be found."
                }
                throw newError;
            }
        } catch (error) {
            throw error;
        }

        // const data = await response.json();




        //     //     // // let endTime = performance.now();
        //     //     // // console.log(`Total query time ${Math.floor(endTime - startTime) / 1000} seconds`);
        //     //     // // console.log(assignments.length);

        //     //     // // console.log(filteredAssignments.length);
        //     //     // // //console.log(filteredAssignments);
        //     //     // // // for (let assignment of filteredAssignments) {
        //     //     // // //     console.log(assignment._id);
        //     //     // // // }
        //     //     // // await deleteAllAssignments(null, filteredAssignments)


        //     //     // // *****************************************************
        //     //     // //
        //     //     // // END OF DELETE ALL ASSIGNMENTS NOT IN MODULES
        //     //     // //
        //     //     // // *****************************************************
    }


    // filter out assignments not in modules
    const filteredAssignments = assignments.filter((assignment) => {
        if (assignment.quiz) {
            if (assignment.quiz.modules.length < 1)
                return assignment;
        } else if (assignment.discussion) {
            if (assignment.discussion.modules.length < 1)
                return assignment;
        } else if (assignment.modules.length < 1) {
            //console.log(assignment);
            return assignment;
        }
    });

    // filters out any assignments which has submissions or grades
    const noGradesOrSubmissions = filteredAssignments.filter((assignment) => {
        return !(assignment.gradedSubmissionsExist || assignment.hasSubmittedSubmissions)
    });

    const updatedID = noGradesOrSubmissions.map((assignment) => {
        return {
            name: assignment.name,
            id: assignment._id
        };
    });

    return updatedID;
}

async function getAssignmentsInModules(data) {
    // data: { domain, token, course_id, module_ids?: [id], module_names?: [name] }
    console.log('assignments.js > getAssignmentsInModules');
    const query = `
        query AssignmentsInModules($courseId: ID, $nextPage: String) {
            course(id: $courseId) {
                assignmentsConnection(first: 500, after: $nextPage, filter: {gradingPeriodId: null}) {
                    nodes {
                        _id
                        name
                        gradedSubmissionsExist
                        hasSubmittedSubmissions
                        modules { _id id name }
                        quiz { modules { _id id name } }
                        discussion { modules { _id id name } }
                    }
                    pageInfo { endCursor hasNextPage }
                }
            }
        }`;

    const variables = { courseId: data.course_id, nextPage: "" };
    const axiosConfig = {
        method: 'post',
        url: `https://${data.domain}/api/graphql`,
        headers: {
            'Authorization': `Bearer ${data.token}`,
            'Content-Type': 'application/json'
        },
        data: { query, variables }
    };

    let next_page = true;
    const all = [];
    while (next_page) {
        try {
            const request = async () => axios(axiosConfig);
            const response = await errorCheck(request);
            if (response.data.data.course?.assignmentsConnection.nodes) {
                all.push(...response.data.data.course.assignmentsConnection.nodes);
                if (response.data.data.course.assignmentsConnection.pageInfo.hasNextPage) {
                    variables.nextPage = response.data.data.course.assignmentsConnection.pageInfo.endCursor;
                } else {
                    next_page = false;
                }
            } else {
                let newError = { status: 'Unknown', message: "Error course ID couldn't be found." };
                throw newError;
            }
        } catch (error) {
            throw error;
        }
    }

    let selectedIds = (data.module_ids || []).map(id => String(id));
    let selectedNames = (data.module_names || []).map(n => (n || '').toLowerCase());

    // If module IDs were provided (likely numeric _id), augment with relay IDs and names for robust matching
    if (selectedIds.length > 0) {
        try {
            const mods = await modulesAPI.getModules({ domain: data.domain, token: data.token, course_id: data.course_id });
            const idSet = new Set(selectedIds);
            const relayIdsToAdd = [];
            const namesToAdd = [];
            mods.forEach(edge => {
                const node = edge.node || {};
                const nid = String(node._id || '');
                if (nid && idSet.has(nid)) {
                    if (node.id) relayIdsToAdd.push(String(node.id));
                    if (node.name) namesToAdd.push(String(node.name).toLowerCase());
                }
            });
            selectedIds = Array.from(new Set([...selectedIds, ...relayIdsToAdd]));
            selectedNames = Array.from(new Set([...selectedNames, ...namesToAdd]));
        } catch (e) {
            // Non-fatal: continue with provided IDs/names
            console.warn('getAssignmentsInModules: failed to augment module IDs via getModules', e?.message || e);
        }
    }
    const inSelectedModules = all.filter(a => {
        const names = [];
        const ids = [];
        if (a.modules) {
            names.push(...a.modules.map(m => (m.name || '').toLowerCase()));
            ids.push(...a.modules.map(m => String(m._id || m.id || '')));
        }
        if (a.quiz?.modules) {
            names.push(...a.quiz.modules.map(m => (m.name || '').toLowerCase()));
            ids.push(...a.quiz.modules.map(m => String(m._id || m.id || '')));
        }
        if (a.discussion?.modules) {
            names.push(...a.discussion.modules.map(m => (m.name || '').toLowerCase()));
            ids.push(...a.discussion.modules.map(m => String(m._id || m.id || '')));
        }
        const byId = selectedIds.length > 0 ? ids.some(mid => selectedIds.includes(mid)) : false;
        const byName = selectedNames.length > 0 ? names.some(n => selectedNames.includes(n)) : false;
        return byId || byName;
    });

    // filter out assignments with submissions or grades
    const noGradesOrSubs = inSelectedModules.filter(a => !(a.gradedSubmissionsExist || a.hasSubmittedSubmissions));
    return noGradesOrSubs.map(a => ({ id: a._id, name: a.name }));
}
// the function that does the stuff
// (async () => {
//     const curDomain = await questionAsker.questionDetails('What domain: ');
//     const courseID = await questionAsker.questionDetails('What course: ');
//     //const number = await questionAsker.questionDetails('How many assignments do you want to create: ');


//     axios.defaults.baseURL = `https://${curDomain}/api/v1/`;
//     //const myAssignments = await getAssignments(courseID);

//     await deleteNoSubmissionAssignments(courseID);
//     questionAsker.close();


//     console.log('Done');
// }) ();

module.exports = {
    createAssignments, deleteAssignments, getAssignments, getNoSubmissionAssignments, getUnpublishedAssignments, deleteNoSubmissionAssignments, getNonModuleAssignments, getAssignmentsToMove, moveAssignmentToGroup, getOldAssignmentsGraphQL, getImportedAssignments, deleteAssignmentGroupWithAssignments, getAssignmentsInOtherGroups, getAssignmentsInGroup, getNoDueDateAssignments, getAssignmentsInModules, getAllAssignmentsForCombined
}
