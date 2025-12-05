# Feature Orchestrator MCP Server

The main MCP server for the Feature Orchestrator plugin. Provides workspace management, state tracking, artifact storage, and coordination tools for the multi-agent workflow.

## Status

**IMPLEMENTED** - This MCP server is fully functional.

## Features

### Workspace Management

- **create_workspace**: Create a new feature workspace with initial state and scope
- **list_workspaces**: List all feature workspaces with optional status filtering
- **get_workspace**: Get detailed information about a workspace
- **delete_workspace**: Clean up a workspace and all its artifacts

### State Management

- **get_state**: Get the current orchestration state for a feature
- **update_state**: Update phase, status, iteration count, errors
- **set_scope**: Update implementation scope (full/frontend-only)

### Artifact Management

- **save_artifact**: Save specs, plans, checklists, coverage reports
- **get_artifact**: Retrieve any artifact from the workspace
- **list_artifacts**: List all artifacts in a workspace

### Configuration

- **get_config**: Read project configuration from `.claude/feature-orchestrator.yml`
- **generate_feature_id**: Generate unique feature IDs

### Documentation

- **search_docs**: Search project documentation for keywords
- **read_doc**: Read documentation files with front matter and heading parsing

### Reporting

- **generate_report**: Generate the final orchestrator report

## Installation

```bash
cd mcp/feature-orchestrator
npm install
npm run build
```

## Usage

The server is configured in `.mcp.json`:

```json
{
  "mcpServers": {
    "feature-orchestrator": {
      "command": "node",
      "args": ["../../mcp/feature-orchestrator/dist/index.js"],
      "enabled": true
    }
  }
}
```

## Tool Examples

### Create Workspace

```json
{
  "name": "create_workspace",
  "arguments": {
    "feature_id": "feat-user-profile-20251205120000",
    "title": "User Profile Page",
    "scope": "frontend-only",
    "scope_notes": "Iterating on UI design first"
  }
}
```

### Update State

```json
{
  "name": "update_state",
  "arguments": {
    "feature_id": "feat-user-profile-20251205120000",
    "phase": "implementation",
    "status": "in_progress",
    "mark_phase_completed": "planning"
  }
}
```

### Save Artifact

```json
{
  "name": "save_artifact",
  "arguments": {
    "feature_id": "feat-user-profile-20251205120000",
    "name": "spec.json",
    "content": "{\"title\": \"User Profile\", ...}",
    "type": "json"
  }
}
```

### Generate Report

```json
{
  "name": "generate_report",
  "arguments": {
    "feature_id": "feat-user-profile-20251205120000"
  }
}
```

## State Structure

Each workspace maintains a `state.json`:

```json
{
  "feature_id": "feat-example-20251205120000",
  "title": "Example Feature",
  "current_phase": "implementation",
  "status": "in_progress",
  "scope": {
    "implementation_scope": "full",
    "skip_backend": false,
    "notes": null
  },
  "created_at": "2025-12-05T12:00:00.000Z",
  "updated_at": "2025-12-05T12:30:00.000Z",
  "phases_completed": ["clarification", "planning"],
  "current_iteration": 1,
  "max_iterations": 5,
  "errors": []
}
```

## Workspace Structure

```
.claude/feature-dev/<feature-id>/
├── state.json           # Orchestration state
├── scope.json           # Implementation scope
├── spec.json            # Feature specification
├── spec.md              # Human-readable spec
├── checklist.json       # Acceptance criteria
├── plan.json            # Implementation plan
├── test-plan.json       # Test strategy
├── backend-coverage.json
├── frontend-coverage.json
├── test-coverage.json
├── playwright-results.json
└── orchestrator-report.md
```

## Integration with Agents

The feature-orchestrator MCP provides the infrastructure that agents use:

1. **feature-orchestrator agent** uses `create_workspace`, `update_state`, `generate_report`
2. **spec-writer agent** uses `save_artifact` to store specs
3. **planner agent** uses `get_artifact` to read specs, `save_artifact` to store plans
4. **dev agents** use `get_artifact` to read plans, `save_artifact` to store coverage
5. **playwright-tester agent** uses `save_artifact` to store test results

## Development

### Build

```bash
npm run build
```

### Watch Mode

```bash
npm run dev
```

### Test

```bash
npm test
```

## Dependencies

- `@modelcontextprotocol/sdk` - MCP SDK
- `gray-matter` - YAML front matter parsing
- `glob` - File pattern matching

## License

MIT
