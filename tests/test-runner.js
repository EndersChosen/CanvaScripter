#!/usr/bin/env node

/**
 * Test Runner for CanvaScripter
 * 
 * This script runs all tests for the CanvaScripter application.
 * Usage: npm test or node test-runner.js
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class TestRunner {
    constructor() {
        this.testResults = {
            unit: null,
            integration: null,
            app: null
        };
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = {
            info: '📝',
            success: '✅',
            error: '❌',
            warning: '⚠️'
        }[type] || '📝';

        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    async runUnitTests() {
        this.log('Running unit tests...', 'info');

        try {
            const UnitTestSuite = require('./tests/unit.test.js');
            const unitTests = new UnitTestSuite();
            await unitTests.runAllTests();

            this.testResults.unit = {
                passed: unitTests.results.passed,
                failed: unitTests.results.failed,
                errors: unitTests.results.errors
            };

            this.log(`Unit tests completed: ${unitTests.results.passed} passed, ${unitTests.results.failed} failed`,
                unitTests.results.failed === 0 ? 'success' : 'warning');
        } catch (error) {
            this.log(`Unit tests failed to run: ${error.message}`, 'error');
            this.testResults.unit = { passed: 0, failed: 1, errors: [error.message] };
        }
    }

    async runAppTests() {
        this.log('Running application tests...', 'info');

        try {
            const AppTestSuite = require('./tests/app.test.js');
            const appTests = new AppTestSuite();
            await appTests.runAllTests();

            this.testResults.app = {
                passed: appTests.testResults.passed,
                failed: appTests.testResults.failed,
                errors: appTests.testResults.errors
            };

            this.log(`App tests completed: ${appTests.testResults.passed} passed, ${appTests.testResults.failed} failed`,
                appTests.testResults.failed === 0 ? 'success' : 'warning');
        } catch (error) {
            this.log(`App tests failed to run: ${error.message}`, 'error');
            this.testResults.app = { passed: 0, failed: 1, errors: [error.message] };
        }
    }

    async runLintChecks() {
        this.log('Running lint checks...', 'info');

        // Check for common issues in main files
        const filesToCheck = [
            'main.js',
            'renderer.js',
            'preload.js',
            'index.html'
        ];

        let lintIssues = 0;

        for (const file of filesToCheck) {
            const filePath = path.join(__dirname, file);
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');

                // Check for common issues
                if (file.endsWith('.js')) {
                    if (content.includes('console.log') && !content.includes('DEBUG')) {
                        this.log(`${file}: Contains console.log statements`, 'warning');
                        lintIssues++;
                    }

                    if (content.includes('TODO') || content.includes('FIXME')) {
                        this.log(`${file}: Contains TODO/FIXME comments`, 'warning');
                        lintIssues++;
                    }

                    // Check for potential security issues
                    if (content.includes('eval(') || content.includes('innerHTML =')) {
                        this.log(`${file}: Potential security issue detected`, 'warning');
                        lintIssues++;
                    }
                }

                if (file.endsWith('.html')) {
                    if (!content.includes('Content-Security-Policy')) {
                        this.log(`${file}: Missing Content Security Policy`, 'warning');
                        lintIssues++;
                    }
                }
            }
        }

        if (lintIssues === 0) {
            this.log('Lint checks passed', 'success');
        } else {
            this.log(`Lint checks found ${lintIssues} issues`, 'warning');
        }

        return lintIssues;
    }

    async runSecurityChecks() {
        this.log('Running security checks...', 'info');

        let securityIssues = 0;

        // Check package.json for known vulnerabilities
        try {
            const packagePath = path.join(__dirname, 'package.json');
            const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

            // Check for outdated electron version
            if (packageData.devDependencies && packageData.devDependencies.electron) {
                const electronVersion = packageData.devDependencies.electron.replace(/[\^~]/, '');
                const majorVersion = parseInt(electronVersion.split('.')[0]);

                if (majorVersion < 20) {
                    this.log('Electron version may be outdated', 'warning');
                    securityIssues++;
                }
            }

            // Check for development dependencies in production
            if (packageData.dependencies) {
                const devDepsInProd = Object.keys(packageData.dependencies).filter(dep =>
                    dep.includes('dev') || dep.includes('test') || dep.includes('mock')
                );

                if (devDepsInProd.length > 0) {
                    this.log(`Development dependencies in production: ${devDepsInProd.join(', ')}`, 'warning');
                    securityIssues++;
                }
            }

        } catch (error) {
            this.log(`Security check failed: ${error.message}`, 'error');
            securityIssues++;
        }

        // Check main.js for security best practices
        try {
            const mainPath = path.join(__dirname, 'main.js');
            const mainContent = fs.readFileSync(mainPath, 'utf8');

            if (!mainContent.includes('nodeIntegration: false')) {
                this.log('nodeIntegration should be disabled for security', 'warning');
                securityIssues++;
            }

            if (!mainContent.includes('contextIsolation: true')) {
                this.log('contextIsolation should be enabled for security', 'warning');
                securityIssues++;
            }

        } catch (error) {
            this.log(`Security check failed: ${error.message}`, 'error');
            securityIssues++;
        }

        if (securityIssues === 0) {
            this.log('Security checks passed', 'success');
        } else {
            this.log(`Security checks found ${securityIssues} issues`, 'warning');
        }

        return securityIssues;
    }

    async runPerformanceChecks() {
        this.log('Running performance checks...', 'info');

        let performanceIssues = 0;

        // Check file sizes
        const filesToCheck = [
            'main.js',
            'renderer.js',
            'styles.css',
            'index.html'
        ];

        for (const file of filesToCheck) {
            const filePath = path.join(__dirname, file);
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                const sizeKB = stats.size / 1024;

                if (sizeKB > 500) {
                    this.log(`${file} is large (${sizeKB.toFixed(1)}KB)`, 'warning');
                    performanceIssues++;
                }
            }
        }

        // Check for performance anti-patterns in JavaScript files
        const jsFiles = ['main.js', 'renderer.js'];
        for (const file of jsFiles) {
            const filePath = path.join(__dirname, file);
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');

                // Check for synchronous file operations
                const syncOperations = content.match(/fs\.\w+Sync\(/g) || [];
                if (syncOperations.length > 5) {
                    this.log(`${file}: High number of synchronous file operations (${syncOperations.length})`, 'warning');
                    performanceIssues++;
                }

                // Check for potential memory leaks
                if (content.includes('setInterval') && !content.includes('clearInterval')) {
                    this.log(`${file}: Potential memory leak - setInterval without clearInterval`, 'warning');
                    performanceIssues++;
                }
            }
        }

        if (performanceIssues === 0) {
            this.log('Performance checks passed', 'success');
        } else {
            this.log(`Performance checks found ${performanceIssues} issues`, 'warning');
        }

        return performanceIssues;
    }

    generateTestReport() {
        this.log('Generating test report...', 'info');

        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalPassed: 0,
                totalFailed: 0,
                totalErrors: []
            },
            details: this.testResults
        };

        // Calculate totals
        Object.values(this.testResults).forEach(result => {
            if (result) {
                report.summary.totalPassed += result.passed;
                report.summary.totalFailed += result.failed;
                report.summary.totalErrors.push(...result.errors);
            }
        });

        // Write report to file
        const reportPath = path.join(__dirname, 'test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        this.log(`Test report saved to ${reportPath}`, 'success');
        return report;
    }

    printSummary() {
        console.log('\n' + '='.repeat(80));
        console.log('🧪 CanvaScripter Test Suite Summary');
        console.log('='.repeat(80));

        let totalPassed = 0;
        let totalFailed = 0;

        Object.entries(this.testResults).forEach(([testType, result]) => {
            if (result) {
                console.log(`${testType.toUpperCase()} Tests: ${result.passed} passed, ${result.failed} failed`);
                totalPassed += result.passed;
                totalFailed += result.failed;
            }
        });

        console.log('-'.repeat(80));
        console.log(`TOTAL: ${totalPassed} passed, ${totalFailed} failed`);

        const successRate = totalPassed + totalFailed > 0 ?
            ((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1) : 0;
        console.log(`Success Rate: ${successRate}%`);

        if (totalFailed === 0) {
            console.log('🎉 All tests passed!');
        } else {
            console.log('⚠️ Some tests failed. Check the details above.');
        }

        console.log('='.repeat(80));
    }

    async runAllTests() {
        this.log('Starting CanvaScripter test suite...', 'info');

        // Run all test types
        await this.runUnitTests();
        // await this.runAppTests(); // Commented out as it requires Electron context

        // Run additional checks
        await this.runLintChecks();
        await this.runSecurityChecks();
        await this.runPerformanceChecks();

        // Generate report and summary
        this.generateTestReport();
        this.printSummary();

        // Exit with appropriate code
        const hasFailures = Object.values(this.testResults).some(result =>
            result && result.failed > 0
        );

        process.exit(hasFailures ? 1 : 0);
    }
}

// Run tests if called directly
if (require.main === module) {
    const runner = new TestRunner();
    runner.runAllTests().catch(error => {
        console.error('Test runner failed:', error);
        process.exit(1);
    });
}

module.exports = TestRunner;