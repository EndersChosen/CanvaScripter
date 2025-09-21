// utilities.js
// const { instance, getMyRegion } = require('./Canvas/config');

const axios = require('axios');
const { getNextPage } = require('./pagination');
// add utilities here

async function createRequester(method, url, params, num, endpoint) {
    let index = 1;
    let apiLimit = 35
    let waitTime = 2000;
    let loops = Math.floor(num / apiLimit);
    let requests = [];
    let newParams = params;
    let arrayOfResults = [];
    let results = [];

    // loops is the number of item / 40 to add to a Promise.all()
    // I use / 40 to make sure I don't get rate limited when doing 
    // all the requests in parallel
    while (loops > 0) {
        console.log('Inside while');
        for (let i = 0; i < apiLimit; i++) {
            console.log('adding requests to promise');
            newParams[endpoint].name = `${endpoint} ${index}`;
            // console.log(`The position is ${params[endpoint].position}`);
            // if (params[endpoint].position) {
            //     newParams[endpoint].position = index;
            // }
            // console.log(`The index is ${ index }, the id is ${ discussionList[index].id }`);
            try {
                requests.push(axios({
                    method: method,
                    url: url,
                    data: newParams
                }));
            } catch (error) {
                console.log(`error adding request ${i} url ${url} to array`);
            }
            index++;
        }
        console.log('Finished adding requests');
        try {
            results = await Promise.all(requests);
            console.log('Processed requests');
            arrayOfResults.push(...results.map((result) => {
                return result.data;
            }));
        } catch (error) {
            console.log('There was an error', error.message, error.url);
            return;
        }
        console.log('Processed requests');
        // after processing the requests wait for 2 seconds to all the 
        // api rate limit to calm down before doing any more requests
        await holdPlease(waitTime);
        // reset the requests array and lower loop value by 1
        requests = [];
        loops--;
    }
    console.log('Outside while');
    // after doing all mulitple of 40 finishe the remainder of the requests
    for (let i = 0; i < num % apiLimit; i++) {
        console.log('adding requests to promise');
        newParams[endpoint].name = `${endpoint} ${index}`;

        //****************************
        // Had to remove position because it was causing deadlocks on creation
        //***************************

        // if (params[endpoint].position) {
        //     console.log('Updating position');
        //     newParams[endpoint].position = index;
        //     console.log(newParams[endpoint].position);
        // }
        try {
            requests.push(axios({
                method: method,
                url: url,
                data: newParams
            }));
        } catch (error) {
            console.log(`error adding request ${i} url ${url} to array`);
        }
        index++;
    }
    console.log('Finished adding requests');
    try {
        results = await Promise.all(requests);
        console.log('Finished processing requests');
        arrayOfResults.push(...results.map((result) => {
            return result.data;
        }));
    } catch (error) {
        console.log('There was an error', error.message, error.url, error);
        return;
    }
    return arrayOfResults;
}

async function deleteRequester(content, baseURL, afterID = null, token) {
    console.log('Inside deleteRequester');
    // content = array of conversations
    // baseURL = /converations
    const results = await deleteItems(content, baseURL, afterID, token);
    let counter = 0;
    while (results.failed.length > 0 && counter < 3) {
        console.log('Some requests failed, trying again...');
        await holdPlease(2000);

        const retryResults = await deleteItems(results.failed, baseURL, afterID, token);

        // compare the retryResults and add any successful deletes to the original results and remove from timedOut
        retryResults.successful.forEach((result) => {
            results.successful.push(result);
            results.failed = results.failed.filter((item) => {
                return item.id != result.id;
            });
        });
        counter++;
    }
    return results;
}

async function deleteItems(content, baseURL, afterID, token) {
    console.log('Inside deleteItems');

    let apiLimit = 200;
    let waitTime = 2000;
    let loops = Math.floor(content.length / apiLimit);
    let requests = [];
    const results = [];
    let index = 0;


    while (loops > 0) {
        console.log('Inside while');
        for (let i = 0; i < apiLimit; i++) {
            let myURL = `${baseURL}/${content[index].id}`;
            if (afterID !== null)
                myURL += `/${afterID}`;

            requests.push(axios({
                method: 'delete',
                url: myURL,
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }));
            index++;
        }
        try {
            results.push(...await Promise.allSettled(requests));
            // for (let result of results) {
            //     console.log(result);
            // }
            console.log('Processed requests');
            await holdPlease(waitTime);
            requests = [];
            loops--;
        } catch (error) {
            console.log('There was an error');
            console.log(error)
            return false;
        }
    }
    for (let i = 0; i < content.length % apiLimit; i++) {
        let myURL = `${baseURL}/${content[index].id}`;
        if (afterID !== null)
            myURL += `/${afterID}`;

        requests.push(axios({
            method: 'delete',
            url: myURL,
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }));
        index++;
    }
    try {
        results.push(...await Promise.allSettled(requests));
        // for (let result of results) {
        //     if (result.status === 'rejected') {
        //         throw new Error(`There was an error trying to delete ${result.reason.response.request.path}: ${result.reason.response.status} ${result.reason.response.statusText} ${JSON.stringify(result.reason.response.data.errors[0])}`);
        //     }
        // }
        console.log('Done');

        // return { status: true, message: 'success' };
    } catch (error) {
        // console.log('There was an error');
        console.log(error.message);
        return { status: false, message: error.message };
    }

    // checking for successful requests and mapping them to a new array
    const successful = results.filter((result) => {
        if (result.status === 'fulfilled') {
            return result;
        }
    }).map((result) => {
        return {
            status: result.status,
            id: result.value.data.id
        }
    });

    // checking for failed requests and mapping them to a new array
    const failed = results.filter((result) => {
        if (result.status === 'rejected') {
            return result
        }
    }).map((result) => {
        return {
            status: result.status,
            reason: result.reason.message,
            id: result.reason.config.url.split('/').pop()
        }
    });

    // checking for requests that timed out and mapping them to a new array
    // const timedOut = failed.filter((result) => {
    //     if (result.reason.match(/403/)) {
    //         console.log('Matched: ', result.id);
    //         return result;
    //     }
    // });

    reMappedResults = {
        successful: successful,
        failed: failed
    }

    return reMappedResults;

}
function waitFunc(ms) {
    console.log('Holding...');
    return new Promise((resolve) => setTimeout(resolve, ms))
}

