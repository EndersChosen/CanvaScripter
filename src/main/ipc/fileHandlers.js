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
 * Classify a MIME type string into a human-readable resource category.
 * @param {string} mimeType
 * @returns {string}
 */
function classifyMimeType(mimeType) {
    if (!mimeType) return 'Other';
    const m = mimeType.toLowerCase();
    if (m.includes('html')) return 'Document';
    if (m.includes('javascript') || m.includes('ecmascript')) return 'Script';
    if (m.includes('css')) return 'Stylesheet';
    if (m.startsWith('image/')) return 'Image';
    if (m.includes('font') || m.includes('woff')) return 'Font';
    if (m.startsWith('video/') || m.startsWith('audio/')) return 'Media';
    if (m.includes('json') || m.includes('xml') || m.includes('form')) return 'XHR/Fetch';
    return 'Other';
}

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

    // HAR parse — returns a clean, flat representation of the HAR file
    // for the user to browse and analyse themselves.
    ipcMain.handle('har:analyze', async (event, filePath) => {
        try {
            if (!isAllowedPath(allowedReadPaths, event.sender.id, filePath)) {
                throw new Error('Access denied: HAR file was not selected via dialog');
            }
            const harContent = fs.readFileSync(filePath, 'utf8');
            const harData = JSON.parse(harContent);

            const log = harData.log || {};
            const rawEntries = log.entries || [];
            const rawPages = log.pages || [];

            // Flatten each entry into a simple object
            const entries = rawEntries.map((entry, i) => {
                const req = entry.request || {};
                const res = entry.response || {};
                const mimeType = ((res.content && res.content.mimeType) || res.mimeType || '').split(';')[0].trim();

                return {
                    id: i + 1,
                    startedDateTime: entry.startedDateTime || null,
                    pageref: entry.pageref || null,
                    method: req.method || '',
                    url: req.url || '',
                    status: res.status || 0,
                    statusText: res.statusText || '',
                    mimeType,
                    resourceType: classifyMimeType(mimeType),
                    contentSize: (res.content && res.content.size != null) ? res.content.size : -1,
                    transferSize: res.bodySize != null ? res.bodySize : -1,
                    time: Math.round(entry.time || 0),
                };
            });

            const pages = rawPages.map(p => ({
                id: p.id,
                title: p.title || '',
                startedDateTime: p.startedDateTime || null,
            }));

            // Derive user-agent from the first entry's request headers
            let userAgent = null;
            if (rawEntries.length > 0) {
                const reqHeaders = rawEntries[0].request && rawEntries[0].request.headers || [];
                const uaHeader = reqHeaders.find(h => h.name.toLowerCase() === 'user-agent');
                if (uaHeader) userAgent = uaHeader.value;
            }

            return {
                summary: {
                    totalRequests: entries.length,
                    totalPages: pages.length,
                    creator: (log.creator && log.creator.name) ? log.creator.name : null,
                    startTime: rawEntries.length > 0 ? rawEntries[0].startedDateTime : null,
                    endTime: rawEntries.length > 0 ? rawEntries[rawEntries.length - 1].startedDateTime : null,
                    userAgent,
                },
                pages,
                entries,
            };
        } catch (error) {
            throw new Error(`Failed to parse HAR file: ${error.message}`);
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
                    'gpt-5-nano': 'gpt-5-nano',
                    'gpt-5.2-pro': 'gpt-5.2-pro'
                };
                const targetModel = modelMapper[model] || 'gpt-5-nano';

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
                    'claude-haiku-4.5': 'claude-haiku-4-5-20251001',
                    'claude-sonnet-4-6': 'claude-sonnet-4-6'
                };
                const targetModel = modelMapper[model] || 'claude-sonnet-4-6';

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

    // Reset courses — shows a file picker and returns a list of numeric course IDs.
    // Supports plain text (one ID per line or comma-separated) and CSV files.
    // For CSV: prefers 'canvas_course_id' column, falls back to 'course_id'.
    // Single-column files with no recognised header are treated as raw ID lists.
    // Throws a descriptive Error on parse problems so the renderer can display it.
    ipcMain.handle('fileUpload:resetCourses', async (event) => {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openFile'],
            filters: [
                { name: 'Text/CSV Files', extensions: ['txt', 'csv'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });

        if (result.canceled || !result.filePaths.length) {
            return [];
        }

        const filePath = result.filePaths[0];
        rememberPath(allowedReadPaths, event.sender.id, filePath);

        // Strip UTF-8 BOM if present
        let fileContent = await fs.promises.readFile(filePath, 'utf8');
        if (fileContent.charCodeAt(0) === 0xFEFF) fileContent = fileContent.slice(1);

        const lines = fileContent.split(/\r?\n|\r/).map(l => l.trim()).filter(l => l.length > 0);

        if (lines.length === 0) return [];

        // Helper: strip surrounding double-quotes from a CSV cell value
        const unquote = v => v.trim().replace(/^"|"$/g, '');

        // Helper: validate that every value is a positive integer
        const validateIntegers = (values, columnName) => {
            const invalid = values.filter(v => {
                const n = Number(v);
                return !Number.isInteger(n) || n <= 0;
            });
            if (invalid.length > 0) {
                const preview = invalid.slice(0, 5).join(', ');
                const suffix = invalid.length > 5 ? ` … (${invalid.length} total)` : '';
                const col = columnName ? ` in column '${columnName}'` : '';
                throw new Error(`Non-integer course IDs found${col}: ${preview}${suffix}`);
            }
        };

        const isCsv = filePath.toLowerCase().endsWith('.csv') || lines[0].includes(',');

        if (!isCsv) {
            // Plain text: one ID per line
            const courses = lines.map(l => l.trim()).filter(v => v.length > 0);
            validateIntegers(courses);
            return courses;
        }

        // --- CSV handling ---
        const headers = lines[0].split(',').map(h => unquote(h).toLowerCase());

        const canvasIdIdx = headers.indexOf('canvas_course_id');
        const courseIdIdx = headers.indexOf('course_id');

        if (canvasIdIdx !== -1 || courseIdIdx !== -1) {
            // Known header found — use canvas_course_id preferentially
            const colIdx = canvasIdIdx !== -1 ? canvasIdIdx : courseIdIdx;
            const colName = canvasIdIdx !== -1 ? 'canvas_course_id' : 'course_id';

            const courses = lines.slice(1)
                .map(l => unquote(l.split(',')[colIdx] || ''))
                .filter(v => v.length > 0);

            validateIntegers(courses, colName);
            return courses;
        }

        if (headers.length === 1) {
            // Single-column file with no recognised header — treat all rows as IDs
            const courses = lines.map(l => unquote(l)).filter(v => v.length > 0);
            validateIntegers(courses);
            return courses;
        }

        // Multi-column CSV with no recognised header
        throw new Error(
            `Could not find a course ID column. Expected a header named 'canvas_course_id' or 'course_id' ` +
            `(found: ${headers.slice(0, 5).join(', ')}${headers.length > 5 ? ', …' : ''}).`
        );
    });

    // Restore courses — shows a file picker and returns a list of numeric course IDs.
    // Uses the same parsing logic as fileUpload:resetCourses.
    ipcMain.handle('fileUpload:restoreCourses', async (event) => {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openFile'],
            filters: [
                { name: 'Text/CSV Files', extensions: ['txt', 'csv'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });

        if (result.canceled || !result.filePaths.length) {
            return [];
        }

        const filePath = result.filePaths[0];
        rememberPath(allowedReadPaths, event.sender.id, filePath);

        let fileContent = await fs.promises.readFile(filePath, 'utf8');
        if (fileContent.charCodeAt(0) === 0xFEFF) fileContent = fileContent.slice(1);

        const lines = fileContent.split(/\r?\n|\r/).map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length === 0) return [];

        const unquote = v => v.trim().replace(/^"|"$/g, '');

        const validateIntegers = (values, columnName) => {
            const invalid = values.filter(v => {
                const n = Number(v);
                return !Number.isInteger(n) || n <= 0;
            });
            if (invalid.length > 0) {
                const preview = invalid.slice(0, 5).join(', ');
                const suffix = invalid.length > 5 ? ` … (${invalid.length} total)` : '';
                const col = columnName ? ` in column '${columnName}'` : '';
                throw new Error(`Non-integer course IDs found${col}: ${preview}${suffix}`);
            }
        };

        const isCsv = filePath.toLowerCase().endsWith('.csv') || lines[0].includes(',');

        if (!isCsv) {
            const courses = lines.map(l => l.trim()).filter(v => v.length > 0);
            validateIntegers(courses);
            return courses;
        }

        const headers = lines[0].split(',').map(h => unquote(h).toLowerCase());
        const canvasIdIdx = headers.indexOf('canvas_course_id');
        const courseIdIdx = headers.indexOf('course_id');

        if (canvasIdIdx !== -1 || courseIdIdx !== -1) {
            const colIdx = canvasIdIdx !== -1 ? canvasIdIdx : courseIdIdx;
            const colName = canvasIdIdx !== -1 ? 'canvas_course_id' : 'course_id';
            const courses = lines.slice(1)
                .map(l => unquote(l.split(',')[colIdx] || ''))
                .filter(v => v.length > 0);
            validateIntegers(courses, colName);
            return courses;
        }

        if (headers.length === 1) {
            const courses = lines.map(l => unquote(l)).filter(v => v.length > 0);
            validateIntegers(courses);
            return courses;
        }

        throw new Error(
            `Could not find a course ID column. Expected a header named 'canvas_course_id' or 'course_id' ` +
            `(found: ${headers.slice(0, 5).join(', ')}${headers.length > 5 ? ', …' : ''}).`
        );
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
            const emails = await parsers.parseEmailsFromExcel({ buffer: fileBuffer, filePath });
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

    // ============================================
    // Diff Checker Handlers
    // ============================================

    // Select file for diff comparison
    ipcMain.handle('diff:selectFile', async (event) => {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openFile'],
            filters: [
                { name: 'All Files', extensions: ['*'] },
                { name: 'Text Files', extensions: ['txt', 'log', 'md', 'json', 'xml', 'csv', 'html', 'css', 'js', 'ts', 'py', 'java', 'c', 'cpp', 'h'] }
            ]
        });

        if (result.canceled) return { canceled: true };

        const filePath = result.filePaths[0];
        rememberPath(allowedReadPaths, event.sender.id, filePath);

        const stats = fs.statSync(filePath);
        return {
            canceled: false,
            filePath,
            fileName: path.basename(filePath),
            fileSize: stats.size
        };
    });

    // Compare two files
    ipcMain.handle('diff:compareFiles', async (event, { file1Path, file2Path, options }) => {
        // Validate both paths are allowed
        if (!isAllowedPath(allowedReadPaths, event.sender.id, file1Path)) {
            throw new Error('Access denied: File 1 was not selected via dialog');
        }
        if (!isAllowedPath(allowedReadPaths, event.sender.id, file2Path)) {
            throw new Error('Access denied: File 2 was not selected via dialog');
        }

        const { DiffChecker } = require('../../shared/diffChecker');
        return await DiffChecker.compareFiles(file1Path, file2Path, options);
    });

    // Compare two text strings
    ipcMain.handle('diff:compareText', async (event, { text1, text2, options }) => {
        const { DiffChecker } = require('../../shared/diffChecker');
        return DiffChecker.compareText(text1, text2, options);
    });

    // Export diff to file
    ipcMain.handle('diff:exportDiff', async (event, diffContent) => {
        const result = await dialog.showSaveDialog(mainWindow, {
            title: 'Export Diff',
            defaultPath: 'diff-output.patch',
            filters: [
                { name: 'Patch Files', extensions: ['patch', 'diff'] },
                { name: 'Text Files', extensions: ['txt'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });

        if (result.canceled) return { canceled: true };

        const savePath = result.filePath;
        rememberPath(allowedWritePaths, event.sender.id, savePath);
        fs.writeFileSync(savePath, diffContent, 'utf8');

        return { canceled: false, filePath: savePath };
    });

    // ============================================
    // UTF-8 Checker Handlers
    // ============================================

    // Select file for UTF-8 validation
    ipcMain.handle('utf8:selectFile', async (event) => {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openFile'],
            filters: [
                { name: 'Text Files', extensions: ['txt', 'csv', 'json', 'xml', 'html', 'css', 'js', 'ts', 'md', 'log', 'yml', 'yaml'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });

        if (result.canceled) return { canceled: true };

        const filePath = result.filePaths[0];
        rememberPath(allowedReadPaths, event.sender.id, filePath);

        const stats = fs.statSync(filePath);
        return {
            canceled: false,
            filePath,
            fileName: path.basename(filePath),
            fileSize: stats.size
        };
    });

    // Validate file for UTF-8 encoding
    ipcMain.handle('utf8:validate', async (event, filePath) => {
        if (!isAllowedPath(allowedReadPaths, event.sender.id, filePath)) {
            throw new Error('Access denied: File was not selected via dialog');
        }

        const { UTF8Checker } = require('../../shared/utf8Checker');
        return await UTF8Checker.validateFile(filePath);
    });

    // Fix UTF-8 encoding issues and save
    ipcMain.handle('utf8:fix', async (event, { filePath, mode }) => {
        if (!isAllowedPath(allowedReadPaths, event.sender.id, filePath)) {
            throw new Error('Access denied: File was not selected via dialog');
        }

        const { UTF8Checker } = require('../../shared/utf8Checker');
        const fixResult = await UTF8Checker.fixFile(filePath, mode);

        // Ask user where to save
        const originalName = path.basename(filePath);
        const ext = path.extname(originalName);
        const baseName = path.basename(originalName, ext);

        const saveResult = await dialog.showSaveDialog(mainWindow, {
            title: 'Save Fixed File',
            defaultPath: `${baseName}_fixed${ext}`,
            filters: [
                { name: 'Same Type', extensions: [ext.slice(1) || 'txt'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });

        if (saveResult.canceled) return { canceled: true };

        const savePath = saveResult.filePath;
        rememberPath(allowedWritePaths, event.sender.id, savePath);
        fs.writeFileSync(savePath, fixResult.fixedBuffer);

        return {
            canceled: false,
            filePath: savePath,
            fixedCount: fixResult.fixedCount,
            originalSize: fixResult.originalSize,
            newSize: fixResult.newSize
        };
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
