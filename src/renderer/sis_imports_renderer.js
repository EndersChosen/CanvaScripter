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
        const errorTitle = failedItem.status ?
            `HTTP Error ${failedItem.status}` : 'Unknown Error';

        let errorDetail = '';
        if (failedItem.responseData) {
            if (failedItem.responseData.errors) {
                errorDetail = Array.isArray(failedItem.responseData.errors) ?
                    failedItem.responseData.errors.join(', ') :
                    JSON.stringify(failedItem.responseData.errors);
            } else {
                errorDetail = JSON.stringify(failedItem.responseData);
            }
        } else if (failedItem.status) {
            if (failedItem.status === 404) {
                if (operationType.includes('user')) {
                    errorDetail = `User not found. Please check the username/email and try again.`;
                } else if (operationType.includes('account')) {
                    errorDetail = `Account not found. Please check the account ID and try again.`;
                } else {
                    errorDetail = `Resource not found (404 error).`;
                }
            } else {
                errorDetail = `Server returned error ${failedItem.status}.`;
            }
        } else {
            errorDetail = 'Unknown error occurred.';
        }

        const itemLabel = errorCount === 1 ? '' : ` - Search ${index + 1}`;
        errorHTML += `
                <h6 class="text-danger mb-2">${errorTitle}${itemLabel}</h6>
                <p class="mb-2"><strong>Error:</strong> <code>${failedItem.reason || 'Unknown error'}</code></p>
                <p class="mb-0 text-muted">${errorDetail}</p>
            `;
        if (index < failedItems.length - 1) {
            errorHTML += '<hr>';
        }
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
            <style>
                #create-single-sis-form .card { font-size: 0.875rem; }
                #create-single-sis-form .card-header h3, #create-single-sis-form .card-header h6 { font-size: 1.1rem; margin-bottom: 0.25rem; }
                #create-single-sis-form .card-header small { font-size: 0.75rem; }
                #create-single-sis-form .card-body { padding: 0.75rem; }
                #create-single-sis-form .card-footer { padding: 0.5rem 0.75rem; }
                #create-single-sis-form .form-label { font-size: 0.8rem; margin-bottom: 0.25rem; }
                #create-single-sis-form .form-control, #create-single-sis-form .form-select { 
                    font-size: 0.8rem; 
                    padding: 0.25rem 0.5rem;
                    height: auto;
                }
                #create-single-sis-form .btn { 
                    font-size: 0.8rem; 
                    padding: 0.35rem 0.75rem;
                }
                #create-single-sis-form .form-check { margin-bottom: 0.5rem; }
                #create-single-sis-form .form-text { font-size: 0.7rem; margin-top: 0.15rem; }
                #create-single-sis-form .mt-2 { margin-top: 0.5rem !important; }
                #create-single-sis-form .mt-3 { margin-top: 0.75rem !important; }
                #create-single-sis-form .mb-2 { margin-bottom: 0.5rem !important; }
                #create-single-sis-form .mb-3 { margin-bottom: 0.75rem !important; }
                #create-single-sis-form .mb-4 { margin-bottom: 1rem !important; }
                #create-single-sis-form .progress { height: 12px !important; }
                #create-single-sis-form h5 { font-size: 1rem; }
                #create-single-sis-form h6 { font-size: 0.9rem; }
                #create-single-sis-form p { margin-bottom: 0.5rem; font-size: 0.85rem; }
                #create-single-sis-form .alert { padding: 0.5rem 0.75rem; font-size: 0.8rem; }
                #create-single-sis-form .badge { font-size: 0.75rem; }
                #create-single-sis-form .row { margin-bottom: 0.75rem; }
                #create-single-sis-form input[type="number"] { font-size: 0.8rem; padding: 0.25rem 0.5rem; }
            </style>
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-file-earmark-spreadsheet me-1"></i>Create Single SIS Import File
                    </h3>
                    <small class="text-muted">Generate a single CSV file for SIS import with random sample data, or build a collection of files for zip export</small>
                </div>
                <div class="card-body">
                    <div class="row mb-2">
                        <div class="col-md-6">
                            <label for="file-type" class="form-label">File Type</label>
                            <select id="file-type" class="form-select form-select-sm" required>
                                <option value="">Select file type...</option>
                                <option value="users">Users</option>
                                <option value="accounts">Accounts</option>
                                <option value="terms">Terms</option>
                                <option value="courses">Courses</option>
                                <option value="sections">Sections</option>
                                <option value="enrollments">Enrollments</option>
                                <option value="groups">Groups</option>
                                <option value="group_categories">Group Categories</option>
                                <option value="group_memberships">Group Memberships</option>
                                <option value="xlists">Cross-listings</option>
                                <option value="user_observers">User Observers</option>
                                <option value="admins">Admins</option>
                                <option value="logins">Logins</option>
                                <option value="change_sis_ids">Change SIS IDs</option>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label for="row-count" class="form-label">Number of Rows</label>
                            <input type="number" id="row-count" class="form-control form-control-sm" min="1" max="10000" value="1" required>
                        </div>
                    </div>
                    
                    <!-- Search Fields Section -->
                    <div id="search-fields-section" class="row mb-2" style="display: none;">
                        <div class="col-12">
                            <div class="card">
                                <div class="card-header">
                                    <h6 class="mb-0">
                                        <i class="bi bi-search me-2"></i>Search and Import Real Data
                                        <small class="text-muted ms-2">(Optional - leave empty for sample data)</small>
                                    </h6>
                                </div>
                                <div class="card-body">
                                    <div id="search-inputs-container">
                                        <!-- Dynamic search inputs will be added here -->
                                    </div>
                                    <button type="button" id="search-data-btn" class="btn btn-sm btn-outline-primary mt-2" disabled>
                                        <i class="bi bi-search me-1"></i>Search & Import
                                    </button>
                                    <div id="search-results" class="mt-2" style="display: none;">
                                        <!-- Search results will be displayed here -->
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Field Configuration Section -->
                    <div id="field-config-section" class="row mb-2" style="display: none;">
                        <div class="col-12">
                            <div class="card">
                                <div class="card-header" style="cursor: pointer;" data-bs-toggle="collapse" data-bs-target="#field-config-collapse" aria-expanded="true">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <h6 class="mb-0">
                                            <i class="bi bi-gear me-2"></i>Field Configuration
                                            <small class="text-muted ms-2">(Customize which fields to include)</small>
                                        </h6>
                                        <i class="bi bi-chevron-down"></i>
                                    </div>
                                </div>
                                <div id="field-config-collapse" class="collapse show">
                                    <div class="card-body">
                                        <!-- File Import Section -->
                                        <div class="alert alert-info mb-3">
                                            <div class="d-flex align-items-center mb-2">
                                                <i class="bi bi-file-earmark-arrow-up me-2"></i>
                                                <strong>Import IDs from File</strong>
                                            </div>
                                            <p class="mb-2 small">Import a list of IDs from a file (one ID per line, or CSV with header). The file values will be used for one field, while other fields use your configuration below.</p>
                                            <div class="row g-2">
                                                <div class="col-md-6">
                                                    <label class="form-label small mb-1">Field to populate from file:</label>
                                                    <select id="file-import-field" class="form-select form-select-sm">
                                                        <option value="">Don't use file import</option>
                                                    </select>
                                                </div>
                                                <div class="col-md-6">
                                                    <label class="form-label small mb-1">Select file:</label>
                                                    <div class="input-group input-group-sm">
                                                        <input type="text" id="file-import-path" class="form-control form-control-sm" placeholder="No file selected" readonly>
                                                        <button type="button" id="browse-import-file" class="btn btn-outline-secondary btn-sm" disabled>
                                                            <i class="bi bi-folder2-open"></i>
                                                        </button>
                                                        <button type="button" id="clear-import-file" class="btn btn-outline-danger btn-sm" style="display: none;">
                                                            <i class="bi bi-x-circle"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div id="file-import-preview" class="mt-2" style="display: none;">
                                                <small class="text-muted">
                                                    <i class="bi bi-check-circle text-success me-1"></i>
                                                    <span id="file-import-count">0</span> IDs loaded from file
                                                </small>
                                            </div>
                                        </div>
                                        
                                        <div id="field-checkboxes-container">
                                            <!-- Dynamic field checkboxes will be added here -->
                                        </div>
                                    </div>
                                    <div class="card-footer" id="field-config-footer">
                                    <div id="standard-mode-buttons">
                                        <button type="button" id="add-manual-row" class="btn btn-sm btn-success me-2">
                                            <i class="bi bi-plus-circle me-1"></i>Add Row from Configuration
                                        </button>
                                        <button type="button" id="add-random-rows" class="btn btn-sm btn-outline-success me-2">
                                            <i class="bi bi-shuffle me-1"></i>Add Random Rows
                                        </button>
                                        <button type="button" id="clear-all-rows" class="btn btn-sm btn-outline-danger">
                                            <i class="bi bi-trash me-1"></i>Clear All Rows
                                        </button>
                                        <small class="text-muted ms-3">Add individual custom rows or generate multiple random rows</small>
                                    </div>
                                    <div id="large-file-mode-buttons" style="display: none;">
                                        <button type="button" id="generate-csv-from-config" class="btn btn-sm btn-primary me-2">
                                            <i class="bi bi-file-earmark-arrow-down me-1"></i>Generate CSV from Configuration
                                        </button>
                                        <button type="button" id="generate-csv-random" class="btn btn-sm btn-outline-primary">
                                            <i class="bi bi-shuffle me-1"></i>Generate CSV with Random Data
                                        </button>
                                        <small class="text-muted ms-3">Large file mode - rows generated directly to file</small>
                                    </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- CSV Data Section - Shows all rows that will be included in the CSV -->
                    <div id="csv-data-section" class="row mb-2" style="display: none;">
                        <div class="col-12">
                            <div class="card border-success">
                                <div class="card-header bg-success-subtle" style="cursor: pointer;" data-bs-toggle="collapse" data-bs-target="#csv-data-collapse" aria-expanded="true">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <h6 class="mb-0">
                                            <i class="bi bi-file-earmark-spreadsheet me-2"></i>CSV Data
                                            <small class="text-muted ms-2">(Rows to be included in the CSV file)</small>
                                        </h6>
                                        <i class="bi bi-chevron-down"></i>
                                    </div>
                                </div>
                                <div id="csv-data-collapse" class="collapse show">
                                    <div class="card-body">
                                        <div id="csv-data-results">
                                            <!-- CSV data rows will be displayed here -->
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row mb-3" id="email-domain-row" style="display: none;">
                        <div class="col-12">
                            <label for="email-domain" class="form-label">Email Domain (for users)</label>
                            <input type="text" id="email-domain" class="form-control" placeholder="@instructure.com" value="@instructure.com">
                            <small class="form-text text-muted">Domain to use for generated email addresses (include @)</small>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-12">
                            <button type="submit" id="generate-sis-file" class="btn btn-primary" disabled>Generate CSV File</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        eContent.appendChild(createSISForm);
    } else {
        createSISForm.hidden = false;
    }

    // Only add event listeners once
    if (!createSISForm.hasAttribute('data-listeners-added')) {
        // File type change handler
        document.getElementById('file-type').addEventListener('change', function () {
            const fileType = this.value;
            updateUIVisibility();

            if (fileType) {
                populateSearchFields(fileType);
                populateFieldConfiguration(fileType);

                // Initialize search results section for search-based data selection
                const searchResults = document.getElementById('search-results');
                searchResults.innerHTML = '';
                searchResults.style.display = 'none';
                searchResults.dataset.searchData = JSON.stringify([]);

                // Initialize CSV Data section - this will hold all rows to be exported
                const csvDataSection = document.getElementById('csv-data-section');
                const csvDataResults = document.getElementById('csv-data-results');
                csvDataSection.style.display = 'none'; // Hidden until data is added
                csvDataResults.innerHTML = '';
                csvDataResults.dataset.csvData = JSON.stringify([]);
            }

            validateForm();
            clearFieldInputs();
        });

        // Function to update UI visibility based on row count
        function updateUIVisibility() {
            const fileType = document.getElementById('file-type').value;
            const rowCount = parseInt(document.getElementById('row-count').value) || 0;
            const emailDomainRow = document.getElementById('email-domain-row');
            const searchFieldsSection = document.getElementById('search-fields-section');
            const fieldConfigSection = document.getElementById('field-config-section');
            const csvDataSection = document.getElementById('csv-data-section');
            const standardModeButtons = document.getElementById('standard-mode-buttons');
            const largeFileModeButtons = document.getElementById('large-file-mode-buttons');

            // For large files (1000+ rows), hide search and field config sections
            const isLargeFile = rowCount >= 1000;

            if (isLargeFile) {
                // Hide search section for large files (not practical to search for thousands of items)
                searchFieldsSection.style.display = 'none';
                csvDataSection.style.display = 'none';

                // Show field configuration for large files (allows customization like same user_id for all rows)
                if (fileType) {
                    fieldConfigSection.style.display = 'block';
                }

                // Show large file mode buttons, hide standard buttons
                if (standardModeButtons) standardModeButtons.style.display = 'none';
                if (largeFileModeButtons) largeFileModeButtons.style.display = 'block';

                // Show warning about large file generation
                let warningDiv = document.getElementById('large-file-warning');
                if (!warningDiv) {
                    warningDiv = document.createElement('div');
                    warningDiv.id = 'large-file-warning';
                    warningDiv.className = 'alert alert-warning mb-3';
                    warningDiv.innerHTML = `
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        <strong>Large File Mode:</strong> Generating ${rowCount.toLocaleString()} rows. Rows will be generated directly to the output file to prevent performance issues.
                    `;
                    const cardBody = createSISForm.querySelector('.card-body');
                    const rowCountRow = document.getElementById('row-count').closest('.row');
                    rowCountRow.parentNode.insertBefore(warningDiv, rowCountRow.nextSibling);
                }
            } else {
                // Remove warning if it exists
                const warningDiv = document.getElementById('large-file-warning');
                if (warningDiv) {
                    warningDiv.remove();
                }

                // Show standard mode buttons, hide large file mode buttons
                if (standardModeButtons) standardModeButtons.style.display = 'block';
                if (largeFileModeButtons) largeFileModeButtons.style.display = 'none';

                // Show email domain field only for users
                if (fileType === 'users') {
                    emailDomainRow.style.display = 'block';
                } else {
                    emailDomainRow.style.display = 'none';
                }

                // Show search and field configuration sections if a file type is selected
                if (fileType) {
                    // Only show search section for file types that support search
                    const searchSupportedTypes = ['users', 'courses', 'accounts', 'sections', 'logins', 'enrollments'];
                    if (searchSupportedTypes.includes(fileType)) {
                        searchFieldsSection.style.display = 'block';
                    } else {
                        searchFieldsSection.style.display = 'none';
                    }

                    fieldConfigSection.style.display = 'block';
                } else {
                    searchFieldsSection.style.display = 'none';
                    fieldConfigSection.style.display = 'none';
                    csvDataSection.style.display = 'none';
                }
            }
        }

        // Row count change handler
        document.getElementById('row-count').addEventListener('input', () => {
            updateUIVisibility();
            validateForm();
        });

        // File import field selection handler
        document.getElementById('file-import-field').addEventListener('change', function () {
            const browseBtn = document.getElementById('browse-import-file');
            const filePathInput = document.getElementById('file-import-path');
            const preview = document.getElementById('file-import-preview');
            const clearBtn = document.getElementById('clear-import-file');

            if (this.value) {
                browseBtn.disabled = false;
                // Update the field input to show it's using file data
                updateFieldImportState(this.value, true);
            } else {
                browseBtn.disabled = true;
                filePathInput.value = '';
                preview.style.display = 'none';
                clearBtn.style.display = 'none';
                // Clear stored import data
                delete filePathInput.dataset.importData;
                // Re-enable all field inputs
                updateFieldImportState(null, false);
            }
        });

        // Browse import file handler
        document.getElementById('browse-import-file').addEventListener('click', async () => {
            const result = await window.electronAPI.selectFile({
                filters: [
                    { name: 'Text Files', extensions: ['txt', 'csv'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });

            if (result && result.filePath) {
                try {
                    const fileContent = await window.electronAPI.readFile(result.filePath);
                    const importField = document.getElementById('file-import-field').value;
                    const parsedData = parseImportFile(fileContent, importField);

                    if (parsedData && parsedData.length > 0) {
                        document.getElementById('file-import-path').value = result.filePath;
                        document.getElementById('file-import-path').dataset.importData = JSON.stringify(parsedData);
                        document.getElementById('file-import-count').textContent = parsedData.length;
                        document.getElementById('file-import-preview').style.display = 'block';
                        document.getElementById('clear-import-file').style.display = 'inline-block';

                        // Update row count to match imported data
                        document.getElementById('row-count').value = parsedData.length;
                        updateUIVisibility();
                        validateForm();

                        // Update field state to show it's using file data
                        updateFieldImportState(importField, true);
                    } else {
                        alert('No valid data found in file');
                    }
                } catch (error) {
                    console.error('Error reading import file:', error);
                    alert(`Error reading file: ${error.message}`);
                }
            }
        });

        // Clear import file handler
        document.getElementById('clear-import-file').addEventListener('click', () => {
            const fileImportField = document.getElementById('file-import-field');
            const filePathInput = document.getElementById('file-import-path');
            const preview = document.getElementById('file-import-preview');
            const clearBtn = document.getElementById('clear-import-file');

            // Clear file data
            filePathInput.value = '';
            delete filePathInput.dataset.importData;
            preview.style.display = 'none';
            clearBtn.style.display = 'none';

            // Reset field to not using file import
            const previousField = fileImportField.value;
            fileImportField.value = '';

            // Re-enable the field input
            updateFieldImportState(previousField, false);

            // Reset row count to 1
            document.getElementById('row-count').value = '1';
            updateUIVisibility();
            validateForm();
        });

        // Form validation
        function validateForm() {
            const fileType = document.getElementById('file-type').value;
            const rowCount = document.getElementById('row-count').value;

            const isValid = fileType && rowCount && parseInt(rowCount) > 0;

            document.getElementById('generate-sis-file').disabled = !isValid;
        }

        function clearFieldInputs() {
            // Clear search results
            const searchResults = document.getElementById('search-results');
            if (searchResults) {
                searchResults.style.display = 'none';
                delete searchResults.dataset.searchData;
            }
        }

        // Generate file handler
        document.getElementById('generate-sis-file').addEventListener('click', async (e) => {
            e.preventDefault(); // Prevent form submission
            e.stopPropagation();

            const fileType = document.getElementById('file-type').value;
            const rowCount = parseInt(document.getElementById('row-count').value);
            const emailDomain = fileType === 'users'
                ? (document.getElementById('email-domain').value.trim() || '@instructure.com')
                : '@instructure.com';
            const authProviderId = ''; // Removed auth provider functionality
            const generateBtn = document.getElementById('generate-sis-file');
            const originalBtnText = generateBtn.innerHTML;

            // Show save dialog to let user choose where to save the file
            const defaultFileName = `${fileType}_${rowCount}_rows.csv`;
            const saveResult = await window.electronAPI.showSaveDialog({
                defaultPath: defaultFileName,
                filters: [
                    { name: 'CSV Files', extensions: ['csv'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });

            // If user canceled the dialog, return
            if (!saveResult || !saveResult.filePath) {
                return;
            }

            const outputPath = saveResult.filePath;

            // Show progress for large files
            const isLargeFile = rowCount >= 1000;
            let progressDiv, progressBar, progressText;

            if (isLargeFile) {
                // Create progress indicator
                progressDiv = document.createElement('div');
                progressDiv.id = 'generation-progress';
                progressDiv.className = 'mt-3';
                progressDiv.innerHTML = `
                    <div class="alert alert-info">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <strong>Generating ${rowCount.toLocaleString()} rows...</strong>
                            <span id="progress-text">Starting...</span>
                        </div>
                        <div class="progress" style="height: 20px;">
                            <div id="progress-bar" class="progress-bar progress-bar-striped progress-bar-animated" 
                                 role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                                0%
                            </div>
                        </div>
                    </div>
                `;
                generateBtn.parentNode.appendChild(progressDiv);
                progressBar = progressDiv.querySelector('#progress-bar');
                progressText = progressDiv.querySelector('#progress-text');

                // Disable button and show generating state
                generateBtn.disabled = true;
                generateBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Generating...';

                // Simulate progress (since we don't have real progress events yet)
                let simulatedProgress = 0;
                const progressInterval = setInterval(() => {
                    if (simulatedProgress < 90) {
                        simulatedProgress += Math.random() * 10;
                        if (simulatedProgress > 90) simulatedProgress = 90;
                        progressBar.style.width = `${simulatedProgress}%`;
                        progressBar.textContent = `${Math.round(simulatedProgress)}%`;
                        progressBar.setAttribute('aria-valuenow', simulatedProgress);

                        const rowsProcessed = Math.round((simulatedProgress / 100) * rowCount);
                        progressText.textContent = `Processing... (~${rowsProcessed.toLocaleString()} rows)`;
                    }
                }, 500);

                // Store interval to clear it later
                progressDiv.dataset.intervalId = progressInterval;
            } else {
                generateBtn.disabled = true;
                generateBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Generating...';
            }

            // Use the proper field mapping function
            const allOptions = gatherAllOptions(fileType);

            // Check if file import is being used
            const fileImportPathInput = document.getElementById('file-import-path');
            const fileImportField = document.getElementById('file-import-field').value;

            if (fileImportField && fileImportPathInput.dataset.importData) {
                try {
                    const importData = JSON.parse(fileImportPathInput.dataset.importData);
                    console.log(`>>> Using file import for field: ${fileImportField}, ${importData.length} values`);

                    // Store import data in allOptions
                    allOptions.fileImport = {
                        field: fileImportField,
                        values: importData
                    };
                } catch (e) {
                    console.error('Error parsing import data:', e);
                }
            }

            // Check if search results are available and pass them (only for small files)
            if (!isLargeFile) {
                const searchResults = document.getElementById('search-results');
                if (searchResults && searchResults.dataset.searchData) {
                    try {
                        allOptions.searchData = JSON.parse(searchResults.dataset.searchData);
                    } catch (e) {
                        console.warn('Could not parse search data:', e);
                    }
                }
            }

            try {
                const result = await window.electronAPI.createSISFile(
                    fileType,
                    rowCount,
                    outputPath,
                    emailDomain,
                    authProviderId,
                    allOptions
                );

                // Clear progress simulation
                if (progressDiv) {
                    const intervalId = progressDiv.dataset.intervalId;
                    if (intervalId) {
                        clearInterval(parseInt(intervalId));
                    }

                    // Show completion
                    progressBar.style.width = '100%';
                    progressBar.textContent = '100%';
                    progressBar.classList.remove('progress-bar-animated');
                    progressBar.classList.add('bg-success');
                    progressText.textContent = `Complete! ${rowCount.toLocaleString()} rows generated.`;

                    // Remove progress after delay
                    setTimeout(() => {
                        if (progressDiv && progressDiv.parentNode) {
                            progressDiv.remove();
                        }
                    }, 3000);
                }

                // createSISFile returns an object with success, fileName and filePath
                if (result.success) {
                    // Extract filename from full path
                    const fileName = result.filePath.split(/[/\\]/).pop();
                    showResult(`SIS file generated successfully: ${fileName}`, 'success');
                } else {
                    showResult(`Error generating SIS file: ${result.error || 'Unknown error'}`, 'danger');
                }
            } catch (error) {
                console.error('Generation error:', error);

                // Clear progress and show error
                if (progressDiv) {
                    const intervalId = progressDiv.dataset.intervalId;
                    if (intervalId) {
                        clearInterval(parseInt(intervalId));
                    }
                    progressDiv.remove();
                }

                showResult(`Error generating SIS file: ${error.message}`, 'danger');
            } finally {
                generateBtn.disabled = false;
                generateBtn.innerHTML = originalBtnText;
            }
        });

        // Search data handler
        document.getElementById('search-data-btn').addEventListener('click', async () => {
            const fileType = document.getElementById('file-type').value;
            const searchBtn = document.getElementById('search-data-btn');
            const originalText = searchBtn.innerHTML;

            searchBtn.disabled = true;
            searchBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Searching...';

            // Create progress indicator for enrollment searches
            let progressDiv = null;
            if (fileType === 'enrollments') {
                progressDiv = document.createElement('div');
                progressDiv.id = 'search-progress';
                progressDiv.className = 'mt-2';
                progressDiv.innerHTML = `
                    <div class="alert alert-info mb-0">
                        <div class="d-flex align-items-center">
                            <div class="spinner-border spinner-border-sm me-2" role="status">
                                <span class="visually-hidden">Searching...</span>
                            </div>
                            <span id="search-progress-text">Searching for enrollments...</span>
                        </div>
                    </div>
                `;
                searchBtn.parentNode.appendChild(progressDiv);
            }

            try {
                // Get domain and token from the main form
                const domainField = document.getElementById('domain');
                const tokenField = document.getElementById('token');

                const domain = domainField ? domainField.value.trim() : '';
                const token = tokenField ? tokenField.value.trim() : '';

                if (!domain || !token) {
                    showSearchError('Please enter both Canvas domain and API token in the main form');
                    return;
                }

                let searchParams = {
                    domain,
                    token
                };

                switch (fileType) {
                    case 'users':
                        const userSearch = document.getElementById('user-search').value.trim();
                        const userAccountId = document.getElementById('account-id-search').value.trim();
                        if (userSearch) {
                            searchParams.search_term = userSearch;
                        }
                        if (userAccountId) {
                            searchParams.account_id = userAccountId;
                        }
                        break;
                    case 'courses':
                        const courseSearch = document.getElementById('course-search').value.trim();
                        const courseAccountId = document.getElementById('account-id-search').value.trim();
                        if (courseSearch) {
                            searchParams.search_term = courseSearch;
                        }
                        if (courseAccountId) {
                            searchParams.account_id = courseAccountId;
                        }
                        break;
                    case 'accounts':
                        const accountSearch = document.getElementById('account-search').value.trim();
                        const parentAccountId = document.getElementById('parent-account-search').value.trim();
                        if (accountSearch) {
                            searchParams.search_term = accountSearch;
                        }
                        if (parentAccountId) {
                            searchParams.parent_account_id = parentAccountId;
                        }
                        break;
                    case 'sections':
                        const sectionSearch = document.getElementById('section-search').value.trim();
                        if (sectionSearch) {
                            searchParams.search_term = sectionSearch;
                        }
                        break;
                    case 'logins':
                        const userIdSearch = document.getElementById('user-id-search').value.trim();
                        const userIdType = document.getElementById('user-id-type').value;
                        if (userIdSearch) {
                            searchParams.user_id = userIdSearch;
                            searchParams.id_type = userIdType;
                        }
                        break;
                    case 'enrollments':
                        const enrollmentSearchType = document.getElementById('enrollment-search-type').value;
                        const enrollmentIdSearch = document.getElementById('enrollment-id-search').value.trim();

                        if (enrollmentIdSearch) {
                            searchParams.search_type = enrollmentSearchType; // 'course' or 'user'
                            searchParams.id = enrollmentIdSearch;
                            // No status/type filters - we fetch everything and filter client-side
                        }
                        break;
                }

                const result = await window.electronAPI.searchCanvasData(fileType, searchParams);

                console.log('Search result:', result);

                if (result.success && result.data) {
                    console.log('Showing search results for', fileType, '- count:', result.data.length);

                    // Update progress indicator for enrollments
                    if (progressDiv) {
                        const progressText = document.getElementById('search-progress-text');
                        if (progressText) {
                            progressText.innerHTML = `<i class="bi bi-check-circle text-success me-1"></i>Found ${result.data.length} enrollment(s)`;
                        }
                        // Remove spinner
                        const spinner = progressDiv.querySelector('.spinner-border');
                        if (spinner) spinner.remove();
                    }

                    showSearchResults(result.data, fileType);
                } else {
                    showSearchError(result.error || 'No data found');
                }
            } catch (error) {
                console.error('Search error:', error);
                showSearchError(error.message);
            } finally {
                searchBtn.disabled = false;
                searchBtn.innerHTML = originalText;

                // Remove progress indicator after a delay
                if (progressDiv) {
                    setTimeout(() => {
                        if (progressDiv && progressDiv.parentNode) {
                            progressDiv.remove();
                        }
                    }, 3000);
                }
            }
        });

        createSISForm.setAttribute('data-listeners-added', 'true');
    }

    // Helper functions for editable cells
    function addEditableCellListeners() {
        const editableCells = document.querySelectorAll('.editable-cell');
        editableCells.forEach(cell => {
            cell.style.cursor = 'pointer';
            cell.addEventListener('click', function () {
                makeFieldEditable(this);
            });
        });
    }

    function makeFieldEditable(cell) {
        if (cell.querySelector('input')) return; // Already editing

        const originalValue = cell.textContent.trim();
        const input = document.createElement('input');
        input.type = 'text';
        input.value = originalValue;
        input.className = 'form-control form-control-sm';
        input.style.minWidth = '100px';

        cell.innerHTML = '';
        cell.appendChild(input);
        input.focus();
        input.select();

        function saveEdit() {
            const newValue = input.value.trim();
            cell.textContent = newValue;

            // Update the stored data
            updateStoredSearchData(cell.dataset.row, cell.dataset.field, newValue);
        }

        input.addEventListener('blur', saveEdit);
        input.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                saveEdit();
            }
        });
    }

    function updateStoredSearchData(rowIndex, fieldName, newValue) {
        const csvDataResults = document.getElementById('csv-data-results');
        if (csvDataResults && csvDataResults.dataset.csvData) {
            try {
                const data = JSON.parse(csvDataResults.dataset.csvData);
                if (data[rowIndex]) {
                    data[rowIndex][fieldName] = newValue;
                    csvDataResults.dataset.csvData = JSON.stringify(data);
                }
            } catch (e) {
                console.warn('Failed to update CSV data:', e);
            }
        }
    }

    function addManualRow(fileType) {
        const fieldContainer = document.getElementById('field-checkboxes-container');
        const csvDataResults = document.getElementById('csv-data-results');
        const rowCountInput = document.getElementById('row-count');

        if (!fieldContainer || !csvDataResults) return;

        // Get the number of rows to add from the row count input
        const rowsToAdd = rowCountInput ? parseInt(rowCountInput.value) || 1 : 1;

        // Check if file import is being used
        const fileImportPathInput = document.getElementById('file-import-path');
        const fileImportField = document.getElementById('file-import-field').value;
        let fileImportData = null;

        if (fileImportField && fileImportPathInput.dataset.importData) {
            try {
                fileImportData = {
                    field: fileImportField,
                    values: JSON.parse(fileImportPathInput.dataset.importData)
                };
            } catch (e) {
                console.error('Error parsing import data:', e);
            }
        }

        // Gather field values from configuration (user-provided values)
        const userProvidedValues = {};
        const inputFields = fieldContainer.querySelectorAll('input[type="text"]');
        const fieldDefinitions = getSISFieldDefinitions(fileType);

        inputFields.forEach(input => {
            const fieldName = input.name;
            const fieldValue = input.value.trim();
            if (fieldValue) {
                userProvidedValues[fieldName] = fieldValue;
            }
        });

        // Get current CSV data or initialize empty array
        let data = [];
        if (csvDataResults.dataset.csvData) {
            try {
                data = JSON.parse(csvDataResults.dataset.csvData);
            } catch (e) {
                console.warn('Failed to parse existing CSV data:', e);
            }
        }

        // Add the specified number of rows to data
        for (let i = 0; i < rowsToAdd; i++) {
            // Create a fresh copy of user-provided values for each row
            const fieldValues = { ...userProvidedValues };

            // If file import is active, use the imported value for this row
            if (fileImportData && fileImportData.values.length > 0) {
                const importIndex = data.length + i; // Use cumulative index
                fieldValues[fileImportData.field] = fileImportData.values[importIndex % fileImportData.values.length];
            }

            // Fill in missing required fields with NEW random values for each row
            // Special handling for change_sis_ids: either regular IDs OR integration IDs must be provided
            if (fileType === 'change_sis_ids') {
                // Check if user provided regular IDs or integration IDs
                const hasRegularIds = fieldValues.old_id || fieldValues.new_id;
                const hasIntegrationIds = fieldValues.old_integration_id || fieldValues.new_integration_id;

                // Only generate random values if neither set is provided
                if (!hasRegularIds && !hasIntegrationIds) {
                    // Generate random values for old_id and new_id only
                    if (!fieldValues.old_id) {
                        fieldValues.old_id = generateRandomValueForField({ name: 'old_id', required: true }, fileType);
                    }
                    if (!fieldValues.new_id) {
                        fieldValues.new_id = generateRandomValueForField({ name: 'new_id', required: true }, fileType);
                    }
                }
                // Always ensure type has a value
                if (!fieldValues.type) {
                    fieldValues.type = generateRandomValueForField({ name: 'type', required: true }, fileType);
                }
            } else {
                // For other file types, use the standard logic
                fieldDefinitions.forEach(field => {
                    if (field.required && !fieldValues[field.name]) {
                        fieldValues[field.name] = generateRandomValueForField(field, fileType);
                    }
                });
            }

            // Create new row based on file type - ensure ALL fields from definitions are included
            let newRow = {};
            if (fileType === 'logins') {
                newRow = {
                    sis_user_id: fieldValues.user_id || '',
                    unique_id: fieldValues.login_id || '',
                    authentication_provider_id: fieldValues.authentication_provider_id || '',
                    password: fieldValues.password || '',
                    existing_user_id: fieldValues.existing_user_id || '',
                    existing_integration_id: fieldValues.existing_integration_id || '',
                    existing_canvas_user_id: fieldValues.existing_canvas_user_id || '',
                    email: fieldValues.email || '',
                    status: fieldValues.status || 'active'
                };
            } else if (fileType === 'change_sis_ids') {
                // For change_sis_ids, explicitly map all fields and preserve empty values
                newRow = {
                    old_id: fieldValues.old_id || '',
                    new_id: fieldValues.new_id || '',
                    old_integration_id: fieldValues.old_integration_id || '',
                    new_integration_id: fieldValues.new_integration_id || '',
                    type: fieldValues.type || 'user'
                };
            } else {
                // For other file types, ensure ALL fields from definitions are included
                fieldDefinitions.forEach(field => {
                    newRow[field.name] = fieldValues[field.name] || '';
                });
            }

            // Add this row to data
            data.push(newRow);
        }

        // Update stored CSV data
        csvDataResults.dataset.csvData = JSON.stringify(data);

        // Refresh the CSV data display
        showCSVData(data, fileType);

        // Ensure the CSV data section is visible
        document.getElementById('csv-data-section').style.display = 'block';
    }

    function addRandomRows(fileType) {
        const csvDataResults = document.getElementById('csv-data-results');
        const rowCountInput = document.getElementById('row-count');

        if (!csvDataResults || !rowCountInput) return;

        const rowCount = parseInt(rowCountInput.value) || 1;

        // Get current CSV data or initialize empty array
        let data = [];
        if (csvDataResults.dataset.csvData) {
            try {
                data = JSON.parse(csvDataResults.dataset.csvData);
            } catch (e) {
                console.warn('Failed to parse existing CSV data:', e);
            }
        }

        // Generate random data for the specified number of rows
        const newRows = generateRandomDataForFileType(fileType, rowCount);

        // Add the new rows to data
        data.push(...newRows);

        // Update stored CSV data
        csvDataResults.dataset.csvData = JSON.stringify(data);

        // Refresh the CSV data display
        showCSVData(data, fileType);

        // Ensure the CSV data section is visible
        document.getElementById('csv-data-section').style.display = 'block';
    }

    function removeRow(rowIndex, fileType) {
        const csvDataResults = document.getElementById('csv-data-results');

        // Get current CSV data
        let data = [];
        if (csvDataResults.dataset.csvData) {
            try {
                data = JSON.parse(csvDataResults.dataset.csvData);
            } catch (e) {
                console.warn('Failed to parse existing CSV data:', e);
                return;
            }
        }

        // Remove the row at the specified index
        if (rowIndex >= 0 && rowIndex < data.length) {
            data.splice(rowIndex, 1);

            // Update stored CSV data
            csvDataResults.dataset.csvData = JSON.stringify(data);

            // Refresh the display
            showCSVData(data, fileType);
        }
    }

    function clearAllRows(fileType) {
        const csvDataResults = document.getElementById('csv-data-results');

        // Clear all CSV data
        csvDataResults.dataset.csvData = JSON.stringify([]);

        // Clear the CSV data display
        csvDataResults.innerHTML = '';

        // Hide the CSV data section
        document.getElementById('csv-data-section').style.display = 'none';
    }

    function parseImportFile(fileContent, fieldName) {
        const lines = fileContent.split(/\r?\n/).filter(line => line.trim());

        if (lines.length === 0) return [];

        // Check if first line is a CSV header
        const firstLine = lines[0].trim();
        const hasHeader = firstLine.includes(',') || firstLine.toLowerCase().includes('id');

        let values = [];

        if (hasHeader && firstLine.includes(',')) {
            // CSV format - find the column for our field
            const headers = firstLine.split(',').map(h => h.trim().toLowerCase());
            const fieldIndex = headers.findIndex(h =>
                h === fieldName.toLowerCase() ||
                h === fieldName.replace('_', ' ').toLowerCase() ||
                h.includes(fieldName.split('_')[0])
            );

            if (fieldIndex >= 0) {
                // Extract values from that column
                for (let i = 1; i < lines.length; i++) {
                    const columns = lines[i].split(',');
                    if (columns[fieldIndex]) {
                        const value = columns[fieldIndex].trim().replace(/^["']|["']$/g, '');
                        if (value) values.push(value);
                    }
                }
            } else {
                // Header exists but field not found, treat as simple list (skip header)
                for (let i = 1; i < lines.length; i++) {
                    const value = lines[i].trim().replace(/^["']|["']$/g, '');
                    if (value) values.push(value);
                }
            }
        } else {
            // Simple list format (one ID per line)
            values = lines.map(line => line.trim().replace(/^["']|["']$/g, '')).filter(v => v);
        }

        return values;
    }

    function updateFieldImportState(fieldName, isImporting) {
        // Find the field input and update its state
        if (fieldName) {
            const fieldInput = document.getElementById(`field-${fieldName}`);
            if (fieldInput) {
                if (isImporting) {
                    fieldInput.disabled = true;
                    fieldInput.placeholder = 'Using file data';
                    fieldInput.value = '';
                    fieldInput.style.backgroundColor = '#e9ecef';
                    fieldInput.style.cursor = 'not-allowed';
                } else {
                    fieldInput.disabled = false;
                    fieldInput.placeholder = fieldInput.dataset.originalPlaceholder || '';
                    fieldInput.style.backgroundColor = '';
                    fieldInput.style.cursor = '';
                }
            }
        } else {
            // Re-enable all field inputs when file import is cleared
            const allFieldInputs = document.querySelectorAll('[id^="field-"]');
            allFieldInputs.forEach(input => {
                input.disabled = false;
                input.placeholder = input.dataset.originalPlaceholder || '';
                input.style.backgroundColor = '';
                input.style.cursor = '';
            });
        }
    }

    async function generateLargeCSVFromConfig(fileType) {
        console.log(`>>> generateLargeCSVFromConfig CALLED - fileType: ${fileType}`);
        const rowCountInput = document.getElementById('row-count');
        const outputPath = document.getElementById('output-path').value;
        const emailDomain = fileType === 'users'
            ? (document.getElementById('email-domain').value.trim() || '@instructure.com')
            : '@instructure.com';

        console.log(`>>> outputPath: ${outputPath}, rowCount: ${rowCountInput.value}`);

        if (!outputPath) {
            alert('Please select an output path first.');
            return;
        }

        const rowCount = parseInt(rowCountInput.value) || 1;

        // Gather user-provided field values
        const allOptions = gatherAllOptions(fileType);
        console.log(`>>> allOptions gathered:`, JSON.stringify(allOptions, null, 2));

        // Check if file import is being used
        const fileImportPathInput = document.getElementById('file-import-path');
        const fileImportField = document.getElementById('file-import-field').value;

        if (fileImportField && fileImportPathInput.dataset.importData) {
            try {
                const importData = JSON.parse(fileImportPathInput.dataset.importData);
                console.log(`>>> Using file import for field: ${fileImportField}, ${importData.length} values`);

                // Store import data in allOptions
                allOptions.fileImport = {
                    field: fileImportField,
                    values: importData
                };
            } catch (e) {
                console.error('Error parsing import data:', e);
            }
        }

        try {
            // Call the IPC handler to generate the file (must pass as individual arguments, not object)
            const result = await window.electronAPI.createSISFile(
                fileType,
                rowCount,
                outputPath,
                emailDomain,
                '',
                allOptions
            );

            alert(`Successfully generated ${rowCount.toLocaleString()} rows to ${result.filePath}`);
        } catch (error) {
            console.error('Error generating CSV:', error);
            alert(`Error generating CSV: ${error.message}`);
        }
    }

    async function generateLargeCSVRandom(fileType) {
        const rowCountInput = document.getElementById('row-count');
        const outputPath = document.getElementById('output-path').value;
        const emailDomain = fileType === 'users'
            ? (document.getElementById('email-domain').value.trim() || '@instructure.com')
            : '@instructure.com';

        if (!outputPath) {
            alert('Please select an output path first.');
            return;
        }

        const rowCount = parseInt(rowCountInput.value) || 1;

        try {
            // Call the IPC handler with no field values (pure random generation)
            const result = await window.electronAPI.createSISFile(
                fileType,
                rowCount,
                outputPath,
                emailDomain,
                '',
                { fieldValues: {}, searchData: null }
            );

            alert(`Successfully generated ${rowCount.toLocaleString()} random rows to ${result.filePath}`);
        } catch (error) {
            console.error('Error generating CSV:', error);
            alert(`Error generating CSV: ${error.message}`);
        }
    }

    function addRemoveRowListeners(fileType) {
        // Add click listeners to all remove buttons
        const removeButtons = document.querySelectorAll('.remove-row-btn');
        removeButtons.forEach(button => {
            button.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                const rowIndex = parseInt(this.dataset.rowIndex);
                removeRow(rowIndex, fileType);
            });
        });
    }

    function generateRandomDataForFileType(fileType, rowCount) {
        const rows = [];
        const fieldDefinitions = getSISFieldDefinitions(fileType);

        for (let i = 0; i < rowCount; i++) {
            const row = {};

            // Include ALL fields from definitions, generate random data for required fields
            fieldDefinitions.forEach(field => {
                if (field.required) {
                    row[field.name] = generateRandomValueForField(field, fileType);
                } else {
                    // Include optional fields as empty strings
                    row[field.name] = '';
                }
            });

            rows.push(row);
        }

        return rows;
    }

    function generateRandomValueForField(field, fileType) {
        const randomId = () => Math.random().toString(36).substring(2, 8).toUpperCase();
        const randomNumber = () => Math.floor(Math.random() * 9000) + 1000;
        const randomName = () => {
            const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Lisa', 'Chris', 'Amy', 'Tom', 'Anna'];
            const lastNames = ['Smith', 'Johnson', 'Brown', 'Davis', 'Wilson', 'Miller', 'Moore', 'Taylor', 'Anderson', 'Thomas'];
            return {
                first: firstNames[Math.floor(Math.random() * firstNames.length)],
                last: lastNames[Math.floor(Math.random() * lastNames.length)]
            };
        };

        switch (field.name) {
            // User fields
            case 'user_id':
                return `user_${randomId()}`;
            case 'login_id':
                const name = randomName();
                return `${name.first.toLowerCase()}.${name.last.toLowerCase()}${randomNumber()}`;

            // Account fields
            case 'account_id':
                return `acct_${randomId()}`;

            // Term fields
            case 'term_id':
                return `term_${randomId()}`;
            case 'name':
                if (fileType === 'terms') {
                    const terms = ['Fall 2024', 'Spring 2025', 'Summer 2025', 'Fall 2025'];
                    return terms[Math.floor(Math.random() * terms.length)];
                } else if (fileType === 'accounts') {
                    const depts = ['Mathematics', 'Computer Science', 'English', 'History', 'Biology', 'Chemistry'];
                    return depts[Math.floor(Math.random() * depts.length)] + ' Department';
                } else {
                    return `Sample ${field.display} ${randomNumber()}`;
                }

            // Course fields
            case 'course_id':
                return `course_${randomId()}`;
            case 'short_name':
                const courses = ['MATH101', 'CS201', 'ENG102', 'HIST103', 'BIO104', 'CHEM105'];
                return courses[Math.floor(Math.random() * courses.length)];
            case 'long_name':
                const longNames = ['Introduction to Mathematics', 'Computer Programming', 'English Composition', 'World History', 'General Biology', 'General Chemistry'];
                return longNames[Math.floor(Math.random() * longNames.length)];

            // Section fields
            case 'section_id':
                return `section_${randomId()}`;

            // Group fields
            case 'group_id':
                return `group_${randomId()}`;
            case 'group_category_id':
                return `groupcat_${randomId()}`;
            case 'category_name':
                const categories = ['Study Groups', 'Project Teams', 'Lab Groups', 'Discussion Groups'];
                return categories[Math.floor(Math.random() * categories.length)];

            // Role fields
            case 'role':
                const roles = ['student', 'teacher', 'ta', 'observer'];
                return roles[Math.floor(Math.random() * roles.length)];
            case 'role_id':
                return `role_${randomId()}`;

            // Status field - use default value from field definition or 'active'
            case 'status':
                return field.defaultValue || 'active';

            // Observer fields
            case 'observer_id':
                return `observer_${randomId()}`;
            case 'student_id':
                return `student_${randomId()}`;

            // Cross-listing fields
            case 'xlist_course_id':
                return `xlist_${randomId()}`;

            // Change SIS ID fields
            case 'old_id':
                return `old_${randomId()}`;
            case 'new_id':
                return `new_${randomId()}`;
            case 'type':
                const types = ['user', 'course', 'section', 'term', 'account'];
                return types[Math.floor(Math.random() * types.length)];

            // Default for any other required field
            default:
                return `${field.name}_${randomId()}`;
        }
    }

    // Helper functions for field management
    function gatherAllOptions(fileType) {
        const options = {
            fieldValues: {},
            searchData: null
        };

        // Get field definitions to access default values
        const fieldDefinitions = getSISFieldDefinitions(fileType);

        // Get field values from input fields
        const fieldContainer = document.getElementById('field-checkboxes-container');
        if (fieldContainer) {
            const inputFields = fieldContainer.querySelectorAll('input[type="text"]');
            inputFields.forEach(input => {
                const fieldName = input.name;
                const fieldValue = input.value.trim();
                if (fieldValue) {
                    options.fieldValues[fieldName] = fieldValue;
                } else {
                    // Apply default value if field is empty and has a default value defined
                    const fieldDef = fieldDefinitions.find(f => f.name === fieldName);
                    if (fieldDef && fieldDef.defaultValue) {
                        options.fieldValues[fieldName] = fieldDef.defaultValue;
                    }
                }
            });
        }

        // Get CSV data if available (this is what will be exported)
        const csvDataResults = document.getElementById('csv-data-results');
        if (csvDataResults && csvDataResults.dataset.csvData) {
            try {
                options.searchData = JSON.parse(csvDataResults.dataset.csvData);
            } catch (e) {
                console.warn('Failed to parse CSV data:', e);
            }
        }

        return options;
    }

    function populateSearchFields(fileType) {
        const container = document.getElementById('search-inputs-container');
        let searchHTML = '';

        switch (fileType) {
            case 'users':
                searchHTML = `
                    <div class="row mb-2">
                        <div class="col-md-6">
                            <label class="form-label">Search by Username/Email</label>
                            <input type="text" id="user-search" class="form-control" placeholder="Enter username or email...">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Account ID (optional)</label>
                            <input type="text" id="account-id-search" class="form-control" placeholder="Enter account ID...">
                        </div>
                    </div>
                `;
                break;
            case 'courses':
                searchHTML = `
                    <div class="row mb-2">
                        <div class="col-md-6">
                            <label class="form-label">Search by Course Name/Code</label>
                            <input type="text" id="course-search" class="form-control" placeholder="Enter course name or code...">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Account ID (optional)</label>
                            <input type="text" id="account-id-search" class="form-control" placeholder="Enter account ID...">
                        </div>
                    </div>
                `;
                break;
            case 'accounts':
                searchHTML = `
                    <div class="row mb-2">
                        <div class="col-md-6">
                            <label class="form-label">Search by Account ID</label>
                            <input type="text" id="account-search" class="form-control" placeholder="Enter account name...">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Parent Account ID (optional)</label>
                            <input type="text" id="parent-account-search" class="form-control" placeholder="Enter parent account ID...">
                        </div>
                    </div>
                `;
                break;
            case 'sections':
                searchHTML = `
                    <div class="row mb-2">
                        <div class="col-md-12">
                            <label class="form-label">Search by Section ID</label>
                            <input type="text" id="section-search" class="form-control" placeholder="Enter Canvas section ID...">
                            <small class="form-text text-muted">Enter the numeric Canvas section ID</small>
                        </div>
                    </div>
                `;
                break;
            case 'logins':
                searchHTML = `
                    <div class="row mb-2">
                        <div class="col-md-6">
                            <label class="form-label">Search by User ID</label>
                            <input type="text" id="user-id-search" class="form-control" placeholder="Enter Canvas User ID or SIS User ID...">
                            <small class="form-text text-muted">Enter either Canvas User ID (e.g., 12345) or SIS User ID (e.g., student_12345)</small>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Search Type</label>
                            <select id="user-id-type" class="form-select">
                                <option value="canvas_id">Canvas User ID</option>
                                <option value="sis_user_id">SIS User ID</option>
                            </select>
                            <small class="form-text text-muted">Choose whether you're entering a Canvas ID (numeric) or SIS ID</small>
                        </div>
                    </div>
                `;
                break;
            case 'enrollments':
                searchHTML = `
                    <div class="row mb-2">
                        <div class="col-md-6">
                            <label class="form-label">Search By</label>
                            <select id="enrollment-search-type" class="form-select">
                                <option value="course">Course ID</option>
                                <option value="user">User ID</option>
                            </select>
                            <small class="form-text text-muted">Choose whether to search by course or user</small>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">ID</label>
                            <input type="text" id="enrollment-id-search" class="form-control" placeholder="Enter Course ID or User ID...">
                            <small class="form-text text-muted">Enter the numeric Canvas ID</small>
                        </div>
                    </div>
                    <div class="alert alert-info mt-2">
                        <i class="bi bi-info-circle me-2"></i>
                        All enrollments will be fetched. Use the filters in the results preview to narrow down by status or role.
                    </div>
                `;
                break;
            default:
                searchHTML = `
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle me-2"></i>
                        Search functionality not available for ${fileType}. Sample data will be generated.
                    </div>
                `;
                break;
        }

        container.innerHTML = searchHTML;

        // Add search validation
        const searchBtn = document.getElementById('search-data-btn');
        if (fileType === 'users' || fileType === 'courses' || fileType === 'accounts' || fileType === 'sections' || fileType === 'logins' || fileType === 'enrollments') {
            const searchInput = container.querySelector('input[type="text"]');
            if (searchInput) {
                searchInput.addEventListener('input', () => {
                    searchBtn.disabled = !searchInput.value.trim();
                });
                // For logins, also listen to the dropdown change
                if (fileType === 'logins') {
                    const selectInput = container.querySelector('select');
                    if (selectInput) {
                        selectInput.addEventListener('change', () => {
                            searchBtn.disabled = !searchInput.value.trim();
                        });
                    }
                }
            }
            searchBtn.disabled = true;
        } else {
            searchBtn.disabled = true;
        }
    }

    function populateFieldConfiguration(fileType) {
        const container = document.getElementById('field-checkboxes-container');
        const fieldDefinitions = getSISFieldDefinitions(fileType);

        let fieldsHTML = '<div class="row">';

        fieldDefinitions.forEach((field, index) => {
            const isRequired = field.required ? ' (Required)' : '';
            const placeholder = field.required ? 'Required field' : 'Optional - leave empty for sample data';
            const isDisabled = field.required ? '' : ''; // Remove disabled attribute to allow editing
            const defaultValue = field.defaultValue || '';

            fieldsHTML += `
                <div class="col-md-6 col-lg-4 mb-3">
                    <label for="field-${field.name}" class="form-label">
                        ${field.display}${isRequired}
                        ${field.description ? `<br><small class="text-muted">${field.description}</small>` : ''}
                    </label>
                    <input type="text" class="form-control form-control-sm" 
                           id="field-${field.name}" 
                           name="${field.name}"
                           placeholder="${placeholder}"
                           data-original-placeholder="${placeholder}"
                           value="${defaultValue}"
                           ${isDisabled}>
                </div>
            `;
        });

        fieldsHTML += '</div>';
        container.innerHTML = fieldsHTML;

        // Populate file import field dropdown
        const fileImportFieldSelect = document.getElementById('file-import-field');
        if (fileImportFieldSelect) {
            let importOptions = '<option value="">Don\'t use file import</option>';
            fieldDefinitions.forEach(field => {
                // Common fields that might be imported from files
                const importableFields = ['user_id', 'course_id', 'section_id', 'account_id', 'term_id', 'login_id'];
                if (importableFields.includes(field.name)) {
                    importOptions += `<option value="${field.name}">${field.display}</option>`;
                }
            });
            fileImportFieldSelect.innerHTML = importOptions;
        }

        // Add validation for status field
        setTimeout(() => {
            const statusField = document.getElementById('field-status');
            if (statusField) {
                statusField.addEventListener('blur', function () {
                    const value = this.value.trim().toLowerCase();
                    const validValues = ['active', 'deleted', 'suspended', ''];

                    if (value && !validValues.includes(value)) {
                        this.classList.add('is-invalid');
                        // Add or update validation message
                        let feedback = this.nextElementSibling;
                        if (!feedback || !feedback.classList.contains('invalid-feedback')) {
                            feedback = document.createElement('div');
                            feedback.className = 'invalid-feedback';
                            this.parentNode.appendChild(feedback);
                        }
                        feedback.textContent = 'Status must be: active, deleted, or suspended';
                    } else {
                        this.classList.remove('is-invalid');
                        const feedback = this.nextElementSibling;
                        if (feedback && feedback.classList.contains('invalid-feedback')) {
                            feedback.remove();
                        }
                        // If empty, set to default
                        if (!value) {
                            this.value = 'active';
                        } else {
                            // Normalize the value
                            this.value = value;
                        }
                    }
                });
            }
        }, 100);

        // Add event listeners for the buttons in Field Configuration
        setTimeout(() => {
            const addRowBtn = document.getElementById('add-manual-row');
            const addRandomBtn = document.getElementById('add-random-rows');
            const clearAllBtn = document.getElementById('clear-all-rows');

            if (addRowBtn) {
                // Remove existing listener if any
                addRowBtn.replaceWith(addRowBtn.cloneNode(true));
                const newAddRowBtn = document.getElementById('add-manual-row');
                newAddRowBtn.addEventListener('click', () => addManualRow(fileType));
            }

            if (addRandomBtn) {
                // Remove existing listener if any
                addRandomBtn.replaceWith(addRandomBtn.cloneNode(true));
                const newAddRandomBtn = document.getElementById('add-random-rows');
                newAddRandomBtn.addEventListener('click', () => addRandomRows(fileType));
            }

            if (clearAllBtn) {
                // Remove existing listener if any
                clearAllBtn.replaceWith(clearAllBtn.cloneNode(true));
                const newClearAllBtn = document.getElementById('clear-all-rows');
                newClearAllBtn.addEventListener('click', () => clearAllRows(fileType));
            }

            // Large file mode buttons
            const generateFromConfigBtn = document.getElementById('generate-csv-from-config');
            const generateRandomBtn = document.getElementById('generate-csv-random');

            if (generateFromConfigBtn) {
                generateFromConfigBtn.replaceWith(generateFromConfigBtn.cloneNode(true));
                const newGenerateFromConfigBtn = document.getElementById('generate-csv-from-config');
                newGenerateFromConfigBtn.addEventListener('click', () => generateLargeCSVFromConfig(fileType));
            }

            if (generateRandomBtn) {
                generateRandomBtn.replaceWith(generateRandomBtn.cloneNode(true));
                const newGenerateRandomBtn = document.getElementById('generate-csv-random');
                newGenerateRandomBtn.addEventListener('click', () => generateLargeCSVRandom(fileType));
            }
        }, 0);
    }

    function getSISFieldDefinitions(fileType) {
        const fieldDefinitions = {
            users: [
                { name: 'user_id', display: 'User ID', required: true, description: 'Unique identifier for the user' },
                { name: 'login_id', display: 'Login ID', required: true, description: 'Username for login' },
                { name: 'authentication_provider_id', display: 'Auth Provider ID', description: 'Authentication provider this login is associated with' },
                { name: 'password', display: 'Password', description: 'Password for Canvas login' },
                { name: 'ssha_password', display: 'SSHA Password', description: 'Pre-hashed password using SSHA scheme' },
                { name: 'first_name', display: 'First Name', recommended: true },
                { name: 'last_name', display: 'Last Name', recommended: true },
                { name: 'full_name', display: 'Full Name', recommended: true },
                { name: 'sortable_name', display: 'Sortable Name', recommended: true },
                { name: 'short_name', display: 'Short Name' },
                { name: 'email', display: 'Email', recommended: true },
                { name: 'status', display: 'Status', required: true, defaultValue: 'active', description: 'active, deleted, suspended' },
                { name: 'integration_id', display: 'Integration ID', description: 'Secondary unique identifier for complex SIS integrations' },
                { name: 'pronouns', display: 'Pronouns', description: 'User\'s preferred pronouns' },
                { name: 'declared_user_type', display: 'Declared User Type', description: 'administrative, observer, staff, student, student_other, teacher' },
                { name: 'canvas_password_notification', display: 'Canvas Password Notification', description: 'Notify user for password setup' },
                { name: 'home_account', display: 'Home Account', description: 'Create user in target account and merge with existing' }
            ],
            accounts: [
                { name: 'account_id', display: 'Account ID', required: true },
                { name: 'parent_account_id', display: 'Parent Account ID' },
                { name: 'name', display: 'Name', required: true },
                { name: 'status', display: 'Status', recommended: true, description: 'active, deleted' },
                { name: 'sis_account_id', display: 'SIS Account ID' }
            ],
            terms: [
                { name: 'term_id', display: 'Term ID', required: true },
                { name: 'name', display: 'Name', required: true },
                { name: 'status', display: 'Status', recommended: true, description: 'active, deleted' },
                { name: 'start_date', display: 'Start Date' },
                { name: 'end_date', display: 'End Date' },
                { name: 'sis_term_id', display: 'SIS Term ID' }
            ],
            courses: [
                { name: 'course_id', display: 'Course ID', required: true },
                { name: 'short_name', display: 'Short Name', required: true },
                { name: 'long_name', display: 'Long Name', required: true },
                { name: 'account_id', display: 'Account ID', required: true },
                { name: 'term_id', display: 'Term ID', recommended: true },
                { name: 'status', display: 'Status', recommended: true, description: 'active, deleted, completed' },
                { name: 'start_date', display: 'Start Date' },
                { name: 'end_date', display: 'End Date' },
                { name: 'course_code', display: 'Course Code' },
                { name: 'course_format', display: 'Course Format' },
                { name: 'blueprint_course_id', display: 'Blueprint Course ID' }
            ],
            sections: [
                { name: 'section_id', display: 'Section ID', required: true },
                { name: 'course_id', display: 'Course ID', required: true },
                { name: 'name', display: 'Name', required: true },
                { name: 'status', display: 'Status', recommended: true, description: 'active, deleted' },
                { name: 'start_date', display: 'Start Date' },
                { name: 'end_date', display: 'End Date' }
            ],
            enrollments: [
                { name: 'course_id', display: 'Course ID', required: true },
                { name: 'user_id', display: 'User ID', required: true },
                { name: 'role', display: 'Role', required: true, description: 'student, teacher, ta, observer, designer' },
                { name: 'role_id', display: 'Role ID' },
                { name: 'section_id', display: 'Section ID' },
                { name: 'status', display: 'Status', recommended: true, description: 'active, deleted, completed, inactive' },
                { name: 'associated_user_id', display: 'Associated User ID', description: 'For observer enrollments' },
                { name: 'start_date', display: 'Start Date' },
                { name: 'end_date', display: 'End Date' },
                { name: 'notify', display: 'Notify' }
            ],
            groups: [
                { name: 'group_id', display: 'Group ID', required: true },
                { name: 'account_id', display: 'Account ID', required: true },
                { name: 'name', display: 'Name', required: true },
                { name: 'status', display: 'Status', recommended: true, description: 'available, closed, completed, deleted' },
                { name: 'group_category_id', display: 'Group Category ID' },
                { name: 'max_membership', display: 'Max Membership' },
                { name: 'storage_quota', display: 'Storage Quota' }
            ],
            group_categories: [
                { name: 'group_category_id', display: 'Group Category ID', required: true },
                { name: 'account_id', display: 'Account ID' },
                { name: 'course_id', display: 'Course ID' },
                { name: 'category_name', display: 'Category Name', required: true },
                { name: 'status', display: 'Status', recommended: true, description: 'available, closed, deleted' },
                { name: 'enable_self_signup', display: 'Enable Self Signup' },
                { name: 'restrict_self_signup', display: 'Restrict Self Signup' },
                { name: 'group_limit', display: 'Group Limit' },
                { name: 'auto_leader_type', display: 'Auto Leader Type' }
            ],
            group_memberships: [
                { name: 'group_id', display: 'Group ID', required: true },
                { name: 'user_id', display: 'User ID', required: true },
                { name: 'status', display: 'Status', recommended: true, description: 'accepted, deleted' }
            ],
            xlists: [
                { name: 'xlist_course_id', display: 'Cross-list Course ID', required: true },
                { name: 'section_id', display: 'Section ID', required: true },
                { name: 'status', display: 'Status', recommended: true, description: 'active, deleted' }
            ],
            user_observers: [
                { name: 'observer_id', display: 'Observer ID', required: true },
                { name: 'student_id', display: 'Student ID', required: true },
                { name: 'status', display: 'Status', recommended: true, description: 'active, deleted' }
            ],
            admins: [
                { name: 'user_id', display: 'User ID', required: true },
                { name: 'account_id', display: 'Account ID', required: true },
                { name: 'role_id', display: 'Role ID', required: true },
                { name: 'role', display: 'Role', required: true },
                { name: 'status', display: 'Status', recommended: true, description: 'active, deleted' }
            ],
            logins: [
                { name: 'user_id', display: 'User ID', required: true },
                { name: 'login_id', display: 'Login ID', required: true },
                { name: 'authentication_provider_id', display: 'Auth Provider ID' },
                { name: 'password', display: 'Password' },
                { name: 'existing_user_id', display: 'Existing User ID', description: 'One of existing_user_id, existing_integration_id, or existing_canvas_user_id is required' },
                { name: 'existing_integration_id', display: 'Existing Integration ID', description: 'One of existing_user_id, existing_integration_id, or existing_canvas_user_id is required' },
                { name: 'existing_canvas_user_id', display: 'Existing Canvas User ID', description: 'One of existing_user_id, existing_integration_id, or existing_canvas_user_id is required' },
                { name: 'email', display: 'Email' },
                { name: 'status', display: 'Status', recommended: true, description: 'active, deleted, suspended' },
                { name: 'send_confirmation', display: 'Send Confirmation' }
            ],
            change_sis_ids: [
                { name: 'old_id', display: 'Old ID', required: true },
                { name: 'new_id', display: 'New ID', required: true },
                { name: 'old_integration_id', display: 'Old Integration ID' },
                { name: 'new_integration_id', display: 'New Integration ID' },
                { name: 'type', display: 'Type', required: true, description: 'user, course, section, group, etc.' }
            ]
        };

        return fieldDefinitions[fileType] || [];
    }

    function showResult(message, type) {
        // Remove any existing result
        const existingResult = document.getElementById('result-container');
        if (existingResult) {
            existingResult.remove();
        }

        const resultContainer = document.createElement('div');
        resultContainer.id = 'result-container';
        resultContainer.className = 'mt-3';

        // For success messages, show a more prominent, persistent banner
        if (type === 'success') {
            resultContainer.innerHTML = `
                <div class="alert alert-success alert-dismissible fade show border-success" style="border-left: 4px solid #198754;">
                    <div class="d-flex align-items-center">
                        <i class="bi bi-check-circle-fill me-2" style="font-size: 1.5rem;"></i>
                        <div>
                            <strong>Success!</strong>
                            <div>${message}</div>
                            <small class="text-muted">You can now change the file type or add more rows to generate another CSV.</small>
                        </div>
                    </div>
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
        } else {
            resultContainer.innerHTML = `
                <div class="alert alert-${type} alert-dismissible fade show">
                    ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
        }

        // Insert at the top of the form card body for better visibility
        const cardBody = createSISForm.querySelector('.card-body');
        if (cardBody && cardBody.firstChild) {
            cardBody.insertBefore(resultContainer, cardBody.firstChild);
        } else {
            createSISForm.appendChild(resultContainer);
        }

        // Don't auto-remove success messages - let user dismiss them manually
        // Only auto-remove error messages after 10 seconds
        if (type !== 'success') {
            setTimeout(() => {
                if (resultContainer && resultContainer.parentNode) {
                    resultContainer.remove();
                }
            }, 10000);
        }
    }

    function showSearchResults(data, fileType) {
        const searchResults = document.getElementById('search-results');

        if (!data || data.length === 0) {
            // Show empty state with Add Row functionality
            searchResults.innerHTML = `
                <div class="alert alert-info">
                    <i class="bi bi-info-circle me-2"></i>
                    No search results found. Use the "Add Row" button below to manually add data.
                </div>
                <div class="card">
                    <div class="card-header">
                        <h6 class="mb-0">Manual Data Entry</h6>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-sm table-striped">
                                <thead class="table-dark">
                                    <tr>
            `;

            // Add headers based on file type (no checkbox column for empty state)
            if (fileType === 'logins') {
                searchResults.innerHTML += `
                    <th>User ID</th>
                    <th>Login ID</th>
                    <th>Auth Provider ID</th>
                    <th>Password</th>
                    <th>Existing User ID</th>
                    <th>Existing Integration ID</th>
                    <th>Existing Canvas User ID</th>
                    <th>Email</th>
                    <th>Actions</th>
                `;
            } else {
                // For other types, use field definitions
                const fieldDefinitions = getSISFieldDefinitions(fileType);
                fieldDefinitions.forEach(field => {
                    searchResults.innerHTML += `<th>${field.display}</th>`;
                });
                searchResults.innerHTML += `<th>Actions</th>`;
            }

            searchResults.innerHTML += `
                                    </tr>
                                </thead>
                                <tbody id="manual-data-tbody">
                                    <tr>
                                        <td colspan="100%" class="text-center text-muted">
                                            No data yet. Click "Add Row" below to add entries.
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;

            searchResults.style.display = 'block';

            // Initialize empty data
            searchResults.dataset.searchData = JSON.stringify([]);

            return;
        }

        // Store search data temporarily (not in dataset yet - only selected items will be added)
        searchResults.dataset.searchResults = JSON.stringify(data);
        searchResults.dataset.allData = JSON.stringify(data); // Store original unfiltered data

        let resultsHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle me-2"></i>
                Found ${data.length} ${fileType} record(s). Select the items you want to add to the CSV file.
            </div>
        `;

        // Add filter controls for enrollments
        if (fileType === 'enrollments') {
            resultsHTML += `
                <div class="card mb-3">
                    <div class="card-header">
                        <h6 class="mb-0"><i class="bi bi-funnel me-2"></i>Filter Results</h6>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <label class="form-label">Filter by Status</label>
                                <select id="filter-enrollment-status" class="form-select">
                                    <option value="all">All Statuses</option>
                                    <option value="active">Active</option>
                                    <option value="invited">Invited</option>
                                    <option value="completed">Completed</option>
                                    <option value="deleted">Deleted</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Filter by Role</label>
                                <select id="filter-enrollment-role" class="form-select">
                                    <option value="all">All Roles</option>
                                    <option value="student">Student</option>
                                    <option value="teacher">Teacher</option>
                                    <option value="ta">TA</option>
                                    <option value="designer">Designer</option>
                                    <option value="observer">Observer</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        resultsHTML += `
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h6 class="mb-0">Search Results Preview (SIS CSV Format)</h6>
                    <div>
                        <button type="button" id="select-all-results" class="btn btn-sm btn-outline-primary me-2">
                            <i class="bi bi-check-all me-1"></i>Select All
                        </button>
                        <button type="button" id="add-selected-results" class="btn btn-sm btn-success" disabled>
                            <i class="bi bi-plus-circle me-1"></i>Add Selected (<span id="selected-count">0</span>)
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="table-responsive" style="max-height: 300px; overflow-y: auto;">
                        <table class="table table-sm table-striped" id="search-results-table">
                            <thead class="table-dark sticky-top">
                                <tr>
                                    <th><input type="checkbox" id="select-all-checkbox" title="Select/Deselect All"></th>
        `;

        // Add headers based on file type
        if (fileType === 'logins') {
            // For logins, show the SIS CSV headers
            resultsHTML += `
                <th>User ID</th>
                <th>Login ID</th>
                <th>Auth Provider ID</th>
                <th>Password</th>
                <th>Existing User ID</th>
                <th>Existing Integration ID</th>
                <th>Existing Canvas User ID</th>
                <th>Email</th>
            `;
        } else {
            // For other types, use the original logic
            const sampleItem = data[0];
            Object.keys(sampleItem).forEach(key => {
                if (!key.startsWith('_') && key !== 'id') { // Skip internal fields
                    resultsHTML += `<th>${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</th>`;
                }
            });
        }

        resultsHTML += '</tr></thead><tbody>';

        // Add all rows with checkboxes
        data.forEach((item, rowIndex) => {
            resultsHTML += `<tr data-row-index="${rowIndex}">`;

            // Add checkbox column
            resultsHTML += `<td><input type="checkbox" class="result-checkbox" data-row-index="${rowIndex}"></td>`;

            if (fileType === 'logins') {
                // For logins, show the mapped SIS format
                const fields = ['sis_user_id', 'unique_id', 'authentication_provider_id', 'password', 'existing_user_id', 'existing_integration_id', 'existing_canvas_user_id', 'email'];
                fields.forEach(field => {
                    const value = item[field] || '';
                    resultsHTML += `<td>${value}</td>`;
                });
            } else {
                // For other types, use the original logic
                const sampleItem = data[0];
                Object.keys(sampleItem).forEach(key => {
                    if (!key.startsWith('_') && key !== 'id') {
                        const value = item[key] || '';
                        const displayValue = String(value).substring(0, 50) + (String(value).length > 50 ? '...' : '');
                        resultsHTML += `<td title="${value}">${displayValue}</td>`;
                    }
                });
            }

            resultsHTML += '</tr>';
        });

        resultsHTML += '</tbody></table>';

        resultsHTML += `
                    </div>
                </div>
            </div>
        `;

        searchResults.innerHTML = resultsHTML;
        searchResults.style.display = 'block';

        // Add event listeners for selection
        addSearchResultsSelectionListeners(fileType);

        // Add filter event listeners for enrollments
        if (fileType === 'enrollments') {
            addEnrollmentFilterListeners();
        }
    }

    function addEnrollmentFilterListeners() {
        const statusFilter = document.getElementById('filter-enrollment-status');
        const roleFilter = document.getElementById('filter-enrollment-role');

        if (!statusFilter || !roleFilter) return;

        const applyFilters = () => {
            const searchResults = document.getElementById('search-results');
            const allData = JSON.parse(searchResults.dataset.allData || '[]');

            const statusValue = statusFilter.value;
            const roleValue = roleFilter.value;

            // Filter the data
            let filteredData = allData.filter(item => {
                const statusMatch = statusValue === 'all' || item.status === statusValue;
                const roleMatch = roleValue === 'all' || item.role === roleValue;
                return statusMatch && roleMatch;
            });

            // Update the info alert
            const infoAlert = searchResults.querySelector('.alert-info');
            if (infoAlert) {
                infoAlert.innerHTML = `
                    <i class="bi bi-info-circle me-2"></i>
                    Showing ${filteredData.length} of ${allData.length} enrollment(s). Select the items you want to add to the CSV file.
                `;
            }

            // Update the searchResults dataset with filtered data (but keep allData intact!)
            searchResults.dataset.searchResults = JSON.stringify(filteredData);

            // Rebuild the table body without calling showSearchResults (which would reset allData)
            rebuildEnrollmentTable(filteredData);
        };

        statusFilter.addEventListener('change', applyFilters);
        roleFilter.addEventListener('change', applyFilters);
    }

    function rebuildEnrollmentTable(data) {
        const searchResults = document.getElementById('search-results');
        const table = searchResults.querySelector('#search-results-table');
        if (!table) return;

        const tbody = table.querySelector('tbody');
        if (!tbody) return;

        // Clear existing rows
        tbody.innerHTML = '';

        // Add filtered rows
        data.forEach((item, rowIndex) => {
            let rowHTML = `<tr data-row-index="${rowIndex}">`;

            // Add checkbox column
            rowHTML += `<td><input type="checkbox" class="result-checkbox" data-row-index="${rowIndex}"></td>`;

            // Add data columns
            const sampleItem = data[0];
            Object.keys(sampleItem).forEach(key => {
                if (!key.startsWith('_') && key !== 'id') {
                    const value = item[key] || '';
                    const displayValue = String(value).substring(0, 50) + (String(value).length > 50 ? '...' : '');
                    rowHTML += `<td title="${value}">${displayValue}</td>`;
                }
            });

            rowHTML += '</tr>';
            tbody.innerHTML += rowHTML;
        });

        // Re-attach event listeners for the new checkboxes
        addSearchResultsSelectionListeners('enrollments');
    }

    function addSearchResultsSelectionListeners(fileType) {
        const searchResults = document.getElementById('search-results');
        const selectAllCheckbox = document.getElementById('select-all-checkbox');
        const selectAllBtn = document.getElementById('select-all-results');
        const addSelectedBtn = document.getElementById('add-selected-results');
        const selectedCountSpan = document.getElementById('selected-count');
        const resultCheckboxes = document.querySelectorAll('.result-checkbox');

        // Update selected count and button state
        function updateSelectionState() {
            const checkedCount = document.querySelectorAll('.result-checkbox:checked').length;
            selectedCountSpan.textContent = checkedCount;
            addSelectedBtn.disabled = checkedCount === 0;

            // Update select-all checkbox state
            const totalCount = resultCheckboxes.length;
            if (checkedCount === 0) {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = false;
            } else if (checkedCount === totalCount) {
                selectAllCheckbox.checked = true;
                selectAllCheckbox.indeterminate = false;
            } else {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = true;
            }
        }

        // Individual checkbox change
        resultCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', updateSelectionState);
        });

        // Select all checkbox
        selectAllCheckbox.addEventListener('change', function () {
            resultCheckboxes.forEach(cb => {
                cb.checked = this.checked;
            });
            updateSelectionState();
        });

        // Select all button
        selectAllBtn.addEventListener('click', function () {
            resultCheckboxes.forEach(cb => {
                cb.checked = true;
            });
            updateSelectionState();
        });

        // Add selected button
        addSelectedBtn.addEventListener('click', function () {
            const selectedIndices = [];
            resultCheckboxes.forEach(cb => {
                if (cb.checked) {
                    selectedIndices.push(parseInt(cb.dataset.rowIndex));
                }
            });

            if (selectedIndices.length === 0) {
                return;
            }

            // Get the search results
            const allResults = JSON.parse(searchResults.dataset.searchResults || '[]');

            // Get currently stored data or initialize empty array
            let currentData = [];
            if (searchResults.dataset.searchData) {
                try {
                    currentData = JSON.parse(searchResults.dataset.searchData);
                } catch (e) {
                    currentData = [];
                }
            }

            // Get field definitions to ensure all fields are present
            const fieldDefinitions = getSISFieldDefinitions(fileType);

            // Add selected items to current data, normalizing to include all fields
            selectedIndices.forEach(index => {
                if (allResults[index]) {
                    const normalizedItem = {};

                    // For logins, use the specific fields
                    if (fileType === 'logins') {
                        const loginFields = ['sis_user_id', 'unique_id', 'authentication_provider_id', 'password', 'existing_user_id', 'existing_integration_id', 'existing_canvas_user_id', 'email'];
                        loginFields.forEach(field => {
                            normalizedItem[field] = allResults[index][field] || '';
                        });
                    } else {
                        // For other types, use field definitions
                        fieldDefinitions.forEach(field => {
                            normalizedItem[field.name] = allResults[index][field.name] || '';
                        });
                    }

                    currentData.push(normalizedItem);
                }
            });

            // Update CSV data (not search data)
            const csvDataResults = document.getElementById('csv-data-results');
            let csvData = [];
            if (csvDataResults.dataset.csvData) {
                try {
                    csvData = JSON.parse(csvDataResults.dataset.csvData);
                } catch (e) {
                    csvData = [];
                }
            }

            // Add selected items to CSV data
            csvData.push(...currentData);
            csvDataResults.dataset.csvData = JSON.stringify(csvData);

            // Show the CSV data
            showCSVData(csvData, fileType);
            document.getElementById('csv-data-section').style.display = 'block';

            // Show success message
            const successMsg = document.createElement('div');
            successMsg.className = 'alert alert-success alert-dismissible fade show mt-2';
            successMsg.innerHTML = `
                <i class="bi bi-check-circle me-2"></i>
                Added ${selectedIndices.length} item(s) to CSV Data! Total items: ${csvData.length}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            searchResults.insertBefore(successMsg, searchResults.firstChild);

            // Auto-remove success message
            setTimeout(() => {
                if (successMsg.parentNode) {
                    successMsg.remove();
                }
            }, 3000);

            // Clear selections
            resultCheckboxes.forEach(cb => {
                cb.checked = false;
            });
            updateSelectionState();
        });

        // Initialize state
        updateSelectionState();
    }

    function showCSVData(data, fileType) {
        const csvDataResults = document.getElementById('csv-data-results');

        if (!csvDataResults) return;

        if (!data || data.length === 0) {
            csvDataResults.innerHTML = `
                <div class="alert alert-info mb-0">
                    <i class="bi bi-info-circle me-2"></i>
                    No data added yet. Use "Add Row from Configuration" or "Add Random Rows" to add data.
                </div>
            `;
            return;
        }

        let csvHTML = `
            <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                <table class="table table-sm table-striped">
                    <thead class="table-dark sticky-top">
                        <tr>
        `;

        // Add headers based on file type - use field definitions to show ALL columns
        const fieldDefinitions = getSISFieldDefinitions(fileType);

        if (fileType === 'logins') {
            csvHTML += `
                <th>User ID</th>
                <th>Login ID</th>
                <th>Auth Provider ID</th>
                <th>Password</th>
                <th>Existing User ID</th>
                <th>Existing Integration ID</th>
                <th>Existing Canvas User ID</th>
                <th>Email</th>
                <th>Actions</th>
            `;
        } else {
            // Use field definitions to ensure ALL fields are shown
            fieldDefinitions.forEach(field => {
                csvHTML += `<th>${field.display}</th>`;
            });
            csvHTML += `<th>Actions</th>`;
        }

        csvHTML += '</tr></thead><tbody>';

        // Add all rows with editable cells - show ALL columns from field definitions
        data.forEach((item, rowIndex) => {
            csvHTML += `<tr data-row-index="${rowIndex}">`;

            if (fileType === 'logins') {
                const fields = ['sis_user_id', 'unique_id', 'authentication_provider_id', 'password', 'existing_user_id', 'existing_integration_id', 'existing_canvas_user_id', 'email'];
                fields.forEach(field => {
                    const value = item[field] || '';
                    csvHTML += `<td class="editable-cell" data-field="${field}" data-row="${rowIndex}">${value}</td>`;
                });
            } else {
                // Use field definitions to ensure ALL fields are shown, even if empty
                fieldDefinitions.forEach(field => {
                    const value = item[field.name] || '';
                    const displayValue = String(value).substring(0, 50) + (String(value).length > 50 ? '...' : '');
                    csvHTML += `<td class="editable-cell" data-field="${field.name}" data-row="${rowIndex}" title="${value}">${displayValue}</td>`;
                });
            }

            // Add remove button
            csvHTML += `
                <td>
                    <button class="btn btn-sm btn-outline-danger remove-row-btn" data-row-index="${rowIndex}" title="Remove this row">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;

            csvHTML += '</tr>';
        });

        csvHTML += `
                    </tbody>
                </table>
            </div>
        `;

        csvDataResults.innerHTML = csvHTML;

        // Add event listeners for editable cells and remove buttons
        addEditableCellListeners();
        addRemoveRowListeners(fileType);
    }

    function showSearchError(error) {
        const searchResults = document.getElementById('search-results');
        searchResults.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle me-2"></i>
                Search failed: ${error}. The generated file will use sample data.
            </div>
        `;
        searchResults.style.display = 'block';

        // Clear any stored search data
        delete searchResults.dataset.searchData;
    }
}

async function createBulkSISFiles(e) {
    hideEndpoints(e);

    const eContent = document.querySelector('#endpoint-content');
    let createBulkSISForm = eContent.querySelector('#create-bulk-sis-form');

    if (!createBulkSISForm) {
        createBulkSISForm = document.createElement('form');
        createBulkSISForm.id = 'create-bulk-sis-form';
        createBulkSISForm.innerHTML = `
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-files me-2"></i>Create Bulk SIS Import Files
                    </h3>
                    <small class="text-muted">Generate multiple CSV files for a complete SIS import package</small>
                </div>
                <div class="card-body">
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
                                        <input type="number" id="courses-count" class="form-control form-control-sm" min="1" max="10000" value="100">
                                    </div>
                                    <div class="col-5">
                                        <small class="text-muted">Course catalog entries</small>
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
                                        <input type="number" id="sections-count" class="form-control form-control-sm" min="1" max="10000" value="150">
                                    </div>
                                    <div class="col-5">
                                        <small class="text-muted">Course sections/class periods</small>
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
                                        <input type="number" id="enrollments-count" class="form-control form-control-sm" min="1" max="50000" value="500">
                                    </div>
                                    <div class="col-5">
                                        <small class="text-muted">Student and teacher enrollments</small>
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
                                <button type="button" id="bulk-browse-folder" class="btn btn-outline-secondary">Browse</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-12">
                            <button type="submit" id="generate-bulk-files" class="btn btn-primary" disabled>Generate Bulk CSV Package</button>
                        </div>
                    </div>
                    
                    <div id="bulk-progress" class="mt-4" style="display: none;">
                        <h5>Progress</h5>
                        <div class="progress">
                            <div id="bulk-progress-bar" class="progress-bar" style="width: 0%"></div>
                        </div>
                        <p id="bulk-progress-text" class="mt-2"></p>
                    </div>
                    
                    <div id="bulk-result-container" class="mt-4" style="display: none;">
                        <div id="bulk-result-message" class="alert"></div>
                    </div>
                </div>
            </div>
        `;

        eContent.appendChild(createBulkSISForm);
    } else {
        createBulkSISForm.hidden = false;
    }

    // Event listeners
    if (!createBulkSISForm.hasAttribute('data-listeners-added')) {
        document.getElementById('bulk-browse-folder').addEventListener('click', async () => {
            const result = await window.electronAPI.selectFolder();
            if (result) {
                document.getElementById('bulk-output-path').value = result;
                validateBulkForm();
            }
        });

        function validateBulkForm() {
            const outputPath = document.getElementById('bulk-output-path').value.trim();
            const generateBtn = document.getElementById('generate-bulk-files');

            // Check if at least one file type is selected
            const checkboxes = [
                'include-users', 'include-accounts', 'include-terms',
                'include-courses', 'include-sections', 'include-enrollments'
            ];
            const anyChecked = checkboxes.some(id => document.getElementById(id).checked);

            generateBtn.disabled = !(outputPath && anyChecked);
        }

        // Add validation to checkboxes
        ['include-users', 'include-accounts', 'include-terms',
            'include-courses', 'include-sections', 'include-enrollments'].forEach(id => {
                document.getElementById(id).addEventListener('change', validateBulkForm);
            });

        document.getElementById('generate-bulk-files').addEventListener('click', async () => {
            const outputPath = document.getElementById('bulk-output-path').value;
            const generateBtn = document.getElementById('generate-bulk-files');

            if (!outputPath) {
                showBulkResult('Please select an output folder.', 'danger');
                return;
            }

            const fileTypes = [];
            if (document.getElementById('include-users').checked) {
                fileTypes.push({ type: 'users', count: parseInt(document.getElementById('users-count').value) });
            }
            if (document.getElementById('include-accounts').checked) {
                fileTypes.push({ type: 'accounts', count: parseInt(document.getElementById('accounts-count').value) });
            }
            if (document.getElementById('include-terms').checked) {
                fileTypes.push({ type: 'terms', count: parseInt(document.getElementById('terms-count').value) });
            }
            if (document.getElementById('include-courses').checked) {
                fileTypes.push({ type: 'courses', count: parseInt(document.getElementById('courses-count').value) });
            }
            if (document.getElementById('include-sections').checked) {
                fileTypes.push({ type: 'sections', count: parseInt(document.getElementById('sections-count').value) });
            }
            if (document.getElementById('include-enrollments').checked) {
                fileTypes.push({ type: 'enrollments', count: parseInt(document.getElementById('enrollments-count').value) });
            }

            if (fileTypes.length === 0) {
                showBulkResult('Please select at least one file type to generate.', 'danger');
                return;
            }

            generateBtn.disabled = true;
            showBulkProgress(0, 'Starting bulk generation...');

            try {
                const result = await window.electronAPI.generateBulkSISFiles({
                    outputPath,
                    fileTypes,
                    emailDomain: '@instructure.com'
                });

                hideBulkProgress();
                showBulkResult(`Bulk SIS package generated successfully! ${result.filesGenerated} files created.`, 'success');
            } catch (error) {
                hideBulkProgress();
                showBulkResult(`Error generating bulk package: ${error.message}`, 'danger');
            } finally {
                generateBtn.disabled = false;
            }
        });

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
            }, 5000);
        }
    }

    function showBulkProgress(percent, text) {
        const progressBar = document.getElementById('bulk-progress-bar');
        const progressText = document.getElementById('bulk-progress-text');
        document.getElementById('bulk-progress').style.display = 'block';
        progressBar.style.width = `${percent}%`;
        progressText.textContent = text;
    }

    function hideBulkProgress() {
        document.getElementById('bulk-progress').style.display = 'none';
    }
}