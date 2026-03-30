/**
 * API Spec Handlers - IPC bridge for Canvas API spec scanning and searching
 * 
 * Registers IPC handlers for:
 *   apiSpec:scan           - Fetch and cache the Canvas REST API spec
 *   apiSpec:getStatus      - Get metadata about the cached spec
 *   apiSpec:search         - Search cached REST endpoints
 *   graphql:scan           - Introspect and cache the Canvas GraphQL schema
 *   graphql:getStatus      - Get metadata about the cached GraphQL schema
 *   graphql:search         - Search cached GraphQL schema
 */

const { ipcMain } = require('electron');
const { scanAndCacheSpec, getSpecMeta, searchSpec } = require('../canvasApiSpec');
const { scanAndCacheGraphQLSchema, getGraphQLSchemaMeta, searchGraphQLSchema } = require('../canvasGraphQL');

/**
 * Register all apiSpec IPC handlers
 */
function registerApiSpecHandlers() {

    // REST API spec handlers
    ipcMain.handle('apiSpec:scan', async (_event, domain) => {
        const result = await scanAndCacheSpec(domain);
        return result;
    });

    ipcMain.handle('apiSpec:getStatus', () => {
        return getSpecMeta();
    });

    ipcMain.handle('apiSpec:search', (_event, query, limit) => {
        return searchSpec(query, limit);
    });

    // GraphQL schema handlers
    ipcMain.handle('graphql:scan', async (_event, domain, token) => {
        if (!domain || !token) {
            return { success: false, error: 'Domain and token are required for GraphQL introspection.' };
        }
        return await scanAndCacheGraphQLSchema(domain, token);
    });

    ipcMain.handle('graphql:getStatus', () => {
        return getGraphQLSchemaMeta();
    });

    ipcMain.handle('graphql:search', (_event, query, category, limit) => {
        return searchGraphQLSchema(query, category, limit);
    });
}

module.exports = { registerApiSpecHandlers };
