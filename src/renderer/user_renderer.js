// ****************************************
//
// User endpoints
//
// ****************************************
function userTemplate(e) {
    switch (e.target.id) {
        case 'page-view':
            getPageViews(e);
            break;
        case 'user-notifications':
            userNotifications(e);
            break;
        default:
            break;
    }
}

async function getPageViews(e) {
    hideEndpoints(e)

    const eContent = document.querySelector('#endpoint-content');
    let getPageViewsForm = eContent.querySelector('#get-page-views-form');

    if (!getPageViewsForm) {

        getPageViewsForm = document.createElement('form');
        getPageViewsForm.id = 'get-page-views-form';
        // eContent.innerHTML = `
        //     <div>
        //         <h3>Get User Page Views</h3>
        //     </div>
        //     <hr />
        //     `;

        // const eForm = document.createElement('form');

        getPageViewsForm.innerHTML = `
            <div class="card">
                <div class="card-header bg-primary text-white">
                    <h3 class="card-title mb-0">
                        <i class="fas fa-chart-line me-2"></i>Get User Page Views
                    </h3>
                    <small class="text-light">Retrieve page view data for users with flexible input options</small>
                </div>
                <div class="card-body">
                    <!-- Input Type Selection -->
                    <div class="row g-3 mb-4">
                        <div class="col-12">
                            <label class="form-label fw-bold">
                                <i class="fas fa-list me-1"></i>Input Method
                            </label>
                            <div class="btn-group w-100" role="group" aria-label="Input type selection">
                                <input type="radio" class="btn-check" name="input-type" id="single-user" value="single" checked>
                                <label class="btn btn-outline-primary" for="single-user">
                                    <i class="fas fa-user me-1"></i>Single User
                                </label>
                                
                                <input type="radio" class="btn-check" name="input-type" id="multi-user" value="multi">
                                <label class="btn btn-outline-primary" for="multi-user">
                                    <i class="fas fa-users me-1"></i>Multiple Users
                                </label>
                                
                                <input type="radio" class="btn-check" name="input-type" id="file-upload" value="file">
                                <label class="btn btn-outline-primary" for="file-upload">
                                    <i class="fas fa-upload me-1"></i>File Upload
                                </label>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Single User Input -->
                    <div class="row g-3 mb-4" id="single-user-section">
                        <div class="col-md-6">
                            <label class="form-label fw-bold" for="user-id">
                                <i class="fas fa-user me-1"></i>Canvas User ID
                            </label>
                            <input type="text" id="user-id" class="form-control" 
                                   placeholder="Enter user ID (e.g., 12345)" aria-describedby="input-checker">
                            <div id="input-checker" class="form-text text-danger d-none">
                                <i class="fas fa-exclamation-triangle me-1"></i>Must only contain numbers
                            </div>
                        </div>
                    </div>
                    
                    <!-- Multi User Input -->
                    <div class="row g-3 mb-4 d-none" id="multi-user-section">
                        <div class="col-md-8">
                            <label class="form-label fw-bold" for="user-ids">
                                <i class="fas fa-users me-1"></i>Canvas User IDs
                            </label>
                            <textarea id="user-ids" class="form-control" rows="4" 
                                      placeholder="Enter user IDs separated by commas (e.g., 12345, 67890, 11111)"></textarea>
                            <div id="multi-input-checker" class="form-text text-danger d-none">
                                <i class="fas fa-exclamation-triangle me-1"></i>Please enter valid user IDs separated by commas
                            </div>
                            <div class="form-text text-muted">
                                <i class="fas fa-info-circle me-1"></i>
                                Enter multiple user IDs separated by commas. Spaces are automatically removed.
                            </div>
                        </div>
                    </div>
                    
                    <!-- File Upload Input -->
                    <div class="row g-3 mb-4 d-none" id="file-upload-section">
                        <div class="col-md-6">
                            <label class="form-label fw-bold" for="user-file">
                                <i class="fas fa-file-csv me-1"></i>User IDs File
                            </label>
                            <input type="file" id="user-file" class="form-control" accept=".csv,.txt">
                            <div id="file-input-checker" class="form-text text-danger d-none">
                                <i class="fas fa-exclamation-triangle me-1"></i>Please select a valid CSV or TXT file
                            </div>
                            <div id="file-user-count" class="form-text text-success d-none">
                                <i class="fas fa-check-circle me-1"></i>
                                <span id="file-user-count-text"></span>
                            </div>
                            <div class="form-text text-muted">
                                <i class="fas fa-info-circle me-1"></i>
                                Upload a CSV or TXT file with user IDs. Supports: plain user IDs (one per line or comma-separated), or Canvas user URLs containing "/users/ID".
                            </div>
                        </div>
                    </div>
                    
                    <!-- Date Range -->
                    <div class="row g-3 mb-4">
                        <div class="col-md-3">
                            <label class="form-label fw-bold" for="start-date">
                                <i class="fas fa-calendar-alt me-1"></i>Start Date
                            </label>
                            <input id="start-date" type="date" class="form-control">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label fw-bold" for="end-date">
                                <i class="fas fa-calendar-alt me-1"></i>End Date
                            </label>
                            <input id="end-date" type="date" class="form-control">
                        </div>
                        <div class="col-md-6 d-flex align-items-end">
                            <div class="form-text text-muted">
                                <i class="fas fa-info-circle me-1"></i>
                                Leave dates blank to get all available page views
                            </div>
                        </div>
                    </div>
                    
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <div class="d-grid">
                                <button type="button" class="btn btn-success" id="action-btn">
                                    <i class="fas fa-search me-2"></i>Get Page Views
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
                        <i class="fas fa-cog fa-spin me-2"></i>Processing Page Views
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
                <div class="card-body" id="response-container"></div>
            </div>
            `;

        eContent.append(getPageViewsForm);
    }
    getPageViewsForm.hidden = false;

    const uID = getPageViewsForm.querySelector('#user-id');
    const userIds = getPageViewsForm.querySelector('#user-ids');
    const userFile = getPageViewsForm.querySelector('#user-file');
    const inputChecker = getPageViewsForm.querySelector('#input-checker');
    const multiInputChecker = getPageViewsForm.querySelector('#multi-input-checker');
    const fileInputChecker = getPageViewsForm.querySelector('#file-input-checker');
    const resultsCard = getPageViewsForm.querySelector('#results-card');
    const progressCard = getPageViewsForm.querySelector('#progress-card');
    const progressBar = getPageViewsForm.querySelector('#progress-bar');
    const progressInfo = getPageViewsForm.querySelector('#progress-info');
    const progressDetail = getPageViewsForm.querySelector('#progress-detail');

    // Input type sections
    const singleUserSection = getPageViewsForm.querySelector('#single-user-section');
    const multiUserSection = getPageViewsForm.querySelector('#multi-user-section');
    const fileUploadSection = getPageViewsForm.querySelector('#file-upload-section');

    // Track validation attempts
    let hasAttemptedSubmit = false;
    const touchedFields = new Set();
    let currentInputType = 'single';

    // Input type switching
    const inputTypeRadios = getPageViewsForm.querySelectorAll('input[name="input-type"]');
    inputTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentInputType = e.target.value;
            switchInputType(currentInputType);
        });
    });

    function switchInputType(type) {
        // Hide all sections
        singleUserSection.classList.add('d-none');
        multiUserSection.classList.add('d-none');
        fileUploadSection.classList.add('d-none');

        // Clear validation states
        clearValidationStates();

        // Show appropriate section
        switch (type) {
            case 'single':
                singleUserSection.classList.remove('d-none');
                break;
            case 'multi':
                multiUserSection.classList.remove('d-none');
                break;
            case 'file':
                fileUploadSection.classList.remove('d-none');
                break;
        }
    }

    function clearValidationStates() {
        uID.classList.remove('is-invalid');
        userIds.classList.remove('is-invalid');
        userFile.classList.remove('is-invalid');
        inputChecker.classList.add('d-none');
        multiInputChecker.classList.add('d-none');
        fileInputChecker.classList.add('d-none');
        touchedFields.clear();
        hasAttemptedSubmit = false;
    }

    function validateSingleUser(showErrors = false) {
        const trimmedValue = uID.value.trim();
        const isEmpty = trimmedValue === '';
        const isValid = !isEmpty && /^\d+$/.test(trimmedValue);

        const showError = showErrors &&
            (hasAttemptedSubmit || touchedFields.has('user-id')) &&
            !isEmpty &&
            !isValid;

        uID.classList.toggle('is-invalid', showError);
        inputChecker.classList.toggle('d-none', !showError);

        return isValid;
    }

    function validateMultiUser(showErrors = false) {
        const trimmedValue = userIds.value.trim();
        const isEmpty = trimmedValue === '';

        if (isEmpty) {
            const showError = showErrors && (hasAttemptedSubmit || touchedFields.has('user-ids'));
            userIds.classList.toggle('is-invalid', showError);
            multiInputChecker.classList.toggle('d-none', !showError);
            return false;
        }

        // Parse and validate user IDs
        const ids = trimmedValue.split(',').map(id => id.trim()).filter(id => id.length > 0);
        const allValid = ids.every(id => /^\d+$/.test(id));

        const showError = showErrors &&
            (hasAttemptedSubmit || touchedFields.has('user-ids')) &&
            !allValid;

        userIds.classList.toggle('is-invalid', showError);
        multiInputChecker.classList.toggle('d-none', !showError);

        return allValid && ids.length > 0;
    }

    function validateFileUpload(showErrors = false) {
        const hasFile = userFile.files && userFile.files.length > 0;

        const showError = showErrors &&
            (hasAttemptedSubmit || touchedFields.has('user-file')) &&
            !hasFile;

        userFile.classList.toggle('is-invalid', showError);
        fileInputChecker.classList.toggle('d-none', !showError);

        return hasFile;
    }

    function validateCurrentInput(showErrors = false) {
        switch (currentInputType) {
            case 'single':
                return validateSingleUser(showErrors);
            case 'multi':
                return validateMultiUser(showErrors);
            case 'file':
                return validateFileUpload(showErrors);
            default:
                return false;
        }
    }

    // Event listeners for validation
    uID.addEventListener('blur', () => {
        touchedFields.add('user-id');
        validateSingleUser(true);
    });

    uID.addEventListener('input', () => {
        validateSingleUser(false);
    });

    userIds.addEventListener('blur', () => {
        touchedFields.add('user-ids');
        validateMultiUser(true);
    });

    userIds.addEventListener('input', () => {
        validateMultiUser(false);
    });

    userFile.addEventListener('change', async () => {
        touchedFields.add('user-file');

        const fileUserCount = getPageViewsForm.querySelector('#file-user-count');
        const fileUserCountText = getPageViewsForm.querySelector('#file-user-count-text');

        // Hide user count display initially
        fileUserCount.classList.add('d-none');

        if (userFile.files && userFile.files.length > 0) {
            try {
                const userIdsList = await parseUserFile(userFile.files[0]);
                const userCount = userIdsList.length;

                if (userCount > 0) {
                    fileUserCountText.textContent = `Successfully parsed ${userCount} unique user ID${userCount !== 1 ? 's' : ''} from file`;
                    fileUserCount.classList.remove('d-none');
                }
            } catch (error) {
                console.error('Error parsing file:', error);
                // Will show validation error through normal validation
            }
        }

        validateFileUpload(true);
    });

    const searchBtn = getPageViewsForm.querySelector('#action-btn');
    searchBtn.addEventListener('click', async function (e) {
        e.stopPropagation();
        e.preventDefault();

        // Mark that submit has been attempted
        hasAttemptedSubmit = true;

        if (!validateCurrentInput(true)) {
            return;
        }

        console.log('renderer.js > getPageViews > searchBtn');

        const domain = document.querySelector('#domain').value.trim();
        const apiToken = document.querySelector('#token').value.trim();
        const startDate = getPageViewsForm.querySelector('#start-date').value;
        const endDate = getPageViewsForm.querySelector('#end-date').value;
        const responseContainer = getPageViewsForm.querySelector('#response-container');

        if (!domain || !apiToken) {
            showError('Please configure your Canvas domain and API token first.');
            return;
        }

        // Collect user IDs based on input type
        let userIdsList = [];

        try {
            switch (currentInputType) {
                case 'single':
                    userIdsList = [parseInt(uID.value.trim())];
                    break;
                case 'multi':
                    userIdsList = userIds.value.trim()
                        .split(',')
                        .map(id => parseInt(id.trim()))
                        .filter(id => !isNaN(id));
                    break;
                case 'file':
                    userIdsList = await parseUserFile(userFile.files[0]);
                    break;
            }
        } catch (error) {
            showError(`Error processing user IDs: ${error.message}`);
            return;
        }

        if (userIdsList.length === 0) {
            showError('No valid user IDs found to process.');
            return;
        }

        // Disable form and show progress
        searchBtn.disabled = true;
        progressCard.hidden = false;
        resultsCard.hidden = true;

        const isSingleUser = userIdsList.length === 1 && currentInputType !== 'file';
        const progressText = isSingleUser ? 'user' : `${userIdsList.length} users`;

        progressInfo.innerHTML = `<i class=\"fas fa-cog fa-spin me-2\"></i>Processing page views for ${progressText}...`;
        progressDetail.textContent = 'Initializing requests...';
        progressBar.style.width = '0%';
        progressBar.setAttribute('aria-valuenow', '0');

        // Listen for progress updates for both single and multiple users
        let progressListener;
        progressListener = (event, progressData) => {
            const { currentUser, totalUsers, userId, percentage, completed, starting, error, fetchingPage, pageCompleted, currentPage, totalRecords } = progressData;

            if (completed) {
                progressInfo.innerHTML = '<i class="fas fa-check-circle text-success me-2"></i>Operation completed!';
                progressDetail.textContent = 'Processing results...';
                progressBar.style.width = '100%';
                progressBar.setAttribute('aria-valuenow', '100');
            } else if (starting) {
                // When starting a user, show current status but don't update progress bar yet
                const userText = isSingleUser ? 'user' : `user ${userId} (${currentUser}/${totalUsers})`;
                progressInfo.innerHTML = `<i class="fas fa-search me-2"></i>Getting page views for ${userText}`;
                progressDetail.textContent = isSingleUser ? 'Initializing requests to Canvas API...' : `Processing user ${currentUser} of ${totalUsers}...`;
                // Keep current progress bar percentage (don't update until user completes)
            } else if (fetchingPage) {
                // Show spinning indicator during page fetch for single user
                if (isSingleUser) {
                    progressInfo.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i>Fetching page ${currentPage} of page views`;
                    progressDetail.textContent = `Retrieved ${totalRecords} records so far...`;
                } else {
                    const userText = `user ${userId} (${currentUser}/${totalUsers})`;
                    progressInfo.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i>Fetching page views for ${userText}`;
                    progressDetail.textContent = `Processing page ${currentPage}, ${totalRecords} records retrieved...`;
                }
            } else if (pageCompleted) {
                // Show completion of a page fetch for single user
                if (isSingleUser) {
                    progressInfo.innerHTML = `<i class="fas fa-download me-2"></i>Retrieved ${totalRecords} page view records`;
                    progressDetail.textContent = `Completed fetching page ${currentPage - 1}...`;
                } else {
                    const userText = `user ${userId} (${currentUser}/${totalUsers})`;
                    progressInfo.innerHTML = `<i class="fas fa-download me-2"></i>Retrieved data for ${userText}`;
                    progressDetail.textContent = `${totalRecords} page view records collected...`;
                }
            } else {
                // When user completes, update progress bar and show next status
                progressBar.style.width = `${percentage}%`;
                progressBar.setAttribute('aria-valuenow', percentage.toString());

                if (error) {
                    const userText = isSingleUser ? 'user' : `user ${userId} (${currentUser}/${totalUsers})`;
                    progressInfo.innerHTML = `<i class="fas fa-exclamation-triangle text-warning me-2"></i>Error getting page views for ${userText}`;
                    progressDetail.textContent = isSingleUser ? 'Request failed' : `Failed user ${currentUser} of ${totalUsers}, continuing...`;
                } else {
                    const userText = isSingleUser ? 'user' : `user ${userId} (${currentUser}/${totalUsers})`;
                    progressInfo.innerHTML = `<i class="fas fa-check text-success me-2"></i>Completed ${userText}`;
                    progressDetail.textContent = isSingleUser ? 'Request completed successfully' : `Finished user ${currentUser} of ${totalUsers}...`;
                }
            }
        };

        window.electronAPI.onPageViewsProgress(progressListener);

        try {
            const searchData = {
                domain: domain,
                token: apiToken,
                userIds: userIdsList,
                start: startDate,
                end: endDate,
                isBulk: !isSingleUser
            };

            const response = await window.axios.getPageViews(searchData);

            // Show results
            setTimeout(() => {
                progressCard.hidden = true;
                showResults(response, userIdsList.length, isSingleUser);
            }, 1000);

        } catch (error) {
            progressCard.hidden = true;
            showError(error?.message || String(error));
        } finally {
            // Clean up progress listener
            if (progressListener) {
                window.electronAPI.removePageViewsProgressListener(progressListener);
            }
            searchBtn.disabled = false;
        }
    });

    async function parseUserFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    const content = e.target.result;
                    const lines = content.split(/\r?\n/);
                    const userIds = [];

                    lines.forEach(line => {
                        // Check if line contains a Canvas user URL pattern
                        const urlMatch = line.match(/\/users\/(\d+)/);
                        if (urlMatch) {
                            // Extract user ID from URL
                            const userId = parseInt(urlMatch[1]);
                            if (!isNaN(userId)) {
                                userIds.push(userId);
                            }
                        } else {
                            // Handle both comma-separated and line-separated formats (legacy support)
                            const ids = line.split(',').map(id => id.trim()).filter(id => id.length > 0);
                            ids.forEach(id => {
                                if (/^\d+$/.test(id)) {
                                    userIds.push(parseInt(id));
                                }
                            });
                        }
                    });

                    resolve([...new Set(userIds)]); // Remove duplicates
                } catch (error) {
                    reject(new Error('Failed to parse user file. Please ensure it contains valid user IDs or Canvas user URLs.'));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file.'));
            reader.readAsText(file);
        });
    }

    function showResults(response, totalUsers, isSingleUser) {
        resultsCard.hidden = false;
        const responseContainer = getPageViewsForm.querySelector('#response-container');

        if (response === 'cancelled') {
            responseContainer.innerHTML = `
                <div class="alert alert-warning" role="alert">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Page views found, but saving was cancelled.
                </div>
            `;
        } else if (response && response.success) {
            const downloadType = isSingleUser ? 'CSV file' : (response.isZipped ? 'ZIP file' : 'CSV file');
            responseContainer.innerHTML = `
                <div class="alert alert-success" role="alert">
                    <h5 class="alert-heading">
                        <i class="fas fa-check-circle me-2"></i>Success!
                    </h5>
                    <p class="mb-2">
                        Page views successfully processed for <strong>${totalUsers}</strong> user${totalUsers !== 1 ? 's' : ''}.
                    </p>
                    <hr>
                    <div class="d-flex align-items-center">
                        <i class="fas fa-download me-2"></i>
                        <span>Your ${downloadType} is ready for download.</span>
                    </div>
                </div>
            `;
        } else if (response && !response.success) {
            responseContainer.innerHTML = `
                <div class="alert alert-info" role="alert">
                    <i class="fas fa-info-circle me-2"></i>
                    No page views found for the specified user${totalUsers !== 1 ? 's' : ''} and date range.
                </div>
            `;
        } else {
            responseContainer.innerHTML = `
                <div class="alert alert-info" role="alert">
                    <i class="fas fa-info-circle me-2"></i>
                    No page views found for the specified criteria.
                </div>
            `;
        }
    }

    function showError(message) {
        resultsCard.hidden = false;
        const responseContainer = getPageViewsForm.querySelector('#response-container');
        responseContainer.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <h5 class="alert-heading">
                    <i class="fas fa-exclamation-triangle me-2"></i>Error
                </h5>
                <p class="mb-0">${message}</p>
            </div>
        `;
    }
}

function userNotifications(e) {
    hideEndpoints(e);

    const eContent = document.querySelector('#endpoint-content');
    let userNotificationsForm = eContent.querySelector('#user-notifications-form');

    if (!userNotificationsForm) {
        userNotificationsForm = document.createElement('form');
        userNotificationsForm.id = 'user-notifications-form';

        userNotificationsForm.innerHTML = `
            <div class="card">
                <div class="card-header bg-primary text-white">
                    <h3 class="card-title mb-0">
                        <i class="fas fa-bell me-2"></i>User Notification Preferences
                    </h3>
                    <small class="text-light">Enable or disable all notifications for a user across all communication channels</small>
                </div>
                <div class="card-body">
                    <div class="row g-3 mb-4">
                        <div class="col-md-6">
                            <label class="form-label fw-bold" for="user-id">
                                <i class="fas fa-user me-1"></i>Canvas User ID
                            </label>
                            <input type="text" id="user-id" class="form-control" 
                                   placeholder="Enter user ID (e.g., 12345)" aria-describedby="user-input-checker">
                            <div id="user-input-checker" class="form-text text-danger d-none">
                                <i class="fas fa-exclamation-triangle me-1"></i>Must only contain numbers
                            </div>
                        </div>
                        <div class="col-md-6 d-flex align-items-end">
                            <div class="d-grid w-100">
                                <button type="button" class="btn btn-outline-primary" id="fetch-comm-channels-btn" disabled>
                                    <i class="fas fa-download me-2"></i>Fetch Communication Channels
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row g-3 mb-4">
                        <div class="col-md-8">
                            <label class="form-label fw-bold" for="comm-channel-select">
                                <i class="fas fa-envelope me-1"></i>Communication Channel
                            </label>
                            <select id="comm-channel-select" class="form-select" disabled>
                                <option value="">Select a communication channel...</option>
                            </select>
                            <div class="form-text text-muted">
                                <i class="fas fa-info-circle me-1"></i>
                                Choose from fetched channels or enter manually below
                            </div>
                        </div>
                    </div>
                    
                    <div class="row g-3 mb-4">
                        <div class="col-md-6">
                            <label class="form-label fw-bold" for="comm-channel-id">
                                <i class="fas fa-hashtag me-1"></i>Communication Channel ID
                            </label>
                            <input type="text" id="comm-channel-id" class="form-control" 
                                   placeholder="Enter channel ID manually" aria-describedby="comm-input-checker">
                            <div id="comm-input-checker" class="form-text text-danger d-none">
                                <i class="fas fa-exclamation-triangle me-1"></i>Must only contain numbers
                            </div>
                            <div class="form-text text-muted">
                                <i class="fas fa-info-circle me-1"></i>
                                Usually the user's email communication channel
                            </div>
                        </div>
                    </div>
                    
                    <div class="row g-3 mb-4">
                        <div class="col-md-3">
                            <div class="d-grid">
                                <button type="button" class="btn btn-success" id="enable-all-btn">
                                    <i class="fas fa-bell me-2"></i>Enable All Notifications
                                </button>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="d-grid">
                                <button type="button" class="btn btn-danger" id="disable-all-btn">
                                    <i class="fas fa-bell-slash me-2"></i>Disable All Notifications
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Progress Card -->
            <div class="card mt-3" id="notifications-progress-card" hidden>
                <div class="card-header">
                    <h5 class="card-title mb-0">
                        <i class="fas fa-cog fa-spin me-2"></i>Updating Notifications
                    </h5>
                </div>
                <div class="card-body">
                    <p id="notifications-progress-info" class="mb-2"></p>
                    <div class="progress mb-2" style="height: 15px;">
                        <div class="progress-bar progress-bar-striped progress-bar-animated" 
                             style="width: 0%" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Results Card -->
            <div class="card mt-3" id="notifications-results-card" hidden>
                <div class="card-body" id="notifications-response-container"></div>
            </div>
        `;

        eContent.append(userNotificationsForm);
    }
    userNotificationsForm.hidden = false;

    const userID = userNotificationsForm.querySelector('#user-id');
    const commChannelID = userNotificationsForm.querySelector('#comm-channel-id');
    const commChannelSelect = userNotificationsForm.querySelector('#comm-channel-select');
    const fetchCommChannelsBtn = userNotificationsForm.querySelector('#fetch-comm-channels-btn');
    const enableAllBtn = userNotificationsForm.querySelector('#enable-all-btn');
    const disableAllBtn = userNotificationsForm.querySelector('#disable-all-btn');
    const progressCard = userNotificationsForm.querySelector('#notifications-progress-card');
    const progressInfo = userNotificationsForm.querySelector('#notifications-progress-info');
    const progressBar = userNotificationsForm.querySelector('.progress-bar');
    const resultsCard = userNotificationsForm.querySelector('#notifications-results-card');
    const responseContainer = userNotificationsForm.querySelector('#notifications-response-container');

    // Track validation attempts
    let hasAttemptedSubmitNotifications = false;
    const touchedNotificationFields = new Set();

    function validateUserIDNotifications(showErrors = false) {
        const userChecker = userNotificationsForm.querySelector('#user-input-checker');
        const trimmedValue = userID.value.trim();
        const isEmpty = trimmedValue === '';
        const isValid = !isEmpty && /^\d+$/.test(trimmedValue);

        const showError = showErrors &&
            (hasAttemptedSubmitNotifications || touchedNotificationFields.has('user-id')) &&
            !isEmpty &&
            !isValid;

        userID.classList.toggle('is-invalid', showError);
        userChecker.classList.toggle('d-none', !showError);

        return isValid;
    }

    function validateCommChannelIDNotifications(showErrors = false) {
        const commChecker = userNotificationsForm.querySelector('#comm-input-checker');
        const trimmedValue = commChannelID.value.trim();
        const isEmpty = trimmedValue === '';
        const isValid = !isEmpty && /^\d+$/.test(trimmedValue);

        const showError = showErrors &&
            (hasAttemptedSubmitNotifications || touchedNotificationFields.has('comm-channel-id')) &&
            !isEmpty &&
            !isValid;

        commChannelID.classList.toggle('is-invalid', showError);
        commChecker.classList.toggle('d-none', !showError);

        return isValid;
    }

    // Input validation with smart error handling
    userID.addEventListener('blur', () => {
        touchedNotificationFields.add('user-id');
        validateUserIDNotifications(true);
        updateButtonStates();
        updateFetchButtonState();
        clearCommChannelsWhenUserChanges();
    });

    userID.addEventListener('input', () => {
        validateUserIDNotifications(false);
        updateButtonStates();
        updateFetchButtonState();
        clearCommChannelsWhenUserChanges();
    });

    commChannelID.addEventListener('blur', () => {
        touchedNotificationFields.add('comm-channel-id');
        validateCommChannelIDNotifications(true);
        updateButtonStates();
    });

    commChannelID.addEventListener('input', () => {
        validateCommChannelIDNotifications(false);
        updateButtonStates();
    });

    // Communication channel dropdown change handler
    commChannelSelect.addEventListener('change', (e) => {
        const selectedValue = e.target.value;
        if (selectedValue) {
            commChannelID.value = selectedValue;
            validateCommChannelIDNotifications(false);
            updateButtonStates();
        }
    });

    // Fetch communication channels button handler
    fetchCommChannelsBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await fetchCommunicationChannels();
    });

    function validateUserID() {
        return validateUserIDNotifications(false);
    }

    function validateCommChannelID() {
        return validateCommChannelIDNotifications(false);
    }

    function updateButtonStates() {
        const userValid = userID.value.trim().length > 0 && /^\d+$/.test(userID.value.trim());
        const commValid = commChannelID.value.trim().length > 0 && /^\d+$/.test(commChannelID.value.trim());
        const bothValid = userValid && commValid;

        enableAllBtn.disabled = !bothValid;
        disableAllBtn.disabled = !bothValid;

        // Ensure user ID field is never disabled
        userID.disabled = false;
    }

    function updateFetchButtonState() {
        const userValid = userID.value.trim().length > 0 && /^\d+$/.test(userID.value.trim());
        fetchCommChannelsBtn.disabled = !userValid;

        // Ensure user ID field is never disabled
        userID.disabled = false;
    } function clearCommChannelsWhenUserChanges() {
        // Clear the dropdown and reset it to default state when user ID changes
        commChannelSelect.innerHTML = '<option value="">Select a communication channel...</option>';
        commChannelSelect.disabled = true;
        commChannelID.value = ''; // Also clear the manual input field
        updateButtonStates(); // Update button states since comm channel is now empty
    }

    async function fetchCommunicationChannels() {
        const user = userID.value.trim();
        const domain = document.querySelector('#domain').value;
        const token = document.querySelector('#token').value;

        if (!user || !domain || !token) {
            alert('Please ensure all required fields are filled.');
            return;
        }

        // Check if axios is available
        if (!window.axios || !window.axios.getCommChannels) {
            console.error('axios or getCommChannels function not available');
            alert('Error: Communication functions not yet loaded. Please try again in a moment.');
            return;
        }

        try {
            fetchCommChannelsBtn.disabled = true;
            fetchCommChannelsBtn.innerHTML = 'Fetching...';

            const response = await window.axios.getCommChannels({
                domain,
                token,
                user
            });

            if (response.success) {
                populateCommChannelDropdown(response.data);
            } else {
                throw new Error(response.error || 'Failed to fetch communication channels');
            }
        } catch (error) {
            console.error('Error fetching communication channels:', error);
            alert(`Error fetching communication channels: ${error.message}`);
        } finally {
            fetchCommChannelsBtn.disabled = false;
            fetchCommChannelsBtn.innerHTML = 'Fetch Comm Channels';
            updateFetchButtonState();
            // Ensure user ID field remains enabled and editable
            userID.disabled = false;
        }
    }

    function populateCommChannelDropdown(channels) {
        // Clear existing options except the first one
        commChannelSelect.innerHTML = '<option value="">Select a communication channel...</option>';

        if (channels && channels.length > 0) {
            channels.forEach(channel => {
                const option = document.createElement('option');
                option.value = channel.id;
                option.textContent = `${channel.type}: ${channel.address} (ID: ${channel.id})`;
                commChannelSelect.appendChild(option);
            });
            commChannelSelect.disabled = false;
        } else {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No communication channels found';
            commChannelSelect.appendChild(option);
            commChannelSelect.disabled = true;
        }
    }

    // Initially disable buttons and ensure user ID field is enabled
    updateButtonStates();
    updateFetchButtonState();

    // Explicitly ensure user ID field is enabled and editable
    userID.disabled = false;
    userID.readOnly = false;

    // Enable All Notifications button handler
    enableAllBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await handleNotificationUpdate('immediately', 'enabled');
    });

    // Disable All Notifications button handler
    disableAllBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await handleNotificationUpdate('never', 'disabled');
    });

    async function handleNotificationUpdate(frequency, action) {
        const domain = document.querySelector('#domain').value.trim();
        const apiToken = document.querySelector('#token').value.trim();
        const user = userID.value.trim();
        const commChannel = commChannelID.value.trim();

        // Disable buttons during processing
        enableAllBtn.disabled = true;
        disableAllBtn.disabled = true;

        // Show progress
        progressCard.hidden = false;
        resultsCard.hidden = true;
        progressInfo.innerHTML = `${action === 'enabled' ? 'Enabling' : 'Disabling'} all notifications...`;
        updateProgressWithPercent(progressBar, 0);

        const requestData = {
            domain: domain,
            token: apiToken,
            user: user,
            commChannel: commChannel,
            frequency: frequency
        };

        try {
            const response = await window.axios.updateNotifications(requestData);

            if (response.success) {
                progressInfo.innerHTML = `Successfully ${action} all notifications.`;
                resultsCard.hidden = false;
                responseContainer.innerHTML = `<div class="alert alert-success" role="alert">
                    <i class="fas fa-check-circle me-2"></i>All notifications have been ${action} for user ${user}.
                </div>`;
                updateProgressWithPercent(progressBar, 100);
            } else {
                throw new Error(response.error || 'Failed to update notifications');
            }
        } catch (error) {
            progressCard.hidden = true;
            resultsCard.hidden = false;
            responseContainer.innerHTML = '';
            errorHandler(error, responseContainer);
        } finally {
            // Re-enable buttons
            updateButtonStates();

            // Hide progress after a delay
            setTimeout(() => {
                progressCard.hidden = true;
                updateProgressWithPercent(progressBar, 0);
            }, 2000);
        }
    }
}