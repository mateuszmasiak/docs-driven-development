# Playwright Orchestrator MCP Server

An MCP (Model Context Protocol) server that provides tools for running Playwright E2E tests with feature-based tagging, result collection, and correlation with acceptance criteria.

## Features

- **Feature-based test filtering**: Run only tests relevant to a specific feature using tags
- **Acceptance criteria correlation**: Map test results back to AC IDs
- **Result collection**: Gather test results, screenshots, traces, and reports
- **Failure analysis**: Automatically analyze test failures and suggest fixes
- **Multi-browser support**: Run tests on Chromium, Firefox, or WebKit

## Installation

```bash
cd mcp/playwright-orchestrator
npm install
npm run build
```

## Usage

This MCP server is designed to be used by the Feature Orchestrator plugin. It's automatically configured in the plugin's `.mcp.json` file.

### Manual Testing

You can test the MCP server directly:

```bash
npm start
```

Then send MCP requests via stdio. Example:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "run_feature_tests",
    "arguments": {
      "featureId": "feat-reset-2fa-20250104120000",
      "baseURL": "http://localhost:3000"
    }
  }
}
```

## Available Tools

### run_feature_tests

Run all Playwright tests tagged with a specific feature ID.

**Parameters**:
- `featureId` (required): Feature ID to filter tests
- `baseURL` (optional): Base URL for the application (default: `http://localhost:3000`)
- `browser` (optional): Browser to run tests in: `chromium`, `firefox`, `webkit`, `all` (default: `chromium`)
- `headed` (optional): Run in headed mode (default: `false`)
- `retries` (optional): Number of retries for failed tests (default: `2`)
- `workers` (optional): Number of parallel workers (default: `4`)
- `timeout` (optional): Test timeout in milliseconds (default: `30000`)

**Returns**: Test run results with summary, individual test results, and artifacts.

### run_ac_tests

Run tests for a specific acceptance criterion.

**Parameters**:
- `featureId` (required): Feature ID
- `acId` (required): Acceptance criterion ID (e.g., `AC1`, `AC2`)
- `baseURL` (optional): Base URL for the application

**Returns**: Test run results filtered to the specific AC.

### get_test_report

Retrieve detailed report for a previous test run.

**Parameters**:
- `runId` (required): Test run ID returned from `run_feature_tests` or `run_ac_tests`

**Returns**: Full test run report.

### analyze_failure

Analyze a failed test and provide actionable feedback.

**Parameters**:
- `runId` (required): Test run ID
- `testId` (required): Specific test ID to analyze

**Returns**: Failure analysis with category, suggested fix, and evidence.

### list_test_runs

List all test runs stored in memory.

**Returns**: List of test runs with summaries.

## Test Tagging Requirements

For this MCP server to work correctly, your Playwright tests must be tagged:

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
```

**Multiple tags**:
```typescript
test('password validation @AC3 @security', async ({ page }) => {
  // test implementation
});
```

## Architecture

The MCP server:
1. Receives tool call requests via stdio
2. Constructs Playwright CLI commands with appropriate filters
3. Executes Playwright via `npx playwright test`
4. Parses JSON output from Playwright's JSON reporter
5. Transforms results into structured format
6. Stores results in memory for later retrieval
7. Returns results to caller

## Configuration

The server reads Playwright configuration from the project's `playwright.config.ts` file. Ensure your project has Playwright installed and configured.

**Example playwright.config.ts**:
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 2,
  workers: 4,
  reporter: [
    ['json', { outputFile: 'test-results/results.json' }],
    ['html', { outputFolder: 'playwright-report' }]
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});
```

## Development

**Build**:
```bash
npm run build
```

**Watch mode**:
```bash
npm run dev
```

**Lint**:
```bash
npm run lint
```

**Test**:
```bash
npm test
```

## Troubleshooting

**"Playwright not found"**:
- Ensure Playwright is installed in the target project: `npm install -D @playwright/test`
- Install browsers: `npx playwright install`

**"No tests found"**:
- Check that tests are properly tagged with `@feat-<feature-id>`
- Verify test files are in the location specified in `playwright.config.ts`

**"Command not found: npx"**:
- Ensure Node.js and npm are installed
- Add npm to PATH

**Tests timeout**:
- Increase timeout in tool parameters
- Check if application is running on the specified baseURL
- Review Playwright logs for connection issues

## Integration with Feature Orchestrator

This MCP server is automatically used by:
- **playwright-runner Skill**: High-level interface for running tests
- **playwright-tester Agent**: Runs tests and correlates with acceptance criteria

The plugin's `.mcp.json` configures this server:
```json
{
  "mcpServers": {
    "playwright-orchestrator": {
      "command": "node",
      "args": ["../../mcp/playwright-orchestrator/dist/index.js"],
      "enabled": true
    }
  }
}
```

## Future Enhancements

- Visual regression testing support
- Parallel test execution across multiple browsers
- Real-time test progress streaming
- Integration with CI/CD systems
- Artifact management (automatic cleanup, compression)
- Flakiness detection and reporting
- Performance metrics collection

## License

MIT
