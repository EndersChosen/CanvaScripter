/**
 * IPC Handlers for search and lookup operations
 * @module ipc/searchHandlers
 */

const { searchUsers } = require('../../shared/canvas-api/users');
const { searchAccounts } = require('../../shared/canvas-api/accounts');
const { searchTerms } = require('../../shared/canvas-api/terms');
const { searchCourses } = require('../../shared/canvas-api/courses');
const sections = require('../../shared/canvas-api/sections');
const { searchUserLogins } = require('../../shared/canvas-api/logins');
const { searchEnrollments, searchEnrollmentsByUser } = require('../../shared/canvas-api/sis_imports');

/**
 * Helper function to normalize quotes (convert curly/smart quotes to straight quotes)
 */
function normalizeQuotes(text) {
    if (!text) return text;
    return text
        .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')  // curly double quotes
        .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'"); // curly single quotes
}

/**
 * Helper function to split name while respecting quoted sections
 */
function splitNameWithQuotes(fullName) {
    const name = normalizeQuotes((fullName || '').trim());
    if (!name) return { firstName: '', lastName: '' };

    // Find all quoted sections
    const quotedSections = [];
    const quoteRegex = /"[^"]*"/g;
    let match;
    while ((match = quoteRegex.exec(name)) !== null) {
        quotedSections.push({
            start: match.index,
            end: match.index + match[0].length,
            text: match[0]
        });
    }

    // If no quotes, use simple split
    if (quotedSections.length === 0) {
        const parts = name.split(/\s+/);
        return {
            firstName: parts[0] || '',
            lastName: parts.slice(1).join(' ') || ''
        };
    }

    // Replace quoted sections with placeholders to split safely
    let safeName = name;
    const placeholders = [];
    quotedSections.reverse().forEach((section, index) => {
        const placeholder = `__QUOTE_${index}__`;
        placeholders.push({ placeholder, text: section.text });
        safeName = safeName.substring(0, section.start) + placeholder + safeName.substring(section.end);
    });

    // Split on whitespace
    const parts = safeName.split(/\s+/);

    // Restore quoted sections
    const restoredParts = parts.map(part => {
        const placeholderMatch = placeholders.find(p => part.includes(p.placeholder));
        if (placeholderMatch) {
            return part.replace(placeholderMatch.placeholder, placeholderMatch.text);
        }
        return part;
    });

    return {
        firstName: restoredParts[0] || '',
        lastName: restoredParts.slice(1).join(' ') || ''
    };
}

/**
 * Register all search-related IPC handlers
 * @param {Electron.IpcMain} ipcMain - The Electron IPC main instance
 * @param {Function} logDebug - Debug logging function
 */
