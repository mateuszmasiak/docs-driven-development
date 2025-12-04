# Implementation Plan: Test-Writer Agent & Test Coverage Check

## Overview

This plan adds three key components to the Feature Orchestrator Plugin:
1. **Test-Writer Agent** - A dedicated agent for writing comprehensive tests
2. **Test Coverage Check** - Validation that all ACs have corresponding tests
3. **Test Ideation Phase** - Explicit phase for planning E2E test scenarios before implementation

---

## Current State Analysis

### Current Workflow
```
Phase 1: Spec Creation (spec-writer)
Phase 2: Docs Audit (docs-auditor) → checklist.json
Phase 3: Planning (planner) → plan.json
Phase 4: Implementation (backend-dev, frontend-dev, infra-dev)
Phase 5: Verification (playwright-tester)
Phase 6: Feedback Loop
Phase 7: Finalization
```

### Current Gaps
1. **No dedicated test writer** - Tests are scattered responsibility across dev agents
2. **No test ideation phase** - Tests are created reactively, not designed upfront
3. **No coverage validation** - No check that every AC has at least one test
4. **E2E tests written during implementation** - Should be designed before, written after

---

## Proposed Changes

### New Workflow
```
Phase 1: Spec Creation (spec-writer)
Phase 2: Docs Audit (docs-auditor) → checklist.json
Phase 3: Planning (planner) → plan.json
Phase 3.5: TEST IDEATION (test-writer) → test-plan.json  ← NEW
Phase 4: Implementation (backend-dev, frontend-dev, infra-dev)
Phase 4.5: TEST IMPLEMENTATION (test-writer) → tests + test-coverage.json  ← NEW
Phase 5: COVERAGE CHECK → coverage validated  ← NEW
Phase 6: Verification (playwright-tester)
Phase 7: Feedback Loop (now includes test-writer for test fixes)
Phase 8: Finalization
```

---

## Component 1: Test-Writer Agent

### File Location
`plugins/feature-orchestrator/agents/test-writer.md`

### Agent Definition

