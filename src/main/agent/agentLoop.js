/**
 * Agent Loop - Agentic AI assistant with tool calling
 * 
 * Implements a while-loop agent that:
 * 1. Sends user messages + tool definitions to the LLM
 * 2. Processes tool calls from the LLM response
 * 3. For destructive tools, pauses and requests user confirmation
 * 4. Feeds tool results back to the LLM
 * 5. Loops until the LLM responds with a final text message
 */

const OpenAI = require('openai');
const { ALL_TOOLS, toOpenAITools, getTool } = require('../../mcp/tools');

const MAX_TOOL_ROUNDS = 15;

/**
 * Levenshtein edit distance between two strings
 */
function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[m][n];
}

/**
 * Check if a domain looks suspicious and suggest corrections.
 * Returns an array of { suggestion, reason } or empty array if domain looks fine.
 */
function getDomainSuggestions(domain) {
    const lower = domain.toLowerCase();
    const parts = lower.split('.');
    const suggestions = [];
    const seen = new Set();

    // Known substrings that appear in Canvas domains
    const knownParts = ['instructure', 'canvas'];

    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part.length < 3) continue; // skip short parts like 'com', 'edu'

        for (const known of knownParts) {
            // Only check if lengths are somewhat close (within 3 chars)
            if (Math.abs(part.length - known.length) > 3) continue;
            const dist = levenshtein(part, known);
            if (dist > 0 && dist <= 3) {
                const correctedParts = [...parts];
                correctedParts[i] = known;
                const suggestion = correctedParts.join('.');
                if (!seen.has(suggestion)) {
                    seen.add(suggestion);
                    suggestions.push({
                        suggestion,
                        reason: `"${part}" may be a misspelling of "${known}"`
                    });
                }
            }
        }
    }

    // If domain has no recognizable Canvas pattern at all, flag it
    const hasKnownPattern = knownParts.some(kp => lower.includes(kp));
    const hasCommonEdu = lower.endsWith('.edu') || lower.endsWith('.edu.au') || lower.endsWith('.ac.uk');
    if (!hasKnownPattern && !hasCommonEdu && suggestions.length === 0) {
        // Not a recognized Canvas-style domain and no close misspellings found
        // Only flag if the user explicitly provided it (not the default)
        suggestions.push({
            suggestion: null,
            reason: `"${domain}" doesn't match common Canvas domain patterns (e.g. *.instructure.com)`
        });
    }

    return suggestions;
}

const SYSTEM_PROMPT = `You are the CanvaScripter AI Assistant — an expert at managing Canvas LMS courses through available tools.

CAPABILITIES:
You have tools to list, create, and delete Canvas content including assignments, modules, pages, discussions, announcements, sections, enrollments, assignment groups, and more. You can also look up course info, search users, and check email bounce status.
Users can attach files (QTI XML/ZIP, CSV, JSON, etc.) to their messages. When a file is attached, its contents or analysis results will appear below the user's message. Analyze the file content and respond to the user's request about it.

API REFERENCE FALLBACK (priority: dedicated tools → GraphQL → REST):
When the user asks about a feature you don't have a dedicated tool for, follow this priority:
1. FIRST, use \`canvas_graphql_schema\` to search the GraphQL schema — Canvas GraphQL is the preferred API
2. For reads: use \`canvas_graphql_query\` to execute queries
3. For writes: use \`canvas_graphql_mutation\` to execute mutations (user will be prompted to approve)
4. If GraphQL doesn't cover it, fall back to \`canvas_api_reference\` to search the REST API documentation
5. If you find a suitable REST endpoint, use \`canvas_rest_call\` to execute it (user will be prompted to approve write operations)
When using GraphQL:
- Always search the schema first to discover available fields, types, and mutations
- Write well-formed queries/mutations with explicit field selections
- Use variables for dynamic values like course IDs
- Mutations require user approval before execution
When using REST:
- Always search the API reference first to find the correct endpoint, method, and parameters
- Non-GET requests require user approval before execution
- Endpoints must start with /api/ (e.g., /api/v1/courses/123)

WORKFLOW:
1. When the user asks to perform an action, first understand what they need
2. If information is missing (like course ID, domain, or specific details), ASK the user
3. For read/query operations, call the appropriate list/get tool and present results clearly
4. For create/delete operations, the system will ask the user for confirmation before executing
5. If no dedicated tool exists for what the user needs, search the API reference to provide guidance
6. After execution, report the results clearly

IMPORTANT RULES:
- A default Canvas domain is automatically provided, but if the user specifies a different domain (e.g., "myschool.instructure.com" or "ckruger.beta.instructure.com"), you MUST pass that domain in every tool call. Extract the domain from URLs or mentions in the user's message.
- Always extract course IDs from URLs the user provides (e.g., "1234" from "/courses/1234")
- Before deleting items, ALWAYS list them first so you know exactly what will be affected
- When listing items before deletion, tell the user how many items matched and what they are
- For bulk operations, summarize the results (successful count, failed count)
- Be concise but informative in your responses
- If a tool call fails, explain the error and suggest how to fix it
- You do NOT have access to the Canvas API token — it is injected automatically. Never ask the user for their API token.

FORMATTING:
- Use clear, structured responses
- For lists of items, format them as readable summaries (not raw JSON)
- Include relevant details like names, IDs, states, and dates
- When reporting results, always include counts`;

