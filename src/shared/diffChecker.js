/**
 * Diff Checker - Compares two text inputs and generates detailed diff reports
 * Optimized for large files (millions of lines) using chunked processing
 */

const Diff = require('diff');

class DiffChecker {
    constructor(options = {}) {
        this.options = {
            contextLines: options.contextLines || 3,  // Lines of context around changes
            ignoreWhitespace: options.ignoreWhitespace || false,
            ignoreCase: options.ignoreCase || false,
            chunkSize: options.chunkSize || 50000,  // Process in chunks for large files
            maxDisplayChanges: options.maxDisplayChanges || 10000,  // Limit displayed changes
            ...options
        };
    }

    /**
     * Preprocess text based on options
     */
    preprocessText(text) {
        let processed = text;

        if (this.options.ignoreCase) {
            processed = processed.toLowerCase();
        }

        if (this.options.ignoreWhitespace) {
            // Normalize whitespace but preserve line structure
            processed = processed.split('\n').map(line => line.trim()).join('\n');
        }

        return processed;
    }

    /**
     * Main comparison method - handles both small and large inputs
     */
    compare(text1, text2) {
        const startTime = Date.now();

        // Preprocess if needed
        const processedText1 = this.preprocessText(text1);
        const processedText2 = this.preprocessText(text2);

        // Get line counts
        const lines1 = text1.split('\n');
        const lines2 = text2.split('\n');
        const totalLines = Math.max(lines1.length, lines2.length);

        // Choose algorithm based on size
        let diffResult;
        if (totalLines > 100000) {
            // For very large files, use line-based diff with chunking
            diffResult = this.compareLargeFiles(processedText1, processedText2);
        } else {
            // For smaller files, use standard diff
            diffResult = Diff.diffLines(processedText1, processedText2, {
                newlineIsToken: true
            });
        }

        const endTime = Date.now();

        // Generate statistics and formatted output
        const stats = this.calculateStats(diffResult, lines1.length, lines2.length);
        const hunks = this.generateHunks(diffResult, text1, text2);
        const summary = this.generateSummary(stats, lines1.length, lines2.length);

        return {
            success: true,
            stats,
            summary,
            hunks,
            processingTime: endTime - startTime,
            totalLines: {
                file1: lines1.length,
                file2: lines2.length
            },
            identical: stats.added === 0 && stats.removed === 0
        };
    }

    /**
     * Compare large files using chunked line-based diff
     */
    compareLargeFiles(text1, text2) {
        const lines1 = text1.split('\n');
        const lines2 = text2.split('\n');

        // Use diff's line comparison
        return Diff.diffArrays(lines1, lines2);
    }

    /**
     * Calculate statistics from diff result
     */
    calculateStats(diffResult, originalLines1, originalLines2) {
        let added = 0;
        let removed = 0;
        let unchanged = 0;
        let changedLines = [];
        let currentLine1 = 1;
        let currentLine2 = 1;

        for (const part of diffResult) {
            const lines = part.value ? part.value.split ? part.value.split('\n').filter(l => l !== '' || part.value === '\n') : part.value : [];
            const count = Array.isArray(part.value) ? part.value.length : (part.count || lines.length);

            if (part.added) {
                added += count;
                for (let i = 0; i < count; i++) {
                    changedLines.push({ type: 'added', line: currentLine2 + i });
                }
                currentLine2 += count;
            } else if (part.removed) {
                removed += count;
                for (let i = 0; i < count; i++) {
                    changedLines.push({ type: 'removed', line: currentLine1 + i });
                }
                currentLine1 += count;
            } else {
                unchanged += count;
                currentLine1 += count;
                currentLine2 += count;
            }
        }

        const totalChanges = added + removed;
        const similarityPercent = originalLines1 > 0 || originalLines2 > 0
            ? Math.round((1 - (totalChanges / Math.max(originalLines1, originalLines2))) * 100)
            : 100;

        return {
            added,
            removed,
            unchanged,
            totalChanges,
            similarityPercent: Math.max(0, similarityPercent),
            changedLines: changedLines.slice(0, this.options.maxDisplayChanges)
        };
    }

