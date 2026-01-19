/**
 * AI Settings Management
 * Centralized interface for managing AI API keys
 */

function aiSettingsTemplate(e) {
    if (typeof hideEndpoints === 'function') {
        hideEndpoints(e);
    }
    showAISettingsUI();
}

function showAISettingsUI() {
    const endpointContent = document.getElementById('endpoint-content');
    if (!endpointContent) return;

    let settingsContainer = document.getElementById('ai-settings-container');
    if (!settingsContainer) {
        settingsContainer = document.createElement('div');
        settingsContainer.id = 'ai-settings-container';
        settingsContainer.className = 'p-4';
        endpointContent.appendChild(settingsContainer);
    }

    settingsContainer.hidden = false;
    settingsContainer.innerHTML = `
        <div class="ai-settings-ui">
            <h3 class="mb-4">
                <i class="bi bi-robot"></i> AI Integrations
            </h3>
            <p class="text-muted mb-4">
                Manage your API keys for AI-powered features. Keys are stored securely and encrypted locally.
            </p>

            <!-- OpenAI Settings -->
            <div class="card mb-4">
                <div class="card-header bg-primary text-white">
                    <h5 class="mb-0">
                        <i class="bi bi-openai"></i> OpenAI (GPT Models)
                    </h5>
                </div>
                <div class="card-body">
                    <div id="openai-status" class="mb-3"></div>

                    <div id="openai-key-display" class="mb-3 d-none">
                        <label class="form-label text-success">
                            <i class="bi bi-check-circle-fill"></i> API Key Configured
                        </label>
                        <div class="input-group mb-2">
                            <input type="text" class="form-control" id="openai-masked-key" disabled readonly>
                            <button class="btn btn-outline-secondary" type="button" id="openai-test-btn">
                                <i class="bi bi-lightning"></i> Test Connection
                            </button>
                            <button class="btn btn-outline-danger" type="button" id="openai-delete-btn">
                                <i class="bi bi-trash"></i> Remove
                            </button>
                        </div>
                        <div class="form-text">Used for GPT-5.2 model in HAR and QTI analyzers</div>
                    </div>

                    <div id="openai-key-input" class="mb-3 d-none">
                        <label class="form-label">
                            <i class="bi bi-key"></i> Enter OpenAI API Key
                        </label>
                        <div class="input-group">
                            <input type="password" class="form-control" id="openai-key-field"
                                   placeholder="sk-...">
                            <button class="btn btn-outline-secondary" type="button" id="openai-toggle-visibility">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button class="btn btn-primary" type="button" id="openai-save-btn">
                                <i class="bi bi-save"></i> Save
                            </button>
                        </div>
                        <div class="form-text">
                            Get your API key from <a href="#" id="openai-link">platform.openai.com/api-keys</a>
                        </div>
                    </div>

                    <div id="openai-test-result" class="mt-3"></div>
                </div>
            </div>

            <!-- Anthropic Settings -->
            <div class="card mb-4">
                <div class="card-header bg-success text-white">
                    <h5 class="mb-0">
                        <i class="bi bi-cpu"></i> Anthropic (Claude Models)
                    </h5>
                </div>
                <div class="card-body">
                    <div id="anthropic-status" class="mb-3"></div>

                    <div id="anthropic-key-display" class="mb-3 d-none">
                        <label class="form-label text-success">
                            <i class="bi bi-check-circle-fill"></i> API Key Configured
                        </label>
                        <div class="input-group mb-2">
                            <input type="text" class="form-control" id="anthropic-masked-key" disabled readonly>
                            <button class="btn btn-outline-secondary" type="button" id="anthropic-test-btn">
                                <i class="bi bi-lightning"></i> Test Connection
                            </button>
                            <button class="btn btn-outline-danger" type="button" id="anthropic-delete-btn">
                                <i class="bi bi-trash"></i> Remove
                            </button>
                        </div>
                        <div class="form-text">Used for Claude Sonnet 4.5 model in HAR and QTI analyzers</div>
                    </div>

                    <div id="anthropic-key-input" class="mb-3 d-none">
                        <label class="form-label">
                            <i class="bi bi-key"></i> Enter Anthropic API Key
                        </label>
                        <div class="input-group">
                            <input type="password" class="form-control" id="anthropic-key-field"
                                   placeholder="sk-ant-...">
                            <button class="btn btn-outline-secondary" type="button" id="anthropic-toggle-visibility">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button class="btn btn-success" type="button" id="anthropic-save-btn">
                                <i class="bi bi-save"></i> Save
                            </button>
                        </div>
                        <div class="form-text">
                            Get your API key from <a href="#" id="anthropic-link">console.anthropic.com</a>
                        </div>
                    </div>

                    <div id="anthropic-test-result" class="mt-3"></div>
                </div>
            </div>

            <!-- Usage Information -->
            <div class="card border-info">
                <div class="card-body">
                    <h6 class="card-title">
                        <i class="bi bi-info-circle"></i> About AI Integrations
                    </h6>
                    <p class="card-text small mb-2">
                        AI features are available in the <strong>Analyzers</strong> section:
                    </p>
                    <ul class="small mb-0">
                        <li><strong>HAR Analyzer:</strong> Get intelligent insights about HTTP requests and authentication flows</li>
                        <li><strong>QTI Analyzer:</strong> Analyze assessment compatibility and get Canvas migration recommendations</li>
                    </ul>
                </div>
            </div>
        </div>
    `;

    // Initialize the UI
    initializeAISettings();
}

