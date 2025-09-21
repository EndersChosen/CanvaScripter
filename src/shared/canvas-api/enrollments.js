// enrollments.js
// const config = require('./config');
// const users = require('./users');
const { getAPIData } = require('../utilities');
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

module.exports = {
    enrollUser, getEnrollments
};
