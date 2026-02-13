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
// Helper function to escape CSV values containing commas, quotes, or newlines
function escapeCSVValue(value) {
    // Convert to string and handle empty values
    const strValue = value == null ? '' : String(value);

    // If value contains comma, quote, or newline, wrap in quotes and escape any quotes inside
    if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n') || strValue.includes('\r')) {
        // Escape double quotes by doubling them
        const escaped = strValue.replace(/"/g, '""');
        return `"${escaped}"`;
    }

    return strValue;
}

function generateUsersCSV(rowCount, emailDomain = '@school.edu', authProviderId = '', userOptions = {}) {
    const headers = 'user_id,login_id,authentication_provider_id,password,ssha_password,first_name,last_name,full_name,sortable_name,short_name,email,status,integration_id,pronouns,declared_user_type,canvas_password_notification,home_account';
    const rows = [headers];

    // If search data is available, use it instead of generating random data
    if (userOptions.searchData && Array.isArray(userOptions.searchData)) {
        console.log('Using search data for users CSV generation');

        userOptions.searchData.forEach(user => {
            // Map from the search API response format to SIS CSV format
            // Ensure ALL columns are included, even if empty
            const userId = escapeCSVValue(user.user_id || '');
            const loginId = escapeCSVValue(user.login_id || '');
            const authProviderIdToUse = escapeCSVValue(user.authentication_provider_id || '');
            const password = escapeCSVValue(user.password || ''); // Leave blank unless specified
            const sshaPassword = escapeCSVValue(user.ssha_password || '');
            const firstName = escapeCSVValue(user.first_name || '');
            const lastName = escapeCSVValue(user.last_name || '');
            const fullName = escapeCSVValue(user.full_name || '');
            const sortableName = escapeCSVValue(user.sortable_name || '');
            const shortName = escapeCSVValue(user.short_name || '');
            const email = escapeCSVValue(user.email || '');
            const status = escapeCSVValue(user.status || 'active');
            const integrationId = escapeCSVValue(user.integration_id || '');
            const pronouns = escapeCSVValue(user.pronouns || '');
            const declaredUserType = escapeCSVValue(user.declared_user_type || '');
            const canvasPasswordNotification = escapeCSVValue(user.canvas_password_notification || '');
            const homeAccount = escapeCSVValue(user.home_account || '');

            const row = `${userId},${loginId},${authProviderIdToUse},${password},${sshaPassword},${firstName},${lastName},${fullName},${sortableName},${shortName},${email},${status},${integrationId},${pronouns},${declaredUserType},${canvasPasswordNotification},${homeAccount}`;
            rows.push(row);
        });

        return rows.join('\n');
    }

    const statuses = ['active', 'suspended', 'deleted'];

    for (let i = 0; i < rowCount; i++) {
        // Helper to get field value (checks file import first, then options, then default)
        const getFieldValue = (fieldName, defaultValue) => {
            if (userOptions.fileImport && userOptions.fileImport.field === fieldName && userOptions.fileImport.values) {
                return userOptions.fileImport.values[i % userOptions.fileImport.values.length];
            }
            return userOptions[fieldName] || userOptions[`specific${fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/_([a-z])/g, (m, p1) => p1.toUpperCase())}`] || defaultValue;
        };

        // Use specific values if provided, otherwise generate random ones
        const { firstName, lastName } = generateRandomName();

        const userId = getFieldValue('user_id', generateRandomId('U', 6));
        const loginId = getFieldValue('login_id', `${firstName.toLowerCase()}${lastName.toLowerCase()}${Math.floor(Math.random() * 100)}`);
        const authProviderIdToUse = getFieldValue('authentication_provider_id', authProviderId);
        const password = getFieldValue('password', 'temppass123');
        const sshaPassword = getFieldValue('ssha_password', '');

        // For first/last name, email - check if explicitly provided, if so use them (even if blank), otherwise generate random
        const firstNameToUse = 'specificFirstName' in userOptions ? userOptions.specificFirstName : firstName;
        const lastNameToUse = 'specificLastName' in userOptions ? userOptions.specificLastName : lastName;
        const fullName = 'specificFullName' in userOptions ? userOptions.specificFullName : `${firstNameToUse} ${lastNameToUse}`;
        const sortableName = 'specificSortableName' in userOptions ? userOptions.specificSortableName : `${lastNameToUse}, ${firstNameToUse}`;
        const shortName = 'specificShortName' in userOptions ? userOptions.specificShortName : `${firstNameToUse} ${lastNameToUse.charAt(0)}.`;
        const email = 'specificEmail' in userOptions ? userOptions.specificEmail : generateRandomEmail(firstNameToUse, lastNameToUse, emailDomain);

        const status = 'specificStatus' in userOptions ? userOptions.specificStatus : 'active';
        const integrationId = 'specificIntegrationId' in userOptions ? userOptions.specificIntegrationId : '';
        const pronouns = 'specificPronouns' in userOptions ? userOptions.specificPronouns : '';
        const declaredUserType = 'specificDeclaredUserType' in userOptions ? userOptions.specificDeclaredUserType : '';
        const canvasPasswordNotification = 'specificCanvasPasswordNotification' in userOptions ? userOptions.specificCanvasPasswordNotification : '';
        const homeAccount = 'specificHomeAccount' in userOptions ? userOptions.specificHomeAccount : '';

        // Escape all values for CSV
        const row = `${escapeCSVValue(userId)},${escapeCSVValue(loginId)},${escapeCSVValue(authProviderIdToUse)},${escapeCSVValue(password)},${escapeCSVValue(sshaPassword)},${escapeCSVValue(firstNameToUse)},${escapeCSVValue(lastNameToUse)},${escapeCSVValue(fullName)},${escapeCSVValue(sortableName)},${escapeCSVValue(shortName)},${escapeCSVValue(email)},${escapeCSVValue(status)},${escapeCSVValue(integrationId)},${escapeCSVValue(pronouns)},${escapeCSVValue(declaredUserType)},${escapeCSVValue(canvasPasswordNotification)},${escapeCSVValue(homeAccount)}`;
        rows.push(row);
    }

    return rows.join('\n');
}

