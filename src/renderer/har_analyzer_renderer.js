/**
 * HAR Analyzer Renderer
 * Handles UI interactions for HAR file analysis
 */

// Template function called by the main router
function harAnalyzerTemplate(e) {
    // Hide other endpoint forms
    if (typeof hideEndpoints === 'function') {
        hideEndpoints(e);
    }

    // Show HAR analyzer content area
    showHARAnalyzerUI();
}

function showHARAnalyzerUI() {
    const endpointContent = document.getElementById('endpoint-content');
    if (!endpointContent) return;

    let harContainer = document.getElementById('har-analyzer-container');
    if (!harContainer) {
        harContainer = document.createElement('div');
        harContainer.id = 'har-analyzer-container';
        harContainer.className = 'p-4';
        endpointContent.appendChild(harContainer);
    }

    harContainer.hidden = false;
    harContainer.innerHTML = `
        <div class="har-analyzer-ui">
            <h3 class="mb-4">
                <i class="bi bi-file-earmark-zip"></i> HAR File Analyzer
            </h3>

            <!-- Tabs -->
            <ul class="nav nav-tabs mb-4" id="harTabs" role="tablist">
                <li class="nav-item" role="presentation">
                    <button class="nav-link active" id="standard-analyzer-tab" data-bs-toggle="tab" data-bs-target="#standard-analyzer-pane" type="button" role="tab" aria-controls="standard-analyzer-pane" aria-selected="true">Standard Analyzer</button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="ai-analyzer-tab" data-bs-toggle="tab" data-bs-target="#ai-analyzer-pane" type="button" role="tab" aria-controls="ai-analyzer-pane" aria-selected="false">AI Advisor</button>
                </li>
            </ul>

            <div class="tab-content" id="harTabsContent">
                <!-- Standard Analyzer Pane -->
                <div class="tab-pane fade show active" id="standard-analyzer-pane" role="tabpanel" aria-labelledby="standard-analyzer-tab" tabindex="0">
                    <div class="card mb-4">
                        <div class="card-body">
                            <h5 class="card-title">Standard HAR Analysis</h5>
                            <p class="card-text text-muted">
                                Analyze HTTP Archive (HAR) files to diagnose authentication issues,
                                performance problems, and network traffic patterns.
                            </p>
                            <button id="select-har-file" class="btn btn-primary">
                                <i class="bi bi-upload"></i> Select HAR File
                            </button>
                        </div>
                    </div>
                    <div id="har-results"></div>
                </div>

                <!-- AI Analyzer Pane -->
                <div class="tab-pane fade" id="ai-analyzer-pane" role="tabpanel" aria-labelledby="ai-analyzer-tab" tabindex="0">
                     <div class="card mb-4">
                        <div class="card-body">
                            <h5 class="card-title">AI-Powered HAR Diagnostics</h5>
                             <p class="card-text text-muted">
                                Upload a HAR file and use an LLM to identify complex issues, anomalies, or provide a summary.
                            </p>
                            
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label for="ai-model-select" class="form-label">Select AI Model</label>
                                    <select class="form-select" id="ai-model-select">
                                        <option value="gpt-5.2">GPT-5.2</option>
                                        <option value="claude-sonnet-4.5">Claude Sonnet 4.5</option>
                                    </select>
                                </div>
                            </div>

                            <div class="mb-3">
                                <label for="ai-prompt-input" class="form-label">Issue Summary & Instructions (Optional)</label>
                                <textarea class="form-control" id="ai-prompt-input" rows="3" placeholder="Describe the issue you're facing or what you want the AI to look for..."></textarea>
                            </div>

                            <div id="api-key-section" class="mb-3 d-none">
                                <label for="api-key-input" class="form-label text-danger">API Key Required</label>
                                <div class="input-group">
                                    <input type="text" class="form-control" id="api-key-input" placeholder="Enter API Key">
                                    <button class="btn btn-outline-secondary" type="button" id="save-api-key">Save Key</button>
                                </div>
                                <div class="form-text">Your API key will be stored securely locally.</div>
                            </div>
                            
                            <div id="api-key-display-section" class="mb-3 d-none">
                                <label class="form-label text-success">API Key Stored</label>
                                <div class="input-group">
                                    <input type="text" class="form-control" id="masked-api-key" disabled readonly value="">
                                    <button class="btn btn-outline-danger" type="button" id="delete-api-key">Remove</button>
                                </div>
                                <div class="form-text">Key is saved. Remove to update.</div>
                            </div>
                            
                            <div id="ai-status-msg" class="mb-3"></div>

                            <button id="select-har-file-ai" class="btn btn-primary" disabled>
                                <i class="bi bi-robot"></i> Select & Analyze with AI
                            </button>
                        </div>
                    </div>
                     <div id="har-ai-results"></div>
                </div>
            </div>
        </div>
    `;

    // --- Event Listeners ---

    // 1. Standard Analysis
    const selectButton = document.getElementById('select-har-file');
    selectButton.addEventListener('click', async () => {
        try {
            const result = await window.ipcRenderer.invoke('har:selectFile');
            if (result.canceled) return;

            showHarLoadingState();

            const analysis = await window.ipcRenderer.invoke('har:analyze', result.filePath);
            displayHarAnalysisResults(analysis);

        } catch (error) {
            showHarError('Failed to analyze HAR file: ' + error.message);
        }
    });

    // 2. AI Model Selection & Key Management
    const modelSelect = document.getElementById('ai-model-select');
    const apiKeySection = document.getElementById('api-key-section');
    const apiKeyInput = document.getElementById('api-key-input');
    const saveKeyBtn = document.getElementById('save-api-key');

    // New elements for viewing/deleting keys
    const apiKeyDisplaySection = document.getElementById('api-key-display-section');
    const maskedApiKeyInput = document.getElementById('masked-api-key');
    const deleteKeyBtn = document.getElementById('delete-api-key');

    const analyzeBtn = document.getElementById('select-har-file-ai');
    const statusMsg = document.getElementById('ai-status-msg');

    async function checkKeyStatus() {
        const model = modelSelect.value;
        const provider = model.includes('gpt') ? 'openai' : 'anthropic';

        try {
            const hasKey = await window.ipcRenderer.invoke('settings:hasApiKey', provider);

            if (hasKey) {
                // Key exists: Show display section, hide input section
                if (maskedApiKeyInput) {
                    // Try to get masked key, handle potential errors peacefully
                    try {
                        const maskedKey = await window.ipcRenderer.invoke('settings:getMaskedApiKey', provider);
                        maskedApiKeyInput.value = maskedKey || '****';
                    } catch (e) {
                        console.error('Failed to get masked key', e);
                        maskedApiKeyInput.value = '**** (Error retrieving)';
                    }
                }

                if (apiKeySection) apiKeySection.classList.add('d-none');
                if (apiKeyDisplaySection) apiKeyDisplaySection.classList.remove('d-none');

                if (analyzeBtn) analyzeBtn.disabled = false;
                if (statusMsg) statusMsg.innerHTML = '<span class="text-success"><i class="bi bi-check-circle"></i> API Key found. Ready to analyze.</span>';
            } else {
                // No key: Show input section, hide display section
                if (apiKeySection) apiKeySection.classList.remove('d-none');
                if (apiKeyDisplaySection) apiKeyDisplaySection.classList.add('d-none');

                if (analyzeBtn) analyzeBtn.disabled = true;
                if (statusMsg) statusMsg.innerHTML = '<span class="text-warning"><i class="bi bi-exclamation-triangle"></i> API Key missing. Please enter it above.</span>';
            }
        } catch (err) {
            console.error('Error checking API key:', err);
        }
    }

    // Check on load/change
    modelSelect.addEventListener('change', checkKeyStatus);

    // Also check when tab is shown
    const aiTab = document.getElementById('ai-analyzer-tab');
    aiTab.addEventListener('shown.bs.tab', checkKeyStatus);

    // Delete Key handler
    if (deleteKeyBtn) {
        deleteKeyBtn.addEventListener('click', async () => {
            const model = modelSelect.value;
            const provider = model.includes('gpt') ? 'openai' : 'anthropic';

            if (confirm('Are you sure you want to remove the stored API key?')) {
                try {
                    await window.ipcRenderer.invoke('settings:deleteApiKey', provider);
                    await checkKeyStatus();
                } catch (err) {
                    statusMsg.innerHTML = `<span class="text-danger">Failed to delete key: ${err.message}</span>`;
                }
            }
        });
    }

    // Save Key handler
    saveKeyBtn.addEventListener('click', async () => {
        const key = apiKeyInput.value.trim();
        if (!key) return;

        const model = modelSelect.value;
        const provider = model.includes('gpt') ? 'openai' : 'anthropic';

        try {
            await window.ipcRenderer.invoke('settings:saveApiKey', provider, key);
            apiKeyInput.value = '';
            await checkKeyStatus();
        } catch (err) {
            statusMsg.innerHTML = `<span class="text-danger">Failed to save key: ${err.message}</span>`;
        }
    });


    // 3. AI Analysis Execution
    analyzeBtn.addEventListener('click', async () => {
        try {
            const result = await window.ipcRenderer.invoke('har:selectFile');
            if (result.canceled) return;

            const model = document.getElementById('ai-model-select').value;
            const prompt = document.getElementById('ai-prompt-input').value;

            showHarAiLoadingState();

            // Invoke AI analysis (Implementation needed in main process)
            const analysis = await window.ipcRenderer.invoke('har:analyzeAi', {
                filePath: result.filePath,
                model: model,
                prompt: prompt
            });

            displayHarAiResults(analysis);

        } catch (error) {
            showHarAiError('Failed to run AI analysis: ' + error.message);
        }
    });
}

