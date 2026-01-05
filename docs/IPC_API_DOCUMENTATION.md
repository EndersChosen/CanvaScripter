# IPC Handler API Documentation

## Overview

This document provides comprehensive API documentation for all IPC (Inter-Process Communication) handlers in the CanvaScripter Electron application. These handlers enable communication between the main process and renderer processes.

## Handler Categories

The IPC handlers are organized into the following modules:

1. **Conversation Handlers** - Canvas conversation operations
2. **Communication Channel Handlers** - Email channel management
3. **Assignment Handlers** - Assignment and assignment group operations
4. **Course Handlers** - Course management operations
5. **Content Handlers** - Discussions, pages, announcements
6. **File Handlers** - File system operations with security
7. **Search Handlers** - User and account search operations
8. **SIS Handlers** - SIS data generation and import
9. **Utility Handlers** - HAR analysis, CSV parsing, file uploads

---

## Conversation Handlers

**Module:** `src/main/ipc/conversationHandlers.js`

### `axios:getConvos`

Fetches conversations from Canvas using GraphQL with pagination.

**Parameters:**
```javascript
{
  domain: string,     // Canvas domain (e.g., "school.instructure.com")
  token: string,      // Canvas API token
  scope: string,      // Filter scope: 'inbox', 'unread', 'starred', 'sent', 'archived', 'all'
  filter: string[]    // Optional: Array of user IDs to filter by
}
```

**Returns:**
```javascript
{
  conversations: Array<Object>,  // Array of conversation objects
  count: number,                 // Total conversations fetched
  cancelled: boolean            // Whether operation was cancelled
}
```

**Cancellation:** Call `axios:cancelGetConvos` to stop this operation.

**Example:**
```javascript
const result = await ipcRenderer.invoke('axios:getConvos', {
  domain: 'school.instructure.com',
  token: 'your-api-token',
  scope: 'inbox',
  filter: []
});
```

---

### `axios:cancelGetConvos`

Cancels an in-progress conversation fetch operation.

**Parameters:** None

**Returns:** `void`

**Example:**
```javascript
await ipcRenderer.invoke('axios:cancelGetConvos');
```

---

### `axios:getDeletedConversations`

Fetches deleted conversations that can be restored.

**Parameters:**
```javascript
{
  domain: string,     // Canvas domain
  token: string,      // Canvas API token
  userId: string      // User ID to fetch deleted conversations for
}
```

**Returns:**
```javascript
{
  conversations: Array<Object>,  // Array of deleted conversation objects
  count: number                  // Total deleted conversations found
}
```

**Cancellation:** Call `axios:cancelGetDeletedConversations` to stop.

---

### `axios:cancelGetDeletedConversations`

Cancels deleted conversation fetch operation.

**Parameters:** None

**Returns:** `void`

---

### `axios:restoreDeletedConversations`

Restores previously deleted conversations.

**Parameters:**
```javascript
{
  domain: string,                // Canvas domain
  token: string,                 // Canvas API token
  conversations: Array<Object>   // Conversations to restore (with _id property)
}
```

**Returns:**
```javascript
{
  restored: number,   // Count of successfully restored conversations
  failed: number,     // Count of failed restorations
  cancelled: boolean  // Whether operation was cancelled
}
```

**Cancellation:** Call `axios:cancelRestoreDeletedConversations` to stop.

---

### `axios:deleteConvos`

Deletes multiple conversations.

**Parameters:**
```javascript
{
  domain: string,                // Canvas domain
  token: string,                 // Canvas API token
  conversations: Array<Object>   // Conversations to delete (with id property)
}
```

**Returns:**
```javascript
{
  deleted: number,    // Count of successfully deleted conversations
  failed: number,     // Count of failed deletions
  cancelled: boolean  // Whether operation was cancelled
}
```

**Cancellation:** Call `axios:cancelDeleteConvos` to stop.

---

## Communication Channel Handlers

**Module:** `src/main/ipc/commChannelHandlers.js`

### `axios:awsCheck`

Checks if emails are in AWS SES suppression list.

**Parameters:**
```javascript
{
  emails: Array<string>  // Array of email addresses to check
}
```

**Returns:**
```javascript
{
  suppressedEmails: Array<string>,  // Emails found in suppression list
  message: string                    // Status message
}
```

**Example:**
```javascript
const result = await ipcRenderer.invoke('axios:awsCheck', {
  emails: ['user1@example.com', 'user2@example.com']
});
```

