// courses.js

const axios = require('axios');
const pagination = require('../pagination.js');
const { errorCheck } = require('../utilities.js');

async function restoreContent(data) {
    const axiosConfig = {
        url: `https://${data.domain}/courses/${data.course_id}/undelete/${data.context + data.value}`,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${data.token}`
        }
    };

    try {
        const request = async () => {
            return await axios(axiosConfig);
        }
        const response = await errorCheck(request);
        return response;
    } catch (error) {
        throw error;
    }
}

async function resetCourse(data) {
    console.log('inside resetCourse');

    let url = `https://${data.domain}/api/v1/courses/${data.course}/reset_content`;

    try {
        const request = async () => {
            return await axios.post(url, {}, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + data.token
                }
            });
        };

        const response = await errorCheck(request);
        return response.data.id;
    } catch (error) {
        throw error;
    }
}

async function createSupportCourse(data) {
    console.log('inside createSupportCourse');

    let url = `https://${data.domain}/api/v1/accounts/self/courses`;

    const courseData = {
        course: {
            name: data?.course?.name || 'I\'m a basic course',
            default_view: 'feed'
        },
        offer: data?.course?.publish || false
    }

    const axiosConfig = {
        method: 'post',
        url: url,
        headers: {
            'Authorization': `Bearer ${data.token}`
        },
        data: courseData
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

async function editCourse(data) {
    let url = `https://${data.domain}/api/v1/courses/${data.course_id}`;

    const courseData = {
        course: {
            blueprint: true
        }
    }

    const axiosConfig = {
        method: 'put',
        url: url,
        headers: {
            'Authorization': `Bearer ${data.token}`
        },
        data: courseData
    };

    try {
        const request = async () => {
            return await axios(axiosConfig);
        }
        const response = await errorCheck(request);
        return response.data;
    } catch (error) {
        throw error
    } finally {
        console.log('Finished editing course');
    }
}

async function associateCourses(data) {
    let url = `https://${data.domain}/api/v1/courses/${data.bpCourseID}/blueprint_templates/default/update_associations`;

    const axiosConfig = {
        method: 'put',
        url: url,
        headers: {
            'Authorization': `Bearer ${data.token}`
        },
        data: {
            course_ids_to_add: data.associated_course_ids
        }
    };

    try {
        const request = async () => {
            return await axios(axiosConfig);
        };
        const response = await errorCheck(request);
        return response.data;
    } catch (error) {
        throw error
    }
}

async function getCourseInfo(data) {
    let url = `https://${data.domain}/api/v1/courses/${data.bpCourseID}`;

    const axiosConfig = {
        method: 'get',
        url: url,
        headers: {
            'Authorization': `Bearer ${data.token}`
        }
    };


    const request = async () => {
        try {
            return await axios(axiosConfig);
        } catch (error) {
            throw error;
        }
    };

    const response = await errorCheck(request);
    return response.data;
}

async function syncBPCourses(data) {
    let url = `https://${data.domain}/api/v1/courses/${data.bpCourseID}/blueprint_templates/default/migrations`;

    const axiosConfig = {
        method: 'post',
        url: url,
        headers: {
            'Authorization': `Bearer ${data.token}`
        },
        data: {
            comment: 'From CanvaScripter',
            send_notification: false
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

// Search courses using GraphQL query
async function searchCourses(searchTerm) {
    try {
        const graphqlQuery = {
            query: `
                query MyQuery($course_id: ID!) {
                    course(id: $course_id) {
                        sisId
                        name
                        courseCode
                        account {
                            sisId
                        }
                        term {
                            sisId
                        }
                        state
                    }
                }
            `,
            variables: {
                course_id: searchTerm
            }
        };

        const request = async () => {
            // For GraphQL, we need to override the base URL since it uses /api/graphql instead of /api/v1
            const graphqlUrl = axios.defaults.baseURL.replace('/api/v1', '/api/graphql');
            return await axios.post(graphqlUrl, graphqlQuery, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        };

        const response = await errorCheck(request);

        if (response.data.data && response.data.data.course) {
            const course = response.data.data.course;

            // Map state to status: anything not 'deleted' or 'completed' should be 'active'
            let status = 'active';
            if (course.state === 'deleted') {
                status = 'deleted';
            } else if (course.state === 'completed' || course.state === 'concluded') {
                status = 'completed';
            }

            // Map GraphQL response to CSV format
            const mappedCourse = {
                course_id: course.sisId || '',
                short_name: course.courseCode || '',
                long_name: course.name || '',
                account_id: course.account?.sisId || '',
                term_id: course.term?.sisId || '',
                status: status
            };

            return [mappedCourse]; // Return as array to match expected format
        } else {
            throw new Error('Course not found');
        }
    } catch (error) {
        console.error('Error searching courses:', error);
        throw error;
    }
}

module.exports = {
    resetCourse, createSupportCourse, editCourse, getCourseInfo, associateCourses, syncBPCourses, restoreContent, searchCourses
};