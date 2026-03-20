function moduleTemplate(e) {
    switch (e.target.id) {
        case 'delete-modules':
            deleteModules(e);
            break;
        case 'create-modules':
            createModules(e);
            break;
        case 'relock-modules':
            reLockModules(e);
            break;
        default:
            break;
    }
}

async function deleteModules(e) {
    hideEndpoints(e)

    const eContent = document.querySelector('#endpoint-content');
    let createModuleDeleteForm = eContent.querySelector('#create-module-delete-form');

    if (!createModuleDeleteForm) {
        createModuleDeleteForm = document.createElement('form');
        createModuleDeleteForm.id = 'create-module-delete-form';
        createModuleDeleteForm.innerHTML = `
            <style>
                #create-module-delete-form .card-title { font-size: 1.1rem; }
                #create-module-delete-form .card-header small { font-size: 0.7rem; }
                #create-module-delete-form .form-label,
                #create-module-delete-form .form-check-label { font-size: 0.85rem; }
                #create-module-delete-form .form-text { font-size: 0.7rem; }
                #create-module-delete-form .card-body { padding: 0.75rem; }
                #create-module-delete-form .btn { padding: 0.35rem 0.75rem; font-size: 0.85rem; }
                #create-module-delete-form .form-control { font-size: 0.85rem; padding: 0.25rem 0.5rem; }
                #create-module-delete-form .bi { font-size: 0.9rem; }
                #create-module-delete-form .mt-3 { margin-top: 0.5rem !important; }
                #create-module-delete-form .mt-2 { margin-top: 0.5rem !important; }
                #create-module-delete-form .progress { height: 12px; }
            </style>
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-trash me-1"></i>Delete Modules
                    </h3>
                    <small class="text-muted">Remove modules from a course</small>
                </div>
                <div class="card-body">
            <div class="row">
                <div class="row align-items-center">
                        <div class="col-2">
                            <label class="form-label">Course</label>
                            <input id="course-id" type="text" class="form-control form-control-sm" aria-describedby="input-checker" />
                        </div>
                </div>
                <div class="col-auto" >
                    <span id="input-checker" class="form-text" style="display: none;">Must only contain numbers</span>
                </div>
                <hr class="mt-2">
                <div class="row">
                    <div class="mt-2">
                        <div class="col-auto form-check form-switch" >
                            <input id="empty-modules" class="form-check-input" type="checkbox" role="switch" checked>
                            <label for="empty-modules" class="form-check-label">Delete Only empty modules</label>
                            <div id="delete-module-help" class="form-text">
                                (otherwise this will delete <em>all</em> modules)
                            </div>
                        </div>
                    </div>          
                </div>
                <div class="w-100"></div>
                <div class="col-auto">
                    <button id="check-modules-btn" class="btn btn-sm btn-primary mt-2" disabled>Check</button>
                </div>
            </div>
            <div hidden id="progress-div">
                <p id="progress-info"></p>
                <div class="progress mt-2" style="width: 75%" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                    
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
            </div>
            <div id="response-container" class="mt-2">
            </div>
                </div>
            </div>
        `;

        eContent.append(createModuleDeleteForm);
    }
    createModuleDeleteForm.hidden = false;

    if (createModuleDeleteForm.dataset.bound === 'true') return;
    createModuleDeleteForm.dataset.bound = 'true';

    const courseID = createModuleDeleteForm.querySelector('#course-id');
    const checkModulesBtn = createModuleDeleteForm.querySelector('#check-modules-btn');

    // Enable button when valid course ID is entered
    courseID.addEventListener('input', (e) => {
        const trimmedValue = courseID.value.trim();
        const isValid = !isNaN(Number(trimmedValue)) && Number(trimmedValue) > 0 && Number.isInteger(Number(trimmedValue));
        checkModulesBtn.disabled = !isValid;
    });

    courseID.addEventListener('change', (e) => {
        e.preventDefault();
        e.stopPropagation();

        checkCourseID(courseID, createModuleDeleteForm);
    });

    checkModulesBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();


        const responseContainer = createModuleDeleteForm.querySelector('#response-container');
        const domain = document.querySelector('#domain').value.trim();
        const token = document.querySelector('#token').value.trim();
        const course_id = courseID.value.trim();
        const emptyModules = createModuleDeleteForm.querySelector('#empty-modules').checked;

        const progressDiv = createModuleDeleteForm.querySelector('#progress-div');
        const progressBar = progressDiv.querySelector('.progress-bar');
        const progressInfo = createModuleDeleteForm.querySelector('#progress-info');

        // clean environment
        responseContainer.innerHTML = '';
        progressDiv.hidden = false;
        progressBar.parentElement.hidden = true;
        updateProgressWithPercent(progressBar, 0);
        enhanceProgressBarWithPercent(progressBar);
        progressInfo.innerHTML = 'Checking...';

        const requestData = {
            domain,
            token,
            course_id,
            emptyModules
        };

        // first get all modules
        let courseModules = [];
        let hasError = false;

        try {
            courseModules = await window.axios.getModules(requestData);
            progressInfo.innerHTML = 'Done';
        } catch (error) {
            errorHandler(error, progressInfo)
            hasError = true;
        } finally {
            // checkModulesBtn.disabled = true;
        }

        if (!hasError) {
            responseContainer.innerHTML = `
                        <div>
                            <div class="row align-items-center">
                                <div id="response-details" class="col-auto">
                                    <span>Found ${courseModules.length} to delete</span>
                                </div>

                                <div class="w-100"></div>

                                <div class="col-2">
                                    <button id="remove-btn" type="button" class="btn btn-sm btn-danger" disabled>Remove</button>
                                </div>
                                <div class="col-2">
                                    <button id="cancel-btn" type="button" class="btn btn-sm btn-secondary" disabled>Cancel</button>
                                </div>
                            </div>
                        </div>    
                    `;

            const cancelBtn = responseContainer.querySelector('#cancel-btn');
            const removeBtn = responseContainer.querySelector('#remove-btn');

            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                courseID.value = '';
                responseContainer.innerHTML = '';
                progressInfo.innerHTML = '';
                checkModulesBtn.disabled = true;
                //clearData(courseID, responseContent);
            });

            if (courseModules.length > 0) {
                removeBtn.disabled = false;
                cancelBtn.disabled = false;
            }

            removeBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Disable buttons to prevent multiple clicks
                removeBtn.disabled = true;
                cancelBtn.disabled = true;
                checkModulesBtn.disabled = true;

                // Clear the response area and show progress
                const responseDetails = responseContainer.querySelector('#response-details');
                if (responseDetails) {
                    responseDetails.innerHTML = ``;
                }
                progressBar.parentElement.hidden = false;
                progressInfo.innerHTML = `Removing ${courseModules.length} modules...`;

                const courseModuleIds = courseModules.map((module) => {
                    return {
                        name: module.node.name,
                        id: module.node._id
                    };
                });

                const requestData = {
                    domain,
                    token,
                    course_id,
                    number: courseModuleIds.length,
                    module_ids: courseModuleIds
                };

                window.progressAPI.onUpdateProgress((progress) => {
                    updateProgressWithPercent(progressBar, progress);
                });

                try {
                    const deleteModuleIds = await window.axios.deleteModules(requestData);

                    if (deleteModuleIds.successful.length > 0) {
                        progressInfo.innerHTML = `Successfully removed ${deleteModuleIds.successful.length} modules.`;
                    }
                    if (deleteModuleIds.failed.length > 0) {
                        progressInfo.innerHTML = `Failed to remove ${deleteModuleIds.failed.length} modules.`;
                    }
                } catch (error) {
                    errorHandler(error, progressInfo)
                } finally {
                    checkModulesBtn.disabled = false;
                    removeBtn.hidden = true;
                    removeBtn.disabled = true;
                    cancelBtn.hidden = true;
                    cancelBtn.disabled = true;
                }
            }, { once: true });
        }
    })
}

