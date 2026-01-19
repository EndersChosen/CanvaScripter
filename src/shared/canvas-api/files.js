// files.js - Canvas Files API helpers

const axios = require('axios');
const { errorCheck } = require('../utilities');

// Delete a file by id (Attachment) with force=true
// DELETE /api/v1/files/:id?force=true
async function deleteFile(data) {
    const fileId = data.file_id || data.id;
    const axiosConfig = {
        method: 'delete',
        url: `https://${data.domain}/api/v1/files/${fileId}?force=true`,
        headers: {
            Authorization: `Bearer ${data.token}`
        }
    };

    try {
        const request = async () => axios(axiosConfig);
        const response = await errorCheck(request);
        return response.data?.id ?? fileId;
    } catch (error) {
        throw error;
    }
}

module.exports = { deleteFile };