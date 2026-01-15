/**
 * UTF-8 Checker Renderer
 * UI for validating UTF-8 encoding and fixing issues
 */

// eslint-disable-next-line no-unused-vars
function utf8CheckerTemplate(e) {
    if (typeof hideEndpoints === 'function') {
        hideEndpoints(e);
    }
    showUTF8CheckerUI();
}

function showUTF8CheckerUI() {
    const endpointContent = document.getElementById('endpoint-content');
    if (!endpointContent) {
        console.error('endpoint-content not found');
        return;
    }

    let utf8Container = document.getElementById('utf8-checker-container');
    if (!utf8Container) {
        utf8Container = document.createElement('div');
        utf8Container.id = 'utf8-checker-container';
        utf8Container.className = 'p-4';
        endpointContent.appendChild(utf8Container);
    }

    utf8Container.hidden = false;
    utf8Container.innerHTML = `
        <div class="container-fluid py-4">
            <div class="row mb-4">
                <div class="col">
                    <h2><i class="bi bi-file-earmark-binary"></i> UTF-8 Checker</h2>
                    <p class="text-muted">Validate UTF-8 encoding, identify invalid characters, and fix encoding issues.</p>
                </div>
            </div>

            <!-- File Selection -->
            <div class="card mb-4">
                <div class="card-header">
                    <i class="bi bi-file-earmark-text"></i> Select File to Validate
                </div>
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-8">
                            <button class="btn btn-primary" id="select-utf8-file">
                                <i class="bi bi-folder2-open"></i> Select File
                            </button>
                            <span id="utf8-file-info" class="ms-3 text-muted d-none">
                                <i class="bi bi-file-earmark"></i> <span id="utf8-file-name"></span>
                                (<span id="utf8-file-size"></span>)
                            </span>
                        </div>
                        <div class="col-md-4 text-end">
                            <button class="btn btn-success" id="validate-utf8-btn" disabled>
                                <i class="bi bi-check2-circle"></i> Validate
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Results Area -->
            <div id="utf8-results"></div>
        </div>
    `;

    attachUTF8EventListeners();
    addUTF8Styles();
}

function attachUTF8EventListeners() {
    let selectedFilePath = null;

    const selectFileBtn = document.getElementById('select-utf8-file');
    const validateBtn = document.getElementById('validate-utf8-btn');

    selectFileBtn.addEventListener('click', async () => {
        try {
            const result = await window.ipcRenderer.invoke('utf8:selectFile');
            if (result.canceled) return;

            selectedFilePath = result.filePath;
            document.getElementById('utf8-file-name').textContent = result.fileName;
            document.getElementById('utf8-file-size').textContent = formatUTF8FileSize(result.fileSize);
            document.getElementById('utf8-file-info').classList.remove('d-none');
            validateBtn.disabled = false;
        } catch (error) {
            showUTF8Error('Failed to select file: ' + error.message);
        }
    });

    validateBtn.addEventListener('click', async () => {
        if (!selectedFilePath) return;

        try {
            showUTF8LoadingState();
            const result = await window.ipcRenderer.invoke('utf8:validate', selectedFilePath);
            displayUTF8Results(result, selectedFilePath);
        } catch (error) {
            showUTF8Error('Failed to validate file: ' + error.message);
        }
    });
}

function formatUTF8FileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showUTF8LoadingState() {
    const resultsDiv = document.getElementById('utf8-results');
    resultsDiv.innerHTML = `
        <div class="text-center p-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3">Validating UTF-8 encoding...</p>
            <small class="text-muted">Scanning file for encoding issues</small>
        </div>
    `;
}

function showUTF8Error(message) {
    const resultsDiv = document.getElementById('utf8-results');
    resultsDiv.innerHTML = `
        <div class="alert alert-danger" role="alert">
            <i class="bi bi-exclamation-triangle-fill"></i> ${message}
        </div>
    `;
}

function displayUTF8Results(result, filePath) {
    const resultsDiv = document.getElementById('utf8-results');

    const summaryHtml = renderUTF8Summary(result);
    const encodingHtml = renderEncodingInfo(result);
    const analysisHtml = renderEncodingAnalysis(result);
    const issuesHtml = renderUTF8Issues(result);
    const actionsHtml = result.valid ? '' : renderFixActions(result, filePath);

    resultsDiv.innerHTML = `
        <div class="utf8-results">
            ${summaryHtml}
            ${encodingHtml}
            ${analysisHtml}
            ${actionsHtml}
            ${issuesHtml}
        </div>
    `;

    if (!result.valid) {
        attachFixActionListeners(filePath);
    }
}

