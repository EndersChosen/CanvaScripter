/**
 * Diff Checker Renderer
 * UI for comparing two files or text inputs
 */

// eslint-disable-next-line no-unused-vars
function diffCheckerTemplate(e) {
    if (typeof hideEndpoints === 'function') {
        hideEndpoints(e);
    }
    showDiffCheckerUI();
}

function showDiffCheckerUI() {
    const endpointContent = document.getElementById('endpoint-content');
    if (!endpointContent) {
        console.error('endpoint-content not found');
        return;
    }

    let diffContainer = document.getElementById('diff-checker-container');
    if (!diffContainer) {
        diffContainer = document.createElement('div');
        diffContainer.id = 'diff-checker-container';
        diffContainer.className = 'p-4';
        endpointContent.appendChild(diffContainer);
    }

    diffContainer.hidden = false;
    diffContainer.innerHTML = `
        <div class="container-fluid py-4">
            <div class="row mb-4">
                <div class="col">
                    <h2><i class="bi bi-file-diff"></i> Diff Checker</h2>
                    <p class="text-muted">Compare two files or text inputs to find differences. Supports large files with millions of lines.</p>
                </div>
            </div>

            <!-- Input Mode Tabs -->
            <ul class="nav nav-tabs mb-3" id="diffInputTabs" role="tablist">
                <li class="nav-item" role="presentation">
                    <button class="nav-link active" id="file-tab" data-bs-toggle="tab" data-bs-target="#file-input"
                        type="button" role="tab" aria-controls="file-input" aria-selected="true">
                        <i class="bi bi-file-earmark"></i> Compare Files
                    </button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="text-tab" data-bs-toggle="tab" data-bs-target="#text-input"
                        type="button" role="tab" aria-controls="text-input" aria-selected="false">
                        <i class="bi bi-textarea-t"></i> Compare Text
                    </button>
                </li>
            </ul>

            <div class="tab-content" id="diffInputTabContent">
                <!-- File Input Tab -->
                <div class="tab-pane fade show active" id="file-input" role="tabpanel" aria-labelledby="file-tab">
                    <div class="row g-3 mb-3">
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-header">
                                    <i class="bi bi-file-earmark-text"></i> Original File (Left)
                                </div>
                                <div class="card-body">
                                    <div class="d-grid">
                                        <button class="btn btn-outline-primary" id="select-file-1">
                                            <i class="bi bi-folder2-open"></i> Select File
                                        </button>
                                    </div>
                                    <div id="file-1-info" class="mt-2 text-muted small d-none">
                                        <i class="bi bi-file-earmark"></i> <span id="file-1-name"></span>
                                        <br><span id="file-1-size"></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-header">
                                    <i class="bi bi-file-earmark-text"></i> Modified File (Right)
                                </div>
                                <div class="card-body">
                                    <div class="d-grid">
                                        <button class="btn btn-outline-primary" id="select-file-2">
                                            <i class="bi bi-folder2-open"></i> Select File
                                        </button>
                                    </div>
                                    <div id="file-2-info" class="mt-2 text-muted small d-none">
                                        <i class="bi bi-file-earmark"></i> <span id="file-2-name"></span>
                                        <br><span id="file-2-size"></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="d-grid">
                        <button class="btn btn-primary btn-lg" id="compare-files-btn" disabled>
                            <i class="bi bi-arrow-left-right"></i> Compare Files
                        </button>
                    </div>
                </div>

                <!-- Text Input Tab -->
                <div class="tab-pane fade" id="text-input" role="tabpanel" aria-labelledby="text-tab">
                    <div class="row g-3 mb-3">
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-header d-flex justify-content-between align-items-center">
                                    <span><i class="bi bi-textarea-t"></i> Original Text (Left)</span>
                                    <button class="btn btn-sm btn-outline-secondary" id="clear-text-1" title="Clear">
                                        <i class="bi bi-x-lg"></i>
                                    </button>
                                </div>
                                <div class="card-body p-0">
                                    <textarea class="form-control border-0" id="text-input-1" rows="15"
                                        placeholder="Paste or type original text here..."
                                        style="resize: none; font-family: monospace; font-size: 12px;"></textarea>
                                </div>
                                <div class="card-footer text-muted small">
                                    <span id="text-1-stats">0 lines, 0 characters</span>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-header d-flex justify-content-between align-items-center">
                                    <span><i class="bi bi-textarea-t"></i> Modified Text (Right)</span>
                                    <button class="btn btn-sm btn-outline-secondary" id="clear-text-2" title="Clear">
                                        <i class="bi bi-x-lg"></i>
                                    </button>
                                </div>
                                <div class="card-body p-0">
                                    <textarea class="form-control border-0" id="text-input-2" rows="15"
                                        placeholder="Paste or type modified text here..."
                                        style="resize: none; font-family: monospace; font-size: 12px;"></textarea>
                                </div>
                                <div class="card-footer text-muted small">
                                    <span id="text-2-stats">0 lines, 0 characters</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="d-grid">
                        <button class="btn btn-primary btn-lg" id="compare-text-btn">
                            <i class="bi bi-arrow-left-right"></i> Compare Text
                        </button>
                    </div>
                </div>
            </div>

            <!-- Options -->
            <div class="card mt-3 mb-3">
                <div class="card-header">
                    <a class="text-decoration-none" data-bs-toggle="collapse" href="#diffOptions" role="button" aria-expanded="false">
                        <i class="bi bi-gear"></i> Options
                    </a>
                </div>
                <div class="collapse" id="diffOptions">
                    <div class="card-body">
                        <div class="row g-3">
                            <div class="col-md-4">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="ignore-whitespace">
                                    <label class="form-check-label" for="ignore-whitespace">
                                        Ignore whitespace differences
                                    </label>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="ignore-case">
                                    <label class="form-check-label" for="ignore-case">
                                        Ignore case differences
                                    </label>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <label for="context-lines" class="form-label">Context lines: <span id="context-lines-value">3</span></label>
                                <input type="range" class="form-range" id="context-lines" min="0" max="10" value="3">
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Results Area -->
            <div id="diff-results"></div>
        </div>
    `;

    attachDiffEventListeners();
}

