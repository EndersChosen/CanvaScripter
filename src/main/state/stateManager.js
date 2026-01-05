/**
 * Application State Manager
 * 
 * Centralized state management for the Electron application.
 * Manages global state including cancellation flags, operation tracking,
 * and suppressed emails list.
 */

class StateManager {
    constructor() {
        // Operation cancellation tracking
        this.resetEmailsCancelFlags = new Map(); // senderId -> boolean
        this.resetPatternCancelFlags = new Map(); // senderId -> boolean
        this.createAssignmentGroupsCancelFlags = new Map(); // senderId -> boolean
        this.deleteEmptyAssignmentGroupsCancelFlags = new Map(); // senderId -> boolean
        this.operationCancelFlags = new Map(); // operationId -> boolean

        // Data stores
        this.suppressedEmails = [];

        // Operation controllers for AbortController pattern
        this.operationControllers = new Map(); // operationId -> AbortController
    }

    /**
     * Set cancellation flag for a sender
     * @param {Map} flagMap - The flag map to update
     * @param {number} senderId - Sender ID
     * @param {boolean} value - Cancellation state
     */
    setCancelFlag(flagMap, senderId, value) {
        flagMap.set(senderId, value);
    }

    /**
     * Get cancellation flag for a sender
     * @param {Map} flagMap - The flag map to check
     * @param {number} senderId - Sender ID
     * @returns {boolean} Cancellation state
     */
    getCancelFlag(flagMap, senderId) {
        return flagMap.get(senderId) === true;
    }

    /**
     * Clear cancellation flag for a sender
     * @param {Map} flagMap - The flag map to clear
     * @param {number} senderId - Sender ID
     */
    clearCancelFlag(flagMap, senderId) {
        flagMap.delete(senderId);
    }

    /**
     * Create an AbortController for an operation
     * @param {string} operationId - Unique operation identifier
     * @returns {AbortController} New abort controller
     */
    createOperationController(operationId) {
        // Cancel existing controller if present
        if (this.operationControllers.has(operationId)) {
            try {
                this.operationControllers.get(operationId).abort('superseded');
            } catch { }
        }

        const controller = new AbortController();
        this.operationControllers.set(operationId, controller);
        return controller;
    }

    /**
     * Cancel an operation by ID
     * @param {string} operationId - Operation identifier
     * @param {string} reason - Cancellation reason
     * @returns {boolean} True if operation was cancelled
     */
    cancelOperation(operationId, reason = 'user_cancelled') {
        const controller = this.operationControllers.get(operationId);
        if (controller) {
            try {
                controller.abort(reason);
                this.operationControllers.delete(operationId);
                return true;
            } catch { }
        }
        return false;
    }

    /**
     * Clean up operation controller
     * @param {string} operationId - Operation identifier
     */
    cleanupOperation(operationId) {
        this.operationControllers.delete(operationId);
    }

    /**
     * Add suppressed emails to the list
     * @param {Array<string>} emails - Emails to add
     */
    addSuppressedEmails(emails) {
        this.suppressedEmails.push(...emails);
    }

    /**
     * Clear suppressed emails list
     */
    clearSuppressedEmails() {
        this.suppressedEmails = [];
    }

    /**
     * Get suppressed emails list
     * @returns {Array<string>} List of suppressed emails
     */
    getSuppressedEmails() {
        return this.suppressedEmails;
    }

    /**
     * Clean up state for a specific renderer (on window close)
     * @param {number} senderId - Renderer's sender ID
     */
    cleanupRenderer(senderId) {
        this.resetEmailsCancelFlags.delete(senderId);
        this.resetPatternCancelFlags.delete(senderId);
        this.createAssignmentGroupsCancelFlags.delete(senderId);
        this.deleteEmptyAssignmentGroupsCancelFlags.delete(senderId);

        // Cancel any operations associated with this sender
        for (const [opId, controller] of this.operationControllers.entries()) {
            if (opId.startsWith(`${senderId}-`)) {
                try {
                    controller.abort('renderer_closed');
                    this.operationControllers.delete(opId);
                } catch { }
            }
        }
    }
}

// Export singleton instance
const stateManager = new StateManager();

module.exports = stateManager;
