# Logging Security Guidelines

This document defines required logging practices for CanvaScripter.

## Goals

- Prevent leakage of secrets (tokens, API keys, auth headers)
- Reduce exposure of PII (emails, login IDs, search terms, subjects, patterns)
- Keep logs useful for debugging without dumping raw request payloads

## Required Rules

1. **Use centralized sanitization when possible**
   - Prefer `logDebug(...)` in main-process code.
   - `logDebug` sanitization/redaction lives in `src/main/main.js`.

2. **Never log secrets**
   - Never print: `token`, `authorization`, `password`, `secret`, `apiKey`, cookies.
   - Never dump request objects that contain auth fields.

3. **Do not log raw PII values**
   - Avoid logging raw emails, login IDs, search terms, subjects, and patterns.
   - Log counts/flags/operation IDs instead of values.

4. **Avoid full object dumps**
   - Do not use `JSON.stringify(data)` on full request/response payloads in runtime logs.
   - Replace with summaries:
     - `hasDomain`, `hasCourseId`, `hasToken`
     - `count`, `successful`, `failed`, `cancelled`

5. **Log errors safely**
   - Prefer message-only logging for caught errors:
     - `error?.message || String(error)`
   - Avoid logging entire error objects if they may contain request config/headers.

## Safe Logging Examples

```js
console.log('createClassicQuizzes request received', {
  hasDomain: !!data?.domain,
  hasCourseId: !!(data?.course_id || data?.courseId),
  hasToken: !!data?.token,
  quizCount: Number(data?.number) || 1
});

console.error('deleteModules request failed:', error?.message || String(error));
```

## Unsafe Logging Examples

```js
console.log('The data in main:', data);              // may include token/PII
console.log('Received data:', JSON.stringify(data)); // raw payload dump
console.log('the token is', token);                  // secret leak
console.log('emailStatus:', email, status);          // PII leak
console.error('Error:', error);                      // may include sensitive config
```

## Review Checklist (PRs)

- [ ] No token/api key/auth header logs added
- [ ] No raw email/login/search/subject/pattern values logged
- [ ] No new full payload dumps (`JSON.stringify(requestData)`)
- [ ] Error logs use message-only format where applicable
- [ ] New operational logs use summaries/counts instead of raw records

## Notes

- Debug logs are still sensitive artifacts; treat log files as private operational data.
- If additional fields should be redacted, update sanitizer patterns in `src/main/main.js`.