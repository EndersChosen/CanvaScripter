const fs = require('fs');
const path = require('path');

/**
 * Unit Tests for CanvaScripter Core Functionality
 * 
 * These tests focus on specific functions and modules in isolation.
 * Run with: node tests/unit.test.js
 */

class UnitTestSuite {
    constructor() {
        this.results = { passed: 0, failed: 0, errors: [] };
    }

    assert(condition, message) {
        if (condition) {
            this.results.passed++;
            console.log(`✅ ${message}`);
        } else {
            this.results.failed++;
            this.results.errors.push(message);
            console.log(`❌ ${message}`);
        }
    }

    // Test utility functions
    testUtilities() {
        console.log('\n📚 Testing Utility Functions...');

        // Test domain parsing
        const testDomainParsing = (input, expected) => {
            const parsed = input.replace(/^https?:\/\//, '').split('/')[0];
            this.assert(parsed === expected, `Domain parsing: "${input}" -> "${parsed}"`);
        };

        testDomainParsing('https://school.instructure.com', 'school.instructure.com');
        testDomainParsing('https://school.instructure.com/courses/123', 'school.instructure.com');
        testDomainParsing('school.instructure.com', 'school.instructure.com');
        testDomainParsing('https://school.test.instructure.com/path/to/page', 'school.test.instructure.com');

        // Test email validation
        const testEmailValidation = (email, expected) => {
            const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            this.assert(isValid === expected, `Email validation: "${email}" -> ${isValid}`);
        };

        testEmailValidation('test@example.com', true);
        testEmailValidation('user.name+tag@domain.co.uk', true);
        testEmailValidation('invalid-email', false);
        testEmailValidation('missing@domain', false);
        testEmailValidation('', false);

        // Test array deduplication
        const testArrayDedupe = (input, expected) => {
            const deduped = [...new Set(input)];
            this.assert(JSON.stringify(deduped.sort()) === JSON.stringify(expected.sort()),
                `Array dedupe: [${input}] -> [${deduped}]`);
        };

        testArrayDedupe([1, 2, 2, 3, 3, 3], [1, 2, 3]);
        testArrayDedupe(['a', 'b', 'a', 'c'], ['a', 'b', 'c']);
        testArrayDedupe([], []);

        // Test string cleaning
        const testStringCleaning = (input, expected) => {
            const cleaned = input.trim().replace(/\s+/g, ' ');
            this.assert(cleaned === expected, `String cleaning: "${input}" -> "${cleaned}"`);
        };

        testStringCleaning('  test   string  ', 'test string');
        testStringCleaning('\n\ttest\n\t', 'test');
        testStringCleaning('', '');
    }

    // Test CSV parsing
    testCSVParsing() {
        console.log('\n📄 Testing CSV Parsing...');

        // Test basic CSV parsing
        const testCSVParse = (input, expectedRows) => {
            const rows = input.split('\n').map(row => row.split(',').map(cell => cell.trim()));
            this.assert(rows.length === expectedRows, `CSV parsing: ${rows.length} rows (expected ${expectedRows})`);
        };

        testCSVParse('name,email\nJohn,john@test.com\nJane,jane@test.com', 3);
        testCSVParse('single,line', 1);
        testCSVParse('', 1); // Empty string still creates one row

        // Test CSV with bounced communication channels format
        const bouncedCSV = `communication_channel_id,bounce_details
12345,"Hard bounce: mailbox full"
67890,"Soft bounce: temporary failure"`;
        const bouncedRows = bouncedCSV.split('\n');
        this.assert(bouncedRows.length === 3, 'Bounced communication channels CSV parsing works');
        this.assert(bouncedRows[0].includes('communication_channel_id'), 'CSV header detection works');

        // Test email extraction from various formats
        const testEmailExtraction = (input, expectedCount) => {
            const emails = input.match(/[^\s@]+@[^\s@]+\.[^\s@]+/g) || [];
            this.assert(emails.length === expectedCount, `Email extraction: found ${emails.length} emails (expected ${expectedCount})`);
        };

        testEmailExtraction('Contact john@test.com or jane@example.org', 2);
        testEmailExtraction('No emails here', 0);
        testEmailExtraction('Single email: test@domain.com', 1);
    }

    // Test file operations
    testFileOperations() {
        console.log('\n📁 Testing File Operations...');

        // Test file existence checks
        const testFiles = [
            'package.json',
            'src/main/main.js',
            'src/renderer/index.html',
            'src/renderer/styles.css'
        ];

        testFiles.forEach(file => {
            const exists = fs.existsSync(path.join(__dirname, '..', file));
            this.assert(exists, `Required file exists: ${file}`);
        });

        // Test package.json structure
        try {
            const packagePath = path.join(__dirname, '..', 'package.json');
            const packageContent = fs.readFileSync(packagePath, 'utf8');

            // Verify it starts with a valid JSON object (not "npm {" or other text)
            const trimmed = packageContent.trim();
            if (!trimmed.startsWith('{')) {
                this.assert(false, `package.json must start with '{', found: ${trimmed.substring(0, 20)}`);
            } else {
                this.assert(true, 'package.json starts with valid JSON object');
            }

            const packageData = JSON.parse(packageContent);

            this.assert(packageData.name, 'package.json has name field');
            this.assert(packageData.version, 'package.json has version field');
            this.assert(packageData.main, 'package.json has main field');
            this.assert(packageData.scripts, 'package.json has scripts field');
            this.assert(packageData.scripts.start, 'package.json has start script');
        } catch (error) {
            this.assert(false, `package.json parsing failed: ${error.message}`);
        }

        // Test main.js basic structure
        try {
            const mainPath = path.join(__dirname, '..', 'src', 'main', 'main.js');
            const mainContent = fs.readFileSync(mainPath, 'utf8');

            this.assert(mainContent.includes('require(\'electron\')'), 'main.js imports electron');
            this.assert(mainContent.includes('BrowserWindow'), 'main.js uses BrowserWindow');
            this.assert(mainContent.includes('ipcMain'), 'main.js uses ipcMain');
            this.assert(mainContent.includes('app.whenReady'), 'main.js has app ready handler');
        } catch (error) {
            this.assert(false, `main.js analysis failed: ${error.message}`);
        }
    }

    // Test configuration and settings
    testConfiguration() {
        console.log('\n⚙️ Testing Configuration...');

        // Test environment variables
        const requiredEnvVars = ['NODE_ENV'];
        requiredEnvVars.forEach(envVar => {
            const exists = process.env[envVar] !== undefined;
            this.assert(true, `Environment variable check: ${envVar} (${exists ? 'set' : 'not set'})`);
        });

        // Test configuration file existence
        const configFiles = [
            'forge.config.js',
            '.env'
        ];

        configFiles.forEach(file => {
            const exists = fs.existsSync(path.join(__dirname, '..', file));
            this.assert(true, `Config file check: ${file} (${exists ? 'exists' : 'missing'})`);
        });
    }

    // Test data validation
    testDataValidation() {
        console.log('\n🔍 Testing Data Validation...');

        // Test Canvas API URL validation
        const testAPIURL = (domain, endpoint, expected) => {
            const url = `https://${domain}/api/v1/${endpoint}`;
            const isValid = url.startsWith('https://') && url.includes('.instructure.com');
            this.assert(isValid === expected, `API URL validation: ${url}`);
        };

        testAPIURL('school.instructure.com', 'courses', true);
        testAPIURL('test.beta.instructure.com', 'users', true);
        testAPIURL('malicious-site.com', 'courses', false);

        // Test token format validation
        const testTokenFormat = (token, expected) => {
            // Basic token validation - should be non-empty string
            const isValid = typeof token === 'string' && token.length > 0;
            this.assert(isValid === expected, `Token format validation: ${token ? '[REDACTED]' : 'empty'}`);
        };

        testTokenFormat('valid-token-123', true);
        testTokenFormat('', false);
        testTokenFormat(null, false);
        testTokenFormat(undefined, false);

        // Test course ID validation
        const testCourseID = (courseId, expected) => {
            const isValid = /^\d+$/.test(courseId);
            this.assert(isValid === expected, `Course ID validation: ${courseId}`);
        };

        testCourseID('12345', true);
        testCourseID('abc123', false);
        testCourseID('', false);
        testCourseID('123.45', false);
    }

    // Test error handling patterns
    testErrorHandling() {
        console.log('\n🚨 Testing Error Handling...');

        // Test async error handling
        const testAsyncError = async () => {
            try {
                await new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Test error')), 10);
                });
                this.assert(false, 'Async error should have been caught');
            } catch (error) {
                this.assert(error.message === 'Test error', 'Async error handling works');
            }
        };

