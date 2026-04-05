/**
 * AI Assistant Renderer - Chat-based Agentic UI
 * 
 * Provides a conversational interface where the AI assistant can:
 * - Discover and call Canvas tools dynamically
 * - Ask for missing information
 * - Request user confirmation for destructive operations
 * - Stream real-time updates as tools execute
 */

// State
let agentChatInitialized = false;
let agentIsProcessing = false;
let agentListenersAttached = false;
let agentAttachedFile = null; // { path, name }

function aiAssistantTemplate(e) {
    if (typeof hideEndpoints === 'function') {
        hideEndpoints(e);
    }
    showAgentChatUI();
}

function showAgentChatUI() {
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

    // Only build HTML if not already initialized
    if (!agentChatInitialized) {
        container.innerHTML = `
            <div class="agent-chat-ui d-flex flex-column" style="height: calc(100vh - 180px);">
                <!-- Header -->
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h4 class="mb-0">
                        <i class="bi bi-robot"></i> AI Assistant
                    </h4>
                    <div class="d-flex gap-2">
                        <button id="agent-examples-toggle" class="btn btn-sm btn-outline-secondary" title="Show example prompts">
                            <i class="bi bi-lightbulb"></i> Examples
                        </button>
                        <button id="agent-new-session" class="btn btn-sm btn-outline-primary" title="Start new conversation">
                            <i class="bi bi-plus-circle"></i> New Chat
                        </button>
                    </div>
                </div>

                <!-- Examples Panel (collapsible) -->
                <div id="agent-examples-panel" class="collapse mb-3">
                    <div class="card card-body bg-light">
                        <h6 class="mb-2">Click any example to auto-fill:</h6>
                        <div class="row g-2">
                            <div class="col-md-6">
                                <div class="list-group list-group-flush small">
                                    <a href="#" class="list-group-item list-group-item-action agent-example p-2" data-prompt="Delete all unpublished assignments from https://myschool.instructure.com/courses/6986">
                                        <i class="bi bi-trash text-danger"></i> Delete unpublished assignments
                                    </a>
                                    <a href="#" class="list-group-item list-group-item-action agent-example p-2" data-prompt="Create 5 file upload assignments worth 10 points in https://myschool.instructure.com/courses/6986">
                                        <i class="bi bi-plus-circle text-success"></i> Create 5 assignments
                                    </a>
                                    <a href="#" class="list-group-item list-group-item-action agent-example p-2" data-prompt="List all modules from https://myschool.instructure.com/courses/6986">
                                        <i class="bi bi-collection text-primary"></i> List modules
                                    </a>
                                    <a href="#" class="list-group-item list-group-item-action agent-example p-2" data-prompt="Delete all empty assignment groups from https://myschool.instructure.com/courses/6986">
                                        <i class="bi bi-trash text-danger"></i> Delete empty groups
                                    </a>
                                    <a href="#" class="list-group-item list-group-item-action agent-example p-2" data-prompt="Create an announcement titled 'Midterm Exam Schedule' for https://myschool.instructure.com/courses/6986 with message 'The midterm will be held on March 15th.'">
                                        <i class="bi bi-megaphone text-warning"></i> Create announcement
                                    </a>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="list-group list-group-flush small">
                                    <a href="#" class="list-group-item list-group-item-action agent-example p-2" data-prompt="Get course information for https://myschool.instructure.com/courses/6986">
                                        <i class="bi bi-info-circle text-info"></i> Get course info
                                    </a>
                                    <a href="#" class="list-group-item list-group-item-action agent-example p-2" data-prompt="Create 3 discussion topics named 'Week Discussion' in https://myschool.instructure.com/courses/6986">
                                        <i class="bi bi-chat-dots text-success"></i> Create discussions
                                    </a>
                                    <a href="#" class="list-group-item list-group-item-action agent-example p-2" data-prompt="Delete all announcements from https://myschool.instructure.com/courses/6986">
                                        <i class="bi bi-trash text-danger"></i> Delete announcements
                                    </a>
                                    <a href="#" class="list-group-item list-group-item-action agent-example p-2" data-prompt="Create 10 pages named 'Week Content' in https://myschool.instructure.com/courses/6986">
                                        <i class="bi bi-file-earmark-plus text-success"></i> Create pages
                                    </a>
                                    <a href="#" class="list-group-item list-group-item-action agent-example p-2" data-prompt="Reset course content in https://myschool.instructure.com/courses/6986">
                                        <i class="bi bi-arrow-counterclockwise text-warning"></i> Reset course
                                    </a>
                                </div>
                            </div>
                        </div>
                        <small class="text-muted mt-2">Replace 'myschool.instructure.com' and course ID with your actual values</small>
                    </div>
                </div>

                <!-- Chat Messages Area -->
                <div id="agent-messages" class="flex-grow-1 overflow-auto mb-3 border rounded p-3 bg-white" 
                     style="min-height: 200px;">
                    <div id="agent-welcome" class="text-center py-5 text-muted">
                        <i class="bi bi-chat-dots" style="font-size: 3rem;"></i>
                        <h5 class="mt-3">Canvas AI Assistant</h5>
                        <p>Ask me to manage your Canvas courses. I can list, create, and delete content.<br>
                        I'll always ask for confirmation before making changes.</p>
                        <p class="small"><strong>Tip:</strong> Include your Canvas URL so I know which course to work with.</p>
                    </div>
                </div>

                <!-- Input Area -->
                <div class="border rounded p-2 bg-light">
                    <div id="agent-file-badge" class="d-none mb-1">
                        <span class="badge bg-secondary d-inline-flex align-items-center gap-1">
                            <i class="bi bi-paperclip"></i>
                            <span id="agent-file-name"></span>
                            <button id="agent-file-remove" type="button" class="btn-close btn-close-white" style="font-size: 0.5rem;" aria-label="Remove"></button>
                        </span>
                    </div>
                    <div class="d-flex gap-2">
                        <textarea id="agent-input" class="form-control border-0 bg-light" rows="2" 
                            placeholder="Ask me to manage your Canvas course..."
                            style="resize: none;"></textarea>
                        <div class="d-flex flex-column gap-1 justify-content-end">
                            <button id="agent-send" class="btn btn-primary" title="Send" style="height: 40px; width: 40px;">
                                <i class="bi bi-send"></i>
                            </button>
                            <button id="agent-attach-file" class="btn btn-outline-secondary btn-sm" title="Attach file" style="height: 30px; width: 40px;">
                                <i class="bi bi-paperclip"></i>
                            </button>
                            <button id="agent-cancel" class="btn btn-outline-danger btn-sm d-none" title="Cancel" style="height: 30px; width: 40px;">
                                <i class="bi bi-x"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        agentChatInitialized = true;
        setupAgentListeners();
    }
}

function setupAgentListeners() {
    const input = document.getElementById('agent-input');
    const sendBtn = document.getElementById('agent-send');
    const cancelBtn = document.getElementById('agent-cancel');
    const newSessionBtn = document.getElementById('agent-new-session');
    const examplesToggle = document.getElementById('agent-examples-toggle');
    const attachBtn = document.getElementById('agent-attach-file');
    const fileRemoveBtn = document.getElementById('agent-file-remove');

    // Attach file
    attachBtn.addEventListener('click', async () => {
        try {
            const result = await window.ipcRenderer.invoke('agent:selectFile');
            if (!result.canceled && result.filePath) {
                agentAttachedFile = { path: result.filePath, name: result.fileName };
                const badge = document.getElementById('agent-file-badge');
                const nameEl = document.getElementById('agent-file-name');
                if (badge && nameEl) {
                    nameEl.textContent = result.fileName;
                    badge.classList.remove('d-none');
                }
            }
        } catch (err) {
            appendAgentError('Failed to select file: ' + err.message);
        }
    });

    // Remove attached file
    fileRemoveBtn.addEventListener('click', () => {
        agentAttachedFile = null;
        const badge = document.getElementById('agent-file-badge');
        if (badge) badge.classList.add('d-none');
    });

    // Send message on button click
    sendBtn.addEventListener('click', () => sendAgentMessage());

    // Send on Enter (Shift+Enter for newline)
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendAgentMessage();
        }
    });

    // Cancel button
    cancelBtn.addEventListener('click', async () => {
        await window.ipcRenderer.invoke('agent:cancel');
        setAgentProcessing(false);
        appendAgentStatus('Operation cancelled.', 'warning');
    });

    // New session
    newSessionBtn.addEventListener('click', async () => {
        await window.ipcRenderer.invoke('agent:newSession');
        clearAgentChat();
    });

    // Examples toggle
    examplesToggle.addEventListener('click', () => {
        const panel = document.getElementById('agent-examples-panel');
        if (panel) {
            new bootstrap.Collapse(panel, { toggle: true });
        }
    });

    // Example prompts
    document.querySelectorAll('.agent-example').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const prompt = link.getAttribute('data-prompt');
            input.value = prompt;
            const panel = document.getElementById('agent-examples-panel');
            if (panel && panel.classList.contains('show')) {
                new bootstrap.Collapse(panel, { toggle: false }).hide();
            }
            input.focus();
        });
    });

    // Listen for streaming updates from the agent
    if (!agentListenersAttached) {
        window.ipcRenderer.on('agent:update', (_event, update) => {
            handleAgentUpdate(update);
        });

        window.ipcRenderer.on('agent:confirmRequest', (_event, data) => {
            handleConfirmRequest(data);
        });

        window.ipcRenderer.on('agent:domainConfirmRequest', (_event, data) => {
            handleDomainConfirmRequest(data);
        });

        agentListenersAttached = true;
    }
}

async function sendAgentMessage() {
    const input = document.getElementById('agent-input');
    const message = input.value.trim();

    if (!message || agentIsProcessing) return;

    // Clear welcome message
    const welcome = document.getElementById('agent-welcome');
    if (welcome) welcome.remove();

    // Capture and clear attached file before sending
    const attachedFile = agentAttachedFile;
    agentAttachedFile = null;
    const fileBadge = document.getElementById('agent-file-badge');
    if (fileBadge) fileBadge.classList.add('d-none');

    const displayMsg = attachedFile ? message + '\n📎 ' + attachedFile.name : message;
    appendUserMessage(displayMsg);
    input.value = '';
    input.focus();

    setAgentProcessing(true);
    appendThinkingIndicator();

    // Read Canvas domain and token from the main form fields
    var domainEl = document.getElementById('domain');
    var tokenEl = document.getElementById('token');
    var domain = domainEl ? domainEl.value.trim() : '';
    var token = tokenEl ? tokenEl.value.trim() : '';

    try {
        const chatPayload = { message, domain, token };
        if (attachedFile) chatPayload.filePath = attachedFile.path;
        const result = await window.ipcRenderer.invoke('agent:chat', chatPayload);

        removeThinkingIndicator();

        if (result.success) {
            appendAssistantMessage(result.response);
        } else {
            appendAgentError(result.error || 'An error occurred');
        }
    } catch (error) {
        removeThinkingIndicator();
        appendAgentError(error.message || 'Failed to communicate with AI assistant');
    } finally {
        setAgentProcessing(false);
    }
}

function setAgentProcessing(isProcessing) {
    agentIsProcessing = isProcessing;
    const sendBtn = document.getElementById('agent-send');
    const cancelBtn = document.getElementById('agent-cancel');
    const input = document.getElementById('agent-input');

    if (sendBtn) sendBtn.disabled = isProcessing;
    if (cancelBtn) cancelBtn.classList.toggle('d-none', !isProcessing);
    if (input) input.disabled = isProcessing;
}

function clearAgentChat() {
    const messagesContainer = document.getElementById('agent-messages');
    if (messagesContainer) {
        messagesContainer.innerHTML = `
            <div id="agent-welcome" class="text-center py-5 text-muted">
                <i class="bi bi-chat-dots" style="font-size: 3rem;"></i>
                <h5 class="mt-3">Canvas AI Assistant</h5>
                <p>Ask me to manage your Canvas courses. I can list, create, and delete content.<br>
                I'll always ask for confirmation before making changes.</p>
                <p class="small"><strong>Tip:</strong> Include your Canvas URL so I know which course to work with.</p>
            </div>
        `;
    }
    agentChatInitialized = false;
}

function scrollChatToBottom() {
    const container = document.getElementById('agent-messages');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

// ============================================================================
// Message Rendering
// ============================================================================

function appendUserMessage(content) {
    const container = document.getElementById('agent-messages');
    if (!container) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = 'd-flex justify-content-end mb-3';
    msgDiv.innerHTML = `
        <div class="bg-primary text-white rounded-3 px-3 py-2" style="max-width: 80%;">
            <div style="white-space: pre-wrap;">${escapeAgentHtml(content)}</div>
        </div>
    `;
    container.appendChild(msgDiv);
    scrollChatToBottom();
}

function appendAssistantMessage(content) {
    const container = document.getElementById('agent-messages');
    if (!container) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = 'd-flex justify-content-start mb-3';
    msgDiv.innerHTML = `
        <div class="bg-light border rounded-3 px-3 py-2" style="max-width: 85%;">
            <div class="small text-muted mb-1"><i class="bi bi-robot"></i> Assistant</div>
            <div class="assistant-content" style="white-space: pre-wrap;">${formatAgentContent(content)}</div>
        </div>
    `;
    container.appendChild(msgDiv);
    scrollChatToBottom();
}

function appendAgentError(content) {
    const container = document.getElementById('agent-messages');
    if (!container) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = 'd-flex justify-content-start mb-3';
    msgDiv.innerHTML = `
        <div class="bg-danger bg-opacity-10 border border-danger rounded-3 px-3 py-2" style="max-width: 85%;">
            <div class="small text-danger mb-1"><i class="bi bi-exclamation-triangle"></i> Error</div>
            <div style="white-space: pre-wrap;">${escapeAgentHtml(content)}</div>
        </div>
    `;
    container.appendChild(msgDiv);
    scrollChatToBottom();
}

function appendAgentStatus(content, type) {
    const container = document.getElementById('agent-messages');
    if (!container) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = 'text-center mb-2';
    const colorClass = type === 'warning' ? 'text-warning' : type === 'success' ? 'text-success' : 'text-muted';
    msgDiv.innerHTML = `<small class="${colorClass}"><i class="bi bi-info-circle"></i> ${escapeAgentHtml(content)}</small>`;
    container.appendChild(msgDiv);
    scrollChatToBottom();
}

function appendToolCallCard(name, args, destructive, batchApproved) {
    const container = document.getElementById('agent-messages');
    if (!container) return;
    const cardId = 'tool-card-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    const msgDiv = document.createElement('div');
    msgDiv.className = 'd-flex justify-content-start mb-2';
    msgDiv.id = cardId;

    const borderClass = batchApproved ? 'border-success' : (destructive ? 'border-warning' : 'border-info');
    const icon = batchApproved ? 'bi-check-circle text-success' : (destructive ? 'bi-exclamation-triangle text-warning' : 'bi-gear text-info');
    const toolDisplayName = name.replace('canvas_', '').replace(/_/g, ' ');

    // Format args, excluding domain for brevity
    const displayArgs = Object.assign({}, args);
    delete displayArgs.domain;
    const argsStr = Object.keys(displayArgs).length > 0
        ? Object.entries(displayArgs).map(function (entry) {
            var k = entry[0], v = entry[1];
            var val = Array.isArray(v) ? '[' + v.length + ' items]' : (typeof v === 'object' ? JSON.stringify(v) : String(v));
            return '<span class="text-muted">' + k + ':</span> ' + escapeAgentHtml(val.length > 80 ? val.substring(0, 80) + '...' : val);
        }).join(' &middot; ')
        : '';

    var badgeHtml = batchApproved
        ? '<span class="badge bg-success text-white">batch approved</span>'
        : (destructive ? '<span class="badge bg-warning text-dark">needs approval</span>' : '<span class="badge bg-info text-white">auto</span>');
    var statusText = batchApproved
        ? 'Executing...'
        : (destructive ? 'Waiting for approval...' : 'Executing...');

    msgDiv.innerHTML = '<div class="border ' + borderClass + ' rounded-3 px-3 py-2 w-100" style="max-width: 85%;">'
        + '<div class="d-flex align-items-center gap-2">'
        + '<i class="bi ' + icon + '"></i>'
        + '<strong class="small">' + escapeAgentHtml(toolDisplayName) + '</strong>'
        + badgeHtml
        + '</div>'
        + (argsStr ? '<div class="small mt-1">' + argsStr + '</div>' : '')
        + '<div id="' + cardId + '-status" class="small mt-1 text-muted">'
        + '<div class="spinner-border spinner-border-sm me-1" role="status"></div>'
        + statusText
        + '</div></div>';

    container.appendChild(msgDiv);
    scrollChatToBottom();
    return cardId;
}

function updateToolCardStatus(toolName, status, type) {
    var displayName = toolName.replace('canvas_', '').replace(/_/g, ' ');
    var cards = document.querySelectorAll('[id^="tool-card-"]');
    for (var i = cards.length - 1; i >= 0; i--) {
        var card = cards[i];
        if (card.textContent.indexOf(displayName) !== -1) {
            var statusEl = card.querySelector('[id$="-status"]');
            if (statusEl) {
                var iconClass = type === 'success' ? 'bi-check-circle text-success' :
                    type === 'error' ? 'bi-x-circle text-danger' :
                        type === 'denied' ? 'bi-slash-circle text-warning' :
                            'bi-info-circle text-info';
                statusEl.innerHTML = '<i class="bi ' + iconClass + '"></i> ' + escapeAgentHtml(status);
            }
            break;
        }
    }
}

function appendThinkingIndicator() {
    removeThinkingIndicator();
    const container = document.getElementById('agent-messages');
    if (!container) return;
    const msgDiv = document.createElement('div');
    msgDiv.id = 'agent-thinking';
    msgDiv.className = 'd-flex justify-content-start mb-3';
    msgDiv.innerHTML = `
        <div class="bg-light border rounded-3 px-3 py-2">
            <div class="d-flex align-items-center gap-2">
                <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
                <span class="text-muted small">Thinking...</span>
            </div>
        </div>
    `;
    container.appendChild(msgDiv);
    scrollChatToBottom();
}

function removeThinkingIndicator() {
    const thinking = document.getElementById('agent-thinking');
    if (thinking) thinking.remove();
}

// ============================================================================
// Confirmation Handling
// ============================================================================

function handleConfirmRequest(data) {
    var confirmId = data.confirmId;
    var toolName = data.toolName;
    var description = data.description;
    var args = data.args;
    var count = data.count || 1;
    var items = data.items || [];
    var totalGroups = data.totalGroups || 1;
    var groupIndex = data.groupIndex || 0;
    var allGroups = data.allGroups || [];
    var container = document.getElementById('agent-messages');
    if (!container) return;

    removeThinkingIndicator();

    var cardDiv = document.createElement('div');
    cardDiv.className = 'd-flex justify-content-start mb-3';
    cardDiv.id = 'confirm-' + confirmId;

    var toolDisplayName = toolName.replace('canvas_', '').replace(/_/g, ' ');

    // Build details list — batch (multiple items) vs single
    var detailsHtml = '';
    if (count > 1) {
        // Batch: show summary of each item, capped at 5
        var summaryItems = items.slice(0, 5).map(function (itemArgs) {
            var parts = Object.entries(itemArgs).map(function (entry) {
                var k = entry[0], v = entry[1];
                if (Array.isArray(v)) return '<strong>' + escapeAgentHtml(k) + ':</strong> ' + v.length + ' items';
                if (typeof v === 'object') return '<strong>' + escapeAgentHtml(k) + ':</strong> ' + escapeAgentHtml(JSON.stringify(v));
                var s = String(v);
                return '<strong>' + escapeAgentHtml(k) + ':</strong> ' + escapeAgentHtml(s.length > 60 ? s.substring(0, 60) + '...' : s);
            });
            return '<li>' + parts.join(' &middot; ') + '</li>';
        }).join('');
        if (count > 5) summaryItems += '<li class="text-muted">... and ' + (count - 5) + ' more</li>';
        detailsHtml = '<ul class="small mb-3">' + summaryItems + '</ul>';
    } else {
        // Single item
        var displayArgs = Object.assign({}, args || items[0] || {});
        delete displayArgs.domain;
        var argsList = Object.entries(displayArgs).map(function (entry) {
            var k = entry[0], v = entry[1];
            if (Array.isArray(v)) return '<li><strong>' + escapeAgentHtml(k) + ':</strong> ' + v.length + ' items</li>';
            if (typeof v === 'object') return '<li><strong>' + escapeAgentHtml(k) + ':</strong> ' + escapeAgentHtml(JSON.stringify(v)) + '</li>';
            return '<li><strong>' + escapeAgentHtml(k) + ':</strong> ' + escapeAgentHtml(String(v)) + '</li>';
        }).join('');
        detailsHtml = argsList ? '<ul class="small mb-3">' + argsList + '</ul>' : '';
    }

    var headerText = count > 1
        ? 'Batch Confirmation \u2014 ' + count + ' operations'
        : 'Confirmation Required';
    var approveLabel = count > 1
        ? '<i class="bi bi-check-circle"></i> Approve All (' + count + ')'
        : '<i class="bi bi-check-circle"></i> Approve';
    var denyLabel = count > 1
        ? '<i class="bi bi-x-circle"></i> Deny All'
        : '<i class="bi bi-x-circle"></i> Deny';

    // "Approve Everything" button — shown when there are multiple different tool groups
    var approveEverythingHtml = '';
    if (totalGroups > 1) {
        var totalOps = allGroups.reduce(function (sum, g) { return sum + g.count; }, 0);
        var groupNames = allGroups.map(function (g) {
            return g.name.replace('canvas_', '').replace(/_/g, ' ') + ' (' + g.count + ')';
        }).join(', ');
        approveEverythingHtml = '<button class="btn btn-primary btn-sm agent-confirm-approve-everything" data-confirm-id="' + confirmId + '" title="' + escapeAgentHtml(groupNames) + '">'
            + '<i class="bi bi-check2-all"></i> Approve Everything (' + totalOps + ')'
            + '</button>';
    }

    cardDiv.innerHTML = '<div class="border border-warning rounded-3 px-3 py-3 bg-warning bg-opacity-10 w-100" style="max-width: 85%;">'
        + '<div class="d-flex align-items-center gap-2 mb-2">'
        + '<i class="bi bi-shield-exclamation text-warning" style="font-size: 1.2rem;"></i>'
        + '<strong>' + headerText + '</strong>'
        + '</div>'
        + '<p class="mb-2"><strong>' + escapeAgentHtml(toolDisplayName) + '</strong>: ' + escapeAgentHtml(description) + '</p>'
        + detailsHtml
        + '<div class="d-flex gap-2 flex-wrap">'
        + approveEverythingHtml
        + '<button class="btn btn-success btn-sm agent-confirm-approve" data-confirm-id="' + confirmId + '">'
        + approveLabel + '</button>'
        + '<button class="btn btn-danger btn-sm agent-confirm-deny" data-confirm-id="' + confirmId + '">'
        + denyLabel + '</button>'
        + '</div></div>';

    container.appendChild(cardDiv);
    scrollChatToBottom();

    cardDiv.querySelector('.agent-confirm-approve').addEventListener('click', async function () {
        await respondToConfirmation(confirmId, true);
        disableConfirmationCard(confirmId, true);
    });

    cardDiv.querySelector('.agent-confirm-deny').addEventListener('click', async function () {
        await respondToConfirmation(confirmId, false);
        disableConfirmationCard(confirmId, false);
    });

    var approveEverythingBtn = cardDiv.querySelector('.agent-confirm-approve-everything');
    if (approveEverythingBtn) {
        approveEverythingBtn.addEventListener('click', async function () {
            await respondToConfirmation(confirmId, true, true);
            disableConfirmationCard(confirmId, true, 'everything');
        });
    }
}

async function respondToConfirmation(confirmId, approved, approveAll) {
    try {
        await window.ipcRenderer.invoke('agent:confirmTool', { confirmId: confirmId, approved: approved, approveAll: !!approveAll });
        if (approved) {
            appendThinkingIndicator();
        }
    } catch (error) {
        appendAgentError('Failed to send confirmation: ' + error.message);
    }
}

function disableConfirmationCard(confirmId, approved, mode) {
    var card = document.getElementById('confirm-' + confirmId);
    if (!card) return;

    var buttons = card.querySelectorAll('button');
    buttons.forEach(function (btn) { btn.disabled = true; });

    var statusText;
    if (mode === 'everything') {
        statusText = '<span class="text-success"><i class="bi bi-check2-all"></i> All operations approved</span>';
    } else if (approved) {
        statusText = '<span class="text-success"><i class="bi bi-check-circle"></i> Approved</span>';
    } else {
        statusText = '<span class="text-danger"><i class="bi bi-x-circle"></i> Denied</span>';
    }

    // Find the button container and replace with status
    var btnContainer = card.querySelector('.d-flex.gap-2');
    if (btnContainer) {
        btnContainer.innerHTML = statusText;
    }
}

// ============================================================================
// Domain Confirmation Handler
// ============================================================================

function handleDomainConfirmRequest(data) {
    var confirmId = data.confirmId;
    var domain = data.domain;
    var suggestions = data.suggestions || [];
    var container = document.getElementById('agent-messages');
    if (!container) return;

    removeThinkingIndicator();

    var cardDiv = document.createElement('div');
    cardDiv.className = 'd-flex justify-content-start mb-3';
    cardDiv.id = 'domain-confirm-' + confirmId;

    // Build reasons list
    var reasonsHtml = suggestions.map(function (s) {
        return '<li>' + escapeAgentHtml(s.reason) + '</li>';
    }).join('');

    // Build suggestion buttons
    var suggestionBtns = suggestions
        .filter(function (s) { return s.suggestion !== null; })
        .map(function (s) {
            return '<button class="btn btn-outline-primary btn-sm domain-suggestion-btn" data-domain="'
                + escapeAgentHtml(s.suggestion) + '">'
                + '<i class="bi bi-arrow-right-circle"></i> Use <strong>'
                + escapeAgentHtml(s.suggestion) + '</strong></button>';
        }).join('');

    cardDiv.innerHTML = '<div class="border border-info rounded-3 px-3 py-3 bg-info bg-opacity-10 w-100" style="max-width: 85%;">'
        + '<div class="d-flex align-items-center gap-2 mb-2">'
        + '<i class="bi bi-question-circle text-info" style="font-size: 1.2rem;"></i>'
        + '<strong>Domain Check</strong>'
        + '</div>'
        + '<p class="mb-2">The domain <strong>' + escapeAgentHtml(domain) + '</strong> looks unusual:</p>'
        + '<ul class="small mb-3">' + reasonsHtml + '</ul>'
        + (suggestionBtns ? '<p class="mb-2 small text-muted">Did you mean one of these?</p>' : '')
        + '<div class="d-flex gap-2 flex-wrap">'
        + suggestionBtns
        + '<button class="btn btn-success btn-sm domain-keep-btn">'
        + '<i class="bi bi-check-circle"></i> Keep <strong>' + escapeAgentHtml(domain) + '</strong></button>'
        + '<button class="btn btn-danger btn-sm domain-cancel-btn">'
        + '<i class="bi bi-x-circle"></i> Cancel</button>'
        + '</div></div>';

    container.appendChild(cardDiv);
    scrollChatToBottom();

    // Attach event handlers
    cardDiv.querySelectorAll('.domain-suggestion-btn').forEach(function (btn) {
        btn.addEventListener('click', async function () {
            var chosenDomain = btn.getAttribute('data-domain');
            await respondToDomainConfirmation(confirmId, chosenDomain);
            disableDomainConfirmCard(confirmId, 'Using ' + chosenDomain);
        });
    });

    cardDiv.querySelector('.domain-keep-btn').addEventListener('click', async function () {
        await respondToDomainConfirmation(confirmId, domain);
        disableDomainConfirmCard(confirmId, 'Keeping ' + domain);
    });

    cardDiv.querySelector('.domain-cancel-btn').addEventListener('click', async function () {
        await respondToDomainConfirmation(confirmId, null);
        disableDomainConfirmCard(confirmId, null);
    });
}

async function respondToDomainConfirmation(confirmId, domain) {
    try {
        await window.ipcRenderer.invoke('agent:confirmDomain', { confirmId: confirmId, domain: domain });
        if (domain !== null) {
            appendThinkingIndicator();
        }
    } catch (error) {
        appendAgentError('Failed to send domain confirmation: ' + error.message);
    }
}

function disableDomainConfirmCard(confirmId, message) {
    var card = document.getElementById('domain-confirm-' + confirmId);
    if (!card) return;

    var buttons = card.querySelectorAll('button');
    buttons.forEach(function (btn) { btn.disabled = true; });

    var statusText = message
        ? '<span class="text-success"><i class="bi bi-check-circle"></i> ' + escapeAgentHtml(message) + '</span>'
        : '<span class="text-danger"><i class="bi bi-x-circle"></i> Cancelled</span>';

    var btnContainer = card.querySelector('.d-flex.gap-2');
    if (btnContainer) {
        btnContainer.innerHTML = statusText;
    }
}

// ============================================================================
// Agent Update Handler
// ============================================================================

function handleAgentUpdate(update) {
    var type = update.type;
    var data = update.data;

    switch (type) {
        case 'thinking':
            var thinking = document.getElementById('agent-thinking');
            if (thinking && data.round > 1) {
                var label = thinking.querySelector('.text-muted');
                if (label) label.textContent = 'Thinking... (step ' + data.round + ')';
            }
            break;

        case 'tool_call':
            removeThinkingIndicator();
            appendToolCallCard(data.name, data.args, data.destructive, data.batchApproved);
            break;

        case 'tool_executing':
            updateToolCardStatus(data.name, 'Executing...', 'info');
            break;

        case 'tool_result':
            updateToolCardStatus(data.name, 'Completed', 'success');
            appendThinkingIndicator();
            break;

        case 'tool_error':
            updateToolCardStatus(data.name, 'Error: ' + data.error, 'error');
            appendThinkingIndicator();
            break;

        case 'tool_approved':
            updateToolCardStatus(data.name, 'Approved - executing...', 'info');
            break;

        case 'tool_denied':
            updateToolCardStatus(data.name, 'Denied by user', 'denied');
            appendThinkingIndicator();
            break;
    }
}

// ============================================================================
// Utility Functions
// ============================================================================

function escapeAgentHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatAgentContent(content) {
    if (!content) return '';

    var formatted = escapeAgentHtml(content);

    // Bold: **text**
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Inline code: `text`
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Numbered list items
    formatted = formatted.replace(/^(\d+)\.\s/gm, '<strong>$1.</strong> ');

    return formatted;
}
