// ****************************************************
//
// Assignment Endpoints
//
// ****************************************************

// Helper function to create consistent error display across all assignment operations
function createErrorCard(failedItems, operationType = 'assignment') {
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
            if (failedItem.reason.includes('ENOTFOUND') || failedItem.reason.includes('getaddrinfo')) {
                errorDetail = 'Cannot reach the server. Check your Canvas domain - make sure it\'s spelled correctly and doesn\'t include "https://".';
            } else {
                errorDetail = 'Network connection problem. Check your internet connection and Canvas domain.';
            }
        } else if (failedItem.status) {
            switch (failedItem.status) {
                case 401:
                    errorDetail = 'Authentication failed. Check your API token.';
                    break;
                case 403:
                    errorDetail = 'Access forbidden. Check permissions or wait if rate limited.';
                    break;
                case 404:
                    errorDetail = `${operationType === 'assignment' ? 'Course or assignment' : 'Resource'} not found. Check your inputs.`;
                    break;
                case 422:
                    errorDetail = 'Validation error. Check your input values.';
                    break;
                default:
                    errorDetail = `Server returned error ${failedItem.status}.`;
                    break;
            }
        } else {
            errorDetail = 'Unknown error occurred.';
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

// Helper function to create result cards for operations with success/failure counts
function createResultCard(title, message, failedItems = [], alertType = 'success') {
    const cardId = `result-card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    let cardHTML = `
        <div class="card mt-3">
            <div class="card-header">
                <h6 class="mb-0">${title}</h6>
            </div>
            <div class="card-body">
                <div class="alert alert-${alertType} mb-0" role="alert">
                    ${message}
                </div>
    `;

    // Add error details if there are failed items
    if (failedItems && failedItems.length > 0) {
        cardHTML += createErrorCard(failedItems, 'assignment');
    }

    cardHTML += `
            </div>
        </div>
    `;

    // Create and return the DOM element
    const container = document.createElement('div');
    container.innerHTML = cardHTML;
    return container.firstElementChild;
}

function assignmentTemplate(e) {
    // const eContent = document.querySelector('#endpoint-content');
    // eContent.innerHTML = `${e.target.id} was clicked`;

    switch (e.target.id) {
        case 'create-assignments':
            assignmentCreator(e);
            break;
        case 'delete-assignments-combined':
            deleteAssignmentsCombined(e);
            break;
        case 'delete-nosubmission-assignments':
            noSubmissionAssignments(e);
            break;
        case 'delete-no-due-date-assignments':
            deleteNoDueDateAssignments(e);
            break;
        case 'delete-unpublished-assignments':
            unpublishedAssignments(e);
            break;
        case 'delete-nonmodule-assignments':
            nonModuleAssignments(e);
            break;
        case 'delete-old-assignments':
            deleteOldAssignments(e);
            break;
        case 'delete-assignments-from-import':
            deleteAssignmentsFromImport(e);
            break;
        case 'keep-assignments-in-group':
            keepAssignmentsInGroup(e);
            break;
        case 'move-assignments':
            moveAssignmentsToSingleGroup(e);
            break;
        case 'delete-assignments-from-group':
            deleteAssignmentsInGroup(e);
            break;
        default:
            break;
    }
}

// Combined Delete Assignments with selectable filters (AND semantics)
function deleteAssignmentsCombined(e) {
    hideEndpoints(e);

    const eContent = document.querySelector('#endpoint-content');
    let form = eContent.querySelector('#combined-delete-assignments-form');

    if (!form) {
        form = document.createElement('form');
        form.id = 'combined-delete-assignments-form';
        form.innerHTML = `
            <style>
                #combined-delete-assignments-form .card-title { font-size: 1.1rem; }
                #combined-delete-assignments-form .card-header small { font-size: 0.75rem; }
                #combined-delete-assignments-form .form-label { font-size: 0.85rem; font-weight: 600; }
                #combined-delete-assignments-form .form-control,
                #combined-delete-assignments-form .form-select { font-size: 0.85rem; padding: 0.25rem 0.5rem; }
                #combined-delete-assignments-form .form-text { font-size: 0.7rem; }
                #combined-delete-assignments-form .form-check-label { font-size: 0.85rem; }
                #combined-delete-assignments-form .btn { font-size: 0.85rem; padding: 0.35rem 0.75rem; }
                #combined-delete-assignments-form .bi { font-size: 0.9rem; }
                #combined-delete-assignments-form .alert { font-size: 0.85rem; padding: 0.5rem 0.75rem; }
                #combined-delete-assignments-form .card-body { padding: 0.75rem; }
                #combined-delete-assignments-form .progress { height: 12px; }
                #combined-delete-assignments-form .gap-2 { gap: 0.5rem !important; }
                #combined-delete-assignments-form .g-3 { gap: 0.5rem !important; }
                #combined-delete-assignments-form .mb-3 { margin-bottom: 0.5rem !important; }
                #combined-delete-assignments-form .mb-4 { margin-bottom: 0.5rem !important; }
                #combined-delete-assignments-form .mt-3 { margin-top: 0.5rem !important; }
                #combined-delete-assignments-form .mt-2 { margin-top: 0.5rem !important; }
            </style>
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-trash me-1"></i>Delete Assignments
                    </h3>
                    <small class="text-muted">Select one or more filters. We'll find assignments that match ALL selected filters.</small>
                </div>
                <div class="card-body">
                    <div class="alert alert-info mb-2">
                        <i class="bi bi-info-circle me-1"></i>
                        <strong>Note:</strong> Assignments with grades are automatically excluded unless you check "Include assignments with grades".
                    </div>

                    <div class="row g-3 align-items-end mb-2">
                        <div class="col-md-4">
                            <label for="course-id" class="form-label fw-bold">
                                <i class="bi bi-book me-1"></i>Course ID
                            </label>
                            <input id="course-id" type="text" class="form-control form-control-sm" 
                                   aria-describedby="course-id-help" inputmode="numeric" 
                                   placeholder="Enter course ID" />
                            <div class="invalid-feedback">
                                <i class="bi bi-exclamation-triangle me-1"></i>Please enter a valid numeric Course ID
                            </div>
                        </div>
                        <div class="col-md-8 d-flex align-items-end gap-2">
                            <button id="combined-check-btn" type="button" class="btn btn-sm btn-warning" disabled>
                                <i class="bi bi-search me-1"></i>Check Assignments
                            </button>
                            <button id="combined-cancel-btn" type="button" class="btn btn-sm btn-outline-secondary" disabled>
                                <i class="bi bi-x-circle me-1"></i>Cancel
                            </button>
                        </div>
                    </div>

            <!-- Processing Card -->
            <div class="card mt-2" id="combined-progress-div" hidden>
                <div class="card-header">
                    <h5 class="card-title mb-0">
                        <i class="bi bi-gear me-1"></i>Processing Assignments
                    </h5>
                </div>
                <div class="card-body">
                    <div class="d-flex align-items-center gap-2 mb-2">
                        <div class="spinner-border spinner-border-sm text-secondary" role="status" aria-hidden="true"></div>
                        <p id="combined-progress-info" class="mb-0">Preparing...</p>
                    </div>
                    <div class="progress mb-2" style="height: 12px;">
                        <div class="progress-bar progress-bar-striped progress-bar-animated" 
                             role="progressbar" style="width: 0%" 
                             aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                        </div>
                    </div>
                    <button id="cancel-delete-assignments-btn" type="button" class="btn btn-sm btn-warning mt-2" hidden>
                        <i class="bi bi-x-circle me-1"></i>Cancel Deletion
                    </button>
                </div>
            </div>

            <!-- Results Card -->
            <div class="card mt-2" id="combined-response-container-card" hidden>
                <div class="card-body" id="combined-response-container"></div>
            </div>

            <div class="card mb-2 mt-2">
                <div class="card-header" style="cursor: pointer;" id="filters-header">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-0">Filters</h6>
                            <small class="text-muted">Select one or more filters to apply</small>
                        </div>
                        <i class="bi bi-chevron-down" id="filters-chevron"></i>
                    </div>
                </div>
                <div class="card-body" id="filters-body" style="display: none;">
                    <div class="row g-2">
                        <div class="col-auto form-check">
                            <input id="f-include-graded" class="form-check-input" type="checkbox" />
                            <label for="f-include-graded" class="form-check-label">Include assignments with grades</label>
                        </div>
                        <div class="w-100"></div>
                        <div class="col-auto form-check">
                            <input id="f-nonmodule" class="form-check-input" type="checkbox" />
                            <label for="f-nonmodule" class="form-check-label">Not in a module</label>
                        </div>
                        <div class="col-auto form-check">
                            <input id="f-noduedate" class="form-check-input" type="checkbox" />
                            <label for="f-noduedate" class="form-check-label">No due date</label>
                        </div>
                        <div class="col-auto form-check">
                            <input id="f-unpublished" class="form-check-input" type="checkbox" />
                            <label for="f-unpublished" class="form-check-label">Unpublished</label>
                        </div>
                        <div class="col-auto form-check">
                            <input id="f-nosubs" class="form-check-input" type="checkbox" />
                            <label for="f-nosubs" class="form-check-label">No submissions</label>
                        </div>
                        <div class="w-100"></div>
                        <div class="col-auto form-check" id="f-older-than-container">
                            <input id="f-older-than" class="form-check-input" type="checkbox" />
                            <label for="f-older-than" class="form-check-label">Due date Before</label>
                        </div>
                        <div class="col-auto" id="f-older-date-container">
                            <input id="f-older-date" class="form-control" type="date" disabled />
                        </div>
                        <div class="w-100"></div>
                        <div class="col-auto form-check">
                            <input id="f-older-created" class="form-check-input" type="checkbox" />
                            <label for="f-older-created" class="form-check-label">Created At Before</label>
                        </div>
                        <div class="col-auto">
                            <input id="f-older-created-date" class="form-control" type="date" disabled />
                        </div>
                        <div class="w-100"></div>
                        <div class="col-auto form-check">
                            <input id="f-from-import" class="form-check-input" type="checkbox" />
                            <label for="f-from-import" class="form-check-label">From specific import</label>
                        </div>
                        <div class="col-auto">
                            <input id="f-import-id" class="form-control" type="text" placeholder="Import ID" disabled />
                        </div>
                        <div class="w-100"></div>
                        <div class="col-auto form-check">
                            <input id="f-in-group" class="form-check-input" type="checkbox" />
                            <label for="f-in-group" class="form-check-label">In specific assignment group</label>
                        </div>
                        <div class="w-100"></div>
                        <div class="col-auto ms-4">
                            <div class="form-check form-check-inline">
                                <input class="form-check-input" type="radio" name="in-group-mode" id="f-in-group-mode-id" value="id" checked disabled>
                                <label class="form-check-label" for="f-in-group-mode-id">By ID</label>
                            </div>
                            <div class="form-check form-check-inline">
                                <input class="form-check-input" type="radio" name="in-group-mode" id="f-in-group-mode-name" value="name" disabled>
                                <label class="form-check-label" for="f-in-group-mode-name">By Name</label>
                            </div>
                        </div>
                        <div class="w-100"></div>
                        <div class="col-auto ms-4" id="f-in-group-id-container">
                            <input id="f-group-id" class="form-control" type="text" placeholder="Assignment Group ID" disabled />
                        </div>
                        <div class="col-auto ms-4" id="f-in-group-name-container" style="display: none;">
                            <div class="dropdown w-100" id="f-group-name-dropdown">
                                <div class="input-group input-group-sm">
                                    <span class="input-group-text"><i class="bi bi-search"></i></span>
                                    <input id="f-group-name" class="form-control" type="text" list="f-group-name-list" placeholder="Search or select group" aria-label="Search or select assignment group" autocomplete="off" disabled />
                                    <button id="f-group-name-toggle" class="btn btn-outline-secondary dropdown-toggle" type="button" aria-label="Show group options"></button>
                                </div>
                                <div class="dropdown-menu w-100 shadow-sm" id="f-group-name-menu"></div>
                            </div>
                            <datalist id="f-group-name-list"></datalist>
                            <small class="form-text text-muted">Type to search, or use the arrow to open the list</small>
                        </div>
                        <div class="w-100"></div>
                        <div class="col-auto form-check">
                            <input id="f-not-in-group" class="form-check-input" type="checkbox" />
                            <label for="f-not-in-group" class="form-check-label">NOT in specific assignment group</label>
                        </div>
                        <div class="w-100"></div>
                        <div class="col-auto ms-4">
                            <div class="form-check form-check-inline">
                                <input class="form-check-input" type="radio" name="not-in-group-mode" id="f-not-in-group-mode-id" value="id" checked disabled>
                                <label class="form-check-label" for="f-not-in-group-mode-id">By ID</label>
                            </div>
                            <div class="form-check form-check-inline">
                                <input class="form-check-input" type="radio" name="not-in-group-mode" id="f-not-in-group-mode-name" value="name" disabled>
                                <label class="form-check-label" for="f-not-in-group-mode-name">By Name</label>
                            </div>
                        </div>
                        <div class="w-100"></div>
                        <div class="col-auto ms-4" id="f-not-in-group-id-container">
                            <input id="f-not-group-id" class="form-control" type="text" placeholder="Assignment Group ID" disabled />
                        </div>
                        <div class="col-auto ms-4" id="f-not-in-group-name-container" style="display: none;">
                            <div class="dropdown w-100" id="f-not-group-name-dropdown">
                                <div class="input-group input-group-sm">
                                    <span class="input-group-text"><i class="bi bi-search"></i></span>
                                    <input id="f-not-group-name" class="form-control" type="text" list="f-not-group-name-list" placeholder="Search or select group" aria-label="Search or select assignment group" autocomplete="off" disabled />
                                    <button id="f-not-group-name-toggle" class="btn btn-outline-secondary dropdown-toggle" type="button" aria-label="Show group options"></button>
                                </div>
                                <div class="dropdown-menu w-100 shadow-sm" id="f-not-group-name-menu"></div>
                            </div>
                            <datalist id="f-not-group-name-list"></datalist>
                            <small class="form-text text-muted">Type to search, or use the arrow to open the list</small>
                        </div>
                    </div>
                </div>
                </div>
            </div>
        `;
        eContent.append(form);

        const courseID = form.querySelector('#course-id');
        const checkBtn = form.querySelector('#combined-check-btn');
        const cancelBtn = form.querySelector('#combined-cancel-btn');
        const progressDiv = form.querySelector('#combined-progress-div');
        const progressBar = progressDiv.querySelector('.progress-bar');
        const spinner = progressDiv.querySelector('.spinner-border');
        const progressInfo = form.querySelector('#combined-progress-info');
        const responseDiv = form.querySelector('#combined-response-container');
        const cancelDeleteBtn = form.querySelector('#cancel-delete-assignments-btn');

        // Track current delete operation
        let currentDeleteOperationId = null;
        let isDeleting = false;
        let isDeletingCancelling = false;

        const fNoSubs = form.querySelector('#f-nosubs');
        const fOlder = form.querySelector('#f-older-than');
        const fOlderDate = form.querySelector('#f-older-date');
        const fOlderCreated = form.querySelector('#f-older-created');
        const fOlderCreatedDate = form.querySelector('#f-older-created-date');
        const fNonModule = form.querySelector('#f-nonmodule');
        const fNoDue = form.querySelector('#f-noduedate');
        const fUnpub = form.querySelector('#f-unpublished');
        const fFromImport = form.querySelector('#f-from-import');
        const fImportId = form.querySelector('#f-import-id');
        const fInGroup = form.querySelector('#f-in-group');
        const fGroupId = form.querySelector('#f-group-id');
        const fGroupName = form.querySelector('#f-group-name');
        const fInGroupModeId = form.querySelector('#f-in-group-mode-id');
        const fInGroupModeName = form.querySelector('#f-in-group-mode-name');
        const fInGroupIdContainer = form.querySelector('#f-in-group-id-container');
        const fInGroupNameContainer = form.querySelector('#f-in-group-name-container');
        const fGroupNameList = form.querySelector('#f-group-name-list');
        const fGroupNameDropdown = form.querySelector('#f-group-name-dropdown');
        const fGroupNameToggle = form.querySelector('#f-group-name-toggle');
        const fGroupNameMenu = form.querySelector('#f-group-name-menu');
        const fNotInGroup = form.querySelector('#f-not-in-group');
        const fNotGroupId = form.querySelector('#f-not-group-id');
        const fNotGroupName = form.querySelector('#f-not-group-name');
        const fNotInGroupModeId = form.querySelector('#f-not-in-group-mode-id');
        const fNotInGroupModeName = form.querySelector('#f-not-in-group-mode-name');
        const fNotInGroupIdContainer = form.querySelector('#f-not-in-group-id-container');
        const fNotInGroupNameContainer = form.querySelector('#f-not-in-group-name-container');
        const fNotGroupNameList = form.querySelector('#f-not-group-name-list');
        const fNotGroupNameDropdown = form.querySelector('#f-not-group-name-dropdown');
        const fNotGroupNameToggle = form.querySelector('#f-not-group-name-toggle');
        const fNotGroupNameMenu = form.querySelector('#f-not-group-name-menu');
        const fIncludeGraded = form.querySelector('#f-include-graded');

        // Get containers for visual styling
        const fOlderContainer = form.querySelector('#f-older-than-container');
        const fOlderDateContainer = form.querySelector('#f-older-date-container');

        // Set up filters card toggle functionality
        const filtersHeader = form.querySelector('#filters-header');
        const filtersBody = form.querySelector('#filters-body');
        const filtersChevron = form.querySelector('#filters-chevron');

        const toggleFiltersCard = () => {
            if (filtersBody.style.display === 'none') {
                filtersBody.style.display = 'block';
                filtersChevron.className = 'bi bi-chevron-up';
            } else {
                filtersBody.style.display = 'none';
                filtersChevron.className = 'bi bi-chevron-down';
            }
        };

        filtersHeader.addEventListener('click', toggleFiltersCard);

        // Set initial states
        fImportId.disabled = true; // Import ID input starts disabled since checkbox is unchecked
        fGroupId.disabled = true; // Group ID input starts disabled since checkbox is unchecked
        fGroupName.disabled = true; // Group name input starts disabled since checkbox is unchecked
        fInGroupModeId.disabled = true; // In group mode radio starts disabled
        fInGroupModeName.disabled = true; // In group mode radio starts disabled
        fNotGroupId.disabled = true; // Not Group ID input starts disabled since checkbox is unchecked
        fNotGroupName.disabled = true; // Not Group name input starts disabled since checkbox is unchecked
        fNotInGroupModeId.disabled = true; // Not in group mode radio starts disabled
        fNotInGroupModeName.disabled = true; // Not in group mode radio starts disabled
        fOlderDate.disabled = true; // Older date input starts disabled since checkbox is unchecked
        fOlderCreatedDate.disabled = true; // Older created date input starts disabled since checkbox is unchecked

        const setFiltersDisabled = (disabled) => {
            [fNonModule, fNoDue, fUnpub, fNoSubs, fOlder, fOlderCreated, fOlderDate, fOlderCreatedDate, fFromImport, fImportId, fInGroup, fNotInGroup, fIncludeGraded].forEach(el => {
                if (el) el.disabled = disabled;
            });

            // Handle radio buttons and their inputs separately based on checkbox state
            if (!disabled) {
                // When enabling filters, only enable inputs if their parent checkbox is checked
                if (fInGroup.checked) {
                    fInGroupModeId.disabled = false;
                    fInGroupModeName.disabled = false;
                    if (fInGroupModeId.checked) {
                        fGroupId.disabled = false;
                    } else {
                        fGroupName.disabled = false;
                    }
                } else {
                    fInGroupModeId.disabled = true;
                    fInGroupModeName.disabled = true;
                    fGroupId.disabled = true;
                    fGroupName.disabled = true;
                }

                if (fNotInGroup.checked) {
                    fNotInGroupModeId.disabled = false;
                    fNotInGroupModeName.disabled = false;
                    if (fNotInGroupModeId.checked) {
                        fNotGroupId.disabled = false;
                    } else {
                        fNotGroupName.disabled = false;
                    }
                } else {
                    fNotInGroupModeId.disabled = true;
                    fNotInGroupModeName.disabled = true;
                    fNotGroupId.disabled = true;
                    fNotGroupName.disabled = true;
                }
            } else {
                // When disabling all filters, disable everything
                fInGroupModeId.disabled = true;
                fInGroupModeName.disabled = true;
                fGroupId.disabled = true;
                fGroupName.disabled = true;
                fNotInGroupModeId.disabled = true;
                fNotInGroupModeName.disabled = true;
                fNotGroupId.disabled = true;
                fNotGroupName.disabled = true;
            }
        };

        // Build assignment group cache from the assignments we already fetched
        function buildAssignmentGroupsFromAssignments(assignments) {
            const map = new Map();
            (assignments || []).forEach(a => {
                const group = a.assignmentGroup || {};
                const id = group._id ? String(group._id).trim() : '';
                const name = (group.name || '').trim();
                if (!id || !name) return;
                if (!map.has(id)) {
                    map.set(id, { id, name });
                }
            });

            assignmentGroupsCache = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
            assignmentGroupsFetched = true;

            // Populate both datalists
            fGroupNameList.innerHTML = '';
            fNotGroupNameList.innerHTML = '';

            assignmentGroupsCache.forEach(group => {
                const option1 = document.createElement('option');
                option1.value = group.name;
                option1.dataset.groupId = group.id;
                fGroupNameList.appendChild(option1);

                const option2 = document.createElement('option');
                option2.value = group.name;
                option2.dataset.groupId = group.id;
                fNotGroupNameList.appendChild(option2);
            });

            renderGroupMenu(fGroupNameMenu, assignmentGroupsCache, fGroupName);
            renderGroupMenu(fNotGroupNameMenu, assignmentGroupsCache, fNotGroupName);

            console.log('Built and cached', assignmentGroupsCache.length, 'assignment groups from assignments');
            return assignmentGroupsCache;
        }

        function renderGroupMenu(menuEl, groups, inputEl) {
            if (!menuEl) return;
            menuEl.innerHTML = '';
            if (!groups || groups.length === 0) {
                const empty = document.createElement('span');
                empty.className = 'dropdown-item disabled text-muted';
                empty.textContent = 'No groups found';
                menuEl.appendChild(empty);
                return;
            }
            groups.forEach(group => {
                const item = document.createElement('button');
                item.type = 'button';
                item.className = 'dropdown-item';
                item.textContent = group.name;
                item.dataset.groupId = group.id;
                item.addEventListener('click', () => {
                    if (inputEl) inputEl.value = group.name;
                    menuEl.classList.remove('show');
                    if (typeof updateCount === 'function') updateCount();
                });
                menuEl.appendChild(item);
            });
        }

        function setupGroupDropdown(containerEl, inputEl, menuEl, toggleBtn) {
            if (!containerEl || !inputEl || !menuEl) return;

            const applyFilter = () => {
                const query = inputEl.value.trim().toLowerCase();
                let visibleCount = 0;
                menuEl.querySelectorAll('.dropdown-item:not(.disabled)').forEach(item => {
                    const match = item.textContent.toLowerCase().includes(query);
                    item.classList.toggle('d-none', !match);
                    if (match) visibleCount++;
                });
                const emptyItem = menuEl.querySelector('.dropdown-item.disabled');
                if (emptyItem) emptyItem.classList.toggle('d-none', visibleCount > 0);
            };

            const showMenu = () => {
                applyFilter();
                menuEl.classList.add('show');
            };

            const hideMenu = () => {
                menuEl.classList.remove('show');
            };

            inputEl.addEventListener('focus', () => {
                if (!inputEl.disabled) showMenu();
            });
            inputEl.addEventListener('input', () => {
                if (!inputEl.disabled) showMenu();
            });
            toggleBtn?.addEventListener('click', (e) => {
                e.preventDefault();
                if (menuEl.classList.contains('show')) {
                    hideMenu();
                } else if (!inputEl.disabled) {
                    inputEl.focus();
                    showMenu();
                }
            });

            document.addEventListener('click', (e) => {
                if (!containerEl.contains(e.target)) hideMenu();
            });
        }

        // Helper function to get group ID from name (case-insensitive)
        function getGroupIdFromName(groupName) {
            if (!assignmentGroupsCache || !groupName) return null;
            const needle = groupName.trim().toLowerCase();
            const group = assignmentGroupsCache.find(g => (g.name || '').trim().toLowerCase() === needle);
            return group ? String(group.id) : null;
        }

        // Filters are enabled by default so users can select them before the initial check

        // Enable Check button only when Course ID is numeric
        courseID.addEventListener('input', () => {
            const val = courseID.value.trim();
            const validCourse = /^(\d+)$/.test(val);
            courseID.classList.toggle('is-invalid', !validCourse && val.length > 0);
            checkBtn.disabled = !validCourse;

            // Reset assignment groups cache when course ID changes
            if (assignmentGroupsFetched) {
                assignmentGroupsCache = null;
                assignmentGroupsFetched = false;
                fGroupNameList.innerHTML = '';
                fNotGroupNameList.innerHTML = '';
            }
        });

        // Build assignment groups from cached assignments when user focuses group name inputs
        fGroupName.addEventListener('focus', async () => {
            if (!assignmentGroupsFetched && allAssignmentsCache) {
                buildAssignmentGroupsFromAssignments(allAssignmentsCache);
            }
        });

        fNotGroupName.addEventListener('focus', async () => {
            if (!assignmentGroupsFetched && allAssignmentsCache) {
                buildAssignmentGroupsFromAssignments(allAssignmentsCache);
            }
        });

        function renderResults(finalAssignments) {
            console.log('=== renderResults Debug ===');
            console.log('renderResults called with:', finalAssignments.length, 'assignments');
            console.log('allAssignmentsCache length:', allAssignmentsCache ? allAssignmentsCache.length : 'null/undefined');
            console.log('totalDeletedCount:', totalDeletedCount);
            console.log('originalAssignmentCount:', originalAssignmentCount);

            responseDiv.innerHTML = '';
            const responseCard = form.querySelector('#combined-response-container-card');
            if (responseCard) {
                responseCard.hidden = false; // Always show the results card
            }

            const details = document.createElement('div');
            details.id = 'combined-response-details';
            details.className = 'card';
            const currentAvailable = Array.isArray(allAssignmentsCache) ? allAssignmentsCache.length : finalAssignments.length;

            console.log('Calculated currentAvailable:', currentAvailable);

            // Calculate display text based on deletion status
            let headerText = 'Results';
            let statusText = '';

            if (totalDeletedCount > 0) {
                headerText = 'Delete More Assignments';
                statusText = `Deleted ${totalDeletedCount} of ${originalAssignmentCount} assignments. ${finalAssignments.length} remaining assignments match your filters.`;
            } else {
                statusText = `Found ${finalAssignments.length} out of ${currentAvailable} assignments matching the selected filters.`;
            }

            console.log('Header text:', headerText);
            console.log('Status text:', statusText);

            details.innerHTML = `
                <div class="card-header d-flex justify-content-between align-items-center">
                    <span>${headerText}</span>
                    <span class="text-muted small">Available: ${currentAvailable}${totalDeletedCount > 0 ? ` | Deleted: ${totalDeletedCount}/${originalAssignmentCount}` : ``}</span>
                </div>
                <div class="card-body">
                    <div>${statusText}</div>
                </div>
                <div class="card-footer d-flex justify-content-end gap-2">
                    <button type="button" class="btn btn-secondary" id="combined-clear-btn">Clear</button>
                    <button type="button" class="btn btn-danger" id="combined-remove-btn" ${finalAssignments.length < 1 ? 'disabled' : ''}>Delete ${finalAssignments.length > 0 ? finalAssignments.length : ''} Assignment${finalAssignments.length === 1 ? '' : 's'}</button>
                </div>`;
            responseDiv.appendChild(details);

            const clearBtn = details.querySelector('#combined-clear-btn');
            const removeBtn = details.querySelector('#combined-remove-btn');
            clearBtn.addEventListener('click', (e2) => {
                e2.preventDefault();
                e2.stopPropagation();
                form.querySelector('#course-id').value = '';
                responseDiv.innerHTML = '';
                progressDiv.hidden = true;
                // Reset deletion tracking
                totalDeletedCount = 0;
                originalAssignmentCount = 0;
                allAssignmentsCache = null;
            });
            removeBtn.addEventListener('click', async (e2) => {
                e2.preventDefault();
                e2.stopPropagation();

                // Generate unique operation ID for deletion
                currentDeleteOperationId = `delete-assignments-${Date.now()}`;
                isDeleting = true;
                isDeletingCancelling = false;

                // Show processing card and hide results temporarily
                progressDiv.hidden = false;
                progressBar.parentElement.hidden = false;
                progressBar.style.width = '0%';
                if (spinner) spinner.hidden = false;
                progressInfo.innerHTML = `Deleting ${finalAssignments.length} assignments...`;

                // Show cancel button
                cancelDeleteBtn.hidden = false;
                cancelDeleteBtn.disabled = false;

                // Disable the delete button during processing
                removeBtn.disabled = true;

                const domain = document.querySelector('#domain').value.trim();
                const token = document.querySelector('#token').value.trim();
                const cid = form.querySelector('#course-id').value.trim();
                const payload = {
                    domain,
                    token,
                    course_id: cid,
                    number: finalAssignments.length,
                    assignments: finalAssignments.map(a => ({ id: a.id, name: a.name })),
                    operationId: currentDeleteOperationId
                };

                // Subscribe to progress updates
                const progressUnsub = window.progressAPI?.onUpdateProgress?.((p) => {
                    // Don't update progress if we're cancelling
                    if (isDeletingCancelling) {
                        return;
                    }
                    updateProgressWithPercent(progressBar, p);
                });
                try {
                    const result = await window.axios.deleteAssignments(payload);
                    const { successful, failed, cancelled } = result;

                    // Hide cancel button after operation completes
                    cancelDeleteBtn.hidden = true;

                    // Update deletion tracking
                    totalDeletedCount += successful.length;

                    // Handle cancellation
                    if (cancelled) {
                        const successText = successful.length === 1 ? 'assignment' : 'assignments';
                        progressInfo.innerHTML = `<div class="alert alert-warning" role="alert">
                            <i class="bi bi-exclamation-circle me-2"></i>
                            <strong>Cancelled:</strong> Deleted ${successful.length} ${successText} before cancellation.
                        </div>`;

                        // Hide processing card
                        progressDiv.hidden = true;
                        if (spinner) spinner.hidden = true;

                        // Re-apply filters to update results
                        updateCount();
                        return;
                    }

                    // Report initial results
                    const successText = successful.length === 1 ? 'assignment' : 'assignments';
                    const failureText = failed.length === 1 ? 'assignment' : 'assignments';

                    let resultMessage = `<div class="alert alert-success d-flex align-items-center" role="alert">
                        <i class="bi bi-check-circle-fill me-2"></i>
                        <div>Successfully deleted ${successful.length} ${successText}!</div>
                    </div>`;

                    if (failed.length > 0) {
                        resultMessage += `<div class="alert alert-warning d-flex align-items-center mt-2" role="alert">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>
                            <div>Failed to delete ${failed.length} ${failureText}.</div>
                        </div>`;
                    }

                    progressInfo.innerHTML = resultMessage;

                    // Check for empty assignment groups after successful deletion
                    if (successful.length > 0) {
                        progressInfo.innerHTML = 'Checking for empty assignment groups...';
                        try {
                            const groupResult = await checkAndDeleteEmptyAssignmentGroups(domain, cid, token, progressInfo, details);

                            if (groupResult.deletedCount > 0 || groupResult.failedCount > 0) {
                                progressInfo.innerHTML += `<br>Deleted ${groupResult.deletedCount} empty assignment group(s)${groupResult.failedCount > 0 ? `, failed to delete ${groupResult.failedCount}` : ''}.`;
                                // Give user time to see the group deletion result
                                await new Promise(resolve => setTimeout(resolve, 2000));
                            }
                        } catch (groupError) {
                            console.error('Error checking/deleting empty assignment groups:', groupError);
                        }

                        // Refresh assignments from the course to get updated state
                        progressInfo.innerHTML = 'Refreshing assignment data...';
                        try {
                            console.log('Refreshing assignments after deletion...');

                            // Use a simpler call without progress callback to avoid cloning issues
                            const updatedAssignments = await window.axios.getAllAssignmentsForCombined({
                                domain,
                                token,
                                course_id: cid
                            });

                            if (updatedAssignments && Array.isArray(updatedAssignments)) {
                                console.log(`Refreshed assignment cache: ${updatedAssignments.length} assignments (was ${allAssignmentsCache ? allAssignmentsCache.length : 'null'})`);
                                allAssignmentsCache = updatedAssignments;

                                // Update success message with refresh info
                                const refreshSuccessMessage = `<div class="alert alert-success d-flex align-items-center" role="alert">
                                    <i class="bi bi-check-circle-fill me-2"></i>
                                    <div>
                                        Successfully deleted ${successful.length} ${successText}!<br>
                                        <small class="text-success">✓ Cleaned up empty assignment groups<br>
                                        ✓ Refreshed assignment data: ${updatedAssignments.length} assignments found</small>
                                    </div>
                                </div>`;

                                if (failed.length > 0) {
                                    progressInfo.innerHTML = refreshSuccessMessage + `<div class="alert alert-warning d-flex align-items-center mt-2" role="alert">
                                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                                        <div>Failed to delete ${failed.length} ${failureText}.</div>
                                    </div>`;
                                } else {
                                    progressInfo.innerHTML = refreshSuccessMessage;
                                }
                            } else {
                                console.warn('Refresh returned invalid data, keeping existing cache');
                                progressInfo.innerHTML += `<br><small class="text-warning">⚠ Warning: Could not refresh assignment data.</small>`;
                            }
                        } catch (refreshError) {
                            console.error('Error refreshing assignments:', refreshError);

                            // If refresh fails, show success message without refresh info
                            const basicSuccessMessage = `<div class="alert alert-success d-flex align-items-center" role="alert">
                                <i class="bi bi-check-circle-fill me-2"></i>
                                <div>
                                    Successfully deleted ${successful.length} ${successText}!<br>
                                    <small class="text-success">✓ Cleaned up empty assignment groups</small><br>
                                    <small class="text-warning">⚠ Could not refresh assignment data - please re-run the check to see updated results</small>
                                </div>
                            </div>`;

                            if (failed.length > 0) {
                                progressInfo.innerHTML = basicSuccessMessage + `<div class="alert alert-warning d-flex align-items-center mt-2" role="alert">
                                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                                    <div>Failed to delete ${failed.length} ${failureText}.</div>
                                </div>`;
                            } else {
                                progressInfo.innerHTML = basicSuccessMessage;
                            }
                        }
                    }

                    // Hide processing card after completion
                    progressDiv.hidden = true;
                    if (spinner) spinner.hidden = true;

                    // Re-apply filters to update the results with refreshed data
                    console.log('Reapplying filters after deletion and refresh...');
                    updateCount();

                } catch (err) {
                    cancelDeleteBtn.hidden = true;
                    progressDiv.hidden = true;
                    if (spinner) spinner.hidden = true;
                    errorHandler(err, progressInfo, responseDiv);
                } finally {
                    isDeleting = false;
                    isDeletingCancelling = false;
                    currentDeleteOperationId = null;
                    removeBtn.disabled = false;
                }
            });
        }

        // Handle cancel delete button
        cancelDeleteBtn.addEventListener('click', async () => {
            console.log('Cancel delete button clicked. Operation ID:', currentDeleteOperationId, 'Button disabled:', cancelDeleteBtn.disabled);

            if (!currentDeleteOperationId || cancelDeleteBtn.disabled) {
                console.log('Cancel aborted - missing operation ID or button already disabled');
                return;
            }

            // Set cancelling flag to stop progress updates
            isDeletingCancelling = true;

            // Disable button and update UI immediately
            cancelDeleteBtn.disabled = true;
            cancelDeleteBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Cancelling...';
            progressInfo.textContent = 'Cancelling...';

            console.log('Requesting cancellation for delete operation:', currentDeleteOperationId);

            try {
                await window.axios.cancelOperation(currentDeleteOperationId);
                console.log('Delete cancellation request sent successfully');
            } catch (err) {
                console.error('Error cancelling delete operation:', err);
                // Only re-enable if the operation is still running
                if (isDeleting && !isDeletingCancelling) {
                    cancelDeleteBtn.innerHTML = '<i class="bi bi-x-circle me-2"></i>Cancel Deletion';
                    cancelDeleteBtn.disabled = false;
                    isDeletingCancelling = false;
                    progressInfo.textContent = 'Deleting assignments...';
                }
            }
        });

        const updateCount = async () => {
            console.log('updateCount called, allAssignmentsCache:', allAssignmentsCache ? allAssignmentsCache.length : 'null/undefined');
            if (!allAssignmentsCache) return;
            const useNonModule = fNonModule.checked;
            const useNoDue = fNoDue.checked;
            const useUnpub = fUnpub.checked;
            const useNoSubs = fNoSubs.checked;
            const includeGradedGlobal = fIncludeGraded.checked;
            const useOlder = fOlder.checked;
            const useOlderCreated = fOlderCreated.checked;
            const olderDateVal = fOlderDate.value;
            const olderCreatedDateVal = fOlderCreatedDate.value;
            const useFromImport = fFromImport.checked;
            const importIdVal = fImportId.value;
            const useInGroup = fInGroup.checked;
            const inGroupMode = fInGroupModeId.checked ? 'id' : 'name';
            const groupIdVal = fGroupId.value.trim();
            const groupNameVal = fGroupName.value.trim();
            const useNotInGroup = fNotInGroup.checked;
            const notInGroupMode = fNotInGroupModeId.checked ? 'id' : 'name';
            const notGroupIdVal = fNotGroupId.value.trim();
            const notGroupNameVal = fNotGroupName.value.trim();

            console.log('Active filters:', {
                useNonModule, useNoDue, useUnpub, useNoSubs, includeGradedGlobal,
                useOlder, useOlderCreated, useFromImport, useInGroup, useNotInGroup
            });

            let filtered = allAssignmentsCache;
            console.log('Starting with', filtered.length, 'assignments');

            if (useNonModule) {
                filtered = filtered.filter(a => {
                    const inCore = Array.isArray(a.modules) && a.modules.length > 0;
                    const inQuiz = Array.isArray(a.quiz?.modules) && a.quiz.modules.length > 0;
                    const inDisc = Array.isArray(a.discussion?.modules) && a.discussion.modules.length > 0;
                    return !(inCore || inQuiz || inDisc);
                });
                console.log('After non-module filter:', filtered.length);
            }
            if (useNoDue) {
                filtered = filtered.filter(a => !a.dueAt);
                console.log('After no-due-date filter:', filtered.length);
            }
            if (useUnpub) {
                filtered = filtered.filter(a => !a.published);
                console.log('After unpublished filter:', filtered.length);
            }
            if (useNoSubs) {
                filtered = filtered.filter(a => !a.hasSubmittedSubmissions);
                console.log('After no-submissions filter:', filtered.length);
            }
            if (useOlder && olderDateVal) {
                const cutoff = new Date(olderDateVal);
                // Set cutoff to end of day in local timezone for proper comparison
                cutoff.setHours(23, 59, 59, 999);
                filtered = filtered.filter(a => {
                    if (!a.dueAt) return false;
                    // Convert UTC due date to local time for comparison
                    const localDueDate = new Date(a.dueAt);
                    return localDueDate < cutoff;
                });
                console.log('After due date before filter:', filtered.length, `(cutoff: ${cutoff.toLocaleString()})`);
            }
            if (useOlderCreated && olderCreatedDateVal) {
                const cutoff = new Date(olderCreatedDateVal);
                // Set cutoff to end of day in local timezone for proper comparison
                cutoff.setHours(23, 59, 59, 999);
                filtered = filtered.filter(a => {
                    if (!a.createdAt) return false;
                    // Convert UTC created date to local time for comparison
                    const localCreatedDate = new Date(a.createdAt);
                    return localCreatedDate < cutoff;
                });
                console.log('After created date before filter:', filtered.length, `(cutoff: ${cutoff.toLocaleString()})`);
            }
            // Apply global grade filter LAST - exclude graded assignments unless includeGradedGlobal is checked
            if (!includeGradedGlobal) {
                const beforeGradeFilter = filtered.length;
                filtered = filtered.filter(a => !a.gradedSubmissionsExist);
                console.log('After graded submissions filter:', filtered.length, `(removed ${beforeGradeFilter - filtered.length})`);
            }
            if (useFromImport && importIdVal) {
                try {
                    // Check if we need to fetch import data (cache miss or ID changed)
                    if (cachedImportId !== importIdVal || !importedAssignmentsCache) {
                        console.log(`Import filter - fetching import data for ID: ${importIdVal} (previous: ${cachedImportId})`);

                        const domain = document.querySelector('#domain').value.trim();
                        const token = document.querySelector('#token').value.trim();
                        const course_id = form.querySelector('#course-id').value.trim();

                        const importedAssignments = await window.axios.getImportedAssignments({
                            domain,
                            token,
                            course_id,
                            import_id: importIdVal
                        });

                        // Cache the results
                        importedAssignmentsCache = importedAssignments;
                        cachedImportId = importIdVal;

                        console.log('Import filter - fetched and cached imported assignments:', importedAssignments);
                    } else {
                        console.log(`Import filter - using cached import data for ID: ${importIdVal}`);
                    }

                    console.log('Import filter - filtered assignments before import filter:', filtered.length);
                    console.log('Import filter - sample assignment IDs:', filtered.slice(0, 3).map(a => ({ _id: a._id, name: a.name })));

                    if (importedAssignmentsCache && importedAssignmentsCache.length > 0) {
                        // Convert imported IDs to strings and create Set for lookup
                        const importedIds = new Set(importedAssignmentsCache.map(id => String(id).trim()));
                        console.log('Import filter - imported IDs set:', Array.from(importedIds));

                        // Filter to keep only assignments that are in the imported set
                        const beforeLength = filtered.length;
                        filtered = filtered.filter(a => {
                            const assignmentId = String(a._id).trim();
                            const isIncluded = importedIds.has(assignmentId);
                            if (beforeLength <= 5) { // Only log for small sets to avoid spam
                                console.log(`Import filter - checking assignment ${assignmentId} (${a.name}): ${isIncluded ? 'INCLUDED' : 'excluded'}`);
                            }
                            return isIncluded;
                        });

                        console.log('Import filter - assignments after import filter:', filtered.length);
                    } else {
                        console.log('Import filter - no imported assignments found in cache');
                        // No imported assignments found, show empty results
                        filtered = [];
                    }
                } catch (error) {
                    console.error('Error fetching imported assignments:', error);
                    // On error, clear cache and don't apply import filter
                    importedAssignmentsCache = null;
                    cachedImportId = null;
                }
            }

            // Apply assignment group filters
            if (useInGroup) {
                let targetGroupId = null;

                if (inGroupMode === 'id' && groupIdVal) {
                    targetGroupId = String(groupIdVal).trim();
                } else if (inGroupMode === 'name' && groupNameVal) {
                    targetGroupId = getGroupIdFromName(groupNameVal);
                    if (!targetGroupId) {
                        console.log(`Assignment group filter - could not find group ID for name: ${groupNameVal}`);
                    }
                }

                if (targetGroupId) {
                    console.log(`Assignment group filter - filtering to include only assignments in group: ${targetGroupId}`);
                    const beforeLength = filtered.length;
                    filtered = filtered.filter(a => {
                        const assignmentGroupId = String(a.assignmentGroup?._id || '').trim();
                        const isIncluded = assignmentGroupId === targetGroupId;
                        if (beforeLength <= 5) { // Only log for small sets to avoid spam
                            console.log(`Assignment group filter - checking assignment ${a._id} (${a.name}) in group ${assignmentGroupId}: ${isIncluded ? 'INCLUDED' : 'excluded'}`);
                        }
                        return isIncluded;
                    });
                    console.log(`Assignment group filter - assignments in group ${targetGroupId}: ${filtered.length}`);
                }
            }

            if (useNotInGroup) {
                let excludeGroupId = null;

                if (notInGroupMode === 'id' && notGroupIdVal) {
                    excludeGroupId = String(notGroupIdVal).trim();
                } else if (notInGroupMode === 'name' && notGroupNameVal) {
                    excludeGroupId = getGroupIdFromName(notGroupNameVal);
                    if (!excludeGroupId) {
                        console.log(`Assignment group filter - could not find group ID for name: ${notGroupNameVal}`);
                    }
                }

                if (excludeGroupId) {
                    console.log(`Assignment group filter - filtering to exclude assignments in group: ${excludeGroupId}`);
                    const beforeLength = filtered.length;
                    filtered = filtered.filter(a => {
                        const assignmentGroupId = String(a.assignmentGroup?._id || '').trim();
                        const isIncluded = assignmentGroupId !== excludeGroupId;
                        if (beforeLength <= 5) { // Only log for small sets to avoid spam
                            console.log(`Assignment group filter - checking assignment ${a._id} (${a.name}) in group ${assignmentGroupId}: ${isIncluded ? 'INCLUDED' : 'excluded'}`);
                        }
                        return isIncluded;
                    });
                    console.log(`Assignment group filter - assignments not in group ${excludeGroupId}: ${filtered.length}`);
                }
            }

            renderResults(filtered.map(a => ({ id: a._id || a.id, name: a.name })));
        };

        // Cancel fetch
        cancelBtn.addEventListener('click', async (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            try {
                await window.axios.cancelAllAssignmentsForCombined();
            } catch { }
            cancelBtn.disabled = true;
            setFiltersDisabled(false);
            if (spinner) spinner.hidden = true;
            progressInfo.innerHTML = '<span class="text-warning">Cancelled.</span>';
        });

        // Check button triggers the fetch and keeps filters disabled until completion
        checkBtn.addEventListener('click', async (ev) => {
            ev.preventDefault();
            ev.stopPropagation();

            const val = courseID.value.trim();
            const validCourse = /^(\d+)$/.test(val);
            if (!validCourse) {
                courseID.classList.add('is-invalid');
                return;
            }

            // reset UI state
            responseDiv.innerHTML = '';
            progressDiv.hidden = false;
            progressBar.parentElement.hidden = true;
            updateProgressWithPercent(progressBar, 0);
            if (typeof enhanceProgressBarWithPercent === 'function') enhanceProgressBarWithPercent(progressBar);
            if (spinner) spinner.hidden = false;
            progressInfo.innerHTML = 'Loading assignments...';
            setFiltersDisabled(true);
            checkBtn.disabled = true;
            cancelBtn.disabled = false;

            // Clear import cache when fetching new assignments (might be different course)
            importedAssignmentsCache = null;
            cachedImportId = null;

            // Clear assignment group filter inputs on new check
            if (fGroupId) fGroupId.value = '';
            if (fGroupName) fGroupName.value = '';
            if (fNotGroupId) fNotGroupId.value = '';
            if (fNotGroupName) fNotGroupName.value = '';

            // Reset deletion tracking for new course
            totalDeletedCount = 0;
            originalAssignmentCount = 0;

            const domain = document.querySelector('#domain').value.trim();
            const token = document.querySelector('#token').value.trim();
            const cid = val;

            // Always re-query on Check
            try {
                console.log('Fetching assignments for course:', cid, 'domain:', domain);
                const all = await window.axios.getAllAssignmentsForCombined({ domain, token, course_id: cid });
                console.log('Received assignments:', all ? all.length : 'null/undefined', all);
                allAssignmentsCache = all;

                // Build assignment group list immediately from fetched assignments
                if (Array.isArray(allAssignmentsCache)) {
                    buildAssignmentGroupsFromAssignments(allAssignmentsCache);
                }

                // Set original count only on first fetch (when totalDeletedCount is 0)
                if (totalDeletedCount === 0) {
                    originalAssignmentCount = all ? all.length : 0;
                }

                // Hide processing card after successful fetch
                progressDiv.hidden = true;
                progressInfo.innerHTML = '';
                if (spinner) spinner.hidden = true;
                setFiltersDisabled(false);
                cancelBtn.disabled = true;
                checkBtn.disabled = false;

                // Show immediate feedback about what was found
                if (!all || all.length === 0) {
                    progressInfo.innerHTML = '<span class="text-info">No assignments found in this course.</span>';
                } else {
                    // Don't show the success message, just proceed to results
                }

                // Apply current filter state instead of showing all assignments
                updateCount();
            } catch (error) {
                console.error('Error fetching assignments:', error);
                progressDiv.hidden = true;
                if (String(error).includes('canceled') || String(error).includes('abort')) {
                    progressInfo.innerHTML = '<span class="text-warning">Cancelled.</span>';
                } else {
                    errorHandler(error, progressInfo);
                }
                checkBtn.disabled = false;
            }
        });
        // Listen for filter changes to update counts live
        fNonModule?.addEventListener('change', updateCount);

        // Handle "No due date" filter - disable "Due date Before" when checked
        fNoDue?.addEventListener('change', () => {
            if (fNoDue.checked) {
                // When "No due date" is checked, disable and uncheck "Due date Before"
                fOlder.checked = false;
                fOlder.disabled = true;
                fOlderDate.disabled = true;
                fOlderDate.value = '';

                // Add visual styling to show disabled state
                fOlderContainer.style.opacity = '0.5';
                fOlderDateContainer.style.opacity = '0.5';
                fOlderContainer.title = 'This filter is disabled because "No due date" is selected';
            } else {
                // When "No due date" is unchecked, re-enable "Due date Before"
                fOlder.disabled = false;

                // Remove visual styling
                fOlderContainer.style.opacity = '';
                fOlderDateContainer.style.opacity = '';
                fOlderContainer.title = '';

                // Date input will be enabled/disabled based on the older checkbox state
                fOlderDate.disabled = !fOlder.checked;
            }
            updateCount();
        });

        fUnpub?.addEventListener('change', updateCount);

        fNoSubs.addEventListener('change', updateCount);

        // Toggle date input enablement based on older-than checkbox
        fOlder.addEventListener('change', () => {
            // Only allow enabling if "No due date" is not checked
            if (!fNoDue.checked) {
                fOlderDate.disabled = !fOlder.checked;
            }
            updateCount();
        });
        fOlderDate.addEventListener('input', updateCount);
        fOlderCreated.addEventListener('change', () => {
            fOlderCreatedDate.disabled = !fOlderCreated.checked;
            updateCount();
        });
        fOlderCreatedDate.addEventListener('input', updateCount);

        // Toggle import ID input enablement based on from import checkbox
        fFromImport.addEventListener('change', () => {
            fImportId.disabled = !fFromImport.checked;
            // Don't clear cache when toggling - preserve it for when re-enabled
            updateCount();
        });
        fImportId.addEventListener('input', () => {
            // Clear cache when import ID changes
            const currentImportId = fImportId.value.trim();
            if (currentImportId !== cachedImportId) {
                importedAssignmentsCache = null;
                cachedImportId = null;
            }
            updateCount();
        });

        // Toggle assignment group filter input enablement based on checkboxes
        // Make the two assignment group filters mutually exclusive
        fInGroup.addEventListener('change', () => {
            const isChecked = fInGroup.checked;

            // Enable/disable mode radio buttons
            fInGroupModeId.disabled = !isChecked;
            fInGroupModeName.disabled = !isChecked;

            // Enable/disable the appropriate input based on mode
            if (fInGroupModeId.checked) {
                fGroupId.disabled = !isChecked;
                fGroupName.disabled = true;
            } else {
                fGroupId.disabled = true;
                fGroupName.disabled = !isChecked;
            }

            // If "In specific group" is checked, uncheck "NOT in specific group"
            if (isChecked && fNotInGroup.checked) {
                fNotInGroup.checked = false;
                fNotGroupId.disabled = true;
                fNotGroupName.disabled = true;
                fNotInGroupModeId.disabled = true;
                fNotInGroupModeName.disabled = true;
            }
            updateCount();
        });

        // Toggle between ID and name mode for "In group" filter
        fInGroupModeId.addEventListener('change', () => {
            if (fInGroupModeId.checked && fInGroup.checked) {
                fInGroupIdContainer.style.display = 'block';
                fInGroupNameContainer.style.display = 'none';
                fGroupId.disabled = false;
                fGroupName.disabled = true;
                updateCount();
            }
        });

        fInGroupModeName.addEventListener('change', async () => {
            if (fInGroupModeName.checked && fInGroup.checked) {
                fInGroupIdContainer.style.display = 'none';
                fInGroupNameContainer.style.display = 'block';
                fGroupId.disabled = true;
                fGroupName.disabled = false;

                if (!assignmentGroupsFetched && allAssignmentsCache) {
                    buildAssignmentGroupsFromAssignments(allAssignmentsCache);
                }
                updateCount();
            }
        });

        fGroupId.addEventListener('input', updateCount);
        fGroupName.addEventListener('input', updateCount);

        fNotInGroup.addEventListener('change', () => {
            const isChecked = fNotInGroup.checked;

            // Enable/disable mode radio buttons
            fNotInGroupModeId.disabled = !isChecked;
            fNotInGroupModeName.disabled = !isChecked;

            // Enable/disable the appropriate input based on mode
            if (fNotInGroupModeId.checked) {
                fNotGroupId.disabled = !isChecked;
                fNotGroupName.disabled = true;
            } else {
                fNotGroupId.disabled = true;
                fNotGroupName.disabled = !isChecked;
            }

            // If "NOT in specific group" is checked, uncheck "In specific group"
            if (isChecked && fInGroup.checked) {
                fInGroup.checked = false;
                fGroupId.disabled = true;
                fGroupName.disabled = true;
                fInGroupModeId.disabled = true;
                fInGroupModeName.disabled = true;
            }
            updateCount();
        });

        // Toggle between ID and name mode for "NOT in group" filter
        fNotInGroupModeId.addEventListener('change', () => {
            if (fNotInGroupModeId.checked && fNotInGroup.checked) {
                fNotInGroupIdContainer.style.display = 'block';
                fNotInGroupNameContainer.style.display = 'none';
                fNotGroupId.disabled = false;
                fNotGroupName.disabled = true;
                updateCount();
            }
        });

        fNotInGroupModeName.addEventListener('change', async () => {
            if (fNotInGroupModeName.checked && fNotInGroup.checked) {
                fNotInGroupIdContainer.style.display = 'none';
                fNotInGroupNameContainer.style.display = 'block';
                fNotGroupId.disabled = true;
                fNotGroupName.disabled = false;

                if (!assignmentGroupsFetched && allAssignmentsCache) {
                    buildAssignmentGroupsFromAssignments(allAssignmentsCache);
                }
                updateCount();
            }
        });

        fNotGroupId.addEventListener('input', updateCount);
        fNotGroupName.addEventListener('input', updateCount);

        setupGroupDropdown(fGroupNameDropdown, fGroupName, fGroupNameMenu, fGroupNameToggle);
        setupGroupDropdown(fNotGroupNameDropdown, fNotGroupName, fNotGroupNameMenu, fNotGroupNameToggle);

        // Add event listener for the global grade filter
        fIncludeGraded.addEventListener('change', updateCount);

        // Store fetched assignments in memory; re-fetched on each Check press
        let allAssignmentsCache = null;
        let cacheKey = null; // kept for potential future use
        let totalDeletedCount = 0; // Track total deleted assignments
        let originalAssignmentCount = 0; // Track original assignment count

        // Cache for imported assignments to avoid repeated API calls
        let importedAssignmentsCache = null;
        let cachedImportId = null;

        // Cache for assignment groups to populate dropdowns
        let assignmentGroupsCache = null;
        let assignmentGroupsFetched = false;
    }
    form.hidden = false;

    // Helper function to toggle empty assignment groups card visibility
    function toggleEmptyGroupsCard(headerElement) {
        const cardBody = headerElement.nextElementSibling;
        const chevron = headerElement.querySelector('#empty-groups-chevron');

        if (cardBody.style.display === 'none') {
            cardBody.style.display = 'block';
            chevron.className = 'bi bi-chevron-up';
        } else {
            cardBody.style.display = 'none';
            chevron.className = 'bi bi-chevron-down';
        }
    }

    // Helper function to check and optionally delete empty assignment groups
    async function checkAndDeleteEmptyAssignmentGroups(domain, courseId, token, progressInfo, parentContainer) {
        try {
            progressInfo.innerHTML += `<br>Checking for empty assignment groups...`;
            const emptyGroups = await window.axios.getEmptyAssignmentGroups({
                domain,
                course: courseId,
                token
            });

            if (emptyGroups && emptyGroups.length > 0) {
                progressInfo.innerHTML += `<br>Found ${emptyGroups.length} empty assignment group${emptyGroups.length === 1 ? '' : 's'}.`;

                // Create assignment groups management card
                const groupsCard = document.createElement('div');
                groupsCard.className = 'card mt-3 mb-3';
                groupsCard.innerHTML = `
                    <div class="card-header d-flex justify-content-between align-items-center" style="cursor: pointer;" id="empty-groups-header">
                        <h6 class="mb-0">Empty Assignment Groups</h6>
                        <div class="d-flex align-items-center gap-2">
                            <span class="badge bg-secondary">${emptyGroups.length} groups</span>
                            <i class="bi bi-chevron-down" id="empty-groups-chevron"></i>
                        </div>
                    </div>
                    <div class="card-body" style="display: none;">
                        <div class="mb-3">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="select-all-empty-groups" checked>
                                <label class="form-check-label" for="select-all-empty-groups">
                                    <strong>Select all empty groups for deletion</strong>
                                </label>
                            </div>
                        </div>
                        <div class="border rounded p-3" style="max-height: 300px; overflow-y: auto; background-color: #f8f9fa;">
                            <div id="empty-groups-list">
                                ${emptyGroups.map((group, index) => `
                                    <div class="form-check mb-2">
                                        <input class="form-check-input empty-group-checkbox" type="checkbox" value="${group._id}" id="empty-group-${index}" checked>
                                        <label class="form-check-label d-flex justify-content-between align-items-center" for="empty-group-${index}">
                                            <span>
                                                <strong>${group.name || 'Unnamed Group'}</strong>
                                                <small class="text-muted d-block">ID: ${group._id}</small>
                                            </span>
                                        </label>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="d-flex justify-content-between align-items-center mt-3">
                            <small class="text-muted" id="selection-count">All ${emptyGroups.length} groups selected</small>
                            <div class="gap-2 d-flex">
                                <button id="cancel-empty-groups" type="button" class="btn btn-secondary">Cancel</button>
                                <button id="delete-empty-groups" type="button" class="btn btn-danger">Delete Selected</button>
                            </div>
                        </div>
                    </div>
                `;

                // Insert after the parent container
                parentContainer.parentNode.insertBefore(groupsCard, parentContainer.nextSibling);

                // Set up toggle functionality for the header
                const cardHeader = groupsCard.querySelector('#empty-groups-header');
                cardHeader.addEventListener('click', () => toggleEmptyGroupsCard(cardHeader));

                // Set up event handlers
                const selectAllCheckbox = groupsCard.querySelector('#select-all-empty-groups');
                const groupCheckboxes = groupsCard.querySelectorAll('.empty-group-checkbox');
                const deleteBtn = groupsCard.querySelector('#delete-empty-groups');
                const cancelBtn = groupsCard.querySelector('#cancel-empty-groups');
                const selectionCount = groupsCard.querySelector('#selection-count');

                function updateSelectionState() {
                    const checkedBoxes = Array.from(groupCheckboxes).filter(cb => cb.checked);
                    const totalBoxes = groupCheckboxes.length;

                    // Update select all checkbox state
                    selectAllCheckbox.indeterminate = checkedBoxes.length > 0 && checkedBoxes.length < totalBoxes;
                    selectAllCheckbox.checked = checkedBoxes.length === totalBoxes;

                    // Update count display
                    if (checkedBoxes.length === 0) {
                        selectionCount.textContent = 'No groups selected';
                        deleteBtn.disabled = true;
                        deleteBtn.textContent = 'Delete Selected';
                    } else {
                        selectionCount.textContent = `${checkedBoxes.length} of ${totalBoxes} groups selected`;
                        deleteBtn.disabled = false;
                        deleteBtn.textContent = `Delete ${checkedBoxes.length} Group${checkedBoxes.length === 1 ? '' : 's'}`;
                    }
                }

                selectAllCheckbox.addEventListener('change', () => {
                    const isChecked = selectAllCheckbox.checked;
                    groupCheckboxes.forEach(cb => cb.checked = isChecked);
                    updateSelectionState();
                });

                groupCheckboxes.forEach(cb => {
                    cb.addEventListener('change', updateSelectionState);
                });

                updateSelectionState();

                // Return a promise that resolves when user makes a choice
                return new Promise((resolve) => {
                    cancelBtn.addEventListener('click', () => {
                        groupsCard.remove();
                        resolve({ deletedCount: 0, failedCount: 0 });
                    });

                    deleteBtn.addEventListener('click', async () => {
                        const selectedIds = Array.from(groupCheckboxes)
                            .filter(cb => cb.checked)
                            .map(cb => cb.value);

                        if (selectedIds.length === 0) {
                            groupsCard.remove();
                            resolve({ deletedCount: 0, failedCount: 0 });
                            return;
                        }

                        // Update UI to show deletion in progress
                        deleteBtn.disabled = true;
                        cancelBtn.disabled = true;
                        selectAllCheckbox.disabled = true;
                        groupCheckboxes.forEach(cb => cb.disabled = true);

                        groupsCard.querySelector('.card-header h6').textContent = 'Deleting Empty Assignment Groups...';
                        progressInfo.innerHTML += `<br>Deleting ${selectedIds.length} empty assignment group${selectedIds.length === 1 ? '' : 's'}...`;

                        let deletedCount = 0;
                        let failedCount = 0;

                        for (const groupId of selectedIds) {
                            try {
                                await window.axios.deleteEmptyAssignmentGroups({
                                    domain: `https://${domain}/api/v1/courses/${courseId}/assignment_groups`,
                                    groupID: groupId,
                                    token
                                });
                                deletedCount++;

                                // Mark as deleted in UI
                                const checkbox = groupsCard.querySelector(`input[value="${groupId}"]`);
                                if (checkbox) {
                                    const label = checkbox.closest('.form-check');
                                    label.style.opacity = '0.6';
                                    label.style.backgroundColor = '#d4edda';
                                    label.style.borderRadius = '4px';
                                    label.style.padding = '4px';
                                    const statusBadge = document.createElement('span');
                                    statusBadge.className = 'badge bg-success ms-auto';
                                    statusBadge.textContent = 'Deleted';
                                    label.querySelector('label').appendChild(statusBadge);
                                }
                            } catch (error) {
                                console.error(`Failed to delete assignment group ${groupId}:`, error);
                                failedCount++;

                                // Mark as failed in UI
                                const checkbox = groupsCard.querySelector(`input[value="${groupId}"]`);
                                if (checkbox) {
                                    const label = checkbox.closest('.form-check');
                                    label.style.opacity = '0.6';
                                    label.style.backgroundColor = '#f8d7da';
                                    label.style.borderRadius = '4px';
                                    label.style.padding = '4px';
                                    const statusBadge = document.createElement('span');
                                    statusBadge.className = 'badge bg-danger ms-auto';
                                    statusBadge.textContent = 'Failed';
                                    label.querySelector('label').appendChild(statusBadge);
                                }
                            }
                        }

                        // Update header to show completion
                        groupsCard.querySelector('.card-header h6').textContent = 'Assignment Groups Deletion Complete';

                        resolve({ deletedCount, failedCount });
                    });
                });
            }
            return { deletedCount: 0, failedCount: 0 };
        } catch (error) {
            console.error('Error checking for empty assignment groups:', error);
            progressInfo.innerHTML += `<br><span class="text-warning">Error checking for empty assignment groups.</span>`;
            return { deletedCount: 0, failedCount: 0 };
        }
    }
}

