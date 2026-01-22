// Shared operation cancellation flags for IPC handlers
// Use a single map so cancel requests work across handler modules.

const operationCancelFlags = new Map();

module.exports = { operationCancelFlags };
