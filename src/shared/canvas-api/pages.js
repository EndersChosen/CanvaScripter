// pages.js - Canvas Pages (Wiki Pages) API helpers

const axios = require('axios');
const { errorCheck } = require('../utilities');

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

module.exports = { createPage };