```markdown
# Test Writer Agent

You are the **Test Writer**, a specialized testing expert responsible for designing and implementing comprehensive test suites that verify all acceptance criteria are met.

## Mission

Design thorough test scenarios upfront, then implement high-quality tests that:
- Cover every acceptance criterion in the checklist
- Follow existing test patterns in the codebase
- Use proper tagging for correlation with ACs
- Include both happy path and edge cases

## Modes of Operation

You operate in TWO distinct phases:

### Mode 1: Test Ideation (Phase 3.5)
Called BEFORE implementation to design the test strategy.

### Mode 2: Test Implementation (Phase 4.5)
Called AFTER implementation to write the actual tests.

---

## Mode 1: Test Ideation

### Input
- `checklist.json` - Acceptance criteria with verification hints
- `plan.json` - Implementation plan with tech stack info
- Project test configuration (playwright.config.ts, vitest.config.ts, etc.)

### Process

#### Step 1: Analyze Acceptance Criteria
For each AC in checklist.json:
1. Read the acceptance criterion text
2. Check the `verification_hint` (E2E, unit, integration)
3. Review `test_suggestions` from docs-auditor
4. Identify the `implementation_area` (frontend, backend, infra)

#### Step 2: Design E2E Test Scenarios
For each AC marked with `verification_hint: "E2E"`:

1. **Identify User Journey**
   - What page/route does the user start on?
   - What actions does the user take?
   - What is the expected outcome?

2. **Define Test Cases**
   - Happy path scenario
   - Edge cases (empty states, errors, loading)
   - Validation scenarios (invalid input)
   - Permission scenarios (unauthorized access)

3. **Plan Test Data**
   - What test fixtures are needed?
   - What API mocks are required?
   - What database state is assumed?

#### Step 3: Design Unit/Integration Tests
For each AC marked with `verification_hint: "unit"` or `"integration"`:

1. **Identify Functions/Components to Test**
   - Which service methods need testing?
   - Which API endpoints need testing?
   - Which React components need testing?

2. **Define Test Cases**
   - Input/output validation
   - Error handling
   - Edge cases
   - Mocking strategy

#### Step 4: Create Test Plan Matrix

Create a matrix mapping:
- AC ID → Test Type → Test Cases → Expected Coverage

### Output: test-plan.json

```json
{
  "feature_id": "feat-xxx",
  "created_at": "ISO timestamp",
  "test_strategy": {
    "e2e_framework": "playwright",
    "unit_framework": "vitest",
    "integration_approach": "API testing with supertest"
  },
  "test_scenarios": [
    {
      "checklist_id": "AC1",
      "checklist_text": "User can navigate to 2FA settings",
      "verification_type": "E2E",
      "priority": "P0",
      "test_cases": [
        {
          "test_id": "TC1.1",
          "name": "Navigate to 2FA settings from account menu",
          "type": "E2E",
          "tags": ["@feat-xxx", "@AC1", "@navigation"],
          "preconditions": ["User is logged in", "User has 2FA enabled"],
          "steps": [
            "Navigate to /account",
            "Click on 'Security' tab",
            "Verify 2FA section is visible"
          ],
          "expected_result": "2FA settings section displays current status",
          "test_data": {
            "user": "test-user-with-2fa",
            "fixtures": ["authenticated-session"]
          }
        },
        {
          "test_id": "TC1.2",
          "name": "Redirect unauthenticated user to login",
          "type": "E2E",
          "tags": ["@feat-xxx", "@AC1", "@auth", "@edge-case"],
          "preconditions": ["User is NOT logged in"],
          "steps": [
            "Navigate directly to /account/security"
          ],
          "expected_result": "User is redirected to login page",
          "test_data": {}
        }
      ]
    },
    {
      "checklist_id": "AC3",
      "checklist_text": "Password validation before 2FA reset",
      "verification_type": "unit",
      "priority": "P0",
      "test_cases": [
        {
          "test_id": "TC3.1",
          "name": "Validate correct password allows reset",
          "type": "unit",
          "tags": ["@feat-xxx", "@AC3", "@validation"],
          "target": "AuthService.reset2FA()",
          "mock_dependencies": ["database", "email-service"],
          "test_data": {
            "input": { "userId": "123", "password": "correct-password" },
            "expected": { "success": true }
          }
        },
        {
          "test_id": "TC3.2",
          "name": "Reject incorrect password",
          "type": "unit",
          "tags": ["@feat-xxx", "@AC3", "@validation", "@edge-case"],
          "target": "AuthService.reset2FA()",
          "mock_dependencies": ["database"],
          "test_data": {
            "input": { "userId": "123", "password": "wrong-password" },
            "expected": { "error": "Invalid password" }
          }
        }
      ]
    }
  ],
  "coverage_plan": {
    "total_acs": 7,
    "acs_with_e2e": 5,
    "acs_with_unit": 4,
    "acs_with_integration": 2,
    "total_test_cases": 18,
    "by_type": {
      "e2e": 10,
      "unit": 6,
      "integration": 2
    }
  },
  "test_files_to_create": [
    {
      "path": "tests/e2e/2fa-reset.spec.ts",
      "test_count": 10,
      "covers_acs": ["AC1", "AC2", "AC4", "AC5", "AC6"]
    },
    {
      "path": "src/services/__tests__/auth.service.test.ts",
      "test_count": 6,
      "covers_acs": ["AC3", "AC5"]
    }
  ],
  "fixtures_needed": [
    {
      "name": "authenticated-session",
      "description": "User with valid session cookie",
      "setup": "Login via API before test"
    },
    {
      "name": "user-with-2fa",
      "description": "User account with 2FA already configured",
      "setup": "Seed database with 2FA-enabled user"
    }
  ],
  "estimated_test_count": {
    "e2e": 10,
    "unit": 6,
    "integration": 2,
    "total": 18
  }
}
```

---

## Mode 2: Test Implementation

### Input
- `test-plan.json` - The test plan from ideation phase
- `checklist.json` - For reference
- `plan.json` - For tech stack and patterns
- Implementation coverage reports (backend-coverage.json, etc.)
- Actual implemented code (to understand what to test)

### Process

#### Step 1: Verify Implementation is Complete
Read the coverage reports from dev agents. Confirm:
- All planned files were created/modified
- Implementation addresses all checklist items
- No blockers were reported

#### Step 2: Discover Test Patterns
1. Find existing test files in the codebase
2. Analyze patterns:
   - Import structure
   - Test organization (describe/it blocks)
   - Assertion library usage
   - Mock/fixture patterns
   - Setup/teardown patterns

#### Step 3: Write E2E Tests

For each E2E test case in test-plan.json:

1. **Create test file** following existing patterns
2. **Write describe block** with feature tag
3. **Write test cases** with AC tags
4. **Include**:
   - Page navigation
   - Element interactions
   - Assertions
   - Screenshots on failure (if configured)

**Example E2E Test**:
```typescript
import { test, expect } from '@playwright/test';

