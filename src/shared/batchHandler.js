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
    // Support options overload: batchHandler(reqs, { batchSize, timeDelay, isCancelled, operationId })
    let isCancelled = null;
    let operationId = null;
    const getEnvNumber = (name, fallback) => {
        const n = Number(process.env[name]);
        return Number.isFinite(n) && n >= 0 ? n : fallback;
    };
    const envTimeDelay = getEnvNumber('TIME_DELAY', 2000);
    if (typeof batchSize === 'object' && batchSize !== null) {
        const opts = batchSize;
        isCancelled = typeof opts.isCancelled === 'function' ? opts.isCancelled : null;
        operationId = opts.operationId || null;
        timeDelay = typeof opts.timeDelay === 'number' ? opts.timeDelay : envTimeDelay;
        batchSize = typeof opts.batchSize === 'number' ? opts.batchSize : 35;
    } else if (typeof timeDelay === 'object' && timeDelay !== null) {
        const opts = timeDelay;
        isCancelled = typeof opts.isCancelled === 'function' ? opts.isCancelled : null;
        operationId = opts.operationId || null;
        timeDelay = typeof opts.timeDelay === 'number' ? opts.timeDelay : envTimeDelay;
    }

    if (!Number.isFinite(timeDelay)) {
        timeDelay = envTimeDelay;
    }

    const log = (msg) => {
        if (operationId) {
            console.log(`[${operationId}] ${msg}`);
        } else {
            console.log(msg);
        }
    };

    let myRequests = requests
    let successful = [];
    let failed = [];
    let retryRequests = [];
    let counter = 0;

    const processBatchRequests = async (myRequests) => {
        console.log('Inside processBatchRequests');

        retryRequests = []; // zeroing out failed requests
        
        // On retries, remove the failed entries for requests we're about to retry
        if (counter > 0) {
            const retryIds = new Set(myRequests.map(r => r.id));
            failed = failed.filter(f => !retryIds.has(f.id));
        }
        
        // const results = [];
        for (let i = 0; i < myRequests.length; i += batchSize) {
            if (isCancelled && isCancelled()) {
                console.log('BatchHandler: Cancellation detected before batch', i);
                break;
            }
            const batch = myRequests.slice(i, i + batchSize);
            await Promise.allSettled(batch.map(request => request.request()
                .then(response => successful.push(handleSuccess(response, request)))
                .catch(error => failed.push(handleError(error, request)))));
            // results.push(...batchResults);
            if (i + batchSize < myRequests.length) {
                if (isCancelled && isCancelled()) {
                    console.log('BatchHandler: Cancellation detected after batch', i);
                    break;
                }
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
        if (isCancelled && isCancelled()) {
            log('Batch handler cancelled by user');
            break;
        }
        
        if (retryRequests.length > 0) {
            myRequests = requests.filter(request => retryRequests.some(r => r.id === request.id)); // find the request data to process the failed requests
            counter++;
            
            // Exponential backoff: 5s, 15s, 30s for retry attempts
            let retryDelay = timeDelay;
            if (counter === 1) {
                retryDelay = timeDelay * 2.5; // First retry: 5s (2s * 2.5)
            } else if (counter === 2) {
                retryDelay = timeDelay * 7.5; // Second retry: 15s (2s * 7.5)
            } else if (counter === 3) {
                retryDelay = timeDelay * 15; // Third retry: 30s (2s * 15)
            }
              
            log(`Retry attempt ${counter}/3 - waiting ${retryDelay}ms before retrying ${myRequests.length} requests...`);
            await waitFunc(retryDelay); // wait for the exponentially increasing delay before attempting a retry
              
            log(`Starting retry attempt ${counter}/3...`);
            await processBatchRequests(myRequests);
            retryRequests = failed.filter(request => shouldRetry(request)); // only retry requests that should be retried
            log(`Retry attempt ${counter}/3 complete. ${retryRequests.length} requests still need retry.`);
        } else {
            log('Processing initial batch requests...');
            await processBatchRequests(myRequests);
            retryRequests = failed.filter(request => shouldRetry(request)); // only retry requests that should be retried
            log(`Initial batch complete. ${retryRequests.length} requests need retry.`);
        }
    } while (counter < 3 && retryRequests.length > 0); // loop through if there are failed requests until the counter is over 3

    log(`Batch handler complete. Successful: ${successful.length}, Failed: ${failed.length}`);
    return { successful, failed };
}

module.exports = {
    batchHandler
};