const { ipcMain, safeStorage } = require('electron');
const Store = require('electron-store');
const store = new Store();
const {
    PROVIDERS,
    PROVIDER_ORDER,
    getActiveProvider,
    setActiveProvider,
    getSelectedModel,
    setSelectedModel,
} = require('../security/aiProviders');

function getDecryptedKey(provider) {
    const encryptedHex = store.get(`apiKeys.${provider}`);
    if (!encryptedHex) return null;

    if (safeStorage.isEncryptionAvailable()) {
        try {
            const buffer = Buffer.from(encryptedHex, 'hex');
            return safeStorage.decryptString(buffer);
        } catch (error) {
            console.error(`Failed to decrypt key for ${provider}:`, error);
            return null;
        }
    } else {
        console.warn('safeStorage is not available. Using stored value as is (insecure) or failing.');
        return null;
    }
}

function registerSettingsHandlers() {
    // Get API Key (Decrypted) - CAREFUL: Sends plain text to renderer
    ipcMain.handle('settings:getApiKey', async (event, provider) => {
        return getDecryptedKey(provider);
    });

    // Save API Key (Encrypted)
    ipcMain.handle('settings:saveApiKey', async (event, provider, key) => {
        if (safeStorage.isEncryptionAvailable()) {
            const encryptedBuffer = safeStorage.encryptString(key);
            store.set(`apiKeys.${provider}`, encryptedBuffer.toString('hex'));
            return { success: true };
        } else {
            return { success: false, error: 'Encryption not available on this system' };
        }
    });

    // Check if key exists
    ipcMain.handle('settings:hasApiKey', async (event, provider) => {
        const val = store.get(`apiKeys.${provider}`);
        return !!val;
    });

    // Delete API Key
    ipcMain.handle('settings:deleteApiKey', async (event, provider) => {
        store.delete(`apiKeys.${provider}`);
        return { success: true };
    });

    // Get Masked API Key (visible last 4 chars)
    ipcMain.handle('settings:getMaskedApiKey', async (event, provider) => {
        const fullKey = getDecryptedKey(provider);
        if (!fullKey) return null;
        if (fullKey.length <= 4) return '****';
        return '****' + fullKey.slice(-4);
    });

    // ─── AI Provider Settings ───────────────────────────────────

    // Get all provider definitions (safe — no secrets)
    ipcMain.handle('ai:getProviders', async () => {
        return PROVIDER_ORDER.map(id => {
            const p = PROVIDERS[id];
            return {
                id: p.id,
                name: p.name,
                description: p.description,
                models: p.models,
                keyPlaceholder: p.keyPlaceholder,
                helpUrl: p.helpUrl,
            };
        });
    });

    // Get the current active provider ID
    ipcMain.handle('ai:getActiveProvider', async () => {
        return getActiveProvider(store);
    });

    // Set the active provider
    ipcMain.handle('ai:setActiveProvider', async (event, providerId) => {
        setActiveProvider(store, providerId);
        return { success: true };
    });

    // Get the selected model for a provider
    ipcMain.handle('ai:getSelectedModel', async (event, providerId) => {
        return getSelectedModel(store, providerId);
    });

    // Set the selected model for a provider
    ipcMain.handle('ai:setSelectedModel', async (event, providerId, modelId) => {
        setSelectedModel(store, providerId, modelId);
        return { success: true };
    });

    // Get full AI status for the settings UI
    ipcMain.handle('ai:getStatus', async () => {
        const activeId = getActiveProvider(store);
        const status = {};
        for (const id of PROVIDER_ORDER) {
            const hasKey = !!store.get(`apiKeys.${id}`);
            const masked = hasKey ? (() => {
                const k = getDecryptedKey(id);
                if (!k) return null;
                return k.length <= 4 ? '****' : '****' + k.slice(-4);
            })() : null;
            status[id] = {
                hasKey,
                maskedKey: masked,
                isActive: id === activeId,
                selectedModel: getSelectedModel(store, id),
            };
        }
        return { activeProvider: activeId, providers: status };
    });
}

module.exports = { registerSettingsHandlers, getDecryptedKey, store };
