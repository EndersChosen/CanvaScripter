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

async function searchSection(domain, token, sectionId) {
    // GET /api/v1/sections/:section_id
    const axiosConfig = {
        method: 'get',
        url: `https://${domain}/api/v1/sections/${sectionId}`,
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };

    try {
        const request = async () => axios(axiosConfig);
        const response = await errorCheck(request);
        return {
            success: true,
            section: response.data
        };
    } catch (error) {
        console.error('Section search error:', error);
        throw {
            success: false,
            error: error.message || 'Failed to fetch section',
            status: error.response?.status || error.status,
            code: error.code
        };
    }
}

module.exports = { createSection, searchSection };