/**
 * IPC Handlers for Permissions operations
 * Handles role permissions matching and management
 * 
 * @module ipc/permissionsHandlers
 */

const StateManager = require('../state/stateManager');
const axios = require('axios');

/**
 * Register all Permissions IPC handlers
 * @param {Electron.IpcMain} ipcMain - The Electron IPC main instance
 * @param {Function} logDebug - Debug logging function
 * @param {Function} getBatchConfig - Get batch configuration function
 */
function registerPermissionsHandlers(ipcMain, logDebug, getBatchConfig) {

    /**
     * Match permissions from source role to target role
     * This handler:
     * 1. Fetches roles from source account
     * 2. Finds the source role by name or ID
     * 3. Gets the source role's permissions
     * 4. Finds/validates the target role
     * 5. Updates the target role with the source role's permissions
     */
    ipcMain.handle('axios:matchPermissions', async (event, data) => {
        const rendererId = event.sender.id;
        const operationId = `matchPermissions-${rendererId}`;

        logDebug(`[${operationId}] Starting permissions matching`, {
            source: data.source,
            target: data.target
        });

        try {
            const controller = StateManager.createOperationController(operationId);
            const token = data.token;

            // Step 1: Get source role and its permissions
            logDebug(`[${operationId}] Fetching source role permissions`);
            const sourcePermissions = await getSourceRolePermissions(
                data.source.domain,
                data.source.accountId,
                data.source.role,
                token,
                controller.signal,
                logDebug
            );

            if (!sourcePermissions) {
                throw new Error('Failed to fetch source role permissions');
            }

            event.sender.send('permissions-match-progress', {
                step: 'source-fetched',
                message: `Source role permissions fetched: ${Object.keys(sourcePermissions).length} permissions found`
            });

            // Step 2: Get target role ID
            logDebug(`[${operationId}] Resolving target role ID`);
            const targetRoleId = await resolveRoleId(
                data.target.domain,
                data.target.accountId,
                data.target.role,
                token,
                controller.signal,
                logDebug
            );

            if (!targetRoleId) {
                throw new Error('Failed to resolve target role ID');
            }

            event.sender.send('permissions-match-progress', {
                step: 'target-resolved',
                message: `Target role resolved: ID ${targetRoleId}`
            });

            // Step 3: Group permissions if needed (same logic as enable/disable)
            logDebug(`[${operationId}] Processing source permissions for grouping`);
            const permissionsToApply = {};
            const processedGroups = new Set();
            const totalSourcePermissions = Object.keys(sourcePermissions).length;

            for (const [permKey, permValue] of Object.entries(sourcePermissions)) {
                // Check if this permission belongs to a group
                if (permValue.group) {
                    const groupName = permValue.group;

                    // Only add the group once
                    if (!processedGroups.has(groupName)) {
                        permissionsToApply[groupName] = {
                            enabled: permValue.enabled,
                            locked: permValue.locked || false,
                            explicit: true
                        };
                        processedGroups.add(groupName);
                    }
                } else {
                    // Add individual permission (not part of a group)
                    permissionsToApply[permKey] = {
                        enabled: permValue.enabled,
                        locked: permValue.locked || false,
                        explicit: true
                    };
                }
            }

            const permissionsToUpdate = Object.keys(permissionsToApply);
            const updateCount = permissionsToUpdate.length;
            logDebug(`[${operationId}] Consolidated ${totalSourcePermissions} permissions into ${updateCount} updates`);

            // Step 4: Update permissions one at a time
            logDebug(`[${operationId}] Updating permissions individually`);
            const successfulPermissions = [];
            const failedPermissions = [];
            let processedCount = 0;

            for (const permKey of permissionsToUpdate) {
                processedCount++;

                // Send progress update
                event.sender.send('permissions-match-progress', {
                    step: 'updating',
                    message: `Processing ${processedCount}/${updateCount}: ${permKey}`,
                    current: processedCount,
                    total: updateCount,
                    currentPermission: permKey
                });

                try {
                    // Update this single permission
                    const singlePermission = {
                        [permKey]: permissionsToApply[permKey]
                    };

                    await axios.put(
                        `https://${data.target.domain}/api/v1/accounts/${data.target.accountId}/roles/${targetRoleId}`,
                        { permissions: singlePermission },
                        {
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            signal: controller.signal
                        }
                    );

                    successfulPermissions.push(permKey);
                    logDebug(`[${operationId}] Successfully updated: ${permKey}`);

                } catch (error) {
                    const errorMsg = error.response?.data?.errors?.[0]?.message || error.message;
                    failedPermissions.push({
                        permission: permKey,
                        error: errorMsg
                    });
                    logDebug(`[${operationId}] Failed to update ${permKey}: ${errorMsg}`);
                }
            }

            event.sender.send('permissions-match-progress', {
                step: 'completed',
                message: `Completed: ${successfulPermissions.length} successful, ${failedPermissions.length} failed`
            });

            StateManager.cleanupOperation(operationId);

            return {
                success: true,
                sourcePermissionCount: totalSourcePermissions,
                targetRoleId: targetRoleId,
                updatesApplied: updateCount,
                successCount: successfulPermissions.length,
                failCount: failedPermissions.length,
                failedPermissions: failedPermissions
            };

        } catch (error) {
            logDebug(`[${operationId}] Error`, { error: error.message });
            StateManager.cleanupOperation(operationId);

            if (axios.isCancel(error)) {
                return { success: false, cancelled: true, error: 'Operation cancelled' };
            }

            throw error;
        }
    });

    /**
     * Cancel ongoing permissions matching operation
     */
    ipcMain.handle('axios:cancelMatchPermissions', async (event) => {
        const rendererId = event.sender.id;
        const operationId = `matchPermissions-${rendererId}`;

        logDebug(`[${operationId}] Cancellation requested`);
        StateManager.cancelOperation(operationId, 'user_cancelled');

        return { cancelled: true };
    });

    /**
     * Enable or disable all permissions for a role
     * This handler:
     * 1. Resolves the role ID (if role name provided)
     * 2. Fetches current role permissions
     * 3. Updates all permissions to enabled or disabled
     * 4. Sends PUT request to update the role
     */
    ipcMain.handle('axios:enableDisableAllPermissions', async (event, data) => {
        const rendererId = event.sender.id;
        const operationId = `enableDisablePermissions-${rendererId}`;

        logDebug(`[${operationId}] Starting enable/disable all permissions`, {
            action: data.action,
            role: data.role,
            accountId: data.accountId
        });

        try {
            const controller = StateManager.createOperationController(operationId);
            const { token, domain, accountId, role, action } = data;
            const enablePermissions = action === 'enable';

            // Step 1: Resolve role ID
            logDebug(`[${operationId}] Resolving role ID`);
            const roleIdResolved = await resolveRoleId(
                domain,
                accountId,
                role,
                token,
                controller.signal,
                logDebug
            );

            if (!roleIdResolved) {
                throw new Error('Failed to resolve role ID');
            }

            event.sender.send('enable-disable-progress', {
                step: 'role-resolved',
                message: `Role resolved: ID ${roleIdResolved}`
            });

            // Step 2: Fetch current role with permissions
            logDebug(`[${operationId}] Fetching role permissions`);
            const roleResponse = await axios.get(
                `https://${domain}/api/v1/accounts/${accountId}/roles/${roleIdResolved}`,
                {
                    headers: { 'Authorization': `Bearer ${token}` },
                    signal: controller.signal
                }
            );

            const roleData = roleResponse.data;
            const currentPermissions = roleData.permissions || {};
            const permissionCount = Object.keys(currentPermissions).length;

            event.sender.send('enable-disable-progress', {
                step: 'role-fetched',
                message: `Role fetched: ${permissionCount} permissions found`
            });

            // Step 3: Build permissions object for bulk update
            logDebug(`[${operationId}] Building permissions object`);
            const updatedPermissions = {};
            const processedGroups = new Set();

            for (const [permKey, permValue] of Object.entries(currentPermissions)) {
                // Check if this permission belongs to a group
                if (permValue.group) {
                    const groupName = permValue.group;

                    // Only add the group once
                    if (!processedGroups.has(groupName)) {
                        updatedPermissions[groupName] = {
                            enabled: enablePermissions,
                            locked: false,
                            explicit: true
                        };
                        processedGroups.add(groupName);
                        logDebug(`[${operationId}] Added group permission: ${groupName}`);
                    }
                } else {
                    // Add individual permission (not part of a group)
                    updatedPermissions[permKey] = {
                        enabled: enablePermissions,
                        locked: false,
                        explicit: true
                    };
                }
            }

            const updateCount = Object.keys(updatedPermissions).length;
            logDebug(`[${operationId}] Consolidated ${permissionCount} permissions into ${updateCount} updates`);

            event.sender.send('enable-disable-progress', {
                step: 'updating',
                message: `Updating ${updateCount} permissions (${permissionCount - updateCount} grouped)...`
            });

            // Step 4: Update all permissions in one request
            logDebug(`[${operationId}] Updating all permissions`);
            const updateResponse = await axios.put(
                `https://${domain}/api/v1/accounts/${accountId}/roles/${roleIdResolved}`,
                { permissions: updatedPermissions },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    signal: controller.signal
                }
            );

            event.sender.send('enable-disable-progress', {
                step: 'completed',
                message: `All permissions ${enablePermissions ? 'enabled' : 'disabled'} successfully!`
            });

            StateManager.cleanupOperation(operationId);

            return {
                success: true,
                roleId: roleIdResolved,
                roleLabel: roleData.label || role,
                totalPermissions: permissionCount,
                updatesApplied: updateCount,
                groupedPermissions: permissionCount - updateCount,
                action: action
            };

        } catch (error) {
            logDebug(`[${operationId}] Error`, { error: error.message });
            StateManager.cleanupOperation(operationId);

            if (axios.isCancel(error)) {
                return { success: false, cancelled: true, error: 'Operation cancelled' };
            }

            throw error;
        }
    });

    /**
     * Cancel ongoing enable/disable permissions operation
     */
    ipcMain.handle('axios:cancelEnableDisablePermissions', async (event) => {
        const rendererId = event.sender.id;
        const operationId = `enableDisablePermissions-${rendererId}`;

        logDebug(`[${operationId}] Cancellation requested`);
        StateManager.cancelOperation(operationId, 'user_cancelled');

        return { cancelled: true };
    });
}

