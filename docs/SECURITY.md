/**
 * Security Hardening Implementation Guide
 * 
 * This document describes the security improvements made to CanvaScripter
 * and provides guidance for ongoing security maintenance.
 */

# Security Hardening Summary

## High Priority Items (✅ Completed)

### 1. IPC Channel Allowlisting
**Location:** `src/main/preload.js`

**What was done:**
- Removed raw `window.ipcRenderer.invoke()` exposure
- Added allowlist of permitted IPC channels
- Only specific channels can be invoked from renderer

**Impact:** Prevents renderer from calling arbitrary IPC handlers if compromised.

**Allowed channels:**
- `har:selectFile`, `har:analyze`
- `parseEmailsFromCSV`, `parseEmailsFromExcel`

**Maintenance:** When adding new IPC handlers that need direct renderer access, add them to the `ALLOWED_INVOKE_CHANNELS` set in preload.js.

---

### 2. File Path Allowlisting
**Location:** `src/main/main.js` and `src/main/security/ipcSecurity.js`

**What was done:**
- Track file/folder paths that users explicitly selected via dialog
- Validate all file read/write operations against allowlist
- Maintain separate allowlists per renderer process
- Automatic memory management (cap at 100 paths, keep recent 50)

**Impact:** Prevents arbitrary file system access even if renderer is compromised.

**Protected handlers:**
- `sis:readFile`, `file:write`, `har:analyze`
- `fileUpload:readFile`, `fileUpload:readFileBuffer`

**Maintenance:** Any new file I/O handlers should use `isAllowedPath()` validation.

---

### 3. URL Validation for External Links
**Location:** `src/main/main.js` (shell:openExternal handler)

**What was done:**
- Added `validateExternalUrl()` function
- Only allows http and https protocols
- Rejects file://, custom protocols, and malformed URLs

**Impact:** Prevents protocol injection attacks via external link opening.

**Maintenance:** Monitor error logs for blocked URLs to catch false positives.

---

### 4. Sandbox Mode Enabled
**Location:** `src/main/main.js` (createWindow function)

**What was done:**
- Changed `sandbox: false` to `sandbox: true`
- Tested with existing functionality

**Impact:** Provides OS-level sandboxing for renderer process, limiting damage from exploitation.

**Notes:** If new native module dependencies are added, ensure they work with sandbox mode.

---

### 5. Test Suite Fixes
**Location:** `package.json`, `tests/unit.test.js`, `tests/test-runner.js`

**What was done:**
- Updated test script path from `test-runner.js` to `tests/test-runner.js`
- Fixed file paths to match `src/` directory structure
- Added sandbox mode check to security tests
- All 58 unit tests now passing (100% success rate)

**Maintenance:** Run `npm test` before committing changes.

---

## Medium Priority Items (🚧 Partially Completed)

### 6. Code Modularization
**Status:** Foundation laid with new modules

**Created modules:**
- `src/main/security/ipcSecurity.js` - Security helpers and validation
- `src/main/ipc/fileHandlers.js` - File operation handlers
- `src/main/ipc/canvasApiHandlers.js` - Canvas API handlers (starter)
- `src/main/state/stateManager.js` - Centralized state management

**Next steps:**
- Migrate all IPC handlers from main.js to modular files
- Extract Canvas API wrappers into separate service layer
- Create config management module
- Split preload.js by feature area

---

## Remaining Recommendations

### Medium Priority (Not Started)
7. **Add TypeScript support** - Gradual migration for type safety
8. **Async file I/O** - Replace sync operations in main thread
9. **Add integration tests** - Automated E2E tests with Spectron/Playwright

### Low Priority (Not Started)
10. Code signing for distribution
11. Auto-updates with electron-updater
12. Telemetry/crash reporting (opt-in)
13. User documentation/wiki
14. GitHub Actions CI/CD

---

## Security Best Practices

### For Developers

1. **Never expose raw IPC**
   - Always use contextBridge with specific, purposeful APIs
   - Maintain allowlist for any invoke-style IPC

2. **Validate all inputs**
   - File paths must be user-selected or allowlisted
   - URLs must be validated before openExternal
   - API tokens should never be logged

3. **Maintain renderer isolation**
   - Keep sandbox mode enabled
   - Minimize preload script surface area
   - Use message passing, not shared state

4. **Regular dependency audits**
   - Run `npm audit` before releases
   - Update Electron regularly (security fixes)
   - Monitor GitHub security advisories

5. **Test security controls**
   - Verify file path validation with unauthorized paths
   - Test URL validation with malicious protocols
   - Check that IPC allowlist blocks unexpected channels

---

## Incident Response

If a security issue is discovered:

1. **Assess severity** - Is user data at risk? Is it exploitable?
2. **Create hotfix branch** - Don't commit to main immediately
3. **Fix and test** - Ensure fix doesn't break functionality
4. **Security advisory** - If public distribution, consider GitHub advisory
5. **Release update** - Bump version, deploy fix, notify users
6. **Post-mortem** - Document what happened and how to prevent recurrence

---

## Testing Security Features

### File Path Validation Test
```javascript
// This should FAIL - file not selected via dialog
try {
    await window.electronAPI.readFile('/etc/passwd');
    console.error('SECURITY FAIL: Unauthorized file read succeeded');
} catch (error) {
    console.log('PASS: Unauthorized file read blocked:', error.message);
}
```

### URL Validation Test
```javascript
// This should FAIL - file protocol not allowed
try {
    window.shell.openExternal('file:///etc/passwd');
    console.error('SECURITY FAIL: File protocol URL opened');
} catch (error) {
    console.log('PASS: Dangerous URL blocked:', error.message);
}
```

### IPC Allowlist Test
```javascript
// This should FAIL - channel not in allowlist
try {
    await window.ipcRenderer.invoke('dangerous:operation');
    console.error('SECURITY FAIL: Unauthorized IPC succeeded');
} catch (error) {
    console.log('PASS: Unauthorized IPC blocked:', error.message);
}
```

---

## Version History

- v1.0.1 - Initial release
- v1.1.0 - Security hardening (Jan 2026)
  - IPC allowlisting
  - File path validation
  - URL sanitization
  - Sandbox mode enabled
  - Test suite fixes

---

## Contact

For security issues, please report privately to the maintainer rather than creating public GitHub issues.
