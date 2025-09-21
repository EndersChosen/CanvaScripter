const fs = require('fs');
const path = require('path');
const axios = require('axios');

// SIS CSV data generators with realistic fake data
const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Lisa', 'Robert', 'Ashley', 'James', 'Emily', 'Christopher', 'Jessica', 'Daniel', 'Amanda', 'Matthew', 'Jennifer', 'Anthony', 'Stephanie', 'Mark', 'Nicole'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
const subjects = ['Math', 'Science', 'English', 'History', 'Art', 'Music', 'PE', 'Spanish', 'French', 'Computer Science', 'Biology', 'Chemistry', 'Physics', 'Literature', 'Psychology'];

function generateRandomId(prefix = '', length = 6) {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = prefix;
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function generateRandomName() {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    return { firstName, lastName };
}

function generateRandomEmail(firstName, lastName, domain = '@school.edu') {
    // Ensure domain starts with @
    const emailDomain = domain.startsWith('@') ? domain : '@' + domain;
    return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${emailDomain}`;
}

function generateDate(daysFromNow = 0) {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().split('T')[0];
}

// CSV Generators
function generateUsersCSV(rowCount, emailDomain = '@school.edu', authProviderId = '', userOptions = {}) {
    const headers = 'user_id,login_id,authentication_provider_id,password,first_name,last_name,short_name,email,status,integration_id';
    const rows = [headers];

    const statuses = ['active', 'suspended', 'deleted'];

    for (let i = 0; i < rowCount; i++) {
        // Use specific values if provided, otherwise generate random ones
        const { firstName, lastName } = generateRandomName();

        const userId = userOptions.specificUserId || generateRandomId('U', 6);
        const loginId = userOptions.specificLoginId || `${firstName.toLowerCase()}${lastName.toLowerCase()}${Math.floor(Math.random() * 100)}`;
        const authProviderIdToUse = userOptions.specificAuthProviderId || authProviderId;
        const password = userOptions.specificPassword || 'temppass123';
        const firstNameToUse = userOptions.specificFirstName || firstName;
        const lastNameToUse = userOptions.specificLastName || lastName;
        const shortName = userOptions.specificShortName || `${firstNameToUse} ${lastNameToUse.charAt(0)}.`;
        const email = userOptions.specificEmail || generateRandomEmail(firstNameToUse, lastNameToUse, emailDomain);
        const status = userOptions.specificStatus || 'active';
        const integrationId = userOptions.specificIntegrationId || '';

        const row = `${userId},${loginId},${authProviderIdToUse},${password},${firstNameToUse},${lastNameToUse},${shortName},${email},${status},${integrationId}`;
        rows.push(row);
    }

    return rows.join('\n');
}

function generateAccountsCSV(rowCount, accountOptions = {}) {
    const headers = 'account_id,parent_account_id,name,status';
    const rows = [headers];

    const departments = ['Humanities', 'Sciences', 'Engineering', 'Business', 'Arts', 'Social Sciences'];

    for (let i = 0; i < rowCount; i++) {
        // Use specific values if provided, otherwise generate random ones
        const accountId = accountOptions.specificAccountId || generateRandomId('A', 4);

        // Use specific parent account ID if provided
        let parentId = '';
        if (accountOptions.specificParentAccountId) {
            parentId = accountOptions.specificParentAccountId;
        } else {
            // Original behavior - first account has no parent, others get random parent IDs
            parentId = i === 0 ? '' : generateRandomId('A', 4);
        }

        const name = accountOptions.specificName || (departments[i % departments.length] + (i > 5 ? ` ${Math.floor(i / 6) + 1}` : ''));
        const status = accountOptions.specificStatus || 'active';

        const row = `${accountId},${parentId},${name},${status}`;
        rows.push(row);
    }

    return rows.join('\n');
}

function generateTermsCSV(rowCount, termOptions = {}) {
    const headers = 'term_id,name,status,start_date,end_date,integration_id';
    const rows = [headers];

    const seasons = ['Fall', 'Spring', 'Summer', 'Winter'];
    const currentYear = new Date().getFullYear();

    for (let i = 0; i < rowCount; i++) {
        // Use specific values if provided, otherwise generate random ones
        const termId = termOptions.specificTermId || generateRandomId('T', 4);
        const season = seasons[i % seasons.length];
        const year = currentYear + Math.floor(i / 4);
        const name = termOptions.specificName || `${season} ${year}`;

        // Generate realistic start and end dates
        let startDate = '';
        let endDate = '';

        if (termOptions.noDates) {
            // Leave dates empty if noDates option is set
            startDate = '';
            endDate = '';
        } else if (termOptions.specificStartDate || termOptions.specificEndDate) {
            // Use specific dates if provided
            startDate = termOptions.specificStartDate || '';
            endDate = termOptions.specificEndDate || '';
        } else {
            // Default behavior - generate based on season
            if (season === 'Fall') {
                startDate = `${year}-08-15 00:00:00`;
                endDate = `${year}-12-15 00:00:00`;
            } else if (season === 'Spring') {
                startDate = `${year}-01-15 00:00:00`;
                endDate = `${year}-05-15 00:00:00`;
            } else if (season === 'Summer') {
                startDate = `${year}-06-01 00:00:00`;
                endDate = `${year}-08-01 00:00:00`;
            }
        }

        const status = termOptions.specificStatus || 'active';
        const integrationId = termOptions.specificIntegrationId || '';
        const row = `${termId},${name},${status},${startDate},${endDate},${integrationId}`;
        rows.push(row);
    }

    return rows.join('\n');
}

function generateCoursesCSV(rowCount, courseOptions = {}) {
    const headers = 'course_id,short_name,long_name,account_id,term_id,status,integration_id,start_date,end_date,course_format,blueprint_course_id,grade_passback_setting,homeroom_course,friendly_name';
    const rows = [headers];

    for (let i = 0; i < rowCount; i++) {
        // Use specific course_id if provided, otherwise generate random one
        const courseId = courseOptions.specificCourseId || generateRandomId('C', 6);

        // Generate or use specific course details
        const subject = subjects[Math.floor(Math.random() * subjects.length)];
        const courseNumber = 100 + Math.floor(Math.random() * 400);
        const shortName = courseOptions.specificShortName || `${subject.replace(/\s+/g, '').toUpperCase()}${courseNumber}`;
        const longName = courseOptions.specificLongName || `${subject} ${courseNumber}: Introduction to ${subject}`;

        // Use specific values or generate defaults
        const accountId = courseOptions.specificAccountId || '';
        const termId = courseOptions.specificTermId || ''
        const status = courseOptions.specificStatus || 'active';
        const integrationId = courseOptions.specificIntegrationId || '';
        const startDate = courseOptions.specificStartDate || '';
        const endDate = courseOptions.specificEndDate || '';
        const courseFormat = courseOptions.specificFormat || '';
        const blueprintId = courseOptions.specificBlueprintId || '';
        const gradePassback = courseOptions.specificGradePassback || '';
        const homeroom = courseOptions.specificHomeroom || '';
        const friendlyName = courseOptions.specificFriendlyName || '';

        const row = `${courseId},${shortName},"${longName}",${accountId},${termId},${status},${integrationId},${startDate},${endDate},${courseFormat},${blueprintId},${gradePassback},${homeroom},${friendlyName}`;
        rows.push(row);
    }

    return rows.join('\n');
}

function generateSectionsCSV(rowCount, sectionOptions = {}) {
    const headers = 'section_id,course_id,name,status,start_date,end_date,integration_id';
    const rows = [headers];

    for (let i = 0; i < rowCount; i++) {
        // Use specific values if provided, otherwise generate random ones
        const sectionId = sectionOptions.specificSectionId || generateRandomId('S', 6);
        const courseId = sectionOptions.specificCourseId || generateRandomId('C', 6);
        const sectionNumber = Math.floor(i / 3) + 1;
        const name = sectionOptions.specificName || `Section ${sectionNumber}`;
        const status = sectionOptions.specificStatus || 'active';
        const integrationId = sectionOptions.specificIntegrationId || '';
        const startDate = sectionOptions.specificStartDate || '';
        const endDate = sectionOptions.specificEndDate || '';

        const row = `${sectionId},${courseId},${name},${status},${startDate},${endDate},${integrationId}`;
        rows.push(row);
    }

    return rows.join('\n');
}

function generateEnrollmentsCSV(rowCount, enrollmentOptions = {}) {
    const headers = 'course_id,user_id,role,section_id,status,user_integration_id,role_id,root_account';
    const rows = [headers];

    const roles = ['student', 'teacher', 'ta', 'observer', 'designer'];

    for (let i = 0; i < rowCount; i++) {
        // Use specific values if provided, otherwise generate random ones
        const courseId = enrollmentOptions.specificCourseId || generateRandomId('C', 6);
        const userId = enrollmentOptions.specificUserId || generateRandomId('U', 6);
        const role = enrollmentOptions.specificRole || roles[Math.floor(Math.random() * roles.length)];
        const sectionId = enrollmentOptions.specificSectionId || generateRandomId('S', 6);
        const status = enrollmentOptions.specificStatus || 'active';
        const userIntegrationId = enrollmentOptions.specificUserIntegrationId || '';
        const roleId = enrollmentOptions.specificRoleId || '';
        const rootAccount = enrollmentOptions.specificRootAccount || '';

        const row = `${courseId},${userId},${role},${sectionId},${status},${userIntegrationId},${roleId},${rootAccount}`;
        rows.push(row);
    }

    return rows.join('\n');
}

function generateGroupCategoriesCSV(rowCount, groupCategoryOptions = {}) {
    const headers = 'group_category_id,account_id,course_id,category_name,status';
    const rows = [headers];

    const categoryNames = ['Project Groups', 'Study Groups', 'Lab Groups', 'Discussion Groups', 'Presentation Groups'];

    for (let i = 0; i < rowCount; i++) {
        const categoryId = generateRandomId('GC', 4);

        // Use specific account_id and course_id if provided
        let accountId = '';
        let courseId = '';

        if (groupCategoryOptions.specificAccountId && groupCategoryOptions.specificAccountId.trim() !== '') {
            accountId = groupCategoryOptions.specificAccountId.trim();
            courseId = ''; // When account_id is specified, course_id is typically empty
        } else if (groupCategoryOptions.specificCourseId && groupCategoryOptions.specificCourseId.trim() !== '') {
            accountId = '';
            courseId = groupCategoryOptions.specificCourseId.trim();
        } else {
            // Default behavior - randomly choose account or course
            accountId = Math.random() > 0.5 ? generateRandomId('A', 4) : '';
            courseId = accountId === '' ? generateRandomId('C', 6) : '';
        }

        const categoryName = categoryNames[i % categoryNames.length];

        // Use specific status if provided
        const status = groupCategoryOptions.specificStatus || 'active';

        const row = `${categoryId},${accountId},${courseId},${categoryName},${status}`;
        rows.push(row);
    }

    return rows.join('\n');
}

function generateGroupsCSV(rowCount, groupOptions = {}) {
    const headers = 'group_id,account_id,name,status';
    const rows = [headers];

    for (let i = 0; i < rowCount; i++) {
        const groupId = generateRandomId('G', 6);

        // Use specific account_id if provided
        const accountId = groupOptions.specificAccountId || generateRandomId('A', 4);
        const groupNumber = i + 1;
        const name = `Group ${groupNumber}`;

        // Use specific status if provided
        const status = groupOptions.specificStatus || 'available';

        const row = `${groupId},${accountId},${name},${status}`;
        rows.push(row);
    }

    return rows.join('\n');
}

function generateAdminsCSV(rowCount, emailDomain = '@school.edu', adminOptions = {}) {
    const headers = 'user_id,account_id,role,status';
    const rows = [headers];

    const adminRoles = ['AccountAdmin', 'CustomAdmin', 'SubAccountAdmin'];

    for (let i = 0; i < rowCount; i++) {
        // Use specific user_id if provided
        const userId = adminOptions.specificUserId || generateRandomId('U', 6);

        // Use specific account_id if provided
        const accountId = adminOptions.specificAccountId || generateRandomId('A', 4);

        // Use specific role if provided
        const role = adminOptions.specificRole || adminRoles[i % adminRoles.length];

        // Use specific status if provided
        const status = adminOptions.specificStatus || 'active';

        const row = `${userId},${accountId},${role},${status}`;
        rows.push(row);
    }

    return rows.join('\n');
}

function generateGroupMembershipsCSV(rowCount, groupMembershipOptions = {}) {
    const headers = 'group_id,user_id,status';
    const rows = [headers];

    const statuses = ['accepted', 'pending', 'deleted'];

    for (let i = 0; i < rowCount; i++) {
        // Use specific group_id if provided
        const groupId = groupMembershipOptions.specificGroupId || generateRandomId('G', 6);

        // Use specific user_id if provided
        const userId = groupMembershipOptions.specificUserId || generateRandomId('U', 6);

        // Use specific status if provided
        let status = '';
        if (groupMembershipOptions.specificStatus) {
            status = groupMembershipOptions.specificStatus;
        } else {
            // Default behavior - avoid 'deleted' most of the time
            status = statuses[Math.floor(Math.random() * (statuses.length - 1))];
        }

        const row = `${groupId},${userId},${status}`;
        rows.push(row);
    }

    return rows.join('\n');
}

function generateDifferentiationTagSetsCSV(rowCount, differentiationTagSetOptions = {}) {
    const headers = 'tag_set_id,course_id,set_name,status';
    const rows = [headers];

    const setNames = ['Skill Level Tags', 'Learning Style Tags', 'Assessment Tags', 'Accommodation Tags', 'Intervention Tags'];

    for (let i = 0; i < rowCount; i++) {
        const tagSetId = generateRandomId('TS', 4);
        const courseId = differentiationTagSetOptions.specificCourseId || generateRandomId('C', 6);
        const setName = setNames[i % setNames.length] + (i >= setNames.length ? ` ${Math.floor(i / setNames.length) + 1}` : '');
        const status = differentiationTagSetOptions.specificStatus || 'active';

        const row = `${tagSetId},${courseId},${setName},${status}`;
        rows.push(row);
    }

    return rows.join('\n');
}

function generateDifferentiationTagsCSV(rowCount, differentiationTagOptions = {}) {
    const headers = 'tag_id,tag_set_id,course_id,name,status';
    const rows = [headers];

    const tagNames = ['Beginner', 'Intermediate', 'Advanced', 'Visual Learner', 'Auditory Learner', 'Kinesthetic', 'Extended Time', 'Large Print', 'Audio Support'];

    for (let i = 0; i < rowCount; i++) {
        const tagId = generateRandomId('T', 4);
        const tagSetId = Math.random() > 0.3 ? generateRandomId('TS', 4) : ''; // 70% have tag_set_id
        const courseId = differentiationTagOptions.specificCourseId || (tagSetId === '' ? generateRandomId('C', 6) : ''); // Use course_id when no tag_set_id
        const name = tagNames[i % tagNames.length] + (i >= tagNames.length ? ` ${Math.floor(i / tagNames.length) + 1}` : '');
        const status = differentiationTagOptions.specificStatus || 'available';

        const row = `${tagId},${tagSetId},${courseId},${name},${status}`;
        rows.push(row);
    }

    return rows.join('\n');
}

function generateDifferentiationTagMembershipCSV(rowCount, differentiationTagMembershipOptions = {}) {
    const headers = 'tag_id,user_id,status';
    const rows = [headers];

    const statuses = ['accepted', 'pending', 'deleted'];

    for (let i = 0; i < rowCount; i++) {
        const tagId = generateRandomId('T', 4);
        const userId = differentiationTagMembershipOptions.specificUserId || generateRandomId('U', 6);
        const status = differentiationTagMembershipOptions.specificStatus || statuses[Math.floor(Math.random() * (statuses.length - 1))]; // Avoid 'deleted' most of the time

        const row = `${tagId},${userId},${status}`;
        rows.push(row);
    }

    return rows.join('\n');
}

function generateXlistsCSV(rowCount, crossListingOptions = {}) {
    const headers = 'xlist_course_id,section_id,status';
    const rows = [headers];

    for (let i = 0; i < rowCount; i++) {
        // Use specific course_id if provided (mapped to xlist_course_id)
        const xlistCourseId = crossListingOptions.specificCourseId || generateRandomId('XC', 6);

        // Use specific section_id if provided
        const sectionId = crossListingOptions.specificSectionId || generateRandomId('S', 6);

        // Use specific status if provided
        const status = crossListingOptions.specificStatus || 'active';

        const row = `${xlistCourseId},${sectionId},${status}`;
        rows.push(row);
    }

    return rows.join('\n');
}

function generateUserObserversCSV(rowCount, userObserverOptions = {}) {
    const headers = 'observer_id,student_id,status';
    const rows = [headers];

    for (let i = 0; i < rowCount; i++) {
        // Use specific observer_id if provided
        const observerId = userObserverOptions.specificObserverId || generateRandomId('U', 6);

        // Use specific student_id if provided
        const studentId = userObserverOptions.specificStudentId || generateRandomId('U', 6);

        // Use specific status if provided
        const status = userObserverOptions.specificStatus || 'active';

        const row = `${observerId},${studentId},${status}`;
        rows.push(row);
    }

    return rows.join('\n');
}

function generateLoginsCSV(rowCount, emailDomain = '@school.edu', authProviderId = '', loginOptions = {}) {
    const headers = 'user_id,login_id,authentication_provider_id,password,existing_canvas_user_id,email';
    const rows = [headers];

    for (let i = 0; i < rowCount; i++) {
        const { firstName, lastName } = generateRandomName();

        // Use specific user_id if provided
        const userId = loginOptions.specificUserId || generateRandomId('U', 6);

        const loginId = `${firstName.toLowerCase()}${lastName.toLowerCase()}${Math.floor(Math.random() * 100)}`;
        // Use the provided authProviderId, or generate random one if not provided
        const authProviderToUse = authProviderId || (Math.random() > 0.7 ? generateRandomId('', 2) : '');
        const canvasUserId = 1000 + i; // Sequential Canvas user IDs
        const email = generateRandomEmail(firstName, lastName, emailDomain);

        const row = `${userId},${loginId},${authProviderToUse},temppass123,${canvasUserId},${email}`;
        rows.push(row);
    }

    return rows.join('\n');
}

function generateChangeSisIdCSV(rowCount, changeSisIdOptions = {}) {
    const headers = 'old_id,new_id,old_integration_id,new_integration_id,type';
    const rows = [headers];

    const types = ['user', 'course', 'section', 'term', 'account'];

    for (let i = 0; i < rowCount; i++) {
        // Use specific type if provided
        const type = changeSisIdOptions.specificType || types[i % types.length];
        let prefix = '';

        switch (type) {
            case 'user': prefix = 'U'; break;
            case 'course': prefix = 'C'; break;
            case 'section': prefix = 'S'; break;
            case 'term': prefix = 'T'; break;
            case 'account': prefix = 'A'; break;
        }

        // Use specific old_id and new_id if provided
        const oldId = changeSisIdOptions.specificOldId || generateRandomId(prefix, 6);
        const newId = changeSisIdOptions.specificNewId || generateRandomId(prefix, 6);

        // If specific IDs are provided, use old_id/new_id format, otherwise 50% use old_id/new_id, 50% use integration_ids
        if (changeSisIdOptions.specificOldId || changeSisIdOptions.specificNewId || Math.random() > 0.5) {
            const row = `${oldId},${newId},,,${type}`;
            rows.push(row);
        } else {
            const oldIntegrationId = generateRandomId('INT', 6);
            const newIntegrationId = generateRandomId('INT', 6);
            const row = `,,${oldIntegrationId},${newIntegrationId},${type}`;
            rows.push(row);
        }
    }

    return rows.join('\n');
}

// Export functions
async function createSISImportFile(fileType, rowCount, outputPath, emailDomain = '@school.edu', authProviderId = '', enrollmentOptions = {}, userOptions = {}, accountOptions = {}, termOptions = {}, courseOptions = {}, sectionOptions = {}, groupCategoryOptions = {}, groupOptions = {}, groupMembershipOptions = {}, adminOptions = {}, loginOptions = {}, crossListingOptions = {}, userObserverOptions = {}, changeSisIdOptions = {}, differentiationTagSetOptions = {}, differentiationTagOptions = {}, differentiationTagMembershipOptions = {}) {
    let csvContent = '';

    switch (fileType) {
        case 'users':
            csvContent = generateUsersCSV(rowCount, emailDomain, authProviderId, userOptions);
            break;
        case 'accounts':
            csvContent = generateAccountsCSV(rowCount, accountOptions);
            break;
        case 'terms':
            csvContent = generateTermsCSV(rowCount, termOptions);
            break;
        case 'courses':
            csvContent = generateCoursesCSV(rowCount, courseOptions);
            break;
        case 'sections':
            csvContent = generateSectionsCSV(rowCount, sectionOptions);
            break;
        case 'enrollments':
            csvContent = generateEnrollmentsCSV(rowCount, enrollmentOptions);
            break;
        case 'group_categories':
            csvContent = generateGroupCategoriesCSV(rowCount, groupCategoryOptions);
            break;
        case 'groups':
            csvContent = generateGroupsCSV(rowCount, groupOptions);
            break;
        case 'group_memberships':
            csvContent = generateGroupMembershipsCSV(rowCount, groupMembershipOptions);
            break;
        case 'differentiation_tag_sets':
            csvContent = generateDifferentiationTagSetsCSV(rowCount, differentiationTagSetOptions);
            break;
        case 'differentiation_tags':
            csvContent = generateDifferentiationTagsCSV(rowCount, differentiationTagOptions);
            break;
        case 'differentiation_tag_membership':
            csvContent = generateDifferentiationTagMembershipCSV(rowCount, differentiationTagMembershipOptions);
            break;
        case 'xlists':
            csvContent = generateXlistsCSV(rowCount, crossListingOptions);
            break;
        case 'cross_listings':
            csvContent = generateXlistsCSV(rowCount, crossListingOptions);
            break;
        case 'user_observers':
            csvContent = generateUserObserversCSV(rowCount, userObserverOptions);
            break;
        case 'logins':
            csvContent = generateLoginsCSV(rowCount, emailDomain, authProviderId, loginOptions);
            break;
        case 'change_sis_id':
            csvContent = generateChangeSisIdCSV(rowCount, changeSisIdOptions);
            break;
        case 'admins':
            csvContent = generateAdminsCSV(rowCount, emailDomain, adminOptions);
            break;
        default:
            throw new Error(`Unsupported file type: ${fileType}`);
    }

    const fileName = `${fileType}.csv`;
    const filePath = path.join(outputPath, fileName);

    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, csvContent, 'utf8');
    return filePath;
}

async function createBulkSISImport(fileTypes, rowCounts, outputPath, emailDomain = '@school.edu', authProviderId = '', enrollmentOptions = {}) {
    const createdFiles = [];

    for (let i = 0; i < fileTypes.length; i++) {
        const fileType = fileTypes[i];
        const rowCount = rowCounts[i] || 10; // Default to 10 rows if not specified

        try {
            const filePath = await createSISImportFile(fileType, rowCount, outputPath, emailDomain, authProviderId, enrollmentOptions);
            createdFiles.push(filePath);
        } catch (error) {
            console.error(`Error creating ${fileType}.csv:`, error);
        }
    }

    return createdFiles;
}

// Authentication Provider functions
async function fetchAuthenticationProviders(domain, token, accountId = 1) {
    try {
        // Ensure domain is properly formatted
        const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');

        const response = await axios.get(`https://${cleanDomain}/api/v1/accounts/${accountId}/authentication_providers`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        return response.data.map(provider => ({
            id: provider.id,
            auth_type: provider.auth_type,
            position: provider.position,
            display_name: getProviderDisplayName(provider)
        }));
    } catch (error) {
        console.error('Error fetching authentication providers:', error);
        throw new Error(`Failed to fetch authentication providers: ${error.response?.status} ${error.response?.statusText || error.message}`);
    }
}

