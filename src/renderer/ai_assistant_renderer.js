/**
 * AI Assistant Renderer
 * Natural language interface for Canvas operations
 */

function aiAssistantTemplate(e) {
    if (typeof hideEndpoints === 'function') {
        hideEndpoints(e);
    }
    showAIAssistantUI();
}

function showAIAssistantUI() {
    const endpointContent = document.getElementById('endpoint-content');
    if (!endpointContent) return;

    let container = document.getElementById('ai-assistant-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'ai-assistant-container';
        container.className = 'p-4';
        endpointContent.appendChild(container);
    }

    container.hidden = false;
    container.innerHTML = `
        <div class="ai-assistant-ui">
            <h3 class="mb-4">
                <i class="bi bi-robot"></i> AI Assistant
            </h3>
            
            <div class="alert alert-info mb-4">
                <h6 class="alert-heading"><i class="bi bi-info-circle"></i> How to Use</h6>
                <p class="mb-2">Describe what you want to do in natural language. The AI will parse your request and show you a preview before executing.</p>
                <p class="mb-2"><strong>Example:</strong> "Delete all unpublished assignments from https://myschool.instructure.com/courses/1234"</p>
                <p class="mb-0"><strong>Note:</strong> API keys for OpenAI or Anthropic are required and can be configured in <a href="#" id="goto-har-settings">HAR Analyzer settings</a>.</p>
            </div>

            <div class="card mb-4">
                <div class="card-body">
                    <div class="mb-3">
                        <label for="ai-assistant-model" class="form-label">AI Model</label>
                        <select class="form-select" id="ai-assistant-model">
                            <option value="claude-haiku-4.5" selected>Claude Haiku 4.5</option>
                            <option value="claude-sonnet-4.5">Claude Sonnet 4.5</option>
                            <option value="gpt-5-nano">GPT 5-nano</option>
                            <option value="gpt-5.2">GPT 5.2</option>
                        </select>
                    </div>

                    <div class="mb-3">
                        <label for="ai-assistant-prompt" class="form-label">What would you like to do?</label>
                        <textarea class="form-control" id="ai-assistant-prompt" rows="3" 
                            placeholder="e.g., Delete all unpublished assignments from https://myschool.instructure.com/courses/6986"></textarea>
                        <div class="mt-2">
                            <button class="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="collapse" data-bs-target="#sample-prompts">
                                <i class="bi bi-lightbulb"></i> Show Example Prompts
                            </button>
                        </div>
                        <div class="collapse mt-2" id="sample-prompts">
                            <div class="card card-body bg-light">
                                <h6 class="mb-2">Click any example to auto-fill:</h6>
                                <div class="list-group list-group-flush">
                                    <a href="#" class="list-group-item list-group-item-action sample-prompt" data-prompt="Delete all unpublished assignments from https://myschool.instructure.com/courses/6986">
                                        <strong>Delete Assignments:</strong> Delete all unpublished assignments from course 6986
                                    </a>
                                    <a href="#" class="list-group-item list-group-item-action sample-prompt" data-prompt="Delete all assignments with no submissions from https://myschool.instructure.com/courses/6986">
                                        <strong>Delete No-Sub Assignments:</strong> Delete assignments with no submissions
                                    </a>
                                    <a href="#" class="list-group-item list-group-item-action sample-prompt" data-prompt="Create 10 file upload assignments worth 10 points in https://myschool.instructure.com/courses/6986. Make them unpublished.">
                                        <strong>Create Assignments:</strong> Create 10 file upload assignments worth 10 points
                                    </a>
                                    <a href="#" class="list-group-item list-group-item-action sample-prompt" data-prompt="Delete all empty assignment groups from https://myschool.instructure.com/courses/6986">
                                        <strong>Delete Empty Groups:</strong> Delete empty assignment groups
                                    </a>
                                    <a href="#" class="list-group-item list-group-item-action sample-prompt" data-prompt="Delete all messages sent by user 123 with subject 'Test Message' from https://myschool.instructure.com">
                                        <strong>Delete Conversations:</strong> Delete conversations by subject and user
                                    </a>
                                    <a href="#" class="list-group-item list-group-item-action sample-prompt" data-prompt="Create 5 discussion topics named 'Week Discussion' in https://myschool.instructure.com/courses/6986">
                                        <strong>Create Discussions:</strong> Create multiple discussion topics
                                    </a>
                                    <a href="#" class="list-group-item list-group-item-action sample-prompt" data-prompt="Create an announcement titled 'Midterm Exam Schedule' for https://myschool.instructure.com/courses/6986 with message 'The midterm will be held on March 15th in room 204. Please arrive 10 minutes early.'">
                                        <strong>Create Announcement:</strong> Create announcement with title and message
                                    </a>
                                    <a href="#" class="list-group-item list-group-item-action sample-prompt" data-prompt="Add announcement 'Office Hours Update' to https://myschool.instructure.com/courses/6986 saying 'My office hours are now Tuesdays 2-4pm instead of Wednesdays.' Delay posting until January 15, 2025 and lock on January 30, 2025.">
                                        <strong>Scheduled Announcement:</strong> Create announcement with delay and lock dates
                                    </a>
                                    <a href="#" class="list-group-item list-group-item-action sample-prompt" data-prompt="Delete all announcements from https://myschool.instructure.com/courses/6986">
                                        <strong>Delete All Announcements:</strong> Delete all announcements from a course
                                    </a>
                                    <a href="#" class="list-group-item list-group-item-action sample-prompt" data-prompt="Delete announcements titled 'Test Announcement' from https://myschool.instructure.com/courses/6986">
                                        <strong>Delete Announcements by Title:</strong> Delete announcements matching a specific title
                                    </a>
                                    <a href="#" class="list-group-item list-group-item-action sample-prompt" data-prompt="Remove announcements named 'Weekly Update' from https://myschool.instructure.com/courses/6986">
                                        <strong>Delete Named Announcements:</strong> Remove announcements with specific name
                                    </a>
                                    <a href="#" class="list-group-item list-group-item-action sample-prompt" data-prompt="Delete all modules from https://myschool.instructure.com/courses/6986">
                                        <strong>Delete Modules:</strong> Delete all modules from a course
                                    </a>
                                    <a href="#" class="list-group-item list-group-item-action sample-prompt" data-prompt="Create 10 pages named 'Content Page' in https://myschool.instructure.com/courses/6986">
                                        <strong>Create Pages:</strong> Create multiple pages
                                    </a>
                                    <a href="#" class="list-group-item list-group-item-action sample-prompt" data-prompt="Reset course content in https://myschool.instructure.com/courses/6986">
                                        <strong>Reset Course:</strong> Reset all course content
                                    </a>
                                    <a href="#" class="list-group-item list-group-item-action sample-prompt" data-prompt="Get course information for https://myschool.instructure.com/courses/6986">
                                        <strong>Get Info:</strong> Retrieve course information
                                    </a>
                                    <a href="#" class="list-group-item list-group-item-action sample-prompt" data-prompt="How many announcements are in https://myschool.instructure.com/courses/6986">
                                        <strong>Count Announcements:</strong> Get announcement count
                                    </a>
                                    <a href="#" class="list-group-item list-group-item-action sample-prompt" data-prompt="List all assignments in https://myschool.instructure.com/courses/6986">
                                        <strong>List Assignments:</strong> Get list of assignments
                                    </a>
                                    <a href="#" class="list-group-item list-group-item-action sample-prompt" data-prompt="How many unpublished assignments are in https://myschool.instructure.com/courses/6986">
                                        <strong>Count Unpublished:</strong> Count unpublished assignments
                                    </a>
                                    <a href="#" class="list-group-item list-group-item-action sample-prompt" data-prompt="How many assignment groups are in https://myschool.instructure.com/courses/6986">
                                        <strong>Count Assignment Groups:</strong> Get assignment group count
                                    </a>
                                    <a href="#" class="list-group-item list-group-item-action sample-prompt" data-prompt="Show me the modules from https://myschool.instructure.com/courses/6986">
                                        <strong>Show Modules:</strong> Display course modules
                                    </a>
                                </div>
                                <small class="text-muted mt-2">Replace 'myschool.instructure.com' and course ID with your actual values</small>
                            </div>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label for="ai-assistant-token" class="form-label">Canvas API Token</label>
                        <input type="text" class="form-control" id="ai-assistant-token" 
                            placeholder="Your Canvas API token (required for execution)">
                        <div class="form-text">Your token is only used for this operation and is not stored.</div>
                    </div>

                    <button id="ai-assistant-parse" class="btn btn-primary">
                        <i class="bi bi-search"></i> Analyze Request
                    </button>
                </div>
            </div>

            <div id="ai-assistant-preview" class="d-none"></div>
            <div id="ai-assistant-results"></div>
        </div>
    `;

    setupAIAssistantListeners();
}

