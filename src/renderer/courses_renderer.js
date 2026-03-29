// ****************************************
//
// Course endpoints
//
// ****************************************

function courseTemplate(e) {
    switch (e.target.id) {
        case 'restore-content':
            restoreContent(e);
            break;
        case 'restore-courses':
            restoreCourses(e);
            break;
        case 'reset-courses':
            resetCourses(e);
            break;
        case 'publish-unpublish-courses':
            publishUnpublishCourses(e);
            break;
        case 'create-support-course':
            createSupportCourse(e);
            break;
        case 'create-associated-courses':
            createAssociatedCourses(e);
            break;
        default:
            break;
    }
}

async function restoreContent(e) {
    hideEndpoints(e);

    const eContent = document.querySelector('#endpoint-content');
    let restoreContentForm = eContent.querySelector('#restore-content-form');

    if (!restoreContentForm) {
        restoreContentForm = document.createElement('form');
        restoreContentForm.id = 'restore-content-form';
        restoreContentForm.innerHTML = `
            <style>
                #restore-content-form .card-title { font-size: 1.1rem; }
                #restore-content-form .card-header small { font-size: 0.7rem; }
                #restore-content-form .form-label { font-size: 0.85rem; }
                #restore-content-form .form-text { font-size: 0.7rem; }
                #restore-content-form .card-body { padding: 0.75rem; }
                #restore-content-form .btn { padding: 0.35rem 0.75rem; font-size: 0.85rem; }
                #restore-content-form .form-control,
                #restore-content-form .form-select { font-size: 0.85rem; padding: 0.25rem 0.5rem; }
                #restore-content-form .bi { font-size: 0.9rem; }
                #restore-content-form .mt-3 { margin-top: 0.5rem !important; }
                #restore-content-form .progress { height: 12px; }
            </style>
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-arrow-counterclockwise me-1"></i>Restore Content
                    </h3>
                    <small class="text-muted">Restore deleted course content by providing content IDs</small>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-auto">
                            <label class="form-label">Course</label>
                        </div>
                        <div class="w-100"></div>
                        <div class="col-2">
                            <input id="course-id" type="text" class="form-control form-control-sm" aria-describedby="input-checker" />
                        </div>
                        <div class="col-auto" >
                            <span id="input-checker" class="form-text" style="display: none;">Must only contain numbers</span>
                        </div>
                        <div class="mt-2">
                            <div class="card">
                                <div class="card-header bg-light d-flex justify-content-between align-items-center py-1 px-3">
                                    <label class="form-label mb-0">Content Types</label>
                                    <div class="d-flex gap-2">
                                        <button type="button" class="btn btn-outline-primary btn-sm" id="rcf-select-all-btn">Select All</button>
                                        <button type="button" class="btn btn-outline-secondary btn-sm" id="rcf-clear-all-btn">Clear All</button>
                                    </div>
                                </div>
                                <div class="card-body p-0">
                                    <div class="list-group list-group-flush" id="rcf-content-type-list">
                                        <label class="list-group-item list-group-item-action d-flex align-items-center py-1 px-3">
                                            <input class="form-check-input me-2 rcf-type-check" type="checkbox" value="assignment_">
                                            <span class="flex-grow-1">Assignment</span>
                                            <input type="number" class="form-control form-control-sm rcf-type-qty" style="width:60px" min="1" max="999" value="1" disabled>
                                        </label>
                                        <label class="list-group-item list-group-item-action d-flex align-items-center py-1 px-3">
                                            <input class="form-check-input me-2 rcf-type-check" type="checkbox" value="assignment_group_">
                                            <span class="flex-grow-1">Assignment Group</span>
                                            <input type="number" class="form-control form-control-sm rcf-type-qty" style="width:60px" min="1" max="999" value="1" disabled>
                                        </label>
                                        <label class="list-group-item list-group-item-action d-flex align-items-center py-1 px-3">
                                            <input class="form-check-input me-2 rcf-type-check" type="checkbox" value="discussion_topic_">
                                            <span class="flex-grow-1">Announcement</span>
                                            <input type="number" class="form-control form-control-sm rcf-type-qty" style="width:60px" min="1" max="999" value="1" disabled>
                                        </label>
                                        <label class="list-group-item list-group-item-action d-flex align-items-center py-1 px-3">
                                            <input class="form-check-input me-2 rcf-type-check" type="checkbox" value="discussion_topic_">
                                            <span class="flex-grow-1">Discussion</span>
                                            <input type="number" class="form-control form-control-sm rcf-type-qty" style="width:60px" min="1" max="999" value="1" disabled>
                                        </label>
                                        <label class="list-group-item list-group-item-action d-flex align-items-center py-1 px-3">
                                            <input class="form-check-input me-2 rcf-type-check" type="checkbox" value="quiz_">
                                            <span class="flex-grow-1">Quiz</span>
                                            <input type="number" class="form-control form-control-sm rcf-type-qty" style="width:60px" min="1" max="999" value="1" disabled>
                                        </label>
                                        <label class="list-group-item list-group-item-action d-flex align-items-center py-1 px-3">
                                            <input class="form-check-input me-2 rcf-type-check" type="checkbox" value="wiki_page_">
                                            <span class="flex-grow-1">Page</span>
                                            <input type="number" class="form-control form-control-sm rcf-type-qty" style="width:60px" min="1" max="999" value="1" disabled>
                                        </label>
                                        <label class="list-group-item list-group-item-action d-flex align-items-center py-1 px-3">
                                            <input class="form-check-input me-2 rcf-type-check" type="checkbox" value="context_module_">
                                            <span class="flex-grow-1">Module</span>
                                            <input type="number" class="form-control form-control-sm rcf-type-qty" style="width:60px" min="1" max="999" value="1" disabled>
                                        </label>
                                        <label class="list-group-item list-group-item-action d-flex align-items-center py-1 px-3">
                                            <input class="form-check-input me-2 rcf-type-check" type="checkbox" value="rubric_">
                                            <span class="flex-grow-1">Rubric</span>
                                            <input type="number" class="form-control form-control-sm rcf-type-qty" style="width:60px" min="1" max="999" value="1" disabled>
                                        </label>
                                        <label class="list-group-item list-group-item-action d-flex align-items-center py-1 px-3">
                                            <input class="form-check-input me-2 rcf-type-check" type="checkbox" value="group_">
                                            <span class="flex-grow-1">Individual Group</span>
                                            <input type="number" class="form-control form-control-sm rcf-type-qty" style="width:60px" min="1" max="999" value="1" disabled>
                                        </label>
                                        <label class="list-group-item list-group-item-action d-flex align-items-center py-1 px-3">
                                            <input class="form-check-input me-2 rcf-type-check" type="checkbox" value="group_category_">
                                            <span class="flex-grow-1">Entire Group Set</span>
                                            <input type="number" class="form-control form-control-sm rcf-type-qty" style="width:60px" min="1" max="999" value="1" disabled>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div id="restore-ids-div" class="mt-2">
                            <span>Enter comma separated IDs of the content you want to restore</span>
                            <textarea class="form-control form-control-sm" id="restore-content-area" rows="3"></textarea>
                        </div>
                    </div>
                    <button type="button" class="btn btn-sm btn-primary mt-2" id="restore-btn" disabled>Restore</button>
                    <div id="rcf-progress-div" hidden>
                        <p id="rcf-progress-info"></p>
                        <div class="progress mt-2" style="width: 75%" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                            <div class="progress-bar" style="width: 0%"></div>
                        </div>
                    </div>
                    <div id='rcf-response-container'></div>
                </div>
            </div>`

        eContent.append(restoreContentForm);
    }
    restoreContentForm.hidden = false;

    if (restoreContentForm.dataset.bound === 'true') return;
    restoreContentForm.dataset.bound = 'true';

    const courseID = restoreContentForm.querySelector('#course-id');
    courseID.addEventListener('change', (e) => {
        e.preventDefault();
        e.stopPropagation();

        checkCourseID(courseID, eContent);
    });

    // checkCourseID function - validates course ID input and provides feedback
    function checkCourseID(courseIDField, container) {
        const trimmedValue = courseIDField.value.trim();
        const isValid = !isNaN(Number(trimmedValue)) && Number(trimmedValue) > 0 && Number.isInteger(Number(trimmedValue));

        // Find or create validation feedback element
        let feedbackElement = container.querySelector('#course-id-feedback');
        if (!feedbackElement) {
            feedbackElement = document.createElement('div');
            feedbackElement.id = 'course-id-feedback';
            feedbackElement.className = 'invalid-feedback';
            feedbackElement.style.display = 'none';
            feedbackElement.style.color = '#dc3545';
            feedbackElement.style.fontSize = '0.875rem';
            feedbackElement.style.marginTop = '0.25rem';
            courseIDField.parentNode.appendChild(feedbackElement);
        }

        if (trimmedValue === '') {
            // Empty field - clear validation
            courseIDField.classList.remove('is-invalid', 'is-valid');
            feedbackElement.style.display = 'none';
        } else if (isValid) {
            // Valid course ID
            courseIDField.classList.remove('is-invalid');
            courseIDField.classList.add('is-valid');
            feedbackElement.style.display = 'none';
        } else {
            // Invalid course ID
            courseIDField.classList.remove('is-valid');
            courseIDField.classList.add('is-invalid');
            feedbackElement.textContent = 'Course ID must be a positive number';
            feedbackElement.style.display = 'block';
        }
    }

    // Content type checkbox handling
    const rcfTypeList = restoreContentForm.querySelector('#rcf-content-type-list');
    const rcfAllCheckboxes = rcfTypeList.querySelectorAll('.rcf-type-check');
    const rcfAllQtyInputs = rcfTypeList.querySelectorAll('.rcf-type-qty');
    const rcfSelectAllBtn = restoreContentForm.querySelector('#rcf-select-all-btn');
    const rcfClearAllBtn = restoreContentForm.querySelector('#rcf-clear-all-btn');

    rcfAllCheckboxes.forEach((cb, i) => {
        cb.addEventListener('change', () => {
            rcfAllQtyInputs[i].disabled = !cb.checked;
            if (!cb.checked) rcfAllQtyInputs[i].value = '1';
        });
    });

    rcfAllQtyInputs.forEach(input => {
        input.addEventListener('click', (e) => e.stopPropagation());
    });

    rcfSelectAllBtn.addEventListener('click', (e) => {
        e.preventDefault();
        rcfAllCheckboxes.forEach((cb, i) => {
            cb.checked = true;
            rcfAllQtyInputs[i].disabled = false;
        });
    });

    rcfClearAllBtn.addEventListener('click', (e) => {
        e.preventDefault();
        rcfAllCheckboxes.forEach((cb, i) => {
            cb.checked = false;
            rcfAllQtyInputs[i].disabled = true;
            rcfAllQtyInputs[i].value = '1';
        });
    });

    const restoreBtn = restoreContentForm.querySelector('#restore-btn');
    restoreBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();

        restoreBtn.disabled = true;

        const rcfResponseContainer = restoreContentForm.querySelector('#rcf-response-container');
        const domain = document.querySelector('#domain').value.trim();
        const token = document.querySelector('#token').value.trim();
        const courseID = restoreContentForm.querySelector('#course-id').value.trim();
        const selectedTypes = Array.from(restoreContentForm.querySelectorAll('.rcf-type-check:checked'));
        const contextIDs = restoreContentForm.querySelector('#restore-content-area').value;
        const rcfProgressDiv = restoreContentForm.querySelector('#rcf-progress-div');
        const rcfProgressBar = rcfProgressDiv.querySelector('.progress-bar');
        const rcfProgressInfo = restoreContentForm.querySelector('#rcf-progress-info');

        if (selectedTypes.length === 0) {
            rcfProgressDiv.hidden = false;
            rcfProgressInfo.innerHTML = 'Please select at least one content type.';
            restoreBtn.disabled = false;
            return;
        }

        const valueArray = contextIDs.split(',').map(value => value.trim()).filter(value => value !== '');

        // clean environment
        rcfProgressDiv.hidden = false;
        rcfProgressBar.parentElement.hidden = true;
        updateProgressWithPercent(rcfProgressBar, 0);
        rcfProgressInfo.innerHTML = "Checking...";

        try {
            for (const cb of selectedTypes) {
                const data = {
                    domain,
                    token,
                    context: cb.value,
                    courseID,
                    values: valueArray
                };
                console.log(data);
                await window.axios.restoreContent(data);
            }
            rcfResponseContainer.innerHTML = 'Successfully restored content.';
        } catch (error) {
            errorHandler(error, rcfProgressInfo);
        } finally {
            restoreBtn.disabled = false;
        }
    });
}

