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

                        <div id="imports-list-container" class="mt-3"></div>
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
    const listContainer = form.querySelector('#imports-list-container');

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

            // Handle specific error types and display them in the response container
            // if (error.message && error.message.includes('403')) {
            //     responseContainer.innerHTML = `<div class="alert alert-danger">
            //         <h6>Access Denied (403)</h6>
            //         <p>You don't have permission to access the imported content for this course or import.</p>
            //         <p><strong>Possible reasons:</strong></p>
            //         <ul>
            //             <li>You may not have admin access to this course</li>
            //             <li>The course ID might be invalid</li>
            //             <li>The import ID might not exist or belong to a different course</li>
            //             <li>Your Canvas token may not have sufficient permissions</li>
            //         </ul>
            //         <p><em>Error details: ${error.message}</em></p>
            //     </div>`;
            // } else if (error.message && error.message.includes('404')) {
            //     responseContainer.innerHTML = `<div class="alert alert-warning">
            //         <h6>Not Found (404)</h6>
            //         <p>The course ID or import ID could not be found.</p>
            //         <p>Please verify that:</p>
            //         <ul>
            //             <li>The course ID is correct</li>
            //             <li>The import ID exists for this course</li>
            //         </ul>
            //         <p>Click "List Imports" to see recent import IDs for this course.</p>
            //     </div>`;
            // } else if ((error.message || '').includes('Import ID may be invalid')) {
            //     responseContainer.innerHTML = `<div class="alert alert-warning">Could not load import ${import_id}. Click "List Imports" to see recent import IDs for this course.</div>`;
            // } else {
            //     // Generic error display
            //     responseContainer.innerHTML = `<div class="alert alert-danger">
            //         <h6>Error Loading Import Content</h6>
            //         <p>An error occurred while trying to load the imported content:</p>
            //         <p><strong>${error.message || 'Unknown error occurred'}</strong></p>
            //         <p>Please check your course ID, import ID, and try again.</p>
            //     </div>`;
            // }

            if (spinner) spinner.hidden = true;
            hasError = true;
        } finally {
            checkBtn.disabled = false;
        }

        if (hasError) return;

        // Process the imported_assets from the actual response structure
        console.log('Full response received:', assets); // Debug log

        // Extract imported_assets from the nested response structure
        // Try multiple possible locations for imported_assets
        let importedAssets = null;

        if (assets.imported_assets) {
            // Direct access (some responses)
            importedAssets = assets.imported_assets;
            console.log('Found imported_assets at root level');
        } else if (assets.audit_info?.migration_settings?.imported_assets) {
            // Nested access (most common in Canvas responses)
            importedAssets = assets.audit_info.migration_settings.imported_assets;
            console.log('Found imported_assets in audit_info.migration_settings');
        } else {
            // Fallback - no imported assets found
            importedAssets = {};
            console.log('No imported_assets found in response');
        }

        console.log('Imported assets:', importedAssets); // Debug log        // Function to count items from comma-separated string or array
        const countItems = (value) => {
            if (!value) return 0;
            if (Array.isArray(value)) return value.length;
            if (typeof value === 'string') {
                const trimmed = value.trim();
                return trimmed === '' ? 0 : trimmed.split(',').filter(id => id.trim()).length;
            }
            return 0;
        };

        // Map Canvas imported_assets keys to our display names and count the items
        const assetTypeMapping = {
            'Attachment': { key: 'attachments', label: 'Attachments' },
            'Assignment': { key: 'assignments', label: 'Assignments' },
            'AssignmentGroup': { key: 'assignmentGroups', label: 'Assignment Groups' },
            'Quizzes::Quiz': { key: 'quizzes', label: 'Quizzes (Classic)' },
            'WikiPage': { key: 'pages', label: 'Pages' },
            'ContextModule': { key: 'modules', label: 'Modules' },
            'DiscussionTopic': { key: 'discussions', label: 'Discussions' },
            'Announcement': { key: 'announcements', label: 'Announcements' },
            'CalendarEvent': { key: 'calendarEvents', label: 'Calendar Events' },
            'Rubric': { key: 'rubrics', label: 'Rubrics' },
            'LearningOutcome': { key: 'outcomes', label: 'Outcomes' },
            'Folder': { key: 'folders', label: 'Folders' },
            'ContentTag': { key: 'contentTags', label: 'Content Tags' },
            'AssessmentQuestionBank': { key: 'questionBanks', label: 'Question Banks' },
            'GradingStandard': { key: 'gradingStandards', label: 'Grading Standards' }
        };

        // Build counts object from actual imported_assets
        const counts = {};

        // Initialize all possible counts to 0
        Object.values(assetTypeMapping).forEach(mapping => {
            counts[mapping.key] = 0;
        });

        // Process each type found in imported_assets
        Object.entries(importedAssets).forEach(([canvasType, items]) => {
            const mapping = assetTypeMapping[canvasType];
            if (mapping) {
                counts[mapping.key] = countItems(items);
                console.log(`${canvasType} (${mapping.label}): ${counts[mapping.key]} items`); // Debug log
            } else {
                console.log(`Unknown asset type: ${canvasType} with items:`, items); // Debug log for unmapped types
            }
        });

        // Handle folders separately if they need root folder filtering
        let rootFolderIds = [];
        if (counts.folders > 0 && importedAssets.Folder) {
            try {
                // Convert comma-separated folder IDs to array
                const folderIds = typeof importedAssets.Folder === 'string'
                    ? importedAssets.Folder.split(',').map(id => id.trim()).filter(id => id)
                    : (Array.isArray(importedAssets.Folder) ? importedAssets.Folder : []);

                const meta = await window.axios.getFoldersMeta({ domain, token, folders: folderIds });
                rootFolderIds = meta.filter(m => m.isRoot).map(m => String(m.id));

                // Update folder count excluding root folders
                const nonRootFolders = folderIds.filter(id => !rootFolderIds.includes(String(id)));
                counts.folders = nonRootFolders.length;
                console.log(`Folders after filtering roots: ${counts.folders}`); // Debug log
            } catch (e) {
                console.warn('Folder metadata lookup failed, proceeding without root filter.', e?.message || e);
            }
        }

        const totalAll = Object.values(counts).reduce((a, b) => a + b, 0);
        console.log('Total imported items:', totalAll); // Debug log

        // Transform imported_assets into the format expected by delete operations
        // Convert comma-separated strings to arrays of IDs
        const transformedAssets = {};

        Object.entries(importedAssets).forEach(([canvasType, items]) => {
            const mapping = assetTypeMapping[canvasType];
            if (mapping && items) {
                let itemArray;
                if (typeof items === 'string') {
                    itemArray = items.split(',').map(id => id.trim()).filter(id => id);
                } else if (Array.isArray(items)) {
                    itemArray = items;
                } else {
                    itemArray = [];
                }

                // Store in the format expected by delete operations
                if (mapping.key === 'folders') {
                    // Filter out root folders for delete operations
                    transformedAssets.folders = itemArray.filter(id => !rootFolderIds.includes(String(id)));
                } else {
                    transformedAssets[mapping.key] = itemArray;
                }
            }
        });

        // Ensure all expected properties exist as arrays (for compatibility with existing delete code)
        const expectedProps = ['assignments', 'attachments', 'discussions', 'quizzes', 'modules', 'pages',
            'rubrics', 'assignmentGroups', 'announcements', 'calendarEvents', 'outcomes', 'folders',
            'questionBanks', 'gradingStandards'];
        expectedProps.forEach(prop => {
            if (!transformedAssets[prop]) {
                transformedAssets[prop] = [];
            }
        });

        // Replace the assets object with our transformed version
        assets = { ...assets, ...transformedAssets };

        console.log('Transformed assets for delete operations:', assets); // Debug log

        if (totalAll === 0) {
            // If only root folders were found (and excluded), still show the card so users can see why
            const onlyRootFolders = (importedAssets.Folder) && rootFolderIds.length > 0;
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
                                    <span id="imports-total" class="text-muted small">Total: ${totalAll}</span>
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
            }, {
                id: 'question-banks', label: 'Question Banks', count: counts.questionBanks
            }, {
                id: 'content-tags', label: 'Content Tags', count: counts.contentTags
            }, {
                id: 'grading-standards', label: 'Grading Standards', count: counts.gradingStandards
            }].filter(it => it.count > 0).map(it => `
                                                    <div class=\"col-sm-6 col-lg-4\">
                                                                                                                <button type=\"button\" id=\"btn-${it.id}\" data-key=\"${it.id}\" class=\"btn btn-outline-secondary w-100 d-flex justify-content-between align-items-center toggle-tile\" aria-pressed=\"false\">
                                                            <span>${it.label}</span>
                                                                                                                    <span class=\"badge bg-secondary\">${it.count}</span>
                                                        </button>
                                                    </div>`).join('')}
                                </div>
                                ${totalAll === 0 ? '<div class="alert alert-info mt-3">No deletable content found in this import.</div>' : ''}
                                <div class="d-flex justify-content-end gap-2 mt-3">
                                    <button id="imports-cancel-btn" type="button" class="btn btn-secondary">Cancel</button>
                                    <button id="imports-remove-btn" type="button" class="btn btn-danger" ${totalAll === 0 ? 'disabled' : ''}>Delete</button>
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
            // Keep the list container visible so user can still reference import IDs
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
                questionBanks: isOn('question-banks') && counts.questionBanks > 0,
                contentTags: isOn('content-tags') && counts.contentTags > 0,
                gradingStandards: isOn('grading-standards') && counts.gradingStandards > 0,
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

                // Grading Standards
                if (selections.gradingStandards) {
                    const payloadGS = {
                        domain,
                        token,
                        course_id,
                        grading_standards: assets.gradingStandards.map(id => ({ id }))
                    };
                    const responseGS = await window.axios.deleteGradingStandards(payloadGS);
                    if (responseGS) batchResults.push(responseGS);
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

        // Clear main response container but keep list container
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
                listContainer.innerHTML = `
                    <div class="card">
                        <div class="card-header">
                            <h6 class="mb-0">Recent Imports</h6>
                        </div>
                        <div class="card-body">
                            <div class="alert alert-info mb-0">No imports found for this course.</div>
                        </div>
                    </div>`;
                return;
            }

            const rows = imports.map(m => {
                const id = m.id ?? m.ID ?? m._id;
                const type = m.migration_type_title || m.migration_type || m.workflow_state || 'import';
                const status = m.workflow_state || '';
                const created = m.created_at || m.started_at || '';
                const userId = m.user_id || m.audit_info?.user_id || '';
                const sourceCourseId = m.settings?.source_course_id || m.audit_info?.source_course_id || '';

                const statusBadge = status ?
                    `<span class="badge bg-${status === 'completed' ? 'success' : status === 'failed' ? 'danger' : 'secondary'}">${status}</span>` : '';

                // Create clickable links for user ID and course ID
                const userIdLink = userId ?
                    `<a href="#" class="text-decoration-none user-link" data-user-id="${userId}" title="Open user profile in new tab">${userId}</a>` :
                    '';
                const courseIdLink = sourceCourseId ?
                    `<a href="#" class="text-decoration-none course-link" data-course-id="${sourceCourseId}" title="Open course in new tab">${sourceCourseId}</a>` :
                    '';

                return `
                    <tr data-import-id="${id}">
                        <td><strong><span class="import-id-clickable" style="cursor: pointer;" title="Click to use this Import ID">${id}</span></strong></td>
                        <td>${userIdLink}</td>
                        <td>${courseIdLink}</td>
                        <td>${type}</td>
                        <td>${statusBadge}</td>
                        <td class="text-muted small">${created}</td>
                    </tr>`;
            }).join('');

            listContainer.innerHTML = `
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h6 class="mb-0">Recent Imports</h6>
                        <button class="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="collapse" data-bs-target="#imports-list-collapse" aria-expanded="true" aria-controls="imports-list-collapse">
                            <i class="collapse-icon">−</i>
                        </button>
                    </div>
                    <div class="collapse show" id="imports-list-collapse">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-sm table-hover mb-0" id="imports-table">
                                    <thead class="table-light">
                                        <tr>
                                            <th>Import ID</th>
                                            <th>User ID</th>
                                            <th>Source Course</th>
                                            <th>Type</th>
                                            <th>Status</th>
                                            <th>Created</th>
                                        </tr>
                                    </thead>
                                    <tbody>${rows}</tbody>
                                </table>
                            </div>
                            <div class="form-text mt-2">
                                <i class="text-primary">💡 Tips:</i> Click on <strong>Import ID</strong> to fill the form field above. Click on <strong>User ID</strong> or <strong>Source Course</strong> to open them in a new browser tab.
                            </div>
                        </div>
                    </div>
                </div>`;

            // Add collapse icon toggle functionality
            const collapseElement = listContainer.querySelector('#imports-list-collapse');
            const collapseIcon = listContainer.querySelector('.collapse-icon');

            collapseElement.addEventListener('show.bs.collapse', () => {
                collapseIcon.textContent = '−';
            });

            collapseElement.addEventListener('hide.bs.collapse', () => {
                collapseIcon.textContent = '+';
            });

            // Add click event delegation for import rows
            const importsTable = listContainer.querySelector('#imports-table');
            importsTable.addEventListener('click', (event) => {
                event.preventDefault();

                // Handle User ID link clicks
                if (event.target.classList.contains('user-link')) {
                    const userId = event.target.getAttribute('data-user-id');
                    const domain = document.querySelector('#domain').value.trim();
                    if (userId && domain) {
                        const userUrl = `https://${domain}/users/${userId}`;
                        window.shell.openExternal(userUrl);
                    }
                    return;
                }

                // Handle Course ID link clicks
                if (event.target.classList.contains('course-link')) {
                    const courseId = event.target.getAttribute('data-course-id');
                    const domain = document.querySelector('#domain').value.trim();
                    if (courseId && domain) {
                        const courseUrl = `https://${domain}/courses/${courseId}`;
                        window.shell.openExternal(courseUrl);
                    }
                    return;
                }

                // Handle Import ID clicks (fill form field)
                if (event.target.classList.contains('import-id-clickable')) {
                    const row = event.target.closest('tr[data-import-id]');
                    if (row) {
                        const importId = row.getAttribute('data-import-id');
                        importID.value = importId;
                        importID.dispatchEvent(new Event('input'));

                        // Visual feedback - highlight the selected row briefly
                        row.style.backgroundColor = '#d4edda';
                        setTimeout(() => {
                            row.style.backgroundColor = '';
                        }, 500);
                    }
                    return;
                }
            });

        } catch (err) {
            errorHandler(err, progressInfo);
            if (spinner) spinner.hidden = true;
            listContainer.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h6 class="mb-0 text-danger">Error Loading Imports</h6>
                    </div>
                    <div class="card-body">
                        <div class="alert alert-danger mb-0">${err.message || 'Failed to load imports'}</div>
                    </div>
                </div>`;
        }
    });
}
