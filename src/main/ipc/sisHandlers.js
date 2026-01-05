/**
 * IPC Handlers for SIS data generation operations
 * @module ipc/sisHandlers
 */

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const sisImports = require('../../shared/canvas-api/imports');

/**
 * Register all SIS data generation IPC handlers
 * @param {Electron.IpcMain} ipcMain - The Electron IPC main instance
 * @param {Function} logDebug - Debug logging function
 */
function registerSISHandlers(ipcMain, logDebug) {
    // Preview SIS data (no file creation)
    ipcMain.handle('sis:previewData', async (event, fileType, rowCount, emailDomain = '@school.edu', authProviderId = '', allOptions = {}) => {
        logDebug('[sis:previewData] Generating preview', { fileType, rowCount });
        try {
            let csvContent = '';

            // Extract individual options from the consolidated object
            const enrollmentOptions = allOptions.enrollmentOptions || {};
            const userOptions = allOptions.userOptions || {};
            const accountOptions = allOptions.accountOptions || {};
            const termOptions = allOptions.termOptions || {};
            const courseOptions = allOptions.courseOptions || {};
            const sectionOptions = allOptions.sectionOptions || {};
            const groupCategoryOptions = allOptions.groupCategoryOptions || {};
            const groupOptions = allOptions.groupOptions || {};
            const groupMembershipOptions = allOptions.groupMembershipOptions || {};
            const adminOptions = allOptions.adminOptions || {};
            const loginOptions = allOptions.loginOptions || {};
            const crossListingOptions = allOptions.crossListingOptions || {};
            const userObserverOptions = allOptions.userObserverOptions || {};
            const changeSisIdOptions = allOptions.changeSisIdOptions || {};
            const differentiationTagSetOptions = allOptions.differentiationTagSetOptions || {};
            const differentiationTagOptions = allOptions.differentiationTagOptions || {};
            const differentiationTagMembershipOptions = allOptions.differentiationTagMembershipOptions || {};

            switch (fileType) {
                case 'users':
                    csvContent = sisImports.generateUsersCSV(rowCount, emailDomain, authProviderId, userOptions);
                    break;
                case 'accounts':
                    csvContent = sisImports.generateAccountsCSV(rowCount, accountOptions);
                    break;
                case 'terms':
                    csvContent = sisImports.generateTermsCSV(rowCount, termOptions);
                    break;
                case 'courses':
                    csvContent = sisImports.generateCoursesCSV(rowCount, courseOptions);
                    break;
                case 'sections':
                    csvContent = sisImports.generateSectionsCSV(rowCount, sectionOptions);
                    break;
                case 'enrollments':
                    csvContent = sisImports.generateEnrollmentsCSV(rowCount, enrollmentOptions);
                    break;
                case 'group_categories':
                    csvContent = sisImports.generateGroupCategoriesCSV(rowCount, groupCategoryOptions);
                    break;
                case 'groups':
                    csvContent = sisImports.generateGroupsCSV(rowCount, groupOptions);
                    break;
                case 'group_memberships':
                    csvContent = sisImports.generateGroupMembershipsCSV(rowCount, groupMembershipOptions);
                    break;
                case 'differentiation_tag_sets':
                    csvContent = sisImports.generateDifferentiationTagSetsCSV(rowCount, differentiationTagSetOptions);
                    break;
                case 'differentiation_tags':
                    csvContent = sisImports.generateDifferentiationTagsCSV(rowCount, differentiationTagOptions);
                    break;
                case 'differentiation_tag_membership':
                    csvContent = sisImports.generateDifferentiationTagMembershipCSV(rowCount, differentiationTagMembershipOptions);
                    break;
                case 'xlists':
                    csvContent = sisImports.generateXlistsCSV(rowCount, crossListingOptions);
                    break;
                case 'user_observers':
                    csvContent = sisImports.generateUserObserversCSV(rowCount, userObserverOptions);
                    break;
                case 'logins':
                    csvContent = sisImports.generateLoginsCSV(rowCount, emailDomain, authProviderId, loginOptions);
                    break;
                case 'change_sis_id':
                case 'change_sis_ids':
                    csvContent = sisImports.generateChangeSisIdCSV(rowCount, changeSisIdOptions);
                    break;
                case 'admins':
                    csvContent = sisImports.generateAdminsCSV(rowCount, emailDomain, adminOptions);
                    break;
                default:
                    throw new Error(`Unsupported file type: ${fileType}`);
            }

            return {
                success: true,
                preview: csvContent,
                data: csvContent
            };
        } catch (error) {
            logDebug('[sis:previewData] Error', { error: error.message });
            return {
                success: false,
                error: error.message || 'Unknown error occurred'
            };
        }
    });

    // Fetch authentication providers
    ipcMain.handle('sis:fetchAuthProviders', async (event, domain, token, accountId = 1) => {
        logDebug('[sis:fetchAuthProviders] Fetching providers', { domain, accountId });
        try {
            const providers = await sisImports.fetchAuthenticationProviders(domain, token, accountId);
            return providers;
        } catch (error) {
            throw new Error(`Error fetching authentication providers: ${error.message}`);
        }
    });

    // Create single SIS file
    ipcMain.handle('sis:createFile', async (event, fileType, rowCount, outputPath, emailDomain = '@school.edu', authProviderId = '', allOptions = {}) => {
        logDebug('[sis:createFile] Creating file', { fileType, rowCount, outputPath });
        try {
            const enrollmentOptions = allOptions.enrollmentOptions || {};
            const userOptions = allOptions.userOptions || {};
            const accountOptions = allOptions.accountOptions || {};
            const termOptions = allOptions.termOptions || {};
            const courseOptions = allOptions.courseOptions || {};
            const sectionOptions = allOptions.sectionOptions || {};
            const groupCategoryOptions = allOptions.groupCategoryOptions || {};
            const groupOptions = allOptions.groupOptions || {};
            const groupMembershipOptions = allOptions.groupMembershipOptions || {};
            const adminOptions = allOptions.adminOptions || {};
            const loginOptions = allOptions.loginOptions || {};
            const crossListingOptions = allOptions.crossListingOptions || {};
            const userObserverOptions = allOptions.userObserverOptions || {};
            const changeSisIdOptions = allOptions.changeSisIdOptions || {};
            const differentiationTagSetOptions = allOptions.differentiationTagSetOptions || {};
            const differentiationTagOptions = allOptions.differentiationTagOptions || {};
            const differentiationTagMembershipOptions = allOptions.differentiationTagMembershipOptions || {};

            // Pass search data through options for file types that support it
            if (allOptions.searchData) {
                if (fileType === 'logins') loginOptions.searchData = allOptions.searchData;
                if (fileType === 'change_sis_id' || fileType === 'change_sis_ids') changeSisIdOptions.searchData = allOptions.searchData;
                if (fileType === 'users') userOptions.searchData = allOptions.searchData;
                if (fileType === 'courses') courseOptions.searchData = allOptions.searchData;
                if (fileType === 'accounts') accountOptions.searchData = allOptions.searchData;
                if (fileType === 'enrollments') enrollmentOptions.searchData = allOptions.searchData;
            }

            // Pass field values and file import data to all options
            const allOptionsTypes = [
                loginOptions, userOptions, enrollmentOptions, courseOptions, sectionOptions,
                termOptions, accountOptions, groupCategoryOptions, groupOptions, groupMembershipOptions,
                adminOptions, crossListingOptions, userObserverOptions, changeSisIdOptions,
                differentiationTagSetOptions, differentiationTagOptions, differentiationTagMembershipOptions
            ];

            if (allOptions.fieldValues) {
                allOptionsTypes.forEach(opt => Object.assign(opt, allOptions.fieldValues));
            }
            if (allOptions.fileImport) {
                allOptionsTypes.forEach(opt => opt.fileImport = allOptions.fileImport);
            }

            const filePath = await sisImports.createSISImportFile(
                fileType, rowCount, outputPath, emailDomain, authProviderId,
                enrollmentOptions, userOptions, accountOptions, termOptions, courseOptions,
                sectionOptions, groupCategoryOptions, groupOptions, groupMembershipOptions,
                adminOptions, loginOptions, crossListingOptions, userObserverOptions,
                changeSisIdOptions, differentiationTagSetOptions, differentiationTagOptions,
                differentiationTagMembershipOptions
            );
            const fileName = path.basename(filePath);

            return { success: true, filePath, fileName };
        } catch (error) {
            throw new Error(`Error creating SIS file: ${error.message}`);
        }
    });

    // Create bulk SIS files with optional ZIP packaging
    ipcMain.handle('sis:createBulkFiles', async (event, fileTypes, rowCounts, outputPath, createZip, emailDomain = '@school.edu', authProviderId = '', enrollmentOptions = {}) => {
        logDebug('[sis:createBulkFiles] Creating bulk files', { fileTypes, outputPath, createZip });
        try {
            const createdFiles = await sisImports.createBulkSISImport(
                fileTypes, rowCounts, outputPath, emailDomain, authProviderId, enrollmentOptions
            );

            let zipPath = null;
            if (createZip && createdFiles.length > 0) {
                const zip = new JSZip();

                for (const filePath of createdFiles) {
                    const fileName = path.basename(filePath);
                    const fileContent = fs.readFileSync(filePath, 'utf8');
                    zip.file(fileName, fileContent);
                }

                const zipContent = await zip.generateAsync({ type: 'nodebuffer' });
                zipPath = path.join(outputPath, 'sis_import_package.zip');
                fs.writeFileSync(zipPath, zipContent);
            }

            return { success: true, files: createdFiles.map(f => path.basename(f)), zipPath };
        } catch (error) {
            throw new Error(`Error creating bulk SIS files: ${error.message}`);
        }
    });

    // Create multiple configured SIS files with ZIP packaging
    ipcMain.handle('sis:createMultiFiles', async (event, fileConfigurations, outputPath) => {
        logDebug('[sis:createMultiFiles] Creating multi files', { count: fileConfigurations.length, outputPath });
        try {
            const createdFiles = [];

            for (const config of fileConfigurations) {
                const fileName = await sisImports.createSISImportFile(
                    config.fileType, config.rowCount, outputPath, config.emailDomain, config.authProviderId,
                    config.options.enrollmentOptions || {}, config.options.userOptions || {},
                    config.options.accountOptions || {}, config.options.termOptions || {},
                    config.options.courseOptions || {}, config.options.sectionOptions || {},
                    config.options.groupCategoryOptions || {}, config.options.groupOptions || {},
                    config.options.groupMembershipOptions || {}, config.options.adminOptions || {},
                    config.options.loginOptions || {}, config.options.crossListingOptions || {},
                    config.options.userObserverOptions || {}, config.options.changeSisIdOptions || {},
                    config.options.differentiationTagSetOptions || {}, config.options.differentiationTagOptions || {},
                    config.options.differentiationTagMembershipOptions || {}
                );
                createdFiles.push(fileName);
            }

            const zip = new JSZip();
            for (const filePath of createdFiles) {
                const fileName = path.basename(filePath);
                const fileContent = fs.readFileSync(filePath, 'utf8');
                zip.file(fileName, fileContent);
            }

            const zipContent = await zip.generateAsync({ type: 'nodebuffer' });
            const zipPath = path.join(outputPath, 'sis_multi_import_package.zip');
            fs.writeFileSync(zipPath, zipContent);

            return { success: true, files: createdFiles.map(f => path.basename(f)), zipPath };
        } catch (error) {
            throw new Error(`Error creating multi SIS files: ${error.message}`);
        }
    });
}

module.exports = { registerSISHandlers };