function showHarLoadingState() {
    const resultsDiv = document.getElementById('har-results');
    resultsDiv.innerHTML = `
        <div class="text-center p-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3">Analyzing HAR file...</p>
        </div>
    `;
}

function showHarAiLoadingState() {
    const resultsDiv = document.getElementById('har-ai-results');
    resultsDiv.innerHTML = `
        <div class="text-center p-5">
            <div class="spinner-border text-success" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3">Consulting AI Model...</p>
        </div>
    `;
}

function displayHarAiResults(analysis) {
    const resultsDiv = document.getElementById('har-ai-results');
    // Simple display for now, assuming analysis returns a markdown string or object with content
    const content = typeof analysis === 'string' ? analysis : (analysis.content || JSON.stringify(analysis, null, 2));

    // Convert newlines to breaks if it's plain text, or render markdown if we had a renderer
    // For now, let's wrap in a pre tag or basic div
    resultsDiv.innerHTML = `
        <div class="card">
            <div class="card-header bg-success text-white">AI Analysis Result</div>
            <div class="card-body">
                <div class="ai-response-content" style="white-space: pre-wrap;">${content}</div>
            </div>
        </div>
    `;
}

function showHarAiError(message) {
    const resultsDiv = document.getElementById('har-ai-results');
    resultsDiv.innerHTML = `
        <div class="alert alert-danger" role="alert">
            <i class="bi bi-exclamation-triangle-fill"></i> ${message}
        </div>
    `;
}

