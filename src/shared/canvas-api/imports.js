// imports.js - Helpers for working with Content Migrations imported assets

const axios = require('axios');
const { errorCheck } = require('../utilities');

// Fetch imported assets for a given content migration (import) id
// Returns an object: { assignments: string[], discussions: string[], quizzes: string[] }
async function getImportedAssets(data) {
    // GET /api/v1/courses/:course_id/content_migrations/:id
    const axiosConfig = {
        method: 'get',
        url: `https://${data.domain}/api/v1/courses/${data.course_id}/content_migrations/${data.import_id}`,
        headers: {
            'Authorization': `Bearer ${data.token}`
        }
    };

    try {
        const request = async () => axios(axiosConfig);
        const response = await errorCheck(request);

        // Return the full response data so the renderer can access all properties
        // including the nested imported_assets structure
        return response.data;
    } catch (error) {
        throw error;
    }
}

module.exports = { getImportedAssets };

// List recent content migrations for a course (helps the user pick a valid import id)
async function listContentMigrations(data) {
    const axiosConfig = {
        method: 'get',
        url: `https://${data.domain}/api/v1/courses/${data.course_id}/content_migrations?per_page=${data.per_page || 50}`,
        headers: {
            'Authorization': `Bearer ${data.token}`
        }
    };

    try {
        const request = async () => axios(axiosConfig);
        const response = await errorCheck(request);
        return response.data;
    } catch (error) {
        throw error;
    }
}

module.exports.listContentMigrations = listContentMigrations;