function attachDiffEventListeners() {
    let file1Path = null;
    let file2Path = null;

    // File selection buttons
    const selectFile1Btn = document.getElementById('select-file-1');
    const selectFile2Btn = document.getElementById('select-file-2');
    const compareFilesBtn = document.getElementById('compare-files-btn');
    const compareTextBtn = document.getElementById('compare-text-btn');

    // Text inputs
    const textInput1 = document.getElementById('text-input-1');
    const textInput2 = document.getElementById('text-input-2');

    // Update compare button state
    function updateFileCompareState() {
        compareFilesBtn.disabled = !(file1Path && file2Path);
    }

    // File 1 selection
    selectFile1Btn.addEventListener('click', async () => {
        try {
            const result = await window.ipcRenderer.invoke('diff:selectFile');
            if (result.canceled) return;

            file1Path = result.filePath;
            document.getElementById('file-1-name').textContent = result.fileName;
            document.getElementById('file-1-size').textContent = formatFileSize(result.fileSize);
            document.getElementById('file-1-info').classList.remove('d-none');
            selectFile1Btn.innerHTML = '<i class="bi bi-check-circle text-success"></i> File Selected';
            updateFileCompareState();
        } catch (error) {
            showDiffError('Failed to select file: ' + error.message);
        }
    });

    // File 2 selection
    selectFile2Btn.addEventListener('click', async () => {
        try {
            const result = await window.ipcRenderer.invoke('diff:selectFile');
            if (result.canceled) return;

            file2Path = result.filePath;
            document.getElementById('file-2-name').textContent = result.fileName;
            document.getElementById('file-2-size').textContent = formatFileSize(result.fileSize);
            document.getElementById('file-2-info').classList.remove('d-none');
            selectFile2Btn.innerHTML = '<i class="bi bi-check-circle text-success"></i> File Selected';
            updateFileCompareState();
        } catch (error) {
            showDiffError('Failed to select file: ' + error.message);
        }
    });

    // Compare files
    compareFilesBtn.addEventListener('click', async () => {
        if (!file1Path || !file2Path) return;

        try {
            showDiffLoadingState();

            const options = getDiffOptions();
            const result = await window.ipcRenderer.invoke('diff:compareFiles', {
                file1Path,
                file2Path,
                options
            });

            displayDiffResults(result);
        } catch (error) {
            showDiffError('Failed to compare files: ' + error.message);
        }
    });

    // Compare text
    compareTextBtn.addEventListener('click', async () => {
        const text1 = textInput1.value;
        const text2 = textInput2.value;

        if (!text1 && !text2) {
            showDiffError('Please enter text in both fields');
            return;
        }

        try {
            showDiffLoadingState();

            const options = getDiffOptions();
            const result = await window.ipcRenderer.invoke('diff:compareText', {
                text1,
                text2,
                options
            });

            displayDiffResults(result);
        } catch (error) {
            showDiffError('Failed to compare text: ' + error.message);
        }
    });

    // Text stats update
    textInput1.addEventListener('input', () => updateTextStats(textInput1, 'text-1-stats'));
    textInput2.addEventListener('input', () => updateTextStats(textInput2, 'text-2-stats'));

    // Clear buttons
    document.getElementById('clear-text-1').addEventListener('click', () => {
        textInput1.value = '';
        updateTextStats(textInput1, 'text-1-stats');
    });

    document.getElementById('clear-text-2').addEventListener('click', () => {
        textInput2.value = '';
        updateTextStats(textInput2, 'text-2-stats');
    });

    // Context lines slider
    const contextLinesInput = document.getElementById('context-lines');
    contextLinesInput.addEventListener('input', () => {
        document.getElementById('context-lines-value').textContent = contextLinesInput.value;
    });
}

