// enrollments_renderer.js - UI for bulk enrollments

function enrollmentTemplate(e) {
    switch (e.target.id) {
        case 'bulk-enrollment':
            bulkEnrollmentUI(e);
            break;
        default:
            break;
    }
}

function bulkEnrollmentUI(e) {
    hideEndpoints(e);

    const eContent = document.querySelector('#endpoint-content');
    let form = eContent.querySelector('#bulk-enrollment-form');

    if (!form) {
        form = document.createElement('form');
        form.id = 'bulk-enrollment-form';
        form.innerHTML = `
            <style>
                #bulk-enrollment-form .card { font-size: 0.875rem; }
                #bulk-enrollment-form .card-header h3 { font-size: 1.1rem; margin-bottom: 0.25rem; }
                #bulk-enrollment-form .card-header small { font-size: 0.75rem; }
                #bulk-enrollment-form .card-body { padding: 0.75rem; }
                #bulk-enrollment-form .form-label { font-size: 0.8rem; margin-bottom: 0.25rem; }
                #bulk-enrollment-form .form-control, #bulk-enrollment-form .form-select { 
                    font-size: 0.8rem; 
                    padding: 0.25rem 0.5rem;
                    height: auto;
                }
                #bulk-enrollment-form .btn { 
                    font-size: 0.8rem; 
                    padding: 0.35rem 0.75rem;
                }
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
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-person-plus me-1"></i>Bulk Enrollment
                    </h3>
                    <small class="text-muted">Enroll multiple users using CSV or TXT file</small>
                </div>
                <div class="card-body">
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
                            <div class="d-flex gap-3">
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" name="enrollment-state" 
                                           id="state-active" value="active" checked>
                                    <label class="form-check-label" for="state-active">
                                        Active
                                    </label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" name="enrollment-state" 
                                           id="state-inactive" value="inactive">
                                    <label class="form-check-label" for="state-inactive">
                                        Inactive
                                    </label>
                                </div>
                            </div>
                            <div class="form-text text-muted">
                                <i class="bi bi-info-circle me-1"></i>This state will be applied to all enrollments
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
                </div>
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
                </div>
            </div>

            <!-- Results Card -->
            <div class="card mt-2" id="enrollment-results-card" hidden>
                <div class="card-body" id="enrollment-response"></div>
            </div>
        `;
        eContent.appendChild(form);

        // Setup event listeners
        setupEnrollmentFormListeners();
    }

    form.hidden = false;
}

function setupEnrollmentFormListeners() {
    const fileInput = document.getElementById('enrollment-file');
    const enrollBtn = document.getElementById('enroll-btn');
    const fileHelp = document.getElementById('file-help');
    const filePreview = document.getElementById('file-preview');
    const previewText = document.getElementById('preview-text');

    let parsedData = null;

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
        if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
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
            fileHelp.style.visibility = 'hidden';
            filePreview.style.display = 'block';
            previewText.innerHTML = summary;
            enrollBtn.disabled = false;

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

        if (!domain || !token) {
            alert('Please enter Canvas domain and API token.');
            return;
        }

        // Show progress
        document.getElementById('enrollment-progress-card').hidden = false;
        document.getElementById('enrollment-results-card').hidden = true;
        enrollBtn.disabled = true;

        try {
            const result = await window.axios.bulkEnroll({
                domain,
                token,
                enrollments: parsedData,
                enrollmentState
            });

            // Show results
            displayEnrollmentResults(result);
        } catch (error) {
            console.error('Enrollment error:', error);
            displayEnrollmentError(error);
        } finally {
            enrollBtn.disabled = false;
            document.getElementById('enrollment-progress-card').hidden = true;
        }
    });
}

function parseEnrollmentFile(content) {
    const lines = content.trim().split('\n');
    if (lines.length < 2) {
        return { error: 'File must contain at least a header row and one data row.', enrollments: [] };
    }

    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const enrollments = [];

    // Map common column names to standard fields
    const fieldMap = {
        'canvas_user_id': 'user_id',
        'user_id': 'sis_user_id',
        'canvas_section_id': 'course_section_id',
        'section_id': 'sis_section_id',
        'canvas_course_id': 'course_id',
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

        // Extract required fields with priority
        const parsed = {
            user_id: enrollment.user_id || enrollment.canvas_user_id,
            type: enrollment.type || enrollment.base_role_type,
            role_id: enrollment.role_id,
            role: enrollment.role,
            course_section_id: enrollment.course_section_id || enrollment.canvas_section_id,
            course_id: enrollment.course_id || enrollment.canvas_course_id,
            start_at: enrollment.start_at,
            end_at: enrollment.end_at,
            limit_privileges_to_course_section: enrollment.limit_privileges_to_course_section === 'true' ||
                enrollment.limit_privileges_to_course_section === true ||
                enrollment.limit_section_privileges === 'true' ||
                enrollment.limit_section_privileges === true
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

        // Count roles (use role if available, otherwise type)
        const roleType = enrollment.role || enrollment.type || 'Unknown';
        roleCounts[roleType] = (roleCounts[roleType] || 0) + 1;
    });

    // Build summary HTML
    let summary = `<strong>Found ${enrollments.length} enrollment${enrollments.length !== 1 ? 's' : ''}</strong><br><br>`;
    summary += `${uniqueUsers.size} unique user${uniqueUsers.size !== 1 ? 's' : ''}<br>`;
    summary += `${uniqueCourses.size} unique course${uniqueCourses.size !== 1 ? 's' : ''}<br>`;
    summary += `${uniqueSections.size} unique section${uniqueSections.size !== 1 ? 's' : ''}<br>`;

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
            html += `<div class="mt-3"><h6>Error Details:</h6><ul>`;
            result.errors.forEach(error => {
                html += `<li><code>${error.user_id || 'Unknown'}</code>: ${error.reason}</li>`;
            });
            html += `</ul></div>`;
        }
    }

    responseDiv.innerHTML = html;
    resultsCard.hidden = false;
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

// Setup progress listener if needed
if (window.progressUtils && window.progressUtils.subscribeToProgress) {
    window.progressUtils.subscribeToProgress('enrollment', (data) => {
        const progressBar = document.getElementById('enrollment-progress-bar');
        const progressInfo = document.getElementById('enrollment-progress-info');
        const progressDetail = document.getElementById('enrollment-progress-detail');

        if (progressBar && progressInfo && progressDetail) {
            const percentage = Math.round((data.current / data.total) * 100);
            progressBar.style.width = `${percentage}%`;
            progressBar.setAttribute('aria-valuenow', percentage);
            progressInfo.textContent = `Processing enrollment ${data.current} of ${data.total}`;
            progressDetail.textContent = data.detail || '';
        }
    });
}
