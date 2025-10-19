// announcements_renderer.js - UI for creating and deleting Announcements (discussions with is_announcement)

// Helper function to create consistent error display across all announcement operations
function createAnnouncementErrorCard(failedItems, operationType = 'announcement') {
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
    const errorTitle = failedItem.isNetworkError ? 'Network Error' :
      failedItem.status ? `HTTP Error ${failedItem.status}` : 'Unknown Error';

    let errorDetail = '';
    if (failedItem.isNetworkError) {
      errorDetail = 'Cannot reach the server. Check your Canvas domain and internet connection.';
    } else if (failedItem.status) {
      switch (failedItem.status) {
        case 400:
          errorDetail = 'Bad request. Check that all required fields are filled out correctly.';
          break;
        case 401:
          errorDetail = 'Authentication failed. Check your API token.';
          break;
        case 403:
          errorDetail = 'Access forbidden. You may not have permission for this action.';
          break;
        case 404:
          errorDetail = 'Resource not found. Check your course ID.';
          break;
        case 422:
          errorDetail = 'Validation error. One or more fields contain invalid data.';
          break;
        default:
          errorDetail = 'An unexpected error occurred.';
      }
    }

    const itemLabel = errorCount === 1 ? '' : ` - ${operationType} ${failedItem.id}`;
    errorHTML += `
      <div class="border-start border-danger border-3 ps-3 mb-3">
        <h6 class="text-danger mb-2">${errorTitle}${itemLabel}</h6>
        <p class="mb-2"><strong>Error:</strong> <code>${failedItem.reason || 'Unknown error'}</code></p>
        <p class="mb-0 text-muted">${errorDetail}</p>
      </div>
    `;
  });

  errorHTML += `
        </div>
      </div>
    </div>
  `;

  return errorHTML;
}

function announcementTemplate(e) {
  switch (e.target.id) {
    case 'create-announcements':
      createAnnouncementsUI(e);
      break;
    case 'delete-announcements':
      deleteAnnouncementsUI(e);
      break;
    default:
      break;
  }
}