function noSubmissionAssignments(e) {
    hideEndpoints(e);
    console.log('renderer > noSubmissionAssignments');


    let assignments = [];

    const eContent = document.querySelector('#endpoint-content');
    let noSubmissionAssignmentsForm = eContent.querySelector('#no-submission-assignments-form');

    if (!noSubmissionAssignmentsForm) {
        noSubmissionAssignmentsForm = document.createElement('form');
        noSubmissionAssignmentsForm.id = 'no-submission-assignments-form';

        noSubmissionAssignmentsForm.innerHTML = `
            <style>
                #no-submission-assignments-form h3 { font-size: 1.1rem; margin-bottom: 0.5rem; }
                #no-submission-assignments-form .form-label { font-size: 0.85rem; }
                #no-submission-assignments-form .form-control { font-size: 0.85rem; }
                #no-submission-assignments-form .form-text { font-size: 0.7rem; }
                #no-submission-assignments-form .form-check-label { font-size: 0.85rem; }
                #no-submission-assignments-form .btn { font-size: 0.85rem; padding: 0.35rem 0.75rem; }
                #no-submission-assignments-form .bi { font-size: 0.9rem; }
                #no-submission-assignments-form .progress { height: 12px; }
                #no-submission-assignments-form .mt-3 { margin-top: 0.5rem !important; }
                #no-submission-assignments-form .mt-5 { margin-top: 1rem !important; }
            </style>
            <div>
                <h3>Delete Assignments With No Submissions</h3>
            </div>
            <div class="row align-items-center">
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
                <div class="w-100"></div> 
                <div class="col-auto form-check form-switch mt-2 ms-3">
                    <input id="graded-submissions" class="form-check-input" type="checkbox" role="switch" />
                    <label for="graded-submissions" class="form-check-label">Delete assignments with grades</label>
                    <div id="graded-help" class="form-text">
                        (otherwise this will check for assignments with no submissions <em>AND</em> no grades)
                    </div>
                </div>
                <div class="col-auto">
    
                </div>
                <div class="w-100"></div> 
                <div class="col-auto">
                    <button id="action-btn" class="btn btn-sm btn-primary mt-2">Check</button>
                </div>
            </div>
            <div hidden id="nsa-progress-div">
                <p id="nsa-progress-info"></p>
                <div class="progress mt-2" style="width: 75%; height: 12px;" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
    
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
            </div>
            <div id="nsa-response-container" class="mt-2">
            </div>
        `;



        eContent.append(noSubmissionAssignmentsForm);
    }
    noSubmissionAssignmentsForm.hidden = false;


    const courseID = document.querySelector('#course-id');
    courseID.addEventListener('change', (e) => {
        e.preventDefault();
        e.stopPropagation();

        checkCourseID(courseID, eContent);
    });

    const checkBtn = noSubmissionAssignmentsForm.querySelector('#action-btn');
    checkBtn.addEventListener('click', async function (e) {
        e.stopPropagation();
        e.preventDefault();

        const gradedSubmissions = noSubmissionAssignmentsForm.querySelector('#graded-submissions').checked;
        console.log(gradedSubmissions);

        checkBtn.disabled = true;
        console.log('renderer > noSubmissionAssignments > check');

        const nsaResponseContainer = noSubmissionAssignmentsForm.querySelector('#nsa-response-container');
        const domain = document.querySelector('#domain').value.trim();
        const token = document.querySelector('#token').value.trim();
        const course_id = courseID.value.trim();
        const nsaProgressDiv = noSubmissionAssignmentsForm.querySelector('#nsa-progress-div');
        const nsaProgressBar = nsaProgressDiv.querySelector('.progress-bar');
        const nsaProgressInfo = noSubmissionAssignmentsForm.querySelector('#nsa-progress-info');


        // clean environment
        nsaResponseContainer.innerHTML = '';
        nsaProgressDiv.hidden = false;
        nsaProgressBar.parentElement.hidden = true;
        updateProgressWithPercent(nsaProgressBar, 0);
        enhanceProgressBarWithPercent(nsaProgressBar);
        nsaProgressInfo.innerHTML = 'Checking...';


        const requestData = {
            domain,
            token,
            course_id,
            graded: gradedSubmissions
        }

        let hasError = false;
        try {
            assignments = await window.axios.getNoSubmissionAssignments(requestData);
            nsaProgressInfo.innerHTML = '';
        }
        catch (error) {
            errorHandler(error, nsaProgressInfo)
            hasError = true;
        } finally {
            checkBtn.disabled = false;
        }

        if (!hasError) {
            console.log(`found ${assignments.length} assignments with no submissions`);


            //const eContent = document.querySelector('#endpoint-content');
            let gradedText = gradedSubmissions ? 'no submissions.' : 'no submissions or grades.';
            nsaResponseContainer.innerHTML = `
                        <div id="nsa-response-details">
                            <div class="row align-items-center">
                                <div  class="col-auto">
                                    <span>Found ${assignments.length} assignments with ${gradedText}</span>
                                </div>

                                <div class="w-100"></div>

                                <div class="col-2">
                                    <button id="remove-btn" type="button" class="btn btn-sm btn-danger">Remove</button>
                                </div>
                                <div class="col-2">
                                    <button id="cancel-btn" type="button" class="btn btn-sm btn-secondary">Cancel</button>
                                </div>
                            </div>
                        </div>    
                    `;

            const nsaResponseDetails = nsaResponseContainer.querySelector('#nsa-response-details');

            const cancelBtn = nsaResponseDetails.querySelector('#cancel-btn');
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                courseID.value = '';
                nsaResponseContainer.innerHTML = '';
                checkBtn.disabled = false;
                //clearData(courseID, responseContent);
            });

            const removeBtn = nsaResponseDetails.querySelector('#remove-btn');
            removeBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                console.log('renderer > getNoSubmissionAssignments > removeBtn');

                nsaResponseDetails.innerHTML = ``;
                nsaProgressBar.parentElement.hidden = false;
                nsaProgressInfo.innerHTML = `Removing ${assignments.length} assignments...`;

                const assignmentIDs = assignments.map((assignment) => {
                    return {
                        name: assignment.node.name,
                        id: assignment.node._id
                    };
                });

                const messageData = {
                    domain,
                    token,
                    course_id,
                    number: assignmentIDs.length,
                    assignments: assignmentIDs
                }

                window.progressAPI.onUpdateProgress((progress) => {
                    updateProgressWithPercent(nsaProgressBar, progress);
                });

                try {
                    const deleteNoSubmissionASsignments = await window.axios.deleteAssignments(messageData);
                    const successful = deleteNoSubmissionASsignments.successful.length;
                    const failed = deleteNoSubmissionASsignments.failed.length;

                    let resultHTML = `
                        <div class="alert ${failed > 0 ? 'alert-warning' : 'alert-success'}" role="alert">
                            Deleted ${successful} assignment(s)${failed ? `, ${failed} failed` : ''}.
                        </div>
                    `;

                    // Display detailed error information using the helper function
                    if (failed > 0 && deleteNoSubmissionASsignments.failed) {
                        resultHTML += createErrorCard(deleteNoSubmissionASsignments.failed, 'Assignment');
                    }

                    nsaProgressInfo.innerHTML = '';
                    nsaResponseContainer.innerHTML = resultHTML;
                } catch (error) {
                    errorHandler(error, nsaProgressInfo)
                } finally {
                    checkBtn.disabled = false;
                }
            });

            if (assignments.length < 1) {
                removeBtn.disabled = true;
            } else {
                removeBtn.disabled = false;
            }
        }

        // console.error(error)
        // const lastIndex = error.message.lastIndexOf(':');
        // let errorInfo = '';
        // const statusCode = error.message.match(/(?<=status code )[0-9]+/);
        // if (statusCode) {
        //     switch (statusCode[0]) {
        //         case '404':
        //             errorInfo = 'Check your inputs to make sure they\'re valid.';
        //             break;
        //         case '403':
        //             errorInfo = 'Check to make sure you have permissions for the request and try again.';
        //             break;
        //         default:
        //             errorInfo = 'Message Caleb and tell him to fix it.'
        //             break;
        //     }
        // }
        // responseContainer.innerHTML = `<p>There was an error: <span class="error">${error.message.slice(lastIndex + 1)}</span></p><p>${errorInfo}</p>`;
        // checkBtn.disabled = false;


    });
}

