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

/**
 * Check the workflow_state of a single course.
 * GET /api/v1/accounts/self/courses/:id?include[]=all_courses
 * Returns { id, workflow_state, name } or throws on error.
 */
async function getCourseState(domain, token, courseId) {
    const axiosConfig = {
        method: 'get',
        url: `https://${domain}/api/v1/accounts/self/courses/${courseId}`,
        params: { 'include[]': 'all_courses' },
        headers: { 'Authorization': `Bearer ${token}` }
    };
    const request = async () => axios(axiosConfig);
    const response = await errorCheck(request);
    return {
        id: String(courseId),
        workflow_state: response.data.workflow_state,
        name: response.data.name || ''
    };
}

/**
 * Submit a batch of course IDs for undelete (restore).
 * PUT /api/v1/accounts/self/courses
 * Returns the Canvas Progress object.
 */
async function restoreCourseBatch(domain, token, courseIds) {
    const params = new URLSearchParams();
    courseIds.forEach(id => params.append('course_ids[]', id));
    params.append('event', 'undelete');

    const axiosConfig = {
        method: 'put',
        url: `https://${domain}/api/v1/accounts/self/courses`,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: params.toString()
    };

    const request = async () => axios(axiosConfig);
    const response = await errorCheck(request);
    return response.data; // progress object
}

/**
 * Poll a progress resource once and return its current state.
 * GET /api/v1/progress/:id
 */
async function pollProgressOnce(domain, token, progressId) {
    const axiosConfig = {
        method: 'get',
        url: `https://${domain}/api/v1/progress/${progressId}`,
        headers: { 'Authorization': `Bearer ${token}` }
    };
    const request = async () => axios(axiosConfig);
    const response = await errorCheck(request);
    return response.data;
}

/**
 * Cancel a running Canvas progress job.
 * POST /api/v1/progress/:id/cancel
 */
async function cancelProgressJob(domain, token, progressId, message) {
    const axiosConfig = {
        method: 'post',
        url: `https://${domain}/api/v1/progress/${progressId}/cancel`,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        data: message ? { message } : {}
    };
    try {
        const request = async () => axios(axiosConfig);
        const response = await request();
        return response.data;
    } catch (err) {
        console.warn('cancelProgressJob failed:', err.message);
        return null;
    }
}

module.exports = {
    resetCourse, createSupportCourse, editCourse, getCourseInfo, associateCourses, syncBPCourses, restoreContent, searchCourses,
    restoreCourseBatch, pollProgressOnce, cancelProgressJob, getCourseState
};