/**
 * Get permissions from source role
 * @param {string} domain - Canvas domain
 * @param {string} accountId - Account ID
 * @param {string} role - Role name or ID
 * @param {string} token - API token
 * @param {AbortSignal} signal - Abort signal
 * @param {Function} logDebug - Debug logging function
 * @returns {Promise<Object>} Permissions object
 */
async function getSourceRolePermissions(domain, accountId, role, token, signal, logDebug) {
    // Check if role is an ID (numeric) or name (string)
    const isNumeric = /^\d+$/.test(role);

    if (isNumeric) {
        // Direct fetch by role ID
        logDebug('[getSourceRolePermissions] Fetching role by ID');
        const response = await axios.get(
            `https://${domain}/api/v1/accounts/${accountId}/roles/${role}`,
            {
                headers: { 'Authorization': `Bearer ${token}` },
                signal: signal
            }
        );

        return response.data.permissions || {};
    } else {
        // Fetch all roles and find by label
        logDebug('[getSourceRolePermissions] Fetching roles by name');
        const allRoles = await fetchAllRoles(domain, accountId, token, signal, logDebug);

        // Find role by label (case-insensitive)
        const matchedRole = allRoles.find(r =>
            r.label && r.label.toLowerCase() === role.toLowerCase()
        );

        if (!matchedRole) {
            throw new Error(`Source role "${role}" not found in account ${accountId}`);
        }

        logDebug('[getSourceRolePermissions] Found role by label', {
            roleId: matchedRole.id,
            label: matchedRole.label
        });

        return matchedRole.permissions || {};
    }
}