function setupAIAssistantListeners() {
    const parseBtn = document.getElementById('ai-assistant-parse');
    const modelSelect = document.getElementById('ai-assistant-model');
    const promptInput = document.getElementById('ai-assistant-prompt');
    const tokenInput = document.getElementById('ai-assistant-token');
    const previewSection = document.getElementById('ai-assistant-preview');
    const resultsSection = document.getElementById('ai-assistant-results');

    // Sample prompt click handlers
    const samplePrompts = document.querySelectorAll('.sample-prompt');
    samplePrompts.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const prompt = link.getAttribute('data-prompt');
            promptInput.value = prompt;
            // Collapse the examples
            const collapseElement = document.getElementById('sample-prompts');
            if (collapseElement) {
                const bsCollapse = new bootstrap.Collapse(collapseElement, { toggle: false });
                bsCollapse.hide();
            }
            // Focus on the prompt textarea
            promptInput.focus();
        });
    });

    // Link to HAR Analyzer settings
    const harSettingsLink = document.getElementById('goto-har-settings');
    if (harSettingsLink) {
        harSettingsLink.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('sidebar-har-analyzer')?.click();
        });
    }

    parseBtn.addEventListener('click', async () => {
        const model = modelSelect.value;
        const prompt = promptInput.value.trim();

        if (!prompt) {
            alert('Please enter a request');
            return;
        }

        // Show loading state
        previewSection.innerHTML = `
            <div class="text-center p-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Analyzing...</span>
                </div>
                <p class="mt-3">AI is analyzing your request...</p>
            </div>
        `;
        previewSection.classList.remove('d-none');
        resultsSection.innerHTML = '';

        try {
            // Parse the intent using AI
            const result = await window.ipcRenderer.invoke('ai-assistant:parseIntent', { prompt, model });

            if (!result.success) {
                throw new Error(result.error || 'Failed to parse request');
            }

            const { parsed } = result;

            // Show preview
            showOperationPreview(parsed, tokenInput.value);

        } catch (error) {
            const isApiKeyError = error.message.includes('API Key missing');
            const provider = error.message.includes('openai') ? 'OpenAI' : 'Anthropic';

            previewSection.innerHTML = `
                <div class="alert alert-danger">
                    <h6 class="alert-heading"><i class="bi bi-exclamation-octagon"></i> Analysis Failed</h6>
                    <p class="mb-2">${error.message}</p>
                    ${isApiKeyError ? `
                        <hr>
                        <p class="mb-2"><strong>To add your ${provider} API key:</strong></p>
                        <ol class="mb-2">
                            <li>Click <a href="#" id="goto-har-settings-error">HAR Analyzer</a> in the sidebar</li>
                            <li>Enter your ${provider} API key in the settings section</li>
                            <li>Click Save</li>
                            <li>Return here to try again</li>
                        </ol>
                        <p class="mb-0"><small>Your API key is encrypted and stored securely on your local machine.</small></p>
                    ` : ''}
                </div>
            `;

            // Add click handler for error link
            const errorLink = document.getElementById('goto-har-settings-error');
            if (errorLink) {
                errorLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    document.getElementById('sidebar-har-analyzer')?.click();
                });
            }
        }
    });
}

