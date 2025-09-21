// ****************************************************
//
// AssignmentGroup Endpoints
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
            <div>
                <h3>Delete Empty Assignment Groups</h3>
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
                <div class="col-auto">
                    <button id="action-btn" class="btn btn-primary mt-3">Check</button>
                </div>
            </div>
            <div hidden id="eag-progress-div">
                <p id="eag-progress-info"></p>
                <div class="progress mt-3" style="width: 75%" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
            </div>
            <div id="eag-response-container" class="mt-5">
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

                    if (result.successful.length > 0) {
                        eagProgressInfo.innerHTML = `Successfully removed ${result.successful.length} assignment group(s).`
                    }
                    if (result.failed.length > 0) {
                        eagProgressBar.parentElement.hidden = true;
                        eagProgressInfo.innerHTML += `Failed to remove ${result.failed.length} empty assignment group(s)`;
                        errorHandler({ message: `${result.failed[0].reason}` }, eagProgressInfo);
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
            <div>
                <h3>Create Assignment Groups</h3>
            </div>
            <div class="row align-items-center">
                <div class="col-2">
                    <label class="form-label">Course</label>
                    <input id="course-id" type="text" class="form-control" aria-describedby="input-checker" />
                </div>
                <div class="col-auto" >
                    <span id="input-checker" class="form-text" style="display: none;">Must only contain numbers</span>
                </div>
                <div class="col-2">
                    <label class="form-label">How many</label>
                    <input id="assignment-group-number" type="text" class="form-control" value="1">
                </div>
                <div class="w-100"></div>
                <div class="col-auto">
                    <button id="action-btn" class="btn btn-primary mt-3">create</button>
                </div>
            </div>
            <div hidden id="agc-progress-div">
                <p id="agc-progress-info"></p>
                <div class="progress mt-3" style="width: 75%" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
            </div>
            <div id="agc-response-container" class="mt-5">
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