class AgentLoop {
    /**
     * @param {Object} options
     * @param {Function} options.getAIClient - Returns { config, model, requestExtra } for OpenAI SDK
     * @param {Function} options.getToken - Returns the Canvas API token
     * @param {Function} options.onUpdate - Called with streaming updates: { type, data }
     * @param {Function} options.onConfirmRequest - Called when destructive tool needs confirmation, returns Promise<boolean>
     * @param {Function} options.onDomainConfirmRequest - Called when domain looks suspicious, returns Promise<string|null>
     */
    constructor({ getAIClient, getDomain, getToken, onUpdate, onConfirmRequest, onDomainConfirmRequest }) {
        this.getAIClient = getAIClient;
        this.getDomain = getDomain;
        this.getToken = getToken;
        this.onUpdate = onUpdate || (() => { });
        this.onConfirmRequest = onConfirmRequest || (() => Promise.resolve(false));
        this.onDomainConfirmRequest = onDomainConfirmRequest || (() => Promise.resolve(null));
        this.messages = [];
        this.cancelled = false;
        this.tools = toOpenAITools(ALL_TOOLS);
        /** @type {Set<string>} Domains already confirmed by user this session */
        this.confirmedDomains = new Set();
    }

    /**
     * Reset conversation history
     */
    reset() {
        this.messages = [];
        this.cancelled = false;
        this.confirmedDomains.clear();
    }

    /**
     * Cancel the current operation
     */
    cancel() {
        this.cancelled = true;
    }

    /**
     * Get conversation history (for display)
     */
    getHistory() {
        return this.messages.filter(m => m.role !== 'system');
    }

