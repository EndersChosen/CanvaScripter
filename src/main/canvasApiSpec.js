/**
 * Canvas API Spec Loader
 * 
 * Fetches the Canvas LMS Swagger 1.2 specification from a Canvas instance,
 * parses it into a compact searchable index, and caches it locally.
 * 
 * Source: {domain}/doc/api/api-docs.json  (resource listing)
 *         {domain}/doc/api/{resource}.json (individual specs)
 */

const Store = require('electron-store');
const store = new Store();

const SPEC_CACHE_KEY = 'canvasApiSpec';
const SPEC_META_KEY = 'canvasApiSpecMeta';
const BATCH_SIZE = 15;
const CANONICAL_DOMAIN = 'canvas.instructure.com';

/**
 * Fetch with timeout
 */
async function fetchJSON(url, timeoutMs = 15000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
        return await res.json();
    } finally {
        clearTimeout(id);
    }
}

/**
 * Extract compact endpoint entries from a Swagger 1.2 resource JSON
 */
function parseResourceSpec(resourceName, spec) {
    const endpoints = [];
    if (!spec || !Array.isArray(spec.apis)) return endpoints;

    for (const api of spec.apis) {
        if (!Array.isArray(api.operations)) continue;
        for (const op of api.operations) {
            const params = (op.parameters || []).map(p => ({
                name: p.name,
                type: p.type,
                required: !!p.required,
                paramType: p.paramType,
                description: (p.description || '').substring(0, 200)
            }));

            endpoints.push({
                resource: resourceName,
                method: op.method,
                path: api.path || '',
                summary: op.summary || '',
                nickname: op.nickname || '',
                description: (op.notes || op.summary || '').substring(0, 400),
                deprecated: !!op.deprecated,
                parameters: params
            });
        }
    }
    return endpoints;
}

/**
 * Fetch the full Canvas API spec from a domain and build the compact index.
 * @param {string} [domain] - Canvas domain to fetch from. Defaults to canonical.
 * @param {Function} [onProgress] - Progress callback: (fetched, total) => void
 * @returns {Promise<{ endpoints: Array, resourceCount: number, endpointCount: number }>}
 */
async function fetchCanvasApiSpec(domain, onProgress) {
    const baseDomain = domain || CANONICAL_DOMAIN;
    const baseUrl = `https://${baseDomain}/doc/api`;

    // 1. Fetch resource listing
    const listing = await fetchJSON(`${baseUrl}/api-docs.json`);
    const resourcePaths = (listing.apis || []).map(a => a.path).filter(Boolean);
    const total = resourcePaths.length;

    if (onProgress) onProgress(0, total);

    // 2. Fetch individual resources in batches
    const allEndpoints = [];
    for (let i = 0; i < resourcePaths.length; i += BATCH_SIZE) {
        const batch = resourcePaths.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
            batch.map(rp => {
                const url = `${baseUrl}${rp}`;
                return fetchJSON(url).then(spec => {
                    const name = rp.replace(/^\//, '').replace(/\.json$/, '')
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, c => c.toUpperCase());
                    return { name, spec };
                });
            })
        );
        for (const r of results) {
            if (r.status === 'fulfilled') {
                allEndpoints.push(...parseResourceSpec(r.value.name, r.value.spec));
            }
        }
        if (onProgress) onProgress(Math.min(i + BATCH_SIZE, total), total);
    }

    return {
        endpoints: allEndpoints,
        resourceCount: total,
        endpointCount: allEndpoints.length
    };
}

/**
 * Fetch and cache the Canvas API spec.
 */
async function scanAndCacheSpec(domain, onProgress) {
    try {
        const result = await fetchCanvasApiSpec(domain, onProgress);
        store.set(SPEC_CACHE_KEY, result.endpoints);
        store.set(SPEC_META_KEY, {
            domain: domain || CANONICAL_DOMAIN,
            fetchedAt: new Date().toISOString(),
            resourceCount: result.resourceCount,
            endpointCount: result.endpointCount
        });
        return { success: true, ...result, domain: domain || CANONICAL_DOMAIN };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Load the cached spec from electron-store.
 */
function getCachedSpec() {
    return store.get(SPEC_CACHE_KEY, null);
}

/**
 * Get metadata about the cached spec.
 */
function getSpecMeta() {
    return store.get(SPEC_META_KEY, null);
}

/**
 * Search the cached API spec for endpoints matching a query.
 * Matches against resource name, path, summary, nickname, and description.
 * @param {string} query - Search terms (space-separated, all must match)
 * @param {number} [limit=15] - Maximum results to return
 */
function searchSpec(query, limit = 15) {
    const endpoints = getCachedSpec();
    if (!endpoints || !Array.isArray(endpoints)) return [];

    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return [];

    const scored = [];
    for (const ep of endpoints) {
        if (ep.deprecated) continue;

        const searchText = [
            ep.resource,
            ep.method,
            ep.path,
            ep.summary,
            ep.nickname,
            ep.description
        ].join(' ').toLowerCase();

        // All terms must match
        if (!terms.every(t => searchText.includes(t))) continue;

        // Score: prefer summary/path matches
        let score = 0;
        const lowerSummary = (ep.summary || '').toLowerCase();
        const lowerPath = (ep.path || '').toLowerCase();
        for (const t of terms) {
            if (lowerSummary.includes(t)) score += 3;
            if (lowerPath.includes(t)) score += 2;
        }
        score += 1; // base score for matching

        scored.push({ endpoint: ep, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(s => s.endpoint);
}

module.exports = {
    fetchCanvasApiSpec,
    scanAndCacheSpec,
    getCachedSpec,
    getSpecMeta,
    searchSpec,
    CANONICAL_DOMAIN
};
