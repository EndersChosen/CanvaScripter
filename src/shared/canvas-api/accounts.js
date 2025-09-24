const axios = require('axios');
const { errorCheck } = require('../utilities.js');

// Search accounts using GraphQL query
async function searchAccounts(searchTerm) {
    try {
        const graphqlQuery = {
            query: `
                query MyQuery($account_id: ID!) {
                    account(id: $account_id) {
                        sisId
                        name
                        parentAccountsConnection(first: 1) {
                            nodes {
                                sisId
                            }
                        }
                    }
                }
            `,
            variables: {
                account_id: searchTerm
            }
        };

        const request = async () => {
            // For GraphQL, we need to override the base URL since it uses /api/graphql instead of /api/v1
            const graphqlUrl = axios.defaults.baseURL.replace('/api/v1', '/api/graphql');
            return await axios.post(graphqlUrl, graphqlQuery, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        };

        const response = await errorCheck(request);

        if (response.data.data && response.data.data.account) {
            return [response.data.data.account]; // Return as array to match expected format
        } else {
            throw new Error('Account not found');
        }
    } catch (error) {
        console.error('Error searching accounts:', error);
        throw error;
    }
}

module.exports = {
    searchAccounts
};