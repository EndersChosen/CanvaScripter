const fs = require('fs');
const path = require('path');

/**
 * Analyzes a CSV file and determines a wildcard pattern that matches all emails
 * @param {string} fileContent - Content of the CSV file
 * @param {number} emailColumnIndex - Index of the column containing emails (0-based, default: 4 for 'Path' column)
 * @returns {Object} - Object containing the pattern and analysis details
 */
function analyzeEmailPattern(fileContent, emailColumnIndex = 4) {
    try {
        const lines = fileContent.split('\n').filter(line => line.trim());

        // Skip header row
        const dataLines = lines.slice(1);

        const emails = [];
        const domains = new Set();
        const subdomains = new Set();

        // Extract emails from the specified column
        for (const line of dataLines) {
            const columns = parseCSVLine(line);
            if (columns[emailColumnIndex]) {
                const email = columns[emailColumnIndex].trim();
                if (isValidEmail(email)) {
                    emails.push(email);

                    // Extract domain parts
                    const [username, domain] = email.split('@');
                    domains.add(domain);

                    // Extract subdomain pattern
                    const domainParts = domain.split('.');
                    if (domainParts.length > 2) {
                        // Has subdomain
                        const subdomain = domainParts.slice(0, -2).join('.');
                        const baseDomain = domainParts.slice(-2).join('.');
                        subdomains.add(`${subdomain ? subdomain + '.' : ''}${baseDomain}`);
                    } else {
                        // No subdomain
                        subdomains.add(domain);
                    }
                }
            }
        }

        if (emails.length === 0) {
            return {
                success: false,
                error: 'No valid emails found in the specified column',
                pattern: null,
                details: null
            };
        }

        // Analyze patterns
        const pattern = generateWildcardPattern(Array.from(domains));

        // return {
        //     success: true,
        //     pattern: pattern,
        //     details: {
        //         totalEmails: emails.length,
        //         uniqueDomains: Array.from(domains),
        //         domainCount: domains.size,
        //         sampleEmails: emails.slice(0, 5), // First 5 emails as examples
        //         generatedPattern: pattern
        //     }
        // };
        return pattern;

    } catch (error) {
        return {
            success: false,
            error: error.message,
            pattern: null,
            details: null
        };
    }
}

/**
 * Generates a wildcard pattern that matches all provided domains
 * @param {Array} domains - Array of email domains
 * @returns {string} - Wildcard pattern
 */
function generateWildcardPattern(domains) {
    if (domains.length === 0) return '*@*';

    // Find common suffix
    const commonSuffix = findCommonSuffix(domains);

    if (commonSuffix && commonSuffix.length > 0) {
        // Check if all domains have the same base domain
        const baseDomains = domains.map(domain => {
            const parts = domain.split('.');
            return parts.slice(-2).join('.');
        });

        const uniqueBaseDomains = [...new Set(baseDomains)];

        if (uniqueBaseDomains.length === 1) {
            // All emails share the same base domain
            const baseDomain = uniqueBaseDomains[0];

            // Check for subdomain patterns
            const hasSubdomains = domains.some(domain => domain !== baseDomain);
            const hasNoSubdomains = domains.some(domain => domain === baseDomain);

            if (hasSubdomains && hasNoSubdomains) {
                // Mixed: some with subdomains, some without
                return `*@*.${baseDomain}`;
            } else if (hasSubdomains) {
                // All have subdomains
                const subdomainParts = domains.map(domain => {
                    return domain.replace(`.${baseDomain}`, '');
                });

                // Check if all subdomains are the same
                const uniqueSubdomains = [...new Set(subdomainParts)];
                if (uniqueSubdomains.length === 1) {
                    return `*@${uniqueSubdomains[0]}.${baseDomain}`;
                } else {
                    return `*@*.${baseDomain}`;
                }
            } else {
                // No subdomains
                return `*@${baseDomain}`;
            }
        }
    }

    // Fallback: create pattern that matches all unique domains
    if (domains.length === 1) {
        return `*@${domains[0]}`;
    } else {
        // Multiple different domains - use most general pattern
        return '*@*';
    }
}

/**
 * Finds the common suffix among an array of strings
 * @param {Array} strings - Array of strings
 * @returns {string} - Common suffix
 */
function findCommonSuffix(strings) {
    if (strings.length === 0) return '';
    if (strings.length === 1) return strings[0];

    let suffix = '';
    const minLength = Math.min(...strings.map(s => s.length));

    for (let i = 1; i <= minLength; i++) {
        const char = strings[0][strings[0].length - i];
        if (strings.every(s => s[s.length - i] === char)) {
            suffix = char + suffix;
        } else {
            break;
        }
    }

    return suffix;
}

/**
 * Simple email validation
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Parse a CSV line handling quoted fields
 * @param {string} line - CSV line
 * @returns {Array} - Array of column values
 */
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"' && (i === 0 || line[i - 1] === ',')) {
            inQuotes = true;
        } else if (char === '"' && inQuotes && (i === line.length - 1 || line[i + 1] === ',')) {
            inQuotes = false;
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

module.exports = {
    analyzeEmailPattern,
    generateWildcardPattern
};