function getProviderDisplayName(provider) {
    const typeMap = {
        'canvas': 'Canvas',
        'saml': 'SAML',
        'cas': 'CAS',
        'ldap': 'LDAP',
        'google': 'Google',
        'microsoft': 'Microsoft',
        'facebook': 'Facebook',
        'github': 'GitHub',
        'linkedin': 'LinkedIn',
        'apple': 'Apple',
        'clever': 'Clever',
        'openid_connect': 'OpenID Connect'
    };

    const typeName = typeMap[provider.auth_type] || provider.auth_type.toUpperCase();
    return `${typeName} (ID: ${provider.id})`;
}

module.exports = {
    createSISImportFile,
    createBulkSISImport,
    generateUsersCSV,
    generateAccountsCSV,
    generateTermsCSV,
    generateCoursesCSV,
    generateSectionsCSV,
    generateEnrollmentsCSV,
    generateGroupCategoriesCSV,
    generateGroupsCSV,
    generateGroupMembershipsCSV,
    generateDifferentiationTagSetsCSV,
    generateDifferentiationTagsCSV,
    generateDifferentiationTagMembershipCSV,
    generateXlistsCSV,
    generateUserObserversCSV,
    generateLoginsCSV,
    generateChangeSisIdCSV,
    generateAdminsCSV,
    fetchAuthenticationProviders
};
