// ****************************************************
//
// Assignment Group Endpoints
//
// ****************************************************

function assignmentGroupTemplate(e) {
    switch (e.target.id) {
        case 'create-assignment-groups':
            assignmentGroupCreator(e);
            break;
        case 'delete-empty-assignment-groups':
            emptyAssignmentGroups(e);
            break;
        default:
            break;
    }
}

function emptyAssignmentGroups(e) {
    hideEndpoints(e)
    console.log('emptyAssignmentGroups');

    const eContent = document.querySelector('#endpoint-content');
    let deleteEmptyAssignmentGroupsForm = eContent.querySelector('#delete-empty-assignment-group-form');

    if (!deleteEmptyAssignmentGroupsForm) {
        deleteEmptyAssignmentGroupsForm = document.createElement('form');
        deleteEmptyAssignmentGroupsForm.id = 'delete-empty-assignment-group-form';


        // eContent.innerHTML = `
        //     <div>
        //         <h3>Delete Empty Assignment Groups</h3>
        //     </div>
        // `;

        // const eForm = document.createElement('form');

        deleteEmptyAssignmentGroupsForm.innerHTML = `
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-trash me-2"></i>Delete Empty Assignment Groups
                    </h3>
                    <small class="text-muted">Remove assignment groups that contain no assignments</small>
                </div>
                <div class="card-body">
                    <div class="row g-3 align-items-start">
                        <div class="col-md-4">
                            <label class="form-label fw-bold" for="course-id">
                                <i class="bi bi-book me-1"></i>Course ID
                            </label>
                            <input id="course-id" type="text" class="form-control" 
                                   aria-describedby="input-checker" placeholder="Enter course ID" />
                            <div id="input-checker" class="form-text text-danger d-none">
                                <i class="bi bi-exclamation-triangle me-1"></i>Must only contain numbers
                            </div>
                        </div>
                        <div class="col-md-8 d-flex align-items-end">
                            <div class="d-grid w-100">
                                <button id="action-btn" class="btn btn-warning">
                                    <i class="bi bi-search me-2"></i>Check for Empty Groups
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Progress Card -->
            <div class="card mt-3" id="eag-progress-div" hidden>
                <div class="card-header">
                    <h5 class="card-title mb-0">
                        <i class="bi bi-gear me-2"></i>Checking Assignment Groups
                    </h5>
                </div>
                <div class="card-body">
                    <p id="eag-progress-info" class="mb-2"></p>
                    <div class="progress mb-2" style="height: 15px;">
                        <div class="progress-bar progress-bar-striped progress-bar-animated" 
                             style="width: 0%" role="progressbar" 
                             aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Results Card -->
            <div class="card mt-3" id="eag-response-container-card" hidden>
                <div class="card-body" id="eag-response-container"></div>
            </div>
        `;

        eContent.append(deleteEmptyAssignmentGroupsForm);
    }
    deleteEmptyAssignmentGroupsForm.hidden = false;

    const cID = deleteEmptyAssignmentGroupsForm.querySelector('#course-id');
    cID.addEventListener('change', (e) => {
        e.preventDefault();
        e.stopPropagation();

        checkCourseID(cID, eContent);
    })

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

    // const eResponse = document.createElement('div');
    // eResponse.id = "response-container";
    // eResponse.classList.add('mt-5');
    // eContent.append(eResponse);

    const deagBtn = deleteEmptyAssignmentGroupsForm.querySelector('#action-btn');
    deagBtn.removeEventListener('click', handleCheckBtnClick); // Remove previous event listener if any
    deagBtn.addEventListener('click', handleCheckBtnClick);

    async function handleCheckBtnClick(e) {
        e.stopPropagation();
        e.preventDefault();

        deagBtn.disabled = true;
        console.log('Inside renderer check');

        const eagResponseContainer = deleteEmptyAssignmentGroupsForm.querySelector('#eag-response-container');
        const domain = document.querySelector('#domain').value.trim();
        const apiToken = document.querySelector('#token').value.trim();
        const course = cID.value.trim();
        const eagProgressDiv = deleteEmptyAssignmentGroupsForm.querySelector('#eag-progress-div');
        const eagProgressBar = eagProgressDiv.querySelector('.progress-bar');
        const eagProgressInfo = deleteEmptyAssignmentGroupsForm.querySelector('#eag-progress-info');

        // clean environment
        eagProgressDiv.hidden = false;
        eagProgressBar.parentElement.hidden = true;
        updateProgressWithPercent(eagProgressBar, 0);
        eagProgressInfo.innerHTML = "Checking...";
        eagResponseContainer.innerHTML = '';

        const requestData = {
            domain: domain,
            token: apiToken,
            course: course
        }

        let hasError = false;
        let emptyAssignmentGroups = [];
        try {
            emptyAssignmentGroups = await window.axios.getEmptyAssignmentGroups(requestData);
            eagProgressInfo.innerHTML = 'Done'
        } catch (error) {
            hasError = true;
            errorHandler(error, eagProgressInfo);
        } finally {
            deagBtn.disabled = false;
        }


        if (!hasError) {
            console.log('found emtpy groups', emptyAssignmentGroups.length);

            //const eContent = document.querySelector('#endpoint-content');
            eagResponseContainer.innerHTML = `
                <div>
                    <div class="row align-items-center">
                        <div id="eag-response-details" class="col-auto">
                            <span>Found ${emptyAssignmentGroups.length} empty assignment groups.</span>
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

            const cancelDeagBtn = eagResponseContainer.querySelector('#cancel-btn');
            cancelDeagBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                cID.value = '';
                eagResponseContainer.innerHTML = '';
                deagBtn.disabled = false;
                eagProgressDiv.hidden = true;
                //clearData(courseID, responseContent);
            });

            const removeDeagBtn = eagResponseContainer.querySelector('#remove-btn');
            removeDeagBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                console.log('inside remove');
                removeDeagBtn.disabled = true;
                cancelDeagBtn.disabled = true;

                const eagResponseDetails = eagResponseContainer.querySelector('#eag-response-details');
                eagResponseDetails.innerHTML = ``;

                eagProgressBar.parentElement.hidden = false;
                eagProgressInfo.innerHTML = `Removing empty assignment groups....`;

                const messageData = {
                    url: `https://${domain}/api/v1/courses/${course}/assignment_groups`,
                    token: apiToken,
                    content: emptyAssignmentGroups
                }

                window.progressAPI.onUpdateProgress((progress) => {
                    updateProgressWithPercent(eagProgressBar, progress);
                });

                try {
                    const result = await window.axios.deleteEmptyAssignmentGroups(messageData);

                    // Handle different result structures
                    if (result && typeof result === 'object') {
                        if (result.successful && Array.isArray(result.successful)) {
                            // Structure with successful/failed arrays
                            if (result.successful.length > 0) {
                                eagProgressInfo.innerHTML = `Successfully removed ${result.successful.length} assignment group(s).`
                            }
                            if (result.failed && Array.isArray(result.failed) && result.failed.length > 0) {
                                eagProgressBar.parentElement.hidden = true;
                                eagProgressInfo.innerHTML += `Failed to remove ${result.failed.length} empty assignment group(s)`;
                                errorHandler({ message: `${result.failed[0].reason}` }, eagProgressInfo);
                            }
                        } else if (result.success === true) {
                            // Single success result structure
                            eagProgressInfo.innerHTML = `Successfully removed assignment group.`
                        } else if (Array.isArray(result)) {
                            // Array of results
                            const successCount = result.filter(r => r && (r.success === true || (r.status >= 200 && r.status < 300))).length;
                            const failCount = result.length - successCount;

                            if (successCount > 0) {
                                eagProgressInfo.innerHTML = `Successfully removed ${successCount} assignment group(s).`
                            }
                            if (failCount > 0) {
                                eagProgressBar.parentElement.hidden = true;
                                eagProgressInfo.innerHTML += ` Failed to remove ${failCount} assignment group(s).`;
                                const failedResults = result.filter(r => r && r.error);
                                if (failedResults.length > 0) {
                                    errorHandler({ message: failedResults[0].error }, eagProgressInfo);
                                }
                            }
                        } else {
                            // Unknown result structure, show generic success message
                            eagProgressInfo.innerHTML = `Operation completed. Check the result for details.`;
                        }
                    } else {
                        eagProgressInfo.innerHTML = `Operation completed, but result structure is unexpected.`;
                    }
                } catch (error) {
                    errorHandler(error, eagProgressInfo);
                } finally {
                    removeDeagBtn.disabled = false;
                    cancelDeagBtn.disabled = false;
                    deagBtn.disabled = false;
                    eagProgressBar.parentElement.hidden = true;
                }
                //const result = await window.axios.deleteTheThings(messageData);
            });
        }
    }
}