function generateAccountsCSV(rowCount, accountOptions = {}) {
    const headers = 'account_id,parent_account_id,name,status';
    const rows = [headers];

    // If search data is available, use it instead of generating random data
    if (accountOptions.searchData && Array.isArray(accountOptions.searchData)) {
        console.log('Using search data for accounts CSV generation');

        accountOptions.searchData.forEach(account => {
            // Map from the search API response format to SIS CSV format
            // Ensure ALL columns are included, even if empty
            const accountId = escapeCSVValue(account.account_id || '');
            const parentAccountId = escapeCSVValue(account.parent_account_id || '');
            const name = escapeCSVValue(account.name || '');
            const status = escapeCSVValue(account.status || 'active');

            const row = `${accountId},${parentAccountId},${name},${status}`;
            rows.push(row);
        });

        return rows.join('\n');
    }

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

        const row = `${escapeCSVValue(accountId)},${escapeCSVValue(parentId)},${escapeCSVValue(name)},${escapeCSVValue(status)}`;
        rows.push(row);
    }

    return rows.join('\n');
}

function generateTermsCSV(rowCount, termOptions = {}) {
    const headers = 'term_id,name,status,start_date,end_date,integration_id,date_override_enrollment_type';
    const rows = [headers];

    // If search data is available, use it instead of generating random data
    if (termOptions.searchData && Array.isArray(termOptions.searchData)) {
        console.log('Using search data for terms CSV generation');

        termOptions.searchData.forEach(term => {
            // Map from the search API response format to SIS CSV format
            // Ensure ALL columns are included, even if empty
            const termId = escapeCSVValue(term.term_id || '');
            const name = escapeCSVValue(term.name || '');
            const status = escapeCSVValue(term.status || 'active');
            const startDate = escapeCSVValue(term.start_date || '');
            const endDate = escapeCSVValue(term.end_date || '');
            const integrationId = escapeCSVValue(term.integration_id || '');
            const dateOverrideEnrollmentType = escapeCSVValue(term.date_override_enrollment_type || '');

            const row = `${termId},${name},${status},${startDate},${endDate},${integrationId},${dateOverrideEnrollmentType}`;
            rows.push(row);
        });

        return rows.join('\n');
    }

    const seasons = ['Fall', 'Spring', 'Summer', 'Winter'];
    const currentYear = new Date().getFullYear();

    // Check if we have override data from a terms search
    if (termOptions._termOverrideCount && termOptions._termBaseData) {
        const baseData = termOptions._termBaseData;

        // Add base term row (without enrollment type override)
        const baseRow = `${escapeCSVValue(baseData.term_id || '')},${escapeCSVValue(baseData.name || '')},${escapeCSVValue(baseData.status || 'active')},${escapeCSVValue(baseData.start_date || '')},${escapeCSVValue(baseData.end_date || '')},${escapeCSVValue(baseData.integration_id || '')},`;
        rows.push(baseRow);

        // Add override rows
        for (let i = 0; i < termOptions._termOverrideCount; i++) {
            const enrollmentType = termOptions[`specificOverride${i}EnrollmentType`] || '';
            const overrideStartDate = termOptions[`specificOverride${i}StartDate`] || '';
            const overrideEndDate = termOptions[`specificOverride${i}EndDate`] || '';

            const overrideRow = `${escapeCSVValue(baseData.term_id || '')},${escapeCSVValue(baseData.name || '')},${escapeCSVValue(baseData.status || 'active')},${escapeCSVValue(overrideStartDate)},${escapeCSVValue(overrideEndDate)},${escapeCSVValue(baseData.integration_id || '')},${escapeCSVValue(enrollmentType)}`;
            rows.push(overrideRow);
        }

        return rows.join('\n');
    }

    // Default behavior for regular term generation
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
        const dateOverrideEnrollmentType = termOptions.specificDateOverrideEnrollmentType || '';
        const row = `${escapeCSVValue(termId)},${escapeCSVValue(name)},${escapeCSVValue(status)},${escapeCSVValue(startDate)},${escapeCSVValue(endDate)},${escapeCSVValue(integrationId)},${escapeCSVValue(dateOverrideEnrollmentType)}`;
        rows.push(row);
    }

    return rows.join('\n');
}

function generateCoursesCSV(rowCount, courseOptions = {}) {
    const headers = 'course_id,short_name,long_name,account_id,term_id,status,integration_id,start_date,end_date,course_format,blueprint_course_id,grade_passback_setting,homeroom_course,friendly_name';
    const rows = [headers];

    // If search data is available, use it instead of generating random data
    if (courseOptions.searchData && Array.isArray(courseOptions.searchData)) {
        console.log('Using search data for courses CSV generation');

        courseOptions.searchData.forEach(course => {
            // Map from the search API response format to SIS CSV format
            // Ensure ALL columns are included, even if empty
            const courseId = escapeCSVValue(course.course_id || '');
            const shortName = escapeCSVValue(course.short_name || '');
            const longName = escapeCSVValue(course.long_name || '');
            const accountId = escapeCSVValue(course.account_id || '');
            const termId = escapeCSVValue(course.term_id || '');
            const status = escapeCSVValue(course.status || 'active');
            const integrationId = escapeCSVValue(course.integration_id || '');
            const startDate = escapeCSVValue(course.start_date || '');
            const endDate = escapeCSVValue(course.end_date || '');
            const courseFormat = escapeCSVValue(course.course_format || '');
            const blueprintCourseId = escapeCSVValue(course.blueprint_course_id || '');
            const gradePassbackSetting = escapeCSVValue(course.grade_passback_setting || '');
            const homeroomCourse = escapeCSVValue(course.homeroom_course || '');
            const friendlyName = escapeCSVValue(course.friendly_name || '');

            const row = `${courseId},${shortName},${longName},${accountId},${termId},${status},${integrationId},${startDate},${endDate},${courseFormat},${blueprintCourseId},${gradePassbackSetting},${homeroomCourse},${friendlyName}`;
            rows.push(row);
        });

        return rows.join('\n');
    }

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

        const row = `${escapeCSVValue(courseId)},${escapeCSVValue(shortName)},${escapeCSVValue(longName)},${escapeCSVValue(accountId)},${escapeCSVValue(termId)},${escapeCSVValue(status)},${escapeCSVValue(integrationId)},${escapeCSVValue(startDate)},${escapeCSVValue(endDate)},${escapeCSVValue(courseFormat)},${escapeCSVValue(blueprintId)},${escapeCSVValue(gradePassback)},${escapeCSVValue(homeroom)},${escapeCSVValue(friendlyName)}`;
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

        const row = `${escapeCSVValue(sectionId)},${escapeCSVValue(courseId)},${escapeCSVValue(name)},${escapeCSVValue(status)},${escapeCSVValue(startDate)},${escapeCSVValue(endDate)},${escapeCSVValue(integrationId)}`;
        rows.push(row);
    }

    return rows.join('\n');
}

