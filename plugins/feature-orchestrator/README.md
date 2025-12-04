# Feature Orchestrator Plugin

A comprehensive Claude Code plugin that orchestrates the entire feature development lifecycle—from vague idea to fully implemented, tested, and verified feature.

## What It Does

This plugin provides a multi-agent workflow that:

1. **Clarifies & Specifies**: Turns your feature idea into structured specs with acceptance criteria
2. **Enriches with Docs**: Searches your project documentation for compliance, security, and architectural requirements
3. **Plans Intelligently**: Detects your tech stack and creates a detailed, pattern-aware implementation plan
4. **Designs Tests First**: Creates comprehensive test plans BEFORE implementation begins
5. **Implements Consistently**: Delegates to specialized agents that write code following YOUR existing patterns
6. **Writes All Tests**: Dedicated test-writer agent creates E2E, unit, and integration tests
7. **Validates Coverage**: Enforces 100% acceptance criteria coverage before verification
8. **Verifies Automatically**: Runs Playwright E2E tests to verify all acceptance criteria
9. **Iterates on Feedback**: If tests fail, provides targeted feedback and re-implements until they pass
10. **Generates Artifacts**: Produces implementation reports, PR templates, and commit messages

## Key Features

### Tech-Stack Agnostic

Works with **any** tech stack by detecting and following your existing patterns:
- **Backend**: Node.js, Python, Ruby, Go, Java, C#, Rust, PHP, etc.
- **Frontend**: React, Vue, Angular, Svelte, Next.js, Nuxt, plain HTML/JS
- **Testing**: Playwright, Jest, Vitest, Pytest, JUnit, Go testing, etc.
- **Databases**: SQL, NoSQL, any ORM (Prisma, TypeORM, Sequelize, etc.)

### Pattern-Based Implementation

The plugin:
- Scans your codebase to understand existing patterns
- Mimics your code style, architecture, and conventions
- Never introduces new frameworks or restructures your project
- Keeps changes minimal and focused

### Spec & Docs Driven

- Converts vague requests into detailed specs
- Searches your documentation for additional requirements
- Builds comprehensive acceptance checklists
- Ensures compliance, security, and architectural standards

### Test-First Approach

- **Test Ideation Phase**: Designs all tests BEFORE implementation
- **Dedicated Test Writer**: Single agent responsible for all test creation
- **100% Coverage Gate**: Cannot proceed to verification without full AC coverage
- Uses Playwright for E2E verification
- Correlates test results back to acceptance criteria
- Iterates until all critical tests pass

### Feedback Loop

- Automatically detects test failures
- Provides targeted, actionable feedback
- Re-runs implementation with focused fixes
- Continues until acceptance criteria are met

## Installation

### Local Plugin Installation

1. Clone or copy this plugin to your local plugins directory:
   ```bash
   mkdir -p ~/.claude-code/plugins
   cp -r plugins/feature-orchestrator ~/.claude-code/plugins/
   ```

2. Build the Playwright MCP server:
   ```bash
   cd mcp/playwright-orchestrator
   npm install
   npm run build
   ```

3. Restart Claude Code to load the plugin.

### Verifying Installation

Run in Claude Code:
```
/feature-orchestrator --help
```

You should see the help text for the orchestrator.

## Quick Start

### 1. Configure Your Project (Optional but Recommended)

Create `.claude/feature-orchestrator.yml` in your project root:

```yaml
# Test configuration
tests:
  e2e:
    runner: playwright
    command: "npx playwright test"
    tag_flag: "--grep"
  unit:
    runner: vitest
    command: "npm run test:unit"

# Documentation paths
docs:
  paths:
    - /docs
    - /specs

# Environment
default_feature_env:
  base_url: "http://localhost:3000"
```

### 2. Start the Development Server

Ensure your app is running (for E2E tests):
```bash
npm run dev
# or
python manage.py runserver
# or your equivalent
```

