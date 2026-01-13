/**
 * QTI Analyzer Renderer
 * Handles UI interactions for QTI file analysis
 */

// Template function called by the main router
function qtiAnalyzerTemplate(e) {
    // Hide other endpoint forms
    if (typeof hideEndpoints === 'function') {
        hideEndpoints(e);
    }

    // Show QTI analyzer content area
    showQTIAnalyzerUI();
}

function showQTIAnalyzerUI() {
    const endpointContent = document.getElementById('endpoint-content');
    if (!endpointContent) return;

    let qtiContainer = document.getElementById('qti-analyzer-container');
    if (!qtiContainer) {
        qtiContainer = document.createElement('div');
        qtiContainer.id = 'qti-analyzer-container';
        qtiContainer.className = 'p-4';
        endpointContent.appendChild(qtiContainer);
    }

    qtiContainer.hidden = false;
    qtiContainer.innerHTML = `
        <div class="qti-analyzer-ui">
            <h3 class="mb-4">
                <i class="bi bi-file-earmark-code"></i> QTI Assessment Analyzer
            </h3>

            <!-- Tabs -->
            <ul class="nav nav-tabs mb-4" id="qtiTabs" role="tablist">
                <li class="nav-item" role="presentation">
                    <button class="nav-link active" id="standard-qti-tab" data-bs-toggle="tab" data-bs-target="#standard-qti-pane" type="button" role="tab" aria-controls="standard-qti-pane" aria-selected="true">Standard Analyzer</button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="ai-qti-tab" data-bs-toggle="tab" data-bs-target="#ai-qti-pane" type="button" role="tab" aria-controls="ai-qti-pane" aria-selected="false">AI Advisor</button>
                </li>
            </ul>

            <div class="tab-content" id="qtiTabsContent">
                <!-- Standard Analyzer Pane -->
                <div class="tab-pane fade show active" id="standard-qti-pane" role="tabpanel" aria-labelledby="standard-qti-tab" tabindex="0">
                    <div class="card mb-4">
                        <div class="card-body">
                            <h5 class="card-title">QTI File Analysis</h5>
                            <p class="card-text text-muted">
                                Analyze QTI assessment files (XML or ZIP packages) for Canvas compatibility,
                                validation errors, and content issues. Supports QTI 1.2 and 2.1 formats.
                            </p>
                            <button id="select-qti-file" class="btn btn-primary">
                                <i class="bi bi-upload"></i> Select QTI File
                            </button>
                            <div class="mt-2 text-muted small">
                                <i class="bi bi-info-circle"></i> Supported formats: .xml (individual files) or .zip (QTI packages)
                            </div>
                        </div>
                    </div>
                    <div id="qti-results"></div>
                </div>

                <!-- AI Analyzer Pane -->
                <div class="tab-pane fade" id="ai-qti-pane" role="tabpanel" aria-labelledby="ai-qti-tab" tabindex="0">
                    <div class="card mb-4">
                        <div class="card-body">
                            <h5 class="card-title">AI-Powered QTI Analysis</h5>
                            <p class="card-text text-muted">
                                Get intelligent insights about your QTI content, including Canvas migration
                                recommendations and question quality analysis.
                            </p>

                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label for="ai-model-select-qti" class="form-label">Select AI Model</label>
                                    <select class="form-select" id="ai-model-select-qti">
                                        <option value="gpt-5.2">GPT-5.2</option>
                                        <option value="claude-sonnet-4.5">Claude Sonnet 4.5</option>
                                    </select>
                                </div>
                            </div>

                            <div class="mb-3">
                                <label for="ai-prompt-qti" class="form-label">Custom Instructions (Optional)</label>
                                <textarea class="form-control" id="ai-prompt-qti" rows="3"
                                    placeholder="E.g., 'Focus on Canvas import issues' or 'Suggest question improvements'..."></textarea>
                            </div>

                            <div id="api-key-section-qti" class="mb-3 d-none">
                                <label for="api-key-input-qti" class="form-label text-danger">API Key Required</label>
                                <div class="input-group">
                                    <input type="text" class="form-control" id="api-key-input-qti" placeholder="Enter API Key">
                                    <button class="btn btn-outline-secondary" type="button" id="save-api-key-qti">Save Key</button>
                                </div>
                                <div class="form-text">Your API key will be stored securely locally.</div>
                            </div>

                            <div id="api-key-display-section-qti" class="mb-3 d-none">
                                <label class="form-label text-success">API Key Stored</label>
                                <div class="input-group">
                                    <input type="text" class="form-control" id="masked-api-key-qti" disabled readonly value="">
                                    <button class="btn btn-outline-danger" type="button" id="delete-api-key-qti">Remove</button>
                                </div>
                                <div class="form-text">Key is saved. Remove to update.</div>
                            </div>

                            <div id="ai-status-msg-qti" class="mb-3"></div>

                            <button id="select-qti-file-ai" class="btn btn-primary" disabled>
                                <i class="bi bi-robot"></i> Select & Analyze with AI
                            </button>
                        </div>
                    </div>
                    <div id="qti-ai-results"></div>
                </div>
            </div>
        </div>
    `;

    // --- Event Listeners ---

    // 1. Standard Analysis
    const selectButton = document.getElementById('select-qti-file');
    selectButton.addEventListener('click', async () => {
        try {
            const result = await window.ipcRenderer.invoke('qti:selectFile');
            if (result.canceled) return;

            showLoadingState();

            const analysis = await window.ipcRenderer.invoke('qti:analyze', result.filePath);
            displayAnalysisResults(analysis);

        } catch (error) {
            showError('Failed to analyze QTI file: ' + error.message);
        }
    });

    // 2. AI Model Selection & Key Management
    const modelSelect = document.getElementById('ai-model-select-qti');
    const apiKeySection = document.getElementById('api-key-section-qti');
    const apiKeyInput = document.getElementById('api-key-input-qti');
    const saveKeyBtn = document.getElementById('save-api-key-qti');
    const apiKeyDisplaySection = document.getElementById('api-key-display-section-qti');
    const maskedApiKeyInput = document.getElementById('masked-api-key-qti');
    const deleteKeyBtn = document.getElementById('delete-api-key-qti');
    const analyzeBtn = document.getElementById('select-qti-file-ai');
    const statusMsg = document.getElementById('ai-status-msg-qti');

    async function checkKeyStatus() {
        const model = modelSelect.value;
        const provider = model.includes('gpt') ? 'openai' : 'anthropic';

        try {
            const hasKey = await window.ipcRenderer.invoke('settings:hasApiKey', provider);

            if (hasKey) {
                try {
                    const maskedKey = await window.ipcRenderer.invoke('settings:getMaskedApiKey', provider);
                    maskedApiKeyInput.value = maskedKey || '****';
                } catch (e) {
                    console.error('Failed to get masked key', e);
                    maskedApiKeyInput.value = '**** (Error retrieving)';
                }

                apiKeySection.classList.add('d-none');
                apiKeyDisplaySection.classList.remove('d-none');
                analyzeBtn.disabled = false;
                statusMsg.innerHTML = '<span class="text-success"><i class="bi bi-check-circle"></i> API Key found. Ready to analyze.</span>';
            } else {
                apiKeySection.classList.remove('d-none');
                apiKeyDisplaySection.classList.add('d-none');
                analyzeBtn.disabled = true;
                statusMsg.innerHTML = '<span class="text-warning"><i class="bi bi-exclamation-triangle"></i> API Key missing. Please enter it above.</span>';
            }
        } catch (err) {
            console.error('Error checking API key:', err);
        }
    }

    modelSelect.addEventListener('change', checkKeyStatus);

    const aiTab = document.getElementById('ai-qti-tab');
    aiTab.addEventListener('shown.bs.tab', checkKeyStatus);

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
            const result = await window.ipcRenderer.invoke('qti:selectFile');
            if (result.canceled) return;

            const model = modelSelect.value;
            const prompt = document.getElementById('ai-prompt-qti').value;

            showAiLoadingState();

            const analysis = await window.ipcRenderer.invoke('qti:analyzeAi', {
                filePath: result.filePath,
                model: model,
                prompt: prompt
            });

            displayAiResults(analysis);

        } catch (error) {
            showAiError('Failed to run AI analysis: ' + error.message);
        }
    });
}

