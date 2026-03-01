// enrollments_renderer.js - UI for bulk enrollments

function enrollmentTemplate(e) {
    switch (e.target.id) {
        case 'add-enrollments':
            addEnrollmentsUI(e);
            break;
        default:
            break;
    }
}

function addEnrollmentsUI(e) {
    hideEndpoints(e);

    const eContent = document.querySelector('#endpoint-content');
    let wrapper = eContent.querySelector('#add-enrollments-wrapper');

    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = 'add-enrollments-wrapper';
        wrapper.innerHTML = `
            <style>
                #add-enrollments-wrapper .mode-toggle {
                    display: flex; gap: 0.5rem; margin-bottom: 0.75rem;
                }
                #add-enrollments-wrapper .mode-toggle .btn { font-size: 0.85rem; padding: 0.35rem 1rem; }
                #add-enrollments-wrapper .mode-toggle .btn.active {
                    font-weight: 600;
                }
            </style>
            <div class="card mb-2">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark" style="font-size: 1.1rem;">
                        <i class="bi bi-person-plus me-1"></i>Add Enrollments
                    </h3>
                    <small class="text-muted">Create or enroll users in a Canvas course</small>
                </div>
                <div class="card-body" style="padding: 0.75rem;">
                    <div class="mode-toggle">
                        <button type="button" class="btn btn-sm btn-outline-primary active" id="mode-from-file">From File</button>
                        <button type="button" class="btn btn-sm btn-outline-primary" id="mode-manual">Manual</button>
                    </div>
                    <div id="enrollment-mode-content"></div>
                </div>
            </div>
        `;
        eContent.appendChild(wrapper);

        // Wire up toggle buttons
        const fromFileBtn = wrapper.querySelector('#mode-from-file');
        const manualBtn = wrapper.querySelector('#mode-manual');
        const modeContent = wrapper.querySelector('#enrollment-mode-content');

        const showMode = (mode) => {
            fromFileBtn.classList.toggle('active', mode === 'file');
            manualBtn.classList.toggle('active', mode === 'manual');
            // Hide everything first
            Array.from(modeContent.children).forEach(c => c.hidden = true);

            if (mode === 'file') {
                renderFromFileSection(modeContent);
            } else {
                renderManualSection(modeContent);
            }
        };

        fromFileBtn.addEventListener('click', () => showMode('file'));
        manualBtn.addEventListener('click', () => showMode('manual'));

        // Default to From File
        showMode('file');
    }

    wrapper.hidden = false;
}

// ==================== From File Section ====================

function renderFromFileSection(container) {
    let form = container.querySelector('#bulk-enrollment-form');
    if (form) {
        form.hidden = false;
        return;
    }

    form = document.createElement('form');
    form.id = 'bulk-enrollment-form';
    form.innerHTML = `
        <style>
            #bulk-enrollment-form .form-label { font-size: 0.8rem; margin-bottom: 0.25rem; }
            #bulk-enrollment-form .form-control, #bulk-enrollment-form .form-select { 
                font-size: 0.8rem; padding: 0.25rem 0.5rem; height: auto;
            }
            #bulk-enrollment-form .btn { font-size: 0.8rem; padding: 0.35rem 0.75rem; }
            #bulk-enrollment-form .form-text { font-size: 0.7rem; margin-top: 0.15rem; }
            #bulk-enrollment-form .form-check-label { font-size: 0.8rem; }
            #bulk-enrollment-form .form-check-input { font-size: 0.8rem; }
            #bulk-enrollment-form .mt-2 { margin-top: 0.5rem !important; }
            #bulk-enrollment-form .mt-3 { margin-top: 0.75rem !important; }
            #bulk-enrollment-form .mb-2 { margin-bottom: 0.5rem !important; }
            #bulk-enrollment-form .mb-3 { margin-bottom: 0.75rem !important; }
            #bulk-enrollment-form .mb-4 { margin-bottom: 1rem !important; }
            #bulk-enrollment-form .progress { height: 12px !important; }
            #bulk-enrollment-form h5 { font-size: 1rem; }
            #bulk-enrollment-form h6 { font-size: 0.9rem; }
            #bulk-enrollment-form p { margin-bottom: 0.5rem; font-size: 0.85rem; }
            #bulk-enrollment-form .alert { padding: 0.5rem 0.75rem; font-size: 0.8rem; }
            #bulk-enrollment-form .badge { font-size: 0.75rem; }
            #bulk-enrollment-form hr { margin: 0.5rem 0; }
            #bulk-enrollment-form .row { margin-bottom: 0.75rem; }
            #bulk-enrollment-form .g-3 { gap: 0.5rem !important; }
        </style>
        <div class="row g-3 mb-2">
            <div class="col-12">
                <label class="form-label fw-bold" for="enrollment-file">
                    <i class="bi bi-file-earmark-spreadsheet me-1"></i>Enrollment File
                </label>
                <input type="file" class="form-control form-control-sm" id="enrollment-file" 
                       accept=".csv,.txt" />
                <div id="file-help" class="form-text text-danger" style="min-height: 1.25rem; visibility: hidden;">
                    <i class="bi bi-exclamation-triangle me-1"></i>Please select a CSV or TXT file.
                </div>
                <div class="form-text text-muted">
                    <i class="bi bi-info-circle me-1"></i>CSV or TXT file with enrollment data. File must contain course_id or section_id for each enrollment.
                </div>
            </div>
        </div>

        <div class="row g-3 mb-2">
            <div class="col-12">
                <label class="form-label fw-bold">
                    <i class="bi bi-sliders me-1"></i>Enrollment State
                </label>
                <div class="d-flex gap-3 flex-wrap">
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="enrollment-state" 
                               id="state-active" value="active" checked>
                        <label class="form-check-label" for="state-active">Active</label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="enrollment-state" 
                               id="state-inactive" value="inactive">
                        <label class="form-check-label" for="state-inactive">Inactive</label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="enrollment-state" 
                               id="state-delete" value="delete">
                        <label class="form-check-label" for="state-delete">Delete</label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="enrollment-state" 
                               id="state-conclude" value="conclude">
                        <label class="form-check-label" for="state-conclude">Conclude</label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="enrollment-state" 
                               id="state-deactivate" value="deactivate">
                        <label class="form-check-label" for="state-deactivate">Deactivate</label>
                    </div>
                </div>
                <div class="form-text text-muted">
                    <i class="bi bi-info-circle me-1"></i>Delete, Conclude, and Deactivate require <strong>course_id</strong> and <strong>enrollment_id</strong> in your file and cannot use section_id.
                </div>
            </div>
        </div>

        <div id="file-preview" class="alert alert-info mt-2" style="display: none;">
            <h6 class="mb-2"><i class="bi bi-file-check me-1"></i>File Preview</h6>
            <p id="preview-text" class="mb-0"></p>
        </div>
        
        <div class="row mb-2">
            <div class="col-md-6">
                <div class="d-grid">
                    <button type="button" class="btn btn-sm btn-success" id="enroll-btn" disabled>
                        <i class="bi bi-person-plus-fill me-2"></i>Process Enrollments
                    </button>
                </div>
            </div>
        </div>
        <div id="enroll-error" class="alert alert-danger mt-1" hidden>
            <i class="bi bi-exclamation-triangle me-2"></i><span id="enroll-error-text"></span>
        </div>

        <!-- Progress Card -->
        <div class="card mt-2" id="enrollment-progress-card" hidden>
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-gear me-2"></i>Processing Enrollments
                </h5>
            </div>
            <div class="card-body">
                <p id="enrollment-progress-info" class="mb-2"></p>
                <div class="progress mb-2" style="height: 12px;">
                    <div class="progress-bar progress-bar-striped progress-bar-animated" 
                         id="enrollment-progress-bar" style="width:0%" role="progressbar" 
                         aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                    </div>
                </div>
                <small class="text-muted" id="enrollment-progress-detail"></small>
                <div class="mt-2">
                    <button type="button" class="btn btn-sm btn-outline-danger" id="enrollment-cancel-btn" hidden>
                        <i class="bi bi-x-circle me-1"></i>Cancel Processing
                    </button>
                </div>
            </div>
        </div>

        <!-- Results Card -->
        <div class="card mt-2" id="enrollment-results-card" hidden>
            <div class="card-body" id="enrollment-response"></div>
        </div>
    `;
    container.appendChild(form);
    setupEnrollmentFormListeners();
}