function createAnnouncementsUI(e) {
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
                                <i class="bi bi-pencil me-1"></i>Message (Required)
                            </label>
                            <input type="text" class="form-control" id="message" 
                                   placeholder="Required announcement body" />
                            <div class="form-text text-muted">
                                <i class="bi bi-info-circle me-1"></i>
                                Leave blank for announcements with just titles
                            </div>
                        </div>
                    </div>
                    
                    <div class="row g-3 mb-4">
                        <div class="col-md-6">
                            <label class="form-label fw-bold" for="delayed-post-at">
                                <i class="bi bi-calendar-event me-1"></i>Delay Posting Until (Optional)
                            </label>
                            <input type="datetime-local" class="form-control" id="delayed-post-at" />
                            <div id="delayed-post-help" class="form-text text-danger" style="min-height: 1.25rem; visibility: hidden;">
                                <i class="bi bi-exclamation-triangle me-1"></i>Delayed post date must be before lock date.
                            </div>
                            <div class="form-text text-muted">
                                <i class="bi bi-info-circle me-1"></i>
                                Announcements will be hidden until this date/time
                            </div>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold" for="lock-at">
                                <i class="bi bi-lock me-1"></i>Lock Announcements At (Optional)
                            </label>
                            <input type="datetime-local" class="form-control" id="lock-at" />
                            <div id="lock-at-help" class="form-text text-danger" style="min-height: 1.25rem; visibility: hidden;">
                                <i class="bi bi-exclamation-triangle me-1"></i>Lock date must be after delayed post date.
                            </div>
                            <div class="form-text text-muted">
                                <i class="bi bi-info-circle me-1"></i>
                                Prevents replies after this date/time
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

    // Get element references (inside if block since form was just created)
    const createBtn = form.querySelector('#create-btn');
    const progressCard = form.querySelector('#progress-card');
    const progressBar = form.querySelector('#progress-bar');
    const progressInfo = form.querySelector('#progress-info');
    const progressDetail = form.querySelector('#progress-detail');
    const resultsCard = form.querySelector('#results-card');
    const courseIdInput = form.querySelector('#course-id');
    const numItemsInput = form.querySelector('#num-items');
    const titleInput = form.querySelector('#title');
    const messageInput = form.querySelector('#message');
    const delayedPostInput = form.querySelector('#delayed-post-at');
    const lockAtInput = form.querySelector('#lock-at');
    const courseHelp = form.querySelector('#course-id-help');
    const numHelp = form.querySelector('#num-items-help');
    const delayedPostHelp = form.querySelector('#delayed-post-help');
    const lockAtHelp = form.querySelector('#lock-at-help');
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
    const messageValue = messageInput.value.trim();
    const hasMessage = messageValue.length > 0;

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

    // Validate dates: if both are set, delayed post must be before lock date
    let datesValid = true;
    const delayedPost = delayedPostInput.value;
    const lockAt = lockAtInput.value;
    
    if (delayedPost && lockAt) {
      const delayedDate = new Date(delayedPost);
      const lockDate = new Date(lockAt);
      datesValid = delayedDate < lockDate;
      
      const showDateError = showErrors && (hasAttemptedSubmit || touchedFields.has('delayed-post-at') || touchedFields.has('lock-at'));
      
      delayedPostInput.classList.toggle('is-invalid', showDateError && !datesValid);
      lockAtInput.classList.toggle('is-invalid', showDateError && !datesValid);
      delayedPostHelp.style.visibility = (showDateError && !datesValid) ? 'visible' : 'hidden';
      lockAtHelp.style.visibility = (showDateError && !datesValid) ? 'visible' : 'hidden';
    } else {
      delayedPostInput.classList.remove('is-invalid');
      lockAtInput.classList.remove('is-invalid');
      delayedPostHelp.style.visibility = 'hidden';
      lockAtHelp.style.visibility = 'hidden';
    }

    const isValid = cidResult.valid && cntResult.valid && datesValid && hasMessage;
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

  delayedPostInput.addEventListener('blur', () => {
    touchedFields.add('delayed-post-at');
    validate(true);
  });

  lockAtInput.addEventListener('blur', () => {
    touchedFields.add('lock-at');
    validate(true);
  });

  courseIdInput.addEventListener('input', () => validate(true));
  numItemsInput.addEventListener('input', () => validate(true));
  messageInput.addEventListener('input', () => validate(true));
  delayedPostInput.addEventListener('change', () => validate(true));
  lockAtInput.addEventListener('change', () => validate(true));
  validate();

  // Prevent concurrent executions
  let isCreating = false;

  createBtn.addEventListener('click', async (ev) => {
    ev.preventDefault(); ev.stopPropagation();
    
    // Prevent double-click or concurrent executions
    if (isCreating) {
      console.log('Already creating announcements, ignoring duplicate click');
      return;
    }
    
    hasAttemptedSubmit = true;
    if (!validate(true)) return;

    const domain = document.querySelector('#domain').value.trim();
    const token = document.querySelector('#token').value.trim();
    const course_id = form.querySelector('#course-id').value.trim();
    const number = parseInt(form.querySelector('#num-items').value.trim(), 10) || 0;
    const title = form.querySelector('#title').value.trim() || 'Announcement';
    const announcementMessage = form.querySelector('#message').value.trim();
    const delayedPostAt = form.querySelector('#delayed-post-at').value;
    const lockAt = form.querySelector('#lock-at').value;

    if (!course_id || number <= 0) {
      alert('Enter a Course ID and a positive number.');
      return;
    }

    // Set flag and disable button immediately
    isCreating = true;
    createBtn.disabled = true;
    progressCard.hidden = false;
    resultsCard.hidden = true;
    progressInfo.textContent = 'Creating announcements...';
    progressBar.style.width = '0%';
    progressBar.setAttribute('aria-valuenow', '0');

    const responseDiv = resultsCard.querySelector('#response');
    responseDiv.innerHTML = '';

    // Subscribe to progress updates
    const unsub = window.progressAPI?.onUpdateProgress?.((payload) => {
      try {
        if (typeof payload === 'number') {
          updateProgressWithPercent(progressBar, payload);
        } else if (payload && typeof payload === 'object') {
          if (typeof payload.value === 'number') {
            updateProgressWithPercent(progressBar, Math.round(Math.max(0, Math.min(1, payload.value)) * 100));
          }
          if (payload.label) {
            progressInfo.textContent = payload.label;
          }
        }
      } catch (e) {
        console.error('Progress update error:', e);
      }
    });

    try {
      // Prepare data payload for main.js to handle
      const requestData = {
        domain,
        token,
        course_id,
        number,
        title,
        message: announcementMessage
      };

      // Add optional date fields if provided (convert to ISO 8601 format)
      if (delayedPostAt) {
        requestData.delayed_post_at = new Date(delayedPostAt).toISOString();
      }
      if (lockAt) {
        requestData.lock_at = new Date(lockAt).toISOString();
      }

      // Send to main.js to handle the requests
      const res = await window.axios.createAnnouncements(requestData);

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

      // Build result with expandable error details if there are failures
      let resultHTML = `<div class="alert ${alertClass}" role="alert">${message}</div>`;
      
      if (failed > 0 && res.failed) {
        // Process failed items to include error categorization
        const processedFailures = res.failed.map(item => {
          const isNetworkError = /ENOTFOUND|ECONNREFUSED|ETIMEDOUT|network/i.test(item.reason || '');
          const statusMatch = (item.reason || '').match(/status code (\d+)/i);
          const status = statusMatch ? parseInt(statusMatch[1], 10) : null;
          
          return {
            id: item.id,
            reason: item.reason,
            status: status,
            isNetworkError: isNetworkError
          };
        });
        
        resultHTML += createAnnouncementErrorCard(processedFailures, 'announcement');
      }

      responseDiv.innerHTML = resultHTML;

    } catch (err) {
      progressCard.hidden = true;
      resultsCard.hidden = false;
      errorHandler(err, progressInfo, responseDiv);
    } finally {
      // Unsubscribe from progress updates
      if (unsub) unsub();
      // Reset flag and re-enable button
      isCreating = false;
      createBtn.disabled = false;
    }
  });
  } // End of if (!form) block - event listeners only added once
  
  form.hidden = false;
}

