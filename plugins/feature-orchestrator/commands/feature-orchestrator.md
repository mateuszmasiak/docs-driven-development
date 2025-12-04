# /feature-orchestrator

Launch the **Feature Development Orchestrator** to turn a feature request into a fully implemented, tested, and verified feature.

## What This Does

This command starts a comprehensive, multi-agent workflow that:

1. **Clarifies & Specifies**: Converts your vague feature idea into a structured spec with acceptance criteria
2. **Enriches with Docs**: Searches project documentation to add compliance, security, and architectural requirements
3. **Plans Implementation**: Detects your tech stack and creates a detailed implementation plan
4. **Implements Changes**: Delegates to specialized agents (backend, frontend, infra) to write code following existing patterns
5. **Writes Tests**: Creates unit, integration, and E2E tests alongside implementation
6. **Verifies with Playwright**: Runs E2E tests to verify all acceptance criteria pass
7. **Iterates on Feedback**: If tests fail, provides targeted feedback and re-implements
8. **Generates Artifacts**: Produces implementation report, PR template, and commit message

## Usage

### Basic Usage

Simply run:
```
/feature-orchestrator
```

You'll be prompted for:
- Feature description (can be brief or detailed)
- Relevant documentation paths (optional)
- Environment details (branch, base URL for E2E tests)

### Advanced Usage

Provide details upfront:
```
/feature-orchestrator feature="Add ability to reset 2FA from settings" priority=P0 docs=/docs/security-guidelines.md baseURL=http://localhost:3000
```

## What to Provide

### Feature Description

Be as specific or as vague as you want. The orchestrator will ask clarifying questions if needed.

**Examples**:
- "Add 2FA reset button" ← vague, will be clarified
- "Add ability for users to reset their two-factor authentication from account settings. Should require password confirmation and send email notification." ← detailed
- "Users are complaining they can't disable 2FA when they lose their phone. We need a reset flow." ← user-centric

### Priority (optional)

- **P0**: Must-have, blocking
- **P1**: Important, needed for good UX
- **P2**: Nice-to-have

Default: P0

### Documentation Paths (optional)

If you have relevant specs or requirements docs:
- `/docs/security-guidelines.md`
- `/specs/auth-requirements.pdf`
- `/docs/api-standards.md`

The orchestrator will search these for additional requirements.

### Environment Details (optional)

- **branch**: Which branch to work on (default: current branch)
- **baseURL**: URL for E2E tests (default: `http://localhost:3000`)
- **environment**: `local` | `staging` | `dev` (default: `local`)

## How It Works

### Phase 1: Clarification & Spec (2-5 min)

The orchestrator:
- Asks clarifying questions if needed
- Generates a feature ID: `feat-<short-name>-<timestamp>`
- Creates workspace: `.claude/feature-dev/<feature-id>/`
- Produces `spec.md` and `spec.json` with:
  - User stories
  - Functional requirements
  - Initial acceptance criteria

**You can review and approve before proceeding.**

### Phase 2: Docs Audit & Checklist (2-5 min)

The docs-auditor agent:
- Searches your project docs for relevant requirements
- Finds similar features for pattern reuse
- Enriches the spec with doc-derived requirements
- Produces `checklist.json` with comprehensive acceptance criteria

**Example**: Finds security guideline requiring email notifications, adds AC for that.

### Phase 3: Planning (3-10 min)

The planner agent:
- Detects your tech stack (framework, language, test tools)
- Studies existing patterns in your codebase
- Creates `plan.json` with tasks grouped by area:
  - Backend tasks
  - Frontend tasks
  - Infrastructure tasks
  - Test tasks

**You can review the plan before implementation starts.**

### Phase 4: Implementation (10-60 min)

Specialized dev agents work in parallel:
- **backend-dev**: Implements backend logic, writes unit/integration tests
- **frontend-dev**: Implements UI, writes E2E test stubs
- **infra-dev**: Handles database migrations, config, CI/CD updates

Each agent:
- Follows your existing code patterns
- Writes tests alongside code
- Produces a coverage report

### Phase 5: Verification (5-15 min)

The playwright-tester agent:
- Runs all E2E tests tagged with the feature ID
- Runs unit and integration tests
- Correlates results back to acceptance criteria
- Generates detailed test report with screenshots for failures

### Phase 6: Feedback Loop (if needed)

If tests fail:
- Orchestrator analyzes failures
- Provides targeted feedback to relevant dev agents
- Dev agents make focused fixes
- Tests are re-run

**This repeats until all critical acceptance criteria pass.**

### Phase 7: Finalization

The orchestrator generates:
- **orchestrator-report.md**: Summary of implementation
- **PR template**: Title, description, test plan
- **Commit message**: Structured message with AC checklist

## Tech-Stack Agnostic

This works with **ANY** tech stack:
- **Backend**: Node, Python, Ruby, Go, Java, C#, Rust, PHP
- **Frontend**: React, Vue, Angular, Svelte, Next.js, Nuxt, plain HTML
- **Database**: SQL, NoSQL, ORMs like Prisma, TypeORM, Sequelize, SQLAlchemy
- **Testing**: Playwright, Jest, Vitest, Pytest, JUnit, Go testing

