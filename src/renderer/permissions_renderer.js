// permissions_renderer.js - UI for managing role permissions

function permissionsTemplate(e) {
    switch (e.target.id) {
        case 'enable-disable-all':
            enableDisableAllUI(e);
            break;
        case 'permissions-match':
            permissionsMatchUI(e);
            break;
        default:
            break;
    }
}

function enableDisableAllUI(e) {
    hideEndpoints(e);

    const eContent = document.querySelector('#endpoint-content');
    let form = eContent.querySelector('#enable-disable-all-form');

    if (!form) {
        form = document.createElement('form');
        form.id = 'enable-disable-all-form';
        form.innerHTML = `
            <style>
                #enable-disable-all-form .card { font-size: 0.875rem; }
                #enable-disable-all-form .card-header h3 { font-size: 1.1rem; margin-bottom: 0.25rem; }
                #enable-disable-all-form .card-header small { font-size: 0.75rem; }
                #enable-disable-all-form .card-body { padding: 0.75rem; }
                #enable-disable-all-form .form-label { font-size: 0.8rem; margin-bottom: 0.25rem; }
                #enable-disable-all-form .form-control, #enable-disable-all-form .form-select { 
                    font-size: 0.8rem; 
                    padding: 0.25rem 0.5rem;
                    height: auto;
                }
                #enable-disable-all-form .btn { 
                    font-size: 0.8rem; 
                    padding: 0.35rem 0.75rem;
                }
                #enable-disable-all-form .form-text { font-size: 0.7rem; margin-top: 0.15rem; }
                #enable-disable-all-form .form-check-label { font-size: 0.8rem; }
                #enable-disable-all-form .form-check-input { font-size: 0.8rem; }
                #enable-disable-all-form .mt-2 { margin-top: 0.5rem !important; }
                #enable-disable-all-form .mt-3 { margin-top: 0.75rem !important; }
                #enable-disable-all-form .mb-2 { margin-bottom: 0.5rem !important; }
                #enable-disable-all-form .mb-3 { margin-bottom: 0.75rem !important; }
                #enable-disable-all-form .mb-4 { margin-bottom: 1rem !important; }
                #enable-disable-all-form .progress { height: 12px !important; }
                #enable-disable-all-form h5 { font-size: 1rem; }
                #enable-disable-all-form h6 { font-size: 0.9rem; }
                #enable-disable-all-form p { margin-bottom: 0.5rem; font-size: 0.85rem; }
                #enable-disable-all-form .alert { padding: 0.5rem 0.75rem; font-size: 0.8rem; }
                #enable-disable-all-form .badge { font-size: 0.75rem; }
                #enable-disable-all-form hr { margin: 0.5rem 0; }
                #enable-disable-all-form .row { margin-bottom: 0.75rem; }
                #enable-disable-all-form .g-3 { gap: 0.5rem !important; }
            </style>
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-shield-check me-1"></i>Enable/Disable All Permissions
                    </h3>
                    <small class="text-muted">Enable or disable all permissions for a role</small>
                </div>
                <div class="card-body">
                    <div class="row g-3 mb-2">
                        <div class="col-md-6">
                            <label class="form-label fw-bold" for="enable-disable-account-id">
                                <i class="bi bi-building me-1"></i>Account ID <span class="text-danger">*</span>
                            </label>
                            <input type="text" class="form-control form-control-sm" id="enable-disable-account-id" 
                                   placeholder="Account ID" required />
                            <div id="account-id-help" class="form-text text-danger" style="min-height: 1.25rem; visibility: hidden;">
                                <i class="bi bi-exclamation-triangle me-1"></i>Account ID is required.
                            </div>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold" for="enable-disable-role-id">
                                <i class="bi bi-person-badge me-1"></i>Role Name or ID <span class="text-danger">*</span>
                            </label>
                            <input type="text" class="form-control form-control-sm" id="enable-disable-role-id" 
                                   placeholder="Role name or ID" required />
                            <div id="role-id-help" class="form-text text-danger" style="min-height: 1.25rem; visibility: hidden;">
                                <i class="bi bi-exclamation-triangle me-1"></i>Role name or ID is required.
                            </div>
                            <div class="form-text text-muted">
                                <i class="bi bi-info-circle me-1"></i>e.g., 'TeacherEnrollment' or role ID
                            </div>
                        </div>
                    </div>

                    <div class="row g-3 mb-2">
                        <div class="col-12">
                            <label class="form-label fw-bold">
                                <i class="bi bi-toggle-on me-1"></i>Action
                            </label>
                            <div class="d-flex gap-3">
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" name="permission-action" 
                                           id="action-enable" value="enable" checked>
                                    <label class="form-check-label" for="action-enable">
                                        Enable All
                                    </label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" name="permission-action" 
                                           id="action-disable" value="disable">
                                    <label class="form-check-label" for="action-disable">
                                        Disable All
                                    </label>
                                </div>
                            </div>
                            <div class="form-text text-muted">
                                <i class="bi bi-info-circle me-1"></i>Choose whether to enable or disable all permissions for this role
                            </div>
                        </div>
                    </div>
                    
                    <div class="row mb-2">
                        <div class="col-md-6">
                            <div class="d-grid">
                                <button type="button" class="btn btn-sm btn-primary" id="apply-permissions-btn">
                                    <i class="bi bi-lightning-fill me-2"></i>Apply Permissions
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Progress Card -->
            <div class="card mt-2" id="permissions-progress-card" hidden>
                <div class="card-header">
                    <h5 class="card-title mb-0">
                        <i class="bi bi-gear me-2"></i>Applying Permissions
                    </h5>
                </div>
                <div class="card-body">
                    <p id="permissions-progress-info" class="mb-2"></p>
                    <div class="progress mb-2" style="height: 12px;">
                        <div class="progress-bar progress-bar-striped progress-bar-animated" 
                             id="permissions-progress-bar" style="width:0%" role="progressbar" 
                             aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                        </div>
                    </div>
                    <small class="text-muted" id="permissions-progress-detail"></small>
                </div>
            </div>

            <!-- Results Card -->
            <div class="card mt-2" id="permissions-results-card" hidden>
                <div class="card-body" id="permissions-response"></div>
            </div>
        `;
        eContent.appendChild(form);

        // Setup event listeners
        setupEnableDisableFormListeners();
    }

    form.hidden = false;
}