function renderUTF8Summary(result) {
    const badgeClass = result.valid ? 'bg-success' : 'bg-danger';
    const icon = result.valid ? 'bi-check-circle-fill' : 'bi-x-circle-fill';
    const statusText = result.valid ? 'Valid UTF-8' : 'Invalid UTF-8';

    return `
        <div class="card mb-3">
            <div class="card-header d-flex justify-content-between align-items-center">
                <span><i class="bi bi-clipboard-check"></i> Validation Summary</span>
                <span class="badge ${badgeClass}">
                    <i class="${icon}"></i> ${statusText}
                </span>
            </div>
            <div class="card-body">
                <div class="row text-center">
                    <div class="col">
                        <div class="fs-4 fw-bold">${result.totalBytes.toLocaleString()}</div>
                        <small class="text-muted">Total Bytes</small>
                    </div>
                    <div class="col">
                        <div class="fs-4 fw-bold text-success">${result.validBytes.toLocaleString()}</div>
                        <small class="text-muted">Valid Bytes</small>
                    </div>
                    <div class="col">
                        <div class="fs-4 fw-bold ${result.invalidBytes > 0 ? 'text-danger' : 'text-muted'}">${result.invalidBytes.toLocaleString()}</div>
                        <small class="text-muted">Invalid Bytes</small>
                    </div>
                    <div class="col">
                        <div class="fs-4 fw-bold">${result.stats.rows.toLocaleString()}</div>
                        <small class="text-muted">Lines</small>
                    </div>
                    <div class="col">
                        <div class="fs-4 fw-bold">${result.processingTime}ms</div>
                        <small class="text-muted">Scan Time</small>
                    </div>
                </div>
                ${result.truncated ? `
                    <div class="alert alert-warning mt-3 mb-0">
                        <i class="bi bi-exclamation-triangle"></i>
                        Results truncated - showing first ${result.issueCount.toLocaleString()} issues. File may contain more.
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

function renderEncodingInfo(result) {
    const encoding = result.encoding;
    const bomIcon = encoding.hasBOM ? 'bi-check-circle text-success' : 'bi-dash-circle text-muted';
    const bomText = encoding.hasBOM ? 'Present' : 'Not present';

    return `
        <div class="card mb-3">
            <div class="card-header">
                <i class="bi bi-info-circle"></i> Encoding Details
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        <table class="table table-sm mb-0">
                            <tr>
                                <td class="text-muted">Detected Encoding:</td>
                                <td class="fw-bold">${encoding.type}</td>
                            </tr>
                            <tr>
                                <td class="text-muted">BOM (Byte Order Mark):</td>
                                <td><i class="${bomIcon}"></i> ${bomText}</td>
                            </tr>
                            ${encoding.hasBOM ? `
                                <tr>
                                    <td class="text-muted">BOM Bytes:</td>
                                    <td>${encoding.bomBytes} bytes</td>
                                </tr>
                            ` : ''}
                        </table>
                    </div>
                    <div class="col-md-6">
                        <div class="alert alert-info mb-0">
                            <small>
                                <i class="bi bi-lightbulb"></i>
                                UTF-8 is the recommended encoding for text files. It supports all Unicode characters
                                and is widely compatible.
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderEncodingAnalysis(result) {
    if (!result.analysis || (result.analysis.commonIssues.length === 0 && result.analysis.recommendations.length === 0)) {
        return '';
    }

    let issuesHtml = '';
    if (result.analysis.commonIssues.length > 0) {
        issuesHtml = `
            <div class="mb-3">
                <strong>Detected Issues:</strong>
                <ul class="mb-0 mt-2">
                    ${result.analysis.commonIssues.map(issue => `
                        <li><span class="badge bg-warning text-dark">${issue.type}</span> ${issue.description}</li>
                    `).join('')}
                </ul>
            </div>
        `;
    }

    let recsHtml = '';
    if (result.analysis.recommendations.length > 0) {
        recsHtml = `
            <div>
                <strong>Recommendations:</strong>
                <ul class="mb-0 mt-2">
                    ${result.analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    return `
        <div class="card mb-3">
            <div class="card-header">
                <i class="bi bi-search"></i> Encoding Analysis
            </div>
            <div class="card-body">
                ${issuesHtml}
                ${recsHtml}
                ${result.analysis.possibleEncodings.length > 0 ? `
                    <div class="mt-3">
                        <strong>Possible Source Encodings:</strong>
                        ${result.analysis.possibleEncodings.map(enc => `<span class="badge bg-secondary ms-2">${enc}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

function renderFixActions(result, filePath) {
    return `
        <div class="card mb-3 border-warning">
            <div class="card-header bg-warning text-dark">
                <i class="bi bi-tools"></i> Fix Invalid Characters
            </div>
            <div class="card-body">
                <p>Choose how to handle the ${result.invalidBytes} invalid byte(s):</p>
                <div class="row g-3">
                    <div class="col-md-4">
                        <div class="card h-100">
                            <div class="card-body">
                                <h6><i class="bi bi-arrow-repeat"></i> Replace</h6>
                                <p class="small text-muted mb-2">Replace invalid bytes with the Unicode replacement character (U+FFFD)</p>
                                <button class="btn btn-primary btn-sm" id="fix-replace">
                                    <i class="bi bi-arrow-repeat"></i> Fix & Export
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card h-100">
                            <div class="card-body">
                                <h6><i class="bi bi-trash"></i> Remove</h6>
                                <p class="small text-muted mb-2">Remove invalid bytes entirely from the file</p>
                                <button class="btn btn-warning btn-sm" id="fix-remove">
                                    <i class="bi bi-trash"></i> Fix & Export
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card h-100">
                            <div class="card-body">
                                <h6><i class="bi bi-code"></i> Escape</h6>
                                <p class="small text-muted mb-2">Replace invalid bytes with hex escape sequences (\\xNN)</p>
                                <button class="btn btn-secondary btn-sm" id="fix-escape">
                                    <i class="bi bi-code"></i> Fix & Export
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderUTF8Issues(result) {
    if (result.valid || result.issues.length === 0) {
        if (result.valid) {
            return `
                <div class="card">
                    <div class="card-body text-center py-5">
                        <i class="bi bi-check-circle text-success fs-1"></i>
                        <h4 class="mt-3">File is valid UTF-8</h4>
                        <p class="text-muted">No encoding issues were found.</p>
                    </div>
                </div>
            `;
        }
        return '';
    }

    const issueLimit = 100;
    const displayIssues = result.issues.slice(0, issueLimit);
    const hasMore = result.issues.length > issueLimit;

    let tableRows = '';
    displayIssues.forEach((issue, idx) => {
        tableRows += `
            <tr>
                <td class="text-center">${idx + 1}</td>
                <td class="text-center">${issue.row}</td>
                <td class="text-center">${issue.col}</td>
                <td class="text-center"><code>${issue.invalidByteHex}</code></td>
                <td>${escapeUtf8Html(issue.description)}</td>
                <td class="utf8-context">
                    <code class="text-muted">${escapeUtf8Html(issue.context.before)}</code><code class="text-danger fw-bold">[?]</code><code class="text-muted">${escapeUtf8Html(issue.context.after)}</code>
                </td>
            </tr>
        `;
    });

    return `
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <span><i class="bi bi-exclamation-triangle"></i> Invalid Characters (${result.issues.length})</span>
                ${hasMore ? `<span class="badge bg-warning">Showing first ${issueLimit}</span>` : ''}
            </div>
            <div class="card-body p-0">
                <div class="utf8-issues-table">
                    <table class="table table-sm table-striped mb-0">
                        <thead class="table-dark sticky-top">
                            <tr>
                                <th class="text-center" style="width: 50px">#</th>
                                <th class="text-center" style="width: 70px">Row</th>
                                <th class="text-center" style="width: 70px">Col</th>
                                <th class="text-center" style="width: 80px">Byte</th>
                                <th style="width: 250px">Issue</th>
                                <th>Context</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function attachFixActionListeners(filePath) {
    const fixButtons = [
        { id: 'fix-replace', mode: 'replace' },
        { id: 'fix-remove', mode: 'remove' },
        { id: 'fix-escape', mode: 'escape' }
    ];

    fixButtons.forEach(({ id, mode }) => {
        document.getElementById(id)?.addEventListener('click', async () => {
            try {
                const btn = document.getElementById(id);
                const originalHtml = btn.innerHTML;
                btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Fixing...';
                btn.disabled = true;

                const result = await window.ipcRenderer.invoke('utf8:fix', { filePath, mode });

                if (result.canceled) {
                    btn.innerHTML = originalHtml;
                    btn.disabled = false;
                    return;
                }

                btn.innerHTML = '<i class="bi bi-check"></i> Saved!';
                btn.classList.remove('btn-primary', 'btn-warning', 'btn-secondary');
                btn.classList.add('btn-success');

                // Show success message
                showFixSuccess(result);

            } catch (error) {
                showUTF8Error('Failed to fix file: ' + error.message);
            }
        });
    });
}

function showFixSuccess(result) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-success alert-dismissible fade show mt-3';
    alert.innerHTML = `
        <i class="bi bi-check-circle"></i>
        <strong>File fixed and saved!</strong>
        Fixed ${result.fixedCount} invalid byte(s).
        Original: ${formatUTF8FileSize(result.originalSize)},
        New: ${formatUTF8FileSize(result.newSize)}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    const actionsCard = document.querySelector('.border-warning');
    if (actionsCard) {
        actionsCard.after(alert);
    }
}

function escapeUtf8Html(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function addUTF8Styles() {
    if (document.getElementById('utf8-checker-styles')) return;

    const style = document.createElement('style');
    style.id = 'utf8-checker-styles';
    style.textContent = `
        .utf8-issues-table {
            max-height: 500px;
            overflow-y: auto;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 12px;
        }

        .utf8-issues-table thead {
            position: sticky;
            top: 0;
            z-index: 1;
        }

        .utf8-context {
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 300px;
        }

        .utf8-context code {
            background: transparent;
        }
    `;

    document.head.appendChild(style);
}
