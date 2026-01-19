// Test script for CSV parsing functionality
const fs = require('fs');
const path = require('path');

function parseCSVRow(row) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
        const char = row[i];

        if (char === '"') {
            if (inQuotes && row[i + 1] === '"') {
                // Escaped quote
                current += '"';
                i++; // Skip next quote
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // End of field
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    // Add the last field
    result.push(current);

    return result;
}

function parseEmailsFromCSV(csvContent) {
    const lines = csvContent.split(/\r?\n/);
    if (lines.length === 0) return '';

    // Find the header row and locate the email column
    const headerRow = lines[0];
    const headers = parseCSVRow(headerRow);

    // Look for email-related columns (case insensitive)
    let emailColumnIndex = -1;
    const emailColumnNames = ['path', 'email', 'email_address', 'communication_channel_path'];

    for (let i = 0; i < headers.length; i++) {
        const headerLower = headers[i].toLowerCase().trim();
        if (emailColumnNames.includes(headerLower)) {
            emailColumnIndex = i;
            break;
        }
    }

    if (emailColumnIndex === -1) {
        throw new Error('Could not find email column in CSV. Expected column names: path, email, email_address, or communication_channel_path');
    }

    console.log(`Found email column at index ${emailColumnIndex}: "${headers[emailColumnIndex]}"`);

    // Extract emails from the specified column
    const emails = [];
    for (let i = 1; i < lines.length; i++) { // Skip header row
        const line = lines[i].trim();
        if (line) {
            const row = parseCSVRow(line);
            if (row[emailColumnIndex] && row[emailColumnIndex].includes('@')) {
                emails.push(row[emailColumnIndex].trim());
            }
        }
    }

    return emails.join('\n');
}

// Test with sample CSV content (based on your my_bounce.csv)
const testCsv = `User ID,Name,Communication channel ID,Type,Path,Date of most recent bounce,Bounce reason
17390,Emerson Rexrode,17357,email,118280@augusta.k12.va.us,,
17528,Mylo Nunez,17440,email,115340@augusta.k12.va.us,,
18923,Ca'Shawn Johnson,17822,email,111569@augusta.k12.va.us,,
19719,Jaziyah Campbell,17976,email,118572@augusta.k12.va.us,,
20931,Erin snell,18991,email,els1995@live.com,,`;

try {
    const result = parseEmailsFromCSV(testCsv);
    console.log('Extracted emails:');
    console.log(result);
    console.log('\nEmail count:', result.split('\n').filter(email => email.trim()).length);
} catch (error) {
    console.error('Error parsing CSV:', error.message);
}
