/**
 * AI Settings Management
 * Allows users to configure their own API keys for multiple providers:
 * OpenRouter, Anthropic, OpenAI, and Google Gemini.
 */

function aiSettingsTemplate(e) {
    if (typeof hideEndpoints === 'function') {
        hideEndpoints(e);
    }
    showAISettingsUI();
}

async function showAISettingsUI() {
    const endpointContent = document.getElementById('endpoint-content');
    if (!endpointContent) return;

    let settingsContainer = document.getElementById('ai-settings-container');
    if (!settingsContainer) {
        settingsContainer = document.createElement('div');
        settingsContainer.id = 'ai-settings-container';
        settingsContainer.className = 'px-3 py-2';
        endpointContent.appendChild(settingsContainer);
    }

    settingsContainer.hidden = false;

    // Show loading while fetching provider data
    settingsContainer.innerHTML = `
        <div class="ai-settings-ui">
            <h3 class="mb-4"><i class="bi bi-robot"></i> AI Integrations</h3>
            <div class="text-center p-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2 text-muted">Loading AI settings...</p>
            </div>
        </div>`;

    try {
        const [providers, status] = await Promise.all([
            window.ipcRenderer.invoke('ai:getProviders'),
            window.ipcRenderer.invoke('ai:getStatus'),
        ]);

        renderAISettings(settingsContainer, providers, status);
    } catch (err) {
        settingsContainer.innerHTML = `
        <div class="ai-settings-ui">
            <h3 class="mb-4"><i class="bi bi-robot"></i> AI Integrations</h3>
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle"></i> Failed to load AI settings: ${err.message}
            </div>
        </div>`;
    }
}

function renderAISettings(container, providers, status) {
    const activeId = status.activeProvider;

    const providerCards = providers.map(p => {
        const s = status.providers[p.id] || {};
        const isActive = s.isActive;
        const hasKey = s.hasKey;
        const maskedKey = s.maskedKey;
        const selectedModel = s.selectedModel || p.models[0]?.id;

        const modelOptions = p.models.map(m =>
            `<option value="${m.id}" ${m.id === selectedModel ? 'selected' : ''}>${m.name}</option>`
        ).join('');

        const statusBadge = hasKey
            ? `<span class="badge ${isActive ? 'bg-success' : 'bg-secondary'}">
                ${isActive ? '<i class="bi bi-check-circle-fill"></i> Active' : 'Key saved'}
               </span>`
            : `<span class="badge bg-outline-secondary text-muted border">No key</span>`;

        const keyDisplay = hasKey
            ? `<div class="input-group mb-2">
                    <span class="input-group-text"><i class="bi bi-key"></i></span>
                    <input type="text" class="form-control" value="${maskedKey}" readonly>
                    <button class="btn btn-outline-danger btn-sm ai-delete-key" data-provider="${p.id}" title="Remove key">
                        <i class="bi bi-trash"></i>
                    </button>
               </div>`
            : `<div class="input-group mb-2">
                    <span class="input-group-text"><i class="bi bi-key"></i></span>
                    <input type="password" class="form-control ai-key-input" id="ai-key-${p.id}"
                        placeholder="${p.keyPlaceholder}" autocomplete="off">
                    <button class="btn btn-outline-primary btn-sm ai-save-key" data-provider="${p.id}">
                        <i class="bi bi-save"></i> Save
                    </button>
               </div>`;

        const helpLink = p.helpUrl
            ? `<a href="#" class="small text-decoration-none external-link" data-external-url="${p.helpUrl}">
                <i class="bi bi-box-arrow-up-right"></i> Get an API key
               </a>`
            : '';

        return `
        <div class="card mb-3 ${isActive ? 'border-success' : ''}">
            <div class="card-header d-flex justify-content-between align-items-center ${isActive ? 'bg-success bg-opacity-10' : ''}">
                <div>
                    <h6 class="mb-0">
                        ${p.name}
                        ${statusBadge}
                    </h6>
                    <small class="text-muted">${p.description}</small>
                </div>
                <div>
                    ${hasKey
                ? `<button class="btn btn-sm ${isActive ? 'btn-success' : 'btn-outline-success'} ai-set-active" 
                            data-provider="${p.id}" ${isActive ? 'disabled' : ''}>
                            ${isActive ? '<i class="bi bi-check-lg"></i> Active' : 'Set Active'}
                       </button>`
                : ''}
                </div>
            </div>
            <div class="card-body">
                ${keyDisplay}
                ${helpLink}

                ${hasKey ? `
                <div class="mt-3">
                    <label class="form-label small mb-1">Model</label>
                    <select class="form-select form-select-sm ai-model-select" data-provider="${p.id}">
                        ${modelOptions}
                    </select>
                </div>` : ''}
            </div>
        </div>`;
    }).join('');

    const noProviderWarning = !activeId
        ? `<div class="alert alert-warning mb-3">
                <i class="bi bi-exclamation-triangle"></i>
                <strong>No active provider.</strong> Add an API key for at least one provider and set it as active to use AI features.
           </div>`
        : '';

    container.innerHTML = `
        <div class="ai-settings-ui">
            <h3 class="mb-4"><i class="bi bi-robot"></i> AI Integrations</h3>

            ${noProviderWarning}

            <p class="text-muted mb-3">
                Enter your own API key for one or more providers below. Keys are encrypted and stored locally on your machine.
            </p>

            ${providerCards}

            <!-- Usage Information -->
            <div class="card border-info mt-4">
                <div class="card-body">
                    <h6 class="card-title"><i class="bi bi-info-circle"></i> Where AI is Used</h6>
                    <ul class="small mb-0">
                        <li><strong>HAR Analyzer:</strong> Generate guided troubleshooting notes for HTTP and authentication issues</li>
                        <li><strong>QTI Analyzer:</strong> Review assessments for Canvas compatibility and improvement ideas</li>
                        <li><strong>AI Assistant:</strong> Drive natural-language automations, including announcement title generation</li>
                    </ul>
                </div>
            </div>
        </div>
    `;

    // Attach event listeners
    setupAISettingsListeners(container);
}

