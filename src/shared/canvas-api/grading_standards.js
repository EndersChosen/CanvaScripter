// grading_standards.js - Canvas API functions for grading standards operations

const { batchHandler } = require('../batchHandler');
const { errorCheck } = require('../utilities');

/**
 * Delete grading standards from Canvas
 * @param {Object} data - Request configuration
 * @param {string} data.domain - Canvas domain
 * @param {string} data.token - Canvas API token
 * @param {string} data.course_id - Course ID
 * @param {Array} data.grading_standards - Array of grading standard objects with id property
 * @param {Function} updateProgress - Optional progress callback
 * @param {Function} isCancelled - Optional cancellation check callback
 * @returns {Promise<Object>} Batch operation results
 */
async function deleteGradingStandards(data, updateProgress = null, isCancelled = null) {
    const { domain, token, course_id, grading_standards } = data;

    if (!grading_standards || !Array.isArray(grading_standards) || grading_standards.length === 0) {
        return { successful: [], failed: [] };
    }

    const request = async (requestData) => {
        try {
            const axiosConfig = {
                method: 'delete',
                url: `https://${requestData.domain}/api/v1/courses/${requestData.course_id}/grading_standards/${requestData.id}`,
                headers: {
                    'Authorization': `Bearer ${requestData.token}`
                }
            };

            return await errorCheck(async () => {
                const axios = require('axios');
                return await axios(axiosConfig);
            });
        } catch (error) {
            throw error;
        } finally {
            // Call progress update after each request completes
            if (updateProgress && typeof updateProgress === 'function') {
                updateProgress();
            }
        }
    };

    const requests = grading_standards.map((standard, index) => {
        const standardId = standard.id || standard._id || standard;

        const requestData = {
            domain: domain,
            token: token,
            course_id: course_id,
            id: standardId
        };

        return {
            id: index + 1,
            request: () => request(requestData)
        };
    });

    // Pass cancellation support to batchHandler with same config as assignments
    const batchResponse = await batchHandler(requests, { 
        batchSize: 35, 
        timeDelay: 100, 
        isCancelled 
    });

    // Sanitize the response to remove non-serializable objects
    const sanitizedResponse = {
        successful: batchResponse.successful.map(success => ({
            id: success.id,
            status: success.status,
            // Extract only the data portion from axios response to avoid circular references
            data: success.value?.data || null,
            statusCode: success.value?.status || null
        })),
        failed: batchResponse.failed.map(failure => ({
            id: failure.id,
            reason: failure.reason,
            status: failure.status,
            isNetworkError: failure.isNetworkError
        }))
    };

    return sanitizedResponse;
}

module.exports = {
    deleteGradingStandards
};