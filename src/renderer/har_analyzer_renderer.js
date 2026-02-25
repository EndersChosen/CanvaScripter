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
                <i class="bi bi-file-earmark-zip"></i> Basic Har Parser
            </h3>

            <!-- Tabs -->
            <ul class="nav nav-tabs mb-4" id="harTabs" role="tablist">
                <li class="nav-item" role="presentation">
                    <button class="nav-link active" id="standard-analyzer-tab" data-bs-toggle="tab" data-bs-target="#standard-analyzer-pane" type="button" role="tab" aria-controls="standard-analyzer-pane" aria-selected="true">Basic Har Parser</button>
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
                            <h5 class="card-title">Basic Har Parser</h5>
                            <p class="card-text text-muted">
                                Select a HAR file to parse and explore its contents.
                                All requests are displayed in a searchable, filterable table
                                grouped by resource type and domain — so you can do your own analysis.
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
                                Upload a HAR file and use AI to identify complex issues, anomalies, or provide a summary.
                                Configure your AI provider in <strong>AI Settings</strong>.
                            </p>

                            <div class="mb-3">
                                <label for="ai-prompt-input" class="form-label">Issue Summary & Instructions (Optional)</label>
                                <textarea class="form-control" id="ai-prompt-input" rows="3" placeholder="Describe the issue you're facing or what you want the AI to look for..."></textarea>
                            </div>
                            
                            <div id="ai-status-msg" class="mb-3">
                                <span class="text-muted"><i class="bi bi-info-circle"></i> An AI provider API key must be configured in AI Settings.</span>
                            </div>

                            <button id="select-har-file-ai" class="btn btn-primary">
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

    // 2. AI Analysis Execution (uses the user's configured AI provider)
    const analyzeBtn = document.getElementById('select-har-file-ai');

    analyzeBtn.addEventListener('click', async () => {
        try {
            const result = await window.ipcRenderer.invoke('har:selectFile');
            if (result.canceled) return;

            const prompt = document.getElementById('ai-prompt-input').value;

            showHarAiLoadingState();

            const analysis = await window.ipcRenderer.invoke('har:analyzeAi', {
                filePath: result.filePath,
                model: 'auto',
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

function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatModelName(modelId) {
    if (!modelId) return null;
    const name = modelId.includes('/') ? modelId.split('/').pop() : modelId;
    return name
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

function displayHarAiResults(analysis) {
    const resultsDiv = document.getElementById('har-ai-results');
    // Handle both old (string) and new ({ content, modelUsed }) response formats
    let content, modelUsed;
    if (typeof analysis === 'string') {
        content = analysis;
    } else if (analysis && typeof analysis === 'object') {
        content = analysis.content || JSON.stringify(analysis, null, 2);
        modelUsed = analysis.modelUsed;
    }
    const safeContent = escapeHtml(content);
    const modelTag = modelUsed ? `<div class="text-muted small mt-2"><i class="bi bi-cpu"></i> Model: ${formatModelName(modelUsed)}</div>` : '';

    resultsDiv.innerHTML = `
        <div class="card">
            <div class="card-header bg-success text-white">AI Analysis Result</div>
            <div class="card-body">
                <div class="ai-response-content" style="white-space: pre-wrap;">${safeContent}</div>
                ${modelTag}
            </div>
        </div>
    `;
}

function showHarAiError(message) {
    const resultsDiv = document.getElementById('har-ai-results');
    resultsDiv.innerHTML = `
        <div class="alert alert-danger" role="alert">
            <i class="bi bi-exclamation-triangle-fill"></i> ${escapeHtml(message)}
        </div>
    `;
}

// ─── HAR Parser Display ──────────────────────────────────────────────────────

/** Stored data for live filter re-renders */
let _harData = null;

function displayHarAnalysisResults(data) {
    _harData = data;
    const resultsDiv = document.getElementById('har-results');

    resultsDiv.innerHTML = `
        <div class="har-parser-results">
            ${renderSummary(data)}
            ${renderResourceBreakdown(data)}
            ${renderDomainsTable(data)}
            ${renderRequestsTable(data, data.entries)}
        </div>
    `;

    setupRequestFilters(data);
}

function renderSummary(data) {
    const s = data.summary;
    const startStr = s.startTime ? new Date(s.startTime).toLocaleString() : 'N/A';
    const endStr = s.endTime ? new Date(s.endTime).toLocaleString() : 'N/A';
    const creatorStr = s.creator ? escapeHtml(s.creator) : 'N/A';
    const uaStr = s.userAgent ? escapeHtml(s.userAgent) : 'N/A';

    let totalTimeStr = 'N/A';
    if (s.startTime && s.endTime) {
        const ms = new Date(s.endTime) - new Date(s.startTime);
        if (ms >= 0) {
            const totalSec = Math.round(ms / 1000);
            const h = Math.floor(totalSec / 3600);
            const m = Math.floor((totalSec % 3600) / 60);
            const sec = totalSec % 60;
            if (h > 0) totalTimeStr = `${h}h ${m}m ${sec}s`;
            else if (m > 0) totalTimeStr = `${m}m ${sec}s`;
            else totalTimeStr = `${sec}s`;
        }
    }

    return `
        <div class="card mb-3">
            <div class="card-header bg-primary text-white">
                <h5 class="mb-0"><i class="bi bi-info-circle"></i> Summary</h5>
            </div>
            <div class="card-body">
                <div class="row text-center g-3 mb-3">
                    <div class="col-6 col-md-2">
                        <div class="display-5 fw-bold">${s.totalRequests}</div>
                        <div class="text-muted small">Total Requests</div>
                    </div>
                    <div class="col-6 col-md-2">
                        <div class="display-5 fw-bold">${s.totalPages}</div>
                        <div class="text-muted small">Pages</div>
                    </div>
                    <div class="col-6 col-md-3">
                        <div class="fw-semibold small">${startStr}</div>
                        <div class="text-muted small">Start Time</div>
                    </div>
                    <div class="col-6 col-md-3">
                        <div class="fw-semibold small">${endStr}</div>
                        <div class="text-muted small">End Time</div>
                    </div>
                    <div class="col-6 col-md-2">
                        <div class="fw-semibold">${totalTimeStr}</div>
                        <div class="text-muted small">Total Time</div>
                    </div>
                </div>
                <div class="row g-3">
                    <div class="col-12 col-md-3">
                        <div class="text-muted small">Browser / Tool</div>
                        <div class="small">${creatorStr}</div>
                    </div>
                    <div class="col-12 col-md-9">
                        <div class="text-muted small">User-Agent</div>
                        <div class="small text-break font-monospace">${uaStr}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderResourceBreakdown(data) {
    const typeCounts = {};
    data.entries.forEach(e => {
        typeCounts[e.resourceType] = (typeCounts[e.resourceType] || 0) + 1;
    });

    const cards = Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => `
            <div class="col">
                <div class="card text-center h-100">
                    <div class="card-body p-2">
                        <div class="fs-4 fw-bold">${count}</div>
                        <div class="small text-muted">${escapeHtml(type)}</div>
                    </div>
                </div>
            </div>
        `).join('');

    return `
        <div class="card mb-3">
            <div class="card-header" role="button" data-bs-toggle="collapse" data-bs-target="#resource-breakdown-collapse" aria-expanded="true">
                <h5 class="mb-0">
                    <i class="bi bi-pie-chart"></i> Resource Types
                    <i class="bi bi-chevron-down float-end"></i>
                </h5>
            </div>
            <div id="resource-breakdown-collapse" class="collapse show">
                <div class="card-body">
                    <div class="row row-cols-2 row-cols-md-4 g-2">${cards}</div>
                </div>
            </div>
        </div>
    `;
}

function renderDomainsTable(data) {
    const domainCounts = {};
    data.entries.forEach(e => {
        try {
            const domain = new URL(e.url).hostname;
            domainCounts[domain] = (domainCounts[domain] || 0) + 1;
        } catch (_) { /* skip invalid URLs */ }
    });

    const rows = Object.entries(domainCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([domain, count]) => `
            <tr>
                <td>${escapeHtml(domain)}</td>
                <td><span class="badge bg-secondary">${count}</span></td>
            </tr>
        `).join('');

    return `
        <div class="card mb-3">
            <div class="card-header" role="button" data-bs-toggle="collapse" data-bs-target="#har-domains-collapse">
                <h5 class="mb-0">
                    <i class="bi bi-globe"></i> Domains
                    <i class="bi bi-chevron-down float-end"></i>
                </h5>
            </div>
            <div id="har-domains-collapse" class="collapse">
                <div class="p-0">
                    <div class="table-responsive" style="max-height: 300px; overflow-y: auto;">
                        <table class="table table-sm table-hover mb-0">
                            <thead class="table-light sticky-top">
                                <tr>
                                    <th>Domain</th>
                                    <th>Requests</th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function buildRequestRow(e) {
    let statusBadge = 'secondary';
    if (e.status === 0) statusBadge = 'dark';
    else if (e.status >= 200 && e.status < 300) statusBadge = 'success';
    else if (e.status >= 300 && e.status < 400) statusBadge = 'info';
    else if (e.status >= 400 && e.status < 500) statusBadge = 'warning';
    else if (e.status >= 500) statusBadge = 'danger';

    const sizeStr = e.contentSize > 0 ? formatBytes(e.contentSize) : '-';
    const timeStr = e.time > 0 ? `${e.time} ms` : '-';
    const displayUrl = e.url.length > 90 ? e.url.substring(0, 90) + '…' : e.url;

    return `
        <tr>
            <td class="text-muted small">${e.id}</td>
            <td><span class="badge bg-primary">${escapeHtml(e.method)}</span></td>
            <td><span class="badge bg-${statusBadge}">${e.status || '0'}</span></td>
            <td class="small" title="${escapeHtml(e.url)}">${escapeHtml(displayUrl)}</td>
            <td class="small text-muted">${escapeHtml(e.resourceType)}</td>
            <td class="small text-muted text-nowrap">${sizeStr}</td>
            <td class="small text-muted text-nowrap">${timeStr}</td>
        </tr>
    `;
}

function renderRequestsTable(data, filteredEntries) {
    const rows = filteredEntries.map(buildRequestRow).join('');

    return `
        <div class="card mb-3">
            <div class="card-header">
                <h5 class="mb-0"><i class="bi bi-list-ul"></i> All Requests</h5>
            </div>
            <div class="card-body pb-2">
                <div class="row g-2 mb-2">
                    <div class="col-12 col-md-5">
                        <input type="text" class="form-control form-control-sm" id="req-filter-url" placeholder="Search URL…">
                    </div>
                    <div class="col-6 col-md-2">
                        <select class="form-select form-select-sm" id="req-filter-method">
                            <option value="">All Methods</option>
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="PATCH">PATCH</option>
                            <option value="DELETE">DELETE</option>
                            <option value="OPTIONS">OPTIONS</option>
                        </select>
                    </div>
                    <div class="col-6 col-md-2">
                        <select class="form-select form-select-sm" id="req-filter-status">
                            <option value="">All Statuses</option>
                            <option value="2">2xx Success</option>
                            <option value="3">3xx Redirect</option>
                            <option value="4">4xx Client Error</option>
                            <option value="5">5xx Server Error</option>
                            <option value="0">Failed (0)</option>
                        </select>
                    </div>
                    <div class="col-6 col-md-2">
                        <select class="form-select form-select-sm" id="req-filter-type">
                            <option value="">All Types</option>
                            <option value="Document">Document</option>
                            <option value="Script">Script</option>
                            <option value="Stylesheet">Stylesheet</option>
                            <option value="Image">Image</option>
                            <option value="XHR/Fetch">XHR / Fetch</option>
                            <option value="Font">Font</option>
                            <option value="Media">Media</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div class="col-6 col-md-1">
                        <button class="btn btn-outline-secondary btn-sm w-100" id="req-filter-reset">Reset</button>
                    </div>
                </div>
                <div class="text-muted small" id="req-count-label">
                    Showing ${filteredEntries.length} of ${data.entries.length} requests
                </div>
            </div>
            <div class="table-responsive" style="max-height: 550px; overflow-y: auto;">
                <table class="table table-sm table-hover mb-0" id="requests-table">
                    <thead class="table-light sticky-top">
                        <tr>
                            <th style="width:3%">#</th>
                            <th style="width:7%">Method</th>
                            <th style="width:7%">Status</th>
                            <th>URL</th>
                            <th style="width:10%">Type</th>
                            <th style="width:8%">Size</th>
                            <th style="width:8%">Time</th>
                        </tr>
                    </thead>
                    <tbody id="requests-table-body">
                        ${rows}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function formatBytes(bytes) {
    if (bytes < 0) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function setupRequestFilters(data) {
    const urlInput = document.getElementById('req-filter-url');
    const methodSel = document.getElementById('req-filter-method');
    const statusSel = document.getElementById('req-filter-status');
    const typeSel = document.getElementById('req-filter-type');
    const resetBtn = document.getElementById('req-filter-reset');
    const tbody = document.getElementById('requests-table-body');
    const countLabel = document.getElementById('req-count-label');

    if (!urlInput || !tbody) return;

    function applyFilters() {
        const urlFilter = urlInput.value.toLowerCase();
        const methodFilter = methodSel.value;
        const statusFilter = statusSel.value;
        const typeFilter = typeSel.value;

        let filtered = data.entries;

        if (urlFilter) filtered = filtered.filter(e => e.url.toLowerCase().includes(urlFilter));
        if (methodFilter) filtered = filtered.filter(e => e.method === methodFilter);
        if (statusFilter === '0') {
            filtered = filtered.filter(e => e.status === 0);
        } else if (statusFilter) {
            filtered = filtered.filter(e => String(e.status).startsWith(statusFilter));
        }
        if (typeFilter) filtered = filtered.filter(e => e.resourceType === typeFilter);

        tbody.innerHTML = filtered.map(buildRequestRow).join('');
        if (countLabel) {
            countLabel.textContent = `Showing ${filtered.length} of ${data.entries.length} requests`;
        }
    }

    urlInput.addEventListener('input', applyFilters);
    methodSel.addEventListener('change', applyFilters);
    statusSel.addEventListener('change', applyFilters);
    typeSel.addEventListener('change', applyFilters);
    resetBtn.addEventListener('click', () => {
        urlInput.value = '';
        methodSel.value = '';
        statusSel.value = '';
        typeSel.value = '';
        applyFilters();
    });
}

function showHarError(message) {
    const resultsDiv = document.getElementById('har-results');
    resultsDiv.innerHTML = `
        <div class="alert alert-danger" role="alert">
            <i class="bi bi-exclamation-triangle-fill"></i> ${escapeHtml(message)}
        </div>
        `;
}