function unpublishedAssignments(e) {
    hideEndpoints(e)
    let assignments = [];

    const eContent = document.querySelector('#endpoint-content');
    let deleteUnpublishedAssignmentsForm = eContent.querySelector('#delete-upublished-assignments-form');

    if (!deleteUnpublishedAssignmentsForm) {
        deleteUnpublishedAssignmentsForm = document.createElement('form');
        deleteUnpublishedAssignmentsForm.id = 'delete-upublished-assignments-form';

        deleteUnpublishedAssignmentsForm.innerHTML = `
            <style>
                #delete-upublished-assignments-form h3 { font-size: 1.1rem; margin-bottom: 0.5rem; }
                #delete-upublished-assignments-form .form-label { font-size: 0.85rem; }
                #delete-upublished-assignments-form .form-control { font-size: 0.85rem; }
                #delete-upublished-assignments-form .form-text { font-size: 0.7rem; }
                #delete-upublished-assignments-form .btn { font-size: 0.85rem; padding: 0.35rem 0.75rem; }
                #delete-upublished-assignments-form .progress { height: 12px; }
                #delete-upublished-assignments-form .mt-3 { margin-top: 0.5rem !important; }
            </style>
            <div>
                <h3>Delete All Unpublished Assignments</h3>
                <div>Deletes all unpublished assignments without grades</div>
            </div>
            <div class="row align-items-center">
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
                <div class="w-100"></div> 
                <div class="col-auto">
                    <button id="action-btn" class="btn btn-sm btn-primary mt-2">Check</button>
                </div>
            </div>
            <div hidden id="dua-progress-div">
                <p id="dua-progress-info"></p>
                <div class="progress mt-2" style="width: 75%; height: 12px;" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
            </div>
            <div id="dua-response-container" class="mt-2">
            </div>
        `;

        eContent.append(deleteUnpublishedAssignmentsForm);
    }
    deleteUnpublishedAssignmentsForm.hidden = false;

    const courseID = deleteUnpublishedAssignmentsForm.querySelector('#course-id');
    courseID.addEventListener('change', (e) => {
        e.preventDefault();
        e.stopPropagation();

        checkCourseID(courseID, eContent);
    });

    const checkBtn = deleteUnpublishedAssignmentsForm.querySelector('#action-btn');
    checkBtn.addEventListener('click', async function (e) {
        e.stopPropagation();
        e.preventDefault();

        checkBtn.disabled = true;
        const domain = document.querySelector('#domain').value.trim();
        const apiToken = document.querySelector('#token').value.trim();
        const duaResponseContainer = deleteUnpublishedAssignmentsForm.querySelector('#dua-response-container');
        const duaProgressDiv = deleteUnpublishedAssignmentsForm.querySelector('#dua-progress-div');
        const duaProgressBar = duaProgressDiv.querySelector('.progress-bar');
        const duaProgressInfo = deleteUnpublishedAssignmentsForm.querySelector('#dua-progress-info');

        // clean environment
        duaProgressDiv.hidden = false;
        updateProgressWithPercent(duaProgressBar, 0);
        enhanceProgressBarWithPercent(duaProgressBar);
        duaProgressBar.parentElement.hidden = true;
        duaProgressInfo.innerHTML = "Checking...";

        const requestData = {
            domain: domain,
            token: apiToken,
            course: courseID.value.trim()
        }

        let hasError = false;
        try {
            assignments = await window.axios.getUnpublishedAssignments(requestData);
            duaProgressInfo.innerHTML = '';
        } catch (error) {
            errorHandler(error, duaProgressInfo);
            hasError = true;
        } finally {
            checkBtn.disabled = false;
        }


        if (!hasError) {
            console.log('found assignments', assignments.length);

            //const eContent = document.querySelector('#endpoint-content');
            duaResponseContainer.innerHTML = `
                <div id="dua-response-details">
                    <div class="row align-items-center">
                        <div  class="col-auto">
                            <span>Found ${assignments.length} unpublished assignments.</span>
                        </div>

                        <div class="w-100"></div>

                        <div class="col-2">
                            <button id="remove-btn" type="button" class="btn btn-sm btn-danger">Remove</button>
                        </div>
                        <div class="col-2">
                            <button id="cancel-btn" type="button" class="btn btn-sm btn-secondary">Cancel</button>
                        </div>
                    </div>
                </div>    
            `;

            const duaResponseDetails = deleteUnpublishedAssignmentsForm.querySelector('#dua-response-details');

            const cancelBtn = duaResponseDetails.querySelector('#cancel-btn');
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                courseID.value = '';
                duaResponseContainer.innerHTML = '';
                checkBtn.disabled = false;
                //clearData(courseID, responseContent);
            });

            const removeBtn = duaResponseDetails.querySelector('#remove-btn');
            removeBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                console.log('inside remove');

                // responseDetails.innerHTML = `Removing ${assignments.length} assignments...`;
                duaResponseDetails.innerHTML = ``;
                duaProgressInfo.innerHTML = `Deleting ${assignments.length} assignments...`;
                updateProgressWithPercent(duaProgressBar, 0);
                duaProgressBar.parentElement.hidden = false;


                // remapping to only include the id from the graphql response
                const assignmentIDs = assignments.map((assignment) => {
                    return {
                        id: assignment._id
                    };
                });

                const messageData = {
                    domain,
                    token: apiToken,
                    course_id: courseID.value.trim(),
                    number: assignmentIDs.length,
                    assignments: assignmentIDs
                }

                // const successful = [];
                // const failed = [];


                window.progressAPI.onUpdateProgress((progress) => {
                    updateProgressWithPercent(duaProgressBar, progress);
                });

                try {
                    const deleteUnpublishedAssignments = await window.axios.deleteAssignments(messageData);
                    const successful = deleteUnpublishedAssignments.successful.length;
                    const failed = deleteUnpublishedAssignments.failed.length;

                    let resultHTML = `
                        <div class="alert ${failed > 0 ? 'alert-warning' : 'alert-success'}" role="alert">
                            Deleted ${successful} assignment(s)${failed ? `, ${failed} failed` : ''}.
                        </div>
                    `;

                    // Display detailed error information using the helper function
                    if (failed > 0 && deleteUnpublishedAssignments.failed) {
                        resultHTML += createErrorCard(deleteUnpublishedAssignments.failed, 'Assignment');
                    }

                    duaProgressInfo.innerHTML = '';
                    duaResponseContainer.innerHTML = resultHTML;
                } catch (error) {
                    errorHandler(error, duaProgressInfo);
                } finally {
                    checkBtn.disabled = false;
                }

                // const deleteUnpublishedAssignments = async (data) => {
                //     try {
                //         // const response = await window.axios.deleteTheThings(messageData);
                //         const response = await window.axios.deleteAssignment(data);
                //         return response;
                //     } catch (error) {
                //         console.error('Error deleting unpublished assignments', error);
                //         throw error;
                //     } finally {
                //         updateProgress();
                //     }
                // }

                //     const totalRequests = assignmentIDs.length;
                //     let completedRequests = 0;

                //     const updateProgress = () => {
                //         completedRequests++;
                //         progressBar.style.width = `${(completedRequests / totalRequests) * 50}%`;
                //     }

                //     let requests = assignmentIDs.map(assignment => {
                //         const messageDataCopy = { ...messageData, assignment: assignment.id };
                //         return () => deleteUnpublishedAssignments(messageDataCopy);
                //     });

                //     const processBatchRequests = async (requests, batchSize, timeDelay) => {
                //         const results = [];
                //         for (let i = 0; i < requests.length; i += batchSize) {
                //             const batch = requests.slice(i, i + batchSize);
                //             const batchResults = await Promise.allSettled(batch.map((request) => request()));
                //             results.push(...batchResults);
                //             if (i + batchSize < requests.length) {
                //                 await waitFunc(timeDelay);
                //             }
                //         }
                //         return results;
                //     }

                //     let counter = 0;
                //     const finalResults = {
                //         successful: [],
                //         failed: []
                //     }

                //     // looping through the requests until all are successful or until 3 attempts
                //     do {
                //         const response = await processBatchRequests(requests, batchSize, timeDelay);

                //         // checking for successful requests and mapping them to a new array
                //         successful = response.filter((result) => {
                //             if (result.status === 'fulfilled') {
                //                 return result;
                //             }
                //         }).map((result) => {
                //             return {
                //                 status: result.status,
                //                 id: result.value
                //             }
                //         });
                //         finalResults.successful.push(...successful);

                //         // checking for failed requests and mapping them to a new array
                //         failed = response.filter((result) => {
                //             if (result.status === 'rejected') {
                //                 return result
                //             }
                //         }).map((result) => {
                //             return {
                //                 status: result.status,
                //                 reason: result.reason.message,
                //                 id: result.reason.config.url.split('/').pop()
                //             }
                //         });

                //         // removing successful requests from the failed requests
                //         finalResults.successful.forEach((success) => {
                //             finalResults.failed = finalResults.failed.filter((fail) => {
                //                 return fail.id != success.id;
                //             });
                //         });

                //         requests = failed;
                //         counter++;
                //     } while (requests.length > 0 && counter < 3);


                //     // await Promise.allSettled(requests);
                //     progressBar.style.width = '100%';

                //     if (finalResults.successful.length > 0) {
                //         responseContainer.innerHTML = `Successfully removed ${finalResults.successful.length} assignments.`

                //     }
                //     if (finalResults.failed.length > 0) {
                //         for (let fail of finalResults.failed) {
                //             responseContainer.innerHTML += `<p>Failed to remove assignment: ${fail.id} "${fail.reason}"</p>`;
                //         }
                // }
            });
        }


        // } else {
        //     document.querySelector('#courseChecker').style.display = 'inline';
        //     checkBtn.disabled = false;
        // }
    });
}