function setupEnrollmentFormListeners() {
    const fileInput = document.getElementById('enrollment-file');
    const enrollBtn = document.getElementById('enroll-btn');
    const fileHelp = document.getElementById('file-help');
    const filePreview = document.getElementById('file-preview');
    const previewText = document.getElementById('preview-text');
    const cancelBtn = document.getElementById('enrollment-cancel-btn');
    const enrollmentStateInputs = Array.from(document.querySelectorAll('input[name="enrollment-state"]'));

    let parsedData = null;
    let cancellationRequested = false;

    const getSelectedAction = () => {
        const selected = enrollmentStateInputs.find(input => input.checked);
        return selected ? selected.value : 'active';
    };

    const updateActionButtonLabel = (action) => {
        const labels = {
            active: '<i class="bi bi-person-plus-fill me-2"></i>Process Enrollments',
            inactive: '<i class="bi bi-person-plus-fill me-2"></i>Process Enrollments',
            delete: '<i class="bi bi-trash me-2"></i>Delete Enrollments',
            conclude: '<i class="bi bi-check2-circle me-2"></i>Conclude Enrollments',
            deactivate: '<i class="bi bi-pause-circle me-2"></i>Deactivate Enrollments'
        };

        enrollBtn.innerHTML = labels[action] || labels.active;
    };

    const validateEnrollmentsForTask = (enrollments, action) => {
        if (!Array.isArray(enrollments) || enrollments.length === 0) {
            return { valid: false, message: 'No valid enrollment records found in file.' };
        }

        if (action === 'delete' || action === 'conclude' || action === 'deactivate') {
            const missingEnrollmentId = enrollments.some(enrollment => !enrollment.enrollment_id);
            if (missingEnrollmentId) {
                return {
                    valid: false,
                    message: `This request can't be completed because ${action} requires an enrollment_id and it was not found for one or more rows in the file.`
                };
            }

            const missingCourseId = enrollments.some(enrollment => !enrollment.course_id);
            if (missingCourseId) {
                return {
                    valid: false,
                    message: `This request can't be completed because ${action} requires a course_id and one or more rows do not include it. These tasks cannot use section_id.`
                };
            }
        }

        return { valid: true, message: '' };
    };

    const refreshValidationState = () => {
        const selectedAction = getSelectedAction();
        updateActionButtonLabel(selectedAction);

        if (!parsedData || parsedData.length === 0) {
            enrollBtn.disabled = true;
            return;
        }

        const validation = validateEnrollmentsForTask(parsedData, selectedAction);

        if (!validation.valid) {
            fileHelp.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i>${validation.message}`;
            fileHelp.style.visibility = 'visible';
            enrollBtn.disabled = true;
            return;
        }

        fileHelp.style.visibility = 'hidden';
        enrollBtn.disabled = false;
    };

    enrollmentStateInputs.forEach((input) => {
        input.addEventListener('change', () => {
            refreshValidationState();
        });
    });

    updateActionButtonLabel(getSelectedAction());

    // File input change handler
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];

        if (!file) {
            enrollBtn.disabled = true;
            fileHelp.style.visibility = 'hidden';
            filePreview.style.display = 'none';
            parsedData = null;
            return;
        }

        // Validate file type
        const lowerFileName = file.name.toLowerCase();
        if (!lowerFileName.endsWith('.csv') && !lowerFileName.endsWith('.txt')) {
            fileHelp.textContent = 'Please select a CSV or TXT file.';
            fileHelp.style.visibility = 'visible';
            enrollBtn.disabled = true;
            filePreview.style.display = 'none';
            parsedData = null;
            return;
        }

        try {
            const content = await file.text();
            const parseResult = parseEnrollmentFile(content);

            if (parseResult.error) {
                fileHelp.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i>${parseResult.error}`;
                fileHelp.style.visibility = 'visible';
                enrollBtn.disabled = true;
                filePreview.style.display = 'none';
                parsedData = null;
                return;
            }

            parsedData = parseResult.enrollments;

            if (parsedData.length === 0) {
                fileHelp.innerHTML = '<i class="bi bi-exclamation-triangle me-1"></i>No valid enrollment records found in file.';
                fileHelp.style.visibility = 'visible';
                enrollBtn.disabled = true;
                filePreview.style.display = 'none';
                return;
            }

            // Show preview with summary statistics
            const summary = generateEnrollmentSummary(parsedData);
            filePreview.style.display = 'block';
            previewText.innerHTML = summary;
            refreshValidationState();

        } catch (error) {
            console.error('Error parsing file:', error);
            fileHelp.innerHTML = '<i class="bi bi-exclamation-triangle me-1"></i>Error reading file.';
            fileHelp.style.visibility = 'visible';
            enrollBtn.disabled = true;
            filePreview.style.display = 'none';
            parsedData = null;
        }
    });

    // Enroll button click handler
    enrollBtn.addEventListener('click', async () => {
        if (!parsedData || parsedData.length === 0) return;

        const domain = document.getElementById('domain').value.trim();
        const token = document.getElementById('token').value.trim();
        const enrollmentState = document.querySelector('input[name="enrollment-state"]:checked').value;
        const enrollmentTask = (enrollmentState === 'delete' || enrollmentState === 'conclude' || enrollmentState === 'deactivate')
            ? enrollmentState
            : 'enroll';

        if (!domain || !token) {
            const errDiv = document.getElementById('enroll-error');
            document.getElementById('enroll-error-text').textContent = 'Please enter Canvas domain and API token in Settings.';
            errDiv.hidden = false;
            return;
        }
        document.getElementById('enroll-error').hidden = true;

        const validation = validateEnrollmentsForTask(parsedData, enrollmentState);
        if (!validation.valid) {
            fileHelp.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i>${validation.message}`;
            fileHelp.style.visibility = 'visible';
            enrollBtn.disabled = true;
            return;
        }

        // Show progress
        document.getElementById('enrollment-progress-card').hidden = false;
        document.getElementById('enrollment-results-card').hidden = true;
        enrollBtn.disabled = true;
        cancellationRequested = false;

        if (cancelBtn) {
            cancelBtn.hidden = false;
            cancelBtn.disabled = false;
            cancelBtn.innerHTML = '<i class="bi bi-x-circle me-1"></i>Cancel Processing';
            cancelBtn.classList.remove('btn-secondary');
            cancelBtn.classList.add('btn-outline-danger');
        }

        const progressBar = document.getElementById('enrollment-progress-bar');
        const progressInfo = document.getElementById('enrollment-progress-info');
        const progressDetail = document.getElementById('enrollment-progress-detail');
        if (progressBar && progressInfo && progressDetail) {
            progressBar.style.width = '0%';
            progressBar.setAttribute('aria-valuenow', '0');
            progressInfo.textContent = `Processing enrollments ... 0/${parsedData.length}`;
            progressDetail.textContent = 'Preparing requests...';
        }

        try {
            const result = await window.axios.bulkEnroll({
                domain,
                token,
                enrollments: parsedData,
                enrollmentState,
                enrollmentTask
            });

            // Show results
            displayEnrollmentResults(result);

            if (cancellationRequested) {
                const progressDetailAfter = document.getElementById('enrollment-progress-detail');
                if (progressDetailAfter) {
                    progressDetailAfter.textContent = 'Processing cancelled. In-flight requests were allowed to finish.';
                }
            }
        } catch (error) {
            console.error('Enrollment error:', error);
            displayEnrollmentError(error);
        } finally {
            enrollBtn.disabled = false;
            document.getElementById('enrollment-progress-card').hidden = true;
            if (cancelBtn) {
                cancelBtn.hidden = true;
                cancelBtn.disabled = true;
            }
        }
    });

    if (cancelBtn) {
        cancelBtn.addEventListener('click', async () => {
            cancelBtn.disabled = true;
            cancellationRequested = true;
            cancelBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Cancelling...';
            cancelBtn.classList.remove('btn-outline-danger');
            cancelBtn.classList.add('btn-secondary');

            const progressDetail = document.getElementById('enrollment-progress-detail');
            if (progressDetail) {
                progressDetail.textContent = 'Cancelling... letting in-flight requests finish.';
            }

            try {
                await window.axios.cancelBulkEnroll();
            } catch (error) {
                console.error('Error cancelling bulk enrollments:', error);
            }
        });
    }
}

function parseEnrollmentFile(content) {
    const lines = content.trim().split('\n');
    if (lines.length < 2) {
        return { error: 'File must contain at least a header row and one data row.', enrollments: [] };
    }

    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const enrollments = [];

    // Map non-identifier aliases to standard fields.
    // Keep identifier columns separate so we can prioritize canvas_* values later.
    const fieldMap = {
        'base_role_type': 'type',
        'limit_section_privileges': 'limit_privileges_to_course_section',
        'status': 'enrollment_state'
    };

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(',').map(v => v.trim());
        const enrollment = {};

        // Parse each column
        header.forEach((col, index) => {
            const value = values[index];
            if (!value) return;

            // Map column name to standard field
            const standardField = fieldMap[col] || col;
            enrollment[standardField] = value;
        });

        const parseBoolean = (value) => {
            if (typeof value === 'boolean') return value;
            if (typeof value !== 'string') return false;
            return value.trim().toLowerCase() === 'true';
        };

        // Extract required fields with priority.
        // Prefer Canvas numeric identifiers when both Canvas and SIS IDs are present.
        const parsed = {
            user_id: enrollment.canvas_user_id || enrollment.user_id || enrollment.sis_user_id,
            type: enrollment.type || enrollment.base_role_type,
            role_id: enrollment.role_id,
            role: enrollment.role,
            course_section_id: enrollment.canvas_section_id || enrollment.course_section_id || enrollment.section_id || enrollment.sis_section_id,
            course_id: enrollment.canvas_course_id || enrollment.course_id,
            enrollment_id: enrollment.canvas_enrollment_id || enrollment.enrollment_id,
            start_at: enrollment.start_at,
            end_at: enrollment.end_at,
            limit_privileges_to_course_section: parseBoolean(enrollment.limit_privileges_to_course_section) ||
                parseBoolean(enrollment.limit_section_privileges)
        };

        // Validate that we have required fields
        if (!parsed.user_id) continue;

        if (!parsed.course_section_id && !parsed.course_id) {
            return {
                error: 'File must contain either course_id or section_id for each enrollment. Missing in row ' + (i + 1),
                enrollments: []
            };
        }

        enrollments.push(parsed);
    }

    return { error: null, enrollments };
}

function generateEnrollmentSummary(enrollments) {
    // Count unique values
    const uniqueUsers = new Set();
    const uniqueCourses = new Set();
    const uniqueSections = new Set();
    const uniqueEnrollmentIds = new Set();
    const roleCounts = {};

    enrollments.forEach(enrollment => {
        // Count unique users
        if (enrollment.user_id) {
            uniqueUsers.add(enrollment.user_id);
        }

        // Count unique courses
        if (enrollment.course_id) {
            uniqueCourses.add(enrollment.course_id);
        }

        // Count unique sections
        if (enrollment.course_section_id) {
            uniqueSections.add(enrollment.course_section_id);
        }

        if (enrollment.enrollment_id) {
            uniqueEnrollmentIds.add(enrollment.enrollment_id);
        }

        // Count roles (use role if available, otherwise type)
        const roleType = enrollment.role || enrollment.type || 'Unknown';
        roleCounts[roleType] = (roleCounts[roleType] || 0) + 1;
    });

    // Build summary HTML
    let summary = `<strong>Found ${enrollments.length} enrollment${enrollments.length !== 1 ? 's' : ''}</strong><br><br>`;
    summary += `${uniqueUsers.size} unique user${uniqueUsers.size !== 1 ? 's' : ''}<br>`;
    summary += `${uniqueCourses.size} unique course${uniqueCourses.size !== 1 ? 's' : ''}<br>`;
    summary += `${uniqueSections.size} unique section${uniqueSections.size !== 1 ? 's' : ''}<br>`;
    summary += `${uniqueEnrollmentIds.size} enrollment ID${uniqueEnrollmentIds.size !== 1 ? 's' : ''}<br>`;

    // Add role breakdown
    const sortedRoles = Object.entries(roleCounts).sort((a, b) => b[1] - a[1]);
    sortedRoles.forEach(([role, count]) => {
        summary += `${count} <strong>${role}</strong> enrollment${count !== 1 ? 's' : ''}<br>`;
    });

    return summary;
}

function displayEnrollmentResults(result) {
    const responseDiv = document.getElementById('enrollment-response');
    const resultsCard = document.getElementById('enrollment-results-card');

    let html = `
    <h5 class="mb-3">
      <i class="bi bi-check-circle text-success me-2"></i>
      Enrollment Results
    </h5>
  `;

    if (result.successful > 0) {
        html += `
      <div class="alert alert-success">
        <strong>${result.successful}</strong> enrollment(s) processed successfully.
      </div>
    `;
    }

    if (result.failed > 0) {
        html += `
      <div class="alert alert-danger">
        <strong>${result.failed}</strong> enrollment(s) failed.
      </div>
    `;

        if (result.errors && result.errors.length > 0) {
            const maxDisplay = 10;
            const displayErrors = result.errors.slice(0, maxDisplay);

            html += `<div class="mt-3"><h6>Error Details:</h6><ul>`;
            displayErrors.forEach(error => {
                html += `<li><code>${error.user_id || 'Unknown'}</code>: ${error.reason}</li>`;
            });
            html += `</ul>`;

            if (result.errors.length > maxDisplay) {
                html += `<p class="text-muted">...and ${result.errors.length - maxDisplay} more error(s).</p>`;
            }

            // Add download button for full error log
            html += `<button id="enrollment-download-errors" type="button" class="btn btn-sm btn-outline-secondary mt-2"><i class="bi bi-download me-1"></i>Download Full Error Log (CSV)</button>`;
            html += `</div>`;
        }
    }

    responseDiv.innerHTML = html;
    resultsCard.hidden = false;

    // Attach event listener for download errors button
    if (result.errors && result.errors.length > 0) {
        const downloadErrorsBtn = document.getElementById('enrollment-download-errors');
        if (downloadErrorsBtn) {
            downloadErrorsBtn.addEventListener('click', async () => {
                try {
                    const errorData = result.errors.map(error => ({
                        user_id: error.user_id || 'Unknown',
                        course_id: error.course_id || '',
                        section_id: error.section_id || '',
                        role: error.role || '',
                        reason: error.reason || 'Unknown error'
                    }));

                    const defaultFileName = `enrollment_errors_${new Date().toISOString().split('T')[0]}.csv`;
                    const csvResult = await window.csv.sendToCSV({
                        fileName: defaultFileName,
                        data: errorData,
                        showSaveDialog: true
                    });

                    if (csvResult && csvResult.filePath) {
                        downloadErrorsBtn.innerHTML = '<i class="bi bi-check me-1"></i>Downloaded';
                        downloadErrorsBtn.classList.remove('btn-outline-secondary');
                        downloadErrorsBtn.classList.add('btn-success');
                        downloadErrorsBtn.disabled = true;
                    }
                } catch (error) {
                    console.error('Error downloading error log:', error);
                    downloadErrorsBtn.innerHTML = '<i class="bi bi-x me-1"></i>Download Failed';
                    downloadErrorsBtn.classList.remove('btn-outline-secondary');
                    downloadErrorsBtn.classList.add('btn-danger');
                }
            });
        }
    }
}

function displayEnrollmentError(error) {
    const responseDiv = document.getElementById('enrollment-response');
    const resultsCard = document.getElementById('enrollment-results-card');

    responseDiv.innerHTML = `
    <div class="alert alert-danger">
      <h6 class="mb-2"><i class="bi bi-exclamation-triangle me-1"></i>Error Processing Enrollments</h6>
      <p class="mb-0">${error.message || 'An unknown error occurred.'}</p>
    </div>
  `;
    resultsCard.hidden = false;
}

// ==================== Manual Enrollment Section ====================

function renderManualSection(container) {
    let form = container.querySelector('#manual-enrollment-form');
    if (form) {
        form.hidden = false;
        return;
    }

    form = document.createElement('form');
    form.id = 'manual-enrollment-form';
    form.innerHTML = `
        <style>
            #manual-enrollment-form .form-label { font-size: 0.8rem; margin-bottom: 0.25rem; }
            #manual-enrollment-form .form-control, #manual-enrollment-form .form-select { 
                font-size: 0.8rem; padding: 0.25rem 0.5rem; height: auto;
            }
            #manual-enrollment-form .btn { font-size: 0.8rem; padding: 0.35rem 0.75rem; }
            #manual-enrollment-form .form-text { font-size: 0.7rem; margin-top: 0.15rem; }
            #manual-enrollment-form .mt-2 { margin-top: 0.5rem !important; }
            #manual-enrollment-form .mb-2 { margin-bottom: 0.5rem !important; }
            #manual-enrollment-form .progress { height: 12px !important; }
            #manual-enrollment-form h5 { font-size: 1rem; }
            #manual-enrollment-form h6 { font-size: 0.9rem; }
            #manual-enrollment-form p { margin-bottom: 0.5rem; font-size: 0.85rem; }
            #manual-enrollment-form .alert { padding: 0.5rem 0.75rem; font-size: 0.8rem; }
            #manual-enrollment-form .row { margin-bottom: 0.75rem; }
            #manual-enrollment-form .g-3 { gap: 0.5rem !important; }
            #manual-enrollment-form .form-check-label { font-size: 0.8rem; }
            #manual-enrollment-form .form-check-input { font-size: 0.8rem; }
            #manual-enrollment-form .spinner-border-sm { width: 0.9rem; height: 0.9rem; border-width: 0.15em; }
        </style>

        <!-- Course ID + Fetch Button -->
        <div class="row g-3 mb-2">
            <div class="col-md-6">
                <label class="form-label fw-bold" for="manual-course-id">
                    <i class="bi bi-journal-code me-1"></i>Course ID
                </label>
                <div class="input-group input-group-sm">
                    <input type="text" class="form-control form-control-sm" id="manual-course-id" 
                           placeholder="e.g., 12345" />
                    <button type="button" class="btn btn-outline-primary btn-sm" id="manual-fetch-btn" disabled>
                        <i class="bi bi-arrow-clockwise me-1"></i>Load
                    </button>
                </div>
                <div class="form-text text-muted">
                    <i class="bi bi-info-circle me-1"></i>Enter a Course ID and click <strong>Load</strong> to fetch sections and roles.
                </div>
                <div id="manual-fetch-status" class="form-text" style="display: none;"></div>
            </div>
        </div>

        <!-- Section Dropdown -->
        <div class="row g-3 mb-2">
            <div class="col-md-6">
                <label class="form-label fw-bold" for="manual-section-select">
                    <i class="bi bi-collection me-1"></i>Section
                </label>
                <select class="form-select form-select-sm" id="manual-section-select" disabled>
                    <option value="">Default (no section override)</option>
                </select>
                <div class="form-text text-muted">
                    <i class="bi bi-info-circle me-1"></i>Optionally enroll users into a specific section.
                </div>
            </div>
        </div>

        <!-- Email -->
        <div class="row g-3 mb-2" id="manual-email-row">
            <div class="col-md-6">
                <label class="form-label fw-bold" for="manual-email">
                    <i class="bi bi-envelope me-1"></i>Email
                </label>
                <input type="text" class="form-control form-control-sm" id="manual-email" 
                       placeholder="e.g., yourname@instructure.com" />
                <div class="form-text text-muted">
                    <i class="bi bi-info-circle me-1"></i>Your Instructure email. Used to create emails for the new users.
                </div>
            </div>
        </div>

        <!-- New Users Toggle -->
        <div class="row g-3 mb-2">
            <div class="col-md-6">
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="manual-new-users" checked>
                    <label class="form-check-label fw-bold" for="manual-new-users">
                        <i class="bi bi-person-plus me-1"></i>Create New Users
                    </label>
                </div>
                <div class="form-text text-muted">
                    <i class="bi bi-info-circle me-1"></i>Uncheck to enroll existing Canvas users by their user IDs.
                </div>
            </div>
        </div>

        <!-- New Users Mode: Students + Teachers count OR custom role + count -->
        <div id="manual-new-users-section">
            <div class="row g-3 mb-2">
                <div class="col-md-6">
                    <label class="form-label fw-bold" for="manual-role-select">
                        <i class="bi bi-person-badge me-1"></i>Role
                    </label>
                    <select class="form-select form-select-sm" id="manual-role-select">
                        <option value="StudentEnrollment" data-base="StudentEnrollment" selected>Student</option>
                        <option value="TeacherEnrollment" data-base="TeacherEnrollment">Teacher</option>
                    </select>
                    <div class="form-text text-muted">
                        <i class="bi bi-info-circle me-1"></i>Select a role for the new users. Load course info to see all available roles.
                    </div>
                </div>
            </div>
            <div class="row g-3 mb-2">
                <div class="col-md-3">
                    <label class="form-label fw-bold" for="manual-user-count">
                        <i class="bi bi-people me-1"></i>Number of Users
                    </label>
                    <input type="text" class="form-control form-control-sm" id="manual-user-count" 
                           placeholder="1" value="1" />
                    <div id="manual-user-count-error" class="form-text" style="color: red;" hidden>Must be a positive number</div>
                </div>
            </div>
            <div class="row g-3 mb-2">
                <div class="col-md-6">
                    <div class="d-flex align-items-center gap-2">
                        <button type="button" class="btn btn-sm btn-outline-secondary" id="manual-quick-add-btn"
                                title="Quickly add 5 students + 1 teacher">
                            <i class="bi bi-lightning me-1"></i>Quick Add (5S + 1T)
                        </button>
                        <span class="form-text text-muted mb-0">Creates 5 students and 1 teacher</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Existing Users Mode: User IDs + Role -->
        <div id="manual-existing-users-section" hidden>
            <div class="row g-3 mb-2">
                <div class="col-md-6">
                    <label class="form-label fw-bold" for="manual-existing-role-select">
                        <i class="bi bi-person-badge me-1"></i>Role
                    </label>
                    <select class="form-select form-select-sm" id="manual-existing-role-select">
                        <option value="StudentEnrollment" data-base="StudentEnrollment" selected>Student</option>
                        <option value="TeacherEnrollment" data-base="TeacherEnrollment">Teacher</option>
                    </select>
                    <div class="form-text text-muted">
                        <i class="bi bi-info-circle me-1"></i>Select a role for the enrolled users.
                    </div>
                </div>
            </div>
            <div class="row g-3 mb-2">
                <div class="col-md-6">
                    <label class="form-label fw-bold" for="manual-user-ids">
                        <i class="bi bi-person-lines-fill me-1"></i>User IDs
                    </label>
                    <input type="text" class="form-control form-control-sm" id="manual-user-ids" 
                           placeholder="e.g., 12345 or 12345, 67890" />
                    <div id="manual-user-ids-error" class="form-text" style="color: red;" hidden>Must be a number or comma-separated numbers</div>
                    <div class="form-text text-muted">
                        <i class="bi bi-info-circle me-1"></i>Enter a single Canvas user ID or comma-separated IDs.
                    </div>
                </div>
            </div>
        </div>

        <!-- Submit -->
        <div class="row mb-2">
            <div class="col-md-6">
                <div class="d-grid">
                    <button type="button" class="btn btn-sm btn-success" id="manual-enroll-btn" disabled>
                        <i class="bi bi-person-plus-fill me-2"></i>Create &amp; Enroll Users
                    </button>
                </div>
            </div>
        </div>
        <div id="manual-enroll-error" class="alert alert-danger mt-1" hidden>
            <i class="bi bi-exclamation-triangle me-2"></i><span id="manual-enroll-error-text"></span>
        </div>

        <!-- Progress Card -->
        <div class="card mt-2" id="manual-enrollment-progress-card" hidden>
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-gear me-2"></i>Processing Manual Enrollment
                </h5>
            </div>
            <div class="card-body">
                <p id="manual-enrollment-progress-info" class="mb-2"></p>
                <div class="progress mb-2" style="height: 12px;">
                    <div class="progress-bar progress-bar-striped progress-bar-animated" 
                         id="manual-enrollment-progress-bar" style="width:0%" role="progressbar" 
                         aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                    </div>
                </div>
                <small class="text-muted" id="manual-enrollment-progress-detail"></small>
            </div>
        </div>

        <!-- Results Card -->
        <div class="card mt-2" id="manual-enrollment-results-card" hidden>
            <div class="card-body" id="manual-enrollment-response"></div>
        </div>
    `;
    container.appendChild(form);
    setupManualEnrollmentListeners();
}

function setupManualEnrollmentListeners() {
    const courseIdInput = document.getElementById('manual-course-id');
    const fetchBtn = document.getElementById('manual-fetch-btn');
    const fetchStatus = document.getElementById('manual-fetch-status');
    const sectionSelect = document.getElementById('manual-section-select');
    const emailInput = document.getElementById('manual-email');
    const emailRow = document.getElementById('manual-email-row');
    const newUsersCheckbox = document.getElementById('manual-new-users');
    const newUsersSection = document.getElementById('manual-new-users-section');
    const existingUsersSection = document.getElementById('manual-existing-users-section');
    const roleSelect = document.getElementById('manual-role-select');
    const existingRoleSelect = document.getElementById('manual-existing-role-select');
    const userCountInput = document.getElementById('manual-user-count');
    const userCountError = document.getElementById('manual-user-count-error');
    const userIdsInput = document.getElementById('manual-user-ids');
    const userIdsError = document.getElementById('manual-user-ids-error');
    const enrollBtn = document.getElementById('manual-enroll-btn');
    const quickAddBtn = document.getElementById('manual-quick-add-btn');

    let loadedCourseId = null;
    let loadedRoles = []; // { id, name, base_role_type }

    // ---- Helpers ----
    const isPositiveInt = (val) => {
        const v = String(val).trim();
        if (v.length === 0) return false;
        const n = Number(v);
        return Number.isInteger(n) && n > 0;
    };

    const isValidUserIds = (val) => {
        return /^[0-9]+(\s*,\s*[0-9]+)*$/.test(val.trim());
    };

    // ---- Validate form ----
    const validate = () => {
        const courseId = courseIdInput.value.trim();
        const isNew = newUsersCheckbox.checked;
        let valid = true;

        if (!courseId || isNaN(Number(courseId))) valid = false;

        if (isNew) {
            const email = emailInput.value.trim();
            if (!email) valid = false;

            const count = userCountInput.value.trim();
            if (!isPositiveInt(count)) {
                userCountError.hidden = false;
                valid = false;
            } else {
                userCountError.hidden = true;
            }
        } else {
            const ids = userIdsInput.value.trim();
            if (!ids || !isValidUserIds(ids)) {
                if (ids) userIdsError.hidden = false;
                valid = false;
            } else {
                userIdsError.hidden = true;
            }
        }

        enrollBtn.disabled = !valid;
    };

    // ---- Enable Fetch button when course ID is entered ----
    courseIdInput.addEventListener('input', () => {
        const v = courseIdInput.value.trim();
        fetchBtn.disabled = !v || isNaN(Number(v));
        validate();
    });

    // ---- Fetch sections & roles ----
    fetchBtn.addEventListener('click', async () => {
        const domain = document.getElementById('domain').value.trim();
        const token = document.getElementById('token').value.trim();
        const courseId = courseIdInput.value.trim();

        if (!domain || !token) {
            fetchStatus.style.display = 'block';
            fetchStatus.className = 'form-text text-danger';
            fetchStatus.innerHTML = '<i class="bi bi-exclamation-triangle me-1"></i>Please enter Canvas domain and API token in Settings.';
            return;
        }

        fetchBtn.disabled = true;
        fetchStatus.style.display = 'block';
        fetchStatus.className = 'form-text text-info';
        fetchStatus.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status"></span>Loading sections & roles...';

        try {
            const [sections, roles] = await Promise.all([
                window.axios.getCourseSections({ domain, token, courseId }),
                window.axios.getCourseRoles({ domain, token, courseId })
            ]);

            // Populate sections dropdown
            sectionSelect.innerHTML = '<option value="">Default (no section override)</option>';
            if (sections && sections.length > 0) {
                sections.forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s.id;
                    opt.textContent = s.name;
                    sectionSelect.appendChild(opt);
                });
                sectionSelect.disabled = false;
            }

            // Populate both role dropdowns
            loadedRoles = roles || [];
            const populateRoleDropdown = (selectEl) => {
                selectEl.innerHTML = '';
                if (loadedRoles.length > 0) {
                    loadedRoles.forEach(role => {
                        const opt = document.createElement('option');
                        opt.value = role.base_role_type;
                        opt.dataset.roleId = role.id;
                        opt.dataset.base = role.base_role_type;
                        opt.textContent = role.name;
                        selectEl.appendChild(opt);
                    });
                } else {
                    // Fallback defaults
                    selectEl.innerHTML = `
                        <option value="StudentEnrollment" data-base="StudentEnrollment">Student</option>
                        <option value="TeacherEnrollment" data-base="TeacherEnrollment">Teacher</option>
                    `;
                }
            };

            populateRoleDropdown(roleSelect);
            populateRoleDropdown(existingRoleSelect);

            loadedCourseId = courseId;
            fetchStatus.className = 'form-text text-success';
            fetchStatus.innerHTML = `<i class="bi bi-check-circle me-1"></i>Loaded ${sections.length} section(s) and ${loadedRoles.length} role(s).`;
        } catch (error) {
            fetchStatus.className = 'form-text text-danger';
            fetchStatus.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i>${error.message || error || 'Failed to load course info.'}`;
        } finally {
            fetchBtn.disabled = false;
        }
    });

    // ---- New Users toggle ----
    newUsersCheckbox.addEventListener('change', () => {
        const isNew = newUsersCheckbox.checked;
        newUsersSection.hidden = !isNew;
        existingUsersSection.hidden = isNew;
        emailRow.hidden = !isNew;
        enrollBtn.innerHTML = isNew
            ? '<i class="bi bi-person-plus-fill me-2"></i>Create &amp; Enroll Users'
            : '<i class="bi bi-person-plus-fill me-2"></i>Enroll Users';
        validate();
    });

    // ---- Input listeners for validation ----
    [emailInput, userCountInput, userIdsInput].forEach(el => {
        el.addEventListener('input', validate);
    });

    // ---- Quick Add button (5 students + 1 teacher) ----
    quickAddBtn.addEventListener('click', async () => {
        const domain = document.getElementById('domain').value.trim();
        const token = document.getElementById('token').value.trim();
        const courseId = courseIdInput.value.trim();
        const email = emailInput.value.trim();

        if (!domain || !token) {
            showManualError('Please enter Canvas domain and API token in Settings.');
            return;
        }
        if (!courseId) {
            showManualError('Please enter a Course ID.');
            return;
        }
        if (!email) {
            showManualError('Please enter your email.');
            return;
        }

        const emailMatch = email.match(/^[^@]+/);
        const emailPrefix = emailMatch ? emailMatch[0] : email;
        const sectionId = sectionSelect.value || null;

        // Get role_id for Student and Teacher if roles are loaded
        let studentRoleId = null;
        let teacherRoleId = null;
        if (loadedRoles.length > 0) {
            const studentRole = loadedRoles.find(r => r.base_role_type === 'StudentEnrollment');
            const teacherRole = loadedRoles.find(r => r.base_role_type === 'TeacherEnrollment');
            if (studentRole) studentRoleId = studentRole.id;
            if (teacherRole) teacherRoleId = teacherRole.id;
        }

        await executeManualEnroll({
            domain, token, courseId, emailPrefix,
            numStudents: 5,
            numTeachers: 1,
            sectionId,
            roleId: null,          // use default Student/Teacher flow
            roleType: null,
            isNewUsers: true,
            existingUserIds: null,
            userCount: null
        });
    });

    // ---- Main Enroll button ----
    enrollBtn.addEventListener('click', async () => {
        const domain = document.getElementById('domain').value.trim();
        const token = document.getElementById('token').value.trim();
        const courseId = courseIdInput.value.trim();
        const sectionId = sectionSelect.value || null;
        const isNew = newUsersCheckbox.checked;

        if (!domain || !token) {
            showManualError('Please enter Canvas domain and API token in Settings.');
            return;
        }

        if (isNew) {
            const email = emailInput.value.trim();
            const emailMatch = email.match(/^[^@]+/);
            const emailPrefix = emailMatch ? emailMatch[0] : email;
            const count = parseInt(userCountInput.value.trim(), 10) || 0;
            const selectedOption = roleSelect.options[roleSelect.selectedIndex];
            const roleType = selectedOption.value;
            const roleId = selectedOption.dataset.roleId || null;

            await executeManualEnroll({
                domain, token, courseId, emailPrefix,
                numStudents: 0,
                numTeachers: 0,
                sectionId,
                roleId,
                roleType,
                isNewUsers: true,
                existingUserIds: null,
                userCount: count
            });
        } else {
            const idsText = userIdsInput.value.trim();
            const userIds = idsText.split(',').map(id => parseInt(id.trim(), 10)).filter(n => !isNaN(n));
            const selectedOption = existingRoleSelect.options[existingRoleSelect.selectedIndex];
            const roleType = selectedOption.value;
            const roleId = selectedOption.dataset.roleId || null;

            await executeManualEnroll({
                domain, token, courseId,
                emailPrefix: null,
                numStudents: 0, numTeachers: 0,
                sectionId,
                roleId,
                roleType,
                isNewUsers: false,
                existingUserIds: userIds,
                userCount: 0
            });
        }
    });

    // ---- Execute the manual enrollment ----
    async function executeManualEnroll(params) {
        document.getElementById('manual-enroll-error').hidden = true;

        const progressCard = document.getElementById('manual-enrollment-progress-card');
        const resultsCard = document.getElementById('manual-enrollment-results-card');
        const progressBar = document.getElementById('manual-enrollment-progress-bar');
        const progressInfo = document.getElementById('manual-enrollment-progress-info');
        const progressDetail = document.getElementById('manual-enrollment-progress-detail');

        progressCard.hidden = false;
        resultsCard.hidden = true;
        enrollBtn.disabled = true;
        quickAddBtn.disabled = true;
        progressBar.style.width = '0%';
        progressInfo.textContent = 'Processing...';
        progressDetail.textContent = 'Preparing...';

        try {
            const result = await window.axios.manualEnroll(params);

            const responseDiv = document.getElementById('manual-enrollment-response');
            let html = `
                <h5 class="mb-3">
                    <i class="bi bi-check-circle text-success me-2"></i>
                    Manual Enrollment Results
                </h5>
            `;

            if (result.usersCreated > 0) {
                html += `
                    <div class="alert alert-success">
                        <strong>${result.usersCreated}</strong> user(s) created successfully.
                    </div>
                `;
            }
            if (result.usersEnrolled > 0) {
                html += `
                    <div class="alert alert-success">
                        <strong>${result.usersEnrolled}</strong> user(s) enrolled successfully.
                    </div>
                `;
            }
            if (result.usersFailed > 0) {
                html += `
                    <div class="alert alert-danger">
                        <strong>${result.usersFailed}</strong> user creation(s) failed.
                    </div>
                `;
            }
            if (result.enrollFailed > 0) {
                html += `
                    <div class="alert alert-danger">
                        <strong>${result.enrollFailed}</strong> enrollment(s) failed.
                    </div>
                `;
            }
            if (result.errors && result.errors.length > 0) {
                html += `<div class="mt-2"><h6>Error Details:</h6><ul>`;
                result.errors.slice(0, 10).forEach(err => {
                    html += `<li>${err}</li>`;
                });
                html += `</ul></div>`;
                if (result.errors.length > 10) {
                    html += `<p class="text-muted">...and ${result.errors.length - 10} more error(s).</p>`;
                }
            }

            responseDiv.innerHTML = html;
            resultsCard.hidden = false;

        } catch (error) {
            const responseDiv = document.getElementById('manual-enrollment-response');
            responseDiv.innerHTML = `
                <div class="alert alert-danger">
                    <h6 class="mb-2"><i class="bi bi-exclamation-triangle me-1"></i>Error</h6>
                    <p class="mb-0">${error.message || error || 'An unknown error occurred.'}</p>
                </div>
            `;
            resultsCard.hidden = false;
        } finally {
            progressCard.hidden = true;
            enrollBtn.disabled = false;
            quickAddBtn.disabled = false;
            validate();
        }
    }

    function showManualError(msg) {
        const errDiv = document.getElementById('manual-enroll-error');
        document.getElementById('manual-enroll-error-text').textContent = msg;
        errDiv.hidden = false;
    }

    // Initial validation
    validate();
}

