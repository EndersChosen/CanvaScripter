// Helper function to process imported assets and return structured data
async function processImportedAssets(assets, domain, token) {
    // Function to count items from comma-separated string or array
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

    // Extract imported_assets from the response structure
    let importedAssets = null;
    if (assets.imported_assets) {
        importedAssets = assets.imported_assets;
    } else if (assets.audit_info?.migration_settings?.imported_assets) {
        importedAssets = assets.audit_info.migration_settings.imported_assets;
    } else {
        importedAssets = {};
    }

    // Build counts object from actual imported_assets
    const counts = {};
    Object.values(assetTypeMapping).forEach(mapping => {
        counts[mapping.key] = 0;
    });

    // Process each type found in imported_assets
    Object.entries(importedAssets).forEach(([canvasType, items]) => {
        const mapping = assetTypeMapping[canvasType];
        if (mapping) {
            counts[mapping.key] = countItems(items);
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
        } catch (e) {
            console.warn('Folder metadata lookup failed, proceeding without root filter.', e?.message || e);
        }
    }

    const totalAll = Object.values(counts).reduce((a, b) => a + b, 0);

    // Transform imported_assets into the format expected by delete operations
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

    // Ensure all expected properties exist as arrays
    const expectedProps = ['assignments', 'attachments', 'discussions', 'quizzes', 'modules', 'pages',
        'rubrics', 'assignmentGroups', 'announcements', 'calendarEvents', 'outcomes', 'folders',
        'questionBanks', 'gradingStandards'];
    expectedProps.forEach(prop => {
        if (!transformedAssets[prop]) {
            transformedAssets[prop] = [];
        }
    });

    return { totalAll, counts, transformedAssets, rootFolderIds, assetTypeMapping };
}

// Helper function to generate asset selection UI
function generateAssetSelectionUI(assetData, importId) {
    const { counts, assetTypeMapping } = assetData;
    
    const assetTypes = [
        { id: 'assignments', label: 'Assignments', count: counts.assignments },
        { id: 'discussions', label: 'Discussions', count: counts.discussions },
        { id: 'quizzes', label: 'Quizzes (Classic)', count: counts.quizzes },
        { id: 'modules', label: 'Modules', count: counts.modules },
        { id: 'pages', label: 'Pages', count: counts.pages },
        { id: 'rubrics', label: 'Rubrics', count: counts.rubrics },
        { id: 'assignmentGroups', label: 'Assignment Groups', count: counts.assignmentGroups },
        { id: 'announcements', label: 'Announcements', count: counts.announcements },
        { id: 'attachments', label: 'Attachments', count: counts.attachments },
        { id: 'folders', label: 'Folders', count: counts.folders },
        { id: 'outcomes', label: 'Outcomes', count: counts.outcomes },
        { id: 'calendarEvents', label: 'Calendar Events', count: counts.calendarEvents },
        { id: 'questionBanks', label: 'Question Banks', count: counts.questionBanks },
        { id: 'contentTags', label: 'Content Tags', count: counts.contentTags },
        { id: 'gradingStandards', label: 'Grading Standards', count: counts.gradingStandards }
    ].filter(type => type.count > 0);

    return `
        <div class="import-assets-container" data-import-id="${importId}">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <span class="fw-bold">Imported Content (${assetData.totalAll} items)</span>
                <div class="btn-group btn-group-sm" role="group">
                    <button type="button" class="btn btn-outline-secondary select-all-btn">Select All</button>
                    <button type="button" class="btn btn-outline-secondary select-none-btn">None</button>
                    <button type="button" class="btn btn-danger delete-selected-btn" disabled>Delete Selected</button>
                </div>
            </div>
            <div class="row g-2 asset-toggle-grid">
                ${assetTypes.map(type => `
                    <div class="col-sm-6 col-lg-4">
                        <button type="button" class="btn btn-outline-secondary w-100 d-flex justify-content-between align-items-center toggle-tile" 
                                data-asset-type="${type.id}" aria-pressed="false">
                            <span>${type.label}</span>
                            <span class="badge bg-secondary">${type.count}</span>
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>`;
}

// Helper function to setup event listeners for import card interactions
function setupImportCardInteractions(container, domain, token, course_id, progressInfo, progressBar, progressDiv, spinner) {
    container.addEventListener('click', async (event) => {
        // Handle expand/collapse
        if (event.target.closest('.import-expand-btn')) {
            const card = event.target.closest('.import-card');
            card.classList.toggle('expanded');
            return;
        }

        // Handle user/course links
        if (event.target.classList.contains('user-link')) {
            const userId = event.target.getAttribute('data-user-id');
            if (userId && domain) {
                const userUrl = `https://${domain}/users/${userId}`;
                window.shell.openExternal(userUrl);
            }
            return;
        }

        if (event.target.classList.contains('course-link')) {
            const courseId = event.target.getAttribute('data-course-id');
            if (courseId && domain) {
                const courseUrl = `https://${domain}/courses/${courseId}`;
                window.shell.openExternal(courseUrl);
            }
            return;
        }

        // Handle asset selection toggle
        if (event.target.closest('.toggle-tile')) {
            const btn = event.target.closest('.toggle-tile');
            const newState = !btn.classList.contains('active');
            btn.classList.toggle('active', newState);
            btn.setAttribute('aria-pressed', String(newState));
            btn.classList.add('toggle-pulse');
            setTimeout(() => btn.classList.remove('toggle-pulse'), 320);
            
            // Update delete button state
            const container = btn.closest('.import-assets-container');
            updateDeleteButtonState(container);
            return;
        }

        // Handle select all/none buttons
        if (event.target.classList.contains('select-all-btn')) {
            const container = event.target.closest('.import-assets-container');
            const toggles = container.querySelectorAll('.toggle-tile');
            toggles.forEach(toggle => {
                toggle.classList.add('active');
                toggle.setAttribute('aria-pressed', 'true');
            });
            updateDeleteButtonState(container);
            return;
        }

        if (event.target.classList.contains('select-none-btn')) {
            const container = event.target.closest('.import-assets-container');
            const toggles = container.querySelectorAll('.toggle-tile');
            toggles.forEach(toggle => {
                toggle.classList.remove('active');
                toggle.setAttribute('aria-pressed', 'false');
            });
            updateDeleteButtonState(container);
            return;
        }

        // Handle delete selected button
        if (event.target.classList.contains('delete-selected-btn')) {
            const container = event.target.closest('.import-assets-container');
            const importId = container.getAttribute('data-import-id');
            await handleDeleteSelectedAssets(container, importId, domain, token, course_id, progressInfo, progressBar, progressDiv, spinner);
            return;
        }
    });
}

