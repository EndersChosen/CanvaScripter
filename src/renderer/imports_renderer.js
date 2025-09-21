function importsTemplate(e) {
    switch (e.target.id) {
        case 'delete-imported-content':
            deleteImportedContent(e);
            break;
        default:
            break;
    }
}

async function deleteImportedContent(e) {
    hideEndpoints(e);

    const eContent = document.querySelector('#endpoint-content');
    let form = eContent.querySelector('#imports-delete-form');
    if (!form) {
        form = document.createElement('form');
        form.id = 'imports-delete-form';
        form.innerHTML = `
                        <div class="mb-3">
                                <h3 class="mb-1">Delete Imported Content</h3>
                                <div class="text-muted small">Enter a Course ID and Import ID to review and delete imported items.</div>
                        </div>

                        <div class="card mb-3">
                            <div class="card-body">
                                <div class="row g-3 align-items-start">
                                    <div class="col-sm-3">
                                        <label for="course-id" class="form-label">Course ID</label>
                                        <input id="course-id" type="text" class="form-control" aria-describedby="course-id-help" inputmode="numeric" />
                                        <div id="course-id-help" class="form-text">Numbers only</div>
                                        <div class="invalid-feedback">Please enter a valid numeric Course ID.</div>
                                    </div>
                                    <div class="col-sm-3">
                                        <label for="import-id" class="form-label">Import ID</label>
                                        <input class="form-control" id="import-id" type="text" aria-describedby="import-id-help" />
                                        <div id="import-id-help" class="form-text">Use "List Imports" if you need to look it up.</div>
                                    </div>
                                    <div class="col-auto">
                                        <button id="check-imported-assets-btn" class="btn btn-primary" disabled>Check</button>
                                    </div>
                                    <div class="col-auto">
                                        <button id="list-imports-btn" type="button" class="btn btn-outline-secondary">List Imports</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div hidden id="imports-progress-div" class="mb-3">
                            <div class="d-flex align-items-center gap-2">
                                <div class="spinner-border spinner-border-sm text-secondary" role="status" aria-hidden="true"></div>
                                <p id="imports-progress-info" class="mb-0">Preparing...</p>
                            </div>
                            <div class="progress mt-3" role="progressbar" aria-label="progress bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                                    <div class="progress-bar" style="width: 0%"></div>
                            </div>
                        </div>

                        <div id="imports-response-container" class="mt-3"></div>
                `;
        eContent.append(form);
    }

    form.hidden = false;
    const courseID = form.querySelector('#course-id');
    const importID = form.querySelector('#import-id');
    const checkBtn = form.querySelector('#check-imported-assets-btn');
    const listBtn = form.querySelector('#list-imports-btn');
    const progressDiv = form.querySelector('#imports-progress-div');
    const progressBar = progressDiv.querySelector('.progress-bar');
    const spinner = progressDiv.querySelector('.spinner-border');
    const progressInfo = form.querySelector('#imports-progress-info');
    const responseContainer = form.querySelector('#imports-response-container');

    courseID.addEventListener('input', () => {
        const valid = /^(\d+)$/.test(courseID.value.trim());
        courseID.classList.toggle('is-invalid', !valid && courseID.value.trim().length > 0);
        checkBtn.disabled = !(valid && importID.value.trim().length > 0);
    });
    importID.addEventListener('input', () => {
        const valid = /^(\d+)$/.test(courseID.value.trim());
        checkBtn.disabled = !(valid && importID.value.trim().length > 0);
    });

    checkBtn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();

        checkBtn.disabled = true;
        responseContainer.innerHTML = '';
        progressDiv.hidden = false;
        progressBar.parentElement.hidden = true;
        progressBar.style.width = '0%';
        if (spinner) spinner.hidden = false;
        progressInfo.innerHTML = '';

        const domain = document.querySelector('#domain').value.trim();
        const token = document.querySelector('#token').value.trim();
        const course_id = courseID.value.trim();
        const import_id = importID.value.trim();

        const requestData = { domain, token, course_id, import_id };
        progressInfo.innerHTML = `Checking imported content for import ${import_id}...`;
        let assets = null;
        let hasError = false;
        try {
            assets = await window.axios.getImportedAssets(requestData);
            progressInfo.innerHTML = 'Done';
            if (spinner) spinner.hidden = true;
        } catch (error) {
            errorHandler(error, progressInfo);
            // If likely invalid Import ID, show imports list prompt
            if ((error.message || '').includes('Import ID may be invalid')) {
                responseContainer.innerHTML = `<div class="alert alert-warning">Could not load import ${import_id}. Click "List Imports" to see recent import IDs for this course.</div>`;
            }
            if (spinner) spinner.hidden = true;
            hasError = true;
        } finally {
            checkBtn.disabled = false;
        }

        if (hasError) return;

        // If folders exist, fetch metadata to detect root folders and exclude them from deletion/counts
        let rootFolderIds = [];
        if (assets.folders && assets.folders.length > 0) {
            try {
                const meta = await window.axios.getFoldersMeta({ domain, token, folders: assets.folders });
                rootFolderIds = meta.filter(m => m.isRoot).map(m => String(m.id));
            } catch (e) {
                console.warn('Folder metadata lookup failed, proceeding without root filter.', e?.message || e);
            }
        }

        // Filter out root folders from the actionable list
        const nonRootFolders = (assets.folders || []).filter(id => !rootFolderIds.includes(String(id)));

        const counts = {
            attachments: assets.attachments.length,
            folders: nonRootFolders.length,
            outcomes: assets.outcomes.length,
            rubrics: assets.rubrics.length,
            assignmentGroups: assets.assignmentGroups.length,
            assignments: assets.assignments.length,
            quizzes: assets.quizzes.length,
            announcements: assets.announcements.length,
            discussions: assets.discussions.length,
            pages: assets.pages.length,
            modules: assets.modules.length,
            calendarEvents: assets.calendarEvents.length
        };

        const totalAll = Object.values(counts).reduce((a, b) => a + b, 0);
        if (totalAll === 0) {
            // If only root folders were found (and excluded), still show the card so users can see why
            const onlyRootFolders = (assets.folders?.length || 0) > 0 && rootFolderIds.length === assets.folders.length;
            if (!onlyRootFolders) {
                responseContainer.innerHTML = `<div class="alert alert-info">No imported assets found for this import.</div>`;
                return;
            }
        }

        // Ensure toggle tile styles are present (once per app)
        (function ensureToggleTileStyles() {
            if (document.getElementById('imports-toggle-animations')) return;
            const style = document.createElement('style');
            style.id = 'imports-toggle-animations';
            style.textContent = `
                            .toggle-tile { 
                                transition: transform 120ms ease, box-shadow 220ms ease, background-color 200ms ease, color 200ms ease, border-color 200ms ease;
                                will-change: transform, box-shadow, background-color, color, border-color;
                            }
                            .toggle-tile:active { transform: scale(0.98); }
                            /* Hover state (only when not toggled on) */
                            .toggle-tile:not(.active):hover { 
                                background-color: rgba(var(--bs-secondary-rgb,108,117,125), .08);
                                border-color: rgba(var(--bs-secondary-rgb,108,117,125), .75);
                                color: var(--bs-body-color, #212529);
                            }
                            /* Toggled (active) state looks filled */
                            .toggle-tile.active {
                                background-color: var(--bs-secondary, #6c757d);
                                color: #fff;
                                border-color: var(--bs-secondary, #6c757d);
                            }
                            .toggle-tile.active .badge { background-color: rgba(255,255,255,.35); }
                            .toggle-tile.active:hover { filter: brightness(0.96); }
                            /* Disabled look */
                            .toggle-tile.disabled, .toggle-tile[disabled] { opacity: .6; cursor: not-allowed; }
                            /* Focus ring */
                            .toggle-tile:focus-visible { outline: none; box-shadow: 0 0 0 .2rem rgba(var(--bs-secondary-rgb,108,117,125), .35); }
                            @keyframes tilePulse { 
                                0% { box-shadow: 0 0 0 0 rgba(var(--bs-secondary-rgb,108,117,125), .45); }
                                100% { box-shadow: 0 0 0 .6rem rgba(var(--bs-secondary-rgb,108,117,125), 0); }
                            }
                            .toggle-tile.toggle-pulse { animation: tilePulse 320ms ease; }
                            `;
            document.head.appendChild(style);
        })();

        responseContainer.innerHTML = `
                                <div id="imports-response-details" class="card">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <span>Imported content found</span>
                                <div class="d-flex align-items-center gap-2">
                                    <span id="imports-total" class="text-muted small">Total: 0</span>
                                    <div class="btn-group btn-group-sm" role="group">
                                        <button type="button" id="imports-select-all" class="btn btn-outline-secondary">Select all</button>
                                        <button type="button" id="imports-select-none" class="btn btn-outline-secondary">None</button>
                                    </div>
                                </div>
                            </div>
                            <div class="card-body">
                    <div class="row g-2" id="imports-toggle-grid">
                    ${[{
                id: 'assignments', label: 'Assignments', count: counts.assignments
            }, {
                id: 'discussions', label: 'Discussions', count: counts.discussions
            }, {
                id: 'quizzes', label: 'Quizzes (Classic)', count: counts.quizzes
            }, {
                id: 'modules', label: 'Modules', count: counts.modules
            }, {
                id: 'pages', label: 'Pages', count: counts.pages
            }, {
                id: 'rubrics', label: 'Rubrics', count: counts.rubrics
            }, {
                id: 'assignment-groups', label: 'Assignment Groups', count: counts.assignmentGroups
            }, {
                id: 'announcements', label: 'Announcements', count: counts.announcements
            }, {
                id: 'attachments', label: 'Attachments', count: counts.attachments
            }, {
                id: 'folders', label: 'Folders', count: counts.folders
            }, {
                id: 'outcomes', label: 'Outcomes', count: counts.outcomes
            }, {
                id: 'calendar-events', label: 'Calendar Events', count: counts.calendarEvents
            }].map(it => `
                                                    <div class=\"col-sm-6 col-lg-4\">
                                                                                                                <button type=\"button\" id=\"btn-${it.id}\" data-key=\"${it.id}\" class=\"btn btn-outline-secondary w-100 d-flex justify-content-between align-items-center toggle-tile ${it.count ? '' : 'disabled'}\" ${it.count ? '' : 'disabled'} aria-pressed=\"false\">
                                                            <span>${it.label}</span>
                                                                                                                    <span class=\"badge bg-secondary\">${it.count}</span>
                                                        </button>
                                                    </div>`).join('')}
                                </div>
                                <div class="d-flex justify-content-end gap-2 mt-3">
                                    <button id="imports-cancel-btn" type="button" class="btn btn-secondary">Cancel</button>
                                    <button id="imports-remove-btn" type="button" class="btn btn-danger">Delete</button>
                                </div>
                            </div>
                        </div>
                `;

        const details = responseContainer.querySelector('#imports-response-details');
        const removeBtn = details.querySelector('#imports-remove-btn');
        const cancelBtn = details.querySelector('#imports-cancel-btn');
        const selectAllBtn = details.querySelector('#imports-select-all');
        const selectNoneBtn = details.querySelector('#imports-select-none');

        // Event delegation for toggle tiles
        const toggleGrid = details.querySelector('#imports-toggle-grid');
        toggleGrid?.addEventListener('click', (ev) => {
            const btn = ev.target.closest('.toggle-tile');
            if (!btn || btn.disabled) return;
            const newState = !btn.classList.contains('active');
            btn.classList.toggle('active', newState);
            btn.setAttribute('aria-pressed', String(newState));
            // Click pulse animation
            btn.classList.remove('toggle-pulse');
            // Force reflow to restart animation if needed
            // eslint-disable-next-line no-unused-expressions
            btn.offsetWidth;
            btn.classList.add('toggle-pulse');
            recomputeTotal();
        });

        // Add tooltip on Folders when any root folders were found; disable if none deletable
        const foldersBtn = details.querySelector('#btn-folders');
        if (foldersBtn && (assets.folders?.length || 0) > 0 && rootFolderIds.length > 0) {
            const total = assets.folders.length;
            const rootCount = rootFolderIds.length;
            const tip = (rootCount === total)
                ? 'Root folders cannot be deleted and have been excluded.'
                : `${rootCount} root folder(s) were excluded and cannot be deleted.`;
            foldersBtn.setAttribute('title', tip);
            foldersBtn.setAttribute('aria-label', `Folders. ${tip}`);
        }
        if (foldersBtn && counts.folders === 0) {
            foldersBtn.disabled = true;
            foldersBtn.classList.add('disabled');
        }

        const allButtons = Array.from(details.querySelectorAll('.toggle-tile')).filter(btn => !btn.disabled);
        const setAll = (on) => {
            allButtons.forEach(btn => {
                btn.classList.toggle('active', on);
                btn.setAttribute('aria-pressed', String(on));
            });
        };

        selectAllBtn?.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); setAll(true); recomputeTotal(); });
        selectNoneBtn?.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); setAll(false); recomputeTotal(); });

        const recomputeTotal = () => {
            const totalSpan = details.querySelector('#imports-total');
            if (!totalSpan) return;
            const activeButtons = Array.from(details.querySelectorAll('.toggle-tile.active')).filter(b => !b.disabled);
            let sum = 0;
            activeButtons.forEach(b => {
                const bdg = b.querySelector('.badge');
                const n = parseInt(bdg?.textContent || '0', 10);
                if (!Number.isNaN(n)) sum += n;
            });
            totalSpan.textContent = `Total: ${sum}`;
        };

        // Initialize total label
        recomputeTotal();

        cancelBtn.addEventListener('click', (e2) => {
            e2.preventDefault();
            e2.stopPropagation();
            courseID.value = '';
            responseContainer.innerHTML = '';
            checkBtn.disabled = true;
            // Hide progress UI on cancel
            progressDiv.hidden = true;
            if (spinner) spinner.hidden = true;
        });

        removeBtn.addEventListener('click', async (e3) => {
            e3.preventDefault();
            e3.stopPropagation();

            const isOn = (key) => details.querySelector(`#btn-${key}`)?.classList.contains('active');
            const selections = {
                attachments: isOn('attachments') && counts.attachments > 0,
                folders: isOn('folders') && counts.folders > 0,
                outcomes: isOn('outcomes') && counts.outcomes > 0,
                rubrics: isOn('rubrics') && counts.rubrics > 0,
                assignmentGroups: isOn('assignment-groups') && counts.assignmentGroups > 0,
                assignments: isOn('assignments') && counts.assignments > 0,
                quizzes: isOn('quizzes') && counts.quizzes > 0,
                announcements: isOn('announcements') && counts.announcements > 0,
                discussions: isOn('discussions') && counts.discussions > 0,
                pages: isOn('pages') && counts.pages > 0,
                modules: isOn('modules') && counts.modules > 0,
                calendarEvents: isOn('calendar-events') && counts.calendarEvents > 0,
            };

            if (!Object.values(selections).some(Boolean)) {
                progressInfo.innerHTML = '<span style="color: red;">Select at least one content type to delete.</span>';
                return;
            }

            details.innerHTML = '';
            progressBar.parentElement.hidden = false;
            if (spinner) spinner.hidden = true;
            progressInfo.innerHTML = 'Deleting selected content...';

            // Wire progress
            window.progressAPI.onUpdateProgress((p) => {
                updateProgressWithPercent(progressBar, p);
            });

            try {
                const batchResults = [];
                // Assignments
                if (selections.assignments) {
                    const payloadA = {
                        domain,
                        token,
                        course_id,
                        number: assets.assignments.length,
                        assignments: assets.assignments.map(id => ({ id }))
                    };
                    const responseA = await window.axios.deleteAssignments(payloadA);
                    if (responseA) batchResults.push(responseA);
                }

                // Attachments (files)
                if (selections.attachments) {
                    const payloadFiles = {
                        domain,
                        token,
                        attachments: assets.attachments.map(id => ({ id }))
                    };
                    const responseFiles = await window.axios.deleteAttachments(payloadFiles);
                    if (responseFiles) batchResults.push(responseFiles);
                }

                // Folders
                if (selections.folders) {
                    const payloadF = {
                        domain,
                        token,
                        course_id,
                        // Use non-root folders only
                        folders: nonRootFolders.map(id => ({ id }))
                    };
                    const responseF = await window.axios.deleteFolders(payloadF);
                    if (responseF) batchResults.push(responseF);
                }



                // Discussions
                if (selections.discussions) {
                    const payloadD = {
                        domain,
                        token,
                        course_id,
                        discussions: assets.discussions
                    };
                    const responseD = await window.axios.deleteDiscussions(payloadD);
                    if (responseD) batchResults.push(responseD);
                }

                // Quizzes (classic)
                if (selections.quizzes) {
                    const payloadQ = {
                        domain,
                        token,
                        courseID: course_id,
                        quizzes: assets.quizzes.map(id => ({ _id: id }))
                    };
                    const responseQ = await window.axios.deleteClassicQuizzes(payloadQ);
                    if (responseQ) batchResults.push(responseQ);
                }

                // Modules
                if (selections.modules) {
                    const payloadM = {
                        domain,
                        token,
                        course_id,
                        number: assets.modules.length,
                        module_ids: assets.modules.map(id => ({ id }))
                    };
                    const responseM = await window.axios.deleteModules(payloadM);
                    if (responseM) batchResults.push(responseM);
                }

                // Note: The following types are detected but not yet wired to delete APIs in this app:
                // Attachments, Outcomes, Rubrics, Assignment Groups (bulk delete), Announcements, Pages, Calendar Events
                // We can implement these in a follow-up.

                // Summarize failures (e.g., root folder skips) from batch responses
                const allFailed = batchResults.flatMap(r => Array.isArray(r.failed) ? r.failed : []);
                if (allFailed.length > 0) {
                    const rootFolderMsgs = allFailed
                        .filter(f => String(f.status) === '422' && /root folder/i.test(String(f.reason)))
                        .map(f => f.reason);
                    const otherMsgs = allFailed
                        .filter(f => !(String(f.status) === '422' && /root folder/i.test(String(f.reason))))
                        .map(f => f.reason);

                    const lines = [];
                    if (rootFolderMsgs.length > 0) {
                        lines.push(`Some folders were skipped: root folders cannot be deleted.`);
                    }
                    if (otherMsgs.length > 0) {
                        lines.push(`Some items failed to delete: ${otherMsgs.slice(0, 3).join(' | ')}${otherMsgs.length > 3 ? '…' : ''}`);
                    }
                    progressInfo.innerHTML = `<span class="text-warning">${lines.join(' ')}</span>`;
                } else {
                    progressInfo.innerHTML = 'Finished deleting selected imported content.';
                }
                updateProgressWithPercent(progressBar, 100);
            } catch (error) {
                errorHandler(error, progressInfo);
            }
        });
    });

    listBtn.addEventListener('click', async (e2) => {
        e2.preventDefault();
        e2.stopPropagation();

        responseContainer.innerHTML = '';
        progressDiv.hidden = false;
        progressBar.parentElement.hidden = true;
        progressBar.style.width = '0%';
        if (spinner) spinner.hidden = false;
        progressInfo.innerHTML = 'Loading recent imports...';

        const domain = document.querySelector('#domain').value.trim();
        const token = document.querySelector('#token').value.trim();
        const course_id = courseID.value.trim();
        try {
            const imports = await window.axios.listContentMigrations({ domain, token, course_id });
            progressInfo.innerHTML = 'Done';
            if (spinner) spinner.hidden = true;
            if (!imports || imports.length === 0) {
                responseContainer.innerHTML = '<div class="alert alert-info">No imports found for this course.</div>';
                return;
            }
            const rows = imports.map(m => {
                const id = m.id ?? m.ID ?? m._id;
                const type = m.migration_type || m.workflow_state || 'import';
                const started = m.started_at || m.created_at || '';
                return `<tr><td>${id}</td><td>${type}</td><td>${started}</td></tr>`;
            }).join('');
            responseContainer.innerHTML = `
                <div class="table-responsive">
                    <table class="table table-sm table-striped">
                        <thead><tr><th>Import ID</th><th>Type/State</th><th>Started</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                    <div class="form-text">Copy an Import ID from above and paste it into the Import ID field.</div>
                </div>`;
        } catch (err) {
            errorHandler(err, progressInfo);
            if (spinner) spinner.hidden = true;
        }
    });
}