function showAIAssistantToast(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 420px;';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

function showOperationPreview(parsed, token) {
    const previewSection = document.getElementById('ai-assistant-preview');

    if (parsed.confidence < 0.5) {
        previewSection.innerHTML = `
            <div class="alert alert-warning">
                <h6 class="alert-heading"><i class="bi bi-exclamation-triangle"></i> Unclear Request</h6>
                <p class="mb-2"><strong>Summary:</strong> ${parsed.summary}</p>
                <p class="mb-0">Please try rephrasing your request or be more specific.</p>
            </div>
        `;
        return;
    }

    const warnings = parsed.warnings && parsed.warnings.length > 0
        ? `<div class="alert alert-warning mb-3">
            <h6 class="alert-heading"><i class="bi bi-exclamation-triangle"></i> Warnings</h6>
            <ul class="mb-0">
                ${parsed.warnings.map(w => `<li>${w}</li>`).join('')}
            </ul>
        </div>`
        : '';

    const hasSteps = Array.isArray(parsed.steps) && parsed.steps.length > 0;

    const parametersHtml = hasSteps
        ? `<div class="mb-3">
                <strong>Steps:</strong>
                <ol class="mb-0">
                    ${parsed.steps.map((step, index) => {
            const stepParams = step.parameters || {};
            const stepTitle = step.operationInfo?.description || step.operation;
            return `
                            <li class="mb-2">
                                <div><strong>${stepTitle}</strong></div>
                                <div class="text-muted small">Step ${index + 1}</div>
                                <div>
                                    <small>Parameters:</small>
                                    <pre class="bg-light p-2 rounded" style="white-space: pre-wrap;">${JSON.stringify(stepParams, null, 2)}</pre>
                                </div>
                            </li>
                        `;
        }).join('')}
                </ol>
            </div>`
        : `<div class="mb-3">
                <strong>Parameters:</strong>
                <ul class="mb-0">
                    ${Object.entries(parsed.parameters || {}).map(([key, value]) => {
            if (typeof value === 'object') {
                return `<li><strong>${key}:</strong> ${JSON.stringify(value)}</li>`;
            }
            return `<li><strong>${key}:</strong> ${value}</li>`;
        }).join('')}
                </ul>
            </div>`;

    previewSection.innerHTML = `
        <div class="card border-primary mb-4">
            <div class="card-header bg-primary text-white">
                <h5 class="mb-0"><i class="bi bi-eye"></i> Operation Preview</h5>
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <strong>Operation:</strong> ${parsed.operationInfo?.description || parsed.operation}
                </div>
                <div class="mb-3">
                    <strong>Summary:</strong> ${parsed.summary}
                </div>
                ${parametersHtml}
                ${warnings}
                <div class="mb-3">
                    <strong>Confidence:</strong> 
                    <div class="progress" style="height: 25px;">
                        <div class="progress-bar ${parsed.confidence > 0.8 ? 'bg-success' : 'bg-warning'}" 
                            role="progressbar" 
                            style="width: ${parsed.confidence * 100}%"
                            aria-valuenow="${parsed.confidence * 100}" 
                            aria-valuemin="0" 
                            aria-valuemax="100">
                            ${Math.round(parsed.confidence * 100)}%
                        </div>
                    </div>
                </div>
                
                <div class="d-flex gap-2">
                    <button id="ai-assistant-execute" class="btn btn-success" ${!token ? 'disabled' : ''}>
                        <i class="bi bi-play-circle"></i> Execute Operation
                    </button>
                    <button id="ai-assistant-feedback" class="btn btn-warning">
                        <i class="bi bi-chat-left-text"></i> Incorrect? Provide Feedback
                    </button>
                    <button id="ai-assistant-cancel" class="btn btn-secondary">
                        <i class="bi bi-x-circle"></i> Cancel
                    </button>
                </div>
                ${!token ? '<div class="form-text text-danger mt-2">API Token is required to execute</div>' : ''}
                
                <!-- Feedback Section (hidden by default) -->
                <div id="ai-feedback-section" class="mt-3 d-none">
                    <hr>
                    <h6 class="mb-2"><i class="bi bi-chat-left-dots"></i> Provide Feedback</h6>
                    <p class="text-muted small mb-2">Help the AI understand your request better by explaining what's incorrect:</p>
                    <textarea id="ai-feedback-text" class="form-control mb-2" rows="3" 
                        placeholder="e.g., 'I only want unpublished assignments, not all assignments' or 'The course ID should be 6986, not 5000'"></textarea>
                    <div class="d-flex gap-2">
                        <button id="ai-reanalyze" class="btn btn-primary btn-sm">
                            <i class="bi bi-arrow-repeat"></i> Re-analyze with Feedback
                        </button>
                        <button id="ai-feedback-cancel" class="btn btn-secondary btn-sm">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Setup execute/cancel/feedback listeners
    const executeBtn = document.getElementById('ai-assistant-execute');
    const cancelBtn = document.getElementById('ai-assistant-cancel');
    const feedbackBtn = document.getElementById('ai-assistant-feedback');

    if (executeBtn) {
        executeBtn.addEventListener('click', async () => {
            if (!token) {
                alert('Please enter your Canvas API token');
                return;
            }

            await executeOperation(parsed, token);
        });
    }

    if (feedbackBtn) {
        feedbackBtn.addEventListener('click', () => {
            const feedbackSection = document.getElementById('ai-feedback-section');
            feedbackSection.classList.toggle('d-none');
        });
    }

    // Handle feedback re-analysis
    const reanalyzeBtn = document.getElementById('ai-reanalyze');
    if (reanalyzeBtn) {
        reanalyzeBtn.addEventListener('click', async () => {
            const feedbackText = document.getElementById('ai-feedback-text').value.trim();
            if (!feedbackText) {
                alert('Please provide feedback explaining what needs to be corrected');
                return;
            }

            // Get original prompt
            const promptInput = document.getElementById('ai-assistant-prompt');
            const modelSelect = document.getElementById('ai-assistant-model');
            const originalPrompt = promptInput.value.trim();
            const model = modelSelect.value;

            // Combine original prompt with feedback
            const enhancedPrompt = `${originalPrompt}

PREVIOUS PARSE WAS INCORRECT. User feedback: ${feedbackText}

Please re-analyze the request taking into account the user's correction.`;

            // Show loading state
            const previewSection = document.getElementById('ai-assistant-preview');
            previewSection.innerHTML = `
                <div class="text-center p-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Re-analyzing with feedback...</span>
                    </div>
                    <p class="mt-3">AI is re-analyzing your request with the feedback...</p>
                </div>
            `;
            previewSection.classList.remove('d-none');

            try {
                // Re-parse with feedback
                const result = await window.ipcRenderer.invoke('ai-assistant:parseIntent', {
                    prompt: enhancedPrompt,
                    model
                });

                if (!result.success) {
                    throw new Error(result.error || 'Failed to re-parse request');
                }

                // Show updated preview
                showOperationPreview(result.parsed, token);

            } catch (error) {
                previewSection.innerHTML = `
                    <div class="alert alert-danger">
                        <h6 class="alert-heading">Re-analysis Failed</h6>
                        <p class="mb-0">${error.message}</p>
                    </div>
                `;
            }
        });
    }

    // Handle feedback cancel
    const feedbackCancelBtn = document.getElementById('ai-feedback-cancel');
    if (feedbackCancelBtn) {
        feedbackCancelBtn.addEventListener('click', () => {
            const feedbackSection = document.getElementById('ai-feedback-section');
            feedbackSection.classList.add('d-none');
            document.getElementById('ai-feedback-text').value = '';
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            previewSection.classList.add('d-none');
            previewSection.innerHTML = '';
        });
    }
}