### 3. Run the Orchestrator

In Claude Code:
```
/feature-orchestrator
```

Follow the prompts to:
- Describe your feature
- Review the generated spec
- Review the implementation plan
- Let it implement and test

### 4. Review the Results

Check `.claude/feature-dev/<feature-id>/` for:
- `orchestrator-report.md` - Complete summary
- Test results and coverage reports
- Generated PR template and commit message

## Usage

### Basic Usage

```
/feature-orchestrator
```

The orchestrator will guide you through:
1. Feature description
2. Spec review and approval
3. Plan review and approval
4. Implementation
5. Testing and verification
6. Final report

### With Parameters

```
/feature-orchestrator feature="Add 2FA reset button" priority=P0 baseURL=http://localhost:3000
```

Parameters:
- `feature`: Feature description
- `priority`: P0 (must-have), P1 (important), P2 (nice-to-have)
- `docs`: Path to relevant documentation
- `baseURL`: URL for E2E tests
- `branch`: Git branch to work on

## How It Works

### Multi-Agent Architecture

The plugin uses 9 specialized agents:

1. **feature-orchestrator**: Main coordinator
2. **spec-writer**: Converts ideas to specs
3. **docs-auditor**: Enriches specs with documentation
4. **planner**: Detects stack and creates plans
5. **test-writer**: Designs and writes all tests (NEW)
6. **backend-dev**: Implements backend changes
7. **frontend-dev**: Implements frontend changes
8. **infra-dev**: Handles infrastructure changes
9. **playwright-tester**: Runs and analyzes E2E tests

### Skills

Two reusable Skills provide high-level capabilities:

1. **playwright-runner**: Runs Playwright tests with feature tagging
2. **docs-reader**: Searches and reads project documentation

### MCP Servers

The plugin includes MCP servers for:

1. **playwright-orchestrator**: Wraps Playwright CLI for test execution
2. **docs** (stub): Placeholder for future document reading capabilities

## Workflow Phases

### Phase 1: Clarification & Spec (2-5 min)

- Gathers feature details from user
- Creates unique feature ID
- Generates `spec.md` and `spec.json`
- Includes user stories, requirements, and initial acceptance criteria

### Phase 2: Docs Audit & Checklist (2-5 min)

- Searches project documentation
- Finds similar features for pattern reuse
- Enriches spec with doc-derived requirements
- Produces comprehensive `checklist.json`

### Phase 3: Planning (3-10 min)

- Detects tech stack (languages, frameworks, test tools)
- Studies existing code patterns
- Creates detailed `plan.json` with tasks by area
- Identifies dependencies and risks

### Phase 3.5: Test Ideation (NEW) (3-8 min)

- **Test-writer agent** designs comprehensive test strategy
- Creates test cases for ALL acceptance criteria
- Plans E2E, unit, and integration tests
- Produces `test-plan.json` with detailed test scenarios
- Ensures 100% AC coverage before implementation begins

### Phase 4: Implementation (0-60 min)

- **First, agents check what already exists** (NEW)
- Agents scan codebase for existing code that satisfies ACs
- Only implement what's missing, skip what already works
- Produces coverage reports with status:
  - `already_implemented` - Found existing code
  - `implemented` - Newly written code
  - `partially_implemented` - Extended existing code
- **If everything already exists**: Skip to test writing (0 min)

### Phase 4.5: Test Implementation (NEW) (5-15 min)

- **Test-writer agent** writes all tests based on test plan
- Creates E2E tests with Playwright
- Creates unit tests (Vitest/Jest)
- Creates integration tests
- All tests tagged with feature ID and AC IDs
- Produces `test-coverage.json`

### Phase 5: Coverage Validation (NEW) (1-2 min)

- **MANDATORY GATE**: Cannot proceed without 100% coverage
- Validates every AC has at least one test
- Checks all E2E-marked ACs have E2E tests
- If gaps exist: routes back to appropriate agent
- Ensures comprehensive verification before running tests

