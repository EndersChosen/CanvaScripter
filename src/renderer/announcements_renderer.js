// announcements_renderer.js - UI for creating Announcements (discussions with is_announcement)
function announcementTemplate(e) {
  hideEndpoints(e);

  const eContent = document.querySelector('#endpoint-content');
  let form = eContent.querySelector('#create-announcements-form');
  if (!form) {
    form = document.createElement('form');
    form.id = 'create-announcements-form';
    form.innerHTML = `
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-megaphone me-2"></i>Create Course Announcements
                    </h3>
                    <small class="text-muted">Add multiple announcements to a course at once</small>
                </div>
                <div class="card-body">
                    <div class="row g-3 mb-4">
                        <div class="col-md-6">
                            <label class="form-label fw-bold" for="course-id">
                                <i class="bi bi-mortarboard-fill me-1"></i>Course ID
                            </label>
                            <input type="text" class="form-control" id="course-id" 
                                   placeholder="Enter course ID (e.g., 12345)" />
                            <div id="course-id-help" class="form-text text-danger" style="min-height: 1.25rem; visibility: hidden;">
                                <i class="bi bi-exclamation-triangle me-1"></i>Course ID must be a positive number.
                            </div>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold" for="num-items">
                                <i class="bi bi-hash me-1"></i>Number of Announcements
                            </label>
                            <input type="number" class="form-control" id="num-items" 
                                   placeholder="How many announcements?" min="1" max="100" />
                            <div id="num-items-help" class="form-text text-danger" style="min-height: 1.25rem; visibility: hidden;">
                                <i class="bi bi-exclamation-triangle me-1"></i>Enter a number between 1 and 100.
                            </div>
                        </div>
                    </div>
                    
                    <div class="row g-3 mb-4">
                        <div class="col-md-6">
                            <label class="form-label fw-bold" for="title">
                                <i class="bi bi-tag me-1"></i>Title Prefix
                            </label>
                            <input type="text" class="form-control" id="title" 
                                   placeholder="Announcement" value="Announcement" />
                            <div class="form-text text-muted">
                                <i class="bi bi-info-circle me-1"></i>
                                Announcements will be named: "<span id="title-preview">Announcement</span> 1", "<span id="title-preview-2">Announcement</span> 2", etc.
                            </div>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold" for="message">
                                <i class="bi bi-pencil me-1"></i>Message (Optional)
                            </label>
                            <input type="text" class="form-control" id="message" 
                                   placeholder="Optional announcement body" />
                            <div class="form-text text-muted">
                                <i class="bi bi-info-circle me-1"></i>
                                Leave blank for announcements with just titles
                            </div>
                        </div>
                    </div>
                    
                    <div class="row g-3 mb-4">
                        <div class="col-md-6">
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" role="switch" 
                                       id="published" checked>
                                <label class="form-check-label fw-bold" for="published">
                                    <i class="bi bi-eye me-1"></i>Publish Announcements
                                </label>
                                <div class="form-text text-muted">
                                    <i class="bi bi-info-circle me-1"></i>
                                    Uncheck to create announcements as drafts
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <div class="d-grid">
                                <button type="button" class="btn btn-success" id="create-btn" disabled>
                                    <i class="bi bi-plus-circle me-2"></i>Create Announcements
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
                        <i class="bi bi-gear me-2"></i>Creating Announcements
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
    const prefix = titleInput.value.trim() || 'Announcement';
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
    courseHelp.style.visibility = showCourseError ? 'visible' : 'hidden';

    numItemsInput.classList.toggle('is-invalid', showCountError);
    numHelp.style.visibility = showCountError ? 'visible' : 'hidden';

    const isValid = cidResult.valid && cntResult.valid;
    createBtn.disabled = !isValid;

    // Update button text based on validation
    if (isValid) {
      const count = parseInt(numItemsInput.value) || 0;
      createBtn.innerHTML = `<i class="bi bi-plus-circle me-2"></i>Create ${count} Announcement${count !== 1 ? 's' : ''}`;
    } else {
      createBtn.innerHTML = `<i class="bi bi-plus-circle me-2"></i>Create Announcements`;
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

  courseIdInput.addEventListener('input', () => validate(true));
  numItemsInput.addEventListener('input', () => validate(true));
  validate();

  createBtn.addEventListener('click', async (ev) => {
    ev.preventDefault(); ev.stopPropagation();
    hasAttemptedSubmit = true;
    if (!validate(true)) return;

    const domain = document.querySelector('#domain').value.trim();
    const token = document.querySelector('#token').value.trim();
    const course_id = form.querySelector('#course-id').value.trim();
    const number = parseInt(form.querySelector('#num-items').value.trim(), 10) || 0;
    const title = form.querySelector('#title').value.trim() || 'Announcement';
    const message = form.querySelector('#message').value.trim();
    const published = form.querySelector('#published').checked;

    if (!course_id || number <= 0) {
      alert('Enter a Course ID and a positive number.');
      return;
    }

    createBtn.disabled = true;
    progressCard.hidden = false;
    resultsCard.hidden = true;
    progressInfo.textContent = 'Creating announcements...';
    progressBar.style.width = '0%';
    progressBar.setAttribute('aria-valuenow', '0');

    const responseDiv = resultsCard.querySelector('#response');
    responseDiv.innerHTML = '';

    try {
      const requests = [];
      for (let i = 1; i <= number; i++) {
        requests.push({
          domain, token, course_id,
          title: `${title} ${i}`,
          message,
          published,
          is_announcement: true
        });

        // Update progress
        const progress = Math.round((i / number) * 100);
        progressBar.style.width = `${progress}%`;
        progressBar.setAttribute('aria-valuenow', progress);
        progressDetail.textContent = `Preparing ${i} of ${number} announcements...`;
      }

      progressInfo.textContent = 'Sending requests to Canvas...';
      const res = await window.axios.createAnnouncements({ requests });

      // Show results
      progressCard.hidden = true;
      resultsCard.hidden = false;

      const successful = res.successful.length;
      const failed = res.failed ? res.failed.length : 0;

      let icon = 'bi bi-check-circle';
      let alertClass = 'alert-success';
      let message = '';

      if (failed === 0) {
        message = `<i class="${icon} me-2"></i><strong>Success!</strong> Created ${successful} announcement${successful !== 1 ? 's' : ''}.`;
      } else if (successful > 0) {
        icon = 'bi bi-exclamation-triangle';
        alertClass = 'alert-warning';
        message = `<i class="${icon} me-2"></i><strong>Partial Success:</strong> Created ${successful} announcement${successful !== 1 ? 's' : ''}, but ${failed} failed.`;
      } else {
        icon = 'bi bi-x-circle';
        alertClass = 'alert-danger';
        message = `<i class="${icon} me-2"></i><strong>Error:</strong> All announcements failed to create.`;
      }

      responseDiv.innerHTML = `<div class="alert ${alertClass}" role="alert">${message}</div>`;

    } catch (err) {
      progressCard.hidden = true;
      resultsCard.hidden = false;
      responseDiv.innerHTML = `
        <div class="alert alert-danger" role="alert">
          <i class="bi bi-exclamation-triangle me-2"></i><strong>Error:</strong> ${err?.message || String(err)}
        </div>
      `;
    } finally {
      createBtn.disabled = false;
    }
  });
}

window.announcementTemplate = announcementTemplate;
