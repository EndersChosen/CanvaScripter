// enrollments.js
// const config = require('./config');
// const users = require('./users');
const { getAPIData } = require('../utilities');
const axios = require('axios');
// const questionAsker = require('../questionAsker');
// const pagination = require('../pagination');

// const axios = config.instance;

const enrollData = {
    enrollment: {
        user_id: "userid",
        type: "enrollmentType",
        enrollment_state: "active"
    }
}

// if a user id is passed in enrolls that user in the 
// specified role. if no user id is passed in then 
// create a new user first and then enroll them 
// with the specified role (default 'StudentEnrollment')
async function enrollUser(course, number, user = null, role = 'StudentEnrollment') {
    let url = `courses/${course}/enrollments`;
    let myRole = role;
    const enrollments = [];


    // checking if a specific user was passed in
    // if not create a new user and enroll them as the 
    // specified role
    if (user === null) {
        for (let i = 0; i < number; i++) {
            const newUser = await error_check.errorCheck(users.createUser);
            updateEnrollParams(newUser.id, myRole);
            //console.log(enrollData);

            console.log(`Enrolling a new user as ${role}...`);
            const newEnroll = await error_check.errorCheck(async () => {
                return await axios.post(url, enrollData)
            });
            if (newEnroll === undefined) {
                return 'There was an error';
            } else {
                enrollments.push(newEnroll.data);
            }
        }

        return enrollments;
    } else { // enrolling the specified user
        console.log(`Enrolling an existing user as ${role}...`);
        let url = `courses/${course}/enrollments`
        updateEnrollParams(user, myRole);
        console.log(enrollData);
        const newEnroll = await error_check.errorCheck(async () => {
            return await axios.post(url, enrollData);
        });
        return newEnroll.data;
    }
}

function updateEnrollParams(userID, role) {
    console.log('Updating enrollment data');
    enrollData.enrollment.user_id = userID;
    enrollData.enrollment.type = role;
}

// remove all enrollments from a user
async function removeEnrollments(user) {

    const enrollments = await getEnrollments(user);

    const failed = [];

    for (let enroll of enrollments) {
        console.log(`Deleting enrollment ${enroll.id} for ${enroll.course_id}`);
        let url = `/courses/${enroll.course_id}/enrollments/${enroll.id}?task=delete`;
        try {
            await axios.delete(url);
        } catch {
            console.log('Error deleting enrollment');
            failed.push(enroll);
        }
    }
    console.log('enrollments removed');
    if (failed.length > 0) {
        console.log('Failed to delete the following enrollments');
        console.log(failed);
    }
}

// get all enrollments for a user
async function getEnrollments(data) {

    const enrollState = data.state || 'active&state[]=invited&state[]=completed&state[]=inactive&state[]=deleted'
    data.url = `https://${data.domain}/api/v1/users/${data.user}/enrollments?state[]=${enrollState}`;
    // const enrollments = await apiRunner(url);

    const enrollments = await getAPIData(data);

    return enrollments;
}

async function apiRunner(url) {
    const apiData = [];

    do {
        const res = await axios.get(url);
        apiData.push(...res.data);
        url = pagination.getNextPage(res.headers.link);
    } while (url);

    return apiData;
}

// asking the important questions
// (async () => {
//     // const curDomain = await questionAsker.questionDetails('What domain: ');
//     // const courseID = await questionAsker.questionDetails('What course: ');
//     // const number = await questionAsker.questionDetails('How many users do you want to enroll: ');
//     // const type = await questionAsker.questionDetails('What type of user do you want to enroll (Teacher/Ta/Student): ');
//     // questionAsker.close();

//     const curDomain = 'ckruger.instructure.com';
//     const courseID = 2;
//     const number = 1;
//     const user = '170000004596731';

//     axios.defaults.baseURL = `https://${curDomain}/api/v1`;

//     await removeEnrollments(user);

//     console.log('Done');
//     // console.log('Total enrollments ', enrollments.length);
//     // console.log('First enrollment', enrollments[0]);
//     // const enrolled = await enrollUser(courseID, number);
//     // console.log('enrolled ', enrolled.length);


// })();

// GraphQL function to get user enrollments
async function getUserEnrollments(domain, token, userId) {
    const query = `
        query myQuery {
            legacyNode(_id: "${userId}", type: User) {
                ... on User {
                    sisId
                    integrationId
                    enrollments(excludeConcluded: false) {
                        course {
                            sisId
                        }
                        associatedUser {
                            sisId
                        }
                        enrollmentState
                        section {
                            sisId
                        }
                        type
                        limitPrivilegesToCourseSection
                        role {
                            _id
                        }
                        endAt
                        startAt
                    }
                }
            }
        }
    `;

    const config = {
        method: 'post',
        url: `https://${domain}/api/graphql`,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        data: { query }
    };

    try {
        const response = await axios(config);
        const enrollments = [];

        if (response.data?.data?.legacyNode?.enrollments) {
            const user = response.data.data.legacyNode;
            user.enrollments.forEach(enrollment => {
                enrollments.push({
                    user_id: user.sisId || '',
                    integration_id: user.integrationId || '',
                    course_id: enrollment.course?.sisId || '',
                    associated_user_id: enrollment.associatedUser?.sisId || '',
                    status: enrollment.enrollmentState || '',
                    section_id: enrollment.section?.sisId || '',
                    role_id: enrollment.role?._id || '',
                    end_date: enrollment.endAt || '',
                    start_date: enrollment.startAt || '',
                    limit_section_privileges: enrollment.limitPrivilegesToCourseSection || false
                });
            });
        }

        return { success: true, enrollments, searchType: 'user' };
    } catch (error) {
        console.error('User enrollments search error:', error);
        throw {
            success: false,
            error: error.message || 'Failed to fetch user enrollments',
            status: error.response?.status || error.status,
            code: error.code
        };
    }
}