---

### `axios:bounceCheck`

Checks if emails have bounced communication channels in Canvas.

**Parameters:**
```javascript
{
  domain: string,         // Canvas domain
  token: string,          // Canvas API token
  emails: Array<string>   // Emails to check
}
```

**Returns:**
```javascript
{
  bouncedEmails: Array<Object>,  // Bounced email details
  count: number                  // Total bounced emails found
}
```

---

### `axios:resetEmails`

Resets bounced communication channels for users.

**Parameters:**
```javascript
{
  domain: string,              // Canvas domain
  token: string,               // Canvas API token
  users: Array<Object>,        // Users with bounced channels
  resetBehavior: string        // 'reset', 'confirm', 'unconfirm'
}
```

**Returns:**
```javascript
{
  successful: number,   // Count of successful resets
  failed: number,       // Count of failed resets
  cancelled: boolean    // Whether operation was cancelled
}
```

**Cancellation:** Call `axios:cancelResetEmails` to stop.

---

### `getSuppressedEmails`

Retrieves the current list of AWS-suppressed emails.

**Parameters:** None

**Returns:**
```javascript
{
  suppressedEmails: Array<string>  // Currently suppressed emails
}
```

---

### `clearSuppressedEmails`

Clears the suppressed emails list.

**Parameters:** None

**Returns:** `void`

---

## Assignment Handlers

**Module:** `src/main/ipc/assignmentHandlers.js`

### `axios:createAssignments`

Creates assignments in multiple courses.

**Parameters:**
```javascript
{
  domain: string,                    // Canvas domain
  token: string,                     // Canvas API token
  courseIds: Array<string>,          // Course IDs to create assignments in
  assignmentData: Object,            // Assignment configuration
  assignmentGroupId: string          // Optional: Assignment group ID
}
```

**Returns:**
```javascript
{
  created: number,    // Count of successfully created assignments
  failed: number,     // Count of failed creations
  details: Array      // Detailed results per course
}
```

**Example:**
```javascript
const result = await ipcRenderer.invoke('axios:createAssignments', {
  domain: 'school.instructure.com',
  token: 'your-api-token',
  courseIds: ['123', '456'],
  assignmentData: {
    name: 'Homework 1',
    points_possible: 100,
    due_at: '2026-02-01T23:59:00Z'
  }
});
```

---

### `axios:deleteAssignments`

Deletes assignments from courses.

**Parameters:**
```javascript
{
  domain: string,                    // Canvas domain
  token: string,                     // Canvas API token
  assignments: Array<Object>         // Assignments to delete (with course_id and id)
}
```

**Returns:**
```javascript
{
  deleted: number,    // Count of successfully deleted assignments
  failed: number      // Count of failed deletions
}
```

---

### `axios:createAssignmentGroups`

Creates assignment groups in multiple courses.

**Parameters:**
```javascript
{
  domain: string,                    // Canvas domain
  token: string,                     // Canvas API token
  courseIds: Array<string>,          // Course IDs
  groupName: string,                 // Assignment group name
  groupWeight: number                // Group weight (percentage)
}
```

**Returns:**
```javascript
{
  created: number,    // Count of successfully created groups
  failed: number,     // Count of failed creations
  cancelled: boolean  // Whether operation was cancelled
}
```

**Cancellation:** Call `axios:cancelCreateAssignmentGroups` to stop.

---

### `axios:deleteEmptyAssignmentGroups`

Deletes assignment groups that have no assignments.

**Parameters:**
```javascript
{
  domain: string,                    // Canvas domain
  token: string,                     // Canvas API token
  courseIds: Array<string>           // Course IDs to check
}
```

**Returns:**
```javascript
{
  deleted: number,    // Count of deleted empty groups
  failed: number,     // Count of failed deletions
  cancelled: boolean  // Whether operation was cancelled
}
```

**Cancellation:** Call `axios:cancelDeleteEmptyAssignmentGroups` to stop.

---

## Course Handlers

**Module:** `src/main/ipc/courseHandlers.js`

### `axios:restoreContent`

Restores deleted content (assignments, discussions, etc.) in courses.

**Parameters:**
```javascript
{
  domain: string,                    // Canvas domain
  token: string,                     // Canvas API token
  courseId: string,                  // Course ID
  contentType: string,               // Content type: 'assignments', 'discussions', 'pages', 'quizzes'
  itemIds: Array<string>             // IDs of items to restore
}
```

