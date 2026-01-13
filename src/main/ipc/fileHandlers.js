/**
 * File Operations IPC Handlers
 * 
 * Registers IPC handlers for file system operations with security controls:
 * - File/folder selection dialogs
 * - File reading with allowlist validation
 * - File writing with allowlist validation
 * - CSV/Excel parsing
 * - HAR file analysis
 */

const { ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

/**
 * Register all file operation IPC handlers
 * @param {Object} options - Configuration options
 * @param {BrowserWindow} options.mainWindow - Main application window
 * @param {Object} options.security - Security module (ipcSecurity.js)
 * @param {Object} options.parsers - File parsing functions
 * @param {Object} options.harAnalyzer - HAR analyzer module
 */
function registerFileHandlers({ mainWindow, security, parsers, harAnalyzer }) {
    const { rememberPath, isAllowedPath, allowedReadPaths, allowedWritePaths, allowedDirPaths } = security;

    // Folder selection
    ipcMain.handle('sis:selectFolder', async (event) => {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory']
        });
        if (result.canceled) return null;
        const folderPath = result.filePaths[0];
        rememberPath(allowedDirPaths, event.sender.id, folderPath);
        return folderPath;
    });

    // File selection
    ipcMain.handle('sis:selectFile', async (event, options = {}) => {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openFile'],
            filters: options.filters || [{ name: 'All Files', extensions: ['*'] }]
        });
        if (result.canceled) return null;
        const filePath = result.filePaths[0];
        rememberPath(allowedReadPaths, event.sender.id, filePath);
        return { filePath };
    });

    // File reading with security check
    ipcMain.handle('sis:readFile', async (event, filePath) => {
        try {
            if (!isAllowedPath(allowedReadPaths, event.sender.id, filePath)) {
                throw new Error('Access denied: file was not selected via dialog');
            }
            const content = fs.readFileSync(filePath, 'utf8');
            return content;
        } catch (error) {
            throw new Error(`Failed to read file: ${error.message}`);
        }
    });

    // Save dialog
    ipcMain.handle('file:save', async (event, options = {}) => {
        const result = await dialog.showSaveDialog(mainWindow, {
            defaultPath: options.defaultPath || 'download.txt',
            filters: options.filters || [{ name: 'All Files', extensions: ['*'] }]
        });
        if (result.canceled) return null;
        if (result.filePath) {
            rememberPath(allowedWritePaths, event.sender.id, result.filePath);
        }
        return { filePath: result.filePath };
    });

    // File writing with security check
    ipcMain.handle('file:write', async (event, filePath, content) => {
        try {
            if (!isAllowedPath(allowedWritePaths, event.sender.id, filePath)) {
                throw new Error('Access denied: file path was not chosen via save dialog');
            }
            fs.writeFileSync(filePath, content, 'utf8');
            return { success: true };
        } catch (error) {
            throw new Error(`Failed to write file: ${error.message}`);
        }
    });

    // HAR file selection
    ipcMain.handle('har:selectFile', async (event) => {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openFile'],
            filters: [
                { name: 'HAR Files', extensions: ['har'] },
                { name: 'JSON Files', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        if (result.canceled) return { canceled: true };
        const filePath = result.filePaths[0];
        rememberPath(allowedReadPaths, event.sender.id, filePath);
        return { canceled: false, filePath };
    });

    // HAR analysis with security check
    ipcMain.handle('har:analyze', async (event, filePath) => {
        try {
            if (!isAllowedPath(allowedReadPaths, event.sender.id, filePath)) {
                throw new Error('Access denied: HAR file was not selected via dialog');
            }
            const harContent = fs.readFileSync(filePath, 'utf8');
            const harData = JSON.parse(harContent);
            const analyzer = new harAnalyzer.HARAnalyzer(harData);
            const report = analyzer.generateReport();
            report.diagnosis = analyzer.diagnoseIncompleteAuth();
            return report;
        } catch (error) {
            throw new Error(`Failed to analyze HAR file: ${error.message}`);
        }
    });

    const { getDecryptedKey } = require('./settingsHandlers');

    // AI HAR analysis
    ipcMain.handle('har:analyzeAi', async (event, { filePath, model, prompt }) => {
        try {
            if (!isAllowedPath(allowedReadPaths, event.sender.id, filePath)) {
                throw new Error('Access denied: HAR file was not selected via dialog');
            }

            const harContent = fs.readFileSync(filePath, 'utf8');
            const harData = JSON.parse(harContent);

            // Prepare context for AI (Summarize to fit regular context windows)
            const summary = summarizeHarForAi(harData);
            const systemPrompt = `You are an expert HTTP Archive (HAR) analyzer. 
Analyze the provided network log summary for issues such as authentication failures (SAML/OAuth), unexpected redirects, client-side errors, or performance bottlenecks.
The user is reporting an issue. Look for anomalies that might explain it.`;

            let userContent = `Analyze the following HAR summary:\n\n${JSON.stringify(summary, null, 2)}`;
            if (prompt && prompt.trim()) {
                userContent = `User Issue Description/Question:
${prompt}

Please answer the user's question and analyze the HAR summary below specifically looking for evidence related to their issue:

${JSON.stringify(summary, null, 2)}`;
            }

            let responseText = '';

            if (model.startsWith('gpt')) {
                const apiKey = getDecryptedKey('openai');
                if (!apiKey) throw new Error('API Key missing. Please entering it in the AI Advisor setttings.');

                const openai = new OpenAI({ apiKey });
                // Mapping custom user request to actual available model
                const modelMapper = {
                    'gpt-5.2': 'gpt-4o', // Fallback as 5.2 doesn't exist publically yet
                };
                const targetModel = modelMapper[model] || model;

                const completion = await openai.chat.completions.create({
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userContent }
                    ],
                    model: targetModel,
                });
                responseText = completion.choices[0].message.content;

            } else if (model.startsWith('claude')) {
                const apiKey = getDecryptedKey('anthropic');
                if (!apiKey) throw new Error('API Key missing. Please enter it in the AI Advisor settings.');

                const anthropic = new Anthropic({ apiKey });
                // Mapping custom user request to actual available model
                const modelMapper = {
                    'claude-sonnet-4.5': 'claude-sonnet-4-5-20250929',
                };
                const targetModel = modelMapper[model] || 'claude-3-5-sonnet-20240620'; // Fallback to a known stable model if mapping fails

                const msg = await anthropic.messages.create({
                    model: targetModel,
                    max_tokens: 4096,
                    messages: [{ role: "user", content: `${systemPrompt}\n\n${userContent}` }],
                });
                responseText = msg.content[0].text;
            } else {
                throw new Error(`Unsupported model selected: ${model}`);
            }

            return responseText;

        } catch (error) {
            console.error('AI Analysis Error:', error);
            throw new Error(`Failed to run AI analysis: ${error.message}`);
        }
    });

    // CSV/ZIP picker
    ipcMain.handle('fileUpload:pickCsvOrZip', async (event) => {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openFile'],
            filters: [
                { name: 'CSV/ZIP/JSON', extensions: ['csv', 'zip', 'json'] },
                { name: 'All Files', extensions: ['*'] }
            ],
            modal: true
        });
        if (result.canceled) return null;
        const filePath = result.filePaths[0];
        rememberPath(allowedReadPaths, event.sender.id, filePath);
        return filePath;
    });

    // File reading (fileUpload variant)
    ipcMain.handle('fileUpload:readFile', async (event, payload) => {
        const { fullPath } = payload || {};
        if (!fullPath) throw new Error('fullPath required');
        if (!isAllowedPath(allowedReadPaths, event.sender.id, fullPath)) {
            throw new Error('Access denied: file was not selected via dialog');
        }
        return await fs.promises.readFile(fullPath, 'utf8');
    });

    // File buffer reading
    ipcMain.handle('fileUpload:readFileBuffer', async (event, payload) => {
        const { fullPath } = payload || {};
        if (!fullPath) throw new Error('fullPath required');
        if (!isAllowedPath(allowedReadPaths, event.sender.id, fullPath)) {
            throw new Error('Access denied: file was not selected via dialog');
        }
        const buf = await fs.promises.readFile(fullPath);
        return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    });

    // CSV parsing handlers
    ipcMain.handle('parseEmailsFromCSV', async (event, csvContent) => {
        try {
            const emails = parsers.parseEmailsFromCSV(csvContent);
            return {
                success: true,
                emails,
                count: emails.length
            };
        } catch (error) {
            console.error('Error parsing CSV content:', error);
            return {
                success: false,
                error: error.message || 'Failed to parse CSV content'
            };
        }
    });

    // Excel parsing handlers
    ipcMain.handle('parseEmailsFromExcel', async (event, { filePath, fileBuffer }) => {
        try {
            const emails = parsers.parseEmailsFromExcel(fileBuffer);
            return {
                success: true,
                emails,
                count: emails.length
            };
        } catch (error) {
            console.error('Error parsing Excel content:', error);
            return {
                success: false,
                error: error.message || 'Failed to parse Excel content'
            };
        }
    });

    // QTI file selection
    ipcMain.handle('qti:selectFile', async (event) => {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openFile'],
            filters: [
                { name: 'QTI Files', extensions: ['xml', 'zip'] },
                { name: 'XML Files', extensions: ['xml'] },
                { name: 'ZIP Packages', extensions: ['zip'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        if (result.canceled) return { canceled: true };
        const filePath = result.filePaths[0];
        rememberPath(allowedReadPaths, event.sender.id, filePath);
        return { canceled: false, filePath };
    });

    // QTI standard analysis
    ipcMain.handle('qti:analyze', async (event, filePath) => {
        try {
            if (!isAllowedPath(allowedReadPaths, event.sender.id, filePath)) {
                throw new Error('Access denied: QTI file was not selected via dialog');
            }

            const { QTIAnalyzer } = require('../../shared/qtiAnalyzer');

            // Determine if ZIP or XML
            const isZip = filePath.toLowerCase().endsWith('.zip');
            let qtiData;

            if (isZip) {
                const zipBuffer = fs.readFileSync(filePath);
                qtiData = await QTIAnalyzer.analyzePackage(zipBuffer);
            } else {
                const xmlContent = fs.readFileSync(filePath, 'utf8');
                qtiData = await QTIAnalyzer.analyzeXML(xmlContent);
            }

            return qtiData;
        } catch (error) {
            throw new Error(`Failed to analyze QTI file: ${error.message}`);
        }
    });

    // QTI AI analysis
    ipcMain.handle('qti:analyzeAi', async (event, { filePath, model, prompt }) => {
        try {
            if (!isAllowedPath(allowedReadPaths, event.sender.id, filePath)) {
                throw new Error('Access denied: QTI file was not selected via dialog');
            }

            // First do standard analysis
            const { QTIAnalyzer } = require('../../shared/qtiAnalyzer');
            const isZip = filePath.toLowerCase().endsWith('.zip');
            let qtiData;

            if (isZip) {
                const zipBuffer = fs.readFileSync(filePath);
                qtiData = await QTIAnalyzer.analyzePackage(zipBuffer);
            } else {
                const xmlContent = fs.readFileSync(filePath, 'utf8');
                qtiData = await QTIAnalyzer.analyzeXML(xmlContent);
            }

            // Prepare AI context
            const summary = {
                version: qtiData.version,
                metadata: qtiData.metadata,
                questionSummary: qtiData.questionSummary,
                interactionTypes: qtiData.interactionTypes,
                compatibility: qtiData.canvasCompatibility,
                warnings: qtiData.warnings,
                contentAnalysis: qtiData.contentAnalysis
            };

            const systemPrompt = `You are an expert in QTI (Question and Test Interoperability) standards and Canvas LMS.
Analyze QTI assessments for Canvas compatibility, quality issues, and provide actionable recommendations.
Focus on practical import guidance and question improvement suggestions.`;

            let userContent = `Analyze this QTI assessment summary:\n\n${JSON.stringify(summary, null, 2)}`;
            if (prompt && prompt.trim()) {
                userContent = `User request: ${prompt}\n\nQTI Assessment Data:\n${JSON.stringify(summary, null, 2)}`;
            }

            // Call AI (reuse HAR analyzer AI logic)
            let responseText = '';
            if (model.startsWith('gpt')) {
                // OpenAI call
                const apiKey = getDecryptedKey('openai');
                if (!apiKey) throw new Error('OpenAI API Key missing');

                const OpenAI = require('openai').default || require('openai');
                const openai = new OpenAI({ apiKey });
                const completion = await openai.chat.completions.create({
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userContent }
                    ],
                    model: 'gpt-4o',
                });
                responseText = completion.choices[0].message.content;

            } else if (model.startsWith('claude')) {
                // Anthropic call
                const apiKey = getDecryptedKey('anthropic');
                if (!apiKey) throw new Error('Anthropic API Key missing');

                const Anthropic = require('@anthropic-ai/sdk').default || require('@anthropic-ai/sdk');
                const anthropic = new Anthropic({ apiKey });
                const msg = await anthropic.messages.create({
                    model: 'claude-sonnet-4-5-20250929',
                    max_tokens: 4096,
                    messages: [{ role: "user", content: `${systemPrompt}\n\n${userContent}` }],
                });
                responseText = msg.content[0].text;
            }

            return responseText;

        } catch (error) {
            throw new Error(`Failed to run AI analysis: ${error.message}`);
        }
    });
}

