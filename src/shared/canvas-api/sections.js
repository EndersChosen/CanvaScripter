// sections.js - Canvas Sections API helpers

const axios = require('axios');
const { errorCheck } = require('../utilities');

async function createSection(data) {
    // POST /api/v1/courses/:course_id/sections
    const courseSection = {
        name: data.name,
    };

    // Add optional fields if provided
    if (data.start_at) {
        courseSection.start_at = data.start_at;
    }
    if (data.end_at) {
        courseSection.end_at = data.end_at;
    }
    if (data.restrict_enrollments_to_section_dates !== undefined) {
        courseSection.restrict_enrollments_to_section_dates = data.restrict_enrollments_to_section_dates;
    }

    const axiosConfig = {
        method: 'post',
        url: `https://${data.domain}/api/v1/courses/${data.course_id}/sections`,
        headers: {
            Authorization: `Bearer ${data.token}`,
        },
        data: {
            course_section: courseSection,
        },
    };

    try {
        const request = async () => axios(axiosConfig);
        const response = await errorCheck(request);
        return response.data;
    } catch (error) {
        throw error;
    }
}

async function searchSection(domain, token, sectionId) {
    // GET /api/v1/sections/:section_id
    const axiosConfig = {
        method: 'get',
        url: `https://${domain}/api/v1/sections/${sectionId}`,
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };

    try {
        const request = async () => axios(axiosConfig);
        const response = await errorCheck(request);

        const section = response.data;

        // Map REST API response to SIS CSV format
        const mappedSection = {
            section_id: section.sis_section_id || '',
            course_id: section.sis_course_id || '',
            name: section.name || '',
            status: 'active', // Any returned section is active (deleted sections won't return)
            start_date: section.start_at || '',
            end_date: section.end_at || ''
        };

        return {
            success: true,
            data: [mappedSection] // Return as array to match expected format
        };
    } catch (error) {
        console.error('Section search error:', error);
        throw {
            success: false,
            error: error.message || 'Failed to fetch section',
            status: error.response?.status || error.status,
            code: error.code
        };
    }
}

/**
 * Fetch all course sections + enrollments via GraphQL with pagination.
 * Includes rate-limit retry logic for 403/429 responses with exponential backoff.
 * Returns { sections: [...], enrollments: [...] }
 */
