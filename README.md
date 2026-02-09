# Bito Coder Review Agent - Bitbucket Descriptor

## Overview

This project is a Bitbucket integration for the **Bito Coder Review Agent**, providing automated code review and fix suggestions for pull requests.

## Project Structure

```
bb-descriptor/
├── atlassian-connect.json      # App configuration & webhook definitions
├── landing_page.html           # Installation UI
├── package.json                # Dependencies & scripts
├── installed.test.ts           # Tests for /installed lifecycle event (19 tests)
├── uninstalled.test.ts         # Tests for /uninstalled lifecycle event (11 tests)
└── .gitignore                  # Git ignore rules
```

---

## Running Tests

### Prerequisites

Ensure you have Node.js installed. Dependencies are already configured in `package.json`.

### Installation

```bash
npm install
```

This installs Vitest and all required testing dependencies.

### Run Tests

**Run tests once and exit (standard behavior):**
```bash
npm test
```

**Run tests in watch mode (auto-rerun on file changes):**
```bash
npm run test:watch
```

### Expected Output

```
✓ uninstalled.test.ts (11 tests) 12ms
✓ installed.test.ts (19 tests) 21ms

Test Files  2 passed (2)
Tests       30 passed (30)
Duration    206ms
```

### Optional Commands (Requires Additional Setup)

These commands require additional dependencies and are not configured by default:

**Test with coverage report:**
```bash
npm run test:coverage
```
*Requires: `@vitest/coverage-v8` package*

**Test with UI dashboard:**
```bash
npm run test:ui
```
*Requires: `@vitest/ui` package*

To install optional dependencies:
```bash
npm install --save-dev @vitest/coverage-v8 @vitest/ui
```

---

## Test Coverage

### Test Files

| File | Tests | Coverage |
|------|-------|----------|
| `installed.test.ts` | 19 | `/installed` lifecycle event |
| `uninstalled.test.ts` | 11 | `/uninstalled` lifecycle event |
| **Total** | **30** | Installation & uninstallation flows |

### Test Categories

**Installation Tests (19):**
- Basic payload validation
- Database operations & persistence
- Webhook registration (6 PR events)
- Error handling & edge cases
- Concurrent installations

**Uninstallation Tests (11):**
- Payload validation
- Webhook deregistration
- Database cleanup
- Error handling
- Concurrent uninstallations

---

## Vitest Framework

### What is Vitest?

**Vitest** is a modern, fast unit testing framework for JavaScript/TypeScript projects. It provides:

- ⚡ **Lightning-fast execution** - Uses ESBuild for near-instant feedback
- 🔄 **Smart & instant watch mode** - Only reruns affected tests
- 🎯 **Jest-compatible API** - Familiar syntax for Jest users
- 📦 **ESM-native** - Full ES modules support out of the box
- 🔧 **TypeScript support** - Zero configuration needed

### Why Vitest?

| Feature | Vitest | Jest |
|---------|--------|------|
| Speed | ⚡⚡⚡ Very Fast | ⚡ Slower |
| ESM Support | ✅ Native | ⚠️ Limited |
| TypeScript | ✅ Built-in | ⚠️ Needs setup |
| Watch Mode | ✅ Instant | ⚠️ Slower |
| Configuration | ✅ Minimal | ⚠️ Complex |

### Key Features Used

**Mocking:**
```typescript
import { vi } from 'vitest';

const mockFn = vi.fn();
mockFn.mockResolvedValue(true);
mockFn.mockRejectedValueOnce(new Error('Failed'));
```

**Async Testing:**
```typescript
it('should handle async operations', async () => {
  const result = await handler(payload);
  expect(result.success).toBe(true);
});
```

**Mock Verification:**
```typescript
expect(mockFn).toHaveBeenCalledWith(expectedArg);
expect(mockFn).toHaveBeenCalledTimes(1);
```

---

## Test Patterns Used

### Arrange-Act-Assert (AAA)

```typescript
describe('Feature', () => {
  it('should do something', async () => {
    // Arrange: Setup test data
    const payload = { clientKey: 'test-123', ... };

    // Act: Execute the code
    const result = await handler(payload);

    // Assert: Verify expectations
    expect(result.success).toBe(true);
  });
});
```

### Error Testing

```typescript
it('should handle errors', async () => {
  const error = new Error('Failed');
  mockFn.mockRejectedValueOnce(error);

  await expect(handler(payload))
    .rejects.toThrow('Failed');
});
```

### Concurrent Operations

```typescript
it('should handle multiple operations', async () => {
  const results = await Promise.all([
    handler(payload1),
    handler(payload2),
  ]);

  expect(results).toHaveLength(2);
});
```

---

## Configuration Files

### package.json

```json
{
  "scripts": {
    "test": "vitest run",           // Run once and exit
    "test:watch": "vitest",         // Watch mode
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  },
  "devDependencies": {
    "vitest": "^4.0.17"
  }
}
```

### atlassian-connect.json

Defines:
- App metadata (key, name, description)
- Lifecycle events (`/installed`, `/uninstalled`)
- Webhook events (6 pull request events)
- Authentication (JWT)
- Required scopes

---

## Lifecycle Events

### `/installed`
Triggered when the app is installed on a Bitbucket instance.

**Handler should:**
1. ✅ Validate installation payload
2. ✅ Save installation context to database
3. ✅ Register webhooks for 6 PR events
4. ✅ Log the installation

**Webhook Events Registered:**
- `pullrequest:created`
- `pullrequest:updated`
- `pullrequest:fulfilled`
- `pullrequest:rejected`
- `pullrequest:comment_created`
- `pullrequest:comment_updated`

### `/uninstalled`
Triggered when the app is uninstalled.

**Handler should:**
1. ✅ Validate uninstallation payload
2. ✅ Deregister webhooks
3. ✅ Delete installation context from database
4. ✅ Log the uninstallation

---

## Troubleshooting

**Q: Tests won't run**
```bash
npm install
npm test
```

**Q: Want to watch for changes?**
```bash
npm run test:watch
```

**Q: Getting "missing dependency" error on optional commands?**

The `--coverage` and `--ui` commands require additional packages. Install them with:
```bash
npm install --save-dev @vitest/coverage-v8 @vitest/ui
```

Then run:
```bash
npm run test:coverage
npm run test:ui
```

---

## Next Steps

1. **Implement handlers** - Create actual event handlers matching test specifications
2. **Webhook tests** - Design tests for `/webhook/bitbucket` endpoint
3. **Integration tests** - End-to-end workflow testing
4. **E2E tests** - Real Bitbucket environment testing

---

## References

- [Vitest Documentation](https://vitest.dev/)
- [Atlassian Connect Specification](https://developer.atlassian.com/cloud/bitbucket/modules/lifecycle/)
- [Bitbucket Webhooks](https://developer.atlassian.com/cloud/bitbucket/webhooks/)

---

**Total Tests:** 30 | **All Passing** ✅  
**Framework:** Vitest v4.0.17  
**Status:** Ready for Development