function nonModuleAssignments(e) {
    hideEndpoints(e)
    let assignments = [];

    const eContent = document.querySelector('#endpoint-content');
    let deleteAssignmentsNotInModulesForm = eContent.querySelector('#delete-assignments-not-in-modules-form');
    // setHeader('Delete All Assignments Not in a Module', eContent);
    // createForm('deleteNonModuleAssignments', eContent);

    if (!deleteAssignmentsNotInModulesForm) {
        deleteAssignmentsNotInModulesForm = document.createElement('form');
        deleteAssignmentsNotInModulesForm.id = 'delete-assignments-not-in-modules-form';
        // eContent.innerHTML = `
        //     <div>
        //         <h3>Delete All Assignments Not in a Module</h3>
        //     </div>
        // `;

        // const eForm = document.createElement('form');

        deleteAssignmentsNotInModulesForm.innerHTML = `
            <div>
                <h3>Delete All Assignments Not in a Module</h3>
            </div>
            <div class="row align-items-center">
                <div class="col-auto">
                    <label class="form-label">Course</label>
                </div>
                <div class="w-100"></div>
                <div class="col-2">
                    <input id="course" type="text" class="form-control" aria-describedby="input-checker" />
                </div>
                <div class="col-auto" >
                    <span id="input-checker" class="form-text" style="display: none;">Must only contain numbers</span>
                </div>
                <div class="w-100"></div>
                <div class="col-auto mt-3">
                    <label class="form-label">Mode</label>
                </div>
                <div class="w-100"></div>
                <div class="col-auto form-check form-check-inline mt-1">
                    <input class="form-check-input" type="radio" name="danim-mode" id="danim-mode-all" value="all" checked>
                    <label class="form-check-label" for="danim-mode-all">All assignments not in modules</label>
                </div>
                <div class="col-auto form-check form-check-inline mt-1">
                    <input class="form-check-input" type="radio" name="danim-mode" id="danim-mode-specific" value="specific">
                    <label class="form-check-label" for="danim-mode-specific">Specific modules</label>
                </div>
                <div class="w-100"></div>
                <div id="danim-modules-picker" class="mt-2" hidden>
                    <div class="mb-2">Enter module IDs (comma-separated) or fetch and select from the list.</div>
                    <div class="row g-2 align-items-end">
                        <div class="col-auto">
                            <label class="form-label" for="danim-module-ids">Module IDs</label>
                            <input id="danim-module-ids" type="text" class="form-control" placeholder="e.g. 123,456" />
                        </div>
                        <div class="col-auto">
                            <button id="danim-fetch-mods" type="button" class="btn btn-outline-secondary">Fetch course modules</button>
                        </div>
                    </div>
                    <div class="mt-2" id="danim-modules-list-container" hidden>
                        <div class="mb-1">Select one or more modules:</div>
                        <div id="danim-modules-list" class="border rounded p-2" style="max-height: 200px; overflow-y: auto;"></div>
                    </div>
                </div>
                <div class="w-100"></div>
                <div class="col-auto">
                    <button id="action-btn" class="btn btn-primary mt-3">Check</button>
                </div>
            </div>
            <div hidden id="danim-progress-div">
                <p id="danim-progress-info"></p>
                <div class="progress mt-3" style="width: 75%" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
    
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
            </div>
            <div id="danim-response-container" class="mt-5">
            </div>
        `;

        eContent.append(deleteAssignmentsNotInModulesForm);
    }
    deleteAssignmentsNotInModulesForm.hidden = false;
    //checks for valid input in the course id field

    const courseID = deleteAssignmentsNotInModulesForm.querySelector('#course');
    courseID.addEventListener('change', (e) => {
        e.stopPropagation();
        e.preventDefault();

        checkCourseID(courseID, eContent);

    })

    // Mode toggle and module picker loading
    const modeAll = deleteAssignmentsNotInModulesForm.querySelector('#danim-mode-all');
    const modeSpecific = deleteAssignmentsNotInModulesForm.querySelector('#danim-mode-specific');
    const modulesPicker = deleteAssignmentsNotInModulesForm.querySelector('#danim-modules-picker');
    const modulesList = deleteAssignmentsNotInModulesForm.querySelector('#danim-modules-list');
    const modulesListContainer = deleteAssignmentsNotInModulesForm.querySelector('#danim-modules-list-container');
    const fetchModsBtn = deleteAssignmentsNotInModulesForm.querySelector('#danim-fetch-mods');
    const moduleIdsInput = deleteAssignmentsNotInModulesForm.querySelector('#danim-module-ids');

    async function fetchModules() {
        const domain = document.querySelector('#domain').value.trim();
        const token = document.querySelector('#token').value.trim();
        const cid = courseID.value.trim();
        if (!cid || isNaN(Number(cid))) {
            modulesListContainer.hidden = false;
            modulesList.innerHTML = '<div class="text-danger">Enter a valid numeric Course ID first.</div>';
            return;
        }
        fetchModsBtn.disabled = true;
        modulesList.innerHTML = '<div class="text-muted">Loading modules…</div>';
        modulesListContainer.hidden = false;
        try {
            const mods = await window.axios.getModules({ domain, token, course_id: cid });
            modulesList.innerHTML = '';
            if (!mods || mods.length === 0) {
                modulesList.innerHTML = '<div class="text-muted">No modules found.</div>';
                return;
            }
            mods.forEach(edge => {
                const id = edge.node._id;
                const name = edge.node.name;
                const wrapper = document.createElement('div');
                wrapper.className = 'form-check';
                wrapper.innerHTML = `
                    <input class="form-check-input" type="checkbox" data-id="${id}" id="mod-${id}">
                    <label class="form-check-label" for="mod-${id}">${name} <span class="text-muted">(${id})</span></label>
                `;
                modulesList.appendChild(wrapper);
            });
        } catch (err) {
            modulesList.innerHTML = `<div class="text-danger">Failed to load modules: ${err}</div>`;
        } finally {
            fetchModsBtn.disabled = false;
        }
    }

    function toggleModeUI() {
        if (modeSpecific.checked) {
            modulesPicker.hidden = false;
        } else {
            modulesPicker.hidden = true;
        }
    }
    modeAll.addEventListener('change', toggleModeUI);
    modeSpecific.addEventListener('change', toggleModeUI);
    fetchModsBtn.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        fetchModules();
    });

    const checkBtn = deleteAssignmentsNotInModulesForm.querySelector('#action-btn');
    checkBtn.addEventListener('click', async function (e) {
        e.stopPropagation();
        e.preventDefault();

        checkBtn.disabled = true;
        console.log('Inside renderer check');

        const danimResponseContainer = deleteAssignmentsNotInModulesForm.querySelector('#danim-response-container');
        const domain = document.querySelector('#domain').value.trim();
        const token = document.querySelector('#token').value.trim();
        const danimProgressDiv = deleteAssignmentsNotInModulesForm.querySelector('#danim-progress-div');
        const danimProgressBar = danimProgressDiv.querySelector('.progress-bar');
        const danimProgressInfo = deleteAssignmentsNotInModulesForm.querySelector('#danim-progress-info');

        // clean environment
        danimProgressDiv.hidden = false;
        danimProgressBar.parentElement.hidden = true;
        updateProgressWithPercent(danimProgressBar, 0);
        danimProgressInfo.innerHTML = "Checking...";

        const requestData = {
            domain,
            token,
            course: courseID.value.trim()
        }

        let hasError = false;
        try {
            if (modeSpecific.checked) {
                // Gather selected module IDs from manual input and fetched list
                const manualIds = (moduleIdsInput.value || '')
                    .split(',')
                    .map(s => s.trim())
                    .filter(s => s.length > 0 && !isNaN(Number(s)));
                const selectedIds = Array.from(modulesList.querySelectorAll('input[type="checkbox"]:checked'))
                    .map(cb => cb.getAttribute('data-id'));
                const allIds = Array.from(new Set([...manualIds, ...selectedIds]));
                if (allIds.length === 0) {
                    danimProgressInfo.innerHTML = '<span style="color: red;">Enter or select at least one module.</span>';
                    hasError = true;
                } else {
                    assignments = await window.axios.getAssignmentsInModules({ domain, token, course_id: courseID.value.trim(), module_ids: allIds });
                    danimProgressInfo.innerHTML = '';
                }
            } else {
                assignments = await window.axios.getNonModuleAssignments(requestData);
                danimProgressInfo.innerHTML = '';
            }
        } catch (error) {
            errorHandler(error, danimProgressInfo);
            hasError = true;
        } finally {
            checkBtn.disabled = false;
        }

        if (!hasError) {
            console.log('found assignments', assignments.length);

            //const eContent = document.querySelector('#endpoint-content');
            danimResponseContainer.innerHTML = `
                <div>
                    <div class="row align-items-center">
                        <div id="danim-response-details" class="col-auto">
                            <span>Found ${assignments.length} assignments, without submissions or grades, ${modeSpecific.checked ? 'in selected modules' : 'not in modules'}.</span>
                        </div>

                        <div class="w-100"></div>

                        <div class="col-2">
                            <button id="remove-btn" type="button" class="btn btn-danger">Remove</button>
                        </div>
                        <div class="col-2">
                            <button id="cancel-btn" type="button" class="btn btn-secondary">Cancel</button>
                        </div>
                    </div>
                </div>    
            `;

            const cancelBtn = deleteAssignmentsNotInModulesForm.querySelector('#cancel-btn');
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                courseID.value = '';
                danimResponseContainer.innerHTML = '';
                checkBtn.disabled = false;
                //clearData(courseID, responseContent);
            });

            const removeBtn = deleteAssignmentsNotInModulesForm.querySelector('#remove-btn');
            removeBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                console.log('inside remove');

                const danimResponseDetails = danimResponseContainer.querySelector('#danim-response-details');
                danimResponseDetails.innerHTML = ``;

                danimProgressBar.parentElement.hidden = false;
                danimProgressInfo.innerHTML = `Removing ${assignments.length} assignments...`;

                // const messageData = {
                //     url: `https://${domain}/api/v1/courses/${courseID}/assignments`,
                //     token: apiToken,
                //     content: assignments
                // }

                const remapped = assignments.map(a => ({ id: a.id || a._id || a.node?._id }));
                const messageData = {
                    domain,
                    token,
                    course_id: courseID.value.trim(),
                    number: remapped.length,
                    assignments: remapped
                }

                window.progressAPI.onUpdateProgress((progress) => {
                    updateProgressWithPercent(danimProgressBar, progress);
                });

                try {
                    const deleteNonModuleAssignments = await window.axios.deleteAssignments(messageData);
                    const successful = deleteNonModuleAssignments.successful.length;
                    const failed = deleteNonModuleAssignments.failed.length;

                    let resultHTML = `
                        <div class="alert ${failed > 0 ? 'alert-warning' : 'alert-success'}" role="alert">
                            Deleted ${successful} assignment(s)${failed ? `, ${failed} failed` : ''}.
                        </div>
                    `;

                    // Display detailed error information using the helper function
                    if (failed > 0 && deleteNonModuleAssignments.failed) {
                        resultHTML += createErrorCard(deleteNonModuleAssignments.failed, 'Assignment');
                    }

                    danimProgressInfo.innerHTML = '';
                    danimResponseContainer.innerHTML = resultHTML;
                } catch (error) {
                    errorHandler(error, danimProgressInfo);
                } finally {
                    checkBtn.disabled = false;
                }
            });
        }
    })
}

