const axios = require('axios');
const { errorCheck } = require('./utilities.js');

// uses the 'link' header response to find
// the 'next' page of api respones
function getNextPage(links) {
    if (!links) return false;

    const arrayLinks = links.split(',');
    const json = arrayLinks.map(element => {
        const [link, rel] = element.split(';');
        return {
            link: link.trim().replace(/[<>]/g, ''),
            rel: rel.split('=')[1].trim().replace(/\"/g, '')
        };
    });
    //console.log(json);
    for (let obj of json) {
        if (obj.rel === 'next') {
            console.log('Getting next page');
            return obj.link;
        }
    }
    return false;
}

/**
 * Get all pages from a REST API endpoint using Link header pagination
 * @param {Object} axiosConfig - Axios configuration object with method, url, headers, params, etc.
 * @returns {Promise<Array>} - Array of all results from all pages
 */
async function getAllPages(axiosConfig) {
    console.log('pagination.js > getAllPages (REST)');
    
    const allResults = [];
    let nextPage = true;
    let pageCount = 0;

    // Ensure per_page is set to 100 for efficiency
    if (!axiosConfig.params) {
        axiosConfig.params = {};
    }
    if (!axiosConfig.params.per_page) {
        axiosConfig.params.per_page = 100;
    }

    while (nextPage) {
        pageCount++;
        console.log(`Fetching page ${pageCount}...`);

        try {
            const request = async () => {
                return await axios(axiosConfig);
            };
            const response = await errorCheck(request);

            // Add results from this page
            if (Array.isArray(response.data)) {
                allResults.push(...response.data);
            } else {
                console.warn('Response data is not an array:', response.data);
                break;
            }

            // Check for next page
            const linkHeader = response.headers.link || response.headers.get?.('link');
            nextPage = getNextPage(linkHeader);

            if (nextPage) {
                // Update the URL for the next request
                axiosConfig.url = nextPage;
                // Remove params as they're now in the URL
                delete axiosConfig.params;
            }
        } catch (error) {
            console.error('Error in getAllPages:', error);
            throw error;
        }
    }

    console.log(`Finished pagination. Total results: ${allResults.length}`);
    return allResults;
}

/**
 * Get all pages from a GraphQL endpoint using cursor-based pagination
 * @param {Object} config - Configuration object
 * @param {string} config.domain - Canvas domain
 * @param {string} config.token - Canvas API token
 * @param {string} config.query - GraphQL query string (must include $nextPage parameter and pageInfo fields)
 * @param {Object} config.variables - Initial variables for the query
 * @param {string} config.dataPath - Path to the connection data in response (e.g., 'data.course.quizzesConnection')
 * @param {Function} config.extractNodes - Function to extract nodes from the connection data
 * @returns {Promise<Array>} - Array of all results from all pages
 */
async function getAllPagesGraphQL(config) {
    console.log('pagination.js > getAllPagesGraphQL');

    const { domain, token, query, variables, dataPath, extractNodes } = config;
    
    const allResults = [];
    let hasNextPage = true;
    let pageCount = 0;
    let currentVariables = { ...variables, nextPage: "" };

    const axiosConfig = {
        method: 'post',
        url: `https://${domain}/api/graphql`,
        headers: {
            'Authorization': `Bearer ${token}`
        }
    };

    while (hasNextPage) {
        pageCount++;
        console.log(`Fetching GraphQL page ${pageCount}...`);

        axiosConfig.data = {
            query: query,
            variables: currentVariables
        };

        try {
            const request = async () => {
                return await axios(axiosConfig);
            };
            const response = await errorCheck(request);

            // Navigate to the connection data using the provided path
            let connectionData = response.data;
            const pathParts = dataPath.split('.');
            for (const part of pathParts) {
                connectionData = connectionData[part];
                if (!connectionData) {
                    throw new Error(`Invalid dataPath: ${dataPath}`);
                }
            }

            // Extract nodes using the provided function
            const nodes = extractNodes ? extractNodes(connectionData) : connectionData.nodes || connectionData.edges?.map(edge => edge.node) || [];
            allResults.push(...nodes);

            // Check for next page
            hasNextPage = connectionData.pageInfo?.hasNextPage || false;
            
            if (hasNextPage) {
                currentVariables.nextPage = connectionData.pageInfo.endCursor;
            }
        } catch (error) {
            console.error('Error in getAllPagesGraphQL:', error);
            throw error;
        }
    }

    console.log(`Finished GraphQL pagination. Total results: ${allResults.length}`);
    return allResults;
}

module.exports = { 
    getNextPage, 
    getAllPages,
    getAllPagesGraphQL
};
