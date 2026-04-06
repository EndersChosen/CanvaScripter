// ****************************************
// Files endpoints UI
// ****************************************

async function filesTemplate(e) {
    switch (e.target.id) {
        case 'delete-files-by-id':
            return deleteFilesById(e);
        default:
            return;
    }
}

// ****************************************
// Delete Files by ID
// - Manual comma-separated input or TXT/CSV upload
// - CSV with header looks for 'file_id' column
// - CSV without header assumes all values are file IDs
// - Summary + confirm before deleting
// - Progress tracking with cancel support
// ****************************************
async function deleteFilesById(e) {
    if (window.progressAPI?.removeAllProgressListeners) window.progressAPI.removeAllProgressListeners();
    hideEndpoints(e);

    const eContent = document.querySelector('#endpoint-content');
    let form = eContent.querySelector('#delete-files-form');

    if (!form) {
        form = document.createElement('form');
        form.id = 'delete-files-form';
        form.innerHTML = `
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-trash me-1"></i>Delete Files
                    </h3>
                </div>
                <div class="card-body">
                    <p class="text-muted mb-3" style="font-size: 0.85rem;">
                        Delete Canvas files by ID. Enter file IDs manually or upload a TXT/CSV file.
                        <br><small>API: <code>DELETE /api/v1/files/:id</code> with <code>replace=true</code></small>
                    </p>

                    <!-- Manual input -->
                    <div class="mb-3">
                        <label for="df-file-ids" class="form-label">File IDs (comma separated)</label>
                        <textarea id="df-file-ids" class="form-control form-control-sm" rows="3"
                            placeholder="e.g. 12345, 67890, 11111"></textarea>
                    </div>

                    <!-- File upload -->
                    <div class="mb-3">
                        <label class="form-label">Or upload a TXT/CSV file</label>
                        <div class="d-flex align-items-center gap-2">
                            <button id="df-upload-btn" type="button" class="btn btn-sm btn-outline-primary">
                                <i class="bi bi-upload me-1"></i>Choose File
                            </button>
                            <span id="df-upload-info" class="text-muted" style="font-size: 0.8rem;"></span>
                        </div>
                        <div class="form-text">
                            If the file has no headers, all values are treated as file IDs.
                            If it has headers, the <code>file_id</code> column will be used.
                        </div>
                    </div>

                    <!-- Summary -->
                    <div id="df-summary" class="alert alert-info mt-2" hidden>
                        <span id="df-summary-text"></span>
                    </div>

                    <!-- Action buttons -->
                    <div class="d-flex align-items-center gap-2 mt-3">
                        <button id="df-delete-btn" type="button" class="btn btn-sm btn-danger" disabled>
                            <i class="bi bi-trash me-1"></i>Delete Files
                        </button>
                        <button id="df-cancel-btn" type="button" class="btn btn-sm btn-outline-danger" disabled>
                            Cancel
                        </button>
                        <button id="df-clear-btn" type="button" class="btn btn-sm btn-outline-secondary">
                            Clear
                        </button>
                    </div>

                    <!-- Progress -->
                    <div id="df-progress-div" class="mt-2" hidden>
                        <p id="df-progress-info" class="mb-1" style="font-size: 0.85rem;"></p>
                        <div class="progress" style="width: 75%; height: 12px;">
                            <div id="df-progress-bar" class="progress-bar" style="width: 0%"></div>
                        </div>
                    </div>

                    <!-- Results -->
                    <div id="df-result" class="mt-2"></div>
                </div>
            </div>
        `;
        eContent.append(form);

        // --- Element references ---
        const fileIdsInput = form.querySelector('#df-file-ids');
        const uploadBtn = form.querySelector('#df-upload-btn');
        const uploadInfo = form.querySelector('#df-upload-info');
        const summaryDiv = form.querySelector('#df-summary');
        const summaryText = form.querySelector('#df-summary-text');
        const deleteBtn = form.querySelector('#df-delete-btn');
        const cancelBtn = form.querySelector('#df-cancel-btn');
        const clearBtn = form.querySelector('#df-clear-btn');
        const progressDiv = form.querySelector('#df-progress-div');
        const progressInfo = form.querySelector('#df-progress-info');
        const progressBar = form.querySelector('#df-progress-bar');
        const resultDiv = form.querySelector('#df-result');

        let parsedFileIds = [];

        // --- CSV parsing ---
        function parseCSV(text) {
            const rows = [];
            let row = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < text.length; i++) {
                const ch = text[i];
                if (ch === '\r') continue;
                if (ch === '"') {
                    if (inQuotes && text[i + 1] === '"') { current += '"'; i++; }
                    else { inQuotes = !inQuotes; }
                } else if (ch === ',' && !inQuotes) {
                    row.push(current.trim());
                    current = '';
                } else if (ch === '\n' && !inQuotes) {
                    row.push(current.trim());
                    rows.push(row);
                    row = [];
                    current = '';
                } else {
                    current += ch;
                }
            }
            if (current.length > 0 || row.length > 0) {
                row.push(current.trim());
                rows.push(row);
            }
            return rows;
        }

        function parseFileIdsFromText(text, fileName) {
            const lower = (fileName || '').toLowerCase();
            const isCsv = lower.endsWith('.csv');
            const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

            if (lines.length === 0) return [];

            if (isCsv || lines[0].includes(',')) {
                // Parse as CSV
                const rows = parseCSV(text);
                if (rows.length === 0) return [];

                // Check if first row looks like a header
                const firstRow = rows[0];
                const headerIdx = firstRow.findIndex(h => h.toLowerCase().replace(/['"]/g, '') === 'file_id');

                if (headerIdx !== -1) {
                    // Has file_id header — extract that column
                    // Values may be semicolon-separated (e.g. "7087979; 7087980; 7087981")
                    return rows.slice(1)
                        .flatMap(r => (r[headerIdx] || '').replace(/['"]/g, '').split(/[;,]/).map(v => v.trim()))
                        .filter(v => v.length > 0 && /^\d+$/.test(v));
                }

                // Check if first row contains non-numeric values (likely a header row without file_id)
                const firstRowIsHeader = firstRow.some(v => !/^\d+$/.test(v.replace(/['"]/g, '').split(/[;]/).map(s => s.trim()).join('')));
                if (firstRowIsHeader) {
                    // Has headers but no file_id column — return empty
                    return [];
                }

                // No headers — flatten all values as file IDs, splitting semicolons too
                return rows.flat()
                    .flatMap(v => v.replace(/['"]/g, '').split(/[;,]/).map(s => s.trim()))
                    .filter(v => v.length > 0 && /^\d+$/.test(v));
            }

            // Plain text — one ID per line, comma-separated, or semicolon-separated
            return lines.flatMap(l => l.split(/[,;]/))
                .map(v => v.replace(/['"]/g, '').trim())
                .filter(v => v.length > 0 && /^\d+$/.test(v));
        }

        function updateSummary() {
            // Combine manual input and uploaded file IDs
            const manualIds = (fileIdsInput.value || '')
                .split(',')
                .map(v => v.trim())
                .filter(v => v.length > 0 && /^\d+$/.test(v));

            const allIds = [...new Set([...manualIds, ...parsedFileIds])];

            if (allIds.length > 0) {
                summaryDiv.hidden = false;
                summaryText.textContent = `Found ${allIds.length} file${allIds.length !== 1 ? 's' : ''} to delete.`;
                deleteBtn.disabled = false;
            } else {
                summaryDiv.hidden = true;
                summaryText.textContent = '';
                deleteBtn.disabled = true;
            }

            return allIds;
        }

        // --- Event: manual input change ---
        fileIdsInput.addEventListener('input', () => updateSummary());

        // --- Event: file upload ---
        uploadBtn.addEventListener('click', async () => {
            uploadBtn.disabled = true;
            uploadInfo.textContent = '';
            parsedFileIds = [];

            try {
                const fullPath = await window.fileUpload?.pickCsvOrZip?.();
                if (!fullPath) {
                    uploadBtn.disabled = false;
                    return;
                }

                const fileName = fullPath.split(/[\\\/]/).pop();
                const text = await window.fileUpload.readFile(fullPath);
                parsedFileIds = parseFileIdsFromText(text, fileName);

                if (parsedFileIds.length > 0) {
                    uploadInfo.textContent = `${fileName} — ${parsedFileIds.length} file ID${parsedFileIds.length !== 1 ? 's' : ''} loaded`;
                } else {
                    uploadInfo.textContent = `${fileName} — no valid file IDs found (header 'file_id' not found or no numeric values)`;
                }

                updateSummary();
            } catch (error) {
                errorHandler(error, uploadInfo);
            } finally {
                uploadBtn.disabled = false;
            }
        });

        // --- Event: clear ---
        clearBtn.addEventListener('click', () => {
            fileIdsInput.value = '';
            parsedFileIds = [];
            uploadInfo.textContent = '';
            summaryDiv.hidden = true;
            summaryText.textContent = '';
            deleteBtn.disabled = true;
            progressDiv.hidden = true;
            progressBar.style.width = '0%';
            progressInfo.textContent = '';
            resultDiv.innerHTML = '';
        });

        // --- Event: delete ---
        deleteBtn.addEventListener('click', async () => {
            const domain = document.querySelector('#domain')?.value?.trim();
            const token = document.querySelector('#token')?.value?.trim();

            if (!domain || !token) {
                resultDiv.innerHTML = '<div class="alert alert-warning">Please enter your domain and token first.</div>';
                return;
            }

            const allIds = updateSummary();
            if (allIds.length === 0) return;

            // Confirm
            const confirmed = confirm(`Are you sure you want to delete ${allIds.length} file${allIds.length !== 1 ? 's' : ''}? This action cannot be undone.`);
            if (!confirmed) return;

            // Reset UI
            resultDiv.innerHTML = '';
            progressDiv.hidden = false;
            progressBar.style.width = '0%';
            progressInfo.textContent = `Deleting ${allIds.length} file${allIds.length !== 1 ? 's' : ''}...`;
            deleteBtn.disabled = true;
            cancelBtn.disabled = false;
            uploadBtn.disabled = true;

            // Listen for progress
            if (window.progressAPI?.onUpdateProgress) {
                window.progressAPI.onUpdateProgress((progress) => {
                    if (typeof progress === 'number') {
                        progressBar.style.width = `${progress}%`;
                    }
                });
            }

            // Cancel handler
            let cancelClicked = false;
            const cancelHandler = async () => {
                cancelClicked = true;
                cancelBtn.disabled = true;
                progressInfo.textContent = 'Cancelling... waiting for in-flight requests to complete.';
                try {
                    await window.axios.cancelDeleteFiles();
                } catch { }
            };
            cancelBtn.addEventListener('click', cancelHandler, { once: true });

            try {
                const files = allIds.map(id => ({ id }));
                const response = await window.axios.deleteFiles({
                    domain,
                    token,
                    files
                });

                progressBar.style.width = '100%';

                const successful = response.successful?.length || 0;
                const failed = response.failed?.length || 0;
                const cancelled = response.cancelled || false;

                progressInfo.textContent = cancelled
                    ? `Cancelled. Deleted ${successful}, failed ${failed}.`
                    : `Done. Deleted ${successful}, failed ${failed}.`;

                if (successful > 0) {
                    const successDiv = document.createElement('div');
                    successDiv.className = 'alert alert-success mt-2';
                    successDiv.textContent = `Successfully deleted ${successful} file${successful !== 1 ? 's' : ''}.`;
                    resultDiv.appendChild(successDiv);
                }

                if (failed > 0) {
                    const failedDiv = document.createElement('div');
                    failedDiv.className = 'alert alert-danger mt-2';
                    failedDiv.innerHTML = `<strong>${failed} deletion${failed !== 1 ? 's' : ''} failed:</strong>`;

                    const ul = document.createElement('ul');
                    ul.className = 'mb-0 mt-1';
                    (response.failed || []).slice(0, 10).forEach(f => {
                        const li = document.createElement('li');
                        li.textContent = `File ${f.id}: ${f.reason}${f.status ? ` (status ${f.status})` : ''}`;
                        ul.appendChild(li);
                    });
                    if (failed > 10) {
                        const li = document.createElement('li');
                        li.textContent = `... and ${failed - 10} more`;
                        ul.appendChild(li);
                    }
                    failedDiv.appendChild(ul);
                    resultDiv.appendChild(failedDiv);
                }

            } catch (error) {
                errorHandler(error, progressInfo);
            } finally {
                deleteBtn.disabled = false;
                cancelBtn.disabled = true;
                uploadBtn.disabled = false;
                cancelBtn.removeEventListener('click', cancelHandler);
                if (window.progressAPI?.removeAllProgressListeners) {
                    window.progressAPI.removeAllProgressListeners();
                }
            }
        });
    }

    form.hidden = false;
}