async function executeOperation(parsed, token) {
    const resultsSection = document.getElementById('ai-assistant-results');
    const previewSection = document.getElementById('ai-assistant-preview');

    // Check if this needs import choice clarification
    if (parsed.needsImportChoice) {
        resultsSection.innerHTML = `
            <div class="card border-info mb-3">
                <div class="card-header bg-info text-white">
                    <h5 class="mb-0"><i class="bi bi-question-circle"></i> Clarification Needed</h5>
                </div>
                <div class="card-body">
                    <p class="mb-3"><strong>Do you want to delete assignments from:</strong></p>
                    <div class="d-grid gap-2">
                        <button id="ai-choose-specific-import" class="btn btn-outline-primary">
                            <i class="bi bi-file-earmark"></i> A Specific Import/Migration ID
                        </button>
                        <button id="ai-choose-all-imports" class="btn btn-outline-success">
                            <i class="bi bi-collection"></i> All Imports (Delete all imported assignments)
                        </button>
                        <button id="ai-import-choice-cancel" class="btn btn-secondary">
                            <i class="bi bi-x-circle"></i> Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Setup choice listeners
        const specificBtn = document.getElementById('ai-choose-specific-import');
        const allBtn = document.getElementById('ai-choose-all-imports');
        const cancelBtn = document.getElementById('ai-import-choice-cancel');

        if (specificBtn) {
            specificBtn.addEventListener('click', () => {
                // Prompt for import ID
                resultsSection.innerHTML = `
                    <div class="card border-primary mb-3">
                        <div class="card-header bg-primary text-white">
                            <h5 class="mb-0"><i class="bi bi-file-earmark"></i> Enter Import ID</h5>
                        </div>
                        <div class="card-body">
                            <p class="mb-2">Enter the Content Migration/Import ID:</p>
                            <div class="input-group mb-3">
                                <input type="text" id="ai-import-id-input" class="form-control" placeholder="e.g., 12345" />
                                <button id="ai-import-id-submit" class="btn btn-primary">
                                    <i class="bi bi-check"></i> Continue
                                </button>
                            </div>
                            <button id="ai-import-id-cancel" class="btn btn-sm btn-secondary">
                                <i class="bi bi-arrow-left"></i> Back
                            </button>
                            <div class="alert alert-info mt-3 mb-0">
                                <small>
                                    <i class="bi bi-info-circle"></i> 
                                    <strong>How to find Import ID:</strong> Go to Settings → Import Course Content → View Content Imports. The ID appears in the URL or import details.
                                </small>
                            </div>
                        </div>
                    </div>
                `;

                const input = document.getElementById('ai-import-id-input');
                const submitBtn = document.getElementById('ai-import-id-submit');
                const backBtn = document.getElementById('ai-import-id-cancel');

                if (submitBtn && input) {
                    submitBtn.addEventListener('click', async () => {
                        const importId = input.value.trim();
                        if (!importId) {
                            alert('Please enter an import ID');
                            return;
                        }
                        // Update parsed parameters with importId
                        parsed.parameters.importId = importId;
                        parsed.operation = 'delete-imported-assignments';
                        delete parsed.needsImportChoice;
                        await executeOperation(parsed, token);
                    });
                }

                if (backBtn) {
                    backBtn.addEventListener('click', () => {
                        executeOperation(parsed, token);
                    });
                }
            });
        }

        if (allBtn) {
            allBtn.addEventListener('click', async () => {
                // Change operation to delete-all-imported-assignments
                parsed.operation = 'delete-all-imported-assignments';
                delete parsed.needsImportChoice;
                await executeOperation(parsed, token);
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                resultsSection.innerHTML = `
                    <div class="alert alert-secondary">
                        <p class="mb-0">Operation cancelled.</p>
                    </div>
                `;
            });
        }

        return;
    }

    // Handle comprehensive course creation with content - show confirmation
    if (parsed.operation === 'create-course' && parsed.parameters) {
        const params = parsed.parameters;
        const hasContent = params.students > 0 || params.teachers > 0 ||
            params.assignmentGroups > 0 || params.assignments > 0 ||
            params.discussions > 0 || params.pages > 0 ||
            params.modules > 0 || params.sections > 0;

        if (hasContent) {
            // Build a summary of what will be created
            const summaryItems = [];
            summaryItems.push(`<li><strong>Course:</strong> "${params.courseName || 'New Course'}"</li>`);

            if (params.students > 0 || params.teachers > 0) {
                const userParts = [];
                if (params.students > 0) userParts.push(`${params.students} student(s)`);
                if (params.teachers > 0) userParts.push(`${params.teachers} teacher(s)`);
                summaryItems.push(`<li><strong>Users:</strong> ${userParts.join(', ')}</li>`);
            }
            if (params.assignmentGroups > 0) {
                let groupText = `${params.assignmentGroups} assignment group(s)`;
                if (params.assignmentsPerGroup > 0) {
                    groupText += ` with ${params.assignmentsPerGroup} assignment(s) each`;
                }
                summaryItems.push(`<li><strong>Assignment Groups:</strong> ${groupText}</li>`);
            }
            if (params.assignments > 0) {
                summaryItems.push(`<li><strong>Standalone Assignments:</strong> ${params.assignments}</li>`);
            }
            if (params.discussions > 0) {
                summaryItems.push(`<li><strong>Discussions:</strong> ${params.discussions}</li>`);
            }
            if (params.pages > 0) {
                summaryItems.push(`<li><strong>Pages:</strong> ${params.pages}</li>`);
            }
            if (params.modules > 0) {
                summaryItems.push(`<li><strong>Modules:</strong> ${params.modules}</li>`);
            }
            if (params.sections > 0) {
                summaryItems.push(`<li><strong>Sections:</strong> ${params.sections}</li>`);
            }

            resultsSection.innerHTML = `
                <div class="card border-success mb-3">
                    <div class="card-header bg-success text-white">
                        <h5 class="mb-0"><i class="bi bi-plus-circle"></i> Create Course with Content</h5>
                    </div>
                    <div class="card-body">
                        <p class="mb-3"><strong>The following will be created:</strong></p>
                        <ul class="mb-3">
                            ${summaryItems.join('')}
                        </ul>
                        ${(!params.email && (params.students > 0 || params.teachers > 0)) ? `
                            <div class="alert alert-warning mb-3">
                                <i class="bi bi-exclamation-triangle"></i>
                                <strong>Email Required:</strong> To create users, please provide your email prefix.
                                <input type="text" id="ai-course-email" class="form-control mt-2" 
                                       placeholder="e.g., jsmith (from jsmith@instructure.com)">
                            </div>
                        ` : ''}
                        <p class="text-info"><i class="bi bi-info-circle"></i> This may take a few moments depending on the amount of content.</p>
                        <div class="d-flex gap-2">
                            <button id="ai-course-create" class="btn btn-success">
                                <i class="bi bi-plus-circle"></i> Create Course
                            </button>
                            <button id="ai-course-cancel" class="btn btn-secondary">
                                <i class="bi bi-x-circle"></i> Cancel
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('ai-course-create')?.addEventListener('click', async () => {
                // Check if email is needed and provided
                if ((params.students > 0 || params.teachers > 0) && !params.email) {
                    const emailInput = document.getElementById('ai-course-email');
                    if (emailInput && emailInput.value.trim()) {
                        parsed.parameters.email = emailInput.value.trim();
                    } else {
                        alert('Please provide your email prefix to create users.');
                        return;
                    }
                }
                await performOperation(parsed, token, resultsSection, previewSection);
            });

            document.getElementById('ai-course-cancel')?.addEventListener('click', () => {
                resultsSection.innerHTML = `
                    <div class="alert alert-secondary">
                        <p class="mb-0">Operation cancelled.</p>
                    </div>
                `;
            });

            return;
        }
    }

    // Handle multi-step operations - show confirmation and execute directly
    if (parsed.operation === 'multi-step' || (Array.isArray(parsed.steps) && parsed.steps.length > 0)) {
        const steps = parsed.steps || [];
        resultsSection.innerHTML = `
            <div class="card border-warning mb-3">
                <div class="card-header bg-warning text-dark">
                    <h5 class="mb-0"><i class="bi bi-list-ol"></i> Multi-Step Operation</h5>
                </div>
                <div class="card-body">
                    <p class="mb-3"><strong>This operation will execute ${steps.length} step(s):</strong></p>
                    <ol class="mb-3">
                        ${steps.map((step, i) => `<li>${step.operationInfo?.description || step.operation}</li>`).join('')}
                    </ol>
                    <p class="mb-3 text-danger"><strong>Are you sure you want to proceed?</strong></p>
                    <div class="d-flex gap-2">
                        <button id="ai-multistep-execute" class="btn btn-success">
                            <i class="bi bi-play-circle"></i> Execute All Steps
                        </button>
                        <button id="ai-multistep-cancel" class="btn btn-secondary">
                            <i class="bi bi-x-circle"></i> Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('ai-multistep-execute')?.addEventListener('click', async () => {
            await performOperation(parsed, token, resultsSection, previewSection);
        });

        document.getElementById('ai-multistep-cancel')?.addEventListener('click', () => {
            resultsSection.innerHTML = `
                <div class="alert alert-secondary">
                    <p class="mb-0">Operation cancelled.</p>
                </div>
            `;
        });

        return;
    }

    // Step 1: Fetch items for confirmation if needed
    resultsSection.innerHTML = `
        <div class="card mb-3">
            <div class="card-body">
                <div class="d-flex align-items-center">
                    <div class="spinner-border spinner-border-sm text-primary me-3" role="status">
                        <span class="visually-hidden">Checking...</span>
                    </div>
                    <div>
                        <h6 class="mb-0">Gathering information...</h6>
                        <small class="text-muted">Fetching items that match your criteria</small>
                    </div>
                </div>
            </div>
        </div>
    `;

    try {
        // Check if this operation needs confirmation
        const fetchResult = await window.ipcRenderer.invoke('ai-assistant:fetchItems', {
            operation: parsed.operation,
            parameters: parsed.parameters,
            token: token
        });

        if (!fetchResult.success) {
            throw new Error(fetchResult.error || 'Failed to fetch items');
        }

        if (fetchResult.needsGroupChoice) {
            const groups = Array.isArray(fetchResult.groups) ? fetchResult.groups : [];
            const groupName = fetchResult.groupName || '';

            resultsSection.innerHTML = `
                <div class="card border-info mb-3">
                    <div class="card-header bg-info text-white">
                        <h5 class="mb-0"><i class="bi bi-collection"></i> Select Assignment Group</h5>
                    </div>
                    <div class="card-body">
                        <p class="mb-2">No exact match found for <strong>${groupName || 'the requested group'}</strong>. Please select the correct assignment group:</p>
                        <select id="ai-assignment-group-select" class="form-select mb-3">
                            ${groups.map(g => `<option value="${g.id}">${g.name} (ID: ${g.id})</option>`).join('')}
                        </select>
                        <div class="d-flex gap-2">
                            <button id="ai-group-select-continue" class="btn btn-primary">
                                <i class="bi bi-check-circle"></i> Continue
                            </button>
                            <button id="ai-group-select-cancel" class="btn btn-secondary">
                                <i class="bi bi-x-circle"></i> Cancel
                            </button>
                        </div>
                    </div>
                </div>
            `;

            const continueBtn = document.getElementById('ai-group-select-continue');
            const cancelBtn = document.getElementById('ai-group-select-cancel');
            const selectEl = document.getElementById('ai-assignment-group-select');

            if (continueBtn) {
                continueBtn.addEventListener('click', async () => {
                    const selectedId = selectEl?.value;
                    if (!selectedId) {
                        alert('Please select an assignment group.');
                        return;
                    }
                    parsed.parameters.assignmentGroupId = selectedId;
                    parsed.parameters.groupId = selectedId;
                    parsed.parameters.group_id = selectedId;
                    await executeOperation(parsed, token);
                });
            }

            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    resultsSection.innerHTML = `
                        <div class="alert alert-secondary">
                            <p class="mb-0">Operation cancelled.</p>
                        </div>
                    `;
                });
            }

            return;
        }

        // If no confirmation needed, proceed directly
        if (!fetchResult.needsConfirmation) {
            return await performOperation(parsed, token, resultsSection, previewSection);
        }

        // Show confirmation dialog
        if (fetchResult.itemCount === 0) {
            resultsSection.innerHTML = `
                <div class="alert alert-info">
                    <h6 class="alert-heading"><i class="bi bi-info-circle"></i> No Items Found</h6>
                    <p class="mb-0">No items matching your criteria were found.</p>
                </div>
            `;
            return;
        }

        // Build confirmation dialog
        const isCreateInEmptyGroups = parsed.operation === 'create-assignments-in-empty-groups';
        const itemType = isCreateInEmptyGroups ? 'empty assignment groups' :
            (parsed.operation.includes('assignment') ? 'assignments' :
                (parsed.operation.includes('module') ? 'modules' :
                    (parsed.operation.includes('conversation') ? 'conversations' :
                        (parsed.operation.includes('group') ? 'groups' : 'items'))));

        // Check if this is a relock-modules operation - show checkboxes
        const isRelockModules = parsed.operation === 'relock-modules';
        const isConversations = parsed.operation.includes('conversation');

        // Determine the action verb for the confirmation message
        let actionVerb = 'process';
        if (parsed.operation.includes('delete')) {
            actionVerb = 'delete';
        } else if (isCreateInEmptyGroups) {
            actionVerb = 'create assignments in';
        }

        let confirmHtml = `
            <div class="card border-warning mb-3">
                <div class="card-header bg-warning text-dark">
                    <h5 class="mb-0"><i class="bi bi-exclamation-triangle"></i> Confirmation Required</h5>
                </div>
                <div class="card-body">
                    <p class="mb-3"><strong>${isCreateInEmptyGroups ? `Found ${fetchResult.itemCount} ${itemType} to create assignments in.` : `I found ${fetchResult.itemCount} ${itemType} matching your criteria.`}</strong></p>
        `;

        if (fetchResult.items && fetchResult.items.length > 0) {
            if (isRelockModules) {
                // Show checkboxes for module selection
                confirmHtml += `
                    <p class="mb-2"><strong>Select modules to relock:</strong></p>
                    <div class="form-check mb-2">
                        <input class="form-check-input" type="checkbox" id="ai-select-all-modules" checked>
                        <label class="form-check-label fw-bold" for="ai-select-all-modules">
                            Select All
                        </label>
                    </div>
                    <div class="border rounded p-2 mb-3" style="max-height: 300px; overflow-y: auto;">
                        ${fetchResult.items.map((item, idx) => `
                            <div class="form-check">
                                <input class="form-check-input ai-module-checkbox" type="checkbox" value="${item.id}" id="ai-module-${idx}" checked data-name="${item.name}">
                                <label class="form-check-label" for="ai-module-${idx}">
                                    ${item.name}
                                </label>
                            </div>
                        `).join('')}
                    </div>
                    <p class="mb-3"><small class="text-muted"><span id="ai-selected-count">${fetchResult.itemCount}</span> of ${fetchResult.itemCount} modules selected</small></p>
                `;
            } else {
                // Show regular list preview for other operations
                confirmHtml += `
                    <p class="mb-2">Preview of items (showing first ${fetchResult.items.length}):</p>
                    <ul class="mb-3">
                        ${fetchResult.items.map(item => `<li>${item.name}</li>`).join('')}
                        ${fetchResult.itemCount > 5 ? `<li><em>...and ${fetchResult.itemCount - 5} more</em></li>` : ''}
                    </ul>
                `;
                if (isConversations) {
                    confirmHtml += `
                        <div class="mb-3">
                            <button id="ai-export-convos" class="btn btn-sm btn-outline-primary">
                                <i class="bi bi-download"></i> Export Found to CSV
                            </button>
                        </div>
                    `;
                }
            }
        }

        confirmHtml += `
                    <p class="mb-3 text-danger"><strong>Are you sure you want to ${actionVerb} ${isRelockModules ? 'the selected' : (fetchResult.itemCount > 1 ? 'these' : 'this')} ${isRelockModules ? '' : fetchResult.itemCount} ${itemType}?</strong></p>
                    <div class="d-flex gap-2">
                        <button id="ai-confirm-execute" class="btn btn-danger">
                            <i class="bi bi-check-circle"></i> Yes, Proceed
                        </button>
                        <button id="ai-confirm-cancel" class="btn btn-secondary">
                            <i class="bi bi-x-circle"></i> Cancel
                        </button>
                        <button id="ai-query-feedback" class="btn btn-outline-secondary btn-sm">
                            <i class="bi bi-flag"></i> Report Issue
                        </button>
                    </div>
                </div>
            </div>
        `;

        resultsSection.innerHTML = confirmHtml;

        // Setup export for conversations
        const exportBtn = document.getElementById('ai-export-convos');
        if (exportBtn) {
            exportBtn.addEventListener('click', async () => {
                const items = fetchResult.itemsRaw || fetchResult.items || [];
                if (!items.length) {
                    showAIAssistantToast('No conversations to export.', 'warning');
                    return;
                }

                const escapeCsv = (value) => {
                    const str = value === null || value === undefined ? '' : String(value);
                    if (/[",\n]/.test(str)) {
                        return `"${str.replace(/"/g, '""')}"`;
                    }
                    return str;
                };

                const header = ['message_id', 'subject', 'user_ids'];
                const rows = items.map(item => {
                    const messageId = item.id || item._id || '';
                    const subject = item.subject || item.title || '';
                    const userIds = Array.isArray(item.users) ? item.users.join('|') : '';
                    return [messageId, subject, userIds].map(escapeCsv).join(',');
                });
                const csv = [header.join(','), ...rows].join('\n');

                if (!window.electronAPI?.showSaveDialog || !window.electronAPI?.writeFile) {
                    showAIAssistantToast('CSV export is not available in this environment.', 'danger');
                    return;
                }

                const fileName = `conversations_${Date.now()}.csv`;
                try {
                    const saveResult = await window.electronAPI.showSaveDialog({
                        defaultPath: fileName,
                        filters: [{ name: 'CSV Files', extensions: ['csv'] }]
                    });

                    if (!saveResult || !saveResult.filePath) {
                        return;
                    }

                    await window.electronAPI.writeFile(saveResult.filePath, csv);
                    showAIAssistantToast(`CSV exported successfully.`, 'success');
                } catch (error) {
                    showAIAssistantToast(`CSV export failed: ${error.message}`, 'danger');
                }
            });
        }

        // Setup select-all checkbox for module operations
        if (isRelockModules) {
            const selectAllCheckbox = document.getElementById('ai-select-all-modules');
            const moduleCheckboxes = document.querySelectorAll('.ai-module-checkbox');
            const selectedCountSpan = document.getElementById('ai-selected-count');

            const updateSelectedCount = () => {
                const checkedCount = document.querySelectorAll('.ai-module-checkbox:checked').length;
                selectedCountSpan.textContent = checkedCount;
            };

            if (selectAllCheckbox) {
                selectAllCheckbox.addEventListener('change', (e) => {
                    moduleCheckboxes.forEach(checkbox => {
                        checkbox.checked = e.target.checked;
                    });
                    updateSelectedCount();
                });
            }

            moduleCheckboxes.forEach(checkbox => {
                checkbox.addEventListener('change', () => {
                    updateSelectedCount();
                    // Update select-all state
                    const allChecked = Array.from(moduleCheckboxes).every(cb => cb.checked);
                    const noneChecked = Array.from(moduleCheckboxes).every(cb => !cb.checked);
                    if (selectAllCheckbox) {
                        selectAllCheckbox.checked = allChecked;
                        selectAllCheckbox.indeterminate = !allChecked && !noneChecked;
                    }
                });
            });
        }

        // Setup confirmation listeners
        const confirmBtn = document.getElementById('ai-confirm-execute');
        const cancelBtn = document.getElementById('ai-confirm-cancel');
        const queryFeedbackBtn = document.getElementById('ai-query-feedback');

        if (confirmBtn) {
            confirmBtn.addEventListener('click', async () => {
                // For relock-modules, filter to only selected modules
                if (isRelockModules) {
                    const selectedCheckboxes = document.querySelectorAll('.ai-module-checkbox:checked');
                    if (selectedCheckboxes.length === 0) {
                        alert('Please select at least one module to relock.');
                        return;
                    }

                    // Get selected module IDs and names
                    const selectedModules = Array.from(selectedCheckboxes).map(cb => ({
                        id: cb.value,
                        name: cb.dataset.name
                    }));

                    // Update parsed parameters with selected modules only
                    parsed.selectedModules = selectedModules;
                }

                await performOperation(parsed, token, resultsSection, previewSection, true);
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                resultsSection.innerHTML = `
                    <div class="alert alert-secondary">
                        <p class="mb-0">Operation cancelled.</p>
                    </div>
                `;
            });
        }

        if (queryFeedbackBtn) {
            queryFeedbackBtn.addEventListener('click', async () => {
                // Create feedback modal
                const modalId = 'query-feedback-modal';
                let modal = document.getElementById(modalId);
                if (!modal) {
                    modal = document.createElement('div');
                    modal.id = modalId;
                    modal.className = 'modal fade';
                    modal.innerHTML = `
                        <div class="modal-dialog">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h5 class="modal-title">Report Issue with Query Results</h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                </div>
                                <div class="modal-body">
                                    <label for="query-feedback-text" class="form-label">Describe what's wrong with these results:</label>
                                    <textarea id="query-feedback-text" class="form-control" rows="4" placeholder="e.g., The results are incorrect or unexpected..."></textarea>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                    <button type="button" class="btn btn-primary" id="query-feedback-submit">Send Feedback</button>
                                </div>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(modal);
                }

                const bsModal = new bootstrap.Modal(modal);
                bsModal.show();

                // Setup submit listener
                const submitBtn = document.getElementById('query-feedback-submit');
                const textarea = document.getElementById('query-feedback-text');
                textarea.value = ''; // Clear previous text

                submitBtn.onclick = async () => {
                    const feedback = textarea.value.trim();
                    if (feedback) {
                        try {
                            await window.ipcRenderer.invoke('ai-assistant:sendSlackFeedback', {
                                type: 'query-results',
                                prompt: document.getElementById('ai-assistant-prompt').value.trim(),
                                operation: parsed.operation,
                                itemCount: fetchResult.itemCount,
                                items: fetchResult.items,
                                feedback: feedback
                            });

                            bsModal.hide();
                            alert('Feedback sent! Thank you for helping improve the AI Assistant.');
                        } catch (error) {
                            alert(`Failed to send feedback: ${error.message}`);
                        }
                    }
                };
            });
        }

    } catch (error) {
        resultsSection.innerHTML = `
            <div class="alert alert-danger">
                <h6 class="alert-heading"><i class="bi bi-x-circle"></i> Error</h6>
                <p class="mb-0">${error.message}</p>
            </div>
        `;
    }
}

async function performOperation(parsed, token, resultsSection, previewSection, confirmed = false) {
    // Show executing state with progress bar
    resultsSection.innerHTML = `
        <div class="card mb-3">
            <div class="card-body">
                <div class="mb-3">
                    <div class="d-flex align-items-center mb-2">
                        <div class="spinner-border spinner-border-sm text-primary me-3" role="status">
                            <span class="visually-hidden">Executing...</span>
                        </div>
                        <div>
                            <h6 class="mb-0">Executing operation...</h6>
                            <small id="ai-progress-label" class="text-muted">${parsed.summary}</small>
                        </div>
                    </div>
                    <div class="progress" style="height: 25px;">
                        <div id="ai-progress-bar" class="progress-bar progress-bar-striped progress-bar-animated" 
                            role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                            0%
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Listen for progress updates using progressAPI
    const unsubscribe = window.progressAPI.onUpdateProgress((progress) => {
        const progressBar = document.getElementById('ai-progress-bar');
        const progressLabel = document.getElementById('ai-progress-label');
        if (progressBar) {
            if (typeof progress === 'number') {
                const percent = Math.round(progress);
                progressBar.classList.remove('progress-bar-striped', 'progress-bar-animated');
                progressBar.style.width = `${percent}%`;
                progressBar.setAttribute('aria-valuenow', percent);
                progressBar.textContent = `${percent}%`;
                if (progressLabel) progressLabel.textContent = `${percent}%`;
                return;
            }

            const mode = progress?.mode || 'determinate';
            if (mode === 'indeterminate') {
                progressBar.classList.add('progress-bar-striped', 'progress-bar-animated');
                progressBar.style.width = '100%';
                progressBar.textContent = '';
                if (progressLabel) progressLabel.textContent = progress?.label || 'Processing...';
            } else if (mode === 'done') {
                progressBar.classList.remove('progress-bar-striped', 'progress-bar-animated');
                progressBar.style.width = '100%';
                progressBar.setAttribute('aria-valuenow', 100);
                progressBar.textContent = '100%';
                if (progressLabel) progressLabel.textContent = progress?.label || 'Done';
            } else {
                progressBar.classList.remove('progress-bar-striped', 'progress-bar-animated');
                const value = typeof progress?.value === 'number' ? progress.value : (typeof progress?.percent === 'number' ? progress.percent / 100 : 0);
                const percent = Math.round(Math.max(0, Math.min(1, value)) * 100);
                progressBar.style.width = `${percent}%`;
                progressBar.setAttribute('aria-valuenow', percent);
                progressBar.textContent = `${percent}%`;
                if (progressLabel) {
                    if (progress?.label) {
                        progressLabel.textContent = progress.label;
                    } else if (typeof progress?.processed === 'number' && typeof progress?.total === 'number') {
                        progressLabel.textContent = `Processed ${progress.processed}/${progress.total} (${percent}%)`;
                    } else {
                        progressLabel.textContent = `${percent}%`;
                    }
                }
            }
        }
    });

    try {
        // Prepare parameters - for relock-modules with selection, override module list
        let executionParams = { ...(parsed.parameters || {}) };

        if (Array.isArray(parsed.steps) && parsed.steps.length > 0) {
            executionParams.steps = parsed.steps;
        }

        if (parsed.selectedModules && parsed.selectedModules.length > 0) {
            // User has specifically selected modules, use only those
            executionParams.selectedModules = parsed.selectedModules;
        }

        const result = await window.ipcRenderer.invoke('ai-assistant:executeOperation', {
            operation: parsed.operation,
            parameters: executionParams,
            token: token,
            confirmed: confirmed
        });

        if (!result.success) {
            throw new Error(result.error || 'Operation failed');
        }

        // Build result HTML
        let resultHtml = `
            <div class="card border-success mb-3">
                <div class="card-header bg-success text-white">
                    <h5 class="mb-0"><i class="bi bi-check-circle"></i> Operation Completed</h5>
                </div>
                <div class="card-body">
                    <p class="mb-2"><strong>Summary:</strong> ${parsed.summary}</p>
        `;

        // Handle different result formats
        const res = result.result;
        if (res.steps && Array.isArray(res.steps)) {
            resultHtml += '<div class="mb-2">';
            resultHtml += `<p class="mb-2"><strong>Steps Completed:</strong> ${res.steps.length}</p>`;
            resultHtml += '<ol class="mb-2">';
            res.steps.forEach(stepResult => {
                const stepTitle = stepResult.operation || 'Step';
                resultHtml += `<li class="mb-2"><strong>${stepTitle}</strong>`;
                if (stepResult.result?.fetchedCount !== undefined || stepResult.result?.deletedCount !== undefined) {
                    const fetched = stepResult.result.fetchedCount ?? 'n/a';
                    const deleted = stepResult.result.deletedCount ?? 'n/a';
                    resultHtml += ` - Found ${fetched}, Deleted ${deleted}`;
                } else if (stepResult.result?.successful || stepResult.result?.succeeded) {
                    const successCount = stepResult.result.successful?.length || stepResult.result.succeeded?.length || 0;
                    resultHtml += ` - Successful: ${successCount}`;
                }
                resultHtml += '</li>';
            });
            resultHtml += '</ol>';
            if (res.summary) {
                resultHtml += `<p class="text-muted mb-0">${res.summary}</p>`;
            }
            resultHtml += '</div>';
        } else if (res.queryType) {
            // Information query results
            resultHtml += '<div class="mb-2">';
            if (res.queryType === 'count') {
                resultHtml += `<p class="mb-1"><strong>Count:</strong> ${res.count} ${res.dataType}</p>`;
                resultHtml += `<p class="mb-0 text-muted">${res.summary}</p>`;
            } else if (res.queryType === 'list' && res.items) {
                resultHtml += `<p class="mb-2"><strong>Found ${res.count} ${res.dataType}:</strong></p>`;
                resultHtml += '<ul class="mb-2">';
                res.items.forEach(item => {
                    resultHtml += `<li><strong>${item.name}</strong>`;
                    if (item.published !== undefined) {
                        resultHtml += ` - ${item.published ? '<span class="badge bg-success">Published</span>' : '<span class="badge bg-secondary">Unpublished</span>'}`;
                    }
                    if (item.dueAt) {
                        resultHtml += ` - Due: ${new Date(item.dueAt).toLocaleDateString()}`;
                    }
                    resultHtml += `</li>`;
                });
                resultHtml += '</ul>';
                if (res.count > res.items.length) {
                    resultHtml += `<p class="text-muted"><em>...and ${res.count - res.items.length} more</em></p>`;
                }
            } else if (res.queryType === 'details') {
                resultHtml += `<p class="mb-2">${res.summary}</p>`;
                resultHtml += `<pre class="bg-light p-3 rounded mt-2" style="max-height: 400px; overflow-y: auto;"><code>${JSON.stringify(res.data || res.items, null, 2)}</code></pre>`;
            }
            resultHtml += '</div>';
        } else if (res.fetchedCount !== undefined || res.deletedCount !== undefined) {
            // Two-step operation results (delete/relock operations)
            const isRelock = parsed.operation === 'relock-modules';
            const actionVerb = isRelock ? 'Re-locked' : 'Deleted';

            resultHtml += '<div class="mb-2">';
            if (res.fetchedCount !== undefined) {
                resultHtml += `<p class="mb-1"><strong>Items Found:</strong> ${res.fetchedCount}</p>`;
            }
            if (res.deletedCount !== undefined) {
                resultHtml += `<p class="mb-1"><strong>Successfully ${actionVerb}:</strong> ${res.deletedCount}</p>`;
            }
            if (res.failedCount !== undefined && res.failedCount > 0) {
                resultHtml += `<p class="mb-1 text-warning"><strong>Failed:</strong> ${res.failedCount}</p>`;
            }
            resultHtml += '</div>';
        } else if (res.successful !== undefined || res.failed !== undefined) {
            // Batch operation results (create operations)
            const successCount = res.successful?.length || 0;
            const failedCount = res.failed?.length || 0;
            resultHtml += '<div class="mb-2">';
            resultHtml += `<p class="mb-1"><strong>Successful:</strong> ${successCount}</p>`;
            if (failedCount > 0) {
                resultHtml += `<p class="mb-1 text-warning"><strong>Failed:</strong> ${failedCount}</p>`;
            }
            resultHtml += '</div>';
        } else if (res.course && res.course_id) {
            // Course creation result - show course link
            const courseUrl = `https://${parsed.parameters?.domain || 'canvas.instructure.com'}/courses/${res.course_id}`;
            resultHtml += '<div class="mb-2">';
            resultHtml += `<p class="mb-2"><strong>Course Created:</strong> <a href="${courseUrl}" target="_blank" class="text-decoration-none">${res.course.name || 'New Course'} <i class="bi bi-box-arrow-up-right"></i></a></p>`;
            resultHtml += `<p class="mb-1"><strong>Course ID:</strong> ${res.course_id}</p>`;
            if (res.message) {
                resultHtml += `<p class="mb-1 text-muted">${res.message}</p>`;
            }
            // Show additional created content summary
            if (res.users) resultHtml += `<p class="mb-1"><i class="bi bi-people"></i> Users enrolled: ${res.users}</p>`;
            if (res.assignmentGroups?.successful?.length) resultHtml += `<p class="mb-1"><i class="bi bi-folder"></i> Assignment groups: ${res.assignmentGroups.successful.length}</p>`;
            if (res.assignmentsInGroups) resultHtml += `<p class="mb-1"><i class="bi bi-file-earmark-text"></i> Assignments in groups: ${res.assignmentsInGroups}</p>`;
            if (res.assignments?.successful?.length) resultHtml += `<p class="mb-1"><i class="bi bi-file-earmark-text"></i> Standalone assignments: ${res.assignments.successful.length}</p>`;
            if (res.discussions) resultHtml += `<p class="mb-1"><i class="bi bi-chat-left-text"></i> Discussions: ${res.discussions}</p>`;
            if (res.pages) resultHtml += `<p class="mb-1"><i class="bi bi-file-richtext"></i> Pages: ${res.pages}</p>`;
            if (res.modules) resultHtml += `<p class="mb-1"><i class="bi bi-collection"></i> Modules: ${res.modules}</p>`;
            if (res.sections) resultHtml += `<p class="mb-1"><i class="bi bi-diagram-3"></i> Sections: ${res.sections}</p>`;
            resultHtml += '</div>';
        } else {
            // Generic result
            resultHtml += `
                <div class="mb-0">
                    <strong>Result:</strong>
                    <pre class="bg-light p-3 rounded mt-2"><code>${JSON.stringify(res, null, 2)}</code></pre>
                </div>
            `;
        }

        resultHtml += `
                    <hr>
                    <div class="d-flex gap-2">
                        <button id="ai-result-feedback-btn" class="btn btn-sm btn-outline-secondary">
                            <i class="bi bi-flag"></i> Report Issue with Results
                        </button>
                    </div>
                </div>
            </div>
        `;

        resultsSection.innerHTML = resultHtml;

        // Setup result feedback listener to send to Slack
        const resultFeedbackBtn = document.getElementById('ai-result-feedback-btn');
        if (resultFeedbackBtn) {
            resultFeedbackBtn.addEventListener('click', () => {
                // Create feedback modal
                const modalId = 'result-feedback-modal';
                let modal = document.getElementById(modalId);
                if (!modal) {
                    modal = document.createElement('div');
                    modal.id = modalId;
                    modal.className = 'modal fade';
                    modal.innerHTML = `
                        <div class="modal-dialog">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h5 class="modal-title">Report Issue with Results</h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                </div>
                                <div class="modal-body">
                                    <label for="result-feedback-text" class="form-label">Describe what went wrong:</label>
                                    <textarea id="result-feedback-text" class="form-control" rows="4" placeholder="e.g., The operation succeeded but the results don't match expectations..."></textarea>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                    <button type="button" class="btn btn-primary" id="result-feedback-submit">Send Feedback</button>
                                </div>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(modal);
                }

                const bsModal = new bootstrap.Modal(modal);
                bsModal.show();

                // Setup submit listener
                const submitBtn = document.getElementById('result-feedback-submit');
                const textarea = document.getElementById('result-feedback-text');
                textarea.value = ''; // Clear previous text

                submitBtn.onclick = async () => {
                    const feedback = textarea.value.trim();
                    if (feedback) {
                        try {
                            // Build result context
                            let resultContext = {};
                            if (res.fetchedCount !== undefined || res.deletedCount !== undefined) {
                                resultContext = {
                                    fetched: res.fetchedCount || 0,
                                    deleted: res.deletedCount || 0,
                                    failed: res.failedCount || 0
                                };
                            } else if (res.successful !== undefined) {
                                resultContext = {
                                    successful: res.successful?.length || 0,
                                    failed: res.failed?.length || 0
                                };
                            }

                            await window.ipcRenderer.invoke('ai-assistant:sendSlackFeedback', {
                                type: 'operation-results',
                                prompt: document.getElementById('ai-assistant-prompt').value.trim(),
                                operation: parsed.operation,
                                parameters: parsed.parameters,
                                results: resultContext,
                                feedback: feedback
                            });

                            bsModal.hide();
                            alert('Feedback sent! Thank you for helping improve the AI Assistant.');
                        } catch (error) {
                            alert(`Failed to send feedback: ${error.message}`);
                        }
                    }
                };
            });
        }

        // Clean up progress listener
        unsubscribe();

        // Hide preview
        previewSection.classList.add('d-none');

    } catch (error) {
        // Clean up progress listener
        unsubscribe();

        resultsSection.innerHTML = `
            <div class="alert alert-danger">
                <h6 class="alert-heading"><i class="bi bi-x-circle"></i> Operation Failed</h6>
                <p class="mb-0">${error.message}</p>
            </div>
        `;
    }
}
