// ****************************************
// Conversation endpoints UI (clean rebuild)
// ****************************************

async function conversationTemplate(e) {
    switch (e.target.id) {
        case 'delete-conversations-subject':
            return deleteConvos(e);
        case 'download-conversations-csv': // Not Complete
            return downloadConvos(e);
        case 'get-deleted-conversations':
            return getDeletedConversations(e);
        case 'restore-deleted-conversations':
            return restoreDeletedConversations(e);
        default:
            return;
    }
}

// ****************************************
// Restore Deleted Conversations
// - CSV/ZIP/JSON input
// - Robust CSV parser (quoted newlines, escaped quotes)
// - Dedupe by message_id-user_id
// - Throttled batches with retries and cancel
// - Progress and capped inline errors
// - Full error log written next to source upload
// ****************************************
async function restoreDeletedConversations(e) {
    if (window.progressAPI?.removeAllProgressListeners) window.progressAPI.removeAllProgressListeners();
    hideEndpoints(e);

    const eContent = document.querySelector('#endpoint-content');
    let form = eContent.querySelector('#restore-deleted-conversations-form');

    if (!form) {
        form = document.createElement('form');
        form.id = 'restore-deleted-conversations-form';
        form.innerHTML = `
            <div>
                <h3>Restore Deleted Conversations</h3>
                <p>Upload CSV, ZIP of CSVs, or JSON with objects: { message_id, user_id, conversation_id }.</p>
            </div>
            <div class="row align-items-center mt-2">
                <div class="col-auto">
                    <button id="rdc-upload" type="button" class="btn btn-secondary">Choose CSV/ZIP/JSON</button>
                </div>
                <div class="col-auto">
                    <span id="rdc-upload-info" class="form-text"></span>
                </div>
            </div>
            <div class="row mt-3">
                <div class="col-auto">
                    <button id="rdc-restore" type="button" class="btn btn-primary" disabled>Restore</button>
                </div>
                <div class="col-auto">
                    <button id="rdc-cancel" type="button" class="btn btn-outline-danger" disabled>Cancel</button>
                </div>
                <div class="col-auto">
                    <button id="rdc-clear" type="button" class="btn btn-outline-secondary">Clear</button>
                </div>
            </div>
            <div hidden id="rdc-progress-div" class="mt-3">
                <p id="rdc-progress-info"></p>
                <div class="progress mt-1" style="width: 75%" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
            </div>
            <div id="rdc-response" class="mt-3"></div>
        `;
        eContent.append(form);
    }
    form.hidden = false;

    const uploadBtn = form.querySelector('#rdc-upload');
    const uploadInfo = form.querySelector('#rdc-upload-info');
    const restoreBtn = form.querySelector('#rdc-restore');
    const cancelBtn = form.querySelector('#rdc-cancel');
    const clearBtn = form.querySelector('#rdc-clear');
    const progressDiv = form.querySelector('#rdc-progress-div');
    const progressBar = progressDiv.querySelector('.progress-bar');
    const progressInfo = form.querySelector('#rdc-progress-info');
    const responseDiv = form.querySelector('#rdc-response');

    let records = [];

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
    function normalizeHeader(h) {
        return (h || '').replace(/^\uFEFF/, '').toLowerCase().replace(/\s+/g, '_');
    }
    function parseCanvasId(val) {
        if (val === null || val === undefined) return null;
        let s = String(val).trim();
        if (s === '') return null;
        s = s.replace(/,/g, '');
        if (/^[+-]?\d+$/.test(s)) { try { return String(BigInt(s)); } catch { return s.replace(/^\+/, ''); } }
        if (/^[+-]?\d*(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(s)) { const n = Number(s); if (Number.isFinite(n)) return String(Math.trunc(n)); }
        return null;
    }
    async function parseDeletedConvosCSV(text, sourceFileName = '') {
        const rows = parseCSV(text).filter(r => r && r.length > 0);
        if (rows.length === 0) return [];
        const headers = rows[0].map(normalizeHeader);
        const idx = {
            user_id: headers.indexOf('user_id'),
            message_id: (() => { const i = headers.indexOf('id'); return i !== -1 ? i : headers.indexOf('message_id'); })(),
            conversation_id: headers.indexOf('conversation_id')
        };
        if (idx.user_id === -1 || idx.message_id === -1 || idx.conversation_id === -1) {
            throw new Error(`CSV must include headers: user_id, id (or message_id), conversation_id. Found: ${headers.join(', ')}`);
        }
        const out = [];
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.every(cell => String(cell || '').trim() === '')) continue;
            const user_id = parseCanvasId(row[idx.user_id]);
            const message_id = parseCanvasId(row[idx.message_id]);
            const conversation_id = parseCanvasId(row[idx.conversation_id]);
            if (user_id && message_id && conversation_id) out.push({ user_id, message_id, conversation_id, _rowNumber: i, _sourceFile: sourceFileName });
        }
        return out;
    }
    async function parseDeletedConvosJSON(text, sourceFileName = '') {
        const data = JSON.parse(text);
        const arr = Array.isArray(data) ? data : (data?.errors || data?.failed || data?.records || data?.rows || []);
        if (!Array.isArray(arr)) throw new Error('JSON must be an array or contain an array under errors/failed/records/rows');
        const out = [];
        for (const r of arr) {
            const user_id = parseCanvasId(r.user_id ?? r.userId);
            const message_id = parseCanvasId(r.message_id ?? r.id ?? r.messageId);
            const conversation_id = parseCanvasId(r.conversation_id ?? r.conversationId ?? r.convo_id);
            if (user_id && message_id && conversation_id) out.push({ user_id, message_id, conversation_id, _sourceFile: sourceFileName });
        }
        return out;
    }

    if (form.dataset.bound !== 'true') {
        uploadBtn.addEventListener('click', async (evt) => {
            evt.preventDefault(); evt.stopPropagation();
            uploadBtn.disabled = true; uploadInfo.textContent = ''; records = [];
            try {
                const fullPath = await (window.fileUpload?.pickCsvOrZip?.());
                if (!fullPath) { uploadBtn.disabled = false; return; }
                const fileName = fullPath.split(/[\\\/]/).pop();
                const dirPath = fullPath.slice(0, fullPath.length - fileName.length).replace(/[\\\/]+$/, '');
                const lower = (fileName || '').toLowerCase();
                if (lower.endsWith('.zip')) {
                    if (!window.JSZip) throw new Error('JSZip not available in renderer.');
                    const buf = await window.fileUpload.readFileBuffer(fullPath);
                    const zip = await window.JSZip.loadAsync(buf);
                    const csvFiles = Object.keys(zip.files).filter(n => n.toLowerCase().endsWith('.csv'));
                    if (csvFiles.length === 0) throw new Error('Zip contains no CSV files.');
                    let processed = 0; const total = csvFiles.length; let totalRecords = 0;
                    uploadInfo.textContent = `Processing 0/${total} files...`;
                    for (const name of csvFiles) {
                        try {
                            const entry = zip.files[name];
                            const content = await entry.async('string');
                            const rows = await parseDeletedConvosCSV(content, name);
                            records.push(...rows); totalRecords += rows.length; processed++;
                            uploadInfo.textContent = `Processing ${processed}/${total} files (${rows.length} from ${name})`;
                            await new Promise(r => setTimeout(r, 1));
                        } catch (err) {
                            processed++; uploadInfo.textContent = `Processing ${processed}/${total} files (ERROR in ${name})`;
                        }
                    }
                    uploadInfo.textContent = `Completed. Loaded ${totalRecords} rows from ${total} files.`;
                } else if (lower.endsWith('.json')) {
                    const text = await window.fileUpload.readFile(fullPath);
                    const rows = await parseDeletedConvosJSON(text, fileName);
                    records = rows;
                    uploadInfo.textContent = `Ready: ${fileName} - Loaded ${records.length} JSON rows`;
                } else {
                    const text = await window.fileUpload.readFile(fullPath);
                    records = await parseDeletedConvosCSV(text, fileName);
                    uploadInfo.textContent = `Ready: ${fileName}`;
                }
                // dedupe by message_id-user_id
                const seen = new Set(); const unique = [];
                for (const r of records) { const k = `${r.message_id}-${r.user_id}`; if (!seen.has(k)) { seen.add(k); unique.push(r); } }
                records = unique;
                form.dataset.sourceDir = dirPath; form.dataset.sourceName = fileName;
                restoreBtn.disabled = records.length === 0;
                if (records.length > 0) uploadInfo.textContent += ` - Ready to restore ${records.length} records.`;
            } catch (error) {
                errorHandler(error, uploadInfo);
            } finally {
                uploadBtn.disabled = false;
            }
        });

        restoreBtn.addEventListener('click', async (evt) => {
            evt.preventDefault(); evt.stopPropagation(); if (records.length === 0) return;
            const domain = document.querySelector('#domain').value.trim();
            const token = document.querySelector('#token').value.trim();
            const isNum = (v) => /^\d+$/.test(String(v).trim());
            const validRecords = []; const invalidRecords = []; const missingFieldRecords = [];
            records.forEach((r, index) => {
                const userIdValid = r.user_id && isNum(r.user_id);
                const messageIdValid = r.message_id && isNum(r.message_id);
                const conversationIdValid = r.conversation_id && isNum(r.conversation_id);
                const missingFields = [];
                if (!r.user_id) missingFields.push('user_id');
                if (!r.message_id) missingFields.push('id');
                if (!r.conversation_id) missingFields.push('conversation_id');
                if (missingFields.length > 0) {
                    missingFieldRecords.push({ index: index + 1, record: r, rowNumber: r._rowNumber, sourceFile: r._sourceFile, missingFields, rawValues: r._rawRow });
                } else if (userIdValid && messageIdValid && conversationIdValid) {
                    validRecords.push(r);
                } else {
                    invalidRecords.push({ index: index + 1, record: r, rowNumber: r._rowNumber, sourceFile: r._sourceFile, issues: { user_id: !userIdValid ? r.user_id : null, message_id: !messageIdValid ? r.message_id : null, conversation_id: !conversationIdValid ? r.conversation_id : null } });
                }
            });
            const skipped = invalidRecords.length + missingFieldRecords.length;
            if (validRecords.length === 0) {
                progressDiv.hidden = false; progressBar.style.width = '0%';
                progressInfo.innerHTML = 'No valid rows to process. Ensure CSV/JSON has numeric user_id, id, and conversation_id values.';
                restoreBtn.disabled = false; return;
            }
            progressDiv.hidden = false; progressBar.style.width = '0%';
            progressInfo.innerHTML = `Restoring ${validRecords.length} conversation message(s)...${skipped > 0 ? ` (skipping ${skipped} invalid row(s))` : ''}`;
            responseDiv.innerHTML = '';
            restoreBtn.disabled = true; cancelBtn.disabled = false;
            if (window.progressAPI) {
                window.progressAPI.onUpdateProgress((progress) => {
                    if (typeof progress === 'number') progressBar.style.width = `${progress}%`;
                    else if (progress && typeof progress.value === 'number') progressBar.style.width = `${Math.round(progress.value * 100)}%`;
                });
            }
            let cancelledByUser = false;
            const onCancelClick = async () => { cancelBtn.disabled = true; try { await window.axios.cancelRestoreDeletedConversations(); } catch { } cancelledByUser = true; progressInfo.innerHTML = 'Cancelling... letting in-flight requests finish.'; };
            cancelBtn.addEventListener('click', onCancelClick, { once: true });
            try {
                const batchSize = 50; const delayBetweenBatches = 2000; const maxRetries = 3;
                let allSuccessful = []; let allFailed = [];
                for (let i = 0; i < validRecords.length; i += batchSize) {
                    if (cancelledByUser) break;
                    const batch = validRecords.slice(i, i + batchSize);
                    const batchNumber = Math.floor(i / batchSize) + 1; const totalBatches = Math.ceil(validRecords.length / batchSize);
                    progressInfo.innerHTML = `Processing batch ${batchNumber}/${totalBatches} (${batch.length} records)...`;
                    progressBar.style.width = `${Math.round((i / validRecords.length) * 100)}%`;
                    let retryCount = 0; let batchResult = null;
                    while (retryCount <= maxRetries && !batchResult) {
                        try {
                            if (retryCount > 0) { const backoff = Math.pow(2, retryCount) * 1000; progressInfo.innerHTML = `Retrying batch ${batchNumber}/${totalBatches} (attempt ${retryCount + 1}/${maxRetries + 1}) - waiting ${backoff / 1000}s...`; await new Promise(r => setTimeout(r, backoff)); }
                            batchResult = await window.axios.restoreDeletedConversations({ domain, token, rows: batch });
                            if (batchResult?.cancelled) cancelledByUser = true;
                            if (batchResult?.successful) allSuccessful.push(...batchResult.successful);
                            if (batchResult?.failed) allFailed.push(...batchResult.failed);
                        } catch (error) {
                            retryCount++;
                            if (error?.response?.status === 403 || String(error?.message).toLowerCase().includes('rate')) { const t = 60000; progressInfo.innerHTML = `Rate limited (403). Waiting ${t / 1000}s...`; await new Promise(r => setTimeout(r, t)); }
                            if (retryCount > maxRetries) {
                                batch.forEach(record => { allFailed.push({ message_id: record.message_id, user_id: record.user_id, conversation_id: record.conversation_id, source_file: record._sourceFile || 'Unknown', reason: `API error after ${maxRetries} retries: ${error?.message || 'Unknown error'}` }); });
                            }
                        }
                    }
                }
                const success = allSuccessful.length; const failedExplicit = allFailed.length;
                const successfulIds = new Set();
                for (const item of allSuccessful) { if (item.value && Array.isArray(item.value)) item.value.forEach(msg => successfulIds.add(String(msg.id))); }
                const explicitlyFailedIds = new Set(allFailed.filter(x => x.message_id).map(x => String(x.message_id)));
                const silentlyFailed = [];
                for (const record of validRecords) {
                    const mid = String(record.message_id);
                    if (!successfulIds.has(mid) && !explicitlyFailedIds.has(mid)) silentlyFailed.push({ message_id: record.message_id, user_id: record.user_id, conversation_id: record.conversation_id, source_file: record._sourceFile || 'Unknown', reason: 'Not processed (likely API issue)' });
                }
                const allFailedCombined = [...allFailed, ...silentlyFailed];
                missingFieldRecords.forEach(inv => { allFailedCombined.push({ message_id: inv.rawValues?.message_id || 'N/A', user_id: inv.rawValues?.user_id || 'N/A', conversation_id: inv.rawValues?.conversation_id || 'N/A', source_file: inv.sourceFile || 'Unknown', reason: `Missing required fields: ${inv.missingFields.join(', ')} (Row ${inv.rowNumber})` }); });
                invalidRecords.forEach(inv => { const issues = Object.entries(inv.issues).filter(([k, v]) => v !== null).map(([k, v]) => `${k}="${v}"`).join(', '); allFailedCombined.push({ message_id: inv.record.message_id || 'N/A', user_id: inv.record.user_id || 'N/A', conversation_id: inv.record.conversation_id || 'N/A', source_file: inv.sourceFile || 'Unknown', reason: `Invalid values: ${issues} (Row ${inv.rowNumber})` }); });
                const totalFailed = allFailedCombined.length;
                progressBar.style.width = '100%';
                progressInfo.innerHTML = cancelledByUser ? `Cancelled. Restored ${success}, failed ${totalFailed}.` : `Done. Restored ${success}, failed ${totalFailed}.${skipped > 0 ? ` Skipped ${skipped}.` : ''}`;
                if (totalFailed > 0) {
                    const failedDiv = document.createElement('div'); failedDiv.className = 'mt-3';
                    const failedTitle = document.createElement('h5'); failedTitle.textContent = `Failed Records (${totalFailed}):`; failedDiv.appendChild(failedTitle);
                    const ul = document.createElement('ul'); allFailedCombined.slice(0, 5).forEach(f => { const li = document.createElement('li'); const sourceInfo = f.source_file ? ` [${f.source_file}]` : ''; if (f.message_id && f.user_id) li.innerHTML = `<strong>Message ID ${f.message_id}</strong> (User: ${f.user_id}, Conversation: ${f.conversation_id})${sourceInfo}: ${f.reason}`; else li.textContent = f.reason || 'Unknown error'; ul.appendChild(li); }); failedDiv.appendChild(ul);
                    if (allFailedCombined.length > 5) { const moreText = document.createElement('p'); moreText.textContent = `...and ${allFailedCombined.length - 5} more failed records`; failedDiv.appendChild(moreText); }
                    responseDiv.appendChild(failedDiv);
                    const dirPath = form.dataset.sourceDir || ''; const baseName = form.dataset.sourceName || 'restore_upload.csv';
                    if (dirPath && window.fileUpload?.writeErrorsFile) {
                        try { const outPath = await window.fileUpload.writeErrorsFile(dirPath, baseName, allFailedCombined); const p = document.createElement('p'); p.textContent = `Full error list written to: ${outPath}`; failedDiv.appendChild(p); }
                        catch (e) { const p = document.createElement('p'); p.textContent = `Failed to write errors file: ${e?.message || e}`; failedDiv.appendChild(p); }
                    }
                }
            } catch (error) {
                progressBar.parentElement.hidden = true; errorHandler(error, progressInfo);
            } finally {
                restoreBtn.disabled = false; cancelBtn.disabled = true;
            }
        });

        clearBtn.addEventListener('click', (evt) => {
            evt.preventDefault(); evt.stopPropagation();
            records = []; uploadInfo.textContent = ''; restoreBtn.disabled = true; cancelBtn.disabled = true;
            responseDiv.innerHTML = ''; progressInfo.innerHTML = ''; progressBar.style.width = '0%'; progressDiv.hidden = true;
            delete form.dataset.sourceDir; delete form.dataset.sourceName;
        });
        form.dataset.bound = 'true';
    }
}

