// folders.js - Canvas Folders API helpers

const axios = require('axios');
const { errorCheck } = require('../utilities');

// Get a folder by id
// GET /api/v1/folders/:id
async function getFolder(data) {
    const folderId = data.folder_id || data.id;
    const axiosConfig = {
        method: 'get',
        url: `https://${data.domain}/api/v1/folders/${folderId}`,
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

// Delete a folder by id
// DELETE /api/v1/folders/:id
async function deleteFolder(data) {
    const folderId = data.folder_id || data.id;
    const axiosConfig = {
        method: 'delete',
        url: `https://${data.domain}/api/v1/folders/${folderId}`,
        headers: {
            Authorization: `Bearer ${data.token}`,
        },
    };

    try {
        const request = async () => axios(axiosConfig);
        const response = await errorCheck(request);
        return response.data?.id ?? folderId;
    } catch (error) {
        throw error;
    }
}

module.exports = { deleteFolder, getFolder };