async function restoreCourses(e) {
    hideEndpoints(e);

    const eContent = document.querySelector('#endpoint-content');
    let restoreCourseForm = eContent.querySelector('#restore-course-form');
    const restoreFormJustCreated = !restoreCourseForm;

    if (!restoreCourseForm) {
        restoreCourseForm = document.createElement('form');
        restoreCourseForm.id = 'restore-course-form';

        restoreCourseForm.innerHTML = `
            <style>
                #restore-course-form .card { font-size: 0.875rem; }
                #restore-course-form .card-header h3 { font-size: 1.1rem; margin-bottom: 0.25rem; }
                #restore-course-form .card-header small { font-size: 0.75rem; }
                #restore-course-form .card-body { padding: 0.75rem; }
                #restore-course-form .form-label,
                #restore-course-form .form-check-label { font-size: 0.8rem; margin-bottom: 0.25rem; }
                #restore-course-form .form-control { font-size: 0.8rem; padding: 0.25rem 0.5rem; }
                #restore-course-form .btn { font-size: 0.8rem; padding: 0.35rem 0.75rem; }
                #restore-course-form .form-check { margin-bottom: 0.5rem; }
                #restore-course-form .form-text { font-size: 0.7rem; margin-top: 0.15rem; }
                #restore-course-form .mt-2 { margin-top: 0.5rem !important; }
                #restore-course-form .mt-3 { margin-top: 0.75rem !important; }
                #restore-course-form .mb-2 { margin-bottom: 0.5rem !important; }
                #restore-course-form .mb-3 { margin-bottom: 0.75rem !important; }
                #restore-course-form .progress { height: 12px !important; }
                #restore-course-form h5 { font-size: 1rem; }
                #restore-course-form h6 { font-size: 0.9rem; }
                #restore-course-form p { margin-bottom: 0.5rem; font-size: 0.85rem; }
                #restore-course-form .alert { padding: 0.5rem 0.75rem; font-size: 0.8rem; }
                #restore-course-form .badge { font-size: 0.75rem; }
                #restore-course-form hr { margin: 0.5rem 0; }
            </style>
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-arrow-counterclockwise me-1"></i>Restore Courses
                    </h3>
                    <small class="text-muted">Restore deleted courses by undeleting them in Canvas</small>
                </div>
                <div class="card-body" id="restore-controls-body">
                    <div class="row">
                        <div class="mb-2" id="restore-switches">
                            <div class="form-check form-switch">
                                <label class="form-check-label" for="upload-restore-courses-switch">Upload file of courses to restore</label>
                                <input class="form-check-input" type="checkbox" role="switch" id="upload-restore-courses-switch">
                            </div>
                            <div class="form-check form-switch">
                                <label class="form-check-label" for="manual-restore-courses-switch">Manually enter list of courses</label>
                                <input class="form-check-input" type="checkbox" role="switch" id="manual-restore-courses-switch">
                            </div>
                        </div>
                        <div id="restore-course-text-div" hidden>
                            <textarea class="form-control form-control-sm" id="restore-courses-area" rows="3" placeholder="course1,course2,course3, etc."></textarea>
                        </div>
                    </div>
                    <button type="button" class="btn btn-sm btn-primary mt-2" id="restoreBtn" disabled hidden>Restore</button>
                    <button type="button" class="btn btn-sm btn-primary mt-2" id="restoreUploadBtn" disabled hidden>Upload</button>
                    <div id="restore-upload-confirm-div" hidden></div>
                </div>
            </div>

            <!-- Progress Card -->
            <div class="card mt-2" id="restore-progress-div" hidden>
                <div class="card-header py-2">
                    <h5 class="card-title mb-0">
                        <i class="bi bi-gear me-1"></i><span id="restore-progress-title">Processing</span>
                    </h5>
                </div>
                <div class="card-body py-2">
                    <p id="restore-progress-info" class="mb-1"></p>
                    <div class="progress mb-1">
                        <div class="progress-bar progress-bar-striped progress-bar-animated" style="width: 0%" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                    <button type="button" class="btn btn-sm btn-outline-danger mt-2" id="restore-courses-cancel-btn" hidden>
                        <i class="bi bi-x-circle me-1"></i>Cancel
                    </button>
                </div>
            </div>

            <!-- Results Card -->
            <div class="card mt-2" id="restore-results-card" hidden>
                <div class="card-body p-0" id="restore-results-body"></div>
            </div>`;

        eContent.append(restoreCourseForm);
    }
    restoreCourseForm.hidden = false;

    const progressDiv = restoreCourseForm.querySelector('#restore-progress-div');
    const progressBar = progressDiv.querySelector('.progress-bar');
    const progressTitle = restoreCourseForm.querySelector('#restore-progress-title');
    const progressInfo = restoreCourseForm.querySelector('#restore-progress-info');
    const restoreBtn = restoreCourseForm.querySelector('#restoreBtn');
    const uploadBtn = restoreCourseForm.querySelector('#restoreUploadBtn');
    const resultsCard = restoreCourseForm.querySelector('#restore-results-card');
    const resultsBody = restoreCourseForm.querySelector('#restore-results-body');
    const confirmDiv = restoreCourseForm.querySelector('#restore-upload-confirm-div');

    // Render a 4-part summary card after restore completes.
    // response: { successfulCount, failed: [{ids, message}], cancelledByUser }
    // checkSummary: { totalChecked, notDeletedCount, checkErrorCount, checkErrors }
    function renderRestoreResults(response, checkSummary = {}) {
        const { totalChecked = 0, notDeletedCount = 0, checkErrorCount = 0, checkErrors = [] } = checkSummary;
        const successCount = response.successfulCount ?? 0;
        const failedBatches = response.failed ?? [];
        const failCount = failedBatches.flatMap(b => b.ids ?? []).length;
        const cancelledByUser = response.cancelledByUser ?? false;

        const hasExtras = checkErrorCount > 0 || cancelledByUser;

        // Summary card (comm-channels style)
        let html = `
            <div class="card mb-0">
                <div class="card-header bg-primary text-white">
                    <h5 class="card-title mb-0">
                        <i class="bi bi-check-circle me-2"></i>Restore Summary
                    </h5>
                </div>
                <div class="card-body">
                    <p class="mb-3"><strong>Total courses processed:</strong> <span class="badge bg-primary">${totalChecked}</span></p>
                    <hr class="my-3">
                    <p class="mb-2">
                        <i class="bi bi-arrow-right-circle text-warning me-2"></i>
                        <strong>Not deleted (skipped):</strong> ${notDeletedCount}
                    </p>
                    <p class="mb-2">
                        <i class="bi bi-check-circle-fill text-success me-2"></i>
                        <strong>Successfully restored:</strong> ${successCount}
                    </p>
                    <p class="${hasExtras ? 'mb-2' : 'mb-0'}">
                        <i class="bi bi-x-circle-fill ${failCount > 0 ? 'text-danger' : 'text-secondary'} me-2"></i>
                        <strong>Failed to restore:</strong> ${failCount}
                    </p>
                    ${checkErrorCount > 0 ? `<p class="${cancelledByUser || checkErrors.length > 0 ? 'mb-2' : 'mb-0'}">
                        <i class="bi bi-question-circle text-warning me-2"></i>
                        <strong>Could not verify state:</strong> ${checkErrorCount}
                    </p>` : ''}
                    ${checkErrors.length > 0 ? `<div class="${cancelledByUser ? 'mb-2' : 'mb-0'}">
                        <i class="bi bi-exclamation-triangle text-danger me-2"></i>
                        <strong>Check errors:</strong>
                        <ul class="mb-0 mt-1" style="font-size:0.8rem;">
                            ${[...new Set(checkErrors.map(e => e.message || 'Unknown error'))].map(msg => `<li>${msg}</li>`).join('')}
                        </ul>
                    </div>` : ''}
                    ${cancelledByUser ? `<p class="mb-0">
                        <i class="bi bi-slash-circle text-warning me-2"></i>
                        <strong>Cancelled by user</strong>
                    </p>` : ''}
                </div>
            </div>`;

        // Failures card
        if (failedBatches.length > 0) {
            html += `
            <div class="card mt-2 mb-0 border-danger">
                <div class="card-header bg-danger text-white">
                    <h5 class="card-title mb-0">
                        <i class="bi bi-exclamation-triangle me-2"></i>Restore Failures
                    </h5>
                </div>
                <div class="card-body">
                    <ul class="mb-2">`;
            for (const b of failedBatches) {
                const ids = (b.ids ?? []).join(', ');
                const msg = b.message ?? 'Unknown error';
                html += `<li><strong>[${ids}]:</strong> ${msg}</li>`;
            }
            html += `</ul>
                    <button type="button" class="btn btn-sm btn-outline-danger" id="restore-failures-csv-btn">
                        <i class="bi bi-download me-1"></i>Download failures CSV
                    </button>
                </div>
            </div>`;
        }

        resultsBody.innerHTML = html;
        resultsCard.hidden = false;

        if (failedBatches.length > 0) {
            const dlBtn = resultsBody.querySelector('#restore-failures-csv-btn');
            dlBtn.addEventListener('click', async () => {
                try {
                    dlBtn.disabled = true;
                    dlBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Saving...';
                    const csvData = failedBatches.flatMap(b =>
                        (b.ids ?? []).map(id => ({ course_id: id, message: b.message ?? '' }))
                    );
                    const fileName = `restore_courses_failures_${new Date().toISOString().slice(0, 10)}.csv`;
                    const result = await window.csv.sendToCSV({ fileName, data: csvData, showSaveDialog: true });
                    if (result?.filePath) {
                        dlBtn.innerHTML = '<i class="bi bi-check me-1"></i>Downloaded';
                        dlBtn.classList.replace('btn-outline-danger', 'btn-success');
                    } else {
                        dlBtn.disabled = false;
                        dlBtn.innerHTML = '<i class="bi bi-download me-1"></i>Download failures CSV';
                    }
                } catch (err) {
                    console.error('Error saving failures CSV:', err);
                    dlBtn.disabled = false;
                    dlBtn.innerHTML = '<i class="bi bi-x me-1"></i>Download failed';
                    dlBtn.classList.replace('btn-outline-danger', 'btn-danger');
                }
            });
        }
    }

    // Helper: wire up the cancel button for in-progress operations
    function setupCancelBtn(cancelBtn) {
        cancelBtn.hidden = false;
        cancelBtn.disabled = false;
        cancelBtn.innerHTML = '<i class="bi bi-x-circle me-1"></i>Cancel';
        cancelBtn.onclick = async () => {
            cancelBtn.disabled = true;
            cancelBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Cancelling...';
            progressInfo.innerHTML = 'Cancelling... letting in-flight requests finish.';
            try {
                await window.axios.cancelRestoreCourses();
            } catch (err) {
                console.error('Error cancelling restore courses:', err);
            }
        };
    }

    // Helper: check deleted states then show confirmation before restoring.
    // Both the upload and manual buttons call this after getting raw course IDs.
    async function runCheckAndConfirm(courseIds, triggerBtn) {
        const domain = document.querySelector('#domain').value.trim();
        const apiToken = document.querySelector('#token').value.trim();
        const total = courseIds.length;

        // --- Phase 1: Check deleted state for all courses ---
        resultsCard.hidden = true;
        resultsBody.innerHTML = '';
        confirmDiv.hidden = true;
        confirmDiv.innerHTML = '';
        progressDiv.hidden = false;
        progressBar.style.width = '0%';
        progressTitle.textContent = 'Checking Course States';
        progressInfo.innerHTML = `0 / ${total} checked`;

        let checkResult;
        try {
            window.progressAPI.removeAllProgressListeners();
            const unsub = window.progressAPI.onUpdateProgress((payload) => {
                const pct = typeof payload === 'number' ? payload : 0;
                const done = Math.min(Math.round(pct / 100 * total), total);
                progressInfo.innerHTML = `${done} / ${total} checked`;
                progressBar.style.width = `${pct}%`;
            });
            checkResult = await window.axios.checkCoursesDeleted({ domain, token: apiToken, courseIds });
            unsub();
        } catch (err) {
            progressDiv.hidden = true;
            progressInfo.innerHTML = '';
            errorHandler(err, progressInfo);
            progressDiv.hidden = false;
            triggerBtn.disabled = false;
            return;
        }

        progressDiv.hidden = true;

        const { deleted = [], notDeleted = [], errors: checkErrors = [] } = checkResult;
        const deletedCount = deleted.length;
        const notDeletedCount = notDeleted.length;
        const checkErrorCount = checkErrors.length;

        // --- Phase 2: Show confirmation with check summary ---

        // Deduplicate check error messages for display
        const uniqueCheckErrors = checkErrors.length > 0
            ? [...new Set(checkErrors.map(e => e.message || 'Unknown error'))]
            : [];

        let confirmHtml = `
            <div class="alert ${checkErrorCount > 0 && deletedCount === 0 && notDeletedCount === 0 ? 'alert-danger' : 'alert-info'} py-2 mb-2 mt-2" style="font-size:0.85rem;">
                <strong>Check Complete</strong> &mdash; ${total} course${total !== 1 ? 's' : ''} checked:
                <ul class="mb-0 mt-1">
                    <li><strong>${deletedCount}</strong> deleted &rarr; will be restored</li>
                    <li><strong>${notDeletedCount}</strong> not deleted &rarr; will be skipped</li>
                    ${checkErrorCount > 0 ? `<li class="text-danger"><strong>${checkErrorCount}</strong> could not be verified (will be skipped)</li>` : ''}
                </ul>
                ${uniqueCheckErrors.length > 0 ? `
                <hr class="my-2">
                <strong>Error details:</strong>
                <ul class="mb-0 mt-1">
                    ${uniqueCheckErrors.map(msg => `<li class="text-danger">${msg}</li>`).join('')}
                </ul>` : ''}
            </div>`;

        if (deletedCount === 0) {
            const alertType = checkErrorCount > 0 ? 'alert-danger' : 'alert-warning';
            const alertMsg = checkErrorCount > 0
                ? `All ${checkErrorCount} course${checkErrorCount !== 1 ? 's' : ''} failed verification. Check your domain and token.`
                : 'No deleted courses found. Nothing to restore.';
            confirmHtml += `<div class="alert ${alertType} py-2" style="font-size:0.85rem;">
                ${alertMsg}
            </div>
            <button type="button" class="btn btn-sm btn-secondary" id="confirm-check-dismiss-btn">Dismiss</button>`;
            confirmDiv.innerHTML = confirmHtml;
            confirmDiv.hidden = false;
            confirmDiv.querySelector('#confirm-check-dismiss-btn').addEventListener('click', () => {
                confirmDiv.hidden = true;
                confirmDiv.innerHTML = '';
                triggerBtn.disabled = false;
            }, { once: true });
            return;
        }

        confirmHtml += `
            <button type="button" class="btn btn-sm btn-primary me-2" id="confirm-do-restore-btn">
                <i class="bi bi-arrow-counterclockwise me-1"></i>Restore ${deletedCount} course${deletedCount !== 1 ? 's' : ''}
            </button>
            <button type="button" class="btn btn-sm btn-secondary" id="confirm-do-cancel-btn">Cancel</button>`;
        confirmDiv.innerHTML = confirmHtml;
        confirmDiv.hidden = false;

        confirmDiv.querySelector('#confirm-do-cancel-btn').addEventListener('click', () => {
            confirmDiv.hidden = true;
            confirmDiv.innerHTML = '';
            triggerBtn.disabled = false;
        }, { once: true });

        confirmDiv.querySelector('#confirm-do-restore-btn').addEventListener('click', async () => {
            confirmDiv.hidden = true;
            confirmDiv.innerHTML = '';
            await runRestore(
                deleted.map(d => d.id),
                triggerBtn,
                { totalChecked: total, notDeletedCount, checkErrorCount, checkErrors }
            );
        }, { once: true });
    }

    // Helper: run the actual restore after course IDs are confirmed
    async function runRestore(courseIds, triggerBtn, checkSummary = {}) {
        const domain = document.querySelector('#domain').value.trim();
        const apiToken = document.querySelector('#token').value.trim();
        const total = courseIds.length;
        const totalBatches = Math.ceil(total / 100);

        resultsCard.hidden = true;
        resultsBody.innerHTML = '';
        progressDiv.hidden = false;
        progressBar.style.width = '0%';
        progressTitle.textContent = 'Restoring Courses';
        progressInfo.innerHTML = `Batch 0 of ${totalBatches}`;

        const cancelBtn = progressDiv.querySelector('#restore-courses-cancel-btn');
        setupCancelBtn(cancelBtn);

        const data = { domain, token: apiToken, courseIds };

        let response;
        try {
            window.progressAPI.removeAllProgressListeners();
            window.progressAPI.onUpdateProgress((progress) => {
                const pct = typeof progress === 'number' ? progress : 0;
                const batchesCompleted = Math.min(Math.round(pct / 100 * totalBatches), totalBatches);
                progressInfo.innerHTML = `Batch ${batchesCompleted} of ${totalBatches}`;
                progressBar.style.width = `${pct}%`;
            });

            response = await window.axios.restoreCourses(data);
            progressDiv.hidden = true;
            renderRestoreResults(response, checkSummary);
        } catch (error) {
            errorHandler(error, progressInfo);
        } finally {
            triggerBtn.disabled = false;
            cancelBtn.hidden = true;
            cancelBtn.disabled = true;
            cancelBtn.innerHTML = '<i class="bi bi-x-circle me-1"></i>Cancel';
        }
    }

    // --- Switch toggling ---
    const switches = restoreCourseForm.querySelector('#restore-switches');
    const courseTextDiv = restoreCourseForm.querySelector('#restore-course-text-div');
    const courseTextArea = restoreCourseForm.querySelector('#restore-courses-area');

    // Only attach event listeners once (when the form is first created)
    if (restoreFormJustCreated) {
        courseTextArea.addEventListener('input', () => {
            const manualSwitch = restoreCourseForm.querySelector('#manual-restore-courses-switch');
            restoreBtn.disabled = courseTextArea.value.trim().length < 1 || !manualSwitch.checked;
        });

        switches.addEventListener('change', (e) => {
            const inputs = switches.querySelectorAll('input');
            for (const input of inputs) {
                if (input.id !== e.target.id) input.checked = false;
            }
            if (!e.target.checked) {
                restoreBtn.disabled = true;
                uploadBtn.disabled = true;
            } else if (e.target.id === 'upload-restore-courses-switch') {
                restoreBtn.disabled = true;
                restoreBtn.hidden = true;
                courseTextDiv.hidden = true;
                uploadBtn.disabled = false;
                uploadBtn.hidden = false;
            } else {
                restoreBtn.hidden = false;
                courseTextDiv.hidden = false;
                uploadBtn.disabled = true;
                uploadBtn.hidden = true;
                restoreBtn.disabled = courseTextArea.value.trim().length < 1;
            }
        });

        // --- Upload button ---
        uploadBtn.addEventListener('click', async () => {
            uploadBtn.disabled = true;
            progressDiv.hidden = true;
            confirmDiv.hidden = true;
            confirmDiv.innerHTML = '';

            let courseIds = [];
            try {
                courseIds = await window.fileUpload.restoreCoursesFile();
            } catch (error) {
                uploadBtn.disabled = false;
                progressDiv.hidden = false;
                errorHandler(error, progressInfo);
                return;
            }

            if (!courseIds || courseIds.length === 0) {
                uploadBtn.disabled = false;
                return;
            }

            await runCheckAndConfirm(courseIds, uploadBtn);
        });

        // --- Manual restore button ---
        restoreBtn.addEventListener('click', async () => {
            const rawInput = courseTextArea.value;
            const courseIds = rawInput.split(/[\n,]/).map(s => s.trim()).filter(s => s.length > 0);
            if (courseIds.length === 0) return;

            restoreBtn.disabled = true;
            await runCheckAndConfirm(courseIds, restoreBtn);
        });
    }
}

