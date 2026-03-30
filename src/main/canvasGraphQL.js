/**
 * Canvas GraphQL Schema Introspection & Query Execution
 * 
 * Introspects the Canvas LMS GraphQL schema, parses it into a compact
 * searchable index, caches it locally, and provides query execution.
 * 
 * Endpoint: {domain}/api/graphql
 * Auth:     Bearer {token}
 * 
 * Inspired by LangChain's BaseGraphQLTool / GraphQLAPIWrapper pattern:
 *   - Fetch schema via introspection
 *   - Cache for search / browsing
 *   - Execute arbitrary queries
 */

const Store = require('electron-store');
const axios = require('axios');
const store = new Store();

const GQL_SCHEMA_CACHE_KEY = 'canvasGraphQLSchema';
const GQL_SCHEMA_META_KEY = 'canvasGraphQLSchemaMeta';

// ============================================================================
// Introspection query — fetches types, fields, args, enums
// ============================================================================

const INTROSPECTION_QUERY = `
query IntrospectionQuery {
  __schema {
    queryType { name }
    mutationType { name }
    types {
      name
      kind
      description
      fields {
        name
        description
        args {
          name
          description
          type { ...TypeRef }
        }
        type { ...TypeRef }
      }
      inputFields {
        name
        description
        type { ...TypeRef }
      }
      enumValues {
        name
        description
      }
    }
  }
}

fragment TypeRef on __Type {
  name
  kind
  ofType {
    name
    kind
    ofType {
      name
      kind
      ofType {
        name
        kind
      }
    }
  }
}`;

// ============================================================================
// Schema parsing helpers
// ============================================================================

/**
 * Flatten a nested type reference into a readable string.
 * e.g. { kind: 'NON_NULL', ofType: { kind: 'LIST', ofType: { name: 'String' } } }
 *   => 'String![]' style representation
 */
function flattenTypeRef(typeRef, depth = 0) {
    if (!typeRef || depth > 4) return 'Unknown';
    if (typeRef.name) {
        return typeRef.name;
    }
    if (typeRef.kind === 'NON_NULL' && typeRef.ofType) {
        return flattenTypeRef(typeRef.ofType, depth + 1) + '!';
    }
    if (typeRef.kind === 'LIST' && typeRef.ofType) {
        return '[' + flattenTypeRef(typeRef.ofType, depth + 1) + ']';
    }
    if (typeRef.ofType) {
        return flattenTypeRef(typeRef.ofType, depth + 1);
    }
    return typeRef.kind || 'Unknown';
}

/** Types to exclude from the cached index */
const EXCLUDED_TYPE_PREFIXES = ['__'];
const BUILTIN_SCALARS = new Set(['String', 'Int', 'Float', 'Boolean', 'ID']);

/**
 * Parse the raw introspection result into a compact, searchable schema index.
 */
function parseIntrospectionResult(data) {
    const schema = data.__schema || data.data?.__schema;
    if (!schema) throw new Error('Invalid introspection result');

    const queryTypeName = schema.queryType?.name || 'Query';
    const mutationTypeName = schema.mutationType?.name || 'Mutation';

    const types = [];
    let queryFields = [];
    let mutationFields = [];
    let totalFields = 0;

    for (const type of (schema.types || [])) {
        // Skip introspection types and built-in scalars
        if (EXCLUDED_TYPE_PREFIXES.some(p => type.name.startsWith(p))) continue;
        if (BUILTIN_SCALARS.has(type.name) && type.kind === 'SCALAR') continue;

        const compactType = {
            name: type.name,
            kind: type.kind, // OBJECT, INPUT_OBJECT, ENUM, INTERFACE, UNION, SCALAR
            description: (type.description || '').substring(0, 300),
        };

        // Fields (for OBJECT and INTERFACE types)
        if (type.fields && type.fields.length > 0) {
            compactType.fields = type.fields.map(f => ({
                name: f.name,
                type: flattenTypeRef(f.type),
                description: (f.description || '').substring(0, 200),
                args: (f.args || []).filter(a => a.name).map(a => ({
                    name: a.name,
                    type: flattenTypeRef(a.type),
                    description: (a.description || '').substring(0, 150),
                }))
            }));
            totalFields += compactType.fields.length;

            // Extract query/mutation root fields
            if (type.name === queryTypeName) {
                queryFields = compactType.fields;
            } else if (type.name === mutationTypeName) {
                mutationFields = compactType.fields;
            }
        }

        // Input fields (for INPUT_OBJECT types)
        if (type.inputFields && type.inputFields.length > 0) {
            compactType.inputFields = type.inputFields.map(f => ({
                name: f.name,
                type: flattenTypeRef(f.type),
                description: (f.description || '').substring(0, 200),
            }));
            totalFields += compactType.inputFields.length;
        }

        // Enum values
        if (type.enumValues && type.enumValues.length > 0) {
            compactType.enumValues = type.enumValues.map(v => ({
                name: v.name,
                description: (v.description || '').substring(0, 100),
            }));
        }

        types.push(compactType);
    }

    return {
        types,
        queryFields,
        mutationFields,
        stats: {
            typeCount: types.length,
            queryCount: queryFields.length,
            mutationCount: mutationFields.length,
            totalFields,
        }
    };
}

