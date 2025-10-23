// ****************************************
//
// Communication Channel endpoints
//
// ****************************************

async function commChannelTemplate(e) {
    switch (e.target.id) {
        case 'check-commchannel':
            // Clear any global progress listeners when switching forms
            if (window.progressAPI && window.progressAPI.removeAllProgressListeners) {
                window.progressAPI.removeAllProgressListeners();
            }
            checkComm(e);
            break;
        case 'reset-commchannel':
            if (window.progressAPI && window.progressAPI.removeAllProgressListeners) {
                window.progressAPI.removeAllProgressListeners();
            }
            resetComm(e);
            break;
        case 'unconfirm-commchannels':
            if (window.progressAPI && window.progressAPI.removeAllProgressListeners) {
                window.progressAPI.removeAllProgressListeners();
            }
            unconfirmed(e);
            break;
        case 'download-conversations-csv':
            downloadConvos(e);
            break;
        case 'gc-between-users':
            getConvos(e);
            break;
        default:
            break;
    }
}

function checkComm(e) {
    hideEndpoints(e);

    const eContent = document.querySelector('#endpoint-content');
    let checkSuppressionListForm = eContent.querySelector('#check-suppressionlist-form');

    if (!checkSuppressionListForm) {
        checkSuppressionListForm = document.createElement('form');
        checkSuppressionListForm.id = 'check-suppressionlist-form';

        // eContent.append(eHeader);
        // eContent.innerHTML = `
        //     <div>
        //         <h3>Check suppression and bounce list</h3>
        //     </div>
        // `;

        // const eForm = document.createElement('form');
        checkSuppressionListForm.innerHTML = `
            <style>
                #check-suppressionlist-form .card { font-size: 0.875rem; }
                #check-suppressionlist-form .card-header h3 { font-size: 1.1rem; margin-bottom: 0.25rem; }
                #check-suppressionlist-form .card-header small { font-size: 0.75rem; }
                #check-suppressionlist-form .card-body { padding: 0.75rem; }
                #check-suppressionlist-form .form-label { font-size: 0.8rem; margin-bottom: 0.25rem; }
                #check-suppressionlist-form .form-control, #check-suppressionlist-form .form-select { 
                    font-size: 0.8rem; 
                    padding: 0.25rem 0.5rem;
                    height: auto;
                }
                #check-suppressionlist-form .btn { 
                    font-size: 0.8rem; 
                    padding: 0.35rem 0.75rem;
                }
                #check-suppressionlist-form .form-check { margin-bottom: 0.5rem; }
                #check-suppressionlist-form .form-text { font-size: 0.7rem; margin-top: 0.15rem; }
                #check-suppressionlist-form .mt-2 { margin-top: 0.5rem !important; }
                #check-suppressionlist-form .mt-3 { margin-top: 0.75rem !important; }
                #check-suppressionlist-form .mb-2 { margin-bottom: 0.5rem !important; }
                #check-suppressionlist-form .mb-3 { margin-bottom: 0.75rem !important; }
                #check-suppressionlist-form .mb-4 { margin-bottom: 1rem !important; }
                #check-suppressionlist-form .progress { height: 12px !important; }
                #check-suppressionlist-form h5 { font-size: 1rem; }
                #check-suppressionlist-form h6 { font-size: 0.9rem; }
                #check-suppressionlist-form p { margin-bottom: 0.5rem; font-size: 0.85rem; }
                #check-suppressionlist-form .alert { padding: 0.5rem 0.75rem; font-size: 0.8rem; }
                #check-suppressionlist-form .badge { font-size: 0.75rem; }
                #check-suppressionlist-form hr { margin: 0.5rem 0; }
                #check-suppressionlist-form .row { margin-bottom: 0.75rem; }
                #check-suppressionlist-form .g-3 { gap: 0.5rem !important; }
            </style>
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-shield-exclamation me-1"></i>Check Suppression and Bounce List
                    </h3>
                    <small class="text-muted">Verify email addresses against suppression and bounce lists</small>
                </div>
                <div class="card-body">
                    <div class="row g-3 mb-2">
                        <div class="col-md-3">
                            <label for="region" class="form-label fw-bold">
                                <i class="bi bi-geo me-1"></i>Region
                            </label>
                            <select id="region" class="form-select form-select-sm" aria-label="Region info">
                                <option value="iad_pdx" selected>IAD/PDX</option>
                                <option value="dub_fra">DUB/FRA</option>
                                <option value="syd_sin">SYD/SIN</option>
                                <option value="yul">YUL</option>
                            </select>
                        </div>
                    </div>
                    <!-- Check Method Selection -->
                    <div class="row g-3 mb-2">
                        <div class="col-12">
                            <label class="form-label fw-bold">
                                <i class="bi bi-list me-1"></i>Check Method
                            </label>
                            <div class="btn-group w-100" role="group" aria-label="Check method selection" id="email-options">
                                <input type="radio" class="btn-check" name="check-method" id="single-email-chkbx" value="single">
                                <label class="btn btn-sm btn-outline-primary" for="single-email-chkbx">
                                    <i class="bi bi-envelope me-1"></i>Single Email
                                </label>
                                
                                <input type="radio" class="btn-check" name="check-method" id="domain-email-chkbx" value="domain">
                                <label class="btn btn-sm btn-outline-primary" for="domain-email-chkbx">
                                    <i class="bi bi-globe me-1"></i>Domain
                                </label>
                                
                                <input type="radio" class="btn-check" name="check-method" id="file-upload-chkbx" value="file">
                                <label class="btn btn-sm btn-outline-primary" for="file-upload-chkbx">
                                    <i class="bi bi-upload me-1"></i>File Upload
                                </label>
                            </div>
                        </div>
                    </div>
                    <!-- Single Email Input -->
                    <div class="row g-3 mb-2 d-none" id="single-email-section">
                        <div class="col-md-6">
                            <label id="email-label" for="email" class="form-label fw-bold">
                                <i class="bi bi-envelope me-1"></i>Email Address
                            </label>
                            <input type="text" id="email" class="form-control form-control-sm" 
                                   aria-describedby="email-form-text" placeholder="Enter email address">
                            <div class="form-text text-muted" id="email-form-text">
                                <i class="bi bi-info-circle me-1"></i>Enter the full email address you want to check
                            </div>
                        </div>
                    </div>
                    
                    <!-- Domain Input -->
                    <div class="row g-3 mb-2 d-none" id="domain-section">
                        <div class="col-md-8">
                            <label id="domain-label" for="domain-input" class="form-label fw-bold">
                                <i class="bi bi-globe me-1"></i>Domain Pattern
                            </label>
                            <input type="text" id="domain-input" class="form-control form-control-sm" 
                                   aria-describedby="domain-form-text" placeholder="e.g., *student*">
                            <div class="form-text text-muted" id="domain-form-text">
                                <i class="bi bi-info-circle me-1"></i>
                                Enter domain pattern with wildcards. Example: *student* matches any email containing "student"
                            </div>
                            <div class="alert alert-warning mt-2">
                                <i class="bi bi-exclamation-triangle me-1"></i>
                                <strong>Note:</strong> Domain queries check the entire AWS region and may take several hours to complete.
                            </div>
                        </div>
                    </div>
                    
                    <!-- File Upload Input -->
                    <div class="row g-3 mb-2 d-none" id="file-upload-section">
                        <div class="col-md-6">
                            <label for="email-upload" class="form-label fw-bold">
                                <i class="bi bi-filetype-csv me-1"></i>Upload File of Emails
                            </label>
                            <input type="file" id="email-upload" accept=".csv,.xlsx,.xls" class="form-control form-control-sm" />
                            <div class="form-text text-muted">
                                <i class="bi bi-info-circle me-1"></i>Upload a CSV, Excel (.xlsx), or Excel 97-2003 (.xls) file containing email addresses to check
                                <br><small>Supports Canvas bounce report format with columns: User ID, Name, Path, Date, Bounce reason</small>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Action Buttons -->
                    <div class="row mb-2">
                        <div class="col-md-6">
                            <div class="d-flex gap-2">
                                <button type="button" class="btn btn-sm btn-success" id="dynamic-check-btn" disabled>
                                    <i class="bi bi-search me-2"></i>Check
                                </button>
                                <button type="button" class="btn btn-sm btn-outline-danger" id="cancel-btn" hidden>
                                    <i class="bi bi-x-circle me-2"></i>Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Progress Card -->
            <div class="card mt-2" id="progress-div" hidden>
                <div class="card-header">
                    <h5 class="card-title mb-0">
                        <i class="bi bi-gear me-2"></i>Checking Suppression List
                    </h5>
                </div>
                <div class="card-body">
                    <p id="progress-info" class="mb-2"></p>
                    <div class="progress mb-2" style="height: 12px;">
                        <div class="progress-bar progress-bar-striped progress-bar-animated" 
                             style="width: 0%" role="progressbar" 
                             aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Results Card -->
            <div class="card mt-2" id="response-container-card" hidden>
                <div class="card-body" id="response-container"></div>
            </div>
            `

        eContent.append(checkSuppressionListForm);
    }
    checkSuppressionListForm.hidden = false;

    // Get references to all sections and inputs
    const singleEmailSection = checkSuppressionListForm.querySelector('#single-email-section');
    const domainSection = checkSuppressionListForm.querySelector('#domain-section');
    const fileUploadSection = checkSuppressionListForm.querySelector('#file-upload-section');
    const emailInput = checkSuppressionListForm.querySelector('#email');
    const domainInput = checkSuppressionListForm.querySelector('#domain-input');
    const uploadInput = checkSuppressionListForm.querySelector('#email-upload');
    const dynamicBtn = checkSuppressionListForm.querySelector('#dynamic-check-btn');
    const cancelBtn = checkSuppressionListForm.querySelector('#cancel-btn');

    // Track cancellation state
    let isCancelled = false;
    let currentProcessType = null; // 'domain' or 'fileupload'
    let selectedEmails = []; // Store parsed emails from uploaded file

    // Prevent duplicate event listeners by checking if already bound
    if (checkSuppressionListForm.dataset.boundEventListeners !== 'true') {
        checkSuppressionListForm.dataset.boundEventListeners = 'true';

        // Handle input changes for email
        emailInput.addEventListener('input', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const singleEmailChkbx = checkSuppressionListForm.querySelector('#single-email-chkbx');
            dynamicBtn.disabled = !singleEmailChkbx.checked || e.target.value === '';
        });

        // Handle input changes for domain
        domainInput.addEventListener('input', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const domainEmailChkbx = checkSuppressionListForm.querySelector('#domain-email-chkbx');
            dynamicBtn.disabled = !domainEmailChkbx.checked || e.target.value === '';
        });

        // Handle file upload changes
        uploadInput.addEventListener('change', async (e) => {
            const fileUploadChkbx = checkSuppressionListForm.querySelector('#file-upload-chkbx');

            if (e.target.files && e.target.files.length > 0) {
                const file = e.target.files[0];
                const fileName = file.name.toLowerCase();
                const fileExtension = fileName.split('.').pop();
                
                try {
                    selectedEmails = [];
                    
                    if (fileExtension === 'csv') {
                        // Handle CSV files
                        const reader = new FileReader();
                        reader.onload = async function (event) {
                            try {
                                const csvContent = event.target.result;
                                // Use the parseEmailsFromCSV function via IPC
                                const result = await window.ipcRenderer.invoke('parseEmailsFromCSV', csvContent);
                                selectedEmails = result.emails || [];
                                
                                updateFileParseUI(file, selectedEmails, fileUploadChkbx, dynamicBtn);
                            } catch (error) {
                                handleFileParseError(error, dynamicBtn);
                            }
                        };
                        reader.readAsText(file);
                    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
                        // Handle Excel files
                        try {
                            // Use IPC to parse Excel file in main process
                            const result = await window.ipcRenderer.invoke('parseEmailsFromExcel', {
                                filePath: file.path || null,
                                fileBuffer: await file.arrayBuffer()
                            });
                            
                            selectedEmails = result.emails || [];
                            updateFileParseUI(file, selectedEmails, fileUploadChkbx, dynamicBtn);
                        } catch (error) {
                            handleFileParseError(error, dynamicBtn);
                        }
                    } else {
                        throw new Error('Unsupported file format. Please upload a CSV (.csv), Excel (.xlsx), or Excel 97-2003 (.xls) file.');
                    }
                } catch (error) {
                    console.error('File upload error:', error);
                    handleFileParseError(error, dynamicBtn);
                }
            } else {
                selectedEmails = [];
                dynamicBtn.disabled = !fileUploadChkbx.checked || !uploadInput.files || uploadInput.files.length === 0;
            }
        });

        // Helper function to update UI after successful file parsing
        function updateFileParseUI(file, emails, checkbox, button) {
            const responseContainer = checkSuppressionListForm.querySelector('#response-container');
            const fileType = file.name.toLowerCase().includes('.xlsx') || file.name.toLowerCase().includes('.xls') ? 'Excel' : 'CSV';
            
            responseContainer.innerHTML = `
                <div class="alert alert-success">
                    <strong>✓ ${fileType} file parsed successfully!</strong><br>
                    Found ${emails.length} email address(es) in "${file.name}"
                    ${(file.name.includes('bounced_communication') || file.name.includes('bounce')) ?
                        '<br><small class="text-muted">Detected Canvas bounce report format</small>' : ''}
                </div>`;

            // Enable the button if checkbox is checked
            button.disabled = !checkbox.checked || emails.length === 0;
        }

        // Helper function to handle file parsing errors
        function handleFileParseError(error, button) {
            selectedEmails = [];
            const responseContainer = checkSuppressionListForm.querySelector('#response-container');
            responseContainer.innerHTML = `
                <div class="alert alert-danger">
                    <strong>Error parsing file:</strong><br>
                    ${error.message}
                </div>`;
            button.disabled = true;
        }

        function handleQueryType(e) {
            const singleEmailChkbx = checkSuppressionListForm.querySelector('#single-email-chkbx');
            const domainEmailChkbx = checkSuppressionListForm.querySelector('#domain-email-chkbx');
            const fileUploadChkbx = checkSuppressionListForm.querySelector('#file-upload-chkbx');

            // Ensure only one switch is active at a time
            if (e.target.checked) {
                if (e.target.id === 'single-email-chkbx') {
                    domainEmailChkbx.checked = false;
                    fileUploadChkbx.checked = false;
                } else if (e.target.id === 'domain-email-chkbx') {
                    singleEmailChkbx.checked = false;
                    fileUploadChkbx.checked = false;
                } else if (e.target.id === 'file-upload-chkbx') {
                    singleEmailChkbx.checked = false;
                    domainEmailChkbx.checked = false;
                }
            }

            // Hide all sections first
            singleEmailSection.classList.add('d-none');
            domainSection.classList.add('d-none');
            fileUploadSection.classList.add('d-none');

            // Clear response container when switching modes
            const responseContainer = checkSuppressionListForm.querySelector('#response-container');
            responseContainer.innerHTML = '';

            // Show appropriate section and update button
            if (singleEmailChkbx.checked) {
                singleEmailSection.classList.remove('d-none');
                dynamicBtn.innerHTML = '<i class="bi bi-search me-2"></i>Check Email';
                dynamicBtn.disabled = emailInput.value.trim() === '';
            } else if (domainEmailChkbx.checked) {
                domainSection.classList.remove('d-none');
                dynamicBtn.innerHTML = '<i class="bi bi-search me-2"></i>Check Domain';
                dynamicBtn.disabled = domainInput.value.trim() === '';
            } else if (fileUploadChkbx.checked) {
                fileUploadSection.classList.remove('d-none');
                dynamicBtn.innerHTML = '<i class="bi bi-upload me-2"></i>Check Uploaded Emails';
                dynamicBtn.disabled = selectedEmails.length === 0;
            } else {
                // No switch selected, clear uploaded emails
                selectedEmails = [];
                dynamicBtn.innerHTML = '<i class="bi bi-search me-2"></i>Check';
                dynamicBtn.disabled = true;
            }
        }

        const emailOptions = checkSuppressionListForm.querySelector('#email-options');
        emailOptions.addEventListener('change', (e) => {
            e.preventDefault();
            e.stopPropagation();

            handleQueryType(e);
        });

        // Dynamic button click handler
        dynamicBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const singleEmailChkbx = checkSuppressionListForm.querySelector('#single-email-chkbx');
            const domainEmailChkbx = checkSuppressionListForm.querySelector('#domain-email-chkbx');
            const fileUploadChkbx = checkSuppressionListForm.querySelector('#file-upload-chkbx');

            if (singleEmailChkbx.checked) {
                await handleSingleEmailCheck(e);
            } else if (domainEmailChkbx.checked) {
                await handleDomainCheck(e);
            } else if (fileUploadChkbx.checked) {
                await handleFileUploadCheck(e);
            }
        });

        // Cancel button click handler
        cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            isCancelled = true;
            cancelBtn.hidden = true;
            const progresDiv = checkSuppressionListForm.querySelector('#progress-div');
            const responseContainer = checkSuppressionListForm.querySelector('#response-container');

            progresDiv.hidden = true;
            responseContainer.innerHTML += '<p style="color: orange;">Operation cancelled by user.</p>';
            dynamicBtn.disabled = false;
            currentProcessType = null;
        });

        // Single email check function
        async function handleSingleEmailCheck(e) {
            dynamicBtn.disabled = true;
            cancelBtn.hidden = true; // Hide cancel button for single email checks
            isCancelled = false;
            currentProcessType = 'single';

            const domain = document.querySelector('#domain').value.trim();
            const apiToken = document.querySelector('#token').value.trim();
            const region = checkSuppressionListForm.querySelector('#region').value;
            const email = emailInput.value.trim().toLowerCase();
            const responseContainer = checkSuppressionListForm.querySelector('#response-container');
            const responseContainerCard = checkSuppressionListForm.querySelector('#response-container-card');
            const progresDiv = checkSuppressionListForm.querySelector('#progress-div');
            const progressBarWrapper = progresDiv.querySelector('.progress');
            const progressInfo = progresDiv.querySelector('#progress-info');

            if (window.ProgressUtils && window.progressAPI) {
                window.ProgressUtils.attachGlobalProgressListener({ container: progresDiv });
            }

            // Clear and show progress
            responseContainer.innerHTML = '';
            responseContainerCard.hidden = true;
            progresDiv.hidden = false;
            progressBarWrapper.hidden = true;
            progressInfo.textContent = `Checking ${email}...`;

            const data = {
                domain: domain,
                token: apiToken,
                region: region,
                pattern: email
            };

            let response;
            let hasError = false;
            try {
                response = await window.axios.checkCommChannel(data);
            } catch (error) {
                hasError = true;
                progresDiv.hidden = true;
                responseContainerCard.hidden = false;
                
                responseContainer.innerHTML = `
                    <div class="alert alert-danger mb-0">
                        <h5 class="alert-heading">
                            <i class="bi bi-exclamation-triangle me-2"></i>Error
                        </h5>
                        <p class="mb-0">${error.message || error}</p>
                    </div>
                `;
            } finally {
                dynamicBtn.disabled = false;
                currentProcessType = null;
            }

            if (!hasError) {
                // Hide progress, show results
                progresDiv.hidden = true;
                responseContainerCard.hidden = false;

                const isSuppressed = response.suppressed;
                const isBounced = response.bounced;
                const hasIssues = isSuppressed || isBounced;

                responseContainer.innerHTML = `
                    <div class="card border-${hasIssues ? 'danger' : 'success'}">
                        <div class="card-header bg-${hasIssues ? 'danger' : 'success'}-subtle">
                            <h5 class="card-title mb-0">
                                <i class="bi bi-${hasIssues ? 'exclamation-triangle' : 'check-circle'} me-2"></i>
                                Email Status Check
                            </h5>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <h6 class="text-muted mb-2">
                                    <i class="bi bi-envelope me-1"></i>Email Address
                                </h6>
                                <div class="p-2 bg-light rounded">
                                    <code>${email}</code>
                                </div>
                            </div>

                            <div class="row g-3">
                                <div class="col-md-6">
                                    <div class="card h-100 ${isSuppressed ? 'border-danger' : 'border-success'}">
                                        <div class="card-body text-center">
                                            <div class="mb-2">
                                                <i class="bi bi-${isSuppressed ? 'x-circle-fill text-danger' : 'check-circle-fill text-success'} fs-1"></i>
                                            </div>
                                            <h6 class="card-subtitle mb-2 text-muted">Suppression Status</h6>
                                            <p class="card-text fw-bold fs-5 mb-0 ${isSuppressed ? 'text-danger' : 'text-success'}">
                                                ${isSuppressed ? 'Suppressed' : 'Not Suppressed'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="card h-100 ${isBounced ? 'border-danger' : 'border-success'}">
                                        <div class="card-body text-center">
                                            <div class="mb-2">
                                                <i class="bi bi-${isBounced ? 'x-circle-fill text-danger' : 'check-circle-fill text-success'} fs-1"></i>
                                            </div>
                                            <h6 class="card-subtitle mb-2 text-muted">Bounce Status</h6>
                                            <p class="card-text fw-bold fs-5 mb-0 ${isBounced ? 'text-danger' : 'text-success'}">
                                                ${isBounced ? 'Bounced' : 'Not Bounced'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            ${hasIssues ? `
                            <div class="alert alert-warning mt-3 mb-0">
                                <i class="bi bi-info-circle me-2"></i>
                                <strong>Action Required:</strong> This email ${isSuppressed && isBounced ? 'is suppressed and has bounced' : isSuppressed ? 'is suppressed' : 'has bounced'}. 
                                Consider resetting the communication channel if this is a valid email address.
                            </div>
                            ` : `
                            <div class="alert alert-success mt-3 mb-0">
                                <i class="bi bi-check-circle me-2"></i>
                                <strong>All Clear:</strong> This email address has no suppression or bounce issues.
                            </div>
                            `}
                        </div>
                    </div>
                `;
            }
        }

        // Domain check function
        async function handleDomainCheck(e) {
            dynamicBtn.disabled = true;
            cancelBtn.hidden = false;
            isCancelled = false;
            currentProcessType = 'domain';

            const domain = document.querySelector('#domain').value.trim();
            const apiToken = document.querySelector('#token').value.trim();
            const region = checkSuppressionListForm.querySelector('#region').value;
            const domainPattern = domainInput.value.trim().toLowerCase();
            const responseContainer = checkSuppressionListForm.querySelector('#response-container');
            const progresDiv = checkSuppressionListForm.querySelector('#progress-div');
            const progressBarWrapper = progresDiv.querySelector('.progress');
            const progressInfo = progresDiv.querySelector('#progress-info');

            if (window.ProgressUtils && window.progressAPI) {
                window.ProgressUtils.attachGlobalProgressListener({ container: progresDiv });
            }

            responseContainer.innerHTML = '';
            // Show the response container card
            const responseContainerCard = checkSuppressionListForm.querySelector('#response-container-card');
            responseContainerCard.hidden = false;

            const data = {
                domain: domain,
                token: apiToken,
                region: region,
                pattern: domainPattern
            };

            let response;
            let hasError = false;
            try {
                responseContainer.innerHTML = 'Checking domain pattern....';
                progresDiv.hidden = false;
                // Hide progress bar for domain check (indeterminate operation)
                progressBarWrapper.hidden = true;
                progressInfo.textContent = 'Checking domain pattern...';

                // Check for cancellation before starting the request
                if (isCancelled) {
                    return;
                } response = await window.axios.checkCommDomain(data);

                // Check for cancellation after the request
                if (isCancelled) {
                    return;
                }

                responseContainer.innerHTML += 'Done.';
            } catch (error) {
                if (!isCancelled) {
                    errorHandler(error, responseContainer);
                    hasError = true;
                }
            } finally {
                dynamicBtn.disabled = false;
                cancelBtn.hidden = true;
                progresDiv.hidden = true;
                currentProcessType = null;
            }

            if (response) {
                responseContainer.innerHTML += `<p>Found suppressed email. Download them here: <button id="download-emails">Download Emails</button>.</p>`;
                const downloadEmails = responseContainer.querySelector('#download-emails');
                downloadEmails.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    window.csv.sendToText();
                });
            } else if (!hasError) {
                responseContainer.innerHTML += `<p>Didn't find any emails matching the specified pattern.</p>`;
            }
        }

        // File upload check function
        async function handleFileUploadCheck(e) {
            console.log('handleFileUploadCheck called');
            try {
                // Check if we have parsed emails
                if (!selectedEmails || selectedEmails.length === 0) {
                    alert('Please select and upload a file first.');
                    return;
                }

                dynamicBtn.disabled = true;
                cancelBtn.hidden = false;
                isCancelled = false;
                currentProcessType = 'fileupload';

                const emails = selectedEmails;
                console.log(`Processing ${emails.length} emails from uploaded file`);

                // Get region, domain, token from form
                const region = checkSuppressionListForm.querySelector('#region').value;
                const domain = document.querySelector('#domain').value.trim();
                const token = document.querySelector('#token').value.trim();

                // Progress UI
                const progresDiv = checkSuppressionListForm.querySelector('#progress-div');
                const progressBar = progresDiv.querySelector('.progress-bar');
                const progressInfo = progresDiv.querySelector('#progress-info');
                const progressBarWrapper = progresDiv.querySelector('.progress'); 
                
                progresDiv.hidden = false;
                // Show progress bar for file upload
                progressBarWrapper.hidden = false;
                progressInfo.innerHTML = '<p class="mb-1">Processing emails...</p>';

                const responseContainer = checkSuppressionListForm.querySelector('#response-container');
                const responseContainerCard = checkSuppressionListForm.querySelector('#response-container-card');
                responseContainer.innerHTML = '';
                responseContainerCard.hidden = true;
                
                // Results array
                const results = [];
                const totalEmails = emails.length;

                for (let i = 0; i < emails.length; i++) {
                    // Check for cancellation at the start of each iteration
                    if (isCancelled) {
                        progressInfo.innerHTML += '<p class="text-warning mb-0">Processing cancelled by user.</p>';
                        break;
                    }

                    const email = emails[i];
                    const currentProgress = ((i + 1) / totalEmails) * 100;

                    // Update progress bar and info
                    progressBar.style.width = `${currentProgress}%`;
                    progressBar.setAttribute('aria-valuenow', Math.round(currentProgress));
                    progressInfo.innerHTML = `
                        <p class="mb-1 fw-bold">Processing ${i + 1} of ${totalEmails} emails (${Math.round(currentProgress)}%)</p>
                        <p class="mb-0 text-muted small">
                            <i class="bi bi-envelope me-1"></i>Currently checking: <code>${email}</code>
                        </p>
                    `;

                    let suppressed = false, bounced = false;
                    try {
                        const response = await window.axios.checkCommChannel({ domain, region, token, pattern: email });
                        suppressed = response.suppressed;
                        bounced = response.bounced;
                    } catch { }
                    results.push({ email, suppressed, bounced });
                }

                // Only generate CSV if not cancelled
                if (!isCancelled && results.length > 0) {
                    // Show the response container card
                    const responseContainerCard = checkSuppressionListForm.querySelector('#response-container-card');
                    responseContainerCard.hidden = false;

                    // Separate results by status
                    const suppressedEmails = results.filter(r => r.suppressed);
                    const bouncedEmails = results.filter(r => r.bounced);
                    const problematicEmails = results.filter(r => r.suppressed || r.bounced);
                    const cleanEmails = results.filter(r => !r.suppressed && !r.bounced);

                    const totalChecked = results.length;
                    const suppressedCount = suppressedEmails.length;
                    const bouncedCount = bouncedEmails.length;
                    const bothCount = results.filter(r => r.suppressed && r.bounced).length;
                    const cleanCount = cleanEmails.length;

                    // Generate detailed results display
                    let resultsHTML = `
                        <div class="alert alert-info">
                            <h5><i class="bi bi-check-circle me-2"></i>Suppression & Bounce Check Complete</h5>
                        </div>
                        <div class="row">
                            <div class="col-md-6">
                                <div class="card border-primary">
                                    <div class="card-header bg-primary text-white">
                                        <h6 class="mb-0"><i class="bi bi-graph-up me-2"></i>Summary</h6>
                                    </div>
                                    <div class="card-body">
                                        <p><strong>Total emails checked:</strong> ${totalChecked}</p>
                                        <p class="mb-1"><strong>Clean emails:</strong> <span class="text-success">${cleanCount}</span></p>
                                        <p class="mb-1"><strong>On suppression list:</strong> <span class="text-warning">${suppressedCount}</span></p>
                                        <p class="mb-1"><strong>On bounce list:</strong> <span class="text-danger">${bouncedCount}</span></p>
                                        ${bothCount > 0 ? `<p class="mb-1"><strong>On both lists:</strong> <span class="text-danger">${bothCount}</span></p>` : ''}
                                        <hr>
                                        <p class="mb-0"><strong>Total problematic:</strong> <span class="text-danger">${problematicEmails.length}</span></p>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="card border-success">
                                    <div class="card-header bg-success text-white">
                                        <h6 class="mb-0"><i class="bi bi-download me-2"></i>Downloads</h6>
                                    </div>
                                    <div class="card-body">
                    `;

                    if (problematicEmails.length > 0) {
                        // Generate CSV with problematic emails
                        const csv = ['email,suppressed,bounced,status'].concat(
                            problematicEmails.map(r => {
                                let status = '';
                                if (r.suppressed && r.bounced) status = 'Both';
                                else if (r.suppressed) status = 'Suppressed';
                                else if (r.bounced) status = 'Bounced';
                                return `${r.email},${r.suppressed ? 'Yes' : 'No'},${r.bounced ? 'Yes' : 'No'},${status}`;
                            })
                        ).join('\r\n');
                        
                        const blob = new Blob([csv], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);

                        resultsHTML += `
                                        <p class="mb-2">Download files containing problematic emails:</p>
                                        <div class="d-grid gap-2">
                                            <a href="${url}" download="problematic_emails_${new Date().toISOString().split('T')[0]}.csv" 
                                               class="btn btn-danger btn-sm">
                                                <i class="bi bi-download me-1"></i>Problematic Emails (${problematicEmails.length})
                                            </a>
                        `;

                        // Generate additional specific files if needed
                        if (suppressedCount > 0) {
                            const suppressedCSV = ['email,status'].concat(
                                suppressedEmails.map(r => `${r.email},Suppressed`)
                            ).join('\r\n');
                            const suppressedBlob = new Blob([suppressedCSV], { type: 'text/csv' });
                            const suppressedUrl = URL.createObjectURL(suppressedBlob);
                            
                            resultsHTML += `
                                            <a href="${suppressedUrl}" download="suppressed_emails_${new Date().toISOString().split('T')[0]}.csv" 
                                               class="btn btn-warning btn-sm">
                                                <i class="bi bi-download me-1"></i>Suppressed Only (${suppressedCount})
                                            </a>
                            `;
                        }

                        if (bouncedCount > 0) {
                            const bouncedCSV = ['email,status'].concat(
                                bouncedEmails.map(r => `${r.email},Bounced`)
                            ).join('\r\n');
                            const bouncedBlob = new Blob([bouncedCSV], { type: 'text/csv' });
                            const bouncedUrl = URL.createObjectURL(bouncedBlob);
                            
                            resultsHTML += `
                                            <a href="${bouncedUrl}" download="bounced_emails_${new Date().toISOString().split('T')[0]}.csv" 
                                               class="btn btn-danger btn-sm">
                                                <i class="bi bi-download me-1"></i>Bounced Only (${bouncedCount})
                                            </a>
                            `;
                        }

                        resultsHTML += '</div>';
                    } else {
                        resultsHTML += `
                                        <div class="alert alert-success mb-0">
                                            <i class="bi bi-check-circle me-2"></i>
                                            <strong>Excellent!</strong> All ${totalChecked} emails are clean.
                                            <br><small>No emails found on suppression or bounce lists.</small>
                                        </div>
                        `;
                    }

                    resultsHTML += `
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;

                    responseContainer.innerHTML = resultsHTML;
                } else if (!isCancelled) {
                    const responseContainerCard = checkSuppressionListForm.querySelector('#response-container-card');
                    responseContainerCard.hidden = false;
                    responseContainer.innerHTML = '<div class="alert alert-warning">No results to export.</div>';
                }

                // Reset progress bar and hide progress div
                progressBar.style.width = '0%';
                progressBar.setAttribute('aria-valuenow', '0');
                progressInfo.textContent = '';
                progressBarWrapper.hidden = false; // Keep progress bar available
                progresDiv.hidden = true;
                dynamicBtn.disabled = false;
                cancelBtn.hidden = true;
                currentProcessType = null;

            } catch (error) {
                console.error('File upload error:', error);
                alert(`Error processing file: ${error.message}`);
                dynamicBtn.disabled = false;
                cancelBtn.hidden = true;
                currentProcessType = null;
            }
        }

    } // End of event listener binding check
}

function resetComm(e) {
    console.log('The target is: ', e.target);
    hideEndpoints(e);

    const eContent = document.querySelector('#endpoint-content');
    let resetCommForm = eContent.querySelector('#reset-comm-form');

    if (!resetCommForm) {
        resetCommForm = document.createElement('form');
        resetCommForm.id = 'reset-comm-form';
        resetCommForm.innerHTML = `
            <style>
                #reset-comm-form .card { font-size: 0.875rem; }
                #reset-comm-form .card-header h3 { font-size: 1.1rem; margin-bottom: 0.25rem; }
                #reset-comm-form .card-header small { font-size: 0.75rem; }
                #reset-comm-form .card-body { padding: 0.75rem; }
                #reset-comm-form .form-label { font-size: 0.8rem; margin-bottom: 0.25rem; }
                #reset-comm-form .form-control, #reset-comm-form .form-select { 
                    font-size: 0.8rem; 
                    padding: 0.25rem 0.5rem;
                    height: auto;
                }
                #reset-comm-form .btn { 
                    font-size: 0.8rem; 
                    padding: 0.35rem 0.75rem;
                }
                #reset-comm-form .form-check { margin-bottom: 0.5rem; }
                #reset-comm-form .form-text { font-size: 0.7rem; margin-top: 0.15rem; }
                #reset-comm-form .mt-2 { margin-top: 0.5rem !important; }
                #reset-comm-form .mt-3 { margin-top: 0.75rem !important; }
                #reset-comm-form .mb-2 { margin-bottom: 0.5rem !important; }
                #reset-comm-form .mb-3 { margin-bottom: 0.75rem !important; }
                #reset-comm-form .progress { height: 12px !important; }
                #reset-comm-form h5 { font-size: 1rem; }
                #reset-comm-form h6 { font-size: 0.9rem; }
                #reset-comm-form p { margin-bottom: 0.5rem; font-size: 0.85rem; }
                #reset-comm-form .alert { padding: 0.5rem 0.75rem; font-size: 0.8rem; }
                #reset-comm-form .badge { font-size: 0.75rem; }
                #reset-comm-form hr { margin: 0.5rem 0; }
            </style>
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title text-dark">
                        <i class="bi bi-arrow-clockwise me-1"></i>Reset Communication Channels
                    </h3>
                    <small class="text-muted">Reset communication channel preferences for users</small>
                </div>
                <div class="card-body">
        <div>
            <div class="col-2">
                <select id="region" class="form-select form-select-sm" aria-label="Region info">
                    <option value="iad_pdx" selected>IAD/PDX</option>
                    <option value="dub_fra">DUB/FRA</option>
                    <option value="syd_sin">SYD/SIN</option>
                    <option value="yul">YUL</option>
                </select>
            </div>
            <div id="reset-switches" class="mt-2">
                <div class="form-check form-switch">
                    <label clas="form-label" for="reset-single-email">Reset single email</label>
                    <input id="reset-single-email" type="checkbox" role="switch" class="form-check-input">
                </div>
                <div class="form-check form-switch">
                    <label clas="form-label" for="reset-pattern-emails">Reset emails by pattern</label>
                    <input id="reset-pattern-emails" type="checkbox" role="switch" class="form-check-input">
                    <div class="form-text">Use wildcards to match email patterns (e.g., *@domain.edu, student*@*.edu)</div>
                </div>
                <div class="form-check form-switch">
                    <label clas="form-label" for="reset-upload-input">Upload file to reset (TXT or CSV)</label>
                    <input id="reset-upload-input" type="checkbox" role="switch" class="form-check-input">
                    <div class="form-text">TXT: One email per line. CSV: Must have a column named 'path', 'email', 'email_address', or 'communication_channel_path' containing email addresses.</div>
                </div>
            </div>
            <div id="reset-data-inputs" hidden>
                <div id="reset-single-div">
                    <label for="reset-single-input" class="form-label">Email Address</label>
                    <input id="reset-single-input" type="text" class="form-control form-control-sm" placeholder="user@example.com">
                </div>
                <div id="reset-pattern-div" hidden>
                    <label for="reset-pattern-input" class="form-label">Email Pattern</label>
                    <input id="reset-pattern-input" type="text" class="form-control form-control-sm" placeholder="*@domain.edu">
                    <div class="form-text">Use wildcards (*) to match multiple emails. Examples: *@university.edu, student*@*.edu</div>
                </div>
            </div>
        </div>
        <div id="reset-btns">
            <button id="reset-upload-btn" class="btn btn-sm btn-primary mt-2" hidden>Upload</button>
            <button id="reset-single-btn" class="btn btn-sm btn-primary mt-2" hidden>Reset</button>
            <button id="reset-pattern-btn" class="btn btn-sm btn-primary mt-2" hidden>Reset by Pattern</button>
            <button id="reset-cancel-btn" class="btn btn-sm btn-outline-secondary mt-2" hidden>Cancel</button>
        </div>
        </div>
        </div>
        
        <!-- Progress Card -->
        <div class="card mt-2" id="progress-card" hidden>
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-gear me-1"></i><span id="progress-card-title">Processing</span>
                </h5>
            </div>
            <div class="card-body">
                <p id="progress-info" class="mb-1"></p>
                <div class="progress mb-1">
                    <div class="progress-bar progress-bar-striped progress-bar-animated" 
                         id="progress-bar" style="width:0%" role="progressbar" 
                         aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                    </div>
                </div>
                <small class="text-muted" id="progress-detail"></small>
            </div>
        </div>
        
        <!-- Results Card -->
        <div class="card mt-2" id="results-card" hidden>
            <div class="card-body">
                <div id="reset-single-comm-response-container"></div>
                <div id="reset-pattern-comm-response-container"></div>
                <div id="reset-upload-comm-response-container"></div>
            </div>
        </div>
        `;

        eContent.append(resetCommForm);
    }
    resetCommForm.hidden = false;


    const progressCard = resetCommForm.querySelector('#progress-card');
    const progressCardTitle = resetCommForm.querySelector('#progress-card-title');
    const progressInfo = resetCommForm.querySelector('#progress-info');
    const progressBar = resetCommForm.querySelector('#progress-bar');
    const progressDetail = resetCommForm.querySelector('#progress-detail');
    const resultsCard = resetCommForm.querySelector('#results-card');
    const singleContainer = resetCommForm.querySelector('#reset-single-comm-response-container');
    const patternContainer = resetCommForm.querySelector('#reset-pattern-comm-response-container');
    const uploadContainer = resetCommForm.querySelector('#reset-upload-comm-response-container');
    const resetSwitches = resetCommForm.querySelector('#reset-switches');
    const inputs = resetSwitches.querySelectorAll('input');
    const dataInputs = resetCommForm.querySelector('#reset-data-inputs');
    const resetBtns = resetCommForm.querySelector('#reset-btns');
    const allBtns = resetBtns.querySelectorAll('button');
    const resetBtn = resetCommForm.querySelector('#reset-single-btn');
    const resetPatternBtn = resetCommForm.querySelector('#reset-pattern-btn');
    const uploadBtn = resetCommForm.querySelector('#reset-upload-btn');
    // New: separate Reset button for file-upload flow
    let uploadResetBtn = resetCommForm.querySelector('#reset-upload-run-btn');
    if (!uploadResetBtn) {
        const btns = resetCommForm.querySelector('#reset-btns');
        uploadResetBtn = document.createElement('button');
        uploadResetBtn.id = 'reset-upload-run-btn';
        uploadResetBtn.className = 'btn btn-danger mt-3 ms-2';
        uploadResetBtn.textContent = 'Reset';
        uploadResetBtn.hidden = true;
        uploadResetBtn.disabled = true;
        btns.appendChild(uploadResetBtn);
    }
    const cancelBtn = resetCommForm.querySelector('#reset-cancel-btn');
    const resetSingleInput = resetCommForm.querySelector('#reset-single-input');
    const resetPatternInput = resetCommForm.querySelector('#reset-pattern-input');
    const resetSingleDiv = resetCommForm.querySelector('#reset-single-div');
    const resetPatternDiv = resetCommForm.querySelector('#reset-pattern-div');

    // Prevent duplicate event listeners by checking if already bound
    if (resetCommForm.dataset.boundEventListeners !== 'true') {
        resetCommForm.dataset.boundEventListeners = 'true';

        // listener for the toggle switches
        resetSwitches.addEventListener('change', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // if the change was to disable the switch
            // disable all inputs
            if (e.target.checked === false) {
                dataInputs.hidden = true;
                resetBtns.hidden = true;
                singleContainer.hidden = true;
                patternContainer.hidden = true;
                uploadContainer.hidden = true;
                resetSingleDiv.hidden = true;
                resetPatternDiv.hidden = true;
            } else {
                resetBtns.hidden = false;
                for (let input of inputs) {
                    if (input.id !== e.target.id) {
                        input.checked = false;
                    }
                }
                if (e.target.id === 'reset-single-email') {
                    dataInputs.hidden = false;
                    resetSingleDiv.hidden = false;
                    resetPatternDiv.hidden = true;
                    singleContainer.hidden = false;
                    patternContainer.hidden = true;
                    uploadContainer.hidden = true;
                    handleResetOptions(allBtns, resetBtn);
                    resetBtn.disabled = true;
                } else if (e.target.id === 'reset-pattern-emails') {
                    dataInputs.hidden = false;
                    resetSingleDiv.hidden = true;
                    resetPatternDiv.hidden = false;
                    singleContainer.hidden = true;
                    patternContainer.hidden = false;
                    uploadContainer.hidden = true;
                    handleResetOptions(allBtns, resetPatternBtn);
                    resetPatternBtn.disabled = true;
                } else {
                    dataInputs.hidden = true;
                    resetSingleDiv.hidden = true;
                    resetPatternDiv.hidden = true;
                    singleContainer.hidden = true;
                    patternContainer.hidden = true;
                    uploadContainer.hidden = false;
                    handleResetOptions(allBtns, uploadBtn);
                }
                // Cancel button is visible for pattern or upload modes
                cancelBtn.hidden = !(document.querySelector('#reset-pattern-emails').checked || document.querySelector('#reset-upload-input').checked);
            }

        });

        // disabled or enabled the buttons and inputs based on toggle switches
        function handleResetOptions(allBtns, theButton) {
            for (let button of allBtns) {
                if (button.id !== theButton.id) {
                    button.disabled = true;
                    button.hidden = true;
                } else {
                    theButton.disabled = false;
                    theButton.hidden = false;
                }
            }
        }

        resetSingleInput.addEventListener('input', (e) => {
            resetBtn.disabled = resetSingleInput.value.trim().length < 1;
        })

        resetPatternInput.addEventListener('input', (e) => {
            resetPatternBtn.disabled = resetPatternInput.value.trim().length < 1;
        })

        // listener for resetting a single email
        resetBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            // prevent duplicate submissions
            resetBtn.disabled = true;

            const domain = document.querySelector('#domain').value.trim();
            const token = document.querySelector('#token').value.trim();
            const resetValue = resetSingleInput.value.trim().toLowerCase();
            const regionVal = resetCommForm.querySelector('#region').value;

            const requestData = {
                domain: domain,
                token: token,
                email: resetValue,
                region: regionVal
            };

            // Show progress card
            progressCard.hidden = false;
            resultsCard.hidden = true;
            progressCardTitle.textContent = 'Resetting Communication Channel';
            progressInfo.textContent = 'Resetting communication channel...';
            progressBar.style.width = '100%';
            progressBar.setAttribute('aria-valuenow', '100');
            progressDetail.textContent = '';
            singleContainer.innerHTML = '';

            try {
                // makes attempt to schedule bounce reset and aws reset
                // When resetting bounce count canvas creates a job to schedule it
                // the bounce count isn't cleared until after the job is run

                // makes call to clear aws and schedule bounce reset
                const response = await window.axios.resetCommChannel(requestData);
                
                // Hide progress, show results
                progressCard.hidden = true;
                resultsCard.hidden = false;
                
                // Build card-based UI for single email reset
                let htmlContent = `
                    <div class="card mb-3">
                        <div class="card-header bg-primary text-white">
                            <h5 class="card-title mb-0">
                                <i class="bi bi-check-circle me-2"></i>Reset Summary
                            </h5>
                        </div>
                        <div class="card-body">
                            <p class="mb-3"><strong>Email:</strong> <code>${resetValue}</code></p>
                            <hr class="my-3">
                            <h6 class="mb-2"><i class="bi bi-envelope-dash me-2"></i>Bounce List Results</h6>
                `;
                
                if (response.bounce.error != null) {
                    htmlContent += `<div class="alert alert-danger" role="alert">
                        <i class="bi bi-exclamation-triangle me-2"></i><strong>Error:</strong> ${response.bounce.error.message || JSON.stringify(response.bounce.error)}
                    </div>`;
                } else if (response.bounce.reset < 1) {
                    htmlContent += `<p class="mb-3"><i class="bi bi-info-circle me-2"></i>Email wasn't on the bounce list.</p>`;
                } else {
                    htmlContent += `<p class="mb-3"><i class="bi bi-check-circle-fill text-success me-2"></i>Successfully cleared email from bounce list.</p>`;
                }
                
                htmlContent += `
                            <h6 class="mb-2"><i class="bi bi-shield-slash me-2"></i>Suppression List Results</h6>
                `;
                
                if (response.suppression.error != null) {
                    htmlContent += `<div class="alert alert-danger mb-0" role="alert">
                        <i class="bi bi-exclamation-triangle me-2"></i><strong>Error:</strong> ${response.suppression.error.message || JSON.stringify(response.suppression.error)}
                    </div>`;
                } else if (response.suppression.status === '404') {
                    htmlContent += `<p class="mb-0"><i class="bi bi-info-circle me-2"></i>Email wasn't found on suppression list.</p>`;
                } else {
                    htmlContent += `<p class="mb-0"><i class="bi bi-check-circle-fill text-success me-2"></i>Successfully cleared email from suppression list.</p>`;
                }
                
                htmlContent += `
                        </div>
                    </div>
                `;
                
                singleContainer.innerHTML = htmlContent;
            } catch (error) {
                progressCard.hidden = true;
                resultsCard.hidden = false;
                errorHandler(error, singleContainer);
            }
            
            // Restore button
            resetBtn.disabled = false;
        });

        // listener for resetting a pattern
        resetPatternBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            resetPatternBtn.disabled = true;
            cancelBtn.hidden = false;
            cancelBtn.disabled = false;

            const domain = document.querySelector('#domain').value.trim();
            const token = document.querySelector('#token').value.trim();
            const resetPattern = resetPatternInput.value.trim();
            const regionVal = resetCommForm.querySelector('#region').value;

            // Show progress card
            progressCard.hidden = false;
            resultsCard.hidden = true;
            progressCardTitle.textContent = 'Resetting Pattern';
            progressInfo.textContent = 'Searching for emails matching pattern...';
            progressBar.style.width = '0%';
            progressBar.setAttribute('aria-valuenow', '0');
            progressDetail.textContent = 'Processed: 0';
            patternContainer.innerHTML = '';

            const requestData = {
                domain: domain,
                token: token,
                pattern: resetPattern,
                region: regionVal
            };

            // Subscribe to progress updates
            const unsub = window.progressAPI?.onUpdateProgress?.((payload) => {
                try {
                    if (payload && typeof payload === 'object') {
                        if (payload.label) {
                            progressInfo.textContent = payload.label;
                        }
                        // Update progress bar if value is provided
                        if (typeof payload.value === 'number') {
                            const percentage = Math.round(payload.value * 100);
                            progressBar.style.width = `${percentage}%`;
                            progressBar.setAttribute('aria-valuenow', percentage);
                        }
                    }
                } catch (e) {
                    console.error('Progress update error:', e);
                }
            });

            // makes attempt to schedule bounce reset and aws reset.
            // When resetting bounce count canvas creates a job to schedule it
            // the bounce count isn't cleared until after the job is run
            try {
                const response = await window.axios.resetCommChannelsByPattern(requestData);
                const totalProcessed = Array.isArray(response) ? response.length : 0;

                // Hide progress, show results
                progressCard.hidden = true;
                resultsCard.hidden = false;

                const totalBounceReset = response.reduce((sum, item) => sum + (item?.bounce?.reset || 0), 0);
                const totalSuppressionReset = response.reduce((sum, item) => sum + (item?.suppression?.reset || 0), 0);

                let htmlContent = `
                    <div class="card mb-3">
                        <div class="card-header bg-primary text-white">
                            <h5 class="card-title mb-0">
                                <i class="bi bi-funnel me-2"></i>Reset Summary
                            </h5>
                        </div>
                        <div class="card-body">
                            <p class="mb-2"><strong>Pattern:</strong> <code>${resetPattern}</code></p>
                            <p class="mb-3"><strong>Total Processed:</strong> <span class="badge bg-primary">${totalProcessed}</span> email(s)</p>
                `;

                if (totalProcessed === 0) {
                    htmlContent += `
                            <div class="alert alert-info mb-0" role="alert">
                                <i class="bi bi-info-circle me-2"></i>No emails found matching the pattern.
                            </div>
                    `;
                } else {
                    htmlContent += `
                            <hr class="my-3">
                            <h6 class="mb-2"><i class="bi bi-envelope-dash me-2"></i>Bounce List Results</h6>
                    `;
                    
                    if (totalBounceReset > 0) {
                        htmlContent += `<p class="mb-3"><i class="bi bi-check-circle-fill text-success me-2"></i>Successfully cleared <strong>${totalBounceReset}</strong> email(s) from bounce list.</p>`;
                    } else {
                        htmlContent += `<p class="mb-3"><i class="bi bi-info-circle me-2"></i>No emails were found on the bounce list.</p>`;
                    }
                    
                    htmlContent += `
                            <h6 class="mb-2"><i class="bi bi-shield-slash me-2"></i>Suppression List Results</h6>
                    `;
                    
                    if (totalSuppressionReset > 0) {
                        htmlContent += `<p class="mb-0"><i class="bi bi-check-circle-fill text-success me-2"></i>Successfully cleared <strong>${totalSuppressionReset}</strong> email(s) from suppression list.</p>`;
                    } else {
                        htmlContent += `<p class="mb-0"><i class="bi bi-info-circle me-2"></i>No emails were found on the suppression list.</p>`;
                    }
                }
                
                htmlContent += `
                        </div>
                    </div>
                `;

                // Collect failed emails for download
                const failedEmails = [];
                response.forEach(item => {
                    if (item?.bounce?.error || item?.suppression?.error) {
                        const email = item?.email || 'unknown';
                        const bounceError = item?.bounce?.error ? `Bounce: ${JSON.stringify(item.bounce.error)}` : '';
                        const suppressionError = item?.suppression?.error ? `Suppression: ${JSON.stringify(item.suppression.error)}` : '';
                        const errors = [bounceError, suppressionError].filter(Boolean).join('; ');
                        failedEmails.push({ email, errors });
                    }
                });

                // Add failed emails card if any exist
                if (failedEmails.length > 0) {
                    htmlContent += `
                        <div class="card border-danger">
                            <div class="card-header bg-danger text-white">
                                <h5 class="card-title mb-0">
                                    <i class="bi bi-exclamation-triangle me-2"></i>Failed Resets
                                </h5>
                            </div>
                            <div class="card-body">
                                <p class="mb-2"><i class="bi bi-x-circle text-danger me-2"></i><strong>${failedEmails.length}</strong> email(s) failed to reset properly.</p>
                    `;
                    
                    // Add download link if utility is available
                    if (window.utilities?.createDownloadLink) {
                        const failedCSV = ['Email Address,Errors'].concat(
                            failedEmails.map(item => `${item.email},"${item.errors}"`)
                        );
                        htmlContent += `<div id="pattern-failed-download-placeholder"></div>`;
                    }
                    
                    htmlContent += `
                            </div>
                        </div>
                    `;
                }
                
                // Set all HTML at once
                patternContainer.innerHTML = htmlContent;
                
                // Append download link as DOM element if failed emails exist
                if (failedEmails.length > 0 && window.utilities?.createDownloadLink) {
                    const failedCSV = ['Email Address,Errors'].concat(
                        failedEmails.map(item => `${item.email},"${item.errors}"`)
                    );
                    const failedLink = window.utilities.createDownloadLink(
                        failedCSV,
                        'pattern_reset_failed_emails.csv',
                        '📥 Download Failed Reset Emails'
                    );
                    const placeholder = patternContainer.querySelector('#pattern-failed-download-placeholder');
                    if (placeholder) {
                        placeholder.appendChild(failedLink);
                    }
                }
            } catch (error) {
                progressCard.hidden = true;
                resultsCard.hidden = false;
                if (error.message.toLowerCase().includes('not implemented')) {
                    patternContainer.innerHTML = '<p class="text-warning">Pattern-based reset functionality needs to be implemented in the backend.</p>';
                } else {
                    errorHandler(error, patternContainer);
                }
            } finally {
                // Unsubscribe from progress updates
                if (unsub) unsub();
                resetPatternBtn.disabled = false;
                cancelBtn.hidden = true;
                cancelBtn.disabled = true;
            };
        });

        // listener for uploading emails
        // State for two-step upload flow
        let selectedEmailsFile = null; // { fileContents, filePath, ext }

        // Helper: compute how many unique emails are present in the picked file
        function computeParsedEmailsCount(picked) {
            if (!picked) return 0;
            const set = new Set();
            const maybePush = (val) => {
                if (!val) return;
                const s = String(val).trim();
                // Preserve original case for deduplication, but validate with lowercase
                if (s && s.toLowerCase().includes('@')) set.add(s);
            };
            const fc = picked.fileContents;
            if (typeof fc === 'string') {
                // Split on common delimiters: newline or comma
                fc.split(/[\r\n,]+/).forEach(maybePush);
            } else if (Array.isArray(fc)) {
                // Handle array of emails (from parseEmailsFromCSV) or array of objects
                for (const item of fc) {
                    if (typeof item === 'string') {
                        // Direct email string from parseEmailsFromCSV
                        maybePush(item);
                    } else if (item && typeof item === 'object') {
                        // Object with email properties
                        const keys = ['email', 'email_address', 'communication_channel_path', 'path'];
                        for (const k of keys) {
                            if (k in item) {
                                maybePush(item[k]);
                                break;
                            }
                        }
                    }
                }
            }
            return set.size;
        }

        // Step 1: Upload (pick a file only)
        uploadBtn.addEventListener('click', async (e) => {
            console.log('Upload button clicked');
            e.preventDefault();
            e.stopPropagation();

            uploadBtn.disabled = true;
            uploadContainer.innerHTML = '';
            resultsCard.hidden = true;
            
            try {
                const picked = await window.fileUpload.resetEmails();
                if (!picked || picked === 'cancelled') {
                    resultsCard.hidden = false;
                    uploadContainer.innerHTML = '<div class="alert alert-info" role="alert"><i class="bi bi-info-circle me-2"></i>No file selected.</div>';
                    selectedEmailsFile = null;
                    return;
                }
                selectedEmailsFile = picked; // { fileContents, filePath, ext }
                const niceName = picked.filePath ? picked.filePath.split(/[/\\]/).pop() : 'selected file';
                const parsedCount = computeParsedEmailsCount(picked);
                
                resultsCard.hidden = false;
                uploadContainer.innerHTML = `
                    <div class="alert alert-success" role="alert">
                        <i class="bi bi-check-circle me-2"></i>
                        <strong>File Selected:</strong> ${niceName}<br>
                        <strong>Parsed:</strong> ${parsedCount} email(s)<br>
                        <small class="text-muted">Click "Reset" to begin processing.</small>
                    </div>
                `;
                
                // Enable the Reset button
                uploadResetBtn.hidden = false;
                uploadResetBtn.disabled = false;
            } catch (err) {
                selectedEmailsFile = null;
                resultsCard.hidden = false;
                errorHandler(err, uploadContainer);
            } finally {
                uploadBtn.disabled = false;
            }
        });

        // Step 2: Run reset using the selected file
        uploadResetBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!selectedEmailsFile) return;

            uploadResetBtn.disabled = true;
            cancelBtn.hidden = false;
            cancelBtn.disabled = false;

            const domain = document.querySelector('#domain').value.trim();
            const token = document.querySelector('#token').value.trim();
            const regionVal = resetCommForm.querySelector('#region').value;

            const requestData = {
                domain,
                token,
                region: regionVal,
                fileContents: selectedEmailsFile.fileContents,
                ext: selectedEmailsFile.ext
            };

            // Show progress card
            progressCard.hidden = false;
            resultsCard.hidden = true;
            progressCardTitle.textContent = 'Processing Bounce Count';
            progressInfo.textContent = 'Checking bounce counts...';
            progressBar.style.width = '0%';
            progressBar.setAttribute('aria-valuenow', '0');
            progressDetail.textContent = '';
            uploadContainer.innerHTML = '';
            
            // Track current stage for progress updates
            let currentStage = 'bounce'; // 'bounce' or 'aws'

            // Wire determinate progress from main: show percent and counts
            let unsubscribeProgress = null;
            if (window.progressAPI) {
                unsubscribeProgress = window.progressAPI.onUpdateProgress((payload) => {
                    if (!payload || typeof payload !== 'object') return;
                    const { mode, value, processed, total, label } = payload;
                    
                    // Check if we're moving to AWS stage
                    if (label && label.toLowerCase().includes('aws')) {
                        currentStage = 'aws';
                        progressCardTitle.textContent = 'Resetting AWS Suppression';
                    }
                    
                    if (mode === 'determinate' && typeof value === 'number') {
                        const pct = Math.round(value * 100);
                        progressBar.style.width = `${pct}%`;
                        progressBar.setAttribute('aria-valuenow', pct);
                        
                        if (typeof processed === 'number' && typeof total === 'number') {
                            const stageLabel = currentStage === 'bounce' ? 'Processing bounce counts' : 'Resetting AWS suppression';
                            progressInfo.textContent = `${stageLabel}...`;
                            progressDetail.textContent = `${processed}/${total} emails (${pct}%)`;
                        } else if (label) {
                            progressInfo.textContent = label;
                            progressDetail.textContent = `${pct}%`;
                        } else {
                            progressInfo.textContent = `Processing...`;
                            progressDetail.textContent = `${pct}%`;
                        }
                    }
                });
            }

            try {
                const response = await window.axios.resetEmails(requestData);
                
                // Hide progress, show results
                progressCard.hidden = true;
                resultsCard.hidden = false;

                const totalProcessed = response.combinedResults.summary.totalEmailsProcessed || 0;
                let totalBounceReset = response.combinedResults.summary.bounceListResets || 0;
                let totalAWSReset = response.combinedResults.summary.suppressionListRemoved || 0;
                let suppressionNotFound = response.combinedResults.summary.suppressionListNotFound || 0;
                let suppressionNotRemoved = response.combinedResults.summary.suppressionListNotRemoved || 0;
                // response.successful.forEach(success => {
                //     totalBounceReset += success.value.bounce.reset;
                //     totalAWSReset += success.value.suppression.reset;
                // });

                const errorBounce = response.combinedResults.details.bounceResults.failed.filter((email) => email.value.bounce.error != null);
                
                // Display suppression errors if any exist
                const suppressionErrors = response.combinedResults?.details?.suppressionResults?.failed_messages || [];
                
                // Build list of suppression results
                const suppressionResults = [];
                
                if (totalAWSReset > 0) {
                    suppressionResults.push(`<i class="bi bi-check-circle-fill text-success me-2"></i>Successfully removed <strong>${totalAWSReset}</strong> email(s) from suppression list.`);
                }
                
                if (suppressionNotFound > 0) {
                    if (suppressionNotFound === totalProcessed) {
                        suppressionResults.push(`<i class="bi bi-info-circle me-2"></i>No email(s) were found on the suppression list.`);
                    } else {
                        suppressionResults.push(`<i class="bi bi-info-circle text-info me-2"></i><strong>${suppressionNotFound}</strong> email(s) were not found on the suppression list.`);
                    }
                }

                if (suppressionNotRemoved > 0) {
                    suppressionResults.push(`<i class="bi bi-exclamation-circle text-warning me-2"></i><strong>${suppressionNotRemoved}</strong> email(s) could not be removed from the suppression list.`);
                }
                
                // Build summary with consolidated card-based UI
                let htmlContent = `
                    <div class="card mb-3">
                        <div class="card-header bg-primary text-white">
                            <h5 class="card-title mb-0">
                                <i class="bi bi-check-circle me-2"></i>Reset Summary
                            </h5>
                        </div>
                        <div class="card-body">
                            <p class="mb-3"><strong>Total Processed:</strong> <span class="badge bg-primary">${totalProcessed}</span> email(s)</p>
                            <hr class="my-3">
                            <h6 class="mb-2"><i class="bi bi-envelope-dash me-2"></i>Bounce List Results</h6>
                `;
                
                // Add bounce errors
                if (errorBounce.length > 0) {
                    htmlContent += `<div class="alert alert-danger" role="alert">
                        <strong><i class="bi bi-exclamation-triangle me-2"></i>Errors Encountered:</strong>
                        <ul class="mb-0 mt-2">`;
                    errorBounce.forEach(element => {
                        const error = element.value.bounce.error;
                        const email = element?.value?.email || element?.email || 'unknown';
                        htmlContent += `<li><strong>${email}:</strong> ${error.message || JSON.stringify(error)}</li>`;
                    });
                    htmlContent += `</ul></div>`;
                }
                
                if (totalBounceReset < 1 && errorBounce.length === 0) {
                    htmlContent += `<p class="mb-3"><i class="bi bi-info-circle me-2"></i>Didn't find any emails on the bounce list to reset.</p>`;
                } else if (totalBounceReset > 0) {
                    htmlContent += `<p class="mb-3"><i class="bi bi-check-circle-fill text-success me-2"></i>Successfully cleared <strong>${totalBounceReset}</strong> email(s) from bounce list.</p>`;
                }
                
                htmlContent += `
                            <h6 class="mb-2"><i class="bi bi-shield-slash me-2"></i>Suppression List Results</h6>
                `;
                
                if (suppressionErrors.length > 0) {
                    htmlContent += `<div class="alert alert-danger" role="alert">
                        <strong><i class="bi bi-exclamation-triangle me-2"></i>Suppression List Errors:</strong>
                        <ul class="mb-0 mt-2">
                            ${suppressionErrors.map(msg => `<li>${msg}</li>`).join('')}
                        </ul>
                    </div>`;
                }
                
                // Display all suppression results
                if (suppressionResults.length > 0) {
                    suppressionResults.forEach((result, index) => {
                        const isLast = index === suppressionResults.length - 1;
                        htmlContent += `<p class="${isLast ? 'mb-0' : 'mb-2'}">${result}</p>`;
                    });
                } else {
                    htmlContent += `<p class="mb-0"><i class="bi bi-info-circle me-2"></i>No suppression list operations performed.</p>`;
                }
                
                htmlContent += `
                        </div>
                    </div>
                `;

                // Set all HTML content at once (only once!)
                uploadContainer.innerHTML = htmlContent;

                // Debug: Log the entire response structure
                console.log('=== RESET RESPONSE DEBUG ===');
                console.log('Full response:', response);
                console.log('combinedResults:', response.combinedResults);
                console.log('suppressionResults:', response.combinedResults?.details?.suppressionResults);
                console.log('suppressionResults.data:', response.combinedResults?.details?.suppressionResults?.data);
                console.log('data.not_removed:', response.combinedResults?.details?.suppressionResults?.data?.not_removed);
                console.log('data.not_removed length:', response.combinedResults?.details?.suppressionResults?.data?.not_removed?.length);

                // Track failed emails with proper structure: Map<email, {bounceFailed: boolean, suppressionFailed: boolean}>
                const failedEmailsMap = new Map();

                // Add bounce failures
                let bounceFailedCount = 0;
                if (response.combinedResults?.details?.bounceResults?.failed) {
                    console.log('Bounce failed count:', response.combinedResults.details.bounceResults.failed.length);
                    response.combinedResults.details.bounceResults.failed.forEach(item => {
                        const email = item?.value?.email || item?.email || 'unknown';
                        console.log('Adding bounce failure for:', email);
                        if (!failedEmailsMap.has(email)) {
                            failedEmailsMap.set(email, { bounceFailed: false, suppressionFailed: false });
                        }
                        failedEmailsMap.get(email).bounceFailed = true;
                        bounceFailedCount++;
                    });
                }

                // Add suppression failures (not removed) - Updated to use new structure
                let suppressionFailedCount = 0;
                const notRemovedEmails = response.combinedResults?.details?.suppressionResults?.data?.not_removed;
                console.log('notRemovedEmails array (data.not_removed):', notRemovedEmails);
                console.log('Is notRemovedEmails an array?', Array.isArray(notRemovedEmails));
                
                if (notRemovedEmails && Array.isArray(notRemovedEmails) && notRemovedEmails.length > 0) {
                    console.log('Processing', notRemovedEmails.length, 'suppression failures');
                    notRemovedEmails.forEach(email => {
                        console.log('Adding suppression failure for:', email);
                        if (!failedEmailsMap.has(email)) {
                            failedEmailsMap.set(email, { bounceFailed: false, suppressionFailed: false });
                        }
                        failedEmailsMap.get(email).suppressionFailed = true;
                        suppressionFailedCount++;
                    });
                } else {
                    console.log('No suppression failures to process. notRemovedEmails is:', notRemovedEmails);
                }
                
                // Note: Don't use innerHTML += here - it will destroy DOM elements appended later!

                //                                    // Add download link for bounce failures if any exist
                // if (errorBounce.length > 0 && window.utilities?.createDownloadLink) {
                //     const bounceFailedEmails = errorBounce.map(item => {
                //         const email = item?.value?.email || item?.email || 'unknown';
                //         const error = item?.value?.bounce?.error ? JSON.stringify(item.value.bounce.error) : 'Unknown bounce error';
                //         return `${email},"Bounce: ${error}"`;
                //     });
                //     const bounceFailedCSV = ['Email Address,Errors'].concat(bounceFailedEmails);
                //     const bounceFailedLink = window.utilities.createDownloadLink(
                //         bounceFailedCSV,
                //         'bounce_reset_failed_emails.csv',
                //         '📥 Download Bounce Reset Failures'
                //     );
                //     const bounceFailedContainer = document.createElement('div');
                //     bounceFailedContainer.style.marginTop = '10px';
                //     bounceFailedContainer.appendChild(bounceFailedLink);
                //     uploadContainer.appendChild(bounceFailedContainer);
                // }
                
                //                 // Add download link for emails not found (always show if count > 0)
                // const notFoundEmails = response.combinedResults.details.suppressionResults.notFoundEmails || [];
                // if (notFoundEmails.length > 0 && window.utilities?.createDownloadLink) {
                //     const notFoundCSV = ['Email Address'].concat(notFoundEmails);
                //     const notFoundLink = window.utilities.createDownloadLink(
                //         notFoundCSV,                            
                //         'emails_not_found.csv',
                //         '📥 Download Not Found Emails'
                //     );
                //     const notFoundContainer = document.createElement('div');
                //     notFoundContainer.style.marginTop = '10px';
                //     notFoundContainer.appendChild(notFoundLink);
                //     uploadContainer.appendChild(notFoundContainer);
                // }
                //     // Add download link for emails not removed
                //     const notRemovedEmails = response.combinedResults.details.suppressionResults.notRemovedEmails || [];
                //     if (notRemovedEmails.length > 0 && window.utilities?.createDownloadLink) {
                //         const notRemovedCSV = ['Email Address'].concat(notRemovedEmails);
                //         const notRemovedLink = window.utilities.createDownloadLink(
                //             notRemovedCSV,
                //             'emails_not_removed.csv',
                //             '📥 Download Not Removed Emails'
                //         );
                //         const notRemovedContainer = document.createElement('div');
                //         notRemovedContainer.style.marginTop = '10px';
                //         notRemovedContainer.appendChild(notRemovedLink);
                //         uploadContainer.appendChild(notRemovedContainer);
                //     }

                // Create failed emails section with download and reprocess functionality
                console.log('Failed emails map size:', failedEmailsMap.size);
                console.log('Failed emails map entries:', Array.from(failedEmailsMap.entries()));
                
                if (failedEmailsMap.size > 0) {
                    console.log('Creating failed emails container...');
                    const failedContainer = document.createElement('div');
                    failedContainer.style.marginTop = '15px';
                    failedContainer.style.padding = '15px';
                    failedContainer.style.border = '2px solid #dc3545';
                    failedContainer.style.borderRadius = '5px';
                    failedContainer.style.backgroundColor = '#f8d7da';

                    // Helper function to generate CSV
                    const generateFailedEmailsCSV = () => {
                        const csvRows = ['Email,Bounce Failed,Suppression Failed'];
                        for (const [email, status] of failedEmailsMap.entries()) {
                            csvRows.push(`${email},${status.bounceFailed ? 'yes' : 'no'},${status.suppressionFailed ? 'yes' : 'no'}`);
                        }
                        return csvRows;
                    };

                    // Helper function to update the display
                    const updateFailedDisplay = () => {
                        const totalFailed = failedEmailsMap.size;
                        let bounceCount = 0;
                        let suppressionCount = 0;
                        for (const status of failedEmailsMap.values()) {
                            if (status.bounceFailed) bounceCount++;
                            if (status.suppressionFailed) suppressionCount++;
                        }

                        failedContainer.innerHTML = `
                            <h6 style="color: #721c24;">Failed Email Resets</h6>
                            <p><strong>Total Failed:</strong> ${totalFailed} unique email(s)</p>
                            <p><strong>Bounce Failures:</strong> ${bounceCount} email(s)</p>
                            <p><strong>Suppression Failures:</strong> ${suppressionCount} email(s)</p>
                        `;

                        // Create download link
                        console.log('Checking window.utilities:', window.utilities);
                        console.log('Checking createDownloadLink:', window.utilities?.createDownloadLink);
                        
                        if (window.utilities?.createDownloadLink) {
                            console.log('Creating download link...');
                            const csvData = generateFailedEmailsCSV();
                            console.log('CSV data:', csvData);
                            const downloadLink = window.utilities.createDownloadLink(
                                csvData,
                                'failed_reset_emails.csv',
                                '📥 Download Failed Emails'
                            );
                            console.log('Download link created:', downloadLink);
                            failedContainer.appendChild(downloadLink);
                            console.log('Download link appended to container');
                        } else {
                            console.error('window.utilities.createDownloadLink is not available!');
                        }

                        // Add reprocess button
                        const reprocessBtn = document.createElement('button');
                        reprocessBtn.className = 'btn btn-warning ms-2';
                        reprocessBtn.textContent = '🔄 Reprocess Failed Emails';
                        reprocessBtn.title = 'Attempt to reset the failed emails again';
                        failedContainer.appendChild(reprocessBtn);

                        return reprocessBtn;
                    };

                    // Initial display
                    const reprocessBtn = updateFailedDisplay();
                    console.log('Appending failedContainer to uploadContainer...');
                    uploadContainer.appendChild(failedContainer);
                    console.log('failedContainer appended successfully. Children count:', uploadContainer.children.length);

                    reprocessBtn.addEventListener('click', async (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        const confirmReprocess = confirm(`Are you sure you want to reprocess ${failedEmailsMap.size} failed email(s)? This will attempt to reset them again.`);
                        if (!confirmReprocess) return;

                        // Disable the reprocess button during operation
                        reprocessBtn.disabled = true;
                        reprocessBtn.textContent = '🔄 Processing...';

                        // Create array of failed emails for reprocessing
                        const failedEmailsToReprocess = Array.from(failedEmailsMap.keys());

                        const reprocessRequestData = {
                            domain,
                            token,
                            region: regionVal,
                            fileContents: failedEmailsToReprocess,
                            ext: 'array' // Indicate this is an array of emails
                        };

                        try {
                            // Show progress card for reprocessing
                            progressCard.hidden = false;
                            resultsCard.hidden = false; // Keep results visible
                            progressCardTitle.textContent = 'Reprocessing Failed Emails';
                            progressInfo.textContent = 'Processing bounce counts...';
                            progressBar.style.width = '0%';
                            progressBar.setAttribute('aria-valuenow', '0');
                            progressDetail.textContent = `0/${failedEmailsToReprocess.length} emails`;

                            const reprocessResponse = await window.axios.resetEmails(reprocessRequestData);
                            
                            // Hide progress card
                            progressCard.hidden = true;

                            // Create a new container for reprocess results
                            const reprocessContainer = document.createElement('div');
                            reprocessContainer.style.marginTop = '15px';
                            reprocessContainer.style.padding = '10px';
                            reprocessContainer.style.border = '2px solid #ffc107';
                            reprocessContainer.style.borderRadius = '5px';
                            reprocessContainer.style.backgroundColor = '#fff3cd';

                            const reprocessTotalProcessed = reprocessResponse.combinedResults.summary.totalEmailsProcessed || 0;
                            const reprocessBounceReset = reprocessResponse.combinedResults.summary.bounceListResets || 0;
                            const reprocessAWSReset = reprocessResponse.combinedResults.summary.suppressionListRemoved || 0;
                            const reprocessSuppressionNotFound = reprocessResponse.combinedResults.summary.suppressionListNotFound || 0;
                            const reprocessSuppressionNotRemoved = reprocessResponse.combinedResults.summary.suppressionListNotRemoved || 0;

                            reprocessContainer.innerHTML = `<h6 style="color: #856404;">Reprocess Results</h6>`;
                            reprocessContainer.innerHTML += `<p><strong>Reprocessed:</strong> ${reprocessTotalProcessed} email(s)</p>`;

                            // Display suppression errors if any exist
                            const reprocessSuppressionErrors = reprocessResponse.combinedResults?.details?.suppressionResults?.failed_messages || [];
                            if (reprocessSuppressionErrors.length > 0) {
                                reprocessContainer.innerHTML += `<div class="alert alert-danger mt-2" role="alert" style="background-color: #f8d7da; border-color: #f5c2c7; color: #842029;">
                                    <strong>Suppression List Errors:</strong>
                                    <ul class="mb-0 mt-2">
                                        ${reprocessSuppressionErrors.map(msg => `<li>${msg}</li>`).join('')}
                                    </ul>
                                </div>`;
                            }

                            if (reprocessBounceReset > 0) {
                                reprocessContainer.innerHTML += `<p><strong>✅ Bounce List:</strong> Successfully cleared ${reprocessBounceReset} email(s)</p>`;
                            }
                            if (reprocessAWSReset > 0) {
                                reprocessContainer.innerHTML += `<p><strong>✅ Suppression List:</strong> Successfully removed ${reprocessAWSReset} email(s)</p>`;
                            }
                            if (reprocessSuppressionNotFound > 0) {
                                reprocessContainer.innerHTML += `<p><strong>ℹ️ Suppression List:</strong> ${reprocessSuppressionNotFound} email(s) not found (may have been removed in previous attempt)</p>`;
                            }
                            if (reprocessSuppressionNotRemoved > 0) {
                                reprocessContainer.innerHTML += `<p><strong>❌ Suppression List:</strong> ${reprocessSuppressionNotRemoved} email(s) still could not be removed</p>`;
                            }

                            // Update failedEmailsMap based on reprocessing results
                            // Remove emails that succeeded in reprocessing
                            const reprocessBounceFailed = new Set();
                            const reprocessSuppressionFailed = new Set();

                            // Track new bounce failures from reprocessing
                            if (reprocessResponse.combinedResults?.details?.bounceResults?.failed) {
                                reprocessResponse.combinedResults.details.bounceResults.failed.forEach(item => {
                                    const email = item?.value?.email || item?.email || 'unknown';
                                    reprocessBounceFailed.add(email);
                                });
                            }

                            // Track new suppression failures from reprocessing - Updated to use new structure
                            if (reprocessResponse.combinedResults?.details?.suppressionResults?.data?.not_removed) {
                                reprocessResponse.combinedResults.details.suppressionResults.data.not_removed.forEach(email => {
                                    reprocessSuppressionFailed.add(email);
                                });
                            }

                            // Update the map: remove successful resets, keep/update failures
                            for (const email of failedEmailsToReprocess) {
                                const stillFailedBounce = reprocessBounceFailed.has(email);
                                const stillFailedSuppression = reprocessSuppressionFailed.has(email);
                                
                                if (!stillFailedBounce && !stillFailedSuppression) {
                                    // Email succeeded in reprocessing - remove from failed list
                                    failedEmailsMap.delete(email);
                                } else {
                                    // Update failure status
                                    failedEmailsMap.set(email, {
                                        bounceFailed: stillFailedBounce,
                                        suppressionFailed: stillFailedSuppression
                                    });
                                }
                            }

                            // Calculate final statistics
                            const stillFailedCount = failedEmailsMap.size;
                            const successfulCount = failedEmailsToReprocess.length - stillFailedCount;

                            if (stillFailedCount > 0) {
                                reprocessContainer.innerHTML += `<p><strong>⚠️ Still Failed:</strong> ${stillFailedCount} email(s) continue to fail after reprocessing</p>`;
                                reprocessContainer.innerHTML += `<p><strong>✅ Successfully Reset:</strong> ${successfulCount} email(s) were successfully reset during reprocessing</p>`;
                            } else {
                                reprocessContainer.innerHTML += `<p><strong>🎉 Success:</strong> All ${successfulCount} previously failed emails have been successfully processed!</p>`;
                            }

                            // Update the main failed display with new counts
                            updateFailedDisplay();

                            uploadContainer.appendChild(reprocessContainer);

                        } catch (reprocessError) {
                            progressCard.hidden = true;
                            const errorContainer = document.createElement('div');
                            errorContainer.style.marginTop = '15px';
                            errorContainer.style.color = 'red';
                            errorContainer.innerHTML = `<p><strong>Error during reprocessing:</strong> ${reprocessError.message}</p>`;
                            uploadContainer.appendChild(errorContainer);
                        } finally {
                            // Re-enable the reprocess button if there are still failures
                            if (failedEmailsMap.size > 0) {
                                reprocessBtn.disabled = false;
                                reprocessBtn.textContent = '🔄 Reprocess Failed Emails';
                            } else {
                                // Hide reprocess button if all emails succeeded
                                reprocessBtn.remove();
                            }
                        }
                    });
                }
            } catch (error) {
                progressCard.hidden = true;
                resultsCard.hidden = false;
                if (String(error.message || error).toLowerCase().includes('cancelled')) {
                    uploadContainer.innerHTML = '<div class="alert alert-warning" role="alert"><i class="bi bi-exclamation-circle me-2"></i>Processing was cancelled.</div>';
                } else {
                    errorHandler(error, uploadContainer);
                }
            } finally {
                uploadResetBtn.disabled = false;
                if (typeof unsubscribeProgress === 'function') {
                    unsubscribeProgress();
                }
                cancelBtn.hidden = true;
                cancelBtn.disabled = true;
            }
        });

        // Cancel button handler for long-running resets
        cancelBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            cancelBtn.disabled = true;
            try {
                // Try both possible operations; backend ignores if not running
                await Promise.race([
                    window.axios.cancelResetEmails?.(),
                    window.axios.cancelResetCommChannelsByPattern?.()
                ]);
            } catch (_) { /* ignore */ }
        });

    } // End of event listener binding check
}