function showLoadingState() {
    const resultsDiv = document.getElementById('qti-results');
    resultsDiv.innerHTML = `
        <div class="text-center p-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3">Analyzing QTI file...</p>
            <small class="text-muted">This may take a moment for large assessments</small>
        </div>
    `;
}

function showAiLoadingState() {
    const resultsDiv = document.getElementById('qti-ai-results');
    resultsDiv.innerHTML = `
        <div class="text-center p-5">
            <div class="spinner-border text-success" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3">Consulting AI Model...</p>
        </div>
    `;
}

function displayAiResults(analysis) {
    const resultsDiv = document.getElementById('qti-ai-results');
    const content = typeof analysis === 'string' ? analysis : (analysis.content || JSON.stringify(analysis, null, 2));

    resultsDiv.innerHTML = `
        <div class="card">
            <div class="card-header bg-success text-white">
                <i class="bi bi-robot"></i> AI Analysis Result
            </div>
            <div class="card-body">
                <div class="ai-response-content" style="white-space: pre-wrap;">${content}</div>
            </div>
        </div>
    `;
}

function showAiError(message) {
    const resultsDiv = document.getElementById('qti-ai-results');
    resultsDiv.innerHTML = `
        <div class="alert alert-danger" role="alert">
            <i class="bi bi-exclamation-triangle-fill"></i> ${message}
        </div>
    `;
}