async function createModules(e) {
    hideEndpoints(e)

    const eContent = document.querySelector('#endpoint-content');
    let createModuleForm = eContent.querySelector('#create-module-form');

    if (!createModuleForm) {
        createModuleForm = document.createElement('form');
        createModuleForm.id = 'create-module-form';
        createModuleForm.innerHTML = `
            <style>
                #create-module-form .card-title { font-size: 1.1rem; }
                #create-module-form .card-header small { font-size: 0.7rem; }
                #create-module-form .form-label { font-size: 0.85rem; }
                #create-module-form .form-text { font-size: 0.7rem; }
                #create-module-form .card-body { padding: 0.75rem; }
                #create-module-form .btn { padding: 0.35rem 0.75rem; font-size: 0.85rem; }
                #create-module-form .form-control, #create-module-form .form-select { font-size: 0.85rem; padding: 0.25rem 0.5rem; }
                #create-module-form .bi { font-size: 0.9rem; }
                #create-module-form .mt-3, #create-module-form .mt-2 { margin-top: 0.5rem !important; }
                #create-module-form .progress { height: 12px; }
                #create-module-form h5 { font-size: 1rem; }
                #create-module-form .module-items-table th,
                #create-module-form .module-items-table td { font-size: 0.82rem; padding: 0.3rem 0.5rem; vertical-align: middle; }
                #create-module-form .module-items-table .form-control,
                #create-module-form .module-items-table .form-select { font-size: 0.8rem; padding: 0.2rem 0.4rem; }
                #create-module-form .module-items-table .btn { padding: 0.2rem 0.5rem; font-size: 0.78rem; }
                #create-module-form .summary-card { border-left: 4px solid #198754; }
                #create-module-form .summary-card .summary-icon { font-size: 1.5rem; color: #198754; }
                #create-module-form .summary-card .summary-stat { font-size: 1.3rem; font-weight: 600; }
                #create-module-form .summary-card .summary-label { font-size: 0.75rem; color: #6c757d; }
                #create-module-form .summary-card.has-errors { border-left-color: #dc3545; }
                #create-module-form .summary-card.has-errors .summary-icon { color: #dc3545; }
            </style>
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-plus-circle me-1"></i>Create Modules
                    </h3>
                    <small class="text-muted">Add new modules to a course, optionally with content items</small>
                </div>
                <div class="card-body">
            <div class="row">
                <div class="row align-items-center">
                        <div class="col-2">
                            <label class="form-label">Course</label>
                            <input id="course-id" type="number" class="form-control form-control-sm" aria-describedby="input-checker" />
                        </div>
                </div>
                <div class="col-auto" >
                    <span id="input-checker" class="form-text" style="display: none;">Must only contain numbers</span>
                </div>
                <div class="row align-items-center">
                    <div class="col-2 mt-2">
                        <label class="form-label">How many modules</label>
                        <input id="module-number" type="number" class="form-control form-control-sm" value="1" min="1" max="1000" />
                    </div>
                    <div class="col-4 mt-2">
                        <label class="form-label">Module name prefix (optional)</label>
                        <input id="module-name-prefix" type="text" class="form-control form-control-sm" placeholder="e.g., Unit">
                    </div>
                </div>
                <hr class="mt-2">

                <!-- Module Items Section -->
                <div id="module-items-section" class="mt-2">
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center py-1">
                            <h5 class="mb-0"><i class="bi bi-list-ul me-1"></i>Module Items (optional)</h5>
                            <div class="d-flex gap-2">
                                <button type="button" class="btn btn-outline-primary btn-sm" id="add-module-item-btn">
                                    <i class="bi bi-plus-lg me-1"></i>Add Item
                                </button>
                                <button type="button" class="btn btn-outline-secondary btn-sm" id="clear-module-items-btn">Clear All</button>
                            </div>
                        </div>
                        <div class="card-body p-0">
                            <div class="table-responsive">
                                <table class="table table-sm table-hover mb-0 module-items-table">
                                    <thead class="table-light">
                                        <tr>
                                            <th style="width: 22%">Type</th>
                                            <th style="width: 30%">Title</th>
                                            <th style="width: 30%">Options</th>
                                            <th style="width: 10%">New Tab</th>
                                            <th style="width: 8%"></th>
                                        </tr>
                                    </thead>
                                    <tbody id="module-items-tbody">
                                        <tr id="no-items-row">
                                            <td colspan="5" class="text-center text-muted py-2">
                                                <i class="bi bi-info-circle me-1"></i>No items added. Click "Add Item" to add content to each module.
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="w-100"></div>
                <div class="col-auto">
                    <button id="create-modules-btn" class="btn btn-sm btn-primary mt-2" disabled>Create</button>
                </div>
            </div>
            <div hidden id="create-progress-div">
                <p id="create-progress-info"></p>
                <div class="progress mt-2" style="width: 75%" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">

                    <div class="progress-bar" style="width: 0%"></div>
                </div>
            </div>
            <div id="create-response-container" class="mt-2">
            </div>
                </div>
            </div>
        `;

        eContent.append(createModuleForm);
    }
    createModuleForm.hidden = false;

    if (createModuleForm.dataset.bound === 'true') return;
    createModuleForm.dataset.bound = 'true';

    // ===== Module Items Table Logic =====
    const moduleItemsTbody = createModuleForm.querySelector('#module-items-tbody');
    const addModuleItemBtn = createModuleForm.querySelector('#add-module-item-btn');
    const clearModuleItemsBtn = createModuleForm.querySelector('#clear-module-items-btn');

    const MODULE_ITEM_TYPES = [
        { value: 'Assignment', label: 'Assignment' },
        { value: 'Discussion', label: 'Discussion' },
        { value: 'Page', label: 'Page' },
        { value: 'Quiz', label: 'Quiz' },
        { value: 'SubHeader', label: 'SubHeader' },
        { value: 'ExternalUrl', label: 'External URL' },
        { value: 'ExternalTool', label: 'External Tool' }
    ];

    let moduleItemCounter = 0;

    /**
     * Build the inner HTML for the "Value" column based on item type.
     */
    function buildValueCell(type, rowId, defaults = {}) {
        if (type === 'ExternalUrl' || type === 'ExternalTool') {
            return `<input type="text" class="form-control form-control-sm mi-url-input" placeholder="https://example.com" value="${defaults.external_url || ''}">`;
        }
        if (type === 'Quiz') {
            const classicChecked = (!defaults.quiz_engine || defaults.quiz_engine === 'classic') ? 'checked' : '';
            const newChecked = defaults.quiz_engine === 'new' ? 'checked' : '';
            return `
                <div class="d-flex align-items-center gap-2">
                    <div class="form-check form-check-inline mb-0">
                        <input class="form-check-input mi-quiz-engine" type="radio" name="quiz-engine-${rowId}" id="qe-classic-${rowId}" value="classic" ${classicChecked}>
                        <label class="form-check-label" for="qe-classic-${rowId}" style="font-size:0.78rem;">Classic</label>
                    </div>
                    <div class="form-check form-check-inline mb-0">
                        <input class="form-check-input mi-quiz-engine" type="radio" name="quiz-engine-${rowId}" id="qe-new-${rowId}" value="new" ${newChecked}>
                        <label class="form-check-label" for="qe-new-${rowId}" style="font-size:0.78rem;">New Quiz</label>
                    </div>
                </div>`;
        }
        // For Assignment, Discussion, Page, SubHeader — auto-created
        return `<span class="text-muted" style="font-size:0.78rem;">Auto-created</span>`;
    }

    function addModuleItemRow(defaults = {}) {
        // Remove the "no items" placeholder row
        const noItemsRow = moduleItemsTbody.querySelector('#no-items-row');
        if (noItemsRow) noItemsRow.remove();

        moduleItemCounter++;
        const rowId = `mi-row-${moduleItemCounter}`;

        const tr = document.createElement('tr');
        tr.id = rowId;
        tr.dataset.itemIndex = moduleItemCounter;

        const typeOptions = MODULE_ITEM_TYPES.map(t =>
            `<option value="${t.value}" ${defaults.type === t.value ? 'selected' : ''}>${t.label}</option>`
        ).join('');

        const selectedType = defaults.type || 'Assignment';
        const showNewTab = selectedType === 'ExternalUrl' || selectedType === 'ExternalTool';

        tr.innerHTML = `
            <td>
                <select class="form-select form-select-sm mi-type-select">${typeOptions}</select>
            </td>
            <td>
                <input type="text" class="form-control form-control-sm mi-title-input" placeholder="Item title" value="${defaults.title || ''}">
            </td>
            <td class="mi-value-cell">
                ${buildValueCell(selectedType, rowId, defaults)}
            </td>
            <td class="text-center">
                <input type="checkbox" class="form-check-input mi-newtab-check" ${defaults.new_tab ? 'checked' : ''} ${showNewTab ? '' : 'disabled'}>
            </td>
            <td class="text-center">
                <button type="button" class="btn btn-outline-danger btn-sm mi-remove-btn" title="Remove item">
                    <i class="bi bi-x-lg"></i>
                </button>
            </td>
        `;

        moduleItemsTbody.appendChild(tr);

        // Type change handler — rebuild Value column and toggle New Tab
        const typeSelect = tr.querySelector('.mi-type-select');
        const newTabCheck = tr.querySelector('.mi-newtab-check');
        const valueCell = tr.querySelector('.mi-value-cell');

        typeSelect.addEventListener('change', () => {
            const val = typeSelect.value;
            const isUrl = val === 'ExternalUrl' || val === 'ExternalTool';

            // Rebuild value cell
            valueCell.innerHTML = buildValueCell(val, rowId);

            // Toggle new-tab checkbox
            newTabCheck.disabled = !isUrl;
            if (!isUrl) newTabCheck.checked = false;

            // Re-attach input listener for URL fields
            const urlInput = valueCell.querySelector('.mi-url-input');
            if (urlInput) urlInput.addEventListener('input', refreshCreateEnabled);

            refreshCreateEnabled();
        });

        // Title input listener
        tr.querySelector('.mi-title-input').addEventListener('input', refreshCreateEnabled);

        // URL input listener (if present on initial render)
        const urlInput = tr.querySelector('.mi-url-input');
        if (urlInput) urlInput.addEventListener('input', refreshCreateEnabled);

        // Remove button
        tr.querySelector('.mi-remove-btn').addEventListener('click', () => {
            tr.remove();
            if (moduleItemsTbody.querySelectorAll('tr:not(#no-items-row)').length === 0) {
                const placeholderRow = document.createElement('tr');
                placeholderRow.id = 'no-items-row';
                placeholderRow.innerHTML = `
                    <td colspan="5" class="text-center text-muted py-2">
                        <i class="bi bi-info-circle me-1"></i>No items added. Click "Add Item" to add content to each module.
                    </td>
                `;
                moduleItemsTbody.appendChild(placeholderRow);
            }
            refreshCreateEnabled();
        });

        refreshCreateEnabled();
        return tr;
    }

    function getModuleItems() {
        const items = [];
        const rows = moduleItemsTbody.querySelectorAll('tr:not(#no-items-row)');
        rows.forEach(row => {
            const type = row.querySelector('.mi-type-select').value;
            const title = row.querySelector('.mi-title-input').value.trim();

            const item = { type, title };

            if (type === 'ExternalUrl' || type === 'ExternalTool') {
                const urlInput = row.querySelector('.mi-url-input');
                item.external_url = urlInput ? urlInput.value.trim() : '';
                item.new_tab = row.querySelector('.mi-newtab-check').checked;
            }

            if (type === 'Quiz') {
                const checkedRadio = row.querySelector('.mi-quiz-engine:checked');
                item.quiz_engine = checkedRadio ? checkedRadio.value : 'classic';
            }

            items.push(item);
        });
        return items;
    }

    function validateModuleItems() {
        const items = getModuleItems();
        for (const item of items) {
            if (!item.title) return false;
            if ((item.type === 'ExternalUrl' || item.type === 'ExternalTool') && !item.external_url) return false;
        }
        return true;
    }

    addModuleItemBtn.addEventListener('click', (e) => {
        e.preventDefault();
        addModuleItemRow();
    });

    clearModuleItemsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        moduleItemsTbody.innerHTML = `
            <tr id="no-items-row">
                <td colspan="5" class="text-center text-muted py-2">
                    <i class="bi bi-info-circle me-1"></i>No items added. Click "Add Item" to add content to each module.
                </td>
            </tr>
        `;
        refreshCreateEnabled();
    });

    // ===== Button Enable/Disable Logic =====
    const courseID = createModuleForm.querySelector('#course-id');
    const moduleNumber = createModuleForm.querySelector('#module-number');
    const createModulesBtn = createModuleForm.querySelector('#create-modules-btn');

    function refreshCreateEnabled() {
        const hasCourse = courseID.value && courseID.value.trim() !== '';
        const hasNumber = moduleNumber.value && Number(moduleNumber.value) > 0;
        const itemRows = moduleItemsTbody.querySelectorAll('tr:not(#no-items-row)');
        const hasItems = itemRows.length > 0;
        // Items are optional, but if present they must be valid
        const itemsValid = !hasItems || validateModuleItems();
        createModulesBtn.disabled = !(hasCourse && hasNumber && itemsValid);
    }

    courseID.addEventListener('input', refreshCreateEnabled);
    moduleNumber.addEventListener('input', refreshCreateEnabled);

    // ===== Create Button Handler =====
    createModulesBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        createModulesBtn.disabled = true;

        const responseContainer = createModuleForm.querySelector('#create-response-container');
        const domain = document.querySelector('#domain').value.trim();
        const token = document.querySelector('#token').value.trim();
        const course_id = courseID.value.trim();
        const number = moduleNumber.value.trim();
        const namePrefix = createModuleForm.querySelector('#module-name-prefix').value.trim() || undefined;

        const progressDiv = createModuleForm.querySelector('#create-progress-div');
        const progressBar = progressDiv.querySelector('.progress-bar');
        const progressInfo = createModuleForm.querySelector('#create-progress-info');

        // Gather module items
        const moduleItems = getModuleItems();
        const hasItems = moduleItems.length > 0;

        // clean environment
        responseContainer.innerHTML = '';
        progressDiv.hidden = false;
        progressBar.parentElement.hidden = false;
        updateProgressWithPercent(progressBar, 0);
        enhanceProgressBarWithPercent(progressBar);
        progressInfo.innerHTML = '';

        const setBar = (percent) => updateProgressWithPercent(progressBar, percent);
        const appendLine = (text) => {
            const span = document.createElement('span');
            span.textContent = text;
            progressInfo.appendChild(span);
            progressInfo.appendChild(document.createElement('br'));
            return span;
        };
        const replaceLine = (el, text) => { if (el) el.textContent = text; };

        let createdModuleIds = [];
        let modulesSuccessCount = 0;
        let modulesFailedCount = 0;
        let itemsSuccessCount = 0;
        let itemsFailedCount = 0;
        let totalItemsAttempted = 0;
        let activeRun = true;

        try {
            // ===== Step 1: Create Modules =====
            let step1Line = appendLine(`Step 1: Creating ${number} module(s)...`);
            setBar(0);

            const requestData = {
                domain,
                token,
                course_id,
                number,
                prefix: namePrefix
            };

            // Listen for progress updates
            if (window.progressAPI && window.progressAPI.onUpdateProgress) {
                window.progressAPI.onUpdateProgress((msg) => {
                    if (!activeRun) return;
                    if (typeof msg === 'number') {
                        // Simple percentage from module creation
                        const pct = hasItems ? msg * 0.5 : msg;
                        setBar(pct);
                    } else if (msg && typeof msg === 'object') {
                        if (msg.label === 'Creating module items' && typeof msg.processed === 'number' && typeof msg.total === 'number' && msg.total > 0) {
                            const pct = 50 + (msg.processed / msg.total) * 45;
                            setBar(pct);
                        }
                    }
                });
            }

            const createdModules = await window.axios.createModules(requestData);
            modulesSuccessCount = createdModules.successful.length;
            modulesFailedCount = createdModules.failed.length;

            if (modulesSuccessCount > 0) {
                replaceLine(step1Line, `Step 1: Created ${modulesSuccessCount} module(s).`);
                createdModuleIds = createdModules.successful.map(m => m.value.id);
            }
            if (modulesFailedCount > 0) {
                appendLine(`\u26A0 ${modulesFailedCount} module(s) failed to create.`);
            }

            setBar(hasItems ? 50 : 95);

            // ===== Step 2: Create Module Items (if any) =====
            if (hasItems && createdModuleIds.length > 0) {
                totalItemsAttempted = createdModuleIds.length * moduleItems.length;
                let step2Line = appendLine(`Step 2: Adding ${moduleItems.length} item(s) to ${createdModuleIds.length} module(s) (${totalItemsAttempted} total)...`);

                const itemRequestData = {
                    domain,
                    token,
                    course_id,
                    module_ids: createdModuleIds,
                    items: moduleItems
                };

                const createdItems = await window.axios.createModuleItems(itemRequestData);
                itemsSuccessCount = createdItems.successful.length;
                itemsFailedCount = createdItems.failed.length;

                if (itemsSuccessCount > 0) {
                    replaceLine(step2Line, `Step 2: Created ${itemsSuccessCount} module item(s).`);
                }
                if (itemsFailedCount > 0) {
                    appendLine(`\u26A0 ${itemsFailedCount} module item(s) failed to create.`);
                }
            }

            setBar(100);
            activeRun = false;
            appendLine('Done.');

            // ===== Summary Card =====
            const hasErrors = modulesFailedCount > 0 || itemsFailedCount > 0;
            responseContainer.innerHTML = `
                <div class="card summary-card mt-2 ${hasErrors ? 'has-errors' : ''}">
                    <div class="card-body py-2 px-3">
                        <div class="d-flex align-items-center mb-2">
                            <i class="bi ${hasErrors ? 'bi-exclamation-triangle-fill' : 'bi-check-circle-fill'} summary-icon me-2"></i>
                            <strong>${hasErrors ? 'Completed with Errors' : 'Operation Complete'}</strong>
                        </div>
                        <div class="row text-center">
                            <div class="col">
                                <div class="summary-stat">${modulesSuccessCount}</div>
                                <div class="summary-label">Modules Created</div>
                            </div>
                            ${hasItems ? `
                            <div class="col">
                                <div class="summary-stat">${itemsSuccessCount}</div>
                                <div class="summary-label">Items Added</div>
                            </div>
                            <div class="col">
                                <div class="summary-stat">${moduleItems.length}</div>
                                <div class="summary-label">Items Per Module</div>
                            </div>
                            ` : ''}
                            ${hasErrors ? `
                            <div class="col">
                                <div class="summary-stat text-danger">${modulesFailedCount + itemsFailedCount}</div>
                                <div class="summary-label text-danger">Failed</div>
                            </div>
                            ` : ''}
                        </div>
                        ${hasItems ? `
                        <div class="mt-2">
                            <small class="text-muted">
                                <i class="bi bi-info-circle me-1"></i>
                                ${moduleItems.map(i => {
                let label = i.type;
                if (i.type === 'Quiz') label = i.quiz_engine === 'new' ? 'New Quiz' : 'Classic Quiz';
                return `${label}: "${i.title}"`;
            }).join(' | ')}
                            </small>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error creating modules:', error);
            activeRun = false;
            errorHandler(error, progressInfo);
        } finally {
            createModulesBtn.disabled = false;
            progressBar.parentElement.hidden = false;
        }
    });
}

