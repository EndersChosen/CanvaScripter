# CanvaScripter Test Suite

This comprehensive test suite covers all features and functionality of the CanvaScripter Electron application.

## Test Types

### 1. Unit Tests (`tests/unit.test.js`)
- Tests individual functions and utilities in isolation
- Validates data parsing, validation, and core logic
- Checks file operations and configuration
- Tests performance and memory usage patterns

**Run with:** `npm run test:unit`

### 2. Integration Tests (`integration-test.js`)
- Tests the complete application in a browser context
- Validates DOM elements, user interactions, and UI functionality
- Tests IPC communication between renderer and main processes
- Validates responsive design and accessibility

**Run with:** Open the app and run `window.runTests()` in the developer console

### 3. App Tests (`tests/app.test.js`)
- Tests all IPC handlers and main process functionality
- Validates Canvas API integration features
- Tests SIS imports, conversations, assignments, and more
- Requires Electron context to run properly

### 4. Security & Performance Checks
- Validates security best practices
- Checks for potential vulnerabilities
- Analyzes performance patterns
- Reviews code quality

## Features Tested

### Core Application Features
- ✅ Domain parsing and validation
- ✅ Canvas API token handling
- ✅ UI navigation and responsive design
- ✅ File upload and processing
- ✅ Progress tracking and error handling

### SIS Import Features
- ✅ Folder selection and file creation
- ✅ Data preview and validation
- ✅ Bulk file generation
- ✅ Authentication provider integration

### Communication Features
- ✅ Email bounce checking
- ✅ Communication channel validation
- ✅ Domain verification
- ✅ Suppression list management

### Canvas API Integration
- ✅ Conversations management
- ✅ Assignment operations
- ✅ Content creation (discussions, announcements, pages)
- ✅ User analytics and page views
- ✅ File and folder management

### Data Management
- ✅ CSV parsing and validation
- ✅ Email extraction and processing
- ✅ User ID management
- ✅ Content migrations and imports

## Running Tests

### Quick Test
```bash
npm test
```

### All Tests
```bash
npm run test:all
```

### Individual Test Types
```bash
npm run test:unit        # Unit tests only
npm run test:security    # Security audit
npm run test:integration # Instructions for integration tests
```

### Integration Tests (Interactive)
1. Start the application: `npm start`
2. Open Developer Tools (F12)
3. Run: `window.runTests()`

## Test Results

Tests generate detailed output including:
- ✅ Pass/fail status for each test
- 📊 Success rate percentage
- 📝 Detailed error messages for failures
- 📄 JSON test report (`test-report.json`)

## Test Coverage

The test suite covers:

### IPC Handlers (40+ handlers tested)
- `sis:*` - SIS import operations
- `axios:*` - Canvas API operations
- `fileUpload:*` - File processing operations

### UI Components
- Form validation and input handling
- Navigation and search functionality
- Progress bars and status displays
- Modal dialogs and file pickers

### Data Processing
- CSV parsing (regular and bounced format)
- Email validation and extraction
- Domain parsing and cleaning
- Array operations and deduplication

### Error Handling
- File operation failures
- Network request errors
- Invalid input validation
- Cancellation scenarios

## Adding New Tests

### Unit Test
Add test methods to `tests/unit.test.js`:
```javascript
testNewFeature() {
    console.log('\n🆕 Testing New Feature...');
    
    const result = yourFunction('test-input');
    this.assert(result === 'expected', 'New feature works correctly');
}
```

### Integration Test
Add test cases to `integration-test.js`:
```javascript
// Test new UI component
const newElement = document.getElementById('new-element');
assert(newElement !== null, 'New element exists in DOM');
```

### App Test
Add IPC handler tests to `tests/app.test.js`:
```javascript
async testNewIPCHandler() {
    const result = await this.simulateIPCCall('new:handler', testData);
    this.assert(typeof result === 'object', 'New handler returns valid result');
}
```

## Troubleshooting

### Common Issues

**Tests fail with "Module not found"**
- Ensure all test files are in the correct directories
- Check that dependencies are installed: `npm install`

**Integration tests don't run**
- Make sure the app is running: `npm start`
- Open Developer Tools and check for console errors
- Verify `integration-test.js` is loaded in `index.html`

**IPC tests fail**
- Ensure the main process is running
- Check that IPC handlers are properly registered
- Verify preload script exposes necessary APIs

### Debug Mode
Set environment variable for verbose logging:
```bash
DEBUG=true npm test
```

## Performance Benchmarks

Tests include performance validation:
- Array operations: < 100ms for 10k items
- String cleaning: < 50ms for large strings
- File operations: Reasonable limits for I/O
- Memory usage: Event listener cleanup validation

## Security Validation

Security checks include:
- Content Security Policy validation
- nodeIntegration disabled verification
- contextIsolation enabled check
- Dependency vulnerability scanning
- Code pattern analysis for security issues

---

For questions or issues with the test suite, check the console output for detailed error messages and stack traces.