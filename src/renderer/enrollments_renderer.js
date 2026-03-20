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
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            .spin-icon { display: inline-block; animation: spin 1s linear infinite; }
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
                               id="state-from-file" value="from_file">
                        <label class="form-check-label" for="state-from-file">From File</label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="enrollment-state" 
                               id="state-active" value="active" checked>
                        <label class="form-check-label" for="state-active">Active</label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="enrollment-state" 
                               id="state-invited" value="invited">
                        <label class="form-check-label" for="state-invited">Invited</label>
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
                    <i class="bi bi-info-circle me-1"></i><strong>From File</strong> uses the status/state column from each row. Delete, Conclude, and Deactivate require <strong>course_id</strong> and <strong>enrollment_id</strong>.
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
            from_file: '<i class="bi bi-file-earmark-play me-2"></i>Process From File',
            active: '<i class="bi bi-person-plus-fill me-2"></i>Process Enrollments',
            invited: '<i class="bi bi-envelope me-2"></i>Invite Enrollments',
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

        if (action === 'from_file') {
            // Validate per-row: rows with destructive states need enrollment_id + course_id
            const destructiveStates = ['delete', 'deleted', 'conclude', 'concluded', 'deactivate'];
            const destructiveRows = enrollments.filter(e =>
                e.enrollment_state && destructiveStates.includes(e.enrollment_state.toLowerCase())
            );

            if (destructiveRows.length > 0) {
                const missingEnrollmentId = destructiveRows.some(e => !e.enrollment_id);
                if (missingEnrollmentId) {
                    return {
                        valid: false,
                        message: 'Some rows have delete/conclude/deactivate states but are missing enrollment_id.'
                    };
                }
                const missingCourseId = destructiveRows.some(e => !e.course_id);
                if (missingCourseId) {
                    return {
                        valid: false,
                        message: 'Some rows have delete/conclude/deactivate states but are missing course_id. These tasks cannot use section_id.'
                    };
                }
            }

            // Warn but don't block: rows with empty or unrecognized states will be skipped during processing
            return { valid: true, message: '' };
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

        // When in from_file mode, validate against the overridden data
        let dataToValidate = parsedData;
        if (selectedAction === 'from_file' && typeof getStatusOverrides === 'function') {
            const overrides = getStatusOverrides();
            if (Object.keys(overrides).length > 0) {
                dataToValidate = applyStatusOverrides(parsedData, overrides);
            }
        }

        const validation = validateEnrollmentsForTask(dataToValidate, selectedAction);

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
            // Show/hide status overrides based on selected mode
            const overrideContainer = document.getElementById('status-override-container');
            if (overrideContainer) {
                overrideContainer.style.display = getSelectedAction() === 'from_file' ? '' : 'none';
            }
        });
    });

    /**
     * Render status override dropdowns for each unique status found in the file.
     * Only visible when "From File" mode is selected.
     */
    const renderStatusOverrides = (stateCounts) => {
        // Remove existing override container if present
        let container = document.getElementById('status-override-container');
        if (container) container.remove();

        const stateEntries = Object.entries(stateCounts).sort((a, b) => b[1] - a[1]);
        if (stateEntries.length === 0) return;

        container = document.createElement('div');
        container.id = 'status-override-container';
        container.style.display = getSelectedAction() === 'from_file' ? '' : 'none';
        container.innerHTML = `
            <hr class="my-2">
            <h6 class="mb-2" style="font-size: 0.9rem;">
                <i class="bi bi-arrow-left-right me-1"></i>Status Overrides
                <small class="text-muted fw-normal">(optional)</small>
            </h6>
            <p class="text-muted mb-2" style="font-size: 0.75rem;">
                Change how specific statuses are processed. Leave as "Use file value" to keep the original status.
            </p>
            <div id="status-override-rows"></div>
        `;

        const overrideOptions = [
            { value: '', label: 'Use file value' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
            { value: 'invited', label: 'Invited' },
            { value: 'concluded', label: 'Concluded' },
            { value: 'deleted', label: 'Deleted' },
            { value: 'deactivate', label: 'Deactivate' }
        ];

        const rowsDiv = container.querySelector('#status-override-rows');
        stateEntries.forEach(([state, count]) => {
            const row = document.createElement('div');
            row.className = 'd-flex align-items-center gap-2 mb-1';
            row.innerHTML = `
                <span class="badge bg-secondary" style="min-width: 90px; font-size: 0.75rem;">${state} (${count})</span>
                <i class="bi bi-arrow-right" style="font-size: 0.7rem;"></i>
                <select class="form-select form-select-sm status-override-select" 
                        data-original-status="${state}" 
                        style="font-size: 0.75rem; padding: 0.15rem 1.75rem 0.15rem 0.4rem; height: auto; max-width: 160px;">
                    ${overrideOptions.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('')}
                </select>
            `;
            rowsDiv.appendChild(row);
        });

        // Insert after the file preview
        filePreview.appendChild(container);

        // Re-validate when an override changes
        container.addEventListener('change', () => refreshValidationState());
    };

    /**
     * Read the status override selections and return a mapping from original -> new status.
     * Only includes entries where the user selected a different status.
     */
    const getStatusOverrides = () => {
        const overrides = {};
        const selects = document.querySelectorAll('.status-override-select');
        selects.forEach(select => {
            const original = select.getAttribute('data-original-status');
            const newValue = select.value;
            if (newValue && newValue !== original) {
                overrides[original] = newValue;
            }
        });
        return overrides;
    };

    /**
     * Apply status overrides to a copy of the parsed enrollment data.
     */
    const applyStatusOverrides = (enrollments, overrides) => {
        if (Object.keys(overrides).length === 0) return enrollments;

        return enrollments.map(enrollment => {
            const currentState = (enrollment.enrollment_state || '').toLowerCase();
            if (overrides[currentState]) {
                return { ...enrollment, enrollment_state: overrides[currentState] };
            }
            return enrollment;
        });
    };

    updateActionButtonLabel(getSelectedAction());

    // File input change handler
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];

        if (!file) {
            enrollBtn.disabled = true;
            fileHelp.style.visibility = 'hidden';
            filePreview.style.display = 'none';
            parsedData = null;
            const overrideEl = document.getElementById('status-override-container');
            if (overrideEl) overrideEl.remove();
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
            const overrideEl = document.getElementById('status-override-container');
            if (overrideEl) overrideEl.remove();
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
            const { html: summaryHtml, stateCounts } = generateEnrollmentSummary(parsedData);
            filePreview.style.display = 'block';
            previewText.innerHTML = summaryHtml;

            // Build status override UI for "From File" mode
            renderStatusOverrides(stateCounts);

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
        const enrollmentTask = enrollmentState === 'from_file'
            ? 'from_file'
            : (enrollmentState === 'delete' || enrollmentState === 'conclude' || enrollmentState === 'deactivate')
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
            // Apply status overrides when in "from_file" mode
            let enrollmentsToSend = parsedData;
            if (enrollmentState === 'from_file') {
                const overrides = getStatusOverrides();
                enrollmentsToSend = applyStatusOverrides(parsedData, overrides);
            }

            const result = await window.axios.bulkEnroll({
                domain,
                token,
                enrollments: enrollmentsToSend,
                enrollmentState,
                enrollmentTask
            });

            // Show results – use enrollmentsToSend so status overrides are preserved
            displayEnrollmentResults(result, {
                parsedData: enrollmentsToSend,
                enrollmentState,
                domain,
                token
            });

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

function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"') {
                if (i + 1 < line.length && line[i + 1] === '"') {
                    current += '"';
                    i++; // skip escaped quote
                } else {
                    inQuotes = false;
                }
            } else {
                current += ch;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
            } else if (ch === ',') {
                values.push(current.trim());
                current = '';
            } else {
                current += ch;
            }
        }
    }
    values.push(current.trim());
    return values;
}

