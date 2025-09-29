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
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        Error Details (${errorCount} ${errorText})
                    </h6>
                    <i class="bi bi-chevron-down"></i>
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
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-file-earmark-spreadsheet me-2"></i>Create Single SIS Import File
                    </h3>
                    <small class="text-muted">Generate a single CSV file for SIS import with random sample data, or build a collection of files for zip export</small>
                </div>
                <div class="card-body">
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
                            <i class="bi bi-chevron-down" id="field-toggle-icon"></i>
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
                                    
                                    <label for="courses-search-input" class="form-label small fw-bold">Search Courses</label>
                                    <input type="text" id="courses-search-input" class="form-control form-control-sm" placeholder="Enter Canvas Course ID" style="display: none;">
                                    
                                    <label for="sections-search-input" class="form-label small fw-bold">Search Sections</label>
                                    <input type="text" id="sections-search-input" class="form-control form-control-sm" placeholder="Enter Canvas Section ID" style="display: none;">
                                    
                                    <label for="enrollments-search-input" class="form-label small fw-bold">Search Enrollments</label>
                                    <div style="display: none;" id="enrollments-search-container">
                                        <div class="input-group mb-2">
                                            <select id="enrollments-search-type" class="form-select form-select-sm">
                                                <option value="user">User ID</option>
                                                <option value="course">Course ID</option>
                                                <option value="section">Section ID</option>
                                            </select>
                                            <input type="text" id="enrollments-search-input" class="form-control form-control-sm" placeholder="Enter ID to search enrollments">
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6 d-flex align-items-end gap-2">
                                    <button type="button" class="btn btn-outline-primary btn-sm" id="search-users-btn" style="display: none;">
                                        <i class="bi bi-search"></i> Search Users
                                    </button>
                                    <button type="button" class="btn btn-outline-primary btn-sm" id="search-accounts-btn" style="display: none;">
                                        <i class="bi bi-search"></i> Search Accounts
                                    </button>
                                    <button type="button" class="btn btn-outline-primary btn-sm" id="search-terms-btn" style="display: none;">
                                        <i class="bi bi-search"></i> Search Terms
                                    </button>
                                    <button type="button" class="btn btn-outline-primary btn-sm" id="search-courses-btn" style="display: none;">
                                        <i class="bi bi-search"></i> Search Courses
                                    </button>
                                    <button type="button" class="btn btn-outline-primary btn-sm" id="search-sections-btn" style="display: none;">
                                        <i class="bi bi-search"></i> Search Sections
                                    </button>
                                    <button type="button" class="btn btn-outline-primary btn-sm" id="search-enrollments-btn" style="display: none;">
                                        <i class="bi bi-search"></i> Search Enrollments
                                    </button>
                                    <button type="button" class="btn btn-outline-secondary btn-sm" id="randomize-fields-btn">
                                        <i class="bi bi-shuffle"></i> Randomize
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
                            <div id="courses-search-error-container" class="mt-3" style="display: none;">
                                <!-- Courses search error cards will be displayed here -->
                            </div>
                            <div id="sections-search-error-container" class="mt-3" style="display: none;">
                                <!-- Sections search error cards will be displayed here -->
                            </div>
                            <div id="enrollments-search-error-container" class="mt-3" style="display: none;">
                                <!-- Enrollments search error cards will be displayed here -->
                            </div>
                            <!-- Enrollments search results container -->
                            <div id="enrollments-search-results-container" class="mt-3" style="display: none;">
                                <div class="card">
                                    <div class="card-header d-flex justify-content-between align-items-center">
                                        <h6 class="mb-0">
                                            <i class="bi bi-people me-2"></i>
                                            Enrollment Results
                                        </h6>
                                        <button type="button" class="btn btn-success btn-sm" id="generate-enrollments-csv-btn">
                                            <i class="bi bi-filetype-csv me-1"></i> Generate CSV
                                        </button>
                                    </div>
                                    <div class="card-body">
                                        <div id="enrollments-results-list">
                                            <!-- Dynamic enrollment results will be inserted here -->
                                        </div>
                                    </div>
                                </div>
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

            const searchCoursesBtn = document.getElementById('search-courses-btn');
            const searchCoursesInput = document.getElementById('courses-search-input');
            if (searchCoursesBtn && searchCoursesInput) {
                const isCoursesType = (fileType === 'courses');
                searchCoursesBtn.style.display = isCoursesType ? 'inline-block' : 'none';
                searchCoursesInput.style.display = isCoursesType ? 'block' : 'none';
                if (searchCoursesInput.parentElement) {
                    searchCoursesInput.parentElement.querySelector('label[for="courses-search-input"]').style.display = isCoursesType ? 'block' : 'none';
                }
            }

            const searchSectionsBtn = document.getElementById('search-sections-btn');
            const searchSectionsInput = document.getElementById('sections-search-input');
            if (searchSectionsBtn && searchSectionsInput) {
                const isSectionsType = (fileType === 'sections');
                searchSectionsBtn.style.display = isSectionsType ? 'inline-block' : 'none';
                searchSectionsInput.style.display = isSectionsType ? 'block' : 'none';
                if (searchSectionsInput.parentElement) {
                    searchSectionsInput.parentElement.querySelector('label[for="sections-search-input"]').style.display = isSectionsType ? 'block' : 'none';
                }
            }

            const searchEnrollmentsBtn = document.getElementById('search-enrollments-btn');
            const searchEnrollmentsContainer = document.getElementById('enrollments-search-container');
            if (searchEnrollmentsBtn && searchEnrollmentsContainer) {
                const isEnrollmentsType = (fileType === 'enrollments');
                searchEnrollmentsBtn.style.display = isEnrollmentsType ? 'inline-block' : 'none';
                searchEnrollmentsContainer.style.display = isEnrollmentsType ? 'block' : 'none';
                if (searchEnrollmentsContainer.parentElement) {
                    searchEnrollmentsContainer.parentElement.querySelector('label[for="enrollments-search-input"]').style.display = isEnrollmentsType ? 'block' : 'none';
                }
            }

            // Define field options for each CSV type (based on official Canvas documentation)
            const fieldOptions = {
                'users': [
                    { value: 'user_id', label: 'User ID', placeholder: 'SIS User ID' },
                    { value: 'login_id', label: 'Login ID', placeholder: 'username' },
                    { value: 'authentication_provider_id', label: 'Auth Provider ID', placeholder: 'e.g., saml' },
                    { value: 'password', label: 'Password', placeholder: 'Leave empty for auto-generation' },
                    { value: 'ssha_password', label: 'SSHA Password', placeholder: 'Leave empty for auto-generation' },
                    { value: 'first_name', label: 'First Name', placeholder: 'first name' },
                    { value: 'last_name', label: 'Last Name', placeholder: 'last name' },
                    { value: 'full_name', label: 'Full Name', placeholder: 'full name' },
                    { value: 'sortable_name', label: 'Sortable Name', placeholder: 'sortable name' },
                    { value: 'short_name', label: 'Short Name', placeholder: 'short name' },
                    { value: 'email', label: 'Email', placeholder: 'email' },
                    { value: 'status', label: 'Status', placeholder: 'active, deleted, suspended' },
                    { value: 'integration_id', label: 'Integration ID', placeholder: 'integration ID' },
                    { value: 'pronouns', label: 'Pronouns', placeholder: 'e.g., they/them' },
                    { value: 'declared_user_type', label: 'Declared User Type', placeholder: 'e.g., teacher, student' },
                    { value: 'canvas_password_notification', label: 'Canvas Password Notification', placeholder: 'true, false' },
                    { value: 'home_account', label: 'Home Account', placeholder: 'true, false' }
                ],
                'accounts': [
                    { value: 'account_id', label: 'Account ID', placeholder: 'account SIS ID' },
                    { value: 'parent_account_id', label: 'Parent Account ID', placeholder: 'parent account SIS ID' },
                    { value: 'name', label: 'Account Name', placeholder: 'account name' },
                    { value: 'status', label: 'Status', placeholder: 'active, deleted' }
                ],
                'terms': [
                    { value: 'term_id', label: 'Term ID', placeholder: 'term sis ID' },
                    { value: 'name', label: 'Term Name', placeholder: 'term name' },
                    { value: 'status', label: 'Status', placeholder: 'active, deleted' },
                    { value: 'integration_id', label: 'Integration ID', placeholder: 'integration ID' },
                    { value: 'date_override_enrollment_type', label: 'Date Override Enrollment Type', placeholder: 'StudentEnrollment, TeacherEnrollment, TaEnrollment, DesignerEnrollment' },
                    { value: 'start_date', label: 'Start Date', placeholder: 'e.g., 2013-1-03 00:00:00' },
                    { value: 'end_date', label: 'End Date', placeholder: 'e.g., 2013-05-03 00:00:00-06:00' }
                ],
                'courses': [
                    { value: 'course_id', label: 'Course ID', placeholder: 'course SIS ID' },
                    { value: 'short_name', label: 'Short Name', placeholder: 'course code' },
                    { value: 'long_name', label: 'Long Name', placeholder: 'course name' },
                    { value: 'account_id', label: 'Account ID', placeholder: 'account SIS ID' },
                    { value: 'term_id', label: 'Term ID', placeholder: 'term SIS ID' },
                    { value: 'status', label: 'Status', placeholder: 'active, deleted, completed, published' },
                    { value: 'integration_id', label: 'Integration ID', placeholder: 'integration ID' },
                    { value: 'start_date', label: 'Start Date', placeholder: 'e.g., 2013-01-03 00:00:00' },
                    { value: 'end_date', label: 'End Date', placeholder: 'e.g., 2013-05-03 00:00:00-06:00' },
                    { value: 'course_format', label: 'Course Format', placeholder: 'on_campus, online, blended' },
                    { value: 'blueprint_course_id', label: 'Blueprint Course ID', placeholder: 'SIS ID of a Blueprint course or "dissociate"' },
                    { value: 'grade_passback_setting', label: 'Grade Passback Setting', placeholder: 'nightly_sync, not_set' },
                    { value: 'homeroom_course', label: 'Homeroom Course', placeholder: 'true, false' },
                    { value: 'friendly_name', label: 'Friendly Name', placeholder: 'Elementary-friendly course name' }
                ],
                'sections': [
                    { value: 'section_id', label: 'Section ID', placeholder: 'section SIS ID' },
                    { value: 'course_id', label: 'Course ID', placeholder: 'course SIS ID' },
                    { value: 'name', label: 'Section Name', placeholder: 'section name' },
                    { value: 'status', label: 'Status', placeholder: 'active, deleted, completed' },
                    { value: 'start_date', label: 'Start Date', placeholder: 'e.g., 2013-1-03 00:00:00' },
                    { value: 'end_date', label: 'End Date', placeholder: 'e.g., 2013-05-03 00:00:00-06:00' },
                    { value: 'integration_id', label: 'Integration ID', placeholder: 'integration ID' }
                ],
                'enrollments': [
                    { value: 'course_id', label: 'Course ID', placeholder: 'course SIS ID' },
                    { value: 'user_id', label: 'User ID', placeholder: 'user SIS ID' },
                    { value: 'role', label: 'Role', placeholder: 'student, teacher, ta, observer, designer' },
                    { value: 'section_id', label: 'Section ID', placeholder: 'section SIS ID' },
                    { value: 'status', label: 'Status', placeholder: 'active, deleted, completed, inactive' },
                    { value: 'user_integration_id', label: 'User Integration ID', placeholder: 'user integration ID' },
                    { value: 'role_id', label: 'Role ID', placeholder: 'role ID' },
                    { value: 'root_account', label: 'Root Account', placeholder: 'e.g., school.instructure.com' },
                    { value: 'start_date', label: 'Start Date', placeholder: 'e.g., 2013-1-03 00:00:00' },
                    { value: 'end_date', label: 'End Date', placeholder: 'e.g., 2013-05-03 00:00:00-06:00' },
                    { value: 'associated_user_id', label: 'Associated User ID', placeholder: 'associated user SIS ID' },
                    { value: 'limit_section_privileges', label: 'Limit Section Privileges', placeholder: 'true, false' },
                    { value: 'notify', label: 'Notify', placeholder: 'true, false' },
                    { value: 'temporary_enrollment_source_user_id', label: 'Temporary Enrollment Source User ID', placeholder: 'Provider user SIS ID for temporary enrollment' }
                ],
                'group_categories': [
                    { value: 'group_category_id', label: 'Group Category ID', placeholder: 'group category ID' },
                    { value: 'account_id', label: 'Account ID', placeholder: 'account SIS ID' },
                    { value: 'course_id', label: 'Course ID', placeholder: 'course SIS ID' },
                    { value: 'category_name', label: 'Category Name', placeholder: 'e.g., First Group Category' },
                    { value: 'status', label: 'Status', placeholder: 'active, deleted' }
                ],
                'groups': [
                    { value: 'group_id', label: 'Group ID', placeholder: 'group SIS ID' },
                    { value: 'group_category_id', label: 'Group Category ID', placeholder: 'group category ID' },
                    { value: 'account_id', label: 'Account ID', placeholder: 'account SIS ID' },
                    { value: 'course_id', label: 'Course ID', placeholder: 'course SIS ID' },
                    { value: 'name', label: 'Group Name', placeholder: 'group name' },
                    { value: 'status', label: 'Status', placeholder: 'available, closed, completed, deleted' }
                ],
                'group_memberships': [
                    { value: 'group_id', label: 'Group ID', placeholder: 'group SIS ID' },
                    { value: 'user_id', label: 'User ID', placeholder: 'user SIS ID' },
                    { value: 'status', label: 'Status', placeholder: 'accepted, deleted' }
                ],
                'admins': [
                    { value: 'user_id', label: 'User ID', placeholder: 'user SIS ID' },
                    { value: 'account_id', label: 'Account ID', placeholder: 'account SIS ID' },
                    { value: 'role', label: 'Role', placeholder: 'e.g., AccountAdmin' },
                    { value: 'role_id', label: 'Role ID', placeholder: 'role ID' },
                    { value: 'status', label: 'Status', placeholder: 'active, deleted' },
                    { value: 'root_account', label: 'Root Account', placeholder: 'Domain of account to search for user, e.g., school.instructure.com' }
                ],
                'logins': [
                    { value: 'user_id', label: 'User ID', placeholder: 'user SIS ID' },
                    { value: 'integration_id', label: 'Integration ID', placeholder: 'integration ID' },
                    { value: 'login_id', label: 'Login ID', placeholder: 'login ID/username' },
                    { value: 'password', label: 'Password', placeholder: 'Leave empty for auto-generation' },
                    { value: 'ssha_password', label: 'SSHA Password', placeholder: 'Pre-hashed SSHA password' },
                    { value: 'authentication_provider_id', label: 'Auth Provider ID', placeholder: 'e.g., saml' },
                    { value: 'existing_user_id', label: 'Existing User ID', placeholder: 'e.g., existing user SIS ID' },
                    { value: 'existing_integration_id', label: 'Existing Integration ID', placeholder: 'e.g., existing user integration ID' },
                    { value: 'existing_canvas_user_id', label: 'Existing Canvas User ID', placeholder: 'e.g., canvas user ID' },
                    { value: 'root_account', label: 'Root Account', placeholder: 'Domain of account to search for user, e.g., school.instructure.com' },
                    { value: 'email', label: 'Email', placeholder: 'user email' }
                ],
                'xlists': [
                    { value: 'xlist_course_id', label: 'Cross-list Course ID', placeholder: 'course SIS ID' },
                    { value: 'section_id', label: 'Section ID', placeholder: 'section SIS ID' },
                    { value: 'status', label: 'Status', placeholder: 'active, deleted' }
                ],
                'user_observers': [
                    { value: 'observer_id', label: 'Observer ID', placeholder: 'observer SIS ID' },
                    { value: 'student_id', label: 'Student ID', placeholder: 'student SIS ID' },
                    { value: 'status', label: 'Status', placeholder: 'active, deleted' }
                ],
                'change_sis_id': [
                    { value: 'old_id', label: 'Old ID', placeholder: 'old/current SIS ID' },
                    { value: 'new_id', label: 'New ID', placeholder: 'new SIS ID' },
                    { value: 'old_integration_id', label: 'Old Integration ID', placeholder: 'old/current integration ID' },
                    { value: 'new_integration_id', label: 'New Integration ID', placeholder: 'new integration ID' },
                    { value: 'type', label: 'Type', placeholder: 'user, course, section, account, term' }
                ],
                'differentiation_tag_sets': [
                    { value: 'tag_set_id', label: 'Tag Set ID', placeholder: 'tag set SIS ID' },
                    { value: 'course_id', label: 'Course ID', placeholder: 'course SIS ID' },
                    { value: 'set_name', label: 'Set Name', placeholder: 'e.g., First Tag Set' },
                    { value: 'status', label: 'Status', placeholder: 'active, deleted' }
                ],
                'differentiation_tags': [
                    { value: 'tag_id', label: 'Tag ID', placeholder: 'tag SIS ID' },
                    { value: 'tag_set_id', label: 'Tag Set ID', placeholder: 'tag set SIS ID' },
                    { value: 'course_id', label: 'Course ID', placeholder: 'course SIS ID' },
                    { value: 'name', label: 'Tag Name', placeholder: 'e.g., Tag1' },
                    { value: 'status', label: 'Status', placeholder: 'available, deleted' }
                ],
                'differentiation_tag_membership': [
                    { value: 'tag_id', label: 'Tag ID', placeholder: 'tag SIS ID' },
                    { value: 'user_id', label: 'User ID', placeholder: 'user SIS ID' },
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

        async function searchAndPopulateCourses(searchTerm, searchField) {
            if (!searchTerm || searchTerm.length < 1) return;

            const domain = document.querySelector('#domain')?.value;
            const token = document.querySelector('#token')?.value;
            const errorContainer = document.getElementById('courses-search-error-container');

            // Clear any previous errors
            if (errorContainer) {
                errorContainer.style.display = 'none';
                errorContainer.innerHTML = '';
            }

            if (!domain || !token) {
                console.log('Domain or token not available for courses search');
                showCoursesSearchResult('Please configure Canvas domain and API token first.', 'warning');
                return;
            }

            try {
                const result = await window.axios.getCourseInfo({ domain, token, bpCourseID: searchTerm });

                if (result.id) {
                    // Course found, auto-populate directly
                    populateCoursesFields(result, searchField);
                } else {
                    // No course found
                    showCoursesSearchResult('No course found for the entered ID.', 'warning');
                }
            } catch (error) {
                console.error('Courses search error:', error);

                // Format error for display
                const errorItem = {
                    id: 'courses-search',
                    reason: error.message || 'Unknown error occurred',
                    isNetworkError: error.code === 'NETWORK_ERROR' || error.message?.includes('fetch') || error.message?.includes('ENOTFOUND'),
                    status: error.status || error.response?.status
                };

                // Show detailed error card
                if (errorContainer) {
                    errorContainer.innerHTML = createErrorCard([errorItem], 'courses search');
                    errorContainer.style.display = 'block';
                }

                // Also show toast notification
                showCoursesSearchResult('Courses search failed. Check the error details below.', 'danger');
            }
        }

        async function searchAndPopulateSections(searchTerm, searchField) {
            if (!searchTerm || searchTerm.length < 1) return;

            const domain = document.querySelector('#domain')?.value;
            const token = document.querySelector('#token')?.value;
            const errorContainer = document.getElementById('sections-search-error-container');

            // Clear any previous errors
            if (errorContainer) {
                errorContainer.style.display = 'none';
                errorContainer.innerHTML = '';
            }

            if (!domain || !token) {
                console.log('Domain or token not available for sections search');
                showSectionsSearchResult('Please configure Canvas domain and API token first.', 'warning');
                return;
            }

            try {
                const result = await window.electronAPI.searchSections(domain, token, searchTerm);

                if (result.success && result.section) {
                    // Section found, auto-populate directly
                    populateSectionsFields(result.section, searchField);
                } else {
                    // No section found
                    showSectionsSearchResult('No section found for the entered ID.', 'warning');
                }
            } catch (error) {
                console.error('Sections search error:', error);

                // Format error for display
                const errorItem = {
                    id: 'sections-search',
                    reason: error.message || 'Unknown error occurred',
                    isNetworkError: error.code === 'NETWORK_ERROR' || error.message?.includes('fetch') || error.message?.includes('ENOTFOUND'),
                    status: error.status || error.response?.status
                };

                // Show detailed error card
                if (errorContainer) {
                    errorContainer.innerHTML = createErrorCard([errorItem], 'sections search');
                    errorContainer.style.display = 'block';
                }

                // Also show toast notification
                showSectionsSearchResult('Sections search failed. Check the error details below.', 'danger');
            }
        }

        async function searchAndDisplayEnrollments(searchTerm, searchType) {
            if (!searchTerm || searchTerm.length < 1) return;

            const domain = document.querySelector('#domain')?.value;
            const token = document.querySelector('#token')?.value;
            const errorContainer = document.getElementById('enrollments-search-error-container');
            const resultsContainer = document.getElementById('enrollments-search-results-container');

            // Clear any previous errors and results
            if (errorContainer) {
                errorContainer.style.display = 'none';
                errorContainer.innerHTML = '';
            }
            if (resultsContainer) {
                resultsContainer.style.display = 'none';
            }

            if (!domain || !token) {
                console.log('Domain or token not available for enrollments search');
                showEnrollmentsSearchResult('Please configure Canvas domain and API token first.', 'warning');
                return;
            }

            try {
                const result = await window.electronAPI.searchEnrollments(domain, token, searchTerm, searchType);

                if (result.success && result.enrollments) {
                    // Display enrollments in expandable format
                    displayEnrollmentResults(result.enrollments, result.searchType);
                    showEnrollmentsSearchResult(`Found ${result.enrollments.length} enrollment(s) for ${searchType} ID: ${searchTerm}`, 'success');
                } else {
                    // No enrollments found
                    showEnrollmentsSearchResult(`No enrollments found for ${searchType} ID: ${searchTerm}`, 'warning');
                }
            } catch (error) {
                console.error('Enrollments search error:', error);

                // Format error for display
                const errorItem = {
                    id: 'enrollments-search',
                    reason: error.message || 'Unknown error occurred',
                    isNetworkError: error.code === 'NETWORK_ERROR' || error.message?.includes('fetch') || error.message?.includes('ENOTFOUND'),
                    status: error.status || error.response?.status
                };

                // Show detailed error card
                if (errorContainer) {
                    errorContainer.innerHTML = createErrorCard([errorItem], 'enrollments search');
                    errorContainer.style.display = 'block';
                }

                // Also show toast notification
                showEnrollmentsSearchResult('Enrollments search failed. Check the error details below.', 'danger');
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

        function populateCoursesFields(course, excludeField) {
            // Map the Canvas course data to SIS fields
            // Based on Canvas API course response and SIS courses CSV fields
            const courseFieldMappings = {
                'course_id': course.sis_course_id || '',
                'short_name': course.course_code || '',
                'long_name': course.name || '',
                'account_id': '',
                'term_id': '',
                'status': course.workflow_state || 'active',
                'integration_id': course.integration_id || '',
                'start_date': course.start_at ? new Date(course.start_at).toISOString().slice(0, 10) : '',
                'end_date': course.end_at ? new Date(course.end_at).toISOString().slice(0, 10) : '',
                'course_format': course.course_format || '',
                'blueprint_course_id': ''
            };

            // Always populate all fields to give explicit control over what should be blank vs random
            let fieldsWithValues = 0;
            Object.entries(courseFieldMappings).forEach(([field, value]) => {
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
            let message = `Found course: ${course.name || course.course_code}.`;
            if (fieldsWithValues > 0) {
                message += ` Auto-populated ${fieldsWithValues} fields with data.`;
            } else {
                message += ` No additional data available to populate.`;
            }

            showCoursesSearchResult(message, 'success');
        }

        // Show courses search result message
        function showCoursesSearchResult(message, type) {
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

        function populateSectionsFields(section, excludeField) {
            // Map the Canvas section data to SIS fields
            // Based on Canvas API section response and SIS sections CSV fields
            const sectionFieldMappings = {
                'section_id': section.sis_section_id || '',
                'course_id': section.sis_course_id || '',
                'section_name': section.name || '',
                'status': 'active', // Always set to active as requested
                'start_date': section.start_at ? new Date(section.start_at).toISOString().slice(0, 10) : '',
                'end_date': section.end_at ? new Date(section.end_at).toISOString().slice(0, 10) : '',
                'integration_id': section.integration_id || ''
            };

            // Always populate all fields to give explicit control over what should be blank vs random
            let fieldsWithValues = 0;
            Object.entries(sectionFieldMappings).forEach(([field, value]) => {
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
            let message = `Found section: ${section.name}.`;
            if (fieldsWithValues > 0) {
                message += ` Auto-populated ${fieldsWithValues} fields with data.`;
            } else {
                message += ` No additional data available to populate.`;
            }

            showSectionsSearchResult(message, 'success');
        }

        // Show sections search result message
        function showSectionsSearchResult(message, type) {
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

        // Show enrollments search result message
        function showEnrollmentsSearchResult(message, type) {
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

        // Global variable to store current enrollment results for CSV generation
        let currentEnrollmentResults = [];

        // Function to display enrollment results in expandable/collapsible format
        function displayEnrollmentResults(results, searchType) {
            const resultsContainer = document.getElementById('enrollments-search-results-container');
            const resultsList = document.getElementById('enrollments-results-list');

            if (!resultsContainer || !resultsList) return;

            // Store results globally for CSV generation
            currentEnrollmentResults = results;

            // Clear previous results
            resultsList.innerHTML = '';

            if (results.length === 0) {
                resultsList.innerHTML = '<div class="text-muted text-center py-3">No enrollments found.</div>';
                resultsContainer.style.display = 'block';
                return;
            }

            // Create expandable items for each enrollment
            results.forEach((enrollment, index) => {
                const enrollmentId = `enrollment-${index}`;
                const collapseId = `collapse-${enrollmentId}`;

                const enrollmentHtml = `
                    <div class="card mb-2">
                        <div class="card-header p-2" style="cursor: pointer;" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="false">
                            <div class="d-flex justify-content-between align-items-center">
                                <div class="fw-bold">
                                    <i class="bi bi-person-graduate me-2"></i>
                                    ${searchType.charAt(0).toUpperCase() + searchType.slice(1)} Enrollment ${index + 1}
                                    ${enrollment.user_id ? `- User: ${enrollment.user_id}` : ''}
                                    ${enrollment.course_id ? `- Course: ${enrollment.course_id}` : ''}
                                    ${enrollment.section_id ? `- Section: ${enrollment.section_id}` : ''}
                                </div>
                                <i class="bi bi-chevron-down"></i>
                            </div>
                        </div>
                        <div class="collapse" id="${collapseId}">
                            <div class="card-body p-3">
                                <div class="row">
                                    <div class="col-md-6">
                                        <strong>User ID:</strong> ${enrollment.user_id || 'N/A'}<br>
                                        <strong>Course ID:</strong> ${enrollment.course_id || 'N/A'}<br>
                                        <strong>Section ID:</strong> ${enrollment.section_id || 'N/A'}<br>
                                        <strong>Role ID:</strong> ${enrollment.role_id || 'N/A'}<br>
                                        <strong>Status:</strong> <span class="badge ${enrollment.status === 'active' ? 'bg-success' : enrollment.status === 'deleted' ? 'bg-danger' : 'bg-secondary'}">${enrollment.status || 'N/A'}</span>
                                    </div>
                                    <div class="col-md-6">
                                        <strong>Integration ID:</strong> ${enrollment.integration_id || 'N/A'}<br>
                                        <strong>Associated User ID:</strong> ${enrollment.associated_user_id || 'N/A'}<br>
                                        <strong>Start Date:</strong> ${enrollment.start_date || 'N/A'}<br>
                                        <strong>End Date:</strong> ${enrollment.end_date || 'N/A'}<br>
                                        <strong>Limit Section Privileges:</strong> ${enrollment.limit_section_privileges ? 'Yes' : 'No'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                resultsList.innerHTML += enrollmentHtml;
            });

            // Update results header with count
            const headerTitle = resultsContainer.querySelector('.card-header h6');
            if (headerTitle) {
                headerTitle.innerHTML = `<i class="bi bi-people me-2"></i>Enrollment Results (${results.length} found)`;
            }

            // Show the results container
            resultsContainer.style.display = 'block';
        }

        // Function to generate CSV from enrollment results
        function generateEnrollmentsCSV() {
            if (!currentEnrollmentResults || currentEnrollmentResults.length === 0) {
                showEnrollmentsSearchResult('No enrollment data to export', 'warning');
                return;
            }

            // Define CSV headers based on SIS enrollments CSV format
            const headers = [
                'user_id',
                'course_id',
                'section_id',
                'status',
                'associated_user_id',
                'role_id',
                'integration_id',
                'start_date',
                'end_date',
                'limit_section_privileges'
            ];

            // Create CSV content
            let csvContent = headers.join(',') + '\n';

            currentEnrollmentResults.forEach(enrollment => {
                const row = headers.map(header => {
                    let value = enrollment[header] || '';
                    // Handle boolean values
                    if (header === 'limit_section_privileges') {
                        value = enrollment[header] ? 'true' : 'false';
                    }
                    // Escape commas and quotes in CSV
                    if (value.toString().includes(',') || value.toString().includes('"')) {
                        value = `"${value.toString().replace(/"/g, '""')}"`;
                    }
                    return value;
                });
                csvContent += row.join(',') + '\n';
            });

            // Create and download CSV file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `enrollments_export_${new Date().getTime()}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showEnrollmentsSearchResult(`Exported ${currentEnrollmentResults.length} enrollments to CSV`, 'success');
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
                toggleIcon.className = 'bi bi-chevron-down';
            } else {
                collapseElement.classList.add('show');
                toggleIcon.className = 'bi bi-chevron-up';
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

        // Add search courses button event listener for the new UI
        document.getElementById('search-courses-btn').addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const searchInput = document.getElementById('courses-search-input');
            const searchValue = searchInput.value.trim();
            const errorContainer = document.getElementById('courses-search-error-container');

            // Clear any previous errors
            if (errorContainer) {
                errorContainer.style.display = 'none';
                errorContainer.innerHTML = '';
            }

            if (searchValue) {
                showCoursesSearchResult('Searching for course...', 'info');
                await searchAndPopulateCourses(searchValue, null);
                // Keep search value in input for reference
            } else {
                showCoursesSearchResult('Please enter a numeric Course ID', 'warning');
            }
        });

        // Add search sections button event listener for the new UI
        document.getElementById('search-sections-btn').addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const searchInput = document.getElementById('sections-search-input');
            const searchValue = searchInput.value.trim();
            const errorContainer = document.getElementById('sections-search-error-container');

            // Clear any previous errors
            if (errorContainer) {
                errorContainer.style.display = 'none';
                errorContainer.innerHTML = '';
            }

            if (searchValue) {
                showSectionsSearchResult('Searching for section...', 'info');
                await searchAndPopulateSections(searchValue, null);
                // Keep search value in input for reference
            } else {
                showSectionsSearchResult('Please enter a numeric Section ID', 'warning');
            }
        });

        // Add search enrollments button event listener for the new UI
        document.getElementById('search-enrollments-btn').addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const searchInput = document.getElementById('enrollments-search-input');
            const searchTypeSelect = document.getElementById('enrollments-search-type');
            const searchValue = searchInput.value.trim();
            const searchType = searchTypeSelect.value;
            const errorContainer = document.getElementById('enrollments-search-error-container');

            // Clear any previous errors
            if (errorContainer) {
                errorContainer.style.display = 'none';
                errorContainer.innerHTML = '';
            }

            if (searchValue) {
                showEnrollmentsSearchResult(`Searching for ${searchType} enrollments...`, 'info');
                await searchAndDisplayEnrollments(searchValue, searchType);
                // Keep search value in input for reference
            } else {
                showEnrollmentsSearchResult(`Please enter a ${searchType} ID`, 'warning');
            }
        });

        // Add CSV generation button event listener
        document.getElementById('generate-enrollments-csv-btn').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            generateEnrollmentsCSV();
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

        // Allow Enter key in search inputs to trigger search
        document.getElementById('user-search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('search-users-btn').click();
            }
        });

        document.getElementById('account-search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('search-accounts-btn').click();
            }
        });

        document.getElementById('terms-search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('search-terms-btn').click();
            }
        });

        document.getElementById('courses-search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('search-courses-btn').click();
            }
        });

        document.getElementById('sections-search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('search-sections-btn').click();
            }
        });

        document.getElementById('enrollments-search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('search-enrollments-btn').click();
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
    function hideProgress() {
        document.getElementById('bulk-progress').style.display = 'none';
    }
}

