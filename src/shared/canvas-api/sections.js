// sections.js - Canvas Sections API helpers

const axios = require('axios');
const { errorCheck } = require('../utilities');

async function createSection(data) {
    // POST /api/v1/courses/:course_id/sections
    const courseSection = {
        name: data.name,
    };

    // Add optional fields if provided
    if (data.start_at) {
        courseSection.start_at = data.start_at;
    }
    if (data.end_at) {
        courseSection.end_at = data.end_at;
    }
    if (data.restrict_enrollments_to_section_dates !== undefined) {
        courseSection.restrict_enrollments_to_section_dates = data.restrict_enrollments_to_section_dates;
    }

    const axiosConfig = {
        method: 'post',
        url: `https://${data.domain}/api/v1/courses/${data.course_id}/sections`,
        headers: {
            Authorization: `Bearer ${data.token}`,
        },
        data: {
            course_section: courseSection,
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

        const section = response.data;

        // Map REST API response to SIS CSV format
        const mappedSection = {
            section_id: section.sis_section_id || '',
            course_id: section.sis_course_id || '',
            name: section.name || '',
            status: 'active', // Any returned section is active (deleted sections won't return)
            start_date: section.start_at || '',
            end_date: section.end_at || ''
        };

        return {
            success: true,
            data: [mappedSection] // Return as array to match expected format
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