**Returns:**
```javascript
{
  restored: number,   // Count of successfully restored items
  failed: number      // Count of failed restorations
}
```

---

### `axios:resetCourses`

Resets course content (deletes all content while preserving structure).

**Parameters:**
```javascript
{
  domain: string,                    // Canvas domain
  token: string,                     // Canvas API token
  courseIds: Array<string>,          // Course IDs to reset
  options: Object                    // Reset options (what to delete)
}
```

**Returns:**
```javascript
{
  reset: number,      // Count of successfully reset courses
  failed: number      // Count of failed resets
}
```

---

### `axios:createSupportCourse`

Creates a support/help course with predefined content.

**Parameters:**
```javascript
{
  domain: string,        // Canvas domain
  token: string,         // Canvas API token
  accountId: string,     // Account ID for course
  courseName: string,    // Course name
  courseCode: string     // Course code
}
```

**Returns:**
```javascript
{
  courseId: string,   // ID of created course
  success: boolean    // Whether creation was successful
}
```

---

### `axios:publishUnpublishCourses`

Bulk publish or unpublish courses.

**Parameters:**
```javascript
{
  domain: string,                    // Canvas domain
  token: string,                     // Canvas API token
  courseIds: Array<string>,          // Course IDs
  action: string                     // 'publish' or 'unpublish'
}
```

**Returns:**
```javascript
{
  updated: number,    // Count of successfully updated courses
  failed: number      // Count of failed updates
}
```

---

## Content Handlers

**Module:** `src/main/ipc/contentHandlers.js`

### `axios:createDiscussions`

Creates discussion topics in multiple courses.

**Parameters:**
```javascript
{
  domain: string,                    // Canvas domain
  token: string,                     // Canvas API token
  courseIds: Array<string>,          // Course IDs
  discussionData: Object             // Discussion configuration
}
```

**Discussion Data:**
```javascript
{
  title: string,              // Discussion title
  message: string,            // Discussion body (HTML)
  discussion_type: string,    // 'side_comment' or 'threaded'
  published: boolean,         // Publish immediately
  require_initial_post: boolean,  // Require post before seeing replies
  allow_rating: boolean,      // Enable ratings
  only_graders_can_rate: boolean  // Restrict ratings to graders
}
```

**Returns:**
```javascript
{
  created: number,    // Count of successfully created discussions
  failed: number,     // Count of failed creations
  cancelled: boolean  // Whether operation was cancelled
}
```

**Cancellation:** Call `axios:cancelCreateDiscussions` to stop.

---

### `axios:deleteAnnouncementsGraphQL`

Deletes announcements using GraphQL for better performance.

**Parameters:**
```javascript
{
  domain: string,                    // Canvas domain
  token: string,                     // Canvas API token
  courseIds: Array<string>           // Course IDs to delete announcements from
}
```

**Returns:**
```javascript
{
  deleted: number,    // Count of successfully deleted announcements
  failed: number,     // Count of failed deletions
  cancelled: boolean  // Whether operation was cancelled
}
```

**Cancellation:** Call `axios:cancelDeleteAnnouncements` to stop.

---

### `axios:createPages`

Creates pages in multiple courses.

**Parameters:**
```javascript
{
  domain: string,                    // Canvas domain
  token: string,                     // Canvas API token
  courseIds: Array<string>,          // Course IDs
  pageData: Object                   // Page configuration
}
```

**Page Data:**
```javascript
{
  title: string,              // Page title
  body: string,               // Page content (HTML)
  published: boolean,         // Publish immediately
  front_page: boolean,        // Set as course home page
  editing_roles: string       // Who can edit: 'teachers', 'students', 'public'
}
```

**Returns:**
```javascript
{
  created: number,    // Count of successfully created pages
  failed: number      // Count of failed creations
}
```

---

## File Handlers

**Module:** `src/main/ipc/fileHandlers.js`

### `sis:selectFolder`

Opens a folder selection dialog.

**Parameters:** None

**Returns:**
```javascript
string | null  // Selected folder path, or null if cancelled
```

**Security:** Selected folder is automatically added to the allowed paths list for this renderer.

---

### `sis:selectFile`

Opens a file selection dialog.

**Parameters:**
```javascript
{
  filters: Array<Object>  // Optional: File type filters
}
```

**Filter Format:**
```javascript
[
  { name: 'CSV Files', extensions: ['csv'] },
  { name: 'All Files', extensions: ['*'] }
]
```