function displayHarAnalysisResults(analysis) {
    const resultsDiv = document.getElementById('har-results');

    const html = `
        < div class="har-analysis-results" >
            ${renderDiagnosis(analysis)}
            ${renderOverview(analysis)}
            ${renderBrowserInfo(analysis)}
            ${renderErrors(analysis)}
            ${renderAuthFlow(analysis)}
            ${renderStatusCodes(analysis)}
            ${renderDomains(analysis)}
            ${renderPerformance(analysis)}
            ${renderSecurity(analysis)}
            ${renderContentTypes(analysis)}
            ${renderCookies(analysis)}
        </div >
        `;

    resultsDiv.innerHTML = html;
}

function renderOverview(analysis) {
    const stats = analysis.basicStats;
    const duration = stats.duration ? `${stats.duration.toFixed(1)} s` : 'N/A';
    const startTime = stats.startTime ? new Date(stats.startTime).toLocaleString() : 'N/A';

    return `
        < div class="card mb-3" >
            <div class="card-header bg-primary text-white" role="button" data-bs-toggle="collapse" data-bs-target="#overview-collapse" aria-expanded="true">
                <h5 class="mb-0">
                    <i class="bi bi-info-circle"></i> Overview
                    <i class="bi bi-chevron-down float-end"></i>
                </h5>
            </div>
            <div id="overview-collapse" class="collapse show">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-3">
                            <div class="text-center">
                                <div class="display-4 text-primary">${stats.totalRequests}</div>
                                <div class="text-muted">Total Requests</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="text-center">
                                <div class="display-4 text-info">${stats.totalPages}</div>
                                <div class="text-muted">Pages/Steps</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="text-center">
                                <div class="display-4 text-success">${duration}</div>
                                <div class="text-muted">Duration</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="text-center">
                                <div class="h6 text-secondary">${startTime}</div>
                                <div class="text-muted">Started</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div >
        `;
}

