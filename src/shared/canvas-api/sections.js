// sections.js - Canvas Sections API helpers

const axios = require('axios');
const { errorCheck } = require('../utilities');

async function createSection(data) {
    // POST /api/v1/courses/:course_id/sections
    const axiosConfig = {
        method: 'post',
        url: `https://${data.domain}/api/v1/courses/${data.course_id}/sections`,
        headers: {
            Authorization: `Bearer ${data.token}`,
        },
        data: {
            course_section: {
                name: data.name,
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

module.exports = { createSection };