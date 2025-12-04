# Playwright Runner Skill

This Skill provides a high-level interface for running Playwright E2E tests with feature-based tagging and result correlation.

## Purpose

Simplify the execution and analysis of Playwright tests by:
- Running tests filtered by feature ID or acceptance criteria tags
- Collecting structured results (pass/fail, screenshots, traces)
- Correlating test outcomes with acceptance criteria
- Providing actionable feedback for failures

## Dependencies

This Skill requires:
- **Playwright MCP Server**: `playwright-orchestrator` (configured in `.mcp.json`)
- **Playwright**: Installed in the target project (`@playwright/test`)
- **Test Tags**: Tests must be tagged with `@feat-<feature-id>` and `@AC<n>`

## Operations

### 1. runFeatureTests

Run all Playwright tests tagged with a specific feature ID.

**Usage**:
```typescript
const result = await playwrightRunner.runFeatureTests({
  featureId: "feat-reset-2fa-20250104120000",
  baseURL: "http://localhost:3000",
  browser: "chromium",  // "chromium" | "firefox" | "webkit" | "all"
  headed: false,
  retries: 2,
  workers: 4,
  timeout: 30000
});
```

**Parameters**:
- `featureId` (required): The feature ID to filter tests
- `baseURL` (optional): Base URL for the application (default: from config)
- `browser` (optional): Browser to run tests in (default: "chromium")
- `headed` (optional): Run in headed mode (default: false)
- `retries` (optional): Number of retries for failed tests (default: 2)
- `workers` (optional): Number of parallel workers (default: 4)
- `timeout` (optional): Test timeout in milliseconds (default: 30000)

**Returns**:
```typescript
{
  runId: "run-20250104-153045",
  summary: {
    total: 8,
    passed: 6,
    failed: 2,
    skipped: 0,
    duration_ms: 12456
  },
  results: [
    {
      testId: "e2e-2fa-reset-navigation",
      testName: "user can navigate to 2FA settings",
      file: "tests/e2e/2fa-reset.spec.ts",
      line: 12,
      status: "passed" | "failed" | "skipped",
      duration_ms: 1234,
      tags: ["@feat-reset-2fa-20250104120000", "@AC1"],
      error?: {
        message: string,
        stack: string,
        screenshot?: string,
        trace?: string
      }
    }
  ],
  artifacts: {
    htmlReport: "playwright-report/index.html",
    jsonReport: "test-results/results.json",
    screenshots: ["path/to/screenshot.png"],
    traces: ["path/to/trace.zip"]
  }
}
```

**Implementation**:
This operation uses the Playwright MCP server to:
1. Execute: `npx playwright test --grep @feat-<feature-id> --reporter=json`
2. Parse JSON output
3. Collect artifacts (screenshots, traces)
4. Return structured results

### 2. runACTests

Run Playwright tests for a specific acceptance criterion.

**Usage**:
```typescript
const result = await playwrightRunner.runACTests({
  featureId: "feat-reset-2fa-20250104120000",
  acId: "AC2",
  baseURL: "http://localhost:3000"
});
```

**Parameters**:
- `featureId` (required): The feature ID
- `acId` (required): The acceptance criterion ID (e.g., "AC2")
- `baseURL` (optional): Base URL for the application
- Other parameters same as `runFeatureTests`

**Returns**: Same structure as `runFeatureTests`, but filtered to AC-specific tests

**Implementation**:
Executes: `npx playwright test --grep "@feat-<feature-id>.*@AC2"`

### 3. getTestReport

Retrieve a detailed test report for a previous test run.

**Usage**:
```typescript
const report = await playwrightRunner.getTestReport("run-20250104-153045");
```

**Parameters**:
- `runId` (required): The test run ID

**Returns**:
Full test report including results, artifacts, and analysis

### 4. analyzeFailures

Analyze failed tests and provide actionable feedback.

**Usage**:
```typescript
const analysis = await playwrightRunner.analyzeFailures({
  runId: "run-20250104-153045",
  checklist: checklistJson  // checklist.json content
});
```

**Parameters**:
- `runId` (required): The test run ID
- `checklist` (required): The checklist.json content for correlation

**Returns**:
```typescript
{
  failures: [
    {
      testId: "e2e-2fa-reset-dialog",
      checklistId: "AC2",
      category: "frontend" | "backend" | "infra" | "test",
      severity: "high" | "medium" | "low",
      rootCause: "Dialog not rendering",
      affectedFiles: ["src/pages/settings/security.tsx"],
      suggestedFix: "Verify ConfirmDialog is imported and state is managed",
      evidence: {
        screenshot: "path/to/screenshot.png",
        consoleErrors: ["Error: ConfirmDialog is not defined"],
        networkErrors: []
      }
    }
  ],
  feedbackByArea: {
    frontend: [...],
    backend: [...],
    infra: [...]
  }
}
```

