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
    `;

    // Standard Analysis
    const selectButton = document.getElementById('select-qti-file');
    selectButton.addEventListener('click', async () => {
        try {
            const result = await window.ipcRenderer.invoke('qti:selectFile');
            if (result.canceled) return;

            showQtiLoadingState();

            const analysis = await window.ipcRenderer.invoke('qti:analyze', result.filePath);
            displayQtiAnalysisResults(analysis);

        } catch (error) {
            showQtiError('Failed to analyze QTI file: ' + error.message);
        }
    });
}

function showQtiLoadingState() {
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

function showQtiError(message) {
    const resultsDiv = document.getElementById('qti-results');
    resultsDiv.innerHTML = `
        <div class="alert alert-danger" role="alert">
            <i class="bi bi-exclamation-triangle-fill"></i> ${message}
        </div>
    `;
}

function displayQtiAnalysisResults(analysis) {
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
        } else if (data.canvasSupported === 'new_quizzes_only') {
            supportBadge = '<span class="badge bg-info">New Quizzes Only</span>';
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
    const media = analysis.mediaAnalysis || { total: 0, resolved: 0, missing: 0, external: 0, unknown: 0, references: [] };

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

    const unresolvedRefs = (media.references || []).filter(ref => ref.status === 'missing' || ref.status === 'unknown');
    const unresolvedHtml = unresolvedRefs.length > 0 ? `
        <div class="alert alert-warning mt-3 mb-0">
            <h6 class="mb-2"><i class="bi bi-exclamation-triangle"></i> Unresolved Media References</h6>
            <ul class="mb-0">
                ${unresolvedRefs.map(ref => `<li><code>${ref.reference}</code> <span class="text-muted">(${ref.status})</span></li>`).join('')}
            </ul>
        </div>
    ` : '';

    const mediaSummaryHtml = media.total > 0 ? `
        <div class="row g-2 mb-3">
            <div class="col-md-2">
                <div class="border rounded p-2 text-center">
                    <div class="small text-muted">Refs</div>
                    <div class="fw-bold">${media.total}</div>
                </div>
            </div>
            <div class="col-md-2">
                <div class="border rounded p-2 text-center">
                    <div class="small text-muted">Resolved</div>
                    <div class="fw-bold text-success">${media.resolved}</div>
                </div>
            </div>
            <div class="col-md-2">
                <div class="border rounded p-2 text-center">
                    <div class="small text-muted">Missing</div>
                    <div class="fw-bold text-danger">${media.missing}</div>
                </div>
            </div>
            <div class="col-md-2">
                <div class="border rounded p-2 text-center">
                    <div class="small text-muted">External</div>
                    <div class="fw-bold text-warning">${media.external}</div>
                </div>
            </div>
            <div class="col-md-2">
                <div class="border rounded p-2 text-center">
                    <div class="small text-muted">Unknown</div>
                    <div class="fw-bold text-secondary">${media.unknown}</div>
                </div>
            </div>
        </div>
        ${unresolvedHtml}
    ` : '<p class="text-muted mb-3">No explicit media references detected.</p>';

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
                    <h6 class="mb-2">Media Reference Resolution</h6>
                    ${mediaSummaryHtml}

                    <h6 class="mt-4">Content Feature Flags</h6>
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
