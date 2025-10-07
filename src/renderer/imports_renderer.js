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
    const { counts } = assetData;
    
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

// Helper function to update delete button state
function updateDeleteButtonState(container) {
    const deleteBtn = container.querySelector('.delete-selected-btn');
    const activeToggles = container.querySelectorAll('.toggle-tile.active');
    deleteBtn.disabled = activeToggles.length === 0;
}

// Helper function to handle asset deletion
// Helper function to handle deletion of selected assets
async function handleDeleteSelectedAssets(container, domain, token, course_id, importId, progressInfo, progressBar, progressDiv, spinner, cancelBtn, cancelFlag) {
    const activeToggles = container.querySelectorAll('.toggle-tile.active');
    if (activeToggles.length === 0) {
        // Show error in the container itself
        const existingResult = container.querySelector('.deletion-result');
        if (existingResult) existingResult.remove();
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'deletion-result alert alert-warning mt-3';
        errorDiv.innerHTML = '<i class="bi bi-exclamation-triangle me-2"></i>Please select at least one content type to delete.';
        container.appendChild(errorDiv);
        return;
    }

    // Get the asset data for this import
    let assetData;
    try {
        const assets = await window.axios.getImportedAssets({ domain, token, course_id, import_id: importId });
        assetData = await processImportedAssets(assets, domain, token);
    } catch (error) {
        // Show error in the container itself
        const existingResult = container.querySelector('.deletion-result');
        if (existingResult) existingResult.remove();
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'deletion-result alert alert-danger mt-3';
        errorDiv.innerHTML = `<i class="bi bi-exclamation-circle me-2"></i>Failed to load asset data: ${error.message}`;
        container.appendChild(errorDiv);
        return;
    }

    // Determine what's selected
    const selections = {};
    activeToggles.forEach(toggle => {
        const assetType = toggle.getAttribute('data-asset-type');
        selections[assetType] = true;
    });

    // Remove any existing deletion result
    const existingResult = container.querySelector('.deletion-result');
    if (existingResult) existingResult.remove();

    // Create inline progress indicator in the container
    const progressDiv_inline = document.createElement('div');
    progressDiv_inline.className = 'deletion-result alert alert-info mt-3';
    progressDiv_inline.innerHTML = `
        <div class="d-flex align-items-center mb-2">
            <div class="spinner-border spinner-border-sm me-2" role="status"></div>
            <span class="deletion-status">Preparing to delete selected content...</span>
        </div>
        <div class="progress" style="height: 20px;">
            <div class="progress-bar progress-bar-striped progress-bar-animated deletion-progress-bar" 
                 role="progressbar" style="width: 0%" 
                 aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                <span class="progress-percent">0%</span>
            </div>
        </div>
        <button class="btn btn-sm btn-danger mt-2 cancel-delete-inline-btn">
            <i class="bi bi-x-circle me-1"></i>Cancel
        </button>
    `;
    container.appendChild(progressDiv_inline);
    
    const statusSpan = progressDiv_inline.querySelector('.deletion-status');
    const inlineProgressBar = progressDiv_inline.querySelector('.deletion-progress-bar');
    const inlineProgressPercent = progressDiv_inline.querySelector('.progress-percent');
    const inlineCancelBtn = progressDiv_inline.querySelector('.cancel-delete-inline-btn');
    
    // Setup inline cancel button
    const inlineCancelFlag = { cancelled: false };
    inlineCancelBtn.addEventListener('click', async () => {
        inlineCancelFlag.cancelled = true;
        inlineCancelBtn.disabled = true;
        inlineCancelBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Cancelling...';
        
        // Signal cancellation to main process for batch operations
        try {
            await window.axios.cancelDeleteOperations();
            console.log('Cancellation signal sent to main process');
        } catch (error) {
            console.error('Failed to send cancellation signal:', error);
        }
    });

    try {
        const batchResults = [];
        const { transformedAssets } = assetData;

        // Calculate total operations
        const deleteOperations = [];
        if (selections.assignments && transformedAssets.assignments?.length > 0) {
            deleteOperations.push({ type: 'assignments', count: transformedAssets.assignments.length, label: 'Assignments' });
        }
        if (selections.attachments && transformedAssets.attachments?.length > 0) {
            deleteOperations.push({ type: 'attachments', count: transformedAssets.attachments.length, label: 'Attachments' });
        }
        if (selections.folders && transformedAssets.folders?.length > 0) {
            deleteOperations.push({ type: 'folders', count: transformedAssets.folders.length, label: 'Folders' });
        }
        if (selections.discussions && transformedAssets.discussions?.length > 0) {
            deleteOperations.push({ type: 'discussions', count: transformedAssets.discussions.length, label: 'Discussions' });
        }
        if (selections.quizzes && transformedAssets.quizzes?.length > 0) {
            deleteOperations.push({ type: 'quizzes', count: transformedAssets.quizzes.length, label: 'Quizzes' });
        }
        if (selections.modules && transformedAssets.modules?.length > 0) {
            deleteOperations.push({ type: 'modules', count: transformedAssets.modules.length, label: 'Modules' });
        }
        if (selections.gradingStandards && transformedAssets.gradingStandards?.length > 0) {
            deleteOperations.push({ type: 'gradingStandards', count: transformedAssets.gradingStandards.length, label: 'Grading Standards' });
        }

        // Calculate total items to delete
        const totalItems = deleteOperations.reduce((sum, op) => sum + op.count, 0);
        let completedItems = 0;

        // Track progress for current operation
        let currentOperationIndex = 0;
        let currentOperationItemsProcessed = 0;
        
        // Setup progress listener for granular item-by-item updates
        const progressListener = (payload) => {
            // Show only current operation progress
            if (deleteOperations[currentOperationIndex]) {
                const currentOp = deleteOperations[currentOperationIndex];
                
                // Handle different payload formats from main process
                let progressValue = 0; // 0-1 range
                
                if (typeof payload === 'number') {
                    // Legacy format: percentage (0-100)
                    progressValue = payload / 100;
                } else if (payload && typeof payload === 'object') {
                    if (typeof payload.value === 'number') {
                        // Modern format: value is 0-1 range
                        progressValue = payload.value;
                    } else if (typeof payload.processed === 'number' && typeof payload.total === 'number' && payload.total > 0) {
                        // Calculate from processed/total
                        progressValue = payload.processed / payload.total;
                    } else if (typeof payload.percent === 'number') {
                        // Percentage format
                        progressValue = payload.percent / 100;
                    }
                }
                
                // Ensure progressValue is valid (0-1 range)
                progressValue = Math.max(0, Math.min(1, progressValue));
                if (isNaN(progressValue)) {
                    progressValue = 0;
                }
                
                // Calculate items processed based on the progress value
                currentOperationItemsProcessed = Math.floor(progressValue * currentOp.count);
                
                // Ensure currentOperationItemsProcessed is valid
                if (isNaN(currentOperationItemsProcessed) || currentOperationItemsProcessed < 0) {
                    currentOperationItemsProcessed = 0;
                }
                if (currentOperationItemsProcessed > currentOp.count) {
                    currentOperationItemsProcessed = currentOp.count;
                }
                
                // Calculate items completed from previous operations
                const itemsFromPreviousOps = deleteOperations
                    .slice(0, currentOperationIndex)
                    .reduce((sum, op) => sum + op.count, 0);
                
                const totalCompletedSoFar = itemsFromPreviousOps + currentOperationItemsProcessed;
                const overallPercent = totalItems > 0 ? (totalCompletedSoFar / totalItems) * 100 : 0;
                
                statusSpan.textContent = `Deleting ${currentOp.label}... (${currentOperationItemsProcessed}/${currentOp.count})`;
                inlineProgressBar.style.width = `${overallPercent}%`;
                inlineProgressBar.setAttribute('aria-valuenow', overallPercent);
                inlineProgressPercent.textContent = `${Math.round(overallPercent)}%`;
            }
        };
        
        // Listen for progress updates from main process
        if (window.progressAPI && window.progressAPI.onUpdateProgress) {
            window.progressAPI.onUpdateProgress(progressListener);
        }

        // Process deletions based on selections
        for (let opIndex = 0; opIndex < deleteOperations.length; opIndex++) {
            const operation = deleteOperations[opIndex];
            currentOperationIndex = opIndex;
            currentOperationItemsProcessed = 0;
            
            // Check if cancellation was requested BEFORE starting this operation
            if (inlineCancelFlag.cancelled) {
                progressDiv_inline.className = 'deletion-result alert alert-warning mt-3';
                progressDiv_inline.innerHTML = `
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    <strong>Deletion cancelled by user.</strong><br>
                    <small>Completed: ${completedItems} of ${totalItems} items. Some items were deleted before cancellation.</small>
                `;
                // Clean up progress listener
                if (window.progressAPI && window.progressAPI.removeProgressListener) {
                    window.progressAPI.removeProgressListener(progressListener);
                }
                return;
            }
            
            // Initial status (progress listener will update during deletion)
            statusSpan.textContent = `Deleting ${operation.label}... (0/${operation.count})`;

            if (operation.type === 'assignments') {
                const payload = {
                    domain, token, course_id,
                    number: transformedAssets.assignments.length,
                    assignments: transformedAssets.assignments.map(id => ({ id }))
                };
                const response = await window.axios.deleteAssignments(payload);
                if (response) batchResults.push(response);
            }

            if (operation.type === 'attachments') {
                const payload = {
                    domain, token,
                    attachments: transformedAssets.attachments.map(id => ({ id }))
                };
                const response = await window.axios.deleteAttachments(payload);
                if (response) batchResults.push(response);
            }

            if (operation.type === 'folders') {
                const payload = {
                    domain, token, course_id,
                    folders: transformedAssets.folders.map(id => ({ id }))
                };
                const response = await window.axios.deleteFolders(payload);
                if (response) batchResults.push(response);
            }

            if (operation.type === 'discussions') {
                const payload = {
                    domain, token, course_id,
                    discussions: transformedAssets.discussions
                };
                const response = await window.axios.deleteDiscussions(payload);
                if (response) batchResults.push(response);
            }

            if (operation.type === 'quizzes') {
                const payload = {
                    domain, token,
                    courseID: course_id,
                    quizzes: transformedAssets.quizzes.map(id => ({ _id: id }))
                };
                const response = await window.axios.deleteClassicQuizzes(payload);
                if (response) batchResults.push(response);
            }

            if (operation.type === 'modules') {
                const payload = {
                    domain, token, course_id,
                    number: transformedAssets.modules.length,
                    module_ids: transformedAssets.modules.map(id => ({ id }))
                };
                const response = await window.axios.deleteModules(payload);
                if (response) batchResults.push(response);
            }

            if (operation.type === 'gradingStandards') {
                const payload = {
                    domain, token, course_id,
                    grading_standards: transformedAssets.gradingStandards.map(id => ({ id }))
                };
                const response = await window.axios.deleteGradingStandards(payload);
                if (response) batchResults.push(response);
            }

            // Show "Done" status for completed operation
            statusSpan.textContent = `Deleting ${operation.label}... (${operation.count}/${operation.count}) Done`;
            
            // Update completed count for cancellation tracking
            completedItems += operation.count;
            
            // Small delay to allow UI updates and cancellation to be processed
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Process results and show detailed summary
        const summaryLines = [];
        const failureDetails = [];
        let totalSuccess = 0;
        let totalFailed = 0;

        // Process each operation's results
        for (let i = 0; i < deleteOperations.length; i++) {
            const operation = deleteOperations[i];
            const result = batchResults[i];
            
            if (!result) continue;

            const succeeded = Array.isArray(result.succeeded) ? result.succeeded : [];
            const failed = Array.isArray(result.failed) ? result.failed : [];
            const successCount = succeeded.length;
            const failCount = failed.length;
            const total = operation.count;

            totalSuccess += successCount;
            totalFailed += failCount;

            // Create summary for this operation type
            if (failCount > 0) {
                summaryLines.push(
                    `<strong>${operation.label}:</strong> Successfully deleted ${successCount} of ${total}, Failed to delete ${failCount}`
                );

                // Collect failure reasons
                failed.forEach(f => {
                    const reason = f.reason || f.message || 'Unknown error';
                    const id = f.id || f._id || '';
                    failureDetails.push({
                        type: operation.label,
                        id: id,
                        reason: reason
                    });
                });
            } else if (successCount > 0) {
                summaryLines.push(
                    `<strong>${operation.label}:</strong> Successfully deleted all ${successCount} item${successCount !== 1 ? 's' : ''}`
                );
            }
        }

        // Build the final message and display inline
        inlineProgressBar.style.width = '100%';
        inlineProgressBar.setAttribute('aria-valuenow', 100);
        inlineProgressPercent.textContent = '100%';

        // Create a detailed summary of what was deleted
        const deletedItemsList = deleteOperations.map((op, i) => {
            const result = batchResults[i];
            if (!result) return null;
            
            const succeeded = Array.isArray(result.succeeded) ? result.succeeded : [];
            const failed = Array.isArray(result.failed) ? result.failed : [];
            const successCount = succeeded.length;
            const failCount = failed.length;
            
            if (successCount > 0) {
                return `${successCount} ${op.label}`;
            }
            return null;
        }).filter(item => item !== null);

        const deletedSummary = deletedItemsList.length > 0 
            ? `Successfully deleted ${deletedItemsList.join(', ')}`
            : 'No items were deleted';

        if (totalFailed > 0) {
            // Group failure reasons by type
            const reasonGroups = {};
            failureDetails.forEach(f => {
                const key = f.reason;
                if (!reasonGroups[key]) {
                    reasonGroups[key] = { reason: key, items: [] };
                }
                reasonGroups[key].items.push({ type: f.type, id: f.id });
            });

            // Build failure details HTML
            const failureHTML = Object.values(reasonGroups).map(group => {
                const itemsList = group.items.map(item => 
                    `<li>${item.type}${item.id ? ` (ID: ${item.id})` : ''}</li>`
                ).join('');
                return `
                    <div class="mt-2">
                        <strong>Reason:</strong> ${group.reason}
                        <ul class="mb-0 mt-1 small">${itemsList}</ul>
                    </div>
                `;
            }).join('');

            // Build list of failed items by type
            const failedItemsList = [];
            deleteOperations.forEach((op, i) => {
                const result = batchResults[i];
                if (!result) return;
                
                const failed = Array.isArray(result.failed) ? result.failed : [];
                if (failed.length > 0) {
                    failedItemsList.push(`${failed.length} ${op.label}`);
                }
            });

            const failedSummary = failedItemsList.length > 0 
                ? `Failed to delete ${failedItemsList.join(', ')}`
                : '';
            
            progressDiv_inline.className = 'deletion-result alert alert-warning mt-3';
            progressDiv_inline.innerHTML = `
                <h6 class="alert-heading mb-3">
                    <i class="bi bi-exclamation-triangle me-2"></i>Deletion Completed with Failures
                </h6>
                <div class="mb-2">
                    <strong>${deletedSummary}</strong>
                </div>
                ${failedSummary ? `<div class="mb-3 text-danger"><strong>${failedSummary}</strong></div>` : ''}
                <hr>
                <div>
                    <strong>Failure Details:</strong>
                    ${failureHTML}
                </div>
                <div class="mt-3 text-muted small">
                    <i class="bi bi-info-circle me-1"></i>You can select and delete other items from this import.
                </div>
            `;
        } else {
            progressDiv_inline.className = 'deletion-result alert alert-success mt-3';
            progressDiv_inline.innerHTML = `
                <h6 class="alert-heading mb-2">
                    <i class="bi bi-check-circle me-2"></i>All Items Deleted Successfully
                </h6>
                <div class="mb-2">
                    <strong>${deletedSummary}</strong>
                </div>
                <div class="mt-3 text-muted small">
                    <i class="bi bi-info-circle me-1"></i>You can select and delete other items from this import.
                </div>
            `;
        }

        // Deselect the deleted items and refresh the UI
        activeToggles.forEach(toggle => {
            toggle.classList.remove('active');
            toggle.setAttribute('aria-pressed', 'false');
        });
        updateDeleteButtonState(container);
        
        // Clean up progress listener
        if (window.progressAPI && window.progressAPI.removeProgressListener) {
            window.progressAPI.removeProgressListener(progressListener);
        }

    } catch (error) {
        console.error('Delete error:', error);
        progressDiv_inline.className = 'deletion-result alert alert-danger mt-3';
        progressDiv_inline.innerHTML = `
            <h6 class="alert-heading mb-2">
                <i class="bi bi-exclamation-circle me-2"></i>Error During Deletion
            </h6>
            <div>${error.message || 'An unexpected error occurred while deleting content.'}</div>
        `;
        
        // Clean up progress listener
        if (window.progressAPI && window.progressAPI.removeProgressListener) {
            window.progressAPI.removeProgressListener(progressListener);
        }
    }
}

// Helper function to setup event listeners for import card interactions
function setupImportCardInteractions(container, domain, token, course_id, progressInfo, progressBar, progressDiv, spinner, cancelBtn, cancelFlag) {
    // Create the click handler
    const clickHandler = async (event) => {
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
            await handleDeleteSelectedAssets(container, domain, token, course_id, importId, progressInfo, progressBar, progressDiv, spinner, cancelBtn, cancelFlag);
            return;
        }
    };
    
    // Store the handler reference on the container and attach it
    container._importClickHandler = clickHandler;
    container.addEventListener('click', clickHandler);
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
                    <small class="text-muted">Enter a Course ID to view and manage imports with their assets</small>
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
                    <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                    <button id="cancel-delete-btn" class="btn btn-sm btn-danger" hidden>
                        <i class="bi bi-x-circle me-1"></i>Cancel
                    </button>
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
    const cancelBtn = form.querySelector('#cancel-delete-btn');
    
    // Cancellation flag
    let cancelRequested = false;
    
    // Store reference to prevent multiple listener attachments
    if (!form._listenersAttached) {
        form._listenersAttached = true;
        
        courseID.addEventListener('input', () => {
            const valid = /^(\d+)$/.test(courseID.value.trim());
            courseID.classList.toggle('is-invalid', !valid && courseID.value.trim().length > 0);
            listBtn.disabled = !valid;
        });
        
        listBtn.addEventListener('click', async (e2) => {
            e2.preventDefault();
            e2.stopPropagation();

            // Remove previous event listener from listContainer if it exists
            if (listContainer._importClickHandler) {
                listContainer.removeEventListener('click', listContainer._importClickHandler);
                listContainer._importClickHandler = null;
            }
            
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
                
                // Hide the progress card when no imports found
                progressDiv.hidden = true;
                
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
            
            // Hide the progress card after successful completion
            progressDiv.hidden = true;

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

            // Setup cancel button handler (remove old listener if exists)
            const cancelFlagObj = { cancelled: false };
            if (cancelBtn._cancelHandler) {
                cancelBtn.removeEventListener('click', cancelBtn._cancelHandler);
            }
            cancelBtn._cancelHandler = () => {
                cancelFlagObj.cancelled = true;
                cancelBtn.disabled = true;
                cancelBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Cancelling...';
            };
            cancelBtn.addEventListener('click', cancelBtn._cancelHandler);
            
            // Add event listeners for expanding/collapsing and asset selection
            setupImportCardInteractions(listContainer, domain, token, course_id, progressInfo, progressBar, progressDiv, spinner, cancelBtn, cancelFlagObj);

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
}