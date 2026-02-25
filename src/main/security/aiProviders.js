/**
 * AI Provider Configuration
 *
 * Defines supported AI providers and their configuration.
 * Users supply their own API keys via the AI Settings UI;
 * keys are stored encrypted using Electron safeStorage.
 */

const PROVIDERS = {
    openrouter: {
        id: 'openrouter',
        name: 'OpenRouter',
        description: 'Access many models via a single API (auto-routing available)',
        baseURL: 'https://openrouter.ai/api/v1',
        defaultModel: 'openrouter/auto',
        models: [
            { id: 'openrouter/auto', name: 'Auto (best available)' },
            { id: 'openai/gpt-5.2', name: 'GPT-5.2' },
            { id: 'anthropic/claude-opus-4-6', name: 'Claude Opus 4.6' },
            { id: 'anthropic/claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
            { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
        ],
        keyPrefix: 'sk-or-',
        keyPlaceholder: 'sk-or-v1-xxxx…',
        helpUrl: 'https://openrouter.ai/keys',
        extraHeaders: { 'X-Title': 'CanvaScripter' },
        supportsAutoRoute: true,
    },
    anthropic: {
        id: 'anthropic',
        name: 'Anthropic',
        description: 'Claude models directly from Anthropic',
        baseURL: 'https://api.anthropic.com/v1',
        defaultModel: 'claude-sonnet-4-6',
        models: [
            { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
            { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
            { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5' },
        ],
        keyPrefix: 'sk-ant-',
        keyPlaceholder: 'sk-ant-api03-xxxx…',
        helpUrl: 'https://console.anthropic.com/settings/keys',
        useNativeSDK: 'anthropic',
    },
    openai: {
        id: 'openai',
        name: 'OpenAI',
        description: 'GPT models directly from OpenAI',
        baseURL: 'https://api.openai.com/v1',
        defaultModel: 'gpt-5.2',
        models: [
            { id: 'gpt-5.2', name: 'GPT-5.2' },
            { id: 'gpt-5-mini', name: 'GPT-5 Mini' },
            { id: 'gpt-5-nano', name: 'GPT-5 Nano' },
        ],
        keyPrefix: 'sk-',
        keyPlaceholder: 'sk-xxxx…',
        helpUrl: 'https://platform.openai.com/api-keys',
    },
    gemini: {
        id: 'gemini',
        name: 'Google Gemini',
        description: 'Gemini models via Google AI Studio',
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        defaultModel: 'gemini-2.5-flash',
        models: [
            { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
            { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
            { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite' },
        ],
        keyPrefix: 'AI',
        keyPlaceholder: 'AIzaSy…',
        helpUrl: 'https://aistudio.google.com/apikey',
    },
};

/**
 * Provider display order
 */
const PROVIDER_ORDER = ['openrouter', 'anthropic', 'openai', 'gemini'];

/**
 * Get the active AI provider ID from electron-store
 * @param {import('electron-store')} store
 * @returns {string|null}
 */
function getActiveProvider(store) {
    return store.get('ai.activeProvider', null);
}

/**
 * Set the active AI provider ID
 * @param {import('electron-store')} store
 * @param {string} providerId
 */
function setActiveProvider(store, providerId) {
    if (!PROVIDERS[providerId]) throw new Error(`Unknown provider: ${providerId}`);
    store.set('ai.activeProvider', providerId);
}

/**
 * Get the selected model for a provider (falls back to the provider default)
 * @param {import('electron-store')} store
 * @param {string} providerId
 * @returns {string}
 */
function getSelectedModel(store, providerId) {
    const provider = PROVIDERS[providerId];
    if (!provider) return null;
    return store.get(`ai.models.${providerId}`, provider.defaultModel);
}

/**
 * Set the selected model for a provider
 * @param {import('electron-store')} store
 * @param {string} providerId
 * @param {string} modelId
 */
function setSelectedModel(store, providerId, modelId) {
    store.set(`ai.models.${providerId}`, modelId);
}

/**
 * Build an OpenAI-compatible client configuration for the active provider.
 * Returns { apiKey, config, model } or throws if not configured.
 *
 * @param {Function} getDecryptedKey - function(provider) => plaintext key
 * @param {import('electron-store')} store
 * @param {string} [overrideProvider] - force a specific provider
 * @returns {{ apiKey: string, config: object, model: string, provider: object }}
 */
function getAIClientConfig(getDecryptedKey, store, overrideProvider) {
    const providerId = overrideProvider || getActiveProvider(store);
    if (!providerId) {
        throw new Error('No AI provider configured. Please add an API key in AI Settings.');
    }

    const provider = PROVIDERS[providerId];
    if (!provider) {
        throw new Error(`Unknown AI provider: ${providerId}`);
    }

    const apiKey = getDecryptedKey(providerId);
    if (!apiKey) {
        throw new Error(`No API key found for ${provider.name}. Please add one in AI Settings.`);
    }

    const model = getSelectedModel(store, providerId);

    const config = {
        apiKey,
        baseURL: provider.baseURL,
    };

    if (provider.extraHeaders) {
        config.defaultHeaders = provider.extraHeaders;
    }

    const requestExtra = {};
    if (provider.supportsAutoRoute && model === 'openrouter/auto') {
        requestExtra.plugins = [{
            id: 'auto-router',
        }];
    }

    return { apiKey, config, model, provider, requestExtra };
}

module.exports = {
    PROVIDERS,
    PROVIDER_ORDER,
    getActiveProvider,
    setActiveProvider,
    getSelectedModel,
    setSelectedModel,
    getAIClientConfig,
};