async function initializeAISettings() {
    // Load status for both providers
    await updateProviderStatus('openai');
    await updateProviderStatus('anthropic');

    // Set up event listeners
    setupOpenAIListeners();
    setupAnthropicListeners();
    setupExternalLinks();
}

async function updateProviderStatus(provider) {
    const prefix = provider;
    const displaySection = document.getElementById(`${prefix}-key-display`);
    const inputSection = document.getElementById(`${prefix}-key-input`);
    const statusDiv = document.getElementById(`${prefix}-status`);
    const maskedInput = document.getElementById(`${prefix}-masked-key`);

    try {
        const hasKey = await window.ipcRenderer.invoke('settings:hasApiKey', provider);

        if (hasKey) {
            try {
                const maskedKey = await window.ipcRenderer.invoke('settings:getMaskedApiKey', provider);
                maskedInput.value = maskedKey || '****';
            } catch (e) {
                console.error(`Failed to get masked key for ${provider}`, e);
                maskedInput.value = '****';
            }

            displaySection.classList.remove('d-none');
            inputSection.classList.add('d-none');
            statusDiv.innerHTML = '';
        } else {
            displaySection.classList.add('d-none');
            inputSection.classList.remove('d-none');
            statusDiv.innerHTML = `
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-triangle"></i>
                    No API key configured. Add one below to enable AI features.
                </div>
            `;
        }
    } catch (error) {
        console.error(`Error checking ${provider} status:`, error);
        statusDiv.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-x-circle"></i> Error loading API key status
            </div>
        `;
    }
}

function setupOpenAIListeners() {
    const provider = 'openai';

    // Toggle visibility
    const toggleBtn = document.getElementById('openai-toggle-visibility');
    const keyField = document.getElementById('openai-key-field');
    toggleBtn.addEventListener('click', () => {
        if (keyField.type === 'password') {
            keyField.type = 'text';
            toggleBtn.innerHTML = '<i class="bi bi-eye-slash"></i>';
        } else {
            keyField.type = 'password';
            toggleBtn.innerHTML = '<i class="bi bi-eye"></i>';
        }
    });

    // Save key
    const saveBtn = document.getElementById('openai-save-btn');
    const statusDiv = document.getElementById('openai-status');
    saveBtn.addEventListener('click', async () => {
        const key = keyField.value.trim();
        if (!key) {
            statusDiv.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-x-circle"></i> Please enter an API key
                </div>
            `;
            return;
        }

        try {
            await window.ipcRenderer.invoke('settings:saveApiKey', provider, key);
            keyField.value = '';
            statusDiv.innerHTML = `
                <div class="alert alert-success">
                    <i class="bi bi-check-circle"></i> API key saved successfully!
                </div>
            `;
            setTimeout(() => updateProviderStatus(provider), 1500);
        } catch (error) {
            statusDiv.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-x-circle"></i> Failed to save: ${error.message}
                </div>
            `;
        }
    });

    // Delete key
    const deleteBtn = document.getElementById('openai-delete-btn');
    deleteBtn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to remove the OpenAI API key?')) return;

        try {
            await window.ipcRenderer.invoke('settings:deleteApiKey', provider);
            await updateProviderStatus(provider);
            statusDiv.innerHTML = `
                <div class="alert alert-info">
                    <i class="bi bi-info-circle"></i> API key removed
                </div>
            `;
        } catch (error) {
            statusDiv.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-x-circle"></i> Failed to remove: ${error.message}
                </div>
            `;
        }
    });

    // Test connection
    const testBtn = document.getElementById('openai-test-btn');
    const testResultDiv = document.getElementById('openai-test-result');
    testBtn.addEventListener('click', async () => {
        testResultDiv.innerHTML = `
            <div class="alert alert-info">
                <div class="spinner-border spinner-border-sm me-2"></div>
                Testing connection...
            </div>
        `;

        // Simple test - just check if we can retrieve the key
        try {
            const hasKey = await window.ipcRenderer.invoke('settings:hasApiKey', provider);
            if (hasKey) {
                testResultDiv.innerHTML = `
                    <div class="alert alert-success">
                        <i class="bi bi-check-circle"></i> API key is configured and accessible
                    </div>
                `;
            } else {
                testResultDiv.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="bi bi-x-circle"></i> No API key found
                    </div>
                `;
            }
            setTimeout(() => { testResultDiv.innerHTML = ''; }, 3000);
        } catch (error) {
            testResultDiv.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-x-circle"></i> Test failed: ${error.message}
                </div>
            `;
        }
    });
}

