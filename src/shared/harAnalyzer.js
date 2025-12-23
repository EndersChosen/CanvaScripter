/**
 * HAR File Analyzer
 * Analyzes HTTP Archive (HAR) files to provide insights into web traffic,
 * performance, authentication flows, and potential issues.
 */

class HARAnalyzer {
    constructor(harData) {
        this.har = harData;
        this.entries = harData.log?.entries || [];
        this.pages = harData.log?.pages || [];
    }

    /**
     * Get basic statistics about the HAR file
     */
    getBasicStats() {
        const stats = {
            totalRequests: this.entries.length,
            totalPages: this.pages.length,
            startTime: this.pages[0]?.startedDateTime || null,
            duration: 0
        };

        if (this.pages.length > 1) {
            const start = new Date(this.pages[0].startedDateTime);
            const end = new Date(this.pages[this.pages.length - 1].startedDateTime);
            stats.duration = (end - start) / 1000; // seconds
        }

        return stats;
    }

    /**
     * Analyze HTTP status codes
     */
    getStatusCodeAnalysis() {
        const statuses = {};
        this.entries.forEach(entry => {
            const status = entry.response.status;
            statuses[status] = (statuses[status] || 0) + 1;
        });

        return Object.entries(statuses)
            .map(([status, count]) => ({
                status: parseInt(status),
                count,
                category: this._getStatusCategory(parseInt(status))
            }))
            .sort((a, b) => a.status - b.status);
    }

    _getStatusCategory(status) {
        if (status === 0) return 'Failed';
        if (status < 300) return 'Success';
        if (status < 400) return 'Redirect';
        if (status < 500) return 'Client Error';
        return 'Server Error';
    }

    /**
     * Analyze domains contacted
     */
    getDomainAnalysis() {
        const domains = {};
        this.entries.forEach(entry => {
            try {
                const url = new URL(entry.request.url);
                domains[url.hostname] = (domains[url.hostname] || 0) + 1;
            } catch (e) {
                // Invalid URL, skip
            }
        });

        return Object.entries(domains)
            .map(([domain, count]) => ({ domain, count }))
            .sort((a, b) => b.count - a.count);
    }