function parseEnrollmentFile(content) {
    const lines = content.trim().split('\n');
    if (lines.length < 2) {
        return { error: 'File must contain at least a header row and one data row.', enrollments: [] };
    }

    const header = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
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

        const values = parseCSVLine(line);
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
            enrollment_state: enrollment.enrollment_state,
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
    const stateCounts = {};

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

        // Count states
        if (enrollment.enrollment_state) {
            const state = enrollment.enrollment_state.toLowerCase();
            stateCounts[state] = (stateCounts[state] || 0) + 1;
        }
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

    // Add state breakdown if states exist in file
    const stateEntries = Object.entries(stateCounts);
    if (stateEntries.length > 0) {
        summary += `<br><strong>States in file:</strong><br>`;
        stateEntries.sort((a, b) => b[1] - a[1]).forEach(([state, count]) => {
            summary += `${count} <strong>${state}</strong><br>`;
        });
    }

    return { html: summary, stateCounts };
}

function displayEnrollmentResults(result, context = {}) {
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

    if (result.skipped > 0) {
        html += `
      <div class="alert alert-warning">
        <strong>${result.skipped}</strong> enrollment(s) skipped (unrecognized status in file).
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
                const errContext = [error.course_id && `course: ${error.course_id}`, error.section_id && `section: ${error.section_id}`, error.role_id && `role_id: ${error.role_id}`].filter(Boolean).join(', ');
                const contextStr = errContext ? ` (${errContext})` : '';
                html += `<li><code>${error.user_id || 'Unknown'}</code>${contextStr}: ${error.reason}</li>`;
            });
            html += `</ul>`;

            if (result.errors.length > maxDisplay) {
                html += `<p class="text-muted">...and ${result.errors.length - maxDisplay} more error(s).</p>`;
            }

            // Add download button for full error log
            html += `<button id="enrollment-download-errors" type="button" class="btn btn-sm btn-outline-secondary mt-2"><i class="bi bi-download me-1"></i>Download Full Error Log (CSV)</button>`;
            html += `</div>`;

            // Detect concluded course errors and build retry UI
            const concludedErrors = result.errors.filter(e =>
                e.reason && e.reason.toLowerCase().includes('concluded') && e.course_id
            );

            if (concludedErrors.length > 0 && context.parsedData) {
                // Group by course_id
                const courseMap = {};
                concludedErrors.forEach(err => {
                    if (!courseMap[err.course_id]) {
                        courseMap[err.course_id] = [];
                    }
                    courseMap[err.course_id].push(err);
                });

                // Find original enrollment objects from parsedData for each failed enrollment
                const courseEnrollmentData = {};
                for (const [courseId, errors] of Object.entries(courseMap)) {
                    const failedUserIds = new Set(errors.map(e => String(e.user_id)));
                    courseEnrollmentData[courseId] = context.parsedData.filter(e =>
                        String(e.course_id) === String(courseId) && failedUserIds.has(String(e.user_id))
                    );
                }

                const courseIds = Object.keys(courseMap);
                html += `
                <div class="mt-3 p-3 border rounded" id="concluded-override-section">
                    <h6><i class="bi bi-unlock me-1"></i>Concluded Course Override</h6>
                    <p class="text-muted" style="font-size: 0.85rem;">
                        ${concludedErrors.length} enrollment(s) failed because the course is concluded.
                        Select courses below to temporarily open them, retry the enrollments, then restore the original settings.
                    </p>
                    <div class="mb-2">
                        <div class="form-check mb-1">
                            <input class="form-check-input" type="checkbox" id="concluded-select-all" checked>
                            <label class="form-check-label fw-bold" for="concluded-select-all">Select All (${courseIds.length} course${courseIds.length !== 1 ? 's' : ''})</label>
                        </div>
                        <hr class="my-1">
                        <div style="max-height: 200px; overflow-y: auto; border: 1px solid #dee2e6; border-radius: 0.25rem; padding: 0.5rem;">
                        ${courseIds.map(cid => {
                            const count = courseMap[cid].length;
                            const userList = courseMap[cid].slice(0, 3).map(e => e.user_id).join(', ');
                            const moreText = count > 3 ? ` +${count - 3} more` : '';
                            return `
                            <div class="form-check ms-1 mb-1">
                                <input class="form-check-input concluded-course-check" type="checkbox" value="${cid}" id="concluded-course-${cid}" checked>
                                <label class="form-check-label" for="concluded-course-${cid}">
                                    Course <strong>${cid}</strong> &mdash; ${count} enrollment(s) <span class="text-muted">(${userList}${moreText})</span>
                                </label>
                            </div>`;
                        }).join('')}
                        </div>
                    </div>
                    <button id="concluded-override-btn" type="button" class="btn btn-sm btn-warning">
                        <i class="bi bi-arrow-repeat me-1"></i>Override &amp; Retry Selected
                    </button>
                    <div id="concluded-override-status" class="mt-2" style="display: none;"></div>
                </div>`;
            }
        }
    }

    // Add download for skipped rows
    if (result.skippedRows && result.skippedRows.length > 0) {
        html += `
        <div class="mt-3">
            <h6><i class="bi bi-skip-forward me-1"></i>Skipped Rows</h6>
            <ul>`;
        const maxSkipDisplay = 10;
        result.skippedRows.slice(0, maxSkipDisplay).forEach(row => {
            html += `<li><code>${row.user_id}</code>: ${row.reason}</li>`;
        });
        html += `</ul>`;
        if (result.skippedRows.length > maxSkipDisplay) {
            html += `<p class="text-muted">...and ${result.skippedRows.length - maxSkipDisplay} more.</p>`;
        }
        html += `<button id="enrollment-download-skipped" type="button" class="btn btn-sm btn-outline-warning mt-1"><i class="bi bi-download me-1"></i>Download Skipped Rows (CSV)</button>`;
        html += `</div>`;
    }

    responseDiv.innerHTML = html;
    resultsCard.hidden = false;

    // Attach event listener for download skipped button
    if (result.skippedRows && result.skippedRows.length > 0) {
        const downloadSkippedBtn = document.getElementById('enrollment-download-skipped');
        if (downloadSkippedBtn) {
            downloadSkippedBtn.addEventListener('click', async () => {
                try {
                    const skippedData = result.skippedRows.map(row => ({
                        user_id: row.user_id || 'Unknown',
                        course_id: row.course_id || '',
                        section_id: row.section_id || '',
                        enrollment_id: row.enrollment_id || '',
                        enrollment_state: row.enrollment_state || '',
                        reason: row.reason || ''
                    }));

                    const defaultFileName = `enrollment_skipped_${new Date().toISOString().split('T')[0]}.csv`;
                    const csvResult = await window.csv.sendToCSV({
                        fileName: defaultFileName,
                        data: skippedData,
                        showSaveDialog: true
                    });

                    if (csvResult && csvResult.filePath) {
                        downloadSkippedBtn.innerHTML = '<i class="bi bi-check me-1"></i>Downloaded';
                        downloadSkippedBtn.classList.remove('btn-outline-warning');
                        downloadSkippedBtn.classList.add('btn-success');
                        downloadSkippedBtn.disabled = true;
                    }
                } catch (error) {
                    console.error('Error downloading skipped log:', error);
                    downloadSkippedBtn.innerHTML = '<i class="bi bi-x me-1"></i>Download Failed';
                    downloadSkippedBtn.classList.remove('btn-outline-warning');
                    downloadSkippedBtn.classList.add('btn-danger');
                }
            });
        }
    }

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
                        role_id: error.role_id || '',
                        role: error.role || '',
                        status: error.status || '',
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

    // Wire up concluded course override UI
    setupConcludedOverrideUI(result, context);
}

function setupConcludedOverrideUI(result, context) {
    const selectAllCheckbox = document.getElementById('concluded-select-all');
    const overrideBtn = document.getElementById('concluded-override-btn');

    if (!selectAllCheckbox || !overrideBtn || !context.parsedData) return;

    const courseCheckboxes = document.querySelectorAll('.concluded-course-check');

    // Select All toggle
    selectAllCheckbox.addEventListener('change', () => {
        courseCheckboxes.forEach(cb => { cb.checked = selectAllCheckbox.checked; });
    });

    // Keep Select All in sync with individual checkboxes
    courseCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            selectAllCheckbox.checked = [...courseCheckboxes].every(c => c.checked);
        });
    });

    // Build enrollment lookup from concluded errors
    const concludedErrors = result.errors.filter(e =>
        e.reason && e.reason.toLowerCase().includes('concluded') && e.course_id
    );
    const courseEnrollmentMap = {};
    for (const err of concludedErrors) {
        if (!courseEnrollmentMap[err.course_id]) {
            courseEnrollmentMap[err.course_id] = new Set();
        }
        courseEnrollmentMap[err.course_id].add(String(err.user_id));
    }

    // Override button click handler
    overrideBtn.addEventListener('click', async () => {
        const selectedCourses = [...courseCheckboxes].filter(cb => cb.checked).map(cb => cb.value);

        if (selectedCourses.length === 0) {
            const statusDiv = document.getElementById('concluded-override-status');
            statusDiv.style.display = 'block';
            statusDiv.innerHTML = '<div class="alert alert-warning py-1 px-2" style="font-size:0.85rem;">Please select at least one course.</div>';
            return;
        }

        // Build courseEnrollments payload: { courseId: [enrollment objects] }
        const courseEnrollments = {};
        for (const courseId of selectedCourses) {
            const failedUserIds = courseEnrollmentMap[courseId];
            if (!failedUserIds) continue;
            courseEnrollments[courseId] = context.parsedData.filter(e =>
                String(e.course_id) === String(courseId) && failedUserIds.has(String(e.user_id))
            );
        }

        overrideBtn.disabled = true;
        overrideBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Processing...';
        const statusDiv = document.getElementById('concluded-override-status');
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = '<div class="text-muted" style="font-size:0.85rem;"><i class="bi bi-arrow-repeat me-1 spin-icon"></i>Working...</div>';

        // Show cancel button
        let overrideCancelBtn = document.getElementById('concluded-override-cancel-btn');
        if (!overrideCancelBtn) {
            overrideCancelBtn = document.createElement('button');
            overrideCancelBtn.id = 'concluded-override-cancel-btn';
            overrideCancelBtn.type = 'button';
            overrideCancelBtn.className = 'btn btn-sm btn-outline-danger ms-2';
            overrideCancelBtn.innerHTML = '<i class="bi bi-x-circle me-1"></i>Cancel';
            overrideBtn.parentNode.insertBefore(overrideCancelBtn, overrideBtn.nextSibling);
        }
        overrideCancelBtn.hidden = false;
        overrideCancelBtn.disabled = false;

        let cancelRequested = false;
        const onCancelClick = async () => {
            cancelRequested = true;
            overrideCancelBtn.disabled = true;
            overrideCancelBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Cancelling...';
            await window.axios.cancelOverrideConcluded();
        };
        overrideCancelBtn.addEventListener('click', onCancelClick);

        // Listen for progress updates
        const removeProgressListener = window.axios.onConcludedOverrideProgress?.((payload) => {
            if (payload.detail) {
                statusDiv.innerHTML = `<div class="text-muted" style="font-size:0.85rem;"><i class="bi bi-arrow-repeat me-1 spin-icon"></i>${payload.detail}</div>`;
            }
        });

        try {
            const overrideResult = await window.axios.overrideConcludedAndEnroll({
                domain: context.domain,
                token: context.token,
                courseEnrollments,
                enrollmentState: context.enrollmentState
            });

            // Build results summary
            let resultHtml = '';

            if (overrideResult.cancelled) {
                resultHtml += `<div class="alert alert-warning py-1 px-2" style="font-size:0.85rem;"><i class="bi bi-x-circle me-1"></i>Override was cancelled. Courses processed so far have been restored.</div>`;
            }

            if (overrideResult.successful > 0) {
                resultHtml += `<div class="alert alert-success py-1 px-2" style="font-size:0.85rem;"><strong>${overrideResult.successful}</strong> enrollment(s) succeeded after override.</div>`;
            }

            if (overrideResult.failed > 0) {
                resultHtml += `<div class="alert alert-danger py-1 px-2" style="font-size:0.85rem;"><strong>${overrideResult.failed}</strong> enrollment(s) still failed.</div>`;
                if (overrideResult.errors && overrideResult.errors.length > 0) {
                    resultHtml += '<ul style="font-size:0.85rem;">';
                    overrideResult.errors.slice(0, 5).forEach(err => {
                        resultHtml += `<li><code>${err.user_id}</code> (course: ${err.course_id}): ${err.reason}</li>`;
                    });
                    if (overrideResult.errors.length > 5) {
                        resultHtml += `<li class="text-muted">...and ${overrideResult.errors.length - 5} more</li>`;
                    }
                    resultHtml += '</ul>';
                    resultHtml += `<button id="override-download-errors" type="button" class="btn btn-sm btn-outline-secondary mt-1"><i class="bi bi-download me-1"></i>Download Override Error Log (CSV)</button>`;
                }
            }

            // Show restore status per course
            if (overrideResult.courseResults) {
                const restoreIssues = Object.entries(overrideResult.courseResults)
                    .filter(([, r]) => !r.restored);
                if (restoreIssues.length > 0) {
                    resultHtml += '<div class="alert alert-warning py-1 px-2" style="font-size:0.85rem;"><strong>Warning:</strong> Some courses could not be restored to original settings:<ul class="mb-0">';
                    restoreIssues.forEach(([cid, r]) => {
                        resultHtml += `<li>Course ${cid}: ${r.error || 'Unknown error'}</li>`;
                    });
                    resultHtml += '</ul></div>';
                } else {
                    resultHtml += '<div class="alert alert-info py-1 px-2" style="font-size:0.85rem;"><i class="bi bi-check-circle me-1"></i>All course settings have been restored to their original values.</div>';
                }
            }

            statusDiv.innerHTML = resultHtml;

            // Wire up download button for override errors
            if (overrideResult.errors && overrideResult.errors.length > 0) {
                const dlBtn = document.getElementById('override-download-errors');
                if (dlBtn) {
                    dlBtn.addEventListener('click', async () => {
                        try {
                            const errorData = overrideResult.errors.map(err => ({
                                user_id: err.user_id || 'Unknown',
                                course_id: err.course_id || '',
                                section_id: err.section_id || '',
                                role_id: err.role_id || '',
                                reason: err.reason || 'Unknown error'
                            }));

                            const defaultFileName = `override_enrollment_errors_${new Date().toISOString().split('T')[0]}.csv`;
                            const csvResult = await window.csv.sendToCSV({
                                fileName: defaultFileName,
                                data: errorData,
                                showSaveDialog: true
                            });

                            if (csvResult && csvResult.filePath) {
                                dlBtn.innerHTML = '<i class="bi bi-check me-1"></i>Downloaded';
                                dlBtn.classList.remove('btn-outline-secondary');
                                dlBtn.classList.add('btn-success');
                                dlBtn.disabled = true;
                            }
                        } catch (error) {
                            console.error('Error downloading override error log:', error);
                            dlBtn.innerHTML = '<i class="bi bi-x me-1"></i>Download Failed';
                            dlBtn.classList.remove('btn-outline-secondary');
                            dlBtn.classList.add('btn-danger');
                        }
                    });
                }
            }

            overrideBtn.innerHTML = '<i class="bi bi-check me-1"></i>Override Complete';
            overrideBtn.classList.remove('btn-warning');
            overrideBtn.classList.add('btn-success');
        } catch (error) {
            console.error('Concluded override error:', error);
            statusDiv.innerHTML = `<div class="alert alert-danger py-1 px-2" style="font-size:0.85rem;">Override failed: ${error.message || 'Unknown error'}</div>`;
            overrideBtn.disabled = false;
            overrideBtn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i>Override & Retry Selected';
        } finally {
            if (removeProgressListener) removeProgressListener();
            overrideCancelBtn.removeEventListener('click', onCancelClick);
            overrideCancelBtn.hidden = true;
        }
    });
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
        console.log('[enrollment-progress] Received progress event:', data);
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
        } else {
            console.warn('[enrollment-progress] DOM elements not found:', { progressBar: !!progressBar, progressInfo: !!progressInfo, progressDetail: !!progressDetail });
        }
    });
} else {
    console.warn('[enrollment-progress] window.axios.onBulkEnrollProgress not available at load time');
}
