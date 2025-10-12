function moduleTemplate(e) {
    switch (e.target.id) {
        case 'delete-modules':
            deleteModules(e);
            break;
        case 'create-modules':
            createModules(e);
            break;
        case 'unlock-modules':
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
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-trash me-2"></i>Delete Modules
                    </h3>
                    <small class="text-muted">Remove modules from a course</small>
                </div>
                <div class="card-body">
            <div class="row">
                <div class="row align-items-center">
                        <div class="col-2">
                            <label class="form-label">Course</label>
                            <input id="course-id" type="text" class="form-control" aria-describedby="input-checker" />
                        </div>
                </div>
                <div class="col-auto" >
                    <span id="input-checker" class="form-text" style="display: none;">Must only contain numbers</span>
                </div>
                <hr class="mt-2">
                <div class="row">
                    <div class="mt-3">
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
                    <button id="check-modules-btn" class="btn btn-primary mt-3" disabled>Check</button>
                </div>
            </div>
            <div hidden id="progress-div">
                <p id="progress-info"></p>
                <div class="progress mt-3" style="width: 75%" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                    
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
            </div>
            <div id="response-container" class="mt-3">
            </div>
                </div>
            </div>
        `;

        eContent.append(createModuleDeleteForm);
    }
    createModuleDeleteForm.hidden = false;

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
                                    <button id="remove-btn" type="button" class="btn btn-danger" disabled>Remove</button>
                                </div>
                                <div class="col-2">
                                    <button id="cancel-btn" type="button" class="btn btn-secondary" disabled>Cancel</button>
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
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-plus-circle me-2"></i>Create Modules
                    </h3>
                    <small class="text-muted">Add new modules to a course</small>
                </div>
                <div class="card-body">
            <div class="row">
                <div class="row align-items-center">
                        <div class="col-2">
                            <label class="form-label">Course</label>
                            <input id="course-id" type="number" class="form-control" aria-describedby="input-checker" />
                        </div>
                </div>
                <div class="col-auto" >
                    <span id="input-checker" class="form-text" style="display: none;">Must only contain numbers</span>
                </div>
                <div class="row align-items-center">
                    <div class="col-2 mt-3">
                        <label class="form-label">How many</label>
                        <input id="module-number" type="number" class="form-control" value="1" min="1" max="1000" />
                    </div>
                </div>
                <hr class="mt-2">
                <div class="w-100"></div>
                <div class="col-auto">
                    <button id="create-modules-btn" class="btn btn-primary mt-3" disabled>Create</button>
                </div>
            </div>
            <div hidden id="create-progress-div">
                <p id="create-progress-info"></p>
                <div class="progress mt-3" style="width: 75%" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">

                    <div class="progress-bar" style="width: 0%"></div>
                </div>
            </div>
            <div id="create-response-container" class="mt-3">
            </div>
                </div>
            </div>
        `;

        eContent.append(createModuleForm);
    }
    createModuleForm.hidden = false;

    // disable the button until the course id and how many modules are entered
    const courseID = createModuleForm.querySelector('#course-id');
    const moduleNumber = createModuleForm.querySelector('#module-number');
    const createModulesBtn = createModuleForm.querySelector('#create-modules-btn');

    const toggleCreateModulesBtn = () => {
        createModulesBtn.disabled = !(courseID.value && moduleNumber.value);
    };

    courseID.addEventListener('input', toggleCreateModulesBtn);
    moduleNumber.addEventListener('input', toggleCreateModulesBtn);

    createModulesBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const responseContainer = createModuleForm.querySelector('#create-response-container');
        const domain = document.querySelector('#domain').value.trim();
        const token = document.querySelector('#token').value.trim();
        const course_id = courseID.value.trim();
        const number = moduleNumber.value.trim();

        const progressDiv = createModuleForm.querySelector('#create-progress-div');
        const progressBar = progressDiv.querySelector('.progress-bar');
        const progressInfo = createModuleForm.querySelector('#create-progress-info');

        // clean environment
        responseContainer.innerHTML = '';
        progressDiv.hidden = false;
        progressBar.parentElement.hidden = true;
        updateProgressWithPercent(progressBar, 0);
        enhanceProgressBarWithPercent(progressBar);
        progressInfo.innerHTML = 'Creating...';

        const requestData = {
            domain,
            token,
            course_id,
            number
        };

        window.progressAPI.onUpdateProgress((progress) => {
            updateProgressWithPercent(progressBar, progress);
        });

        try {
            const createdModules = await window.axios.createModules(requestData);
            progressInfo.innerHTML = 'Done';
            updateProgressWithPercent(progressBar, 100);

            if (createdModules.successful.length === 0 && createdModules.failed.length === 0) {
                responseContainer.innerHTML = `
                    <div>
                        <p>No modules were created. Please check the course ID and try again.</p>
                    </div>
                `;
                return;
            } else if (createdModules.successful.length > 0) {
                responseContainer.innerHTML = `
                    <div>
                        <p>Successfully created ${createdModules.successful.length} modules.</p>
                    </div>
                `;
            }
            if (createdModules.failed.length > 0) {
                throw new Error(`Failed to create modules: ${createdModules.failed[0].reason}`);
            }
        } catch (error) {
            console.error('Error creating modules:', error);
            errorHandler(error, progressInfo);
        } finally {
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
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-arrow-clockwise me-2"></i>Reset Module Progressions
                    </h3>
                    <small class="text-muted">Resets module progressions to their default locked state and recalculates them based on the current requirements</small>
                </div>
                <div class="card-body">
            <div class="row">
                <div class="row align-items-end">
                    <div class="col-12 col-sm-6 col-md-5 col-lg-4">
                        <label class="form-label">Course ID</label>
                        <input id="course-id" type="text" class="form-control" aria-describedby="input-checker" />
                        <div>
                            <span id="input-checker" class="form-text" style="display: none;">Must only contain numbers</span>
                        </div>
                    </div>
                    <div class="col-auto ms-2 ms-md-3">
                        <button id="fetch-modules-btn" class="btn btn-primary mt-2 mt-sm-0">Fetch Modules</button>
                    </div>
                </div>
                <hr class="mt-2">
            </div>
            <div id="module-selection-container" class="mt-3" hidden>
                <h5>Select Modules to Re-lock:</h5>
                <div class="form-check mb-2">
                    <input type="checkbox" class="form-check-input" id="select-all-modules-chbx">
                    <label for="select-all-modules-chbx" class="form-check-label">Select All</label>
                </div>
                <div id="modules-list" class="mt-2">
                    <!-- Module checkboxes will be populated here -->
                </div>
            </div>
            <div class="mt-3">
                <button id="relock-btn" class="btn btn-warning mt-3" disabled>Re-lock Selected Modules</button>
            </div>
            <div hidden id="relock-progress-div">
                <p id="relock-progress-info"></p>
                <div class="progress mt-3" style="width: 75%" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
            </div>
            <div id="relock-response-container" class="mt-3">
            </div>
                </div>
            </div>
        `;

        eContent.append(reLockModulesForm);
    }
    reLockModulesForm.hidden = false;

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

    // Set initial button and container state
    relockBtn.textContent = 'Re-lock Selected Modules';
    relockBtn.style.display = 'inline-block';
    relockBtn.disabled = true;

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
}