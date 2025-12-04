# Feature Orchestrator: Stack-Agnostic Feature Development Plugin

A comprehensive Claude Code plugin system that orchestrates the entire feature development lifecycle with multi-agent workflows, spec-driven development, and automated E2E verification.

## What Is This?

This repository contains a **Claude Code plugin** that transforms how you develop features:

- **Input**: Vague feature idea ("add 2FA reset button")
- **Output**: Fully implemented, tested, verified feature with PR template

**Zero framework lock-in**. Works with any tech stack by detecting and following your existing patterns.

## Repository Structure

```
docs-driven-development/
├── plugins/
│   └── feature-orchestrator/          # Main plugin
│       ├── .claude-plugin/
│       │   ├── plugin.json            # Plugin manifest
│       │   └── .mcp.json              # MCP server configuration
│       ├── agents/                    # 8 specialized agents
│       │   ├── feature-orchestrator.md
│       │   ├── spec-writer.md
│       │   ├── docs-auditor.md
│       │   ├── planner.md
│       │   ├── backend-dev.md
│       │   ├── frontend-dev.md
│       │   ├── infra-dev.md
│       │   └── playwright-tester.md
│       ├── skills/                    # Reusable capabilities
│       │   ├── playwright-runner/
│       │   └── docs-reader/
│       ├── commands/                  # Slash commands
│       │   └── feature-orchestrator.md
│       ├── hooks/                     # Workflow hooks
│       │   └── hooks.json
│       └── README.md                  # Plugin documentation
│
├── mcp/                               # MCP servers
│   ├── playwright-orchestrator/       # Playwright test runner
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   └── docs/                          # Docs reader (stub)
│       └── README.md
│
├── .gitignore
├── README.md                          # This file
└── .claude/
    └── feature-orchestrator.example.yml  # Example config
```

## High-Level Architecture

### Multi-Agent System

```
User Request
     ↓
[Feature Orchestrator] ←─────────────┐
     ↓                                │
     ├─→ [Spec Writer]                │
     │        ↓                        │
     ├─→ [Docs Auditor]               │
     │        ↓                        │
     ├─→ [Planner]                    │
     │        ↓                        │
     ├─→ [Backend Dev]  ─┐            │
     ├─→ [Frontend Dev] ─┼─→ Coverage │
     ├─→ [Infra Dev]    ─┘            │
     │        ↓                        │
     └─→ [Playwright Tester]          │
              ↓                        │
         Test Results                 │
              ↓                        │
         [Feedback Loop] ──────────────┘
              ↓
         Final Report
```

### Component Responsibilities

| Component | Purpose |
|-----------|---------|
| **Agents** | Specialized AI prompts for different tasks (spec writing, planning, implementation, testing) |
| **Skills** | Reusable capabilities (running Playwright, reading docs) |
| **MCP Servers** | External tool integration (Playwright CLI, document parsing) |
| **Commands** | User-facing entry points (`/feature-orchestrator`) |
| **Hooks** | Workflow automation (suggestions, triggers) |

## Key Features

### 1. Tech-Stack Agnostic

Works with **any** technology:
- **Languages**: JavaScript, TypeScript, Python, Ruby, Go, Java, C#, Rust, PHP, etc.
- **Frameworks**: React, Vue, Angular, Next.js, Express, Django, Rails, Spring Boot, etc.
- **Testing**: Playwright, Jest, Vitest, Pytest, JUnit, Go testing, etc.

The system:
- Detects your stack automatically
- Studies existing patterns
- Mimics your code style and architecture
- Never introduces new frameworks

### 2. Spec & Docs Driven

- Converts vague ideas into structured specs
- Searches project documentation for requirements
- Merges spec + docs into comprehensive acceptance checklist
- Ensures compliance, security, architectural standards

### 3. Test-First Development

- Writes tests alongside implementation
- Uses Playwright for E2E verification
- Correlates test results back to acceptance criteria
- Iterates until all tests pass

### 4. Intelligent Feedback Loop

- Automatically detects test failures
- Analyzes root causes (frontend/backend/infra)
- Provides targeted, actionable feedback
- Re-implements focused fixes
- Continues until acceptance criteria met

## Quick Start

### 1. Install the Plugin

