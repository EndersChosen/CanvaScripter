// pages_renderer.js - UI for creating Pages
function pagesTemplate(e) {
  hideEndpoints(e);

  const eContent = document.querySelector('#endpoint-content');
  let form = eContent.querySelector('#create-pages-form');
  if (!form) {
    form = document.createElement('form');
    form.id = 'create-pages-form';
    form.innerHTML = `
            <style>
                #create-pages-form .card-title { font-size: 1.1rem; }
                #create-pages-form .card-header small { font-size: 0.7rem; }
                #create-pages-form .form-label, #create-pages-form .form-check-label { font-size: 0.85rem; }
                #create-pages-form .form-text { font-size: 0.7rem; }
                #create-pages-form .card-body { padding: 0.75rem; }
                #create-pages-form .btn { padding: 0.35rem 0.75rem; font-size: 0.85rem; }
                #create-pages-form .form-control { font-size: 0.85rem; padding: 0.25rem 0.5rem; }
                #create-pages-form .bi { font-size: 0.9rem; }
                #create-pages-form .mt-3, #create-pages-form .mt-2 { margin-top: 0.5rem !important; }
                #create-pages-form .mb-4, #create-pages-form .mb-2 { margin-bottom: 0.5rem !important; }
                #create-pages-form .g-3 { gap: 0.5rem !important; }
                #create-pages-form .progress { height: 12px; }
                #create-pages-form h5, #create-pages-form h6 { font-size: 1rem; }
                #create-pages-form .alert { padding: 0.5rem 0.75rem; }
            </style>
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-file-text me-1"></i>Create Course Pages
                    </h3>
                    <small class="text-muted">Add multiple pages to a course at once</small>
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
                                <i class="bi bi-hash me-1"></i>Number of Pages
                            </label>
                            <input type="number" class="form-control form-control-sm" id="num-items" 
                                   placeholder="How many pages?" min="1" max="100" />
                            <div id="num-items-help" class="form-text text-danger d-none">
                                <i class="bi bi-exclamation-triangle me-1"></i>Enter a number between 1 and 100.
                            </div>
                        </div>
                    </div>
                    
                    <div class="row g-3 mb-2">
                        <div class="col-md-6">
                            <label class="form-label fw-bold" for="title">
                                <i class="bi bi-tag me-1"></i>Page Title Prefix
                            </label>
                            <input type="text" class="form-control form-control-sm" id="title" 
                                   placeholder="Page" value="Page" />
                            <div class="form-text text-muted">
                                <i class="bi bi-info-circle me-1"></i>
                                Pages will be named: "<span id="title-preview">Page</span> 1", "<span id="title-preview-2">Page</span> 2", etc.
                            </div>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold" for="body">
                                <i class="bi bi-pencil me-1"></i>Page Body (Optional)
                            </label>
                            <input type="text" class="form-control form-control-sm" id="body" 
                                   placeholder="Optional HTML content" />
                            <div class="form-text text-muted">
                                <i class="bi bi-info-circle me-1"></i>
                                Leave blank for empty pages or add HTML content
                            </div>
                        </div>
                    </div>
                    
                    <div class="row g-3 mb-2">
                        <div class="col-md-6">
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" role="switch" 
                                       id="published" checked>
                                <label class="form-check-label fw-bold" for="published">
                                    <i class="bi bi-eye me-1"></i>Publish Pages
                                </label>
                                <div class="form-text text-muted">
                                    <i class="bi bi-info-circle me-1"></i>
                                    Uncheck to create pages as drafts
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row mb-2">
                        <div class="col-md-6">
                            <div class="d-grid">
                                <button type="button" class="btn btn-sm btn-success" id="create-btn" disabled>
                                    <i class="bi bi-plus-circle me-1"></i>Create Pages
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
                        <i class="bi bi-gear me-1"></i>Creating Pages
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

  const createBtn = form.querySelector('#create-btn');
  const progressCard = form.querySelector('#progress-card');
  const progressBar = form.querySelector('#progress-bar');
  const progressInfo = form.querySelector('#progress-info');
  const progressDetail = form.querySelector('#progress-detail');
  const resultsCard = form.querySelector('#results-card');
  const courseIdInput = form.querySelector('#course-id');
  const numItemsInput = form.querySelector('#num-items');
  const titleInput = form.querySelector('#title');
  const courseHelp = form.querySelector('#course-id-help');
  const numHelp = form.querySelector('#num-items-help');
  const titlePreview = form.querySelector('#title-preview');
  const titlePreview2 = form.querySelector('#title-preview-2');

  // Track validation attempts
  let hasAttemptedSubmit = false;
  const touchedFields = new Set();

  // Update title preview as user types
  titleInput.addEventListener('input', () => {
    const prefix = titleInput.value.trim() || 'Page';
    titlePreview.textContent = prefix;
    titlePreview2.textContent = prefix;
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
      createBtn.innerHTML = `<i class="bi bi-plus-circle me-1"></i>Create ${count} Page${count !== 1 ? 's' : ''}`;
    } else {
      createBtn.innerHTML = `<i class="bi bi-plus-circle me-1"></i>Create Pages`;
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
  titleInput.addEventListener('input', validate);
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
    const title = form.querySelector('#title').value.trim() || 'Page';
    const body = form.querySelector('#body').value.trim();
    const published = form.querySelector('#published').checked;

    if (!domain || !token) {
      showError('Please configure your Canvas domain and API token first.');
      return;
    }

    if (!course_id || number <= 0) {
      showError('Please enter a valid Course ID and number of pages.');
      return;
    }

    // Disable form and show progress
    createBtn.disabled = true;
    progressCard.hidden = false;
    resultsCard.hidden = true;
    progressInfo.textContent = `Preparing to create ${number} pages...`;
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
          title: `${title} ${i}`,
          body,
          published
        });
      }

      // Update progress
      progressInfo.textContent = `Creating ${number} pages...`;
      progressDetail.textContent = 'Sending requests to Canvas API...';
      progressBar.style.width = '50%';
      progressBar.setAttribute('aria-valuenow', '50');

      const res = await window.axios.createPages({ requests });

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
                    <strong>${successful}</strong> of <strong>${totalRequested}</strong> pages created successfully.
                </p>
        `;

    if (failed > 0) {
      content += `
                <hr>
                <p class="mb-1">
                    <strong>${failed}</strong> pages failed to create:
                </p>
                <ul class="mb-0">
            `;

      res.failed.forEach(failure => {
        content += `<li><small>${failure.title || 'Unknown page'}: ${failure.error || 'Unknown error'}</small></li>`;
      });

      content += '</ul>';
    }

    content += '</div>';

    if (successful > 0) {
      content += `
                <div class="mt-2">
                    <h6><i class="bi bi-file-text me-1"></i>Created Pages:</h6>
                    <div class="row">
            `;

      const columns = Math.ceil(successful / 3);
      res.successful.forEach((page, index) => {
        if (index % columns === 0) {
          content += '<div class="col-md-4"><ul class="list-unstyled">';
        }
        content += `<li><small><i class="bi bi-file-text me-1"></i>${page.title}</small></li>`;
        if ((index + 1) % columns === 0 || index === successful - 1) {
          content += '</ul></div>';
        }
      });

      content += '</div></div>';
    }

    responseDiv.innerHTML = content;
  }
}

window.pagesTemplate = pagesTemplate;