async function resetCourses(e) {
    hideEndpoints(e);

    const eContent = document.querySelector('#endpoint-content');
    let resetCourseForm = eContent.querySelector('#reset-course-form');
    const resetFormJustCreated = !resetCourseForm;

    if (!resetCourseForm) {
        resetCourseForm = document.createElement('form');
        resetCourseForm.id = 'reset-course-form';

        // eContent.innerHTML = `
        //     <div>
        //         <h3>Reset Courses</h3>
        //     </div>
        // `;

        // const eForm = document.createElement('form');


        resetCourseForm.innerHTML = `
            <style>
                #reset-course-form .card-title { font-size: 1.1rem; }
                #reset-course-form .card-header small { font-size: 0.7rem; }
                #reset-course-form .form-label,
                #reset-course-form .form-check-label { font-size: 0.85rem; }
                #reset-course-form .form-text { font-size: 0.7rem; }
                #reset-course-form .card-body { padding: 0.75rem; }
                #reset-course-form .btn { padding: 0.35rem 0.75rem; font-size: 0.85rem; }
                #reset-course-form .form-control { font-size: 0.85rem; padding: 0.25rem 0.5rem; }
                #reset-course-form .bi { font-size: 0.9rem; }
                #reset-course-form .mb-3 { margin-bottom: 0.5rem !important; }
                #reset-course-form .mt-3 { margin-top: 0.5rem !important; }
                #reset-course-form .progress { height: 12px; }
            </style>
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-arrow-clockwise me-1"></i>Reset Courses
                    </h3>
                    <small class="text-muted">Reset course content and settings to default state</small>
                </div>
                <div class="card-body">
                <div class="row">
                    <div class="mb-2" id="reset-switches">
                        <div class="form-check form-switch">
                            <label class="form-check-label" for="course-reset-file">Upload file of courses to reset</label>
                            <input class="form-check-input" type="checkbox" role="switch" id="upload-courses-switch" aria-describedby="course-reset-description">
                            <div id="course-reset-description" class="form-text" hidden>Must be a simple text file only containing a list of courses. Courses may be comma separated or on individual lines</div>
                        </div>
                        <div class="form-check form-switch">
                            <label class="form-check-label" for="course-reset-textarea">Manually enter list of courses</label>
                            <input class="form-check-input" type="checkbox" role="switch" id="manual-courses-reset-switch">
                        </div>
                    </div>
                    <div id="course-text-div" hidden>
                        <textarea class="form-control form-control-sm" id="reset-courses-area" rows="3" placeholder="course1,course2,course3, etc."></textarea>
                    </div>
                </div>
            <button type="button" class="btn btn-sm btn-primary mt-2" id="resetBtn" disabled hidden>Reset</button>
            <button type="button" class="btn btn-sm btn-primary mt-2" id="uploadBtn" disabled hidden>Upload</button>
            <div id="progress-div" hidden>
                <p id="progress-info"></p>
                <div class="progress mt-2" style="width: 75%" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
                <button type="button" class="btn btn-sm btn-outline-danger mt-2" id="reset-courses-cancel-btn" hidden>
                    <i class="bi bi-x-circle me-1"></i>Cancel
                </button>
            </div>
            <div id='response-contailer'></div>
            <div class="card mt-2" id="reset-results-card" hidden>
                <div class="card-header bg-secondary-subtle py-1">
                    <h6 class="mb-0">Reset Results</h6>
                </div>
                <div class="card-body" id="reset-results-body"></div>
            </div>`

        eContent.append(resetCourseForm);
    }
    resetCourseForm.hidden = false;

    const progressDiv = resetCourseForm.querySelector('#progress-div');
    const progressBar = progressDiv.querySelector('.progress-bar');
    const progressInfo = resetCourseForm.querySelector('#progress-info');
    const resetBtn = resetCourseForm.querySelector('#resetBtn');
    const uploadBtn = resetCourseForm.querySelector('#uploadBtn');
    const resultsCard = resetCourseForm.querySelector('#reset-results-card');
    const resultsBody = resetCourseForm.querySelector('#reset-results-body');

    // Renders a summary card into the results area after a reset completes.
    // response: { successful: [...], failed: [...] }
    // cancelRequested: boolean
    function renderResetResults(response, cancelRequested) {
        const successCount = response.successful?.length ?? 0;
        const failedItems = response.failed ?? [];
        const failCount = failedItems.length;

        let html = '<div class="d-flex gap-3 align-items-center mb-2" style="font-size:0.85rem;">';
        html += `<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Succeeded: ${successCount}</span>`;
        html += `<span class="badge ${failCount > 0 ? 'bg-danger' : 'bg-secondary'}"><i class="bi bi-x-circle me-1"></i>Failed: ${failCount}</span>`;
        if (cancelRequested) {
            html += '<span class="badge bg-warning text-dark"><i class="bi bi-slash-circle me-1"></i>Cancelled</span>';
        }
        html += '</div>';

        if (failCount > 0) {
            const preview = failedItems.slice(0, 5);
            html += '<div class="alert alert-danger py-2 mb-2" style="font-size:0.8rem;"><strong>Failures</strong>';
            if (failCount > 5) html += ` <span class="text-muted">(showing 5 of ${failCount})</span>`;
            html += '<ul class="mb-0 mt-1">';
            for (const f of preview) {
                const courseId = f.id ?? '?';
                const reason = f.reason ?? f.status ?? 'Unknown error';
                html += `<li>Course <strong>${courseId}</strong>: ${reason}</li>`;
            }
            html += '</ul></div>';

            html += `<button type="button" class="btn btn-sm btn-outline-secondary" id="reset-failures-csv-btn">
                <i class="bi bi-download me-1"></i>Download failures CSV
            </button>`;
        }

        resultsBody.innerHTML = html;
        resultsCard.hidden = false;

        if (failCount > 0) {
            const dlBtn = resultsBody.querySelector('#reset-failures-csv-btn');
            dlBtn.addEventListener('click', async () => {
                try {
                    dlBtn.disabled = true;
                    dlBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Saving...';
                    const csvData = failedItems.map(f => ({
                        course_id: f.id ?? '',
                        reason: f.reason ?? '',
                        status: f.status ?? ''
                    }));
                    const fileName = `reset_courses_failures_${new Date().toISOString().slice(0, 10)}.csv`;
                    const result = await window.csv.sendToCSV({ fileName, data: csvData, showSaveDialog: true });
                    if (result?.filePath) {
                        dlBtn.innerHTML = '<i class="bi bi-check me-1"></i>Downloaded';
                        dlBtn.classList.replace('btn-outline-secondary', 'btn-success');
                    } else {
                        dlBtn.disabled = false;
                        dlBtn.innerHTML = '<i class="bi bi-download me-1"></i>Download failures CSV';
                    }
                } catch (err) {
                    console.error('Error saving failures CSV:', err);
                    dlBtn.disabled = false;
                    dlBtn.innerHTML = '<i class="bi bi-x me-1"></i>Download failed';
                    dlBtn.classList.replace('btn-outline-secondary', 'btn-danger');
                }
            });
        }
    }
    const courseTextDiv = resetCourseForm.querySelector('#course-text-div');
    const courseTextArea = resetCourseForm.querySelector('#reset-courses-area');
    const switches = resetCourseForm.querySelector('#reset-switches');

    // Only attach event listeners once (when the form is first created)
    if (resetFormJustCreated) {
        courseTextArea.addEventListener('input', (e) => {
            const inputSwitch = resetCourseForm.querySelector('#manual-courses-reset-switch');
            if (courseTextArea.value.length < 1 || !inputSwitch.checked) {
                resetBtn.disabled = true;
            } else {
                resetBtn.disabled = false;
            }
        });
        switches.addEventListener('change', (e) => {
            const inputs = switches.querySelectorAll('input');

            // disable all inputs other than the one that's checked
            for (let input of inputs) {
                if (input.id !== e.target.id) {
                    input.checked = false;
                }
            }

            // if nothing is checked disable and hide all buttons
            if (!e.target.checked) {
                for (let input of inputs) {
                    input.checked = false;
                }
                resetBtn.disabled = true;
                uploadBtn.disabled = true;
            } else if (e.target.id === 'upload-courses-switch') {
                resetBtn.disabled = true;
                resetBtn.hidden = true;
                courseTextDiv.hidden = true;
                uploadBtn.disabled = false;
                uploadBtn.hidden = false;
            } else {
                resetBtn.hidden = false;
                courseTextDiv.hidden = false;
                uploadBtn.disabled = true;
                uploadBtn.hidden = true;
            }
        })

        uploadBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            uploadBtn.disabled = true;
            progressInfo.innerHTML = '';
            progressDiv.hidden = true;

            const domain = document.querySelector('#domain').value.trim();
            const apiToken = document.querySelector('#token').value.trim();

            let courses = [];
            try {
                courses = await window.fileUpload.resetCourse();
            } catch (error) {
                uploadBtn.disabled = false;
                progressDiv.hidden = false;
                errorHandler(error, progressInfo);
                return;
            }

            // User cancelled the file picker
            if (!courses || courses.length === 0) {
                uploadBtn.disabled = false;
                return;
            }

            // --- Show summary + confirmation ---
            const total = courses.length;

            // Find or create a confirmation container
            let confirmDiv = resetCourseForm.querySelector('#upload-confirm-div');
            if (!confirmDiv) {
                confirmDiv = document.createElement('div');
                confirmDiv.id = 'upload-confirm-div';
                confirmDiv.className = 'mt-2';
                progressDiv.parentElement.insertBefore(confirmDiv, progressDiv);
            }

            confirmDiv.innerHTML = `
            <div class="alert alert-info py-2 mb-2" style="font-size:0.85rem;">
                <i class="bi bi-file-earmark-text me-1"></i>
                Found <strong>${total}</strong> course${total !== 1 ? 's' : ''} in the file.
                Proceed with resetting all of them?
            </div>
            <button type="button" class="btn btn-sm btn-danger me-2" id="confirm-reset-btn">
                <i class="bi bi-arrow-clockwise me-1"></i>Reset
            </button>
            <button type="button" class="btn btn-sm btn-secondary" id="confirm-cancel-btn">
                Cancel
            </button>`;
            confirmDiv.hidden = false;

            const confirmResetBtn = confirmDiv.querySelector('#confirm-reset-btn');
            const confirmCancelBtn = confirmDiv.querySelector('#confirm-cancel-btn');

            confirmCancelBtn.addEventListener('click', () => {
                confirmDiv.hidden = true;
                confirmDiv.innerHTML = '';
                uploadBtn.disabled = false;
            }, { once: true });

            confirmResetBtn.addEventListener('click', async () => {
                confirmDiv.hidden = true;
                confirmDiv.innerHTML = '';

                // Clear any previous results
                resultsCard.hidden = true;
                resultsBody.innerHTML = '';

                // Setup progress UI
                progressDiv.hidden = false;
                progressBar.parentElement.hidden = false;
                progressBar.style.width = '0%';
                progressInfo.innerHTML = `Resetting courses.... 0/${total}`;

                const cancelBtn = progressDiv.querySelector('#reset-courses-cancel-btn');
                let cancelRequested = false;
                if (cancelBtn) {
                    cancelBtn.hidden = false;
                    cancelBtn.disabled = false;
                    cancelBtn.onclick = async () => {
                        cancelRequested = true;
                        cancelBtn.disabled = true;
                        cancelBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Cancelling...';
                        progressInfo.innerHTML = 'Cancelling... letting in-flight requests finish.';
                        try {
                            await window.axios.cancelResetCourses();
                        } catch (err) {
                            console.error('Error cancelling reset courses:', err);
                        }
                    };
                }

                const data = {
                    domain: domain,
                    token: apiToken,
                    courses: courses
                };

                let response;
                try {
                    window.progressAPI.onUpdateProgress((progress) => {
                        const done = Math.min(Math.round(progress / 100 * total), total);
                        progressInfo.innerHTML = `Resetting courses.... ${done}/${total}`;
                        progressBar.style.width = `${progress}%`;
                    });

                    response = await window.axios.resetCourses(data);
                    progressDiv.hidden = true;
                    renderResetResults(response, cancelRequested);
                } catch (error) {
                    errorHandler(error, progressInfo);
                } finally {
                    uploadBtn.disabled = false;
                    if (cancelBtn) {
                        cancelBtn.hidden = true;
                        cancelBtn.disabled = true;
                        cancelBtn.innerHTML = '<i class="bi bi-x-circle me-1"></i>Cancel';
                    }
                }
            }, { once: true });
        })

        resetBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();


            resetBtn.disabled = true;
            progressDiv.hidden = false;
            resultsCard.hidden = true;
            resultsBody.innerHTML = '';
            progressInfo.innerHTML = 'Resetting courses....';

            const domain = document.querySelector('#domain').value.trim();
            const apiToken = document.querySelector('#token').value.trim();
            const courses = resetCourseForm.querySelector('#reset-courses-area').value.split(/[\n,]/).map(course => course.trim());

            const data = {
                domain: domain,
                token: apiToken,
                courses: courses
            }

            const total = courses.length;
            progressInfo.innerHTML = `Resetting courses.... 0/${total}`;

            let response;
            try {
                window.progressAPI.onUpdateProgress((progress) => {
                    const done = Math.min(Math.round(progress / 100 * total), total);
                    progressInfo.innerHTML = `Resetting courses.... ${done}/${total}`;
                    progressBar.style.width = `${progress}%`;
                });

                response = await window.axios.resetCourses(data);
                progressDiv.hidden = true;
                renderResetResults(response, false);
            } catch (error) {
                errorHandler(error, progressInfo);
            } finally {
                resetBtn.disabled = false;
            }
        })
    } // end resetFormJustCreated

    // adding response container
    // const eResponse = document.createElement('div');
    // eResponse.id = "response-container";
    // eResponse.classList.add('mt-5');
    // eContent.append(eResponse);
}