```bash
# Clone this repository
git clone <repository-url>
cd docs-driven-development

# Copy plugin to Claude Code plugins directory
mkdir -p ~/.claude-code/plugins
cp -r plugins/feature-orchestrator ~/.claude-code/plugins/

# Build MCP servers
cd mcp/playwright-orchestrator
npm install
npm run build
cd ../..
```

### 2. Configure Your Project

Create `.claude/feature-orchestrator.yml` in your project:

```yaml
tests:
  e2e:
    runner: playwright
    command: "npx playwright test"
    tag_flag: "--grep"
  unit:
    runner: vitest
    command: "npm run test:unit"

docs:
  paths:
    - /docs
    - /specs

default_feature_env:
  base_url: "http://localhost:3000"
```

See `.claude/feature-orchestrator.example.yml` for full example.

### 3. Run Your First Feature

```bash
# Start your development server
npm run dev

# In Claude Code:
/feature-orchestrator
```

Follow the prompts to develop your first orchestrated feature!

## Installation

### Prerequisites

- **Claude Code**: Latest version
- **Node.js**: 18+ (for MCP servers)
- **Playwright**: In your project (optional, but needed for E2E)

### Detailed Installation Steps

1. **Clone Repository**:
   ```bash
   git clone <repository-url>
   cd docs-driven-development
   ```

2. **Install Plugin**:
   ```bash
   mkdir -p ~/.claude-code/plugins
   cp -r plugins/feature-orchestrator ~/.claude-code/plugins/
   ```

3. **Build Playwright MCP Server**:
   ```bash
   cd mcp/playwright-orchestrator
   npm install
   npm run build
   ```

4. **Install Playwright in Your Project** (if using E2E tests):
   ```bash
   cd /path/to/your/project
   npm install -D @playwright/test
   npx playwright install
   ```

5. **Create Project Config**:
   ```bash
   cd /path/to/your/project
   mkdir -p .claude
   cp /path/to/docs-driven-development/.claude/feature-orchestrator.example.yml .claude/feature-orchestrator.yml
   # Edit .claude/feature-orchestrator.yml for your project
   ```

6. **Restart Claude Code**:
   - Close and reopen Claude Code to load the plugin

7. **Verify Installation**:
   ```
   /feature-orchestrator --help
   ```

## Usage

### Basic Workflow

1. **Start dev server** (for E2E tests):
   ```bash
   npm run dev
   ```

2. **Run orchestrator**:
   ```
   /feature-orchestrator
   ```

3. **Provide feature description**:
   - Can be brief: "add 2FA reset"
   - Or detailed: "Allow users to reset their two-factor authentication..."

4. **Review spec** (generated in ~2 min):
   - User stories
   - Acceptance criteria
   - Requirements

5. **Review plan** (generated in ~3 min):
   - Tech stack detected
   - Implementation tasks
   - Test strategy

6. **Approve and watch it work**:
   - Implementation (~10-60 min depending on complexity)
   - Testing (~5-15 min)
   - Iterations if needed

7. **Review final artifacts**:
   - Implementation report
   - PR template
   - Commit message

### Advanced Usage

#### With Parameters

```
/feature-orchestrator feature="Add data export" priority=P0 docs=/docs/compliance.md
```

#### Reusing Patterns

The orchestrator learns from your codebase:
- Finds similar features
- Reuses patterns and utilities
- Maintains consistency

#### Custom Configuration

Fine-tune behavior in `.claude/feature-orchestrator.yml`:
- Test commands and frameworks
- Documentation paths
- Environment settings
- Workflow preferences

## How It Works

### Phase 1: Clarification & Spec

- **Agent**: spec-writer
- **Duration**: 2-5 minutes
- **Output**: `spec.md`, `spec.json`
- **Content**: User stories, requirements, initial acceptance criteria

### Phase 2: Docs Audit & Checklist

- **Agent**: docs-auditor
- **Skill**: docs-reader
- **Duration**: 2-5 minutes
- **Output**: `checklist.json`
- **Process**: Searches docs, finds similar features, enriches acceptance criteria

### Phase 3: Planning

- **Agent**: planner
- **Duration**: 3-10 minutes
- **Output**: `plan.json`, `plan-summary.md`
- **Process**: Detects stack, studies patterns, creates detailed task plan

### Phase 4: Implementation

- **Agents**: backend-dev, frontend-dev, infra-dev
- **Duration**: 10-60 minutes
- **Output**: Coverage reports, code changes, tests
- **Process**: Parallel implementation following existing patterns

### Phase 5: Verification

