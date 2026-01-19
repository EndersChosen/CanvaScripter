const path = require('path');
const ExcelJS = require('exceljs');

const EMAIL_REGEX = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
const EMAIL_HEADER_CANDIDATES = new Set(['path', 'email', 'email_address', 'communication_channel_path', 'address']);

function parseCSVRow(row) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') {
            if (inQuotes && row[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current.trim());
    return result;
}

function tryExtractEmail(value, collector) {
    if (!value) return;
    const normalized = String(value).trim();
    if (!normalized) return;
    if (!normalized.includes('@')) return;
    const match = normalized.match(EMAIL_REGEX);
    if (match) collector.add(match[1]);
}

function parseEmailsFromCSV(csvContent) {
    if (!csvContent) return [];
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return [];

    const collector = new Set();
    const headerRow = parseCSVRow(lines[0]);
    const lowerHeaders = headerRow.map(h => h.toLowerCase());
    const targetIndex = lowerHeaders.findIndex(header => EMAIL_HEADER_CANDIDATES.has(header));

    for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
        const row = parseCSVRow(lines[lineIndex]);
        if (targetIndex >= 0) {
            tryExtractEmail(row[targetIndex], collector);
        } else {
            for (const cell of row) {
                tryExtractEmail(cell, collector);
            }
        }
    }

    return Array.from(collector);
}

function normalizeBuffer(input) {
    if (!input) return null;
    if (Buffer.isBuffer(input)) return input;
    if (input instanceof ArrayBuffer) return Buffer.from(input);
    if (ArrayBuffer.isView(input)) {
        return Buffer.from(input.buffer, input.byteOffset, input.byteLength);
    }
    throw new Error('Unsupported buffer type provided for Excel parsing.');
}

async function loadWorkbook({ buffer, filePath }) {
    const workbook = new ExcelJS.Workbook();

    if (filePath) {
        if (path.extname(filePath).toLowerCase() === '.xls') {
            throw new Error('Legacy .xls files are not supported. Please convert the file to .xlsx.');
        }
        await workbook.xlsx.readFile(filePath);
        return workbook;
    }

    if (!buffer) {
        throw new Error('No Excel data provided.');
    }

    const normalized = normalizeBuffer(buffer);
    await workbook.xlsx.load(normalized);
    return workbook;
}

function extractEmailsFromWorksheet(worksheet) {
    if (!worksheet) return [];

    const collector = new Set();
    let headerProcessed = false;
    let targetIndex = -1;

    worksheet.eachRow({ includeEmpty: false }, (row) => {
        const values = row.values.slice(1).map(value => (value == null ? '' : String(value).trim()));
        if (!headerProcessed) {
            const lowerHeaders = values.map(value => value.toLowerCase());
            targetIndex = lowerHeaders.findIndex(header => EMAIL_HEADER_CANDIDATES.has(header));
            headerProcessed = true;
            if (targetIndex >= 0) {
                return;
            }
        }

        if (targetIndex >= 0 && values[targetIndex]) {
            tryExtractEmail(values[targetIndex], collector);
        } else {
            for (const cell of values) {
                tryExtractEmail(cell, collector);
            }
        }
    });

    return Array.from(collector);
}

async function parseEmailsFromExcel({ buffer = null, filePath = null } = {}) {
    const workbook = await loadWorkbook({ buffer, filePath });
    const worksheet = workbook.worksheets[0];
    return extractEmailsFromWorksheet(worksheet);
}

async function parseEmailsFromExcelFile(filePath) {
    return parseEmailsFromExcel({ filePath });
}

module.exports = {
    parseEmailsFromCSV,
    parseEmailsFromCSVContent: parseEmailsFromCSV,
    parseEmailsFromExcel,
    parseEmailsFromExcelFile,
    parseEmailsFromExcelBuffer: (buffer) => parseEmailsFromExcel({ buffer })
};