function renderBrowserInfo(analysis) {
    const browser = analysis.browserInfo;

    // Determine device icon
    let deviceIcon = 'bi-laptop';
    if (browser.deviceType === 'Mobile') deviceIcon = 'bi-phone';
    else if (browser.deviceType === 'Tablet') deviceIcon = 'bi-tablet';

    // Determine browser icon
    let browserIcon = 'bi-browser-chrome';
    if (browser.browserName.includes('Firefox')) browserIcon = 'bi-browser-firefox';
    else if (browser.browserName.includes('Edge')) browserIcon = 'bi-browser-edge';
    else if (browser.browserName.includes('Safari')) browserIcon = 'bi-browser-safari';

    return `
        < div class="card mb-3" >
            <div class="card-header bg-secondary text-white" role="button" data-bs-toggle="collapse" data-bs-target="#browser-collapse" aria-expanded="true">
                <h5 class="mb-0">
                    <i class="bi ${browserIcon}"></i> Browser & Environment
                    <i class="bi bi-chevron-down float-end"></i>
                </h5>
            </div>
            <div id="browser-collapse" class="collapse show">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-4">
                            <div class="d-flex align-items-center mb-2">
                                <i class="bi ${browserIcon} fs-4 me-2 text-primary"></i>
                                <div>
                                    <strong>Browser</strong>
                                    <div class="text-muted">${browser.fullBrowserString}</div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="d-flex align-items-center mb-2">
                                <i class="bi bi-hdd fs-4 me-2 text-success"></i>
                                <div>
                                    <strong>Operating System</strong>
                                    <div class="text-muted">${browser.fullOSString}</div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="d-flex align-items-center mb-2">
                                <i class="bi ${deviceIcon} fs-4 me-2 text-info"></i>
                                <div>
                                    <strong>Device Type</strong>
                                    <div class="text-muted">${browser.deviceType}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    ${browser.userAgent ? `
                        <div class="mt-3">
                            <strong>User-Agent String:</strong>
                            <div class="mt-1">
                                <code class="d-block p-2 bg-light rounded" style="font-size: 0.75rem; word-break: break-all;">
                                    ${browser.userAgent}
                                </code>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div >
        `;
}

function renderStatusCodes(analysis) {
    const statusRows = analysis.statusCodes.map(({ status, count, category }) => {
        let badgeClass = 'secondary';
        if (category === 'Success') badgeClass = 'success';
        else if (category === 'Redirect') badgeClass = 'info';
        else if (category === 'Client Error') badgeClass = 'warning';
        else if (category === 'Server Error') badgeClass = 'danger';
        else if (category === 'Failed') badgeClass = 'dark';

        return `
        < tr >
                <td><span class="badge bg-${badgeClass}">${status}</span></td>
                <td>${category}</td>
                <td>${count}</td>
            </tr >
        `;
    }).join('');

    return `
        < div class="card mb-3" >
            <div class="card-header" role="button" data-bs-toggle="collapse" data-bs-target="#status-collapse">
                <h5 class="mb-0">
                    <i class="bi bi-bar-chart"></i> HTTP Status Codes
                    <i class="bi bi-chevron-down float-end"></i>
                </h5>
            </div>
            <div id="status-collapse" class="collapse">
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-sm table-hover">
                            <thead>
                                <tr>
                                    <th>Status</th>
                                    <th>Category</th>
                                    <th>Count</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${statusRows}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div >
        `;
}

function renderDomains(analysis) {
    const domainRows = analysis.domains.slice(0, 15).map(({ domain, count }) => `
        < tr >
            <td>${domain}</td>
            <td><span class="badge bg-secondary">${count}</span></td>
        </tr >
        `).join('');

    return `
        < div class="card mb-3" >
            <div class="card-header" role="button" data-bs-toggle="collapse" data-bs-target="#domains-collapse">
                <h5 class="mb-0">
                    <i class="bi bi-globe"></i> Top Domains
                    <i class="bi bi-chevron-down float-end"></i>
                </h5>
            </div>
            <div id="domains-collapse" class="collapse">
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-sm table-hover">
                            <thead>
                                <tr>
                                    <th>Domain</th>
                                    <th>Requests</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${domainRows}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div >
        `;
}

function renderErrors(analysis) {
    if (analysis.errors.length === 0) {
        return `
        < div class="card mb-3 border-success" >
                <div class="card-header bg-success text-white" role="button" data-bs-toggle="collapse" data-bs-target="#errors-collapse">
                    <h5 class="mb-0">
                        <i class="bi bi-check-circle"></i> Errors
                        <i class="bi bi-chevron-down float-end"></i>
                    </h5>
                </div>
                <div id="errors-collapse" class="collapse">
                    <div class="card-body">
                        <p class="mb-0 text-success"><i class="bi bi-check-circle-fill"></i> No HTTP errors found (4xx, 5xx)</p>
                    </div>
                </div>
            </div >
        `;
    }

    const errorRows = analysis.errors.map(error => {
        let badgeClass = error.status >= 500 ? 'danger' : 'warning';
        return `
        < tr >
                <td><span class="badge bg-${badgeClass}">${error.status}</span></td>
                <td>${error.method}</td>
                <td class="text-truncate" style="max-width: 400px;" title="${error.url}">${error.url}</td>
            </tr >
        `;
    }).join('');

    return `
        < div class="card mb-3 border-danger" >
            <div class="card-header bg-danger text-white" role="button" data-bs-toggle="collapse" data-bs-target="#errors-collapse" aria-expanded="true">
                <h5 class="mb-0">
                    <i class="bi bi-exclamation-triangle"></i> Errors (${analysis.errors.length})
                    <i class="bi bi-chevron-down float-end"></i>
                </h5>
            </div>
            <div id="errors-collapse" class="collapse show">
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Status</th>
                                    <th>Method</th>
                                    <th>URL</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${errorRows}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div >
        `;
}

function renderAuthFlow(analysis) {
    if (!analysis.authFlow.detected) {
        return `
        < div class="card mb-3" >
                <div class="card-header" role="button" data-bs-toggle="collapse" data-bs-target="#authflow-collapse">
                    <h5 class="mb-0">
                        <i class="bi bi-shield-lock"></i> Authentication Flow
                        <i class="bi bi-chevron-down float-end"></i>
                    </h5>
                </div>
                <div id="authflow-collapse" class="collapse">
                    <div class="card-body">
                        <p class="mb-0 text-muted">No authentication flow detected</p>
                    </div>
                </div>
            </div >
        `;
    }

    const authType = analysis.authFlow.type.join(', ');
    const requestRows = analysis.authFlow.requests.map(req => {
        let statusBadge = 'secondary';
        if (req.status >= 200 && req.status < 300) statusBadge = 'success';
        else if (req.status >= 300 && req.status < 400) statusBadge = 'info';
        else if (req.status >= 400) statusBadge = 'danger';

        return `
        < tr >
                <td><span class="badge bg-${statusBadge}">${req.status}</span></td>
                <td>${req.method}</td>
                <td class="text-truncate" style="max-width: 400px;" title="${req.url}">${req.url}</td>
            </tr >
        `;
    }).join('');

    return `
        < div class="card mb-3" >
            <div class="card-header bg-info text-white" role="button" data-bs-toggle="collapse" data-bs-target="#authflow-collapse" aria-expanded="true">
                <h5 class="mb-0">
                    <i class="bi bi-shield-lock"></i> Authentication Flow
                    <i class="bi bi-chevron-down float-end"></i>
                </h5>
            </div>
            <div id="authflow-collapse" class="collapse show">
                <div class="card-body">
                    <p><strong>Type:</strong> ${authType}</p>
                    <p><strong>Requests:</strong> ${analysis.authFlow.requestCount}</p>
                    <div class="table-responsive">
                        <table class="table table-sm table-hover">
                            <thead>
                                <tr>
                                    <th>Status</th>
                                    <th>Method</th>
                                    <th>URL</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${requestRows}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div >
        `;
}

function renderPerformance(analysis) {
    const timingRows = analysis.timing.map((t, i) => `
        < tr >
            <td>${i + 1}</td>
            <td>${t.time.toFixed(0)}ms</td>
            <td class="text-truncate" style="max-width: 400px;" title="${t.url}">${t.url}</td>
        </tr >
        `).join('');

    const sizeRows = analysis.size.byType.slice(0, 10).map(({ type, sizeKB, count }) => `
        < tr >
            <td>${type}</td>
            <td>${sizeKB} KB</td>
            <td>${count}</td>
        </tr >
        `).join('');

    return `
        < div class="card mb-3" >
            <div class="card-header" role="button" data-bs-toggle="collapse" data-bs-target="#performance-collapse">
                <h5 class="mb-0">
                    <i class="bi bi-speedometer2"></i> Performance
                    <i class="bi bi-chevron-down float-end"></i>
                </h5>
            </div>
            <div id="performance-collapse" class="collapse">
                <div class="card-body">
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <div class="card bg-light">
                                <div class="card-body text-center">
                                    <h3>${analysis.size.totalContentSizeMB} MB</h3>
                                    <p class="mb-0">Total Content Size</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card bg-light">
                                <div class="card-body text-center">
                                    <h3>${analysis.size.totalTransferSizeMB} MB</h3>
                                    <p class="mb-0">Total Transferred</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h6>Slowest Requests</h6>
                    <div class="table-responsive mb-3">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Time</th>
                                    <th>URL</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${timingRows}
                            </tbody>
                        </table>
                    </div>

                    <h6>Size by Content Type (Top 10)</h6>
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Size</th>
                                    <th>Count</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${sizeRows}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div >
        `;
}

function renderSecurity(analysis) {
    const security = analysis.security;
    return `
        < div class="card mb-3" >
            <div class="card-header" role="button" data-bs-toggle="collapse" data-bs-target="#security-collapse">
                <h5 class="mb-0">
                    <i class="bi bi-shield-check"></i> Security Headers
                    <i class="bi bi-chevron-down float-end"></i>
                </h5>
            </div>
            <div id="security-collapse" class="collapse">
                <div class="card-body">
                    <ul class="list-group">
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            X-Frame-Options
                            <span class="badge bg-primary rounded-pill">${security.xFrameOptions}</span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            Content-Security-Policy
                            <span class="badge bg-primary rounded-pill">${security.contentSecurityPolicy}</span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            Strict-Transport-Security
                            <span class="badge bg-primary rounded-pill">${security.strictTransportSecurity}</span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            X-Content-Type-Options
                            <span class="badge bg-primary rounded-pill">${security.xContentTypeOptions}</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div >
        `;
}

function renderContentTypes(analysis) {
    const rows = analysis.contentTypes.slice(0, 15).map(({ type, count }) => `
        < tr >
            <td>${type}</td>
            <td><span class="badge bg-secondary">${count}</span></td>
        </tr >
        `).join('');

    return `
        < div class="card mb-3" >
            <div class="card-header" role="button" data-bs-toggle="collapse" data-bs-target="#content-types-collapse">
                <h5 class="mb-0">
                    <i class="bi bi-file-earmark-text"></i> Content Types
                    <i class="bi bi-chevron-down float-end"></i>
                </h5>
            </div>
            <div id="content-types-collapse" class="collapse">
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Count</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div >
        `;
}

function renderCookies(analysis) {
    const cookieRows = analysis.cookies.byDomain.slice(0, 10).map(({ domain, count }) => `
        < tr >
            <td>${domain}</td>
            <td><span class="badge bg-secondary">${count}</span></td>
        </tr >
        `).join('');

    const noCookies = analysis.cookies.totalCookies === 0;

    return `
        < div class="card mb-3" >
            <div class="card-header" role="button" data-bs-toggle="collapse" data-bs-target="#cookies-collapse">
                <h5 class="mb-0">
                    <i class="bi bi-cookie"></i> Cookies
                    <i class="bi bi-chevron-down float-end"></i>
                </h5>
            </div>
            <div id="cookies-collapse" class="collapse">
                <div class="card-body">
                    ${noCookies ? '<p class="text-muted">No cookies set</p>' : `
                        <p><strong>Total cookies set:</strong> ${analysis.cookies.totalCookies}</p>
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Domain</th>
                                        <th>Cookies</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${cookieRows}
                                </tbody>
                            </table>
                        </div>
                    `}
                </div>
            </div>
        </div >
        `;
}

function renderDiagnosis(analysis) {
    // Get diagnosis if available
    const diagnosis = analysis.diagnosis;
    if (!diagnosis || !diagnosis.isIncomplete) {
        return '';
    }

    // Determine styling based on severity
    let borderClass = 'border-warning';
    let headerClass = 'bg-warning text-dark';
    let alertClass = 'alert-warning';
    let icon = 'bi-exclamation-triangle-fill';
    let title = 'Authentication Issue Detected';

    if (diagnosis.severity === 'critical') {
        borderClass = 'border-danger';
        headerClass = 'bg-danger text-white';
        alertClass = 'alert-danger';
        icon = 'bi-x-circle-fill';

        if (diagnosis.rootCause === 'backend_service_auth_failure') {
            title = 'Backend Service Authentication Failure';
        } else {
            title = 'Critical Authentication Error';
        }
    } else if (diagnosis.severity === 'warning') {
        title = 'Authentication Flow Incomplete';
    }

    // Format reasons - handle both list items and plain text
    const reasonsList = diagnosis.reasons.map(r => {
        // If reason is empty (blank line separator), add spacing
        if (r.trim() === '') {
            return '<li style="list-style: none; height: 0.5em;"></li>';
        }
        // If reason starts with bullet or special char, it's likely not a list item
        if (r.startsWith('•') || r.startsWith('⚠️') || r.startsWith('Root Cause') || r.startsWith('The authentication')) {
            return `< li style = "list-style: none; margin-left: -1em;" > ${r}</li > `;
        }
        return `< li > ${r}</li > `;
    }).join('');

    const recommendationsList = diagnosis.recommendations.map(r => {
        // Handle separators and special formatting
        if (r.trim() === '') {
            return '<li style="list-style: none; height: 0.5em;"></li>';
        }
        if (r.startsWith('🔧') || r.startsWith('⚠️') || r.startsWith('This is NOT')) {
            return `< li style = "list-style: none; margin-left: -1em;" > <strong>${r}</strong></li > `;
        }
        if (r.match(/^\d+\./)) {
            return `< li style = "list-style: none; margin-left: -1em;" > ${r}</li > `;
        }
        return `< li > ${r}</li > `;
    }).join('');

    return `
        < div class="card mb-3 ${borderClass}" >
            <div class="card-header ${headerClass}" role="button" data-bs-toggle="collapse" data-bs-target="#diagnosis-collapse" aria-expanded="true">
                <h5 class="mb-0">
                    <i class="bi ${icon}"></i> ${title}
                    <i class="bi bi-chevron-down float-end"></i>
                </h5>
            </div>
            <div id="diagnosis-collapse" class="collapse show">
                <div class="card-body">
                    ${diagnosis.severity === 'critical' ? `
                        <div class="alert ${alertClass}" role="alert">
                            <strong><i class="bi ${icon}"></i> ${title}</strong>
                        </div>
                    ` : ''}

                    <h6>Analysis:</h6>
                    <ul class="mb-3" style="line-height: 1.6;">
                        ${reasonsList}
                    </ul>

                    ${recommendationsList ? `
                        <h6>Action Required:</h6>
                        <ul class="mb-0" style="line-height: 1.6;">
                            ${recommendationsList}
                        </ul>
                    ` : ''}
                </div>
            </div>
        </div >
        `;
}

function showHarError(message) {
    const resultsDiv = document.getElementById('har-results');
    resultsDiv.innerHTML = `
        < div class="alert alert-danger" role = "alert" >
            <i class="bi bi-exclamation-triangle-fill"></i> ${message}
        </div >
        `;
}