The planner detects your stack and ensures dev agents follow your patterns.

## Project Configuration

For best results, create `.claude/feature-orchestrator.yml`:

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
  integration:
    runner: vitest
    command: "npm run test:integration"

# Documentation paths
docs:
  paths:
    - /docs
    - /specs
  guidelines:
    security: /docs/security-guidelines.md
    api: /docs/api-standards.md

# Environment
default_feature_env:
  base_url: "http://localhost:3000"
  test_user_email: "test@example.com"
  test_user_password: "password123"

# Behavior
auto_approve_plan: false  # If true, skips plan review step
create_branch: true       # Automatically create feature branch
```

## Output Artifacts

All artifacts are saved to `.claude/feature-dev/<feature-id>/`:

- `spec.md` - Human-readable specification
- `spec.json` - Machine-readable spec
- `checklist.json` - Acceptance criteria checklist
- `plan.json` - Implementation plan
- `plan-summary.md` - Plan overview
- `backend-coverage.json` - Backend implementation coverage
- `frontend-coverage.json` - Frontend implementation coverage
- `infra-coverage.json` - Infrastructure coverage
- `playwright-results.json` - E2E test results
- `orchestrator-report.md` - Final summary
- `playwright-report/` - HTML test report
- `screenshots/` - Test failure screenshots
- `traces/` - Playwright traces for debugging

## When to Use This

**Good use cases**:
- New user-facing features
- API endpoint additions
- Complex form workflows
- Feature requiring multiple services
- Features requiring E2E verification

**Not ideal for**:
- Simple bug fixes (just fix directly)
- One-line changes
- Purely cosmetic changes (CSS tweaks)
- Exploratory refactoring

## Tips for Success

1. **Start the dev server**: E2E tests need the app running
2. **Seed test data**: Ensure test database has necessary data
3. **Review the spec**: Catch issues early in the spec phase
4. **Review the plan**: Verify the planner understood your stack correctly
5. **Let it iterate**: If tests fail, let the orchestrator fix them (it's designed for this)

## Example Session

```
You: /feature-orchestrator

Orchestrator: I'll help you develop a new feature. What feature would you like to add?

You: Add ability to reset 2FA from settings

Orchestrator: Got it. Let me clarify a few things:
1. Should this require password confirmation?
2. Should users receive an email notification?
3. Any compliance requirements I should know about?

You: Yes to both, and it should be audited for compliance

Orchestrator: Perfect. Creating spec... [2 minutes]

Spec created with 5 acceptance criteria. Would you like to review?

You: Looks good

Orchestrator: Searching documentation for additional requirements... [2 minutes]

Found 2 additional requirements:
- Security guideline: Email notifications for auth changes
- Compliance: Audit logging required

Updated checklist to 7 acceptance criteria.

Creating implementation plan... [3 minutes]

Detected stack:
- Backend: Node.js + Express + Prisma
- Frontend: React + Next.js
- Tests: Playwright + Vitest

Plan:
- 2 backend tasks (auth service + API endpoint)
- 1 frontend task (settings UI)
- 1 infra task (database migration)
- 1 test task (E2E suite)

Proceed with implementation?

You: Yes

Orchestrator: Implementing... [15 minutes]
✓ Backend implementation complete (2/2 tasks, 8 unit tests)
✓ Frontend implementation complete (1/1 tasks, 4 E2E tests)
✓ Infrastructure implementation complete (1/1 tasks)

Running E2E tests... [3 minutes]

Test results: 6/8 tests passed, 2 failed
- AC2 failed: Dialog not rendering
- AC4 failed: Email not sent

Analyzing failures and providing feedback... [2 minutes]

Re-implementing fixes... [5 minutes]

Re-running tests... [3 minutes]

All tests passed! ✓

Generating final report...

Feature "2FA Reset" is complete!
- 7/7 acceptance criteria satisfied
- 8 unit tests passing
- 4 E2E tests passing
- Files changed: 5

See .claude/feature-dev/feat-reset-2fa-20250104120000/ for details.

Would you like me to create a PR?
```

## Troubleshooting

**Tests fail repeatedly**:
- Check if dev server is running
- Check if test data exists
- Review screenshots in artifacts to see what's happening

**Wrong tech stack detected**:
- Check `plan.json` and correct it manually, or
- Add `.claude/feature-orchestrator.yml` with explicit config

**Documentation not found**:
- Ensure docs paths are correct
- Check if docs exist in expected locations
- Add explicit paths to config

**Environment issues**:
- Ensure all services (DB, API, etc.) are running
- Check environment variables are set
- Verify base URL is accessible

## Related Commands

- `/plan` - Just plan without implementing
- `/test-feature <feature-id>` - Re-run tests for a feature
- `/review-feature <feature-id>` - Review artifacts for a feature

## Feedback

This is an AI-powered orchestrator. It learns from your patterns and improves over time. If something doesn't work as expected, the orchestrator will adapt and try different approaches.

Let's build something great!