async function getCourseSectionsGraphQL(data) {
    const PAGE_SIZE = 100; // Canvas GraphQL supports up to 100 per connection
    const MAX_RETRIES = 5;
    const BASE_DELAY_MS = 1000; // 1s base for exponential backoff
    const BETWEEN_PAGE_DELAY_MS = 250; // Small delay between pagination calls to avoid bursts

    const query = `
    query getCourseSections($courseID: ID!, $sectionFirst: Int = 100, $sectionAfter: String, $enrollmentFirst: Int = 100, $enrollmentAfter: String) {
      course(id: $courseID) {
        sectionsConnection(first: $sectionFirst, after: $sectionAfter) {
          nodes {
            _id
            name
            userCount
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
        enrollmentsConnection(first: $enrollmentFirst, after: $enrollmentAfter, filter: { states: [active, invited, creation_pending] }) {
          nodes {
            _id
            type
            state
            section {
              _id
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }`;

    /**
     * Execute a GraphQL request with automatic retry on 403/429 rate-limit responses.
     * Uses exponential backoff: 1s, 2s, 4s, 8s, 16s.
     * Inspects Retry-After header when available.
     */
    async function graphqlRequestWithRetry(axiosConfig) {
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                const request = async () => axios(axiosConfig);
                const response = await errorCheck(request);
                return response;
            } catch (error) {
                const status = error.status || error.response?.status;
                const isRateLimited = status === 403 || status === 429;

                if (isRateLimited && attempt < MAX_RETRIES) {
                    // Check for Retry-After header (seconds)
                    const retryAfter = error.response?.headers?.['retry-after'];
                    const backoffMs = retryAfter
                        ? parseInt(retryAfter, 10) * 1000
                        : BASE_DELAY_MS * Math.pow(2, attempt);

                    console.log(`GraphQL rate limited (${status}). Retry ${attempt + 1}/${MAX_RETRIES} in ${backoffMs}ms...`);
                    await new Promise(resolve => setTimeout(resolve, backoffMs));
                    continue;
                }

                // Non-retryable error or max retries exhausted
                throw error;
            }
        }
    }

    const allSections = [];
    const allEnrollments = [];

    // Phase 1: Paginate sections
    let sectionCursor = null;
    let hasSectionPage = true;
    let isFirstPage = true;
    while (hasSectionPage) {
        // Small delay between pages to avoid bursting the rate limit
        if (!isFirstPage) {
            await new Promise(resolve => setTimeout(resolve, BETWEEN_PAGE_DELAY_MS));
        }
        isFirstPage = false;

        const variables = {
            courseID: data.course_id,
            sectionFirst: PAGE_SIZE,
            sectionAfter: sectionCursor
        };

        const axiosConfig = {
            method: 'post',
            url: `https://${data.domain}/api/graphql`,
            headers: { Authorization: `Bearer ${data.token}` },
            data: { query, variables }
        };

        const response = await graphqlRequestWithRetry(axiosConfig);
        const courseData = response.data?.data?.course;

        if (!courseData) {
            throw new Error('Course not found or access denied');
        }

        const sConn = courseData.sectionsConnection;
        if (sConn?.nodes) {
            allSections.push(...sConn.nodes);
        }
        hasSectionPage = sConn?.pageInfo?.hasNextPage || false;
        sectionCursor = sConn?.pageInfo?.endCursor || null;
    }

    // Phase 2: Paginate enrollments
    let enrollmentCursor = null;
    let hasEnrollmentPage = true;
    isFirstPage = true;
    while (hasEnrollmentPage) {
        if (!isFirstPage) {
            await new Promise(resolve => setTimeout(resolve, BETWEEN_PAGE_DELAY_MS));
        }
        isFirstPage = false;

        const variables = {
            courseID: data.course_id,
            enrollmentFirst: PAGE_SIZE,
            enrollmentAfter: enrollmentCursor
        };

        const axiosConfig = {
            method: 'post',
            url: `https://${data.domain}/api/graphql`,
            headers: { Authorization: `Bearer ${data.token}` },
            data: { query, variables }
        };

        const response = await graphqlRequestWithRetry(axiosConfig);
        const courseData = response.data?.data?.course;

        const eConn = courseData?.enrollmentsConnection;
        if (eConn?.nodes) {
            allEnrollments.push(...eConn.nodes);
        }
        hasEnrollmentPage = eConn?.pageInfo?.hasNextPage || false;
        enrollmentCursor = eConn?.pageInfo?.endCursor || null;
    }

    return { sections: allSections, enrollments: allEnrollments };
}

/**
 * Delete a single enrollment from a course
 * DELETE /api/v1/courses/:course_id/enrollments/:enrollment_id
 */
async function deleteEnrollment(data) {
    const axiosConfig = {
        method: 'delete',
        url: `https://${data.domain}/api/v1/courses/${data.course_id}/enrollments/${data.enrollment_id}`,
        headers: {
            Authorization: `Bearer ${data.token}`,
        },
        params: {
            task: data.task || 'delete'
        }
    };

    const request = async () => axios(axiosConfig);
    const response = await errorCheck(request);
    return response.data;
}

/**
 * Delete a course section
 * DELETE /api/v1/sections/:section_id
 */
async function deleteSection(data) {
    const axiosConfig = {
        method: 'delete',
        url: `https://${data.domain}/api/v1/sections/${data.section_id}`,
        headers: {
            Authorization: `Bearer ${data.token}`,
        },
    };

    const request = async () => axios(axiosConfig);
    const response = await errorCheck(request);
    return response.data;
}

module.exports = { createSection, searchSection, getCourseSectionsGraphQL, deleteEnrollment, deleteSection };