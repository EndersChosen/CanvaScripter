// console.log('comm_channels.js');

const pagination = require('../pagination.js');
//const questionAsker = require('./questionAsker');
// const { deleteRequester } = require('./utilities');
const axios = require('axios');
const { waitFunc, errorCheck } = require('../utilities.js');

const REGION = {
    "dub_fra": "https://e5d4doray3ypvpqy7unlaoqzdi0mcwrb.lambda-url.eu-west-1.on.aws/emails/",
    "iad_pdx": "https://r4kxi5xpiejmj2eb6ru3z2dbrq0warfd.lambda-url.us-east-1.on.aws/emails/",
    "syd_sin": "https://b2wfgtizt4ilrqkdqsxiphbije0rnaxl.lambda-url.ap-southeast-2.on.aws/emails/",
    "yul": "https://4ib3vmp6bpq74pmitasw3v6wiy0etggh.lambda-url.ca-central-1.on.aws/emails/"
}

// returns a list of bounced emails that match a pattern
async function getBouncedData(data) {
    console.log('comm_channels.js > getBounced');
    const emails = [];

    const url = `https://${data.domain}/api/v1/accounts/self/bounced_communication_channels?pattern=*${data.pattern}`;

    const axiosConfig = {
        method: 'get',
        url: url,
        headers: {
            'Authorization': `Bearer ${data.token}`
        }
    };

    try {
        const request = async () => {
            return await axios(axiosConfig);
        }

        const response = await errorCheck(request);
        // if response.data.length > 1 push the data to emails starting at index 1
        if (response.data.length > 1) {
            emails.push(...response.data.slice(1));
        }
        return emails;
    } catch (error) {
        throw error;
    }

}

async function emailCheck(data) {
    console.log('comm_channels.js > emailCheck');

    const domain = data.domain;
    const token = data.token;
    const region = REGION[data.region];
    const email = String(data.pattern || '').trim();

    const emailStatus = {
        suppressed: false,
        bounced: false
    };

    emailStatus.suppressed = await awsCheck(region, token, email);
    emailStatus.bounced = await bounceCheck(domain, token, email);
    console.log('emailStatus computed', {
        suppressed: emailStatus.suppressed,
        bounced: emailStatus.bounced
    });

    return emailStatus;
}

async function awsCheck(domain, token, email) {
    console.log('comm_channels.js > awsCheck');

    const axiosConfig = {
        method: 'get',
        url: `${domain}${encodeURIComponent(email)}`,
        headers: {
            'Authorization': `Bearer ${token}`
        }
    };

    try {
        const request = async () => {
            return await axios(axiosConfig);
        }

        const response = await errorCheck(request);
        return !!response.data?.suppressed;
    } catch (error) {
        // Treat 404 (numeric or string) as "not suppressed"
        const statusStr = error && typeof error.status !== 'undefined' ? String(error.status) : '';
        if (statusStr === '404') {
            return false;
        }
        throw error;
    }
}

async function bounceCheck(domain, token, email) {
    console.log('comm_channels.js > bounceCheck');

    const url = `https://${domain}/api/v1/accounts/self/bounced_communication_channels?pattern=${email}`;

    const axiosConfig = {
        method: 'get',
        url: url,
        headers: {
            'Authorization': `Bearer ${token}`
        }
    };

    try {
        const request = async () => {
            return await axios(axiosConfig);
        }

        const response = await errorCheck(request);
        // console.log('bounceCheck response:', response.data);
        return response.data.length > 1;
    } catch (error) {
        throw error;
    }

    // let bounceURL = `${domain}/api/v1/bounced_communication_channels?pattern=${email}`;

    // // create a try block to catch errors and return false
    // try {
    //     const result = await axios.get(bounceURL, config);

    //     if (result.length > 1) {
    //         return true;
    //     }
    //     return false;
    // } catch (error) {
    //     console.error(error);
    //     return false;
    // }
}

