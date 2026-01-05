/**
 * IPC Security Module
 * 
 * Manages security controls for IPC communication including:
 * - File path allowlisting (prevents arbitrary file access)
 * - URL validation (prevents protocol injection)
 * - Per-renderer session tracking
 */

const path = require('path');

// Per-renderer allowlists for file system access
const allowedReadPaths = new Map(); // senderId -> Set<string>
const allowedWritePaths = new Map(); // senderId -> Set<string>
const allowedDirPaths = new Map(); // senderId -> Set<string>

/**
 * Remember a file/directory path for a specific renderer
 * @param {Map} map - The allowlist map to update
 * @param {number} senderId - Renderer's sender ID
 * @param {string} pathValue - Path to remember
 */
function rememberPath(map, senderId, pathValue) {
    if (!senderId || !pathValue) return;
    const normalizedPath = path.normalize(String(pathValue));
    let set = map.get(senderId);
    if (!set) {
        set = new Set();
        map.set(senderId, set);
    }
    set.add(normalizedPath);
    // Cap memory usage - keep only recent 50 paths if set grows too large
    if (set.size > 100) {
        const arr = Array.from(set);
        map.set(senderId, new Set(arr.slice(-50)));
    }
}

/**
 * Check if a path is in the allowlist for a renderer
 * @param {Map} map - The allowlist map to check
 * @param {number} senderId - Renderer's sender ID
 * @param {string} pathValue - Path to check
 * @returns {boolean} True if path is allowed
 */
function isAllowedPath(map, senderId, pathValue) {
    if (!senderId || !pathValue) return false;
    const set = map.get(senderId);
    if (!set) return false;
    const normalizedPath = path.normalize(String(pathValue));
    return set.has(normalizedPath);
}

/**
 * Validate URL for shell.openExternal
 * Only allows http and https protocols
 * @param {string} urlString - URL to validate
 * @returns {string} Validated URL
 * @throws {Error} If URL is invalid or uses disallowed protocol
 */
function validateExternalUrl(urlString) {
    try {
        const url = new URL(String(urlString));
        const allowedProtocols = ['http:', 'https:'];
        if (!allowedProtocols.includes(url.protocol)) {
            throw new Error(`Protocol ${url.protocol} not allowed. Only http and https are supported.`);
        }
        return url.toString();
    } catch (error) {
        throw new Error(`Invalid or unsafe URL: ${error.message}`);
    }
}

/**
 * Clear allowlists for a specific renderer (cleanup on window close)
 * @param {number} senderId - Renderer's sender ID
 */
function clearRendererPaths(senderId) {
    allowedReadPaths.delete(senderId);
    allowedWritePaths.delete(senderId);
    allowedDirPaths.delete(senderId);
}

module.exports = {
    // Path allowlisting
    rememberPath,
    isAllowedPath,
    allowedReadPaths,
    allowedWritePaths,
    allowedDirPaths,
    clearRendererPaths,

    // URL validation
    validateExternalUrl
};