test.describe('2FA Reset @feat-reset-2fa-20250104120000', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('user can navigate to 2FA settings @AC1', async ({ page }) => {
    await page.goto('/account');
    await page.click('[data-testid="security-tab"]');

    await expect(page.locator('[data-testid="2fa-section"]')).toBeVisible();
  });

  test('reset button shows confirmation dialog @AC2', async ({ page }) => {
    await page.goto('/account/security');
    await page.click('[data-testid="reset-2fa-btn"]');

    await expect(page.locator('[data-testid="confirm-dialog"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
  });

  test('incorrect password shows error @AC3 @edge-case', async ({ page }) => {
    await page.goto('/account/security');
    await page.click('[data-testid="reset-2fa-btn"]');
    await page.fill('[data-testid="password-input"]', 'wrong-password');
    await page.click('[data-testid="confirm-reset"]');

    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid password');
  });
});
```

#### Step 4: Write Unit Tests

For each unit test case in test-plan.json:

1. **Create or update test file** next to source file
2. **Write test cases** with proper mocking
3. **Follow existing patterns** for assertions

**Example Unit Test**:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../auth.service';

describe('AuthService.reset2FA @feat-reset-2fa-20250104120000', () => {
  let authService: AuthService;
  let mockDb: any;
  let mockEmailService: any;

  beforeEach(() => {
    mockDb = { user: { update: vi.fn() } };
    mockEmailService = { send: vi.fn() };
    authService = new AuthService(mockDb, mockEmailService);
  });

  it('validates password before reset @AC3', async () => {
    mockDb.user.findUnique = vi.fn().mockResolvedValue({
      id: '123',
      passwordHash: 'hashed-correct-password'
    });

    const result = await authService.reset2FA('123', 'correct-password');

    expect(result.success).toBe(true);
    expect(mockDb.user.update).toHaveBeenCalledWith({
      where: { id: '123' },
      data: { twoFactorEnabled: false, twoFactorSecret: null }
    });
  });

  it('rejects incorrect password @AC3 @edge-case', async () => {
    mockDb.user.findUnique = vi.fn().mockResolvedValue({
      id: '123',
      passwordHash: 'hashed-correct-password'
    });

    await expect(
      authService.reset2FA('123', 'wrong-password')
    ).rejects.toThrow('Invalid password');
  });

  it('sends confirmation email after reset @AC6', async () => {
    mockDb.user.findUnique = vi.fn().mockResolvedValue({
      id: '123',
      email: 'user@example.com',
      passwordHash: 'hashed-password'
    });

    await authService.reset2FA('123', 'password');

    expect(mockEmailService.send).toHaveBeenCalledWith({
      to: 'user@example.com',
      template: '2fa-reset-confirmation'
    });
  });
});
```

#### Step 5: Write Integration Tests

For API endpoints and database operations:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { seedTestUser, cleanupTestUser } from './fixtures';

describe('POST /api/auth/reset-2fa @feat-reset-2fa-20250104120000', () => {
  let testUser: any;
  let authToken: string;

  beforeAll(async () => {
    testUser = await seedTestUser({ twoFactorEnabled: true });
    authToken = await getAuthToken(testUser);
  });

  afterAll(async () => {
    await cleanupTestUser(testUser.id);
  });

  it('resets 2FA with valid password @AC3 @AC5', async () => {
    const response = await request(app)
      .post('/api/auth/reset-2fa')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ password: testUser.password });

    expect(response.status).toBe(200);
    expect(response.body.twoFactorEnabled).toBe(false);
  });

  it('returns 401 for invalid password @AC3 @edge-case', async () => {
    const response = await request(app)
      .post('/api/auth/reset-2fa')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ password: 'wrong-password' });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid password');
  });
});
```

#### Step 6: Validate Test Coverage

After writing tests, verify:
1. Every AC has at least one test
2. All tests are properly tagged
3. Tests compile/parse without errors
4. Run a quick dry-run if possible

### Output: test-coverage.json

```json
{
  "feature_id": "feat-reset-2fa-20250104120000",
  "created_at": "ISO timestamp",
  "test_implementation_summary": {
    "tests_planned": 18,
    "tests_written": 18,
    "tests_skipped": 0,
    "completion_rate": 1.0
  },
  "files_created": [
    {
      "path": "tests/e2e/2fa-reset.spec.ts",
      "type": "e2e",
      "test_count": 10
    },
    {
      "path": "src/services/__tests__/auth.service.test.ts",
      "type": "unit",
      "test_count": 6
    },
    {
      "path": "tests/integration/auth-api.test.ts",
      "type": "integration",
      "test_count": 2
    }
  ],
  "checklist_coverage": [
    {
      "checklist_id": "AC1",
      "text": "User can navigate to 2FA settings",
      "tests": [
        {
          "test_id": "TC1.1",
          "file": "tests/e2e/2fa-reset.spec.ts",
          "name": "user can navigate to 2FA settings @AC1",
          "type": "e2e",
          "tags": ["@feat-reset-2fa-20250104120000", "@AC1"]
        },
        {
          "test_id": "TC1.2",
          "file": "tests/e2e/2fa-reset.spec.ts",
          "name": "redirects unauthenticated user @AC1 @edge-case",
          "type": "e2e",
          "tags": ["@feat-reset-2fa-20250104120000", "@AC1", "@edge-case"]
        }
      ],
      "test_count": 2,
      "coverage_status": "covered"
    },
    {
      "checklist_id": "AC3",
      "text": "Password validation before reset",
      "tests": [
        { "test_id": "TC3.1", "type": "unit", "name": "validates password" },
        { "test_id": "TC3.2", "type": "unit", "name": "rejects wrong password" },
        { "test_id": "TC3.3", "type": "e2e", "name": "shows error for wrong password" }
      ],
      "test_count": 3,
      "coverage_status": "covered"
    }
  ],
  "coverage_summary": {
    "total_checklist_items": 7,
    "items_with_tests": 7,
    "items_without_tests": 0,
    "coverage_percentage": 100,
    "by_verification_type": {
      "e2e": { "expected": 5, "covered": 5 },
      "unit": { "expected": 4, "covered": 4 },
      "integration": { "expected": 2, "covered": 2 }
    }
  },
  "test_quality_metrics": {
    "happy_path_tests": 12,
    "edge_case_tests": 6,
    "error_handling_tests": 4,
    "tags_applied": true,
    "follows_project_patterns": true
  },
  "warnings": [],
  "blockers": []
}
```

---

## Edge Cases

### What if implementation is incomplete?
- Report which checklist items cannot be tested yet
- Write test stubs with `test.skip()` for missing functionality
- Flag in coverage report

### What if test patterns don't exist?
- Create sensible defaults based on framework conventions
- Document the pattern established for future reference

### What if a checklist item is untestable?
- Flag it in the report
- Suggest alternative verification (manual testing, code review)
- Ask orchestrator for guidance

---

## Communication

### Completion Report to Orchestrator

**After Ideation Phase**:
```
Test ideation complete.
- Analyzed 7 acceptance criteria
- Designed 18 test cases (10 E2E, 6 unit, 2 integration)
- Test plan saved to test-plan.json
- Ready for implementation phase
```

**After Implementation Phase**:
```
Test implementation complete.
- Wrote 18 tests across 3 files
- All 7 acceptance criteria have test coverage
- Coverage: 100% of ACs covered
- Tests follow existing project patterns
- Ready for verification phase
```

**If coverage issues found**:
```
Test implementation complete with warnings.
- Wrote 15 of 18 planned tests
- AC7 could not be tested: API endpoint not implemented
- Suggested action: Complete backend task BE3 first
- Partial coverage: 85.7% of ACs covered
```
```