async function checkCommDomain(data) {
    console.log('checking domains...');

    let suppList = [];
    let url = `${REGION[data.region]}domain/${encodeURIComponent(String(data.pattern || '').trim())}`;
    let next = url;
    let retryCounter = 1;

    const axiosConfig = {
        method: 'get',
        url: url,
        headers: {
            'Authorization': `Bearer ${data.token}`,
            'Content-Type': 'application/x-www.form-urlencoded'
        }
    };

    // looping through the list while there is a next_token
    while (next) {
        console.log('searching...');
        console.log('searching next suppression-list page');
        try {
            const request = async () => {
                return await axios(axiosConfig);
            };

            const response = await errorCheck(request);
            if (response.status !== 200) {
                throw new Error(response.status);
            } else {
                retryCounter = 1;
                const responseData = response.data;

                for (let item of responseData.suppressed) {
                    suppList.push(item.email);
                }
                if (!responseData.next_token) {
                    next = false;
                    console.log('end of list');
                } else {
                    next = `${url}?next_token=${encodeURIComponent(responseData.next_token)}`;
                    axiosConfig.url = next;
                }
            }
        } catch (error) {
            if (error.message.includes('ECONNRESET')) {
                throw new Error(error.message);
            } else if (error.status === 502) {
                if (retryCounter > 3) {
                    console.log('Retry has failed more than 4 times. Returning found emails and exiting.');
                    throw new Error('Retry has failed more than 4 times. Returning found emails and exiting.');
                } else {
                    console.log(retryCounter);
                    retryCounter++;
                    console.log('Retrying in 1 minute.');
                    await waitFunc(60000);
                }
            } else {
                console.log('An unexpected error occurred while checking suppression domain:', error?.message || String(error));
                throw error;
            }
        }
    }
    return suppList;
}

async function resetEmail(data) {
    const resetStatus = {
        bounce: { reset: null, status: null, error: null },
        suppression: { reset: null, status: null, error: null }
    };

    try {
        // Preserve original email case for proper matching with external systems
        const normalized = { ...data, email: String(data.email || '').trim() };
        resetStatus.bounce = await bounceReset(normalized);
        console.log('Bounce reset response received', {
            status: resetStatus.bounce?.status,
            reset: resetStatus.bounce?.reset
        });
    } catch (error) {
        resetStatus.bounce = error;
    }

    try {
        const normalized = { ...data, email: String(data.email || '').trim() };
        resetStatus.suppression = await awsReset(normalized);
        console.log('Suppression reset response received', {
            status: resetStatus.suppression?.status,
            reset: resetStatus.suppression?.reset
        });
    } catch (error) {
        throw error;
    }

    // Verification: focus on bounce only (Canvas schedules clears); keep requests low
    // const verify = data?.verify !== false; // default true
    // if (verify) {
    //     const email = String(data.email || '').trim().toLowerCase();
    //     const domain = data.domain;
    //     const token = data.token;

    //     // Only verify when Canvas reported a scheduled reset attempt
    //     if (Number(resetStatus?.bounce?.reset || 0) > 0) {
    //         // Single verification pass with one optional retry
    //         try {
    //             await waitFunc(1500); // give the scheduler a moment
    //             let stillBounced = await bounceCheck(domain, token, email);
    //             if (stillBounced) {
    //                 // One retry attempt then stop
    //                 try { await bounceReset({ domain, token, email }); } catch { }
    //                 await waitFunc(3000);
    //                 await bounceCheck(domain, token, email); // final observation only
    //             }
    //         } catch { /* non-fatal for verification */ }
    //     }
    // }

    return resetStatus;
}

async function bounceReset(data) {
    const url = `https://${data.domain}/api/v1/accounts/self/bounced_communication_channels/reset?pattern=${encodeURIComponent(data.email)}`;

    const axiosConfig = {
        method: 'post',
        url: url,
        headers: {
            'Authorization': `Bearer ${data.token}`
        }
    }

    try {
        const request = async () => {
            return await axios(axiosConfig);
        };
        const response = await errorCheck(request);
        return {
            reset: response.data.scheduled_reset_approximate_count,
            status: response.statusText,
            error: null
        };
    } catch (error) {
        return { reset: null, status: null, error: { status: error.status, message: error.message } };
    }
}

// reset bounce count in bulk by pattern
async function patternBounceReset(data) {
    const url = `https://${data.domain}/api/v1/accounts/self/bounced_communication_channels/reset?pattern=*${encodeURIComponent(data.pattern)}`;
    console.log('patternBounceReset URL:', url);

    const axiosConfig = {
        method: 'post',
        url: url,
        headers: {
            'Authorization': `Bearer ${data.token}`
        }
    };

    try {
        const request = async () => {
            return await axios(axiosConfig);
        };
        const response = await errorCheck(request);
        return {
            reset: response.data.scheduled_reset_approximate_count,
            status: response.statusText,
            error: null
        };
    } catch (error) {
        return { reset: null, status: null, error: { status: error.status, message: error.message } };
    }
}

