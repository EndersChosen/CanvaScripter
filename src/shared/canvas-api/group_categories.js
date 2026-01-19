// group_categories.js - Canvas Group Categories API helpers

const axios = require('axios');
const { errorCheck } = require('../utilities');

// Delete a group category by id
// DELETE /api/v1/group_categories/:id
async function deleteGroupCategory(data) {
    const id = data.group_category_id || data.id;
    const axiosConfig = {
        method: 'delete',
        url: `https://${data.domain}/api/v1/group_categories/${id}`,
        headers: { Authorization: `Bearer ${data.token}` }
    };

    try {
        const request = async () => axios(axiosConfig);
        const response = await errorCheck(request);
        return response.data?.id ?? id;
    } catch (error) {
        throw error;
    }
}

module.exports = { deleteGroupCategory };