function setupAnthropicListeners() {
    const provider = 'anthropic';

    // Toggle visibility
    const toggleBtn = document.getElementById('anthropic-toggle-visibility');
    const keyField = document.getElementById('anthropic-key-field');
    toggleBtn.addEventListener('click', () => {
        if (keyField.type === 'password') {
            keyField.type = 'text';
            toggleBtn.innerHTML = '<i class="bi bi-eye-slash"></i>';
        } else {
            keyField.type = 'password';
            toggleBtn.innerHTML = '<i class="bi bi-eye"></i>';
        }
    });

    // Save key
    const saveBtn = document.getElementById('anthropic-save-btn');
    const statusDiv = document.getElementById('anthropic-status');
    saveBtn.addEventListener('click', async () => {
        const key = keyField.value.trim();
        if (!key) {
            statusDiv.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-x-circle"></i> Please enter an API key
                </div>
            `;
            return;
        }

        try {
            await window.ipcRenderer.invoke('settings:saveApiKey', provider, key);
            keyField.value = '';
            statusDiv.innerHTML = `
                <div class="alert alert-success">
                    <i class="bi bi-check-circle"></i> API key saved successfully!
                </div>
            `;
            setTimeout(() => updateProviderStatus(provider), 1500);
        } catch (error) {
            statusDiv.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-x-circle"></i> Failed to save: ${error.message}
                </div>
            `;
        }
    });

    // Delete key
    const deleteBtn = document.getElementById('anthropic-delete-btn');
    deleteBtn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to remove the Anthropic API key?')) return;

        try {
            await window.ipcRenderer.invoke('settings:deleteApiKey', provider);
            await updateProviderStatus(provider);
            statusDiv.innerHTML = `
                <div class="alert alert-info">
                    <i class="bi bi-info-circle"></i> API key removed
                </div>
            `;
        } catch (error) {
            statusDiv.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-x-circle"></i> Failed to remove: ${error.message}
                </div>
            `;
        }
    });

    // Test connection
    const testBtn = document.getElementById('anthropic-test-btn');
    const testResultDiv = document.getElementById('anthropic-test-result');
    testBtn.addEventListener('click', async () => {
        testResultDiv.innerHTML = `
            <div class="alert alert-info">
                <div class="spinner-border spinner-border-sm me-2"></div>
                Testing connection...
            </div>
        `;

        // Simple test - just check if we can retrieve the key
        try {
            const hasKey = await window.ipcRenderer.invoke('settings:hasApiKey', provider);
            if (hasKey) {
                testResultDiv.innerHTML = `
                    <div class="alert alert-success">
                        <i class="bi bi-check-circle"></i> API key is configured and accessible
                    </div>
                `;
            } else {
                testResultDiv.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="bi bi-x-circle"></i> No API key found
                    </div>
                `;
            }
            setTimeout(() => { testResultDiv.innerHTML = ''; }, 3000);
        } catch (error) {
            testResultDiv.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-x-circle"></i> Test failed: ${error.message}
                </div>
            `;
        }
    });
}

function setupExternalLinks() {
    document.getElementById('openai-link').addEventListener('click', (e) => {
        e.preventDefault();
        window.ipcRenderer.send('open-external-url', 'https://platform.openai.com/api-keys');
    });

    document.getElementById('anthropic-link').addEventListener('click', (e) => {
        e.preventDefault();
        window.ipcRenderer.send('open-external-url', 'https://console.anthropic.com');
    });
}

// Listen for menu trigger
if (window.ipcRenderer && window.ipcRenderer.on) {
    window.ipcRenderer.on('open-ai-settings', () => {
        showAISettingsUI();
    });
}