// Setup progress listener for manual enrollment
if (window.axios && window.axios.onManualEnrollProgress) {
    window.axios.onManualEnrollProgress((data) => {
        const progressBar = document.getElementById('manual-enrollment-progress-bar');
        const progressInfo = document.getElementById('manual-enrollment-progress-info');
        const progressDetail = document.getElementById('manual-enrollment-progress-detail');

        if (progressBar && progressInfo && progressDetail) {
            const percentage = data?.percent || 0;
            progressBar.style.width = `${percentage}%`;
            progressBar.setAttribute('aria-valuenow', String(percentage));
            progressInfo.textContent = data?.label || 'Processing...';
            progressDetail.textContent = data?.detail || '';
        }
    });
}

// Setup progress listener for bulk enrollment
if (window.axios && window.axios.onBulkEnrollProgress) {
    window.axios.onBulkEnrollProgress((data) => {
        const progressBar = document.getElementById('enrollment-progress-bar');
        const progressInfo = document.getElementById('enrollment-progress-info');
        const progressDetail = document.getElementById('enrollment-progress-detail');

        if (progressBar && progressInfo && progressDetail) {
            const current = Number(data?.current || 0);
            const total = Number(data?.total || 0);
            const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

            progressBar.style.width = `${percentage}%`;
            progressBar.setAttribute('aria-valuenow', String(percentage));
            progressInfo.textContent = `Processing enrollments ... ${current}/${total}`;
            progressDetail.textContent = data?.detail || '';
        }
    });
}