function setupAISettingsListeners(container) {
    // Handle external links
    container.querySelectorAll('.external-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const url = link.getAttribute('data-external-url');
            if (url && window.shell) {
                window.shell.openExternal(url);
            }
        });
    });

    // Save key
    container.querySelectorAll('.ai-save-key').forEach(btn => {
        btn.addEventListener('click', async () => {
            const providerId = btn.dataset.provider;
            const input = document.getElementById(`ai-key-${providerId}`);
            const key = input?.value?.trim();
            if (!key) {
                showAIToast('Please enter an API key.', 'warning');
                return;
            }

            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

            try {
                const result = await window.ipcRenderer.invoke('settings:saveApiKey', providerId, key);
                if (!result.success) throw new Error(result.error || 'Failed to save key');

                // Auto-set as active if no active provider yet
                const currentStatus = await window.ipcRenderer.invoke('ai:getStatus');
                if (!currentStatus.activeProvider) {
                    await window.ipcRenderer.invoke('ai:setActiveProvider', providerId);
                }

                showAIToast(`${providerId} key saved successfully!`, 'success');
                // Refresh the UI
                showAISettingsUI();
            } catch (err) {
                showAIToast(`Error: ${err.message}`, 'danger');
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-save"></i> Save';
            }
        });
    });

    // Delete key
    container.querySelectorAll('.ai-delete-key').forEach(btn => {
        btn.addEventListener('click', async () => {
            const providerId = btn.dataset.provider;
            if (!confirm(`Remove the API key for ${providerId}?`)) return;

            try {
                await window.ipcRenderer.invoke('settings:deleteApiKey', providerId);

                // If this was the active provider, clear it
                const currentStatus = await window.ipcRenderer.invoke('ai:getStatus');
                if (currentStatus.activeProvider === providerId) {
                    // Try to activate another provider that has a key
                    const nextProvider = Object.entries(currentStatus.providers)
                        .find(([id, s]) => id !== providerId && s.hasKey);
                    if (nextProvider) {
                        await window.ipcRenderer.invoke('ai:setActiveProvider', nextProvider[0]);
                    }
                }

                showAIToast(`Key removed.`, 'info');
                showAISettingsUI();
            } catch (err) {
                showAIToast(`Error: ${err.message}`, 'danger');
            }
        });
    });

    // Set active provider
    container.querySelectorAll('.ai-set-active').forEach(btn => {
        btn.addEventListener('click', async () => {
            const providerId = btn.dataset.provider;
            try {
                await window.ipcRenderer.invoke('ai:setActiveProvider', providerId);
                showAIToast(`${providerId} is now the active AI provider.`, 'success');
                showAISettingsUI();
            } catch (err) {
                showAIToast(`Error: ${err.message}`, 'danger');
            }
        });
    });

    // Model selection
    container.querySelectorAll('.ai-model-select').forEach(select => {
        select.addEventListener('change', async () => {
            const providerId = select.dataset.provider;
            const modelId = select.value;
            try {
                await window.ipcRenderer.invoke('ai:setSelectedModel', providerId, modelId);
            } catch (err) {
                showAIToast(`Error: ${err.message}`, 'danger');
            }
        });
    });
}

function showAIToast(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 420px;';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    document.body.appendChild(notification);
    setTimeout(() => { if (notification.parentNode) notification.remove(); }, 3500);
}

// Listen for menu trigger
if (window.ipcRenderer && window.ipcRenderer.on) {
    window.ipcRenderer.on('open-ai-settings', () => {
        showAISettingsUI();
    });
}

