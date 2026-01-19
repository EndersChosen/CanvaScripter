/**
 * UTF-8 Checker - Validates UTF-8 encoding and identifies invalid characters
 * Provides detailed information about encoding issues and ability to fix them
 */

class UTF8Checker {
    constructor(options = {}) {
        this.options = {
            replacementChar: options.replacementChar || '\uFFFD', // Unicode replacement character
            maxIssues: options.maxIssues || 10000, // Limit issues to prevent memory issues
            ...options
        };
    }

    /**
     * Validate a buffer for UTF-8 encoding issues
     * @param {Buffer} buffer - The file buffer to validate
     * @returns {Object} Validation result with issues
     */
    validate(buffer) {
        const startTime = Date.now();
        const issues = [];
        let row = 1;
        let col = 1;
        let i = 0;
        let validBytes = 0;
        let invalidBytes = 0;

        while (i < buffer.length && issues.length < this.options.maxIssues) {
            const byte = buffer[i];
            const result = this.validateUtf8Sequence(buffer, i);

            if (result.valid) {
                validBytes += result.length;
                // Check for newlines to track row/col
                if (result.length === 1 && byte === 0x0A) { // LF
                    row++;
                    col = 1;
                } else if (result.length === 1 && byte === 0x0D) { // CR
                    // Check for CRLF
                    if (i + 1 < buffer.length && buffer[i + 1] === 0x0A) {
                        // CRLF - will handle LF on next iteration
                    }
                    col++;
                } else {
                    col++;
                }
                i += result.length;
            } else {
                invalidBytes++;
                issues.push({
                    row,
                    col,
                    byteOffset: i,
                    invalidByte: byte,
                    invalidByteHex: '0x' + byte.toString(16).toUpperCase().padStart(2, '0'),
                    description: result.description,
                    context: this.getContext(buffer, i, row, col)
                });
                col++;
                i++;
            }
        }

        const endTime = Date.now();
        const truncated = issues.length >= this.options.maxIssues;

        return {
            valid: issues.length === 0,
            encoding: this.detectBOM(buffer),
            totalBytes: buffer.length,
            validBytes,
            invalidBytes,
            issueCount: issues.length,
            truncated,
            issues,
            processingTime: endTime - startTime,
            stats: {
                rows: row,
                averageBytesPerRow: row > 0 ? Math.round(buffer.length / row) : 0
            }
        };
    }

    /**
     * Validate a UTF-8 sequence starting at position i
     */
    validateUtf8Sequence(buffer, i) {
        const byte = buffer[i];

        // ASCII (0x00-0x7F)
        if (byte <= 0x7F) {
            return { valid: true, length: 1 };
        }

        // Check for invalid start bytes
        if (byte >= 0x80 && byte <= 0xBF) {
            return { valid: false, length: 1, description: 'Unexpected continuation byte' };
        }

        if (byte >= 0xF8) {
            return { valid: false, length: 1, description: 'Invalid UTF-8 start byte (>= 0xF8)' };
        }

        // 2-byte sequence (0xC0-0xDF)
        if (byte >= 0xC0 && byte <= 0xDF) {
            if (byte <= 0xC1) {
                return { valid: false, length: 1, description: 'Overlong encoding (2-byte)' };
            }
            if (i + 1 >= buffer.length) {
                return { valid: false, length: 1, description: 'Truncated 2-byte sequence' };
            }
            const byte2 = buffer[i + 1];
            if ((byte2 & 0xC0) !== 0x80) {
                return { valid: false, length: 1, description: 'Invalid continuation byte in 2-byte sequence' };
            }
            return { valid: true, length: 2 };
        }

        // 3-byte sequence (0xE0-0xEF)
        if (byte >= 0xE0 && byte <= 0xEF) {
            if (i + 2 >= buffer.length) {
                return { valid: false, length: 1, description: 'Truncated 3-byte sequence' };
            }
            const byte2 = buffer[i + 1];
            const byte3 = buffer[i + 2];

            if ((byte2 & 0xC0) !== 0x80) {
                return { valid: false, length: 1, description: 'Invalid continuation byte 1 in 3-byte sequence' };
            }
            if ((byte3 & 0xC0) !== 0x80) {
                return { valid: false, length: 1, description: 'Invalid continuation byte 2 in 3-byte sequence' };
            }

            // Check for overlong encoding
            if (byte === 0xE0 && byte2 < 0xA0) {
                return { valid: false, length: 1, description: 'Overlong encoding (3-byte)' };
            }

            // Check for surrogate pairs (0xD800-0xDFFF)
            if (byte === 0xED && byte2 >= 0xA0) {
                return { valid: false, length: 1, description: 'UTF-16 surrogate pair in UTF-8' };
            }

            return { valid: true, length: 3 };
        }

        // 4-byte sequence (0xF0-0xF7)
        if (byte >= 0xF0 && byte <= 0xF7) {
            if (i + 3 >= buffer.length) {
                return { valid: false, length: 1, description: 'Truncated 4-byte sequence' };
            }
            const byte2 = buffer[i + 1];
            const byte3 = buffer[i + 2];
            const byte4 = buffer[i + 3];

            if ((byte2 & 0xC0) !== 0x80) {
                return { valid: false, length: 1, description: 'Invalid continuation byte 1 in 4-byte sequence' };
            }
            if ((byte3 & 0xC0) !== 0x80) {
                return { valid: false, length: 1, description: 'Invalid continuation byte 2 in 4-byte sequence' };
            }
            if ((byte4 & 0xC0) !== 0x80) {
                return { valid: false, length: 1, description: 'Invalid continuation byte 3 in 4-byte sequence' };
            }

            // Check for overlong encoding
            if (byte === 0xF0 && byte2 < 0x90) {
                return { valid: false, length: 1, description: 'Overlong encoding (4-byte)' };
            }

            // Check for code points > U+10FFFF
            if (byte === 0xF4 && byte2 > 0x8F) {
                return { valid: false, length: 1, description: 'Code point exceeds U+10FFFF' };
            }
            if (byte > 0xF4) {
                return { valid: false, length: 1, description: 'Code point exceeds U+10FFFF' };
            }

            return { valid: true, length: 4 };
        }

        return { valid: false, length: 1, description: 'Unknown invalid byte' };
    }

