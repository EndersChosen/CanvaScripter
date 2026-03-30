#!/usr/bin/env node
/**
 * CanvaScripter MCP Server
 * 
 * Exposes Canvas LMS operations as MCP tools via stdio transport.
 * Can be used standalone with any MCP-compatible client (Claude Desktop, etc.)
 * 
 * Configuration via environment variables:
 *   CANVAS_DOMAIN - Canvas instance domain (e.g., myschool.instructure.com)
 *   CANVAS_TOKEN  - Canvas API bearer token
 * 
 * Usage:
 *   node src/mcp/server.js
 * 
 * Or in MCP client config:
 *   { "command": "node", "args": ["src/mcp/server.js"], "env": { "CANVAS_DOMAIN": "...", "CANVAS_TOKEN": "..." } }
 */

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { ALL_TOOLS } = require('./tools');

const server = new McpServer({
    name: 'canvascripter',
    version: '1.0.0',
    description: 'Canvas LMS operations - manage courses, assignments, modules, pages, discussions, enrollments, and more.'
});

// Register all tools with the MCP server
for (const tool of ALL_TOOLS) {
    server.tool(
        tool.name,
        tool.description,
        tool.inputSchema,
        async (params) => {
            try {
                // Inject credentials from environment if not provided in params
                const domain = params.domain || process.env.CANVAS_DOMAIN;
                const token = process.env.CANVAS_TOKEN;

                if (!domain) {
                    return {
                        content: [{ type: 'text', text: 'Error: Canvas domain is required. Provide it as a parameter or set CANVAS_DOMAIN environment variable.' }],
                        isError: true
                    };
                }
                if (!token) {
                    return {
                        content: [{ type: 'text', text: 'Error: Canvas API token is required. Set CANVAS_TOKEN environment variable.' }],
                        isError: true
                    };
                }

                const result = await tool.execute({ ...params, domain, token });
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
                };
            } catch (error) {
                return {
                    content: [{ type: 'text', text: `Error: ${error.message}` }],
                    isError: true
                };
            }
        }
    );
}

// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('CanvaScripter MCP server running on stdio');
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
