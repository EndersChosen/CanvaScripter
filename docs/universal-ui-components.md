# Universal UI Components Documentation

## Overview

The Canvas Electron App now includes universal UI components for creating consistent, professional card-based interfaces. These utilities are available globally and provide standardized styling for all forms.

## Available Functions

### `createUniversalHeader(options)`

Creates a consistent card header with Bootstrap styling.

**Parameters:**
- `title` (string, required): The main title text
- `subtitle` (string, optional): Descriptive subtitle text  
- `icon` (string, optional): Bootstrap icon class (defaults to 'bi-gear')
- `variant` (string, optional): Color variant (defaults to 'primary')

**Available Variants:**
- `primary` - Blue header (default)
- `success` - Green header (for create operations)
- `danger` - Red header (for delete operations) 
- `warning` - Yellow header (for warning actions)
- `info` - Light blue header (for informational content)
- `secondary` - Gray header (for secondary actions)

**Example:**
```javascript
const headerHtml = createUniversalHeader({
    title: 'Create Course Announcements',
    subtitle: 'Add multiple announcements to a course at once',
    icon: 'bi-megaphone',
    variant: 'primary'
});
```

### `createUniversalCard(options)`

Creates a complete card structure with header, body, progress, and results sections.

**Parameters:**
- `title` (string, required): The main title text
- `subtitle` (string, optional): Descriptive subtitle text
- `icon` (string, optional): Bootstrap icon class
- `variant` (string, optional): Color variant 
- `bodyContent` (string, optional): HTML content for the card body
- `progressId` (string, optional): ID prefix for progress elements (defaults to 'request')
- `includeProgress` (boolean, optional): Whether to include progress card (defaults to true)
- `includeResults` (boolean, optional): Whether to include results card (defaults to true)

**Example:**
```javascript
const cardHtml = createUniversalCard({
    title: 'Delete Assignments',
    subtitle: 'Remove assignments based on selected filters',
    icon: 'bi-trash',
    variant: 'danger',
    bodyContent: `
        <div class="row g-3">
            <div class="col-md-6">
                <label class="form-label fw-bold">Course ID</label>
                <input type="text" class="form-control" placeholder="Enter course ID" />
            </div>
        </div>
    `,
    progressId: 'delete-assignments'
});
```

## Icon Guidelines

Use contextually appropriate Bootstrap Icons:

**Common Operations:**
- `bi-plus-circle` - Create operations
- `bi-trash` - Delete operations  
- `bi-pencil` - Edit operations
- `bi-search` - Search/filter operations
- `bi-download` - Export/download operations
- `bi-upload` - Import/upload operations

**Content Types:**
- `bi-megaphone` - Announcements
- `bi-chat-dots` - Discussions  
- `bi-file-earmark-text` - Pages
- `bi-collection` - Assignment Groups
- `bi-file-earmark-plus` - Assignments
- `bi-mortarboard` - Courses
- `bi-people` - Users/Students

**Status/Actions:**
- `bi-gear` - Processing/settings
- `bi-check-circle` - Success states
- `bi-exclamation-triangle` - Warnings
- `bi-info-circle` - Information

## Color Variant Guidelines

**Primary (Blue)** - Default operations, neutral actions
```javascript
variant: 'primary' // General purpose, reading data
```

**Success (Green)** - Create, add, positive actions
```javascript  
variant: 'success' // Creating content, successful operations
```

**Danger (Red)** - Delete, remove, destructive actions
```javascript
variant: 'danger' // Deleting content, dangerous operations
```

**Warning (Yellow)** - Caution, modification, potentially risky actions  
```javascript
variant: 'warning' // Modifying existing content, warnings
```

**Info (Light Blue)** - Information, reporting, neutral data display
```javascript
variant: 'info' // Moving content, informational displays
```

**Secondary (Gray)** - Secondary actions, utilities
```javascript
variant: 'secondary' // Helper actions, utilities
```

## Implementation Examples

### Basic Form Conversion

**Old Style:**
```javascript
form.innerHTML = `
    <div>
        <h3>Create Assignments</h3>
    </div>
    <div class="row">
        <!-- form content -->
    </div>
`;
```

**New Style:**
```javascript
form.innerHTML = createUniversalCard({
    title: 'Create Assignments',
    subtitle: 'Create multiple assignments with customizable settings',
    icon: 'bi-file-earmark-plus',
    variant: 'success',
    bodyContent: `
        <div class="row g-3">
            <!-- form content with improved spacing -->
        </div>
    `,
    progressId: 'create-assignments'
});
```

### Progress and Results Integration

The universal card automatically creates progress and results sections with consistent IDs:

```javascript
// Progress elements (if includeProgress: true)
const progressCard = form.querySelector('#[progressId]-progress-card');
const progressInfo = form.querySelector('#[progressId]-progress-info');  
const progressBar = form.querySelector('#[progressId]-progress-bar');

// Results elements (if includeResults: true)
const resultsCard = form.querySelector('#[progressId]-results-card');
const responseContainer = form.querySelector('#[progressId]-response-container');
```

## Migration Guide

1. **Identify the form type** and choose appropriate icon and variant
2. **Replace hardcoded headers** with `createUniversalHeader()` calls
3. **Wrap form content** in `createUniversalCard()` for complete structure  
4. **Update progress handling** to use new consistent element IDs
5. **Test the form** to ensure styling and functionality work correctly

## Best Practices

- **Consistent terminology**: Use clear, action-oriented titles
- **Descriptive subtitles**: Explain what the form does in plain language
- **Appropriate icons**: Choose icons that clearly represent the action
- **Color consistency**: Use the same variants for similar operations across forms
- **Progressive enhancement**: Forms should work without JavaScript, styling enhances UX