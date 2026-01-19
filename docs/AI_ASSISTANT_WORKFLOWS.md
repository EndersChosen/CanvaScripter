# AI Assistant Workflow Training

## Overview

The AI Assistant is "trained" on your app's workflows through the `OPERATION_MAP` configuration in [src/main/ipc/aiAssistantHandlers.js](../src/main/ipc/aiAssistantHandlers.js). This allows it to understand multi-step operations like "fetch then delete" patterns.

## How It Works

### The Learning System

Instead of the AI needing to discover workflows each time, we encode them in a structured map:

```javascript
const OPERATION_MAP = {
    'operation-name': {
        fetchHandler: 'ipc:handlerName',     // Handler to fetch items (optional)
        deleteHandler: 'ipc:handlerName',    // Handler to delete items
        description: 'Human-readable description',
        requiredParams: ['param1', 'param2'], // Required parameters
        filters: { /* optional filters */ },  // Filters for fetch operation
        needsFetch: true                      // Whether to fetch before deleting
    }
}
```

### Two-Step Operations

When `needsFetch: true`, the AI Assistant automatically:

1. **Fetches** items using the `fetchHandler` with optional `filters`
2. **Deletes** the fetched items using the `deleteHandler`
3. **Reports** both fetched and deleted counts

## Adding New Operations

### Example: Delete Empty Assignment Groups

```javascript
'delete-empty-assignment-groups': {
    fetchHandler: 'axios:getEmptyAssignmentGroups',
    deleteHandler: 'axios:deleteEmptyAssignmentGroups',
    description: 'Delete empty assignment groups from a course',
    requiredParams: ['domain', 'token', 'courseId'],
    needsFetch: true
}
```

### Example: Delete Unpublished Assignments

```javascript
'delete-unpublished-assignments': {
    fetchHandler: 'axios:getAllAssignmentsForCombined',
    deleteHandler: 'axios:deleteAssignments',
    description: 'Delete unpublished assignments from a course',
    requiredParams: ['domain', 'token', 'courseId'],
    filters: { 
        unpublished: true,
        includeGraded: false
    },
    needsFetch: true
}
```

### Example: Single-Step Operation

```javascript
'reset-course': {
    handler: 'axios:resetCourses',
    description: 'Reset course content',
    requiredParams: ['domain', 'token', 'courseId'],
    needsFetch: false
}
```

## Filter Options

Filters are passed to the fetch handler to specify what items to retrieve:

### Assignment Filters
- `unpublished: true` - Only unpublished assignments
- `noSubmissions: true` - Only assignments with no submissions
- `includeGraded: false` - Exclude graded assignments

### Future Filters
You can add custom filters for any operation:
- Module filters: `isEmpty: true`, `isUnpublished: true`
- Discussion filters: `isAnnouncement: true`, `isClosed: true`
- etc.

## Natural Language Understanding

The AI parses natural language into these structured operations:

**User prompt:** "Delete all empty assignment groups in course 6986"

**AI parses to:**
```json
{
    "operation": "delete-empty-assignment-groups",
    "parameters": {
        "domain": "ckruger.beta.instructure.com",
        "courseId": "6986"
    }
}
```

## Execution Flow

```
User Input → AI Parsing → Operation Lookup → Fetch Items → Delete Items → Report Results
                ↓              ↓                ↓              ↓              ↓
          Natural Lang    OPERATION_MAP     IPC Handler    IPC Handler    Counts
```

## Benefits

1. **Consistency**: Operations always follow the same workflow used by the UI
2. **Safety**: Only registered operations can be executed
3. **Flexibility**: Easy to add new operations without changing AI logic
4. **Maintainability**: Workflows are documented in one central place
5. **Extensibility**: Can add complex multi-step workflows easily

## Adding More Complex Workflows

### Three-Step Operation Example

```javascript
'archive-old-conversations': {
    fetchHandler: 'axios:getConversations',
    filterHandler: 'custom:filterByDate',  // Custom intermediate step
    archiveHandler: 'axios:archiveConversations',
    description: 'Archive conversations older than specified date',
    requiredParams: ['domain', 'token', 'cutoffDate'],
    needsMultiStep: true
}
```

### Conditional Operations

```javascript
'smart-cleanup': {
    analyzeHandler: 'custom:analyzeCourse',
    operationMap: {
        'has-empty-groups': 'delete-empty-assignment-groups',
        'has-unpublished': 'delete-unpublished-assignments'
    },
    description: 'Analyze course and perform recommended cleanup',
    requiredParams: ['domain', 'token', 'courseId'],
    needsAnalysis: true
}
```

## Best Practices

1. **Mirror UI Workflows**: Always use the same handlers as your UI forms
2. **Use Descriptive Names**: Operation names should be clear and specific
3. **Include Filters**: Pre-define common filter combinations
4. **Document Requirements**: List all required parameters clearly
5. **Test Incrementally**: Add one operation at a time and test thoroughly

## See Also

- [IPC API Documentation](IPC_API_DOCUMENTATION.md)
- [Testing Documentation](TESTING.md)
- Main implementation: [src/main/ipc/aiAssistantHandlers.js](../src/main/ipc/aiAssistantHandlers.js)