**Implementation**:
This operation:
1. Reads test results from runId
2. For each failure:
   - Analyzes error message and stack trace
   - Examines screenshot
   - Categorizes by affected area
   - Suggests specific fixes
3. Groups feedback by area (frontend/backend/infra)

### 5. correlateWithChecklist

Correlate test results with acceptance criteria checklist.

**Usage**:
```typescript
const correlation = await playwrightRunner.correlateWithChecklist({
  runId: "run-20250104-153045",
  checklist: checklistJson
});
```

**Parameters**:
- `runId` (required): The test run ID
- `checklist` (required): The checklist.json content

**Returns**:
```typescript
{
  checklistItems: [
    {
      checklistId: "AC1",
      text: "User can navigate to 2FA settings",
      status: "passed" | "failed" | "partial" | "not_tested",
      relatedTests: ["e2e-2fa-reset-navigation"],
      passCount: 1,
      failCount: 0,
      failureSummary?: "Brief description of failure"
    }
  ],
  coverage: {
    totalItems: 5,
    testedItems: 3,
    passedItems: 2,
    failedItems: 1,
    notTestedItems: 0
  }
}
```

**Implementation**:
This operation:
1. Reads checklist.json
2. For each checklist item:
   - Find tests tagged with that AC ID
   - Aggregate pass/fail counts
   - Determine overall status
3. Calculate coverage metrics

## Example Usage in Playwright Tester Agent

```typescript
// Phase 1: Run all feature tests
const results = await playwrightRunner.runFeatureTests({
  featureId: featureId,
  baseURL: config.baseURL
});

// Phase 2: Correlate with checklist
const correlation = await playwrightRunner.correlateWithChecklist({
  runId: results.runId,
  checklist: checklistJson
});

// Phase 3: Analyze failures
if (results.summary.failed > 0) {
  const analysis = await playwrightRunner.analyzeFailures({
    runId: results.runId,
    checklist: checklistJson
  });

  // Provide feedback to orchestrator
  return {
    status: "failure",
    correlation,
    analysis,
    nextSteps: generateNextSteps(analysis)
  };
}

// All tests passed
return {
  status: "success",
  correlation,
  nextSteps: ["Feature ready for acceptance"]
};
```

## Test Tagging Requirements

For this Skill to work effectively, E2E tests MUST be tagged:

**Feature-level tag**:
```typescript
test.describe('2FA Reset @feat-reset-2fa-20250104120000', () => {
  // tests...
});
```

**AC-level tags**:
```typescript
test('user can navigate to settings @AC1', async ({ page }) => {
  // test implementation
});

test('dialog appears on button click @AC2', async ({ page }) => {
  // test implementation
});
```

**Multiple tags**:
```typescript
test('password validation works @AC3 @security @validation', async ({ page }) => {
  // test implementation
});
```

## Configuration

This Skill reads configuration from:
1. `.claude/feature-orchestrator.yml` (project-specific)
2. `plan.json.test_frameworks.e2e` (detected by planner)
3. `playwright.config.ts` (Playwright's own config)

**Priority**: Project config > plan.json > playwright.config.ts

## Error Handling

The Skill handles common errors:

- **Playwright not installed**: Returns error with installation instructions
- **No tests found**: Returns empty results with warning
- **Test timeout**: Returns failed test with timeout error
- **Environment not ready**: Returns error suggesting environment setup

## Artifacts Management

The Skill automatically collects and organizes artifacts:

```
.claude/feature-dev/<feature-id>/
  playwright-report/
    index.html          # HTML report
  test-results/
    results.json        # JSON results
  screenshots/
    <test-name>.png     # Screenshots
  traces/
    <test-name>.zip     # Trace files
```

## Integration with MCP

This Skill uses the `playwright-orchestrator` MCP server under the hood:

**MCP Tools Used**:
- `run_tests` - Execute Playwright tests with filters
- `get_results` - Retrieve test results
- `get_artifacts` - Fetch screenshots/traces
- `analyze_failure` - AI-powered failure analysis

## Performance Considerations

- **Parallel execution**: Uses workers for faster test runs
- **Selective execution**: Runs only feature-tagged tests, not entire suite
- **Retry logic**: Automatically retries flaky tests
- **Artifact cleanup**: Cleans up old artifacts after successful runs

## Limitations

- Requires Playwright to be installed in the project
- Requires tests to be properly tagged
- E2E tests must be runnable in headless mode (for CI)
- Browser must be available (Chromium/Firefox/WebKit)

## Future Enhancements

- Visual regression testing integration
- Performance metrics collection
- Accessibility testing with axe-core
- Cross-browser comparison reports
- Flakiness detection and reporting
