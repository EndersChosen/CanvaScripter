// pages.js - Canvas Pages (Wiki Pages) API helpers

const axios = require('axios');
const { errorCheck } = require('../utilities');

async function getPagesGraphQL(data) {
    const pages = [];
    const query = `
    query MyQuery($courseID: ID, $nextPage: String, $titleSearch: String) {
        course(id: $courseID) {
            pagesConnection(filter: {searchTerm: $titleSearch}, after: $nextPage, first: 100) {
                edges {
                    node {
                        _id
                        title
                        published
                        createdAt
                        url
                    }
                }
                pageInfo {
                    hasNextPage
                    endCursor
                }
            }
        }
    }`;

    const variables = {
        courseID: data.course_id,
        nextPage: null,
        titleSearch: data.title_search || ""
    };

    const axiosConfig = {
        method: 'post',
        url: `https://${data.domain}/api/graphql`,
        headers: {
            Authorization: `Bearer ${data.token}`
        },
        data: {
            query: query,
            variables: variables
        }
    };

    let hasNextPage = true;
    while (hasNextPage) {
        try {
            const request = async () => axios(axiosConfig);
            const response = await errorCheck(request);

            const connection = response.data.data.course.pagesConnection;
            if (connection && connection.edges) {
                pages.push(...connection.edges.map(edge => edge.node));
            }

            if (connection && connection.pageInfo && connection.pageInfo.hasNextPage) {
                variables.nextPage = connection.pageInfo.endCursor;
                // Update config with new variables for next iteration
                axiosConfig.data.variables = variables;
            } else {
                hasNextPage = false;
            }
        } catch (error) {
            console.error('Error fetching pages:', error);
            throw error;
        }
    }
    return pages;
}

async function createPage(data) {
    // POST /api/v1/courses/:course_id/pages
    const axiosConfig = {
        method: 'post',
        url: `https://${data.domain}/api/v1/courses/${data.course_id}/pages`,
        headers: {
            Authorization: `Bearer ${data.token}`,
        },
        data: {
            wiki_page: {
                title: data.title,
                body: data.body ?? '',
                published: data.published ?? true,
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

async function deletePage(data) {
    // DELETE /api/v1/courses/:course_id/pages/:url_or_id
    const axiosConfig = {
        method: 'delete',
        url: `https://${data.domain}/api/v1/courses/${data.course_id}/pages/${data.page_url || data.page_id}`,
        headers: {
            Authorization: `Bearer ${data.token}`,
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

module.exports = { createPage, deletePage, getPagesGraphQL };