function sisImportsTemplate(e) {
    switch (e.target.id) {
        case 'create-single-sis-file':
            createSingleSISFile(e);
            break;
        case 'create-bulk-sis-files':
            createBulkSISFiles(e);
            break;
        default:
            break;
    }
}

// Helper function to create consistent error display for user search operations
function createErrorCard(failedItems, operationType = 'user search') {
    if (!failedItems || failedItems.length === 0) return '';

    const errorCount = failedItems.length;
    const errorText = errorCount === 1 ? 'error' : 'errors';
    const errorCardId = `error-details-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    let errorHTML = `
        <div class="card mt-3">
            <div class="card-header" style="cursor: pointer;" data-bs-toggle="collapse" data-bs-target="#${errorCardId}" aria-expanded="false">
                <div class="d-flex justify-content-between align-items-center">
                    <h6 class="mb-0 text-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Error Details (${errorCount} ${errorText})
                    </h6>
                    <i class="fas fa-chevron-down"></i>
                </div>
            </div>
            <div class="collapse" id="${errorCardId}">
                <div class="card-body">
    `;

    failedItems.forEach((failedItem, index) => {
        const errorTitle = failedItem.isNetworkError ? 'Network Error' :
            failedItem.status ? `HTTP Error ${failedItem.status}` : 'Unknown Error';

        let errorDetail = '';
        if (failedItem.isNetworkError) {
            if (failedItem.reason.includes('ENOTFOUND') || failedItem.reason.includes('getaddrinfo')) {
                errorDetail = 'Cannot reach the server. Check your Canvas domain - make sure it\'s spelled correctly and doesn\'t include "https://".';
            } else {
                errorDetail = 'Network connection problem. Check your internet connection and Canvas domain.';
            }
        } else if (failedItem.status) {
            switch (failedItem.status) {
                case 401:
                    errorDetail = 'Authentication failed. Check your API token.';
                    break;
                case 403:
                    errorDetail = 'Access forbidden. Check permissions or wait if rate limited.';
                    break;
                case 404:
                    errorDetail = 'User not found or Canvas domain incorrect.';
                    break;
                case 422:
                    errorDetail = 'Invalid search parameters. Check your search term.';
                    break;
                default:
                    errorDetail = `Server returned error ${failedItem.status}.`;
                    break;
            }
        } else {
            errorDetail = 'Unknown error occurred during user search.';
        }

        const itemLabel = errorCount === 1 ? '' : ` - Search ${index + 1}`;
        errorHTML += `
            <div class="border-start border-danger border-3 ps-3 mb-3">
                <h6 class="text-danger mb-2">${errorTitle}${itemLabel}</h6>
                <p class="mb-2"><strong>Error:</strong> <code>${failedItem.reason || 'Unknown error'}</code></p>
                <p class="mb-0 text-muted">${errorDetail}</p>
            </div>
        `;
    });

    errorHTML += `
                </div>
            </div>
        </div>
    `;

    return errorHTML;
}

async function createSingleSISFile(e) {
    hideEndpoints(e);

    const eContent = document.querySelector('#endpoint-content');
    let createSISForm = eContent.querySelector('#create-single-sis-form');

    if (!createSISForm) {
        createSISForm = document.createElement('form');
        createSISForm.id = 'create-single-sis-form';
        createSISForm.innerHTML = `
            <div>
                <h3>Create Single SIS Import File</h3>
                <p class="text-muted">Generate a single CSV file for SIS import with random sample data, or build a collection of files for zip export.</p>
            </div>
            <div class="row mb-3">
                <div class="col-12">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="multi-file-mode">
                        <label class="form-check-label" for="multi-file-mode">
                            <strong>Multi-file mode:</strong> Add multiple file configurations to generate a zip package
                        </label>
                    </div>
                </div>
            </div>
            <div class="row mb-3">
                <div class="col-3">
                    <label for="file-type" class="form-label">File Type</label>
                    <select id="file-type" class="form-select" required>
                        <option value="">Select file type...</option>
                        <option value="users">Users</option>
                        <option value="accounts">Accounts</option>
                        <option value="terms">Terms</option>
                        <option value="courses">Courses</option>
                        <option value="sections">Sections</option>
                        <option value="enrollments">Enrollments</option>
                        <option value="group_categories">Group Categories</option>
                        <option value="groups">Groups</option>
                        <option value="group_memberships">Group Memberships</option>
                        <option value="differentiation_tag_sets">Differentiation Tag Sets</option>
                        <option value="differentiation_tags">Differentiation Tags</option>
                        <option value="differentiation_tag_membership">Differentiation Tag Membership</option>
                        <option value="xlists">Cross-listings (Xlists)</option>
                        <option value="user_observers">User Observers</option>
                        <option value="logins">Logins</option>
                        <option value="change_sis_id">Change SIS ID</option>
                        <option value="admins">Admins</option>
                    </select>
                </div>
                <div class="col-4">
                    <label for="row-count" class="form-label">Number of Rows</label>
                    <input type="number" id="row-count" class="form-control" min="1" max="10000" value="1" required>
                    <div class="form-text">How many data rows to generate (1-10,000)</div>
                </div>
                <div class="col-3" id="email-domain-group">
                    <label for="email-domain" class="form-label">Email Domain</label>
                    <input type="text" id="email-domain" class="form-control" value="@instructure.com" placeholder="@instructure.com">
                    <div class="form-text">Domain for generated email addresses</div>
                </div>
            </div>
            
            <!-- CSV Field Options Section -->
            <div class="row mb-3" id="csv-options-section" style="display: none;">
                <div class="col-12 mb-3">
                    <h5 class="text-primary">CSV Field Options</h5>
                    <p class="text-muted small">Select fields to customize for your CSV. Required fields will be auto-generated if not specified.</p>
                    <div class="alert alert-info py-2 mb-3" id="user-search-help" style="display: none;">
                        <small><strong>💡 Auto-populate tip:</strong> When working with Users, enter a user identifier in the search field below and use the 'Search Users' button to automatically populate available fields, or use 'Randomize' to fill required fields with sample data.</small>
                    </div>
                </div>
                
                <!-- Field Customization Card -->
                <div style="padding-left: 0; padding-right: 0;" class="card mt-3" id="field-customization-card">
                    <div class="card-header" style="cursor: pointer;" id="field-customization-header">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-0">Customize Fields</h6>
                                <small class="text-muted">Click to expand field customization options</small>
                            </div>
                            <i class="fas fa-chevron-down" id="field-toggle-icon"></i>
                        </div>
                    </div>
                    <div class="collapse" id="field-customization-body">
                        <div class="card-body p-3">
                            <!-- Search and Controls -->
                            <div class="row g-2 mb-3">
                                <div class="col-md-6">
                                    <label for="user-search-input" class="form-label small fw-bold">Search Users</label>
                                    <input type="text" id="user-search-input" class="form-control form-control-sm" placeholder="Enter User ID, Login ID, Email, etc." style="display: none;">
                                    
                                    <label for="account-search-input" class="form-label small fw-bold">Search Accounts</label>
                                    <input type="text" id="account-search-input" class="form-control form-control-sm" placeholder="Enter Canvas Account ID" style="display: none;">
                                    
                                    <label for="terms-search-input" class="form-label small fw-bold">Search Terms</label>
                                    <input type="text" id="terms-search-input" class="form-control form-control-sm" placeholder="Enter Canvas Term ID" style="display: none;">
                                </div>
                                <div class="col-md-6 d-flex align-items-end gap-2">
                                    <button type="button" class="btn btn-outline-primary btn-sm" id="search-users-btn" style="display: none;">
                                        <i class="fas fa-search"></i> Search Users
                                    </button>
                                    <button type="button" class="btn btn-outline-primary btn-sm" id="search-accounts-btn" style="display: none;">
                                        <i class="fas fa-search"></i> Search Accounts
                                    </button>
                                    <button type="button" class="btn btn-outline-primary btn-sm" id="search-terms-btn" style="display: none;">
                                        <i class="fas fa-search"></i> Search Terms
                                    </button>
                                    <button type="button" class="btn btn-outline-secondary btn-sm" id="randomize-fields-btn">
                                        <i class="fas fa-random"></i> Randomize
                                    </button>
                                    <button type="button" class="btn btn-outline-danger btn-sm" id="clear-all-fields-btn">Clear All</button>
                                </div>
                            </div>
                            <div id="field-inputs-container">
                                <!-- Field inputs will be dynamically generated here -->
                            </div>
                            <div id="user-search-error-container" class="mt-3" style="display: none;">
                                <!-- User search error cards will be displayed here -->
                            </div>
                            <div id="account-search-error-container" class="mt-3" style="display: none;">
                                <!-- Account search error cards will be displayed here -->
                            </div>
                            <div id="terms-search-error-container" class="mt-3" style="display: none;">
                                <!-- Terms search error cards will be displayed here -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row mb-3">
                <div class="col-12">
                    <label for="output-path" class="form-label">Output Folder</label>
                    <div class="input-group">
                        <input type="text" id="output-path" class="form-control" placeholder="Select output folder..." readonly>
                        <button type="button" id="browse-folder" class="btn btn-outline-secondary">Browse</button>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-12">
                    <button type="submit" id="generate-single-file" class="btn btn-primary" disabled>Generate CSV File</button>
                    <button type="button" id="add-to-list" class="btn btn-success ms-2" style="display: none;" disabled>Add to List</button>
                    <button type="button" id="preview-data" class="btn btn-outline-info ms-2">Preview Sample Data</button>
                    <button type="button" id="generate-zip-package" class="btn btn-warning ms-2" style="display: none;">Generate Zip Package</button>
                    <button type="button" id="clear-file-list" class="btn btn-outline-danger ms-2" style="display: none;">Clear List</button>
                </div>
            </div>
            <div id="file-list-container" class="mt-4" style="display: none;">
                <h5>Files to Generate</h5>
                <div id="file-list" class="border rounded p-3 bg-light">
                    <p class="text-muted mb-0">No files added yet. Configure a file above and click "Add to List".</p>
                </div>
                <div class="mt-2">
                    <small class="text-muted">Files will be generated and packaged into a zip file when you click "Generate Zip Package".</small>
                </div>
            </div>
            <div id="preview-container" class="mt-4" style="display: none;">
                <h5>Preview (First 5 Rows)</h5>
                <pre id="preview-content" class="bg-light p-3 border rounded" style="max-height: 300px; overflow-y: auto;"></pre>
            </div>
            <div id="result-container" class="mt-4" style="display: none;">
                <div id="result-message" class="alert"></div>
            </div>
        `;
        eContent.appendChild(createSISForm);
    } else {
        // Form already exists, just show it
        createSISForm.hidden = false;
    }

    // Event listeners (moved outside the if block so they work for both new and existing forms)
    if (!createSISForm.hasAttribute('data-listeners-added')) {
        document.getElementById('browse-folder').addEventListener('click', async () => {
            const result = await window.electronAPI.selectFolder();
            if (result) {
                document.getElementById('output-path').value = result;
                validateForm(); // Check if form is complete after folder selection
            }
        });

        // Function to validate form and enable/disable generate button
        function validateForm() {
            const fileType = document.getElementById('file-type').value;
            const outputPath = document.getElementById('output-path').value.trim();
            const generateBtn = document.getElementById('generate-single-file');
            const addToListBtn = document.getElementById('add-to-list');

            const isValid = fileType && outputPath;

            // Enable/disable buttons based on validation
            if (generateBtn) generateBtn.disabled = !isValid;
            if (addToListBtn) addToListBtn.disabled = !isValid;

            // Add visual feedback
            const outputPathInput = document.getElementById('output-path');
            if (outputPath) {
                outputPathInput.classList.remove('is-invalid');
                outputPathInput.classList.add('is-valid');
            } else {
                outputPathInput.classList.remove('is-valid');
                if (fileType) { // Only show as invalid if user has selected a file type
                    outputPathInput.classList.add('is-invalid');
                }
            }
        }

        // Multi-file mode toggle
        let fileConfigurations = []; // Store file configurations for multi-file mode

        document.getElementById('multi-file-mode').addEventListener('change', (e) => {
            const isMultiMode = e.target.checked;
            const generateSingleBtn = document.getElementById('generate-single-file');
            const addToListBtn = document.getElementById('add-to-list');
            const generateZipBtn = document.getElementById('generate-zip-package');
            const clearListBtn = document.getElementById('clear-file-list');
            const fileListContainer = document.getElementById('file-list-container');

            if (isMultiMode) {
                generateSingleBtn.style.display = 'none';
                addToListBtn.style.display = 'inline-block';
                generateZipBtn.style.display = 'inline-block';
                clearListBtn.style.display = 'inline-block';
                fileListContainer.style.display = 'block';
            } else {
                generateSingleBtn.style.display = 'inline-block';
                addToListBtn.style.display = 'none';
                generateZipBtn.style.display = 'none';
                clearListBtn.style.display = 'none';
                fileListContainer.style.display = 'none';
            }
        });

        // Add to list functionality
        document.getElementById('add-to-list').addEventListener('click', () => {
            const fileType = document.getElementById('file-type').value;
            const rowCount = parseInt(document.getElementById('row-count').value);
            // Only use email domain for 'users'; default for others
            const emailDomain = fileType === 'users'
                ? (document.getElementById('email-domain').value.trim() || '@instructure.com')
                : '@instructure.com';
            const authProviderId = ''; // Removed auth provider functionality

            if (!fileType) {
                showResult('Please select a file type first.', 'warning');
                return;
            }

            // Gather all the options (same logic as in preview/submit)
            const allOptions = gatherAllOptions(fileType);

            // Create configuration object
            const config = {
                id: Date.now(), // Simple unique ID
                fileType,
                rowCount,
                emailDomain,
                authProviderId,
                options: allOptions,
                displayName: getFileTypeDisplayName(fileType)
            };

            fileConfigurations.push(config);
            updateFileList();
            showResult(`Added ${config.displayName} file to list (${rowCount} rows)`, 'success');
        });

        // Clear file list
        document.getElementById('clear-file-list').addEventListener('click', () => {
            fileConfigurations = [];
            updateFileList();
            showResult('File list cleared', 'info');
        });

        // Generate zip package
        document.getElementById('generate-zip-package').addEventListener('click', async () => {
            if (fileConfigurations.length === 0) {
                showResult('Please add at least one file to the list first.', 'warning');
                return;
            }

            const outputPath = document.getElementById('output-path').value;
            if (!outputPath) {
                showResult('Please select an output folder.', 'warning');
                return;
            }

            try {
                const button = document.getElementById('generate-zip-package');
                button.disabled = true;
                button.textContent = 'Generating...';

                const result = await window.electronAPI.createMultiSISFiles(fileConfigurations, outputPath);
                showResult(`Successfully created ${result.files.length} files and zip package at ${result.zipPath}`, 'success');

                button.disabled = false;
                button.textContent = 'Generate Zip Package';
            } catch (error) {
                showResult(`Error creating files: ${error.message}`, 'danger');
                document.getElementById('generate-zip-package').disabled = false;
                document.getElementById('generate-zip-package').textContent = 'Generate Zip Package';
            }
        });

        function updateFileList() {
            const fileList = document.getElementById('file-list');

            if (fileConfigurations.length === 0) {
                fileList.innerHTML = '<p class="text-muted mb-0">No files added yet. Configure a file above and click "Add to List".</p>';
                return;
            }

            const listItems = fileConfigurations.map(config => `
                <div class="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2">
                    <div>
                        <strong>${config.displayName}</strong> - ${config.rowCount} rows
                        <br><small class="text-muted">Email: ${config.emailDomain}</small>
                    </div>
                    <button type="button" class="btn btn-sm btn-outline-danger remove-file-btn" data-file-id="${config.id}">Remove</button>
                </div>
            `).join('');

            fileList.innerHTML = listItems;
        }

        // Add event delegation for remove buttons
        document.getElementById('file-list').addEventListener('click', (event) => {
            if (event.target.classList.contains('remove-file-btn')) {
                const fileId = parseInt(event.target.getAttribute('data-file-id'));
                fileConfigurations = fileConfigurations.filter(config => config.id !== fileId);
                updateFileList();
                showResult('File removed from list', 'info');
            }
        });

        function getFileTypeDisplayName(fileType) {
            const typeMap = {
                'users': 'Users',
                'accounts': 'Accounts',
                'terms': 'Terms',
                'courses': 'Courses',
                'sections': 'Sections',
                'enrollments': 'Enrollments',
                'group_categories': 'Group Categories',
                'groups': 'Groups',
                'group_memberships': 'Group Memberships',
                'differentiation_tag_sets': 'Differentiation Tag Sets',
                'differentiation_tags': 'Differentiation Tags',
                'differentiation_tag_membership': 'Differentiation Tag Membership',
                'xlists': 'Cross-listings (Xlists)',
                'user_observers': 'User Observers',
                'logins': 'Logins',
                'change_sis_id': 'Change SIS ID',
                'admins': 'Admins'
            };
            return typeMap[fileType] || fileType;
        }

        function gatherAllOptions(fileType) {
            // Build options with file-type-aware special mappings where generators expect different names
            const options = {};

            // Maps for special cases
            const specialCoursesMap = {
                course_format: 'specificFormat',
                blueprint_course_id: 'specificBlueprintId',
                grade_passback_setting: 'specificGradePassback',
                homeroom_course: 'specificHomeroom',
            };
            const specialUsersMap = {
                authentication_provider_id: 'specificAuthProviderId',
            };
            const specialLoginsMap = {
                authentication_provider_id: 'specificAuthProviderId',
                existing_canvas_user_id: 'specificCanvasUserId',
            };
            const specialXlistsMap = {
                xlist_course_id: 'specificCourseId',
            };

            Object.entries(selectedFields).forEach(([fieldKey, fieldValue]) => {
                let optionKey;
                if (fileType === 'courses' && specialCoursesMap[fieldKey]) {
                    optionKey = specialCoursesMap[fieldKey];
                } else if (fileType === 'users' && specialUsersMap[fieldKey]) {
                    optionKey = specialUsersMap[fieldKey];
                } else if (fileType === 'logins' && specialLoginsMap[fieldKey]) {
                    optionKey = specialLoginsMap[fieldKey];
                } else if (fileType === 'xlists' && specialXlistsMap[fieldKey]) {
                    optionKey = specialXlistsMap[fieldKey];
                } else {
                    // Default conversion: snake_case -> specificCamelCase
                    optionKey = `specific${fieldKey
                        .replace(/_(.)/g, (_, letter) => letter.toUpperCase())
                        .replace(/^([a-z])/, (m, c) => c.toUpperCase())}`;
                }
                options[optionKey] = fieldValue;
            });

            // For courses: if account_id not explicitly provided, force blank instead of random generation
            // (Random generation normally occurs when the generator sees the key absent. We send empty string to override.)
            if (fileType === 'courses' && !('account_id' in selectedFields)) {
                // Match the auto-mapped key name that would have been created for account_id
                options.specificAccountId = '';
            }

            // For users: ensure common fields that might be missing are explicitly set to blank
            // This prevents random generation for fields not returned by Canvas API
            if (fileType === 'users') {
                const commonUserFields = [
                    'first_name', 'last_name', 'full_name', 'sortable_name', 'short_name',
                    'email', 'pronouns', 'integration_id', 'ssha_password',
                    'declared_user_type', 'canvas_password_notification', 'home_account'
                ];
                commonUserFields.forEach(field => {
                    if (!(field in selectedFields)) {
                        const optionKey = `specific${field
                            .replace(/_(.)/g, (_, letter) => letter.toUpperCase())
                            .replace(/^([a-z])/, (m, c) => c.toUpperCase())}`;
                        options[optionKey] = '';
                    }
                });
            }

            // Special mapping for change_sis_id generator options
            let changeSisIdOptions = {};
            if (fileType === 'change_sis_id') {
                if (selectedFields.old_id) changeSisIdOptions.specificOldId = selectedFields.old_id;
                if (selectedFields.new_id) changeSisIdOptions.specificNewId = selectedFields.new_id;
                if (selectedFields.type) changeSisIdOptions.specificType = selectedFields.type;
            }

            // Handle terms with overrides specially
            let termOptionsWithOverrides = {};
            if (fileType === 'terms') {
                termOptionsWithOverrides = { ...options };

                // If we have override data, prepare it for the CSV generator
                if (selectedFields._termOverrideCount && selectedFields._termBaseData) {
                    termOptionsWithOverrides._termOverrideCount = selectedFields._termOverrideCount;
                    termOptionsWithOverrides._termBaseData = selectedFields._termBaseData;

                    // Map override data to expected format
                    for (let i = 0; i < selectedFields._termOverrideCount; i++) {
                        if (selectedFields[`override-${i}-enrollment-type`]) {
                            termOptionsWithOverrides[`specificOverride${i}EnrollmentType`] = selectedFields[`override-${i}-enrollment-type`];
                        }
                        if (selectedFields[`override-${i}-start-date`]) {
                            termOptionsWithOverrides[`specificOverride${i}StartDate`] = selectedFields[`override-${i}-start-date`];
                        }
                        if (selectedFields[`override-${i}-end-date`]) {
                            termOptionsWithOverrides[`specificOverride${i}EndDate`] = selectedFields[`override-${i}-end-date`];
                        }
                    }
                }
            }

            return {
                // Core types
                userOptions: fileType === 'users' ? options : {},
                accountOptions: fileType === 'accounts' ? options : {},
                termOptions: fileType === 'terms' ? termOptionsWithOverrides : {},
                courseOptions: fileType === 'courses' ? options : {},
                sectionOptions: fileType === 'sections' ? options : {},
                enrollmentOptions: fileType === 'enrollments' ? options : {},
                // Groups
                groupCategoryOptions: fileType === 'group_categories' ? options : {},
                groupOptions: fileType === 'groups' ? options : {},
                groupMembershipOptions: fileType === 'group_memberships' ? options : {},
                // Admins
                adminOptions: fileType === 'admins' ? options : {},
                // Logins
                loginOptions: fileType === 'logins' ? options : {},
                // Cross listings
                crossListingOptions: fileType === 'xlists' ? options : {},
                // Observers
                userObserverOptions: fileType === 'user_observers' ? options : {},
                // Differentiation tags
                differentiationTagSetOptions: fileType === 'differentiation_tag_sets' ? options : {},
                differentiationTagOptions: fileType === 'differentiation_tags' ? options : {},
                differentiationTagMembershipOptions: fileType === 'differentiation_tag_membership' ? options : {},
                // Change SIS ID
                changeSisIdOptions
            };
        }

        // Show/hide CSV options based on file type
        document.getElementById('file-type').addEventListener('change', (e) => {
            const csvOptionsSection = document.getElementById('csv-options-section');
            const userSearchHelp = document.getElementById('user-search-help');

            if (e.target.value) {
                csvOptionsSection.style.display = 'block';
                updateFieldInputs(e.target.value);

                // Show user search help only for 'users' file type
                if (userSearchHelp) {
                    userSearchHelp.style.display = (e.target.value === 'users') ? 'block' : 'none';
                }
            } else {
                csvOptionsSection.style.display = 'none';
                if (userSearchHelp) userSearchHelp.style.display = 'none';
            }

            // Show email domain only for 'users'
            const emailGroup = document.getElementById('email-domain-group');
            if (emailGroup) emailGroup.style.display = (e.target.value === 'users') ? 'block' : 'none';

            // updateAddButtonState() removed - not needed with new UI

            // Validate form after file type change
            validateForm();
        });

        // Get required fields for each file type based on Canvas SIS CSV documentation
        function getRequiredFields(fileType) {
            const requiredFieldsMap = {
                'users': ['user_id', 'login_id', 'status'],
                'accounts': ['account_id', 'parent_account_id', 'name', 'status'],
                'terms': ['term_id', 'name', 'status'],
                'courses': ['course_id', 'short_name', 'long_name', 'status'],
                'sections': ['section_id', 'course_id', 'name', 'status'],
                'enrollments': ['course_id', 'user_id', 'role', 'status'], // section_id OR course_id required
                'groups': ['group_id', 'name', 'status'],
                'group_categories': ['group_category_id', 'category_name', 'status'],
                'admins': ['user_id', 'account_id', 'role', 'status'],
                'group_memberships': ['group_id', 'user_id', 'status'],
                'logins': ['user_id', 'login_id', 'existing_user_id'], // One of existing_user_id, existing_integration_id, or existing_canvas_user_id required
                'change_sis_id': ['old_id', 'new_id', 'type'], // old_id OR old_integration_id required, new_id OR new_integration_id required
                'differentiation_tag_sets': ['tag_set_id', 'course_id', 'set_name', 'status'],
                'differentiation_tags': ['tag_id', 'name', 'status'], // tag_set_id OR course_id required
                'differentiation_tag_membership': ['tag_id', 'user_id', 'status'],
                'xlists': ['xlist_course_id', 'section_id', 'status'],
                'user_observers': ['observer_id', 'student_id', 'status']
            };

            return requiredFieldsMap[fileType] || [];
        }

        // Function to randomize only required fields based on file type
        function randomizeRequiredFields(fileType) {
            const requiredFields = getRequiredFields(fileType);
            const fieldInputs = document.querySelectorAll('#field-inputs-container input.field-input');

            fieldInputs.forEach(input => {
                const fieldName = input.getAttribute('data-field');
                if (requiredFields.includes(fieldName)) {
                    const randomValue = generateRandomValue(fieldName, fileType);
                    input.value = randomValue;
                    // Also update selectedFields object so preview works
                    selectedFields[fieldName] = randomValue;
                }
            });
        }

        // Generate random values based on field type
        function generateRandomValue(fieldName, fileType) {
            const randomId = () => Math.random().toString(36).substr(2, 8).toUpperCase();
            const randomNumber = () => Math.floor(Math.random() * 90000) + 10000;

            switch (fieldName) {
                case 'user_id':
                case 'account_id':
                case 'term_id':
                case 'course_id':
                case 'section_id':
                case 'group_id':
                case 'group_category_id':
                case 'existing_user_id':
                case 'old_id':
                case 'new_id':
                case 'tag_set_id':
                case 'tag_id':
                case 'observer_id':
                case 'student_id':
                case 'xlist_course_id':
                case 'temporary_enrollment_source_user_id':
                    return `${fieldName.replace('_', '').toUpperCase()}${randomNumber()}`;

                case 'login_id':
                    return `user${randomNumber()}@example.edu`;

                case 'name':
                case 'short_name':
                case 'long_name':
                case 'category_name':
                    const names = {
                        'users': ['Sample User', 'Test Student', 'Demo Teacher'],
                        'accounts': ['Sample Account', 'Test Department', 'Demo Division'],
                        'terms': ['Fall 2024', 'Spring 2025', 'Summer 2025'],
                        'courses': fileType === 'courses' && fieldName === 'long_name' ?
                            ['Introduction to Computer Science', 'Advanced Mathematics', 'English Literature'] :
                            ['CS101', 'MATH201', 'ENG301'],
                        'sections': ['Section 001', 'Section 002', 'Section 003'],
                        'groups': ['Study Group A', 'Project Team B', 'Lab Group C'],
                        'group_categories': ['Study Groups', 'Project Teams', 'Lab Groups']
                    };
                    const nameArray = names[fileType] || names['users'];
                    return nameArray[Math.floor(Math.random() * nameArray.length)];

                case 'status':
                    const statusOptions = {
                        'users': ['active', 'suspended'],
                        'accounts': ['active'],
                        'terms': ['active'],
                        'courses': ['active', 'published'],
                        'sections': ['active'],
                        'enrollments': ['active', 'inactive'],
                        'groups': ['available'],
                        'group_categories': ['active'],
                        'admins': ['active'],
                        'group_memberships': ['accepted'],
                        'logins': ['active'],
                        'differentiation_tag_sets': ['active'],
                        'differentiation_tags': ['available'],
                        'differentiation_tag_membership': ['accepted'],
                        'xlists': ['active'],
                        'user_observers': ['active']
                    };
                    const options = statusOptions[fileType] || ['active'];
                    return options[Math.floor(Math.random() * options.length)];

                case 'role':
                    if (fileType === 'enrollments') {
                        const roles = ['student', 'teacher', 'ta', 'observer', 'designer'];
                        return roles[Math.floor(Math.random() * roles.length)];
                    } else if (fileType === 'admins') {
                        return 'AccountAdmin';
                    }
                    return 'student';

                case 'parent_account_id':
                    // Can be blank for root account
                    return Math.random() > 0.5 ? '' : `ACCOUNT${randomNumber()}`;

                case 'type':
                    if (fileType === 'change_sis_id') {
                        const types = ['user', 'course', 'section', 'account', 'term'];
                        return types[Math.floor(Math.random() * types.length)];
                    }
                    return 'user';

                case 'date_override_enrollment_type':
                    const enrollmentTypes = ['StudentEnrollment', 'TeacherEnrollment', 'TaEnrollment', 'DesignerEnrollment'];
                    return enrollmentTypes[Math.floor(Math.random() * enrollmentTypes.length)];

                case 'notify':
                case 'limit_section_privileges':
                    return Math.random() > 0.5 ? 'true' : 'false';

                case 'start_date':
                case 'end_date':
                    const date = new Date();
                    date.setFullYear(date.getFullYear() + (fieldName === 'start_date' ? 0 : 1));
                    return date.toISOString().slice(0, 19).replace('T', ' ');

                case 'set_name':
                    const setNames = ['Study Groups', 'Project Teams', 'Lab Groups', 'Discussion Groups'];
                    return setNames[Math.floor(Math.random() * setNames.length)];

                default:
                    return `sample_${randomId()}`;
            }
        }

        function updateFieldInputs(fileType) {
            const fieldInputsContainer = document.getElementById('field-inputs-container');
            const searchUsersBtn = document.getElementById('search-users-btn');

            if (!fieldInputsContainer) {
                console.error('field-inputs-container element not found!');
                return;
            }

            // Clear existing inputs and reset selections
            fieldInputsContainer.innerHTML = '';
            selectedFields = {}; // Reset selections when file type changes

            // Show/hide search controls based on file type
            const searchInput = document.getElementById('user-search-input');
            const searchAccountsBtn = document.getElementById('search-accounts-btn');
            const searchAccountInput = document.getElementById('account-search-input');

            if (searchUsersBtn && searchInput) {
                const isUsersType = (fileType === 'users');
                searchUsersBtn.style.display = isUsersType ? 'inline-block' : 'none';
                searchInput.style.display = isUsersType ? 'block' : 'none';
                if (searchInput.parentElement) {
                    searchInput.parentElement.querySelector('label[for="user-search-input"]').style.display = isUsersType ? 'block' : 'none';
                }
            }

            if (searchAccountsBtn && searchAccountInput) {
                const isAccountsType = (fileType === 'accounts');
                searchAccountsBtn.style.display = isAccountsType ? 'inline-block' : 'none';
                searchAccountInput.style.display = isAccountsType ? 'block' : 'none';
                if (searchAccountInput.parentElement) {
                    searchAccountInput.parentElement.querySelector('label[for="account-search-input"]').style.display = isAccountsType ? 'block' : 'none';
                }
            }

            const searchTermsBtn = document.getElementById('search-terms-btn');
            const searchTermsInput = document.getElementById('terms-search-input');
            if (searchTermsBtn && searchTermsInput) {
                const isTermsType = (fileType === 'terms');
                searchTermsBtn.style.display = isTermsType ? 'inline-block' : 'none';
                searchTermsInput.style.display = isTermsType ? 'block' : 'none';
                if (searchTermsInput.parentElement) {
                    searchTermsInput.parentElement.querySelector('label[for="terms-search-input"]').style.display = isTermsType ? 'block' : 'none';
                }
            }

            // Define field options for each CSV type (based on official Canvas documentation)
            const fieldOptions = {
                'users': [
                    { value: 'user_id', label: 'User ID', placeholder: 'e.g., U123456' },
                    { value: 'login_id', label: 'Login ID', placeholder: 'e.g., jsmith' },
                    { value: 'authentication_provider_id', label: 'Auth Provider ID', placeholder: 'e.g., google' },
                    { value: 'password', label: 'Password', placeholder: 'Leave empty for auto-generation' },
                    { value: 'ssha_password', label: 'SSHA Password', placeholder: 'Leave empty for auto-generation' },
                    { value: 'first_name', label: 'First Name', placeholder: 'e.g., John' },
                    { value: 'last_name', label: 'Last Name', placeholder: 'e.g., Doe' },
                    { value: 'full_name', label: 'Full Name', placeholder: 'e.g., John Doe' },
                    { value: 'sortable_name', label: 'Sortable Name', placeholder: 'e.g., Doe, John' },
                    { value: 'short_name', label: 'Short Name', placeholder: 'e.g., John' },
                    { value: 'email', label: 'Email', placeholder: 'e.g., john.doe@instructure.com' },
                    { value: 'status', label: 'Status', placeholder: 'active, deleted, suspended' },
                    { value: 'integration_id', label: 'Integration ID', placeholder: 'e.g., SIS_USER_123' },
                    { value: 'pronouns', label: 'Pronouns', placeholder: 'e.g., they/them' },
                    { value: 'declared_user_type', label: 'Declared User Type', placeholder: 'e.g., teacher, student' },
                    { value: 'canvas_password_notification', label: 'Canvas Password Notification', placeholder: 'true, false' },
                    { value: 'home_account', label: 'Home Account', placeholder: 'e.g., account_id' }
                ],
                'accounts': [
                    { value: 'account_id', label: 'Account ID', placeholder: 'e.g., A001' },
                    { value: 'parent_account_id', label: 'Parent Account ID', placeholder: 'e.g., A001' },
                    { value: 'name', label: 'Account Name', placeholder: 'e.g., Mathematics Department' },
                    { value: 'status', label: 'Status', placeholder: 'active, deleted' }
                ],
                'terms': [
                    { value: 'term_id', label: 'Term ID', placeholder: 'e.g., T001' },
                    { value: 'name', label: 'Term Name', placeholder: 'e.g., Fall 2024' },
                    { value: 'status', label: 'Status', placeholder: 'active, deleted' },
                    { value: 'integration_id', label: 'Integration ID', placeholder: 'e.g., SIS_TERM_123' },
                    { value: 'date_override_enrollment_type', label: 'Date Override Enrollment Type', placeholder: 'StudentEnrollment, TeacherEnrollment, TaEnrollment, DesignerEnrollment' },
                    { value: 'start_date', label: 'Start Date', placeholder: 'e.g., 2013-1-03 00:00:00' },
                    { value: 'end_date', label: 'End Date', placeholder: 'e.g., 2013-05-03 00:00:00-06:00' }
                ],
                'courses': [
                    { value: 'course_id', label: 'Course ID', placeholder: 'e.g., E411208' },
                    { value: 'short_name', label: 'Short Name', placeholder: 'e.g., ENG115' },
                    { value: 'long_name', label: 'Long Name', placeholder: 'e.g., English 115: Intro to English' },
                    { value: 'account_id', label: 'Account ID', placeholder: 'e.g., A002' },
                    { value: 'term_id', label: 'Term ID', placeholder: 'e.g., Fall2011' },
                    { value: 'status', label: 'Status', placeholder: 'active, deleted, completed, published' },
                    { value: 'integration_id', label: 'Integration ID', placeholder: 'e.g., SIS_COURSE_123' },
                    { value: 'start_date', label: 'Start Date', placeholder: 'e.g., 2013-01-03 00:00:00' },
                    { value: 'end_date', label: 'End Date', placeholder: 'e.g., 2013-05-03 00:00:00-06:00' },
                    { value: 'course_format', label: 'Course Format', placeholder: 'on_campus, online, blended' },
                    { value: 'blueprint_course_id', label: 'Blueprint Course ID', placeholder: 'SIS ID of a Blueprint course or "dissociate"' },
                    { value: 'grade_passback_setting', label: 'Grade Passback Setting', placeholder: 'nightly_sync, not_set' },
                    { value: 'homeroom_course', label: 'Homeroom Course', placeholder: 'true, false' },
                    { value: 'friendly_name', label: 'Friendly Name', placeholder: 'Elementary-friendly course name' }
                ],
                'sections': [
                    { value: 'section_id', label: 'Section ID', placeholder: 'e.g., S001' },
                    { value: 'course_id', label: 'Course ID', placeholder: 'e.g., E411208' },
                    { value: 'name', label: 'Section Name', placeholder: 'e.g., Section 1' },
                    { value: 'status', label: 'Status', placeholder: 'active, deleted, completed' },
                    { value: 'start_date', label: 'Start Date', placeholder: 'e.g., 2013-1-03 00:00:00' },
                    { value: 'end_date', label: 'End Date', placeholder: 'e.g., 2013-05-03 00:00:00-06:00' },
                    { value: 'integration_id', label: 'Integration ID', placeholder: 'e.g., SIS_SEC_123' }
                ],
                'enrollments': [
                    { value: 'course_id', label: 'Course ID', placeholder: 'e.g., E411208' },
                    { value: 'user_id', label: 'User ID', placeholder: 'e.g., 01103' },
                    { value: 'role', label: 'Role', placeholder: 'student, teacher, ta, observer, designer' },
                    { value: 'section_id', label: 'Section ID', placeholder: 'e.g., 1B' },
                    { value: 'status', label: 'Status', placeholder: 'active, deleted, completed, inactive' },
                    { value: 'user_integration_id', label: 'User Integration ID', placeholder: 'e.g., SIS_USER_123' },
                    { value: 'role_id', label: 'Role ID', placeholder: 'e.g., CUSTOM_ROLE_123' },
                    { value: 'root_account', label: 'Root Account', placeholder: 'e.g., school.instructure.com' },
                    { value: 'start_date', label: 'Start Date', placeholder: 'e.g., 2013-1-03 00:00:00' },
                    { value: 'end_date', label: 'End Date', placeholder: 'e.g., 2013-05-03 00:00:00-06:00' },
                    { value: 'associated_user_id', label: 'Associated User ID', placeholder: 'e.g., observer parent user' },
                    { value: 'limit_section_privileges', label: 'Limit Section Privileges', placeholder: 'true, false' },
                    { value: 'notify', label: 'Notify', placeholder: 'true, false' },
                    { value: 'temporary_enrollment_source_user_id', label: 'Temporary Enrollment Source User ID', placeholder: 'Provider user ID for temporary enrollment' }
                ],
                'group_categories': [
                    { value: 'group_category_id', label: 'Group Category ID', placeholder: 'e.g., GC08' },
                    { value: 'account_id', label: 'Account ID', placeholder: 'e.g., A001' },
                    { value: 'course_id', label: 'Course ID', placeholder: 'e.g., course123' },
                    { value: 'category_name', label: 'Category Name', placeholder: 'e.g., First Group Category' },
                    { value: 'status', label: 'Status', placeholder: 'active, deleted' }
                ],
                'groups': [
                    { value: 'group_id', label: 'Group ID', placeholder: 'e.g., G411208' },
                    { value: 'group_category_id', label: 'Group Category ID', placeholder: 'e.g., GC08' },
                    { value: 'account_id', label: 'Account ID', placeholder: 'e.g., A001' },
                    { value: 'course_id', label: 'Course ID', placeholder: 'e.g., course123' },
                    { value: 'name', label: 'Group Name', placeholder: 'e.g., Group1' },
                    { value: 'status', label: 'Status', placeholder: 'available, closed, completed, deleted' }
                ],
                'group_memberships': [
                    { value: 'group_id', label: 'Group ID', placeholder: 'e.g., G411208' },
                    { value: 'user_id', label: 'User ID', placeholder: 'e.g., U001' },
                    { value: 'status', label: 'Status', placeholder: 'accepted, deleted' }
                ],
                'admins': [
                    { value: 'user_id', label: 'User ID', placeholder: 'e.g., E411208' },
                    { value: 'account_id', label: 'Account ID', placeholder: 'e.g., 01103' },
                    { value: 'role', label: 'Role', placeholder: 'e.g., AccountAdmin' },
                    { value: 'role_id', label: 'Role ID', placeholder: 'e.g., custom_role_id' },
                    { value: 'status', label: 'Status', placeholder: 'active, deleted' },
                    { value: 'root_account', label: 'Root Account', placeholder: 'Domain of account to search for user' }
                ],
                'logins': [
                    { value: 'user_id', label: 'User ID', placeholder: 'e.g., 01103' },
                    { value: 'integration_id', label: 'Integration ID', placeholder: 'Secondary unique identifier' },
                    { value: 'login_id', label: 'Login ID', placeholder: 'e.g., bsmith01' },
                    { value: 'password', label: 'Password', placeholder: 'Leave empty for auto-generation' },
                    { value: 'ssha_password', label: 'SSHA Password', placeholder: 'Pre-hashed SSHA password' },
                    { value: 'authentication_provider_id', label: 'Auth Provider ID', placeholder: 'e.g., google' },
                    { value: 'existing_user_id', label: 'Existing User ID', placeholder: 'e.g., existing_123' },
                    { value: 'existing_integration_id', label: 'Existing Integration ID', placeholder: 'e.g., existing_int_123' },
                    { value: 'existing_canvas_user_id', label: 'Existing Canvas User ID', placeholder: 'e.g., 98' },
                    { value: 'root_account', label: 'Root Account', placeholder: 'Domain of account to search for user' },
                    { value: 'email', label: 'Email', placeholder: 'e.g., bob.smith@instructure.com' }
                ],
                'xlists': [
                    { value: 'xlist_course_id', label: 'Cross-list Course ID', placeholder: 'e.g., E411208' },
                    { value: 'section_id', label: 'Section ID', placeholder: 'e.g., 1B' },
                    { value: 'status', label: 'Status', placeholder: 'active, deleted' }
                ],
                'user_observers': [
                    { value: 'observer_id', label: 'Observer ID', placeholder: 'e.g., u411208' },
                    { value: 'student_id', label: 'Student ID', placeholder: 'e.g., u411222' },
                    { value: 'status', label: 'Status', placeholder: 'active, deleted' }
                ],
                'change_sis_id': [
                    { value: 'old_id', label: 'Old ID', placeholder: 'e.g., u001' },
                    { value: 'new_id', label: 'New ID', placeholder: 'e.g., u001a' },
                    { value: 'old_integration_id', label: 'Old Integration ID', placeholder: 'e.g., integration01' },
                    { value: 'new_integration_id', label: 'New Integration ID', placeholder: 'e.g., int01' },
                    { value: 'type', label: 'Type', placeholder: 'user, course, section, account, term' }
                ],
                'differentiation_tag_sets': [
                    { value: 'tag_set_id', label: 'Tag Set ID', placeholder: 'e.g., TS08' },
                    { value: 'course_id', label: 'Course ID', placeholder: 'e.g., C001' },
                    { value: 'set_name', label: 'Set Name', placeholder: 'e.g., First Tag Set' },
                    { value: 'status', label: 'Status', placeholder: 'active, deleted' }
                ],
                'differentiation_tags': [
                    { value: 'tag_id', label: 'Tag ID', placeholder: 'e.g., T01' },
                    { value: 'tag_set_id', label: 'Tag Set ID', placeholder: 'e.g., TS08' },
                    { value: 'course_id', label: 'Course ID', placeholder: 'e.g., C001' },
                    { value: 'name', label: 'Tag Name', placeholder: 'e.g., Tag1' },
                    { value: 'status', label: 'Status', placeholder: 'available, deleted' }
                ],
                'differentiation_tag_membership': [
                    { value: 'tag_id', label: 'Tag ID', placeholder: 'e.g., T01' },
                    { value: 'user_id', label: 'User ID', placeholder: 'e.g., U001' },
                    { value: 'status', label: 'Status', placeholder: 'accepted, deleted' }
                ]
            };

            // Create inputs for the selected file type
            const options = fieldOptions[fileType] || [];
            if (options.length === 0) {
                fieldInputsContainer.innerHTML = '<p class="text-muted mb-0">No customizable fields available for this file type.</p>';
                return;
            }

            // Create a grid of input fields
            const requiredFields = getRequiredFields(fileType);
            const gridHtml = options.map((option, index) => {
                const isRequired = requiredFields.includes(option.value);
                const asterisk = isRequired ? ' *' : '';
                const requiredClass = isRequired ? 'required-field' : '';

                return `
                    <div class="col-4 mb-2">
                        <label for="field-${option.value}" class="form-label small fw-bold text-secondary">${option.label}${asterisk}</label>
                        <input type="text" 
                               id="field-${option.value}" 
                               class="form-control form-control-sm field-input ${requiredClass}" 
                               data-field="${option.value}"
                               placeholder="${option.placeholder}" 
                               value="">
                    </div>
                `;
            }).join('');

            fieldInputsContainer.innerHTML = `<div class="row">${gridHtml}</div>`;

            // Add custom CSS for required fields if not already added
            if (!document.getElementById('sis-required-fields-style')) {
                const style = document.createElement('style');
                style.id = 'sis-required-fields-style';
                style.textContent = `
                    .required-field {
                        border-left: 3px solid #dc3545 !important;
                    }
                    
                    .required-field:focus {
                        border-left-color: #dc3545 !important;
                        box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25) !important;
                    }
                    
                    .alert-success {
                        border-left: 4px solid #28a745;
                    }
                `;
                document.head.appendChild(style);
            }

            // Add event listeners to all field inputs
            addFieldInputListeners();
        }

        function addFieldInputListeners() {
            // Add event listeners to all field inputs
            document.querySelectorAll('.field-input').forEach(input => {
                input.addEventListener('input', (e) => {
                    const fieldName = e.target.dataset.field;
                    const fieldValue = e.target.value.trim();

                    if (fieldValue) {
                        selectedFields[fieldName] = fieldValue;
                        e.target.classList.add('border-success');
                        e.target.classList.remove('border-secondary');
                    } else {
                        delete selectedFields[fieldName];
                        e.target.classList.remove('border-success');
                        e.target.classList.add('border-secondary');
                    }
                });
            });
        }

        // renderFieldSummary function removed - not needed with direct input fields

        function addOrUpdateField(fieldKey, fieldValue) {
            if (fieldValue && fieldValue.trim()) {
                selectedFields[fieldKey] = fieldValue.trim();
            } else {
                delete selectedFields[fieldKey];
            }
            // renderFieldSummary and updateAddButtonState removed - not needed with new UI
        }

        // Field event handlers removed - now using direct input fields in collapsible card

        // Add search functionality for user fields (triggered after Add)
        async function searchAndPopulateUser(searchTerm, searchField) {
            if (!searchTerm || searchTerm.length < 2) return;

            const domain = document.querySelector('#domain')?.value;
            const token = document.querySelector('#token')?.value;
            const errorContainer = document.getElementById('user-search-error-container');

            // Clear any previous errors
            if (errorContainer) {
                errorContainer.style.display = 'none';
                errorContainer.innerHTML = '';
            }

            if (!domain || !token) {
                console.log('Domain or token not available for user search');
                showUserSearchResult('Please configure Canvas domain and API token first.', 'warning');
                return;
            }

            try {
                const result = await window.electronAPI.searchUsers(domain, token, searchTerm);

                if (result.success && result.users && result.users.length > 0) {
                    if (result.users.length === 1) {
                        // Single user found, auto-populate directly
                        populateUserFields(result.users[0], searchField);
                    } else {
                        // Multiple users found, show selection modal
                        showUserSelectionModal(result.users, searchField);
                    }
                } else {
                    // No user found
                    showUserSearchResult('No user found for the entered value.', 'warning');
                }
            } catch (error) {
                console.error('User search error:', error);

                // Format error for display
                const errorItem = {
                    id: 'user-search',
                    reason: error.message || 'Unknown error occurred',
                    isNetworkError: error.code === 'NETWORK_ERROR' || error.message?.includes('fetch') || error.message?.includes('ENOTFOUND'),
                    status: error.status || error.response?.status
                };

                // Show detailed error card
                if (errorContainer) {
                    errorContainer.innerHTML = createErrorCard([errorItem], 'user search');
                    errorContainer.style.display = 'block';
                }

                // Also show toast notification
                showUserSearchResult('User search failed. Check the error details below.', 'danger');
            }
        }

        // Helper function to populate user fields from Canvas user data
        function populateUserFields(user, excludeField) {
            // Map the Canvas user data to SIS fields with correct field mapping
            // Note: SIS users CSV only supports specific fields, not all Canvas user fields
            const userFieldMappings = {
                'user_id': user.sis_user_id || '',
                'login_id': user.login_id || '',
                'email': user.email || '',
                'password': user.password || '', // Password won't be returned by API
                'status': user.workflow_state || 'active',
                'authentication_provider_id': user.authentication_provider_id || '',
                'ssha_password': user.ssha_password || '',
                'integration_id': user.integration_id || '',
                'short_name': user.short_name || '',
                'first_name': user.first || '',
                'last_name': user.last || '',
                'full_name': user.name || '',
                'sortable_name': user.sortable_name || '',
                'pronouns': user.pronouns || '',
                'declared_user_type': user.declared_user_type || '',
                'canvas_password_notification': user.password_notification || '',
                'home_account': user.home_account_id || ''
            };

            // Always populate all fields to give explicit control over what should be blank vs random
            let fieldsWithValues = 0;
            Object.entries(userFieldMappings).forEach(([field, value]) => {
                if (field !== excludeField) {
                    // Use actual value if available, empty string if not
                    const finalValue = value && value.toString().trim() ? value : '';
                    selectedFields[field] = finalValue;

                    // Update the corresponding input field
                    const inputElement = document.getElementById(`field-${field}`);
                    if (inputElement) {
                        inputElement.value = finalValue;
                        inputElement.dataset.justPopulated = 'true'; // Prevent search loop

                        // Update visual styling
                        if (finalValue) {
                            inputElement.classList.add('border-success');
                            inputElement.classList.remove('border-secondary');
                            fieldsWithValues++;
                        } else {
                            inputElement.classList.remove('border-success');
                            inputElement.classList.add('border-secondary');
                        }
                    }
                }
            });

            // renderFieldSummary() removed - not needed with new UI

            // Show success message
            let message = `Found user: ${user.name}.`;
            if (fieldsWithValues > 0) {
                message += ` Auto-populated ${fieldsWithValues} fields with data.`;
            } else {
                message += ` No additional data available to populate.`;
            }

            showUserSearchResult(message, 'success');
        }

        // Show user search result message
        function showUserSearchResult(message, type) {
            // Create a temporary notification element
            const notification = document.createElement('div');
            notification.className = `alert alert-${type === 'success' ? 'success' : type === 'warning' ? 'warning' : type === 'info' ? 'info' : 'danger'} alert-dismissible fade show position-fixed`;
            notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
            notification.innerHTML = `
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            `;

            document.body.appendChild(notification);

            // Auto-remove after 3 seconds
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 3000);
        }

        // Add search functionality for account fields
        async function searchAndPopulateAccount(searchTerm, searchField) {
            if (!searchTerm || searchTerm.length < 1) return;

            const domain = document.querySelector('#domain')?.value;
            const token = document.querySelector('#token')?.value;
            const errorContainer = document.getElementById('account-search-error-container');

            // Clear any previous errors
            if (errorContainer) {
                errorContainer.style.display = 'none';
                errorContainer.innerHTML = '';
            }

            if (!domain || !token) {
                console.log('Domain or token not available for account search');
                showAccountSearchResult('Please configure Canvas domain and API token first.', 'warning');
                return;
            }

            try {
                const result = await window.electronAPI.searchAccounts(domain, token, searchTerm);

                if (result.success && result.accounts && result.accounts.length > 0) {
                    // Single account found, auto-populate directly
                    populateAccountFields(result.accounts[0], searchField);
                } else {
                    // No account found
                    showAccountSearchResult('No account found for the entered ID.', 'warning');
                }
            } catch (error) {
                console.error('Account search error:', error);

                // Format error for display
                const errorItem = {
                    id: 'account-search',
                    reason: error.message || 'Unknown error occurred',
                    isNetworkError: error.code === 'NETWORK_ERROR' || error.message?.includes('fetch') || error.message?.includes('ENOTFOUND'),
                    status: error.status || error.response?.status
                };

                // Show detailed error card
                if (errorContainer) {
                    errorContainer.innerHTML = createErrorCard([errorItem], 'account search');
                    errorContainer.style.display = 'block';
                }

                // Also show toast notification
                showAccountSearchResult('Account search failed. Check the error details below.', 'danger');
            }
        }

        // Helper function to populate account fields from Canvas account data
        function populateAccountFields(account, excludeField) {
            // Map the GraphQL account data to SIS fields based on the provided mapping
            const parentAccountId = account.parentAccountsConnection &&
                account.parentAccountsConnection.nodes &&
                account.parentAccountsConnection.nodes.length > 0
                ? account.parentAccountsConnection.nodes[0].sisId
                : '';

            const accountFieldMappings = {
                'account_id': account.sisId || '',
                'parent_account_id': parentAccountId,
                'name': account.name || '',
                'status': 'active'
            };

            // Always populate all fields to give explicit control over what should be blank vs random
            let fieldsWithValues = 0;
            Object.entries(accountFieldMappings).forEach(([field, value]) => {
                if (field !== excludeField) {
                    // Use actual value if available, empty string if not
                    const finalValue = value && value.toString().trim() ? value : '';
                    selectedFields[field] = finalValue;

                    // Update the corresponding input field
                    const inputElement = document.getElementById(`field-${field}`);
                    if (inputElement) {
                        inputElement.value = finalValue;
                        inputElement.dataset.justPopulated = 'true'; // Prevent search loop

                        // Update visual styling
                        if (finalValue) {
                            inputElement.classList.add('border-success');
                            inputElement.classList.remove('border-secondary');
                            fieldsWithValues++;
                        } else {
                            inputElement.classList.remove('border-success');
                            inputElement.classList.add('border-secondary');
                        }
                    }
                }
            });

            // Show success message
            let message = `Found account: ${account.name}.`;
            if (fieldsWithValues > 0) {
                message += ` Auto-populated ${fieldsWithValues} fields with data.`;
            } else {
                message += ` No additional data available to populate.`;
            }

            showAccountSearchResult(message, 'success');
        }

        // Show account search result message
        function showAccountSearchResult(message, type) {
            // Create a temporary notification element
            const notification = document.createElement('div');
            notification.className = `alert alert-${type === 'success' ? 'success' : type === 'warning' ? 'warning' : type === 'info' ? 'info' : 'danger'} alert-dismissible fade show position-fixed`;
            notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
            notification.innerHTML = `
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            `;

            document.body.appendChild(notification);

            // Auto-remove after 3 seconds
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 3000);
        }

        // Add search functionality for term fields
        async function searchAndPopulateTerms(searchTerm, searchField) {
            if (!searchTerm || searchTerm.length < 1) return;

            const domain = document.querySelector('#domain')?.value;
            const token = document.querySelector('#token')?.value;
            const errorContainer = document.getElementById('terms-search-error-container');

            // Clear any previous errors
            if (errorContainer) {
                errorContainer.style.display = 'none';
                errorContainer.innerHTML = '';
            }

            if (!domain || !token) {
                console.log('Domain or token not available for terms search');
                showTermsSearchResult('Please configure Canvas domain and API token first.', 'warning');
                return;
            }

            try {
                const result = await window.electronAPI.searchTerms(domain, token, searchTerm);

                if (result.success && result.terms && result.terms.length > 0) {
                    // Single term found, auto-populate directly
                    populateTermFields(result.terms[0], searchField);
                } else {
                    // No term found
                    showTermsSearchResult('No term found for the entered ID.', 'warning');
                }
            } catch (error) {
                console.error('Terms search error:', error);

                // Format error for display
                const errorItem = {
                    id: 'terms-search',
                    reason: error.message || 'Unknown error occurred',
                    isNetworkError: error.code === 'NETWORK_ERROR' || error.message?.includes('fetch') || error.message?.includes('ENOTFOUND'),
                    status: error.status || error.response?.status
                };

                // Show detailed error card
                if (errorContainer) {
                    errorContainer.innerHTML = createErrorCard([errorItem], 'terms search');
                    errorContainer.style.display = 'block';
                }

                // Also show toast notification
                showTermsSearchResult('Terms search failed. Check the error details below.', 'danger');
            }
        }

        // Helper function to populate term fields from Canvas term data
        function populateTermFields(term, excludeField) {
            // Map the Canvas term data to SIS fields based on the provided mapping
            const termFieldMappings = {
                'term_id': term.sis_term_id || '',
                'name': term.name || '',
                'status': term.workflow_state || 'active',
                'integration_id': term.integration_id || '',
                'start_date': term.start_at ? new Date(term.start_at).toISOString().slice(0, 19).replace('T', ' ') : '',
                'end_date': term.end_at ? new Date(term.end_at).toISOString().slice(0, 19).replace('T', ' ') : ''
            };

            // Always populate all fields to give explicit control over what should be blank vs random
            let fieldsWithValues = 0;
            Object.entries(termFieldMappings).forEach(([field, value]) => {
                if (field !== excludeField) {
                    // Use actual value if available, empty string if not
                    const finalValue = value && value.toString().trim() ? value : '';
                    selectedFields[field] = finalValue;

                    // Update the corresponding input field
                    const inputElement = document.getElementById(`field-${field}`);
                    if (inputElement) {
                        inputElement.value = finalValue;
                        inputElement.dataset.justPopulated = 'true'; // Prevent search loop

                        // Update visual styling
                        if (finalValue) {
                            inputElement.classList.add('border-success');
                            inputElement.classList.remove('border-secondary');
                            fieldsWithValues++;
                        } else {
                            inputElement.classList.remove('border-success');
                            inputElement.classList.add('border-secondary');
                        }
                    }
                }
            });

            // Handle enrollment type overrides - create additional UI sections and populate override data
            if (term.overrides && Object.keys(term.overrides).length > 0) {
                const fieldContainer = document.getElementById('field-inputs-container');

                // Remove existing override sections
                const existingOverrides = fieldContainer.querySelectorAll('.override-section');
                existingOverrides.forEach(section => section.remove());

                // Add separator and overrides header
                const overridesHeader = document.createElement('div');
                overridesHeader.className = 'override-section';
                overridesHeader.innerHTML = `
                    <hr>
                    <div class="row mb-3">
                        <div class="col-12">
                            <h6 class="text-primary mb-2">Date Overrides</h6>
                            <p class="text-muted small mb-0">Additional rows will be generated for each override with the enrollment type specified.</p>
                        </div>
                    </div>
                `;
                fieldContainer.appendChild(overridesHeader);

                let overrideCount = 0;
                Object.entries(term.overrides).forEach(([enrollmentType, override], index) => {
                    if (override.start_at !== undefined || override.end_at !== undefined) {
                        overrideCount++;

                        const overrideStartDate = override.start_at ? new Date(override.start_at).toISOString().slice(0, 19).replace('T', ' ') : '';
                        const overrideEndDate = override.end_at ? new Date(override.end_at).toISOString().slice(0, 19).replace('T', ' ') : '';

                        // Create UI section for this override
                        const overrideSection = document.createElement('div');
                        overrideSection.className = 'override-section';
                        overrideSection.innerHTML = `
                            <div class="row">
                                <div class="col-4 mb-2">
                                    <label for="field-override-${index}-enrollment-type" class="form-label small fw-bold text-secondary">Date Override Enrollment Type</label>
                                    <input type="text" id="field-override-${index}-enrollment-type" class="form-control form-control-sm field-input border-success" data-field="override-${index}-enrollment-type" placeholder="StudentEnrollment, TeacherEnrollment, etc." value="${enrollmentType}" data-just-populated="true">
                                </div>
                                <div class="col-4 mb-2">
                                    <label for="field-override-${index}-start-date" class="form-label small fw-bold text-secondary">Override Start Date</label>
                                    <input type="text" id="field-override-${index}-start-date" class="form-control form-control-sm field-input ${overrideStartDate ? 'border-success' : 'border-secondary'}" data-field="override-${index}-start-date" placeholder="e.g., 2013-1-03 00:00:00" value="${overrideStartDate}" data-just-populated="true">
                                </div>
                                <div class="col-4 mb-2">
                                    <label for="field-override-${index}-end-date" class="form-label small fw-bold text-secondary">Override End Date</label>
                                    <input type="text" id="field-override-${index}-end-date" class="form-control form-control-sm field-input ${overrideEndDate ? 'border-success' : 'border-secondary'}" data-field="override-${index}-end-date" placeholder="e.g., 2013-05-03 00:00:00-06:00" value="${overrideEndDate}" data-just-populated="true">
                                </div>
                            </div>
                        `;
                        fieldContainer.appendChild(overrideSection);

                        // Store override data in selectedFields for CSV generation
                        selectedFields[`override-${index}-enrollment-type`] = enrollmentType;
                        selectedFields[`override-${index}-start-date`] = overrideStartDate;
                        selectedFields[`override-${index}-end-date`] = overrideEndDate;

                        fieldsWithValues += 3; // enrollment type, start date, end date
                    }
                });

                // Store metadata about overrides for CSV generation
                selectedFields._termOverrideCount = overrideCount;
                selectedFields._termBaseData = termFieldMappings;
            }

            // Show success message
            let message = `Found term: ${term.name}.`;
            if (fieldsWithValues > 0) {
                message += ` Auto-populated ${fieldsWithValues} fields with data.`;
            } else {
                message += ` No additional data available to populate.`;
            }

            if (term.overrides && Object.keys(term.overrides).length > 0) {
                const overrideCount = Object.keys(term.overrides).length;
                message += ` Found ${overrideCount} enrollment type override(s).`;
            }

            showTermsSearchResult(message, 'success');
        }

        // Show terms search result message
        function showTermsSearchResult(message, type) {
            // Create a temporary notification element
            const notification = document.createElement('div');
            notification.className = `alert alert-${type === 'success' ? 'success' : type === 'warning' ? 'warning' : type === 'info' ? 'info' : 'danger'} alert-dismissible fade show position-fixed`;
            notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
            notification.innerHTML = `
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            `;

            document.body.appendChild(notification);

            // Auto-remove after 3 seconds
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 3000);
        }

        // Show user selection modal when multiple users are found
        function showUserSelectionModal(users, searchField) {
            // Create modal HTML
            const modalHTML = `
                <div class="modal fade" id="userSelectionModal" tabindex="-1" aria-labelledby="userSelectionModalLabel" aria-hidden="true">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="userSelectionModalLabel">Multiple Users Found</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <p class="mb-3">Multiple users were found matching your search. Please select which user you'd like to use for auto-populating the SIS fields:</p>
                                <div class="list-group" id="userSelectionList">
                                    ${users.map((user, index) => `
                                        <button type="button" class="list-group-item list-group-item-action user-selection-item" data-user-index="${index}">
                                            <div class="d-flex w-100 justify-content-between">
                                                <h6 class="mb-1">${user.name || 'No Name'}</h6>
                                                <small class="text-muted">ID: ${user.id}</small>
                                            </div>
                                            <div class="row">
                                                <div class="col-md-6">
                                                    <small><strong>SIS User ID:</strong> ${user.sis_user_id || 'N/A'}</small><br>
                                                    <small><strong>Login ID:</strong> ${user.login_id || 'N/A'}</small><br>
                                                    <small><strong>Email:</strong> ${user.email || 'N/A'}</small>
                                                </div>
                                                <div class="col-md-6">
                                                    <small><strong>Short Name:</strong> ${user.short_name || 'N/A'}</small><br>
                                                    <small><strong>Pronouns:</strong> ${user.pronouns || 'N/A'}</small><br>
                                                    <small><strong>Created:</strong> ${user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</small>
                                                </div>
                                            </div>
                                        </button>
                                    `).join('')}
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Remove existing modal if present
            const existingModal = document.getElementById('userSelectionModal');
            if (existingModal) {
                existingModal.remove();
            }

            // Add modal to page
            document.body.insertAdjacentHTML('beforeend', modalHTML);

            // Get modal element and show it
            const modal = document.getElementById('userSelectionModal');
            const bootstrapModal = new bootstrap.Modal(modal);

            // Add event listeners for user selection
            modal.addEventListener('click', function (e) {
                if (e.target.closest('.user-selection-item')) {
                    const userIndex = parseInt(e.target.closest('.user-selection-item').dataset.userIndex);
                    const selectedUser = users[userIndex];

                    // Populate fields with selected user
                    populateUserFields(selectedUser, searchField);

                    // Close modal
                    bootstrapModal.hide();
                }
            });

            // Clean up modal when hidden
            modal.addEventListener('hidden.bs.modal', function () {
                modal.remove();
            });

            // Show the modal
            bootstrapModal.show();
        }

        // Old input event listeners removed - now using direct field inputs

        // Old CSV field event listeners removed - functionality moved to direct field inputs

        // Field summary event listeners removed - functionality moved to direct field inputs

        // Add header click functionality for field customization card collapse
        document.getElementById('field-customization-header').addEventListener('click', function () {
            const collapseElement = document.getElementById('field-customization-body');
            const toggleIcon = document.getElementById('field-toggle-icon');

            if (collapseElement.classList.contains('show')) {
                collapseElement.classList.remove('show');
                toggleIcon.className = 'fas fa-chevron-down';
            } else {
                collapseElement.classList.add('show');
                toggleIcon.className = 'fas fa-chevron-up';
            }
        });

        // Add search users button event listener for the new UI
        document.getElementById('search-users-btn').addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const searchInput = document.getElementById('user-search-input');
            const searchValue = searchInput.value.trim();
            const errorContainer = document.getElementById('user-search-error-container');

            // Clear any previous errors
            if (errorContainer) {
                errorContainer.style.display = 'none';
                errorContainer.innerHTML = '';
            }

            if (searchValue) {
                showUserSearchResult('Searching for user...', 'info');
                await searchAndPopulateUser(searchValue, null);
                // Keep search value in input for reference
            } else {
                showUserSearchResult('Please enter a search term (User ID, Login ID, Email, etc.)', 'warning');
            }
        });

        // Add search accounts button event listener for the new UI
        document.getElementById('search-accounts-btn').addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const searchInput = document.getElementById('account-search-input');
            const searchValue = searchInput.value.trim();
            const errorContainer = document.getElementById('account-search-error-container');

            // Clear any previous errors
            if (errorContainer) {
                errorContainer.style.display = 'none';
                errorContainer.innerHTML = '';
            }

            if (searchValue) {
                showAccountSearchResult('Searching for account...', 'info');
                await searchAndPopulateAccount(searchValue, null);
                // Keep search value in input for reference
            } else {
                showAccountSearchResult('Please enter a numeric Account ID', 'warning');
            }
        });

        // Add search terms button event listener for the new UI
        document.getElementById('search-terms-btn').addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const searchInput = document.getElementById('terms-search-input');
            const searchValue = searchInput.value.trim();
            const errorContainer = document.getElementById('terms-search-error-container');

            // Clear any previous errors
            if (errorContainer) {
                errorContainer.style.display = 'none';
                errorContainer.innerHTML = '';
            }

            if (searchValue) {
                showTermsSearchResult('Searching for term...', 'info');
                await searchAndPopulateTerms(searchValue, null);
                // Keep search value in input for reference
            } else {
                showTermsSearchResult('Please enter a numeric Term ID', 'warning');
            }
        });

        // Randomize Fields Handler
        document.getElementById('randomize-fields-btn').addEventListener('click', () => {
            const fileType = document.getElementById('file-type').value;
            if (!fileType) {
                showUserSearchResult('Please select a file type first.', 'warning');
                return;
            }
            randomizeRequiredFields(fileType);
        });

        // Allow Enter key in search input to trigger search
        document.getElementById('user-search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('search-users-btn').click();
            }
        });

        // Clear all fields button event listener
        document.getElementById('clear-all-fields-btn').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Clear all field inputs
            const fieldInputs = document.querySelectorAll('#field-customization-body input[id^="field-"]');
            fieldInputs.forEach(input => {
                input.value = '';
                input.classList.remove('field-populated');
            });

            // Remove override sections for terms
            const fieldContainer = document.getElementById('field-inputs-container');
            if (fieldContainer) {
                const overrideSections = fieldContainer.querySelectorAll('.override-section');
                overrideSections.forEach(section => section.remove());
            }

            // Clear selectedFields object
            selectedFields = {};

            // Clear search inputs
            document.getElementById('user-search-input').value = '';
            document.getElementById('account-search-input').value = '';
            document.getElementById('terms-search-input').value = '';

            showUserSearchResult('All fields cleared', 'info');
        });

        document.getElementById('preview-data').addEventListener('click', async () => {
            const fileType = document.getElementById('file-type').value;
            const rowCount = Math.min(5, parseInt(document.getElementById('row-count').value) || 5);
            const emailDomain = fileType === 'users'
                ? (document.getElementById('email-domain').value.trim() || '@instructure.com')
                : '@instructure.com';
            const authProviderId = ''; // Removed auth provider functionality

            // Use the proper field mapping function
            const allOptions = gatherAllOptions(fileType);

            try {
                const csvContent = await window.electronAPI.previewSISData(
                    fileType,
                    rowCount,
                    emailDomain,
                    authProviderId,
                    allOptions
                );

                // Display the CSV content directly
                const previewContainer = document.getElementById('preview-container');
                const previewContent = document.getElementById('preview-content');

                if (csvContent && csvContent.trim()) {
                    previewContent.textContent = csvContent;
                    previewContainer.style.display = 'block';
                } else {
                    showResult('No preview data generated.', 'warning');
                }
            } catch (error) {
                console.error('Preview error:', error);
                showResult(`Preview error: ${error.message}`, 'danger');
            }
        });

        createSISForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const fileType = document.getElementById('file-type').value;
            const rowCount = parseInt(document.getElementById('row-count').value);
            const outputPath = document.getElementById('output-path').value;
            const emailDomain = fileType === 'users'
                ? (document.getElementById('email-domain').value.trim() || '@instructure.com')
                : '@instructure.com';
            const authProviderId = ''; // Removed auth provider functionality

            // Use the proper field mapping function
            const allOptions = gatherAllOptions(fileType);

            try {
                const result = await window.electronAPI.createSISFile(
                    fileType,
                    rowCount,
                    outputPath,
                    emailDomain,
                    authProviderId,
                    allOptions
                );

                // createSISFile returns an object with success, fileName and filePath
                if (result.success) {
                    showResult(`SIS file generated successfully: ${result.fileName} at ${result.filePath}`, 'success');
                } else {
                    showResult(`Error generating SIS file: ${result.error || 'Unknown error'}`, 'danger');
                }
            } catch (error) {
                console.error('Generation error:', error);
                showResult(`Generation error: ${error.message}`, 'danger');
            }
        });

        // Initialize email domain visibility based on current selection
        (function initEmailDomainVisibility() {
            const ft = document.getElementById('file-type');
            const emailGroup = document.getElementById('email-domain-group');
            if (emailGroup) emailGroup.style.display = (ft && ft.value === 'users') ? 'block' : 'none';
        })();

        // Initialize form validation
        validateForm();

        // Mark that event listeners have been added
        createSISForm.setAttribute('data-listeners-added', 'true');
    }

    function showResult(message, type) {
        const resultContainer = document.getElementById('result-container');
        const resultMessage = document.getElementById('result-message');

        resultMessage.className = `alert alert-${type}`;
        resultMessage.textContent = message;
        resultContainer.style.display = 'block';

        // Auto hide after 5 seconds for success messages
        if (type === 'success') {
            setTimeout(() => {
                resultContainer.style.display = 'none';
            }, 5000);
        }
    }

    function displayPreviewData(data, headers) {
        const previewContainer = document.getElementById('preview-container');
        const previewContent = document.getElementById('preview-content');

        if (!data || !Array.isArray(data) || data.length === 0) {
            previewContent.textContent = 'No preview data available.';
            previewContainer.style.display = 'block';
            return;
        }

        // Create a table for better display
        let tableHTML = '<table class="table table-striped table-sm"><thead><tr>';

        // Add headers
        if (headers && headers.length > 0) {
            headers.forEach(header => {
                tableHTML += `<th>${header}</th>`;
            });
        } else if (data[0]) {
            Object.keys(data[0]).forEach(key => {
                tableHTML += `<th>${key}</th>`;
            });
        }

        tableHTML += '</tr></thead><tbody>';

        // Add data rows
        data.forEach(row => {
            tableHTML += '<tr>';
            if (headers && headers.length > 0) {
                headers.forEach(header => {
                    tableHTML += `<td>${row[header] || ''}</td>`;
                });
            } else {
                Object.values(row).forEach(value => {
                    tableHTML += `<td>${value || ''}</td>`;
                });
            }
            tableHTML += '</tr>';
        });

        tableHTML += '</tbody></table>';

        previewContent.innerHTML = tableHTML;
        previewContainer.style.display = 'block';
    }

    async function createBulkSISFiles(e) {
        hideEndpoints(e);

        const eContent = document.querySelector('#endpoint-content');
        let createBulkSISForm = eContent.querySelector('#create-bulk-sis-form');

        if (!createBulkSISForm) {
            createBulkSISForm = document.createElement('form');
            createBulkSISForm.id = 'create-bulk-sis-form';
            createBulkSISForm.innerHTML = `
            <div>
                <h3>Create Bulk SIS Import Files</h3>
                <p class="text-muted">Generate multiple CSV files for a complete SIS import package.</p>
            </div>
            <div class="row mb-3">
                <div class="col-12">
                    <label class="form-label">Select File Types and Row Counts</label>
                    <div class="border rounded p-3">
                        <div class="row mb-2">
                            <div class="col-1">
                                <input type="checkbox" id="include-users" class="form-check-input" checked>
                            </div>
                            <div class="col-3">
                                <label for="include-users" class="form-check-label">Users</label>
                            </div>
                            <div class="col-3">
                                <input type="number" id="users-count" class="form-control form-control-sm" min="1" max="10000" value="50">
                            </div>
                            <div class="col-5">
                                <small class="text-muted">Student and teacher user accounts</small>
                            </div>
                        </div>
                        <div class="row mb-2">
                            <div class="col-1">
                                <input type="checkbox" id="include-accounts" class="form-check-input" checked>
                            </div>
                            <div class="col-3">
                                <label for="include-accounts" class="form-check-label">Accounts</label>
                            </div>
                            <div class="col-3">
                                <input type="number" id="accounts-count" class="form-control form-control-sm" min="1" max="1000" value="10">
                            </div>
                            <div class="col-5">
                                <small class="text-muted">Department and organizational accounts</small>
                            </div>
                        </div>
                        <div class="row mb-2">
                            <div class="col-1">
                                <input type="checkbox" id="include-terms" class="form-check-input" checked>
                            </div>
                            <div class="col-3">
                                <label for="include-terms" class="form-check-label">Terms</label>
                            </div>
                            <div class="col-3">
                                <input type="number" id="terms-count" class="form-control form-control-sm" min="1" max="100" value="4">
                            </div>
                            <div class="col-5">
                                <small class="text-muted">Academic terms (Fall, Spring, etc.)</small>
                            </div>
                        </div>
                        <div class="row mb-2">
                            <div class="col-1">
                                <input type="checkbox" id="include-courses" class="form-check-input" checked>
                            </div>
                            <div class="col-3">
                                <label for="include-courses" class="form-check-label">Courses</label>
                            </div>
                            <div class="col-3">
                                <input type="number" id="courses-count" class="form-control form-control-sm" min="1" max="5000" value="25">
                            </div>
                            <div class="col-5">
                                <small class="text-muted">Course listings</small>
                            </div>
                        </div>
                        <div class="row mb-2">
                            <div class="col-1">
                                <input type="checkbox" id="include-sections" class="form-check-input" checked>
                            </div>
                            <div class="col-3">
                                <label for="include-sections" class="form-check-label">Sections</label>
                            </div>
                            <div class="col-3">
                                <input type="number" id="sections-count" class="form-control form-control-sm" min="1" max="10000" value="50">
                            </div>
                            <div class="col-5">
                                <small class="text-muted">Course sections</small>
                            </div>
                        </div>
                        <div class="row mb-2">
                            <div class="col-1">
                                <input type="checkbox" id="include-enrollments" class="form-check-input" checked>
                            </div>
                            <div class="col-3">
                                <label for="include-enrollments" class="form-check-label">Enrollments</label>
                            </div>
                            <div class="col-3">
                                <input type="number" id="enrollments-count" class="form-control form-control-sm" min="1" max="50000" value="200">
                            </div>
                            <div class="col-5">
                                <small class="text-muted">Student and teacher enrollments</small>
                            </div>
                        </div>
                        <div class="row mb-2">
                            <div class="col-1">
                                <input type="checkbox" id="include-groups" class="form-check-input">
                            </div>
                            <div class="col-3">
                                <label for="include-groups" class="form-check-label">Groups</label>
                            </div>
                            <div class="col-3">
                                <input type="number" id="groups-count" class="form-control form-control-sm" min="1" max="1000" value="15">
                            </div>
                            <div class="col-5">
                                <small class="text-muted">Student groups</small>
                            </div>
                        </div>
                        <div class="row mb-2">
                            <div class="col-1">
                                <input type="checkbox" id="include-group-categories" class="form-check-input">
                            </div>
                            <div class="col-3">
                                <label for="include-group-categories" class="form-check-label">Group Categories</label>
                            </div>
                            <div class="col-3">
                                <input type="number" id="group-categories-count" class="form-control form-control-sm" min="1" max="100" value="5">
                            </div>
                            <div class="col-5">
                                <small class="text-muted">Group category definitions</small>
                            </div>
                        </div>
                        <div class="row mb-2">
                            <div class="col-1">
                                <input type="checkbox" id="include-admins" class="form-check-input">
                            </div>
                            <div class="col-3">
                                <label for="include-admins" class="form-check-label">Admins</label>
                            </div>
                            <div class="col-3">
                                <input type="number" id="admins-count" class="form-control form-control-sm" min="1" max="100" value="5">
                            </div>
                            <div class="col-5">
                                <small class="text-muted">Administrative user roles</small>
                            </div>
                        </div>
                        <div class="row mb-2">
                            <div class="col-1">
                                <input type="checkbox" id="include-group-memberships" class="form-check-input">
                            </div>
                            <div class="col-3">
                                <label for="include-group-memberships" class="form-check-label">Group Memberships</label>
                            </div>
                            <div class="col-3">
                                <input type="number" id="group-memberships-count" class="form-control form-control-sm" min="1" max="1000" value="30">
                            </div>
                            <div class="col-5">
                                <small class="text-muted">User group membership assignments</small>
                            </div>
                        </div>
                        <div class="row mb-2">
                            <div class="col-1">
                                <input type="checkbox" id="include-differentiation-tag-sets" class="form-check-input">
                            </div>
                            <div class="col-3">
                                <label for="include-differentiation-tag-sets" class="form-check-label">Differentiation Tag Sets</label>
                            </div>
                            <div class="col-3">
                                <input type="number" id="differentiation-tag-sets-count" class="form-control form-control-sm" min="1" max="50" value="5">
                            </div>
                            <div class="col-5">
                                <small class="text-muted">Tag set definitions for differentiation</small>
                            </div>
                        </div>
                        <div class="row mb-2">
                            <div class="col-1">
                                <input type="checkbox" id="include-differentiation-tags" class="form-check-input">
                            </div>
                            <div class="col-3">
                                <label for="include-differentiation-tags" class="form-check-label">Differentiation Tags</label>
                            </div>
                            <div class="col-3">
                                <input type="number" id="differentiation-tags-count" class="form-control form-control-sm" min="1" max="200" value="15">
                            </div>
                            <div class="col-5">
                                <small class="text-muted">Individual differentiation tags</small>
                            </div>
                        </div>
                        <div class="row mb-2">
                            <div class="col-1">
                                <input type="checkbox" id="include-differentiation-tag-membership" class="form-check-input">
                            </div>
                            <div class="col-3">
                                <label for="include-differentiation-tag-membership" class="form-check-label">Differentiation Tag Membership</label>
                            </div>
                            <div class="col-3">
                                <input type="number" id="differentiation-tag-membership-count" class="form-control form-control-sm" min="1" max="500" value="25">
                            </div>
                            <div class="col-5">
                                <small class="text-muted">User tag assignments</small>
                            </div>
                        </div>
                        <div class="row mb-2">
                            <div class="col-1">
                                <input type="checkbox" id="include-xlists" class="form-check-input">
                            </div>
                            <div class="col-3">
                                <label for="include-xlists" class="form-check-label">Cross-listings (Xlists)</label>
                            </div>
                            <div class="col-3">
                                <input type="number" id="xlists-count" class="form-control form-control-sm" min="1" max="200" value="10">
                            </div>
                            <div class="col-5">
                                <small class="text-muted">Course cross-listing assignments</small>
                            </div>
                        </div>
                        <div class="row mb-2">
                            <div class="col-1">
                                <input type="checkbox" id="include-user-observers" class="form-check-input">
                            </div>
                            <div class="col-3">
                                <label for="include-user-observers" class="form-check-label">User Observers</label>
                            </div>
                            <div class="col-3">
                                <input type="number" id="user-observers-count" class="form-control form-control-sm" min="1" max="500" value="20">
                            </div>
                            <div class="col-5">
                                <small class="text-muted">Observer-student relationships</small>
                            </div>
                        </div>
                        <div class="row mb-2">
                            <div class="col-1">
                                <input type="checkbox" id="include-logins" class="form-check-input">
                            </div>
                            <div class="col-3">
                                <label for="include-logins" class="form-check-label">Logins</label>
                            </div>
                            <div class="col-3">
                                <input type="number" id="logins-count" class="form-control form-control-sm" min="1" max="1000" value="25">
                            </div>
                            <div class="col-5">
                                <small class="text-muted">Additional login credentials</small>
                            </div>
                        </div>
                        <div class="row mb-2">
                            <div class="col-1">
                                <input type="checkbox" id="include-change-sis-id" class="form-check-input">
                            </div>
                            <div class="col-3">
                                <label for="include-change-sis-id" class="form-check-label">Change SIS ID</label>
                            </div>
                            <div class="col-3">
                                <input type="number" id="change-sis-id-count" class="form-control form-control-sm" min="1" max="500" value="10">
                            </div>
                            <div class="col-5">
                                <small class="text-muted">SIS ID change requests</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="row mb-3">
                <div class="col-12">
                    <label for="bulk-output-path" class="form-label">Output Folder</label>
                    <div class="input-group">
                        <input type="text" id="bulk-output-path" class="form-control" placeholder="Select output folder..." readonly>
                        <button type="button" id="browse-bulk-folder" class="btn btn-outline-secondary">Browse</button>
                    </div>
                </div>
            </div>
            <div class="row mb-3">
                <div class="col-6">
                    <label for="bulk-email-domain" class="form-label">Email Domain</label>
                    <input type="text" id="bulk-email-domain" class="form-control" value="@instructure.com" placeholder="@instructure.com">
                    <div class="form-text">Domain for generated email addresses</div>
                </div>
                <div class="col-6">
                    <label for="bulk-auth-provider" class="form-label">Authentication Provider</label>
                    <select id="bulk-auth-provider" class="form-select">
                        <option value="">None (Default Canvas Authentication)</option>
                    </select>
                    <div class="form-text">Auth provider for user accounts (only applies if Users is selected)</div>
                </div>
            </div>
            <div class="row mb-3">
                <div class="col-6">
                    <button type="button" id="fetch-bulk-auth-providers" class="btn btn-outline-info">
                        Fetch Authentication Providers
                    </button>
                    <div class="form-text">Uses domain and token from main form</div>
                </div>
                <div class="col-6">
                    <div class="form-check mt-4">
                        <input type="checkbox" id="create-zip" class="form-check-input" checked>
                        <label for="create-zip" class="form-check-label">Create ZIP file for upload</label>
                        <div class="form-text">Recommended for Canvas SIS import</div>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-12">
                    <button type="submit" id="generate-bulk-files" class="btn btn-primary">Generate SIS Import Package</button>
                    <button type="button" id="select-all-files" class="btn btn-outline-secondary ms-2">Select All</button>
                    <button type="button" id="select-none-files" class="btn btn-outline-secondary ms-1">Select None</button>
                </div>
            </div>
            <div id="bulk-result-container" class="mt-4" style="display: none;">
                <div id="bulk-result-message" class="alert"></div>
                <div id="files-created-list"></div>
            </div>
            <div id="bulk-progress" class="mt-3" style="display: none;">
                <div class="progress">
                    <div id="bulk-progress-bar" class="progress-bar" role="progressbar" style="width: 0%"></div>
                </div>
                <small id="bulk-progress-text" class="text-muted">Preparing...</small>
            </div>
        `;
            eContent.appendChild(createBulkSISForm);
        } else {
            // Form already exists, just show it
            createBulkSISForm.hidden = false;
        }

        // Event listeners (moved outside the if block so they work for both new and existing forms)
        if (!createBulkSISForm.hasAttribute('data-listeners-added')) {
            document.getElementById('browse-bulk-folder').addEventListener('click', async () => {
                const result = await window.electronAPI.selectFolder();
                if (result) {
                    document.getElementById('bulk-output-path').value = result;
                }
            });

            document.getElementById('select-all-files').addEventListener('click', () => {
                const checkboxes = createBulkSISForm.querySelectorAll('input[type="checkbox"][id^="include-"]');
                checkboxes.forEach(cb => cb.checked = true);
            });

            document.getElementById('select-none-files').addEventListener('click', () => {
                const checkboxes = createBulkSISForm.querySelectorAll('input[type="checkbox"][id^="include-"]');
                checkboxes.forEach(cb => cb.checked = false);
            });

            // Fetch authentication providers for bulk form
            document.getElementById('fetch-bulk-auth-providers').addEventListener('click', async () => {
                const button = document.getElementById('fetch-bulk-auth-providers');
                const select = document.getElementById('bulk-auth-provider');

                // Get domain and token from main form
                const domain = document.getElementById('domain').value;
                const token = document.getElementById('token').value;

                if (!domain || !token) {
                    showBulkResult('Please enter Canvas domain and token in the main form first.', 'warning');
                    return;
                }

                try {
                    button.disabled = true;
                    button.textContent = 'Fetching...';

                    const providers = await window.electronAPI.fetchAuthProviders(domain, token);

                    // Clear existing options except the default
                    select.innerHTML = '<option value="">None (Default Canvas Authentication)</option>';

                    // Add fetched providers
                    providers.forEach(provider => {
                        const option = document.createElement('option');
                        option.value = provider.id;
                        option.textContent = provider.display_name;
                        select.appendChild(option);
                    });

                    showBulkResult(`Found ${providers.length} authentication provider(s).`, 'success');

                } catch (error) {
                    showBulkResult(`Error fetching authentication providers: ${error.message}`, 'danger');
                } finally {
                    button.disabled = false;
                    button.textContent = 'Fetch Authentication Providers';
                }
            });

            createBulkSISForm.addEventListener('submit', async (event) => {
                event.preventDefault();

                const outputPath = document.getElementById('bulk-output-path').value;
                const createZip = document.getElementById('create-zip').checked;
                const emailDomain = document.getElementById('bulk-email-domain').value.trim() || '@instructure.com';
                const authProviderId = document.getElementById('bulk-auth-provider').value || '';

                if (!outputPath) {
                    showBulkResult('Please select an output folder.', 'warning');
                    return;
                }

                // Collect selected file types and counts
                const fileTypes = [];
                const rowCounts = [];

                const fileTypeConfigs = [
                    { id: 'users', name: 'users' },
                    { id: 'accounts', name: 'accounts' },
                    { id: 'terms', name: 'terms' },
                    { id: 'courses', name: 'courses' },
                    { id: 'sections', name: 'sections' },
                    { id: 'enrollments', name: 'enrollments' },
                    { id: 'groups', name: 'groups' },
                    { id: 'group-categories', name: 'group_categories' },
                    { id: 'admins', name: 'admins' },
                    { id: 'group-memberships', name: 'group_memberships' },
                    { id: 'differentiation-tag-sets', name: 'differentiation_tag_sets' },
                    { id: 'differentiation-tags', name: 'differentiation_tags' },
                    { id: 'differentiation-tag-membership', name: 'differentiation_tag_membership' },
                    { id: 'xlists', name: 'xlists' },
                    { id: 'user-observers', name: 'user_observers' },
                    { id: 'logins', name: 'logins' },
                    { id: 'change-sis-id', name: 'change_sis_id' }
                ];

                fileTypeConfigs.forEach(config => {
                    const checkbox = document.getElementById(`include-${config.id}`);
                    const countInput = document.getElementById(`${config.id}-count`);

                    if (checkbox.checked) {
                        fileTypes.push(config.name);
                        rowCounts.push(parseInt(countInput.value) || 10);
                    }
                });

                if (fileTypes.length === 0) {
                    showBulkResult('Please select at least one file type.', 'warning');
                    return;
                }

                try {
                    const button = document.getElementById('generate-bulk-files');
                    button.disabled = true;
                    button.textContent = 'Generating...';

                    showProgress(0, 'Preparing files...');

                    const result = await window.electronAPI.createBulkSISFiles(fileTypes, rowCounts, outputPath, createZip, emailDomain, authProviderId);

                    hideProgress();
                    showBulkResult(
                        `Successfully created ${result.files.length} SIS import files${createZip ? ' and ZIP package' : ''}!`,
                        'success'
                    );

                    // Show list of created files
                    const filesList = document.getElementById('files-created-list');
                    filesList.innerHTML = `
                    <h6>Created Files:</h6>
                    <ul class="list-group list-group-flush">
                        ${result.files.map(file => `<li class="list-group-item py-1"><code>${file}</code></li>`).join('')}
                    </ul>
                    ${result.zipPath ? `<div class="mt-2"><strong>ZIP Package:</strong> <code>${result.zipPath}</code></div>` : ''}
                `;

                    button.disabled = false;
                    button.textContent = 'Generate SIS Import Package';
                } catch (error) {
                    hideProgress();
                    showBulkResult(`Error creating files: ${error.message}`, 'danger');
                    document.getElementById('generate-bulk-files').disabled = false;
                    document.getElementById('generate-bulk-files').textContent = 'Generate SIS Import Package';
                }
            });

            // Mark that event listeners have been added
            createBulkSISForm.setAttribute('data-listeners-added', 'true');
        }

        function showBulkResult(message, type) {
            const resultContainer = document.getElementById('bulk-result-container');
            const resultMessage = document.getElementById('bulk-result-message');

            resultMessage.className = `alert alert-${type}`;
            resultMessage.textContent = message;
            resultContainer.style.display = 'block';

            if (type === 'success') {
                setTimeout(() => {
                    resultContainer.style.display = 'none';
                }, 10000);
            }
        }

        function showProgress(percent, text) {
            const progressContainer = document.getElementById('bulk-progress');
            const progressBar = document.getElementById('bulk-progress-bar');
            const progressText = document.getElementById('bulk-progress-text');

            progressContainer.style.display = 'block';
            progressBar.style.width = `${percent}%`;
            progressText.textContent = text;
        }

        function hideProgress() {
            document.getElementById('bulk-progress').style.display = 'none';
        }
    }
}
