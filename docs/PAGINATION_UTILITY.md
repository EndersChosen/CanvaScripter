# Pagination Utility Documentation

## Overview
The pagination utility (`src/shared/pagination.js`) provides a robust solution for handling Canvas LMS API pagination for both REST and GraphQL endpoints.

## Functions

### 1. `getNextPage(links)`
**Purpose**: Parses the Link header from REST API responses to find the next page URL.

**Parameters**:
- `links` (string): The Link header value from the response

**Returns**: 
- (string|boolean): The URL for the next page, or `false` if no next page exists

**Usage**:
```javascript
const nextPageUrl = getNextPage(response.headers.link);
```

---

### 2. `getAllPages(axiosConfig)`
**Purpose**: Automatically fetches all pages from a REST API endpoint using Link header pagination.

**Parameters**:
- `axiosConfig` (Object): Axios configuration object with:
  - `method`: HTTP method (usually 'GET')
  - `url`: The API endpoint URL
  - `headers`: Request headers (must include Authorization)
  - `params`: Optional query parameters (per_page will be set to 100 automatically)

**Returns**: 
- `Promise<Array>`: Array containing all results from all pages

**Features**:
- Automatically sets `per_page=100` for efficiency
- Uses `errorCheck()` utility for proper error handling
- Handles Link header navigation automatically
- Logs progress with page counts

**Usage Example**:
```javascript
const pagination = require('../pagination.js');

async function getAllQuizzes(domain, token, courseId) {
    const axiosConfig = {
        method: 'GET',
        url: `https://${domain}/api/v1/courses/${courseId}/quizzes`,
        headers: {
            'Authorization': `Bearer ${token}`
        },
        params: {
            per_page: 100  // Optional, will be set automatically
        }
    };

    try {
        const allQuizzes = await pagination.getAllPages(axiosConfig);
        return allQuizzes;
    } catch (error) {
        throw error;
    }
}
```

---

### 3. `getAllPagesGraphQL(config)`
**Purpose**: Automatically fetches all pages from a GraphQL endpoint using cursor-based pagination.

**Parameters**:
- `config` (Object): Configuration object with:
  - `domain` (string): Canvas domain
  - `token` (string): Canvas API token
  - `query` (string): GraphQL query string (must include `$nextPage` parameter and `pageInfo { hasNextPage, endCursor }`)
  - `variables` (Object): Initial variables for the query
  - `dataPath` (string): Dot-notation path to the connection data (e.g., 'data.course.quizzesConnection')
  - `extractNodes` (Function): Optional function to extract nodes from connection data

**Returns**: 
- `Promise<Array>`: Array containing all results from all pages

**Features**:
- Uses `errorCheck()` utility for proper error handling
- Handles cursor-based pagination automatically
- Supports nested data structures
- Logs progress with page counts

**Usage Example**:
```javascript
const pagination = require('../pagination.js');

async function getClassicQuizzes(domain, token, courseID) {
    const query = `
        query MyQuery($courseID: ID, $nextPage: String) {
            course(id: $courseID) {
                quizzesConnection(first: 100, after: $nextPage) {
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                    edges {
                        node {
                            _id
                            type
                            title
                        }
                    }
                }
            }
        }
    `;

    try {
        const quizzes = await pagination.getAllPagesGraphQL({
            domain: domain,
            token: token,
            query: query,
            variables: {
                courseID: courseID
            },
            dataPath: 'data.course.quizzesConnection',
            extractNodes: (connectionData) => {
                return connectionData.edges.map(edge => edge.node);
            }
        });
        
        return quizzes;
    } catch (error) {
        throw error;
    }
}
```

---

## Canvas API Pagination Styles

### REST API Pagination
Canvas REST APIs use Link headers for pagination:
- Max results per page: 100 (use `per_page=100` parameter)
- Next page URL is provided in the `Link` header
- Documentation: https://canvas.instructure.com/doc/api/file.pagination.html

**Example Link Header**:
```
Link: <https://example.instructure.com/api/v1/courses/1/quizzes?page=2&per_page=100>; rel="next"
```

### GraphQL Pagination
Canvas GraphQL APIs use cursor-based pagination:
- Max results per page: 100 (use `first: 100` in query)
- Query must include `$nextPage` parameter
- Response must include `pageInfo { hasNextPage, endCursor }`
- Use `endCursor` value as `after` parameter for next page

**Example GraphQL Query**:
```graphql
query MyQuery($courseID: ID, $nextPage: String) {
    course(id: $courseID) {
        quizzesConnection(first: 100, after: $nextPage) {
            pageInfo {
                hasNextPage
                endCursor
            }
            edges {
                node {
                    _id
                    title
                }
            }
        }
    }
}
```

---

## Error Handling
Both `getAllPages()` and `getAllPagesGraphQL()` use the `errorCheck()` utility function for consistent error handling across the application. This ensures:
- Network errors are caught and logged
- API errors are properly formatted
- Rate limiting is handled
- Invalid responses are detected

---

## Best Practices

1. **Always use these utilities for pagination** instead of implementing custom pagination logic
2. **Let the utilities set per_page/first** values automatically (both default to 100)
3. **Handle errors** in the calling function using try-catch blocks
4. **Log progress** when dealing with large datasets
5. **Use GraphQL when possible** for better performance with complex queries
6. **Use REST API** for simple list operations and when GraphQL doesn't support the endpoint

---

## Migration Guide

### Before (Manual Pagination):
```javascript
// ❌ Manual pagination - prone to errors
let allQuizzes = [];
let nextPage = url;
while (nextPage) {
    const response = await axios.get(nextPage, { headers });
    allQuizzes.push(...response.data);
    nextPage = pagination.getNextPage(response.headers.link);
}
```

### After (Using Utility):
```javascript
// ✅ Using pagination utility - clean and error-handled
const axiosConfig = {
    method: 'GET',
    url: url,
    headers: headers
};
const allQuizzes = await pagination.getAllPages(axiosConfig);
```

---

## Module Exports
```javascript
module.exports = { 
    getNextPage,        // Parse Link header for next page URL
    getAllPages,        // Get all pages from REST API
    getAllPagesGraphQL  // Get all pages from GraphQL API
};
```