// Helper function to update delete button state
function updateDeleteButtonState(container) {
    const deleteBtn = container.querySelector('.delete-selected-btn');
    const activeToggles = container.querySelectorAll('.toggle-tile.active');
    deleteBtn.disabled = activeToggles.length === 0;
}

// Helper function to handle asset deletion
async function handleDeleteSelectedAssets(container, importId, domain, token, course_id, progressInfo, progressBar, progressDiv, spinner) {
    const activeToggles = container.querySelectorAll('.toggle-tile.active');
    if (activeToggles.length === 0) {
        progressInfo.innerHTML = '<span style="color: red;">Select at least one content type to delete.</span>';
        return;
    }

    // Get the asset data for this import
    let assetData;
    try {
        const assets = await window.axios.getImportedAssets({ domain, token, course_id, import_id: importId });
        assetData = await processImportedAssets(assets, domain, token);
    } catch (error) {
        progressInfo.innerHTML = `<span style="color: red;">Failed to load asset data: ${error.message}</span>`;
        return;
    }

    // Determine what's selected
    const selections = {};
    activeToggles.forEach(toggle => {
        const assetType = toggle.getAttribute('data-asset-type');
        selections[assetType] = true;
    });

    // Hide the container content and show progress
    container.innerHTML = '<div class="text-center p-3"><div class="spinner-border" role="status"></div><div>Deleting selected content...</div></div>';
    progressDiv.hidden = false;
    progressBar.parentElement.hidden = false;
    if (spinner) spinner.hidden = true;
    progressInfo.innerHTML = 'Deleting selected content...';

    // Wire progress
    window.progressAPI.onUpdateProgress((p) => {
        updateProgressWithPercent(progressBar, p);
    });

    try {
        const batchResults = [];
        const { transformedAssets } = assetData;

        // Process deletions based on selections
        if (selections.assignments && transformedAssets.assignments?.length > 0) {
            const payload = {
                domain, token, course_id,
                number: transformedAssets.assignments.length,
                assignments: transformedAssets.assignments.map(id => ({ id }))
            };
            const response = await window.axios.deleteAssignments(payload);
            if (response) batchResults.push(response);
        }

        if (selections.attachments && transformedAssets.attachments?.length > 0) {
            const payload = {
                domain, token,
                attachments: transformedAssets.attachments.map(id => ({ id }))
            };
            const response = await window.axios.deleteAttachments(payload);
            if (response) batchResults.push(response);
        }

        if (selections.folders && transformedAssets.folders?.length > 0) {
            const payload = {
                domain, token, course_id,
                folders: transformedAssets.folders.map(id => ({ id }))
            };
            const response = await window.axios.deleteFolders(payload);
            if (response) batchResults.push(response);
        }

        if (selections.discussions && transformedAssets.discussions?.length > 0) {
            const payload = {
                domain, token, course_id,
                discussions: transformedAssets.discussions
            };
            const response = await window.axios.deleteDiscussions(payload);
            if (response) batchResults.push(response);
        }

        if (selections.quizzes && transformedAssets.quizzes?.length > 0) {
            const payload = {
                domain, token,
                courseID: course_id,
                quizzes: transformedAssets.quizzes.map(id => ({ _id: id }))
            };
            const response = await window.axios.deleteClassicQuizzes(payload);
            if (response) batchResults.push(response);
        }

        if (selections.modules && transformedAssets.modules?.length > 0) {
            const payload = {
                domain, token, course_id,
                number: transformedAssets.modules.length,
                module_ids: transformedAssets.modules.map(id => ({ id }))
            };
            const response = await window.axios.deleteModules(payload);
            if (response) batchResults.push(response);
        }

        if (selections.gradingStandards && transformedAssets.gradingStandards?.length > 0) {
            const payload = {
                domain, token, course_id,
                grading_standards: transformedAssets.gradingStandards.map(id => ({ id }))
            };
            const response = await window.axios.deleteGradingStandards(payload);
            if (response) batchResults.push(response);
        }

        // Process results and show summary
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

        // Show success message in container
        container.innerHTML = '<div class="alert alert-success">Selected content has been deleted successfully.</div>';

    } catch (error) {
        errorHandler(error, progressInfo);
        container.innerHTML = `<div class="alert alert-danger">Error deleting content: ${error.message}</div>`;
    }
}

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
            <div class="card">
                                <div class="card-header bg-secondary-subtle">
                    <h3 class="card-title mb-0 text-dark">
                        <i class="bi bi-cloud-download me-2"></i>Import Items Cleaner
                    </h3>
                    <small class="text-muted">Enter a Course ID and Import ID to review and delete imported items</small>
                </div>
                <div class="card-body">
                    <div class="row g-3 align-items-start">
                        <div class="col-sm-6">
                            <label for="course-id" class="form-label fw-bold">
                                <i class="bi bi-book me-1"></i>Course ID
                            </label>
                            <input id="course-id" type="text" class="form-control" 
                                   aria-describedby="course-id-help" inputmode="numeric" 
                                   placeholder="Enter course ID" />
                            <div id="course-id-help" class="form-text text-muted">
                                <i class="bi bi-info-circle me-1"></i>Numbers only
                            </div>
                            <div class="invalid-feedback">
                                <i class="bi bi-exclamation-triangle me-1"></i>Please enter a valid numeric Course ID
                            </div>
                        </div>
                        <div class="col-auto d-flex align-items-end">
                            <button id="list-imports-btn" type="button" class="btn btn-primary" disabled>
                                <i class="bi bi-list me-1"></i>List Imports with Assets
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            
            <!-- Progress Card -->
            <div class="card mt-3" id="imports-progress-div" hidden>
                <div class="card-header">
                    <h5 class="card-title mb-0">
                        <i class="bi bi-gear me-2"></i>Processing Import
                    </h5>
                </div>
                <div class="card-body">
                    <p id="imports-progress-info" class="mb-2">Preparing...</p>
                    <div class="progress mb-2" style="height: 15px;">
                        <div class="progress-bar progress-bar-striped progress-bar-animated" 
                             role="progressbar" style="width: 0%" 
                             aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                        </div>
                    </div>
                </div>
            </div>

            <!-- Results Card -->
            <div class="card mt-3" id="imports-list-container-card" hidden>
                <div class="card-body" id="imports-list-container"></div>
            </div>
                `;
        eContent.append(form);
    }

    form.hidden = false;
    const courseID = form.querySelector('#course-id');
    const listBtn = form.querySelector('#list-imports-btn');
    const progressDiv = form.querySelector('#imports-progress-div');
    const progressBar = progressDiv.querySelector('.progress-bar');
    const spinner = progressDiv.querySelector('.spinner-border');
    const progressInfo = form.querySelector('#imports-progress-info');
    const listContainer = form.querySelector('#imports-list-container');

    courseID.addEventListener('input', () => {
        const valid = /^(\d+)$/.test(courseID.value.trim());
        courseID.classList.toggle('is-invalid', !valid && courseID.value.trim().length > 0);
        listBtn.disabled = !valid;
    });

    // OLD CODE COMMENTED OUT - checkBtn no longer exists
    /*
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

        // Show the response container card
        const responseContainerCard = form.querySelector('#imports-response-container-card');
        if (responseContainerCard) {
            responseContainerCard.hidden = false;
        }

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
                // Show the response container card even when no assets found
                const responseContainerCard = form.querySelector('#imports-response-container-card');
                if (responseContainerCard) {
                    responseContainerCard.hidden = false;
                }
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
    */
    // END OLD COMMENTED OUT CODE

    listBtn.addEventListener('click', async (e2) => {
        e2.preventDefault();
        e2.stopPropagation();

        // Clear list container and show progress
        listContainer.innerHTML = '';
        progressDiv.hidden = false;
        progressBar.parentElement.hidden = true;
        progressBar.style.width = '0%';
        if (spinner) spinner.hidden = false;
        progressInfo.innerHTML = 'Loading recent imports and their assets...';

        const domain = document.querySelector('#domain').value.trim();
        const token = document.querySelector('#token').value.trim();
        const course_id = courseID.value.trim();
        
        try {
            // First get the imports list
            const imports = await window.axios.listContentMigrations({ domain, token, course_id });
            
            if (!imports || imports.length === 0) {
                progressInfo.innerHTML = 'No imports found';
                if (spinner) spinner.hidden = true;
                
                const listContainerCard = form.querySelector('#imports-list-container-card');
                if (listContainerCard) {
                    listContainerCard.hidden = false;
                }
                
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

            progressInfo.innerHTML = `Loading assets for ${imports.length} imports...`;
            
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
                    .toggle-tile:not(.active):hover { 
                        background-color: rgba(var(--bs-secondary-rgb,108,117,125), .08);
                        border-color: rgba(var(--bs-secondary-rgb,108,117,125), .75);
                        color: var(--bs-body-color, #212529);
                    }
                    .toggle-tile.active {
                        background-color: var(--bs-secondary, #6c757d);
                        color: #fff;
                        border-color: var(--bs-secondary, #6c757d);
                    }
                    .toggle-tile.active .badge { background-color: rgba(255,255,255,.35); }
                    .toggle-tile.active:hover { filter: brightness(0.96); }
                    .toggle-tile.disabled, .toggle-tile[disabled] { opacity: .6; cursor: not-allowed; }
                    .toggle-tile:focus-visible { outline: none; box-shadow: 0 0 0 .2rem rgba(var(--bs-secondary-rgb,108,117,125), .35); }
                    @keyframes tilePulse { 
                        0% { box-shadow: 0 0 0 0 rgba(var(--bs-secondary-rgb,108,117,125), .45); }
                        100% { box-shadow: 0 0 0 .6rem rgba(var(--bs-secondary-rgb,108,117,125), 0); }
                    }
                    .toggle-tile.toggle-pulse { animation: tilePulse 320ms ease; }
                    .import-card-content { display: none; }
                    .import-card.expanded .import-card-content { display: block; }
                    .import-expand-btn { transition: transform 200ms ease; }
                    .import-card.expanded .import-expand-btn { transform: rotate(180deg); }
                `;
                document.head.appendChild(style);
            })();

            // Generate expandable import cards
            const importCards = await Promise.all(imports.map(async (importItem, index) => {
                const id = importItem.id ?? importItem.ID ?? importItem._id;
                const type = importItem.migration_type_title || importItem.migration_type || importItem.workflow_state || 'import';
                const status = importItem.workflow_state || '';
                const created = importItem.created_at || importItem.started_at || '';
                const userId = importItem.user_id || importItem.audit_info?.user_id || '';
                const sourceCourseId = importItem.settings?.source_course_id || importItem.audit_info?.source_course_id || '';

                const statusBadge = status ?
                    `<span class="badge bg-${status === 'completed' ? 'success' : status === 'failed' ? 'danger' : 'secondary'}">${status}</span>` : '';

                // Try to fetch assets for this import
                let assetData = null;
                let hasAssets = false;
                
                try {
                    progressInfo.innerHTML = `Loading assets for import ${id} (${index + 1}/${imports.length})...`;
                    const assets = await window.axios.getImportedAssets({ domain, token, course_id, import_id: id });
                    assetData = await processImportedAssets(assets, domain, token);
                    hasAssets = assetData.totalAll > 0;
                } catch (error) {
                    console.warn(`Failed to load assets for import ${id}:`, error.message);
                    assetData = { totalAll: 0, counts: {}, transformedAssets: {}, rootFolderIds: [] };
                }

                const userIdLink = userId ?
                    `<a href="#" class="text-decoration-none user-link" data-user-id="${userId}" title="Open user profile">${userId}</a>` : 'N/A';
                const courseIdLink = sourceCourseId ?
                    `<a href="#" class="text-decoration-none course-link" data-course-id="${sourceCourseId}" title="Open course">${sourceCourseId}</a>` : 'N/A';

                return `
                    <div class="card mb-2 import-card" data-import-id="${id}">
                        <div class="card-header">
                            <div class="d-flex justify-content-between align-items-center">
                                <div class="d-flex align-items-center gap-3">
                                    <button class="btn btn-sm btn-outline-secondary import-expand-btn" type="button">
                                        <i class="bi bi-chevron-down"></i>
                                    </button>
                                    <div>
                                        <strong>Import ${id}</strong>
                                        <small class="text-muted ms-2">${type}</small>
                                    </div>
                                </div>
                                <div class="d-flex align-items-center gap-2">
                                    ${hasAssets ? `<span class="badge bg-info">${assetData.totalAll} items</span>` : '<span class="badge bg-secondary">No assets</span>'}
                                    ${statusBadge}
                                </div>
                            </div>
                        </div>
                        <div class="import-card-content">
                            <div class="card-body">
                                <div class="row mb-3">
                                    <div class="col-sm-4"><strong>User ID:</strong> ${userIdLink}</div>
                                    <div class="col-sm-4"><strong>Source Course:</strong> ${courseIdLink}</div>
                                    <div class="col-sm-4"><strong>Created:</strong> <small class="text-muted">${created}</small></div>
                                </div>
                                ${hasAssets ? generateAssetSelectionUI(assetData, id) : '<div class="alert alert-info">No imported assets found for this import.</div>'}
                            </div>
                        </div>
                    </div>`;
            }));

            progressInfo.innerHTML = 'Done';
            if (spinner) spinner.hidden = true;

            // Show the list container card
            const listContainerCard = form.querySelector('#imports-list-container-card');
            if (listContainerCard) {
                listContainerCard.hidden = false;
            }

            listContainer.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h6 class="mb-0">Recent Imports with Assets (${imports.length} found)</h6>
                        <small class="text-muted">Click the arrow to expand and view/select imported content for deletion</small>
                    </div>
                    <div class="card-body p-0">
                        ${importCards.join('')}
                    </div>
                </div>`;

            // Add event listeners for expanding/collapsing and asset selection
            setupImportCardInteractions(listContainer, domain, token, course_id, progressInfo, progressBar, progressDiv, spinner);

        } catch (err) {
            errorHandler(err, progressInfo);
            if (spinner) spinner.hidden = true;
            
            const listContainerCard = form.querySelector('#imports-list-container-card');
            if (listContainerCard) {
                listContainerCard.hidden = false;
            }
            
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
