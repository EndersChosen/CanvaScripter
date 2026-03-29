const axios = require('axios');
const { errorCheck, getNextPage } = require("../utilities");

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
    const allModules = [];
    let url = `https://${data.domain}/api/v1/courses/${data.course_id}/modules?per_page=100`;

    while (url) {
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
            allModules.push(...response.data);
            url = getNextPage(response.headers?.link || response.headers?.get?.('link'));
        } catch (error) {
            throw error;
        }
    }

    return allModules;
}

/**
 * Create a module item within a specific module
 * POST /api/v1/courses/:course_id/modules/:module_id/items
 * @param {Object} data - { domain, token, course_id, module_id, module_item }
 * module_item should contain: { title, type, content_id?, page_url?, external_url?, new_tab?, indent? }
 */
async function createModuleItem(data) {
    let url = `https://${data.domain}/api/v1/courses/${data.course_id}/modules/${data.module_id}/items`;

    const moduleItemPayload = {
        module_item: {
            title: data.module_item.title,
            type: data.module_item.type
        }
    };

    // Add optional fields based on type
    if (data.module_item.content_id) {
        moduleItemPayload.module_item.content_id = data.module_item.content_id;
    }
    if (data.module_item.page_url) {
        moduleItemPayload.module_item.page_url = data.module_item.page_url;
    }
    if (data.module_item.external_url) {
        moduleItemPayload.module_item.external_url = data.module_item.external_url;
    }
    if (data.module_item.new_tab !== undefined) {
        moduleItemPayload.module_item.new_tab = data.module_item.new_tab;
    }
    if (data.module_item.indent !== undefined) {
        moduleItemPayload.module_item.indent = data.module_item.indent;
    }

    const axiosConfig = {
        method: 'post',
        url: url,
        headers: {
            'Authorization': `Bearer ${data.token}`,
            'Content-Type': 'application/json'
        },
        data: moduleItemPayload
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
    getModules, deleteModule, createModule, relockModule, getModulesSimple, createModuleItem
}