function deleteOldAssignments(e) {
    hideEndpoints(e)
    console.log('renderer > deleteOldAssignments');

    const eContent = document.querySelector('#endpoint-content');
    let deleteOldAssignmentsForm = eContent.querySelector('#delete-old-assignments-form');

    if (!deleteOldAssignmentsForm) {
        deleteOldAssignmentsForm = document.createElement('form');
        deleteOldAssignmentsForm.id = 'create-module-delete-form';
        deleteOldAssignmentsForm.innerHTML = `
            <div>
                <h3>Delete Old Assignments</h3>
                <p>Deletes assignments before the specified date filter. Ignores assignments with grades or submissions.</p>
            </div>
            <div class="row align-items-center">
                <div class="col-auto">
                    <label class="form-label">Course</label>
                </div>
                <div class="w-100"></div>
                <div class="col-2">
                    <input id="course-id" type="text" class="form-control" aria-describedby="input-checker" />
                </div>
                <div class="col-auto" >
                    <span id="input-checker" class="form-text" style="display: none;">Must only contain numbers</span>
                </div>
                <div class="w-100"></div>
                <div class="col-auto mt-3">
                    <input class="form-control" id="due-date-input" type="date">
                </div>
            </div>
            <div id="date-switches" class="mt-3">
                <div class=" form-check form-switch" >
                    <input id="created-at-switch" class="form-check-input" type="checkbox" data-id="createdAt" role="switch">
                    <label for="created-at-switch" class="form-check-label">Created At</label>
                </div>
                <div class=" form-check form-switch" >
                    <input id="due-at-switch" class="form-check-input" type="checkbox" data-id="dueAt" role="switch"
                    <label for="due-at-switch" class="form-check-label">Due At</label>
                </div>               
            </div>
            <div >
                <button id="check-old-assignments-btn" class="btn btn-primary mt-3" disabled>Check</button>
            </div>
            <div hidden id="doa-progress-div">
                <p id="doa-progress-info"></p>
                <div class="progress mt-3" style="width: 75%" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
            </div>
            <div id="doa-response-container" class="mt-3">
            </div>
        `;

        eContent.append(deleteOldAssignmentsForm);
    }
    deleteOldAssignmentsForm.hidden = false;

    const courseID = deleteOldAssignmentsForm.querySelector('#course-id');
    // const dueDate = deleteOldAssignmentsForm.querySelector('#due-date-input');
    const dateSwitches = deleteOldAssignmentsForm.querySelector('#date-switches');

    // disables all switches except the one checked
    dateSwitches.addEventListener('change', (e) => {
        e.stopPropagation();

        const switches = dateSwitches.querySelectorAll('input[type="checkbox"]');
        switches.forEach(switchInput => {
            if (switchInput.id !== e.target.id) {
                switchInput.checked = false;
            }
        })
    })

    courseID.addEventListener('change', (e) => {
        e.preventDefault();
        e.stopPropagation();

        checkCourseID(courseID, deleteOldAssignmentsForm);
    });

    const deleteOldAssignmentsBtn = deleteOldAssignmentsForm.querySelector('button');
    deleteOldAssignmentsBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        deleteOldAssignmentsBtn.disabled = true;

        let dateType = '';
        const switches = dateSwitches.querySelectorAll('input[type="checkbox"]');
        switches.forEach(switchInput => {
            if (switchInput.checked) {
                dateType = switchInput.dataset.id;
            }
        });

        const dateFilter = deleteOldAssignmentsForm.querySelector('#due-date-input').value;

        const doaResponseContainer = deleteOldAssignmentsForm.querySelector('#doa-response-container');
        const doaProgressDiv = deleteOldAssignmentsForm.querySelector('#doa-progress-div');
        const doaProgressBar = doaProgressDiv.querySelector('.progress-bar');
        const doaProgressInfo = deleteOldAssignmentsForm.querySelector('#doa-progress-info');

        if (dateFilter !== '') {

            const domain = document.querySelector('#domain').value.trim();
            const token = document.querySelector('#token').value.trim();
            const course_id = courseID.value.trim();

            // clean environment
            doaResponseContainer.innerHTML = '';
            doaProgressDiv.hidden = false;
            doaProgressBar.parentElement.hidden = true;
            updateProgressWithPercent(doaProgressBar, 0);
            doaProgressInfo.innerHTML = 'Checking...';

            const requestData = {
                domain,
                token,
                course_id,
                date_filter: dateFilter,
                date_type: dateType
            };
            console.log('The data is ', requestData);

            let assignments = [];
            let hasError = false;

            try {
                assignments = await window.axios.getOldAssignments(requestData);
            } catch (error) {
                hasError = true;
                errorHandler(error, doaProgressInfo);
            } finally {
                deleteOldAssignmentsBtn.disabled = false;
            }

            if (!hasError) {
                doaProgressInfo.innerHTML = '';
                if (assignments.length < 1) {
                    doaResponseContainer.innerHTML = `
                        <div>
                            <div class="row align-items-center">
                                <div id="doa-response-details" class="col-auto">
                                    <span>Didn't find any assignments due at or before the current selected date.</span>
                                </div>
                            </div>
                        </div>`
                } else {
                    console.log('found old assignments', assignments.length);

                    //const eContent = document.querySelector('#endpoint-content');
                    doaResponseContainer.innerHTML = `
                    <div id="doa-response-details">
                        <div class="row align-items-center">
                            <div  class="col-auto">
                                <span>Found ${assignments.length} old assignments.</span>
                            </div>
    
                            <div class="w-100"></div>
    
                            <div class="col-2">
                                <button id="remove-btn" type="button" class="btn btn-danger">Remove</button>
                            </div>
                            <div class="col-2">
                                <button id="cancel-btn" type="button" class="btn btn-secondary">Cancel</button>
                            </div>
                        </div>
                    </div>    
                    `;

                    const doaResponseDetails = deleteOldAssignmentsForm.querySelector('#doa-response-details');

                    const cancelBtn = doaResponseDetails.querySelector('#cancel-btn');
                    cancelBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        courseID.value = '';
                        doaResponseContainer.innerHTML = '';
                        deleteOldAssignmentsBtn.disabled = false;
                        //clearData(courseID, responseContent);
                    });

                    const removeBtn = doaResponseDetails.querySelector('#remove-btn');
                    removeBtn.addEventListener('click', async (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        console.log('inside remove');

                        // responseDetails.innerHTML = `Removing ${assignments.length} assignments...`;
                        doaResponseDetails.innerHTML = ``;
                        doaProgressInfo.innerHTML = `Deleting ${assignments.length} assignments...`;
                        updateProgressWithPercent(doaProgressBar, 0);
                        doaProgressBar.parentElement.hidden = false;


                        // remapping to only include the id from the graphql response
                        const assignmentIDs = assignments.map((assignment) => {
                            return {
                                id: assignment._id
                            };
                        });

                        const messageData = {
                            domain,
                            token,
                            course_id,
                            number: assignmentIDs.length,
                            assignments: assignmentIDs
                        }

                        // const successful = [];
                        // const failed = [];


                        window.progressAPI.onUpdateProgress((progress) => {
                            updateProgressWithPercent(doaProgressBar, progress);
                        });

                        try {
                            const deleteOldAssignments = await window.axios.deleteAssignments(messageData);
                            const { successful, failed } = deleteOldAssignments;

                            doaProgressInfo.innerHTML = '';
                            const resultCard = createResultCard(
                                'Delete Old Assignments Results',
                                `Successfully removed ${successful.length} assignments${failed.length > 0 ? `, failed to remove ${failed.length} assignments` : ''}`,
                                failed,
                                failed.length > 0 ? 'danger' : 'success'
                            );
                            doaResponseContainer.appendChild(resultCard);
                        } catch (error) {
                            errorHandler(error, doaProgressInfo, doaResponseContainer);
                        } finally {
                            deleteOldAssignmentsBtn.disabled = false;
                        }
                    })
                }
            }
        } else {
            doaResponseContainer.innerHTML = '';
            doaProgressDiv.hidden = false;
            doaProgressBar.parentElement.hidden = true;
            updateProgressWithPercent(doaProgressBar, 0);
            doaProgressInfo.innerHTML = '<span style="color: red;">Enter a valid due date</span>';

            deleteOldAssignmentsBtn.disabled = false;
        }

    });
}