function generateEnrollmentsCSV(rowCount, enrollmentOptions = {}) {
    const headers = 'course_id,user_id,role,section_id,status,user_integration_id,role_id,root_account';
    const rows = [headers];

    // If search data is available, use it instead of generating random data
    if (enrollmentOptions.searchData && Array.isArray(enrollmentOptions.searchData)) {
        console.log('Using search data for enrollments CSV generation');

        enrollmentOptions.searchData.forEach(enrollment => {
            // Map from the search API response format to SIS CSV format
            const courseId = escapeCSVValue(enrollment.course_id || '');
            const userId = escapeCSVValue(enrollment.user_id || '');
            const role = escapeCSVValue(enrollment.role || '');
            const sectionId = escapeCSVValue(enrollment.section_id || '');
            const status = escapeCSVValue(enrollment.status || '');
            const userIntegrationId = escapeCSVValue(enrollment.user_integration_id || '');
            const roleId = escapeCSVValue(enrollment.role_id || '');
            const rootAccount = escapeCSVValue(enrollment.root_account || '');

            const row = `${courseId},${userId},${role},${sectionId},${status},${userIntegrationId},${roleId},${rootAccount}`;
            rows.push(row);
        });

        return rows.join('\n');
    }

    const roles = ['student', 'teacher', 'ta', 'observer', 'designer'];

    for (let i = 0; i < rowCount; i++) {
        // Helper to get field value (checks file import first, then options, then default)
        const getFieldValue = (fieldName, defaultValue) => {
            if (enrollmentOptions.fileImport && enrollmentOptions.fileImport.field === fieldName && enrollmentOptions.fileImport.values) {
                return enrollmentOptions.fileImport.values[i % enrollmentOptions.fileImport.values.length];
            }
            return enrollmentOptions[fieldName] || enrollmentOptions[`specific${fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/_([a-z])/g, (m, p1) => p1.toUpperCase())}`] || defaultValue;
        };

        // Use specific values if provided, otherwise generate random ones
        const courseId = getFieldValue('course_id', generateRandomId('C', 6));
        const userId = getFieldValue('user_id', generateRandomId('U', 6));
        const role = getFieldValue('role', roles[Math.floor(Math.random() * roles.length)]);
        const sectionId = getFieldValue('section_id', generateRandomId('S', 6));
        const status = getFieldValue('status', 'active');
        const userIntegrationId = getFieldValue('user_integration_id', '');
        const roleId = getFieldValue('role_id', '');
        const rootAccount = getFieldValue('root_account', '');

        const row = `${escapeCSVValue(courseId)},${escapeCSVValue(userId)},${escapeCSVValue(role)},${escapeCSVValue(sectionId)},${escapeCSVValue(status)},${escapeCSVValue(userIntegrationId)},${escapeCSVValue(roleId)},${escapeCSVValue(rootAccount)}`;
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

        const row = `${escapeCSVValue(categoryId)},${escapeCSVValue(accountId)},${escapeCSVValue(courseId)},${escapeCSVValue(categoryName)},${escapeCSVValue(status)}`;
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

        const row = `${escapeCSVValue(groupId)},${escapeCSVValue(accountId)},${escapeCSVValue(name)},${escapeCSVValue(status)}`;
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

        const row = `${escapeCSVValue(userId)},${escapeCSVValue(accountId)},${escapeCSVValue(role)},${escapeCSVValue(status)}`;
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

        const row = `${escapeCSVValue(groupId)},${escapeCSVValue(userId)},${escapeCSVValue(status)}`;
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

        const row = `${escapeCSVValue(tagSetId)},${escapeCSVValue(courseId)},${escapeCSVValue(setName)},${escapeCSVValue(status)}`;
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

        const row = `${escapeCSVValue(tagId)},${escapeCSVValue(tagSetId)},${escapeCSVValue(courseId)},${escapeCSVValue(name)},${escapeCSVValue(status)}`;
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

        const row = `${escapeCSVValue(tagId)},${escapeCSVValue(userId)},${escapeCSVValue(status)}`;
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

        const row = `${escapeCSVValue(xlistCourseId)},${escapeCSVValue(sectionId)},${escapeCSVValue(status)}`;
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

        const row = `${escapeCSVValue(observerId)},${escapeCSVValue(studentId)},${escapeCSVValue(status)}`;
        rows.push(row);
    }

    return rows.join('\n');
}

function generateLoginsCSV(rowCount, emailDomain = '@school.edu', authProviderId = '', loginOptions = {}) {
    const headers = 'user_id,login_id,authentication_provider_id,password,existing_user_id,existing_integration_id,existing_canvas_user_id,email';
    const rows = [headers];

    // If search data is available, use it instead of generating random data
    if (loginOptions.searchData && Array.isArray(loginOptions.searchData)) {
        console.log('Using search data for logins CSV generation');

        loginOptions.searchData.forEach(login => {
            // Map from the search API response format to SIS CSV format
            const userId = escapeCSVValue(login.sis_user_id || '');
            const loginId = escapeCSVValue(login.unique_id || '');
            const authProvider = escapeCSVValue(login.authentication_provider_id || '');
            const password = escapeCSVValue('temppass123'); // Default password for import
            const existingUserId = escapeCSVValue(login.existing_user_id || '');
            const existingIntegrationId = escapeCSVValue(login.existing_integration_id || '');
            const canvasUserId = escapeCSVValue(login.existing_canvas_user_id || '');
            const email = escapeCSVValue(login.email || (login.unique_id && login.unique_id.includes('@') ? login.unique_id : ''));

            const row = `${userId},${loginId},${authProvider},${password},${existingUserId},${existingIntegrationId},${canvasUserId},${email}`;
            rows.push(row);
        });

        return rows.join('\n');
    }

    // If no search data, generate sample data as before
    for (let i = 0; i < rowCount; i++) {
        const { firstName, lastName } = generateRandomName();

        // Use field values for customization, fallback to defaults
        const userId = loginOptions.user_id || loginOptions.specificUserId || generateRandomId('U', 6);
        const loginId = loginOptions.login_id || `${firstName.toLowerCase()}${lastName.toLowerCase()}${Math.floor(Math.random() * 100)}`;
        const authProviderToUse = loginOptions.authentication_provider_id || authProviderId || (Math.random() > 0.7 ? generateRandomId('', 2) : '');
        const password = loginOptions.password || 'temppass123';
        const existingUserId = loginOptions.existing_user_id || '';
        const existingIntegrationId = loginOptions.existing_integration_id || '';
        const canvasUserId = loginOptions.existing_canvas_user_id || (1000 + i); // Sequential Canvas user IDs
        const email = loginOptions.email || generateRandomEmail(firstName, lastName, emailDomain);

        const row = `${escapeCSVValue(userId)},${escapeCSVValue(loginId)},${escapeCSVValue(authProviderToUse)},${escapeCSVValue(password)},${escapeCSVValue(existingUserId)},${escapeCSVValue(existingIntegrationId)},${escapeCSVValue(canvasUserId)},${escapeCSVValue(email)}`;
        rows.push(row);
    }

    return rows.join('\n');
}