// ****************************************
// Get Deleted Conversations (search + CSV export + cancel; bulk export + cancel)
// ****************************************
async function getDeletedConversations(e) {
    if (window.progressAPI?.removeAllProgressListeners) window.progressAPI.removeAllProgressListeners();
    hideEndpoints(e);

    const eContent = document.querySelector('#endpoint-content');
    let form = eContent.querySelector('#get-deleted-conversations-form');

    if (!form) {
        form = document.createElement('form');
        form.id = 'get-deleted-conversations-form';
        form.innerHTML = `
            <div>
                <h3>Get Deleted Conversations</h3>
                <p>Fetch deleted conversations for a user, optionally filtered by deleted_before/after.</p>
            </div>
            <div class="row align-items-center">
                <div class="col-auto">
                    <label for="gdc-user-id" class="form-label">User ID</label>
                </div>
                <div class="col-2">
                    <input id="gdc-user-id" type="text" class="form-control" aria-describedby="gdc-user-help" />
                </div>
                <div class="col-auto">
                    <span id="gdc-user-help" class="form-text" style="display:none;">Must only contain numbers</span>
                </div>
            </div>
            <div class="row align-items-center mt-2">
                <div class="col-auto">
                    <label for="gdc-deleted-after" class="form-label">Deleted After</label>
                </div>
                <div class="col-auto">
                    <input id="gdc-deleted-after" type="date" class="form-control" />
                </div>
                <div class="col-auto">
                    <label for="gdc-deleted-before" class="form-label">Deleted Before</label>
                </div>
                <div class="col-auto">
                    <input id="gdc-deleted-before" type="date" class="form-control" />
                </div>
            </div>
            <div class="row mt-3">
                <div class="col-auto">
                    <button id="gdc-search" type="button" class="btn btn-primary" disabled>Get Deleted</button>
                </div>
                <div class="col-auto">
                    <button id="gdc-cancel-single" type="button" class="btn btn-outline-danger" disabled>Cancel</button>
                </div>
                <div class="col-auto">
                    <button id="gdc-export-csv" type="button" class="btn btn-secondary" hidden>Export to CSV</button>
                </div>
            </div>
            <div hidden id="gdc-single-progress-div" class="mt-3">
                <p id="gdc-single-progress-info"></p>
                <div class="progress mt-1" style="width: 75%" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
            </div>
            <hr class="my-3" />
            <div class="row align-items-center">
                <div class="col-auto">
                    <label class="form-label">Bulk: Upload user list (txt/csv)</label>
                </div>
                <div class="col-auto">
                    <button id="gdc-upload" type="button" class="btn btn-secondary">Choose file</button>
                </div>
                <div class="col-auto">
                    <span id="gdc-upload-info" class="form-text"></span>
                </div>
            </div>
            <div class="row mb-3 mt-2">
                <div class="col-12">
                    <label for="gdc-output-path" class="form-label">Output Folder</label>
                    <div class="input-group">
                        <input type="text" id="gdc-output-path" class="form-control" placeholder="Select output folder..." readonly>
                        <button type="button" id="gdc-browse-folder" class="btn btn-outline-secondary">Browse</button>
                    </div>
                </div>
            </div>
            <div class="row mt-2">
                <div class="col-auto">
                    <button id="gdc-export-multi" type="button" class="btn btn-primary" disabled>Export for users</button>
                </div>
                <div class="col-auto">
                    <button id="gdc-cancel-bulk" type="button" class="btn btn-outline-danger" disabled>Cancel</button>
                </div>
            </div>
            <div hidden id="gdc-bulk-progress-div" class="mt-3">
                <p id="gdc-bulk-progress-info"></p>
                <div class="progress mt-1" style="width: 75%" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
            </div>
            <div id="gdc-response" class="mt-3"></div>
        `;
        eContent.append(form);
    }
    form.hidden = false;

    const userInput = form.querySelector('#gdc-user-id');
    const searchBtn = form.querySelector('#gdc-search');
    const cancelSingleBtn = form.querySelector('#gdc-cancel-single');
    const singleProgressDiv = form.querySelector('#gdc-single-progress-div');
    const singleProgressBar = singleProgressDiv.querySelector('.progress-bar');
    const singleProgressInfo = form.querySelector('#gdc-single-progress-info');
    const bulkProgressDiv = form.querySelector('#gdc-bulk-progress-div');
    const bulkProgressBar = bulkProgressDiv.querySelector('.progress-bar');
    const bulkProgressInfo = form.querySelector('#gdc-bulk-progress-info');
    const responseDiv = form.querySelector('#gdc-response');
    const uploadBtn = form.querySelector('#gdc-upload');
    const uploadInfo = form.querySelector('#gdc-upload-info');
    const browseFolderBtn = form.querySelector('#gdc-browse-folder');
    const outputPathInput = form.querySelector('#gdc-output-path');
    const exportMultiBtn = form.querySelector('#gdc-export-multi');
    const cancelBulkBtn = form.querySelector('#gdc-cancel-bulk');
    const exportBtn = form.querySelector('#gdc-export-csv');

    let bulkUserIds = []; let outputFolder = '';
    let lastResultsForCsv = []; let lastUserIdForCsv = '';
    const updateExportEnabled = () => { exportMultiBtn.disabled = !(bulkUserIds.length > 0 && !!outputFolder); };
    const toggleBtn = () => { searchBtn.disabled = !(userInput.value && userInput.value.trim() !== '' && !isNaN(Number(userInput.value.trim()))); form.querySelector('#gdc-user-help').style.display = searchBtn.disabled ? 'inline' : 'none'; };
    userInput.addEventListener('input', toggleBtn);

    if (form.dataset.bound !== 'true') {
        searchBtn.addEventListener('click', async (evt) => {
            evt.preventDefault(); evt.stopPropagation();
            searchBtn.disabled = true; cancelSingleBtn.disabled = false; responseDiv.innerHTML = '';
            singleProgressDiv.hidden = false; singleProgressBar.style.width = '0%'; singleProgressInfo.innerHTML = 'Fetching deleted conversations...';
            const domain = document.querySelector('#domain').value.trim();
            const token = document.querySelector('#token').value.trim();
            const user_id = userInput.value.trim();
            const deleted_after = form.querySelector('#gdc-deleted-after').value.trim();
            const deleted_before = form.querySelector('#gdc-deleted-before').value.trim();
            let cancelled = false; const onCancel = async () => { cancelSingleBtn.disabled = true; try { await window.axios.cancelGetDeletedConversations(); } catch { } singleProgressInfo.innerHTML = 'Cancelling...'; cancelled = true; };
            cancelSingleBtn.addEventListener('click', onCancel, { once: true });
            try {
                const params = { domain, token, user_id };
                const toStartOfDayISO = (d) => d ? new Date(`${d}T00:00:00`).toISOString() : undefined;
                const toEndOfDayISO = (d) => d ? new Date(`${d}T23:59:59.999`).toISOString() : undefined;
                const afterISO = toStartOfDayISO(deleted_after); const beforeISO = toEndOfDayISO(deleted_before);
                if (afterISO) params.deleted_after = afterISO; if (beforeISO) params.deleted_before = beforeISO;
                const results = await window.axios.getDeletedConversations(params);
                const count = results.length; singleProgressInfo.innerHTML = cancelled ? `Cancelled.` : `Found ${count} deleted conversation(s).`; singleProgressBar.style.width = '100%';
                if (count > 0) { lastResultsForCsv = results; lastUserIdForCsv = user_id; exportBtn.hidden = false; }
                else { exportBtn.hidden = true; lastResultsForCsv = []; lastUserIdForCsv = ''; }
            } catch (error) {
                singleProgressBar.parentElement.hidden = true; if (String(error?.name) === 'AbortError' || String(error?.message).includes('Aborted')) singleProgressInfo.innerHTML = 'Cancelled.'; else errorHandler(error, singleProgressInfo);
            } finally {
                searchBtn.disabled = false; cancelSingleBtn.disabled = true;
            }
        });

        exportBtn.addEventListener('click', (e2) => {
            e2.preventDefault(); e2.stopPropagation(); if (!lastResultsForCsv || lastResultsForCsv.length === 0) return;
            const fileName = `deleted_conversations_${lastUserIdForCsv}.csv`;
            const sanitized = lastResultsForCsv.map((item) => { const row = {}; for (const key of Object.keys(item)) { const val = item[key]; if (key === 'attachments' && Array.isArray(val)) { const pairs = val.map(att => `${att.id}:${att.url}`).join('; '); row[key] = pairs; } else if (val !== null && typeof val === 'object') { row[key] = JSON.stringify(val); } else { row[key] = val; } } return row; });
            const allKeys = Array.from(new Set(sanitized.flatMap(obj => Object.keys(obj)))); if (!allKeys.includes('deleted_at')) allKeys.push('deleted_at');
            if (sanitized.length > 0) { const first = sanitized[0]; const headerCompleteFirst = {}; for (const k of allKeys) headerCompleteFirst[k] = Object.prototype.hasOwnProperty.call(first, k) ? first[k] : ''; const data = [headerCompleteFirst, ...sanitized.slice(1).map(obj => { const full = {}; for (const k of allKeys) full[k] = Object.prototype.hasOwnProperty.call(obj, k) ? obj[k] : ''; return full; })]; window.csv.sendToCSV({ fileName, data }); }
        });

        uploadBtn.addEventListener('click', async (evt) => {
            evt.preventDefault(); evt.stopPropagation(); uploadBtn.disabled = true; uploadInfo.textContent = '';
            try {
                if (window.fileUpload && typeof window.fileUpload.getUserIdsFromFile === 'function') {
                    const ids = await window.fileUpload.getUserIdsFromFile(); if (ids === 'cancelled') { uploadInfo.textContent = 'Cancelled.'; return; }
                    bulkUserIds = Array.from(new Set(ids.map((v) => Number(v)).filter((n) => !isNaN(n)))); uploadInfo.textContent = `Found ${bulkUserIds.length} user(s).`; updateExportEnabled();
                } else {
                    const input = document.createElement('input'); input.type = 'file'; input.accept = '.txt,.csv,text/plain,text/csv'; input.onchange = async () => { try { const file = input.files && input.files[0]; if (!file) return; const text = await file.text(); const tokens = text.split(/\r?\n|\r|,|\s+/).filter(Boolean); const numeric = tokens.map((v) => Number(v)).filter((n) => !isNaN(n)); bulkUserIds = Array.from(new Set(numeric)); uploadInfo.textContent = `Found ${bulkUserIds.length} user(s).`; updateExportEnabled(); } catch (err) { errorHandler(err, uploadInfo); } }; input.click();
                }
            } catch (error) { errorHandler(error, uploadInfo); }
            finally { uploadBtn.disabled = false; }
        });

        browseFolderBtn.addEventListener('click', async (evt) => {
            evt.preventDefault(); evt.stopPropagation();
            try { const selected = await window.electronAPI.selectFolder(); if (selected) { outputFolder = selected; outputPathInput.value = outputFolder; updateExportEnabled(); } }
            catch (error) { errorHandler(error, outputPathInput); }
        });

        exportMultiBtn.addEventListener('click', async (evt) => {
            evt.preventDefault(); evt.stopPropagation(); if (bulkUserIds.length === 0) return; if (!outputFolder) { bulkProgressDiv.hidden = false; bulkProgressInfo.textContent = 'Please choose an output folder first.'; return; }
            exportMultiBtn.disabled = true; cancelBulkBtn.disabled = false; bulkProgressDiv.hidden = false; bulkProgressBar.style.width = '0%'; bulkProgressInfo.innerHTML = `Exporting for ${bulkUserIds.length} user(s)...`;
            const domain = document.querySelector('#domain').value.trim(); const token = document.querySelector('#token').value.trim();
            const deleted_after = form.querySelector('#gdc-deleted-after').value.trim(); const deleted_before = form.querySelector('#gdc-deleted-before').value.trim();
            const toStartOfDayISO = (d) => d ? new Date(`${d}T00:00:00`).toISOString() : undefined; const toEndOfDayISO = (d) => d ? new Date(`${d}T23:59:59.999`).toISOString() : undefined;
            let completed = 0; let exported = 0; let skipped = 0; let cancelled = false;
            const onCancelBulk = async () => { cancelBulkBtn.disabled = true; try { await window.axios.cancelGetDeletedConversations(); } catch { } cancelled = true; bulkProgressInfo.innerHTML = 'Cancelling...'; };
            cancelBulkBtn.addEventListener('click', onCancelBulk, { once: true });
            for (const uid of bulkUserIds) {
                if (cancelled) break;
                try {
                    const params = { domain, token, user_id: String(uid) };
                    const afterISO = toStartOfDayISO(deleted_after); const beforeISO = toEndOfDayISO(deleted_before);
                    if (afterISO) params.deleted_after = afterISO; if (beforeISO) params.deleted_before = beforeISO;
                    const results = await window.axios.getDeletedConversations(params);
                    if (results.length > 0) {
                        const sanitized = results.map((item) => { const row = {}; for (const key of Object.keys(item)) { const val = item[key]; if (key === 'attachments' && Array.isArray(val)) { const pairs = val.map(att => `${att.id}:${att.url}`).join('; '); row[key] = pairs; } else if (val !== null && typeof val === 'object') { row[key] = JSON.stringify(val); } else { row[key] = val; } } return row; });
                        const allKeys = Array.from(new Set(sanitized.flatMap(obj => Object.keys(obj)))); if (!allKeys.includes('deleted_at')) allKeys.push('deleted_at');
                        const first = sanitized[0]; const headerCompleteFirst = {}; for (const k of allKeys) headerCompleteFirst[k] = Object.prototype.hasOwnProperty.call(first, k) ? first[k] : '';
                        const data = [headerCompleteFirst, ...sanitized.slice(1).map(obj => { const full = {}; for (const k of allKeys) full[k] = Object.prototype.hasOwnProperty.call(obj, k) ? obj[k] : ''; return full; })];
                        const fileName = `deleted_conversations_${uid}.csv`; const fullPath = `${outputFolder.replace(/[\\/]+$/, '')}\\${fileName}`; await window.csv.writeAtPath(fullPath, data); exported++;
                    } else { skipped++; }
                } catch (err) {
                    if (String(err?.name) === 'AbortError' || String(err?.message).includes('Aborted')) { cancelled = true; }
                    else { skipped++; }
                } finally {
                    completed++; const pct = Math.round((completed / bulkUserIds.length) * 100); bulkProgressBar.style.width = `${pct}%`;
                    if (!cancelled) bulkProgressInfo.innerHTML = `Processed ${completed}/${bulkUserIds.length}. Exported: ${exported}. Skipped: ${skipped}.`;
                    else bulkProgressInfo.innerHTML = `Cancelling... Processed ${completed}/${bulkUserIds.length}. Exported: ${exported}. Skipped: ${skipped}.`;
                }
            }
            exportMultiBtn.disabled = false; cancelBulkBtn.disabled = true;
            if (cancelled) bulkProgressInfo.innerHTML = `Cancelled. Processed ${completed} of ${bulkUserIds.length}. Exported: ${exported}. Skipped: ${skipped}.`;
            else bulkProgressInfo.innerHTML = `Done. Processed ${completed}/${bulkUserIds.length}. Exported: ${exported}. Skipped: ${skipped}.`;
        });
        form.dataset.bound = 'true';
    }
}

