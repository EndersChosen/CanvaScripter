const axios = require('axios');
const { errorCheck } = require('../utilities.js');

// Search terms using REST API
async function searchTerms(searchTerm) {
    try {
        const url = `/accounts/self/terms/${searchTerm}`;

        const request = async () => {
            return await axios.get(url);
        };

        const response = await errorCheck(request);
        return [response.data]; // Return as array to match expected format
    } catch (error) {
        console.error('Error searching terms:', error);
        throw error;
    }
}

module.exports = {
    searchTerms
};