function unconfirmed(e) {
    hideEndpoints(e);

    const eContent = document.querySelector('#endpoint-content');
    let unconfirmedEmailForm = eContent.querySelector('#unconfirmed-emails-form');

    if (!unconfirmedEmailForm) {
        unconfirmedEmailForm = document.createElement('form');
        unconfirmedEmailForm.id = 'unconfirmed-emails-form';

        // eContent.append(eHeader);
        // eContent.innerHTML = `
        //     <div>
        //         <h3>Unconfirmed emails</h3>
        //     </div>
        // `;

        // const eForm = document.createElement('form');
        unconfirmedEmailForm.innerHTML = `
            <style>
                #unconfirmed-emails-form .card { font-size: 0.875rem; }
                #unconfirmed-emails-form .card-header h3 { font-size: 1.1rem; margin-bottom: 0.25rem; }
                #unconfirmed-emails-form .card-header small { font-size: 0.75rem; }
                #unconfirmed-emails-form .card-body { padding: 0.75rem; }
                #unconfirmed-emails-form .form-label, #unconfirmed-emails-form .form-check-label { font-size: 0.8rem; margin-bottom: 0.25rem; }
                #unconfirmed-emails-form .form-control, #unconfirmed-emails-form .form-select { 
                    font-size: 0.8rem; 
                    padding: 0.25rem 0.5rem;
                    height: auto;
                }
                #unconfirmed-emails-form .btn { 
                    font-size: 0.8rem; 
                    padding: 0.35rem 0.75rem;
                }
                #unconfirmed-emails-form .form-check { margin-bottom: 0.5rem; }
                #unconfirmed-emails-form .form-text { font-size: 0.7rem; margin-top: 0.15rem; }
                #unconfirmed-emails-form .mt-2 { margin-top: 0.5rem !important; }
                #unconfirmed-emails-form .mt-3 { margin-top: 0.75rem !important; }
                #unconfirmed-emails-form .mt-5 { margin-top: 1.25rem !important; }
                #unconfirmed-emails-form .mb-2 { margin-bottom: 0.5rem !important; }
                #unconfirmed-emails-form .mb-3 { margin-bottom: 0.75rem !important; }
                #unconfirmed-emails-form .progress { height: 12px !important; }
                #unconfirmed-emails-form h5 { font-size: 1rem; }
                #unconfirmed-emails-form h6 { font-size: 0.9rem; }
                #unconfirmed-emails-form p { margin-bottom: 0.5rem; font-size: 0.85rem; }
                #unconfirmed-emails-form .alert { padding: 0.5rem 0.75rem; font-size: 0.8rem; }
                #unconfirmed-emails-form .badge { font-size: 0.75rem; }
                #unconfirmed-emails-form hr { margin: 0.5rem 0; }
            </style>
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-envelope-exclamation me-1"></i>Unconfirmed Emails
                    </h3>
                    <small class="text-muted">Find and manage unconfirmed email addresses</small>
                </div>
                <div class="card-body">
            <div id="switches">
                <div class="form-check form-switch">
                    <label class="form-check-label" for="uncofirmed-email-switch">Check for unconfirmed emails</label>
                    <input class="form-check-input" type="checkbox" role="switch" id="unconfirmed-email-switch">
                    <div id="email-pattern-div" hidden>
                        <input id="unconfirmed-email-pattern" type="text" class="form-control form-control-sm" placeholder="email.domain.edu" aria-describedby="unconfirmed-pattern-description">
                        <div id="email-warning" style="color: red;" class="form-text" hidden>***Must enter a pattern***</div>
                        <span id="unconfirmed-pattern-description" class="form-text">Email domain pattern to search for unconfirmed emails (wildcards accepted *pattern*edu)</span>
                    </div>
                </div>
                <div class="form-check form-switch">
                    <label class="form-check-label" for="confirm-email-switch">Upload file of emails to confirm (TXT or CSV)</label>
                    <input class="form-check-input" type="checkbox" role="switch" id="upload-email-switch" aria-describedby="confirm-file-description">
                    <div id="confirm-file-description" class="form-text" hidden>TXT: One email per line. CSV: Must have a column named 'path', 'email', 'email_address', or 'communication_channel_path' containing email addresses.</div>
                </div>
                <div class="form-check form-switch">
                    <label class="form-check-label" for="confirm-email-list-switch">Input list of emails to confirm</label>
                    <input class="form-check-input" type="checkbox" role="switch" id="confirm-email-list-switch" aria-describedby="confirm-email-list-desc">
                    <div id="confirm-email-list-box" hidden>
                        <textarea class="form-control form-control-sm" id="email-list-box" rows="3" placeholder="example1@example.com,example2@example.com, etc."></textarea>
                    </div>
                </div>
            </div>
            <button type="button" class="btn btn-sm btn-primary mt-2" id="unconfirmed-check-btn" disabled>Check</button>
            <button type="button" class="btn btn-sm btn-primary mt-2" id="upload-email-btn" hidden disabled>Upload</button>
            <button type="button" class="btn btn-sm btn-primary mt-2" id="confirm-email-btn" hidden disabled>Confirm</button>
    
            <div hidden id="progress-div">
                <p id="progress-info"></p>
                <div id="loading-wheel" hidden>
                    <div class="spinner-border spinner-border-sm" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
                <div class="progress mt-2" style="width: 75%; height: 12px;" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
            </div>
            <div id="response-container" class="mt-3">
                <div id="loading-wheel" hidden>
                    <div class="spinner-border spinner-border-sm" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
                <div id="response"></div>
            </div>
            `
        eContent.append(unconfirmedEmailForm);
    }
    unconfirmedEmailForm.hidden = false;

    // Prevent duplicate event listeners by checking if already bound
    if (unconfirmedEmailForm.dataset.boundEventListeners !== 'true') {
        unconfirmedEmailForm.dataset.boundEventListeners = 'true';

        const switchListener = unconfirmedEmailForm.querySelector('#switches');
        switchListener.addEventListener('change', (e) => {
            e.preventDefault();
            e.stopPropagation();

            console.log('inside switchListerner');
            console.log('the target', e.target);
            if (e.target.id === "unconfirmed-email-pattern") {
                return;
            }

            handleSwitches(e);
        })

        function handleSwitches(e) {
            const inputs = switchListener.querySelectorAll('input');
            const patternDiv = unconfirmedEmailForm.querySelector('#email-pattern-div');
            const fileSpan = unconfirmedEmailForm.querySelector('#confirm-file-description');
            const confirmDiv = unconfirmedEmailForm.querySelector('#confirm-email-list-box')
            // disable all other inputs inputs
            for (let input of inputs) {
                if (input.id !== e.target.id) {
                    input.checked = false;
                }
            }

            // showing the correct button
            if (e.target.checked === false) {
                unconfirmBtn.disabled = true;
                confirmBtn.disabled = true;
                uploadBtn.disabled = true;
            } else if (e.target.id.includes('unconfirm')) {
                unconfirmBtn.hidden = false;
                unconfirmBtn.disabled = false;
                patternDiv.hidden = false;
                confirmBtn.hidden = true;
                confirmBtn.disabled = true;
                confirmDiv.hidden = true;
                uploadBtn.hidden = true;
                uploadBtn.disabled = true;
                fileSpan.hidden = true;
            } else if (e.target.id.includes('upload')) {
                unconfirmBtn.hidden = true;
                unconfirmBtn.disabled = true;
                patternDiv.hidden = true;
                confirmBtn.hidden = true;
                confirmBtn.disabled = true;
                confirmDiv.hidden = true;
                uploadBtn.disabled = false;
                uploadBtn.hidden = false;
                fileSpan.hidden = false;
            } else {
                unconfirmBtn.hidden = true;
                unconfirmBtn.disabled = true;
                patternDiv.hidden = true;
                confirmBtn.hidden = false;
                // confirmBtn.disabled = false;
                confirmDiv.hidden = false;
                uploadBtn.disabled = true;
                uploadBtn.hidden = true;
                fileSpan.hidden = true;
            }
        }


        const unconfirmBtn = unconfirmedEmailForm.querySelector('#unconfirmed-check-btn');
        const uploadBtn = unconfirmedEmailForm.querySelector('#upload-email-btn');
        const confirmBtn = unconfirmedEmailForm.querySelector('#confirm-email-btn');
        unconfirmBtn.addEventListener('click', handleUnconfirmedCheck);
        confirmBtn.addEventListener('click', handleConfirmCheck);
        uploadBtn.addEventListener('click', handleUploadCheck);

        const emailBox = unconfirmedEmailForm.querySelector('#email-list-box');
        emailBox.addEventListener('input', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const inputSwitch = unconfirmedEmailForm.querySelector('#confirm-email-list-switch');

            confirmBtn.disabled = emailBox.value.length < 1 || !inputSwitch.checked;
        })

        async function handleUnconfirmedCheck(e) {
            e.preventDefault();
            e.stopPropagation();
            unconfirmBtn.disabled = true;

            console.log('Inside handleUnonfirmedCheck');
            const domain = document.querySelector('#domain').value.trim();
            const token = document.querySelector('#token').value.trim();
            const emailPatternInput = unconfirmedEmailForm.querySelector('#unconfirmed-email-pattern');
            const emailPattern = emailPatternInput.value.trim();
            const emailWarning = unconfirmedEmailForm.querySelector('#email-warning');
            const progresDiv = unconfirmedEmailForm.querySelector('#progress-div');
            const responseContainer = unconfirmedEmailForm.querySelector('#response-container');
            const responseDetails = unconfirmedEmailForm.querySelector('#response');

            if (emailPattern.length < 1) {
                emailWarning.hidden = false;
                emailPatternInput.focus();
                unconfirmBtn.disabled = false;
                return;
            } else {
                emailWarning.hidden = true;
            }

            const requestData = {
                domain: domain,
                token: token,
                pattern: emailPattern
            };

            try {
                // progresDiv.hidden = false;
                responseContainer.querySelector('div').hidden = false; // showing the spinning wheel
                const response = await window.axios.checkUnconfirmedEmails(requestData)
                responseContainer.querySelector('div').hidden = true;
                
                if (response.success && response.data) {
                    // Create download link for the CSV data
                    responseDetails.innerHTML = '<p class="mb-2">Unconfirmed emails list ready:</p>';
                    
                    if (window.utilities?.createDownloadLink) {
                        const downloadLink = window.utilities.createDownloadLink(
                            response.data,
                            'unconfirmed_emails.csv',
                            '📥 Download Unconfirmed Emails CSV'
                        );
                        responseDetails.appendChild(downloadLink);
                    } else {
                        responseDetails.innerHTML += '<p class="text-muted">Download utility not available.</p>';
                    }
                } else {
                    responseDetails.innerHTML = 'No data returned.';
                }
            } catch (error) {
                console.log('There was an error', error);
                responseContainer.querySelector('div').hidden = true;
                errorHandler(error, responseDetails);
            } finally {
                unconfirmBtn.disabled = false;
                progresDiv.hidden = true;
            }
        }

        async function handleUploadCheck(e) {
            e.preventDefault();
            e.stopPropagation();
            uploadBtn.disabled = true;

            const responseContainer = unconfirmedEmailForm.querySelector('#response-container');
            const responseDiv = responseContainer.querySelector('#response');
            
            responseDiv.innerHTML = '';

            try {
                // Step 1: Analyze the file
                const analysis = await window.fileUpload.analyzeEmailFile();

                if (analysis.cancelled) {
                    uploadBtn.disabled = false;
                    return;
                }

                const { count, emails, fileName } = analysis;

                // Show analysis results with confirmation
                responseDiv.innerHTML = `
                    <div class="card mt-2">
                        <div class="card-header bg-info text-white">
                            <h5 class="card-title mb-0">
                                <i class="bi bi-file-earmark-text me-1"></i>File Analysis
                            </h5>
                        </div>
                        <div class="card-body">
                            <p><strong>File:</strong> ${fileName}</p>
                            <p><strong>Emails found:</strong> <span class="badge bg-primary">${count}</span></p>
                            <p class="mb-0">Do you want to confirm these ${count} email(s)?</p>
                            <div class="mt-2">
                                <button id="confirm-upload-btn" class="btn btn-sm btn-success">
                                    <i class="bi bi-check-circle me-1"></i>Yes, Confirm Emails
                                </button>
                                <button id="cancel-upload-btn" class="btn btn-sm btn-secondary ms-2">
                                    <i class="bi bi-x-circle me-1"></i>Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                `;

                // Handle confirmation
                const confirmUploadBtn = responseDiv.querySelector('#confirm-upload-btn');
                const cancelUploadBtn = responseDiv.querySelector('#cancel-upload-btn');

                cancelUploadBtn.addEventListener('click', () => {
                    responseDiv.innerHTML = '<div class="alert alert-info">Operation cancelled.</div>';
                    uploadBtn.disabled = false;
                });

                confirmUploadBtn.addEventListener('click', async () => {
                    // Step 2: Process the emails
                    const domain = document.querySelector('#domain').value.trim();
                    const token = document.querySelector('#token').value.trim();

                    // Show progress card
                    responseDiv.innerHTML = `
                        <div class="card mt-2" id="progress-card">
                            <div class="card-header bg-primary text-white">
                                <h5 class="card-title mb-0">
                                    <i class="bi bi-gear me-1"></i>Processing Emails
                                </h5>
                            </div>
                            <div class="card-body">
                                <p class="mb-2">Confirming email addresses...</p>
                                <div class="progress mb-2" style="height: 12px;">
                                    <div class="progress-bar progress-bar-striped progress-bar-animated" 
                                         id="confirm-progress-bar" 
                                         style="width:0%" 
                                         role="progressbar" 
                                         aria-valuenow="0" 
                                         aria-valuemin="0" 
                                         aria-valuemax="100">
                                    </div>
                                </div>
                                <small class="text-muted" id="progress-detail">Processed: 0 / ${count}</small>
                            </div>
                        </div>
                    `;

                    const progressBar = responseDiv.querySelector('#confirm-progress-bar');
                    const progressDetail = responseDiv.querySelector('#progress-detail');

                    // Subscribe to progress updates
                    let processedCount = 0;
                    let unsubscribeProgress = null;
                    if (window.progressAPI) {
                        unsubscribeProgress = window.progressAPI.onUpdateProgress((payload) => {
                            try {
                                if (payload && typeof payload === 'object') {
                                    if (typeof payload.value === 'number') {
                                        const percentage = Math.round(payload.value * 100);
                                        progressBar.style.width = `${percentage}%`;
                                        progressBar.setAttribute('aria-valuenow', percentage);
                                        processedCount = Math.round(payload.value * count);
                                        progressDetail.textContent = `Processed: ${processedCount} / ${count}`;
                                    }
                                }
                            } catch (err) {
                                console.error('Progress update error:', err);
                            }
                        });
                    }

                    try {
                        const requestData = {
                            domain: domain,
                            token: token,
                            emails: emails
                        };

                        const result = await window.fileUpload.confirmEmails(requestData);

                        // Show summary card
                        responseDiv.innerHTML = `
                            <div class="card mt-2 border-success">
                                <div class="card-header bg-success text-white">
                                    <h5 class="card-title mb-0">
                                        <i class="bi bi-check-circle me-1"></i>Confirmation Complete
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <p><strong>Total Processed:</strong> <span class="badge bg-primary">${result.total}</span></p>
                                    <p><strong>Successfully Confirmed:</strong> <span class="badge bg-success">${result.confirmed}</span></p>
                                    ${result.failed && result.failed.length > 0 ? 
                                        `<p><strong>Failed:</strong> <span class="badge bg-danger">${result.failed.length}</span></p>` : 
                                        '<p class="text-muted mb-0">All emails processed successfully!</p>'
                                    }
                                    <div class="form-text mt-2">Note: The number of emails confirmed may differ from the number processed if some emails were already confirmed.</div>
                                    ${result.failed && result.failed.length > 0 ? 
                                        `<div class="alert alert-danger mt-2 mb-0">
                                            <strong>Error Details:</strong> ${result.failed[0].reason || 'Unknown error'}
                                        </div>` : ''
                                    }
                                </div>
                            </div>
                        `;
                    } catch (error) {
                        responseDiv.innerHTML = `
                            <div class="alert alert-danger mt-2">
                                <strong>Error:</strong> ${error.message || 'An error occurred while confirming emails'}
                            </div>
                        `;
                    } finally {
                        if (unsubscribeProgress) unsubscribeProgress();
                        uploadBtn.disabled = false;
                    }
                });

            } catch (error) {
                responseDiv.innerHTML = `
                    <div class="alert alert-danger mt-2">
                        <strong>Error:</strong> ${error.message || 'An error occurred while analyzing the file'}
                    </div>
                `;
                uploadBtn.disabled = false;
            }
        }

        async function handleConfirmCheck(e) {
            e.preventDefault();
            e.stopPropagation();
            confirmBtn.disabled = true;

            const domain = document.querySelector('#domain').value.trim();
            const token = document.querySelector('#token').value.trim();
            const responseContainer = unconfirmedEmailForm.querySelector('#response-container');
            const responseDiv = responseContainer.querySelector('#response');
            
            const emails = emailBox.value.split(/\r?\n|\n|\,/)
                .map((email) => email.trim())
                .filter(email => email.length > 0);

            responseDiv.innerHTML = '';

            const count = emails.length;

            // Show progress card
            responseDiv.innerHTML = `
                <div class="card mt-2" id="progress-card-list">
                    <div class="card-header bg-primary text-white">
                        <h5 class="card-title mb-0">
                            <i class="bi bi-gear me-1"></i>Processing Emails
                        </h5>
                    </div>
                    <div class="card-body">
                        <p class="mb-2">Confirming email addresses...</p>
                        <div class="progress mb-2" style="height: 12px;">
                            <div class="progress-bar progress-bar-striped progress-bar-animated" 
                                 id="confirm-progress-bar-list" 
                                 style="width:0%" 
                                 role="progressbar" 
                                 aria-valuenow="0" 
                                 aria-valuemin="0" 
                                 aria-valuemax="100">
                            </div>
                        </div>
                        <small class="text-muted" id="progress-detail-list">Processed: 0 / ${count}</small>
                    </div>
                </div>
            `;

            const progressBar = responseDiv.querySelector('#confirm-progress-bar-list');
            const progressDetail = responseDiv.querySelector('#progress-detail-list');

            // Subscribe to progress updates
            let unsubscribeProgress = null;
            if (window.progressAPI) {
                unsubscribeProgress = window.progressAPI.onUpdateProgress((payload) => {
                    try {
                        if (payload && typeof payload === 'object') {
                            if (typeof payload.value === 'number') {
                                const percentage = Math.round(payload.value * 100);
                                progressBar.style.width = `${percentage}%`;
                                progressBar.setAttribute('aria-valuenow', percentage);
                                const processedCount = Math.round(payload.value * count);
                                progressDetail.textContent = `Processed: ${processedCount} / ${count}`;
                            }
                        }
                    } catch (err) {
                        console.error('Progress update error:', err);
                    }
                });
            }

            const requestData = {
                domain: domain,
                token: token,
                emails: emails
            };

            try {
                const result = await window.axios.confirmEmails(requestData);

                // Show summary card
                responseDiv.innerHTML = `
                    <div class="card mt-2 border-success">
                        <div class="card-header bg-success text-white">
                            <h5 class="card-title mb-0">
                                <i class="bi bi-check-circle me-1"></i>Confirmation Complete
                            </h5>
                        </div>
                        <div class="card-body">
                            <p><strong>Total Processed:</strong> <span class="badge bg-primary">${result.total || count}</span></p>
                            <p><strong>Successfully Confirmed:</strong> <span class="badge bg-success">${result.confirmed}</span></p>
                            ${result.failed && result.failed.length > 0 ? 
                                `<p><strong>Failed:</strong> <span class="badge bg-danger">${result.failed.length}</span></p>` : 
                                '<p class="text-muted mb-0">All emails processed successfully!</p>'
                            }
                            <div class="form-text mt-2">Note: The number of emails confirmed may differ from the number processed if some emails were already confirmed.</div>
                            ${result.failed && result.failed.length > 0 ? 
                                `<div class="alert alert-danger mt-2 mb-0">
                                    <strong>Error Details:</strong> ${result.failed[0].reason || 'Unknown error'}
                                </div>` : ''
                            }
                        </div>
                    </div>
                `;
            } catch (error) {
                responseDiv.innerHTML = `
                    <div class="alert alert-danger mt-2">
                        <strong>Error:</strong> ${error.message || 'An error occurred while confirming emails'}
                    </div>
                `;
            } finally {
                // Re-enable the confirm button so user can process again
                confirmBtn.disabled = false;
                if (typeof unsubscribeProgress === 'function') unsubscribeProgress();
            }

        }

    } // End of event listener binding check
}