function deleteAssignmentsFromImport(e) {
    hideEndpoints(e)
    console.log('renderer > deleteAssignmentsFromImport');

    const eContent = document.querySelector('#endpoint-content');
    let deleteAssignmentsFromImportForm = eContent.querySelector('#dafi-form');

    if (!deleteAssignmentsFromImportForm) {
        deleteAssignmentsFromImportForm = document.createElement('form');
        deleteAssignmentsFromImportForm.id = 'dafi-form';
        deleteAssignmentsFromImportForm.innerHTML = `
            <div>
                <h3>Delete Assignments Created From Import</h3>
            </div>
            <div class="row align-items-center">
                <div class="col-auto">
                    <label class="form-label">Course</label>
                </div>
                <div class="w-100"></div>
                <div class="col-2">
                    <input id="course-id" type="text" class="form-control" aria-describedby="input-checker" />
                </div>
                <div class="col-auto" >
                    <span id="input-checker" class="form-text" style="display: none;">Must only contain numbers</span>
                </div>
                <div class="w-100"></div>
                <div class="col-auto mt-3" >
                    <label class="form-label">Import ID</label>
                </di>
                <div class="col-4">
                    <input class="form-control" id="import-id" type="text">
                </div>
                <div class="col-auto">
                    <button id="check-import-assignments-btn" class="btn btn-primary mt-3" disabled>Check</button>
                </div>
            </div>
            <div hidden id="dafi-progress-div">
                <p id="dafi-progress-info"></p>
                <div class="progress mt-3" style="width: 75%" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
            </div>
            <div id="dafi-response-container" class="mt-3">
            </div>
        `;

        eContent.append(deleteAssignmentsFromImportForm);
    }
    deleteAssignmentsFromImportForm.hidden = false;

    const courseID = deleteAssignmentsFromImportForm.querySelector('#course-id');
    const importID = deleteAssignmentsFromImportForm.querySelector('#import-id');

    courseID.addEventListener('change', (e) => {
        e.preventDefault();
        e.stopPropagation();

        checkCourseID(courseID, deleteAssignmentsFromImportForm);
    });

    const dafiCheckBtn = deleteAssignmentsFromImportForm.querySelector('button');
    dafiCheckBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        dafiCheckBtn.disabled = true;

        // getting the elements
        const dafiResponseContainer = deleteAssignmentsFromImportForm.querySelector('#dafi-response-container');
        const dafiProgressDiv = deleteAssignmentsFromImportForm.querySelector('#dafi-progress-div');
        const dafiProgressBar = dafiProgressDiv.querySelector('.progress-bar');
        const dafiProgressInfo = deleteAssignmentsFromImportForm.querySelector('#dafi-progress-info');

        // clearing values
        dafiResponseContainer.innerHTML = '';
        dafiProgressBar.parentElement.hidden = true;
        updateProgressWithPercent(dafiProgressBar, 0);
        dafiProgressInfo.innerHTML = '';
        dafiProgressDiv.hidden = false;

        // getting the values
        const domain = document.querySelector('#domain').value.trim();
        const token = document.querySelector('#token').value.trim();
        const course_id = courseID.value;
        const import_id = importID.value;

        // creating request object
        const requestData = {
            domain,
            token,
            course_id,
            import_id
        }

        dafiProgressInfo.innerHTML = `Checking for imported assignments from the import ${import_id}...`;

        let importedAssignments = [];
        let hasError = false;
        try {
            importedAssignments = await window.axios.getImportedAssignments(requestData);
            dafiProgressInfo.innerHTML = '';
        } catch (error) {
            errorHandler(error, dafiProgressInfo);
            hasError = true;
        } finally {
            dafiCheckBtn.disabled = false;
        }

        if (!hasError) {
            console.log('found assignments', importedAssignments.length);

            //const eContent = document.querySelector('#endpoint-content');
            dafiResponseContainer.innerHTML = `
                <div id="dafi-response-details">
                    <div class="row align-items-center">
                        <div  class="col-auto">
                            <span>Found ${importedAssignments.length} assignments in the import.</span>
                        </div>

                        <div class="w-100"></div>

                        <div class="col-2">
                            <button id="dafi-remove-btn" type="button" class="btn btn-danger">Remove</button>
                        </div>
                        <div class="col-2">
                            <button id="dafi-cancel-btn" type="button" class="btn btn-secondary">Cancel</button>
                        </div>
                    </div>
                </div>    
            `;

            const dafiResponseDetails = dafiResponseContainer.querySelector('#dafi-response-details');

            const dafiCancelBtn = dafiResponseDetails.querySelector('#dafi-cancel-btn');
            dafiCancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                courseID.value = '';
                dafiResponseContainer.innerHTML = '';
                dafiCancelBtn.disabled = false;
                //clearData(courseID, responseContent);
            });

            const dafiRemoveBtn = dafiResponseDetails.querySelector('#dafi-remove-btn');
            dafiRemoveBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                console.log('inside remove');
                dafiRemoveBtn.disabled = true;
                dafiCancelBtn.disabled = true;

                dafiResponseDetails.innerHTML = '';
                dafiProgressBar.parentElement.hidden = false;
                dafiProgressInfo.innerHTML = `Removing ${assignments.length} assignments...`;

                // const messageData = {
                //     url: `https://${domain}/api/v1/courses/${courseID}/assignments`,
                //     token: apiToken,
                //     content: assignments
                // }

                const messageData = {
                    domain,
                    course_id,
                    token,
                    number: importedAssignments.length,
                    assignments: importedAssignments
                }

                window.progressAPI.onUpdateProgress((progress) => {
                    updateProgressWithPercent(dafiProgressBar, progress);
                });

                try {
                    const response = await window.axios.deleteAssignments(messageData);
                    const { successful, failed } = response;

                    dafiProgressInfo.innerHTML = '';
                    const resultCard = createResultCard(
                        'Delete from Import Results',
                        `Successfully removed ${successful.length} assignments${failed.length > 0 ? `, failed to remove ${failed.length} assignments` : ''}`,
                        failed,
                        failed.length > 0 ? 'danger' : 'success'
                    );
                    dafiResponseContainer.appendChild(resultCard);

                    dafiCheckBtn.disabled = false;
                } catch (error) {
                    errorHandler(error, dafiProgressInfo, dafiResponseContainer)
                } finally {
                    dafiCheckBtn.disabled = false;
                }
            });
        }
    })
}

function keepAssignmentsInGroup(e) {
    hideEndpoints(e)
    console.log('renderer > keepAssignmentsInGroup');

    // create form
    const eContent = document.querySelector('#endpoint-content');
    let keepAssignmentsInGroupForm = eContent.querySelector('#keep-assignments-in-group-form');

    if (!keepAssignmentsInGroupForm) {
        keepAssignmentsInGroupForm = document.createElement('form');
        keepAssignmentsInGroupForm.id = 'keep-assignments-in-group-form';

        keepAssignmentsInGroupForm.innerHTML = `
            <div>
                <h3>Only keep assignments in the specific Assignment Group</h3>
            </div>
            <div class="row align-items-center">
                <div class="col-auto">
                    <label class="form-label">Course</label>
                </div>
                <div class="w-100"></div>
                <div class="col-2">
                    <input id="course-id" type="text" class="form-control" aria-describedby="course-checker" />
                </div>
                <div class="col-auto" >
                    <span id="course-checker" class="form-text" style="display: none;">Must only contain numbers</span>
                </div>
            </div>
            <div class="row align-item-center">
                <div class="col-auto">
                    <label class="form-label">Group ID: Delete all assignments not in this assignment group</label>
                </div>
                <div class="w-100"></div>
                <div class="col-2">
                    <input id="group-id" type="text" class="form-control" aria-describedby="group-checker" />
                </div>
                <div class="col-auto" >
                    <span id="group-checker" class="form-text" style="display: none;">Must only contain numbers</span>
                </div>
                <div class="w-100"></div>
            </div>
            <div hidden id="kaig-progress-div">
                <p id="kaig-progress-info"></p>
                <div class="progress mt-3" style="width: 75%" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
    
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
            </div>
            <div class="w-100"></div>
                <div class="col-auto">
                    <button id="kaig-btn" class="btn btn-primary mt-3">Check</button>
                </div>
            <div id="kaig-response-container" class="mt-5">
            </div>
        `;

        eContent.append(keepAssignmentsInGroupForm);
    }
    keepAssignmentsInGroupForm.hidden = false;

    keepAssignmentsInGroupForm.addEventListener('change', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const kaigCheckBtn = keepAssignmentsInGroupForm.querySelector('#kaig-btn');
        const courseChecker = keepAssignmentsInGroupForm.querySelector('#course-checker')
        const courseID = keepAssignmentsInGroupForm.querySelector('#course-id')
        const groupChecker = keepAssignmentsInGroupForm.querySelector('#group-checker')
        const groupID = keepAssignmentsInGroupForm.querySelector('#group-id')
        const input = e.target.value;

        console.log(e.target);

        if (courseID.value.trim() !== '' && groupID.value.trim() !== '') {
            if (isNaN(Number(input))) {
                if (e.target.id === 'group-id') {
                    groupChecker.style.display = 'inline';
                } else {
                    courseChecker.style.display = 'inline';
                }
                // daigCheckBtn.disabled = true;
            } else {
                if (e.target.id === 'group-id') {
                    groupChecker.style.display = 'none';
                } else {
                    courseChecker.style.display = 'none';
                }
            }

            if (groupChecker.style.display === 'inline' || courseChecker.style.display === 'inline') {
                kaigCheckBtn.disabled = true;
            } else {
                kaigCheckBtn.disabled = false;
            }
        } else {
            kaigCheckBtn.disabled = true;
        }
    })

    // const courseID = keepAssignmentsInGroupForm.querySelector('#course');
    // courseID.addEventListener('change', (e) => {
    //     e.preventDefault();
    //     e.stopPropagation();

    //     checkCourseID(courseID, eContent);
    // });

    const kaigCheckBtn = keepAssignmentsInGroupForm.querySelector('#kaig-btn');
    kaigCheckBtn.addEventListener('click', async (e) => {

        e.stopPropagation();
        e.preventDefault();

        kaigCheckBtn.disabled = true;
        console.log('Inside renderer check');

        const kaigResponseContainer = keepAssignmentsInGroupForm.querySelector('#kaig-response-container');
        const domain = document.querySelector('#domain').value.trim();
        const token = document.querySelector('#token').value.trim();
        const courseID = keepAssignmentsInGroupForm.querySelector('#course-id').value.trim();
        const groupID = keepAssignmentsInGroupForm.querySelector('#group-id').value.trim();
        const kaigProgressDiv = keepAssignmentsInGroupForm.querySelector('#kaig-progress-div');
        const kaigProgressBar = kaigProgressDiv.querySelector('.progress-bar');
        const kaigProgressInfo = keepAssignmentsInGroupForm.querySelector('#kaig-progress-info');

        // clean environment
        kaigProgressDiv.hidden = false;
        kaigProgressBar.parentElement.hidden = true;
        updateProgressWithPercent(kaigProgressBar, 0);
        kaigProgressInfo.innerHTML = "Checking...";

        const data = {
            domain,
            token,
            courseID,
            groupID
        }

        let assignmentsNotInGroup = '';
        let hasError = false;
        try {
            assignmentsNotInGroup = await window.axios.keepAssignmentsInGroup(data);

            // if (response.successful.length > 0) {
            //     kaigProgressInfo.innerHTML = `<p>Successfully removed ${response.successful.length} assignments.</p>`;
            // }
            // if (response.failed.length > 0) {
            //     kaigProgressInfo.innerHTML += `<p>Failed to remove ${response.failed.length} assignments.</p>`;
            // }
        } catch (error) {
            errorHandler(error, kaigProgressInfo);
            hasError = true;
        } finally {
            kaigCheckBtn.disabled = false;
        }

        if (!hasError) {
            console.log('found assignments', assignmentsNotInGroup.length);

            //const eContent = document.querySelector('#endpoint-content');
            kaigResponseContainer.innerHTML = `
                <div id="kaig-response-details"
                    <div class="row align-items-center">
                        <div  class="col-auto">
                            <span>Found ${assignmentsNotInGroup.length} assignments not in the group.</span>
                        </div>

                        <div class="w-100"></div>

                        <div class="col-2">
                            <button id="kaig-remove-btn" type="button" class="btn btn-danger">Remove</button>
                        </div>
                        <div class="col-2">
                            <button id="kaig-cancel-btn" type="button" class="btn btn-secondary">Cancel</button>
                        </div>
                    </div>
                </div>    
            `;

            const kaigResponseDetails = kaigResponseContainer.querySelector('#kaig-response-details');

            const kaigCancelBtn = kaigResponseDetails.querySelector('#kaig-cancel-btn');
            kaigCancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                courseID.value = '';
                kaigResponseContainer.innerHTML = '';
                kaigCancelBtn.disabled = false;
                //clearData(courseID, responseContent);
            });

            const kaigRemoveBtn = kaigResponseDetails.querySelector('#kaig-remove-btn');
            kaigRemoveBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                console.log('inside remove');
                kaigRemoveBtn.disabled = true;
                kaigCancelBtn.disabled = true;

                kaigResponseDetails.innerHTML = '';
                kaigProgressBar.parentElement.hidden = false;
                kaigProgressInfo.innerHTML = `Removing ${assignmentsNotInGroup.length} assignments...`;

                // const messageData = {
                //     url: `https://${domain}/api/v1/courses/${courseID}/assignments`,
                //     token: apiToken,
                //     content: assignments
                // }

                const messageData = {
                    domain,
                    course_id: courseID,
                    token,
                    number: assignmentsNotInGroup.length,
                    assignments: assignmentsNotInGroup
                }

                window.progressAPI.onUpdateProgress((progress) => {
                    updateProgressWithPercent(kaigProgressBar, progress);
                });

                try {
                    const response = await window.axios.deleteAssignments(messageData);
                    const { successful, failed } = response;

                    kaigProgressInfo.innerHTML = '';
                    const resultCard = createResultCard(
                        'Keep Assignments in Group Results',
                        `Successfully removed ${successful.length} assignments${failed.length > 0 ? `, failed to remove ${failed.length} assignments` : ''}`,
                        failed,
                        failed.length > 0 ? 'danger' : 'success'
                    );
                    kaigResponseContainer.appendChild(resultCard);

                    kaigCheckBtn.disabled = false;
                } catch (error) {
                    errorHandler(error, kaigProgressInfo, kaigResponseContainer)
                } finally {
                    kaigCheckBtn.disabled = false;
                }
            });
        }
    })
}

function moveAssignmentsToSingleGroup(e) {
    hideEndpoints(e)
    console.log('renderer > moveAssignmentsToSingleGroup');

    // create form
    const eContent = document.querySelector('#endpoint-content');
    let moveAssignmentsForm = eContent.querySelector('#move-assignments');

    if (!moveAssignmentsForm) {
        moveAssignmentsForm = document.createElement('form');
        moveAssignmentsForm.id = 'move-assignments';
        // eContent.innerHTML = `
        //     <div>
        //         <h3>Move Assignments to a Single Group</h3>
        //     </div>
        // `;
        // // setHeader('Move Assignments to Single Group', eContent);
        // // createForm('moveAssignmentsToSingleGroup', eContent);

        // // find someway to generate the form

        // const eForm = document.createElement('form');
        moveAssignmentsForm.innerHTML = `
            <style>
                #move-assignments .card-title { font-size: 1.1rem; }
                #move-assignments .card-header small { font-size: 0.75rem; }
                #move-assignments .form-label { font-size: 0.85rem; font-weight: 600; }
                #move-assignments .form-control,
                #move-assignments .form-select { font-size: 0.85rem; padding: 0.25rem 0.5rem; }
                #move-assignments .form-text { font-size: 0.7rem; }
                #move-assignments .btn { font-size: 0.85rem; padding: 0.35rem 0.75rem; }
                #move-assignments .bi { font-size: 0.9rem; }
                #move-assignments .alert { font-size: 0.85rem; padding: 0.5rem 0.75rem; }
                #move-assignments .card-body { padding: 0.75rem; }
                #move-assignments .progress { height: 12px; }
                #move-assignments .gap-2 { gap: 0.5rem !important; }
                #move-assignments .g-3 { gap: 0.5rem !important; }
                #move-assignments .mt-2 { margin-top: 0.5rem !important; }
                #move-assignments .mt-3 { margin-top: 0.5rem !important; }
            </style>
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-arrow-right-square me-1"></i>Move Assignments to a Single Group
                    </h3>
                    <small class="text-muted">Move all assignments to a specific assignment group. If no group is entered, the first assignment's group will be used.</small>
                </div>
                <div class="card-body">
                    <div class="row g-3 align-items-start">
                        <div class="col-md-4">
                            <label class="form-label fw-bold" for="course">
                                <i class="bi bi-book me-1"></i>Course ID
                            </label>
                            <input id="course" type="text" class="form-control form-control-sm" 
                                   aria-describedby="input-checker" placeholder="Enter course ID" />
                            <div id="input-checker" class="form-text text-danger d-none">
                                <i class="bi bi-exclamation-triangle me-1"></i>Must only contain numbers
                            </div>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label fw-bold" for="move-group-id">
                                <i class="bi bi-collection me-1"></i>Assignment Group ID
                                <span class="text-muted">(optional)</span>
                            </label>
                            <input id="move-group-id" type="text" class="form-control form-control-sm" 
                                   aria-describedby="group-checker" placeholder="e.g. 12345" />
                            <div id="group-checker" class="form-text text-danger d-none">
                                <i class="bi bi-exclamation-triangle me-1"></i>Must only contain numbers
                            </div>
                            <div class="form-text text-muted">
                                <i class="bi bi-info-circle me-1"></i>Leave empty to use first assignment's group
                            </div>
                        </div>
                        <div class="col-md-4 d-flex align-items-end">
                            <div class="d-grid w-100">
                                <button id="action-btn" class="btn btn-sm btn-info">
                                    <i class="bi bi-search me-1"></i>Check Assignments
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Progress Card -->
            <div class="card mt-2" id="mag-progress-div" hidden>
                <div class="card-header">
                    <h5 class="card-title mb-0">
                        <i class="bi bi-gear me-1"></i>Moving Assignments
                    </h5>
                </div>
                <div class="card-body">
                    <p id="mag-progress-info" class="mb-2"></p>
                    <div class="progress mb-2" style="height: 12px;">
                        <div class="progress-bar progress-bar-striped progress-bar-animated" 
                             style="width: 0%" role="progressbar" 
                             aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Results Card -->
            <div class="card mt-2" id="mag-response-container-card" hidden>
                <div class="card-body" id="mag-response-container">
            </div>
        `;

        eContent.append(moveAssignmentsForm);

        // Setup event listeners only once when form is created
        // Objectives:
        // 1. Get inputs
        // 2. Get all assignments from a course
        // 3. Get the first assignment group from the first assignment
        // 4. Loop through all assignments and move them to the first assignment group

        const courseID = moveAssignmentsForm.querySelector('#course');
        courseID.addEventListener('change', (e) => {
            e.preventDefault();
            e.stopPropagation();

            checkCourseID(courseID, eContent);
        });

        // Simple numeric validation for optional group input
        const groupIdInput = moveAssignmentsForm.querySelector('#move-group-id');
        const groupChecker = moveAssignmentsForm.querySelector('#group-checker');
        const moveBtnRef = moveAssignmentsForm.querySelector('#action-btn');
        groupIdInput.addEventListener('input', (ev) => {
            const val = groupIdInput.value.trim();
            const hasVal = val !== '';
            const isNum = !isNaN(Number(val));
            if (hasVal && !isNum) {
                groupChecker.style.display = 'inline';
                moveBtnRef.disabled = true;
            } else {
                groupChecker.style.display = 'none';
                moveBtnRef.disabled = false;
            }
        });

        const checkBtn = moveAssignmentsForm.querySelector('#action-btn');
        checkBtn.addEventListener('click', async function (e) {
            e.stopPropagation();
            e.preventDefault();

            checkBtn.disabled = true;
            console.log('Inside renderer check');

            const magResponseContainer = moveAssignmentsForm.querySelector('#mag-response-container');
            const magResponseContainerCard = moveAssignmentsForm.querySelector('#mag-response-container-card');
            const domain = document.querySelector('#domain').value.trim();
            const apiToken = document.querySelector('#token').value.trim();
            const magProgressDiv = moveAssignmentsForm.querySelector('#mag-progress-div');
            const magProgressBar = magProgressDiv.querySelector('.progress-bar');
            const magProgressInfo = moveAssignmentsForm.querySelector('#mag-progress-info');

            // clean environment
            magResponseContainer.innerHTML = '';
            magResponseContainerCard.hidden = true;
            magProgressDiv.hidden = false;
            magProgressBar.parentElement.hidden = true;
            updateProgressWithPercent(magProgressBar, 0);
            magProgressInfo.innerHTML = "Checking...";

            const data = {
                domain: domain,
                token: apiToken,
                course: courseID.value.trim()
            }

            let assignments = [];
            let hasError = false;
            try {
                assignments = await window.axios.getAssignmentsToMove(data);
                magProgressInfo.innerHTML = '';
            } catch (error) {
                errorHandler(error, magProgressInfo);
                hasError = true;
            } finally {
                checkBtn.disabled = false;

            }

            if (!hasError) {
                if (!assignments || assignments.length === 0) {
                    magResponseContainer.innerHTML = `
                    <div class="alert alert-info mt-3">No assignments found for this course.</div>
                `;
                    const magResponseContainerCard = moveAssignmentsForm.querySelector('#mag-response-container-card');
                    magResponseContainerCard.hidden = false;
                    return;
                }

                // Use manual group id if provided and numeric, otherwise default to first assignment's group
                const manualGroup = groupIdInput.value.trim();
                const isManualOverride = !isNaN(Number(manualGroup)) && manualGroup !== '';
                let assignmentGroupId = isManualOverride
                    ? manualGroup
                    : assignments[0].assignmentGroupId;

                console.log('found assignments', assignments.length);

                // Filter out assignments that are already in the target group
                const totalAssignments = assignments.length;
                const assignmentsToMove = assignments.filter(assignment =>
                    assignment.assignmentGroupId !== assignmentGroupId
                );
                const alreadyInGroup = totalAssignments - assignmentsToMove.length;

                console.log(`Assignments to move: ${assignmentsToMove.length}, already in target group: ${alreadyInGroup}`);

                // Fetch assignment group details
                magProgressInfo.innerHTML = 'Fetching assignment group details...';
                let assignmentGroupName = 'Unknown';
                let assignmentGroupDetails = null;
                let groupFetchError = false;

                try {
                    const groupData = {
                        domain: domain,
                        token: apiToken,
                        course: courseID.value.trim(),
                        groupId: assignmentGroupId
                    };
                    assignmentGroupDetails = await window.axios.getAssignmentGroupById(groupData);
                    assignmentGroupName = assignmentGroupDetails.name;
                    magProgressInfo.innerHTML = '';
                    magProgressDiv.hidden = true;
                } catch (error) {
                    console.error('Could not fetch assignment group details:', error);
                    groupFetchError = true;
                    magProgressDiv.hidden = true;

                    // Show error in response container
                    const magResponseContainerCard = moveAssignmentsForm.querySelector('#mag-response-container-card');
                    magResponseContainerCard.hidden = false;

                    magResponseContainer.innerHTML = `
                    <div class="alert alert-danger">
                        <h5 class="alert-heading">
                            <i class="bi bi-exclamation-triangle me-2"></i>Invalid Assignment Group ID
                        </h5>
                        <p class="mb-2">
                            Could not find assignment group with ID <strong>${assignmentGroupId}</strong> in this course.
                        </p>
                        ${isManualOverride ?
                            `<hr><p class="mb-0 small"><i class="bi bi-info-circle me-1"></i>Please check that the assignment group ID is correct and belongs to course ${courseID.value.trim()}.</p>`
                            : `<hr><p class="mb-0 small"><i class="bi bi-info-circle me-1"></i>The first assignment references a group that doesn't exist. Please manually specify a valid assignment group ID.</p>`
                        }
                    </div>
                `;
                    return;
                }

                // Show the results card
                const magResponseContainerCard = moveAssignmentsForm.querySelector('#mag-response-container-card');
                magResponseContainerCard.hidden = false;

                // Check if all assignments are already in the target group
                if (assignmentsToMove.length === 0) {
                    magResponseContainer.innerHTML = `
                    <div class="alert alert-success">
                        <h5 class="alert-heading">
                            <i class="bi bi-check-circle me-2"></i>All Assignments Already in Target Group
                        </h5>
                        <p class="mb-2">
                            All <strong>${totalAssignments}</strong> assignment${totalAssignments !== 1 ? 's' : ''} in this course ${totalAssignments !== 1 ? 'are' : 'is'} already in <strong>${assignmentGroupName}</strong>.
                        </p>
                        <hr>
                        <p class="mb-0 small">
                            <i class="bi bi-info-circle me-1"></i>No assignments need to be moved.
                        </p>
                    </div>
                `;
                    return;
                }

                //const eContent = document.querySelector('#endpoint-content');
                magResponseContainer.innerHTML = `
                <div class="card border-info">
                    <div class="card-header bg-info-subtle">
                        <h5 class="card-title mb-0">
                            <i class="bi bi-info-circle me-2"></i>Assignments Found
                        </h5>
                    </div>
                    <div class="card-body">
                        <div id="mag-response-details">
                            <div class="row g-3 mb-3">
                                <div class="col-md-6">
                                    <div class="alert alert-info mb-0">
                                        <div class="d-flex align-items-center">
                                            <i class="bi bi-list-check fs-3 me-3"></i>
                                            <div>
                                                <div class="fw-bold">Total Assignments</div>
                                                <div class="fs-4">${totalAssignments}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="alert alert-warning mb-0">
                                        <div class="d-flex align-items-center">
                                            <i class="bi bi-arrow-right-circle fs-3 me-3"></i>
                                            <div>
                                                <div class="fw-bold">Need to Move</div>
                                                <div class="fs-4">${assignmentsToMove.length}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            ${alreadyInGroup > 0 ? `
                            <div class="alert alert-success mb-3">
                                <i class="bi bi-check-circle me-2"></i>
                                <strong>${alreadyInGroup}</strong> assignment${alreadyInGroup !== 1 ? 's are' : ' is'} already in the target group and will be skipped.
                            </div>
                            ` : ''}
                            
                            <div class="mb-3">
                                <h6 class="text-muted mb-2">
                                    <i class="bi bi-collection me-1"></i>Target Assignment Group
                                </h6>
                                <div class="p-3 bg-light rounded">
                                    <div class="mb-2">
                                        <strong class="fs-5">${assignmentGroupName}</strong>
                                    </div>
                                    <div class="text-muted small">
                                        <i class="bi bi-hash me-1"></i>ID: ${assignmentGroupId}
                                        ${assignmentGroupDetails && assignmentGroupDetails.position ? ` | Position: ${assignmentGroupDetails.position}` : ''}
                                    </div>
                                    ${!isManualOverride ?
                        `<div class="form-text mt-2"><i class="bi bi-info-circle me-1"></i>Auto-detected from first assignment</div>`
                        : `<div class="form-text mt-2"><i class="bi bi-pencil me-1"></i>Manually specified group</div>`}
                                </div>
                            </div>

                            <div class="alert alert-warning mb-3">
                                <i class="bi bi-exclamation-triangle me-2"></i>
                                <strong>Warning:</strong> ${assignmentsToMove.length} assignment${assignmentsToMove.length !== 1 ? 's' : ''} will be moved to <strong>${assignmentGroupName}</strong>.
                            </div>
                        </div>

                        <div class="d-flex gap-2 justify-content-end">
                            <button id="cancel-btn" type="button" class="btn btn-secondary">
                                <i class="bi bi-x-circle me-1"></i>Cancel
                            </button>
                            <button id="move-btn" type="button" class="btn btn-danger">
                                <i class="bi bi-arrow-right-circle me-1"></i>Move ${assignmentsToMove.length} Assignment${assignmentsToMove.length !== 1 ? 's' : ''}
                            </button>
                        </div>
                    </div>
                </div>    
            `;

                const magResponseDetails = magResponseContainer.querySelector('#mag-response-details');

                const cancelBtn = magResponseContainer.querySelector('#cancel-btn');
                cancelBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    courseID.value = '';
                    magResponseContainer.innerHTML = '';
                    magResponseContainerCard.hidden = true;
                    checkBtn.disabled = false;
                    //clearData(courseID, responseContent);
                });

                const moveBtn = magResponseContainer.querySelector('#move-btn');
                moveBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    console.log('inside move');

                    // Hide the confirmation card and show progress
                    magResponseContainer.innerHTML = '';
                    magResponseContainerCard.hidden = true;

                    // Prevent new checks during move operation
                    checkBtn.disabled = true;

                    // Show progress card
                    magProgressDiv.hidden = false;
                    magProgressBar.parentElement.hidden = false;
                    updateProgressWithPercent(magProgressBar, 0);
                    magProgressInfo.innerHTML = `Moving ${assignmentsToMove.length} assignment${assignmentsToMove.length !== 1 ? 's' : ''} to ${assignmentGroupName}...`;

                    // const messageData = {
                    //     url: `https://${domain}/api/v1/courses/${courseID}/assignments`,
                    //     token: apiToken,
                    //     content: assignments
                    // }

                    const messageData = {
                        url: `https://${domain}/api/v1/courses/${courseID.value.trim()}/assignments`,
                        token: apiToken,
                        number: assignmentsToMove.length,
                        assignments: assignmentsToMove,
                        groupID: assignmentGroupId
                    }

                    window.progressAPI.onUpdateProgress((progress) => {
                        updateProgressWithPercent(magProgressBar, progress);
                    });

                    try {
                        const moveAssignmentsToSingleGroup = await window.axios.moveAssignmentsToSingleGroup(messageData);
                        const { successful, failed } = moveAssignmentsToSingleGroup;

                        magProgressDiv.hidden = true;
                        magProgressInfo.innerHTML = '';
                        const resultCard = createResultCard(
                            'Move Assignments Results',
                            `Successfully moved ${successful.length} assignment${successful.length !== 1 ? 's' : ''}${failed.length > 0 ? `, failed to move ${failed.length} assignment${failed.length !== 1 ? 's' : ''}` : ''}`,
                            failed,
                            failed.length > 0 ? 'danger' : 'success'
                        );

                        // Clear and update the response container
                        magResponseContainer.innerHTML = '';
                        magResponseContainer.appendChild(resultCard);
                        magResponseContainerCard.hidden = false;

                        checkBtn.disabled = false;
                    } catch (err) {
                        magProgressDiv.hidden = true;
                        magResponseContainer.innerHTML = '';
                        magResponseContainerCard.hidden = false;
                        errorHandler(err, magProgressInfo, magResponseContainer)
                    } finally {
                        checkBtn.disabled = false;
                    }
                });
            }
        });
    }
    moveAssignmentsForm.hidden = false;
}