// ============================================================================
// Introspection & caching
// ============================================================================

/**
 * Run introspection against a Canvas GraphQL endpoint.
 * @param {string} domain - Canvas domain
 * @param {string} token - Canvas API token (Bearer)
 * @returns {Promise<Object>} Parsed schema index
 */
async function introspectSchema(domain, token) {
    const response = await axios.post(
        `https://${domain}/api/graphql`,
        { query: INTROSPECTION_QUERY },
        {
            headers: { 'Authorization': `Bearer ${token}` },
            timeout: 30000,
        }
    );

    if (response.data.errors && response.data.errors.length > 0) {
        const errMsg = response.data.errors.map(e => e.message).join('; ');
        throw new Error(`GraphQL introspection errors: ${errMsg}`);
    }

    return parseIntrospectionResult(response.data.data || response.data);
}

/**
 * Introspect and cache the Canvas GraphQL schema.
 * @param {string} domain
 * @param {string} token
 * @returns {Promise<{ success: boolean, stats?: Object, error?: string }>}
 */
async function scanAndCacheGraphQLSchema(domain, token) {
    try {
        const result = await introspectSchema(domain, token);
        store.set(GQL_SCHEMA_CACHE_KEY, {
            types: result.types,
            queryFields: result.queryFields,
            mutationFields: result.mutationFields,
        });
        store.set(GQL_SCHEMA_META_KEY, {
            domain,
            fetchedAt: new Date().toISOString(),
            ...result.stats,
        });
        return { success: true, ...result.stats, domain };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Get the cached GraphQL schema.
 */
function getCachedGraphQLSchema() {
    return store.get(GQL_SCHEMA_CACHE_KEY, null);
}

/**
 * Get metadata about the cached GraphQL schema.
 */
function getGraphQLSchemaMeta() {
    return store.get(GQL_SCHEMA_META_KEY, null);
}

// ============================================================================
// Schema search
// ============================================================================

/**
 * Search the cached GraphQL schema for types, fields, queries, or mutations.
 * @param {string} query - Search terms (space-separated, all must match)
 * @param {string} [category] - Optional filter: 'query', 'mutation', 'type', or 'all'
 * @param {number} [limit=15] - Max results
 * @returns {Array} Matching schema entries
 */
function searchGraphQLSchema(query, category = 'all', limit = 15) {
    const cached = getCachedGraphQLSchema();
    if (!cached) return [];

    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return [];

    const results = [];

    // Search root query fields
    if (category === 'all' || category === 'query') {
        for (const field of (cached.queryFields || [])) {
            const text = [field.name, field.type, field.description,
            ...(field.args || []).map(a => a.name + ' ' + a.type)
            ].join(' ').toLowerCase();
            if (terms.every(t => text.includes(t))) {
                let score = terms.reduce((s, t) =>
                    s + (field.name.toLowerCase().includes(t) ? 5 : 0)
                    + (field.description.toLowerCase().includes(t) ? 2 : 0), 1);
                results.push({ category: 'query', field, score });
            }
        }
    }

    // Search root mutation fields
    if (category === 'all' || category === 'mutation') {
        for (const field of (cached.mutationFields || [])) {
            const text = [field.name, field.type, field.description,
            ...(field.args || []).map(a => a.name + ' ' + a.type)
            ].join(' ').toLowerCase();
            if (terms.every(t => text.includes(t))) {
                let score = terms.reduce((s, t) =>
                    s + (field.name.toLowerCase().includes(t) ? 5 : 0)
                    + (field.description.toLowerCase().includes(t) ? 2 : 0), 1);
                results.push({ category: 'mutation', field, score });
            }
        }
    }

    // Search types (OBJECT, INPUT_OBJECT, ENUM, etc.)
    if (category === 'all' || category === 'type') {
        for (const type of (cached.types || [])) {
            const typeText = [
                type.name, type.kind, type.description,
                ...(type.fields || []).map(f => f.name),
                ...(type.inputFields || []).map(f => f.name),
                ...(type.enumValues || []).map(v => v.name),
            ].join(' ').toLowerCase();

            if (terms.every(t => typeText.includes(t))) {
                let score = terms.reduce((s, t) =>
                    s + (type.name.toLowerCase().includes(t) ? 5 : 0)
                    + (type.description.toLowerCase().includes(t) ? 2 : 0), 1);
                results.push({ category: 'type', type: summarizeType(type), score });
            }
        }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit).map(({ score, ...rest }) => rest);
}

/**
 * Summarize a type for search results (trim to essential info).
 */
function summarizeType(type) {
    const summary = { name: type.name, kind: type.kind };
    if (type.description) summary.description = type.description;
    if (type.fields) {
        summary.fields = type.fields.slice(0, 20).map(f => ({
            name: f.name,
            type: f.type,
            ...(f.args && f.args.length > 0
                ? { args: f.args.map(a => `${a.name}: ${a.type}`).join(', ') }
                : {})
        }));
        if (type.fields.length > 20) {
            summary.fieldCount = type.fields.length;
            summary.truncated = true;
        }
    }
    if (type.inputFields) {
        summary.inputFields = type.inputFields.slice(0, 20).map(f => ({
            name: f.name, type: f.type
        }));
    }
    if (type.enumValues) {
        summary.enumValues = type.enumValues.slice(0, 30).map(v => v.name);
        if (type.enumValues.length > 30) {
            summary.enumValueCount = type.enumValues.length;
        }
    }
    return summary;
}

// ============================================================================
// Query execution
// ============================================================================

/**
 * Execute a GraphQL query against Canvas.
 * Rejects mutations for safety — only read queries are allowed through this function.
 * @param {string} domain
 * @param {string} token
 * @param {string} queryStr - The GraphQL query string
 * @param {Object} [variables] - Query variables
 * @returns {Promise<Object>} Query result
 */
async function executeGraphQLQuery(domain, token, queryStr, variables) {
    // Safety check: reject mutations
    const trimmed = queryStr.trim();
    if (/^mutation\b/i.test(trimmed)) {
        throw new Error('Mutations are not allowed through the GraphQL query tool. Use canvas_graphql_mutation for write operations.');
    }

    const response = await axios.post(
        `https://${domain}/api/graphql`,
        {
            query: queryStr,
            ...(variables && Object.keys(variables).length > 0 ? { variables } : {})
        },
        {
            headers: { 'Authorization': `Bearer ${token}` },
            timeout: 30000,
        }
    );

    if (response.data.errors && response.data.errors.length > 0) {
        const errMsg = response.data.errors.map(e => e.message).join('; ');
        throw new Error(`GraphQL query error: ${errMsg}`);
    }

    return response.data.data || response.data;
}

/**
 * Execute a GraphQL mutation against Canvas.
 * Requires user approval via the destructive-tool confirmation flow.
 * @param {string} domain
 * @param {string} token
 * @param {string} mutationStr - The GraphQL mutation string
 * @param {Object} [variables] - Mutation variables
 * @returns {Promise<Object>} Mutation result
 */
async function executeGraphQLMutation(domain, token, mutationStr, variables) {
    const trimmed = mutationStr.trim();
    if (!/^mutation\b/i.test(trimmed)) {
        throw new Error('This function only accepts mutations. Use executeGraphQLQuery for read queries.');
    }

    const response = await axios.post(
        `https://${domain}/api/graphql`,
        {
            query: mutationStr,
            ...(variables && Object.keys(variables).length > 0 ? { variables } : {})
        },
        {
            headers: { 'Authorization': `Bearer ${token}` },
            timeout: 30000,
        }
    );

    if (response.data.errors && response.data.errors.length > 0) {
        const errMsg = response.data.errors.map(e => e.message).join('; ');
        throw new Error(`GraphQL mutation error: ${errMsg}`);
    }

    return response.data.data || response.data;
}

module.exports = {
    introspectSchema,
    scanAndCacheGraphQLSchema,
    getCachedGraphQLSchema,
    getGraphQLSchemaMeta,
    searchGraphQLSchema,
    executeGraphQLQuery,
    executeGraphQLMutation,
};