function permissionsMatchUI(e) {
    hideEndpoints(e);

    const eContent = document.querySelector('#endpoint-content');
    let form = eContent.querySelector('#permissions-match-form');

    if (!form) {
        form = document.createElement('form');
        form.id = 'permissions-match-form';
        form.innerHTML = `
            <style>
                #permissions-match-form .card { font-size: 0.875rem; }
                #permissions-match-form .card-header h3 { font-size: 1.1rem; margin-bottom: 0.25rem; }
                #permissions-match-form .card-header small { font-size: 0.75rem; }
                #permissions-match-form .card-body { padding: 0.75rem; }
                #permissions-match-form .form-label { font-size: 0.8rem; margin-bottom: 0.25rem; }
                #permissions-match-form .form-control, #permissions-match-form .form-select { 
                    font-size: 0.8rem; 
                    padding: 0.25rem 0.5rem;
                    height: auto;
                }
                #permissions-match-form .btn { 
                    font-size: 0.8rem; 
                    padding: 0.35rem 0.75rem;
                }
                #permissions-match-form .form-text { font-size: 0.7rem; margin-top: 0.15rem; }
                #permissions-match-form .mt-2 { margin-top: 0.5rem !important; }
                #permissions-match-form .mt-3 { margin-top: 0.75rem !important; }
                #permissions-match-form .mb-2 { margin-bottom: 0.5rem !important; }
                #permissions-match-form .mb-3 { margin-bottom: 0.75rem !important; }
                #permissions-match-form .mb-4 { margin-bottom: 1rem !important; }
                #permissions-match-form h5 { font-size: 1rem; }
                #permissions-match-form h6 { font-size: 0.9rem; }
                #permissions-match-form p { margin-bottom: 0.5rem; font-size: 0.85rem; }
            </style>
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-arrow-left-right me-1"></i>Match Permissions
                    </h3>
                    <small class="text-muted">Copy permissions from one role to another</small>
                </div>
                <div class="card-body">
                    <!-- Source Section -->
                    <h6 class="text-primary mb-2">
                        <i class="bi bi-box-arrow-right me-1"></i>Source (Copy From)
                    </h6>
                    <div class="row g-3 mb-2">
                        <div class="col-md-4">
                            <label class="form-label fw-bold" for="source-domain">
                                <i class="bi bi-globe me-1"></i>Domain
                            </label>
                            <input type="text" class="form-control form-control-sm" id="source-domain" 
                                   placeholder="Canvas domain" />
                            <div class="form-text text-muted">
                                <i class="bi bi-info-circle me-1"></i>Optional: leave blank to use main domain
                            </div>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label fw-bold" for="source-account-id">
                                <i class="bi bi-building me-1"></i>Account ID <span class="text-danger">*</span>
                            </label>
                            <input type="text" class="form-control form-control-sm" id="source-account-id" 
                                   placeholder="Account ID" required />
                            <div id="source-account-id-help" class="form-text text-danger" style="min-height: 1.25rem; visibility: hidden;">
                                <i class="bi bi-exclamation-triangle me-1"></i>Source Account ID is required.
                            </div>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label fw-bold" for="source-role-id">
                                <i class="bi bi-person-badge me-1"></i>Role Name or ID
                            </label>
                            <input type="text" class="form-control form-control-sm" id="source-role-id" 
                                   placeholder="Role name or ID" />
                            <div id="source-role-id-help" class="form-text text-danger" style="min-height: 1.25rem; visibility: hidden;">
                                <i class="bi bi-exclamation-triangle me-1"></i>Source role name or ID is required.
                            </div>
                            <div class="form-text text-muted">
                                <i class="bi bi-info-circle me-1"></i>e.g., 'TeacherEnrollment' or role ID
                            </div>
                        </div>
                    </div>
                    
                    <!-- Target Section -->
                    <h6 class="text-success mb-2 mt-3">
                        <i class="bi bi-box-arrow-in-right me-1"></i>Target (Copy To)
                    </h6>
                    <div class="row g-3 mb-2">
                        <div class="col-md-4">
                            <label class="form-label fw-bold" for="target-domain">
                                <i class="bi bi-globe me-1"></i>Domain
                            </label>
                            <input type="text" class="form-control form-control-sm" id="target-domain" 
                                   placeholder="Canvas domain" />
                            <div class="form-text text-muted">
                                <i class="bi bi-info-circle me-1"></i>Optional: leave blank to use main domain
                            </div>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label fw-bold" for="target-account-id">
                                <i class="bi bi-building me-1"></i>Account ID <span class="text-danger">*</span>
                            </label>
                            <input type="text" class="form-control form-control-sm" id="target-account-id" 
                                   placeholder="Account ID" required />
                            <div id="target-account-id-help" class="form-text text-danger" style="min-height: 1.25rem; visibility: hidden;">
                                <i class="bi bi-exclamation-triangle me-1"></i>Target Account ID is required.
                            </div>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label fw-bold" for="target-role-id">
                                <i class="bi bi-person-badge me-1"></i>Role Name or ID
                            </label>
                            <input type="text" class="form-control form-control-sm" id="target-role-id" 
                                   placeholder="Role name or ID" />
                            <div id="target-role-id-help" class="form-text text-danger" style="min-height: 1.25rem; visibility: hidden;">
                                <i class="bi bi-exclamation-triangle me-1"></i>Target role name or ID is required.
                            </div>
                            <div class="form-text text-muted">
                                <i class="bi bi-info-circle me-1"></i>e.g., 'Custom Role' or role ID
                            </div>
                        </div>
                    </div>
                    
                    <div class="row mb-2">
                        <div class="col-md-6">
                            <div class="d-grid">
                                <button type="button" class="btn btn-sm btn-primary" id="match-permissions-btn">
                                    <i class="bi bi-arrow-repeat me-2"></i>Match Permissions
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Results Card -->
            <div class="card mt-2" id="match-results-card" hidden>
                <div class="card-body" id="match-response"></div>
            </div>
        `;
        eContent.appendChild(form);

        // Setup event listeners (will be implemented later)
        setupMatchFormListeners();
    }

    form.hidden = false;
}