function showError(message) {
    const resultsDiv = document.getElementById('qti-results');
    resultsDiv.innerHTML = `
        <div class="alert alert-danger" role="alert">
            <i class="bi bi-exclamation-triangle-fill"></i> ${message}
        </div>
    `;
}

function displayAnalysisResults(analysis) {
    const resultsDiv = document.getElementById('qti-results');

    const html = `
        <div class="qti-analysis-results">
            ${renderCompatibilityOverview(analysis)}
            ${renderMetadata(analysis)}
            ${renderValidation(analysis)}
            ${renderQuestionSummary(analysis)}
            ${renderInteractionTypes(analysis)}
            ${renderScoringAnalysis(analysis)}
            ${renderContentAnalysis(analysis)}
            ${renderCanvasChecklist(analysis)}
        </div>
    `;

    resultsDiv.innerHTML = html;
}

function renderCompatibilityOverview(analysis) {
    const compat = analysis.canvasCompatibility;
    const score = compat.score;

    let badgeClass = 'success';
    let icon = 'check-circle-fill';
    let message = 'Excellent Canvas compatibility';

    if (score < 50) {
        badgeClass = 'danger';
        icon = 'x-circle-fill';
        message = 'Significant compatibility issues detected';
    } else if (score < 80) {
        badgeClass = 'warning';
        icon = 'exclamation-triangle-fill';
        message = 'Some compatibility concerns';
    }

    const issuesHtml = compat.issues.length > 0 ? `
        <div class="mt-3">
            <h6 class="text-danger"><i class="bi bi-x-circle"></i> Issues (${compat.issues.length})</h6>
            <ul class="list-group list-group-flush">
                ${compat.issues.map(issue => `
                    <li class="list-group-item">
                        <span class="badge bg-${issue.severity === 'high' ? 'danger' : 'warning'} me-2">${issue.severity}</span>
                        <strong>${issue.message}</strong>
                        <div class="text-muted small">${issue.impact}</div>
                    </li>
                `).join('')}
            </ul>
        </div>
    ` : '';

    const warningsHtml = compat.warnings.length > 0 ? `
        <div class="mt-3">
            <h6 class="text-warning"><i class="bi bi-exclamation-triangle"></i> Warnings (${compat.warnings.length})</h6>
            <ul class="list-group list-group-flush">
                ${compat.warnings.map(warning => `
                    <li class="list-group-item">
                        <span class="badge bg-warning me-2">${warning.severity}</span>
                        <strong>${warning.message}</strong>
                        <div class="text-muted small">${warning.impact || ''}</div>
                    </li>
                `).join('')}
            </ul>
        </div>
    ` : '';

    const recommendationsHtml = compat.recommendations.length > 0 ? `
        <div class="mt-3">
            <h6><i class="bi bi-lightbulb"></i> Recommendations</h6>
            <ul>
                ${compat.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
    ` : '';

    return `
        <div class="card border-${badgeClass} mb-3">
            <div class="card-header bg-${badgeClass} text-white">
                <h5 class="mb-0">
                    <i class="bi bi-${icon}"></i> Canvas Compatibility Score: ${score}/100
                </h5>
            </div>
            <div class="card-body">
                <div class="progress mb-3" style="height: 30px;">
                    <div class="progress-bar bg-${badgeClass}" role="progressbar"
                         style="width: ${score}%" aria-valuenow="${score}"
                         aria-valuemin="0" aria-valuemax="100">
                        ${score}%
                    </div>
                </div>
                <p class="lead mb-0">${message}</p>
                ${issuesHtml}
                ${warningsHtml}
                ${recommendationsHtml}
            </div>
        </div>
    `;
}