- **Agent**: playwright-tester
- **Skill**: playwright-runner
- **MCP**: playwright-orchestrator
- **Duration**: 5-15 minutes
- **Output**: `playwright-results.json`, HTML report
- **Process**: Runs E2E tests, correlates with acceptance criteria

### Phase 6: Feedback Loop

- **Coordinator**: feature-orchestrator
- **Duration**: Variable
- **Process**: Analyzes failures, provides feedback, re-implements, re-tests

### Phase 7: Finalization

- **Output**: `orchestrator-report.md`, PR template, commit message
- **Content**: Complete summary, evidence, next steps

## Configuration

### Project-Level Config

Create `.claude/feature-orchestrator.yml`:

```yaml
# Test frameworks
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
    runner: pytest
    command: "pytest tests/integration"

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
    accessibility: /docs/accessibility.md

# Environment
default_feature_env:
  base_url: "http://localhost:3000"
  api_base_url: "http://localhost:8000"
  test_user_email: "test@example.com"
  test_user_password: "password123"

# Behavior
auto_approve_plan: false      # Skip plan review
create_branch: true           # Auto-create feature branch
enable_hooks: true            # Enable workflow hooks
max_iterations: 5             # Max feedback loop iterations
```

### Plugin-Level Config

Edit `plugins/feature-orchestrator/.claude-plugin/.mcp.json` to configure MCP servers.

## Development

### Running Tests

For the Playwright MCP server:
```bash
cd mcp/playwright-orchestrator
npm test
```

### Building

```bash
cd mcp/playwright-orchestrator
npm run build
```

### Linting

```bash
npm run lint
```

### Extending the Plugin

#### Add a New Agent

1. Create agent file: `plugins/feature-orchestrator/agents/my-agent.md`
2. Define role, inputs, outputs, process
3. Register in `plugin.json`:
   ```json
   {
     "name": "my-agent",
     "path": "agents/my-agent.md",
     "description": "..."
   }
   ```

#### Add a New Skill

1. Create Skill directory: `plugins/feature-orchestrator/skills/my-skill/`
2. Create `SKILL.md` with operations
3. Register in `plugin.json`

#### Add a New MCP Server

1. Create MCP directory: `mcp/my-server/`
2. Implement MCP server (see `playwright-orchestrator` for reference)
3. Register in `.mcp.json`

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Plugin not found | Ensure plugin is in `~/.claude-code/plugins/`, restart Claude Code |
| Tests not running | Install Playwright, ensure dev server running, check test tags |
| Wrong stack detected | Add explicit config in `.claude/feature-orchestrator.yml` |
| Docs not found | Check paths in config, ensure docs exist |
| Tests keep failing | Review screenshots/traces, check services running |

See `plugins/feature-orchestrator/README.md` for detailed troubleshooting.

## Examples

### Example 1: React + Express App

```
Project: Next.js frontend + Express backend
Request: "Add password reset flow"
Duration: 35 minutes
Result:
  - Spec with 8 ACs
  - 3 backend tasks (API, email service, DB migration)
  - 2 frontend tasks (form, email template)
  - 12 tests (6 unit, 6 E2E)
  - All tests passing
```

### Example 2: Django + Vue App

```
Project: Django REST + Vue.js
Request: "Export user data (GDPR)"
Duration: 45 minutes
Result:
  - Spec with 15 ACs (enriched from compliance docs)
  - 4 backend tasks (serializer, view, celery task, encryption)
  - 2 frontend tasks (export button, download UI)
  - 1 infra task (S3 bucket config)
  - 18 tests (10 unit, 5 integration, 3 E2E)
  - 1 iteration needed (encryption fix)
```

## Contributing

Contributions welcome! To contribute:

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Update documentation
5. Submit pull request

### Development Guidelines

- Follow existing agent prompt patterns
- Add tests for new MCP tools
- Update README for new features
- Keep changes focused and minimal

## License

MIT License - see LICENSE file for details

## Credits

Inspired by:
- Anthropic's feature-dev plugin
- Claude Code marketplace plugins
- Multi-agent orchestration patterns
- Open-source Playwright and testing tools

## Support

- **Documentation**: See `plugins/feature-orchestrator/README.md` for plugin docs
- **Issues**: Open GitHub issue
- **Questions**: Review agent prompts for behavior details

---

**Built with Claude Code. For Claude Code. By the community.**