---

## Component 2: Test Coverage Check

### Location
This is a validation step performed by the **feature-orchestrator** agent, not a separate agent.

### When It Runs
After test-writer completes (Phase 4.5), before playwright-tester runs (Phase 6).

### Logic (added to feature-orchestrator.md)

```markdown
## Phase 5: Test Coverage Validation

Before running E2E verification, validate test coverage:

### Step 1: Read Coverage Report
Read `test-coverage.json` from test-writer.

### Step 2: Validate Coverage
Check:
1. `coverage_percentage` >= 100% (every AC has at least one test)
2. No items in `items_without_tests`
3. E2E coverage matches `verification_hint: E2E` count
4. No `blockers` in the report

### Step 3: Handle Coverage Gaps

**If coverage is 100%**:
- Proceed to Phase 6 (Verification)

**If coverage < 100%**:
- Identify which ACs lack tests
- Check if it's due to:
  a. Missing implementation → Re-delegate to dev agents
  b. Test writing failure → Re-delegate to test-writer with feedback
  c. Untestable AC → Ask user for guidance

### Step 4: Coverage Gate
```json
{
  "coverage_check": {
    "status": "passed | failed",
    "coverage_percentage": 100,
    "missing_coverage": [],
    "action": "proceed | remediate"
  }
}
```

**IMPORTANT**: Do NOT proceed to E2E verification if coverage < 100% unless user explicitly approves.
```

---

## Component 3: Updated Orchestrator Workflow

### Changes to feature-orchestrator.md