function generateChangeSisIdCSV(rowCount, changeSisIdOptions = {}) {
    const headers = 'old_id,new_id,old_integration_id,new_integration_id,type';
    const rows = [headers];

    // If search data is available, use it instead of generating random data
    if (changeSisIdOptions.searchData && Array.isArray(changeSisIdOptions.searchData)) {
        console.log('Using search data for change_sis_ids CSV generation');
        console.log('Search data size:', changeSisIdOptions.searchData.length);

        changeSisIdOptions.searchData.forEach(item => {
            const oldId = escapeCSVValue(item.old_id || '');
            const newId = escapeCSVValue(item.new_id || '');
            const oldIntegrationId = escapeCSVValue(item.old_integration_id || '');
            const newIntegrationId = escapeCSVValue(item.new_integration_id || '');
            const type = escapeCSVValue(item.type || 'user');

            console.log('Processing change_sis_ids item');

            const row = `${oldId},${newId},${oldIntegrationId},${newIntegrationId},${type}`;
            rows.push(row);
        });

        return rows.join('\n');
    }

    // If no search data, generate sample data as before
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
            const row = `${escapeCSVValue(oldId)},${escapeCSVValue(newId)},,,${escapeCSVValue(type)}`;
            rows.push(row);
        } else {
            const oldIntegrationId = generateRandomId('INT', 6);
            const newIntegrationId = generateRandomId('INT', 6);
            const row = `,,${escapeCSVValue(oldIntegrationId)},${escapeCSVValue(newIntegrationId)},${escapeCSVValue(type)}`;
            rows.push(row);
        }
    }

    return rows.join('\n');
}

// Export functions
async function createSISImportFile(fileType, rowCount, outputPath, emailDomain = '@school.edu', authProviderId = '', enrollmentOptions = {}, userOptions = {}, accountOptions = {}, termOptions = {}, courseOptions = {}, sectionOptions = {}, groupCategoryOptions = {}, groupOptions = {}, groupMembershipOptions = {}, adminOptions = {}, loginOptions = {}, crossListingOptions = {}, userObserverOptions = {}, changeSisIdOptions = {}, differentiationTagSetOptions = {}, differentiationTagOptions = {}, differentiationTagMembershipOptions = {}) {
    console.log(`>>> createSISImportFile ENTRY - fileType: ${fileType}, rowCount: ${rowCount}`);

    // Check if outputPath is a full file path (has extension) or just a directory
    let filePath;
    if (path.extname(outputPath)) {
        // outputPath is a full file path
        filePath = outputPath;
    } else {
        // outputPath is a directory, create filename
        const fileName = `${fileType}.csv`;
        filePath = path.join(outputPath, fileName);
    }

    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // For large row counts (>=1000), use streaming to avoid memory issues
    const STREAMING_THRESHOLD = 1000;
    const useStreaming = rowCount >= STREAMING_THRESHOLD;

    console.log(`=== createSISImportFile called ===`);
    console.log(`fileType: ${fileType}, rowCount: ${rowCount}`);
    console.log(`useStreaming: ${useStreaming} (threshold: ${STREAMING_THRESHOLD})`);

    if (useStreaming) {
        // Use streaming approach for large files
        console.log(`Using streaming approach for ${rowCount} rows`);
        console.log(`userOptions:`, JSON.stringify(userOptions, null, 2));
        console.log(`accountOptions:`, JSON.stringify(accountOptions, null, 2));
        console.log(`CALLING createSISImportFileStreaming NOW`);
        await createSISImportFileStreaming(fileType, rowCount, filePath, emailDomain, authProviderId, enrollmentOptions, userOptions, accountOptions, termOptions, courseOptions, sectionOptions, groupCategoryOptions, groupOptions, groupMembershipOptions, adminOptions, loginOptions, crossListingOptions, userObserverOptions, changeSisIdOptions, differentiationTagSetOptions, differentiationTagOptions, differentiationTagMembershipOptions);
        console.log(`STREAMING COMPLETED, returning filePath: ${filePath}`);
    } else {
        // Use in-memory approach for smaller files (simpler, faster for small datasets)
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
            case 'change_sis_ids':
                csvContent = generateChangeSisIdCSV(rowCount, changeSisIdOptions);
                break;
            case 'admins':
                csvContent = generateAdminsCSV(rowCount, emailDomain, adminOptions);
                break;
            default:
                throw new Error(`Unsupported file type: ${fileType}`);
        }

        // Write with UTF-8 BOM to ensure proper encoding of special characters
        const BOM = '\uFEFF';
        fs.writeFileSync(filePath, BOM + csvContent, 'utf8');
    }

    return filePath;
}