/**
 * Resolve role ID from role name or ID
 * @param {string} domain - Canvas domain
 * @param {string} accountId - Account ID
 * @param {string} role - Role name or ID
 * @param {string} token - API token
 * @param {AbortSignal} signal - Abort signal
 * @param {Function} logDebug - Debug logging function
 * @returns {Promise<number>} Role ID
 */
async function resolveRoleId(domain, accountId, role, token, signal, logDebug) {
    // Check if role is already an ID
    const isNumeric = /^\d+$/.test(role);

    if (isNumeric) {
        logDebug('[resolveRoleId] Role is already an ID', { roleId: role });
        return parseInt(role, 10);
    }

    // Fetch all roles and find by label
    logDebug('[resolveRoleId] Resolving role by name');
    const allRoles = await fetchAllRoles(domain, accountId, token, signal, logDebug);

    const matchedRole = allRoles.find(r =>
        r.label && r.label.toLowerCase() === role.toLowerCase()
    );

    if (!matchedRole) {
        throw new Error(`Target role "${role}" not found in account ${accountId}`);
    }

    logDebug('[resolveRoleId] Resolved role by label', {
        roleId: matchedRole.id,
        label: matchedRole.label
    });

    return matchedRole.id;
}

/**
 * Fetch all roles from an account with pagination
 * @param {string} domain - Canvas domain
 * @param {string} accountId - Account ID
 * @param {string} token - API token
 * @param {AbortSignal} signal - Abort signal
 * @param {Function} logDebug - Debug logging function
 * @returns {Promise<Array>} Array of roles
 */