    /**
     * Analyze content types
     */
    getContentTypeAnalysis() {
        const contentTypes = {};
        this.entries.forEach(entry => {
            const mimeType = entry.response.content.mimeType || 'unknown';
            const baseType = mimeType.split(';')[0].trim();
            contentTypes[baseType] = (contentTypes[baseType] || 0) + 1;
        });

        return Object.entries(contentTypes)
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count);
    }

    /**
     * Analyze request/response sizes
     */
    getSizeAnalysis() {
        let totalContentSize = 0;
        let totalTransferSize = 0;
        const sizeByType = {};

        this.entries.forEach(entry => {
            const contentSize = entry.response.content.size || 0;
            const transferSize = entry.response.bodySize || 0;

            totalContentSize += contentSize;
            totalTransferSize += transferSize;

            const mimeType = (entry.response.content.mimeType || 'unknown').split(';')[0].trim();
            if (!sizeByType[mimeType]) {
                sizeByType[mimeType] = { size: 0, count: 0 };
            }
            sizeByType[mimeType].size += contentSize;
            sizeByType[mimeType].count += 1;
        });

        return {
            totalContentSize,
            totalTransferSize,
            totalContentSizeMB: (totalContentSize / 1024 / 1024).toFixed(2),
            totalTransferSizeMB: (totalTransferSize / 1024 / 1024).toFixed(2),
            byType: Object.entries(sizeByType)
                .map(([type, data]) => ({
                    type,
                    size: data.size,
                    sizeKB: (data.size / 1024).toFixed(2),
                    count: data.count
                }))
                .sort((a, b) => b.size - a.size)
        };
    }

    /**
     * Get timing analysis (slowest requests)
     */
    getTimingAnalysis(limit = 10) {
        return this.entries
            .map(entry => ({
                url: entry.request.url,
                time: entry.time,
                dns: entry.timings.dns,
                connect: entry.timings.connect,
                wait: entry.timings.wait,
                receive: entry.timings.receive
            }))
            .sort((a, b) => b.time - a.time)
            .slice(0, limit);
    }

    /**
     * Detect authentication flow
     */
    detectAuthFlow() {
        const authKeywords = ['oauth', 'saml', 'login', 'auth', 'sso', 'token', 'callback'];
        const authRequests = this.entries.filter(entry =>
            authKeywords.some(keyword => entry.request.url.toLowerCase().includes(keyword))
        );

        const flow = {
            detected: authRequests.length > 0,
            requestCount: authRequests.length,
            requests: authRequests.map(entry => ({
                url: entry.request.url,
                method: entry.request.method,
                status: entry.response.status,
                time: entry.startedDateTime
            })),
            type: this._detectAuthType(authRequests)
        };

        return flow;
    }

    _detectAuthType(authRequests) {
        const types = [];
        const urls = authRequests.map(r => r.request.url.toLowerCase()).join(' ');

        if (urls.includes('oauth')) types.push('OAuth 2.0');
        if (urls.includes('saml')) types.push('SAML 2.0');
        if (urls.includes('openid')) types.push('OpenID Connect');
        if (urls.includes('duo')) types.push('Duo 2FA');

        return types.length > 0 ? types : ['Unknown'];
    }

    /**
     * Find errors and issues
     */
    findErrors() {
        const errors = this.entries.filter(entry => entry.response.status >= 400);

        return errors.map(entry => ({
            url: entry.request.url,
            method: entry.request.method,
            status: entry.response.status,
            statusText: entry.response.statusText,
            time: entry.startedDateTime,
            responseBody: entry.response.content.text || null
        }));
    }

    /**
     * Analyze cookies
     */
    getCookieAnalysis() {
        const cookiesByDomain = {};
        let totalCookies = 0;

        this.entries.forEach(entry => {
            const setCookies = entry.response.headers.filter(
                h => h.name.toLowerCase() === 'set-cookie'
            );

            if (setCookies.length > 0) {
                try {
                    const domain = new URL(entry.request.url).hostname;
                    cookiesByDomain[domain] = (cookiesByDomain[domain] || 0) + setCookies.length;
                    totalCookies += setCookies.length;
                } catch (e) {
                    // Invalid URL
                }
            }
        });

        return {
            totalCookies,
            byDomain: Object.entries(cookiesByDomain)
                .map(([domain, count]) => ({ domain, count }))
                .sort((a, b) => b.count - a.count)
        };
    }

    /**
     * Analyze security headers
     */
    getSecurityAnalysis() {
        let xfoCount = 0;
        let cspCount = 0;
        let hstsCount = 0;
        let xContentTypeCount = 0;

        this.entries.forEach(entry => {
            entry.response.headers.forEach(header => {
                const name = header.name.toLowerCase();
                if (name === 'x-frame-options') xfoCount++;
                if (name === 'content-security-policy' || name === 'content-security-policy-report-only') cspCount++;
                if (name === 'strict-transport-security') hstsCount++;
                if (name === 'x-content-type-options') xContentTypeCount++;
            });
        });

        return {
            xFrameOptions: xfoCount,
            contentSecurityPolicy: cspCount,
            strictTransportSecurity: hstsCount,
            xContentTypeOptions: xContentTypeCount
        };
    }

    /**
     * Generate comprehensive analysis report
     */
    generateReport() {
        return {
            basicStats: this.getBasicStats(),
            statusCodes: this.getStatusCodeAnalysis(),
            domains: this.getDomainAnalysis().slice(0, 20),
            contentTypes: this.getContentTypeAnalysis().slice(0, 15),
            size: this.getSizeAnalysis(),
            timing: this.getTimingAnalysis(10),
            authFlow: this.detectAuthFlow(),
            errors: this.findErrors(),
            cookies: this.getCookieAnalysis(),
            security: this.getSecurityAnalysis()
        };
    }

    /**
     * Check if HAR file shows an incomplete login/auth flow
     */
    diagnoseIncompleteAuth() {
        const diagnosis = {
            isIncomplete: false,
            reasons: [],
            recommendations: [],
            severity: 'info', // 'info', 'warning', 'critical'
            rootCause: null
        };

        const authFlow = this.detectAuthFlow();
        const errors = this.findErrors();
        const cookies = this.getCookieAnalysis();
        const lastPage = this.pages[this.pages.length - 1];

        // PRIORITY 1: Check for backend service authentication failures (401 on API endpoints)
        const apiErrors = errors.filter(e => {
            const url = e.url.toLowerCase();
            return e.status === 401 && (
                url.includes('user-api') ||
                url.includes('identity') ||
                url.includes('api/usersync') ||
                url.includes('api-gateway') ||
                (url.includes('/api/') && !url.includes('/login') && !url.includes('/auth'))
            );
        });

        if (apiErrors.length > 0) {
            diagnosis.isIncomplete = true;
            diagnosis.severity = 'critical';
            diagnosis.rootCause = 'backend_service_auth_failure';

            const userApiError = apiErrors.find(e =>
                e.url.includes('user-api') || e.url.includes('usersync')
            );

            if (userApiError) {
                diagnosis.reasons.push('⚠️ Backend Service Authentication Failure Detected');
                diagnosis.reasons.push('');
                diagnosis.reasons.push('The authentication flow completed successfully through SAML/SSO,');
                diagnosis.reasons.push('but failed when Canvas tried to sync user data from the identity provider.');
                diagnosis.reasons.push('');

                try {
                    const url = new URL(userApiError.url);
                    diagnosis.reasons.push(`Failed Service: ${url.hostname}`);
                    diagnosis.reasons.push(`Endpoint: ${url.pathname}`);
                    diagnosis.reasons.push(`Error: ${userApiError.status} ${userApiError.statusText}`);
                } catch (e) {
                    diagnosis.reasons.push(`URL: ${userApiError.url.substring(0, 100)}`);
                }

                diagnosis.reasons.push('');
                diagnosis.reasons.push('Root Cause Analysis:');
                diagnosis.reasons.push('• User authentication (SAML/OAuth) succeeded');
                diagnosis.reasons.push('• Canvas identity service lacks authorization to sync user data');
                diagnosis.reasons.push('• Missing or invalid service-to-service credentials');
                diagnosis.reasons.push('• This is a backend infrastructure/configuration issue');

                diagnosis.recommendations.push('🔧 ACTION REQUIRED: Canvas Administrator');
                diagnosis.recommendations.push('');
                diagnosis.recommendations.push('This is NOT a client-side issue. Canvas administrators must:');
                diagnosis.recommendations.push('');
                diagnosis.recommendations.push('1. Verify user-api service credentials in the environment');
                diagnosis.recommendations.push('2. Check API gateway authentication configuration');
                diagnosis.recommendations.push('3. Ensure identity service has proper permissions');
                diagnosis.recommendations.push('4. Review service-to-service authentication tokens');

                if (userApiError.url.includes('.beta.')) {
                    diagnosis.recommendations.push('5. Verify beta environment is configured correctly');
                }

                diagnosis.recommendations.push('');
                diagnosis.recommendations.push('⚠️ User cannot fix this - requires Canvas infrastructure team');
            } else {
                diagnosis.reasons.push(`Backend API authentication failure: ${apiErrors[0].status} on ${apiErrors[0].url.substring(0, 80)}`);
                diagnosis.recommendations.push('Contact Canvas administrator - backend service authentication is failing');
            }

            return diagnosis;
        }

        // PRIORITY 2: Check if stuck on "in-progress" page
        if (lastPage && lastPage.title.includes('in-progress')) {
            diagnosis.isIncomplete = true;
            diagnosis.reasons.push('Session stuck on "in-progress" waiting page');

            // If we have OAuth activity but no API errors, might be a different issue
            if (authFlow.detected) {
                diagnosis.severity = 'warning';
            }
        }

        // PRIORITY 3: Check for authentication endpoint errors (actual auth failures)
        const authErrors = errors.filter(e =>
            e.url.includes('/login') ||
            e.url.includes('/auth') ||
            e.url.includes('/oauth') ||
            e.url.includes('/saml')
        );

        if (authErrors.length > 0) {
            diagnosis.isIncomplete = true;
            diagnosis.severity = 'critical';
            diagnosis.rootCause = 'authentication_failure';
            diagnosis.reasons.push(`Authentication endpoint errors: ${authErrors.length} error(s)`);

            authErrors.slice(0, 3).forEach(err => {
                diagnosis.reasons.push(`  • ${err.status} ${err.statusText} - ${err.url.substring(0, 80)}`);
            });

            if (authErrors.some(e => e.status === 401)) {
                diagnosis.recommendations.push('Check credentials - username/password may be incorrect');
            } else if (authErrors.some(e => e.status === 403)) {
                diagnosis.recommendations.push('Access forbidden - account may be locked or not authorized');
            } else {
                diagnosis.recommendations.push('Contact Canvas administrator about authentication service errors');
            }
        }

        // PRIORITY 4: Check OAuth callback completion
        if (authFlow.detected) {
            const hasCallback = authFlow.requests.some(r => r.url.includes('callback'));
            const hasCode = this.entries.some(e => {
                try {
                    const url = new URL(e.request.url);
                    return url.searchParams.has('code');
                } catch {
                    return false;
                }
            });

            if (!hasCallback && !hasCode) {
                diagnosis.isIncomplete = true;
                diagnosis.severity = 'warning';
                diagnosis.reasons.push('OAuth callback was not received from authentication provider');
                diagnosis.recommendations.push('Check if authentication provider (SAML/SSO) completed successfully');
                diagnosis.recommendations.push('Verify popups are not blocked');
            }
        }

        // PRIORITY 5: Check for cookie issues (least likely to be root cause)
        if (cookies.totalCookies === 0 && authFlow.detected && !apiErrors.length) {
            diagnosis.reasons.push('No session cookies were set during authentication');
            diagnosis.recommendations.push('Check if third-party cookies are enabled in browser settings');
            diagnosis.recommendations.push('Try in incognito/private mode to eliminate extension interference');
        }

        // Add general recommendations only if no specific root cause identified
        if (diagnosis.isIncomplete && !diagnosis.rootCause && diagnosis.recommendations.length === 0) {
            diagnosis.recommendations.push('Review browser console for JavaScript errors');
            diagnosis.recommendations.push('Ensure popups and redirects are not blocked');
            diagnosis.recommendations.push('Try clearing browser cache and cookies');
            diagnosis.recommendations.push('Test in incognito mode to rule out browser extensions');
        }

        return diagnosis;
    }
}

module.exports = { HARAnalyzer };