function deleteAssignmentsInGroup(e) {
    hideEndpoints(e)
    console.log('renderer > deleteAssignmentsInGroup');

    // create form
    const eContent = document.querySelector('#endpoint-content');
    let deleteAssignmentsInGroupForm = eContent.querySelector('#delete-assignments-in-group');

    if (!deleteAssignmentsInGroupForm) {
        deleteAssignmentsInGroupForm = document.createElement('form');
        deleteAssignmentsInGroupForm.id = 'delete-assignments-in-group';
        // eContent.innerHTML = `
        //     <div>
        //         <h3>Move Assignments to a Single Group</h3>
        //     </div>
        // `;
        // // setHeader('Move Assignments to Single Group', eContent);
        // // createForm('moveAssignmentsToSingleGroup', eContent);

        // // find someway to generate the form

        // const eForm = document.createElement('form');
        deleteAssignmentsInGroupForm.innerHTML = `
            <div>
                <h3>Delete Assignments in a Single Group</h3>
            </div>
            <div class="row align-item-center">
                <div class="row align-items-center">
                    <div class="col-auto">
                        <label class="form-label">Course</label>
                    </div>
                    <div class="w-100"></div>
                    <div class="col-2">
                        <input id="course-id" type="text" class="form-control" aria-describedby="course-checker" />
                    </div>
                    <div class="col-auto" >
                        <span id="course-checker" class="form-text" style="display: none;">Must only contain numbers</span>
                    </div>
                </div>
                <div class="col-auto">
                    <label class="form-label">Group ID: Only deletes assignments in this group</label>
                </div>
                <div class="w-100"></div>
                <div class="col-2">
                    <input id="group-id" type="text" class="form-control" aria-describedby="group-checker" />
                </div>
                <div class="col-auto" >
                    <span id="group-checker" class="form-text" style="display: none;">Must only contain numbers</span>
                </div>
                <div class="w-100"></div>
            </div>
                <div class="col-auto">
                    <button id="daig-btn" class="btn btn-primary mt-3">Check</button>
                </div>
            <div hidden id="daig-progress-div">
                <p id="daig-progress-info"></p>
                <div class="progress mt-3" style="width: 75%" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
    
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
            </div>
            <div id="daig-response-container" class="mt-5">
            </div>
        `;

        eContent.append(deleteAssignmentsInGroupForm);
    }
    deleteAssignmentsInGroupForm.hidden = false;

    // Objectives:
    // 1. Get inputs
    // 2. Try to delete group and all assignments in it
    // 3. If 2 fails get all assignments in the group
    // 4. Delete all those assignments
    // 5. Delete group

    // check course ID is a number
    // const courseID = deleteAssignmentsInGroupForm.querySelector('#course');
    // courseID.addEventListener('change', (e) => {
    //     e.preventDefault();
    //     e.stopPropagation();

    //     checkCourseID(courseID, eContent);
    // });

    // // check group ID is a number and exists
    // const groupID = deleteAssignmentsInGroupForm.querySelector('#group-id');
    // groupID.addEventListener('change', (e) => {
    //     e.preventDefault();
    //     e.stopPropagation();

    //     const groupChecker = deleteAssignmentsInGroupForm.querySelector(`#group-checker`);
    //     const trimmedValue = groupID.value.trim();
    //     if (trimmedValue === '') {
    //         groupChecker.style.display = 'none';
    //         deleteAssignmentsInGroupForm.querySelector('button').disabled = true;
    //     } else if (!isNaN(Number(trimmedValue))) {
    //         groupChecker.style.display = 'none';
    //         deleteAssignmentsInGroupForm.querySelector('button').disabled = false;
    //     } else {
    //         groupChecker.style.display = 'inline';
    //         deleteAssignmentsInGroupForm.querySelector('button').disabled = true;
    //     }
    // });

    //checking valid input
    deleteAssignmentsInGroupForm.addEventListener('change', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // const daigCheckBtn = deleteAssignmentsInGroupForm.querySelector('#daig-btn');
        // const courseChecker = deleteAssignmentsInGroupForm.querySelector('#course-checker')
        // const courseID = deleteAssignmentsInGroupForm.querySelector('#course-id')
        // const groupChecker = deleteAssignmentsInGroupForm.querySelector('#group-checker')
        // const groupID = deleteAssignmentsInGroupForm.querySelector('#group-id')
        // const input = e.target.value;

        // console.log(e.target);

        // if (groupID.value.trim() !== '') {
        //     if (isNaN(Number(input))) {
        //         if (e.target.id === 'group-id') {
        //             groupChecker.style.display = 'inline';
        //         } else {
        //             courseChecker.style.display = 'inline';
        //         }
        //         // daigCheckBtn.disabled = true;
        //     } else {
        //         if (e.target.id === 'group-id') {
        //             groupChecker.style.display = 'none';
        //         } else {
        //             courseChecker.style.display = 'none';
        //         }
        //     }

        //     if (groupChecker.style.display === 'inline' || courseChecker.style.display === 'inline') {
        //         daigCheckBtn.disabled = true;
        //     } else {
        //         daigCheckBtn.disabled = false;
        //     }
        // } else {
        //     daigCheckBtn.disabled = true;
        // }
    })

    const daigCheckBtn = deleteAssignmentsInGroupForm.querySelector('#daig-btn');
    daigCheckBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        daigCheckBtn.disabled = true;

        const daigProgressDiv = deleteAssignmentsInGroupForm.querySelector('#daig-progress-div');
        const daigProgressBar = daigProgressDiv.querySelector('.progress-bar');
        updateProgressWithPercent(daigProgressBar, 0);
        const daigProgressInfo = deleteAssignmentsInGroupForm.querySelector('#daig-progress-info');
        const daigResponseContainer = deleteAssignmentsInGroupForm.querySelector('#daig-response-container');
        // clean environment
        daigProgressDiv.hidden = false;
        daigProgressInfo.innerHTML = "Checking...";

        // get domain, token, course, and group ID info
        const domain = document.querySelector('#domain').value.trim();
        const token = document.querySelector('#token').value.trim();
        const course_id = deleteAssignmentsInGroupForm.querySelector('#course-id').value.trim();
        const group_id = deleteAssignmentsInGroupForm.querySelector('#group-id').value.trim();

        const requestData = {
            domain,
            token,
            group_id
        }

        let hasError = false;
        let assignments = [];
        try {
            assignments = await window.axios.getAssignmentsInGroup(requestData);
            daigProgressInfo.innerHTML = '';
        } catch (error) {
            errorHandler(error, daigProgressInfo);
            hasError = true;
        } finally {
            daigCheckBtn.disabled = false;
        }

        if (!hasError) {
            console.log('found assignments', assignments.length);
            daigResponseContainer.innerHTML = `
               <div>
                    <div class="row align-items-center">
                        <div id="daig-response-details" class="col-auto">
                            <span>Found ${assignments.length} assignments, without submissions or grades.</span>
                        </div>

                        <div class="w-100"></div>

                        <div class="col-2">
                            <button id="remove-btn" type="button" class="btn btn-danger">Remove</button>
                        </div>
                        <div class="col-2">
                            <button id="cancel-btn" type="button" class="btn btn-secondary">Cancel</button>
                        </div>
                    </div>
                </div>`;

            const cancelBtn = daigResponseContainer.querySelector('#cancel-btn');
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                course_id.value = '';
                daigResponseContainer.innerHTML = '';
                daigCheckBtn.disabled = false;
                //clearData(courseID, responseContent);
            });

            const removeBtn = daigResponseContainer.querySelector('#remove-btn');
            removeBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                console.log('inside remove');

                const daigResponseDetails = daigResponseContainer.querySelector('#daig-response-details');
                daigResponseDetails.innerHTML = ``;

                daigProgressBar.parentElement.hidden = false;
                daigProgressInfo.innerHTML = `Removing ${assignments.length} assignments...`;

                const messageData = {
                    domain,
                    token,
                    course_id,
                    number: assignments.length,
                    assignments
                }

                window.progressAPI.onUpdateProgress((progress) => {
                    updateProgressWithPercent(daigProgressBar, progress);
                });

                try {
                    const deletedAssignments = await window.axios.deleteAssignments(messageData);
                    const { successful, failed } = deletedAssignments;

                    daigProgressInfo.innerHTML = '';
                    const resultCard = createResultCard(
                        'Delete Assignments in Group Results',
                        `Successfully removed ${successful.length} assignments${failed.length > 0 ? `, failed to remove ${failed.length} assignments` : ''}`,
                        failed,
                        failed.length > 0 ? 'danger' : 'success'
                    );
                    daigResponseContainer.appendChild(resultCard);
                } catch (error) {
                    errorHandler(error, daigProgressInfo, daigResponseContainer);
                } finally {
                    daigCheckBtn.disabled = false;
                }
            });
        }
    });
}
function deleteNoDueDateAssignments(e) {
    hideEndpoints(e);
    console.log('renderer > deleteNoDueDateAssignments');

    const eContent = document.querySelector('#endpoint-content');
    let form = eContent.querySelector('#delete-no-due-date-assignments-form');

    if (!form) {
        form = document.createElement('form');
        form.id = 'delete-no-due-date-assignments-form';
        form.innerHTML = `
            <div>
                <h3>Delete Assignments Without a Due Date</h3>
                <div>Finds assignments with no due date and without grades/submissions, then deletes them.</div>
            </div>
            <div class="row align-items-center">
                <div class="col-auto mt-3">
                    <label class="form-label">Course</label>
                </div>
                <div class="w-100"></div>
                <div class="col-2">
                    <input id="course-id" type="text" class="form-control" aria-describedby="input-checker" />
                </div>
                <div class="col-auto">
                    <span id="input-checker" class="form-text" style="display: none;">Must only contain numbers</span>
                </div>
                <div class="w-100"></div>
                <div class="col-auto">
                    <button id="action-btn" class="btn btn-primary mt-3">Check</button>
                </div>
            </div>
            <div hidden id="ndd-progress-div">
                <p id="ndd-progress-info"></p>
                <div class="progress mt-3" style="width: 75%" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
            </div>
            <div id="ndd-response-container" class="mt-5"></div>
        `;
        eContent.append(form);
    }
    form.hidden = false;

    function renderResults(finalAssignments) {
        // wipe and render results card with count and delete capability
        const responseDiv = form.querySelector('#combined-response-container');
        responseDiv.innerHTML = '';
        const details = document.createElement('div');
        details.id = 'combined-response-details';
        details.className = 'card';
        details.innerHTML = `
            <div class="card-header d-flex justify-content-between align-items-center">
                <span>Results</span>
                <span class="text-muted small">Total: ${finalAssignments.length}</span>
            </div>
            <div class="card-body">
                <div>Found ${finalAssignments.length} assignments matching the selected filters.</div>
            </div>
            <div class="card-footer d-flex justify-content-end gap-2">
                <button type="button" class="btn btn-secondary" id="combined-clear-btn">Clear</button>
                <button type="button" class="btn btn-danger" id="combined-remove-btn" ${finalAssignments.length < 1 ? 'disabled' : ''}>Delete</button>
            </div>`;
        responseDiv.appendChild(details);

        const clearBtn = details.querySelector('#combined-clear-btn');
        const removeBtn = details.querySelector('#combined-remove-btn');
        clearBtn.addEventListener('click', (e2) => {
            e2.preventDefault();
            e2.stopPropagation();
            form.querySelector('#course-id').value = '';
            responseDiv.innerHTML = '';
            progressDiv.hidden = true;
        });
        removeBtn.addEventListener('click', async (e2) => {
            e2.preventDefault();
            e2.stopPropagation();
            details.innerHTML = '';
            progressBar.parentElement.hidden = false;
            progressInfo.innerHTML = `Removing ${finalAssignments.length} assignments...`;
            const domain = document.querySelector('#domain').value.trim();
            const token = document.querySelector('#token').value.trim();
            const cid = form.querySelector('#course-id').value.trim();
            const payload = {
                domain,
                token,
                course_id: cid,
                number: finalAssignments.length,
                assignments: finalAssignments.map(a => ({ id: a.id, name: a.name }))
            };
            window.progressAPI.onUpdateProgress((p) => updateProgressWithPercent(progressBar, p));
            try {
                const result = await window.axios.deleteAssignments(payload);
                const { successful, failed } = result;

                progressInfo.innerHTML = '';
                const resultCard = createResultCard(
                    'Combined Delete Results',
                    `Successfully removed ${successful.length} assignments${failed.length > 0 ? `, failed to remove ${failed.length} assignments` : ''}`,
                    failed,
                    failed.length > 0 ? 'danger' : 'success'
                );
                responseDiv.appendChild(resultCard);
            } catch (err) {
                errorHandler(err, progressInfo, responseDiv);
            }
        });
    }

    const courseID = form.querySelector('#course-id');
    courseID.addEventListener('change', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        checkCourseID(courseID, eContent);
    });

    const checkBtn = form.querySelector('#action-btn');
    checkBtn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();

        checkBtn.disabled = true;

        const domain = document.querySelector('#domain').value.trim();
        const token = document.querySelector('#token').value.trim();
        const nddResponseContainer = form.querySelector('#ndd-response-container');
        const nddProgressDiv = form.querySelector('#ndd-progress-div');
        const nddProgressBar = nddProgressDiv.querySelector('.progress-bar');
        const nddProgressInfo = form.querySelector('#ndd-progress-info');

        // clean environment
        nddResponseContainer.innerHTML = '';
        nddProgressDiv.hidden = false;
        nddProgressBar.parentElement.hidden = true;
        updateProgressWithPercent(nddProgressBar, 0);
        enhanceProgressBarWithPercent(nddProgressBar);
        nddProgressInfo.innerHTML = 'Checking...';

        const requestData = {
            domain,
            token,
            course_id: courseID.value.trim()
        };

        let assignments = [];
        let hasError = false;
        try {
            assignments = await window.axios.getNoDueDateAssignments(requestData);
            nddProgressInfo.innerHTML = '';
        } catch (error) {
            errorHandler(error, nddProgressInfo);
            hasError = true;
        } finally {
            checkBtn.disabled = false;
        }

        if (!hasError) {
            nddResponseContainer.innerHTML = `
                <div id="ndd-response-details">
                    <div class="row align-items-center">
                        <div class="col-auto">
                            <span>Found ${assignments.length} assignments without a due date.</span>
                        </div>
                        <div class="w-100"></div>
                        <div class="col-2">
                            <button id="remove-btn" type="button" class="btn btn-danger">Remove</button>
                        </div>
                        <div class="col-2">
                            <button id="cancel-btn" type="button" class="btn btn-secondary">Cancel</button>
                        </div>
                    </div>
                </div>`;

            const details = nddResponseContainer.querySelector('#ndd-response-details');
            const removeBtn = details.querySelector('#remove-btn');
            const cancelBtn = details.querySelector('#cancel-btn');

            cancelBtn.addEventListener('click', (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                courseID.value = '';
                nddResponseContainer.innerHTML = '';
                checkBtn.disabled = false;
            });

            removeBtn.addEventListener('click', async (ev) => {
                ev.preventDefault();
                ev.stopPropagation();

                details.innerHTML = '';
                nddProgressBar.parentElement.hidden = false;
                nddProgressInfo.innerHTML = `Removing ${assignments.length} assignments...`;

                const assignmentIDs = assignments.map((a) => ({ id: a._id || a.id || a.node?._id }));
                const messageData = {
                    domain,
                    token,
                    course_id: courseID.value.trim(),
                    number: assignmentIDs.length,
                    assignments: assignmentIDs
                };

                window.progressAPI.onUpdateProgress((progress) => {
                    updateProgressWithPercent(nddProgressBar, progress);
                });

                try {
                    const response = await window.axios.deleteAssignments(messageData);
                    const { successful, failed } = response;

                    nddProgressInfo.innerHTML = '';
                    const resultCard = createResultCard(
                        'Delete No Due Date Assignments Results',
                        `Successfully removed ${successful.length} assignments${failed.length > 0 ? `, failed to remove ${failed.length} assignments` : ''}`,
                        failed,
                        failed.length > 0 ? 'danger' : 'success'
                    );
                    nddResponseContainer.appendChild(resultCard);
                } catch (error) {
                    errorHandler(error, nddProgressInfo, nddResponseContainer);
                } finally {
                    checkBtn.disabled = false;
                }
            });

            if (assignments.length < 1) {
                removeBtn.disabled = true;
            }
        }
    });
}