    /**
     * Main entry point - process a user message through the agentic loop
     * @param {string} userMessage - The user's natural language message
     * @returns {Promise<{ response: string, toolCalls: Array }>}
     */
    async chat(userMessage) {
        this.cancelled = false;

        // Add system prompt if this is the first message
        if (this.messages.length === 0) {
            this.messages.push({ role: 'system', content: SYSTEM_PROMPT });
        }

        // Add user message
        this.messages.push({ role: 'user', content: userMessage });
        this.onUpdate({ type: 'user_message', data: { content: userMessage } });

        const aiClient = this.getAIClient();
        if (!aiClient || !aiClient.config) {
            const errMsg = 'AI provider not configured. Please set up your AI provider and API key in AI Settings.';
            this.messages.push({ role: 'assistant', content: errMsg });
            return { response: errMsg, toolCalls: [] };
        }

        const openai = new OpenAI(aiClient.config);
        const allToolCalls = [];
        let rounds = 0;

        // Agentic loop - keep going until LLM gives a text response (no tool calls)
        while (rounds < MAX_TOOL_ROUNDS) {
            if (this.cancelled) {
                const cancelMsg = 'Operation cancelled by user.';
                this.messages.push({ role: 'assistant', content: cancelMsg });
                return { response: cancelMsg, toolCalls: allToolCalls };
            }

            rounds++;
            this.onUpdate({ type: 'thinking', data: { round: rounds } });

            let completion;
            try {
                completion = await openai.chat.completions.create({
                    model: aiClient.model,
                    messages: this.messages,
                    tools: this.tools,
                    tool_choice: 'auto',
                    ...aiClient.requestExtra,
                });
            } catch (error) {
                const errMsg = `AI provider error: ${error.message}`;
                this.messages.push({ role: 'assistant', content: errMsg });
                return { response: errMsg, toolCalls: allToolCalls };
            }

            const choice = completion.choices[0];
            const message = choice.message;

            // If no tool calls, this is the final response
            if (!message.tool_calls || message.tool_calls.length === 0) {
                const response = message.content || 'Done.';
                this.messages.push({ role: 'assistant', content: response });
                this.onUpdate({ type: 'assistant_message', data: { content: response } });
                return { response, toolCalls: allToolCalls };
            }

            // Process tool calls
            this.messages.push(message); // Add assistant message with tool_calls

            // ---- Batch confirmation for destructive operations ----
            // Group destructive tool calls by tool name so users can approve/deny each category at once
            const destructiveGroups = new Map();
            for (const tc of message.tool_calls) {
                const tName = tc.function.name;
                const tDef = getTool(tName);
                if (!tDef || !tDef.destructive) continue;
                let tArgs;
                try { tArgs = JSON.parse(tc.function.arguments); } catch { continue; }
                if (!destructiveGroups.has(tName)) {
                    destructiveGroups.set(tName, { toolDef: tDef, items: [] });
                }
                const displayArgs = { ...tArgs };
                delete displayArgs.domain;
                destructiveGroups.get(tName).items.push(displayArgs);
            }

            // Build a summary of all groups so each confirmation card can show an "Approve Everything" option
            const allGroupsSummary = [];
            for (const [gName, g] of destructiveGroups) {
                allGroupsSummary.push({ name: gName, count: g.items.length });
            }

            // Request one approval per tool-name group
            const batchApprovals = new Map();
            let groupIndex = 0;
            for (const [groupName, group] of destructiveGroups) {
                if (this.cancelled) break;
                const { toolDef: gDef, items: gItems } = group;

                const result = await this.onConfirmRequest({
                    toolName: groupName,
                    description: gDef.description,
                    count: gItems.length,
                    items: gItems,
                    totalGroups: destructiveGroups.size,
                    groupIndex: groupIndex,
                    allGroups: allGroupsSummary
                });

                // result may be true, false, or 'approveAll'
                const approved = result === true || result === 'approveAll';
                batchApprovals.set(groupName, approved);

                if (result === 'approveAll') {
                    // Auto-approve all remaining groups
                    for (const [remainingName] of destructiveGroups) {
                        if (!batchApprovals.has(remainingName)) {
                            batchApprovals.set(remainingName, true);
                        }
                    }
                    break;
                }

                if (!approved) {
                    this.onUpdate({ type: 'tool_denied', data: { name: groupName, count: gItems.length } });
                }
                groupIndex++;
            }
            // ---- End batch confirmation ----

            for (const toolCall of message.tool_calls) {
                if (this.cancelled) {
                    this.messages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: 'Operation cancelled by user.'
                    });
                    continue;
                }

                const toolName = toolCall.function.name;
                const toolDef = getTool(toolName);

                if (!toolDef) {
                    this.messages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: `Error: Unknown tool "${toolName}"`
                    });
                    continue;
                }

                let args;
                try {
                    args = JSON.parse(toolCall.function.arguments);
                } catch {
                    this.messages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: 'Error: Could not parse tool arguments as JSON'
                    });
                    continue;
                }

                const wasBatchApproved = batchApprovals.get(toolName) === true;
                this.onUpdate({
                    type: 'tool_call',
                    data: { name: toolName, args, destructive: toolDef.destructive, batchApproved: wasBatchApproved }
                });
                allToolCalls.push({ name: toolName, args, destructive: toolDef.destructive });

                // For destructive operations, use the batch approval result
                if (toolDef.destructive) {
                    const approved = batchApprovals.get(toolName);
                    if (!approved) {
                        this.messages.push({
                            role: 'tool',
                            tool_call_id: toolCall.id,
                            content: 'User denied this batch of operations. The action was NOT performed. Let the user know and ask if they want to do something else.'
                        });
                        this.onUpdate({ type: 'tool_denied', data: { name: toolName } });
                        continue;
                    }

                    this.onUpdate({ type: 'tool_approved', data: { name: toolName } });
                }

                // Execute the tool
                this.onUpdate({ type: 'tool_executing', data: { name: toolName } });

                try {
                    const token = this.getToken();
                    const defaultDomain = this.getDomain();
                    // Prefer domain from LLM args (user-specified) over the default
                    let domain = args.domain || defaultDomain;
                    if (!token || !domain) {
                        this.messages.push({
                            role: 'tool',
                            tool_call_id: toolCall.id,
                            content: 'Error: Canvas domain and API token must be configured in the main form fields at the top of the app.'
                        });
                        continue;
                    }

                    // Sanitize the domain: strip protocol, paths, trailing dots/slashes, whitespace
                    domain = domain.trim()
                        .replace(/^https?:\/\//, '')
                        .replace(/\/.*$/, '')
                        .replace(/\.$/, '')
                        .replace(/:\d+$/, '');

                    // Basic domain format validation
                    if (!/^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$/.test(domain) || !domain.includes('.')) {
                        this.messages.push({
                            role: 'tool',
                            tool_call_id: toolCall.id,
                            content: `Error: "${domain}" does not appear to be a valid domain name. Please check for typos. Canvas domains typically look like "myschool.instructure.com".`
                        });
                        continue;
                    }

                    // Check for suspicious domains (typos, unrecognized patterns)
                    // Only check if not already confirmed this session and domain came from user/LLM
                    if (!this.confirmedDomains.has(domain)) {
                        const suggestions = getDomainSuggestions(domain);
                        if (suggestions.length > 0) {
                            const confirmedDomain = await this.onDomainConfirmRequest({
                                domain,
                                suggestions
                            });
                            if (confirmedDomain === null) {
                                // User cancelled
                                this.messages.push({
                                    role: 'tool',
                                    tool_call_id: toolCall.id,
                                    content: `Domain "${domain}" was not confirmed. Operation cancelled. Please provide the correct domain.`
                                });
                                continue;
                            }
                            domain = confirmedDomain;
                            this.confirmedDomains.add(domain);
                        } else {
                            // Domain looks fine, remember it
                            this.confirmedDomains.add(domain);
                        }
                    }

                    const result = await toolDef.execute({ ...args, domain, token });

                    const resultStr = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
                    // Truncate very large results to avoid context overflow
                    const truncated = resultStr.length > 15000
                        ? resultStr.substring(0, 15000) + '\n\n... [Result truncated. ' + resultStr.length + ' total characters]'
                        : resultStr;

                    this.messages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: truncated
                    });

                    this.onUpdate({
                        type: 'tool_result',
                        data: { name: toolName, success: true, preview: truncated.substring(0, 500) }
                    });

                } catch (error) {
                    const errMsg = error.message || String(error);
                    // Provide a clearer message for domain-related SSL/DNS errors
                    let errContent;
                    if (error.code === 'ERR_TLS_CERT_ALTNAME_INVALID' || errMsg.includes("does not match certificate's altnames")) {
                        errContent = `Error: The domain "${args.domain || domain}" appears to be misspelled — the SSL certificate doesn't match. Please check for typos (e.g. "instructure" not "intsructure"). Double-check with the user.`;
                    } else if (error.code === 'ENOTFOUND') {
                        errContent = `Error: The domain "${args.domain || domain}" could not be found (DNS lookup failed). Please verify the spelling. Double-check with the user.`;
                    } else {
                        errContent = `Error executing ${toolName}: ${errMsg}`;
                    }
                    this.messages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: errContent
                    });

                    this.onUpdate({
                        type: 'tool_error',
                        data: { name: toolName, error: error.message || String(error) }
                    });
                }
            }
        }

        // Max rounds reached
        const maxMsg = 'Reached the maximum number of tool call rounds. Please try a simpler request or break it into steps.';
        this.messages.push({ role: 'assistant', content: maxMsg });
        return { response: maxMsg, toolCalls: allToolCalls };
    }
}

module.exports = { AgentLoop };