function getDiffOptions() {
    return {
        ignoreWhitespace: document.getElementById('ignore-whitespace').checked,
        ignoreCase: document.getElementById('ignore-case').checked,
        contextLines: parseInt(document.getElementById('context-lines').value, 10)
    };
}

function updateTextStats(textarea, statsId) {
    const text = textarea.value;
    const lines = text ? text.split('\n').length : 0;
    const chars = text.length;
    document.getElementById(statsId).textContent = `${lines.toLocaleString()} lines, ${chars.toLocaleString()} characters`;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showDiffLoadingState() {
    const resultsDiv = document.getElementById('diff-results');
    resultsDiv.innerHTML = `
        <div class="text-center p-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3">Comparing files...</p>
            <small class="text-muted">This may take a moment for large files</small>
        </div>
    `;
}

function showDiffError(message) {
    const resultsDiv = document.getElementById('diff-results');
    resultsDiv.innerHTML = `
        <div class="alert alert-danger" role="alert">
            <i class="bi bi-exclamation-triangle-fill"></i> ${message}
        </div>
    `;
}

function displayDiffResults(result) {
    const resultsDiv = document.getElementById('diff-results');

    if (!result.success) {
        showDiffError(result.error || 'Unknown error occurred');
        return;
    }

    const statsHtml = renderDiffStats(result);
    const hunksHtml = renderDiffHunks(result.hunks, result.identical);
    const actionsHtml = renderDiffActions(result);

    resultsDiv.innerHTML = `
        <div class="diff-results">
            ${statsHtml}
            ${actionsHtml}
            ${hunksHtml}
        </div>
    `;

    // Attach action button listeners
    attachDiffActionListeners(result);
}

function renderDiffStats(result) {
    const { stats, summary, processingTime, totalLines, file1, file2 } = result;

    const badgeClass = result.identical ? 'bg-success' :
        stats.similarityPercent >= 80 ? 'bg-info' :
            stats.similarityPercent >= 50 ? 'bg-warning' : 'bg-danger';

    return `
        <div class="card mb-3">
            <div class="card-header d-flex justify-content-between align-items-center">
                <span><i class="bi bi-bar-chart"></i> Comparison Results</span>
                <span class="badge ${badgeClass}">${stats.similarityPercent}% Similar</span>
            </div>
            <div class="card-body">
                <div class="row g-3">
                    <div class="col-md-4">
                        <div class="d-flex align-items-center">
                            <div class="me-3">
                                <i class="bi bi-file-earmark-text fs-2 text-muted"></i>
                            </div>
                            <div>
                                <div class="fw-bold">${escapeHtml(file1.name)}</div>
                                <small class="text-muted">${totalLines.file1.toLocaleString()} lines</small>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4 text-center">
                        <div class="fw-bold">${summary}</div>
                        <small class="text-muted">Processed in ${processingTime}ms</small>
                    </div>
                    <div class="col-md-4 text-end">
                        <div class="d-flex align-items-center justify-content-end">
                            <div class="me-3 text-end">
                                <div class="fw-bold">${escapeHtml(file2.name)}</div>
                                <small class="text-muted">${totalLines.file2.toLocaleString()} lines</small>
                            </div>
                            <div>
                                <i class="bi bi-file-earmark-text fs-2 text-muted"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <hr>
                <div class="row text-center">
                    <div class="col">
                        <div class="text-success fw-bold fs-4">+${stats.added.toLocaleString()}</div>
                        <small class="text-muted">Added</small>
                    </div>
                    <div class="col">
                        <div class="text-danger fw-bold fs-4">-${stats.removed.toLocaleString()}</div>
                        <small class="text-muted">Removed</small>
                    </div>
                    <div class="col">
                        <div class="text-secondary fw-bold fs-4">${stats.unchanged.toLocaleString()}</div>
                        <small class="text-muted">Unchanged</small>
                    </div>
                    <div class="col">
                        <div class="text-primary fw-bold fs-4">${stats.totalChanges.toLocaleString()}</div>
                        <small class="text-muted">Total Changes</small>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderDiffActions(result) {
    return `
        <div class="card mb-3">
            <div class="card-body">
                <div class="d-flex gap-2 flex-wrap">
                    <button class="btn btn-outline-primary" id="export-unified-diff">
                        <i class="bi bi-download"></i> Export Unified Diff
                    </button>
                    <button class="btn btn-outline-secondary" id="copy-unified-diff">
                        <i class="bi bi-clipboard"></i> Copy to Clipboard
                    </button>
                    <button class="btn btn-outline-secondary" id="toggle-all-hunks">
                        <i class="bi bi-arrows-expand"></i> Expand All
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderDiffHunks(hunks, identical) {
    if (identical) {
        return `
            <div class="card">
                <div class="card-body text-center py-5">
                    <i class="bi bi-check-circle text-success fs-1"></i>
                    <h4 class="mt-3">Files are identical</h4>
                    <p class="text-muted">No differences found between the two inputs.</p>
                </div>
            </div>
        `;
    }

    if (hunks.length === 0) {
        return `
            <div class="card">
                <div class="card-body text-center py-5">
                    <i class="bi bi-info-circle text-info fs-1"></i>
                    <h4 class="mt-3">No hunks to display</h4>
                    <p class="text-muted">The differences may be too large to display inline.</p>
                </div>
            </div>
        `;
    }

    const hunkLimit = 100;
    const displayHunks = hunks.slice(0, hunkLimit);
    const hasMore = hunks.length > hunkLimit;

    let html = `
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <span><i class="bi bi-code-square"></i> Changes (${hunks.length} hunks)</span>
                ${hasMore ? `<span class="badge bg-warning">Showing first ${hunkLimit} hunks</span>` : ''}
            </div>
            <div class="card-body p-0">
                <div class="diff-hunks" id="diff-hunks-container">
    `;

    displayHunks.forEach((hunk, index) => {
        html += renderSingleHunk(hunk, index);
    });

    html += `
                </div>
            </div>
        </div>
    `;

    return html;
}

function renderSingleHunk(hunk, index) {
    const header = `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`;

    // Build side-by-side rows
    const rows = buildSideBySideRows(hunk.lines);

    let rowsHtml = '';
    rows.forEach(row => {
        rowsHtml += `
            <div class="diff-row">
                <div class="diff-side diff-left ${row.left.type === 'removed' ? 'diff-line-removed' : row.left.type === 'empty' ? 'diff-line-empty' : 'diff-line-context'}">
                    <span class="diff-line-num">${row.left.lineNum || ''}</span>
                    <span class="diff-line-content">${escapeHtml(row.left.content || '')}</span>
                </div>
                <div class="diff-side diff-right ${row.right.type === 'added' ? 'diff-line-added' : row.right.type === 'empty' ? 'diff-line-empty' : 'diff-line-context'}">
                    <span class="diff-line-num">${row.right.lineNum || ''}</span>
                    <span class="diff-line-content">${escapeHtml(row.right.content || '')}</span>
                </div>
            </div>
        `;
    });

    return `
        <div class="diff-hunk" data-hunk-index="${index}">
            <div class="diff-hunk-header" data-bs-toggle="collapse" data-bs-target="#hunk-${index}"
                 role="button" aria-expanded="true">
                <code>${escapeHtml(header)}</code>
            </div>
            <div class="collapse show" id="hunk-${index}">
                <div class="diff-hunk-content">
                    ${rowsHtml}
                </div>
            </div>
        </div>
    `;
}

function buildSideBySideRows(lines) {
    const rows = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        if (line.type === 'context') {
            // Context lines go on both sides
            rows.push({
                left: { type: 'context', lineNum: line.oldLine, content: line.content },
                right: { type: 'context', lineNum: line.newLine, content: line.content }
            });
            i++;
        } else if (line.type === 'removed') {
            // Check if next line is added (modification pair)
            const nextLine = lines[i + 1];
            if (nextLine && nextLine.type === 'added') {
                // Paired modification
                rows.push({
                    left: { type: 'removed', lineNum: line.oldLine, content: line.content },
                    right: { type: 'added', lineNum: nextLine.newLine, content: nextLine.content }
                });
                i += 2;
            } else {
                // Just removal
                rows.push({
                    left: { type: 'removed', lineNum: line.oldLine, content: line.content },
                    right: { type: 'empty', lineNum: '', content: '' }
                });
                i++;
            }
        } else if (line.type === 'added') {
            // Addition without pairing
            rows.push({
                left: { type: 'empty', lineNum: '', content: '' },
                right: { type: 'added', lineNum: line.newLine, content: line.content }
            });
            i++;
        } else {
            i++;
        }
    }

    return rows;
}

function attachDiffActionListeners(result) {
    // Export unified diff
    document.getElementById('export-unified-diff')?.addEventListener('click', async () => {
        try {
            await window.ipcRenderer.invoke('diff:exportDiff', result.unifiedDiff);
        } catch (error) {
            showDiffError('Failed to export diff: ' + error.message);
        }
    });

    // Copy to clipboard
    document.getElementById('copy-unified-diff')?.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(result.unifiedDiff);
            const btn = document.getElementById('copy-unified-diff');
            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<i class="bi bi-check"></i> Copied!';
            setTimeout(() => {
                btn.innerHTML = originalHtml;
            }, 2000);
        } catch (error) {
            showDiffError('Failed to copy to clipboard: ' + error.message);
        }
    });

    // Toggle all hunks
    let allExpanded = true;
    document.getElementById('toggle-all-hunks')?.addEventListener('click', () => {
        const collapseElements = document.querySelectorAll('.diff-hunk .collapse');
        const btn = document.getElementById('toggle-all-hunks');

        collapseElements.forEach(el => {
            if (allExpanded) {
                el.classList.remove('show');
            } else {
                el.classList.add('show');
            }
        });

        allExpanded = !allExpanded;
        btn.innerHTML = allExpanded
            ? '<i class="bi bi-arrows-collapse"></i> Collapse All'
            : '<i class="bi bi-arrows-expand"></i> Expand All';
    });
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Add styles for diff display
function addDiffStyles() {
    if (document.getElementById('diff-checker-styles')) return;

    const style = document.createElement('style');
    style.id = 'diff-checker-styles';
    style.textContent = `
        .diff-hunks {
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 12px;
            max-height: 600px;
            overflow-y: auto;
            overflow-x: auto;
        }

        .diff-hunk {
            border-bottom: 1px solid var(--bs-border-color);
        }

        .diff-hunk:last-child {
            border-bottom: none;
        }

        .diff-hunk-header {
            background-color: var(--bs-tertiary-bg);
            padding: 8px 12px;
            color: var(--bs-secondary-color);
            cursor: pointer;
            user-select: none;
            position: sticky;
            top: 0;
            z-index: 1;
        }

        .diff-hunk-header:hover {
            background-color: var(--bs-secondary-bg);
        }

        .diff-hunk-content {
            overflow-x: auto;
        }

        /* Side-by-side layout */
        .diff-row {
            display: flex;
            border-bottom: 1px solid var(--bs-border-color-translucent);
        }

        .diff-row:last-child {
            border-bottom: none;
        }

        .diff-side {
            flex: 1;
            display: flex;
            min-height: 22px;
            line-height: 22px;
            white-space: pre;
            overflow: hidden;
        }

        .diff-left {
            border-right: 2px solid var(--bs-border-color);
        }

        .diff-line-num {
            min-width: 45px;
            padding: 0 8px;
            text-align: right;
            color: var(--bs-secondary-color);
            background-color: var(--bs-tertiary-bg);
            user-select: none;
            flex-shrink: 0;
        }

        .diff-line-content {
            flex: 1;
            padding: 0 8px;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .diff-line-added {
            background-color: rgba(40, 167, 69, 0.15);
        }

        .diff-line-removed {
            background-color: rgba(220, 53, 69, 0.15);
        }

        .diff-line-context {
            background-color: transparent;
        }

        .diff-line-empty {
            background-color: var(--bs-tertiary-bg);
        }

        .diff-line-empty .diff-line-content {
            background-color: var(--bs-tertiary-bg);
        }

        /* Dark mode adjustments */
        [data-bs-theme="dark"] .diff-line-added {
            background-color: rgba(40, 167, 69, 0.2);
        }

        [data-bs-theme="dark"] .diff-line-removed {
            background-color: rgba(220, 53, 69, 0.2);
        }

        [data-bs-theme="dark"] .diff-line-empty {
            background-color: rgba(0, 0, 0, 0.2);
        }
    `;

    document.head.appendChild(style);
}

// Initialize styles when module loads
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addDiffStyles);
    } else {
        addDiffStyles();
    }
}