async function awsReset(data) {
    console.log('comm_channels.js > awsReset');

    const region = REGION[data.region];
    const url = `${region}${encodeURIComponent(String(data.email || '').trim())}`;
    const axiosConfig = {
        method: 'delete',
        url: url,
        headers: {
            'Authorization': `Bearer ${data.token}`
        }
    };


    try {
        const request = async () => {
            return await axios(axiosConfig);
        };
        const response = await errorCheck(request);
        return {
            status: response.status,
            reset: 1,
            error: null
        };
    } catch (error) {
        if (error.status === 404) {
            return {
                status: '404',
                reset: 0,
                error: null
            };
        } else if (error.status === 401) {
            return {
                status: '401',
                reset: 0,
                error: null
            };
        } else if (error.status === 422) {
            return {
                status: '422',
                reset: 0,
                error: null
            };
        }
        return { status: null, reset: null, error: { status: error.status, message: error.message } };
    }
}

async function bulkAWSReset(data) {
    console.log('comm_channels.js > bulkAWSReset');
    // [
    //     { "value": "email@example.com" },
    //     {
    //         "value": [
    //             "test@example.com",
    //             "secondaddress@example.com"
    //         ]
    //     }
    // ]


    const region = REGION[data.region];
    const url = `${region}`;
    const axiosConfig = {
        method: 'patch',
        url: url,
        headers: {
            'Authorization': `Bearer ${data.token}`
        },
        data: data.emails

    };
    try {
        const request = async () => {
            return await axios(axiosConfig);
        };
        const response = await errorCheck(request);

        // Return normalized structure whether response.data exists or not
        const message = response.data?.message || response.message || '';
        const removed = response.data?.removed || response.removed || [];
        const not_found = response.data?.not_found || response.not_found || [];
        const not_removed = response.data?.not_removed || response.not_removed || [];

        return {
            message: message,
            status: response.status,
            removed: removed.length || 0,
            not_found: not_found.length || 0,
            not_removed: not_removed.length || 0,
            data: {
                removed: Array.isArray(removed) ? removed : [],
                not_found: Array.isArray(not_found) ? not_found : [],
                not_removed: Array.isArray(not_removed) ? not_removed : []
            }
        };
        // // Return the full response data including specific email arrays
        // if (response.data) {
        //     return {
        //         status: response.status,
        //         removed: response.data.removed?.length || 0,
        //         not_found: response.data.not_found?.length || 0,
        //         not_removed: response.data.not_removed?.length || 0,
        //         data: {
        //             removed: response.data.removed || [],
        //             not_found: response.data.not_found || [],
        //             not_removed: response.data.not_removed || []
        //         }
        //     };
        // }
        // return response;
    } catch (error) {
        if (error.status === 409) {
            return {
                status: error.status,
                removed: error.response?.data?.removed?.length || 0,
                not_found: error.response?.data?.not_found?.length || 0,
                not_removed: error.response?.data?.not_removed?.length || 0,
                data: {
                    removed: error.response?.data?.removed || [],
                    not_found: error.response?.data?.not_found || [],
                    not_removed: error.response?.data?.not_removed || []
                }
            };
        }
        throw error;
        // return { status: null, reset: null, error: { status: error.status, message: error.message } };
    }
}

async function checkUnconfirmedEmails(data) {
    const url = `https://${data.domain}/api/v1/accounts/self/unconfirmed_communication_channels.csv?pattern=*${data.pattern}*`;

    const axiosConfig = {
        method: 'get',
        url: url,
        headers: {
            'Authorization': `Bearer ${data.token}`
        },
        responseType: 'stream'
    };
    try {
        const request = async () => {
            return await axios(axiosConfig);
        };
        const response = await errorCheck(request);
        return response.data;
    } catch (error) {
        throw error
    }
}

async function confirmEmail(data) {
    const url = `https://${data.domain}/api/v1/accounts/self/unconfirmed_communication_channels/confirm?pattern=${encodeURIComponent(data.email)}`;

    const axiosConfig = {
        method: 'post',
        url: url,
        headers: {
            'Authorization': `Bearer ${data.token}`
        }
    };

    try {
        const request = async () => {
            return await axios(axiosConfig);
        };

        const response = await errorCheck(request);
        return { confirmed: response.data.confirmed_count > 0, status: response.statusText };
    } catch (error) {
        throw error
    }
}

module.exports = {
    emailCheck,
    getBouncedData,
    checkCommDomain,
    checkUnconfirmedEmails,
    confirmEmail,
    resetEmail,
    bounceReset,
    awsReset,
    bulkAWSReset,
    bounceCheck,
    awsCheck,
    patternBounceReset
}