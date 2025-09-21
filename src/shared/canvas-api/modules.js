const axios = require('axios');
const { errorCheck } = require("../utilities");

async function getModules(data) {
    const courseModules = [];
    let query = `
    query MyQuery ($course_id: ID, $nextPage: String) {
        course(id: $course_id) {
            modulesConnection(first: 200, after: $nextPage) {
                pageInfo {
                    hasNextPage
                    endCursor
                }
                edges {
                    node {
                        id
                        name
                        _id
                        moduleItems {
                            id
                        }
                    }
                }
            }
        }
    }`

    const variables = {
        "course_id": data.course_id,
        "nextPage": ""
    };

    const axiosConfig = {
        method: 'post',
        url: `https://${data.domain}/api/graphql`,
        headers: {
            'Authorization': `Bearer ${data.token}`
        },
        data: {
            query: query,
            variables: variables
        }
    };

    let next_page = true;
    while (next_page) {
        try {
            const request = async () => {
                return await axios(axiosConfig);
            }
            const response = await errorCheck(request);
            courseModules.push(...response.data.data.course.modulesConnection.edges);
            if (response.data.data.course.modulesConnection.pageInfo.hasNextPage) {
                variables.nextPage = response.data.data.course.modulesConnection.pageInfo.endCursor;
            } else {
                next_page = false;
            }
        } catch (error) {
            throw error
        }
    }
    if (data.emptyModules) {
        const filteredModules = courseModules.filter(module => module.node.moduleItems.length < 1);
        return filteredModules;
    } else {
        return courseModules;
    }

}

async function createModule(data) {
    let url = `https://${data.domain}/api/v1/courses/${data.course_id}/modules`;

    const axiosConfig = {
        method: 'post',
        url: url,
        headers: {
            'Authorization': `Bearer ${data.token}`,
            'Content-Type': 'application/json'
        },
        data: {
            module: {
                name: data.module_name
            }
        }
    };

    try {
        const request = async () => {
            return await axios(axiosConfig);
        }
        const response = await errorCheck(request);
        return response.data;
    } catch (error) {
        throw error;
    }
}
async function deleteModule(data) {
    let url = `https://${data.domain}/api/v1/courses/${data.course_id}/modules/${data.module_id}`;

    const axiosConfig = {
        method: 'delete',
        url: url,
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
        throw error;
    }
}

async function relockModule(data) {
    let url = `https://${data.domain}/api/v1/courses/${data.course_id}/modules/${data.module_id}/relock`;

    const axiosConfig = {
        method: 'put',
        url: url,
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
        throw error;
    }
}

async function getModulesSimple(data) {
    let url = `https://${data.domain}/api/v1/courses/${data.course_id}/modules`;

    const axiosConfig = {
        method: 'get',
        url: url,
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
        throw error;
    }
}

module.exports = {
    getModules, deleteModule, createModule, relockModule, getModulesSimple
}