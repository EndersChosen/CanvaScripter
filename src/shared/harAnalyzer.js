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
     * Analyze HTTP status codes (Sentry requests excluded)
     */
    getStatusCodeAnalysis() {
        const statuses = {};
        this.entries
            .filter(entry => !this._isSentryRequest(entry.request.url))
            .forEach(entry => {
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
     * Returns true for requests that are Sentry error-reporting calls.
     * These should be excluded from error/status analysis because they
     * are observability side-effects, not application failures.
     */
    _isSentryRequest(url) {
        try {
            const hostname = new URL(url).hostname.toLowerCase();
            return hostname === 'sentry.io' ||
                hostname.endsWith('.sentry.io') ||
                hostname.includes('ingest.sentry.io');
        } catch (e) {
            return false;
        }
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
            const rawContentSize = entry.response.content.size;
            const rawTransferSize = entry.response.bodySize;
            const contentSize = (typeof rawContentSize === 'number' && rawContentSize >= 0) ? rawContentSize : 0;
            const transferSize = (typeof rawTransferSize === 'number' && rawTransferSize >= 0) ? rawTransferSize : 0;

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
        const normalizeTiming = value => (typeof value === 'number' && value >= 0) ? value : 0;

        return this.entries
            .map(entry => {
                const timings = entry.timings || {};
                const dns = normalizeTiming(timings.dns);
                const connect = normalizeTiming(timings.connect);
                const wait = normalizeTiming(timings.wait);
                const receive = normalizeTiming(timings.receive);
                const time = (typeof entry.time === 'number' && entry.time >= 0)
                    ? entry.time
                    : (dns + connect + wait + receive);

                return {
                    url: entry.request.url,
                    time,
                    dns,
                    connect,
                    wait,
                    receive
                };
            })
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
     * Find errors and issues (Sentry requests excluded)
     */
    findErrors() {
        const errors = this.entries.filter(
            entry => entry.response.status >= 400 && !this._isSentryRequest(entry.request.url)
        );

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
     * Extract and analyze browser/user-agent information
     */
    getBrowserInfo() {
        let userAgent = null;
        let browserName = 'Unknown';
        let browserVersion = 'Unknown';
        let osName = 'Unknown';
        let osVersion = 'Unknown';
        let deviceType = 'Desktop';

        // Try to get user-agent from HAR metadata first
        if (this.har.log?.browser?.name) {
            browserName = this.har.log.browser.name;
            browserVersion = this.har.log.browser.version || 'Unknown';
        }

        // Get user-agent from first request header
        if (this.entries.length > 0) {
            for (const entry of this.entries) {
                const uaHeader = entry.request.headers.find(
                    h => h.name.toLowerCase() === 'user-agent'
                );
                if (uaHeader) {
                    userAgent = uaHeader.value;
                    break;
                }
            }
        }

        // Parse user-agent string if found
        if (userAgent) {
            const parsed = this._parseUserAgent(userAgent);
            if (parsed.browserName !== 'Unknown') {
                browserName = parsed.browserName;
                browserVersion = parsed.browserVersion;
            }
            osName = parsed.osName;
            osVersion = parsed.osVersion;
            deviceType = parsed.deviceType;
        }

        return {
            userAgent,
            browserName,
            browserVersion,
            osName,
            osVersion,
            deviceType,
            fullBrowserString: browserName && browserVersion !== 'Unknown'
                ? `${browserName} ${browserVersion}`
                : browserName,
            fullOSString: osVersion && osVersion !== 'Unknown'
                ? `${osName} ${osVersion}`
                : osName
        };
    }

    /**
     * Parse user-agent string to extract browser and OS information
     */
    _parseUserAgent(ua) {
        let browserName = 'Unknown';
        let browserVersion = 'Unknown';
        let osName = 'Unknown';
        let osVersion = 'Unknown';
        let deviceType = 'Desktop';

        // Detect mobile/tablet
        if (/Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
            deviceType = /iPad|Android(?!.*Mobile)/i.test(ua) ? 'Tablet' : 'Mobile';
        }

        // Detect OS
        if (/Windows NT 10.0/i.test(ua)) {
            osName = 'Windows';
            osVersion = '10/11';
        } else if (/Windows NT 6.3/i.test(ua)) {
            osName = 'Windows';
            osVersion = '8.1';
        } else if (/Windows NT 6.2/i.test(ua)) {
            osName = 'Windows';
            osVersion = '8';
        } else if (/Windows NT 6.1/i.test(ua)) {
            osName = 'Windows';
            osVersion = '7';
        } else if (/Mac OS X ([\d_]+)/i.test(ua)) {
            osName = 'macOS';
            const match = ua.match(/Mac OS X ([\d_]+)/i);
            if (match) {
                osVersion = match[1].replace(/_/g, '.');
            }
        } else if (/Android ([\d.]+)/i.test(ua)) {
            osName = 'Android';
            const match = ua.match(/Android ([\d.]+)/i);
            if (match) osVersion = match[1];
        } else if (/iPhone OS ([\d_]+)/i.test(ua)) {
            osName = 'iOS';
            const match = ua.match(/iPhone OS ([\d_]+)/i);
            if (match) osVersion = match[1].replace(/_/g, '.');
        } else if (/iPad.*OS ([\d_]+)/i.test(ua)) {
            osName = 'iPadOS';
            const match = ua.match(/OS ([\d_]+)/i);
            if (match) osVersion = match[1].replace(/_/g, '.');
        } else if (/Linux/i.test(ua)) {
            osName = 'Linux';
        } else if (/CrOS/i.test(ua)) {
            osName = 'Chrome OS';
        }

        // Detect Browser (order matters - check more specific browsers first)
        if (/Edg\/([\d.]+)/i.test(ua)) {
            browserName = 'Microsoft Edge';
            const match = ua.match(/Edg\/([\d.]+)/i);
            if (match) browserVersion = match[1];
        } else if (/Chrome\/([\d.]+)/i.test(ua) && !/Edg/i.test(ua)) {
            browserName = 'Google Chrome';
            const match = ua.match(/Chrome\/([\d.]+)/i);
            if (match) browserVersion = match[1];
        } else if (/Firefox\/([\d.]+)/i.test(ua)) {
            browserName = 'Mozilla Firefox';
            const match = ua.match(/Firefox\/([\d.]+)/i);
            if (match) browserVersion = match[1];
        } else if (/Safari\/([\d.]+)/i.test(ua) && !/Chrome/i.test(ua)) {
            browserName = 'Safari';
            const match = ua.match(/Version\/([\d.]+)/i);
            if (match) browserVersion = match[1];
        } else if (/Opera\/([\d.]+)/i.test(ua) || /OPR\/([\d.]+)/i.test(ua)) {
            browserName = 'Opera';
            const match = ua.match(/(?:Opera|OPR)\/([\d.]+)/i);
            if (match) browserVersion = match[1];
        } else if (/MSIE ([\d.]+)/i.test(ua) || /Trident.*rv:([\d.]+)/i.test(ua)) {
            browserName = 'Internet Explorer';
            const match = ua.match(/(?:MSIE |rv:)([\d.]+)/i);
            if (match) browserVersion = match[1];
        }

        return {
            browserName,
            browserVersion,
            osName,
            osVersion,
            deviceType
        };
    }

    /**
     * Summarise overall network health.
     * A "healthy" HAR is one where every non-Sentry request returned a
     * 2xx or 3xx status, meaning any crash is likely client-side.
     */
    getNetworkHealth() {
        const nonSentryEntries = this.entries.filter(
            e => !this._isSentryRequest(e.request.url)
        );
        const failed = nonSentryEntries.filter(
            e => e.response.status === 0 || e.response.status >= 400
        );
        const redirects = nonSentryEntries.filter(
            e => e.response.status >= 300 && e.response.status < 400
        );
        const allOk = failed.length === 0;

        return {
            totalNonSentry: nonSentryEntries.length,
            failedRequests: failed.length,
            redirectRequests: redirects.length,
            isHealthy: allOk,
            summary: allOk
                ? `All ${nonSentryEntries.length} application requests returned 2xx/3xx — network layer is healthy.`
                : `${failed.length} of ${nonSentryEntries.length} application requests failed (4xx/5xx/0).`
        };
    }

    /**
     * Generate comprehensive analysis report
     */
    generateReport() {
        return {
            basicStats: this.getBasicStats(),
            browserInfo: this.getBrowserInfo(),
            statusCodes: this.getStatusCodeAnalysis(),
            domains: this.getDomainAnalysis().slice(0, 20),
            contentTypes: this.getContentTypeAnalysis().slice(0, 15),
            size: this.getSizeAnalysis(),
            timing: this.getTimingAnalysis(10),
            authFlow: this.detectAuthFlow(),
            errors: this.findErrors(),
            cookies: this.getCookieAnalysis(),
            security: this.getSecurityAnalysis(),
            networkHealth: this.getNetworkHealth(),
            diagnosis: this.diagnoseIncompleteAuth()
        };
    }

    /**
     * Diagnose what went wrong in the HAR.
     *
     * Priority order:
     *   1. Backend service auth failures (401 on API endpoints)
     *   2. Stuck on "in-progress" page
     *   3. Auth endpoint HTTP errors
     *   4. Network is healthy → likely a client-side (JS/DOM) crash
     *   5. Incomplete OAuth callback (only when auth actually errored)
     *   6. Cookie issues (only when auth actually errored)
     */
    diagnoseIncompleteAuth() {
        const diagnosis = {
            isIncomplete: false,
            reasons: [],
            recommendations: [],
            severity: 'info',
            rootCause: null
        };

        const authFlow = this.detectAuthFlow();
        const errors = this.findErrors(); // already Sentry-filtered
        const cookies = this.getCookieAnalysis();
        const networkHealth = this.getNetworkHealth();
        const lastPage = this.pages[this.pages.length - 1];

        // ── PRIORITY 1: Backend service 401s on API endpoints ────────────────
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

        // ── PRIORITY 2: Stuck on "in-progress" page ──────────────────────────
        if (lastPage && lastPage.title && lastPage.title.includes('in-progress')) {
            diagnosis.isIncomplete = true;
            diagnosis.severity = 'warning';
            diagnosis.reasons.push('Session stuck on "in-progress" waiting page');
        }

        // ── PRIORITY 3: Auth endpoint HTTP errors ────────────────────────────
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
                diagnosis.recommendations.push('Check credentials — username/password may be incorrect');
            } else if (authErrors.some(e => e.status === 403)) {
                diagnosis.recommendations.push('Access forbidden — account may be locked or not authorized');
            } else {
                diagnosis.recommendations.push('Contact Canvas administrator about authentication service errors');
            }

            return diagnosis;
        }

        // ── PRIORITY 4: Network is healthy → client-side crash ───────────────
        // If every non-Sentry request succeeded (2xx/3xx) the problem is
        // not the network at all. Surface that clearly and give actionable
        // guidance without falsely blaming auth or cookies.
        if (networkHealth.isHealthy && errors.length === 0) {
            diagnosis.isIncomplete = true;
            diagnosis.severity = 'warning';
            diagnosis.rootCause = 'client_side_crash';

            diagnosis.reasons.push('✅ Network layer is healthy — all application requests returned 2xx/3xx.');
            diagnosis.reasons.push('');
            diagnosis.reasons.push(`Total requests analysed: ${networkHealth.totalNonSentry} (Sentry telemetry excluded).`);
            diagnosis.reasons.push('');

            // Try to detect patterns that suggest a client-side JS crash
            const hasLargeResponses = this._detectLargeResponses();
            const thirdPartyScripts = this._detectThirdPartyScripts();
            const cdnScripts = this._detectExternalScripts();

            diagnosis.reasons.push('Likely Cause: Client-side JavaScript / DOM error');
            diagnosis.reasons.push('Common triggers for this pattern:');
            diagnosis.reasons.push('  • A version conflict between two copies of the same library');
            diagnosis.reasons.push('    (e.g. MathJax 2 inside embedded content vs MathJax 3 on the page)');
            diagnosis.reasons.push('  • Third-party script (e.g. analytics/Pendo) mutating React-managed DOM');
            diagnosis.reasons.push('  • Content fetched at runtime containing its own <script> tags');
            diagnosis.reasons.push('  • Browser extension interfering with page JavaScript');

            if (thirdPartyScripts.length > 0) {
                diagnosis.reasons.push('');
                diagnosis.reasons.push('Third-party scripts loaded in this session:');
                thirdPartyScripts.slice(0, 5).forEach(s => {
                    diagnosis.reasons.push(`  • ${s}`);
                });
            }

            if (hasLargeResponses.length > 0) {
                diagnosis.reasons.push('');
                diagnosis.reasons.push('Large responses (>100 KB) that may contain inline scripts:');
                hasLargeResponses.slice(0, 3).forEach(r => {
                    diagnosis.reasons.push(`  • ${r.url.substring(0, 80)} (${r.sizeKB} KB)`);
                });
            }

            diagnosis.recommendations.push('1. Check the browser console (F12) for JavaScript errors at the time of the crash');
            diagnosis.recommendations.push('2. Look for "insertBefore", "nextSibling", or DOM-related exceptions — these point to a library conflict');
            diagnosis.recommendations.push('3. If embedded content (passages, rich text) is involved, ensure it cannot load its own scripts');
            diagnosis.recommendations.push('   — strip or sandbox <script> tags in fetched HTML before injecting into the DOM');
            diagnosis.recommendations.push('4. If a third-party tool (analytics, A/B testing, accessibility overlay) is suspected,');
            diagnosis.recommendations.push('   reproduce the issue in incognito mode with extensions disabled');
            diagnosis.recommendations.push('5. Test with a plain/minimal version of the content to confirm it is content-specific');

            return diagnosis;
        }

        // ── PRIORITY 5: Incomplete OAuth callback (only when network had issues) ─
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

            // Only flag as an auth problem if the auth requests themselves errored
            const authRequestErrors = authFlow.requests.filter(r => r.status >= 400 || r.status === 0);
            if (!hasCallback && !hasCode && authRequestErrors.length > 0) {
                diagnosis.isIncomplete = true;
                diagnosis.severity = 'warning';
                diagnosis.rootCause = 'oauth_incomplete';
                diagnosis.reasons.push('OAuth/SSO callback was not received from the authentication provider');
                diagnosis.reasons.push('');
                diagnosis.reasons.push(`Auth requests with errors: ${authRequestErrors.length}`);
                authRequestErrors.slice(0, 3).forEach(r => {
                    diagnosis.reasons.push(`  • ${r.status} — ${r.url.substring(0, 80)}`);
                });
                diagnosis.recommendations.push('Confirm the authentication provider (SAML/SSO) completed successfully');
                diagnosis.recommendations.push('Verify browser popups are not blocked for this domain');
                diagnosis.recommendations.push('Check if third-party cookies are enabled (required for cross-domain SSO)');
                diagnosis.recommendations.push('Try in incognito/private mode to rule out extension interference');
            }
        }

        // ── PRIORITY 6: Cookie issues (only when auth actually had problems) ──
        if (cookies.totalCookies === 0 && authFlow.detected && errors.length > 0 && apiErrors.length === 0) {
            if (!diagnosis.reasons.some(r => r.includes('cookie'))) {
                diagnosis.isIncomplete = true;
                diagnosis.reasons.push('No session cookies were set during the auth flow');
                diagnosis.recommendations.push('Check that third-party cookies are enabled in browser settings');
                diagnosis.recommendations.push('Try in incognito/private mode to eliminate extension interference');
            }
        }

        // Fallback: generic guidance only when something is wrong but unidentified
        if (diagnosis.isIncomplete && !diagnosis.rootCause && diagnosis.recommendations.length === 0) {
            diagnosis.recommendations.push('Review browser console for JavaScript errors');
            diagnosis.recommendations.push('Ensure popups and redirects are not blocked');
            diagnosis.recommendations.push('Try clearing browser cache and cookies');
            diagnosis.recommendations.push('Test in incognito mode to rule out browser extensions');
        }

        return diagnosis;
    }

    /** Returns HTML/text responses > 100 KB (candidates for embedded scripts) */
    _detectLargeResponses() {
        return this.entries
            .filter(e => {
                const mime = (e.response.content.mimeType || '').toLowerCase();
                const size = e.response.content.size || 0;
                return size > 102400 && (mime.includes('html') || mime.includes('text'));
            })
            .map(e => ({
                url: e.request.url,
                sizeKB: ((e.response.content.size || 0) / 1024).toFixed(0)
            }))
            .sort((a, b) => b.sizeKB - a.sizeKB);
    }

    /** Returns unique hostnames for JS loaded from domains other than the primary app */
    _detectThirdPartyScripts() {
        const primaryHosts = new Set();

        // Identify primary app hosts (most-requested domains)
        const domains = this.getDomainAnalysis();
        if (domains.length > 0) {
            // Top-2 domains by request count are considered "first-party"
            domains.slice(0, 2).forEach(d => primaryHosts.add(d.domain));
        }

        const thirdParty = new Set();
        this.entries.forEach(e => {
            const mime = (e.response.content.mimeType || '').toLowerCase();
            if (!mime.includes('javascript') && !mime.includes('script')) return;
            try {
                const host = new URL(e.request.url).hostname;
                if (!primaryHosts.has(host) && !this._isSentryRequest(e.request.url)) {
                    thirdParty.add(host);
                }
            } catch (_) { /* ignore */ }
        });

        return [...thirdParty];
    }

    /** Returns URLs of external scripts (JS loaded from a CDN or remote host) */
    _detectExternalScripts() {
        return this.entries
            .filter(e => {
                const mime = (e.response.content.mimeType || '').toLowerCase();
                return mime.includes('javascript') || mime.includes('script');
            })
            .map(e => e.request.url);
    }
}

module.exports = { HARAnalyzer };