**Returns:**
```javascript
{
  filePath: string  // Selected file path
} | null  // null if cancelled
```

**Security:** Selected file is automatically added to the allowed read paths list.

---

### `sis:readFile`

Reads a file's contents.

**Parameters:**
```javascript
{
  filePath: string,      // Absolute file path
  encoding: string       // Optional: File encoding (default: 'utf8')
}
```

**Returns:**
```javascript
{
  content: string  // File contents
}
```

**Security:** Only files previously selected via `sis:selectFile` can be read.

**Error Cases:**
- Throws error if file path is not in allowed list
- Throws error if file doesn't exist
- Throws error if file cannot be read

---

### `file:save`

Saves content to a file with save dialog.

**Parameters:**
```javascript
{
  defaultPath: string,   // Optional: Default file name/path
  filters: Array<Object>,  // Optional: File type filters
  content: string        // Content to save
}
```

**Returns:**
```javascript
{
  success: boolean,  // Whether save was successful
  filePath: string   // Path where file was saved
} | null  // null if user cancelled
```

---

### `file:write`

Writes content to a previously selected file or folder.

**Parameters:**
```javascript
{
  filePath: string,      // Absolute file path
  content: string,       // Content to write
  basePath: string       // Optional: Base directory (must be in allowed list)
}
```

**Returns:**
```javascript
{
  success: boolean,  // Whether write was successful
  filePath: string   // Path where file was written
}
```

**Security:** File path must be within an allowed directory or be an allowed write path.

---

### `har:analyze`

Analyzes a HAR (HTTP Archive) file.

**Parameters:**
```javascript
{
  harContent: Object  // Parsed HAR JSON object
}
```

**Returns:**
```javascript
{
  summary: Object,     // Analysis summary
  requests: Array,     // Analyzed requests
  performance: Object  // Performance metrics
}
```

---

## Search Handlers

**Module:** `src/main/ipc/searchHandlers.js`

### `users:search`

Searches for users in Canvas by name or SIS ID.

**Parameters:**
```javascript
{
  domain: string,        // Canvas domain
  token: string,         // Canvas API token
  accountId: string,     // Account ID to search in
  searchTerm: string     // Name or SIS ID to search for
}
```

**Returns:**
```javascript
{
  users: Array<Object>,  // Found users
  count: number          // Total users found
}
```

**User Object:**
```javascript
{
  id: string,
  name: string,
  sortable_name: string,
  short_name: string,
  sis_user_id: string,
  login_id: string,
  email: string
}
```

**Example:**
```javascript
const result = await ipcRenderer.invoke('users:search', {
  domain: 'school.instructure.com',
  token: 'your-api-token',
  accountId: '1',
  searchTerm: 'John Smith'
});
```

---

### `accounts:search`

Searches for Canvas accounts.

**Parameters:**
```javascript
{
  domain: string,        // Canvas domain
  token: string,         // Canvas API token
  searchTerm: string     // Account name to search for
}
```

**Returns:**
```javascript
{
  accounts: Array<Object>,  // Found accounts
  count: number             // Total accounts found
}
```

---

### `terms:search`

Searches for enrollment terms.

**Parameters:**
```javascript
{
  domain: string,        // Canvas domain
  token: string,         // Canvas API token
  accountId: string      // Account ID
}
```

**Returns:**
```javascript
{
  terms: Array<Object>,  // Enrollment terms
  count: number          // Total terms found
}
```

---

### `sections:search`

Searches for course sections.

**Parameters:**
```javascript
{
  domain: string,        // Canvas domain
  token: string,         // Canvas API token
  courseId: string,      // Course ID
  searchTerm: string     // Optional: Section name filter
}
```

**Returns:**
```javascript
{
  sections: Array<Object>,  // Found sections
  count: number             // Total sections found
}
```

---

### `logins:search`

Searches for user login information.

**Parameters:**
```javascript
{
  domain: string,        // Canvas domain
  token: string,         // Canvas API token
  userId: string         // User ID to get logins for
}
```

**Returns:**
```javascript
{
  logins: Array<Object>,  // User's login methods
  count: number           // Total logins found
}
```

---

### `enrollments:search`

Searches for enrollments in courses.

**Parameters:**
```javascript
{
  domain: string,          // Canvas domain
  token: string,           // Canvas API token
  courseId: string,        // Course ID
  enrollmentType: string,  // Optional: 'StudentEnrollment', 'TeacherEnrollment', etc.
  state: string            // Optional: 'active', 'inactive', 'completed'
}
```

