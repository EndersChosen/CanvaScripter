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
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-file-earmark-spreadsheet me-2"></i>Create Single SIS Import File
                    </h3>
                    <small class="text-muted">Generate a single CSV file for SIS import with random sample data, or build a collection of files for zip export</small>
                </div>
                <div class="card-body">
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label for="file-type" class="form-label">File Type</label>
                            <select id="file-type" class="form-select" required>
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
                            <input type="number" id="row-count" class="form-control" min="1" max="10000" value="10" required>
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
                            <button type="button" id="preview-data" class="btn btn-outline-info ms-2" disabled>Preview Sample Data</button>
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
        document.getElementById('file-type').addEventListener('change', function() {
            const fileType = this.value;
            const emailDomainRow = document.getElementById('email-domain-row');
            
            // Show email domain field only for users
            if (fileType === 'users') {
                emailDomainRow.style.display = 'block';
            } else {
                emailDomainRow.style.display = 'none';
            }
            
            validateForm();
            clearFieldInputs();
            clearPreview();
        });

        // Browse folder handler
        document.getElementById('browse-folder').addEventListener('click', async () => {
            const result = await window.electronAPI.selectFolder();
            if (result) {
                document.getElementById('output-path').value = result;
                validateForm();
            }
        });

        // Row count change handler
        document.getElementById('row-count').addEventListener('input', () => {
            validateForm();
            clearPreview();
        });

        // Form validation
        function validateForm() {
            const fileType = document.getElementById('file-type').value;
            const rowCount = document.getElementById('row-count').value;
            const outputPath = document.getElementById('output-path').value;
            
            const isValid = fileType && rowCount && parseInt(rowCount) > 0 && outputPath;
            
            document.getElementById('generate-sis-file').disabled = !isValid;
            document.getElementById('preview-data').disabled = !isValid;
        }

        function clearFieldInputs() {
            const fieldInputsContainer = document.getElementById('field-inputs-container');
            if (fieldInputsContainer) {
                fieldInputsContainer.remove();
            }
        }

        function clearPreview() {
            const previewContainer = document.getElementById('preview-container');
            if (previewContainer) {
                previewContainer.style.display = 'none';
            }
        }

        // Generate file handler
        document.getElementById('generate-sis-file').addEventListener('click', async () => {
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
                showResult(`Error generating SIS file: ${error.message}`, 'danger');
            }
        });

        // Preview data handler
        document.getElementById('preview-data').addEventListener('click', async () => {
            const fileType = document.getElementById('file-type').value;
            const rowCount = Math.min(parseInt(document.getElementById('row-count').value), 5); // Preview max 5 rows
            const emailDomain = fileType === 'users'
                ? (document.getElementById('email-domain').value.trim() || '@instructure.com')
                : '@instructure.com';
            const authProviderId = '';

            const allOptions = gatherAllOptions(fileType);

            try {
                const result = await window.electronAPI.previewSISData(
                    fileType,
                    rowCount,
                    emailDomain,
                    authProviderId,
                    allOptions
                );

                if (result.success) {
                    showPreview(result.preview, fileType);
                } else {
                    showResult(`Error generating preview: ${result.error || 'Unknown error'}`, 'danger');
                }
            } catch (error) {
                console.error('Preview error:', error);
                showResult(`Error generating preview: ${error.message}`, 'danger');
            }
        });

        createSISForm.setAttribute('data-listeners-added', 'true');
    }

    // Helper functions for field management would go here
    function gatherAllOptions(fileType) {
        // This function would gather all the field options based on file type
        // For now, returning empty object as placeholder
        return {};
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
        resultContainer.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        createSISForm.appendChild(resultContainer);

        if (type === 'success') {
            setTimeout(() => {
                if (resultContainer && resultContainer.parentNode) {
                    resultContainer.remove();
                }
            }, 5000);
        }
    }

    function showPreview(csvContent, fileType) {
        // Remove any existing preview
        let previewContainer = document.getElementById('preview-container');
        if (previewContainer) {
            previewContainer.remove();
        }

        previewContainer = document.createElement('div');
        previewContainer.id = 'preview-container';
        previewContainer.className = 'mt-4';
        
        const lines = csvContent.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',');
        const rows = lines.slice(1);

        let tableHTML = `
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h5 class="mb-0 text-dark">
                        <i class="bi bi-eye me-2"></i>Preview: ${fileType} (${rows.length} sample rows)
                    </h5>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-sm table-striped">
                            <thead class="table-dark">
                                <tr>
        `;

        headers.forEach(header => {
            tableHTML += `<th>${header.replace(/"/g, '')}</th>`;
        });
        tableHTML += '</tr></thead><tbody>';

        rows.forEach(row => {
            const cells = row.split(',');
            tableHTML += '<tr>';
            cells.forEach(cell => {
                tableHTML += `<td>${cell.replace(/"/g, '')}</td>`;
            });
            tableHTML += '</tr>';
        });

        tableHTML += `
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        `;

        previewContainer.innerHTML = tableHTML;
        createSISForm.appendChild(previewContainer);
        previewContainer.style.display = 'block';
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