// Streaming CSV generation for large files
async function createSISImportFileStreaming(fileType, rowCount, filePath, emailDomain, authProviderId, enrollmentOptions, userOptions, accountOptions, termOptions, courseOptions, sectionOptions, groupCategoryOptions, groupOptions, groupMembershipOptions, adminOptions, loginOptions, crossListingOptions, userObserverOptions, changeSisIdOptions, differentiationTagSetOptions, differentiationTagOptions, differentiationTagMembershipOptions) {
    console.log('=== createSISImportFileStreaming called ===');
    console.log(`fileType: ${fileType}, rowCount: ${rowCount}, filePath: ${filePath}`);
    console.log(`userOptions:`, userOptions);

    return new Promise((resolve, reject) => {
        console.log('Creating write stream...');
        const writeStream = fs.createWriteStream(filePath, { encoding: 'utf8' });
        const BATCH_SIZE = 1000; // Process 1000 rows at a time

        writeStream.on('error', (err) => {
            console.error('Write stream error:', err);
            reject(err);
        });
        writeStream.on('finish', () => {
            console.log('Write stream finished successfully');
            resolve(filePath);
        });

        // Write header first
        let header = '';
        switch (fileType) {
            case 'users':
                header = 'user_id,login_id,authentication_provider_id,password,ssha_password,first_name,last_name,full_name,sortable_name,short_name,email,status,integration_id,pronouns,declared_user_type,canvas_password_notification,home_account';
                break;
            case 'accounts':
                header = 'account_id,parent_account_id,name,status';
                break;
            case 'terms':
                header = 'term_id,name,status,start_date,end_date,integration_id,date_override_enrollment_type';
                break;
            case 'courses':
                header = 'course_id,short_name,long_name,account_id,term_id,status,start_date,end_date,course_code,integration_id,blueprint_course_id';
                break;
            case 'sections':
                header = 'section_id,course_id,name,status,start_date,end_date,integration_id,restriction_section_id';
                break;
            case 'enrollments':
                header = 'course_id,user_id,role,role_id,section_id,status,associated_user_id,start_date,end_date,limit_section_privileges';
                break;
            case 'group_categories':
                header = 'group_category_id,account_id,course_id,category_name,status';
                break;
            case 'groups':
                header = 'group_id,account_id,name,status,group_category_id';
                break;
            case 'group_memberships':
                header = 'group_id,user_id,status';
                break;
            case 'xlists':
            case 'cross_listings':
                header = 'xlist_course_id,section_id,status';
                break;
            case 'user_observers':
                header = 'observer_id,student_id,status';
                break;
            case 'logins':
                header = 'user_id,login_id,authentication_provider_id,password,ssha_password,existing_user_id,existing_integration_id,existing_canvas_user_id,status,declared_user_type';
                break;
            case 'change_sis_id':
            case 'change_sis_ids':
                header = 'old_id,new_id,old_integration_id,new_integration_id,type';
                break;
            case 'admins':
                header = 'user_id,account_id,role_id,role,status';
                break;
            default:
                return reject(new Error(`Unsupported file type: ${fileType}`));
        }

        console.log(`Writing header: ${header}`);
        // Write UTF-8 BOM first to ensure proper encoding of special characters
        const BOM = '\uFEFF';
        writeStream.write(BOM + header + '\n');

        // Process rows in batches
        let currentRow = 0;
        const processBatch = () => {
            console.log(`processBatch called, currentRow=${currentRow}, rowCount=${rowCount}`);
            const batchEnd = Math.min(currentRow + BATCH_SIZE, rowCount);
            const batchCount = batchEnd - currentRow;

            console.log(`batchEnd=${batchEnd}, batchCount=${batchCount}`);
            if (batchCount <= 0) {
                console.log('No more batches, ending stream');
                writeStream.end();
                return;
            }

            // Generate batch of rows (using modified generators that return single rows)
            const batchRows = [];
            console.log(`Generating batch: rows ${currentRow} to ${batchEnd}, batchCount=${batchCount}`);
            for (let i = 0; i < batchCount; i++) {
                const rowIndex = currentRow + i;
                let row = '';
                switch (fileType) {
                    case 'users':
                        row = generateUserRow(emailDomain, authProviderId, userOptions, rowIndex);
                        console.log(`Generated user row ${rowIndex}: ${row.substring(0, 100)}...`);
                        break;
                    case 'accounts':
                        row = generateAccountRow(rowIndex, accountOptions);
                        break;
                    case 'terms':
                        row = generateTermRow(rowIndex, termOptions);
                        break;
                    case 'courses':
                        row = generateCourseRow(rowIndex, courseOptions);
                        break;
                    case 'sections':
                        row = generateSectionRow(rowIndex, sectionOptions);
                        break;
                    case 'enrollments':
                        row = generateEnrollmentRow(rowIndex, enrollmentOptions);
                        break;
                    case 'group_categories':
                        row = generateGroupCategoryRow(currentRow + i, groupCategoryOptions);
                        break;
                    case 'groups':
                        row = generateGroupRow(currentRow + i, groupOptions);
                        break;
                    case 'group_memberships':
                        row = generateGroupMembershipRow(currentRow + i, groupMembershipOptions);
                        break;
                    case 'xlists':
                    case 'cross_listings':
                        row = generateXlistRow(currentRow + i, crossListingOptions);
                        break;
                    case 'user_observers':
                        row = generateUserObserverRow(currentRow + i, userObserverOptions);
                        break;
                    case 'logins':
                        row = generateLoginRow(emailDomain, authProviderId, loginOptions);
                        break;
                    case 'change_sis_id':
                    case 'change_sis_ids':
                        row = generateChangeSisIdRow(currentRow + i, changeSisIdOptions);
                        break;
                    case 'admins':
                        row = generateAdminRow(emailDomain, adminOptions);
                        break;
                }
                batchRows.push(row);
            }

            const batchContent = batchRows.join('\n') + '\n';
            console.log(`Writing batch of ${batchRows.length} rows, total chars: ${batchContent.length}`);
            console.log(`First row preview: ${batchRows[0]?.substring(0, 150)}`);
            writeStream.write(batchContent);
            currentRow = batchEnd;

            // Schedule next batch (allow event loop to process other tasks)
            setImmediate(processBatch);
        };

        processBatch();
    });
}