async function reLockModules(e) {
    hideEndpoints(e);

    const eContent = document.querySelector('#endpoint-content');
    let reLockModulesForm = eContent.querySelector('#relock-modules-form');

    if (!reLockModulesForm) {
        reLockModulesForm = document.createElement('form');
        reLockModulesForm.id = 'relock-modules-form';
        reLockModulesForm.innerHTML = `
            <style>
                #relock-modules-form .card-title { font-size: 1.1rem; }
                #relock-modules-form .card-header small { font-size: 0.7rem; }
                #relock-modules-form .form-label, #relock-modules-form .form-check-label { font-size: 0.85rem; }
                #relock-modules-form .form-text { font-size: 0.7rem; }
                #relock-modules-form .card-body { padding: 0.75rem; }
                #relock-modules-form .btn { padding: 0.35rem 0.75rem; font-size: 0.85rem; }
                #relock-modules-form .form-control { font-size: 0.85rem; padding: 0.25rem 0.5rem; }
                #relock-modules-form .bi { font-size: 0.9rem; }
                #relock-modules-form .mt-3, #relock-modules-form .mt-2 { margin-top: 0.5rem !important; }
                #relock-modules-form .mb-3, #relock-modules-form .mb-2 { margin-bottom: 0.5rem !important; }
                #relock-modules-form .progress { height: 12px; }
                #relock-modules-form h5 { font-size: 1rem; }
                #relock-modules-form .nav-tabs .nav-link { font-size: 0.85rem; padding: 0.35rem 0.75rem; }
                #relock-modules-form .summary-table { font-size: 0.8rem; }
                #relock-modules-form .summary-table td, #relock-modules-form .summary-table th { padding: 0.25rem 0.5rem; }
            </style>
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-arrow-clockwise me-1"></i>Reset Module Progressions
                    </h3>
                    <small class="text-muted">Resets module progressions to their default locked state and recalculates them based on the current requirements</small>
                </div>
                <div class="card-body">
            <!-- Input Type Tabs -->
            <ul class="nav nav-tabs mb-3" role="tablist">
                <li class="nav-item" role="presentation">
                    <button class="nav-link active" id="single-course-tab" data-bs-toggle="tab" data-bs-target="#single-course-pane" type="button" role="tab" aria-controls="single-course-pane" aria-selected="true">
                        <i class="bi bi-pencil me-1"></i>Single Course
                    </button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="file-upload-tab" data-bs-toggle="tab" data-bs-target="#file-upload-pane" type="button" role="tab" aria-controls="file-upload-pane" aria-selected="false">
                        <i class="bi bi-upload me-1"></i>File Upload
                    </button>
                </li>
            </ul>
            <div class="tab-content">
                <!-- Single Course Tab -->
                <div class="tab-pane fade show active" id="single-course-pane" role="tabpanel" aria-labelledby="single-course-tab">
            <div class="row">
                <div class="row align-items-end">
                    <div class="col-12 col-sm-6 col-md-5 col-lg-4">
                        <label class="form-label">Course ID</label>
                        <input id="course-id" type="text" class="form-control form-control-sm" aria-describedby="input-checker" />
                        <div>
                            <span id="input-checker" class="form-text" style="display: none;">Must only contain numbers</span>
                        </div>
                    </div>
                    <div class="col-auto ms-2 ms-md-3">
                        <button id="fetch-modules-btn" class="btn btn-sm btn-primary mt-2 mt-sm-0">Fetch Modules</button>
                    </div>
                </div>
                <hr class="mt-2">
            </div>
            <div id="module-selection-container" class="mt-2" hidden>
                <h5>Select Modules to Re-lock:</h5>
                <div class="form-check mb-2">
                    <input type="checkbox" class="form-check-input" id="select-all-modules-chbx">
                    <label for="select-all-modules-chbx" class="form-check-label">Select All</label>
                </div>
                <div id="modules-list" class="mt-2">
                    <!-- Module checkboxes will be populated here -->
                </div>
            </div>
            <div class="mt-2" id="relock-btn-container" hidden>
                <button id="relock-btn" class="btn btn-sm btn-warning mt-2" disabled>Re-lock Selected Modules</button>
            </div>
            <div hidden id="relock-progress-div">
                <p id="relock-progress-info"></p>
                <div class="progress mt-2" style="width: 75%" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
            </div>
            <div id="relock-response-container" class="mt-2">
            </div>
                </div>
                <!-- File Upload Tab -->
                <div class="tab-pane fade" id="file-upload-pane" role="tabpanel" aria-labelledby="file-upload-tab">
                    <div class="row g-3 mb-2">
                        <div class="col-12 col-md-8 col-lg-6">
                            <label class="form-label">Upload a file containing course IDs</label>
                            <input type="file" id="relock-course-file" class="form-control form-control-sm" accept=".csv,.txt">
                            <div class="form-text">
                                Supports <strong>.csv</strong> and <strong>.txt</strong> files. Course IDs can be one per line, comma-separated, or in a CSV column named <em>course_id</em>, <em>id</em>, or <em>canvas_course_id</em>.
                            </div>
                        </div>
                    </div>
                    <div id="bulk-file-preview" class="mt-2" hidden>
                        <!-- File parse results shown here -->
                    </div>
                    <div id="bulk-confirm-container" class="mt-2" hidden>
                        <div class="alert alert-info mb-2" id="bulk-confirm-msg"></div>
                        <button id="bulk-relock-btn" class="btn btn-sm btn-warning">
                            <i class="bi bi-arrow-clockwise me-1"></i>Re-lock All Modules in Listed Courses
                        </button>
                        <button id="bulk-cancel-btn" class="btn btn-sm btn-outline-secondary ms-2">Cancel</button>
                    </div>
                    <div hidden id="bulk-progress-div">
                        <p id="bulk-progress-info"></p>
                        <div class="progress mt-2" style="width: 75%" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                            <div class="progress-bar" style="width: 0%"></div>
                        </div>
                    </div>
                    <div id="bulk-response-container" class="mt-2">
                    </div>
                </div>
            </div>
                </div>
            </div>
        `;

        eContent.append(reLockModulesForm);
    }
    reLockModulesForm.hidden = false;

    if (reLockModulesForm.dataset.bound === 'true') return;
    reLockModulesForm.dataset.bound = 'true';

    const courseID = reLockModulesForm.querySelector('#course-id');
    const relockAllCheckbox = reLockModulesForm.querySelector('#relock-all-modules');
    const fetchModulesBtn = reLockModulesForm.querySelector('#fetch-modules-btn');
    // start disabled until a valid course id is entered
    fetchModulesBtn.disabled = true;
    const moduleSelectionContainer = reLockModulesForm.querySelector('#module-selection-container');
    const relockBtn = reLockModulesForm.querySelector('#relock-btn');
    const selectAllCheckbox = reLockModulesForm.querySelector('#select-all-modules-chbx');

    let allModules = [];

    // Course ID validation
    courseID.addEventListener('input', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const trimmedValue = courseID.value.trim();
        const inputChecker = reLockModulesForm.querySelector('#input-checker');

        if (trimmedValue === '') {
            inputChecker.style.display = 'none';
            fetchModulesBtn.disabled = true;
        } else if (!isNaN(Number(trimmedValue)) && Number(trimmedValue) > 0) {
            inputChecker.style.display = 'none';
            fetchModulesBtn.disabled = false;
        } else {
            inputChecker.style.display = 'inline';
            fetchModulesBtn.disabled = true;
        }
    });

    courseID.addEventListener('change', (e) => {
        e.preventDefault();
        e.stopPropagation();
        checkCourseID(courseID, reLockModulesForm);
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

    // Fetch modules button
    fetchModulesBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const domain = document.querySelector('#domain').value.trim();
        const token = document.querySelector('#token').value.trim();
        const course_id = courseID.value.trim();

        const progressDiv = reLockModulesForm.querySelector('#relock-progress-div');
        const progressInfo = reLockModulesForm.querySelector('#relock-progress-info');
        const responseContainer = reLockModulesForm.querySelector('#relock-response-container');

        // Clean environment
        responseContainer.innerHTML = '';
        progressDiv.hidden = false;
        progressInfo.innerHTML = 'Fetching modules...';

        const requestData = {
            domain,
            token,
            course_id
        };

        try {
            allModules = await window.axios.getModulesSimple(requestData);
            console.log('Fetched modules:', allModules);
            progressInfo.innerHTML = `Found ${allModules.length} modules`;
            progressDiv.hidden = true;

            if (allModules.length === 0) {
                responseContainer.innerHTML = '<div class="alert alert-info">No modules found in this course.</div>';
                return;
            }

            // Show selection area and populate module list
            moduleSelectionContainer.hidden = false;
            const modulesList = reLockModulesForm.querySelector('#modules-list');
            modulesList.innerHTML = '';

            // Show the relock button container
            const relockBtnContainer = reLockModulesForm.querySelector('#relock-btn-container');
            relockBtnContainer.hidden = false;

            allModules.forEach((module) => {
                const moduleDiv = document.createElement('div');
                moduleDiv.className = 'form-check';
                moduleDiv.innerHTML = `
                    <input class="form-check-input module-checkbox" type="checkbox" value="${module.id}" id="module-${module.id}">
                    <label class="form-check-label" for="module-${module.id}">
                        ${module.name} (ID: ${module.id})
                    </label>
                `;
                modulesList.appendChild(moduleDiv);
            });

            // Add event listeners for module checkboxes
            const moduleCheckboxes = modulesList.querySelectorAll('.module-checkbox');
            moduleCheckboxes.forEach(checkbox => {
                checkbox.addEventListener('change', () => {
                    // keep select-all checkbox in sync
                    const total = moduleCheckboxes.length;
                    const selected = reLockModulesForm.querySelectorAll('.module-checkbox:checked').length;
                    selectAllCheckbox.checked = selected > 0 && selected === total;
                    updateRelockButton();
                });
            });

            console.log('About to enable relock button');
            updateRelockButton();
            console.log('Relock button display:', relockBtn.style.display, 'disabled:', relockBtn.disabled);

        } catch (error) {
            errorHandler(error, progressInfo);
        }
    });

    // Select All checkbox behavior
    selectAllCheckbox.addEventListener('change', () => {
        const moduleCheckboxes = reLockModulesForm.querySelectorAll('.module-checkbox');
        moduleCheckboxes.forEach(cb => cb.checked = selectAllCheckbox.checked);
        updateRelockButton();
    });

    // Update relock button state
    function updateRelockButton() {
        const selectedModules = reLockModulesForm.querySelectorAll('.module-checkbox:checked');
        relockBtn.disabled = selectedModules.length === 0;
        console.log('Updated relock button - disabled:', relockBtn.disabled);
    }

    // Re-lock modules button
    relockBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const domain = document.querySelector('#domain').value.trim();
        const token = document.querySelector('#token').value.trim();
        const course_id = courseID.value.trim();

        const progressDiv = reLockModulesForm.querySelector('#relock-progress-div');
        const progressBar = progressDiv.querySelector('.progress-bar');
        const progressInfo = reLockModulesForm.querySelector('#relock-progress-info');
        const responseContainer = reLockModulesForm.querySelector('#relock-response-container');

        const selectedCheckboxes = reLockModulesForm.querySelectorAll('.module-checkbox:checked');
        const moduleIds = Array.from(selectedCheckboxes).map(checkbox => parseInt(checkbox.value));

        if (moduleIds.length === 0) {
            responseContainer.innerHTML = '<div class="alert alert-warning">No modules selected for re-locking.</div>';
            return;
        }

        // Clean environment
        responseContainer.innerHTML = '';
        progressDiv.hidden = false;
        progressBar.parentElement.hidden = false;
        updateProgressWithPercent(progressBar, 0);
        enhanceProgressBarWithPercent(progressBar);
        progressInfo.innerHTML = `Re-locking ${moduleIds.length} module(s)...`;

        relockBtn.disabled = true;
        fetchModulesBtn.disabled = true;

        const requestData = {
            domain,
            token,
            course_id,
            module_ids: moduleIds
        };

        window.progressAPI.onUpdateProgress((progress) => {
            updateProgressWithPercent(progressBar, progress);
        });

        try {
            const relockResult = await window.axios.relockModules(requestData);

            const successCount = relockResult.successful.length;
            const failedCount = relockResult.failed.length;

            if (successCount > 0) {
                progressInfo.innerHTML = `Successfully re-locked ${successCount} module(s).`;

                if (failedCount > 0) {
                    progressInfo.innerHTML += ` Failed to re-lock ${failedCount} module(s).`;
                }

                responseContainer.innerHTML = `
                    <div class="alert alert-success">
                        <strong>Re-lock Complete!</strong><br>
                        Successfully re-locked ${successCount} module(s)${failedCount > 0 ? `, failed ${failedCount}` : ''}.
                    </div>
                `;
            } else {
                progressInfo.innerHTML = `Failed to re-lock modules.`;
                responseContainer.innerHTML = `
                    <div class="alert alert-danger">
                        <strong>Re-lock Failed!</strong><br>
                        No modules were successfully re-locked.
                    </div>
                `;
            }

        } catch (error) {
            errorHandler(error, progressInfo);
            responseContainer.innerHTML = `
                <div class="alert alert-danger">
                    <strong>Error!</strong><br>
                    ${error.message || 'An error occurred while re-locking modules.'}
                </div>
            `;
        } finally {
            relockBtn.disabled = false;
            fetchModulesBtn.disabled = false;
        }
    });

    // ─── File Upload Tab Logic ───────────────────────────────────────
    const courseFileInput = reLockModulesForm.querySelector('#relock-course-file');
    const bulkFilePreview = reLockModulesForm.querySelector('#bulk-file-preview');
    const bulkConfirmContainer = reLockModulesForm.querySelector('#bulk-confirm-container');
    const bulkConfirmMsg = reLockModulesForm.querySelector('#bulk-confirm-msg');
    const bulkRelockBtn = reLockModulesForm.querySelector('#bulk-relock-btn');
    const bulkCancelBtn = reLockModulesForm.querySelector('#bulk-cancel-btn');
    const bulkProgressDiv = reLockModulesForm.querySelector('#bulk-progress-div');
    const bulkProgressBar = bulkProgressDiv.querySelector('.progress-bar');
    const bulkProgressInfo = reLockModulesForm.querySelector('#bulk-progress-info');
    const bulkResponseContainer = reLockModulesForm.querySelector('#bulk-response-container');

    let parsedCourseIds = [];

    /**
     * Parse a file for course IDs.
     * Supports:
     *  - One ID per line
     *  - Comma-separated IDs
     *  - CSV with header row containing course_id, id, or canvas_course_id
     *  - Lines containing Canvas course URLs (/courses/<id>)
     */
    function parseCourseFile(content) {
        const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length === 0) return [];

        // Try to detect CSV with header
        const firstLine = lines[0].toLowerCase();
        const knownHeaders = ['course_id', 'id', 'canvas_course_id', 'courseid', 'course id'];
        const headerFields = firstLine.split(',').map(f => f.trim().replace(/^["']|["']$/g, '').toLowerCase());
        const headerIndex = headerFields.findIndex(f => knownHeaders.includes(f));

        if (headerIndex !== -1 && lines.length > 1) {
            // CSV mode: extract the right column from each row
            const ids = [];
            for (let i = 1; i < lines.length; i++) {
                const cols = parseCSVLine(lines[i]);
                if (cols.length > headerIndex) {
                    const val = cols[headerIndex].trim().replace(/^["']|["']$/g, '');
                    const num = parseInt(val, 10);
                    if (!isNaN(num) && num > 0) ids.push(num);
                }
            }
            return [...new Set(ids)];
        }

        // Fallback: line-based / comma-separated / URL extraction
        const ids = [];
        for (const line of lines) {
            // Check for Canvas course URL pattern
            const urlMatch = line.match(/\/courses\/(\d+)/);
            if (urlMatch) {
                const id = parseInt(urlMatch[1], 10);
                if (!isNaN(id) && id > 0) ids.push(id);
                continue;
            }
            // Comma or whitespace separated
            const parts = line.split(/[,\s]+/);
            for (const part of parts) {
                const cleaned = part.trim().replace(/^["']|["']$/g, '');
                const num = parseInt(cleaned, 10);
                if (!isNaN(num) && num > 0) ids.push(num);
            }
        }
        return [...new Set(ids)];
    }

    /** Minimal CSV line parser that respects quoted fields */
    function parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (inQuotes) {
                if (ch === '"' && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else if (ch === '"') {
                    inQuotes = false;
                } else {
                    current += ch;
                }
            } else {
                if (ch === '"') {
                    inQuotes = true;
                } else if (ch === ',') {
                    result.push(current);
                    current = '';
                } else {
                    current += ch;
                }
            }
        }
        result.push(current);
        return result;
    }

    /** Reset the bulk upload UI to its initial state */
    function resetBulkUI() {
        parsedCourseIds = [];
        bulkFilePreview.hidden = true;
        bulkFilePreview.innerHTML = '';
        bulkConfirmContainer.hidden = true;
        bulkProgressDiv.hidden = true;
        bulkResponseContainer.innerHTML = '';
        courseFileInput.value = '';
    }

    // File input change handler
    courseFileInput.addEventListener('change', (e) => {
        e.preventDefault();
        const file = courseFileInput.files[0];
        if (!file) {
            resetBulkUI();
            return;
        }

        const reader = new FileReader();
        reader.onload = function (evt) {
            try {
                const content = evt.target.result;
                parsedCourseIds = parseCourseFile(content);

                bulkResponseContainer.innerHTML = '';
                bulkProgressDiv.hidden = true;

                if (parsedCourseIds.length === 0) {
                    bulkFilePreview.hidden = false;
                    bulkFilePreview.innerHTML = `
                        <div class="alert alert-warning mb-0">
                            <i class="bi bi-exclamation-triangle me-1"></i>No valid course IDs found in the file. Please check the file format.
                        </div>`;
                    bulkConfirmContainer.hidden = true;
                    return;
                }

                // Show count of parsed course IDs
                bulkFilePreview.hidden = false;
                bulkFilePreview.innerHTML = `
                    <div class="alert alert-success mb-0 py-2">
                        <i class="bi bi-check-circle me-1"></i>
                        <strong>${parsedCourseIds.length}</strong> unique course ID${parsedCourseIds.length !== 1 ? 's' : ''} found in the file.
                    </div>`;

                // Show confirmation
                bulkConfirmMsg.innerHTML = `
                    <i class="bi bi-info-circle me-1"></i>
                    This will fetch and re-lock <strong>all</strong> modules in <strong>${parsedCourseIds.length}</strong> course${parsedCourseIds.length !== 1 ? 's' : ''}.
                    Are you sure you want to proceed?`;
                bulkConfirmContainer.hidden = false;

            } catch (err) {
                bulkFilePreview.hidden = false;
                bulkFilePreview.innerHTML = `
                    <div class="alert alert-danger mb-0">
                        <i class="bi bi-x-circle me-1"></i>Error parsing file: ${err.message}
                    </div>`;
                bulkConfirmContainer.hidden = true;
            }
        };
        reader.onerror = () => {
            bulkFilePreview.hidden = false;
            bulkFilePreview.innerHTML = `
                <div class="alert alert-danger mb-0">
                    <i class="bi bi-x-circle me-1"></i>Failed to read the file. Please try again.
                </div>`;
            bulkConfirmContainer.hidden = true;
        };
        reader.readAsText(file);
    });

    // Cancel button
    bulkCancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        resetBulkUI();
    });

    // Bulk re-lock button
    bulkRelockBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (parsedCourseIds.length === 0) return;

        const domain = document.querySelector('#domain').value.trim();
        const token = document.querySelector('#token').value.trim();

        if (!domain || !token) {
            bulkResponseContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle me-1"></i>Please enter your domain and API token first.
                </div>`;
            return;
        }

        // Disable controls
        bulkRelockBtn.disabled = true;
        bulkCancelBtn.disabled = true;
        courseFileInput.disabled = true;

        // Show progress
        bulkResponseContainer.innerHTML = '';
        bulkProgressDiv.hidden = false;
        updateProgressWithPercent(bulkProgressBar, 0);
        enhanceProgressBarWithPercent(bulkProgressBar);
        bulkProgressInfo.innerHTML = `Processing 0 / ${parsedCourseIds.length} courses...`;

        const unsubscribe = window.progressAPI.onUpdateProgress((progress) => {
            updateProgressWithPercent(bulkProgressBar, progress);
            const completed = Math.round((progress / 100) * parsedCourseIds.length);
            bulkProgressInfo.innerHTML = `Processing ${completed} / ${parsedCourseIds.length} courses...`;
        });

        try {
            const result = await window.axios.relockBulkCourses({
                domain,
                token,
                course_ids: parsedCourseIds
            });

            // Build summary
            const totalProcessed = result.successful.length + result.failed.length + result.skipped.length;
            const totalModulesRelocked = result.successful.reduce((sum, c) => sum + c.modules_relocked, 0);
            const totalModulesFailed = result.successful.reduce((sum, c) => sum + c.modules_failed, 0);

            bulkProgressInfo.innerHTML = `Completed — ${totalProcessed} course${totalProcessed !== 1 ? 's' : ''} processed.`;
            updateProgressWithPercent(bulkProgressBar, 100);

            let summaryHTML = `<div class="card mt-2"><div class="card-body p-2">`;
            summaryHTML += `<h6 class="mb-2"><i class="bi bi-clipboard-data me-1"></i>Bulk Re-lock Summary</h6>`;

            // Overview stats
            summaryHTML += `<div class="row text-center mb-2">`;
            summaryHTML += `<div class="col"><span class="badge bg-primary fs-6">${totalProcessed}</span><br><small>Total Courses</small></div>`;
            summaryHTML += `<div class="col"><span class="badge bg-success fs-6">${result.successful.length}</span><br><small>Successful</small></div>`;
            if (result.failed.length > 0) {
                summaryHTML += `<div class="col"><span class="badge bg-danger fs-6">${result.failed.length}</span><br><small>Failed</small></div>`;
            }
            if (result.skipped.length > 0) {
                summaryHTML += `<div class="col"><span class="badge bg-warning text-dark fs-6">${result.skipped.length}</span><br><small>Skipped</small></div>`;
            }
            summaryHTML += `<div class="col"><span class="badge bg-info fs-6">${totalModulesRelocked}</span><br><small>Modules Re-locked</small></div>`;
            if (totalModulesFailed > 0) {
                summaryHTML += `<div class="col"><span class="badge bg-danger fs-6">${totalModulesFailed}</span><br><small>Module Failures</small></div>`;
            }
            summaryHTML += `</div>`;

            // Build combined row data for preview table and CSV
            const allRows = [];
            for (const c of result.successful) {
                allRows.push({ course_id: c.course_id, modules_relocked: c.modules_relocked, modules_failed: c.modules_failed, skipped: '' });
            }
            for (const c of result.failed) {
                allRows.push({ course_id: c.course_id, modules_relocked: 0, modules_failed: 0, skipped: '', error: c.reason });
            }
            for (const c of result.skipped) {
                allRows.push({ course_id: c.course_id, modules_relocked: 0, modules_failed: 0, skipped: 'Yes (no modules)' });
            }

            // Show first 5 rows in a preview table
            const previewRows = allRows.slice(0, 5);
            summaryHTML += `<div class="mb-2">
                <table class="table table-sm table-bordered summary-table mb-0">
                    <thead><tr><th>Course ID</th><th>Modules Re-locked</th><th>Modules Failed</th><th>Skipped</th></tr></thead>
                    <tbody>
                        ${previewRows.map(r => {
                const isFailed = result.failed.some(f => f.course_id === r.course_id);
                return `<tr>
                                <td>${r.course_id}</td>
                                <td class="text-success">${r.modules_relocked}</td>
                                <td class="${r.modules_failed > 0 ? 'text-danger' : ''}">${r.modules_failed}</td>
                                <td>${r.skipped || (isFailed ? '<span class="text-danger">Error</span>' : '')}</td>
                            </tr>`;
            }).join('')}
                    </tbody>
                </table>
            </div>`;

            // If more than 5 rows, offer a CSV download
            if (allRows.length > 5) {
                summaryHTML += `<div class="mb-2">
                    <small class="text-muted">Showing 5 of ${allRows.length} courses.</small>
                    <button id="bulk-download-csv" class="btn btn-sm btn-outline-primary ms-2">
                        <i class="bi bi-download me-1"></i>Download Full Results (CSV)
                    </button>
                </div>`;
            }

            summaryHTML += `</div></div>`;
            bulkResponseContainer.innerHTML = summaryHTML;

            // Attach CSV download handler
            const csvBtn = bulkResponseContainer.querySelector('#bulk-download-csv');
            if (csvBtn) {
                csvBtn.addEventListener('click', (evt) => {
                    evt.preventDefault();
                    try {
                        const csvHeader = 'course_id,modules_relocked,modules_failed,skipped';
                        const csvRows = allRows.map(r =>
                            `${r.course_id},${r.modules_relocked},${r.modules_failed},"${r.skipped || ''}"`
                        );
                        const csvContent = csvHeader + '\n' + csvRows.join('\n');
                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `bulk_relock_results_${Date.now()}.csv`;
                        link.click();
                        URL.revokeObjectURL(url);
                    } catch (err) {
                        console.error('Error generating CSV:', err);
                    }
                });
            }

        } catch (error) {
            errorHandler(error, bulkProgressInfo);
            bulkResponseContainer.innerHTML = `
                <div class="alert alert-danger">
                    <strong>Error!</strong><br>
                    ${error.message || 'An error occurred during bulk re-lock.'}
                </div>`;
        } finally {
            if (unsubscribe) unsubscribe();
            bulkRelockBtn.disabled = false;
            bulkCancelBtn.disabled = false;
            courseFileInput.disabled = false;
        }
    });
}