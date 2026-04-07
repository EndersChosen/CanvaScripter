// ****************************************
// Conversation endpoints UI (clean rebuild)
// ****************************************

async function conversationTemplate(e) {
    switch (e.target.id) {
        case 'delete-conversations-subject':
            return deleteConvos(e);
        case 'download-conversations-csv': // Not Complete\n            return downloadConvos(e);
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
            <style>
                #restore-deleted-conversations-form .card-title { font-size: 1.1rem; }
                #restore-deleted-conversations-form .card-header small { font-size: 0.75rem; }
                #restore-deleted-conversations-form .form-label { font-size: 0.85rem; }
                #restore-deleted-conversations-form .form-control { font-size: 0.85rem; }
                #restore-deleted-conversations-form .form-text { font-size: 0.7rem; }
                #restore-deleted-conversations-form .btn { font-size: 0.85rem; padding: 0.35rem 0.75rem; }
                #restore-deleted-conversations-form .bi { font-size: 0.9rem; }
                #restore-deleted-conversations-form .progress { height: 12px; }
                #restore-deleted-conversations-form .card-body { padding: 0.75rem; }
                #restore-deleted-conversations-form .gap-2 { gap: 0.5rem !important; }
                #restore-deleted-conversations-form .mt-2 { margin-top: 0.5rem !important; }
                #restore-deleted-conversations-form .mt-3 { margin-top: 0.5rem !important; }
                #restore-deleted-conversations-form .mt-1 { margin-top: 0.25rem !important; }
                #rdc-manual-table th { font-size: 0.8rem; padding: 0.35rem 0.5rem; }
                #rdc-manual-table td { padding: 0.25rem 0.35rem; vertical-align: middle; }
                #rdc-manual-table .form-control { font-size: 0.8rem; padding: 0.2rem 0.4rem; }
                #rdc-manual-table .btn-remove-row { padding: 0.15rem 0.4rem; font-size: 0.75rem; }
                #rdc-manual-table .row-number { font-size: 0.75rem; color: #888; width: 30px; text-align: center; }
            </style>
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-chat-dots me-1"></i>Restore Deleted Conversations
                    </h3>
                    <small class="text-muted">Restore deleted conversations by manual entry or file upload</small>
                </div>
                <div class="card-body">
                    <!-- Input Mode Selection -->
                    <div class="row mb-2">
                        <div class="col-12">
                            <label class="form-label fw-bold">
                                <i class="bi bi-input-cursor me-1"></i>Input Method
                            </label>
                            <div class="btn-group w-100" role="group" aria-label="Input method selection" id="rdc-mode-options">
                                <input type="radio" class="btn-check" name="rdc-input-mode" id="rdc-mode-manual" value="manual" checked>
                                <label class="btn btn-sm btn-outline-primary" for="rdc-mode-manual">
                                    <i class="bi bi-pencil-square me-1"></i>Manual
                                </label>
                                <input type="radio" class="btn-check" name="rdc-input-mode" id="rdc-mode-file" value="file">
                                <label class="btn btn-sm btn-outline-primary" for="rdc-mode-file">
                                    <i class="bi bi-file-earmark-arrow-up me-1"></i>File Upload
                                </label>
                            </div>
                        </div>
                    </div>
                    <!-- Manual Entry Section -->
                    <div id="rdc-manual-section">
                        <label class="form-label fw-bold mb-1">Enter conversation records</label>
                        <div style="max-height: 280px; overflow-y: auto; border: 1px solid #dee2e6; border-radius: 0.375rem;">
                            <table id="rdc-manual-table" class="table table-sm table-bordered mb-0" style="font-size: 0.85rem;">
                                <thead class="table-light" style="position: sticky; top: 0; z-index: 1;">
                                    <tr>
                                        <th class="row-number">#</th>
                                        <th>Message ID</th>
                                        <th>User ID</th>
                                        <th>Conversation ID</th>
                                        <th style="width: 40px;"></th>
                                    </tr>
                                </thead>
                                <tbody id="rdc-manual-tbody">
                                    <tr>
                                        <td class="row-number">1</td>
                                        <td><input type="text" class="form-control rdc-msg-id" placeholder="e.g. 123456" inputmode="numeric"></td>
                                        <td><input type="text" class="form-control rdc-usr-id" placeholder="e.g. 789012" inputmode="numeric"></td>
                                        <td><input type="text" class="form-control rdc-conv-id" placeholder="e.g. 345678" inputmode="numeric"></td>
                                        <td><button type="button" class="btn btn-sm btn-outline-danger btn-remove-row" title="Remove row"><i class="bi bi-x"></i></button></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div class="d-flex align-items-center gap-2 mt-1">
                            <button id="rdc-add-row" type="button" class="btn btn-sm btn-outline-secondary">
                                <i class="bi bi-plus-circle me-1"></i>Add Row
                            </button>
                            <span id="rdc-row-count" class="form-text">1 row</span>
                        </div>
                    </div>
                    <!-- File Upload Section -->
                    <div id="rdc-file-section" hidden>
                        <div class="row align-items-center mt-2">
                            <div class="col-auto">
                                <button id="rdc-upload" type="button" class="btn btn-sm btn-secondary">Choose CSV/ZIP/JSON</button>
                            </div>
                            <div class="col-auto">
                                <span id="rdc-upload-info" class="form-text"></span>
                            </div>
                        </div>
                        <div class="form-text mt-1">Upload CSV, ZIP of CSVs, or JSON with objects: { message_id, user_id, conversation_id }</div>
                    </div>
                    <div class="row mt-2">
                        <div class="col-auto">
                            <button id="rdc-restore" type="button" class="btn btn-sm btn-primary" disabled>Restore</button>
                        </div>
                        <div class="col-auto">
                            <button id="rdc-cancel" type="button" class="btn btn-sm btn-outline-danger" disabled>Cancel</button>
                        </div>
                        <div class="col-auto">
                            <button id="rdc-clear" type="button" class="btn btn-sm btn-outline-secondary">Clear</button>
                        </div>
                    </div>
                    <div hidden id="rdc-progress-div" class="mt-2">
                        <p id="rdc-progress-info"></p>
                        <div class="progress mt-1" style="width: 75%; height: 12px;" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                            <div class="progress-bar" style="width: 0%"></div>
                        </div>
                    </div>
                    <div id="rdc-response" class="mt-2"></div>
                </div>
            </div>
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
    const manualSection = form.querySelector('#rdc-manual-section');
    const fileSection = form.querySelector('#rdc-file-section');
    const manualTbody = form.querySelector('#rdc-manual-tbody');
    const addRowBtn = form.querySelector('#rdc-add-row');
    const rowCountSpan = form.querySelector('#rdc-row-count');
    const modeRadios = form.querySelectorAll('input[name="rdc-input-mode"]');
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
        // ── Manual table helpers ──
        function createManualRow() {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="row-number"></td>
                <td><input type="text" class="form-control rdc-msg-id" placeholder="e.g. 123456" inputmode="numeric"></td>
                <td><input type="text" class="form-control rdc-usr-id" placeholder="e.g. 789012" inputmode="numeric"></td>
                <td><input type="text" class="form-control rdc-conv-id" placeholder="e.g. 345678" inputmode="numeric"></td>
                <td><button type="button" class="btn btn-sm btn-outline-danger btn-remove-row" title="Remove row"><i class="bi bi-x"></i></button></td>
            `;
            return tr;
        }
        function renumberRows() {
            const rows = manualTbody.querySelectorAll('tr');
            rows.forEach((tr, i) => { tr.querySelector('.row-number').textContent = i + 1; });
            rowCountSpan.textContent = `${rows.length} row${rows.length !== 1 ? 's' : ''}`;
        }
        function updateManualRestoreState() {
            const mode = form.querySelector('input[name="rdc-input-mode"]:checked').value;
            if (mode !== 'manual') return;
            const rows = manualTbody.querySelectorAll('tr');
            let hasAnyValue = false;
            rows.forEach(tr => {
                const m = tr.querySelector('.rdc-msg-id')?.value.trim();
                const u = tr.querySelector('.rdc-usr-id')?.value.trim();
                const c = tr.querySelector('.rdc-conv-id')?.value.trim();
                if (m || u || c) hasAnyValue = true;
            });
            restoreBtn.disabled = !hasAnyValue;
        }

        // Add Row button
        addRowBtn.addEventListener('click', (evt) => {
            evt.preventDefault();
            const tr = createManualRow();
            manualTbody.appendChild(tr);
            renumberRows();
            tr.querySelector('.rdc-msg-id').focus();
        });

        // Remove Row (delegated)
        manualTbody.addEventListener('click', (evt) => {
            const btn = evt.target.closest('.btn-remove-row');
            if (!btn) return;
            const tr = btn.closest('tr');
            if (manualTbody.querySelectorAll('tr').length <= 1) {
                // Don't remove last row, just clear it
                tr.querySelectorAll('input').forEach(inp => { inp.value = ''; });
            } else {
                tr.remove();
            }
            renumberRows();
            updateManualRestoreState();
        });

        // Track input changes for enabling Restore button
        manualTbody.addEventListener('input', () => { updateManualRestoreState(); });

        // Mode toggle: Manual vs File Upload
        modeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                const mode = form.querySelector('input[name="rdc-input-mode"]:checked').value;
                manualSection.hidden = mode !== 'manual';
                fileSection.hidden = mode !== 'file';
                // Reset records when switching modes
                records = [];
                restoreBtn.disabled = true;
                uploadInfo.textContent = '';
                // Reset manual table to one empty row
                manualTbody.innerHTML = '';
                manualTbody.appendChild(createManualRow());
                renumberRows();
                responseDiv.innerHTML = '';
                progressInfo.innerHTML = '';
                progressBar.style.width = '0%';
                progressDiv.hidden = true;
            });
        });

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
            evt.preventDefault(); evt.stopPropagation();
            const currentMode = form.querySelector('input[name="rdc-input-mode"]:checked').value;

            // ── Manual mode: parse rows from the table ──
            if (currentMode === 'manual') {
                const tableRows = manualTbody.querySelectorAll('tr');
                records = [];
                const invalidRows = [];
                tableRows.forEach((tr, i) => {
                    const msgVal = tr.querySelector('.rdc-msg-id')?.value.trim();
                    const usrVal = tr.querySelector('.rdc-usr-id')?.value.trim();
                    const convVal = tr.querySelector('.rdc-conv-id')?.value.trim();
                    // Skip completely empty rows
                    if (!msgVal && !usrVal && !convVal) return;
                    const message_id = parseCanvasId(msgVal);
                    const user_id = parseCanvasId(usrVal);
                    const conversation_id = parseCanvasId(convVal);
                    if (message_id && user_id && conversation_id) {
                        records.push({ message_id, user_id, conversation_id, _sourceFile: 'Manual Entry', _rowNumber: i + 1 });
                    } else {
                        const missing = [];
                        if (!message_id) missing.push('Message ID');
                        if (!user_id) missing.push('User ID');
                        if (!conversation_id) missing.push('Conversation ID');
                        invalidRows.push({ row: i + 1, missing });
                    }
                });
                if (records.length === 0) {
                    progressDiv.hidden = false; progressBar.style.width = '0%';
                    let msg = 'No valid records found. Each row must have numeric values for all three fields.';
                    if (invalidRows.length > 0) msg += `<br><small>${invalidRows.length} row(s) have invalid or missing values.</small>`;
                    progressInfo.innerHTML = msg;
                    return;
                }
                if (invalidRows.length > 0) {
                    responseDiv.innerHTML = `<div class="text-warning"><small><i class="bi bi-exclamation-triangle me-1"></i>${invalidRows.length} row(s) skipped (missing or non-numeric values)</small></div>`;
                }
            }

            // ── File Upload mode: existing CSV/ZIP/JSON restore logic ──
            if (records.length === 0) return;
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
            // Reset manual table to one empty row
            manualTbody.innerHTML = '';
            manualTbody.appendChild(createManualRow());
            renumberRows();
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
            <style>
                #get-deleted-conversations-form .card-title { font-size: 1.1rem; }
                #get-deleted-conversations-form .card-header small { font-size: 0.75rem; }
                #get-deleted-conversations-form .form-label { font-size: 0.85rem; font-weight: 600; }
                #get-deleted-conversations-form .form-control,
                #get-deleted-conversations-form .form-select { font-size: 0.85rem; padding: 0.25rem 0.5rem; }
                #get-deleted-conversations-form .form-text { font-size: 0.7rem; }
                #get-deleted-conversations-form .btn { font-size: 0.85rem; padding: 0.35rem 0.75rem; }
                #get-deleted-conversations-form .bi { font-size: 0.9rem; }
                #get-deleted-conversations-form .card-body { padding: 0.75rem; }
                #get-deleted-conversations-form .progress { height: 12px; }
                #get-deleted-conversations-form .gap-2 { gap: 0.5rem !important; }
                #get-deleted-conversations-form .g-3 { gap: 0.5rem !important; }
                #get-deleted-conversations-form .mb-2 { margin-bottom: 0.5rem !important; }
                #get-deleted-conversations-form .mb-3 { margin-bottom: 0.5rem !important; }
                #get-deleted-conversations-form .mb-4 { margin-bottom: 0.5rem !important; }
                #get-deleted-conversations-form .mt-2 { margin-top: 0.5rem !important; }
                #get-deleted-conversations-form .mt-3 { margin-top: 0.5rem !important; }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .spin {
                    animation: spin 1s linear infinite;
                    display: inline-block;
                }
            </style>
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-search me-1"></i>Get Deleted Conversations
                    </h3>
                    <small class="text-muted">Fetch deleted conversations for a user, optionally filtered by deleted_before/after</small>
                </div>
                <div class="card-body">
                    <!-- Query Type Selection -->
                    <div class="row g-3 mb-3">
                        <div class="col-12">
                            <label class="form-label fw-bold">
                                <i class="bi bi-list me-1"></i>Query Type
                            </label>
                            <div class="btn-group w-100" role="group" aria-label="Query type selection" id="gdc-query-options">
                                <input type="radio" class="btn-check" name="gdc-query-type" id="gdc-single-chkbx" value="single" checked>
                                <label class="btn btn-sm btn-outline-primary" for="gdc-single-chkbx">
                                    <i class="bi bi-person me-1"></i>Single User
                                </label>
                                
                                <input type="radio" class="btn-check" name="gdc-query-type" id="gdc-bulk-chkbx" value="bulk">
                                <label class="btn btn-sm btn-outline-primary" for="gdc-bulk-chkbx">
                                    <i class="bi bi-people me-1"></i>Bulk Users
                                </label>
                            </div>
                        </div>
                    </div>

                    <!-- Single User Section -->
                    <div id="gdc-single-section">
                        <div class="row align-items-center mb-2">
                            <div class="col-auto">
                                <label for="gdc-user-id" class="form-label fw-bold">
                                    <i class="bi bi-person-badge me-1"></i>User ID
                                </label>
                            </div>
                            <div class="col-2">
                                <input id="gdc-user-id" type="text" class="form-control form-control-sm" aria-describedby="gdc-user-help" />
                            </div>
                            <div class="col-auto">
                                <span id="gdc-user-help" class="form-text text-danger" style="display:none;">
                                    <i class="bi bi-exclamation-circle me-1"></i>Must only contain numbers
                                </span>
                            </div>
                        </div>

                        <!-- Date Filters -->
                        <div class="row align-items-center mb-2">
                            <div class="col-auto">
                                <label for="gdc-deleted-after" class="form-label fw-bold">
                                    <i class="bi bi-calendar-range me-1"></i>Date Range (Optional)
                                </label>
                            </div>
                        </div>
                        <div class="row align-items-center mb-3">
                            <div class="col-auto">
                                <label for="gdc-deleted-after" class="form-label">Deleted After</label>
                            </div>
                            <div class="col-auto">
                                <input id="gdc-deleted-after" type="date" class="form-control form-control-sm" />
                            </div>
                            <div class="col-auto">
                                <label for="gdc-deleted-before" class="form-label">Deleted Before</label>
                            </div>
                            <div class="col-auto">
                                <input id="gdc-deleted-before" type="date" class="form-control form-control-sm" />
                            </div>
                        </div>

                        <div class="row mb-2">
                            <div class="col-md-6">
                                <div class="d-flex gap-2">
                                    <button id="gdc-search" type="button" class="btn btn-sm btn-success" disabled>
                                        <i class="bi bi-search me-1"></i>Get Deleted
                                    </button>
                                    <button id="gdc-cancel-single" type="button" class="btn btn-sm btn-outline-danger" disabled>
                                        <i class="bi bi-x-circle me-1"></i>Cancel
                                    </button>
                                    <button id="gdc-export-csv" type="button" class="btn btn-sm btn-secondary" hidden>
                                        <i class="bi bi-download me-1"></i>Export to CSV
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Bulk Section -->
                    <div id="gdc-bulk-section" class="d-none">
                        <div class="row align-items-center mb-2">
                            <div class="col-auto">
                                <label class="form-label fw-bold">
                                    <i class="bi bi-file-earmark-text me-1"></i>Upload User List
                                </label>
                            </div>
                            <div class="col-auto">
                                <button id="gdc-upload" type="button" class="btn btn-sm btn-secondary">
                                    <i class="bi bi-upload me-1"></i>Choose File (TXT/CSV)
                                </button>
                            </div>
                            <div class="col-auto">
                                <span id="gdc-upload-info" class="form-text"></span>
                            </div>
                        </div>

                        <!-- Date Filters -->
                        <div class="row align-items-center mb-2">
                            <div class="col-auto">
                                <label class="form-label fw-bold">
                                    <i class="bi bi-calendar-range me-1"></i>Date Range (Optional)
                                </label>
                            </div>
                        </div>
                        <div class="row align-items-center mb-3">
                            <div class="col-auto">
                                <label for="gdc-bulk-deleted-after" class="form-label">Deleted After</label>
                            </div>
                            <div class="col-auto">
                                <input id="gdc-bulk-deleted-after" type="date" class="form-control form-control-sm" />
                            </div>
                            <div class="col-auto">
                                <label for="gdc-bulk-deleted-before" class="form-label">Deleted Before</label>
                            </div>
                            <div class="col-auto">
                                <input id="gdc-bulk-deleted-before" type="date" class="form-control form-control-sm" />
                            </div>
                        </div>

                        <div class="row mb-2">
                            <div class="col-12">
                                <label for="gdc-output-path" class="form-label fw-bold">
                                    <i class="bi bi-folder me-1"></i>Output Folder
                                </label>
                                <div class="input-group">
                                    <input type="text" id="gdc-output-path" class="form-control form-control-sm" placeholder="Select output folder..." readonly>
                                    <button type="button" id="gdc-browse-folder" class="btn btn-sm btn-outline-secondary">
                                        <i class="bi bi-folder2-open me-1"></i>Browse
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="row mb-2">
                            <div class="col-md-6">
                                <div class="d-flex gap-2">
                                    <button id="gdc-export-multi" type="button" class="btn btn-sm btn-success" disabled>
                                        <i class="bi bi-file-earmark-arrow-down me-1"></i>Export for Users
                                    </button>
                                    <button id="gdc-cancel-bulk" type="button" class="btn btn-sm btn-outline-danger" disabled>
                                        <i class="bi bi-x-circle me-1"></i>Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Progress Card (Single) -->
            <div class="card mt-2" id="gdc-single-progress-card" hidden>
                <div class="card-header">
                    <h5 class="card-title mb-0">
                        <i class="bi bi-gear me-1"></i>Fetching Deleted Conversations
                    </h5>
                </div>
                <div class="card-body">
                    <p id="gdc-single-progress-info" class="mb-2"></p>
                    <div class="progress mb-2" style="height: 12px;">
                        <div class="progress-bar progress-bar-striped progress-bar-animated" 
                             style="width: 0%" role="progressbar" 
                             aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                        </div>
                    </div>
                </div>
            </div>

            <!-- Progress Card (Bulk) -->
            <div class="card mt-2" id="gdc-bulk-progress-card" hidden>
                <div class="card-header">
                    <h5 class="card-title mb-0">
                        <i class="bi bi-gear me-1"></i>Bulk Export Progress
                    </h5>
                </div>
                <div class="card-body">
                    <p id="gdc-bulk-progress-info" class="mb-2"></p>
                    <div class="progress mb-2" style="height: 12px;">
                        <div class="progress-bar progress-bar-striped progress-bar-animated" 
                             style="width: 0%" role="progressbar" 
                             aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Results Card -->
            <div class="card mt-2" id="gdc-response-card" hidden>
                <div class="card-body" id="gdc-response"></div>
            </div>
        `;
        eContent.append(form);
    }
    form.hidden = false;

    // Get references to all sections and elements
    const singleSection = form.querySelector('#gdc-single-section');
    const bulkSection = form.querySelector('#gdc-bulk-section');
    const singleChkbx = form.querySelector('#gdc-single-chkbx');
    const bulkChkbx = form.querySelector('#gdc-bulk-chkbx');
    const queryOptions = form.querySelector('#gdc-query-options');

    const userInput = form.querySelector('#gdc-user-id');
    const searchBtn = form.querySelector('#gdc-search');
    const cancelSingleBtn = form.querySelector('#gdc-cancel-single');
    const singleProgressCard = form.querySelector('#gdc-single-progress-card');
    const singleProgressBar = singleProgressCard.querySelector('.progress-bar');
    const singleProgressInfo = form.querySelector('#gdc-single-progress-info');

    const bulkProgressCard = form.querySelector('#gdc-bulk-progress-card');
    const bulkProgressBar = bulkProgressCard.querySelector('.progress-bar');
    const bulkProgressInfo = form.querySelector('#gdc-bulk-progress-info');
    const responseDiv = form.querySelector('#gdc-response');
    const responseCard = form.querySelector('#gdc-response-card');

    const uploadBtn = form.querySelector('#gdc-upload');
    const uploadInfo = form.querySelector('#gdc-upload-info');
    const browseFolderBtn = form.querySelector('#gdc-browse-folder');
    const outputPathInput = form.querySelector('#gdc-output-path');
    const exportMultiBtn = form.querySelector('#gdc-export-multi');
    const cancelBulkBtn = form.querySelector('#gdc-cancel-bulk');
    const exportBtn = form.querySelector('#gdc-export-csv');

    let bulkUserIds = []; let outputFolder = '';
    let lastResultsForCsv = []; let lastUserIdForCsv = '';

    const updateExportEnabled = () => {
        const domain = document.querySelector('#domain')?.value?.trim() || '';
        const token = document.querySelector('#token')?.value?.trim() || '';
        exportMultiBtn.disabled = !(bulkUserIds.length > 0 && !!outputFolder && domain && token);
    };

    const toggleBtn = () => {
        const isValid = userInput.value && userInput.value.trim() !== '' && !isNaN(Number(userInput.value.trim()));
        const isEmpty = !userInput.value || userInput.value.trim() === '';
        searchBtn.disabled = !isValid;
        // Only show warning if user has typed something invalid (not empty)
        form.querySelector('#gdc-user-help').style.display = (!isEmpty && !isValid) ? 'inline' : 'none';
    };

    // Handle query type switching
    function handleQueryTypeChange(e) {
        // Hide all sections first
        singleSection.classList.add('d-none');
        bulkSection.classList.add('d-none');

        // Clear response and progress
        responseDiv.innerHTML = '';
        responseCard.hidden = true;
        singleProgressCard.hidden = true;
        bulkProgressCard.hidden = true;
        exportBtn.hidden = true;

        // Show appropriate section
        if (singleChkbx.checked) {
            singleSection.classList.remove('d-none');
            toggleBtn(); // Update button state
        } else if (bulkChkbx.checked) {
            bulkSection.classList.remove('d-none');
            updateExportEnabled(); // Update button state
        }
    }

    // setup event listeners
    if (form.dataset.bound !== 'true') {
        // Query type toggle
        queryOptions.addEventListener('change', handleQueryTypeChange);

        // Listen for domain and token changes to update bulk export button state
        const domainInput = document.querySelector('#domain');
        const tokenInput = document.querySelector('#token');
        if (domainInput) {
            domainInput.addEventListener('input', () => {
                if (bulkChkbx.checked) {
                    updateExportEnabled();
                }
            });
        }
        if (tokenInput) {
            tokenInput.addEventListener('input', () => {
                if (bulkChkbx.checked) {
                    updateExportEnabled();
                }
            });
        }

        userInput.addEventListener('input', toggleBtn);
        searchBtn.addEventListener('click', async (evt) => {
            evt.preventDefault();
            evt.stopPropagation();

            searchBtn.disabled = true;
            cancelSingleBtn.disabled = false;
            responseDiv.innerHTML = '';
            responseCard.hidden = true;
            singleProgressCard.hidden = false;
            singleProgressBar.style.width = '100%';
            singleProgressInfo.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Searching for deleted conversations...';

            const domain = document.querySelector('#domain').value.trim();
            const token = document.querySelector('#token').value.trim();
            const user_id = userInput.value.trim();
            const deleted_after = form.querySelector('#gdc-deleted-after').value.trim();
            const deleted_before = form.querySelector('#gdc-deleted-before').value.trim();

            let cancelled = false;
            const onCancel = async () => {
                cancelSingleBtn.disabled = true;
                try {
                    await window.axios.cancelGetDeletedConversations();
                } catch { }

                singleProgressInfo.innerHTML = 'Cancelling...';
                cancelled = true;
            };
            cancelSingleBtn.addEventListener('click', onCancel, { once: true });

            try {
                const params = { domain, token, user_id };
                const toStartOfDayISO = (d) => d ? new Date(`${d}T00:00:00`).toISOString() : undefined;
                const toEndOfDayISO = (d) => d ? new Date(`${d}T23:59:59.999`).toISOString() : undefined;
                const afterISO = toStartOfDayISO(deleted_after);
                const beforeISO = toEndOfDayISO(deleted_before);

                if (afterISO) {
                    params.deleted_after = afterISO;
                    if (beforeISO) params.deleted_before = beforeISO;
                }

                const results = await window.axios.getDeletedConversations(params);
                const count = results.length;

                // Count unique attachments
                const uniqueAttIds = new Set();
                results.forEach(msg => {
                    if (msg.attachments && Array.isArray(msg.attachments)) {
                        msg.attachments.forEach(att => uniqueAttIds.add(att.id));
                    }
                });
                const totalAtts = uniqueAttIds.size;
                const attSummary = totalAtts > 0 ? ` and ${totalAtts} attachment(s)` : '';
                singleProgressInfo.innerHTML = cancelled ? `Cancelled.` : `<i class="bi bi-check-circle text-success"></i> Found ${count} deleted conversation(s)${attSummary}.`;
                singleProgressBar.style.width = '100%';

                if (count > 0) {
                    lastResultsForCsv = results;
                    lastUserIdForCsv = user_id;
                    exportBtn.hidden = false;
                } else {
                    exportBtn.hidden = true;
                    lastResultsForCsv = [];
                    lastUserIdForCsv = '';
                }
            } catch (error) {
                if (String(error?.name) === 'AbortError' || String(error?.message).includes('Aborted')) {
                    singleProgressCard.hidden = true;
                    singleProgressInfo.innerHTML = 'Cancelled.';
                } else {
                    singleProgressInfo.innerHTML = '';
                    errorHandler(error, singleProgressInfo);
                }
            } finally {
                searchBtn.disabled = false; cancelSingleBtn.disabled = true;
            }
        });

        // CSV export for single user
        exportBtn.addEventListener('click', async (e2) => {
            e2.preventDefault();
            e2.stopPropagation();
            if (!lastResultsForCsv || lastResultsForCsv.length === 0)
                return;

            const defaultFileName = `deleted_conversations_${lastUserIdForCsv}.csv`;

            try {
                const sanitized = lastResultsForCsv.map((item) => {
                    const row = {};
                    for (const key of Object.keys(item)) {
                        const val = item[key];
                        if (key === 'attachments' && Array.isArray(val)) {
                            const pairs = val.map(att => `${att.id}:${att.url}`).join('; ');
                            row[key] = pairs;
                            row['file_id'] = val.map(att => att.id).join('; ');
                            row['file_name'] = val.map(att => att.display_name || att.filename || '').join('; ');
                        } else if (key === 'participating_user_ids' && Array.isArray(val)) {
                            row[key] = val.join('; ');
                        } else if (val !== null && typeof val === 'object') {
                            row[key] = JSON.stringify(val);
                        } else {
                            row[key] = val;
                        }
                    }
                    if (!('file_id' in row)) { row['file_id'] = ''; row['file_name'] = ''; }
                    return row;
                });

                const allKeys = Array.from(new Set(sanitized.flatMap(obj => Object.keys(obj))));
                if (!allKeys.includes('deleted_at')) {
                    allKeys.push('deleted_at');
                }
                if (sanitized.length > 0) {
                    const first = sanitized[0];
                    const headerCompleteFirst = {};
                    for (const k of allKeys) {
                        headerCompleteFirst[k] = Object.prototype.hasOwnProperty.call(first, k) ? first[k] : '';
                    }
                    const data = [headerCompleteFirst, ...sanitized.slice(1).map(obj => {
                        const full = {};
                        for (const k of allKeys) {
                            full[k] = Object.prototype.hasOwnProperty.call(obj, k) ? obj[k] : '';
                        }
                        return full;
                    })];

                    // Use csv.sendToCSV with save dialog option
                    const result = await window.csv.sendToCSV({
                        fileName: defaultFileName,
                        data,
                        showSaveDialog: true
                    });

                    // Show success message if file was saved
                    if (result && result.filePath) {
                        const expAttIds = new Set();
                        lastResultsForCsv.forEach(msg => {
                            if (msg.attachments && Array.isArray(msg.attachments)) {
                                msg.attachments.forEach(att => expAttIds.add(att.id));
                            }
                        });
                        const expAttSummary = expAttIds.size > 0 ? ` and ${expAttIds.size} attachment(s)` : '';
                        singleProgressInfo.innerHTML = `Found ${lastResultsForCsv.length} deleted conversation(s)${expAttSummary}. Exported to: ${result.filePath}`;
                    }
                }
            } catch (error) {
                errorHandler(error, singleProgressInfo);
            }
        });

        // Bulk upload user IDs
        uploadBtn.addEventListener('click', async (evt) => {
            evt.preventDefault();
            evt.stopPropagation();

            uploadBtn.disabled = true;
            uploadInfo.textContent = '';

            try {
                if (window.fileUpload && typeof window.fileUpload.getUserIdsFromFile === 'function') {
                    const ids = await window.fileUpload.getUserIdsFromFile();
                    if (ids === 'cancelled') {
                        uploadInfo.textContent = 'Cancelled.';
                        return;
                    }

                    bulkUserIds = Array.from(new Set(ids.map((v) => Number(v)).filter((n) => !isNaN(n))));
                    uploadInfo.textContent = `Found ${bulkUserIds.length} user(s).`;
                    updateExportEnabled();
                } else {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.txt,.csv,text/plain,text/csv';
                    input.onchange = async () => {
                        try {
                            const file = input.files && input.files[0];
                            if (!file) return;
                            const text = await file.text();
                            const tokens = text.split(/\r?\n|\r|,|\s+/).filter(Boolean);
                            const numeric = tokens.map((v) => Number(v)).filter((n) => !isNaN(n));
                            bulkUserIds = Array.from(new Set(numeric));
                            uploadInfo.textContent = `Found ${bulkUserIds.length} user(s).`;
                            updateExportEnabled();
                        } catch (err) {
                            errorHandler(err, uploadInfo);
                        }
                    };
                    input.click();
                }
            } catch (error) {
                errorHandler(error, uploadInfo);
            } finally {
                uploadBtn.disabled = false;
            }
        });

        // Browse for output folder
        browseFolderBtn.addEventListener('click', async (evt) => {
            evt.preventDefault();
            evt.stopPropagation();

            try {
                const selected = await window.electronAPI.selectFolder();
                if (selected) {
                    outputFolder = selected;
                    outputPathInput.value = outputFolder;
                    updateExportEnabled();
                }
            } catch (error) {
                errorHandler(error, outputPathInput);
            }
        });

        // Export selected users
        exportMultiBtn.addEventListener('click', async (evt) => {
            evt.preventDefault();
            evt.stopPropagation();

            if (bulkUserIds.length === 0) return;
            if (!outputFolder) {
                bulkProgressCard.hidden = false;
                bulkProgressInfo.textContent = 'Please choose an output folder first.';
                return;
            }
            exportMultiBtn.disabled = true;
            cancelBulkBtn.disabled = false;
            bulkProgressCard.hidden = false;
            bulkProgressBar.style.width = '0%';
            bulkProgressInfo.innerHTML = `Exporting for ${bulkUserIds.length} user(s)...`;

            const domain = document.querySelector('#domain').value.trim();
            const token = document.querySelector('#token').value.trim();
            const deleted_after = form.querySelector('#gdc-bulk-deleted-after').value.trim();
            const deleted_before = form.querySelector('#gdc-bulk-deleted-before').value.trim();
            const toStartOfDayISO = (d) => d ? new Date(`${d}T00:00:00`).toISOString() : undefined;
            const toEndOfDayISO = (d) => d ? new Date(`${d}T23:59:59.999`).toISOString() : undefined;
            let completed = 0;
            let exported = 0;
            let skipped = 0;
            let totalBulkAttachments = 0;
            let cancelled = false;
            const skippedDetails = []; // Track details about skipped requests

            const onCancelBulk = async () => {
                cancelBulkBtn.disabled = true;
                try { await window.axios.cancelGetDeletedConversations(); } catch { }
                cancelled = true;
                bulkProgressInfo.innerHTML = 'Cancelling...';
            };

            cancelBulkBtn.addEventListener('click', onCancelBulk, { once: true });
            for (const uid of bulkUserIds) { // sequential to avoid rate limits
                if (cancelled) break;
                try {
                    const params = { domain, token, user_id: String(uid) };
                    const afterISO = toStartOfDayISO(deleted_after);
                    const beforeISO = toEndOfDayISO(deleted_before);
                    if (afterISO) params.deleted_after = afterISO;
                    if (beforeISO) params.deleted_before = beforeISO;
                    const results = await window.axios.getDeletedConversations(params);
                    if (results.length > 0) {
                        const sanitized = results.map((item) => {
                            const row = {};
                            for (const key of Object.keys(item)) {
                                const val = item[key];
                                if (key === 'attachments' && Array.isArray(val)) {
                                    const pairs = val.map(att => `${att.id}:${att.url}`).join('; ');
                                    row[key] = pairs;
                                    row['file_id'] = val.map(att => att.id).join('; ');
                                    row['file_name'] = val.map(att => att.display_name || att.filename || '').join('; ');
                                } else if (val !== null && typeof val === 'object') {
                                    row[key] = JSON.stringify(val);
                                } else {
                                    row[key] = val;
                                }
                            }
                            if (!('file_id' in row)) { row['file_id'] = ''; row['file_name'] = ''; }
                            return row;
                        });

                        const allKeys = Array.from(new Set(sanitized.flatMap(obj => Object.keys(obj))));
                        if (!allKeys.includes('deleted_at')) allKeys.push('deleted_at');
                        const first = sanitized[0];
                        const headerCompleteFirst = {};
                        for (const k of allKeys) headerCompleteFirst[k] = Object.prototype.hasOwnProperty.call(first, k) ? first[k] : '';

                        const data = [headerCompleteFirst, ...sanitized.slice(1).map(obj => {
                            const full = {};
                            for (const k of allKeys) full[k] = Object.prototype.hasOwnProperty.call(obj, k) ? obj[k] : '';
                            return full;
                        })];
                        const fileName = `deleted_conversations_${uid}.csv`;
                        const fullPath = `${outputFolder.replace(/[\\/]+$/, '')}\\${fileName}`;
                        await window.csv.writeAtPath(fullPath, data);
                        exported++;
                        // Count unique attachments for this user
                        const bulkAttIds = new Set();
                        results.forEach(msg => {
                            if (msg.attachments && Array.isArray(msg.attachments)) {
                                msg.attachments.forEach(att => bulkAttIds.add(att.id));
                            }
                        });
                        totalBulkAttachments += bulkAttIds.size;
                    } else {
                        skipped++;
                        const requestUrl = `${domain}/api/v1/users/${uid}/deleted_conversations`;
                        skippedDetails.push({ userId: uid, url: requestUrl, reason: 'No deleted conversations found' });
                    }
                } catch (err) {
                    if (String(err?.name) === 'AbortError' || String(err?.message).includes('Aborted')) {
                        cancelled = true;
                    }
                    else {
                        skipped++;
                        const requestUrl = `${domain}/api/v1/users/${uid}/deleted_conversations`;
                        const errorMessage = err?.message || err?.response?.data?.message || String(err);
                        skippedDetails.push({ userId: uid, url: requestUrl, reason: `Error: ${errorMessage}` });
                    }
                } finally {
                    completed++;
                    const pct = Math.round((completed / bulkUserIds.length) * 100);
                    bulkProgressBar.style.width = `${pct}%`;
                    if (!cancelled) {
                        const attNote = totalBulkAttachments > 0 ? ` Attachments: ${totalBulkAttachments}.` : '';
                        bulkProgressInfo.innerHTML = `Processed ${completed}/${bulkUserIds.length}. Exported: ${exported}/${bulkUserIds.length}. Skipped: ${skipped}/${bulkUserIds.length}.${attNote}`;
                    } else {
                        bulkProgressInfo.innerHTML = `Cancelling... Processed ${completed}/${bulkUserIds.length}. Exported: ${exported}/${bulkUserIds.length}. Skipped: ${skipped}/${bulkUserIds.length}.`;
                    }
                }
            }
            exportMultiBtn.disabled = false; cancelBulkBtn.disabled = true;

            // Build final summary with skipped details
            const bulkAttNote = totalBulkAttachments > 0 ? ` Attachments: ${totalBulkAttachments}.` : '';
            let summaryHTML = cancelled
                ? `Cancelled. Processed ${completed}/${bulkUserIds.length}. Exported: ${exported}/${bulkUserIds.length}. Skipped: ${skipped}/${bulkUserIds.length}.${bulkAttNote}`
                : `Done. Processed ${completed}/${bulkUserIds.length}. Exported: ${exported}/${bulkUserIds.length}. Skipped: ${skipped}/${bulkUserIds.length}.${bulkAttNote}`;

            if (skippedDetails.length > 0) {
                const maxDisplay = 5;
                const displayCount = Math.min(skippedDetails.length, maxDisplay);

                summaryHTML += '<br><br><strong>Skipped Details:</strong><ul style="margin-top: 0.5rem;">';
                for (let i = 0; i < displayCount; i++) {
                    const detail = skippedDetails[i];
                    summaryHTML += `<li><strong>User ID ${detail.userId}</strong> - ${detail.reason}<br><small class="text-muted">${detail.url}</small></li>`;
                }
                summaryHTML += '</ul>';

                if (skippedDetails.length > maxDisplay) {
                    summaryHTML += `<p class="text-muted">...and ${skippedDetails.length - maxDisplay} more skipped request(s).</p>`;
                }

                // Add download button for full error log
                summaryHTML += '<button id="gdc-download-errors" type="button" class="btn btn-sm btn-outline-secondary mt-2"><i class="bi bi-download me-1"></i>Download Full Error Log (CSV)</button>';
            }

            bulkProgressInfo.innerHTML = summaryHTML;

            // Attach event listener for download errors button
            if (skippedDetails.length > 0) {
                const downloadErrorsBtn = bulkProgressInfo.querySelector('#gdc-download-errors');
                if (downloadErrorsBtn) {
                    downloadErrorsBtn.addEventListener('click', async () => {
                        try {
                            const errorData = skippedDetails.map(detail => ({
                                user_id: detail.userId,
                                request_url: detail.url,
                                reason: detail.reason
                            }));

                            const defaultFileName = `bulk_export_errors_${new Date().toISOString().split('T')[0]}.csv`;
                            const result = await window.csv.sendToCSV({
                                fileName: defaultFileName,
                                data: errorData,
                                showSaveDialog: true
                            });

                            if (result && result.filePath) {
                                downloadErrorsBtn.textContent = '✓ Downloaded';
                                downloadErrorsBtn.classList.remove('btn-outline-secondary');
                                downloadErrorsBtn.classList.add('btn-success');
                                downloadErrorsBtn.disabled = true;
                            }
                        } catch (error) {
                            console.error('Error downloading error log:', error);
                            downloadErrorsBtn.textContent = '✗ Download Failed';
                            downloadErrorsBtn.classList.remove('btn-outline-secondary');
                            downloadErrorsBtn.classList.add('btn-danger');
                        }
                    });
                }
            }
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
            <style>
                #delete-conversations-subject-form .card-title { font-size: 1.1rem; }
                #delete-conversations-subject-form .card-header small { font-size: 0.75rem; }
                #delete-conversations-subject-form .form-label { font-size: 0.85rem; }
                #delete-conversations-subject-form .form-control { font-size: 0.85rem; }
                #delete-conversations-subject-form .form-text { font-size: 0.7rem; }
                #delete-conversations-subject-form .btn { font-size: 0.85rem; padding: 0.35rem 0.75rem; }
                #delete-conversations-subject-form .bi { font-size: 0.9rem; }
                #delete-conversations-subject-form .progress { height: 12px; }
                #delete-conversations-subject-form .card-body { padding: 0.75rem; }
                #delete-conversations-subject-form .mt-1 { margin-top: 0.25rem !important; }
                #delete-conversations-subject-form .mt-2 { margin-top: 0.5rem !important; }
                #delete-conversations-subject-form .mt-3 { margin-top: 0.5rem !important; }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .spin {
                    animation: spin 1s linear infinite;
                    display: inline-block;
                }
            </style>
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-trash me-1"></i>Delete User Conversations
                    </h3>
                    <small class="text-muted">Delete conversations by subject search or by uploading a file with subjects and user IDs.</small>
                </div>
                <div class="card-body">
                    <!-- Tabs -->
                    <ul class="nav nav-tabs mb-3" id="dcs-tabs" role="tablist">
                        <li class="nav-item" role="presentation">
                            <button class="nav-link active" id="dcs-tab-subject" type="button" role="tab">By Subject</button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="dcs-tab-file" type="button" role="tab">By File</button>
                        </li>
                    </ul>
                    <div class="tab-content" id="dcs-tab-content">
                        <!-- By Subject tab -->
                        <div class="tab-pane fade show active" id="dcs-panel-subject" role="tabpanel" aria-labelledby="dcs-tab-subject">
                    <div class="row ">
                        <div class="col-auto"><label for="dcs-user-id" class="form-label">User ID</label></div>
                        <div class="col-2">
                            <input id="dcs-user-id" type="text" class="form-control form-control-sm">
                            <div class="col-auto"><span id="dcs-user-help" class="form-text" style="display:none;">Must be a number</span></div>
                        </div>
                    </div>
                    <div class="row  mt-2">
                        <div class="col-auto"><label for="dcs-subject" class="form-label">Subject</label></div>
                        <div class="col-4">
                            <input id="dcs-subject" type="text" class="form-control form-control-sm" placeholder="Exact subject text">
                            <div class="form-text">Exact match; case-sensitive.</div>
                        </div>
                    </div>
                    <div class="row mt-2">
                        <div class="col-auto"><label for="dcs-sent-on-or-after" class="form-label">Message sent on/after</label></div>
                        <div class="col-auto">
                            <input id="dcs-sent-on-or-after" type="date" class="form-control form-control-sm">
                            <div class="form-text">Optional.</div>
                            <div class="form-text">Only includes conversations updated on or after this date.</div>
                            <div class="form-text">Use the same date shown on the message in the user's inbox.</div>
                        </div>
                    </div>
                    <div class="row mt-2">
                        <div class="col-auto"><button id="dcs-search" type="button" class="btn btn-sm btn-primary" disabled>Search</button></div>
                        <div class="col-auto"><button id="dcs-cancel-search" type="button" class="btn btn-sm btn-outline-danger" disabled>Cancel</button></div>
                    </div>
                    <div hidden id="dcs-search-progress-div" class="mt-2">
                        <p id="dcs-search-progress-info"></p>
                    </div>
                    <div id="dcs-search-result" class="mt-2"></div>
                    <hr class="my-3" />
                    <div class="row mt-2" id="dcs-delete-section" hidden>
                        <div class="col-auto"><button id="dcs-delete" type="button" class="btn btn-sm btn-danger" disabled>Delete Found</button></div>
                        <div class="col-auto"><button id="dcs-perm-delete" type="button" class="btn btn-sm btn-danger" disabled><i class="bi bi-x-octagon me-1"></i>Permanently Delete</button></div>
                    </div>
                    <div hidden id="dcs-delete-progress-div" class="mt-2">
                        <p id="dcs-delete-progress-info"></p>
                        <div class="progress mt-1" style="width: 75%; height: 12px;" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                            <div class="progress-bar" style="width: 0%"></div>
                        </div>
                    </div>
                        </div>
                        <!-- By File tab -->
                        <div class="tab-pane fade" id="dcs-panel-file" role="tabpanel" aria-labelledby="dcs-tab-file">
                            <p class="form-text mb-2">Upload a CSV or TXT file with <code>subject</code> and <code>user_id</code> (or <code>author</code>) columns. Rows missing a subject or with invalid user IDs will be skipped and can be downloaded.</p>
                            <div class="row align-items-center">
                                <div class="col-auto">
                                    <button id="dcs-file-upload-btn" type="button" class="btn btn-sm btn-outline-primary"><i class="bi bi-upload me-1"></i>Upload File</button>
                                </div>
                                <div class="col-auto">
                                    <span id="dcs-file-name" class="form-text text-muted">No file selected</span>
                                </div>
                            </div>
                            <div class="row mt-2" id="dcs-file-date-filter-row" hidden>
                                <div class="col-auto"><label for="dcs-file-sent-on-or-after" class="form-label">Message sent on/after</label></div>
                                <div class="col-auto">
                                    <input id="dcs-file-sent-on-or-after" type="date" class="form-control form-control-sm">
                                    <div class="form-text">Optional. Only includes conversations updated on or after this date.</div>
                                </div>
                            </div>
                            <div id="dcs-file-parse-result" class="mt-2"></div>
                            <hr class="my-3" />
                            <div class="row mt-2" id="dcs-file-delete-section" hidden>
                                <div class="col-auto"><button id="dcs-file-search" type="button" class="btn btn-sm btn-primary" disabled hidden>Search Conversations</button></div>
                                <div class="col-auto"><button id="dcs-file-delete" type="button" class="btn btn-sm btn-danger" disabled>Delete Conversations</button></div>
                                <div class="col-auto"><button id="dcs-file-perm-delete" type="button" class="btn btn-sm btn-danger" disabled><i class="bi bi-x-octagon me-1"></i>Permanently Delete</button></div>
                                <div class="col-auto"><button id="dcs-file-cancel-delete" type="button" class="btn btn-sm btn-outline-danger" disabled>Cancel</button></div>
                            </div>
                            <div hidden id="dcs-file-delete-progress-div" class="mt-2">
                                <p id="dcs-file-delete-progress-info"></p>
                                <div class="progress mt-1" style="width: 75%; height: 12px;" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                                    <div class="progress-bar" style="width: 0%"></div>
                                </div>
                            </div>
                            <div id="dcs-file-delete-result" class="mt-2"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        eContent.append(form);

        // Manual tab switching
        const tabSubjectBtn = form.querySelector('#dcs-tab-subject');
        const tabFileBtn = form.querySelector('#dcs-tab-file');
        const panelSubject = form.querySelector('#dcs-panel-subject');
        const panelFile = form.querySelector('#dcs-panel-file');

        tabSubjectBtn.addEventListener('click', () => {
            tabSubjectBtn.classList.add('active');
            tabFileBtn.classList.remove('active');
            panelSubject.classList.add('show', 'active');
            panelFile.classList.remove('show', 'active');
        });
        tabFileBtn.addEventListener('click', () => {
            tabFileBtn.classList.add('active');
            tabSubjectBtn.classList.remove('active');
            panelFile.classList.add('show', 'active');
            panelSubject.classList.remove('show', 'active');
        });
    }
    form.hidden = false;

    const userInput = form.querySelector('#dcs-user-id');
    const subjectInput = form.querySelector('#dcs-subject');
    const sentOnOrAfterInput = form.querySelector('#dcs-sent-on-or-after');
    const searchBtn = form.querySelector('#dcs-search');
    const cancelSearchBtn = form.querySelector('#dcs-cancel-search');
    const searchProgressDiv = form.querySelector('#dcs-search-progress-div');
    const searchProgressInfo = form.querySelector('#dcs-search-progress-info');
    const resultDiv = form.querySelector('#dcs-search-result');
    const deleteBtn = form.querySelector('#dcs-delete');
    const permDeleteBtn = form.querySelector('#dcs-perm-delete');
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

    if (form.dataset.bound !== 'true') {
        userInput.addEventListener('input', toggleSearchEnabled);
        subjectInput.addEventListener('input', toggleSearchEnabled);
        sentOnOrAfterInput.addEventListener('input', toggleSearchEnabled);
        toggleSearchEnabled();
        searchBtn.addEventListener('click', async (evt) => {
            evt.preventDefault(); evt.stopPropagation();

            // Re-query cancel button (in case it was replaced by Clear functionality)
            const currentCancelBtn = form.querySelector('#dcs-cancel-search');

            // Reset cancel button to cancel-search state
            currentCancelBtn.disabled = false;
            currentCancelBtn.innerHTML = '<i class="bi bi-x-circle me-1"></i>Cancel';
            currentCancelBtn.classList.remove('btn-outline-secondary');
            currentCancelBtn.classList.add('btn-outline-danger');

            searchBtn.disabled = true; deleteBtn.disabled = true; permDeleteBtn.disabled = true; resultDiv.innerHTML = '';

            // Clear any existing deletion summary cards from previous operations
            const deletionSummary = deleteProgressDiv.nextElementSibling;
            if (deletionSummary && (deletionSummary.classList.contains('card') || deletionSummary.classList.contains('alert'))) {
                deletionSummary.remove();
            }

            // Hide delete section for new search
            const deleteSection = document.getElementById('dcs-delete-section');
            if (deleteSection) deleteSection.hidden = true;

            searchProgressDiv.hidden = false; searchProgressInfo.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Searching for conversations...';

            const domain = document.querySelector('#domain').value.trim();
            const token = document.querySelector('#token').value.trim();
            const user_id = userInput.value.trim();
            const subject = subjectInput.value;
            const sent_on_or_after = sentOnOrAfterInput.value.trim();
            const searchStartedAt = performance.now();
            let cancelled = false;
            const onCancel = async () => { currentCancelBtn.disabled = true; try { await window.axios.cancelGetConvos(); } catch { } cancelled = true; searchProgressInfo.textContent = 'Cancelling search...'; };
            currentCancelBtn.addEventListener('click', onCancel, { once: true });

            // Set up progress listener for page-by-page updates
            if (window.progressAPI) {
                window.progressAPI.onUpdateProgress((progress) => {
                    if (progress && progress.page) {
                        searchProgressInfo.innerHTML = `<i class="bi bi-arrow-repeat spin"></i> Searching for conversations... (page ${progress.page}${progress.total ? ` of ${progress.total}` : ''})`;
                    } else if (progress && typeof progress === 'object' && progress.message) {
                        searchProgressInfo.innerHTML = `<i class="bi bi-arrow-repeat spin"></i> ${progress.message}`;
                    } else if (progress && typeof progress === 'string') {
                        searchProgressInfo.innerHTML = `<i class="bi bi-arrow-repeat spin"></i> ${progress}`;
                    }
                });
            }

            try {
                const convoSearchResult = await window.axios.getConvos({ domain, token, user_id, subject, sent_on_or_after });
                let filteredOutCount = 0;
                if (Array.isArray(convoSearchResult)) {
                    foundMessages = convoSearchResult;
                } else {
                    foundMessages = Array.isArray(convoSearchResult?.messages) ? convoSearchResult.messages : [];
                    filteredOutCount = Number(convoSearchResult?.filteredOutCount) || 0;
                }
                const count = Array.isArray(foundMessages) ? foundMessages.length : 0;
                const elapsedSeconds = ((performance.now() - searchStartedAt) / 1000).toFixed(2);

                // Count unique attachments (deduplicate by file ID)
                let totalAttachments = 0;
                const uniqueFileIds = new Set();
                if (Array.isArray(foundMessages)) {
                    foundMessages.forEach(msg => {
                        if (msg.attachments && Array.isArray(msg.attachments)) {
                            msg.attachments.forEach(att => {
                                uniqueFileIds.add(att.id);
                            });
                        }
                    });
                    totalAttachments = uniqueFileIds.size;
                }

                // Clear previous results
                resultDiv.innerHTML = '';

                if (cancelled) {
                    const cancelCard = document.createElement('div');
                    cancelCard.className = 'alert alert-info';
                    cancelCard.innerHTML = `<i class="bi bi-info-circle me-1"></i>Search cancelled after ${elapsedSeconds} seconds.`;
                    resultDiv.appendChild(cancelCard);
                } else if (count > 0) {
                    const resultCard = document.createElement('div');
                    resultCard.className = 'card border-primary';

                    let attachmentsHTML = '';
                    if (totalAttachments > 0) {
                        // Build deduplicated list of attachments for display
                        const uniqueAttachments = new Map();
                        foundMessages.forEach(msg => {
                            if (msg.attachments && Array.isArray(msg.attachments)) {
                                msg.attachments.forEach(att => {
                                    if (!uniqueAttachments.has(att.id)) {
                                        uniqueAttachments.set(att.id, { id: att.id, displayName: att.displayName });
                                    }
                                });
                            }
                        });
                        const attachmentsList = Array.from(uniqueAttachments.values());

                        attachmentsHTML = `
                            <div class="mt-3">
                                <h6 class="text-primary" style="font-size: 0.95rem;"><i class="bi bi-paperclip me-1"></i>File Attachments (${totalAttachments} unique)</h6>
                                <div class="form-text mb-2">Select files to delete along with conversations:</div>
                                <div class="border rounded p-2" style="max-height: 300px; overflow-y: auto; background-color: #f8f9fa;">
                                    <div class="form-check mb-2">
                                        <input class="form-check-input" type="checkbox" id="select-all-attachments">
                                        <label class="form-check-label fw-bold" for="select-all-attachments" style="font-size: 0.85rem;">
                                            Select All
                                        </label>
                                    </div>
                                    <hr class="my-2">
                                    ${attachmentsList.map((att, attIdx) => `
                                        <div class="form-check ms-3">
                                            <input class="form-check-input attachment-checkbox" type="checkbox" 
                                                id="att-${attIdx}" 
                                                data-file-id="${att.id}" 
                                                data-file-name="${att.displayName}">
                                            <label class="form-check-label" for="att-${attIdx}" style="font-size: 0.8rem;">
                                                <i class="bi bi-file-earmark me-1"></i>${att.displayName} 
                                                <span class="text-muted">(ID: ${att.id})</span>
                                            </label>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `;
                    }

                    resultCard.innerHTML = `
                        <div class="card-header bg-primary text-white">
                            <h5 class="card-title mb-0" style="font-size: 1rem;">
                                <i class="bi bi-search me-1"></i>Search Results
                            </h5>
                        </div>
                        <div class="card-body">
                            <p class="mb-0">Found <strong>${count}</strong> conversation(s) with subject: "<em>${subject}</em>" in <strong>${elapsedSeconds}</strong> seconds.</p>
                            ${filteredOutCount > 0 ? `<p class="mb-0 mt-1 text-muted" style="font-size: 0.85rem;"><i class="bi bi-funnel me-1"></i>Filtered out <strong>${filteredOutCount}</strong> conversation(s) sent prior to the selected date.</p>` : ''}
                            ${totalAttachments > 0 ? `<p class="mb-0 mt-1 text-muted" style="font-size: 0.85rem;"><i class="bi bi-paperclip me-1"></i>${totalAttachments} unique file attachment(s) found</p>` : ''}
                            ${attachmentsHTML}
                            <div class="form-text mt-2">Click "Delete Found" below to delete these conversations for all recipients.</div>
                            <div class="mt-2 d-flex gap-2">
                                <button id="dcs-download-csv" type="button" class="btn btn-sm btn-outline-primary">
                                    <i class="bi bi-download me-1"></i>Download Conversations (CSV)
                                </button>
                            </div>
                        </div>
                    `;
                    resultDiv.appendChild(resultCard);

                    // Set up select-all checkbox handler
                    const selectAllCheckbox = resultCard.querySelector('#select-all-attachments');
                    const attachmentCheckboxes = resultCard.querySelectorAll('.attachment-checkbox');

                    if (selectAllCheckbox) {
                        selectAllCheckbox.addEventListener('change', (e) => {
                            attachmentCheckboxes.forEach(cb => cb.checked = e.target.checked);
                        });

                        attachmentCheckboxes.forEach(cb => {
                            cb.addEventListener('change', () => {
                                const allChecked = Array.from(attachmentCheckboxes).every(c => c.checked);
                                const anyChecked = Array.from(attachmentCheckboxes).some(c => c.checked);
                                selectAllCheckbox.checked = allChecked;
                                selectAllCheckbox.indeterminate = anyChecked && !allChecked;
                            });
                        });
                    }

                    // Set up CSV download button
                    const csvDownloadBtn = resultCard.querySelector('#dcs-download-csv');
                    if (csvDownloadBtn) {
                        csvDownloadBtn.addEventListener('click', async (e) => {
                            e.preventDefault();
                            try {
                                // Helper to escape a value for CSV (handles commas, quotes, newlines)
                                const csvEscape = (val) => {
                                    const str = val == null ? '' : String(val);
                                    if (/[,"\r\n]/.test(str)) {
                                        return '"' + str.replace(/"/g, '""') + '"';
                                    }
                                    return str;
                                };
                                const header = 'conversation_id,participant_ids,subject,body,file_id,file_name';
                                const rows = foundMessages.map(msg => {
                                    const participants = Array.isArray(msg.participants) ? msg.participants.join(';') : '';
                                    const fileIds = (msg.attachments && Array.isArray(msg.attachments)) ? msg.attachments.map(att => att.id).join('; ') : '';
                                    const fileNames = (msg.attachments && Array.isArray(msg.attachments)) ? msg.attachments.map(att => att.displayName || att.display_name || att.filename || '').join('; ') : '';
                                    return [
                                        csvEscape(msg.id),
                                        csvEscape(participants),
                                        csvEscape(msg.subject),
                                        csvEscape(msg.body || ''),
                                        csvEscape(fileIds),
                                        csvEscape(fileNames)
                                    ].join(',');
                                });
                                const csvContent = header + '\n' + rows.join('\n');
                                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = `conversations_${subject.replace(/[^a-z0-9]/gi, '_').substring(0, 30)}_${Date.now()}.csv`;
                                link.click();
                                URL.revokeObjectURL(url);
                            } catch (err) {
                                console.error('Error downloading CSV:', err);
                                const btn = csvDownloadBtn;
                                const originalHtml = btn.innerHTML;
                                btn.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i>Error: ${err.message}`;
                                btn.classList.add('btn-danger');
                                btn.classList.remove('btn-outline-primary');
                                setTimeout(() => {
                                    btn.innerHTML = originalHtml;
                                    btn.classList.remove('btn-danger');
                                    btn.classList.add('btn-outline-primary');
                                }, 4000);
                            }
                        });
                    }

                    // Show delete section
                    const deleteSection = document.getElementById('dcs-delete-section');
                    deleteSection.hidden = false;
                } else {
                    const noResultCard = document.createElement('div');
                    noResultCard.className = 'alert alert-warning';
                    noResultCard.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i>No conversations found with that subject after ${elapsedSeconds} seconds.${filteredOutCount > 0 ? ` Filtered out ${filteredOutCount} conversation(s) sent prior to the selected date.` : ''}`;
                    resultDiv.appendChild(noResultCard);

                    // Hide delete section
                    const deleteSection = document.getElementById('dcs-delete-section');
                    deleteSection.hidden = true;
                }

                deleteBtn.disabled = !(count > 0);
                permDeleteBtn.disabled = !(count > 0);
            } catch (err) {
                resultDiv.innerHTML = '';
                const errorCard = document.createElement('div');
                errorCard.className = 'alert alert-danger';
                errorCard.innerHTML = `<strong>Error:</strong> ${err.message || 'An error occurred during search'}`;
                resultDiv.appendChild(errorCard);
            } finally {
                // Clean up progress listener
                if (window.progressAPI?.removeAllProgressListeners) {
                    window.progressAPI.removeAllProgressListeners();
                }
                searchBtn.disabled = false; searchProgressDiv.hidden = true;

                // Keep cancel button enabled and repurpose it to clear results
                const currentCancelBtn = form.querySelector('#dcs-cancel-search');
                currentCancelBtn.disabled = false;
                currentCancelBtn.innerHTML = '<i class="bi bi-x-circle me-1"></i>Clear';
                currentCancelBtn.classList.remove('btn-outline-danger');
                currentCancelBtn.classList.add('btn-outline-secondary');

                // Remove all event listeners by replacing the button
                const newCancelBtn = currentCancelBtn.cloneNode(true);
                currentCancelBtn.replaceWith(newCancelBtn);

                // Add clear-results listener to the new button
                newCancelBtn.addEventListener('click', () => {
                    // Clear search results
                    resultDiv.innerHTML = '';
                    deleteBtn.disabled = true;
                    permDeleteBtn.disabled = true;

                    // Hide delete section and progress
                    const deleteSection = document.getElementById('dcs-delete-section');
                    if (deleteSection) deleteSection.hidden = true;
                    deleteProgressDiv.hidden = true;

                    // Clear any deletion summary
                    const deletionSummary = deleteProgressDiv.nextElementSibling;
                    if (deletionSummary && (deletionSummary.classList.contains('card') || deletionSummary.classList.contains('alert'))) {
                        deletionSummary.remove();
                    }

                    // Reset cancel button to default state
                    newCancelBtn.disabled = true;
                    newCancelBtn.innerHTML = '<i class="bi bi-x-circle me-1"></i>Cancel';
                    newCancelBtn.classList.remove('btn-outline-secondary');
                    newCancelBtn.classList.add('btn-outline-danger');

                    // Reset foundMessages
                    foundMessages = [];

                    // Note: We intentionally DO NOT clear user ID and subject values
                });
            }
        });

        deleteBtn.addEventListener('click', async (evt) => {
            evt.preventDefault(); evt.stopPropagation(); if (!foundMessages || foundMessages.length === 0) return;

            const domain = document.querySelector('#domain').value.trim();
            const token = document.querySelector('#token').value.trim();

            // Collect selected file attachments
            const selectedFiles = [];
            const attachmentCheckboxes = resultDiv.querySelectorAll('.attachment-checkbox:checked');
            attachmentCheckboxes.forEach(cb => {
                selectedFiles.push({
                    id: cb.dataset.fileId,
                    name: cb.dataset.fileName
                });
            });

            deleteBtn.disabled = true;
            permDeleteBtn.disabled = true;
            deleteProgressDiv.hidden = false; deleteProgressBar.style.width = '0%';
            deleteProgressInfo.textContent = `Deleting ${foundMessages.length} conversation(s)${selectedFiles.length > 0 ? ` and ${selectedFiles.length} file(s)` : ''}...`;

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

            try {
                // Delete conversations first
                const res = await window.axios.deleteConvos({ domain, token, messages: foundMessages });
                const convoSuccess = res?.successful?.length || 0;
                const convoFailed = res?.failed?.length || 0;

                // Delete selected files if any
                let fileSuccess = 0;
                let fileFailed = 0;
                if (selectedFiles.length > 0) {
                    deleteProgressInfo.textContent = `Deleting ${selectedFiles.length} file(s)...`;
                    try {
                        const fileRes = await window.axios.deleteFiles({ domain, token, files: selectedFiles });
                        fileSuccess = fileRes?.successful?.length || 0;
                        fileFailed = fileRes?.failed?.length || 0;
                    } catch (err) {
                        console.error('Error deleting files:', err);
                        fileFailed = selectedFiles.length;
                    }
                }

                // Hide progress, show summary card
                deleteProgressDiv.hidden = true;

                const summaryCard = document.createElement('div');
                summaryCard.className = 'card mt-2 border-success';
                summaryCard.innerHTML = `
                    <div class="card-header ${(convoFailed > 0 || fileFailed > 0) ? 'bg-warning' : 'bg-success'} text-white">
                        <h5 class="card-title mb-0" style="font-size: 1rem;">
                            <i class="bi bi-${(convoFailed > 0 || fileFailed > 0) ? 'exclamation-triangle' : 'check-circle'} me-1"></i>Deletion Complete
                        </h5>
                    </div>
                    <div class="card-body">
                        <p><strong>Conversations:</strong></p>
                        <ul style="font-size: 0.85rem;">
                            <li><strong>Total:</strong> <span class="badge bg-primary">${foundMessages.length}</span></li>
                            <li><strong>Successfully Deleted:</strong> <span class="badge bg-success">${convoSuccess}</span></li>
                            ${convoFailed > 0 ? `<li><strong>Failed:</strong> <span class="badge bg-danger">${convoFailed}</span></li>` : ''}
                        </ul>
                        ${selectedFiles.length > 0 ? `
                            <p class="mt-2"><strong>File Attachments:</strong></p>
                            <ul style="font-size: 0.85rem;">
                                <li><strong>Total:</strong> <span class="badge bg-primary">${selectedFiles.length}</span></li>
                                <li><strong>Successfully Deleted:</strong> <span class="badge bg-success">${fileSuccess}</span></li>
                                ${fileFailed > 0 ? `<li><strong>Failed:</strong> <span class="badge bg-danger">${fileFailed}</span></li>` : ''}
                            </ul>
                        ` : ''}
                        ${(convoFailed === 0 && fileFailed === 0) ? '<p class="text-success mb-0"><i class="bi bi-check-circle me-1"></i>All items deleted successfully!</p>' : ''}
                    </div>
                `;

                // Clear previous results and append new summary
                const existingSummary = deleteProgressDiv.nextElementSibling;
                if (existingSummary && existingSummary.classList.contains('card')) {
                    existingSummary.remove();
                }
                deleteProgressDiv.parentNode.insertBefore(summaryCard, deleteProgressDiv.nextSibling);

            } catch (err) {
                deleteProgressDiv.hidden = true;
                const errorCard = document.createElement('div');
                errorCard.className = 'alert alert-danger mt-2';
                errorCard.innerHTML = `<strong>Error:</strong> ${err.message || 'An error occurred while deleting conversations'}`;

                const existingError = deleteProgressDiv.nextElementSibling;
                if (existingError && (existingError.classList.contains('card') || existingError.classList.contains('alert'))) {
                    existingError.remove();
                }
                deleteProgressDiv.parentNode.insertBefore(errorCard, deleteProgressDiv.nextSibling);
            } finally {
                deleteBtn.disabled = false;
                permDeleteBtn.disabled = false;
            }
        });

        // ── Permanently Delete button (By Subject) ──
        permDeleteBtn.addEventListener('click', async (evt) => {
            evt.preventDefault(); evt.stopPropagation(); if (!foundMessages || foundMessages.length === 0) return;

            const domain = document.querySelector('#domain').value.trim();
            const token = document.querySelector('#token').value.trim();

            deleteBtn.disabled = true;
            permDeleteBtn.disabled = true;
            deleteProgressDiv.hidden = false; deleteProgressBar.style.width = '0%';
            deleteProgressInfo.textContent = `Permanently deleting ${foundMessages.length} conversation(s)...`;

            if (window.progressAPI) {
                window.progressAPI.onUpdateProgress((progress) => {
                    if (progress && typeof progress.value === 'number') {
                        deleteProgressBar.style.width = `${Math.round(progress.value * 100)}%`;
                    } else if (typeof progress === 'number') {
                        deleteProgressBar.style.width = `${Math.round(progress)}%`;
                    }
                });
            }

            try {
                const res = await window.axios.permanentlyDeleteConvos({ domain, token, messages: foundMessages });
                const success = res?.successful?.length || 0;
                const failed = res?.failed?.length || 0;
                const cancelled = res?.cancelled || false;

                deleteProgressDiv.hidden = true;

                const summaryCard = document.createElement('div');
                summaryCard.className = `card mt-2 border-${failed > 0 ? 'warning' : 'success'}`;
                summaryCard.innerHTML = `
                    <div class="card-header ${failed > 0 ? 'bg-warning' : 'bg-success'} text-white">
                        <h5 class="card-title mb-0" style="font-size: 1rem;">
                            <i class="bi bi-${failed > 0 ? 'exclamation-triangle' : 'check-circle'} me-1"></i>Permanent Deletion ${cancelled ? 'Cancelled' : 'Complete'}
                        </h5>
                    </div>
                    <div class="card-body">
                        <ul style="font-size: 0.85rem;">
                            <li><strong>Total:</strong> <span class="badge bg-primary">${foundMessages.length}</span></li>
                            <li><strong>Successfully Deleted:</strong> <span class="badge bg-success">${success}</span></li>
                            ${failed > 0 ? `<li><strong>Failed:</strong> <span class="badge bg-danger">${failed}</span></li>` : ''}
                        </ul>
                        ${(failed === 0 && !cancelled) ? '<p class="text-success mb-0"><i class="bi bi-check-circle me-1"></i>All conversations permanently deleted!</p>' : ''}
                    </div>
                `;

                const existingSummary = deleteProgressDiv.nextElementSibling;
                if (existingSummary && existingSummary.classList.contains('card')) {
                    existingSummary.remove();
                }
                deleteProgressDiv.parentNode.insertBefore(summaryCard, deleteProgressDiv.nextSibling);
            } catch (err) {
                deleteProgressDiv.hidden = true;
                const errorCard = document.createElement('div');
                errorCard.className = 'alert alert-danger mt-2';
                errorCard.innerHTML = `<strong>Error:</strong> ${err.message || 'An error occurred while permanently deleting conversations'}`;

                const existingError = deleteProgressDiv.nextElementSibling;
                if (existingError && (existingError.classList.contains('card') || existingError.classList.contains('alert'))) {
                    existingError.remove();
                }
                deleteProgressDiv.parentNode.insertBefore(errorCard, deleteProgressDiv.nextSibling);
            } finally {
                deleteBtn.disabled = false;
                permDeleteBtn.disabled = false;
            }
        });

        // ── By File tab logic ──
        const fileUploadBtn = form.querySelector('#dcs-file-upload-btn');
        const fileNameSpan = form.querySelector('#dcs-file-name');
        const fileParseResult = form.querySelector('#dcs-file-parse-result');
        const fileDateFilterRow = form.querySelector('#dcs-file-date-filter-row');
        const fileSentOnOrAfterInput = form.querySelector('#dcs-file-sent-on-or-after');
        const fileDeleteSection = form.querySelector('#dcs-file-delete-section');
        const fileSearchBtn = form.querySelector('#dcs-file-search');
        const fileDeleteBtn = form.querySelector('#dcs-file-delete');
        const filePermDeleteBtn = form.querySelector('#dcs-file-perm-delete');
        const fileCancelDeleteBtn = form.querySelector('#dcs-file-cancel-delete');
        const fileDeleteProgressDiv = form.querySelector('#dcs-file-delete-progress-div');
        const fileDeleteProgressBar = fileDeleteProgressDiv.querySelector('.progress-bar');
        const fileDeleteProgressInfo = form.querySelector('#dcs-file-delete-progress-info');
        const fileDeleteResult = form.querySelector('#dcs-file-delete-result');

        let fileConversations = []; // convo mode: [{ id, participants }]
        let fileSubjectPairs = []; // subject mode: [{ subject, user_id }]
        let fileSkippedRows = []; // skipped rows with reasons
        let fileMode = null; // 'subject' | 'convo' | null
        let fileFoundMessages = []; // search results for subject mode

        // RFC 4180 CSV parser (handles quoted fields with commas, newlines, escaped quotes)
        function parseFileCSVRows(text) {
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

        function parseFileCSV(text) {
            const rows = parseFileCSVRows(text);
            if (rows.length === 0) return { mode: null, data: [] };
            const headers = rows[0].map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''));

            // Priority 1: subject + user_id/author columns
            const subjectIdx = headers.findIndex(h => h === 'subject');
            const userIdIdx = headers.findIndex(h => h === 'user_id' || h === 'userid');
            const authorIdx = headers.findIndex(h => h === 'author');
            const effectiveUserIdx = userIdIdx !== -1 ? userIdIdx : authorIdx;

            if (subjectIdx !== -1 && effectiveUserIdx !== -1) {
                const seenSubject = new Set();
                const subjectPairs = [];
                const skippedRows = [];

                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    if (!row || row.every(c => !c.trim())) continue;
                    const subject = row[subjectIdx] ? row[subjectIdx].trim() : '';
                    const userRaw = row[effectiveUserIdx] ? row[effectiveUserIdx].trim() : '';

                    if (!subject || !userRaw || isNaN(Number(userRaw))) {
                        // Track skipped rows with reasons
                        const reasons = [];
                        if (!subject) reasons.push('missing subject');
                        if (!userRaw) reasons.push('missing user_id');
                        else if (isNaN(Number(userRaw))) reasons.push('non-numeric user_id');
                        skippedRows.push({ rowNumber: i + 1, rawRow: row, headers: rows[0], reason: reasons.join(', ') });
                        continue;
                    }

                    const key = `${subject}\t${userRaw}`;
                    if (!seenSubject.has(key)) {
                        seenSubject.add(key);
                        subjectPairs.push({ subject, user_id: userRaw });
                    }
                }

                if (subjectPairs.length > 0 || skippedRows.length > 0) {
                    return { mode: 'subject', data: subjectPairs, skipped: skippedRows };
                }
            }

            // Priority 2: conversation_id + participating_user_ids columns
            const convoIdx2 = headers.findIndex(h => h === 'conversation_id' || h === 'conversationid' || h === 'convo_id');
            const partIdx = headers.findIndex(h => h === 'participating_user_ids' || h === 'participatinguserids' || h === 'participants' || h === 'participant_ids');
            if (convoIdx2 === -1 || partIdx === -1) return { mode: null, data: null };
            const out = [];
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.every(c => !c.trim())) continue;
                const convoId = row[convoIdx2] ? row[convoIdx2].trim() : '';
                const partRaw = row[partIdx] ? row[partIdx].trim() : '';
                if (!convoId) continue;
                const participants = partRaw.split(/[;\s]+/).map(s => s.trim()).filter(s => s && !isNaN(Number(s)));
                out.push({ id: convoId, participants });
            }
            return { mode: 'convo', data: out };
        }

        function parseFileTXT(text) {
            // Try CSV-style parsing first (may be .txt with CSV content)
            const csvResult = parseFileCSV(text);
            if (csvResult.mode !== null) return csvResult;
            return { mode: null, data: null };
        }

        fileUploadBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.csv,.txt,text/csv,text/plain';
            input.onchange = async () => {
                const file = input.files && input.files[0];
                if (!file) return;
                fileNameSpan.textContent = file.name;
                fileParseResult.innerHTML = '';
                fileDeleteSection.hidden = true;
                fileDeleteResult.innerHTML = '';
                fileConversations = [];
                fileSubjectPairs = [];
                fileSkippedRows = [];
                fileMode = null;
                fileFoundMessages = [];
                fileDateFilterRow.hidden = true;

                try {
                    const text = await file.text();
                    let parsed = null;
                    if (file.name.toLowerCase().endsWith('.csv')) {
                        parsed = parseFileCSV(text);
                    } else {
                        parsed = parseFileTXT(text);
                    }

                    if (parsed.mode === null || parsed.data === null || (parsed.data.length === 0 && (!parsed.skipped || parsed.skipped.length === 0))) {
                        const alertDiv = document.createElement('div');
                        alertDiv.className = 'alert alert-warning';
                        if (parsed.data === null) {
                            alertDiv.innerHTML = '<i class="bi bi-exclamation-triangle me-1"></i>Could not find required columns. The file needs <strong>subject</strong> + <strong>user_id</strong>/<strong>author</strong> columns, or <strong>conversation_id</strong> + <strong>participating_user_ids</strong> columns.';
                        } else {
                            alertDiv.innerHTML = '<i class="bi bi-exclamation-triangle me-1"></i>No valid rows found in the file.';
                        }
                        fileParseResult.appendChild(alertDiv);
                        return;
                    }

                    fileMode = parsed.mode;

                    if (parsed.mode === 'subject') {
                        fileSubjectPairs = parsed.data;
                        fileSkippedRows = parsed.skipped || [];
                        const uniqueUsers = new Set(parsed.data.map(p => p.user_id));
                        const uniqueSubjects = new Set(parsed.data.map(p => p.subject));

                        const card = document.createElement('div');
                        card.className = 'card border-primary';
                        let skippedHTML = '';
                        if (fileSkippedRows.length > 0) {
                            skippedHTML = `
                                <div class="alert alert-warning mt-2 mb-0 py-1 px-2" style="font-size: 0.85rem;">
                                    <i class="bi bi-exclamation-triangle me-1"></i><strong>${fileSkippedRows.length}</strong> row(s) skipped (missing subject or invalid user ID).
                                    <button id="dcs-file-download-skipped" type="button" class="btn btn-sm btn-outline-warning ms-2 py-0 px-2" style="font-size: 0.8rem;">
                                        <i class="bi bi-download me-1"></i>Download Skipped Rows (CSV)
                                    </button>
                                </div>
                            `;
                        }
                        card.innerHTML = `
                            <div class="card-header bg-primary text-white">
                                <h5 class="card-title mb-0" style="font-size: 1rem;">
                                    <i class="bi bi-file-earmark-check me-1"></i>File Parsed (Subject + User ID Mode)
                                </h5>
                            </div>
                            <div class="card-body">
                                <p class="mb-1">Found <strong>${parsed.data.length}</strong> unique subject/user pair(s) in <em>${file.name}</em>.</p>
                                <ul style="font-size: 0.85rem;" class="mb-1">
                                    <li><strong>${uniqueSubjects.size}</strong> unique subject(s)</li>
                                    <li><strong>${uniqueUsers.size}</strong> unique user(s)</li>
                                </ul>
                                ${skippedHTML}
                                ${parsed.data.length > 0 ? '<div class="form-text mt-1">Click "Search Conversations" to find matching conversations, then delete.</div>' : '<div class="form-text mt-1 text-danger">No valid rows to process. All rows were skipped.</div>'}
                            </div>
                        `;
                        fileParseResult.appendChild(card);

                        // Hook up skipped rows CSV download
                        const downloadSkippedBtn = card.querySelector('#dcs-file-download-skipped');
                        if (downloadSkippedBtn) {
                            downloadSkippedBtn.addEventListener('click', (ev) => {
                                ev.preventDefault();
                                const csvEscape = (val) => {
                                    const str = val == null ? '' : String(val);
                                    if (/[,"\r\n]/.test(str)) return '"' + str.replace(/"/g, '""') + '"';
                                    return str;
                                };
                                const headerRow = fileSkippedRows[0]?.headers
                                    ? fileSkippedRows[0].headers.map(h => csvEscape(h)).join(',') + ',skip_reason'
                                    : 'row_number,skip_reason';
                                const csvRows = fileSkippedRows.map(s => {
                                    if (s.rawRow) {
                                        return s.rawRow.map(c => csvEscape(c)).join(',') + ',' + csvEscape(s.reason);
                                    }
                                    return csvEscape(s.rowNumber) + ',' + csvEscape(s.reason);
                                });
                                const csvContent = headerRow + '\n' + csvRows.join('\n');
                                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = `skipped_rows_${Date.now()}.csv`;
                                link.click();
                                URL.revokeObjectURL(url);
                            });
                        }

                        // Show date filter and search button for subject mode
                        fileDateFilterRow.hidden = false;
                        fileSearchBtn.hidden = false;
                        fileSearchBtn.disabled = parsed.data.length === 0;
                        fileDeleteBtn.hidden = true;
                        filePermDeleteBtn.hidden = true;
                        fileDeleteSection.hidden = false;
                    } else {
                        // convo mode - existing behavior
                        fileConversations = parsed.data;
                        const noParticipants = parsed.data.filter(c => c.participants.length === 0).length;
                        const withParticipants = parsed.data.length - noParticipants;

                        const card = document.createElement('div');
                        card.className = 'card border-primary';
                        card.innerHTML = `
                            <div class="card-header bg-primary text-white">
                                <h5 class="card-title mb-0" style="font-size: 1rem;">
                                    <i class="bi bi-file-earmark-check me-1"></i>File Parsed
                                </h5>
                            </div>
                            <div class="card-body">
                                <p class="mb-1">Found <strong>${parsed.data.length}</strong> conversation(s) in <em>${file.name}</em>.</p>
                                <ul style="font-size: 0.85rem;" class="mb-1">
                                    <li>${withParticipants} conversation(s) with participant IDs</li>
                                    ${noParticipants > 0 ? `<li class="text-warning">${noParticipants} conversation(s) without participant IDs (will delete for the API user only)</li>` : ''}
                                </ul>
                                <div class="form-text">Click "Delete Conversations" to delete these for all listed participants.</div>
                            </div>
                        `;
                        fileParseResult.appendChild(card);

                        fileDateFilterRow.hidden = true;
                        fileSearchBtn.hidden = true;
                        fileDeleteBtn.hidden = false;
                        filePermDeleteBtn.hidden = false;
                        fileDeleteSection.hidden = false;
                        fileDeleteBtn.disabled = false;
                        filePermDeleteBtn.disabled = false;
                    }
                } catch (err) {
                    const alertDiv = document.createElement('div');
                    alertDiv.className = 'alert alert-danger';
                    alertDiv.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i>Error reading file: ${err.message}`;
                    fileParseResult.appendChild(alertDiv);
                }
            };
            input.click();
        });

        // ── Subject mode: Search button ──
        fileSearchBtn.addEventListener('click', async (evt) => {
            evt.preventDefault();
            evt.stopPropagation();
            if (!fileSubjectPairs || fileSubjectPairs.length === 0) return;

            const domain = document.querySelector('#domain').value.trim();
            const token = document.querySelector('#token').value.trim();
            const sent_on_or_after = fileSentOnOrAfterInput.value.trim();

            fileSearchBtn.disabled = true;
            fileCancelDeleteBtn.disabled = false;
            fileDeleteProgressDiv.hidden = false;
            fileDeleteProgressBar.style.width = '0%';
            fileDeleteResult.innerHTML = '';
            fileFoundMessages = [];

            let cancelled = false;
            const onCancel = async () => {
                fileCancelDeleteBtn.disabled = true;
                try { await window.axios.cancelGetConvos(); } catch { }
                cancelled = true;
                fileDeleteProgressInfo.textContent = 'Cancelling...';
            };
            fileCancelDeleteBtn.addEventListener('click', onCancel, { once: true });

            if (window.progressAPI) {
                window.progressAPI.onUpdateProgress((progress) => {
                    if (progress && typeof progress === 'object' && progress.message) {
                        // Don't override our pair-level progress with page-level updates
                    } else if (progress && typeof progress.value === 'number') {
                        fileDeleteProgressBar.style.width = `${Math.round(progress.value * 100)}%`;
                    }
                });
            }

            try {
                const allMessages = [];
                let totalFiltered = 0;
                const totalSteps = fileSubjectPairs.length;

                for (let i = 0; i < fileSubjectPairs.length; i++) {
                    if (cancelled) break;
                    const pair = fileSubjectPairs[i];
                    fileDeleteProgressInfo.innerHTML = `<i class="bi bi-arrow-repeat spin"></i> Searching pair ${i + 1}/${totalSteps}: subject "<em>${pair.subject}</em>" for user ${pair.user_id}...`;
                    fileDeleteProgressBar.style.width = `${Math.round(((i) / totalSteps) * 100)}%`;

                    try {
                        const result = await window.axios.getConvos({ domain, token, user_id: pair.user_id, subject: pair.subject, sent_on_or_after });
                        let messages = [];
                        if (Array.isArray(result)) {
                            messages = result;
                        } else {
                            messages = Array.isArray(result?.messages) ? result.messages : [];
                            totalFiltered += Number(result?.filteredOutCount) || 0;
                        }
                        allMessages.push(...messages);
                    } catch (err) {
                        console.error(`Error searching for subject="${pair.subject}" user=${pair.user_id}:`, err);
                    }
                }

                fileDeleteProgressBar.style.width = '100%';
                fileDeleteProgressDiv.hidden = true;

                // Deduplicate messages by conversation id
                const seenIds = new Set();
                fileFoundMessages = allMessages.filter(msg => {
                    if (seenIds.has(msg.id)) return false;
                    seenIds.add(msg.id);
                    return true;
                });

                const count = fileFoundMessages.length;

                if (cancelled) {
                    const cancelCard = document.createElement('div');
                    cancelCard.className = 'alert alert-info';
                    cancelCard.innerHTML = `<i class="bi bi-info-circle me-1"></i>Search cancelled. Found ${count} conversation(s) before cancellation.`;
                    fileDeleteResult.appendChild(cancelCard);
                    if (count > 0) {
                        fileDeleteBtn.hidden = false;
                        fileDeleteBtn.disabled = false;
                        filePermDeleteBtn.hidden = false;
                        filePermDeleteBtn.disabled = false;
                    }
                } else if (count > 0) {
                    const resultCard = document.createElement('div');
                    resultCard.className = 'card border-primary';
                    resultCard.innerHTML = `
                        <div class="card-header bg-primary text-white">
                            <h5 class="card-title mb-0" style="font-size: 1rem;">
                                <i class="bi bi-search me-1"></i>Search Results
                            </h5>
                        </div>
                        <div class="card-body">
                            <p class="mb-0">Found <strong>${count}</strong> conversation(s) across ${fileSubjectPairs.length} subject/user pair(s).</p>
                            ${totalFiltered > 0 ? `<p class="mb-0 mt-1 text-muted" style="font-size: 0.85rem;"><i class="bi bi-funnel me-1"></i>Filtered out <strong>${totalFiltered}</strong> conversation(s) sent prior to the selected date.</p>` : ''}
                            ${fileSkippedRows.length > 0 ? `<p class="mb-0 mt-1 text-warning" style="font-size: 0.85rem;"><i class="bi bi-exclamation-triangle me-1"></i>${fileSkippedRows.length} row(s) were skipped during file parsing.</p>` : ''}
                            <div class="form-text mt-2">Click "Delete Conversations" below to delete these for all recipients.</div>
                        </div>
                    `;
                    fileDeleteResult.appendChild(resultCard);
                    fileDeleteBtn.hidden = false;
                    fileDeleteBtn.disabled = false;
                    filePermDeleteBtn.hidden = false;
                    filePermDeleteBtn.disabled = false;
                } else {
                    const noResultCard = document.createElement('div');
                    noResultCard.className = 'alert alert-warning';
                    noResultCard.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i>No conversations found for any of the ${fileSubjectPairs.length} pair(s).${totalFiltered > 0 ? ` Filtered out ${totalFiltered} conversation(s) sent prior to the selected date.` : ''}`;
                    fileDeleteResult.appendChild(noResultCard);
                }
            } catch (err) {
                fileDeleteProgressDiv.hidden = true;
                const errorCard = document.createElement('div');
                errorCard.className = 'alert alert-danger mt-2';
                errorCard.innerHTML = `<strong>Error:</strong> ${err.message || 'An error occurred during search'}`;
                fileDeleteResult.appendChild(errorCard);
            } finally {
                fileSearchBtn.disabled = false;
                fileCancelDeleteBtn.disabled = true;
                if (window.progressAPI?.removeAllProgressListeners) {
                    window.progressAPI.removeAllProgressListeners();
                }
            }
        });

        // ── Delete button (both modes) ──
        fileDeleteBtn.addEventListener('click', async (evt) => {
            evt.preventDefault();
            evt.stopPropagation();

            const messagesToDelete = fileMode === 'subject' ? fileFoundMessages : fileConversations;
            if (!messagesToDelete || messagesToDelete.length === 0) return;

            const domain = document.querySelector('#domain').value.trim();
            const token = document.querySelector('#token').value.trim();

            fileDeleteBtn.disabled = true;
            filePermDeleteBtn.disabled = true;
            fileCancelDeleteBtn.disabled = false;
            fileDeleteProgressDiv.hidden = false;
            fileDeleteProgressBar.style.width = '0%';
            fileDeleteProgressInfo.textContent = `Deleting ${messagesToDelete.length} conversation(s)...`;
            fileDeleteResult.innerHTML = '';

            if (window.progressAPI) {
                window.progressAPI.onUpdateProgress((progress) => {
                    if (progress && typeof progress.value === 'number') {
                        fileDeleteProgressBar.style.width = `${Math.round(progress.value * 100)}%`;
                    } else if (typeof progress === 'number') {
                        fileDeleteProgressBar.style.width = `${Math.round(progress)}%`;
                    }
                });
            }

            const onCancel = async () => {
                fileCancelDeleteBtn.disabled = true;
                try { await window.axios.cancelDeleteConvos(); } catch { }
                fileDeleteProgressInfo.textContent = 'Cancelling...';
            };
            fileCancelDeleteBtn.addEventListener('click', onCancel, { once: true });

            try {
                const res = await window.axios.deleteConvos({ domain, token, messages: messagesToDelete });
                const success = res?.successful?.length || 0;
                const failed = res?.failed?.length || 0;
                const cancelled = res?.cancelled || false;

                fileDeleteProgressDiv.hidden = true;

                const summaryCard = document.createElement('div');
                summaryCard.className = `card mt-2 border-${failed > 0 ? 'warning' : 'success'}`;
                summaryCard.innerHTML = `
                    <div class="card-header ${failed > 0 ? 'bg-warning' : 'bg-success'} text-white">
                        <h5 class="card-title mb-0" style="font-size: 1rem;">
                            <i class="bi bi-${failed > 0 ? 'exclamation-triangle' : 'check-circle'} me-1"></i>Deletion ${cancelled ? 'Cancelled' : 'Complete'}
                        </h5>
                    </div>
                    <div class="card-body">
                        <ul style="font-size: 0.85rem;">
                            <li><strong>Total:</strong> <span class="badge bg-primary">${messagesToDelete.length}</span></li>
                            <li><strong>Successfully Deleted:</strong> <span class="badge bg-success">${success}</span></li>
                            ${failed > 0 ? `<li><strong>Failed:</strong> <span class="badge bg-danger">${failed}</span></li>` : ''}
                            ${fileSkippedRows.length > 0 ? `<li><strong>Skipped (from file parse):</strong> <span class="badge bg-secondary">${fileSkippedRows.length}</span></li>` : ''}
                        </ul>
                        ${(failed === 0 && !cancelled) ? '<p class="text-success mb-0"><i class="bi bi-check-circle me-1"></i>All conversations deleted successfully!</p>' : ''}
                    </div>
                `;
                fileDeleteResult.innerHTML = '';
                fileDeleteResult.appendChild(summaryCard);
            } catch (err) {
                fileDeleteProgressDiv.hidden = true;
                const errorCard = document.createElement('div');
                errorCard.className = 'alert alert-danger mt-2';
                errorCard.innerHTML = `<strong>Error:</strong> ${err.message || 'An error occurred while deleting conversations'}`;
                fileDeleteResult.innerHTML = '';
                fileDeleteResult.appendChild(errorCard);
            } finally {
                fileDeleteBtn.disabled = false;
                filePermDeleteBtn.disabled = false;
                fileCancelDeleteBtn.disabled = true;
                if (window.progressAPI?.removeAllProgressListeners) {
                    window.progressAPI.removeAllProgressListeners();
                }
            }
        });

        // ── Permanently Delete button (file tab) ──
        filePermDeleteBtn.addEventListener('click', async (evt) => {
            evt.preventDefault();
            evt.stopPropagation();

            const messagesToDelete = fileMode === 'subject' ? fileFoundMessages : fileConversations;
            if (!messagesToDelete || messagesToDelete.length === 0) return;

            const domain = document.querySelector('#domain').value.trim();
            const token = document.querySelector('#token').value.trim();

            fileDeleteBtn.disabled = true;
            filePermDeleteBtn.disabled = true;
            fileCancelDeleteBtn.disabled = false;
            fileDeleteProgressDiv.hidden = false;
            fileDeleteProgressBar.style.width = '0%';
            fileDeleteProgressInfo.textContent = `Permanently deleting ${messagesToDelete.length} conversation(s)...`;
            fileDeleteResult.innerHTML = '';

            if (window.progressAPI) {
                window.progressAPI.onUpdateProgress((progress) => {
                    if (progress && typeof progress.value === 'number') {
                        fileDeleteProgressBar.style.width = `${Math.round(progress.value * 100)}%`;
                    } else if (typeof progress === 'number') {
                        fileDeleteProgressBar.style.width = `${Math.round(progress)}%`;
                    }
                });
            }

            const onCancel = async () => {
                fileCancelDeleteBtn.disabled = true;
                try { await window.axios.cancelPermanentlyDeleteConvos(); } catch { }
                fileDeleteProgressInfo.textContent = 'Cancelling...';
            };
            fileCancelDeleteBtn.addEventListener('click', onCancel, { once: true });

            try {
                const res = await window.axios.permanentlyDeleteConvos({ domain, token, messages: messagesToDelete });
                const success = res?.successful?.length || 0;
                const failed = res?.failed?.length || 0;
                const cancelled = res?.cancelled || false;

                fileDeleteProgressDiv.hidden = true;

                const summaryCard = document.createElement('div');
                summaryCard.className = `card mt-2 border-${failed > 0 ? 'warning' : 'success'}`;
                summaryCard.innerHTML = `
                    <div class="card-header ${failed > 0 ? 'bg-warning' : 'bg-success'} text-white">
                        <h5 class="card-title mb-0" style="font-size: 1rem;">
                            <i class="bi bi-${failed > 0 ? 'exclamation-triangle' : 'check-circle'} me-1"></i>Permanent Deletion ${cancelled ? 'Cancelled' : 'Complete'}
                        </h5>
                    </div>
                    <div class="card-body">
                        <ul style="font-size: 0.85rem;">
                            <li><strong>Total:</strong> <span class="badge bg-primary">${messagesToDelete.length}</span></li>
                            <li><strong>Successfully Deleted:</strong> <span class="badge bg-success">${success}</span></li>
                            ${failed > 0 ? `<li><strong>Failed:</strong> <span class="badge bg-danger">${failed}</span></li>` : ''}
                            ${fileSkippedRows.length > 0 ? `<li><strong>Skipped (from file parse):</strong> <span class="badge bg-secondary">${fileSkippedRows.length}</span></li>` : ''}
                        </ul>
                        ${(failed === 0 && !cancelled) ? '<p class="text-success mb-0"><i class="bi bi-check-circle me-1"></i>All conversations permanently deleted!</p>' : ''}
                    </div>
                `;
                fileDeleteResult.innerHTML = '';
                fileDeleteResult.appendChild(summaryCard);
            } catch (err) {
                fileDeleteProgressDiv.hidden = true;
                const errorCard = document.createElement('div');
                errorCard.className = 'alert alert-danger mt-2';
                errorCard.innerHTML = `<strong>Error:</strong> ${err.message || 'An error occurred while permanently deleting conversations'}`;
                fileDeleteResult.innerHTML = '';
                fileDeleteResult.appendChild(errorCard);
            } finally {
                fileDeleteBtn.disabled = false;
                filePermDeleteBtn.disabled = false;
                fileCancelDeleteBtn.disabled = true;
                if (window.progressAPI?.removeAllProgressListeners) {
                    window.progressAPI.removeAllProgressListeners();
                }
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
            <style>
                #download-conversations-form h3 { font-size: 1.1rem; margin-bottom: 0.5rem; }
                #download-conversations-form .form-label { font-size: 0.85rem; }
                #download-conversations-form .form-control { font-size: 0.85rem; }
                #download-conversations-form .form-text { font-size: 0.7rem; }
                #download-conversations-form .form-check-label { font-size: 0.85rem; }
                #download-conversations-form .btn { font-size: 0.85rem; padding: 0.35rem 0.75rem; }
                #download-conversations-form .mt-2 { margin-top: 0.5rem !important; }
                #download-conversations-form .mt-3 { margin-top: 0.5rem !important; }
                #download-conversations-form .mt-5 { margin-top: 1rem !important; }
                #download-conversations-form .mb-2 { margin-bottom: 0.5rem !important; }
            </style>
            <div>
                <h3>Download Conversations to CSV</h3>
            </div>
                <div class="row">
                    <div class="col-auto">
                        <label for="user-id" class="form-label">Canvas user ID</label>
                    </div>
                    <div class="col-2">
                        <input type="text" id="user-id" class="form-control form-control-sm" aria-desribedby="userChecker">
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
                        <input id="start-date" type="date" class="form-control form-control-sm">
                    </div>
                    <div class="col-auto">
                        <label for="end-date" class="form-label">End</label>
                    </div>
                    <div class="col-auto">
                        <input id="end-date" type="date" class="form-control form-control-sm">
                    </div>
                    <div class="w-100"></div>
                    <div class="col-auto">
                        <button type="button" class="btn btn-sm btn-primary mt-2" id="convo-search">Search</button>
                    </div>
                </div>
            <div id="response-container" class="mt-2"></div>`;
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