// Helper functions to generate single rows (extracted from the loop bodies of existing generators)
function generateUserRow(emailDomain, authProviderId, userOptions = {}, rowIndex = 0) {
    console.log('generateUserRow called with userOptions:', JSON.stringify(userOptions));

    // Helper to get field value (checks file import first, then options, then default)
    const getFieldValue = (fieldName, defaultValue) => {
        if (userOptions.fileImport && userOptions.fileImport.field === fieldName && userOptions.fileImport.values) {
            return userOptions.fileImport.values[rowIndex % userOptions.fileImport.values.length];
        }
        return userOptions[fieldName] || userOptions[`specific${fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/_([a-z])/g, (m, p1) => p1.toUpperCase())}`] || defaultValue;
    };

    const { firstName, lastName } = generateRandomName();
    const userId = getFieldValue('user_id', generateRandomId('U', 6));
    const loginId = getFieldValue('login_id', `${firstName.toLowerCase()}${lastName.toLowerCase()}${Math.floor(Math.random() * 100)}`);
    const authProviderIdToUse = getFieldValue('authentication_provider_id', authProviderId);
    const password = getFieldValue('password', 'temppass123');
    const sshaPassword = getFieldValue('ssha_password', '');
    const firstNameToUse = getFieldValue('first_name', firstName);
    const lastNameToUse = getFieldValue('last_name', lastName);
    const fullName = getFieldValue('full_name', `${firstNameToUse} ${lastNameToUse}`);
    const sortableName = getFieldValue('sortable_name', `${lastNameToUse}, ${firstNameToUse}`);
    const shortName = getFieldValue('short_name', `${firstNameToUse} ${lastNameToUse.charAt(0)}.`);
    const email = getFieldValue('email', generateRandomEmail(firstNameToUse, lastNameToUse, emailDomain));
    const status = getFieldValue('status', 'active');
    const integrationId = getFieldValue('integration_id', '');
    const pronouns = getFieldValue('pronouns', '');
    const declaredUserType = getFieldValue('declared_user_type', '');
    const canvasPasswordNotification = getFieldValue('canvas_password_notification', '');
    const homeAccount = getFieldValue('home_account', '');

    return `${escapeCSVValue(userId)},${escapeCSVValue(loginId)},${escapeCSVValue(authProviderIdToUse)},${escapeCSVValue(password)},${escapeCSVValue(sshaPassword)},${escapeCSVValue(firstNameToUse)},${escapeCSVValue(lastNameToUse)},${escapeCSVValue(fullName)},${escapeCSVValue(sortableName)},${escapeCSVValue(shortName)},${escapeCSVValue(email)},${escapeCSVValue(status)},${escapeCSVValue(integrationId)},${escapeCSVValue(pronouns)},${escapeCSVValue(declaredUserType)},${escapeCSVValue(canvasPasswordNotification)},${escapeCSVValue(homeAccount)}`;
}

// Placeholder row generators for other types (these would need to be filled in similarly)
function generateAccountRow(index, options) {
    const departments = ['Humanities', 'Sciences', 'Engineering', 'Business', 'Arts', 'Social Sciences'];
    const accountId = options.account_id || options.specificAccountId || generateRandomId('A', 4);
    const parentId = options.parent_account_id || options.specificParentAccountId || (index === 0 ? '' : generateRandomId('A', 4));
    const name = options.name || options.specificName || (departments[index % departments.length] + (index > 5 ? ` ${Math.floor(index / 6) + 1}` : ''));
    const status = options.status || options.specificStatus || 'active';
    return `${escapeCSVValue(accountId)},${escapeCSVValue(parentId)},${escapeCSVValue(name)},${escapeCSVValue(status)}`;
}

function generateTermRow(index, options) {
    const seasons = ['Fall', 'Spring', 'Summer', 'Winter'];
    const currentYear = new Date().getFullYear();
    const termId = options.term_id || options.specificTermId || generateRandomId('T', 6);
    const name = options.name || options.specificName || `${seasons[index % 4]} ${currentYear + Math.floor(index / 4)}`;
    const status = options.status || options.specificStatus || 'active';
    const startDate = options.start_date || options.specificStartDate || generateDate(index * 90);
    const endDate = options.end_date || options.specificEndDate || generateDate(index * 90 + 90);
    const integrationId = options.integration_id || options.specificIntegrationId || '';
    const dateOverride = options.date_override_enrollment_type || options.specificDateOverrideEnrollmentType || '';
    return `${escapeCSVValue(termId)},${escapeCSVValue(name)},${escapeCSVValue(status)},${escapeCSVValue(startDate)},${escapeCSVValue(endDate)},${escapeCSVValue(integrationId)},${escapeCSVValue(dateOverride)}`;
}

function generateCourseRow(index, options) {
    const courseId = options.course_id || options.specificCourseId || generateRandomId('C', 6);
    const subject = subjects[index % subjects.length];
    const shortName = options.short_name || options.specificShortName || `${subject.substring(0, 4).toUpperCase()}${100 + index}`;
    const longName = options.long_name || options.specificLongName || `Introduction to ${subject}`;
    const accountId = options.account_id || options.specificAccountId || 'root';
    const termId = options.term_id || options.specificTermId || generateRandomId('T', 6);
    const status = options.status || options.specificStatus || 'active';
    const startDate = options.start_date || options.specificStartDate || '';
    const endDate = options.end_date || options.specificEndDate || '';
    const courseCode = options.course_code || options.specificCourseCode || shortName;
    const integrationId = options.integration_id || options.specificIntegrationId || '';
    const blueprintCourseId = options.blueprint_course_id || options.specificBlueprintCourseId || '';
    return `${escapeCSVValue(courseId)},${escapeCSVValue(shortName)},${escapeCSVValue(longName)},${escapeCSVValue(accountId)},${escapeCSVValue(termId)},${escapeCSVValue(status)},${escapeCSVValue(startDate)},${escapeCSVValue(endDate)},${escapeCSVValue(courseCode)},${escapeCSVValue(integrationId)},${escapeCSVValue(blueprintCourseId)}`;
}

function generateSectionRow(index, options) {
    const sectionId = options.section_id || options.specificSectionId || generateRandomId('S', 6);
    const courseId = options.course_id || options.specificCourseId || generateRandomId('C', 6);
    const name = options.name || options.specificName || `Section ${index + 1}`;
    const status = options.status || options.specificStatus || 'active';
    const startDate = options.start_date || options.specificStartDate || '';
    const endDate = options.end_date || options.specificEndDate || '';
    const integrationId = options.integration_id || options.specificIntegrationId || '';
    const restrictionSectionId = options.restriction_section_id || options.specificRestrictionSectionId || '';
    return `${escapeCSVValue(sectionId)},${escapeCSVValue(courseId)},${escapeCSVValue(name)},${escapeCSVValue(status)},${escapeCSVValue(startDate)},${escapeCSVValue(endDate)},${escapeCSVValue(integrationId)},${escapeCSVValue(restrictionSectionId)}`;
}

function generateEnrollmentRow(index, options) {
    const roles = ['student', 'teacher', 'ta', 'observer', 'designer'];

    // Check for file import data
    const getFieldValue = (fieldName, defaultValue) => {
        if (options.fileImport && options.fileImport.field === fieldName && options.fileImport.values) {
            return options.fileImport.values[index % options.fileImport.values.length];
        }
        return options[fieldName] || options[`specific${fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/_([a-z])/g, (m, p1) => p1.toUpperCase())}`] || defaultValue;
    };

    const courseId = getFieldValue('course_id', generateRandomId('C', 6));
    const userId = getFieldValue('user_id', generateRandomId('U', 6));
    const role = getFieldValue('role', roles[index % roles.length]);
    const roleId = getFieldValue('role_id', '');
    const sectionId = getFieldValue('section_id', '');
    const status = getFieldValue('status', 'active');
    const associatedUserId = getFieldValue('associated_user_id', '');
    const startDate = getFieldValue('start_date', '');
    const endDate = getFieldValue('end_date', '');
    const limitSectionPrivileges = getFieldValue('limit_section_privileges', '');

    return `${escapeCSVValue(courseId)},${escapeCSVValue(userId)},${escapeCSVValue(role)},${escapeCSVValue(roleId)},${escapeCSVValue(sectionId)},${escapeCSVValue(status)},${escapeCSVValue(associatedUserId)},${escapeCSVValue(startDate)},${escapeCSVValue(endDate)},${escapeCSVValue(limitSectionPrivileges)}`;
}

