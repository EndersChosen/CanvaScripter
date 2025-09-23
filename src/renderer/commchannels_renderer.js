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
            <div>
                <h3>Check suppression and bounce list</h3>
            </div>
                <div class="row">
                    <div class="mb-3">
                        <div class="col-auto">
                            <label for="region" class="form-label">Region: </label>
                        </div>
                        <div class="col-2">
                            <select id="region" class="form-select" aria-label="Region info">
                                <option value="iad_pdx" selected>IAD/PDX</option>
                                <option value="dub_fra">DUB/FRA</option>
                                <option value="syd_sin">SYD/SIN</option>
                                <option value="yul">YUL</option>
                            </select>
                        </div>
                    </div>
                    <div id="email-options">
                        <div class="form-check form-switch">
                            <label class="form-label" for="single-email-chkbx">Single Email</label>
                            <input id="single-email-chkbx" type="checkbox" class="form-check-input" role="switch">
                        </div>
                        <div class="form-check form-switch">
                            <label class="form-label" for="domain-email-chkbx">Domain</label>
                            <input id="domain-email-chkbx" type="checkbox" class="form-check-input" role="switch">
                        </div>
                        <div class="form-check form-switch">
                            <label class="form-label" for="file-upload-chkbx">File Upload</label>
                            <input id="file-upload-chkbx" type="checkbox" class="form-check-input" role="switch">
                        </div>
                    </div>
                    <div id="single-email-section" class="mt-3" hidden>
                        <div class="col-auto">
                            <label id="email-label" for="email" class="form-label">Email</label>
                        </div>
                        <div class="w-100"></div>
                        <div class="col-5">
                            <input type="text" id="email" class="form-control" aria-describedby="email-form-text">
                        </div>
                        <div class="form-text" id="email-form-text">
                            Enter the full email address you want to check
                        </div>
                    </div>
                    <div id="domain-section" class="mt-3" hidden>
                        <div class="col-auto">
                            <label id="domain-label" for="domain-input" class="form-label">Domain</label>
                        </div>
                        <div class="w-100"></div>
                        <div class="col-5">
                            <input type="text" id="domain-input" class="form-control" aria-describedby="domain-form-text">
                        </div>
                        <div class="form-text" id="domain-form-text">
                            Enter the domain pattern you want to check. You can use a wildcard at the beginning and end, for example *student* will match anything that has student in the email. <p><p>NOTE: This queries the entire aws region and will take some time, we're talking hours in some cases.</p></p>
                        </div>
                    </div>
                    <div id="file-upload-section" class="mt-3" hidden>
                        <label for="email-upload" class="form-label">Upload CSV of emails</label>
                        <input type="file" id="email-upload" accept=".csv" class="form-control" />
                    </div>
                </div>
            <button type="button" class="btn btn-primary mt-3" id="dynamic-check-btn" disabled>Check</button>
            <button type="button" class="btn btn-outline-secondary mt-3 ms-2" id="cancel-btn" hidden>Cancel</button>
            <div id="progress-div" hidden>
                <p id="progress-info"></p>
                <div id="loading-wheel">
                    <div class="spinner-border" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
                <div class="progress mt-3" style="width: 75%" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
            </div>
            <div id="response-container" class="mt-5">
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
                try {
                    // Parse the uploaded file immediately
                    const reader = new FileReader();
                    reader.onload = async function (event) {
                        try {
                            const csvContent = event.target.result;
                            // Use the parseEmailsFromCSV function via IPC
                            const result = await window.ipcRenderer.invoke('parseEmailsFromCSV', csvContent);

                            selectedEmails = result.emails || [];

                            // Update UI to show file parsed successfully
                            const responseContainer = checkSuppressionListForm.querySelector('#response-container');
                            responseContainer.innerHTML = `
                                <div class="alert alert-success">
                                    <strong>✓ File parsed successfully!</strong><br>
                                    Found ${selectedEmails.length} email addresses in "${file.name}"
                                    ${file.name.includes('bounced_communication') ?
                                    '<br><small class="text-muted">Detected Canvas bounced communication channels format</small>' : ''}
                                </div>`;

                            // Enable the button if checkbox is checked
                            dynamicBtn.disabled = !fileUploadChkbx.checked || selectedEmails.length === 0;

                        } catch (error) {
                            console.error('Error parsing file:', error);
                            selectedEmails = [];
                            const responseContainer = checkSuppressionListForm.querySelector('#response-container');
                            responseContainer.innerHTML = `
                                <div class="alert alert-danger">
                                    <strong>Error parsing file:</strong><br>
                                    ${error.message}
                                </div>`;
                            dynamicBtn.disabled = true;
                        }
                    };
                    reader.readAsText(file);
                } catch (error) {
                    console.error('File upload error:', error);
                    selectedEmails = [];
                    dynamicBtn.disabled = true;
                }
            } else {
                selectedEmails = [];
                dynamicBtn.disabled = !fileUploadChkbx.checked || !uploadInput.files || uploadInput.files.length === 0;
            }
        });

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
            singleEmailSection.hidden = true;
            domainSection.hidden = true;
            fileUploadSection.hidden = true;

            // Clear response container when switching modes
            const responseContainer = checkSuppressionListForm.querySelector('#response-container');
            responseContainer.innerHTML = '';

            // Show appropriate section and update button
            if (singleEmailChkbx.checked) {
                singleEmailSection.hidden = false;
                dynamicBtn.textContent = 'Check Email';
                dynamicBtn.disabled = emailInput.value.trim() === '';
            } else if (domainEmailChkbx.checked) {
                domainSection.hidden = false;
                dynamicBtn.textContent = 'Check Domain';
                dynamicBtn.disabled = domainInput.value.trim() === '';
            } else if (fileUploadChkbx.checked) {
                fileUploadSection.hidden = false;
                dynamicBtn.textContent = 'Check Uploaded Emails';
                dynamicBtn.disabled = selectedEmails.length === 0;
            } else {
                // No switch selected, clear uploaded emails
                selectedEmails = [];
                dynamicBtn.textContent = 'Check';
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
            const progresDiv = checkSuppressionListForm.querySelector('#progress-div');
            const loadingWheel = progresDiv.querySelector('#loading-wheel');
            const progressBarWrapper = progresDiv.querySelector('.progress');
            const progressInfo = progresDiv.querySelector('#progress-info');

            if (window.ProgressUtils && window.progressAPI) {
                window.ProgressUtils.attachGlobalProgressListener({ container: progresDiv });
            }

            responseContainer.innerHTML = '';

            const data = {
                domain: domain,
                token: apiToken,
                region: region,
                pattern: email
            };

            let response;
            let hasError = false;
            try {
                responseContainer.innerHTML = 'Checking email....';
                progresDiv.hidden = false;
                // Use spinner for single email check (quick operation)
                loadingWheel.hidden = false;
                progressBarWrapper.hidden = true;
                progressInfo.textContent = '';
                response = await window.axios.checkCommChannel(data);
            } catch (error) {
                hasError = true;
                errorHandler(error, responseContainer);
            } finally {
                dynamicBtn.disabled = false;
                responseContainer.innerHTML += '<p>Done.</p>';
                progresDiv.hidden = true;
                currentProcessType = null;
            }

            if (!hasError) {
                responseContainer.innerHTML += `<p>Suppressed: <span style="color: ${response.suppressed ? 'red' : 'green'}">${response.suppressed ? 'Yes' : 'No'}</span></p>`;
                responseContainer.innerHTML += `<p>Bounced: <span style="color: ${response.bounced ? 'red' : 'green'}">${response.bounced ? 'Yes' : 'No'}</span></p>`;
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
            const loadingWheel = progresDiv.querySelector('#loading-wheel');
            const progressBarWrapper = progresDiv.querySelector('.progress');
            const progressInfo = progresDiv.querySelector('#progress-info');

            if (window.ProgressUtils && window.progressAPI) {
                window.ProgressUtils.attachGlobalProgressListener({ container: progresDiv });
            }

            responseContainer.innerHTML = '';

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
                // Use spinner for domain check (can be long but indeterminate)
                loadingWheel.hidden = false;
                progressBarWrapper.hidden = true;
                progressInfo.textContent = '';

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
            try {
                // Check if we have parsed emails
                if (!selectedEmails || selectedEmails.length === 0) {
                    alert('Please select and upload a CSV file first.');
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
                const loadingWheel = progresDiv.querySelector('#loading-wheel');
                const progressBarWrapper = progresDiv.querySelector('.progress'); progresDiv.hidden = false;
                // Hide spinner and show progress bar for file upload
                loadingWheel.hidden = true;
                progressBarWrapper.hidden = false;
                progressInfo.textContent = 'Processing emails...';

                const responseContainer = checkSuppressionListForm.querySelector('#response-container');
                responseContainer.innerHTML = 'Starting email check...';
                // Results array
                const results = [];
                const totalEmails = emails.length;

                for (let i = 0; i < emails.length; i++) {
                    // Check for cancellation at the start of each iteration
                    if (isCancelled) {
                        responseContainer.innerHTML += '<p style="color: orange;">Processing cancelled by user.</p>';
                        break;
                    }

                    const email = emails[i];
                    const currentProgress = ((i + 1) / totalEmails) * 100;

                    // Update progress bar and info
                    progressBar.style.width = `${currentProgress}%`;
                    progressBar.setAttribute('aria-valuenow', Math.round(currentProgress));
                    progressInfo.textContent = `Processing ${i + 1} of ${totalEmails} emails (${Math.round(currentProgress)}%)`;
                    responseContainer.innerHTML = `Checking ${i + 1} of ${emails.length}: ${email}`;

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
                    // Filter to only include emails that are suppressed or bounced
                    const problematicEmails = results.filter(r => r.suppressed || r.bounced);

                    if (problematicEmails.length > 0) {
                        // Generate CSV with only suppressed or bounced emails
                        const csv = ['email,suppressed,bounced'].concat(
                            problematicEmails.map(r => `${r.email},${r.suppressed ? 'Yes' : 'No'},${r.bounced ? 'Yes' : 'No'}`)
                        ).join('\r\n');
                        const blob = new Blob([csv], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);

                        const totalChecked = results.length;
                        const suppressedCount = problematicEmails.filter(r => r.suppressed).length;
                        const bouncedCount = problematicEmails.filter(r => r.bounced).length;

                        responseContainer.innerHTML = `
                            <p><strong>Check Complete:</strong></p>
                            <p>• Total emails checked: ${totalChecked}</p>
                            <p>• Emails on suppression list: ${suppressedCount}</p>
                            <p>• Emails on bounce list: ${bouncedCount}</p>
                            <p>• Problematic emails found: ${problematicEmails.length}</p>
                            <br>
                            <a href="${url}" download="problematic_emails.csv" class="btn btn-primary">📥 Download Problematic Emails CSV</a>
                        `;
                    } else {
                        responseContainer.innerHTML = `
                            <p><strong>Great news!</strong> None of the ${results.length} checked emails are on the suppression or bounce lists.</p>
                        `;
                    }
                } else if (!isCancelled) {
                    responseContainer.innerHTML = 'No results to export.';
                }

                // Reset progress bar and hide progress div
                progressBar.style.width = '0%';
                progressBar.setAttribute('aria-valuenow', '0');
                progressInfo.textContent = '';
                loadingWheel.hidden = false; // Show spinner again for other operations
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
        <div>
            <h3>Reset Communication Channels</h3>
        </div>
        <div>
            <div class="col-2">
                <select id="region" class="form-select" aria-label="Region info">
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
                    <input id="reset-single-input" type="text" class="form-control" placeholder="user@example.com">
                </div>
                <div id="reset-pattern-div" hidden>
                    <label for="reset-pattern-input" class="form-label">Email Pattern</label>
                    <input id="reset-pattern-input" type="text" class="form-control" placeholder="*@domain.edu">
                    <div class="form-text">Use wildcards (*) to match multiple emails. Examples: *@university.edu, student*@*.edu</div>
                </div>
            </div>
        </div>
        <div id="reset-btns">
            <button id="reset-upload-btn" class="btn btn-primary mt-3" hidden>Upload</button>
            <button id="reset-single-btn" class="btn btn-primary mt-3" hidden>Reset</button>
            <button id="reset-pattern-btn" class="btn btn-primary mt-3" hidden>Reset by Pattern</button>
            <button id="reset-cancel-btn" class="btn btn-outline-secondary mt-3" hidden>Cancel</button>
        </div>
        <div hidden id="progress-div">
            <p id="progress-info"></p>
            <div id="loading-wheel" hidden>
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
            <div class="progress mt-3" style="width: 75%" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                <div class="progress-bar" style="width: 0%"></div>
            </div>
        </div>
        <div id="reset-single-comm-response-container" class="mt-3" hidden></div>
        <div id="reset-pattern-comm-response-container" class="mt-3" hidden></div>
        <div id="reset-upload-comm-response-container" class="mt-3" hidden></div>
        `;

        eContent.append(resetCommForm);
    }
    resetCommForm.hidden = false;


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
    const progresDiv = resetCommForm.querySelector('#progress-div');
    const progressInfo = resetCommForm.querySelector('#progress-info');
    const progressBar = resetCommForm.querySelector('.progress-bar');
    const progressBarWrapper = resetCommForm.querySelector('.progress');
    const loadingWheel = resetCommForm.querySelector('#loading-wheel');

    // Helpers to use progress bar instead of spinner
    function useProgressBarIndeterminate() {
        if (!progressBarWrapper || !progressBar) return;
        progressBarWrapper.hidden = false;
        if (loadingWheel) loadingWheel.hidden = true;
        progressBar.classList.add('progress-bar-striped', 'progress-bar-animated');
        progressBar.style.width = '100%';
        progressBar.setAttribute('aria-valuenow', '100');
    }
    function resetProgressBar() {
        if (!progressBar) return;
        progressBar.classList.remove('progress-bar-striped', 'progress-bar-animated');
        progressBar.style.width = '0%';
        progressBar.setAttribute('aria-valuenow', '0');
    }

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

            try {
                // Show progress bar (indeterminate) for single reset
                progresDiv.hidden = false;
                useProgressBarIndeterminate();
                progressInfo.textContent = 'Resetting communication channel...';

                // makes attempt to schedule bounce reset and aws reset
                // When resetting bounce count canvas creates a job to schedule it
                // the bounce count isn't cleared until after the job is run

                // makes call to clear aws and schedule bounce reset
                const response = await window.axios.resetCommChannel(requestData);
                // { bounce: { status: reset},suppression: {status, reset}}
                singleContainer.innerHTML = `<h5>Bounce</h5>`;
                if (response.bounce.error != null) {
                    errorHandler(response.bounce.error, singleContainer);
                } else if (response.bounce.reset < 1) {
                    singleContainer.innerHTML += `Email wasn't on the bounce list.`;
                } else {
                    singleContainer.innerHTML += `Cleared email from bounce list.`;
                }
                singleContainer.innerHTML += '<h5>Suppression</h5>'
                if (response.suppression.error != null) {
                    errorHandler(response.suppression.error, singleContainer);
                } else if (response.suppression.status === '404') {
                    singleContainer.innerHTML += 'Email wasn\'t found on suppression list.';
                } else {
                    singleContainer.innerHTML += 'Cleared email from suppression list.';
                }
            } catch (error) {
                errorHandler(error, singleContainer);
            };
            // Always hide progress and restore controls
            progresDiv.hidden = true;
            resetProgressBar();
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

            // Show progress bar (indeterminate)
            progresDiv.hidden = false;
            useProgressBarIndeterminate();
            progressInfo.textContent = 'Searching for emails matching pattern... Processed: 0';

            const requestData = {
                domain: domain,
                token: token,
                pattern: resetPattern,
                region: regionVal
            };

            if (window.ProgressUtils && window.progressAPI) {
                window.ProgressUtils.attachGlobalProgressListener({ container: progresDiv });
            }

            // makes attempt to schedule bounce reset and aws reset.
            // When resetting bounce count canvas creates a job to schedule it
            // the bounce count isn't cleared until after the job is run
            try {
                const response = await window.axios.resetCommChannelsByPattern(requestData);
                const totalProcessed = Array.isArray(response) ? response.length : 0;

                progresDiv.hidden = true;

                patternContainer.innerHTML = `<h5>Pattern Reset Results</h5>`;
                patternContainer.innerHTML += `<p>Pattern: <strong>${resetPattern}</strong></p>`;

                if (totalProcessed === 0) {
                    patternContainer.innerHTML += `<p>No emails found matching the pattern.</p>`;
                } else {
                    const totalBounceReset = response.reduce((sum, item) => sum + (item?.bounce?.reset || 0), 0);
                    const totalSuppressionReset = response.reduce((sum, item) => sum + (item?.suppression?.reset || 0), 0);

                    patternContainer.innerHTML += `<p>Total unique emails processed: ${totalProcessed}</p>`;

                    patternContainer.innerHTML += `<h6>Bounce List</h6>`;
                    if (totalBounceReset > 0) {
                        patternContainer.innerHTML += `<p>Cleared ${totalBounceReset} email(s) from bounce list.</p>`;
                    } else {
                        patternContainer.innerHTML += `<p>No emails were found on the bounce list.</p>`;
                    }

                    patternContainer.innerHTML += `<h6>Suppression List</h6>`;
                    if (totalSuppressionReset > 0) {
                        patternContainer.innerHTML += `<p>Cleared ${totalSuppressionReset} email(s) from suppression list.</p>`;
                    } else {
                        patternContainer.innerHTML += `<p>No emails were found on the suppression list.</p>`;
                    }

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

                    // Add download link for failed emails if any exist
                    if (failedEmails.length > 0 && window.utilities?.createDownloadLink) {
                        const failedCSV = ['Email Address,Errors'].concat(
                            failedEmails.map(item => `${item.email},"${item.errors}"`)
                        );
                        const failedLink = window.utilities.createDownloadLink(
                            failedCSV,
                            'pattern_reset_failed_emails.csv',
                            '📥 Download Failed Reset Emails'
                        );
                        const failedContainer = document.createElement('div');
                        failedContainer.style.marginTop = '15px';
                        failedContainer.innerHTML = `<h6>Failed Resets</h6><p>${failedEmails.length} email(s) failed to reset properly.</p>`;
                        failedContainer.appendChild(failedLink);
                        patternContainer.appendChild(failedContainer);
                    }
                }
            } catch (error) {
                progresDiv.hidden = true;
                if (error.message.toLowerCase().includes('not implemented')) {
                    patternContainer.innerHTML = '<p class="text-warning">Pattern-based reset functionality needs to be implemented in the backend.</p>';
                } else {
                    errorHandler(error, patternContainer);
                }
            } finally {
                resetPatternBtn.disabled = false;
                // Reset UI state
                resetProgressBar();
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
            try {
                const picked = await window.fileUpload.resetEmails();
                if (!picked || picked === 'cancelled') {
                    uploadContainer.innerHTML = 'No file selected.';
                    selectedEmailsFile = null;
                    return;
                }
                selectedEmailsFile = picked; // { fileContents, filePath, ext }
                const niceName = picked.filePath ? picked.filePath.split(/[/\\]/).pop() : 'selected file';
                const parsedCount = computeParsedEmailsCount(picked);
                uploadContainer.innerHTML = `Selected: <strong>${niceName}</strong> - Parsed <strong>${parsedCount}</strong> email(s). Click "Reset" to begin.`;
                // Enable the Reset button
                uploadResetBtn.hidden = false;
                uploadResetBtn.disabled = false;
            } catch (err) {
                selectedEmailsFile = null;
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

            // Wire determinate progress from main: show percent and counts
            let unsubscribeProgress = null;
            if (window.progressAPI) {
                unsubscribeProgress = window.progressAPI.onUpdateProgress((payload) => {
                    if (!payload || typeof payload !== 'object') return;
                    const { mode, value, processed, total } = payload;
                    if (mode === 'determinate' && typeof value === 'number') {
                        if (progressBar) progressBar.style.width = `${Math.round(value * 100)}%`;
                        if (typeof processed === 'number' && typeof total === 'number') {
                            const pct = Math.round(value * 100);
                            progressInfo.textContent = `${pct}% (${processed}/${total}) Processed`;
                        } else {
                            progressInfo.textContent = `${Math.round(value * 100)}% Processed`;
                        }
                    }
                });
            }

            try {
                progresDiv.hidden = false;
                // Start with determinate bar at 0%, will be updated by main
                resetProgressBar();
                progressBar.parentElement.hidden = false;
                progressInfo.textContent = '0% (0/0) Processed';
                uploadContainer.innerHTML = "Working...";
                const response = await window.axios.resetEmails(requestData);
                progresDiv.hidden = true;

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
                // const errorSuppressed = response.successful.filter((email) => email.value.suppression.error != null);
                uploadContainer.innerHTML = `<p>Total Processed: ${totalProcessed}</p>`;
                uploadContainer.innerHTML += `<h5>Bounce</h5>`;
                errorBounce.forEach(element => {
                    errorHandler(element.value.bounce.error, uploadContainer);
                });
                if (totalBounceReset < 1) {
                    uploadContainer.innerHTML += `No Emails were cleared from the bounce list.`;
                } else {
                    uploadContainer.innerHTML += `Cleared ${totalBounceReset} email(s) from bounce list.`;
                }

                // Add download link for bounce failures if any exist
                if (errorBounce.length > 0 && window.utilities?.createDownloadLink) {
                    const bounceFailedEmails = errorBounce.map(item => {
                        const email = item?.value?.email || item?.email || 'unknown';
                        const error = item?.value?.bounce?.error ? JSON.stringify(item.value.bounce.error) : 'Unknown bounce error';
                        return `${email},"Bounce: ${error}"`;
                    });
                    const bounceFailedCSV = ['Email Address,Errors'].concat(bounceFailedEmails);
                    const bounceFailedLink = window.utilities.createDownloadLink(
                        bounceFailedCSV,
                        'bounce_reset_failed_emails.csv',
                        '📥 Download Bounce Reset Failures'
                    );
                    const bounceFailedContainer = document.createElement('div');
                    bounceFailedContainer.style.marginTop = '10px';
                    bounceFailedContainer.appendChild(bounceFailedLink);
                    uploadContainer.appendChild(bounceFailedContainer);
                }
                uploadContainer.innerHTML += '<h5 class="mt-3">Suppression</h5>'
                // errorSuppressed.forEach(email => {
                //     errorHandler(email.value.suppression.error, uploadContainer);
                // })
                if (totalAWSReset > 0) {
                    uploadContainer.innerHTML += `<p>Cleared ${totalAWSReset} email(s) from suppression list.</p>`;
                }
                if (suppressionNotFound === totalProcessed) {
                    uploadContainer.innerHTML += `<p>No email(s) were found on the suppression list.</p>`;
                } else if (suppressionNotFound > 0 && (totalAWSReset > 0 || suppressionNotRemoved > 0)) {
                    uploadContainer.innerHTML += `<p>${suppressionNotFound} email(s) were not found on the suppression list.</p>`;

                    // Add download link for emails not found
                    const notFoundEmails = response.combinedResults.details.suppressionResults.notFoundEmails || [];
                    if (notFoundEmails.length > 0) {
                        const notFoundCSV = ['Email Address'].concat(notFoundEmails);
                        const notFoundLink = window.utilities.createDownloadLink(
                            notFoundCSV,
                            'emails_not_found.csv',
                            '📥 Download Not Found Emails'
                        );
                        const notFoundContainer = document.createElement('div');
                        notFoundContainer.style.marginTop = '10px';
                        notFoundContainer.appendChild(notFoundLink);
                        uploadContainer.appendChild(notFoundContainer);
                    }
                }
                if (suppressionNotRemoved > 0) {
                    uploadContainer.innerHTML += `<p>${suppressionNotRemoved} email(s) could not be removed from the suppression list.</p>`;

                    // Add download link for emails not removed
                    const notRemovedEmails = response.combinedResults.details.suppressionResults.notRemovedEmails || [];
                    if (notRemovedEmails.length > 0) {
                        const notRemovedCSV = ['Email Address'].concat(notRemovedEmails);
                        const notRemovedLink = window.utilities.createDownloadLink(
                            notRemovedCSV,
                            'emails_not_removed.csv',
                            '📥 Download Not Removed Emails'
                        );
                        const notRemovedContainer = document.createElement('div');
                        notRemovedContainer.style.marginTop = '10px';
                        notRemovedContainer.appendChild(notRemovedLink);
                        uploadContainer.appendChild(notRemovedContainer);
                    }
                }

                // Add comprehensive failed emails download combining all failure types
                const allFailedEmails = [];
                const failedEmailsForReprocessing = [];

                // Add bounce failures
                if (response.combinedResults?.details?.bounceResults?.failed) {
                    response.combinedResults.details.bounceResults.failed.forEach(item => {
                        const email = item?.value?.email || item?.email || 'unknown';
                        const error = item?.value?.bounce?.error ? JSON.stringify(item.value.bounce.error) : 'Bounce reset failed';
                        allFailedEmails.push({ email, error: `Bounce: ${error}` });
                        failedEmailsForReprocessing.push(email);
                    });
                }

                // Add suppression failures (not removed)
                if (response.combinedResults?.details?.suppressionResults?.notRemovedEmails) {
                    response.combinedResults.details.suppressionResults.notRemovedEmails.forEach(email => {
                        allFailedEmails.push({ email, error: 'Suppression: Could not be removed from suppression list' });
                        failedEmailsForReprocessing.push(email);
                    });
                }

                // Create comprehensive failed emails download if any failures exist
                if (allFailedEmails.length > 0 && window.utilities?.createDownloadLink) {
                    const allFailedCSV = ['Email Address,Failure Type'].concat(
                        allFailedEmails.map(item => `${item.email},"${item.error}"`)
                    );
                    const allFailedLink = window.utilities.createDownloadLink(
                        allFailedCSV,
                        'all_failed_reset_emails.csv',
                        '📥 Download All Failed Reset Emails'
                    );
                    const allFailedContainer = document.createElement('div');
                    allFailedContainer.style.marginTop = '15px';
                    allFailedContainer.innerHTML = `<h6>All Failed Resets</h6><p>${allFailedEmails.length} email(s) failed to reset or remove properly.</p>`;
                    allFailedContainer.appendChild(allFailedLink);

                    // Add reprocess button for failed emails
                    const reprocessBtn = document.createElement('button');
                    reprocessBtn.className = 'btn btn-warning ms-2';
                    reprocessBtn.textContent = '🔄 Reprocess Failed Emails';
                    reprocessBtn.title = 'Attempt to reset the failed emails again';

                    reprocessBtn.addEventListener('click', async (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        const confirmReprocess = confirm(`Are you sure you want to reprocess ${failedEmailsForReprocessing.length} failed email(s)? This will attempt to reset them again.`);
                        if (!confirmReprocess) return;

                        // Disable the reprocess button during operation
                        reprocessBtn.disabled = true;
                        reprocessBtn.textContent = '🔄 Processing...';

                        // Create a new file contents structure with just the failed emails
                        const failedEmailsContent = [...new Set(failedEmailsForReprocessing)]; // Remove duplicates

                        const reprocessRequestData = {
                            domain,
                            token,
                            region: regionVal,
                            fileContents: failedEmailsContent,
                            ext: 'array' // Indicate this is an array of emails
                        };

                        try {
                            // Show progress for reprocessing
                            progresDiv.hidden = false;
                            resetProgressBar();
                            progressBar.parentElement.hidden = false;
                            progressInfo.textContent = `Reprocessing ${failedEmailsContent.length} failed emails...`;

                            const reprocessResponse = await window.axios.resetEmails(reprocessRequestData);
                            progresDiv.hidden = true;

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

                            // Check if any emails still failed after reprocessing
                            const stillFailedEmails = [];
                            if (reprocessResponse.combinedResults?.details?.bounceResults?.failed) {
                                reprocessResponse.combinedResults.details.bounceResults.failed.forEach(item => {
                                    const email = item?.value?.email || item?.email || 'unknown';
                                    stillFailedEmails.push(email);
                                });
                            }
                            if (reprocessResponse.combinedResults?.details?.suppressionResults?.notRemovedEmails) {
                                reprocessResponse.combinedResults.details.suppressionResults.notRemovedEmails.forEach(email => {
                                    stillFailedEmails.push(email);
                                });
                            }

                            if (stillFailedEmails.length > 0) {
                                reprocessContainer.innerHTML += `<p><strong>⚠️ Still Failed:</strong> ${stillFailedEmails.length} email(s) continue to fail after reprocessing</p>`;

                                // Provide download for emails that still failed
                                if (window.utilities?.createDownloadLink) {
                                    const stillFailedCSV = ['Email Address'].concat([...new Set(stillFailedEmails)]);
                                    const stillFailedLink = window.utilities.createDownloadLink(
                                        stillFailedCSV,
                                        'still_failed_emails_after_reprocess.csv',
                                        '📥 Download Still Failed Emails'
                                    );
                                    const stillFailedDiv = document.createElement('div');
                                    stillFailedDiv.style.marginTop = '10px';
                                    stillFailedDiv.appendChild(stillFailedLink);
                                    reprocessContainer.appendChild(stillFailedDiv);
                                }
                            } else {
                                reprocessContainer.innerHTML += `<p><strong>🎉 Success:</strong> All previously failed emails have been successfully processed!</p>`;
                            }

                            uploadContainer.appendChild(reprocessContainer);

                        } catch (reprocessError) {
                            progresDiv.hidden = true;
                            const errorContainer = document.createElement('div');
                            errorContainer.style.marginTop = '15px';
                            errorContainer.style.color = 'red';
                            errorContainer.innerHTML = `<p><strong>Error during reprocessing:</strong> ${reprocessError.message}</p>`;
                            uploadContainer.appendChild(errorContainer);
                        } finally {
                            // Re-enable the reprocess button
                            reprocessBtn.disabled = false;
                            reprocessBtn.textContent = '🔄 Reprocess Failed Emails';
                            resetProgressBar();
                        }
                    });

                    allFailedContainer.appendChild(reprocessBtn);
                    uploadContainer.appendChild(allFailedContainer);
                }
            } catch (error) {
                if (String(error.message || error).toLowerCase().includes('cancelled')) {
                    progresDiv.hidden = true;
                    uploadContainer.innerHTML = 'Processing was cancelled.';
                } else {
                    errorHandler(error, uploadContainer);
                }
            } finally {
                uploadResetBtn.disabled = false;
                resetProgressBar();
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
            <div>
                <h3>Unconfirmed emails</h3>
            </div>
            <div id="switches">
                <div class="form-check form-switch">
                    <label class="form-check-label" for="uncofirmed-email-switch">Check for unconfirmed emails</label>
                    <input class="form-check-input" type="checkbox" role="switch" id="unconfirmed-email-switch">
                    <div id="email-pattern-div" hidden>
                        <input id="unconfirmed-email-pattern" type="text" class="form-control" placeholder="email.domain.edu" aria-describedby="unconfirmed-pattern-description">
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
                        <textarea class="form-control" id="email-list-box" rows="3" placeholder="example1@example.com,example2@example.com, etc."></textarea>
                    </div>
                </div>
            </div>
            <button type="button" class="btn btn-primary mt-3" id="unconfirmed-check-btn" disabled>Check</button>
            <button type="button" class="btn btn-primary mt-3" id="upload-email-btn" hidden disabled>Upload</button>
            <button type="button" class="btn btn-primary mt-3" id="confirm-email-btn" hidden disabled>Confirm</button>
    
            <div hidden id="progress-div">
                <p id="progress-info"></p>
                <div id="loading-wheel" hidden>
                    <div class="spinner-border" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
                <div class="progress mt-3" style="width: 75%" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
            </div>
            <div id="response-container" class="mt-5">
                <div id="loading-wheel" hidden>
                    <div class="spinner-border" role="status">
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
                responseDetails.innerHTML = 'List of unconfirmed emails saved.';
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

            const domain = document.querySelector('#domain').value.trim();
            const token = document.querySelector('#token').value.trim();
            const progresDiv = unconfirmedEmailForm.querySelector('#progress-div');
            const progressBar = progresDiv.querySelector('.progress-bar');
            const progressInfo = unconfirmedEmailForm.querySelector('#progress-info');
            const progressBarWrapper = progresDiv.querySelector('.progress');
            const loadingWheel = progresDiv.querySelector('#loading-wheel');

            progressInfo.innerHTML = '';

            const requestData = {
                domain: domain,
                token: token
            }

            progresDiv.hidden = false;
            // Unknown total during file discovery -> show spinner and live processed count
            if (loadingWheel) loadingWheel.hidden = false;
            if (progressBarWrapper) progressBarWrapper.hidden = true;
            progressInfo.textContent = 'Processing... Processed: 0';

            let totalEmails = 0;
            window.dataUpdate.onUpdate((data) => {
                totalEmails = data;
                progressInfo.textContent = `Processing... Processed: ${totalEmails}`;
            });
            try {
                const result = await window.fileUpload.confirmEmails(requestData);

                // Check if the operation was cancelled or failed
                if (!result.success) {
                    // Hide progress div and don't show any message for cancelled operations
                    progresDiv.hidden = true;
                    return;
                }

                progressInfo.innerHTML += `<h5>Results:</h5><p class="mb-1">Processed:  ${totalEmails}</p>`;
                progressInfo.innerHTML += `<p class="mb-1">Confirmed: ${result.confirmed} <div class="form-text">NOTE: Number of emails confirmed may be different than the number processed if the email didn't need to be confirmed</div></p>`;
                if (result.failed && result.failed.length > 0) {
                    progressBar.parentElement.hidden = true;
                    progressInfo.innerHTML += `Failed to confirm ${result.failed.length} emails`;
                    errorHandler({ message: `${result.failed[0].reason}` }, progressInfo);
                }
            } catch (error) {
                errorHandler(error, progressInfo);
            } finally {
                uploadBtn.disabled = false;
                if (loadingWheel) loadingWheel.hidden = true;
                if (progressBarWrapper) progressBarWrapper.hidden = false;
            }

        }

        async function handleConfirmCheck(e) {
            e.preventDefault();
            e.stopPropagation();
            confirmBtn.disabled = true;

            const domain = document.querySelector('#domain').value.trim();
            const token = document.querySelector('#token').value.trim();
            const progresDiv = unconfirmedEmailForm.querySelector('#progress-div');
            const progressBar = progresDiv.querySelector('.progress-bar');
            const progressInfo = unconfirmedEmailForm.querySelector('#progress-info');
            const progressBarWrapper = progresDiv.querySelector('.progress');
            const loadingWheel = progresDiv.querySelector('#loading-wheel');
            const emails = emailBox.value.split(/\r?\n|\n|\,/)
                .map((email) => email.trim());

            progressInfo.innerHTML = '';

            const requestData = {
                domain: domain,
                token: token,
                emails: emails
            }

            progresDiv.hidden = false;
            // Determinate: show progress bar, hide spinner
            if (loadingWheel) loadingWheel.hidden = true;
            if (progressBarWrapper) progressBarWrapper.hidden = false;
            let unsubscribeProgress = null;
            if (window.progressAPI) {
                unsubscribeProgress = window.progressAPI.onUpdateProgress((payload) => {
                    if (payload && typeof payload === 'object' && typeof payload.value === 'number') {
                        progressBar.style.width = `${Math.round(payload.value * 100)}%`;
                    } else if (typeof payload === 'number') {
                        // backward compatibility with numeric payloads
                        progressBar.style.width = `${Math.round(payload)}%`;
                    }
                });
            }

            try {
                const result = await window.axios.confirmEmails(requestData);
                progressInfo.innerHTML += `<h5>Results:</h5><p class="mb-1">Processed:  ${requestData.emails.length}</p>`;
                progressInfo.innerHTML += `<p class="mb-1">Confirmed: ${result.confirmed} <div class="form-text">NOTE: Number of emails confirmed may be different than the number processed if the email didn't need to be confirmed</div></p>`;
                if (result.failed.length > 0) {
                    progressBar.parentElement.hidden = true;
                    progressInfo.innerHTML += `Failed to confirm ${result.failed.length} emails`;
                    errorHandler({ message: `${result.failed[0].reason}` }, progressInfo);
                }
            } catch (error) {
                errorHandler(error, progressInfo);
            } finally {
                confirmBtn.disabled = false;
                if (typeof unsubscribeProgress === 'function') unsubscribeProgress();
            }

        }

    } // End of event listener binding check
}