function setupEnableDisableFormListeners() {
    const accountIdInput = document.getElementById('enable-disable-account-id');
    const roleIdInput = document.getElementById('enable-disable-role-id');
    const applyBtn = document.getElementById('apply-permissions-btn');
    const roleIdHelp = document.getElementById('role-id-help');
    const accountIdHelp = document.getElementById('account-id-help');
    let progressUnsubscribe = null;

    // Add auto-parsing for account and role fields
    setupFieldAutoParser('enable-disable-account-id', 'enable-disable-account-id', 'enable-disable-role-id');

    // Input validation
    accountIdInput.addEventListener('input', () => {
        if (accountIdInput.value.trim()) {
            accountIdHelp.style.visibility = 'hidden';
        }
    });

    accountIdInput.addEventListener('blur', () => {
        if (!accountIdInput.value.trim()) {
            accountIdHelp.style.visibility = 'visible';
        }
    });

    roleIdInput.addEventListener('input', () => {
        const value = roleIdInput.value.trim();
        if (value) {
            roleIdHelp.style.visibility = 'hidden';
        }
    });

    roleIdInput.addEventListener('blur', () => {
        const value = roleIdInput.value.trim();
        if (!value) {
            roleIdHelp.style.visibility = 'visible';
        }
    });

    // Apply button handler
    applyBtn.addEventListener('click', async () => {
        const accountId = accountIdInput.value.trim();
        const roleId = roleIdInput.value.trim();
        const action = document.querySelector('input[name="permission-action"]:checked').value;

        // Validate inputs
        if (!accountId) {
            accountIdHelp.style.visibility = 'visible';
            accountIdInput.focus();
            return;
        }
        accountIdHelp.style.visibility = 'hidden';

        if (!roleId) {
            roleIdHelp.style.visibility = 'visible';
            return;
        }

        const domain = document.getElementById('domain').value.trim();
        const token = document.getElementById('token').value.trim();

        // Show progress card
        const progressCard = document.getElementById('permissions-progress-card');
        const progressInfo = document.getElementById('permissions-progress-info');
        const progressDetail = document.getElementById('permissions-progress-detail');
        const progressBar = document.getElementById('permissions-progress-bar');
        const resultsCard = document.getElementById('permissions-results-card');
        const responseDiv = document.getElementById('permissions-response');

        if (!domain || !token) {
            resultsCard.hidden = false;
            responseDiv.innerHTML = '<div class="alert alert-danger"><i class="bi bi-exclamation-triangle me-2"></i>Please enter Canvas domain and API token in Settings.</div>';
            return;
        }

        progressCard.hidden = false;
        resultsCard.hidden = true;
        progressInfo.textContent = `${action === 'enable' ? 'Enabling' : 'Disabling'} all permissions...`;
        progressDetail.textContent = 'Fetching role information...';
        progressBar.style.width = '10%';
        progressBar.setAttribute('aria-valuenow', '10');

        // Disable button during operation
        applyBtn.disabled = true;
        applyBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Processing...';

        // Subscribe to progress updates
        progressUnsubscribe = window.progressAPI.onEnableDisableProgress((progress) => {
            console.log('Enable/Disable progress:', progress);

            if (progress.step === 'role-fetched') {
                progressBar.style.width = '30%';
                progressBar.setAttribute('aria-valuenow', '30');
                progressDetail.textContent = progress.message;
            } else if (progress.step === 'updating') {
                progressBar.style.width = '60%';
                progressBar.setAttribute('aria-valuenow', '60');
                progressDetail.textContent = progress.message;
            } else if (progress.step === 'completed') {
                progressBar.style.width = '100%';
                progressBar.setAttribute('aria-valuenow', '100');
                progressDetail.textContent = progress.message;
            }
        });

        try {
            const result = await window.axios.enableDisableAllPermissions({
                token: token,
                domain: domain,
                accountId: accountId,
                role: roleId,
                action: action
            });

            console.log('Enable/Disable result:', result);

            // Hide progress, show results
            progressCard.hidden = true;
            resultsCard.hidden = false;

            if (result.success) {
                let groupingInfo = '';
                if (result.groupedPermissions > 0) {
                    groupingInfo = `<p class="mb-0"><small class="text-muted"><i class="bi bi-info-circle me-1"></i>${result.groupedPermissions} permissions were grouped into ${result.totalPermissions - result.groupedPermissions} group permissions</small></p>`;
                }

                responseDiv.innerHTML = `
                    <div class="alert alert-success">
                        <h5 class="alert-heading"><i class="bi bi-check-circle-fill me-2"></i>Success!</h5>
                        <p class="mb-2">All permissions successfully ${action === 'enable' ? 'enabled' : 'disabled'} for the role.</p>
                        <hr>
                        <p class="mb-1"><strong>Role:</strong> ${result.roleLabel} (ID: ${result.roleId})</p>
                        <p class="mb-1"><strong>Total Permissions:</strong> ${result.totalPermissions}</p>
                        <p class="mb-1"><strong>Updates Applied:</strong> ${result.updatesApplied}</p>
                        ${groupingInfo}
                    </div>
                `;
            } else if (result.cancelled) {
                responseDiv.innerHTML = '<div class="alert alert-warning"><i class="bi bi-exclamation-triangle me-2"></i>Operation cancelled by user.</div>';
            } else {
                responseDiv.innerHTML = `<div class="alert alert-danger"><i class="bi bi-exclamation-triangle me-2"></i>Operation failed: ${result.error || 'Unknown error'}</div>`;
            }

        } catch (error) {
            console.error('Error applying permissions:', error);
            progressCard.hidden = true;
            resultsCard.hidden = false;
            responseDiv.innerHTML = `
                <div class="alert alert-danger">
                    <h5 class="alert-heading"><i class="bi bi-exclamation-triangle-fill me-2"></i>Error</h5>
                    <p class="mb-0">${error.message || 'An unexpected error occurred while updating permissions.'}</p>
                </div>
            `;
        } finally {
            // Re-enable button
            applyBtn.disabled = false;
            applyBtn.innerHTML = '<i class="bi bi-lightning-fill me-2"></i>Apply Permissions';

            // Cleanup progress listener
            if (progressUnsubscribe) {
                progressUnsubscribe();
                progressUnsubscribe = null;
            }
        }
    });
}