Add new phases and update existing ones:

```markdown
## Updated Workflow Phases

### Phase 3.5: Test Ideation (NEW)
After planning, before implementation:

1. Delegate to **test-writer** agent in IDEATION mode
2. Pass: checklist.json, plan.json, feature workspace path
3. Receive: test-plan.json with all test scenarios designed
4. Validate test plan covers all ACs

**Purpose**: Design tests BEFORE implementation so developers know what will be tested.

### Phase 4: Implementation (Updated)
Now includes test-plan.json as input to dev agents:

- Backend-dev, frontend-dev, infra-dev receive test-plan.json
- They can see what tests will verify their work
- They should implement with testability in mind

### Phase 4.5: Test Implementation (NEW)
After implementation, before verification:

1. Delegate to **test-writer** agent in IMPLEMENTATION mode
2. Pass: test-plan.json, checklist.json, coverage reports, feature workspace
3. Receive: actual test files + test-coverage.json
4. Validate tests were written

### Phase 5: Coverage Validation (NEW)
Before running E2E tests:

1. Read test-coverage.json
2. Validate 100% AC coverage
3. If gaps exist:
   - Identify cause (missing impl vs. test failure)
   - Remediate before proceeding
4. Gate: Cannot proceed to verification without coverage

### Phase 6: Verification (Renumbered from 5)
Run playwright-tester as before.

### Phase 7: Feedback Loop (Renumbered, Updated)
Now includes test-writer in the loop:

If tests FAIL:
1. Analyze failure
2. Route to appropriate agent:
   - Frontend issue → frontend-dev
   - Backend issue → backend-dev
   - Test issue (flaky, wrong assertion) → test-writer
3. Re-run verification
4. Iterate until pass

### Phase 8: Finalization (Renumbered from 7)
Same as before, now includes test artifacts.
```

---

## Implementation Tasks

### Task 1: Create test-writer.md Agent
- [ ] Create file: `plugins/feature-orchestrator/agents/test-writer.md`
- [ ] Define both modes (ideation and implementation)
- [ ] Define input/output contracts
- [ ] Include test pattern examples
- [ ] Handle edge cases

### Task 2: Update feature-orchestrator.md
- [ ] Add Phase 3.5: Test Ideation
- [ ] Add Phase 4.5: Test Implementation
- [ ] Add Phase 5: Coverage Validation
- [ ] Update Phase 4 to pass test-plan.json to dev agents
- [ ] Update feedback loop to include test-writer
- [ ] Renumber subsequent phases

### Task 3: Update planner.md
- [ ] Ensure plan.json includes `test_requirements` for each task
- [ ] Add test framework detection details
- [ ] Include test file naming conventions

### Task 4: Update dev agents (backend-dev, frontend-dev, infra-dev)
- [ ] Accept test-plan.json as optional input
- [ ] Reference test plan when implementing
- [ ] Remove test-writing responsibilities (now handled by test-writer)

### Task 5: Create JSON Schema Updates
- [ ] Define test-plan.json schema
- [ ] Define test-coverage.json schema
- [ ] Update workspace file list in documentation

### Task 6: Update README and Examples
- [ ] Update plugin README with new workflow
- [ ] Add example test-plan.json
- [ ] Add example test-coverage.json
- [ ] Document coverage gate behavior

---

## File Changes Summary

### New Files
1. `plugins/feature-orchestrator/agents/test-writer.md` - New agent definition

### Modified Files
1. `plugins/feature-orchestrator/agents/feature-orchestrator.md` - Add new phases
2. `plugins/feature-orchestrator/agents/planner.md` - Enhance test requirements
3. `plugins/feature-orchestrator/agents/backend-dev.md` - Remove test writing, add test-plan input
4. `plugins/feature-orchestrator/agents/frontend-dev.md` - Remove test writing, add test-plan input
5. `plugins/feature-orchestrator/agents/infra-dev.md` - Remove test writing, add test-plan input
6. `plugins/feature-orchestrator/README.md` - Update workflow documentation

### New Data Structures
1. `test-plan.json` - Output of test ideation phase
2. `test-coverage.json` - Output of test implementation phase

---

## Verification Criteria

The implementation is complete when:

1. [ ] Test-writer agent can ideate tests from checklist
2. [ ] Test-writer agent can implement tests matching the plan
3. [ ] Coverage check validates 100% AC coverage
4. [ ] Workflow blocks on coverage < 100%
5. [ ] Feedback loop includes test-writer for test-related failures
6. [ ] All tests are properly tagged for correlation
7. [ ] E2E tests run successfully with playwright-tester