function assignmentGroupCreator(e) {
    hideEndpoints(e);
    let emptyGroups = [];

    const eContent = document.querySelector('#endpoint-content');
    let createAssignmentGroupForm = eContent.querySelector('#create-assignment-group-form');

    if (!createAssignmentGroupForm) {
        createAssignmentGroupForm = document.createElement('form');
        createAssignmentGroupForm.id = 'create-assignment-group-form';


        // eContent.innerHTML = `
        //     <div>
        //         <h3>Create Assignment Groups</h3>
        //     </div>
        // `;

        // const eForm = document.createElement('form');

        createAssignmentGroupForm.innerHTML = `
            <div class="card">
                                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-folder-plus me-2"></i>Assignment Group Management
                    </h3>
                    <small class="text-muted">Create multiple assignment groups for organizing assignments</small>
                </div>
                <div class="card-body">
                    <div class="row g-3 align-items-start">
                        <div class="col-md-4">
                            <label class="form-label fw-bold" for="course-id">
                                <i class="bi bi-book me-1"></i>Course ID
                            </label>
                            <input id="course-id" type="text" class="form-control" 
                                   aria-describedby="input-checker" placeholder="Enter course ID" />
                            <div id="input-checker" class="form-text text-danger d-none">
                                <i class="bi bi-exclamation-triangle me-1"></i>Must only contain numbers
                            </div>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label fw-bold" for="assignment-group-number">
                                <i class="bi bi-hash me-1"></i>How Many
                            </label>
                            <input id="assignment-group-number" type="number" class="form-control" 
                                   value="1" min="1" max="50">
                            <div class="form-text text-muted">
                                <i class="bi bi-info-circle me-1"></i>Number of groups to create
                            </div>
                        </div>
                        <div class="col-md-5 d-flex align-items-end">
                            <div class="d-grid w-100">
                                <button id="action-btn" class="btn btn-success">
                                    <i class="bi bi-plus-circle me-2"></i>Create Assignment Groups
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Progress Card -->
            <div class="card mt-3" id="agc-progress-div" hidden>
                <div class="card-header">
                    <h5 class="card-title mb-0">
                        <i class="bi bi-gear me-2"></i>Creating Assignment Groups
                    </h5>
                </div>
                <div class="card-body">
                    <p id="agc-progress-info" class="mb-2"></p>
                    <div class="progress mb-2" style="height: 15px;">
                        <div class="progress-bar progress-bar-striped progress-bar-animated" 
                             style="width: 0%" role="progressbar" 
                             aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Results Card -->
            <div class="card mt-3" id="agc-response-container-card" hidden>
                <div class="card-body" id="agc-response-container"></div>
            </div>
        `;

        eContent.append(createAssignmentGroupForm);
    }
    createAssignmentGroupForm.hidden = false;

    // validate course id
    const cID = eContent.querySelector('#course-id');
    cID.addEventListener('change', (e) => {
        e.preventDefault();
        e.stopPropagation();

        checkCourseID(cID, eContent);
    })

    const agCreateBtn = createAssignmentGroupForm.querySelector('#action-btn');
    agCreateBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        agCreateBtn.disabled = true;

        const domain = document.querySelector('#domain').value.trim();
        const token = document.querySelector('#token').value.trim();
        const courseID = cID.value.trim();
        const number = createAssignmentGroupForm.querySelector('#assignment-group-number').value;
        const agcResponseContainer = createAssignmentGroupForm.querySelector('#agc-response-container');
        const agcProgressDiv = createAssignmentGroupForm.querySelector('#agc-progress-div');
        const agcProgressInfo = createAssignmentGroupForm.querySelector('#agc-progress-info');
        const agcProgressBar = agcProgressDiv.querySelector('.progress-bar');


        agcProgressDiv.hidden = false;
        agcProgressInfo.innerHTML = '';

        const data = {
            domain,
            token,
            course: courseID,
            number
        };

        window.progressAPI.onUpdateProgress((progress) => {
            updateProgressWithPercent(agcProgressBar, progress);
        });

        try {
            const response = await window.axios.createAssignmentGroups(data);
            if (response.successful.length > 0) {
                agcProgressInfo.innerHTML = `Successfully created ${response.successful.length} assignment groups.`;
            }
            if (response.failed.length > 0) {
                agcProgressInfo.innerHTML += `Failed to create ${response.failed.length} assignments.`;
                agcProgressBar.parentElement.hidden = true;
                for (let failure of response.failed) {
                    errorHandler({ message: `${failure.reason}` }, agcProgressInfo);
                }
            }
        } catch (error) {
            agcProgressBar.parentElement.hidden = true;
            errorHandler(error, agcProgressInfo);
        } finally {
            agCreateBtn.disabled = false;
        }
    });
}