    /**
     * Detect BOM (Byte Order Mark)
     */
    detectBOM(buffer) {
        if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
            return { type: 'UTF-8', hasBOM: true, bomBytes: 3 };
        }
        if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
            return { type: 'UTF-16 BE', hasBOM: true, bomBytes: 2 };
        }
        if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
            if (buffer.length >= 4 && buffer[2] === 0x00 && buffer[3] === 0x00) {
                return { type: 'UTF-32 LE', hasBOM: true, bomBytes: 4 };
            }
            return { type: 'UTF-16 LE', hasBOM: true, bomBytes: 2 };
        }
        if (buffer.length >= 4 && buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0xFE && buffer[3] === 0xFF) {
            return { type: 'UTF-32 BE', hasBOM: true, bomBytes: 4 };
        }
        return { type: 'UTF-8 (assumed)', hasBOM: false, bomBytes: 0 };
    }

    /**
     * Get context around an invalid byte
     */
    getContext(buffer, position, row, col) {
        const contextBytes = 20;
        const start = Math.max(0, position - contextBytes);
        const end = Math.min(buffer.length, position + contextBytes + 1);

        // Try to decode surrounding bytes as UTF-8, replacing invalid with ?
        let before = '';
        let after = '';

        try {
            const beforeBuffer = buffer.slice(start, position);
            before = beforeBuffer.toString('utf8').replace(/[\x00-\x1F]/g, '.');
        } catch {
            before = '[binary]';
        }

        try {
            const afterBuffer = buffer.slice(position + 1, end);
            after = afterBuffer.toString('utf8').replace(/[\x00-\x1F]/g, '.');
        } catch {
            after = '[binary]';
        }

        return {
            before: before.slice(-15),
            after: after.slice(0, 15),
            linePreview: this.getLinePreview(buffer, position)
        };
    }

    /**
     * Get preview of the line containing the issue
     */
    getLinePreview(buffer, position) {
        // Find line start
        let lineStart = position;
        while (lineStart > 0 && buffer[lineStart - 1] !== 0x0A) {
            lineStart--;
        }

        // Find line end
        let lineEnd = position;
        while (lineEnd < buffer.length && buffer[lineEnd] !== 0x0A && buffer[lineEnd] !== 0x0D) {
            lineEnd++;
        }

        // Extract line (max 100 chars)
        const maxLen = 100;
        const lineBuffer = buffer.slice(lineStart, Math.min(lineEnd, lineStart + maxLen));
        let line = '';

        try {
            line = lineBuffer.toString('utf8');
        } catch {
            // If UTF-8 decode fails, show hex
            line = '[Binary data]';
        }

        return {
            content: line,
            highlightPosition: position - lineStart,
            truncated: lineEnd - lineStart > maxLen
        };
    }

    /**
     * Fix invalid UTF-8 by replacing invalid bytes
     * @param {Buffer} buffer - Original buffer
     * @param {string} replacementMode - 'replace' (use replacement char), 'remove', or 'escape'
     * @returns {Buffer} Fixed buffer
     */
    fix(buffer, replacementMode = 'replace') {
        const fixedParts = [];
        let i = 0;
        let fixedCount = 0;

        while (i < buffer.length) {
            const byte = buffer[i];
            const result = this.validateUtf8Sequence(buffer, i);

            if (result.valid) {
                fixedParts.push(buffer.slice(i, i + result.length));
                i += result.length;
            } else {
                fixedCount++;
                switch (replacementMode) {
                    case 'remove':
                        // Skip the byte entirely
                        break;
                    case 'escape':
                        // Replace with hex escape sequence
                        fixedParts.push(Buffer.from(`\\x${byte.toString(16).padStart(2, '0')}`));
                        break;
                    case 'replace':
                    default:
                        // Replace with Unicode replacement character
                        fixedParts.push(Buffer.from(this.options.replacementChar, 'utf8'));
                        break;
                }
                i++;
            }
        }

        return {
            buffer: Buffer.concat(fixedParts),
            fixedCount
        };
    }

    /**
     * Analyze file for common encoding issues
     */
    analyzeEncodingIssues(buffer) {
        const analysis = {
            possibleEncodings: [],
            commonIssues: [],
            recommendations: []
        };

        // Check for null bytes (binary file indicator)
        let nullCount = 0;
        for (let i = 0; i < Math.min(buffer.length, 8192); i++) {
            if (buffer[i] === 0x00) nullCount++;
        }
        if (nullCount > 10) {
            analysis.commonIssues.push({
                type: 'binary',
                description: 'File appears to contain binary data (many null bytes)'
            });
        }

        // Check for high byte frequency (Latin-1, Windows-1252 indicator)
        let highByteCount = 0;
        let latin1Chars = 0;
        for (let i = 0; i < Math.min(buffer.length, 8192); i++) {
            const byte = buffer[i];
            if (byte >= 0x80 && byte <= 0xFF) {
                highByteCount++;
                // Common Windows-1252 characters
                if ([0x80, 0x82, 0x83, 0x84, 0x85, 0x86, 0x91, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97].includes(byte)) {
                    latin1Chars++;
                }
            }
        }

        if (latin1Chars > 5) {
            analysis.possibleEncodings.push('Windows-1252');
            analysis.commonIssues.push({
                type: 'encoding',
                description: 'File may be Windows-1252/CP1252 encoded, not UTF-8'
            });
            analysis.recommendations.push('Consider re-saving the file as UTF-8 from its source application');
        }

        if (highByteCount > 0 && latin1Chars === 0) {
            analysis.possibleEncodings.push('ISO-8859-1 (Latin-1)');
        }

        // Detect encoding
        const bom = this.detectBOM(buffer);
        if (bom.hasBOM && bom.type !== 'UTF-8') {
            analysis.commonIssues.push({
                type: 'encoding',
                description: `File has ${bom.type} BOM - not UTF-8`
            });
            analysis.recommendations.push(`Convert from ${bom.type} to UTF-8`);
        }

        return analysis;
    }

    /**
     * Static method to validate a file
     */
    static async validateFile(filePath) {
        const fs = require('fs');
        const path = require('path');

        const buffer = fs.readFileSync(filePath);
        const checker = new UTF8Checker();
        const result = checker.validate(buffer);
        const analysis = checker.analyzeEncodingIssues(buffer);

        return {
            ...result,
            analysis,
            file: {
                path: filePath,
                name: path.basename(filePath),
                size: buffer.length
            }
        };
    }

    /**
     * Static method to fix a file
     */
    static async fixFile(filePath, replacementMode = 'replace') {
        const fs = require('fs');

        const buffer = fs.readFileSync(filePath);
        const checker = new UTF8Checker();
        const result = checker.fix(buffer, replacementMode);

        return {
            fixedBuffer: result.buffer,
            fixedCount: result.fixedCount,
            originalSize: buffer.length,
            newSize: result.buffer.length
        };
    }
}

module.exports = { UTF8Checker };