async function fetchAllRoles(domain, accountId, token, signal, logDebug) {
    let allRoles = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
        logDebug('[fetchAllRoles] Fetching page', { page });

        const response = await axios.get(
            `https://${domain}/api/v1/accounts/${accountId}/roles`,
            {
                headers: { 'Authorization': `Bearer ${token}` },
                params: {
                    per_page: 100,
                    page: page
                },
                signal: signal
            }
        );

        allRoles = allRoles.concat(response.data);

        // Check for pagination link
        const linkHeader = response.headers.link;
        hasMore = linkHeader && linkHeader.includes('rel="next"');
        page++;
    }

    logDebug('[fetchAllRoles] Total roles fetched', { count: allRoles.length });
    return allRoles;
}

/**
 * Update role permissions
 * @param {string} domain - Canvas domain
 * @param {string} accountId - Account ID
 * @param {number} roleId - Role ID
 * @param {Object} permissions - Permissions object
 * @param {string} token - API token
 * @param {AbortSignal} signal - Abort signal
 * @param {Function} logDebug - Debug logging function
 * @returns {Promise<Object>} Updated role data
 */
async function updateRolePermissions(domain, accountId, roleId, permissions, token, signal, logDebug) {
    logDebug('[updateRolePermissions] Updating role', {
        roleId,
        permissionCount: Object.keys(permissions).length
    });

    const response = await axios.put(
        `https://${domain}/api/v1/accounts/${accountId}/roles/${roleId}`,
        { permissions },
        {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            signal: signal
        }
    );

    logDebug('[updateRolePermissions] Role updated successfully');
    return response.data;
}

/**
 * Cleanup function for permissions state
 * @param {number} rendererId - Renderer process ID
 */
function cleanupPermissionsState(rendererId) {
    const operationId = `matchPermissions-${rendererId}`;
    StateManager.cancelOperation(operationId, 'cleanup');
}

module.exports = {
    registerPermissionsHandlers,
    cleanupPermissionsState
};