### Phase 6: E2E Verification (5-15 min)

- **ALWAYS runs, even if all code was pre-existing** (NEW)
- Runs E2E tests tagged with feature ID
- Runs unit and integration tests
- Correlates results to acceptance criteria
- Generates detailed test report
- Verifies existing code actually works correctly

### Phase 7: Feedback Loop (as needed)

- If tests fail: analyzes failures
- Routes to appropriate agent:
  - Frontend issues → frontend-dev
  - Backend issues → backend-dev
  - **Test issues → test-writer** (NEW)
  - Infrastructure issues → infra-dev
- Agents make focused fixes
- Re-runs tests
- Repeats until success (max 5 iterations)

### Phase 8: Finalization

- Generates orchestrator report with test coverage summary
- Creates PR template and commit message
- Saves all artifacts

## Configuration

### Project Configuration

Create `.claude/feature-orchestrator.yml`:

```yaml
# Test configuration
tests:
  e2e:
    runner: playwright
    command: "npx playwright test"
    tag_flag: "--grep"
    test_directory: "tests/e2e"
  unit:
    runner: vitest
    command: "npm run test:unit"
  integration:
    runner: vitest
    command: "npm run test:integration"

# Documentation
docs:
  paths:
    - /docs
    - /specs
    - /design
  guidelines:
    security: /docs/security-guidelines.md
    api: /docs/api-standards.md
    ui: /docs/ui-guidelines.md

# Environment
default_feature_env:
  base_url: "http://localhost:3000"
  test_user_email: "test@example.com"
  test_user_password: "password123"

# Behavior
auto_approve_plan: false  # Skip plan review step
create_branch: true       # Auto-create feature branch
enable_hooks: true        # Enable workflow hooks
```

### Test Tagging Requirements

For Playwright tests to work with the orchestrator, tag them:

```typescript
test.describe('Feature Name @feat-<feature-id>', () => {
  test('should do something @AC1', async ({ page }) => {
    // test implementation
  });
});
```

## Output Artifacts

All artifacts are saved to `.claude/feature-dev/<feature-id>/`:

| File | Description |
|------|-------------|
| `spec.md` | Human-readable specification |
| `spec.json` | Machine-readable spec |
| `checklist.json` | Acceptance criteria checklist |
| `plan.json` | Implementation plan |
| `plan-summary.md` | Plan overview |
| `test-plan.json` | Test strategy and scenarios (NEW) |
| `backend-coverage.json` | Backend implementation report |
| `frontend-coverage.json` | Frontend implementation report |
| `infra-coverage.json` | Infrastructure changes report |
| `test-coverage.json` | Test coverage report (NEW) |
| `playwright-results.json` | E2E test results |
| `orchestrator-report.md` | Final summary |
| `playwright-report/` | HTML test report |
| `screenshots/` | Test failure screenshots |
| `traces/` | Playwright traces |

## Best Practices

### 1. Start with Good Specs

- Provide as much detail as you can in the feature description
- Link to relevant documentation
- Specify priority clearly
- Review and refine the spec before implementation starts

### 2. Maintain Test Data

- Ensure your test database has necessary seed data
- Keep test users and credentials in config
- Reset test data between feature developments if needed

### 3. Review Plans Carefully

- Check that the planner detected your stack correctly
- Verify the plan follows your architecture
- Approve or adjust before implementation

### 4. Let It Iterate

- Don't stop the process if tests fail initially
- The orchestrator is designed to iterate on feedback
- Trust the feedback loop to fix issues

### 5. Keep Documentation Updated

- The orchestrator relies on documentation for requirements
- Keep security, API, and UI guidelines current
- Document architectural decisions (ADRs)

## Troubleshooting

### Plugin Not Found

- Ensure plugin is in `~/.claude-code/plugins/feature-orchestrator`
- Restart Claude Code
- Check plugin.json for syntax errors