function registerSearchHandlers(ipcMain, logDebug) {
    // Users Search
    ipcMain.handle('users:search', async (event, domain, token, searchTerm) => {
        logDebug('[users:search] Searching users', { domain, searchTerm });
        try {
            const axios = require('axios');
            axios.defaults.baseURL = `https://${domain}/api/v1`;
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            const users = await searchUsers(searchTerm, ['email']);
            logDebug('[users:search] Raw Canvas users', { count: users.length });

            // Transform Canvas user data to SIS CSV format
            const sisUsers = users.map(user => {
                const { firstName, lastName } = splitNameWithQuotes(user.name);

                return {
                    user_id: user.sis_user_id || '',
                    login_id: user.login_id || '',
                    first_name: firstName,
                    last_name: lastName,
                    full_name: normalizeQuotes(user.name || ''),
                    sortable_name: normalizeQuotes(user.sortable_name || ''),
                    short_name: normalizeQuotes(user.short_name || ''),
                    email: user.email || '',
                    status: 'active'
                };
            });

            logDebug('[users:search] Transformed SIS users', { count: sisUsers.length });
            return { success: true, data: sisUsers };
        } catch (error) {
            logDebug('[users:search] Error', { error: error.message });
            return { success: false, error: error.message };
        }
    });

    // Accounts Search
    ipcMain.handle('accounts:search', async (event, domain, token, searchTerm) => {
        logDebug('[accounts:search] Searching accounts', { domain, searchTerm });
        try {
            const axios = require('axios');
            axios.defaults.baseURL = `https://${domain}/api/v1`;
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            const accounts = await searchAccounts(searchTerm);

            // Accounts are already in the correct SIS CSV format from searchAccounts
            return { success: true, data: accounts };
        } catch (error) {
            logDebug('[accounts:search] Error', { error: error.message });
            return { success: false, error: error.message };
        }
    });

    // Courses Search
    ipcMain.handle('courses:search', async (event, domain, token, searchTerm) => {
        logDebug('[courses:search] Searching courses', { domain, searchTerm });
        try {
            const axios = require('axios');
            axios.defaults.baseURL = `https://${domain}/api/v1`;
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            const courses = await searchCourses(searchTerm);

            // Courses are already in the correct SIS CSV format from searchCourses
            return { success: true, data: courses };
        } catch (error) {
            logDebug('[courses:search] Error', { error: error.message });
            return { success: false, error: error.message };
        }
    });

    // Terms Search
    ipcMain.handle('terms:search', async (event, domain, token, searchTerm) => {
        logDebug('[terms:search] Searching terms', { domain, searchTerm });
        try {
            const axios = require('axios');
            axios.defaults.baseURL = `https://${domain}/api/v1`;
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            const terms = await searchTerms(searchTerm);

            // Transform Canvas term data to SIS CSV format
            const sisTerms = terms.map(term => ({
                term_id: term.sis_term_id || '',
                name: term.name || '',
                status: 'active',
                start_date: term.start_at || '',
                end_date: term.end_at || ''
            }));

            return { success: true, data: sisTerms };
        } catch (error) {
            logDebug('[terms:search] Error', { error: error.message });
            return { success: false, error: error.message };
        }
    });

    // Sections Search
    ipcMain.handle('sections:search', async (event, domain, token, searchTerm) => {
        logDebug('[sections:search] Searching sections', { domain, searchTerm });
        try {
            const result = await sections.searchSection(domain, token, searchTerm);
            return result;
        } catch (error) {
            logDebug('[sections:search] Error', { error: error.message });
            return { success: false, error: error.message };
        }
    });

    // Logins Search
    ipcMain.handle('logins:search', async (event, domain, token, userId, idType) => {
        logDebug('[logins:search] Searching user logins', { domain, userId, idType });
        try {
            const logins = await searchUserLogins(domain, token, userId, idType);
            return { success: true, data: logins };
        } catch (error) {
            logDebug('[logins:search] Error', { error: error.message });
            return { success: false, error: error.message };
        }
    });

    // Enrollments Search
    ipcMain.handle('enrollments:search', async (event, domain, token, searchType, id) => {
        logDebug('[enrollments:search] Searching enrollments', { domain, searchType, id });
        try {
            const axios = require('axios');
            axios.defaults.baseURL = `https://${domain}/api/v1`;
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            let enrollments;

            // Route to the correct search function based on search type
            if (searchType === 'user') {
                // User search fetches ALL enrollment types/states - filtering happens client-side
                enrollments = await searchEnrollmentsByUser(id);
                logDebug('[enrollments:search] Found enrollments for user', { userId: id, count: enrollments.length });
            } else {
                // Course search also fetches ALL enrollment types/states - filtering happens client-side
                enrollments = await searchEnrollments(id);
                logDebug('[enrollments:search] Found enrollments for course', { courseId: id, count: enrollments.length });
            }

            return { success: true, data: enrollments };
        } catch (error) {
            logDebug('[enrollments:search] Error', { error: error.message });
            return { success: false, error: error.message };
        }
    });
}

module.exports = { registerSearchHandlers };