/**
 * Clean domain input by removing protocols, paths, and extracting just the domain
 * @param {string} input - The input string to clean
 * @returns {string} The cleaned domain
 */
function cleanDomainInput(input) {
    if (!input || typeof input !== 'string') return '';

    let cleaned = input.trim();

    // Remove common protocols
    cleaned = cleaned.replace(/^https?:\/\//, '');

    // Remove common Canvas URL patterns and paths
    cleaned = cleaned.replace(/\/accounts[\/\.].*$/, '');
    cleaned = cleaned.replace(/\/courses\/.*$/, '');
    cleaned = cleaned.replace(/\/api\/.*$/, '');
    cleaned = cleaned.replace(/\/login\/.*$/, '');
    cleaned = cleaned.replace(/\/users\/.*$/, '');
    cleaned = cleaned.replace(/\/me.*$/, '');
    cleaned = cleaned.replace(/\/profile.*$/, '');
    cleaned = cleaned.replace(/\/dashboard.*$/, '');
    cleaned = cleaned.replace(/\/calendar.*$/, '');
    cleaned = cleaned.replace(/\/grades.*$/, '');
    cleaned = cleaned.replace(/\/discussion_topics.*$/, '');
    cleaned = cleaned.replace(/\/assignments.*$/, '');
    cleaned = cleaned.replace(/\/quizzes.*$/, '');
    cleaned = cleaned.replace(/\/modules.*$/, '');
    cleaned = cleaned.replace(/\/files.*$/, '');
    cleaned = cleaned.replace(/\/pages.*$/, '');
    cleaned = cleaned.replace(/\/announcements.*$/, '');
    cleaned = cleaned.replace(/\/conferences.*$/, '');
    cleaned = cleaned.replace(/\/collaborations.*$/, '');
    cleaned = cleaned.replace(/\/settings.*$/, '');
    cleaned = cleaned.replace(/\/statistics.*$/, '');
    cleaned = cleaned.replace(/\/external_tools.*$/, '');

    // Remove any path that starts with / (catch-all for remaining paths)
    cleaned = cleaned.replace(/\/.*$/, '');

    // Remove www. prefix if present
    cleaned = cleaned.replace(/^www\./, '');

    // Handle port numbers (remove them for Canvas domains)
    if (cleaned.includes('.instructure.com')) {
        cleaned = cleaned.replace(/:\d+/, '');
    }

    // Remove any remaining query parameters or fragments
    cleaned = cleaned.split('?')[0];
    cleaned = cleaned.split('#')[0];

    return cleaned;
}

/**
 * Parse Canvas API URL to extract domain, account ID, and role ID
 * @param {string} url - The URL to parse
 * @returns {Object} Object containing domain, accountId, and roleId (if found)
 */
function parseCanvasApiUrl(url) {
    if (!url || typeof url !== 'string') return {};

    const result = {};
    let cleanUrl = url.trim();

    // Extract domain with protocol
    const domainMatch = cleanUrl.match(/^(https?:\/\/)?([^\/]+)/);
    if (domainMatch) {
        result.domain = domainMatch[2];
    }

    // Try to extract account ID
    // Matches patterns like:
    // /accounts/123
    // /api/v1/accounts/123
    const accountMatch = cleanUrl.match(/\/accounts\/(\d+)/);
    if (accountMatch) {
        result.accountId = accountMatch[1];
    }

    // Try to extract role ID
    // Matches patterns like:
    // /accounts/123/roles/456
    // /api/v1/accounts/123/roles/456
    const roleMatch = cleanUrl.match(/\/accounts\/\d+\/roles\/(\d+)/);
    if (roleMatch) {
        result.roleId = roleMatch[1];
    }

    return result;
}

/**
 * Setup auto-parser for domain, account ID, and role ID fields
 * @param {string} domainFieldId - ID of the domain input field
 * @param {string} accountFieldId - ID of the account ID input field
 * @param {string} roleFieldId - ID of the role ID input field
 */
function setupFieldAutoParser(domainFieldId, accountFieldId, roleFieldId) {
    const domainField = document.getElementById(domainFieldId);
    const accountField = document.getElementById(accountFieldId);
    const roleField = document.getElementById(roleFieldId);

    if (!domainField || !accountField || !roleField) return;

    // Function to parse and populate fields
    const parseAndPopulate = (input, sourceField) => {
        if (!input) return;

        // Try to parse as Canvas API URL
        const parsed = parseCanvasApiUrl(input);

        if (Object.keys(parsed).length > 0) {
            // Update fields based on what was parsed
            if (parsed.domain && sourceField === domainField) {
                domainField.value = parsed.domain;
            }
            if (parsed.accountId && (sourceField === domainField || sourceField === accountField)) {
                accountField.value = parsed.accountId;
            }
            if (parsed.roleId && (sourceField === domainField || sourceField === accountField || sourceField === roleField)) {
                roleField.value = parsed.roleId;
            }
        } else {
            // Just clean the domain if no full URL parsing succeeded
            if (sourceField === domainField) {
                const cleaned = cleanDomainInput(input);
                if (cleaned && cleaned !== input) {
                    domainField.value = cleaned;
                }
            }
        }
    };

    // Add blur event to domain field for cleaning/parsing
    domainField.addEventListener('blur', (e) => {
        const value = e.target.value.trim();
        if (value) {
            parseAndPopulate(value, domainField);
        }
    });

    // Add paste event to all fields for intelligent parsing
    [domainField, accountField, roleField].forEach(field => {
        field.addEventListener('paste', (e) => {
            // Small delay to let the paste complete
            setTimeout(() => {
                const value = e.target.value.trim();
                if (value) {
                    parseAndPopulate(value, field);
                }
            }, 10);
        });
    });
}

function setupMatchFormListeners() {
    const matchBtn = document.getElementById('match-permissions-btn');
    let progressUnsubscribe = null;

    // Add input event listeners for auto-parsing
    setupFieldAutoParser('source-domain', 'source-account-id', 'source-role-id');
    setupFieldAutoParser('target-domain', 'target-account-id', 'target-role-id');

    // Inline validation: clear error when user types
    ['source-account-id', 'target-account-id', 'source-role-id', 'target-role-id'].forEach(id => {
        const input = document.getElementById(id);
        const help = document.getElementById(`${id}-help`);
        if (input && help) {
            input.addEventListener('input', () => {
                if (input.value.trim()) help.style.visibility = 'hidden';
            });
        }
    });

    // Match button handler
    matchBtn.addEventListener('click', async () => {
        // Source fields
        const sourceDomain = document.getElementById('source-domain').value.trim();
        const sourceAccountId = document.getElementById('source-account-id').value.trim();
        const sourceRole = document.getElementById('source-role-id').value.trim();

        // Target fields
        const targetDomain = document.getElementById('target-domain').value.trim();
        const targetAccountId = document.getElementById('target-account-id').value.trim();
        const targetRole = document.getElementById('target-role-id').value.trim();

        // Set up results area early so validation can use it
        const resultsCard = document.getElementById('match-results-card');
        const responseDiv = document.getElementById('match-response');

        // Validate required fields
        if (!sourceAccountId) {
            document.getElementById('source-account-id-help').style.visibility = 'visible';
            document.getElementById('source-account-id').focus();
            return;
        }
        document.getElementById('source-account-id-help').style.visibility = 'hidden';

        if (!targetAccountId) {
            document.getElementById('target-account-id-help').style.visibility = 'visible';
            document.getElementById('target-account-id').focus();
            return;
        }
        document.getElementById('target-account-id-help').style.visibility = 'hidden';

        if (!sourceRole || !targetRole) {
            if (!sourceRole) {
                document.getElementById('source-role-id-help').style.visibility = 'visible';
                document.getElementById('source-role-id').focus();
            }
            if (!targetRole) {
                document.getElementById('target-role-id-help').style.visibility = 'visible';
                if (sourceRole) document.getElementById('target-role-id').focus();
            }
            return;
        }
        document.getElementById('source-role-id-help').style.visibility = 'hidden';
        document.getElementById('target-role-id-help').style.visibility = 'hidden';

        const domain = document.getElementById('domain').value.trim();
        const token = document.getElementById('token').value.trim();

        if (!domain || !token) {
            resultsCard.hidden = false;
            responseDiv.innerHTML = '<div class="alert alert-danger"><i class="bi bi-exclamation-triangle me-2"></i>Please enter Canvas domain and API token in Settings.</div>';
            return;
        }

        // Use main domain if source/target domains not specified
        const finalSourceDomain = sourceDomain || domain;
        const finalTargetDomain = targetDomain || domain;

        // Show results card and prepare for updates
        resultsCard.hidden = false;
        responseDiv.innerHTML = '<div class="alert alert-info"><i class="bi bi-hourglass-split me-2"></i>Starting permissions matching...</div>';

        // Disable the button during operation
        matchBtn.disabled = true;
        matchBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Matching...';

        // Subscribe to progress updates
        progressUnsubscribe = window.progressAPI.onPermissionsMatchProgress((progress) => {
            console.log('Permissions match progress:', progress);

            let alertClass = 'alert-info';
            let icon = 'hourglass-split';

            if (progress.step === 'source-fetched') {
                icon = 'check-circle';
                responseDiv.innerHTML = `<div class="alert ${alertClass}"><i class="bi bi-${icon} me-2"></i>${progress.message}</div>`;
            } else if (progress.step === 'target-resolved') {
                icon = 'check-circle';
                responseDiv.innerHTML = `<div class="alert ${alertClass}"><i class="bi bi-${icon} me-2"></i>${progress.message}</div>`;
            } else if (progress.step === 'updating') {
                responseDiv.innerHTML = `<div class="alert ${alertClass}"><i class="bi bi-${icon} me-2"></i>${progress.message}</div>`;
            } else if (progress.step === 'completed') {
                alertClass = 'alert-success';
                icon = 'check-circle-fill';
                responseDiv.innerHTML = `<div class="alert ${alertClass}"><i class="bi bi-${icon} me-2"></i>${progress.message}</div>`;
            }
        });

        try {
            const result = await window.axios.matchPermissions({
                token: token,
                source: {
                    domain: finalSourceDomain,
                    accountId: sourceAccountId,
                    role: sourceRole
                },
                target: {
                    domain: finalTargetDomain,
                    accountId: targetAccountId,
                    role: targetRole
                }
            });

            console.log('Match permissions result:', result);

            if (result.success) {
                let alertClass = 'alert-success';
                let icon = 'check-circle-fill';
                let heading = 'Success!';

                // Show warning if some permissions failed
                if (result.failCount > 0) {
                    alertClass = 'alert-warning';
                    icon = 'exclamation-triangle-fill';
                    heading = 'Completed with Issues';
                }

                let failedDetailsHtml = '';
                if (result.failedPermissions && result.failedPermissions.length > 0) {
                    failedDetailsHtml = `
                        <hr>
                        <h6 class="text-danger"><i class="bi bi-x-circle me-1"></i>Failed Permissions (${result.failCount}):</h6>
                        <div style="max-height: 300px; overflow-y: auto;">
                            <ul class="mb-0" style="font-size: 0.85rem;">
                                ${result.failedPermissions.map(fp => `
                                    <li>
                                        <strong>${fp.permission}</strong>
                                        <br><small class="text-muted">Error: ${fp.error}</small>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    `;
                }

                responseDiv.innerHTML = `
                    <div class="alert ${alertClass}">
                        <h5 class="alert-heading"><i class="bi bi-${icon} me-2"></i>${heading}</h5>
                        <p class="mb-2">Permissions matched from source to target role.</p>
                        <hr>
                        <p class="mb-1"><strong>Source Permissions:</strong> ${result.sourcePermissionCount} total</p>
                        <p class="mb-1"><strong>Updates Applied:</strong> ${result.updatesApplied}</p>
                        <p class="mb-1"><strong>Successful:</strong> <span class="text-success">${result.successCount}</span></p>
                        <p class="mb-1"><strong>Failed:</strong> <span class="text-danger">${result.failCount}</span></p>
                        <p class="mb-0"><strong>Target Role ID:</strong> ${result.targetRoleId}</p>
                        ${failedDetailsHtml}
                    </div>
                `;
            } else if (result.cancelled) {
                responseDiv.innerHTML = '<div class="alert alert-warning"><i class="bi bi-exclamation-triangle me-2"></i>Operation cancelled by user.</div>';
            } else {
                responseDiv.innerHTML = `<div class="alert alert-danger"><i class="bi bi-exclamation-triangle me-2"></i>Operation failed: ${result.error || 'Unknown error'}</div>`;
            }

        } catch (error) {
            console.error('Error matching permissions:', error);
            responseDiv.innerHTML = `
                <div class="alert alert-danger">
                    <h5 class="alert-heading"><i class="bi bi-exclamation-triangle-fill me-2"></i>Error</h5>
                    <p class="mb-0">${error.message || 'An unexpected error occurred while matching permissions.'}</p>
                </div>
            `;
        } finally {
            // Re-enable the button
            matchBtn.disabled = false;
            matchBtn.innerHTML = '<i class="bi bi-arrow-repeat me-2"></i>Match Permissions';

            // Cleanup progress listener
            if (progressUnsubscribe) {
                progressUnsubscribe();
                progressUnsubscribe = null;
            }
        }
    });
}