### Tests Not Running

- Ensure Playwright is installed: `npm install -D @playwright/test`
- Install browsers: `npx playwright install`
- Verify dev server is running on the specified baseURL
- Check that tests are properly tagged

### Wrong Tech Stack Detected

- Review `plan.json` to see what was detected
- Add explicit configuration in `.claude/feature-orchestrator.yml`
- Ensure your project has clear indicators (package.json, requirements.txt, etc.)

### Documentation Not Found

- Check paths in `.claude/feature-orchestrator.yml`
- Ensure documentation exists in expected locations
- Use absolute paths starting with `/`

### Tests Keep Failing

- Review test failure screenshots in artifacts
- Check Playwright traces for detailed replay
- Verify all services (API, DB) are running
- Check for timing issues or flaky tests

## Advanced Usage

### Custom Agents

You can extend the plugin by adding custom agents for specific tasks. See agent prompt files in `agents/` for examples.

### Integration with CI/CD

The orchestrator generates artifacts that can be used in CI/CD:
- Use generated test tags to run feature-specific tests
- Use `checklist.json` for automated acceptance verification
- Use `orchestrator-report.md` for PR descriptions

### Reusing Plans

If implementing similar features, you can:
- Reference previous feature IDs in your description
- The docs-auditor will find similar features
- The planner will reuse patterns

## Examples

### Example 1: Simple Feature

```
You: /feature-orchestrator

Orchestrator: What feature would you like to add?

You: Add a "Reset 2FA" button to account settings

Orchestrator: Creating spec... Done.
  - 5 acceptance criteria
  - Requires password confirmation
  - Should send email notification

Approve spec? (yes/no)

You: yes

Orchestrator: Planning... Done.
  - Detected: React + Express + Prisma
  - 2 backend tasks, 1 frontend task

Approve plan?

You: yes

Orchestrator: Designing tests... Done.
  - 18 test cases planned (7 E2E, 7 unit, 4 integration)
  - 100% acceptance criteria coverage

Orchestrator: Implementing... [15 minutes]
  ✓ Backend complete
  ✓ Frontend complete

Orchestrator: Writing tests... [5 minutes]
  ✓ All tests written
  ✓ Coverage validated: 100%

Running E2E verification... [3 minutes]
  ✓ All tests passed!

Feature complete! See .claude/feature-dev/feat-reset-2fa-20250104/
```

### Example 2: Complex Feature with Iterations

```
You: /feature-orchestrator feature="Add data export capability" priority=P0

Orchestrator: Found documentation:
  - /docs/compliance.md requires audit logging
  - /docs/security-guidelines.md requires encryption

Updated spec with 12 acceptance criteria.

[... spec and plan review ...]

Orchestrator: Designing tests... Done.
  - 24 test cases planned
  - 100% acceptance criteria coverage

Implementing... [25 minutes]
  ✓ Backend complete
  ✓ Frontend complete

Writing tests... [8 minutes]
  ✓ All tests written
  ✓ Coverage validated: 100%

Running E2E verification... [5 minutes]
  ✗ 2 tests failed:
    - AC3: Export file not encrypted
    - AC7: Audit log missing timestamp

Analyzing failures...
  - Backend issue in export service → routing to backend-dev
  - Missing encryption wrapper

Re-implementing fixes... [8 minutes]

Re-running tests... [5 minutes]
  ✓ All tests passed!

Feature complete!
```

## Contributing

To contribute to this plugin:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Update documentation
6. Submit a pull request

## Support

For issues, questions, or suggestions:
- Check the troubleshooting section above
- Review agent prompts in `agents/` to understand behavior
- Check MCP server logs for debugging

## License

MIT

## Credits

This plugin was inspired by:
- Anthropic's official feature-dev plugin
- Claude Code marketplace plugins
- Multi-agent orchestration patterns
