const { ipcMain, safeStorage } = require('electron');
const Store = require('electron-store');
const store = new Store();

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
        // Fallback or legacy handling if encryption isn't available
        console.warn('safeStorage is not available. Using stored value as is (insecure) or failing.');
        // If we previously stored plain text, this might return it, but mixing is bad.
        // For this implementation, we assume if safeStorage is unavailable, we can't retrieve securely.
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
}

module.exports = { registerSettingsHandlers, getDecryptedKey };