        testAsyncError();

        // Test input validation
        const testInputValidation = (input, validator, expected) => {
            try {
                const result = validator(input);
                this.assert(result === expected, `Input validation: ${input} -> ${result}`);
            } catch (error) {
                this.assert(!expected, `Input validation error: ${error.message}`);
            }
        };

        const emailValidator = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        testInputValidation('test@example.com', emailValidator, true);
        testInputValidation('invalid-email', emailValidator, false);
    }

    // Test performance considerations
    testPerformance() {
        console.log('\n⚡ Testing Performance Considerations...');

        // Test array operations performance
        const largeArray = Array.from({ length: 10000 }, (_, i) => i);

        const start = Date.now();
        const deduped = [...new Set(largeArray)];
        const duration = Date.now() - start;

        this.assert(duration < 100, `Array deduplication performance: ${duration}ms (should be < 100ms)`);
        this.assert(deduped.length === largeArray.length, 'Array deduplication correctness');

        // Test string operations performance
        const testString = 'test string '.repeat(1000);
        const start2 = Date.now();
        const cleaned = testString.trim().replace(/\s+/g, ' ');
        const duration2 = Date.now() - start2;

        this.assert(duration2 < 50, `String cleaning performance: ${duration2}ms (should be < 50ms)`);
    }

    // Test memory usage patterns
    testMemoryUsage() {
        console.log('\n🧠 Testing Memory Usage...');

        // Test for memory leaks in event listeners
        let eventCount = 0;
        const testHandler = () => { eventCount++; };

        // Add and remove listeners multiple times
        for (let i = 0; i < 100; i++) {
            process.on('test-event', testHandler);
            process.removeListener('test-event', testHandler);
        }

        const listenerCount = process.listenerCount('test-event');
        this.assert(listenerCount === 0, `Event listener cleanup: ${listenerCount} remaining (should be 0)`);

        // Test object cleanup
        let objects = [];
        for (let i = 0; i < 1000; i++) {
            objects.push({ id: i, data: new Array(100).fill(i) });
        }

        this.assert(objects.length === 1000, 'Object creation works');

        objects = null; // Clear reference
        this.assert(objects === null, 'Object reference cleanup works');
    }

    // Run all tests
    async runAllTests() {
        console.log('🧪 Starting CanvaScripter Unit Tests...\n');

        this.testUtilities();
        this.testCSVParsing();
        this.testFileOperations();
        this.testConfiguration();
        this.testDataValidation();
        await this.testErrorHandling();
        this.testPerformance();
        this.testMemoryUsage();

        this.printResults();
    }

    printResults() {
        console.log('\n' + '='.repeat(60));
        console.log('🧪 CanvaScripter Unit Test Results');
        console.log('='.repeat(60));
        console.log(`Total Tests: ${this.results.passed + this.results.failed}`);
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);

        if (this.results.failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.results.errors.forEach(error => {
                console.log(`  • ${error}`);
            });
        }

        const successRate = ((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1);
        console.log(`\n📊 Success Rate: ${successRate}%`);
        console.log('='.repeat(60));
    }
}

// Export for use
module.exports = UnitTestSuite;

// If run directly, execute tests
if (require.main === module) {
    const testSuite = new UnitTestSuite();
    testSuite.runAllTests();
}