async function errorCheck(request) {
    try {
        let newError = { status: null, message: null, request: null };
        const response = await request();

        // Check if response.data exists and has errors
        if (response.data && response.data.errors && response.data.errors.length > 0) {
            newError = {
                status: "Unknown",
                message: response.data.errors[0].message.replace(':', '')
            }
            throw newError;
        } else if (response.data && typeof response.data === 'string') {
            if (response.data.match(/doctype/)) {
                newError = {
                    status: "Unknown",
                    message: "No valid response, check your inputs."
                };
                throw newError;
            }
        }
        return response;
    } catch (error) {
        console.log('there was an error');
        console.log(error.message);
        // if (error.response?.status) {
        //     console.error(error.response.status);
        // }
        // if (error.response?.statusText) {
        //     console.error(error.response.statusText);
        // }
        if (error.code && (error.code === 'ERR_TLS_CERT_ALTNAME_INVALID' || error.code === 'ENOTFOUND')) {
            newError = {
                status: '404',
                message: `${error.code} - Check the domain to make sure it's valid.`,
                request: error.config.url
            }
            throw newError;
        } else if (error.code === 'ECONNRESET') {
            newError = {
                status: '',
                message: `${error.code}: ${error.message} - Check to make sure you're not connected to a VPN`,
                request: error.config.url
            }
            throw newError;
        } else if (error.response?.data?.errors?.sis_source_id?.[0]) {
            newError = {
                status: error.response.status,
                message: error.response.data.errors.sis_source_id[0].message,
                request: error.config.url
            };
            throw newError;
        } else if (error.response?.status) {
            const eStatus = error.response.status.toString();
            switch (eStatus) {
                case '401':
                case '404':
                    newError = {
                        status: error.response.status,
                        statusText: error.response.statusText,
                        message: error.message,
                        request: error.config.url
                    }
                    throw newError;
                case '502':
                    newError = {
                        status: error.response.status,
                        message: error.message,
                        request: error.config.url
                    }
                    throw newError;
                case '409':
                    newError = {
                        removed: error.response.data.removed?.length || 0,
                        not_removed: error.response.data.errors.not_removed?.length || 0,
                        not_found: error.response.data.errors.not_found?.length || 0,
                        status: error.response.status,
                        message: 'Some emails were not reset due to conflicts',
                        request: error.config.url
                    }
                    return newError;
                default:
                    newError = {
                        status: error.response.status,
                        message: error.message,
                        request: error.config.url
                    }
                    throw newError;
            }
        } else {
            newError = {
                status: error?.status || null,
                message: error.message,
                request: error.config.url
            }
            throw newError;
        }
    }
}

async function getAPIData(data) {
    const apiContent = [];

    const axiosConfig = {
        method: 'GET',
        url: data.url,
        headers: {
            'Authorization': `Bearer ${data.token}`
        }
    }

    try {
        let nextPage = data.url;
        while (nextPage) {
            const request = async () => {
                return await axios(axiosConfig);
            }
            const response = await errorCheck(request);

            if (response.headers.get('link')) {
                nextPage = getNextPage(response.headers.get('link'));
            } else {
                nextPage = false;
            }
            apiContent.push(...response.data)
        }
        return apiContent;
    } catch (error) {
        throw error;
    }
}

async function getRegion() {
    const response = await axios({
        method: "GET",
        url: `/accounts/self`
    });
    if (!response.headers.get('x-canvas-meta')) {
        console.log(response.headers);
        console.log('Unable to find region');
        return false;
    }
    const region = response.headers.get('x-canvas-meta').match(/z=(\w+)/)[1];
    console.log(region);

    return getMyRegion(region);
}

function getUTCTime(date) {
    return `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}T${this.getTimeZoneOffset()}:00:00.00Z`;
}

// Create a download link for CSV data
function createDownloadLink(data, filename, linkText = 'Download') {
    const csv = typeof data === 'string' ? data : data.map(row =>
        Array.isArray(row) ? row.join(',') : String(row)
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.textContent = linkText;
    link.className = 'btn btn-sm btn-outline-primary me-2';
    link.style.marginTop = '10px';

    // Clean up the URL when the link is clicked
    link.addEventListener('click', () => {
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });

    return link;
}

module.exports = {
    createRequester, deleteRequester, waitFunc, getRegion, errorCheck, getAPIData, getUTCTime, createDownloadLink
};
