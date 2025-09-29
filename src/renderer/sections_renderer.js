// sections_renderer.js - UI for creating Sections
function sectionsTemplate(e) {
  hideEndpoints(e);

  const eContent = document.querySelector('#endpoint-content');
  let form = eContent.querySelector('#create-sections-form');
  if (!form) {
    form = document.createElement('form');
    form.id = 'create-sections-form';
    form.innerHTML = `
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-people me-2"></i>Create Course Sections
                    </h3>
                    <small class="text-muted">Add multiple sections to a course at once</small>
                </div>
                <div class="card-body">
                    <div class="row g-3 mb-4">
                        <div class="col-md-6">
                            <label class="form-label fw-bold" for="course-id">
                                <i class="bi bi-mortarboard-fill me-1"></i>Course ID
                            </label>
                            <input type="text" class="form-control" id="course-id" 
                                   placeholder="Enter course ID (e.g., 12345)" />
                            <div id="course-id-help" class="form-text text-danger d-none">
                                <i class="bi bi-exclamation-triangle me-1"></i>Course ID must be a positive number.
                            </div>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold" for="num-items">
                                <i class="bi bi-hash me-1"></i>Number of Sections
                            </label>
                            <input type="number" class="form-control" id="num-items" 
                                   placeholder="How many sections?" min="1" max="100" />
                            <div id="num-items-help" class="form-text text-danger d-none">
                                <i class="bi bi-exclamation-triangle me-1"></i>Enter a number between 1 and 100.
                            </div>
                        </div>
                    </div>
                    
                    <div class="row g-3 mb-4">
                        <div class="col-md-8">
                            <label class="form-label fw-bold" for="name">
                                <i class="bi bi-tag me-1"></i>Section Name Prefix
                            </label>
                            <input type="text" class="form-control" id="name" 
                                   placeholder="Section" value="Section" />
                            <div class="form-text text-muted">
                                <i class="bi bi-info-circle me-1"></i>
                                Sections will be named: "<span id="name-preview">Section</span> 1", "<span id="name-preview-2">Section</span> 2", etc.
                            </div>
                        </div>
                    </div>
                    
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <div class="d-grid">
                                <button type="button" class="btn btn-success" id="create-btn" disabled>
                                    <i class="bi bi-plus-circle me-2"></i>Create Sections
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Progress Card -->
            <div class="card mt-3" id="progress-card" hidden>
                <div class="card-header">
                    <h5 class="card-title mb-0">
                        <i class="bi bi-gear me-2"></i>Creating Sections
                    </h5>
                </div>
                <div class="card-body">
                    <p id="progress-info" class="mb-2"></p>
                    <div class="progress mb-2" style="height: 15px;">
                        <div class="progress-bar progress-bar-striped progress-bar-animated" 
                             id="progress-bar" style="width:0%" role="progressbar" 
                             aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                        </div>
                    </div>
                    <small class="text-muted" id="progress-detail"></small>
                </div>
            </div>

            <!-- Results Card -->
            <div class="card mt-3" id="results-card" hidden>
                <div class="card-body" id="response"></div>
            </div>
        `;
    eContent.append(form);
  }
  form.hidden = false;

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
      createBtn.innerHTML = `<i class="bi bi-plus-circle me-2"></i>Create ${count} Section${count !== 1 ? 's' : ''}`;
    } else {
      createBtn.innerHTML = `<i class="bi bi-plus-circle me-2"></i>Create Sections`;
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
        requests.push({
          domain,
          token,
          course_id,
          name: `${name} ${i}`
        });
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
                    <i class="bi bi-exclamation-triangle me-2"></i>Error
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
                    <i class="${icon} me-2"></i>${title}
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
                <div class="mt-3">
                    <h6><i class="bi bi-list me-2"></i>Created Sections:</h6>
                    <div class="row">
            `;

      const columns = Math.ceil(successful / 3);
      res.successful.forEach((section, index) => {
        if (index % columns === 0) {
          content += '<div class="col-md-4"><ul class="list-unstyled">';
        }
        content += `<li><small><i class="bi bi-people me-1"></i>${section.name}</small></li>`;
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
