// discussions.js - Canvas Discussion Topics API helpers

const axios = require('axios');
const { errorCheck } = require('../utilities');

async function createDiscussion(data) {
    // POST /api/v1/courses/:course_id/discussion_topics
    // Supports standard discussions and announcements (is_announcement)
    const payload = {
        title: data.title,
        message: data.message ?? '',
        published: data.published ?? true,
    };
    if (data.is_announcement === true) payload.is_announcement = true;
    if (typeof data.threaded === 'boolean') {
        payload.discussion_type = data.threaded ? 'threaded' : 'side_comment';
    }
    if (data.delayed_post_at) payload.delayed_post_at = data.delayed_post_at;

    const axiosConfig = {
        method: 'post',
        url: `https://${data.domain}/api/v1/courses/${data.course_id}/discussion_topics`,
        headers: {
            Authorization: `Bearer ${data.token}`,
        },
        data: payload,
    };

    try {
        const request = async () => axios(axiosConfig);
        const response = await errorCheck(request);
        return response.data;
    } catch (error) {
        throw error;
    }
}

module.exports = { createDiscussion };

// Delete a discussion topic by id
async function deleteDiscussion(data) {
    // DELETE /api/v1/courses/:course_id/discussion_topics/:topic_id
    const axiosConfig = {
        method: 'delete',
        url: `https://${data.domain}/api/v1/courses/${data.course_id}/discussion_topics/${data.discussion_id}`,
        headers: {
            Authorization: `Bearer ${data.token}`,
        },
    };

    try {
        const request = async () => axios(axiosConfig);
        const response = await errorCheck(request);
        return response.data?.id ?? data.discussion_id;
    } catch (error) {
        throw error;
    }
}

module.exports.deleteDiscussion = deleteDiscussion;
