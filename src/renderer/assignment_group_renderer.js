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
                    <div class="row g-3 mb-3">
                        <div class="col-auto">
                            <label class="form-label fw-bold" for="course-id">
                                <i class="bi bi-book me-1"></i>Course ID
                            </label>
                            <input id="course-id" type="text" class="form-control" 
                                   aria-describedby="input-checker" placeholder="Enter course ID" />
                            <div id="input-checker" class="form-text text-danger d-none">
                                <i class="bi bi-exclamation-triangle me-1"></i>Must only contain numbers
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-auto">
                            <button id="action-btn" class="btn btn-warning">
                                <i class="bi bi-search me-2"></i>Check for Empty Groups
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Progress Card -->
            <div class="card mt-3" id="eag-progress-div" hidden>
                <div class="card-header">
                    <h5 class="card-title mb-0">
                        <i class="bi bi-gear me-2"></i>Processing
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

        // Prevent concurrent check and delete operations
        let isChecking = false;
        let isDeleting = false;

        const deagBtn = deleteEmptyAssignmentGroupsForm.querySelector('#action-btn');
        
        // Get references to progress elements
        const eagProgressDiv = deleteEmptyAssignmentGroupsForm.querySelector('#eag-progress-div');
        const eagProgressInfo = deleteEmptyAssignmentGroupsForm.querySelector('#eag-progress-info');
        const progressCardBody = eagProgressDiv.querySelector('.card-body');
        
        // Add cancel button to progress card
        let cancelDeleteBtn = eagProgressDiv.querySelector('#cancel-delete-btn');
        if (!cancelDeleteBtn) {
            cancelDeleteBtn = document.createElement('button');
            cancelDeleteBtn.id = 'cancel-delete-btn';
            cancelDeleteBtn.className = 'btn btn-warning mt-3';
            cancelDeleteBtn.innerHTML = '<i class="bi bi-x-circle me-2"></i>Cancel Deletion';
            cancelDeleteBtn.hidden = true;
            progressCardBody.appendChild(cancelDeleteBtn);
        }
        
        // Handler for deleting empty assignment groups
        async function handleDeleteClick(e) {
            e.preventDefault();
            e.stopPropagation();

            // Prevent double-click or concurrent executions
            if (isDeleting) {
                console.log('Already deleting empty assignment groups, ignoring duplicate click');
                return;
            }

            console.log('inside remove');
            isDeleting = true;

            const eagResponseContainer = deleteEmptyAssignmentGroupsForm.querySelector('#eag-response-container');
            const eagResponseContainerCard = deleteEmptyAssignmentGroupsForm.querySelector('#eag-response-container-card');
            const eagProgressBar = eagProgressDiv.querySelector('.progress-bar');

            // Hide results card and show progress card with cancel button
            eagResponseContainerCard.hidden = true;
            eagProgressDiv.hidden = false;
            cancelDeleteBtn.hidden = false;
            cancelDeleteBtn.disabled = false;
            deagBtn.disabled = true;
            
            eagProgressBar.parentElement.hidden = false;
            eagProgressInfo.innerHTML = `Deleting empty assignment groups...`;
            eagProgressBar.style.width = '0%';
            eagProgressBar.setAttribute('aria-valuenow', '0');

            const domain = document.querySelector('#domain').value.trim();
            const apiToken = document.querySelector('#token').value.trim();
            const course = cID.value.trim();
            const emptyAssignmentGroups = window.emptyAssignmentGroupsCache || [];

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

                // Hide progress card and show clean results
                eagProgressDiv.hidden = true;
                eagResponseContainerCard.hidden = false;

                // Build clean summary message
                let summaryHTML = '';
                let successCount = 0;
                let failCount = 0;

                // Handle different result structures
                if (result && typeof result === 'object') {
                    if (result.successful && Array.isArray(result.successful)) {
                        // Structure with successful/failed arrays
                        successCount = result.successful.length;
                        failCount = result.failed ? result.failed.length : 0;
                    } else if (result.success === true) {
                        // Single success result structure
                        successCount = 1;
                        failCount = 0;
                    } else if (Array.isArray(result)) {
                        // Array of results
                        successCount = result.filter(r => r && (r.success === true || (r.status >= 200 && r.status < 300))).length;
                        failCount = result.length - successCount;
                    }
                }

                // Create appropriate alert based on results
                if (failCount === 0 && successCount > 0) {
                    summaryHTML = `
                        <div class="alert alert-success" role="alert">
                            <i class="bi bi-check-circle me-2"></i>
                            <strong>Success!</strong> Deleted ${successCount} empty assignment group${successCount !== 1 ? 's' : ''}.
                        </div>
                    `;
                } else if (successCount > 0 && failCount > 0) {
                    summaryHTML = `
                        <div class="alert alert-warning" role="alert">
                            <i class="bi bi-exclamation-triangle me-2"></i>
                            <strong>Partial Success:</strong> Deleted ${successCount} assignment group${successCount !== 1 ? 's' : ''}, but ${failCount} failed.
                        </div>
                    `;
                    // Add error details if available
                    if (result.failed && result.failed.length > 0) {
                        summaryHTML += `
                            <div class="alert alert-danger mt-2" role="alert">
                                <strong>Error:</strong> ${result.failed[0].reason || 'Unknown error'}
                            </div>
                        `;
                    }
                } else if (failCount > 0) {
                    summaryHTML = `
                        <div class="alert alert-danger" role="alert">
                            <i class="bi bi-x-circle me-2"></i>
                            <strong>Error:</strong> Failed to delete assignment groups.
                        </div>
                    `;
                    if (result.failed && result.failed.length > 0) {
                        summaryHTML += `
                            <div class="alert alert-danger mt-2" role="alert">
                                <strong>Details:</strong> ${result.failed[0].reason || 'Unknown error'}
                            </div>
                        `;
                    }
                } else {
                    summaryHTML = `
                        <div class="alert alert-info" role="alert">
                            <i class="bi bi-info-circle me-2"></i>
                            <strong>Operation completed.</strong>
                        </div>
                    `;
                }

                eagResponseContainer.innerHTML = summaryHTML;

            } catch (error) {
                // Hide progress card and show error in results
                eagProgressDiv.hidden = true;
                eagResponseContainerCard.hidden = false;

                let errorHTML = '';
                if (error.message === 'Request cancelled') {
                    errorHTML = `
                        <div class="alert alert-warning" role="alert">
                            <i class="bi bi-exclamation-circle me-2"></i>
                            <strong>Cancelled:</strong> Request cancelled by user.
                        </div>
                    `;
                } else {
                    errorHTML = `
                        <div class="alert alert-danger" role="alert">
                            <i class="bi bi-x-circle me-2"></i>
                            <strong>Error:</strong> ${error.message || 'An error occurred while deleting assignment groups.'}
                        </div>
                    `;
                }

                eagResponseContainer.innerHTML = errorHTML;
            } finally {
                isDeleting = false;
                deagBtn.disabled = false;
                cancelDeleteBtn.hidden = true;
            }
        }

        // Handle cancel deletion button (attached once)
        cancelDeleteBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (!isDeleting || cancelDeleteBtn.disabled) return;
            
            console.log('Cancelling delete empty assignment groups request...');
            
            // Disable button and update UI immediately
            cancelDeleteBtn.disabled = true;
            cancelDeleteBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Cancelling...';
            eagProgressInfo.innerHTML = 'Cancelling...';
            
            try {
                await window.axios.cancelDeleteEmptyAssignmentGroups();
            } catch (error) {
                console.error('Error cancelling request:', error);
                // Only re-enable if the operation is still running
                if (isDeleting) {
                    cancelDeleteBtn.innerHTML = '<i class="bi bi-x-circle me-2"></i>Cancel Deletion';
                    cancelDeleteBtn.disabled = false;
                    eagProgressInfo.innerHTML = 'Deleting empty assignment groups...';
                }
            }
        });
        
        async function handleCheckBtnClick(e) {
            e.stopPropagation();
            e.preventDefault();

            // Prevent double-click or concurrent executions
            if (isChecking) {
                console.log('Already checking for empty assignment groups, ignoring duplicate click');
                return;
            }

            // Set flag and disable button immediately
            isChecking = true;
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
            // Reset flag and re-enable button
            isChecking = false;
            deagBtn.disabled = false;
        }


        if (!hasError) {
            console.log('found emtpy groups', emptyAssignmentGroups.length);

            // Cache the empty groups for the delete handler
            window.emptyAssignmentGroupsCache = emptyAssignmentGroups;

            // Hide progress and show results
            eagProgressDiv.hidden = true;
            const eagResponseContainerCard = deleteEmptyAssignmentGroupsForm.querySelector('#eag-response-container-card');
            eagResponseContainerCard.hidden = false;

            if (emptyAssignmentGroups.length === 0) {
                // No empty groups found
                eagResponseContainer.innerHTML = `
                    <div class="alert alert-success" role="alert">
                        <i class="bi bi-check-circle me-2"></i>
                        <strong>No empty assignment groups found!</strong>
                        <br>All assignment groups in this course contain at least one assignment.
                    </div>
                `;
            } else {
                // Empty groups found - show count and action buttons
                eagResponseContainer.innerHTML = `
                    <div class="alert alert-warning" role="alert">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        <strong>Found ${emptyAssignmentGroups.length} empty assignment group${emptyAssignmentGroups.length !== 1 ? 's' : ''}.</strong>
                        <br>Click "Remove" to permanently delete them.
                    </div>
                    <div class="row g-2 mt-2">
                        <div class="col-auto">
                            <button id="remove-btn" type="button" class="btn btn-danger">
                                <i class="bi bi-trash me-2"></i>Remove
                            </button>
                        </div>
                        <div class="col-auto">
                            <button id="cancel-btn" type="button" class="btn btn-secondary">
                                <i class="bi bi-x-circle me-2"></i>Cancel
                            </button>
                        </div>
                    </div>
                `;

                // Attach event listeners to the newly created buttons
                const cancelDeagBtn = eagResponseContainer.querySelector('#cancel-btn');
                cancelDeagBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    // Clear the results and reset the form
                    cID.value = '';
                    eagResponseContainer.innerHTML = '';
                    deagBtn.disabled = false;
                    eagProgressDiv.hidden = true;
                    eagResponseContainerCard.hidden = true;
                    window.emptyAssignmentGroupsCache = null;
                });

                const removeDeagBtn = eagResponseContainer.querySelector('#remove-btn');
                removeDeagBtn.addEventListener('click', handleDeleteClick);
            } // End of else block for when empty groups are found
        }
        }
        
        deagBtn.addEventListener('click', handleCheckBtnClick);
    } // End of if (!deleteEmptyAssignmentGroupsForm) block - event listeners only added once
    
    deleteEmptyAssignmentGroupsForm.hidden = false;
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
                    <div class="row g-3 mb-3">
                        <div class="col-md-6">
                            <label class="form-label fw-bold" for="course-id">
                                <i class="bi bi-book me-1"></i>Course ID
                            </label>
                            <input id="course-id" type="text" class="form-control" 
                                   aria-describedby="input-checker" placeholder="Enter course ID" />
                            <div id="input-checker" class="form-text text-danger d-none">
                                <i class="bi bi-exclamation-triangle me-1"></i>Must only contain numbers
                            </div>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold" for="assignment-group-number">
                                <i class="bi bi-hash me-1"></i>How Many
                            </label>
                            <input id="assignment-group-number" type="number" class="form-control" 
                                   value="1" min="1" max="50">
                            <div class="form-text text-muted">
                                <i class="bi bi-info-circle me-1"></i>Number of groups to create
                            </div>
                        </div>
                    </div>
                    
                    <div class="row g-3 mb-4">
                        <div class="col-md-12">
                            <label class="form-label fw-bold" for="assignment-group-name">
                                <i class="bi bi-tag me-1"></i>Assignment Group Name
                            </label>
                            <input id="assignment-group-name" type="text" class="form-control" 
                                   placeholder="e.g., Homework, Quizzes, Labs" />
                            <div class="form-text text-muted">
                                <i class="bi bi-info-circle me-1"></i>Name for the assignment group(s)
                            </div>
                        </div>
                    </div>
                    
                    <div class="row g-2">
                        <div class="col-auto">
                            <button id="action-btn" class="btn btn-success">
                                <i class="bi bi-plus-circle me-2"></i>Create Assignment Groups
                            </button>
                        </div>
                        <div class="col-auto">
                            <button id="cancel-btn" class="btn btn-secondary">
                                <i class="bi bi-x-circle me-2"></i>Cancel
                            </button>
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

        // validate course id
        const cID = createAssignmentGroupForm.querySelector('#course-id');
        cID.addEventListener('change', (e) => {
            e.preventDefault();
            e.stopPropagation();

            checkCourseID(cID, eContent);
        })

        // Prevent concurrent executions
        let isCreating = false;

        const agCreateBtn = createAssignmentGroupForm.querySelector('#action-btn');
        const agCancelBtn = createAssignmentGroupForm.querySelector('#cancel-btn');
        
        // Function to validate domain and token and enable/disable create button
        function validateFormInputs() {
            const domain = document.querySelector('#domain').value.trim();
            const token = document.querySelector('#token').value.trim();
            
            if (domain === '' || token === '') {
                agCreateBtn.disabled = true;
            } else {
                agCreateBtn.disabled = false;
            }
        }
        
        // Initial validation check
        validateFormInputs();
        
        // Add event listeners to domain and token fields
        const domainField = document.querySelector('#domain');
        const tokenField = document.querySelector('#token');
        
        domainField.addEventListener('input', validateFormInputs);
        tokenField.addEventListener('input', validateFormInputs);
        agCreateBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Prevent double-click or concurrent executions
            if (isCreating) {
                console.log('Already creating assignment groups, ignoring duplicate click');
                return;
            }

            // Set flag and disable button immediately
            isCreating = true;
            agCreateBtn.disabled = true;
            
            // Enable cancel button during operation
            agCancelBtn.disabled = false;

        const domain = document.querySelector('#domain').value.trim();
        const token = document.querySelector('#token').value.trim();
        const courseID = cID.value.trim();
        const number = createAssignmentGroupForm.querySelector('#assignment-group-number').value;
        const groupName = createAssignmentGroupForm.querySelector('#assignment-group-name').value.trim();
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
            number,
            name: groupName || 'Assignment Group' // Default name if not provided
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
            if (error.message === 'Request cancelled') {
                agcProgressInfo.innerHTML = 'Request cancelled by user.';
            } else {
                errorHandler(error, agcProgressInfo);
            }
        } finally {
            // Reset flag and re-enable button
            isCreating = false;
            agCreateBtn.disabled = false;
            agCancelBtn.disabled = true;
        }
    });

    // Cancel button handler - abort ongoing requests
    agCancelBtn.disabled = true; // Initially disabled until a request starts
    agCancelBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Cancel the ongoing request if one exists
        if (isCreating) {
            console.log('Cancelling assignment group creation request...');
            
            const agcProgressInfo = createAssignmentGroupForm.querySelector('#agc-progress-info');
            if (agcProgressInfo) {
                agcProgressInfo.innerHTML = 'Cancelling request...';
            }
            
            // Disable cancel button immediately
            agCancelBtn.disabled = true;
            
            try {
                await window.axios.cancelCreateAssignmentGroups();
            } catch (error) {
                console.error('Error cancelling request:', error);
            }
        }
    });
    } // End of if (!createAssignmentGroupForm) block - event listeners only added once
    
    createAssignmentGroupForm.hidden = false;
}