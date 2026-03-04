/**
 * Shared Error Utility for IPC Error Serialization
 * 
 * When errors are thrown across Electron's IPC boundary (ipcMain.handle → ipcRenderer.invoke),
 * only the Error.message string survives. This utility encodes rich error metadata (HTTP status,
 * error code, Canvas API response messages) into a JSON string that errorHandler in the renderer
 * can parse and display to the user.
 * 
 * @module shared/errorUtils
 */

/**
 * Serialize an error into a string suitable for throwing across IPC.
 * If the error has rich metadata (axios response, status code, error code),
 * it will be encoded as a JSON string with a marker prefix.
 * Otherwise, falls back to the plain error message.
 * 
 * @param {Error|string|*} error - The error to serialize
 * @returns {string} A string to throw across IPC (may be JSON-encoded)
 * 
 * @example
 * // In an IPC handler:
 * catch (error) {
 *     throw serializeErrorForIPC(error);
 * }
 */
function serializeErrorForIPC(error) {
    if (typeof error === 'string') {
        return error;
    }

    const status = error?.response?.status || error?.status || null;
    const code = error?.code || null;
    const message = error?.message || String(error);

    // Extract Canvas API error text from response data
    let apiMessage = null;
    if (error?.response?.data) {
        const data = error.response.data;
        if (data.errors && Array.isArray(data.errors)) {
            apiMessage = data.errors.map(e => e.message).join('; ');
        } else if (typeof data.error === 'string') {
            apiMessage = data.error;
        } else if (typeof data.message === 'string') {
            apiMessage = data.message;
        }
    }

    // Only encode as JSON if we have metadata beyond the message
    if (status || code || apiMessage) {
        return JSON.stringify({ __ipcError: true, status, code, message, apiMessage });
    }

    // Fallback: plain message string
    return message;
}

/**
 * Parse a serialized IPC error string back into structured metadata.
 * Returns null if the string is not a serialized IPC error.
 * 
 * @param {string} errorMessage - The error message string (may contain IPC JSON)
 * @returns {{ status: number|null, code: string|null, message: string, apiMessage: string|null }|null}
 */
function parseIPCError(errorMessage) {
    if (!errorMessage || typeof errorMessage !== 'string') return null;

    // The error message from Electron IPC is typically:
    // "Error invoking remote method 'channel': <thrown string>"
    // Try to find JSON at the end of the message
    const jsonStart = errorMessage.indexOf('{"__ipcError":');
    if (jsonStart === -1) return null;

    try {
        const parsed = JSON.parse(errorMessage.slice(jsonStart));
        if (parsed && parsed.__ipcError) {
            return {
                status: parsed.status || null,
                code: parsed.code || null,
                message: parsed.message || errorMessage,
                apiMessage: parsed.apiMessage || null
            };
        }
    } catch {
        // Not valid JSON, fall through
    }

    return null;
}

module.exports = { serializeErrorForIPC, parseIPCError };