async function publishUnpublishCourses(e) {
    hideEndpoints(e);

    const eContent = document.querySelector('#endpoint-content');
    let publishCourseForm = eContent.querySelector('#publish-course-form');
    const publishFormJustCreated = !publishCourseForm;

    if (!publishCourseForm) {
        publishCourseForm = document.createElement('form');
        publishCourseForm.id = 'publish-course-form';

        publishCourseForm.innerHTML = `
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-megaphone me-1"></i>Publish/Unpublish Courses
                    </h3>
                    <small class="text-muted">Publish or unpublish courses by manually entering course IDs or uploading a file</small>
                </div>
                <div class="card-body">
                    <div class="mb-3">
                        <label class="form-label d-block">Action</label>
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="radio" name="publish-state-action" id="publish-courses-option" value="offer" checked>
                            <label class="form-check-label" for="publish-courses-option">Publish</label>
                        </div>
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="radio" name="publish-state-action" id="unpublish-courses-option" value="claim">
                            <label class="form-check-label" for="unpublish-courses-option">Unpublish</label>
                        </div>
                        <div class="form-text">Canvas uses <strong>offer</strong> to publish and <strong>claim</strong> to unpublish a course.</div>
                    </div>
                    <div class="row">
                        <div class="mb-2" id="publish-state-switches">
                            <div class="form-check form-switch">
                                <label class="form-check-label" for="upload-publish-courses-switch">Upload file of courses</label>
                                <input class="form-check-input" type="checkbox" role="switch" id="upload-publish-courses-switch">
                            </div>
                            <div class="form-check form-switch">
                                <label class="form-check-label" for="manual-publish-courses-switch">Manually enter list of courses</label>
                                <input class="form-check-input" type="checkbox" role="switch" id="manual-publish-courses-switch">
                            </div>
                        </div>
                        <div id="publish-course-text-div" hidden>
                            <textarea class="form-control form-control-sm" id="publish-courses-area" rows="3" placeholder="course1,course2,course3, etc."></textarea>
                            <div class="form-text" id="publish-courses-validation" hidden></div>
                        </div>
                    </div>
                    <button type="button" class="btn btn-sm btn-primary mt-2" id="publishStateBtn" disabled hidden>Apply</button>
                    <button type="button" class="btn btn-sm btn-primary mt-2" id="publishStateUploadBtn" disabled hidden>Upload</button>
                    <div id="publish-upload-confirm-div" hidden></div>
                </div>
            </div>

            <div class="card mt-2" id="publish-progress-div" hidden>
                <div class="card-header py-2">
                    <h5 class="card-title mb-0">
                        <i class="bi bi-gear me-1"></i><span id="publish-progress-title">Processing</span>
                    </h5>
                </div>
                <div class="card-body py-2">
                    <p id="publish-progress-info" class="mb-1"></p>
                    <div class="progress mb-1">
                        <div class="progress-bar progress-bar-striped progress-bar-animated" style="width: 0%" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                    <button type="button" class="btn btn-sm btn-outline-danger mt-2" id="publish-courses-cancel-btn" hidden>
                        <i class="bi bi-x-circle me-1"></i>Cancel
                    </button>
                </div>
            </div>

            <div class="card mt-2" id="publish-results-card" hidden>
                <div class="card-body p-0" id="publish-results-body"></div>
            </div>`;

        eContent.append(publishCourseForm);
    }
    publishCourseForm.hidden = false;

    const progressDiv = publishCourseForm.querySelector('#publish-progress-div');
    const progressBar = progressDiv.querySelector('.progress-bar');
    const progressTitle = publishCourseForm.querySelector('#publish-progress-title');
    const progressInfo = publishCourseForm.querySelector('#publish-progress-info');
    const applyBtn = publishCourseForm.querySelector('#publishStateBtn');
    const uploadBtn = publishCourseForm.querySelector('#publishStateUploadBtn');
    const resultsCard = publishCourseForm.querySelector('#publish-results-card');
    const resultsBody = publishCourseForm.querySelector('#publish-results-body');
    const confirmDiv = publishCourseForm.querySelector('#publish-upload-confirm-div');
    const courseTextDiv = publishCourseForm.querySelector('#publish-course-text-div');
    const courseTextArea = publishCourseForm.querySelector('#publish-courses-area');
    const switches = publishCourseForm.querySelector('#publish-state-switches');
    const validationMessage = publishCourseForm.querySelector('#publish-courses-validation');

    function getSelectedPublishAction() {
        const selectedAction = publishCourseForm.querySelector('input[name="publish-state-action"]:checked');
        return selectedAction?.value === 'claim' ? 'claim' : 'offer';
    }

    function getSelectedPublishActionLabel() {
        return getSelectedPublishAction() === 'claim' ? 'Unpublish' : 'Publish';
    }

    function parseManualCourseIds(rawInput) {
        const courseIds = rawInput.split(/[\n,]/).map(id => id.trim()).filter(id => id.length > 0);
        const invalid = courseIds.filter(id => !/^\d+$/.test(id) || Number(id) <= 0);

        if (invalid.length > 0) {
            const preview = invalid.slice(0, 5).join(', ');
            const suffix = invalid.length > 5 ? ` ... (${invalid.length} total)` : '';
            throw new Error(`Course IDs must be positive integers. Invalid values: ${preview}${suffix}`);
        }

        return courseIds;
    }

    function setManualValidation(message = '') {
        if (!message) {
            validationMessage.hidden = true;
            validationMessage.textContent = '';
            courseTextArea.classList.remove('is-invalid');
            return;
        }

        validationMessage.hidden = false;
        validationMessage.textContent = message;
        courseTextArea.classList.add('is-invalid');
    }

    function renderPublishResults(response, actionLabel) {
        const successCount = response.successful?.length ?? 0;
        const failedItems = response.failed ?? [];
        const failCount = failedItems.length;
        const cancelledByUser = response.cancelledByUser ?? false;

        let html = `
            <div class="card mb-0">
                <div class="card-header bg-primary text-white">
                    <h5 class="card-title mb-0">
                        <i class="bi bi-check-circle me-2"></i>${actionLabel} Summary
                    </h5>
                </div>
                <div class="card-body">
                    <p class="mb-2">
                        <i class="bi bi-check-circle-fill text-success me-2"></i>
                        <strong>Successfully updated:</strong> ${successCount}
                    </p>
                    <p class="${cancelledByUser ? 'mb-2' : 'mb-0'}">
                        <i class="bi bi-x-circle-fill ${failCount > 0 ? 'text-danger' : 'text-secondary'} me-2"></i>
                        <strong>Failed to update:</strong> ${failCount}
                    </p>
                    ${cancelledByUser ? `<p class="mb-0">
                        <i class="bi bi-slash-circle text-warning me-2"></i>
                        <strong>Cancelled by user</strong>
                    </p>` : ''}
                </div>
            </div>`;

        if (failCount > 0) {
            html += `
                <div class="card mt-2 mb-0 border-danger">
                    <div class="card-header bg-danger text-white">
                        <h5 class="card-title mb-0">
                            <i class="bi bi-exclamation-triangle me-2"></i>Update Failures
                        </h5>
                    </div>
                    <div class="card-body">
                        <ul class="mb-2">
                            ${failedItems.map(item => `<li><strong>[${item.id}]</strong>: ${item.reason || item.status || 'Unknown error'}</li>`).join('')}
                        </ul>
                        <button type="button" class="btn btn-sm btn-outline-danger" id="publish-failures-csv-btn">
                            <i class="bi bi-download me-1"></i>Download failures CSV
                        </button>
                    </div>
                </div>`;
        }

        resultsBody.innerHTML = html;
        resultsCard.hidden = false;

        if (failCount > 0) {
            const dlBtn = resultsBody.querySelector('#publish-failures-csv-btn');
            dlBtn.addEventListener('click', async () => {
                try {
                    dlBtn.disabled = true;
                    dlBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Saving...';
                    const csvData = failedItems.map(item => ({
                        course_id: item.id ?? '',
                        message: item.reason ?? '',
                        status: item.status ?? ''
                    }));
                    const fileName = `course_publish_state_failures_${new Date().toISOString().slice(0, 10)}.csv`;
                    const result = await window.csv.sendToCSV({ fileName, data: csvData, showSaveDialog: true });
                    if (result?.filePath) {
                        dlBtn.innerHTML = '<i class="bi bi-check me-1"></i>Downloaded';
                        dlBtn.classList.replace('btn-outline-danger', 'btn-success');
                    } else {
                        dlBtn.disabled = false;
                        dlBtn.innerHTML = '<i class="bi bi-download me-1"></i>Download failures CSV';
                    }
                } catch (err) {
                    console.error('Error saving publish-state failures CSV:', err);
                    dlBtn.disabled = false;
                    dlBtn.innerHTML = '<i class="bi bi-x me-1"></i>Download failed';
                    dlBtn.classList.replace('btn-outline-danger', 'btn-danger');
                }
            });
        }
    }

    function setupCancelBtn(cancelBtn) {
        cancelBtn.hidden = false;
        cancelBtn.disabled = false;
        cancelBtn.innerHTML = '<i class="bi bi-x-circle me-1"></i>Cancel';
        cancelBtn.onclick = async () => {
            cancelBtn.disabled = true;
            cancelBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Cancelling...';
            progressInfo.innerHTML = 'Cancelling... letting in-flight requests finish.';
            try {
                await window.axios.cancelUpdateCoursePublishState();
            } catch (err) {
                console.error('Error cancelling publish/unpublish courses:', err);
            }
        };
    }

    async function runPublishState(courseIds, triggerBtn) {
        const domain = document.querySelector('#domain').value.trim();
        const apiToken = document.querySelector('#token').value.trim();
        const eventType = getSelectedPublishAction();
        const actionLabel = getSelectedPublishActionLabel();
        const total = courseIds.length;

        resultsCard.hidden = true;
        resultsBody.innerHTML = '';
        progressDiv.hidden = false;
        progressBar.style.width = '0%';
        progressTitle.textContent = `${actionLabel} Courses`;
        progressInfo.innerHTML = `${actionLabel}ing courses... 0/${total}`;

        const cancelBtn = progressDiv.querySelector('#publish-courses-cancel-btn');
        setupCancelBtn(cancelBtn);

        const data = { domain, token: apiToken, courseIds, eventType };

        let response;
        let unsubscribe;
        try {
            window.progressAPI.removeAllProgressListeners();
            unsubscribe = window.progressAPI.onUpdateProgress((progress) => {
                const pct = typeof progress === 'number' ? progress : 0;
                const done = Math.min(Math.round(pct / 100 * total), total);
                progressInfo.innerHTML = `${actionLabel}ing courses... ${done}/${total}`;
                progressBar.style.width = `${pct}%`;
            });

            response = await window.axios.updateCoursePublishState(data);
            progressDiv.hidden = true;
            renderPublishResults(response, actionLabel);
        } catch (error) {
            errorHandler(error, progressInfo);
        } finally {
            if (typeof unsubscribe === 'function') unsubscribe();
            triggerBtn.disabled = false;
            cancelBtn.hidden = true;
            cancelBtn.disabled = true;
            cancelBtn.innerHTML = '<i class="bi bi-x-circle me-1"></i>Cancel';
        }
    }

    function confirmAndRun(courseIds, triggerBtn) {
        const actionLabel = getSelectedPublishActionLabel();
        const total = courseIds.length;
        confirmDiv.innerHTML = `
            <div class="alert alert-info py-2 mb-2 mt-2 publish-state-confirm-alert">
                <strong>${actionLabel}</strong> <strong>${total}</strong> course${total !== 1 ? 's' : ''}?
            </div>
            <button type="button" class="btn btn-sm btn-primary me-2" id="confirm-publish-state-btn">
                <i class="bi bi-check2-circle me-1"></i>${actionLabel}
            </button>
            <button type="button" class="btn btn-sm btn-secondary" id="confirm-publish-state-cancel-btn">Cancel</button>`;
        confirmDiv.hidden = false;

        confirmDiv.querySelector('#confirm-publish-state-cancel-btn').addEventListener('click', () => {
            confirmDiv.hidden = true;
            confirmDiv.innerHTML = '';
            triggerBtn.disabled = false;
        }, { once: true });

        confirmDiv.querySelector('#confirm-publish-state-btn').addEventListener('click', async () => {
            confirmDiv.hidden = true;
            confirmDiv.innerHTML = '';
            await runPublishState(courseIds, triggerBtn);
        }, { once: true });
    }

    if (publishFormJustCreated) {
        courseTextArea.addEventListener('input', () => {
            const manualSwitch = publishCourseForm.querySelector('#manual-publish-courses-switch');
            setManualValidation('');
            applyBtn.disabled = courseTextArea.value.trim().length < 1 || !manualSwitch.checked;
        });

        switches.addEventListener('change', (event) => {
            const inputs = switches.querySelectorAll('input');
            for (const input of inputs) {
                if (input.id !== event.target.id) input.checked = false;
            }

            confirmDiv.hidden = true;
            confirmDiv.innerHTML = '';
            setManualValidation('');

            if (!event.target.checked) {
                applyBtn.disabled = true;
                uploadBtn.disabled = true;
            } else if (event.target.id === 'upload-publish-courses-switch') {
                applyBtn.disabled = true;
                applyBtn.hidden = true;
                courseTextDiv.hidden = true;
                uploadBtn.disabled = false;
                uploadBtn.hidden = false;
            } else {
                applyBtn.hidden = false;
                courseTextDiv.hidden = false;
                uploadBtn.disabled = true;
                uploadBtn.hidden = true;
                applyBtn.disabled = courseTextArea.value.trim().length < 1;
            }
        });

        uploadBtn.addEventListener('click', async () => {
            uploadBtn.disabled = true;
            progressDiv.hidden = true;
            confirmDiv.hidden = true;
            confirmDiv.innerHTML = '';
            setManualValidation('');

            let courseIds = [];
            try {
                courseIds = await window.fileUpload.publishStateCourses();
            } catch (error) {
                uploadBtn.disabled = false;
                progressDiv.hidden = false;
                errorHandler(error, progressInfo);
                return;
            }

            if (!courseIds || courseIds.length === 0) {
                uploadBtn.disabled = false;
                return;
            }

            confirmAndRun(courseIds, uploadBtn);
        });

        applyBtn.addEventListener('click', async () => {
            applyBtn.disabled = true;
            confirmDiv.hidden = true;
            confirmDiv.innerHTML = '';
            setManualValidation('');

            let courseIds = [];
            try {
                courseIds = parseManualCourseIds(courseTextArea.value);
            } catch (error) {
                setManualValidation(error.message || 'Invalid course IDs.');
                applyBtn.disabled = false;
                return;
            }

            if (courseIds.length === 0) {
                applyBtn.disabled = false;
                return;
            }

            confirmAndRun(courseIds, applyBtn);
        });
    }
}