// Delete announcements UI
function deleteAnnouncementsUI(e) {
  hideEndpoints(e);
  
  const eContent = document.querySelector('#endpoint-content');
  let form = eContent.querySelector('#delete-announcements-form');
  
  if (!form) {
    form = document.createElement('form');
    form.id = 'delete-announcements-form';
    form.innerHTML = `
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-trash me-2"></i>Delete Course Announcements
                    </h3>
                    <small class="text-muted">Remove all announcements from a course</small>
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
                    </div>
                    
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <div class="d-grid">
                                <button type="button" class="btn btn-primary" id="fetch-btn" disabled>
                                    <i class="bi bi-search me-2"></i>Find Announcements
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Results Card -->
            <div class="card mt-3" id="results-card" hidden>
                <div class="card-header">
                    <h5 class="card-title mb-0">
                        <i class="bi bi-list-ul me-2"></i>Found Announcements
                    </h5>
                </div>
                <div class="card-body">
                    <div id="announcements-summary"></div>
                    <div id="announcements-list" class="mt-3" style="max-height: 400px; overflow-y: auto;"></div>
                    <div class="mt-3 d-flex gap-2">
                        <button type="button" class="btn btn-danger" id="delete-btn" disabled>
                            <i class="bi bi-trash me-2"></i>Delete All Announcements
                        </button>
                        <button type="button" class="btn btn-secondary" id="cancel-btn">
                            <i class="bi bi-x-circle me-2"></i>Cancel
                        </button>
                    </div>
                </div>
            </div>

            <!-- Progress Card -->
            <div class="card mt-3" id="progress-card" hidden>
                <div class="card-header">
                    <h5 class="card-title mb-0">
                        <i class="bi bi-gear me-2"></i>Processing
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

            <!-- Delete Results Card -->
            <div class="card mt-3" id="delete-results-card" hidden>
                <div class="card-body" id="delete-response"></div>
            </div>
        `;
    eContent.append(form);

    const fetchBtn = form.querySelector('#fetch-btn');
    const deleteBtn = form.querySelector('#delete-btn');
    const cancelBtn = form.querySelector('#cancel-btn');
    const resultsCard = form.querySelector('#results-card');
    const progressCard = form.querySelector('#progress-card');
    const deleteResultsCard = form.querySelector('#delete-results-card');
    const courseIdInput = form.querySelector('#course-id');
    const courseHelp = form.querySelector('#course-id-help');
    const announcementsSummary = form.querySelector('#announcements-summary');
    const announcementsList = form.querySelector('#announcements-list');
    const progressBar = form.querySelector('#progress-bar');
    const progressInfo = form.querySelector('#progress-info');
    const progressDetail = form.querySelector('#progress-detail');
    const deleteResponseDiv = form.querySelector('#delete-response');

    let foundAnnouncements = [];
    let hasAttemptedSubmit = false;
    const touchedFields = new Set();

    function isPositiveInt(val) {
      const trimmed = String(val).trim();
      if (trimmed === '') return { valid: false, isEmpty: true };
      const n = Number(trimmed);
      return { valid: Number.isInteger(n) && n > 0, isEmpty: false };
    }

    function validate(showErrors = false) {
    const cidResult = isPositiveInt(courseIdInput.value);

    const showCourseError = showErrors &&
      (hasAttemptedSubmit || touchedFields.has('course-id')) &&
      !cidResult.isEmpty &&
      !cidResult.valid;

    courseIdInput.classList.toggle('is-invalid', showCourseError);
    courseHelp.style.visibility = showCourseError ? 'visible' : 'hidden';

      fetchBtn.disabled = !cidResult.valid;
      return cidResult.valid;
    }

    courseIdInput.addEventListener('blur', () => {
      touchedFields.add('course-id');
      validate(true);
    });

    courseIdInput.addEventListener('input', () => validate(true));
    validate();

    cancelBtn.addEventListener('click', () => {
      resultsCard.hidden = true;
      foundAnnouncements = [];
      deleteBtn.disabled = true;
    });

    // Prevent concurrent fetch operations
    let isFetching = false;

    fetchBtn.addEventListener('click', async (ev) => {
      ev.preventDefault(); ev.stopPropagation();
      
      // Prevent double-click or concurrent executions
      if (isFetching) {
        console.log('Already fetching announcements, ignoring duplicate click');
        return;
      }
      
      hasAttemptedSubmit = true;
      if (!validate(true)) return;

      const domain = document.querySelector('#domain').value.trim();
      const token = document.querySelector('#token').value.trim();
      const course_id = courseIdInput.value.trim();

      // Set flag immediately
      isFetching = true;
      fetchBtn.disabled = true;
      progressCard.hidden = false;
      resultsCard.hidden = true;
      deleteResultsCard.hidden = true;
      progressInfo.textContent = 'Fetching announcements...';
      progressBar.style.width = '0%';
      progressBar.setAttribute('aria-valuenow', '0');
      progressDetail.textContent = 'Querying Canvas GraphQL API...';

      // Subscribe to progress updates
      const unsub = window.progressAPI?.onUpdateProgress?.((payload) => {
        try {
          if (payload && typeof payload === 'object' && payload.label) {
            progressInfo.textContent = payload.label;
          }
        } catch (e) {
          console.error('Progress update error:', e);
        }
      });

      try {
        // Main.js handles pagination and returns all announcements
        const response = await window.axios.getAnnouncements({
          domain,
          token,
          course_id
        });

        foundAnnouncements = response.announcements;
        progressCard.hidden = true;
        
        if (foundAnnouncements.length === 0) {
          announcementsSummary.innerHTML = `
            <div class="alert alert-info" role="alert">
              <i class="bi bi-info-circle me-2"></i>
              No announcements found in this course.
            </div>
          `;
          announcementsList.innerHTML = '';
          deleteBtn.disabled = true;
        } else {
          announcementsSummary.innerHTML = `
            <div class="alert alert-warning" role="alert">
              <i class="bi bi-exclamation-triangle me-2"></i>
              <strong>Found ${foundAnnouncements.length} announcement${foundAnnouncements.length !== 1 ? 's' : ''}.</strong>
              <br>Click "Delete All Announcements" to permanently remove them.
            </div>
          `;

          // Clear the list - we're only showing the count
          announcementsList.innerHTML = '';
          deleteBtn.disabled = false;
        }

        resultsCard.hidden = false;

      } catch (err) {
        progressCard.hidden = true;
        announcementsList.innerHTML = '';
        deleteBtn.disabled = true;
        resultsCard.hidden = false;
        errorHandler(err, progressInfo, announcementsSummary);
      } finally {
        // Unsubscribe from progress updates
        if (unsub) unsub();
        // Reset flag and re-enable button
        isFetching = false;
        fetchBtn.disabled = false;
      }
    });

    // Prevent concurrent delete operations
    let isDeleting = false;
    let currentOperationId = null;

    // Add cancel button to progress card
    const progressCardBody = progressCard.querySelector('.card-body');
    let cancelDeleteBtn = progressCard.querySelector('#cancel-delete-btn');
    if (!cancelDeleteBtn) {
      cancelDeleteBtn = document.createElement('button');
      cancelDeleteBtn.id = 'cancel-delete-btn';
      cancelDeleteBtn.className = 'btn btn-warning mt-3';
      cancelDeleteBtn.innerHTML = '<i class="bi bi-x-circle me-2"></i>Cancel Deletion';
      cancelDeleteBtn.hidden = true;
      progressCardBody.appendChild(cancelDeleteBtn);
    }

    deleteBtn.addEventListener('click', async () => {
      if (foundAnnouncements.length === 0) return;
      
      // Prevent double-click or concurrent executions
      if (isDeleting) {
        console.log('Already deleting announcements, ignoring duplicate click');
        return;
      }

      const domain = document.querySelector('#domain').value.trim();
      const token = document.querySelector('#token').value.trim();

      // Generate unique operation ID for this deletion
      currentOperationId = `delete-announcements-${Date.now()}`;

      // Set flag immediately
      isDeleting = true;
      deleteBtn.disabled = true;
      cancelBtn.disabled = true;
      cancelDeleteBtn.hidden = false;
      cancelDeleteBtn.disabled = false;
      resultsCard.hidden = true;
      progressCard.hidden = false;
      deleteResultsCard.hidden = true;
      progressInfo.textContent = 'Deleting announcements...';
      progressBar.style.width = '0%';
      progressBar.setAttribute('aria-valuenow', '0');

      // Subscribe to progress updates
      const unsub = window.progressAPI?.onUpdateProgress?.((payload) => {
        try {
          if (typeof payload === 'number') {
            updateProgressWithPercent(progressBar, payload);
          } else if (payload && typeof payload === 'object') {
            if (typeof payload.value === 'number') {
              updateProgressWithPercent(progressBar, Math.round(Math.max(0, Math.min(1, payload.value)) * 100));
            }
            if (payload.label) {
              progressInfo.textContent = payload.label;
            }
          }
        } catch (e) {
          console.error('Progress update error:', e);
        }
      });

      try {
        const res = await window.axios.deleteAnnouncementsGraphQL({
          domain,
          token,
          discussions: foundAnnouncements,
          operationId: currentOperationId
        });

        progressCard.hidden = true;
        cancelDeleteBtn.hidden = true;
        deleteResultsCard.hidden = false;

        const successful = res.successful.length;
        const failed = res.failed ? res.failed.length : 0;
        const wasCancelled = res.cancelled || false;

        let icon = 'bi bi-check-circle';
        let alertClass = 'alert-success';
        let message = '';

        if (wasCancelled) {
          icon = 'bi bi-exclamation-circle';
          alertClass = 'alert-warning';
          message = `<i class="${icon} me-2"></i><strong>Cancelled:</strong> Deleted ${successful} announcement${successful !== 1 ? 's' : ''} before cancellation. ${failed} were not processed.`;
        } else if (failed === 0) {
          message = `<i class="${icon} me-2"></i><strong>Success!</strong> Deleted ${successful} announcement${successful !== 1 ? 's' : ''}.`;
        } else if (successful > 0) {
          icon = 'bi bi-exclamation-triangle';
          alertClass = 'alert-warning';
          message = `<i class="${icon} me-2"></i><strong>Partial Success:</strong> Deleted ${successful} announcement${successful !== 1 ? 's' : ''}, but ${failed} failed.`;
        } else {
          icon = 'bi bi-x-circle';
          alertClass = 'alert-danger';
          message = `<i class="${icon} me-2"></i><strong>Error:</strong> All announcements failed to delete.`;
        }

        deleteResponseDiv.innerHTML = `<div class="alert ${alertClass}" role="alert">${message}</div>`;

        // Clear the found announcements only if not cancelled
        if (!wasCancelled) {
          foundAnnouncements = [];
        }

      } catch (err) {
        progressCard.hidden = true;
        cancelDeleteBtn.hidden = true;
        deleteResultsCard.hidden = false;
        errorHandler(err, progressInfo, deleteResponseDiv);
      } finally {
        // Unsubscribe from progress updates
        if (unsub) unsub();
        // Reset flag and re-enable buttons
        isDeleting = false;
        deleteBtn.disabled = false;
        cancelBtn.disabled = false;
        cancelDeleteBtn.hidden = true;
        currentOperationId = null;
      }
    });

    // Handle cancel deletion button
    cancelDeleteBtn.addEventListener('click', async () => {
      if (!currentOperationId || cancelDeleteBtn.disabled) return;
      
      // Disable button and update UI immediately
      cancelDeleteBtn.disabled = true;
      cancelDeleteBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Cancelling...';
      progressInfo.textContent = 'Cancelling...';
      
      try {
        await window.axios.cancelOperation(currentOperationId);
      } catch (err) {
        console.error('Error cancelling operation:', err);
        // Only re-enable if the operation is still running
        if (isDeleting) {
          cancelDeleteBtn.innerHTML = '<i class="bi bi-x-circle me-2"></i>Cancel Deletion';
          cancelDeleteBtn.disabled = false;
          progressInfo.textContent = 'Deleting announcements...';
        }
      }
    });
  }
  form.hidden = false;
}

// Export the main template function
window.announcementTemplate = announcementTemplate;
