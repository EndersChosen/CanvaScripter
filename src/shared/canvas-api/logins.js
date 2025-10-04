// logins.js
const axios = require('axios');
const { errorCheck } = require('../utilities.js');

// Get user logins by Canvas User ID or SIS User ID
async function searchUserLogins(domain, token, userId, idType = 'canvas_id') {
    // Set up axios for this request
    const axiosConfig = {
        baseURL: `https://${domain}/api/v1`,
        headers: {
            'Authorization': `Bearer ${token}`
        }
    };

    let userIdentifier = userId;
    
    // Determine the user identifier format based on the ID type
    if (idType === 'sis_user_id') {
        userIdentifier = `sis_user_id:${userId}`;
    }
    // For canvas_id, use the ID as-is

    const url = `/users/${userIdentifier}/logins`;

    try {
        const request = async () => {
            return await axios.get(url, axiosConfig);
        };
        const response = await errorCheck(request);
        
        // Map the response to the SIS format
        const mappedLogins = response.data.map(login => ({
            sis_user_id: login.user_id,
            unique_id: login.unique_id,
            authentication_provider_id: login.authentication_provider_id,
            status: 'active'  // All returned logins are active
        }));
        
        return mappedLogins;
    } catch (error) {
        console.error('Error searching user logins:', error);
        throw error;
    }
}

module.exports = {
    searchUserLogins
};