**Returns:**
```javascript
{
  enrollments: Array<Object>,  // Found enrollments
  count: number                // Total enrollments found
}
```

---

## SIS Handlers

**Module:** `src/main/ipc/sisHandlers.js`

### `sis:previewData`

Generates preview of SIS import data.

**Parameters:**
```javascript
{
  importType: string,    // Type: 'users', 'courses', 'enrollments', etc.
  sampleData: Object     // Sample data for preview
}
```

**Returns:**
```javascript
{
  preview: string,   // CSV preview (first 10 rows)
  rowCount: number   // Total rows that would be generated
}
```

---

### `sis:fetchAuthProviders`

Fetches authentication providers for SIS imports.

**Parameters:**
```javascript
{
  domain: string,        // Canvas domain
  token: string,         // Canvas API token
  accountId: string      // Account ID
}
```

**Returns:**
```javascript
{
  providers: Array<Object>  // Available auth providers
}
```

---

### `sis:createFile`

Creates a SIS import CSV file.

**Parameters:**
```javascript
{
  importType: string,      // Import type
  data: Array<Object>,     // Data rows
  outputPath: string,      // Output file path
  options: Object          // Import options
}
```

**Returns:**
```javascript
{
  success: boolean,   // Whether file was created
  filePath: string,   // Path to created file
  rowCount: number    // Number of rows written
}
```

---

### `sis:createBulkFiles`

Creates multiple SIS import files (batched).

**Parameters:**
```javascript
{
  importType: string,          // Import type
  data: Array<Object>,         // All data
  outputDir: string,           // Output directory
  batchSize: number,           // Rows per file
  options: Object              // Import options
}
```

**Returns:**
```javascript
{
  success: boolean,        // Whether all files created
  filePaths: Array<string>,  // Paths to created files
  totalRows: number        // Total rows across all files
}
```

---

## Utility Handlers

**Module:** `src/main/ipc/utilityHandlers.js`

### `parseEmailsFromCSV`

Parses email addresses from CSV content.

**Parameters:**
```javascript
{
  csvContent: string,        // CSV file content
  columnIndex: number        // Optional: Column index (default: auto-detect)
}
```

**Returns:**
```javascript
{
  emails: Array<string>,  // Extracted email addresses
  count: number           // Total emails found
}
```

---

### `parseEmailsFromExcel`

Parses email addresses from Excel file.

**Parameters:**
```javascript
{
  filePath: string,          // Excel file path
  sheetName: string,         // Optional: Sheet name (default: first sheet)
  columnIndex: number        // Optional: Column index (default: auto-detect)
}
```

**Returns:**
```javascript
{
  emails: Array<string>,  // Extracted email addresses
  count: number           // Total emails found
}
```

---

### `fileUpload:analyzeEmailFile`

Analyzes an uploaded file for email patterns and domains.

**Parameters:**
```javascript
{
  filePath: string  // File path (CSV or Excel)
}
```

**Returns:**
```javascript
{
  emails: Array<string>,     // All emails found
  domains: Array<string>,    // Unique email domains
  statistics: Object,        // Email statistics
  patterns: Array<Object>    // Common email patterns
}
```

**Statistics Object:**
```javascript
{
  totalEmails: number,
  uniqueEmails: number,
  duplicates: number,
  invalidEmails: number,
  domainDistribution: Object  // domain -> count
}
```

---

## Error Handling

All IPC handlers follow consistent error handling patterns:

### Standard Error Response

```javascript
{
  error: true,
  message: string,        // User-friendly error message
  code: string,          // Error code (e.g., 'NETWORK_ERROR', 'AUTH_ERROR')
  details: Object        // Optional: Additional error details
}
```

### Common Error Codes

- `NETWORK_ERROR` - Network request failed
- `AUTH_ERROR` - Authentication failed (invalid token)
- `PERMISSION_ERROR` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid parameters
- `RATE_LIMIT_ERROR` - API rate limit exceeded
- `FILE_ERROR` - File operation failed
- `SECURITY_ERROR` - Security check failed

### Error Handling Example

```javascript
try {
  const result = await ipcRenderer.invoke('users:search', {
    domain: 'school.instructure.com',
    token: 'your-api-token',
    accountId: '1',
    searchTerm: 'John'
  });
  
  if (result.error) {
    console.error('Search failed:', result.message);
    return;
  }
  
  console.log('Found users:', result.users);
} catch (err) {
  console.error('IPC error:', err);
}
```