function generateGroupCategoryRow(index, options) {
    const categories = ['Study Groups', 'Project Teams', 'Lab Sections', 'Discussion Groups'];
    const groupCategoryId = options.group_category_id || options.specificGroupCategoryId || generateRandomId('GC', 6);
    const accountId = options.account_id || options.specificAccountId || '';
    const courseId = options.course_id || options.specificCourseId || generateRandomId('C', 6);
    const categoryName = options.category_name || options.specificCategoryName || categories[index % categories.length];
    const status = options.status || options.specificStatus || 'available';
    return `${escapeCSVValue(groupCategoryId)},${escapeCSVValue(accountId)},${escapeCSVValue(courseId)},${escapeCSVValue(categoryName)},${escapeCSVValue(status)}`;
}

function generateGroupRow(index, options) {
    const groupId = options.group_id || options.specificGroupId || generateRandomId('G', 6);
    const accountId = options.account_id || options.specificAccountId || '';
    const name = options.name || options.specificName || `Group ${index + 1}`;
    const status = options.status || options.specificStatus || 'available';
    const groupCategoryId = options.group_category_id || options.specificGroupCategoryId || generateRandomId('GC', 6);
    return `${escapeCSVValue(groupId)},${escapeCSVValue(accountId)},${escapeCSVValue(name)},${escapeCSVValue(status)},${escapeCSVValue(groupCategoryId)}`;
}

function generateGroupMembershipRow(index, options) {
    const groupId = options.group_id || options.specificGroupId || generateRandomId('G', 6);
    const userId = options.user_id || options.specificUserId || generateRandomId('U', 6);
    const status = options.status || options.specificStatus || 'accepted';
    return `${escapeCSVValue(groupId)},${escapeCSVValue(userId)},${escapeCSVValue(status)}`;
}

function generateXlistRow(index, options) {
    const xlistCourseId = options.xlist_course_id || options.specificXlistCourseId || generateRandomId('C', 6);
    const sectionId = options.section_id || options.specificSectionId || generateRandomId('S', 6);
    const status = options.status || options.specificStatus || 'active';
    return `${escapeCSVValue(xlistCourseId)},${escapeCSVValue(sectionId)},${escapeCSVValue(status)}`;
}

function generateUserObserverRow(index, options) {
    const observerId = options.observer_id || options.specificObserverId || generateRandomId('U', 6);
    const studentId = options.student_id || options.specificStudentId || generateRandomId('U', 6);
    const status = options.status || options.specificStatus || 'active';
    return `${escapeCSVValue(observerId)},${escapeCSVValue(studentId)},${escapeCSVValue(status)}`;
}

function generateLoginRow(emailDomain, authProviderId, options) {
    const { firstName, lastName } = generateRandomName();
    const userId = options.user_id || options.specificUserId || generateRandomId('U', 6);
    const loginId = options.login_id || options.specificLoginId || `${firstName.toLowerCase()}${lastName.toLowerCase()}${Math.floor(Math.random() * 100)}`;
    const authProviderIdToUse = options.authentication_provider_id || options.specificAuthProviderId || authProviderId;
    const password = options.password || options.specificPassword || 'temppass123';
    const sshaPassword = options.ssha_password || options.specificSshaPassword || '';
    const existingUserId = options.existing_user_id || options.specificExistingUserId || '';
    const existingIntegrationId = options.existing_integration_id || options.specificExistingIntegrationId || '';
    const existingCanvasUserId = options.existing_canvas_user_id || options.specificExistingCanvasUserId || '';
    const status = options.status || options.specificStatus || 'active';
    const declaredUserType = options.declared_user_type || options.specificDeclaredUserType || '';
    return `${escapeCSVValue(userId)},${escapeCSVValue(loginId)},${escapeCSVValue(authProviderIdToUse)},${escapeCSVValue(password)},${escapeCSVValue(sshaPassword)},${escapeCSVValue(existingUserId)},${escapeCSVValue(existingIntegrationId)},${escapeCSVValue(existingCanvasUserId)},${escapeCSVValue(status)},${escapeCSVValue(declaredUserType)}`;
}

function generateChangeSisIdRow(index, options) {
    const types = ['user', 'course', 'section', 'term', 'account'];
    const oldId = options.old_id || options.specificOldId || generateRandomId('OLD', 6);
    const newId = options.new_id || options.specificNewId || generateRandomId('NEW', 6);
    const oldIntegrationId = options.old_integration_id || options.specificOldIntegrationId || '';
    const newIntegrationId = options.new_integration_id || options.specificNewIntegrationId || '';
    const type = options.type || options.specificType || types[index % types.length];
    return `${escapeCSVValue(oldId)},${escapeCSVValue(newId)},${escapeCSVValue(oldIntegrationId)},${escapeCSVValue(newIntegrationId)},${escapeCSVValue(type)}`;
}