// GraphQL function to get course enrollments
async function getCourseEnrollments(domain, token, courseId) {
    const query = `
        query myQuery {
            course(id: "${courseId}") {
                sisId
                enrollmentsConnection(
                    first: 100
                    after: ""
                    filter: {states: [deleted, active, inactive, completed]}
                ) {
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                    edges {
                        node {
                            enrollmentState
                            sisSectionId
                            startAt
                            endAt
                            limitPrivilegesToCourseSection
                            role {
                                _id
                            }
                            user {
                                sisId
                                integrationId
                            }
                            section {
                                sisId
                            }
                            associatedUser {
                                sisId
                            }
                        }
                    }
                }
            }
        }
    `;

    const config = {
        method: 'post',
        url: `https://${domain}/api/graphql`,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        data: { query }
    };

    try {
        const response = await axios(config);
        const enrollments = [];

        if (response.data?.data?.course?.enrollmentsConnection?.edges) {
            const course = response.data.data.course;
            course.enrollmentsConnection.edges.forEach(edge => {
                const enrollment = edge.node;
                enrollments.push({
                    course_id: course.sisId || '',
                    user_id: enrollment.user?.sisId || '',
                    role_id: enrollment.role?._id || '',
                    section_id: enrollment.section?.sisId || '',
                    status: enrollment.enrollmentState || '',
                    integration_id: enrollment.user?.integrationId || '',
                    start_date: enrollment.startAt || '',
                    end_date: enrollment.endAt || '',
                    associated_user_id: enrollment.associatedUser?.sisId || '',
                    limit_section_privileges: enrollment.limitPrivilegesToCourseSection || false
                });
            });
        }

        return { success: true, enrollments, searchType: 'course' };
    } catch (error) {
        console.error('Course enrollments search error:', error);
        throw {
            success: false,
            error: error.message || 'Failed to fetch course enrollments',
            status: error.response?.status || error.status,
            code: error.code
        };
    }
}

// GraphQL function to get section enrollments
async function getSectionEnrollments(domain, token, sectionId) {
    const query = `
        query myQuery {
            legacyNode(_id: "${sectionId}", type: Section) {
                ... on Section {
                    allStudents(after: "", first: 100) {
                        edges {
                            node {
                                sisId
                                enrollments {
                                    course {
                                        sisId
                                    }
                                    user {
                                        sisId
                                        integrationId
                                    }
                                    limitPrivilegesToCourseSection
                                    enrollmentState
                                    endAt
                                    startAt
                                    role {
                                        _id
                                    }
                                    associatedUser {
                                        sisId
                                    }
                                }
                            }
                        }
                        pageInfo {
                            endCursor
                            hasNextPage
                        }
                    }
                    sisId
                }
            }
        }
    `;

    const config = {
        method: 'post',
        url: `https://${domain}/api/graphql`,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        data: { query }
    };

    try {
        const response = await axios(config);
        const enrollments = [];

        if (response.data?.data?.legacyNode?.allStudents?.edges) {
            const section = response.data.data.legacyNode;
            section.allStudents.edges.forEach(edge => {
                const student = edge.node;
                student.enrollments.forEach(enrollment => {
                    enrollments.push({
                        section_id: section.sisId || '',
                        user_id: student.sisId || '',
                        course_id: enrollment.course?.sisId || '',
                        role_id: enrollment.role?._id || '',
                        status: enrollment.enrollmentState || '',
                        integration_id: enrollment.user?.integrationId || '',
                        start_date: enrollment.startAt || '',
                        end_date: enrollment.endAt || '',
                        associated_user_id: enrollment.associatedUser?.sisId || '',
                        limit_section_privileges: enrollment.limitPrivilegesToCourseSection || false
                    });
                });
            });
        }

        return { success: true, enrollments, searchType: 'section' };
    } catch (error) {
        console.error('Section enrollments search error:', error);
        throw {
            success: false,
            error: error.message || 'Failed to fetch section enrollments',
            status: error.response?.status || error.status,
            code: error.code
        };
    }
}

module.exports = {
    enrollUser,
    getEnrollments,
    getUserEnrollments,
    getCourseEnrollments,
    getSectionEnrollments
};