async function createSupportCourse(e) {
    hideEndpoints(e);

    const eContent = document.querySelector('#endpoint-content');
    let createSupportCourseForm = eContent.querySelector('#create-support-courses-form');

    // Declare saveTimer and related functions at the top of the function scope
    const STORAGE_KEY = 'createSupportCourse_defaults';
    let saveTimer;

    function saveDefaults() {
        try {
            const cfg = collectConfigFromForm();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
        } catch { /* no-op */ }
    }

    function saveDefaultsDebounced() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(saveDefaults, 200);
    }

    const contentDefinitions = [
        { key: 'assignments', label: 'Assignments', supportsPublish: true },
        { key: 'classicQuizzes', label: 'Classic Quizzes', supportsPublish: true, questionMode: 'classic' },
        { key: 'newQuizzes', label: 'New Quizzes', supportsPublish: true, questionMode: 'new' },
        { key: 'announcements', label: 'Announcements', supportsPublish: false, questionMode: 'announcement' },
        { key: 'discussions', label: 'Discussions', supportsPublish: true },
        { key: 'pages', label: 'Pages', supportsPublish: true },
        { key: 'modules', label: 'Modules', supportsPublish: false },
        { key: 'sections', label: 'Sections', supportsPublish: false }
    ];

    function buildClassicQuestionPanelMarkup() {
        return `
            <div class="csc-inline-panel" data-question-panel="classicQuizzes" hidden>
                <div class="csc-inline-panel-header">Classic Quiz Question Types</div>
                <div class="csc-inline-panel-body">
                    <div class="row mb-2">
                        <div class="col-auto">
                            <div class="form-check mb-0">
                                <input class="form-check-input" type="checkbox" id="select-all-questions">
                                <label class="form-check-label fw-bold" for="select-all-questions">
                                    Select All
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-4">
                            <div class="form-check">
                                <input class="form-check-input question-type-checkbox" type="checkbox" value="multiple_choice_question" id="q-multiple-choice">
                                <label class="form-check-label" for="q-multiple-choice">Multiple Choice</label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input question-type-checkbox" type="checkbox" value="true_false_question" id="q-true-false">
                                <label class="form-check-label" for="q-true-false">True/False</label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input question-type-checkbox" type="checkbox" value="fill_in_multiple_blanks_question" id="q-fill-blanks">
                                <label class="form-check-label" for="q-fill-blanks">Fill in Multiple Blanks</label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input question-type-checkbox" type="checkbox" value="short_answer_question" id="q-fill-blank">
                                <label class="form-check-label" for="q-fill-blank">Fill in the Blank</label>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="form-check">
                                <input class="form-check-input question-type-checkbox" type="checkbox" value="multiple_answers_question" id="q-multiple-answers">
                                <label class="form-check-label" for="q-multiple-answers">Multiple Answers</label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input question-type-checkbox" type="checkbox" value="multiple_dropdowns_question" id="q-multiple-dropdowns">
                                <label class="form-check-label" for="q-multiple-dropdowns">Multiple Dropdowns</label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input question-type-checkbox" type="checkbox" value="matching_question" id="q-matching">
                                <label class="form-check-label" for="q-matching">Matching</label>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="form-check">
                                <input class="form-check-input question-type-checkbox" type="checkbox" value="numerical_question" id="q-numerical">
                                <label class="form-check-label" for="q-numerical">Numerical Answer</label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input question-type-checkbox" type="checkbox" value="calculated_question" id="q-calculated">
                                <label class="form-check-label" for="q-calculated">Formula Question</label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input question-type-checkbox" type="checkbox" value="essay_question" id="q-essay">
                                <label class="form-check-label" for="q-essay">Essay Question</label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    function buildNewQuizQuestionPanelMarkup() {
        return `
            <div class="csc-inline-panel" data-question-panel="newQuizzes" hidden>
                <div class="csc-inline-panel-header">New Quiz Question Types</div>
                <div class="csc-inline-panel-body">
                    <div class="row mb-2">
                        <div class="col-auto">
                            <div class="form-check mb-0">
                                <input class="form-check-input" type="checkbox" id="select-all-newq-questions">
                                <label class="form-check-label fw-bold" for="select-all-newq-questions">Select All</label>
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-4">
                            <div class="form-check">
                                <input class="form-check-input newq-question-type-checkbox" type="checkbox" value="multiple_choice" id="nq-multiple-choice">
                                <label class="form-check-label" for="nq-multiple-choice">Multiple Choice</label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input newq-question-type-checkbox" type="checkbox" value="multi_answer" id="nq-multi-answer">
                                <label class="form-check-label" for="nq-multi-answer">Multiple Answer</label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input newq-question-type-checkbox" type="checkbox" value="true_false" id="nq-true-false">
                                <label class="form-check-label" for="nq-true-false">True/False</label>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="form-check">
                                <input class="form-check-input newq-question-type-checkbox" type="checkbox" value="essay" id="nq-essay">
                                <label class="form-check-label" for="nq-essay">Essay</label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input newq-question-type-checkbox" type="checkbox" value="numeric" id="nq-numeric">
                                <label class="form-check-label" for="nq-numeric">Numeric</label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input newq-question-type-checkbox" type="checkbox" value="fill_in_blank" id="nq-fill-blank">
                                <label class="form-check-label" for="nq-fill-blank">Fill in the Blank</label>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="form-check">
                                <input class="form-check-input newq-question-type-checkbox" type="checkbox" value="matching" id="nq-matching">
                                <label class="form-check-label" for="nq-matching">Matching</label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input newq-question-type-checkbox" type="checkbox" value="categorization" id="nq-categorization">
                                <label class="form-check-label" for="nq-categorization">Categorization</label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input newq-question-type-checkbox" type="checkbox" value="ordering" id="nq-ordering">
                                <label class="form-check-label" for="nq-ordering">Ordering</label>
                            </div>
                        </div>
                    </div>
                    <div class="row mt-2">
                        <div class="col-md-4">
                            <div class="form-check">
                                <input class="form-check-input newq-question-type-checkbox" type="checkbox" value="file_upload" id="nq-file-upload">
                                <label class="form-check-label" for="nq-file-upload">File Upload</label>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="form-check">
                                <input class="form-check-input newq-question-type-checkbox" type="checkbox" value="formula" id="nq-formula">
                                <label class="form-check-label" for="nq-formula">Formula</label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    function buildAnnouncementPanelMarkup() {
        return `
            <div class="csc-inline-panel" data-question-panel="announcements" hidden>
                <div class="csc-inline-panel-header">Announcement Posting</div>
                <div class="csc-inline-panel-body">
                    <div class="row g-2 align-items-end">
                        <div class="col-md-6">
                            <label class="form-label mb-1" for="csc-announcement-delay-date">Delayed Post Date</label>
                            <input type="datetime-local" class="form-control form-control-sm" id="csc-announcement-delay-date">
                            <div class="form-text">Leave blank to post announcements immediately.</div>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    function buildContentRowsMarkup() {
        return contentDefinitions.map((definition) => {
            const checkboxId = `csc-content-${definition.key}`;
            const qtyId = `csc-qty-${definition.key}`;
            const publishId = `csc-publish-${definition.key}`;
            const questionToggleId = definition.questionMode === 'classic'
                ? 'csc-add-questions'
                : definition.questionMode === 'new'
                    ? 'csc-add-newq-questions'
                    : definition.questionMode === 'announcement'
                        ? 'csc-delay-announcements'
                        : '';
            const questionToggleLabel = definition.questionMode === 'announcement' ? 'Delay Posting' : 'Customize';

            const publishMarkup = definition.supportsPublish
                ? `<div class="form-check form-switch mb-0">
                        <input class="form-check-input csc-content-publish" type="checkbox" id="${publishId}" data-key="${definition.key}" checked disabled>
                        <label class="form-check-label" for="${publishId}">Published</label>
                    </div>`
                : '<span class="csc-cell-placeholder">Not applicable</span>';

            const questionMarkup = definition.questionMode
                ? `<div class="form-check form-switch mb-0">
                        <input class="form-check-input csc-question-toggle" type="checkbox" id="${questionToggleId}" data-key="${definition.key}" disabled>
                        <label class="form-check-label" for="${questionToggleId}">${questionToggleLabel}</label>
                    </div>
                    <div class="csc-inline-note" data-question-summary="${definition.key}">Off</div>`
                : '<span class="csc-cell-placeholder">Not applicable</span>';

            const panelMarkup = definition.questionMode === 'classic'
                ? buildClassicQuestionPanelMarkup()
                : definition.questionMode === 'new'
                    ? buildNewQuizQuestionPanelMarkup()
                    : definition.questionMode === 'announcement'
                        ? buildAnnouncementPanelMarkup()
                        : '';

            return `
                <div class="csc-row-group" data-content-key="${definition.key}">
                    <div class="csc-content-grid csc-content-row">
                        <div class="csc-content-cell csc-include-cell">
                            <div class="form-check mb-0">
                                <input class="form-check-input csc-content-check" type="checkbox" id="${checkboxId}" data-key="${definition.key}">
                                <label class="form-check-label visually-hidden" for="${checkboxId}">Include ${definition.label}</label>
                            </div>
                        </div>
                        <div class="csc-content-cell csc-name-cell">
                            <label class="csc-content-name" for="${checkboxId}">${definition.label}</label>
                        </div>
                        <div class="csc-content-cell csc-publish-cell">
                            ${publishMarkup}
                        </div>
                        <div class="csc-content-cell csc-questions-cell">
                            ${questionMarkup}
                        </div>
                        <div class="csc-content-cell csc-qty-cell">
                            <label class="visually-hidden" for="${qtyId}">Quantity for ${definition.label}</label>
                            <input type="number" class="form-control form-control-sm csc-content-qty" id="${qtyId}" data-key="${definition.key}" min="1" max="999" value="1" disabled>
                        </div>
                    </div>
                    ${panelMarkup}
                </div>`;
        }).join('');
    }

    if (!createSupportCourseForm) {
        createSupportCourseForm = document.createElement('form');
        createSupportCourseForm.id = 'create-support-courses-form';


        // eContent.innerHTML = `
        //     <div>
        //         <h3>Create Support Course</h3>
        //     </div>
        // `;

        // const eForm = document.createElement('form');

        createSupportCourseForm.innerHTML = `
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-plus-circle me-1"></i>Create Support Course
                    </h3>
                    <small class="text-muted">Create a new support course with predefined settings</small>
                </div>
                <div class="card-body">
            <div id="csc-progress-div" hidden>
                <p id="csc-progress-info"></p>
                <div id="csc-status-list" class="mb-2"></div>
                <div class="progress mt-2" style="width: 75%" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
            </div>
            <div id='csc-response-container'></div>
            <div id="course-options">
                <div class="row mb-2">
                    <div class="col-6">
                        <label for="course-name" class="form-label">Course name</label>
                        <input type="text" class="form-control form-control-sm" id="course-name" placeholder="e.g., Support Course">
                    </div>
                </div>
                <div class="row g-3 align-items-center mb-2">
                    <div class="col-auto form-check form-switch">
                        <label for="course-publish" class="form-label">Publish</label>
                        <input type="checkbox" class="form-check-input" role="switch" id="course-publish">
                    </div>
                    <div class="col-auto form-check form-switch">
                        <label for="course-blueprint" class="form-label">Blueprint</label>
                        <input type="checkbox" class="form-check-input" role="switch" id="course-blueprint">
                    </div>
                </div>
                <div id="add-ac-courses-div" class="row hidden">
                    <div class="col-auto">
                        <label class="form-label">Number of courses to associate</label>
                        <input id="csc-ac-input" class="form-control form-control-sm" type="text" />
                        <div class="col-auto">
                            <span id="ac-course-text" class="form-text" hidden style="color: red;">Must be a number</span>
                        </div>
                    </div>
                </div>
                <!-- Users section now visible -->
                <div class="col-auto form-check form-switch mb-2 mt-2">
                    <label for="course-add-users" class="form-label">Add Users</label>
                    <input type="checkbox" class="form-check-input" role="switch" id="course-add-users">
                </div>
                <div id="add-users-div" class="row hidden">
                    <div class="col-4">
                        <label for="user-email" class="form-label">Email</label>
                        <input type="text" class="form-control form-control-sm" role="switch" id="user-email">
                        <div id="course-reset-description" class="form-text">NOTE: Your instructure email. Used to create emails for the new users so they can receive notifications.</div>
                    </div>
                    <div class="col-2">
                        <label for="course-add-students" class="form-label">Students</label>
                        <input type="text" class="form-control form-control-sm" role="switch" id="course-add-students">
                        <div class="col-auto">
                            <span id="add-students-text" class="form-text" hidden style="color: red;">Must be a number</span>
                        </div>
                    </div>
                    <div class="col-2">
                        <label for="course-add-teachers" class="form-label">Teachers</label>
                        <input type="text" class="form-control form-control-sm" role="switch" id="course-add-teachers">
                        <div class="col-auto">
                            <span id="add-teachers-text" class="form-text" hidden style="color: red;">Must be a number</span>
                        </div>
                    </div>
                </div>

                <div class="mt-3">
                    <div class="card csc-content-card">
                        <div class="card-header bg-light d-flex justify-content-between align-items-center py-2 px-3">
                            <div>
                                <span class="form-label mb-0 d-block">Content Preset</span>
                                <small class="text-muted">Choose what the support course starts with.</small>
                            </div>
                            <div class="d-flex gap-2">
                                <button type="button" class="btn btn-outline-primary btn-sm" id="csc-select-all-content">Select All</button>
                                <button type="button" class="btn btn-outline-secondary btn-sm" id="csc-clear-all-content">Clear All</button>
                            </div>
                        </div>
                        <div class="card-body p-0">
                            <div id="csc-content-type-list" class="csc-content-matrix">
                                <div class="csc-content-grid csc-content-grid-header" role="row">
                                    <div class="csc-content-cell">Include</div>
                                    <div class="csc-content-cell">Content Type</div>
                                    <div class="csc-content-cell">Publish</div>
                                    <div class="csc-content-cell">Options</div>
                                    <div class="csc-content-cell">Qty</div>
                                </div>
                                ${buildContentRowsMarkup()}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
            <button type="button" class="btn btn-sm btn-primary mt-2" id="create-course-btn">Create</button>
            </div>`

        eContent.append(createSupportCourseForm);
    }
    createSupportCourseForm.hidden = false;

    if (createSupportCourseForm.dataset.bound === 'true') return;
    createSupportCourseForm.dataset.bound = 'true';

    // Helpers
    function isPositiveInt(val) {
        if (val === undefined || val === null) return false;
        const v = String(val).trim();
        if (v.length === 0) return false;
        const n = Number(v);
        return Number.isInteger(n) && n > 0;
    }
    // Content checklist handlers
    const cscContentCheckboxes = createSupportCourseForm.querySelectorAll('.csc-content-check');
    const cscContentQtyInputs = createSupportCourseForm.querySelectorAll('.csc-content-qty');
    const cscContentPublishInputs = createSupportCourseForm.querySelectorAll('.csc-content-publish');
    const cscQuestionToggles = createSupportCourseForm.querySelectorAll('.csc-question-toggle');
    const cscSelectAllBtn = createSupportCourseForm.querySelector('#csc-select-all-content');
    const cscClearAllBtn = createSupportCourseForm.querySelector('#csc-clear-all-content');
    const contentSummary = createSupportCourseForm.querySelector('#csc-content-summary');

    // Track publish state per content type (persisted via config)
    let publishByType = {
        assignments: true,
        classicQuizzes: true,
        newQuizzes: true,
        discussions: true,
        pages: true,
        modules: true,   // modules/sections don't truly publish, kept for consistency
        sections: true
    };

    function publishApplicable(key) {
        return !(key === 'modules' || key === 'sections');
    }

    function getContentElements(key) {
        const rowGroup = createSupportCourseForm.querySelector(`.csc-row-group[data-content-key="${key}"]`);
        if (!rowGroup) return null;

        return {
            rowGroup,
            checkbox: rowGroup.querySelector('.csc-content-check'),
            qtyInput: rowGroup.querySelector('.csc-content-qty'),
            publishInput: rowGroup.querySelector('.csc-content-publish'),
            questionToggle: rowGroup.querySelector('.csc-question-toggle'),
            questionPanel: rowGroup.querySelector(`[data-question-panel="${key}"]`),
            questionSummary: rowGroup.querySelector(`[data-question-summary="${key}"]`)
        };
    }

    function getSelectedContentState() {
        return contentDefinitions.reduce((acc, definition) => {
            const elements = getContentElements(definition.key);
            if (!elements) return acc;

            const enabled = !!elements.checkbox?.checked;
            const quantity = enabled
                ? Math.max(parseInt(elements.qtyInput?.value || '1', 10) || 1, 1)
                : 0;

            acc[definition.key] = {
                enabled,
                quantity,
                publish: definition.supportsPublish ? !!elements.publishInput?.checked : true
            };

            return acc;
        }, {});
    }

    function setQuestionPanelVisibility(key, visible) {
        const elements = getContentElements(key);
        if (elements?.questionPanel) {
            elements.questionPanel.hidden = !visible;
        }
    }

    function updateQuestionSummary(key) {
        const elements = getContentElements(key);
        if (!elements?.questionSummary) return;

        if (!elements.checkbox?.checked) {
            elements.questionSummary.textContent = 'Enable this row first';
            return;
        }

        if (key === 'announcements') {
            if (!elements.questionToggle?.checked) {
                elements.questionSummary.textContent = 'Off';
                return;
            }

            elements.questionSummary.textContent = formatAnnouncementDelaySummary(announcementDelayInput?.value || '');
            return;
        }

        if (!elements.questionToggle?.checked) {
            elements.questionSummary.textContent = 'Off';
            return;
        }

        const selectedTypes = key === 'classicQuizzes' ? selectedQuestionTypes : selectedNewQQuestionTypes;
        if (selectedTypes.length === 0) {
            elements.questionSummary.textContent = 'No question types selected';
            return;
        }

        elements.questionSummary.textContent = `${selectedTypes.length} type${selectedTypes.length === 1 ? '' : 's'} selected`;
    }

    function resetQuestionConfig(key) {
        if (key === 'classicQuizzes') {
            if (addQuestionsSwitch) addQuestionsSwitch.checked = false;
            questionTypeCheckboxes.forEach((checkbox) => {
                checkbox.checked = false;
            });
            if (selectAllCheckbox) {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = false;
            }
            selectedQuestionTypes = [];
        }

        if (key === 'newQuizzes') {
            if (addNewQQuestionsSwitch) addNewQQuestionsSwitch.checked = false;
            newQQuestionTypeCheckboxes.forEach((checkbox) => {
                checkbox.checked = false;
            });
            if (selectAllNewQCheckbox) {
                selectAllNewQCheckbox.checked = false;
                selectAllNewQCheckbox.indeterminate = false;
            }
            selectedNewQQuestionTypes = [];
        }

        if (key === 'announcements') {
            if (announcementDelayToggle) announcementDelayToggle.checked = false;
            if (announcementDelayInput) announcementDelayInput.value = '';
        }

        setQuestionPanelVisibility(key, false);
        updateQuestionSummary(key);
    }

    function renderSummary() {
        if (!contentSummary) return;

        const contentState = getSelectedContentState();
        const items = [];

        for (const definition of contentDefinitions) {
            const row = contentState[definition.key];
            if (!row?.enabled || !isPositiveInt(row.quantity)) continue;

            const badges = [`<span class="badge text-bg-light">${row.quantity}</span>`];
            if (definition.supportsPublish) {
                badges.push(`<span class="badge ${row.publish ? 'text-bg-success' : 'text-bg-secondary'}">${row.publish ? 'Published' : 'Unpublished'}</span>`);
            }
            if (definition.key === 'classicQuizzes' && selectedQuestionTypes.length > 0) {
                badges.push(`<span class="badge text-bg-info">${selectedQuestionTypes.length} question type${selectedQuestionTypes.length === 1 ? '' : 's'}</span>`);
            }
            if (definition.key === 'newQuizzes' && selectedNewQQuestionTypes.length > 0) {
                badges.push(`<span class="badge text-bg-info">${selectedNewQQuestionTypes.length} question type${selectedNewQQuestionTypes.length === 1 ? '' : 's'}</span>`);
            }
            if (definition.key === 'announcements') {
                const delayEnabled = !!createSupportCourseForm.querySelector('#csc-delay-announcements')?.checked;
                const delayValue = createSupportCourseForm.querySelector('#csc-announcement-delay-date')?.value || '';
                badges.push(`<span class="badge ${delayEnabled && delayValue ? 'text-bg-info' : 'text-bg-light'}">${delayEnabled && delayValue ? 'Delayed' : 'Immediate'}</span>`);
            }

            items.push(`
                <div class="csc-summary-chip">
                    <span class="csc-summary-name">${definition.label}</span>
                    <span class="csc-summary-badges">${badges.join('')}</span>
                </div>`);
        }

        if (items.length === 0) {
            contentSummary.innerHTML = `
                <div class="csc-summary-empty">
                    <span class="badge text-bg-light">0 selected</span>
                    <span>No additional content selected.</span>
                </div>`;
        } else {
            contentSummary.innerHTML = `
                <div class="csc-summary-heading">Selected content</div>
                <div class="csc-summary-list">${items.join('')}</div>`;
        }
    }

    function syncContentRow(key, options = {}) {
        const { suppressSave = false, preserveQuestionState = false } = options;
        const elements = getContentElements(key);
        if (!elements) return;

        const enabled = !!elements.checkbox?.checked;
        elements.rowGroup.classList.toggle('is-selected', enabled);

        if (elements.qtyInput) {
            elements.qtyInput.disabled = !enabled;
            if (!enabled) {
                elements.qtyInput.value = '1';
            }
        }

        if (elements.publishInput) {
            elements.publishInput.disabled = !enabled;
            if (publishApplicable(key)) {
                publishByType[key] = !!elements.publishInput.checked;
            }
        }

        if (elements.questionToggle) {
            elements.questionToggle.disabled = !enabled;
            if (!enabled) {
                resetQuestionConfig(key);
            } else if (!preserveQuestionState && !elements.questionToggle.checked) {
                setQuestionPanelVisibility(key, false);
                updateQuestionSummary(key);
            } else if (elements.questionToggle.checked) {
                setQuestionPanelVisibility(key, true);
                updateQuestionSummary(key);
            }
        }

        renderSummary();
        if (!suppressSave && typeof saveDefaultsDebounced === 'function') saveDefaultsDebounced();
    }

    // Wire up each content-type row
    cscContentCheckboxes.forEach((checkbox) => {
        checkbox.addEventListener('change', () => syncContentRow(checkbox.dataset.key));
    });

    cscContentQtyInputs.forEach((input) => {
        input.addEventListener('click', (e) => e.stopPropagation());
        input.addEventListener('input', () => {
            if (!isPositiveInt(input.value)) {
                input.value = '1';
            }
            renderSummary();
            if (typeof saveDefaultsDebounced === 'function') saveDefaultsDebounced();
        });
    });

    cscContentPublishInputs.forEach((input) => {
        input.addEventListener('click', (e) => e.stopPropagation());
        input.addEventListener('change', () => {
            const key = input.dataset.key;
            if (key && publishApplicable(key)) {
                publishByType[key] = !!input.checked;
                renderSummary();
                if (typeof saveDefaultsDebounced === 'function') saveDefaultsDebounced();
            }
        });
    });

    cscQuestionToggles.forEach((input) => {
        input.addEventListener('click', (event) => event.stopPropagation());
        input.addEventListener('change', () => {
            const key = input.dataset.key;
            if (!key) return;

            if (input.checked) {
                setQuestionPanelVisibility(key, true);
            } else {
                resetQuestionConfig(key);
            }

            updateQuestionSummary(key);
            renderSummary();
            if (typeof saveDefaultsDebounced === 'function') saveDefaultsDebounced();
        });
    });

    // Select All / Clear All
    cscSelectAllBtn.addEventListener('click', (e) => {
        e.preventDefault();
        cscContentCheckboxes.forEach((checkbox) => {
            checkbox.checked = true;
            syncContentRow(checkbox.dataset.key, { suppressSave: true });
        });
        if (typeof saveDefaultsDebounced === 'function') saveDefaultsDebounced();
    });

    cscClearAllBtn.addEventListener('click', (e) => {
        e.preventDefault();
        cscContentCheckboxes.forEach((checkbox) => {
            checkbox.checked = false;
            syncContentRow(checkbox.dataset.key, { suppressSave: true });
        });
        if (typeof saveDefaultsDebounced === 'function') saveDefaultsDebounced();
    });

    // Quiz Questions functionality
    const addQuestionsSwitch = createSupportCourseForm.querySelector('#csc-add-questions');
    const quizQuestionsPanel = createSupportCourseForm.querySelector('#csc-quiz-questions-panel');
    const selectAllCheckbox = createSupportCourseForm.querySelector('#select-all-questions');
    const questionTypeCheckboxes = createSupportCourseForm.querySelectorAll('.question-type-checkbox');
    // New Quizzes counterparts
    const addNewQQuestionsSwitch = createSupportCourseForm.querySelector('#csc-add-newq-questions');
    const newQQuestionsPanel = createSupportCourseForm.querySelector('#csc-newq-questions-panel');
    const selectAllNewQCheckbox = createSupportCourseForm.querySelector('#select-all-newq-questions');
    const newQQuestionTypeCheckboxes = createSupportCourseForm.querySelectorAll('.newq-question-type-checkbox');
    const announcementDelayToggle = createSupportCourseForm.querySelector('#csc-delay-announcements');
    const announcementDelayInput = createSupportCourseForm.querySelector('#csc-announcement-delay-date');

    // Track selected question types
    let selectedQuestionTypes = [];
    let selectedNewQQuestionTypes = [];

    function formatAnnouncementDelaySummary(value) {
        if (!value) return 'Choose a post date';

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return 'Choose a post date';

        return `Posts ${parsed.toLocaleString()}`;
    }

    function updateSelectedQuestionTypes() {
        selectedQuestionTypes = Array.from(questionTypeCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
    }

    function updateSelectedNewQQuestionTypes() {
        selectedNewQQuestionTypes = Array.from(newQQuestionTypeCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
    }

    if (addQuestionsSwitch) {
        addQuestionsSwitch.addEventListener('click', (e) => e.stopPropagation());
        addQuestionsSwitch.addEventListener('change', () => {
            if (addQuestionsSwitch.checked) {
                setQuestionPanelVisibility('classicQuizzes', true);
            } else {
                resetQuestionConfig('classicQuizzes');
            }
            updateQuestionSummary('classicQuizzes');
            renderSummary();
            if (typeof saveDefaultsDebounced === 'function') saveDefaultsDebounced();
        });
    }

    if (addNewQQuestionsSwitch) {
        addNewQQuestionsSwitch.addEventListener('click', (e) => e.stopPropagation());
        addNewQQuestionsSwitch.addEventListener('change', () => {
            if (addNewQQuestionsSwitch.checked) {
                setQuestionPanelVisibility('newQuizzes', true);
            } else {
                resetQuestionConfig('newQuizzes');
            }
            updateQuestionSummary('newQuizzes');
            renderSummary();
            if (typeof saveDefaultsDebounced === 'function') saveDefaultsDebounced();
        });
    }

    if (announcementDelayInput) {
        announcementDelayInput.addEventListener('input', () => {
            updateQuestionSummary('announcements');
            renderSummary();
            if (typeof saveDefaultsDebounced === 'function') saveDefaultsDebounced();
        });
    }

    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', () => {
            const isChecked = selectAllCheckbox.checked;
            questionTypeCheckboxes.forEach(cb => { cb.checked = isChecked; });
            updateSelectedQuestionTypes();
            selectAllCheckbox.indeterminate = false;
            updateQuestionSummary('classicQuizzes');
            renderSummary();
            if (typeof saveDefaultsDebounced === 'function') saveDefaultsDebounced();
        });
    }

    if (selectAllNewQCheckbox) {
        selectAllNewQCheckbox.addEventListener('change', () => {
            const isChecked = selectAllNewQCheckbox.checked;
            newQQuestionTypeCheckboxes.forEach(cb => cb.checked = isChecked);
            updateSelectedNewQQuestionTypes();
            selectAllNewQCheckbox.indeterminate = false;
            updateQuestionSummary('newQuizzes');
            renderSummary();
            if (typeof saveDefaultsDebounced === 'function') saveDefaultsDebounced();
        });
    }

    questionTypeCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            updateSelectedQuestionTypes();
            const allChecked = Array.from(questionTypeCheckboxes).every(cb => cb.checked);
            const noneChecked = Array.from(questionTypeCheckboxes).every(cb => !cb.checked);
            selectAllCheckbox.checked = allChecked;
            selectAllCheckbox.indeterminate = !allChecked && !noneChecked;
            updateQuestionSummary('classicQuizzes');
            renderSummary();
            if (typeof saveDefaultsDebounced === 'function') saveDefaultsDebounced();
        });
    });

    newQQuestionTypeCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            updateSelectedNewQQuestionTypes();
            const allChecked = Array.from(newQQuestionTypeCheckboxes).every(cb => cb.checked);
            const noneChecked = Array.from(newQQuestionTypeCheckboxes).every(cb => !cb.checked);
            selectAllNewQCheckbox.checked = allChecked;
            selectAllNewQCheckbox.indeterminate = !allChecked && !noneChecked;
            updateQuestionSummary('newQuizzes');
            renderSummary();
            if (typeof saveDefaultsDebounced === 'function') saveDefaultsDebounced();
        });
    });

    contentDefinitions.forEach((definition) => {
        syncContentRow(definition.key, { suppressSave: true });
        updateQuestionSummary(definition.key);
    });
    renderSummary();

    // const eResponse = document.createElement('div');
    // eResponse.id = "response-container";
    // eResponse.classList.add('mt-5');
    // eContent.append(eResponse);

    const courseEventHandlers = {
        'course-blueprint': courseBPToggle,
        'course-add-users': courseAddUserToggle
    };

    const courseOptions = createSupportCourseForm.querySelector('#course-options');
    courseOptions.addEventListener('change', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const handler = courseEventHandlers[e.target.id];
        if (handler) {
            handler(e);
        }
        // switch (e.target.id) {
        //     case 'course-blueprint':
        //         courseBPToggle(e);
        //         break;
        //     case 'course-add-users':
        //         courseAddUserToggle(e);
        //         break;
        //     case 'course-assignments':
        //         courseAssignmentsToggle(e);
        //         break;
        //     case 'course-add-cq':
        //         courseAddClassicToggle(e); // TODO
        //         break;
        //     case 'course-add-nq':
        //         courseAddNewQToggle(e); // TODO
        //         break;
        //     case 'course-add-discussions':
        //         courseAddDiscussionsToggle(e); // TODO
        //         break;
        //     case 'course-add-pages':
        //         courseAddPagesToggle(e); // TODO
        //         break;
        //     case 'course-add-modules':
        //         courseAddModulesToggle(e); // TODO
        //         break;
        //     case 'course-add-sections':
        //         courseAddSectionsToggle(e); // TODO
        //         break;
        //     case 'course-submissions':
        //         courseCreateSubmissionsToggle(e); // TODO
        //         break;
        //     default:
        //         break;
        // }
    })

    function courseBPToggle(e) {
        const bpCourseDiv = createSupportCourseForm.querySelector('#add-ac-courses-div');
        if (e.target.checked) {
            bpCourseDiv.classList.remove('hidden');
            bpCourseDiv.classList.add('visible', 'mb-3');
        } else {
            bpCourseDiv.classList.add('hidden');
            bpCourseDiv.classList.remove('visible', 'mb-3');
        }
    }

    function courseAddUserToggle(e) {
        const addUsersDiv = createSupportCourseForm.querySelector('#add-users-div');
        if (e.target.checked) {
            addUsersDiv.classList.remove('hidden');
            addUsersDiv.classList.add('visible', 'mb-3');
        } else {
            addUsersDiv.classList.remove('visible', 'mb-3');
            addUsersDiv.classList.add('hidden');
        }
    }

    // persist on any option change
    if (typeof saveDefaultsDebounced === 'function') saveDefaultsDebounced();

    function collectConfigFromForm() {
        const contentState = getSelectedContentState();
        const cfg = {
            publish: !!createSupportCourseForm.querySelector('#course-publish')?.checked,
            blueprint: !!createSupportCourseForm.querySelector('#course-blueprint')?.checked,
            associated: createSupportCourseForm.querySelector('#csc-ac-input')?.value?.trim() || '',
            users: {
                enabled: !!createSupportCourseForm.querySelector('#course-add-users')?.checked,
                email: createSupportCourseForm.querySelector('#user-email')?.value?.trim() || '',
                students: createSupportCourseForm.querySelector('#course-add-students')?.value?.trim() || '',
                teachers: createSupportCourseForm.querySelector('#course-add-teachers')?.value?.trim() || '',
            },
            content: {},
            publishByType: {},
            quizQuestions: {
                enabled: !!createSupportCourseForm.querySelector('#csc-add-questions')?.checked,
                selectedTypes: [...selectedQuestionTypes]
            },
            newQuizQuestions: {
                enabled: !!createSupportCourseForm.querySelector('#csc-add-newq-questions')?.checked,
                selectedTypes: [...selectedNewQQuestionTypes]
            },
            announcementOptions: {
                enabled: !!createSupportCourseForm.querySelector('#csc-delay-announcements')?.checked,
                delayedPostAt: createSupportCourseForm.querySelector('#csc-announcement-delay-date')?.value || ''
            }
        };
        for (const definition of contentDefinitions) {
            const row = contentState[definition.key];
            if (row?.enabled && isPositiveInt(row.quantity)) {
                cfg.content[definition.key] = Number(row.quantity);
            }
            cfg.publishByType[definition.key] = row?.publish ?? publishByType[definition.key] ?? true;
        }
        return cfg;
    }

    function applyConfig(cfg) {
        try {
            // publish / blueprint
            const publish = createSupportCourseForm.querySelector('#course-publish');
            const blueprint = createSupportCourseForm.querySelector('#course-blueprint');
            const acInput = createSupportCourseForm.querySelector('#csc-ac-input');
            if (publish) publish.checked = !!cfg.publish;
            if (blueprint) {
                blueprint.checked = !!cfg.blueprint;
                courseBPToggle({ target: blueprint });
            }
            if (acInput) acInput.value = cfg.associated || '';

            // users
            const usersToggle = createSupportCourseForm.querySelector('#course-add-users');
            const email = createSupportCourseForm.querySelector('#user-email');
            const students = createSupportCourseForm.querySelector('#course-add-students');
            const teachers = createSupportCourseForm.querySelector('#course-add-teachers');
            if (usersToggle) {
                usersToggle.checked = !!cfg.users?.enabled;
                courseAddUserToggle({ target: usersToggle });
            }
            if (email) email.value = cfg.users?.email || '';
            if (students) students.value = cfg.users?.students || '';
            if (teachers) teachers.value = cfg.users?.teachers || '';

            // restore publish per type
            if (cfg.publishByType && typeof cfg.publishByType === 'object') {
                publishByType = { ...publishByType, ...cfg.publishByType };
            }

            for (const definition of contentDefinitions) {
                const elements = getContentElements(definition.key);
                if (!elements) continue;

                const qty = cfg.content?.[definition.key];
                elements.checkbox.checked = isPositiveInt(qty);
                elements.qtyInput.value = elements.checkbox.checked ? String(qty) : '1';

                if (elements.publishInput && typeof publishByType[definition.key] === 'boolean') {
                    elements.publishInput.checked = publishByType[definition.key];
                }

                syncContentRow(definition.key, { suppressSave: true, preserveQuestionState: true });
            }

            // quiz questions
            if (cfg.quizQuestions) {
                const addQuestionsSwitch = createSupportCourseForm.querySelector('#csc-add-questions');

                if (addQuestionsSwitch && cfg.quizQuestions.enabled) {
                    addQuestionsSwitch.checked = true;
                    setQuestionPanelVisibility('classicQuizzes', true);

                    // Restore selected question types
                    if (Array.isArray(cfg.quizQuestions.selectedTypes)) {
                        selectedQuestionTypes = [...cfg.quizQuestions.selectedTypes];
                        questionTypeCheckboxes.forEach(cb => {
                            cb.checked = selectedQuestionTypes.includes(cb.value);
                        });

                        // Update "Select All" checkbox state
                        const allChecked = Array.from(questionTypeCheckboxes).every(cb => cb.checked);
                        const noneChecked = Array.from(questionTypeCheckboxes).every(cb => !cb.checked);
                        selectAllCheckbox.checked = allChecked;
                        selectAllCheckbox.indeterminate = !allChecked && !noneChecked;
                    }
                } else {
                    resetQuestionConfig('classicQuizzes');
                }
                updateQuestionSummary('classicQuizzes');
            }

            // new quiz questions
            if (cfg.newQuizQuestions) {
                const addNQSwitch = createSupportCourseForm.querySelector('#csc-add-newq-questions');
                if (addNQSwitch && cfg.newQuizQuestions.enabled) {
                    addNQSwitch.checked = true;
                    setQuestionPanelVisibility('newQuizzes', true);
                    if (Array.isArray(cfg.newQuizQuestions.selectedTypes)) {
                        selectedNewQQuestionTypes = [...cfg.newQuizQuestions.selectedTypes];
                        const newQBoxes = createSupportCourseForm.querySelectorAll('.newq-question-type-checkbox');
                        newQBoxes.forEach(cb => cb.checked = selectedNewQQuestionTypes.includes(cb.value));
                        const allChecked = Array.from(newQBoxes).every(cb => cb.checked);
                        const noneChecked = Array.from(newQBoxes).every(cb => !cb.checked);
                        const selectAllNewQ = createSupportCourseForm.querySelector('#select-all-newq-questions');
                        if (selectAllNewQ) {
                            selectAllNewQ.checked = allChecked;
                            selectAllNewQ.indeterminate = !allChecked && !noneChecked;
                        }
                    }
                } else {
                    resetQuestionConfig('newQuizzes');
                }
                updateQuestionSummary('newQuizzes');
            }

            if (cfg.announcementOptions) {
                const announcementToggle = createSupportCourseForm.querySelector('#csc-delay-announcements');
                const announcementDateInput = createSupportCourseForm.querySelector('#csc-announcement-delay-date');

                if (announcementToggle && cfg.announcementOptions.enabled) {
                    announcementToggle.checked = true;
                    setQuestionPanelVisibility('announcements', true);
                } else {
                    resetQuestionConfig('announcements');
                }

                if (announcementDateInput) {
                    announcementDateInput.value = cfg.announcementOptions.delayedPostAt || '';
                }

                updateQuestionSummary('announcements');
            }

            renderSummary();
        } catch { /* no-op */ }
    }

    // Load defaults on init
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const cfg = JSON.parse(raw);
            if (cfg && typeof cfg === 'object') applyConfig(cfg);
        }
    } catch { /* no-op */ }
    //     e.stopPropagation();

    //     const addUsersDiv = eContent.querySelector('#add-users-div');
    //     if (e.target.checked) {
    //         addUsersDiv.classList.remove('hidden');
    //         addUsersDiv.classList.add('visible');
    //     } else {
    //         addUsersDiv.classList.remove('visible');
    //         addUsersDiv.classList.add('hidden');
    //     }
    // });

    // function checkIfEnabled() {
    //     const addUsersDiv = eContent.querySelector('#add-users-div');
    //     if (addUsersToggle.checked) {
    //         addUsersDiv.classList.remove('hidden');
    //         addUsersDiv.classList.add('visible');
    //     } else {
    //         addUsersDiv.classList.remove('visible');
    //         addUsersDiv.classList.add('hidden');
    //     }
    // }

    function normalizeCreateCourseStatusLabel(label) {
        const trimmedLabel = String(label || '').trim();
        if (/^Course created\. Processing options\.\.\.?$/i.test(trimmedLabel)) {
            return 'Processing options....';
        }
        return trimmedLabel;
    }

    function getCreateCourseStatusKey(label) {
        return normalizeCreateCourseStatusLabel(label)
            .replace(/\.\.\.\.done$/i, '')
            .replace(/\.\.\.$/, '')
            .replace(/\.\.\.$/, '')
            .trim();
    }

    function setCreateCourseStatusItem(statusList, statusState, label, options = {}) {
        const { done = false } = options;
        const normalizedLabel = normalizeCreateCourseStatusLabel(label);
        const key = getCreateCourseStatusKey(normalizedLabel);
        if (!key) return;

        let statusItem = statusState.items.get(key);
        if (!statusItem) {
            statusItem = document.createElement('div');
            statusItem.style.fontFamily = 'monospace';
            statusList.appendChild(statusItem);
            statusState.items.set(key, statusItem);
        }

        statusItem.className = done ? 'text-success mb-1' : 'text-primary mb-1';
        statusItem.innerHTML = `${done ? '✅' : '🔄'} ${normalizedLabel}`;
        statusState.currentKey = done && statusState.currentKey === key ? null : key;
        statusList.scrollTop = statusList.scrollHeight;
    }

    const createCourseBtn = createSupportCourseForm.querySelector('#create-course-btn');
    createCourseBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        createCourseBtn.disabled = true;
        const originalBtnHTML = createCourseBtn.innerHTML;
        createCourseBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Creating...';

        // Setup progress UI
        const cscProgressDiv = createSupportCourseForm.querySelector('#csc-progress-div');
        const cscProgressBar = cscProgressDiv.querySelector('.progress-bar');
        const cscProgressInfo = createSupportCourseForm.querySelector('#csc-progress-info');
        const cscStatusList = createSupportCourseForm.querySelector('#csc-status-list');
        cscProgressDiv.hidden = false;
        cscProgressBar.style.width = '0%';
        cscProgressInfo.textContent = 'Creating course...';
        cscStatusList.innerHTML = ''; // Clear any previous status items
        window.__cscStatusState = {
            items: new Map(),
            currentKey: null,
            lastRawLabel: ''
        };
        window.__cscLastAddingQuestionsLogged = false;
        setCreateCourseStatusItem(cscStatusList, window.__cscStatusState, 'Creating course...', { done: false });
        cscProgressDiv.scrollIntoView({ block: 'start', behavior: 'smooth' });

        // Attach a progress listener once (overall progress only)
        if (!window.__cscProgressListenerAttached && window.progressAPI?.onUpdateProgress) {
            window.__cscProgressListenerAttached = true;
            window.progressAPI.onUpdateProgress((payload) => {
                try {
                    // Only show overall progress bar; labels display current section subcounts
                    if (typeof payload === 'number') {
                        cscProgressBar.style.width = `${payload}%`;
                        return;
                    }
                    if (payload && typeof payload === 'object') {
                        if (payload.label) {
                            const rawLabel = String(payload.label).trim();
                            const statusState = window.__cscStatusState || { items: new Map(), currentKey: null, lastRawLabel: '' };
                            if (rawLabel === statusState.lastRawLabel && !rawLabel.endsWith('....done')) {
                                cscProgressInfo.textContent = normalizeCreateCourseStatusLabel(rawLabel);
                            } else {
                                statusState.lastRawLabel = rawLabel;

                                if (/^Course created\. Processing options\.\.\.?$/i.test(rawLabel)) {
                                    setCreateCourseStatusItem(cscStatusList, statusState, 'Creating course....done', { done: true });
                                    setCreateCourseStatusItem(cscStatusList, statusState, 'Processing options....', { done: false });
                                    cscProgressInfo.textContent = 'Processing options....';
                                    window.__cscStatusState = statusState;
                                } else {
                                    // Suppress duplicate generic 'Adding questions to quizzes...' style logs
                                    const isAddingQuestionsMsg = /Adding questions to .*quiz/i.test(rawLabel) || /Adding quiz questions/i.test(rawLabel);
                                    if (isAddingQuestionsMsg) {
                                        window.__cscLastAddingQuestionsLogged = window.__cscLastAddingQuestionsLogged || false;
                                        if (window.__cscLastAddingQuestionsLogged) {
                                            // Already logged once; only update main info text and skip adding another entry
                                            cscProgressInfo.textContent = normalizeCreateCourseStatusLabel(rawLabel);
                                        } else {
                                            window.__cscLastAddingQuestionsLogged = true;
                                        }
                                    }
                                    // Check if this is a completion message (ends with "....done")
                                    if (rawLabel.endsWith('....done')) {
                                        setCreateCourseStatusItem(cscStatusList, statusState, normalizeCreateCourseStatusLabel(rawLabel), { done: true });

                                        // Keep the current progress info for ongoing operations
                                        if (rawLabel.includes('Course creation completed successfully')) {
                                            cscProgressInfo.textContent = 'All operations completed!';
                                        } else {
                                            cscProgressInfo.textContent = 'Processing next operation...';
                                        }
                                    } else if (rawLabel.endsWith('...') && !rawLabel.includes('done') && !rawLabel.includes('(') && !isAddingQuestionsMsg) {
                                        setCreateCourseStatusItem(cscStatusList, statusState, normalizeCreateCourseStatusLabel(rawLabel), { done: false });

                                        // Also update the main progress info
                                        cscProgressInfo.textContent = normalizeCreateCourseStatusLabel(rawLabel);
                                    } else {
                                        // General progress update (like progress counters)
                                        cscProgressInfo.textContent = normalizeCreateCourseStatusLabel(rawLabel);
                                    }
                                    window.__cscStatusState = statusState;
                                }
                            }
                        }
                        // Only treat explicit overall percent as authoritative for the bar width
                        if (typeof payload.percent === 'number') {
                            cscProgressBar.style.width = `${payload.percent}%`;
                        } else if (payload.mode === 'done') {
                            cscProgressBar.style.width = '100%';
                        }
                    }
                } catch { /* no-op */ }
            });
        }

        const domain = document.querySelector('#domain').value;
        const apiToken = document.querySelector('#token').value;

        const createCourseResponseContainer = createSupportCourseForm.querySelector('#csc-response-container');
        createCourseResponseContainer.innerHTML = '';

        // basic course stuff
        const courseName = createSupportCourseForm.querySelector('#course-name').value;
        const coursePublishChbx = createSupportCourseForm.querySelector('#course-publish').checked;

        // blueprint stuff
        const courseBlueprintChbx = createSupportCourseForm.querySelector('#course-blueprint').checked;
        // Courses to associate
        const numACCoursesValue = createSupportCourseForm.querySelector('#csc-ac-input').value;
        const acErrorText = createSupportCourseForm.querySelector('#ac-course-text');

        // Add users stuff
        const courseAddUsersChbx = createSupportCourseForm.querySelector('#course-add-users').checked;
        // Users to add
        const emailInput = createSupportCourseForm.querySelector('#user-email').value;
        const emailMatch = emailInput.match(/^[^@]+/);
        const emailPrefix = emailMatch ? emailMatch[0] : null;
        const addStudents = createSupportCourseForm.querySelector('#course-add-students').value;
        const addTeachers = createSupportCourseForm.querySelector('#course-add-teachers').value;

        const contentState = getSelectedContentState();
        const assignmentsConfig = contentState.assignments ?? { enabled: false, quantity: 0 };
        const classicQuizConfig = contentState.classicQuizzes ?? { enabled: false, quantity: 0 };
        const newQuizConfig = contentState.newQuizzes ?? { enabled: false, quantity: 0 };
        const announcementsConfig = contentState.announcements ?? { enabled: false, quantity: 0 };
        const discussionsConfig = contentState.discussions ?? { enabled: false, quantity: 0 };
        const pagesConfig = contentState.pages ?? { enabled: false, quantity: 0 };
        const modulesConfig = contentState.modules ?? { enabled: false, quantity: 0 };
        const sectionsConfig = contentState.sections ?? { enabled: false, quantity: 0 };

        // quiz questions data
        const addQuestionsEnabled = createSupportCourseForm.querySelector('#csc-add-questions')?.checked || false;
        const selectedQuestionTypesForAPI = addQuestionsEnabled ? [...selectedQuestionTypes] : [];
        const addNewQQuestionsEnabled = createSupportCourseForm.querySelector('#csc-add-newq-questions')?.checked || false;
        const selectedNewQQuestionTypesForAPI = addNewQQuestionsEnabled ? [...selectedNewQQuestionTypes] : [];
        const announcementDelayEnabled = createSupportCourseForm.querySelector('#csc-delay-announcements')?.checked || false;
        const announcementDelayValue = announcementDelayEnabled
            ? createSupportCourseForm.querySelector('#csc-announcement-delay-date')?.value || ''
            : '';
        const announcementDelayedPostAt = announcementDelayValue ? new Date(announcementDelayValue).toISOString() : null;

        const contentPublish = contentDefinitions.reduce((acc, definition) => {
            acc[definition.key] = contentState[definition.key]?.publish ?? publishByType[definition.key] ?? true;
            return acc;
        }, {});

        const data = {
            domain: domain,
            token: apiToken,
            course_id: null,
            email: emailPrefix,
            course: {
                name: courseName,
                publish: coursePublishChbx,
                blueprint: {
                    state: courseBlueprintChbx,
                    associated_courses: numACCoursesValue > 0 ? numACCoursesValue : null
                },
                addUsers: {
                    state: courseAddUsersChbx,
                    students: addStudents > 0 ? addStudents : null,
                    teachers: addTeachers > 0 ? addTeachers : null
                },
                addAssignments: {
                    state: assignmentsConfig.enabled,
                    number: assignmentsConfig.quantity > 0 ? assignmentsConfig.quantity : null
                },
                addCQ: {
                    state: classicQuizConfig.enabled,
                    number: classicQuizConfig.quantity > 0 ? classicQuizConfig.quantity : null,
                    addQuestions: addQuestionsEnabled,
                    questionTypes: selectedQuestionTypesForAPI
                },
                addNQ: {
                    state: newQuizConfig.enabled,
                    number: newQuizConfig.quantity > 0 ? newQuizConfig.quantity : null
                },
                newQuizQuestions: {
                    addQuestions: addNewQQuestionsEnabled,
                    questionTypes: selectedNewQQuestionTypesForAPI
                },
                addAnnouncements: {
                    state: announcementsConfig.enabled,
                    number: announcementsConfig.quantity > 0 ? announcementsConfig.quantity : null,
                    delayPosting: announcementDelayEnabled,
                    delayed_post_at: announcementDelayedPostAt
                },
                addDiscussions: {
                    state: discussionsConfig.enabled,
                    number: discussionsConfig.quantity > 0 ? discussionsConfig.quantity : null
                },
                addPages: {
                    state: pagesConfig.enabled,
                    number: pagesConfig.quantity > 0 ? pagesConfig.quantity : null
                },
                addModules: {
                    state: modulesConfig.enabled,
                    number: modulesConfig.quantity > 0 ? modulesConfig.quantity : null
                },
                addSections: {
                    state: sectionsConfig.enabled,
                    number: sectionsConfig.quantity > 0 ? sectionsConfig.quantity : null
                },
                // per-content publish flags
                contentPublish
            }
        }

        console.log('The data is: ', data);

        try {
            // persist current defaults at creation time
            if (typeof saveDefaults === 'function') saveDefaults();
            const response = await window.axios.createSupportCourse(data);
            const createdCourseId = response?.course_id ?? response?.courseId ?? response?.id ?? response?.course?.id ?? null;

            if (createdCourseId) {
                createCourseResponseContainer.innerHTML = `
                    <div class="alert alert-success py-2 mt-2 mb-2">
                        Done.
                        <p class="mb-0 mt-1">Course ID: <a id="course-link" href="https://${domain}/courses/${createdCourseId}" target="_blank">${createdCourseId}</a></p>
                    </div>`;
                createCourseResponseContainer.scrollIntoView({ block: 'start', behavior: 'smooth' });

                const courseLink = createCourseResponseContainer.querySelector('#course-link');
                courseLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    console.log('Inside courseLink click listener');
                    console.log('The target is ', e.target.href);
                    window.shell.openExternal(e.target.href);
                });
            } else {
                createCourseResponseContainer.innerHTML = `
                    <div class="alert alert-warning py-2 mt-2 mb-2">
                        Course created, but the returned course ID was missing from the response.
                    </div>`;
                createCourseResponseContainer.scrollIntoView({ block: 'start', behavior: 'smooth' });
            }
        } catch (error) {
            console.log('Error: ', error);
            errorHandler(error, createCourseResponseContainer);
        } finally {
            createCourseBtn.disabled = false;
            createCourseBtn.innerHTML = originalBtnHTML;
        }

    });
}

