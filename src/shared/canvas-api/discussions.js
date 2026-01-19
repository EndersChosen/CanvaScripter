// discussions.js - Canvas Discussion Topics API helpers

const axios = require('axios');
const { errorCheck } = require('../utilities');

async function createDiscussion(data) {
    console.log('discussions.js > createDiscussion');
    // Using GraphQL createDiscussionTopic mutation
    // Supports standard discussions and announcements (isAnnouncement)
    
    // Build GraphQL mutation
    const mutation = `
        mutation CreateDiscussionTopic(
            $contextId: ID!
            $contextType: DiscussionTopicContextType!
            $title: String
            $message: String
            $published: Boolean
            $isAnnouncement: Boolean
            $discussionType: DiscussionTopicDiscussionType
            $specificSections: String
            $locked: Boolean
            $podcastEnabled: Boolean
            $podcastHasStudentPosts: Boolean
            $requireInitialPost: Boolean
            $allowRating: Boolean
            $onlyGradersCanRate: Boolean
            $delayedPostAt: DateTime
            $lockAt: DateTime
        ) {
            createDiscussionTopic(input: {
                contextId: $contextId
                contextType: $contextType
                title: $title
                message: $message
                published: $published
                isAnnouncement: $isAnnouncement
                discussionType: $discussionType
                specificSections: $specificSections
                locked: $locked
                podcastEnabled: $podcastEnabled
                podcastHasStudentPosts: $podcastHasStudentPosts
                requireInitialPost: $requireInitialPost
                allowRating: $allowRating
                onlyGradersCanRate: $onlyGradersCanRate
                delayedPostAt: $delayedPostAt
                lockAt: $lockAt
            }) {
                discussionTopic {
                    _id
                    id
                    title
                    message
                    published
                    isAnnouncement
                    discussionType
                    delayedPostAt
                    lockAt
                }
                errors {
                    message
                    attribute
                }
            }
        }
    `;

    const variables = {
        contextId: String(data.course_id),  // Just the numeric ID as a string
        contextType: 'Course',  // Required: Can be 'Course' or 'Group'
        title: data.title,
        message: data.message ?? '',
        published: data.published ?? true,
        isAnnouncement: data.is_announcement ?? false,
        discussionType: data.threaded === false ? 'side_comment' : 'threaded',  // Default to threaded
        specificSections: 'all',  // Make available to all sections
        locked: false,  // Don't lock the discussion
        podcastEnabled: false,
        podcastHasStudentPosts: false,
        requireInitialPost: data.require_initial_post ?? false,
        allowRating: false,
        onlyGradersCanRate: false,
        delayedPostAt: data.delayed_post_at ?? null,
        lockAt: data.lock_at ?? null
    };

    // console.log('Creating discussion with variables:', JSON.stringify(variables, null, 2));
    // console.log('Input data.delayed_post_at:', data.delayed_post_at);
    // console.log('Input data.lock_at:', data.lock_at);

    const axiosConfig = {
        method: 'post',
        url: `https://${data.domain}/api/graphql`,
        headers: {
            Authorization: `Bearer ${data.token}`,
            'Content-Type': 'application/json',
        },
        data: {
            query: mutation,
            variables: variables
        },
    };

    try {
        const request = async () => axios(axiosConfig);
        const response = await errorCheck(request);
        
        // console.log('GraphQL Response:', JSON.stringify(response.data, null, 2));
        
        // Check for GraphQL errors
        if (response.data.errors) {
            const errorMsg = response.data.errors.map(e => e.message).join(', ');
            console.error('GraphQL Errors:', errorMsg);
            throw new Error(errorMsg);
        }
        
        // Check for mutation-specific errors
        if (response.data.data?.createDiscussionTopic?.errors?.length > 0) {
            const errors = response.data.data.createDiscussionTopic.errors;
            const errorMsg = errors.map(e => `${e.attribute}: ${e.message}`).join(', ');
            console.error('Mutation Errors:', errorMsg);
            throw new Error(errorMsg);
        }
        
        return response.data.data.createDiscussionTopic.discussionTopic;
    } catch (error) {
        console.error('createDiscussion error:', error.message || error);
        throw error;
    }
}


// Fetch announcements from a course using GraphQL
async function getAnnouncements(data) {
    console.log('discussions.js > getAnnouncements');
    const { domain, token, course_id, first = 100, after = null } = data;
    
    const query = `
        query GetAnnouncements($courseId: ID!, $first: Int!, $after: String) {
            course(id: $courseId) {
                discussionsConnection(
                    first: $first
                    after: $after
                    filter: {isAnnouncement: true}
                ) {
                    edges {
                        node {
                            _id
                            id
                            title
                            message
                            postedAt
                            author {
                                name
                            }
                        }
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }
        }
    `;

    const variables = {
        courseId: String(course_id),
        first: first,
        after: after
    };

    const axiosConfig = {
        method: 'post',
        url: `https://${domain}/api/graphql`,
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        data: {
            query: query,
            variables: variables
        },
    };

    try {
        const request = async () => axios(axiosConfig);
        const response = await errorCheck(request);
        
        if (response.data.errors) {
            const errorMsg = response.data.errors.map(e => e.message).join(', ');
            throw new Error(errorMsg);
        }
        
        // Extract nodes from edges and return in the expected format
        const discussionsConnection = response.data.data.course.discussionsConnection;
        const nodes = discussionsConnection.edges.map(edge => edge.node);
        
        return {
            nodes: nodes,
            pageInfo: discussionsConnection.pageInfo
        };
    } catch (error) {
        console.error('getAnnouncements error:', error.message || error);
        throw error;
    }
}

// Delete a discussion topic by id using GraphQL
async function deleteDiscussionTopic(data) {
    console.log('discussions.js > deleteDiscussionTopic - GraphQL');
    // Using GraphQL deleteDiscussionTopic mutation
    const { domain, token, discussion_id } = data;
    
    const mutation = `
        mutation DeleteDiscussionTopic($id: ID!) {
            deleteDiscussionTopic(input: {id: $id}) {
                discussionTopicId
                errors {
                    attribute
                    message
                }
            }
        }
    `;

    const variables = {
        id: String(discussion_id)
    };

    const axiosConfig = {
        method: 'post',
        url: `https://${domain}/api/graphql`,
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        data: {
            query: mutation,
            variables: variables
        },
    };

    try {
        const request = async () => axios(axiosConfig);
        const response = await errorCheck(request);
        
        if (response.data.errors) {
            const errorMsg = response.data.errors.map(e => e.message).join(', ');
            throw new Error(errorMsg);
        }
        
        if (response.data.data?.deleteDiscussionTopic?.errors?.length > 0) {
            const errors = response.data.data.deleteDiscussionTopic.errors;
            const errorMsg = errors.map(e => `${e.attribute}: ${e.message}`).join(', ');
            throw new Error(errorMsg);
        }
        
        return response.data.data.deleteDiscussionTopic.discussionTopicId;
    } catch (error) {
        console.error('deleteDiscussionTopic error:', error.message || error);
        throw error;
    }
}

// Legacy REST API delete (keeping for backwards compatibility)
async function deleteDiscussion(data) {
    console.log('discussions.js > deleteDiscussion - REST API');
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

module.exports = { createDiscussion, deleteDiscussion, getAnnouncements, deleteDiscussionTopic };