// ****************************************
// Stubbed/unchanged endpoints below
// ****************************************
async function deleteConvos(e) {
    if (window.progressAPI?.removeAllProgressListeners) window.progressAPI.removeAllProgressListeners();
    hideEndpoints(e);
    const eContent = document.querySelector('#endpoint-content');
    let form = eContent.querySelector('#delete-conversations-subject-form');
    if (!form) {
        form = document.createElement('form');
        form.id = 'delete-conversations-subject-form';
        form.innerHTML = `
            <div>
                <h3>Delete conversations with specific subject</h3>
                <p>Provide a Canvas user ID and an exact subject. This will search sent conversations for that subject and delete them for all recipients.</p>
            </div>
            <div class="row align-items-center">
                <div class="col-auto"><label for="dcs-user-id" class="form-label">User ID</label></div>
                <div class="col-2"><input id="dcs-user-id" type="text" class="form-control"></div>
                <div class="col-auto"><span id="dcs-user-help" class="form-text" style="display:none;">Must be a number</span></div>
            </div>
            <div class="row align-items-center mt-2">
                <div class="col-auto"><label for="dcs-subject" class="form-label">Subject</label></div>
                <div class="col-4">
                    <input id="dcs-subject" type="text" class="form-control" placeholder="Exact subject text">
                    <div class="form-text">Exact match; case-sensitive.</div>
                </div>
            </div>
            <div class="row mt-3">
                <div class="col-auto"><button id="dcs-search" type="button" class="btn btn-primary" disabled>Search</button></div>
                <div class="col-auto"><button id="dcs-cancel-search" type="button" class="btn btn-outline-danger" disabled>Cancel</button></div>
            </div>
            <div hidden id="dcs-search-progress-div" class="mt-3">
                <p id="dcs-search-progress-info"></p>
            </div>
            <div id="dcs-search-result" class="mt-2"></div>
            <hr class="my-3" />
            <div class="row mt-2">
                <div class="col-auto"><button id="dcs-delete" type="button" class="btn btn-danger" disabled>Delete Found</button></div>
                <div class="col-auto"><button id="dcs-cancel-delete" type="button" class="btn btn-outline-secondary" disabled>Cancel</button></div>
            </div>
            <div hidden id="dcs-delete-progress-div" class="mt-3">
                <p id="dcs-delete-progress-info"></p>
                <div class="progress mt-1" style="width: 75%" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
            </div>
        `;
        eContent.append(form);
    }
    form.hidden = false;

    const userInput = form.querySelector('#dcs-user-id');
    const subjectInput = form.querySelector('#dcs-subject');
    const searchBtn = form.querySelector('#dcs-search');
    const cancelSearchBtn = form.querySelector('#dcs-cancel-search');
    const searchProgressDiv = form.querySelector('#dcs-search-progress-div');
    const searchProgressInfo = form.querySelector('#dcs-search-progress-info');
    const resultDiv = form.querySelector('#dcs-search-result');
    const deleteBtn = form.querySelector('#dcs-delete');
    const cancelDeleteBtn = form.querySelector('#dcs-cancel-delete');
    const deleteProgressDiv = form.querySelector('#dcs-delete-progress-div');
    const deleteProgressBar = deleteProgressDiv.querySelector('.progress-bar');
    const deleteProgressInfo = form.querySelector('#dcs-delete-progress-info');

    let foundMessages = [];

    const toggleSearchEnabled = () => {
        const validUser = userInput.value && !isNaN(Number(userInput.value.trim()));
        const validSubject = subjectInput.value && subjectInput.value.trim().length > 0;
        searchBtn.disabled = !(validUser && validSubject);
        form.querySelector('#dcs-user-help').style.display = validUser ? 'none' : 'inline';
    };
    userInput.addEventListener('input', toggleSearchEnabled);
    subjectInput.addEventListener('input', toggleSearchEnabled);
    toggleSearchEnabled();

    if (form.dataset.bound !== 'true') {
        searchBtn.addEventListener('click', async (evt) => {
            evt.preventDefault(); evt.stopPropagation();

            searchBtn.disabled = true; cancelSearchBtn.disabled = false; deleteBtn.disabled = true; resultDiv.innerHTML = '';
            searchProgressDiv.hidden = false; searchProgressInfo.textContent = 'Searching for conversations...';

            const domain = document.querySelector('#domain').value.trim();
            const token = document.querySelector('#token').value.trim();
            const user_id = userInput.value.trim();
            const subject = subjectInput.value.trim();
            let cancelled = false;
            const onCancel = async () => { cancelSearchBtn.disabled = true; try { await window.axios.cancelGetConvos(); } catch { } cancelled = true; searchProgressInfo.textContent = 'Cancelling search...'; };
            cancelSearchBtn.addEventListener('click', onCancel, { once: true });

            try {
                foundMessages = await window.axios.getConvos({ domain, token, user_id, subject });
                const count = Array.isArray(foundMessages) ? foundMessages.length : 0;
                resultDiv.innerHTML = cancelled ? '<p>Cancelled.</p>' : `<p>Found ${count} conversation(s) with that subject.</p>`;
                deleteBtn.disabled = !(count > 0);
            } catch (err) {
                resultDiv.innerHTML = '';
                errorHandler(err, searchProgressInfo);
            } finally {
                cancelSearchBtn.disabled = true; searchBtn.disabled = false;
            }
        });

        deleteBtn.addEventListener('click', async (evt) => {
            evt.preventDefault(); evt.stopPropagation(); if (!foundMessages || foundMessages.length === 0) return;

            const domain = document.querySelector('#domain').value.trim();
            const token = document.querySelector('#token').value.trim();

            deleteBtn.disabled = true; cancelDeleteBtn.disabled = false;
            deleteProgressDiv.hidden = false; deleteProgressBar.style.width = '0%'; deleteProgressInfo.textContent = `Deleting ${foundMessages.length} conversation(s)...`;

            // progress listener
            if (window.progressAPI) {
                window.progressAPI.onUpdateProgress((progress) => {
                    if (progress && typeof progress.value === 'number') {
                        deleteProgressBar.style.width = `${Math.round(progress.value * 100)}%`;
                    } else if (typeof progress === 'number') {
                        deleteProgressBar.style.width = `${Math.round(progress)}%`;
                    }
                });
            }

            let cancelled = false;
            const onCancelDelete = async () => { cancelDeleteBtn.disabled = true; try { await window.axios.cancelDeleteConvos(); } catch { } cancelled = true; deleteProgressInfo.textContent = 'Cancelling deletion...'; };
            cancelDeleteBtn.addEventListener('click', onCancelDelete, { once: true });

            try {
                const res = await window.axios.deleteConvos({ domain, token, messages: foundMessages });
                const success = res?.successful?.length || 0;
                const failed = res?.failed?.length || 0;
                deleteProgressBar.style.width = '100%';
                deleteProgressInfo.textContent = cancelled ? `Cancelled. Deleted ${success}, failed ${failed}.` : `Done. Deleted ${success}, failed ${failed}.`;
            } catch (err) {
                deleteProgressBar.parentElement.hidden = true; errorHandler(err, deleteProgressInfo);
            } finally {
                deleteBtn.disabled = false; cancelDeleteBtn.disabled = true;
            }
        });
        form.dataset.bound = 'true';
    }
}

