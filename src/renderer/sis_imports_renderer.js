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
                <div class="col-2">
                    <label for="row-count" class="form-label">Number of Rows</label>
                    <input type="number" id="row-count" class="form-control" min="1" max="10000" value="10" required>
                    <div class="form-text">How many data rows to generate (1-10,000)</div>
                </div>
                <div class="col-3" id="email-domain-group">
                    <label for="email-domain" class="form-label">Email Domain</label>
                    <input type="text" id="email-domain" class="form-control" value="@school.edu" placeholder="@school.edu">
                    <div class="form-text">Domain for generated email addresses</div>
                </div>
            </div>
            
            <!-- CSV Field Options Section -->
            <div class="row mb-3" id="csv-options-section" style="display: none;">
                <div class="col-12 mb-3">
                    <h5 class="text-primary">CSV Field Options</h5>
                    <p class="text-muted small">Select fields to customize for your CSV. Required fields will be auto-generated if not specified.</p>
                </div>
                
                <!-- Field Selection Controls -->
                <div class="row mt-3">
                    <div class="col-3">
                        <label for="csv-field-select" class="form-label">Field to Customize</label>
                        <select id="csv-field-select" class="form-select">
                            <option value="">Select a field...</option>
                        </select>
                    </div>
                    <div class="col-3">
                        <label for="csv-field-value" class="form-label">Value</label>
                        <input id="csv-field-value" type="text" class="form-control" placeholder="Enter value...">
                    </div>
                    <div class="col-auto d-flex align-items-end">
                        <button type="button" class="btn btn-secondary me-2" id="csv-field-add">Add/Update</button>
                        <button type="button" class="btn btn-link" id="csv-field-clear">Clear all</button>
                    </div>
                </div>
                <div id="csv-field-summary" class="form-text mt-1"></div>
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
                    <button type="submit" id="generate-single-file" class="btn btn-primary">Generate CSV File</button>
                    <button type="button" id="add-to-list" class="btn btn-success ms-2" style="display: none;">Add to List</button>
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
            }
        });

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
                ? (document.getElementById('email-domain').value.trim() || '@school.edu')
                : '@school.edu';
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

            // Special mapping for change_sis_id generator options
            let changeSisIdOptions = {};
            if (fileType === 'change_sis_id') {
                if (selectedFields.old_id) changeSisIdOptions.specificOldId = selectedFields.old_id;
                if (selectedFields.new_id) changeSisIdOptions.specificNewId = selectedFields.new_id;
                if (selectedFields.type) changeSisIdOptions.specificType = selectedFields.type;
            }

            return {
                // Core types
                userOptions: fileType === 'users' ? options : {},
                accountOptions: fileType === 'accounts' ? options : {},
                termOptions: fileType === 'terms' ? options : {},
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

            if (e.target.value) {
                csvOptionsSection.style.display = 'block';
                updateFieldOptionsDropdown(e.target.value);
            } else {
                csvOptionsSection.style.display = 'none';
            }

            // Show email domain only for 'users'
            const emailGroup = document.getElementById('email-domain-group');
            if (emailGroup) emailGroup.style.display = (e.target.value === 'users') ? 'block' : 'none';
        });

        // CSV Field Selection Handlers
        let selectedFields = {}; // Store field selections for current file type

        function updateFieldOptionsDropdown(fileType) {
            const fieldSelect = document.getElementById('csv-field-select');
            const fieldSummary = document.getElementById('csv-field-summary');

            if (!fieldSelect) {
                console.error('csv-field-select element not found!');
                return;
            }

            // Clear existing options
            fieldSelect.innerHTML = '<option value="">Select a field...</option>';
            selectedFields = {}; // Reset selections when file type changes

            // Define field options for each CSV type (based on official Canvas documentation)
            const fieldOptions = {
                'users': [
                    { value: 'user_id', label: 'User ID', placeholder: 'e.g., U123456' },
                    { value: 'login_id', label: 'Login ID', placeholder: 'e.g., jsmith' },
                    { value: 'authentication_provider_id', label: 'Auth Provider ID', placeholder: 'e.g., google' },
                    { value: 'password', label: 'Password', placeholder: 'Leave empty for auto-generation' },
                    { value: 'first_name', label: 'First Name', placeholder: 'e.g., John' },
                    { value: 'last_name', label: 'Last Name', placeholder: 'e.g., Doe' },
                    { value: 'full_name', label: 'Full Name', placeholder: 'e.g., John Doe' },
                    { value: 'sortable_name', label: 'Sortable Name', placeholder: 'e.g., Doe, John' },
                    { value: 'short_name', label: 'Short Name', placeholder: 'e.g., John' },
                    { value: 'email', label: 'Email', placeholder: 'e.g., john.doe@school.edu' },
                    { value: 'status', label: 'Status', placeholder: 'active, deleted, suspended' },
                    { value: 'integration_id', label: 'Integration ID', placeholder: 'e.g., SIS_USER_123' }
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
                    { value: 'associated_user_id', label: 'Associated User ID', placeholder: 'e.g., observer parent user' },
                    { value: 'limit_section_privileges', label: 'Limit Section Privileges', placeholder: 'true, false' }
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
                    { value: 'name', label: 'Group Name', placeholder: 'e.g., Group1' },
                    { value: 'status', label: 'Status', placeholder: 'available, closed, completed, deleted' },
                    { value: 'max_membership', label: 'Max Membership', placeholder: 'e.g., 5' }
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
                    { value: 'status', label: 'Status', placeholder: 'active, deleted' }
                ],
                'logins': [
                    { value: 'user_id', label: 'User ID', placeholder: 'e.g., 01103' },
                    { value: 'login_id', label: 'Login ID', placeholder: 'e.g., bsmith01' },
                    { value: 'authentication_provider_id', label: 'Auth Provider ID', placeholder: 'e.g., google' },
                    { value: 'password', label: 'Password', placeholder: 'Leave empty for auto-generation' },
                    { value: 'existing_user_id', label: 'Existing User ID', placeholder: 'e.g., existing_123' },
                    { value: 'existing_integration_id', label: 'Existing Integration ID', placeholder: 'e.g., existing_int_123' },
                    { value: 'existing_canvas_user_id', label: 'Existing Canvas User ID', placeholder: 'e.g., 98' },
                    { value: 'email', label: 'Email', placeholder: 'e.g., bob.smith@myschool.edu' }
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

            // Add options for the selected file type
            const options = fieldOptions[fileType] || [];
            options.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option.value;
                optionElement.textContent = option.label;
                optionElement.dataset.placeholder = option.placeholder;
                fieldSelect.appendChild(optionElement);
            });

            renderFieldSummary();
        }

        function renderFieldSummary() {
            const fieldSummary = document.getElementById('csv-field-summary');
            const entries = Object.entries(selectedFields);

            if (entries.length === 0) {
                fieldSummary.textContent = 'No fields customized. All fields will use auto-generated values.';
            } else {
                const summaryText = entries.map(([field, value]) => {
                    const fieldSelect = document.getElementById('csv-field-select');
                    const option = Array.from(fieldSelect.options).find(opt => opt.value === field);
                    const label = option ? option.textContent : field;
                    return `${label}: "${value}"`;
                }).join(', ');
                fieldSummary.textContent = `Customized fields → ${summaryText}`;
            }
        }

        function addOrUpdateField(fieldKey, fieldValue) {
            if (fieldValue && fieldValue.trim()) {
                selectedFields[fieldKey] = fieldValue.trim();
            } else {
                delete selectedFields[fieldKey];
            }
            renderFieldSummary();
        }

        // CSV Field Selection Event Handlers
        document.getElementById('csv-field-select').addEventListener('change', (e) => {
            const fieldValue = document.getElementById('csv-field-value');
            const selectedOption = e.target.selectedOptions[0];

            if (e.target.value) {
                fieldValue.placeholder = selectedOption.dataset.placeholder || 'Enter value...';
                fieldValue.value = selectedFields[e.target.value] || '';
                fieldValue.disabled = false;
            } else {
                fieldValue.placeholder = 'Select a field first...';
                fieldValue.value = '';
                fieldValue.disabled = true;
            }
        });

        document.getElementById('csv-field-add').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const fieldSelect = document.getElementById('csv-field-select');
            const fieldValue = document.getElementById('csv-field-value');

            if (fieldSelect.value && fieldValue.value.trim()) {
                addOrUpdateField(fieldSelect.value, fieldValue.value);
                // Keep the field selected but clear the value for next entry
                fieldValue.value = '';
            }
        });

        document.getElementById('csv-field-clear').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            selectedFields = {};
            document.getElementById('csv-field-value').value = '';
            renderFieldSummary();
        });

        document.getElementById('preview-data').addEventListener('click', async () => {
            const fileType = document.getElementById('file-type').value;
            const rowCount = Math.min(5, parseInt(document.getElementById('row-count').value) || 5);
            const emailDomain = fileType === 'users'
                ? (document.getElementById('email-domain').value.trim() || '@school.edu')
                : '@school.edu';
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
                ? (document.getElementById('email-domain').value.trim() || '@school.edu')
                : '@school.edu';
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

} // end createSingleSISFile

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
                    <input type="text" id="bulk-email-domain" class="form-control" value="@school.edu" placeholder="@school.edu">
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
            const emailDomain = document.getElementById('bulk-email-domain').value.trim() || '@school.edu';
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
