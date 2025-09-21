// conversations.js
const pagination = require('../pagination');
const csvExporter = require('../csvExporter');
//const questionAsker = require('./questionAsker');
const { deleteRequester, errorCheck } = require('../utilities');

const axios = require('axios');

async function getConversations(user, url, scope, token) {
    console.log('Getting conversations: ');

    let pageCounter = 1;
    const myConversations = [];
    let nextPage = `${url}&scope=${scope}`;
    console.log('My next page ', nextPage);


    // if (url === 'conversations') {
    //     myURL = `${url}?scope=${scope}&as_user_id=${user}&per_page=100`;
    // } else {
    //     myURL = url;
    // }
    // try {
    //     const response = await axios.get(nextPage, {
    //         headers: {
    //             'Content-Type': 'application/json',
    //             'Authorization': `Bearer ${token}`
    //         }
    //     });
    //     for (let message of response.data) {
    //         myConversations.push(message);
    //     }


    while (nextPage) {
        console.log('Page: ', pageCounter);
        try {
            const response = await axios.get(nextPage, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            for (let message of response.data) {
                myConversations.push(message);
            }
            nextPage = pagination.getNextPage(response.headers.get('link'));
            if (nextPage !== false) {
                pageCounter++;
                // myConversations = await getConversations(user, nextPage, null, myConversations, pageCount);
            } else {
                console.log('Last page.');
            }
        } catch (error) {
            console.log('ERROR: ', error);
            return false;
        }
    }

    console.log('Finshished');
    return myConversations;
}

// gets all messages with the specific scope (inbox, sent, etc.) for a single user
async function getConversationsGraphQL(data) {
    console.log('conversations.js > getConversationsGraphQL');

    const domain = data.domain;
    const token = data.token;
    const subject = data.subject;
    const user = data.user_id;
    const signal = data.signal;

    const query = `
            query getMessages($userID: ID!, $nextPage: String) {
                legacyNode(_id: $userID, type: User) {
                    ... on User {
                        id
                        email
                        conversationsConnection(scope: "sent", first: 200, after: $nextPage) {
                            pageInfo {
                                hasNextPage
                                endCursor
                                startCursor
                            }
                            nodes {
                                conversation {
                                    subject
                                    _id
                                    updatedAt
                                    conversationParticipantsConnection {
                                        edges {
                                            node {
                                                userId
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `;

    const variables = {
        "userID": user,
        "nextPage": ""
    };

    const axiosConfig = {
        method: 'post',
        url: `https://${domain}/api/graphql?as_user_id=${user}`,
        headers: {
            'Authorization': `Bearer ${token}`
        },
        signal,
        data: {
            query: query,
            variables: variables
        }
    };

    let sentMessages = [];
    let nextPage = true;
    while (nextPage) {
        try {
            const request = async () => {
                return await axios(axiosConfig);
            };

            const response = await errorCheck(request);
            const data = response.data.data.legacyNode.conversationsConnection;

            sentMessages.push(...data.nodes.map((conversation) => {
                return {
                    subject: conversation.conversation.subject,
                    id: conversation.conversation._id,
                    users: conversation.conversation.conversationParticipantsConnection.edges.map(edge => edge.node.userId)
                };
            }).filter((message) => {
                return message.subject === subject;
            }));

            if (!data.pageInfo.hasNextPage) {
                nextPage = false;
            } else {
                variables.nextPage = data.pageInfo.endCursor;
            }
        } catch (error) {
            throw error
        }
    }

    // const filteredMessages = sentMessages.filter((message) => {
    //     return (message.subject === subject);
    // });

    // const formattedMesages = filteredMessages.map((message) => {
    //     return { subject: message.node.conversation.subject, id: message.node.conversation._id };
    // });

    return sentMessages;

    // const url = url;
    // const query = query;
    // let response = '';
    // const responseData = [];
    // const headers = {
    //     'Authorization': `Bearer ${token}`,
    //     'Content-Type': 'application/json'
    // };



    // console.log('The Query: ', query);

    // const config = {
    //     method: 'post',
    //     url: url,
    //     headers: headers,
    //     data: JSON.stringify({
    //         query: query,
    //         variables: variables
    //     })
    // };

    // const response = await axios(config);

    // console.log('The graphql data response: ', response.data);

    // responseData.push(...response.data.data.legacyNode.conversationsConnection.edges);
    // console.log('The response data is ', responseData);

    // console.log('The Next Page: ', response.data.data.legacyNode.conversationsConnection.pageInfo.endCursor);
    // const variables = variables;
    // let nextPage = true;


    // while (nextPage) {
    //     const config = {
    //         method: 'post',
    //         url: url,
    //         headers: headers,
    //         data: JSON.stringify({
    //             query: query,
    //             variables: variables
    //         })
    //     };

    //     response = await axios(config);

    //     // console.log('The graphql data response: ', response.data);
    //     // const data = await response.json();
    //     // console.log('The data is : ', data);
    //     responseData.push(...response.data.data.legacyNode.conversationsConnection.edges);
    //     //console.log('The response data is ', responseData);

    //     if (response.data.data.legacyNode.conversationsConnection.pageInfo.hasNextPage === true) {
    //         variables.nextPage = response.data.data.legacyNode.conversationsConnection.pageInfo.endCursor;
    //         console.log('The variables are: ', variables);
    //         //console.log('The next page is ', variables.nextPage);
    //     } else {
    //         nextPage = false;
    //     }
    // }



    // console.log('Total filtered messages ', formattedMesages.length);

    //console.log('The completed response data is: ', response);

    // return responseData;



}

async function deleteForAll(data) {
    console.log('conversations.js > deleteForAll');

    const domain = data.domain;
    const token = data.token;
    const messageID = data.message;

    const axiosConfig = {
        method: 'delete',
        url: `https://${domain}/api/v1/conversations/${messageID}/delete_for_all`,
        headers: {
            'Authorization': `Bearer ${token}`
        }
    };

    try {
        const request = async () => {
            return await axios(axiosConfig);
        }

        const response = await errorCheck(request);
        return `${response.status} - ${response.statusText}`;
    } catch (error) {
        throw error
    }
    // console.log('Deleting Conversation....');


    // let myURL = `conversations/${conversationID}/delete_for_all`;
    // await axios.delete(myURL);
}

async function bulkDelete(userID, messageFilter) {
    let allConversations = [];

    // getting all messages in the inbox and sent
    allConversations.push(await getConversations(userID, 'conversations', 'inbox'));
    allConversations.push(await getConversations(userID, 'conversations', 'sent'));
    allConversations = allConversations.flat();

    console.log('done getting converations. Total: ', allConversations.length);
    let myFilter = messageFilter;
    let filteredConversations = [];
    let more = '';


    // continue looping for any exta messages that need to be deleted
    while (true) {
        console.log('filtering converations by ', myFilter);
        let counter = 0;
        filteredConversations = allConversations.filter((conversation) => {
            if (counter % 100 === 0)
                console.log('Done with ', counter);
            // console.log('looking at: ', conversation.id, conversation.subject);
            if (conversation.subject === myFilter) {
                console.log('conversation found', conversation.id)
                return conversation;
            }
            counter++;
        });
        let areYouSure = await questionAsker.questionDetails(`Found ${filteredConversations.length} are you sure you want to delete them?(y/n) `);
        if (areYouSure === 'n') {
            more = await questionAsker.questionDetails('Want to try another filter string?(y/n) ');
            if (more === 'y') {
                myFilter = await questionAsker.questionDetails('What filter do you want to use?');
                continue;
            } else
                break;
        }
        csvExporter.exportToCSV(filteredConversations, `${myFilter}`);

        // let loops = Math.floor(filteredConversations.length / 40);
        // let requests = [];
        // let index = 0;


        // ******************************
        // deleteRequester(filtersConversations, 'conversations)
        // *******************************
        await deleteRequester(filteredConversations, 'conversations', 'delete_for_all');

        // adding requests to an array to process in parallel
        // while (loops > 0) {
        //     console.log('Inside while');
        //     for (let i = 0; i < 40; i++) {
        //         console.log('adding reqeusts to promise');
        //         try {
        //             requests.push(deleteForAll(filteredConversations[index].id));
        //         } catch (error) {
        //             console.log(`Error adding ${url}`, error.message);
        //         }
        //         index++;
        //     }
        //     try {
        //         await Promise.all(requests);
        //     } catch (error) {
        //         console.log('There was an error', error.message, error.url);
        //         return;
        //     }
        //     console.log('Processed requests');
        //     await (function wait() {
        //         return new Promise(resolve => {
        //             setTimeout(() => {
        //                 resolve();
        //             }, 2000);
        //         })
        //     })();
        //     requests = [];
        //     loops--;
        // }
        // for (let i = 0; i < filteredConversations.length % 40; i++) {
        //     console.log('adding reqeusts to promise');
        //     try {
        //         requests.push(deleteForAll(filteredConversations[index].id));
        //     } catch (error) {
        //         console.log(`error adding ${filteredConversations[index]} to array`);
        //     }
        //     index++;
        // }
        // try {
        //     await Promise.all(requests);
        // } catch (error) {
        //     console.log('There was an error', error.message, error.url);
        //     return;
        // }

        if (filteredConversations.length > 0)
            console.log(`Deleted: ${filteredConversations.length} conversations`);
        more = await questionAsker.questionDetails('Do you have more?(y/n) ');
        if (more === 'y') {
            myFilter = await questionAsker.questionDetails('What filter do you want to use? ');
        } else
            break;
    }

    questionAsker.close();
}

async function bulkDeleteNew(messages, url, token) {
    console.log('Inside bulkDeleteNew');
    console.log('the token is ', token);

    return await deleteRequester(messages, url, 'delete_for_all', token);


    // let allConversations = [];

    // getting all messages in the inbox and sent
    // allConversations.push(await getConversations(userID, 'conversations', 'inbox'));
    // allConversations.push(await getConversations(userID, 'conversations', 'sent'));
    // allConversations = allConversations.flat();

    // console.log('done getting converations. Total: ', allConversations.length);
    // let myFilter = messageFilter;
    // let filteredConversations = [];
    // let more = '';


    // continue looping for any exta messages that need to be deleted
    //while (true) {
    //console.log('filtering converations by ', myFilter);
    //let counter = 0;
    // filteredConversations = allConversations.filter((conversation) => {
    //     if (counter % 100 === 0)
    //         console.log('Done with ', counter);
    //     // console.log('looking at: ', conversation.id, conversation.subject);
    //     if (conversation.subject === myFilter) {
    //         console.log('conversation found', conversation.id)
    //         return conversation;
    //     }
    //     counter++;
    // });
    // let areYouSure = await questionAsker.questionDetails(`Found ${filteredConversations.length} are you sure you want to delete them?(y/n) `);
    // if (areYouSure === 'n') {
    //     more = await questionAsker.questionDetails('Want to try another filter string?(y/n) ');
    //     if (more === 'y') {
    //         myFilter = await questionAsker.questionDetails('What filter do you want to use?');
    //         continue;
    //     } else
    //         break;
    // }
    //csvExporter.exportToCSV(filteredConversations, `${myFilter}`);

    // let loops = Math.floor(filteredConversations.length / 40);
    // let requests = [];
    // let index = 0;


    // ******************************
    // deleteRequester(filtersConversations, 'conversations)
    // *******************************
    //await deleteRequester(filteredConversations, 'conversations', 'delete_for_all');

    // adding requests to an array to process in parallel
    // while (loops > 0) {
    //     console.log('Inside while');
    //     for (let i = 0; i < 40; i++) {
    //         console.log('adding reqeusts to promise');
    //         try {
    //             requests.push(deleteForAll(filteredConversations[index].id));
    //         } catch (error) {
    //             console.log(`Error adding ${url}`, error.message);
    //         }
    //         index++;
    //     }
    //     try {
    //         await Promise.all(requests);
    //     } catch (error) {
    //         console.log('There was an error', error.message, error.url);
    //         return;
    //     }
    //     console.log('Processed requests');
    //     await (function wait() {
    //         return new Promise(resolve => {
    //             setTimeout(() => {
    //                 resolve();
    //             }, 2000);
    //         })
    //     })();
    //     requests = [];
    //     loops--;
    // }
    // for (let i = 0; i < filteredConversations.length % 40; i++) {
    //     console.log('adding reqeusts to promise');
    //     try {
    //         requests.push(deleteForAll(filteredConversations[index].id));
    //     } catch (error) {
    //         console.log(`error adding ${filteredConversations[index]} to array`);
    //     }
    //     index++;
    // }
    // try {
    //     await Promise.all(requests);
    // } catch (error) {
    //     console.log('There was an error', error.message, error.url);
    //     return;
    // }

    //     if (filteredConversations.length > 0)
    //         console.log(`Deleted: ${filteredConversations.length} conversations`);
    //     more = await questionAsker.questionDetails('Do you have more?(y/n) ');
    //     if (more === 'y') {
    //         myFilter = await questionAsker.questionDetails('What filter do you want to use? ');
    //     } else
    //         break;
    // }

    // questionAsker.close();
}


// (async () => {
//     // let theConversations = await getConversations(26);
//     // console.log('My user had this many', theConversations.length);

//     //await deleteForAll(1466);

//     let curDomain = await questionAsker.questionDetails('What Domain: ');
//     let user = await questionAsker.questionDetails('What user: ');
//     let filter = await questionAsker.questionDetails('What subject: ');

//     axios.defaults.baseURL = `https://${curDomain}/api/v1`;
//     await bulkDelete(user, filter)
//     console.log('finished');
//     questionAsker.close();
// })();




// Fetch deleted conversations for a user with optional deleted_before/after and pagination
// Enhancements:
// - If a 504 Gateway Timeout occurs for a wide date range, automatically split the range
//   into smaller segments (monthly first, then binary split) and retry until the entire
//   range is covered or the window reaches a minimum size.
async function getDeletedConversations(data) {
    const { domain, token, user_id, signal } = data;
    const deleted_before = data.deleted_before;
    const deleted_after = data.deleted_after;
    if (deleted_after || deleted_before) {
        console.log(`[GDC] Request for user ${user_id} with bounds: after=${deleted_after || 'none'} before=${deleted_before || 'none'}`);
    } else {
        console.log(`[GDC] Request for user ${user_id} without date bounds`);
    }
    const baseUrl = `https://${domain}/api/v1/conversations/deleted`;

    // Helper to build a URL for a specific sub-range
    function buildUrl(rangeAfter, rangeBefore) {
        const params = new URLSearchParams();
        params.append('user_id[]', user_id);
        if (rangeBefore) params.append('deleted_before', rangeBefore);
        if (rangeAfter) params.append('deleted_after', rangeAfter);
        params.append('per_page', '100');
        return `${baseUrl}?${params.toString()}`;
    }

    // Core fetch with pagination for a specific sub-range
    async function fetchRange(rangeAfter, rangeBefore) {
        let url = buildUrl(rangeAfter, rangeBefore);
        const out = [];
        while (url) {
            const response = await axios.get(url, {
                headers: { 'Authorization': `Bearer ${token}` },
                signal
            });
            if (Array.isArray(response.data)) out.push(...response.data);
            const next = response.headers && response.headers.link ? pagination.getNextPage(response.headers.link) : false;
            url = next || false;
        }
        return out;
    }

    const is504 = (err) => !!(err && err.response && err.response.status === 504);

    // Recursively split the time window on 504s
    async function fetchWithSplit(rangeAfter, rangeBefore, depth = 0) {
        try {
            return await fetchRange(rangeAfter, rangeBefore);
        } catch (err) {
            // Respect aborts
            if (signal && signal.aborted) {
                const e = new Error('Aborted');
                e.name = 'AbortError';
                throw e;
            }
            // Surface Canvas error message if available (non-504)
            if (!is504(err)) {
                if (err?.response?.data?.errors) {
                    const msg = err.response.data.errors.map(e => e.message).join('; ');
                    throw new Error(msg);
                }
                throw err;
            }

            // 504 handling only makes sense if we have both bounds
            if (!rangeAfter || !rangeBefore) {
                // Re-throw if we cannot split (missing bounds)
                console.warn(`[GDC] 504 received but cannot split due to missing bounds. after=${rangeAfter || 'none'} before=${rangeBefore || 'none'}`);
                throw err;
            }

            // Parse and compute midpoint
            const start = new Date(rangeAfter);
            const end = new Date(rangeBefore);
            if (!(start instanceof Date && !isNaN(start)) || !(end instanceof Date && !isNaN(end))) {
                throw err;
            }
            const spanMs = end.getTime() - start.getTime();
            if (spanMs <= 0) {
                // Degenerate window; nothing to fetch
                return [];
            }

            // Minimum window size before giving up further splits
            const MIN_WINDOW_MS = 60 * 60 * 1000; // 1 hour
            if (spanMs <= MIN_WINDOW_MS) {
                // Last-ditch retry once after a short backoff
                console.warn(`[GDC] Min window reached (<=1h) at depth ${depth}. Retrying once: ${start.toISOString()} -> ${end.toISOString()}`);
                await new Promise(r => setTimeout(r, 1500));
                return await fetchRange(rangeAfter, rangeBefore);
            }

            // Binary split
            const mid = new Date(start.getTime() + Math.floor(spanMs / 2));
            const leftAfter = rangeAfter;
            const leftBefore = mid.toISOString();
            const rightAfter = new Date(mid.getTime() + 1).toISOString();
            const rightBefore = rangeBefore;

            console.warn(`[GDC] 504 on range ${start.toISOString()} -> ${end.toISOString()} (span ${(spanMs / 86400000).toFixed(2)} days). Splitting at ${mid.toISOString()} (depth ${depth}).`);

            const left = await fetchWithSplit(leftAfter, leftBefore, depth + 1);
            const right = await fetchWithSplit(rightAfter, rightBefore, depth + 1);
            return [...left, ...right];
        }
    }

    // Generate monthly segments for large ranges to reduce 504 risk up-front
    function monthSegments(rangeAfter, rangeBefore) {
        const segments = [];
        const start = new Date(rangeAfter);
        const end = new Date(rangeBefore);
        if (isNaN(start) || isNaN(end) || end <= start) return segments;

        let cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 0, 0, 0));
        // Ensure cur >= start
        if (cur < start) cur = new Date(start);
        while (cur < end) {
            const nextMonth = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + 1, 1, 0, 0, 0));
            const segStart = cur.toISOString();
            const segEnd = (nextMonth < end ? new Date(nextMonth.getTime() - 1) : end).toISOString();
            segments.push([segStart, segEnd]);
            cur = nextMonth;
        }
        return segments;
    }

    // If no date filters are provided, just do the plain paginated fetch
    if (!deleted_after && !deleted_before) {
        return await fetchWithSplit(undefined, undefined);
    }

    // If only one bound is provided, attempt the plain fetch and bubble errors
    if (!deleted_after || !deleted_before) {
        try {
            return await fetchWithSplit(deleted_after, deleted_before);
        } catch (err) {
            if (err?.response?.data?.errors) {
                const msg = err.response.data.errors.map(e => e.message).join('; ');
                throw new Error(msg);
            }
            throw err;
        }
    }

    // Both bounds provided: split into months first, then recursively split on 504s
    const start = new Date(deleted_after);
    const end = new Date(deleted_before);
    const spanDays = Math.ceil((end - start) / (24 * 60 * 60 * 1000));

    let rawResults = [];
    if (!isNaN(start) && !isNaN(end) && spanDays > 31) {
        const segments = monthSegments(deleted_after, deleted_before);
        console.log(`[GDC] Using monthly pre-split across ${segments.length} segment(s) for ${start.toISOString()} -> ${end.toISOString()}`);
        let segIdx = 0;
        for (const [segAfter, segBefore] of segments) {
            segIdx++;
            console.log(`[GDC] Segment ${segIdx}/${segments.length}: ${segAfter} -> ${segBefore}`);
            const segResults = await fetchWithSplit(segAfter, segBefore);
            rawResults.push(...segResults);
        }
    } else {
        rawResults = await fetchWithSplit(deleted_after, deleted_before);
    }

    // Deduplicate by message id if present
    const seen = new Set();
    const deduped = [];
    for (const item of rawResults) {
        const key = item && (item.id || item.message_id) ? String(item.id || item.message_id) : JSON.stringify(item);
        if (!seen.has(key)) {
            seen.add(key);
            deduped.push(item);
        }
    }
    if (deleted_after || deleted_before) {
        console.log(`[GDC] Completed fetch for user ${user_id}. Raw=${rawResults.length}, Deduped=${deduped.length}`);
    }
    return deduped;
}

// Restore a deleted conversation message for a user using the documented endpoint
async function restoreConversation({ domain, token, user_id, message_id, conversation_id }) {
    const url = `https://${domain}/api/v1/conversations/restore`;
    const headers = { 'Authorization': `Bearer ${token}` };
    const toInt = (v) => {
        const n = parseInt(v, 10);
        return Number.isFinite(n) ? n : v;
    };
    const body = {
        user_id: toInt(user_id),
        message_id: toInt(message_id),
        conversation_id: toInt(conversation_id)
    };

    try {
        const response = await axios({ method: 'put', url, headers, data: body });
        return response.data;
    } catch (err) {
        const status = err?.response?.status;
        if (err?.response?.data?.errors) {
            const msg = err.response.data.errors.map(e => e.message).join('; ');
            const e = new Error(`${msg} (${url})`);
            e.status = status;
            throw e;
        }
        const e = new Error(`${err?.message || 'Request failed'} (${url})`);
        e.status = status;
        throw e;
    }
}


module.exports = {
    getConversations, getConversationsGraphQL, bulkDelete, bulkDeleteNew, deleteForAll, getDeletedConversations, restoreConversation
};