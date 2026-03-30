const { ipcMain, safeStorage } = require('electron');
const Store = require('electron-store');
const crypto = require('crypto');
const store = new Store();

const TOKENS_KEY = 'canvasTokens';       // { [id]: { id, name, encrypted } }
const DEFAULT_TOKEN_KEY = 'canvasDefaultToken'; // id string

function encryptToken(token) {
    if (safeStorage.isEncryptionAvailable()) {
        return safeStorage.encryptString(token).toString('hex');
    }
    return null;
}

function decryptToken(encryptedHex) {
    if (!encryptedHex) return null;
    if (safeStorage.isEncryptionAvailable()) {
        try {
            return safeStorage.decryptString(Buffer.from(encryptedHex, 'hex'));
        } catch (err) {
            console.error('Failed to decrypt Canvas token:', err);
            return null;
        }
    }
    return null;
}

function getAllTokensMeta() {
    const tokens = store.get(TOKENS_KEY, {});
    // Return metadata only (no secrets)
    return Object.values(tokens).map(t => {
        const decrypted = decryptToken(t.encrypted);
        let preview = '';
        if (decrypted && decrypted.length > 10) {
            preview = decrypted.slice(0, 5) + '...' + decrypted.slice(-5);
        } else if (decrypted) {
            preview = '***';
        }
        return { id: t.id, name: t.name, preview };
    });
}

function registerTokenHandlers() {
    // Get all saved tokens (metadata only — no secrets)
    ipcMain.handle('tokens:getAll', async () => {
        return getAllTokensMeta();
    });

    // Save a new token
    ipcMain.handle('tokens:save', async (_event, name, tokenValue) => {
        if (!name || !tokenValue) {
            return { success: false, error: 'Name and token are required' };
        }
        if (!safeStorage.isEncryptionAvailable()) {
            return { success: false, error: 'Encryption not available on this system' };
        }
        const id = crypto.randomUUID();
        const encrypted = encryptToken(tokenValue);
        const tokens = store.get(TOKENS_KEY, {});
        tokens[id] = { id, name, encrypted };
        store.set(TOKENS_KEY, tokens);

        // If this is the first token, set as default
        const defaultId = store.get(DEFAULT_TOKEN_KEY);
        if (!defaultId) {
            store.set(DEFAULT_TOKEN_KEY, id);
        }

        return { success: true, id };
    });

    // Delete a token
    ipcMain.handle('tokens:delete', async (_event, id) => {
        const tokens = store.get(TOKENS_KEY, {});
        if (!tokens[id]) {
            return { success: false, error: 'Token not found' };
        }
        delete tokens[id];
        store.set(TOKENS_KEY, tokens);

        // If deleted token was default, clear or reassign
        const defaultId = store.get(DEFAULT_TOKEN_KEY);
        if (defaultId === id) {
            const remaining = Object.keys(tokens);
            store.set(DEFAULT_TOKEN_KEY, remaining.length > 0 ? remaining[0] : '');
        }

        return { success: true };
    });

    // Set the default token
    ipcMain.handle('tokens:setDefault', async (_event, id) => {
        store.set(DEFAULT_TOKEN_KEY, id);
        return { success: true };
    });

    // Get the default token id
    ipcMain.handle('tokens:getDefault', async () => {
        return store.get(DEFAULT_TOKEN_KEY, '');
    });

    // Get decrypted token value by id (used for API calls)
    ipcMain.handle('tokens:getDecrypted', async (_event, id) => {
        const tokens = store.get(TOKENS_KEY, {});
        const entry = tokens[id];
        if (!entry) return null;
        return decryptToken(entry.encrypted);
    });

    // Update a token's name
    ipcMain.handle('tokens:rename', async (_event, id, newName) => {
        if (!newName) return { success: false, error: 'Name is required' };
        const tokens = store.get(TOKENS_KEY, {});
        if (!tokens[id]) return { success: false, error: 'Token not found' };
        tokens[id].name = newName;
        store.set(TOKENS_KEY, tokens);
        return { success: true };
    });
}

/**
 * Get the default Canvas API token (decrypted).
 * Usable from any main-process module without IPC.
 */
function getDefaultToken() {
    const defaultId = store.get(DEFAULT_TOKEN_KEY, '');
    if (!defaultId) return null;
    const tokens = store.get(TOKENS_KEY, {});
    const entry = tokens[defaultId];
    if (!entry || !entry.encrypted) return null;
    return decryptToken(entry.encrypted);
}

module.exports = { registerTokenHandlers, getDefaultToken };