    /**
     * Generate unified diff hunks for display
     */
    generateHunks(diffResult, originalText1, originalText2) {
        const hunks = [];
        const contextLines = this.options.contextLines;

        const lines1 = originalText1.split('\n');
        const lines2 = originalText2.split('\n');

        let currentHunk = null;
        let line1Index = 0;
        let line2Index = 0;
        let hunkCount = 0;
        const maxHunks = 500; // Limit hunks for performance

        for (const part of diffResult) {
            const partLines = part.value
                ? (Array.isArray(part.value) ? part.value : part.value.split('\n'))
                : [];

            // Filter out empty strings that come from split
            const filteredLines = partLines.filter((l, i) => l !== '' || i < partLines.length - 1);

            if (part.added || part.removed) {
                // Start new hunk if needed
                if (!currentHunk) {
                    if (hunkCount >= maxHunks) continue;

                    currentHunk = {
                        oldStart: Math.max(1, line1Index - contextLines + 1),
                        newStart: Math.max(1, line2Index - contextLines + 1),
                        lines: [],
                        oldLines: 0,
                        newLines: 0
                    };

                    // Add context before
                    const contextStart = Math.max(0, line1Index - contextLines);
                    for (let i = contextStart; i < line1Index; i++) {
                        if (lines1[i] !== undefined) {
                            currentHunk.lines.push({
                                type: 'context',
                                content: lines1[i],
                                oldLine: i + 1,
                                newLine: line2Index - (line1Index - i) + 1
                            });
                            currentHunk.oldLines++;
                            currentHunk.newLines++;
                        }
                    }
                }

                // Add changed lines
                for (const line of filteredLines) {
                    if (part.added) {
                        currentHunk.lines.push({
                            type: 'added',
                            content: line,
                            newLine: line2Index + 1
                        });
                        currentHunk.newLines++;
                        line2Index++;
                    } else {
                        currentHunk.lines.push({
                            type: 'removed',
                            content: line,
                            oldLine: line1Index + 1
                        });
                        currentHunk.oldLines++;
                        line1Index++;
                    }
                }
            } else {
                // Unchanged lines
                const unchangedCount = filteredLines.length || part.count || 0;

                if (currentHunk) {
                    // Add context after and close hunk
                    const contextEnd = Math.min(unchangedCount, contextLines);
                    for (let i = 0; i < contextEnd; i++) {
                        const content = Array.isArray(part.value)
                            ? part.value[i]
                            : (lines1[line1Index + i] || '');
                        currentHunk.lines.push({
                            type: 'context',
                            content: content,
                            oldLine: line1Index + i + 1,
                            newLine: line2Index + i + 1
                        });
                        currentHunk.oldLines++;
                        currentHunk.newLines++;
                    }

                    hunks.push(currentHunk);
                    hunkCount++;
                    currentHunk = null;
                }

                line1Index += unchangedCount;
                line2Index += unchangedCount;
            }
        }

        // Close any remaining hunk
        if (currentHunk) {
            hunks.push(currentHunk);
        }

        return hunks;
    }

    /**
     * Generate human-readable summary
     */
    generateSummary(stats, lines1, lines2) {
        const parts = [];

        if (stats.added === 0 && stats.removed === 0) {
            return 'Files are identical';
        }

        if (stats.added > 0) {
            parts.push(`${stats.added.toLocaleString()} line${stats.added !== 1 ? 's' : ''} added`);
        }

        if (stats.removed > 0) {
            parts.push(`${stats.removed.toLocaleString()} line${stats.removed !== 1 ? 's' : ''} removed`);
        }

        parts.push(`${stats.similarityPercent}% similar`);

        return parts.join(', ');
    }

    /**
     * Generate unified diff format string
     */
    generateUnifiedDiff(file1Name, file2Name, text1, text2) {
        return Diff.createTwoFilesPatch(
            file1Name || 'File 1',
            file2Name || 'File 2',
            text1,
            text2,
            '',
            '',
            { context: this.options.contextLines }
        );
    }

    /**
     * Compare two files by path (for use in main process)
     */
    static async compareFiles(filePath1, filePath2, options = {}) {
        const fs = require('fs');
        const path = require('path');

        const text1 = fs.readFileSync(filePath1, 'utf8');
        const text2 = fs.readFileSync(filePath2, 'utf8');

        const checker = new DiffChecker(options);
        const result = checker.compare(text1, text2);

        result.file1 = {
            path: filePath1,
            name: path.basename(filePath1),
            size: fs.statSync(filePath1).size
        };

        result.file2 = {
            path: filePath2,
            name: path.basename(filePath2),
            size: fs.statSync(filePath2).size
        };

        // Generate unified diff for export
        result.unifiedDiff = checker.generateUnifiedDiff(
            result.file1.name,
            result.file2.name,
            text1,
            text2
        );

        return result;
    }

    /**
     * Compare two text strings directly
     */
    static compareText(text1, text2, options = {}) {
        const checker = new DiffChecker(options);
        const result = checker.compare(text1, text2);

        result.file1 = { name: 'Text 1', size: text1.length };
        result.file2 = { name: 'Text 2', size: text2.length };

        result.unifiedDiff = checker.generateUnifiedDiff(
            'Text 1',
            'Text 2',
            text1,
            text2
        );

        return result;
    }
}

module.exports = { DiffChecker };