async function createAssociatedCourses(e) {
    hideEndpoints(e);

    const eContent = document.querySelector('#endpoint-content');
    let createAssociatedCoursesForm = eContent.querySelector('#create-associated-courses-form');

    if (!createAssociatedCoursesForm) {
        createAssociatedCoursesForm = document.createElement('form');
        createAssociatedCoursesForm.id = 'create-associated-courses-form';

        createAssociatedCoursesForm.innerHTML = `
            <style>
                #create-associated-courses-form .card-title { font-size: 1.1rem; }
                #create-associated-courses-form .card-header small { font-size: 0.7rem; }
                #create-associated-courses-form .form-label { font-size: 0.85rem; }
                #create-associated-courses-form .form-text { font-size: 0.7rem; }
                #create-associated-courses-form .card-body { padding: 0.75rem; }
                #create-associated-courses-form .btn { padding: 0.35rem 0.75rem; font-size: 0.85rem; }
                #create-associated-courses-form .form-control { font-size: 0.85rem; padding: 0.25rem 0.5rem; }
                #create-associated-courses-form .bi { font-size: 0.9rem; }
                #create-associated-courses-form .mb-3 { margin-bottom: 0.5rem !important; }
                #create-associated-courses-form .mt-3 { margin-top: 0.5rem !important; }
                #create-associated-courses-form .progress { height: 12px; }
            </style>
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-diagram-3 me-1"></i>Create Associated Courses
                    </h3>
                    <small class="text-muted">Create multiple courses and associate them with a blueprint course</small>
                </div>
                <div class="card-body">
            <div id="ac-container">
                <div class="row flex-column">
                    <div class="mb-2 col-auto">
                        <label class="form-label" for="bp-course-id">Blueprint Course ID to associated courses to</label>
                    </div>
                    <div class="row">
                        <div class="mb-2 col-2">
                            <input type="text" class="form-control form-control-sm" id="bp-course-id" aria-describedby="bp-course-text">
                        </div>
                        <div class="col-auto">
                            <span id="bp-course-text" class="form-text" hidden style="color: red;">Must be a number</span>
                        </div>
                    </div>
                </div>
                <div class="row flex-column">
                    <div class="mb-2 col-auto">
                        <label class="form-label" for="num-ac-courses">How many courses do you want to associate</label>
                    </div>
                    <div class="row">
                        <div class="mb-2 col-2">
                            <input type="text" class="form-control form-control-sm" id="num-ac-courses" aria-describedby="ac-course-text">
                        </div>
                        <div class="col-auto">
                            <span id="ac-course-text" class="form-text" hidden style="color: red;">Must be a number</span>
                        </div>
                    </div>
                </div>
            </div>
            <button type="button" class="btn btn-sm btn-primary mt-2" id="associateBtn">Associate</button>
            <div id="assc-progress-div" hidden>
                <p id="assc-progress-info"></p>
                <div class="progress mt-2" style="width: 75%" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
            </div>
            </div>
        </div>`

        eContent.append(createAssociatedCoursesForm);
    }
    createAssociatedCoursesForm.hidden = false;

    if (createAssociatedCoursesForm.dataset.bound === 'true') return;
    createAssociatedCoursesForm.dataset.bound = 'true';


    const associateBtn = createAssociatedCoursesForm.querySelector('#associateBtn');
    const bpCourseText = createAssociatedCoursesForm.querySelector('#bp-course-text');
    const acCourseText = createAssociatedCoursesForm.querySelector('#ac-course-text');

    const acContainer = createAssociatedCoursesForm.querySelector('#ac-container');

    const bpInput = createAssociatedCoursesForm.querySelector('#bp-course-id');
    const acInput = createAssociatedCoursesForm.querySelector('#num-ac-courses');

    associateBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        associateBtn.disabled = true;

        const bpValue = bpInput.value;
        const acValue = acInput.value;
        let inputError = true;
        let bpValid;
        let acValid;

        bpValid = validateInput(bpValue, bpCourseText);
        acValid = validateInput(acValue, acCourseText);

        if (bpValid && acValid) {
            const domain = document.querySelector('#domain').value;
            const token = document.querySelector('#token').value;
            const asscProgressDiv = createAssociatedCoursesForm.querySelector('#assc-progress-div');
            const asscProgressInfo = createAssociatedCoursesForm.querySelector('#assc-progress-info');
            const asscProgressBar = asscProgressDiv.querySelector('.progress-bar');

            const data = {
                domain: domain,
                token: token,
                bpCourseID: parseInt(bpValue),
                acCourseNum: parseInt(acValue)
            }

            // check to make sure the BP course is a BP course
            let isBluePrint = false;
            try {
                const request = await window.axios.getCourseInfo(data);
                isBluePrint = request.blueprint;
            } catch (error) {
                errorHandler(error, asscProgressInfo);
            }

            if (isBluePrint) {
                // create the courses to be added as associated courses
                try {
                    asscProgressDiv.hidden = false;
                    asscProgressBar.style.width = '0%';
                    asscProgressInfo.textContent = `Creating ${acValue} associated course(s)...`;

                    if (window.progressAPI) {
                        window.progressAPI.onUpdateProgress((progress) => {
                            asscProgressBar.style.width = `${progress}%`;
                        });
                    }

                    const courseResponse = await window.axios.createBasicCourse(data);

                    if (courseResponse.failed && courseResponse.failed.length > 0) {
                        asscProgressInfo.textContent = `Failed to create ${courseResponse.failed.length} course(s). Aborting association.`;
                        return;
                    }
                    const associatedCourses = courseResponse.successful.map(course => course.value.id);

                    // adding the ids of the courses to be associated to the data set
                    data.associated_course_ids = associatedCourses;

                    asscProgressInfo.textContent = `Associating ${associatedCourses.length} course(s) to blueprint and starting sync...`;
                    const associate = await window.axios.associateCourses(data);
                    if (associate?.workflow_state) {
                        asscProgressInfo.textContent = `Association complete. Sync status: ${associate.workflow_state}.`;
                    } else {
                        asscProgressInfo.textContent = `Association complete.`;
                    }
                    console.log('Finished associating courses.');

                    // const acResponse = await window.axios.addAssociateCourse(data);
                } catch (error) {
                    errorHandler(error, asscProgressInfo);
                } finally {
                    associateBtn.disabled = false;
                }
            } else {
                asscProgressInfo.innerHTML = 'BluePrint course isn\'t setup as blueprint. Unable to associate courses.';
                associateBtn.disabled = false;
            }
        } else {
            associateBtn.disabled = false;
        }
    });
}