// Create Assignments UI and handler
function assignmentCreator(e) {
    hideEndpoints(e);
    console.log('renderer > assignmentCreator');

    const eContent = document.querySelector('#endpoint-content');
    let form = eContent.querySelector('#create-assignments-form');

    if (!form) {
        form = document.createElement('form');
        form.id = 'create-assignments-form';
        form.innerHTML = `
            <style>
                #create-assignments-form .card-title { font-size: 1.1rem; }
                #create-assignments-form .card-header small { font-size: 0.75rem; }
                #create-assignments-form .form-label { font-size: 0.85rem; font-weight: 600; }
                #create-assignments-form .form-control,
                #create-assignments-form .form-select { font-size: 0.85rem; padding: 0.25rem 0.5rem; }
                #create-assignments-form input[type="number"] { font-size: 0.85rem; padding: 0.25rem 0.5rem; }
                #create-assignments-form .form-text { font-size: 0.7rem; }
                #create-assignments-form .form-check-label { font-size: 0.85rem; }
                #create-assignments-form .btn { font-size: 0.85rem; padding: 0.35rem 0.75rem; }
                #create-assignments-form .bi { font-size: 0.9rem; }
                #create-assignments-form .alert { font-size: 0.85rem; padding: 0.5rem 0.75rem; }
                #create-assignments-form .card-body { padding: 0.75rem; }
                #create-assignments-form .progress { height: 12px; }
                #create-assignments-form .gap-2 { gap: 0.5rem !important; }
                #create-assignments-form .gap-3 { gap: 0.5rem !important; }
                #create-assignments-form .g-3 { gap: 0.5rem !important; }
                #create-assignments-form .mt-2 { margin-top: 0.5rem !important; }
                #create-assignments-form .mt-3 { margin-top: 0.5rem !important; }
                #create-assignments-form .mb-2 { margin-bottom: 0.5rem !important; }
            </style>
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-file-earmark-plus me-1"></i>Create Assignments
                    </h3>
                    <small class="text-muted">Create multiple assignments with customizable settings</small>
                </div>
                <div class="card-body">
            <div class="row g-3 align-items-start">
                <div class="col-12 col-sm-3">
                    <label class="form-label" for="course-id">Course ID</label>
                    <input id="course-id" type="text" class="form-control form-control-sm" aria-describedby="course-help" inputmode="numeric" />
                    <div id="course-help" class="form-text">Numbers only</div>
                    <div class="invalid-feedback">Please enter a valid numeric Course ID.</div>
                </div>

                <div class="col-6 col-sm-2">
                    <label class="form-label" for="assignment-number">How many</label>
                    <input id="assignment-number" type="number" class="form-control form-control-sm" min="1" value="1" />
                </div>

                <div class="col-12 col-sm-4">
                    <label class="form-label" for="assignment-name">Name</label>
                    <input id="assignment-name" type="text" class="form-control form-control-sm" placeholder="Assignment" value="Assignment" />
                </div>

                <div class="col-12 col-sm-3">
                    <label class="form-label" for="assignment-group-id">Assignment Group ID <span class="text-muted">(optional)</span></label>
                    <input id="assignment-group-id" type="text" class="form-control form-control-sm" placeholder="e.g. 12345" />
                    <div id="assignment-group-help" class="form-text">Leave blank to use the default group</div>
                    <div class="invalid-feedback">Assignment Group ID must be numeric.</div>
                </div>

                <div class="w-100"></div>

                <div class="col-6 col-sm-2">
                    <label class="form-label" for="points">Points</label>
                    <input id="points" type="number" class="form-control form-control-sm" min="0" value="10" />
                </div>

                <div class="col-6 col-sm-3">
                    <label class="form-label" for="grade-type">Grading type</label>
                    <select id="grade-type" class="form-select form-select-sm">
                        <option value="points" selected>Points</option>
                        <option value="percent">Percent</option>
                        <option value="pass_fail">Pass/Fail</option>
                        <option value="letter_grade">Letter grade</option>
                        <option value="gpa_scale">GPA scale</option>
                    </select>
                </div>

                <div class="col-12 col-sm-7">
                    <label class="form-label">Submission types</label>
                    <div class="d-flex flex-wrap gap-3">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="st-upload" data-st="online_upload" checked />
                            <label class="form-check-label" for="st-upload">File upload</label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="st-text" data-st="online_text_entry" />
                            <label class="form-check-label" for="st-text">Text entry</label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="st-url" data-st="online_url" />
                            <label class="form-check-label" for="st-url">Website URL</label>
                        </div>
                    </div>
                </div>

                <div class="w-100"></div>

                <div class="col-auto form-check form-switch ms-1">
                    <input id="publish" class="form-check-input" type="checkbox" />
                    <label class="form-check-label" for="publish">Publish</label>
                </div>
                <div class="col-auto form-check form-switch">
                    <input id="peer-reviews" class="form-check-input" type="checkbox" />
                    <label class="form-check-label" for="peer-reviews">Peer reviews</label>
                </div>
                <div class="col-auto form-check form-switch">
                    <input id="anonymous" class="form-check-input" type="checkbox" />
                    <label class="form-check-label" for="anonymous">Anonymous grading</label>
                </div>

                <div class="w-100"></div>
                
                <!-- Peer Review Count (shown when peer reviews enabled) -->
                <div class="col-12 col-sm-3" id="peer-review-count-container" style="display: none;">
                    <label class="form-label" for="peer-review-count">
                        <i class="bi bi-people me-1"></i>Peer Reviews per Student
                    </label>
                    <input id="peer-review-count" type="number" class="form-control form-control-sm" min="1" max="10" value="1" />
                    <div class="form-text">Number of reviews each student must complete</div>
                </div>

                <div class="w-100"></div>
                <div class="col-4">
                    <div class="d-grid">
                        <button id="action-btn" class="btn btn-sm btn-success mt-2" type="button">
                            <i class="bi bi-plus-circle me-1"></i>Create Assignments
                        </button>
                    </div>
                </div>
            </div>
                </div>
            </div>
            
            <!-- Progress Card -->
            <div class="card mt-2" id="cac-progress-div" hidden>
                <div class="card-header">
                    <h5 class="card-title mb-0">
                        <i class="bi bi-gear me-1"></i>Creating Assignments
                    </h5>
                </div>
                <div class="card-body">
                    <p id="cac-progress-info" class="mb-2"></p>
                    <div class="progress mb-2" style="height: 12px;">
                        <div class="progress-bar progress-bar-striped progress-bar-animated" 
                             style="width: 0%" role="progressbar" 
                             aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Results Card -->
            <div class="card mt-2" id="cac-response-container-card" hidden>
                <div class="card-body" id="cac-response-container"></div>
            </div>
        `;
        eContent.append(form);

        // Enhance progress bar with percent overlay
        const progressBar = form.querySelector('.progress-bar');
        if (progressBar && typeof enhanceProgressBarWithPercent === 'function') {
            enhanceProgressBarWithPercent(progressBar);
        }

        // Validation for course id and global domain/token - ONLY ATTACH ONCE
        const cID = form.querySelector('#course-id');
        const groupIdInput = form.querySelector('#assignment-group-id');
        const validateForm = () => {
            const courseVal = cID.value.trim();
            const courseValid = /^\d+$/.test(courseVal);
            const domain = document.querySelector('#domain').value.trim();
            const token = document.querySelector('#token').value.trim();
            const groupVal = groupIdInput?.value.trim() || '';
            const groupValid = groupVal === '' || /^\d+$/.test(groupVal);

            cID.classList.toggle('is-invalid', !courseValid && courseVal.length > 0);
            if (groupIdInput) {
                groupIdInput.classList.toggle('is-invalid', !groupValid && groupVal.length > 0);
            }

            // Enable button only if all required fields are present
            const allValid = courseValid && domain.length > 0 && token.length > 0 && groupValid;
            form.querySelector('#action-btn').disabled = !allValid;
        };

        cID.addEventListener('input', validateForm);
        groupIdInput?.addEventListener('input', validateForm);

        // Also listen to domain and token changes
        const domainInput = document.querySelector('#domain');
        const tokenInput = document.querySelector('#token');
        domainInput.addEventListener('input', validateForm);
        tokenInput.addEventListener('input', validateForm);

        // Initial validation
        validateForm();

        // Visual indicator for assignment number field when > 1 - ONLY ATTACH ONCE
        const assignmentNumberField = form.querySelector('#assignment-number');
        const updateAssignmentNumberVisual = () => {
            const value = parseInt(assignmentNumberField.value || '1', 10);
            if (value > 1) {
                assignmentNumberField.classList.add('border-warning');
                assignmentNumberField.style.backgroundColor = '#fff3cd';
            } else {
                assignmentNumberField.classList.remove('border-warning');
                assignmentNumberField.style.backgroundColor = '';
            }
        };

        assignmentNumberField.addEventListener('input', updateAssignmentNumberVisual);
        assignmentNumberField.addEventListener('change', updateAssignmentNumberVisual);
        // Initial check
        updateAssignmentNumberVisual();

        // Toggle peer review count field visibility - ONLY ATTACH ONCE
        const peerReviewCheckbox = form.querySelector('#peer-reviews');
        const peerReviewCountContainer = form.querySelector('#peer-review-count-container');
        const togglePeerReviewCount = () => {
            if (peerReviewCheckbox.checked) {
                peerReviewCountContainer.style.display = 'block';
            } else {
                peerReviewCountContainer.style.display = 'none';
            }
        };
        peerReviewCheckbox.addEventListener('change', togglePeerReviewCount);
        // Initial check
        togglePeerReviewCount();

        // Add cancel button to progress card
        const progressDiv = form.querySelector('#cac-progress-div');
        const progressCardBody = progressDiv.querySelector('.card-body');
        let cancelCreateBtn = progressDiv.querySelector('#cancel-create-btn');
        if (!cancelCreateBtn) {
            cancelCreateBtn = document.createElement('button');
            cancelCreateBtn.id = 'cancel-create-btn';
            cancelCreateBtn.className = 'btn btn-sm btn-warning mt-2';
            cancelCreateBtn.innerHTML = '<i class="bi bi-x-circle me-1"></i>Cancel Creation';
            cancelCreateBtn.hidden = true;
            progressCardBody.appendChild(cancelCreateBtn);
        }

        // Track current operation
        let currentOperationId = null;
        let isCreating = false;
        let isCancelling = false;

        // Create Assignment button handler - ONLY ATTACH ONCE
        const createBtn = form.querySelector('#action-btn');
        createBtn.addEventListener('click', async (ev) => {
            ev.preventDefault();
            ev.stopPropagation();

            // Prevent concurrent operations
            if (isCreating) {
                console.log('Already creating assignments, ignoring duplicate click');
                return;
            }

            const domain = document.querySelector('#domain').value.trim();
            const token = document.querySelector('#token').value.trim();
            const course_id = cID.value.trim();
            const number = Math.max(1, parseInt(form.querySelector('#assignment-number').value || '1', 10));
            const name = (form.querySelector('#assignment-name').value || 'Assignment').trim();
            const points = Math.max(0, parseFloat(form.querySelector('#points').value || '0'));
            const grade_type = form.querySelector('#grade-type').value;
            const publish = form.querySelector('#publish').checked ? 'published' : 'unpublished';
            const peer_reviews = form.querySelector('#peer-reviews').checked;
            const peer_review_count = peer_reviews ? Math.max(1, parseInt(form.querySelector('#peer-review-count').value || '1', 10)) : 0;
            const anonymous = form.querySelector('#anonymous').checked;
            const assignment_group_id = (form.querySelector('#assignment-group-id')?.value || '').trim();

            const submissionTypes = Array.from(form.querySelectorAll('[data-st]'))
                .filter(cb => cb.checked)
                .map(cb => cb.getAttribute('data-st'));
            if (submissionTypes.length < 1) submissionTypes.push('online_upload');

            const progressBar = progressDiv.querySelector('.progress-bar');
            const progressInfo = form.querySelector('#cac-progress-info');
            const responseDiv = form.querySelector('#cac-response-container');

            // Generate unique operation ID for this creation if more than 35 assignments
            if (number > 35) {
                currentOperationId = `create-assignments-${Date.now()}`;
            } else {
                currentOperationId = null;
            }

            // Set flags
            isCreating = true;
            isCancelling = false;

            // Reset UI
            responseDiv.innerHTML = '';
            const responseCard = form.querySelector('#cac-response-container-card');
            if (responseCard) {
                responseCard.hidden = true;
            }
            progressDiv.hidden = false;
            progressBar.parentElement.hidden = false;
            updateProgressWithPercent(progressBar, 0);
            progressInfo.textContent = 'Creating assignments...';
            createBtn.disabled = true;

            // Show cancel button only if creating more than 35 assignments
            if (number > 35) {
                cancelCreateBtn.hidden = false;
                cancelCreateBtn.disabled = false;
            } else {
                cancelCreateBtn.hidden = true;
            }

            // Subscribe to progress updates for this operation
            const unsub = window.progressAPI?.onUpdateProgress?.((payload) => {
                try {
                    // Don't update progress if we're cancelling
                    if (isCancelling) {
                        return;
                    }

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
                } catch { }
            });

            const data = {
                domain,
                token,
                course_id,
                number,
                name,
                points,
                grade_type,
                publish,
                peer_reviews,
                peer_review_count,
                anonymous,
                submissionTypes,
                assignment_group_id: assignment_group_id || undefined,
                operationId: currentOperationId
            };

            try {
                const result = await window.axios.createAssignments(data);
                const ok = result?.successful?.length || 0;
                const bad = result?.failed?.length || 0;
                const wasCancelled = result?.cancelled || false;

                // Hide the progress bar and clear progress text
                progressBar.parentElement.hidden = true;
                progressDiv.hidden = true;
                cancelCreateBtn.hidden = true;
                progressInfo.textContent = '';

                let responseHTML = '';

                if (wasCancelled) {
                    responseHTML = `
                        <div class="alert alert-warning" role="alert">
                            <i class="bi bi-exclamation-circle me-2"></i>
                            <strong>Cancelled:</strong> Created ${ok} assignment${ok !== 1 ? 's' : ''} before cancellation. ${bad} were not processed.
                        </div>
                    `;
                } else {
                    responseHTML = `
                        <div class="alert ${bad > 0 ? 'alert-warning' : 'alert-success'}" role="alert">
                            <i class="bi bi-${bad > 0 ? 'exclamation-triangle' : 'check-circle'} me-2"></i>
                            <strong>Assignment Creation ${bad > 0 ? 'Completed with Issues' : 'Successful'}!</strong><br>
                            Successfully created ${ok} assignment(s)${bad ? `. Failed to create ${bad} assignment(s)` : ''}${ok > 0 ? `. <a href="#" id="view-assignments-link" class="alert-link"><i class="bi bi-external-link me-1"></i>View assignments in course</a>` : ''}.
                        </div>
                    `;
                }

                // Display detailed error information using the helper function
                if (bad > 0 && result.failed) {
                    responseHTML += createErrorCard(result.failed, 'Assignment');
                }

                responseDiv.innerHTML = responseHTML;

                // Show the response container card
                const responseCard = form.querySelector('#cac-response-container-card');
                if (responseCard) {
                    responseCard.hidden = false;
                }

                // Add click handler for the view assignments link
                if (ok > 0) {
                    const viewLink = responseDiv.querySelector('#view-assignments-link');
                    if (viewLink) {
                        viewLink.addEventListener('click', (e) => {
                            e.preventDefault();
                            const courseUrl = `https://${domain}/courses/${course_id}/assignments`;
                            window.shell.openExternal(courseUrl);
                        });
                    }
                }

                // Reset the assignment number field to 1 to prevent accidental multiple creations
                form.querySelector('#assignment-number').value = '1';
                updateAssignmentNumberVisual(); // Update visual state after reset
            } catch (error) {
                // Hide the striped bar and show error
                progressBar.parentElement.hidden = true;
                progressDiv.hidden = true;
                cancelCreateBtn.hidden = true;
                errorHandler(error, progressInfo);
            } finally {
                if (typeof unsub === 'function') try { unsub(); } catch { }
                createBtn.disabled = false;
                isCreating = false;
                currentOperationId = null;
            }
        });

        // Handle cancel creation button
        cancelCreateBtn.addEventListener('click', async () => {
            console.log('Cancel button clicked. Operation ID:', currentOperationId, 'Button disabled:', cancelCreateBtn.disabled);

            if (!currentOperationId || cancelCreateBtn.disabled) {
                console.log('Cancel aborted - missing operation ID or button already disabled');
                return;
            }

            // Get the progress info element
            const progressInfo = form.querySelector('#cac-progress-info');

            // Set cancelling flag to stop progress updates
            isCancelling = true;

            // Disable button and update UI immediately
            cancelCreateBtn.disabled = true;
            cancelCreateBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Cancelling...';
            if (progressInfo) {
                progressInfo.textContent = 'Cancelling...';
            }

            console.log('Requesting cancellation for operation:', currentOperationId);

            try {
                await window.axios.cancelOperation(currentOperationId);
                console.log('Cancellation request sent successfully');
            } catch (err) {
                console.error('Error cancelling operation:', err);
                // Only re-enable if the operation is still running
                if (isCreating && !isCancelling) {
                    cancelCreateBtn.innerHTML = '<i class="bi bi-x-circle me-2"></i>Cancel Creation';
                    cancelCreateBtn.disabled = false;
                    isCancelling = false;
                    if (progressInfo) {
                        progressInfo.textContent = 'Creating assignments...';
                    }
                }
            }
        });
    }

    form.hidden = false;
}