---

## Progress Tracking

Many long-running operations send progress updates:

### Progress Event

**Channel:** `update-progress`

**Data:**
```javascript
{
  percentage: number,     // 0-100
  current: number,        // Current item
  total: number,          // Total items
  message: string         // Optional: Status message
}
```

### Listening for Progress

```javascript
ipcRenderer.on('update-progress', (event, data) => {
  console.log(`Progress: ${data.percentage}%`);
  updateProgressBar(data.percentage);
});
```

---

## Cancellation Pattern

Cancellable operations follow this pattern:

1. **Start Operation:** Invoke the handler (e.g., `axios:getConvos`)
2. **Cancel Operation:** Invoke the cancel handler (e.g., `axios:cancelGetConvos`)
3. **Check Response:** The response includes a `cancelled: boolean` field

### Cancellation Example

```javascript
// Start fetching
const fetchPromise = ipcRenderer.invoke('axios:getConvos', {
  domain: 'school.instructure.com',
  token: 'token',
  scope: 'inbox'
});

// Cancel after 5 seconds
setTimeout(async () => {
  await ipcRenderer.invoke('axios:cancelGetConvos');
}, 5000);

// Handle result
const result = await fetchPromise;
if (result.cancelled) {
  console.log('Operation was cancelled');
} else {
  console.log('Fetched', result.count, 'conversations');
}
```

---

## Security Considerations

### File Path Allowlisting

File operations use an allowlist system to prevent unauthorized file access:

1. **Read Paths:** Files selected via `sis:selectFile` are added to allowed read paths
2. **Write Paths:** Files saved via `file:save` are added to allowed write paths  
3. **Directory Paths:** Folders selected via `sis:selectFolder` are added to allowed directories

Any attempt to access a file outside the allowlist will be rejected.

### URL Validation

External URLs are validated before opening:

- ✅ Allowed: `http://`, `https://`
- ❌ Blocked: `file://`, `javascript:`, `data:`

### Token Security

API tokens are never logged or displayed in error messages. They are immediately used and not stored persistently.

---

## Best Practices

### 1. Always Handle Errors

```javascript
try {
  const result = await ipcRenderer.invoke('handler:name', params);
  if (result.error) {
    // Handle application error
  }
} catch (err) {
  // Handle IPC error
}
```

### 2. Use Progress Indicators

```javascript
ipcRenderer.on('update-progress', (e, pct) => {
  progressBar.style.width = `${pct}%`;
});
```

### 3. Implement Cancellation

```javascript
let currentOperation = null;

async function startOperation() {
  currentOperation = 'getConvos';
  const result = await ipcRenderer.invoke('axios:getConvos', params);
  currentOperation = null;
}

function cancelOperation() {
  if (currentOperation) {
    ipcRenderer.invoke(`axios:cancel${capitalize(currentOperation)}`);
  }
}
```

### 4. Validate Input Before Sending

```javascript
function isValidDomain(domain) {
  return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain);
}

if (!isValidDomain(domain)) {
  showError('Invalid Canvas domain');
  return;
}
```

### 5. Clean Up Listeners

```javascript
// Add listener
const progressHandler = (e, data) => updateProgress(data);
ipcRenderer.on('update-progress', progressHandler);

// Remove when done
ipcRenderer.removeListener('update-progress', progressHandler);
```

---

## Testing IPC Handlers

Integration tests verify handler behavior:

```javascript
const result = await ipcRenderer.invoke('users:search', {
  domain: 'test.instructure.com',
  token: 'test-token',
  accountId: '1',
  searchTerm: 'test'
});

expect(result.users).toBeInstanceOf(Array);
expect(result.count).toBeGreaterThan(0);
```

See [TESTING_ENHANCEMENTS.md](./TESTING_ENHANCEMENTS.md) for more details.

---

## Support

For questions or issues with IPC handlers:

1. Check error messages - they include actionable information
2. Review this documentation for correct parameter formats
3. Check the handler source code in `src/main/ipc/`
4. Run the test suite: `npm test`

---

## Changelog

### v1.0.1 (2026-01-05)
- Added integration tests for all handler modules
- Enhanced error handling and validation
- Improved cancellation mechanisms
- Added comprehensive JSDoc documentation
- Fixed security checks in test runner