async function downloadConvos(e) {
    hideEndpoints(e);
    const eContent = document.querySelector('#endpoint-content');
    let downloadConversationsForm = eContent.querySelector('#download-conversations-form');
    if (!downloadConversationsForm) {
        downloadConversationsForm = document.createElement('form');
        downloadConversationsForm.id = 'download-conversations-form';
        downloadConversationsForm.innerHTML = `
            <div>
                <h3>Download Conversations to CSV</h3>
            </div>
                <div class="row">
                    <div class="col-auto">
                        <label for="user-id" class="form-label">Canvas user ID</label>
                    </div>
                    <div class="col-2">
                        <input type="text" id="user-id" class="form-control" aria-desribedby="userChecker">
                    </div>
                    <div class="col-auto">
                        <span id="userChecker" class="form-text" style="display: none;">Must only contain numbers</span>
                    </div>
                </div>
                <div class="row align-items-center">
                    <div class="col-auto form-check form-switch mt-2 ms-3 mb-2">
                        <input id="delete-convos" class="form-check-input" type="checkbox" role="switch" />
                        <label for="deleted-convos" class="form-check-label">Only search for <em>Deleted</em> Conversations</label>
                            <div id="graded-help" class="form-text">
                                (otherwise this will search for active and deleted)
                            </div>
                    </div>
                    <div class="w-100"></div>
                    <div class="col-auto">
                        <label for="start-date" class="form-label">Start</label>
                    </div>
                    <div class="col-auto">
                        <input id="start-date" type="date" class="form-control">
                    </div>
                    <div class="col-auto">
                        <label for="end-date" class="form-label">End</label>
                    </div>
                    <div class="col-auto">
                        <input id="end-date" type="date" class="form-control">
                    </div>
                    <div class="w-100"></div>
                    <div class="col-auto">
                        <button type="button" class="btn btn-primary mt-3" id="convo-search">Search</button>
                    </div>
                </div>
            <div id="response-container" class="mt-5"></div>`;
        eContent.append(downloadConversationsForm);
    }
    downloadConversationsForm.hidden = false;
}

function flattenMessages(conversations) {
    const flattened = [];
    for (const conversation of conversations) {
        flattened.push({ id: conversation.id, subject: conversation.subject, workflow_state: conversation.workflow_state, last_message: conversation.last_message, last_message_at: conversation.last_message_at, message_count: conversation.message_count });
    }
    return flattened;
}

async function getConvos(e) {
    const eContent = document.querySelector('#endpoint-content');
    eContent.innerHTML = `
        <div>
            <h3>Get Conversations Between Two Users</h3>
        </div>
    `;
}