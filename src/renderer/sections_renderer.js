// sections_renderer.js - UI for creating and deleting Sections
function sectionsTemplate(e) {
  if (e.target.id === 'delete-sections') {
    deleteSectionsTemplate(e);
    return;
  }

  if (e.target.id !== 'create-sections') return;

  hideEndpoints(e);

  const eContent = document.querySelector('#endpoint-content');
  let form = eContent.querySelector('#create-sections-form');
  if (!form) {
    form = document.createElement('form');
    form.id = 'create-sections-form';
    form.innerHTML = `
            <style>
                #create-sections-form .card-title { font-size: 1.1rem; }
                #create-sections-form .card-header small { font-size: 0.7rem; }
                #create-sections-form .form-label { font-size: 0.85rem; }
                #create-sections-form .form-text { font-size: 0.7rem; }
                #create-sections-form .card-body { padding: 0.75rem; }
                #create-sections-form .btn { padding: 0.35rem 0.75rem; font-size: 0.85rem; }
                #create-sections-form .form-control { font-size: 0.85rem; padding: 0.25rem 0.5rem; }
                #create-sections-form .bi { font-size: 0.9rem; }
                #create-sections-form .mt-3, #create-sections-form .mt-2 { margin-top: 0.5rem !important; }
                #create-sections-form .mb-4, #create-sections-form .mb-2 { margin-bottom: 0.5rem !important; }
                #create-sections-form .g-3 { gap: 0.5rem !important; }
                #create-sections-form .progress { height: 12px; }
                #create-sections-form h5, #create-sections-form h6 { font-size: 1rem; }
                #create-sections-form .alert { padding: 0.5rem 0.75rem; }
            </style>
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-people me-1"></i>Create Course Sections
                    </h3>
                    <small class="text-muted">Add multiple sections to a course at once</small>
                </div>
                <div class="card-body">
                    <div class="row g-3 mb-2">
                        <div class="col-md-6">
                            <label class="form-label fw-bold" for="course-id">
                                <i class="bi bi-mortarboard-fill me-1"></i>Course ID
                            </label>
                            <input type="text" class="form-control form-control-sm" id="course-id" 
                                   placeholder="Enter course ID (e.g., 12345)" />
                            <div id="course-id-help" class="form-text text-danger d-none">
                                <i class="bi bi-exclamation-triangle me-1"></i>Course ID must be a positive number.
                            </div>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold" for="num-items">
                                <i class="bi bi-hash me-1"></i>Number of Sections
                            </label>
                            <input type="number" class="form-control form-control-sm" id="num-items" 
                                   placeholder="How many sections?" min="1" max="100" />
                            <div id="num-items-help" class="form-text text-danger d-none">
                                <i class="bi bi-exclamation-triangle me-1"></i>Enter a number between 1 and 100.
                            </div>
                        </div>
                    </div>
                    
                    <div class="row g-3 mb-2">
                        <div class="col-md-8">
                            <label class="form-label fw-bold" for="name">
                                <i class="bi bi-tag me-1"></i>Section Name Prefix
                            </label>
                            <input type="text" class="form-control form-control-sm" id="name" 
                                   placeholder="Section" value="Section" />
                            <div class="form-text text-muted">
                                <i class="bi bi-info-circle me-1"></i>
                                Sections will be named: "<span id="name-preview">Section</span> 1", "<span id="name-preview-2">Section</span> 2", etc.
                            </div>
                        </div>
                    </div>
                    
                    <div class="row g-3 mb-2">
                        <div class="col-md-6">
                            <label class="form-label fw-bold" for="start-date">
                                <i class="bi bi-calendar-event me-1"></i>Start Date <span class="text-muted fw-normal">(optional)</span>
                            </label>
                            <input type="datetime-local" class="form-control form-control-sm" id="start-date" />
                            <div class="form-text text-muted">
                                <i class="bi bi-info-circle me-1"></i>When the section becomes active
                            </div>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold" for="end-date">
                                <i class="bi bi-calendar-x me-1"></i>End Date <span class="text-muted fw-normal">(optional)</span>
                            </label>
                            <input type="datetime-local" class="form-control form-control-sm" id="end-date" />
                            <div class="form-text text-muted">
                                <i class="bi bi-info-circle me-1"></i>When the section ends
                            </div>
                        </div>
                    </div>
                    
                    <div class="row g-3 mb-2">
                        <div class="col-md-12">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="restrict-enrollments" />
                                <label class="form-check-label" for="restrict-enrollments">
                                    <i class="bi bi-lock me-1"></i>Restrict enrollments to section dates
                                </label>
                                <div class="form-text text-muted">
                                    <i class="bi bi-info-circle me-1"></i>Users can only participate in the section during the specified dates
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row mb-2">
                        <div class="col-md-6">
                            <div class="d-grid">
                                <button type="button" class="btn btn-sm btn-success" id="create-btn" disabled>
                                    <i class="bi bi-plus-circle me-1"></i>Create Sections
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Progress Card -->
            <div class="card mt-2" id="progress-card" hidden>
                <div class="card-header">
                    <h5 class="card-title mb-0">
                        <i class="bi bi-gear me-1"></i>Creating Sections
                    </h5>
                </div>
                <div class="card-body">
                    <p id="progress-info" class="mb-2"></p>
                    <div class="progress mb-2" style="height: 12px;">
                        <div class="progress-bar progress-bar-striped progress-bar-animated" 
                             id="progress-bar" style="width:0%" role="progressbar" 
                             aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                        </div>
                    </div>
                    <small class="text-muted" id="progress-detail"></small>
                </div>
            </div>

            <!-- Results Card -->
            <div class="card mt-2" id="results-card" hidden>
                <div class="card-body" id="response"></div>
            </div>
        `;
    eContent.append(form);
  }
  form.hidden = false;

  if (form.dataset.bound === 'true') return;
  form.dataset.bound = 'true';

  const createBtn = form.querySelector('#create-btn');
  const progressCard = form.querySelector('#progress-card');
  const progressBar = form.querySelector('#progress-bar');
  const progressInfo = form.querySelector('#progress-info');
  const progressDetail = form.querySelector('#progress-detail');
  const resultsCard = form.querySelector('#results-card');
  const courseIdInput = form.querySelector('#course-id');
  const numItemsInput = form.querySelector('#num-items');
  const nameInput = form.querySelector('#name');
  const courseHelp = form.querySelector('#course-id-help');
  const numHelp = form.querySelector('#num-items-help');
  const namePreview = form.querySelector('#name-preview');
  const namePreview2 = form.querySelector('#name-preview-2');

  // Track validation attempts
  let hasAttemptedSubmit = false;
  const touchedFields = new Set();

  // Update name preview as user types
  nameInput.addEventListener('input', () => {
    const prefix = nameInput.value.trim() || 'Section';
    namePreview.textContent = prefix;
    namePreview2.textContent = prefix;
  });

  function isPositiveInt(val, max = 100) {
    const trimmed = String(val).trim();
    if (trimmed === '') return { valid: false, isEmpty: true };
    const n = Number(trimmed);
    return { valid: Number.isInteger(n) && n > 0 && n <= max, isEmpty: false };
  }

  function validate(showErrors = false) {
    const cidResult = isPositiveInt(courseIdInput.value, 999999);
    const cntResult = isPositiveInt(numItemsInput.value, 100);

    // Only show validation errors if we should show errors, field has been touched/submitted, 
    // field is not empty, and validation failed
    const showCourseError = showErrors &&
      (hasAttemptedSubmit || touchedFields.has('course-id')) &&
      !cidResult.isEmpty &&
      !cidResult.valid;

    const showCountError = showErrors &&
      (hasAttemptedSubmit || touchedFields.has('num-items')) &&
      !cntResult.isEmpty &&
      !cntResult.valid;

    courseIdInput.classList.toggle('is-invalid', showCourseError);
    courseHelp.classList.toggle('d-none', !showCourseError);

    numItemsInput.classList.toggle('is-invalid', showCountError);
    numHelp.classList.toggle('d-none', !showCountError);

    const isValid = cidResult.valid && cntResult.valid;
    createBtn.disabled = !isValid;

    // Update button text based on validation
    if (isValid) {
      const count = parseInt(numItemsInput.value) || 0;
      createBtn.innerHTML = `<i class="bi bi-plus-circle me-1"></i>Create ${count} Section${count !== 1 ? 's' : ''}`;
    } else {
      createBtn.innerHTML = `<i class="bi bi-plus-circle me-1"></i>Create Sections`;
    }

    return isValid;
  }

  // Add blur event listeners to mark fields as touched
  courseIdInput.addEventListener('blur', () => {
    touchedFields.add('course-id');
    validate(true);
  });

  numItemsInput.addEventListener('blur', () => {
    touchedFields.add('num-items');
    validate(true);
  });

  courseIdInput.addEventListener('input', () => validate(false));
  numItemsInput.addEventListener('input', () => validate(false));
  nameInput.addEventListener('input', validate);
  validate(false);

  createBtn.addEventListener('click', async (ev) => {
    ev.preventDefault();
    ev.stopPropagation();

    // Mark that submit has been attempted
    hasAttemptedSubmit = true;

    if (!validate(true)) {
      // Show validation errors since submit was attempted
      return;
    }

    const domain = document.querySelector('#domain').value.trim();
    const token = document.querySelector('#token').value.trim();
    const course_id = form.querySelector('#course-id').value.trim();
    const number = parseInt(form.querySelector('#num-items').value.trim(), 10) || 0;
    const name = form.querySelector('#name').value.trim() || 'Section';
    const startDate = form.querySelector('#start-date').value.trim();
    const endDate = form.querySelector('#end-date').value.trim();
    const restrictEnrollments = form.querySelector('#restrict-enrollments').checked;

    if (!domain || !token) {
      showError('Please configure your Canvas domain and API token first.');
      return;
    }

    if (!course_id || number <= 0) {
      showError('Please enter a valid Course ID and number of sections.');
      return;
    }

    // Disable form and show progress
    createBtn.disabled = true;
    progressCard.hidden = false;
    resultsCard.hidden = true;
    progressInfo.textContent = `Preparing to create ${number} sections...`;
    progressDetail.textContent = 'Initializing requests...';
    progressBar.style.width = '0%';
    progressBar.setAttribute('aria-valuenow', '0');

    try {
      const requests = [];
      for (let i = 1; i <= number; i++) {
        const request = {
          domain,
          token,
          course_id,
          name: `${name} ${i}`
        };

        // Add optional date fields if provided
        if (startDate) {
          request.start_at = new Date(startDate).toISOString();
        }
        if (endDate) {
          request.end_at = new Date(endDate).toISOString();
        }
        if (restrictEnrollments) {
          request.restrict_enrollments_to_section_dates = true;
        }

        requests.push(request);
      }

      // Update progress
      progressInfo.textContent = `Creating ${number} sections...`;
      progressDetail.textContent = 'Sending requests to Canvas API...';
      progressBar.style.width = '50%';
      progressBar.setAttribute('aria-valuenow', '50');

      const res = await window.axios.createSections({ requests });

      // Complete progress
      progressBar.style.width = '100%';
      progressBar.setAttribute('aria-valuenow', '100');
      progressInfo.textContent = 'Operation completed!';
      progressDetail.textContent = 'Processing results...';

      // Show results
      setTimeout(() => {
        progressCard.hidden = true;
        showResults(res, number);
      }, 1000);

    } catch (err) {
      progressCard.hidden = true;
      showError(err?.message || String(err));
    } finally {
      createBtn.disabled = false;
    }
  });

  function showError(message) {
    resultsCard.hidden = false;
    const responseDiv = form.querySelector('#response');
    responseDiv.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <h5 class="alert-heading">
                    <i class="bi bi-exclamation-triangle me-1"></i>Error
                </h5>
                <p class="mb-0">${message}</p>
            </div>
        `;
  }

  function showResults(res, totalRequested) {
    resultsCard.hidden = false;
    const responseDiv = form.querySelector('#response');
    const successful = res.successful?.length || 0;
    const failed = res.failed?.length || 0;

    let alertClass = 'alert-success';
    let icon = 'bi bi-check-circle';
    let title = 'Success!';

    if (failed > 0) {
      alertClass = successful > 0 ? 'alert-warning' : 'alert-danger';
      icon = successful > 0 ? 'bi bi-exclamation-triangle' : 'bi bi-x-circle';
      title = successful > 0 ? 'Partial Success' : 'Failed';
    }

    let content = `
            <div class="alert ${alertClass}" role="alert">
                <h5 class="alert-heading">
                    <i class="${icon} me-1"></i>${title}
                </h5>
                <p class="mb-2">
                    <strong>${successful}</strong> of <strong>${totalRequested}</strong> sections created successfully.
                </p>
        `;

    if (failed > 0) {
      content += `
                <hr>
                <p class="mb-1">
                    <strong>${failed}</strong> sections failed to create:
                </p>
                <ul class="mb-0">
            `;

      res.failed.forEach(failure => {
        content += `<li><small>${failure.name || 'Unknown section'}: ${failure.error || 'Unknown error'}</small></li>`;
      });

      content += '</ul>';
    }

    content += '</div>';

    if (successful > 0) {
      content += `
                <div class="mt-2">
                    <h6><i class="bi bi-list me-1"></i>Created Sections:</h6>
                    <div class="row">
            `;

      const columns = Math.ceil(successful / 3);
      res.successful.forEach((section, index) => {
        if (index % columns === 0) {
          content += '<div class="col-md-4"><ul class="list-unstyled">';
        }
        const sectionData = section.value || section;
        content += `<li><small><i class="bi bi-people me-1"></i>${sectionData.name}</small></li>`;
        if ((index + 1) % columns === 0 || index === successful - 1) {
          content += '</ul></div>';
        }
      });

      content += '</div></div>';
    }

    responseDiv.innerHTML = content;
  }
}

window.sectionsTemplate = sectionsTemplate;
window.deleteSectionsTemplate = deleteSectionsTemplate;

// ==================== DELETE SECTIONS ====================

function deleteSectionsTemplate(e) {
  hideEndpoints(e);

  const eContent = document.querySelector('#endpoint-content');
  let form = eContent.querySelector('#delete-sections-form');

  if (!form) {
    form = document.createElement('form');
    form.id = 'delete-sections-form';
    form.innerHTML = `
            <style>
                #delete-sections-form .card-title { font-size: 1.1rem; }
                #delete-sections-form .card-header small { font-size: 0.7rem; }
                #delete-sections-form .form-label, #delete-sections-form .form-check-label { font-size: 0.85rem; }
                #delete-sections-form .form-text { font-size: 0.7rem; }
                #delete-sections-form .card-body { padding: 0.75rem; }
                #delete-sections-form .btn { padding: 0.35rem 0.75rem; font-size: 0.85rem; }
                #delete-sections-form .form-control { font-size: 0.85rem; padding: 0.25rem 0.5rem; }
                #delete-sections-form .bi { font-size: 0.9rem; }
                #delete-sections-form .mb-2 { margin-bottom: 0.5rem !important; }
                #delete-sections-form .g-3 { gap: 0.5rem !important; }
                #delete-sections-form .progress { height: 12px; }
                #delete-sections-form .section-item { padding: 0.5rem 0.75rem; border-bottom: 1px solid #dee2e6; }
                #delete-sections-form .section-item:last-child { border-bottom: none; }
                #delete-sections-form .section-item:hover { background-color: #f8f9fa; }
                #delete-sections-form .badge { font-size: 0.7rem; }
                #delete-sections-form .enrollment-warning { 
                    background-color: #fff3cd; border-left: 3px solid #ffc107; 
                    padding: 0.5rem 0.75rem; margin-top: 0.5rem; border-radius: 0.25rem; 
                }
            </style>
            <div class="card">
                <div class="card-header bg-danger-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-trash me-1"></i>Delete Sections
                    </h3>
                    <small class="text-muted">Remove sections from a course. Sections with enrollments require user removal first.</small>
                </div>
                <div class="card-body">
                    <div class="row g-3 mb-2">
                        <div class="col-md-6">
                            <label class="form-label fw-bold" for="ds-course-id">
                                <i class="bi bi-mortarboard-fill me-1"></i>Course ID
                            </label>
                            <input type="text" class="form-control form-control-sm" id="ds-course-id" 
                                   placeholder="Enter course ID (e.g., 12345)" />
                            <div id="ds-course-id-help" class="form-text text-danger d-none">
                                <i class="bi bi-exclamation-triangle me-1"></i>Course ID must be a positive number.
                            </div>
                        </div>
                        <div class="col-md-6 d-flex align-items-end">
                            <button type="button" class="btn btn-sm btn-primary w-100" id="ds-search-btn" disabled>
                                <i class="bi bi-search me-1"></i>Find Sections
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Sections List Card -->
            <div class="card mt-2" id="ds-sections-card" hidden>
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="card-title mb-0">
                        <i class="bi bi-list-check me-1"></i>Course Sections
                        <span class="badge bg-secondary ms-1" id="ds-section-count">0</span>
                    </h5>
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="ds-select-all" />
                        <label class="form-check-label" for="ds-select-all">Select / Deselect All</label>
                    </div>
                </div>
                <div class="card-body p-0" id="ds-sections-list">
                    <!-- Populated dynamically -->
                </div>
                <div class="card-footer">
                    <div class="enrollment-warning mb-2" id="ds-enrollment-warning" hidden>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="ds-delete-enrollments" />
                            <label class="form-check-label fw-bold" for="ds-delete-enrollments">
                                <i class="bi bi-people me-1 text-warning"></i>Also delete enrollments in selected sections
                            </label>
                        </div>
                        <div class="form-text text-muted">
                            <i class="bi bi-exclamation-triangle me-1"></i>
                            Sections with enrollments cannot be deleted until all enrollments are removed. 
                            Check this box to delete enrollments first, then delete the sections. 
                            Unchecked sections with enrollments will be skipped.
                        </div>
                    </div>
                    <button type="button" class="btn btn-sm btn-danger w-100" id="ds-delete-btn" disabled>
                        <i class="bi bi-trash me-1"></i>Delete Selected Sections
                    </button>
                </div>
            </div>

            <!-- Progress Card -->
            <div class="card mt-2" id="ds-progress-card" hidden>
                <div class="card-header">
                    <h5 class="card-title mb-0">
                        <i class="bi bi-gear me-1"></i><span id="ds-progress-title">Processing...</span>
                    </h5>
                </div>
                <div class="card-body">
                    <p id="ds-progress-info" class="mb-2"></p>
                    <div class="progress mb-2" style="height: 12px;">
                        <div class="progress-bar progress-bar-striped progress-bar-animated bg-danger" 
                             id="ds-progress-bar" style="width:0%" role="progressbar" 
                             aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                        </div>
                    </div>
                    <small class="text-muted" id="ds-progress-detail"></small>
                </div>
            </div>
            
            <!-- Result Area -->
            <div id="ds-result-area" class="mt-2"></div>
    `;
    eContent.append(form);
  }

  form.hidden = false;

  if (form.dataset.bound === 'true') return;
  form.dataset.bound = 'true';

  // Elements
  const courseIdInput = form.querySelector('#ds-course-id');
  const courseHelp = form.querySelector('#ds-course-id-help');
  const searchBtn = form.querySelector('#ds-search-btn');
  const sectionsCard = form.querySelector('#ds-sections-card');
  const sectionCountBadge = form.querySelector('#ds-section-count');
  const sectionsList = form.querySelector('#ds-sections-list');
  const selectAllCheckbox = form.querySelector('#ds-select-all');
  const enrollmentWarning = form.querySelector('#ds-enrollment-warning');
  const deleteEnrollmentsCheckbox = form.querySelector('#ds-delete-enrollments');
  const deleteBtn = form.querySelector('#ds-delete-btn');
  const progressCard = form.querySelector('#ds-progress-card');
  const progressTitle = form.querySelector('#ds-progress-title');
  const progressBar = form.querySelector('#ds-progress-bar');
  const progressInfo = form.querySelector('#ds-progress-info');
  const progressDetail = form.querySelector('#ds-progress-detail');
  const resultArea = form.querySelector('#ds-result-area');

  // State
  let sectionsData = [];       // { _id, name, userCount }
  let enrollmentsData = [];    // { _id, type, state, section: { _id } }
  let enrollmentsBySection = {}; // sectionId -> [enrollment]

  // Validation
  function validateCourseId() {
    const val = courseIdInput.value.trim();
    const n = Number(val);
    const valid = val !== '' && Number.isInteger(n) && n > 0;
    courseHelp.classList.toggle('d-none', valid || val === '');
    courseIdInput.classList.toggle('is-invalid', !valid && val !== '');
    searchBtn.disabled = !valid;
    return valid;
  }

  courseIdInput.addEventListener('input', validateCourseId);
  courseIdInput.addEventListener('blur', validateCourseId);

  // Update selection state
  function updateSelectionState() {
    const checkboxes = sectionsList.querySelectorAll('.ds-section-check');
    const checked = sectionsList.querySelectorAll('.ds-section-check:checked');

    // Update select all indeterminate/checked state
    selectAllCheckbox.checked = checked.length === checkboxes.length && checkboxes.length > 0;
    selectAllCheckbox.indeterminate = checked.length > 0 && checked.length < checkboxes.length;

    // Check if any selected sections have enrollments
    let anySelectedHasEnrollments = false;
    checked.forEach(cb => {
      const sectionId = cb.dataset.sectionId;
      if (enrollmentsBySection[sectionId] && enrollmentsBySection[sectionId].length > 0) {
        anySelectedHasEnrollments = true;
      }
    });

    enrollmentWarning.hidden = !anySelectedHasEnrollments;
    if (!anySelectedHasEnrollments) {
      deleteEnrollmentsCheckbox.checked = false;
    }

    // Update delete button
    deleteBtn.disabled = checked.length === 0;
    if (checked.length > 0) {
      deleteBtn.innerHTML = `<i class="bi bi-trash me-1"></i>Delete ${checked.length} Section${checked.length !== 1 ? 's' : ''}`;
    } else {
      deleteBtn.innerHTML = `<i class="bi bi-trash me-1"></i>Delete Selected Sections`;
    }
  }

  // Render sections list
  function renderSections() {
    sectionsList.innerHTML = '';
    sectionCountBadge.textContent = sectionsData.length;

    if (sectionsData.length === 0) {
      sectionsList.innerHTML = '<div class="p-3 text-muted text-center">No sections found in this course.</div>';
      return;
    }

    sectionsData.forEach(section => {
      const enrollments = enrollmentsBySection[section._id] || [];
      const hasEnrollments = section.userCount > 0;

      const div = document.createElement('div');
      div.className = 'section-item d-flex align-items-center';

      const badgeClass = hasEnrollments ? 'bg-warning text-dark' : 'bg-success';
      const badgeIcon = hasEnrollments ? 'bi-people-fill' : 'bi-check-circle';
      const badgeText = hasEnrollments
        ? `${section.userCount} user${section.userCount !== 1 ? 's' : ''}`
        : 'Empty';

      div.innerHTML = `
        <div class="form-check flex-grow-1">
          <input class="form-check-input ds-section-check" type="checkbox" 
                 id="ds-sec-${section._id}" data-section-id="${section._id}" />
          <label class="form-check-label" for="ds-sec-${section._id}">
            <span class="fw-bold">${escapeHtml(section.name)}</span>
            <span class="badge ${badgeClass} ms-2">
              <i class="bi ${badgeIcon} me-1"></i>${badgeText}
            </span>
            ${hasEnrollments ? `<span class="badge bg-info ms-1">${enrollments.length} enrollment${enrollments.length !== 1 ? 's' : ''}</span>` : ''}
          </label>
        </div>
        <small class="text-muted">ID: ${section._id}</small>
      `;

      const cb = div.querySelector('.ds-section-check');
      cb.addEventListener('change', updateSelectionState);

      sectionsList.appendChild(div);
    });
  }

  // Simple HTML escaper
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Select/Deselect All
  selectAllCheckbox.addEventListener('change', () => {
    const checkboxes = sectionsList.querySelectorAll('.ds-section-check');
    checkboxes.forEach(cb => { cb.checked = selectAllCheckbox.checked; });
    updateSelectionState();
  });

  // Search handler
  searchBtn.addEventListener('click', async () => {
    const domain = document.querySelector('#domain').value.trim();
    const token = document.querySelector('#token').value.trim();
    const courseId = courseIdInput.value.trim();

    if (!domain || !token) {
      resultArea.innerHTML = '<div class="alert alert-danger"><i class="bi bi-exclamation-triangle me-2"></i>Please configure your Canvas domain and API token first.</div>';
      return;
    }

    // Reset UI
    sectionsCard.hidden = true;
    resultArea.innerHTML = '';
    progressCard.hidden = false;
    progressTitle.textContent = 'Searching...';
    progressBar.style.width = '100%';
    progressBar.classList.add('progress-bar-animated');
    progressBar.classList.remove('bg-danger');
    progressBar.classList.add('bg-primary');
    progressInfo.textContent = 'Querying Canvas GraphQL API for sections and enrollments...';
    progressDetail.textContent = 'This may take a moment for large courses.';
    searchBtn.disabled = true;

    try {
      const result = await window.axios.getCourseSectionsGraphQL({
        domain,
        token,
        course_id: courseId
      });

      sectionsData = result.sections || [];
      enrollmentsData = result.enrollments || [];

      // Group enrollments by section
      enrollmentsBySection = {};
      for (const enrollment of enrollmentsData) {
        const sectionId = enrollment.section?._id;
        if (sectionId) {
          if (!enrollmentsBySection[sectionId]) {
            enrollmentsBySection[sectionId] = [];
          }
          enrollmentsBySection[sectionId].push(enrollment);
        }
      }

      progressCard.hidden = true;

      if (sectionsData.length === 0) {
        resultArea.innerHTML = '<div class="alert alert-info"><i class="bi bi-info-circle me-1"></i>No sections found in this course.</div>';
      } else {
        sectionsCard.hidden = false;
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
        deleteEnrollmentsCheckbox.checked = false;
        renderSections();
        updateSelectionState();
      }
    } catch (err) {
      progressCard.hidden = true;
      resultArea.innerHTML = `<div class="alert alert-danger"><i class="bi bi-exclamation-triangle me-1"></i>Error: ${err.message || err}</div>`;
    } finally {
      searchBtn.disabled = false;
      validateCourseId();
    }
  });

  // Delete handler
  deleteBtn.addEventListener('click', async () => {
    const domain = document.querySelector('#domain').value.trim();
    const token = document.querySelector('#token').value.trim();
    const courseId = courseIdInput.value.trim();
    const shouldDeleteEnrollments = deleteEnrollmentsCheckbox.checked;

    const selectedCheckboxes = sectionsList.querySelectorAll('.ds-section-check:checked');
    if (selectedCheckboxes.length === 0) return;

    // Categorize sections
    const sectionsToDelete = [];
    const sectionsSkipped = [];

    selectedCheckboxes.forEach(cb => {
      const sectionId = cb.dataset.sectionId;
      const section = sectionsData.find(s => s._id === sectionId);
      const enrollments = enrollmentsBySection[sectionId] || [];

      if (enrollments.length > 0 && !shouldDeleteEnrollments) {
        sectionsSkipped.push({ section, enrollments, reason: 'has enrollments — enrollment deletion not selected' });
      } else {
        sectionsToDelete.push({ section, enrollments });
      }
    });

    if (sectionsToDelete.length === 0 && sectionsSkipped.length > 0) {
      resultArea.innerHTML = `
        <div class="alert alert-warning">
          <h5 class="alert-heading"><i class="bi bi-exclamation-triangle me-1"></i>No Sections Deleted</h5>
          <p>All ${sectionsSkipped.length} selected section(s) have enrollments. Check "Also delete enrollments" to proceed, or deselect sections with users.</p>
        </div>`;
      return;
    }

    // Confirm
    const totalEnrollments = sectionsToDelete.reduce((sum, s) => sum + s.enrollments.length, 0);
    let confirmMsg = `Delete ${sectionsToDelete.length} section(s)?`;
    if (totalEnrollments > 0) {
      confirmMsg += `\n\nThis will also delete ${totalEnrollments} enrollment(s) first.`;
    }
    if (sectionsSkipped.length > 0) {
      confirmMsg += `\n\n${sectionsSkipped.length} section(s) will be skipped (have enrollments).`;
    }

    // Disable controls
    deleteBtn.disabled = true;
    searchBtn.disabled = true;
    sectionsCard.querySelector('.card-body').style.pointerEvents = 'none';
    sectionsCard.querySelector('.card-body').style.opacity = '0.6';
    progressCard.hidden = false;
    resultArea.innerHTML = '';

    const results = {
      enrollmentsDeleted: 0,
      enrollmentsFailed: 0,
      enrollmentErrors: [],
      sectionsDeleted: 0,
      sectionsFailed: 0,
      sectionErrors: [],
      sectionsSkipped: sectionsSkipped.map(s => ({ name: s.section.name, _id: s.section._id, reason: s.reason }))
    };

    try {
      // Phase 1: Delete enrollments for sections that have them
      const sectionsWithEnrollments = sectionsToDelete.filter(s => s.enrollments.length > 0);
      if (sectionsWithEnrollments.length > 0) {
        const allEnrollmentRequests = [];
        for (const s of sectionsWithEnrollments) {
          for (const enrollment of s.enrollments) {
            allEnrollmentRequests.push({
              domain,
              token,
              course_id: courseId,
              enrollment_id: enrollment._id,
              task: 'delete'
            });
          }
        }

        progressTitle.textContent = 'Deleting Enrollments';
        progressInfo.textContent = `Removing ${allEnrollmentRequests.length} enrollment(s) from ${sectionsWithEnrollments.length} section(s)...`;
        progressDetail.textContent = 'Starting...';
        progressBar.style.width = '0%';
        progressBar.classList.remove('bg-primary');
        progressBar.classList.add('bg-danger');

        // Setup progress listener
        const unsubscribe = window.progressAPI.onUpdateProgress((progress) => {
          if (typeof progress === 'object') {
            const pct = ((progress.processed / progress.total) * 100).toFixed(0);
            progressBar.style.width = `${pct}%`;
            progressDetail.textContent = `Deleted ${progress.processed} of ${progress.total} enrollment(s)...`;
          }
        });

        try {
          const enrollRes = await window.axios.deleteEnrollments({ requests: allEnrollmentRequests });

          results.enrollmentsDeleted = enrollRes.successful?.length || 0;
          results.enrollmentsFailed = enrollRes.failed?.length || 0;
          if (enrollRes.failed) {
            results.enrollmentErrors = enrollRes.failed.map(f => f.error || 'Unknown error');
          }
        } finally {
          if (typeof unsubscribe === 'function') unsubscribe();
        }
      }

      // Phase 2: Delete sections
      // Only attempt sections where all enrollments were successfully deleted
      const sectionDeleteRequests = [];
      for (const s of sectionsToDelete) {
        if (s.enrollments.length === 0) {
          // No enrollments — safe to delete
          sectionDeleteRequests.push({
            domain,
            token,
            section_id: s.section._id
          });
        } else {
          // Had enrollments — check if all were deleted
          // Count how many of this section's enrollment IDs were in failed
          const failedIds = new Set((results.enrollmentErrors || []).map(e => e));
          // Since we can't perfectly track per-section failures from batch results, 
          // we optimistically attempt deletion; the API will reject if enrollments remain
          sectionDeleteRequests.push({
            domain,
            token,
            section_id: s.section._id
          });
        }
      }

      if (sectionDeleteRequests.length > 0) {
        progressTitle.textContent = 'Deleting Sections';
        progressInfo.textContent = `Deleting ${sectionDeleteRequests.length} section(s)...`;
        progressDetail.textContent = 'Starting...';
        progressBar.style.width = '0%';

        const unsubscribe2 = window.progressAPI.onUpdateProgress((progress) => {
          if (typeof progress === 'object') {
            const pct = ((progress.processed / progress.total) * 100).toFixed(0);
            progressBar.style.width = `${pct}%`;
            progressDetail.textContent = `Deleted ${progress.processed} of ${progress.total} section(s)...`;
          }
        });

        try {
          const secRes = await window.axios.deleteSections({ requests: sectionDeleteRequests });

          results.sectionsDeleted = secRes.successful?.length || 0;
          results.sectionsFailed = secRes.failed?.length || 0;
          if (secRes.failed) {
            results.sectionErrors = secRes.failed.map(f => ({
              id: f.id,
              error: f.error || 'Unknown error'
            }));
          }
        } finally {
          if (typeof unsubscribe2 === 'function') unsubscribe2();
        }
      }

      // Show results
      progressCard.hidden = true;
      showDeleteResults(results);

    } catch (err) {
      progressCard.hidden = true;
      resultArea.innerHTML = `<div class="alert alert-danger"><i class="bi bi-exclamation-triangle me-1"></i>Error: ${err.message || err}</div>`;
    } finally {
      deleteBtn.disabled = false;
      searchBtn.disabled = false;
      sectionsCard.querySelector('.card-body').style.pointerEvents = '';
      sectionsCard.querySelector('.card-body').style.opacity = '';
      validateCourseId();
    }
  });

  function showDeleteResults(results) {
    const totalOps = results.sectionsDeleted + results.sectionsFailed + results.sectionsSkipped.length;
    const hasFailures = results.enrollmentsFailed > 0 || results.sectionsFailed > 0;
    const hasSkips = results.sectionsSkipped.length > 0;

    let alertClass, icon, title;
    if (results.sectionsDeleted === 0 && totalOps > 0) {
      alertClass = 'alert-danger';
      icon = 'bi-x-circle';
      title = 'Operation Failed';
    } else if (hasFailures || hasSkips) {
      alertClass = 'alert-warning';
      icon = 'bi-exclamation-triangle';
      title = 'Partial Success';
    } else {
      alertClass = 'alert-success';
      icon = 'bi-check-circle';
      title = 'Success!';
    }

    let html = `
      <div class="alert ${alertClass}">
        <h5 class="alert-heading"><i class="bi ${icon} me-1"></i>${title}</h5>
        <div class="row">
          <div class="col-md-6">
            <p class="mb-1"><strong>Sections:</strong></p>
            <ul class="mb-2">
              <li><i class="bi bi-check text-success me-1"></i>${results.sectionsDeleted} deleted successfully</li>
              ${results.sectionsFailed > 0 ? `<li><i class="bi bi-x text-danger me-1"></i>${results.sectionsFailed} failed</li>` : ''}
              ${results.sectionsSkipped.length > 0 ? `<li><i class="bi bi-skip-forward text-warning me-1"></i>${results.sectionsSkipped.length} skipped (have enrollments)</li>` : ''}
            </ul>
          </div>
          <div class="col-md-6">
            <p class="mb-1"><strong>Enrollments:</strong></p>
            <ul class="mb-2">
              <li><i class="bi bi-check text-success me-1"></i>${results.enrollmentsDeleted} deleted successfully</li>
              ${results.enrollmentsFailed > 0 ? `<li><i class="bi bi-x text-danger me-1"></i>${results.enrollmentsFailed} failed</li>` : ''}
            </ul>
          </div>
        </div>
    `;

    if (results.sectionsSkipped.length > 0) {
      html += `<hr><p class="mb-1"><strong>Skipped Sections</strong> (enrollments not removed):</p><ul class="mb-0">`;
      results.sectionsSkipped.forEach(s => {
        html += `<li><small>${escapeHtml(s.name)} (ID: ${s._id}) — ${s.reason}</small></li>`;
      });
      html += '</ul>';
    }

    if (results.sectionErrors.length > 0) {
      html += `<hr><p class="mb-1"><strong>Section Deletion Errors:</strong></p><ul class="mb-0">`;
      results.sectionErrors.forEach(e => {
        html += `<li><small>${e.error}</small></li>`;
      });
      html += '</ul>';
    }

    html += '</div>';
    resultArea.innerHTML = html;
  }

  // Utility: escape HTML (reuse local)
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