function generateAdminRow(emailDomain, options) {
    const { firstName, lastName } = generateRandomName();
    const userId = options.user_id || options.specificUserId || generateRandomId('U', 6);
    const accountId = options.account_id || options.specificAccountId || 'root';
    const roleId = options.role_id || options.specificRoleId || generateRandomId('R', 4);
    const role = options.role || options.specificRole || 'AccountAdmin';
    const status = options.status || options.specificStatus || 'active';
    return `${escapeCSVValue(userId)},${escapeCSVValue(accountId)},${escapeCSVValue(roleId)},${escapeCSVValue(role)},${escapeCSVValue(status)}`;
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

/**
 * Search for enrollments in a course using Canvas GraphQL API
 * Fetches ALL enrollment types and states - filtering happens client-side
 * @param {string} courseId - The Canvas course ID
 * @returns {Promise<Array>} Array of enrollment objects formatted for SIS CSV
 */
async function searchEnrollments(courseId) {
    try {
        const graphqlUrl = axios.defaults.baseURL.replace('/api/v1', '/api/graphql');
        let allEnrollments = [];
        let hasNextPage = true;
        let cursor = null;

        console.log(`Searching ALL enrollments for course ${courseId}`);

        while (hasNextPage) {
            // Fetch ALL enrollment types and states - we'll filter client-side in the UI
            const allStates = ['invited', 'active', 'completed', 'deleted', 'inactive'];
            const allTypes = ['StudentEnrollment', 'TeacherEnrollment', 'TaEnrollment', 'DesignerEnrollment', 'ObserverEnrollment'];

            const statesEnum = allStates.join(', ');
            const typesEnum = allTypes.join(', ');

            const graphqlQuery = {
                query: `
                    query GetCourseEnrollments($courseId: ID!, $first: Int!, $after: String) {
                        course(id: $courseId) {
                            sisId
                            enrollmentsConnection(
                                first: $first
                                filter: { states: [${statesEnum}], types: [${typesEnum}] }
                                after: $after
                            ) {
                                pageInfo {
                                    endCursor
                                    hasNextPage
                                }
                                edges {
                                    node {
                                        userId
                                        user {
                                            sisId
                                        }
                                        section {
                                            sisId
                                        }
                                        sisRole
                                        state
                                        startAt
                                        endAt
                                    }
                                }
                            }
                        }
                    }
                `,
                variables: {
                    courseId: courseId,
                    first: 100,
                    after: cursor
                }
            };

            console.log(`Fetching page with cursor: ${cursor || 'initial'}`);

            const response = await axios.post(graphqlUrl, graphqlQuery, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.errors) {
                throw new Error(`GraphQL errors: ${JSON.stringify(response.data.errors)}`);
            }

            const courseData = response.data.data.course;
            if (!courseData) {
                throw new Error(`Course with ID ${courseId} not found`);
            }

            const courseSisId = courseData.sisId;
            const enrollmentsConnection = courseData.enrollmentsConnection;
            const edges = enrollmentsConnection.edges || [];

            // Transform GraphQL response to SIS CSV format
            const enrollments = edges.map(edge => {
                const node = edge.node;
                return {
                    course_id: courseSisId || '',
                    user_id: node.user?.sisId || '',
                    role: node.sisRole || '',
                    section_id: node.section?.sisId || '',
                    status: node.state || '',
                    start_date: node.startAt || '',
                    end_date: node.endAt || '',
                    user_integration_id: '',
                    role_id: '',
                    root_account: ''
                };
            });

            allEnrollments = allEnrollments.concat(enrollments);

            // Check if there are more pages
            hasNextPage = enrollmentsConnection.pageInfo.hasNextPage;
            cursor = enrollmentsConnection.pageInfo.endCursor;

            console.log(`Fetched ${enrollments.length} enrollments. Total so far: ${allEnrollments.length}. Has next page: ${hasNextPage}`);
        }

        console.log(`Completed fetching enrollments. Total: ${allEnrollments.length}`);
        return allEnrollments;

    } catch (error) {
        console.error('Error searching enrollments:', error);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        throw new Error(`Failed to search enrollments: ${error.message}`);
    }
}

/**
 * Search for enrollments by user ID using Canvas GraphQL API
 * Fetches ALL enrollment types and states - filtering happens client-side
 * @param {string} userId - The Canvas user ID
 * @returns {Promise<Array>} Array of enrollment objects formatted for SIS CSV
 */
async function searchEnrollmentsByUser(userId) {
    try {
        const graphqlUrl = axios.defaults.baseURL.replace('/api/v1', '/api/graphql');
        let allEnrollments = [];
        let hasNextPage = true;
        let cursor = null;

        console.log(`Searching ALL enrollments for user ${userId}`);

        while (hasNextPage) {
            // Fetch ALL enrollment types - we'll filter client-side in the UI
            const allTypes = ['StudentEnrollment', 'TeacherEnrollment', 'TaEnrollment', 'DesignerEnrollment', 'ObserverEnrollment'];

            const graphqlQuery = {
                query: `
                    query GetUserEnrollments($userId: ID!, $types: [EnrollmentType!]!, $first: Int!, $after: String) {
                        legacyNode(_id: $userId, type: User) {
                            ... on User {
                                sisId
                                enrollmentsConnection(
                                    enrollmentTypes: $types
                                    first: $first
                                    after: $after
                                ) {
                                    pageInfo {
                                        endCursor
                                        hasNextPage
                                    }
                                    edges {
                                        node {
                                            course {
                                                sisId
                                            }
                                            sisSectionId
                                            sisRole
                                            state
                                            startAt
                                            endAt
                                        }
                                    }
                                }
                            }
                        }
                    }
                `,
                variables: {
                    userId: userId,
                    types: allTypes,
                    first: 100,
                    after: cursor
                }
            };

            console.log(`Fetching page with cursor: ${cursor || 'initial'}`);

            const response = await axios.post(graphqlUrl, graphqlQuery, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.errors) {
                throw new Error(`GraphQL errors: ${JSON.stringify(response.data.errors)}`);
            }

            const userData = response.data.data.legacyNode;
            if (!userData) {
                throw new Error(`User with ID ${userId} not found`);
            }

            const userSisId = userData.sisId;
            const enrollmentsConnection = userData.enrollmentsConnection;
            const edges = enrollmentsConnection.edges || [];

            // Transform GraphQL response to SIS CSV format
            const enrollments = edges.map(edge => {
                const node = edge.node;
                return {
                    course_id: node.course?.sisId || '',
                    user_id: userSisId || '',
                    role: node.sisRole || '',
                    section_id: node.sisSectionId || '',
                    status: node.state || '',
                    start_date: node.startAt || '',
                    end_date: node.endAt || '',
                    user_integration_id: '',
                    role_id: '',
                    root_account: ''
                };
            });

            allEnrollments = allEnrollments.concat(enrollments);

            // Check if there are more pages
            hasNextPage = enrollmentsConnection.pageInfo.hasNextPage;
            cursor = enrollmentsConnection.pageInfo.endCursor;

            console.log(`Fetched ${enrollments.length} enrollments. Total so far: ${allEnrollments.length}. Has next page: ${hasNextPage}`);
        }

        console.log(`Completed fetching enrollments for user. Total: ${allEnrollments.length}`);
        return allEnrollments;

    } catch (error) {
        console.error('Error searching enrollments by user:', error);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        throw new Error(`Failed to search enrollments by user: ${error.message}`);
    }
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
    fetchAuthenticationProviders,
    searchEnrollments,
    searchEnrollmentsByUser
};