function renderMetadata(analysis) {
    const meta = analysis.metadata;

    return `
        <div class="card mb-3">
            <div class="card-header bg-primary text-white" role="button" data-bs-toggle="collapse" data-bs-target="#metadata-collapse">
                <h5 class="mb-0">
                    <i class="bi bi-info-circle"></i> Metadata
                    <i class="bi bi-chevron-down float-end"></i>
                </h5>
            </div>
            <div id="metadata-collapse" class="collapse show">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <table class="table table-sm">
                                <tr>
                                    <th width="40%">QTI Version:</th>
                                    <td><span class="badge bg-info">${meta.version}</span></td>
                                </tr>
                                <tr>
                                    <th>Title:</th>
                                    <td>${meta.title || '<span class="text-muted">Not specified</span>'}</td>
                                </tr>
                                <tr>
                                    <th>Identifier:</th>
                                    <td><code>${meta.identifier || 'N/A'}</code></td>
                                </tr>
                            </table>
                        </div>
                        <div class="col-md-6">
                            <table class="table table-sm">
                                <tr>
                                    <th width="40%">Question Count:</th>
                                    <td><strong>${meta.questionCount}</strong></td>
                                </tr>
                                <tr>
                                    <th>Author:</th>
                                    <td>${meta.author || '<span class="text-muted">Not specified</span>'}</td>
                                </tr>
                                <tr>
                                    <th>Creation Date:</th>
                                    <td>${meta.creationDate || '<span class="text-muted">Not specified</span>'}</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderValidation(analysis) {
    const val = analysis.validation;
    const statusClass = val.valid ? 'success' : 'danger';
    const statusIcon = val.valid ? 'check-circle-fill' : 'x-circle-fill';
    const statusText = val.valid ? 'Valid' : 'Invalid';

    const errorsHtml = val.errors.length > 0 ? `
        <div class="alert alert-danger">
            <h6><i class="bi bi-x-circle"></i> Validation Errors</h6>
            <ul class="mb-0">
                ${val.errors.map(err => `<li><strong>${err.element}:</strong> ${err.message}</li>`).join('')}
            </ul>
        </div>
    ` : '<p class="text-success"><i class="bi bi-check-circle"></i> No validation errors found.</p>';

    return `
        <div class="card mb-3">
            <div class="card-header" role="button" data-bs-toggle="collapse" data-bs-target="#validation-collapse">
                <h5 class="mb-0">
                    <i class="bi bi-shield-check"></i> Validation Results
                    <i class="bi bi-chevron-down float-end"></i>
                </h5>
            </div>
            <div id="validation-collapse" class="collapse">
                <div class="card-body">
                    <div class="mb-3">
                        <span class="badge bg-${statusClass} fs-6">
                            <i class="bi bi-${statusIcon}"></i> ${statusText}
                        </span>
                        <span class="ms-3 text-muted">Well-formed: ${val.wellFormed ? 'Yes' : 'No'}</span>
                    </div>
                    ${errorsHtml}
                </div>
            </div>
        </div>
    `;
}

function renderQuestionSummary(analysis) {
    const summary = analysis.questionSummary;

    const typeRows = Object.entries(summary.byType).map(([type, count]) => `
        <tr>
            <td>${type}</td>
            <td><strong>${count}</strong></td>
            <td>
                <div class="progress" style="height: 20px;">
                    <div class="progress-bar bg-info" style="width: ${(count / summary.total * 100)}%">
                        ${((count / summary.total) * 100).toFixed(1)}%
                    </div>
                </div>
            </td>
        </tr>
    `).join('');

    return `
        <div class="card mb-3">
            <div class="card-header" role="button" data-bs-toggle="collapse" data-bs-target="#questions-collapse">
                <h5 class="mb-0">
                    <i class="bi bi-question-circle"></i> Question Summary
                    <i class="bi bi-chevron-down float-end"></i>
                </h5>
            </div>
            <div id="questions-collapse" class="collapse">
                <div class="card-body">
                    <div class="row mb-3">
                        <div class="col-md-3 text-center">
                            <div class="display-4 text-primary">${summary.total}</div>
                            <div class="text-muted">Total Questions</div>
                        </div>
                        <div class="col-md-3 text-center">
                            <div class="display-4 text-success">${summary.withFeedback}</div>
                            <div class="text-muted">With Feedback</div>
                        </div>
                        <div class="col-md-3 text-center">
                            <div class="display-4 text-info">${summary.withMedia}</div>
                            <div class="text-muted">With Media</div>
                        </div>
                        <div class="col-md-3 text-center">
                            <div class="display-4 text-warning">${Object.keys(summary.byType).length}</div>
                            <div class="text-muted">Question Types</div>
                        </div>
                    </div>

                    <h6 class="mt-4">Questions by Type</h6>
                    <table class="table table-sm table-hover">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th width="100">Count</th>
                                <th>Distribution</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${typeRows || '<tr><td colspan="3" class="text-center text-muted">No questions found</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function renderInteractionTypes(analysis) {
    const interactions = analysis.interactionTypes;

    const typeRows = Object.entries(interactions.types).map(([type, data]) => {
        let supportBadge = '';
        if (data.canvasSupported === 'full') {
            supportBadge = '<span class="badge bg-success">Fully Supported</span>';
        } else if (data.canvasSupported === 'limited') {
            supportBadge = '<span class="badge bg-warning">Limited Support</span>';
        } else {
            supportBadge = '<span class="badge bg-danger">Not Supported</span>';
        }

        return `
            <tr>
                <td>${type}</td>
                <td><strong>${data.count}</strong></td>
                <td>${supportBadge}</td>
            </tr>
        `;
    }).join('');

    return `
        <div class="card mb-3">
            <div class="card-header" role="button" data-bs-toggle="collapse" data-bs-target="#interactions-collapse">
                <h5 class="mb-0">
                    <i class="bi bi-cursor"></i> Interaction Types
                    <i class="bi bi-chevron-down float-end"></i>
                </h5>
            </div>
            <div id="interactions-collapse" class="collapse">
                <div class="card-body">
                    <table class="table table-sm table-hover">
                        <thead>
                            <tr>
                                <th>Interaction Type</th>
                                <th width="100">Count</th>
                                <th width="200">Canvas Support</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${typeRows || '<tr><td colspan="3" class="text-center text-muted">No interactions found</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function renderScoringAnalysis(analysis) {
    const scoring = analysis.scoringAnalysis;

    const distRows = Object.entries(scoring.pointDistribution).map(([points, count]) => `
        <tr>
            <td>${points} point${points == 1 ? '' : 's'}</td>
            <td><strong>${count}</strong> question${count == 1 ? '' : 's'}</td>
        </tr>
    `).join('');

    return `
        <div class="card mb-3">
            <div class="card-header" role="button" data-bs-toggle="collapse" data-bs-target="#scoring-collapse">
                <h5 class="mb-0">
                    <i class="bi bi-bar-chart"></i> Scoring Analysis
                    <i class="bi bi-chevron-down float-end"></i>
                </h5>
            </div>
            <div id="scoring-collapse" class="collapse">
                <div class="card-body">
                    <div class="row mb-3">
                        <div class="col-md-3 text-center">
                            <div class="display-6 text-primary">${scoring.totalPoints}</div>
                            <div class="text-muted">Total Points</div>
                        </div>
                        <div class="col-md-3 text-center">
                            <div class="display-6 text-info">${scoring.averagePoints.toFixed(1)}</div>
                            <div class="text-muted">Average Points</div>
                        </div>
                        <div class="col-md-3 text-center">
                            <div class="display-6 text-success">${scoring.minPoints}</div>
                            <div class="text-muted">Minimum</div>
                        </div>
                        <div class="col-md-3 text-center">
                            <div class="display-6 text-danger">${scoring.maxPoints}</div>
                            <div class="text-muted">Maximum</div>
                        </div>
                    </div>

                    <h6 class="mt-4">Point Distribution</h6>
                    <table class="table table-sm">
                        <tbody>
                            ${distRows}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function renderContentAnalysis(analysis) {
    const content = analysis.contentAnalysis;

    const features = [
        { key: 'hasImages', label: 'Images', icon: 'image' },
        { key: 'hasAudio', label: 'Audio', icon: 'music-note' },
        { key: 'hasVideo', label: 'Video', icon: 'camera-video' },
        { key: 'hasMath', label: 'Mathematical Content', icon: 'calculator' },
        { key: 'hasTables', label: 'Tables', icon: 'table' },
        { key: 'hasFormattedText', label: 'Formatted Text/HTML', icon: 'file-richtext' },
        { key: 'hasExternalLinks', label: 'External References', icon: 'link-45deg' }
    ];

    const featuresList = features.map(feature => {
        const hasFeature = content[feature.key];
        const badgeClass = hasFeature ? 'success' : 'secondary';
        const iconClass = hasFeature ? 'check-circle-fill' : 'dash-circle';

        return `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <span><i class="bi bi-${feature.icon}"></i> ${feature.label}</span>
                <span class="badge bg-${badgeClass}">
                    <i class="bi bi-${iconClass}"></i> ${hasFeature ? 'Yes' : 'No'}
                </span>
            </li>
        `;
    }).join('');

    return `
        <div class="card mb-3">
            <div class="card-header" role="button" data-bs-toggle="collapse" data-bs-target="#content-collapse">
                <h5 class="mb-0">
                    <i class="bi bi-file-text"></i> Content Analysis
                    <i class="bi bi-chevron-down float-end"></i>
                </h5>
            </div>
            <div id="content-collapse" class="collapse">
                <div class="card-body">
                    <ul class="list-group list-group-flush">
                        ${featuresList}
                    </ul>
                </div>
            </div>
        </div>
    `;
}

function renderCanvasChecklist(analysis) {
    const compat = analysis.canvasCompatibility;
    const meta = analysis.metadata;

    const checks = [
        {
            label: 'QTI version is 2.1 (preferred)',
            passed: analysis.version === '2.1',
            importance: 'medium'
        },
        {
            label: 'No unsupported interaction types',
            passed: !compat.issues.some(i => i.type === 'unsupported_interaction'),
            importance: 'high'
        },
        {
            label: 'Questions have identifiers',
            passed: meta.identifier !== null,
            importance: 'high'
        },
        {
            label: 'No external media references',
            passed: !compat.warnings.some(w => w.type === 'external_references'),
            importance: 'medium'
        },
        {
            label: 'Overall compatibility score > 80',
            passed: compat.score >= 80,
            importance: 'high'
        }
    ];

    const checkItems = checks.map(check => {
        const icon = check.passed ? 'check-circle-fill text-success' : 'x-circle-fill text-danger';
        const importanceClass = check.importance === 'high' ? 'danger' : 'warning';

        return `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <span>
                    <i class="bi bi-${icon}"></i> ${check.label}
                </span>
                ${!check.passed ? `<span class="badge bg-${importanceClass}">${check.importance}</span>` : ''}
            </li>
        `;
    }).join('');

    return `
        <div class="card mb-3">
            <div class="card-header" role="button" data-bs-toggle="collapse" data-bs-target="#checklist-collapse">
                <h5 class="mb-0">
                    <i class="bi bi-clipboard-check"></i> Canvas Import Checklist
                    <i class="bi bi-chevron-down float-end"></i>
                </h5>
            </div>
            <div id="checklist-collapse" class="collapse">
                <div class="card-body">
                    <ul class="list-group list-group-flush">
                        ${checkItems}
                    </ul>
                </div>
            </div>
        </div>
    `;
}
