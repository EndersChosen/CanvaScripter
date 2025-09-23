// batchHandler.js - Batch processing utility for Canvas API requests

const { waitFunc } = require('./utilities');

/**
 * Processes requests in batches with retry logic for throttling
 * @param {Array} requests - Array of request objects with id and request function
 * @param {number|Object} batchSize - Batch size or options object
 * @param {number} timeDelay - Delay between batches in milliseconds
 * @returns {Promise<Object>} Object with successful and failed arrays
 */
async function batchHandler(requests, batchSize = 35, timeDelay) {
    // Support options overload: batchHandler(reqs, { batchSize, timeDelay, isCancelled })
    let isCancelled = null;
    const getEnvNumber = (name, fallback) => {
        const n = Number(process.env[name]);
        return Number.isFinite(n) && n >= 0 ? n : fallback;
    };
    const envTimeDelay = getEnvNumber('TIME_DELAY', 2000);
    if (typeof batchSize === 'object' && batchSize !== null) {
        const opts = batchSize;
        isCancelled = typeof opts.isCancelled === 'function' ? opts.isCancelled : null;
        timeDelay = typeof opts.timeDelay === 'number' ? opts.timeDelay : envTimeDelay;
        batchSize = typeof opts.batchSize === 'number' ? opts.batchSize : 35;
    } else if (typeof timeDelay === 'object' && timeDelay !== null) {
        const opts = timeDelay;
        isCancelled = typeof opts.isCancelled === 'function' ? opts.isCancelled : null;
        timeDelay = typeof opts.timeDelay === 'number' ? opts.timeDelay : envTimeDelay;
    }

    if (!Number.isFinite(timeDelay)) {
        timeDelay = envTimeDelay;
    }

    let myRequests = requests
    let successful = [];
    let failed = [];
    let retryRequests = [];
    let counter = 0;

    const processBatchRequests = async (myRequests) => {
        console.log('Inside processBatchRequests');

        retryRequests = []; // zeroing out failed requests
        // const results = [];
        for (let i = 0; i < myRequests.length; i += batchSize) {
            if (isCancelled && isCancelled()) break;
            const batch = myRequests.slice(i, i + batchSize);
            await Promise.allSettled(batch.map(request => request.request()
                .then(response => successful.push(handleSuccess(response, request)))
                .catch(error => failed.push(handleError(error, request)))));
            // results.push(...batchResults);
            if (i + batchSize < myRequests.length) {
                if (isCancelled && isCancelled()) break;
                await waitFunc(timeDelay);
            }
        }

        // return results;

        function handleSuccess(response, request) {
            return {
                id: request.id,
                status: 'fulfilled',
                value: response
            };
        }

        function handleError(error, request) {
            return {
                id: request.id,
                reason: error.message,
                status: error.status,
                isNetworkError: !error.status && (
                    error.message.includes('ENOTFOUND') ||
                    error.message.includes('ECONNREFUSED') ||
                    error.message.includes('ECONNRESET') ||
                    error.message.includes('ETIMEDOUT') ||
                    error.message.includes('network error') ||
                    error.code === 'ENOTFOUND' ||
                    error.code === 'ECONNREFUSED' ||
                    error.code === 'ECONNRESET' ||
                    error.code === 'ETIMEDOUT'
                )
            };
        }
    }

    // Only retry on 403 (throttling) - no other status codes indicate retryable errors
    const shouldRetry = (request) => {
        // Don't retry network errors
        if (request.isNetworkError) return false;

        // Only retry on 403 (throttling/rate limiting)
        return request.status === 403;
    };

    do {
        if (isCancelled && isCancelled()) break;
        if (retryRequests.length > 0) {
            myRequests = requests.filter(request => retryRequests.some(r => r.id === request.id)); // find the request data to process the failed requests
            counter++;
            await waitFunc(timeDelay); // wait for the time delay before attempting a retry
            await processBatchRequests(myRequests);
            retryRequests = failed.filter(request => shouldRetry(request)); // only retry requests that should be retried
        } else {
            await processBatchRequests(myRequests);
            retryRequests = failed.filter(request => shouldRetry(request)); // only retry requests that should be retried
        }
    }
    while (counter < 3 && retryRequests.length > 0) // loop through if there are failed requests until the counter is over 3

    return { successful, failed };
}

module.exports = {
    batchHandler
};