// Helper to sanitize and summarize HAR data for LLM Context
function summarizeHarForAi(harData) {
    if (!harData.log || !harData.log.entries) return { error: "Invalid HAR structure" };

    const entries = harData.log.entries.map(e => ({
        timestamp: e.startedDateTime,
        method: e.request.method,
        url: e.request.url,
        status: e.response.status,
        statusText: e.response.statusText,
        time: Math.round(e.time),
        requestHeaders: filterImportantHeaders(e.request.headers),
        responseHeaders: filterImportantHeaders(e.response.headers),
        // Include redirect URL if present
        redirectURL: e.response.redirectURL || undefined,
        // Include partial response body for errors
        errorDetails: (e.response.status >= 400 || e.response.status === 0) ?
            (e.response.content?.text?.slice(0, 500) || "No content") : undefined
    }));

    // If too many entries, take start, middle, and end, or just filters for errors + auth
    // For now, simple slice to prevent token overflow
    return {
        creator: harData.log.creator,
        entries: entries.slice(0, 80) // Limit to first 80 requests for context
    };
}

function filterImportantHeaders(headers) {
    const important = ['set-cookie', 'cookie', 'location', 'content-type', 'authorization', 'referer'];
    return headers.filter(h => important.includes(h.name.toLowerCase()))
        .map(h => `${h.name}: ${h.value.length > 100 ? h.value.substring(0, 100) + '...' : h.value}`);
}

module.exports = { registerFileHandlers };
module.exports = { registerFileHandlers };
