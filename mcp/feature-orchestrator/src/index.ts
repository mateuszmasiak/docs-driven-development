#!/usr/bin/env node

/**
 * Feature Orchestrator MCP Server
 *
 * Main MCP server for the Feature Orchestrator plugin.
 * Provides workspace management, state tracking, artifact storage,
 * and coordination tools for the multi-agent workflow.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
} from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Types
interface FeatureScope {
  implementation_scope: 'full' | 'frontend-only';
  skip_backend: boolean;
  notes?: string;
}

interface FeatureState {
  feature_id: string;
  title?: string;
  current_phase: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'paused';
  scope: FeatureScope;
  created_at: string;
  updated_at: string;
  phases_completed: string[];
  current_iteration: number;
  max_iterations: number;
  errors: string[];
}

interface WorkspaceInfo {
  feature_id: string;
  path: string;
  state: FeatureState;
  artifacts: string[];
  created_at: string;
  modified_at: string;
}

interface Artifact {
  name: string;
  path: string;
  type: 'json' | 'markdown' | 'text';
  size: number;
  modified_at: string;
}

interface ProjectConfig {
  tests?: {
    e2e?: { runner: string; command: string; tag_flag?: string; test_directory?: string };
    unit?: { runner: string; command: string };
    integration?: { runner: string; command: string };
  };
  docs?: {
    paths?: string[];
    guidelines?: Record<string, string>;
  };
  default_feature_env?: {
    base_url?: string;
    api_base_url?: string;
  };
  behavior?: {
    auto_approve_plan?: boolean;
    auto_approve_spec?: boolean;
    create_branch?: boolean;
    max_iterations?: number;
  };
}

class FeatureOrchestratorServer {
  private server: Server;
  private projectRoot: string;
  private workspacesDir: string;

  constructor() {
    this.projectRoot = process.cwd();
    this.workspacesDir = join(this.projectRoot, '.claude', 'feature-dev');

    this.server = new Server(
      {
        name: 'feature-orchestrator',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();

    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getTools(),
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) =>
      this.handleToolCall(request.params.name, request.params.arguments ?? {})
    );
  }

  private getTools(): Tool[] {
    return [
      // Workspace Management
      {
        name: 'create_workspace',
        description: 'Create a new feature workspace with initial state',
        inputSchema: {
          type: 'object',
          properties: {
            feature_id: {
              type: 'string',
              description: 'Unique feature ID (e.g., feat-reset-2fa-20250104120000)',
            },
            title: {
              type: 'string',
              description: 'Human-readable feature title',
            },
            scope: {
              type: 'string',
              enum: ['full', 'frontend-only'],
              description: 'Implementation scope',
              default: 'full',
            },
            scope_notes: {
              type: 'string',
              description: 'Notes about the scope selection',
            },
          },
          required: ['feature_id'],
        },
      },
      {
        name: 'list_workspaces',
        description: 'List all feature workspaces',
        inputSchema: {
          type: 'object',
          properties: {
            status_filter: {
              type: 'string',
              enum: ['all', 'in_progress', 'completed', 'failed'],
              description: 'Filter by status',
              default: 'all',
            },
          },
        },
      },
      {
        name: 'get_workspace',
        description: 'Get detailed information about a feature workspace',
        inputSchema: {
          type: 'object',
          properties: {
            feature_id: {
              type: 'string',
              description: 'Feature ID',
            },
          },
          required: ['feature_id'],
        },
      },
      {
        name: 'delete_workspace',
        description: 'Delete a feature workspace and all its artifacts',
        inputSchema: {
          type: 'object',
          properties: {
            feature_id: {
              type: 'string',
              description: 'Feature ID to delete',
            },
            confirm: {
              type: 'boolean',
              description: 'Confirm deletion',
              default: false,
            },
          },
          required: ['feature_id', 'confirm'],
        },
      },

      // State Management
      {
        name: 'get_state',
        description: 'Get the current orchestration state for a feature',
        inputSchema: {
          type: 'object',
          properties: {
            feature_id: {
              type: 'string',
              description: 'Feature ID',
            },
          },
          required: ['feature_id'],
        },
      },
      {
        name: 'update_state',
        description: 'Update the orchestration state for a feature',
        inputSchema: {
          type: 'object',
          properties: {
            feature_id: {
              type: 'string',
              description: 'Feature ID',
            },
            phase: {
              type: 'string',
              description: 'Current phase name',
            },
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed', 'failed', 'paused'],
              description: 'Current status',
            },
            increment_iteration: {
              type: 'boolean',
              description: 'Increment the iteration counter',
            },
            add_error: {
              type: 'string',
              description: 'Add an error message',
            },
            mark_phase_completed: {
              type: 'string',
              description: 'Mark a phase as completed',
            },
          },
          required: ['feature_id'],
        },
      },
      {
        name: 'set_scope',
        description: 'Update the implementation scope for a feature',
        inputSchema: {
          type: 'object',
          properties: {
            feature_id: {
              type: 'string',
              description: 'Feature ID',
            },
            scope: {
              type: 'string',
              enum: ['full', 'frontend-only'],
              description: 'Implementation scope',
            },
            notes: {
              type: 'string',
              description: 'Notes about the scope change',
            },
          },
          required: ['feature_id', 'scope'],
        },
      },

      // Artifact Management
      {
        name: 'save_artifact',
        description: 'Save an artifact (spec, plan, checklist, etc.) to the workspace',
        inputSchema: {
          type: 'object',
          properties: {
            feature_id: {
              type: 'string',
              description: 'Feature ID',
            },
            name: {
              type: 'string',
              description: 'Artifact name (e.g., spec.json, plan.json, checklist.json)',
            },
            content: {
              type: 'string',
              description: 'Artifact content (JSON string or text)',
            },
            type: {
              type: 'string',
              enum: ['json', 'markdown', 'text'],
              description: 'Content type',
              default: 'json',
            },
          },
          required: ['feature_id', 'name', 'content'],
        },
      },
      {
        name: 'get_artifact',
        description: 'Retrieve an artifact from the workspace',
        inputSchema: {
          type: 'object',
          properties: {
            feature_id: {
              type: 'string',
              description: 'Feature ID',
            },
            name: {
              type: 'string',
              description: 'Artifact name',
            },
          },
          required: ['feature_id', 'name'],
        },
      },
      {
        name: 'list_artifacts',
        description: 'List all artifacts in a workspace',
        inputSchema: {
          type: 'object',
          properties: {
            feature_id: {
              type: 'string',
              description: 'Feature ID',
            },
          },
          required: ['feature_id'],
        },
      },

      // Configuration
      {
        name: 'get_config',
        description: 'Get the project configuration for feature orchestrator',
        inputSchema: {
          type: 'object',
          properties: {
            config_path: {
              type: 'string',
              description: 'Path to config file (default: .claude/feature-orchestrator.yml)',
            },
          },
        },
      },
      {
        name: 'generate_feature_id',
        description: 'Generate a unique feature ID based on a short name',
        inputSchema: {
          type: 'object',
          properties: {
            short_name: {
              type: 'string',
              description: 'Short name for the feature (e.g., reset-2fa, user-profile)',
            },
          },
          required: ['short_name'],
        },
      },

      // Documentation Tools (delegated to docs-reader patterns)
      {
        name: 'search_docs',
        description: 'Search project documentation for keywords',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query',
            },
            paths: {
              type: 'array',
              items: { type: 'string' },
              description: 'Paths to search in',
            },
            max_results: {
              type: 'number',
              description: 'Maximum results',
              default: 20,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'read_doc',
        description: 'Read a documentation file',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the documentation file',
            },
          },
          required: ['path'],
        },
      },

      // Report Generation
      {
        name: 'generate_report',
        description: 'Generate the final orchestrator report for a feature',
        inputSchema: {
          type: 'object',
          properties: {
            feature_id: {
              type: 'string',
              description: 'Feature ID',
            },
          },
          required: ['feature_id'],
        },
      },
    ];
  }

  private async handleToolCall(name: string, args: Record<string, unknown>) {
    try {
      switch (name) {
        // Workspace Management
        case 'create_workspace':
          return this.createWorkspace(args);
        case 'list_workspaces':
          return this.listWorkspaces(args);
        case 'get_workspace':
          return this.getWorkspace(args);
        case 'delete_workspace':
          return this.deleteWorkspace(args);

        // State Management
        case 'get_state':
          return this.getState(args);
        case 'update_state':
          return this.updateState(args);
        case 'set_scope':
          return this.setScope(args);

        // Artifact Management
        case 'save_artifact':
          return this.saveArtifact(args);
        case 'get_artifact':
          return this.getArtifact(args);
        case 'list_artifacts':
          return this.listArtifacts(args);

        // Configuration
        case 'get_config':
          return this.getConfig(args);
        case 'generate_feature_id':
          return this.generateFeatureId(args);

        // Documentation
        case 'search_docs':
          return this.searchDocs(args);
        case 'read_doc':
          return this.readDoc(args);

        // Reporting
        case 'generate_report':
          return this.generateReport(args);

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: String(error) }),
          },
        ],
        isError: true,
      };
    }
  }

  // Workspace Management
  private async createWorkspace(args: Record<string, unknown>) {
    const featureId = args.feature_id as string;
    const title = args.title as string | undefined;
    const scope = (args.scope as 'full' | 'frontend-only') || 'full';
    const scopeNotes = args.scope_notes as string | undefined;

    if (!featureId) {
      throw new Error('feature_id is required');
    }

    const workspacePath = join(this.workspacesDir, featureId);

    if (existsSync(workspacePath)) {
      throw new Error(`Workspace already exists: ${featureId}`);
    }

    // Create workspace directory
    mkdirSync(workspacePath, { recursive: true });

    // Create initial state
    const state: FeatureState = {
      feature_id: featureId,
      title,
      current_phase: 'initialization',
      status: 'in_progress',
      scope: {
        implementation_scope: scope,
        skip_backend: scope === 'frontend-only',
        notes: scopeNotes,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      phases_completed: [],
      current_iteration: 0,
      max_iterations: 5,
      errors: [],
    };

    // Save state
    writeFileSync(join(workspacePath, 'state.json'), JSON.stringify(state, null, 2));

    // Save scope
    writeFileSync(join(workspacePath, 'scope.json'), JSON.stringify(state.scope, null, 2));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              feature_id: featureId,
              workspace_path: workspacePath,
              state,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async listWorkspaces(args: Record<string, unknown>) {
    const statusFilter = (args.status_filter as string) || 'all';

    if (!existsSync(this.workspacesDir)) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ workspaces: [], total: 0 }),
          },
        ],
      };
    }

    const entries = readdirSync(this.workspacesDir, { withFileTypes: true });
    const workspaces: WorkspaceInfo[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const workspacePath = join(this.workspacesDir, entry.name);
      const statePath = join(workspacePath, 'state.json');

      if (!existsSync(statePath)) continue;

      try {
        const state = JSON.parse(readFileSync(statePath, 'utf-8')) as FeatureState;

        // Apply filter
        if (statusFilter !== 'all' && state.status !== statusFilter) {
          continue;
        }

        const artifacts = readdirSync(workspacePath).filter(
          (f) => f.endsWith('.json') || f.endsWith('.md')
        );
        const stat = statSync(workspacePath);

        workspaces.push({
          feature_id: entry.name,
          path: workspacePath,
          state,
          artifacts,
          created_at: state.created_at,
          modified_at: stat.mtime.toISOString(),
        });
      } catch {
        // Skip invalid workspaces
      }
    }

    // Sort by modified date, newest first
    workspaces.sort(
      (a, b) => new Date(b.modified_at).getTime() - new Date(a.modified_at).getTime()
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              workspaces,
              total: workspaces.length,
              filter: statusFilter,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async getWorkspace(args: Record<string, unknown>) {
    const featureId = args.feature_id as string;

    if (!featureId) {
      throw new Error('feature_id is required');
    }

    const workspacePath = join(this.workspacesDir, featureId);

    if (!existsSync(workspacePath)) {
      throw new Error(`Workspace not found: ${featureId}`);
    }

    const statePath = join(workspacePath, 'state.json');
    const state = existsSync(statePath)
      ? (JSON.parse(readFileSync(statePath, 'utf-8')) as FeatureState)
      : null;

    const artifacts = readdirSync(workspacePath)
      .filter((f) => f.endsWith('.json') || f.endsWith('.md'))
      .map((f) => {
        const filePath = join(workspacePath, f);
        const stat = statSync(filePath);
        return {
          name: f,
          path: filePath,
          type: f.endsWith('.json') ? 'json' : 'markdown',
          size: stat.size,
          modified_at: stat.mtime.toISOString(),
        };
      });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              feature_id: featureId,
              workspace_path: workspacePath,
              state,
              artifacts,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async deleteWorkspace(args: Record<string, unknown>) {
    const featureId = args.feature_id as string;
    const confirm = args.confirm as boolean;

    if (!featureId) {
      throw new Error('feature_id is required');
    }

    if (!confirm) {
      throw new Error('Must confirm deletion by setting confirm: true');
    }

    const workspacePath = join(this.workspacesDir, featureId);

    if (!existsSync(workspacePath)) {
      throw new Error(`Workspace not found: ${featureId}`);
    }

    rmSync(workspacePath, { recursive: true, force: true });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            deleted: featureId,
          }),
        },
      ],
    };
  }

  // State Management
  private async getState(args: Record<string, unknown>) {
    const featureId = args.feature_id as string;

    if (!featureId) {
      throw new Error('feature_id is required');
    }

    const statePath = join(this.workspacesDir, featureId, 'state.json');

    if (!existsSync(statePath)) {
      throw new Error(`State not found for feature: ${featureId}`);
    }

    const state = JSON.parse(readFileSync(statePath, 'utf-8')) as FeatureState;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(state, null, 2),
        },
      ],
    };
  }

  private async updateState(args: Record<string, unknown>) {
    const featureId = args.feature_id as string;

    if (!featureId) {
      throw new Error('feature_id is required');
    }

    const statePath = join(this.workspacesDir, featureId, 'state.json');

    if (!existsSync(statePath)) {
      throw new Error(`State not found for feature: ${featureId}`);
    }

    const state = JSON.parse(readFileSync(statePath, 'utf-8')) as FeatureState;

    // Update fields
    if (args.phase) {
      state.current_phase = args.phase as string;
    }
    if (args.status) {
      state.status = args.status as FeatureState['status'];
    }
    if (args.increment_iteration) {
      state.current_iteration++;
    }
    if (args.add_error) {
      state.errors.push(args.add_error as string);
    }
    if (args.mark_phase_completed) {
      const phase = args.mark_phase_completed as string;
      if (!state.phases_completed.includes(phase)) {
        state.phases_completed.push(phase);
      }
    }

    state.updated_at = new Date().toISOString();

    writeFileSync(statePath, JSON.stringify(state, null, 2));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(state, null, 2),
        },
      ],
    };
  }

  private async setScope(args: Record<string, unknown>) {
    const featureId = args.feature_id as string;
    const scope = args.scope as 'full' | 'frontend-only';
    const notes = args.notes as string | undefined;

    if (!featureId || !scope) {
      throw new Error('feature_id and scope are required');
    }

    const workspacePath = join(this.workspacesDir, featureId);
    const statePath = join(workspacePath, 'state.json');
    const scopePath = join(workspacePath, 'scope.json');

    if (!existsSync(statePath)) {
      throw new Error(`State not found for feature: ${featureId}`);
    }

    const state = JSON.parse(readFileSync(statePath, 'utf-8')) as FeatureState;

    state.scope = {
      implementation_scope: scope,
      skip_backend: scope === 'frontend-only',
      notes,
    };
    state.updated_at = new Date().toISOString();

    writeFileSync(statePath, JSON.stringify(state, null, 2));
    writeFileSync(scopePath, JSON.stringify(state.scope, null, 2));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              feature_id: featureId,
              scope: state.scope,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  // Artifact Management
  private async saveArtifact(args: Record<string, unknown>) {
    const featureId = args.feature_id as string;
    const name = args.name as string;
    const content = args.content as string;
    const type = (args.type as string) || 'json';

    if (!featureId || !name || !content) {
      throw new Error('feature_id, name, and content are required');
    }

    const workspacePath = join(this.workspacesDir, featureId);

    if (!existsSync(workspacePath)) {
      throw new Error(`Workspace not found: ${featureId}`);
    }

    const artifactPath = join(workspacePath, name);

    // Validate JSON if type is json
    if (type === 'json') {
      try {
        JSON.parse(content);
      } catch {
        throw new Error('Invalid JSON content');
      }
    }

    writeFileSync(artifactPath, content);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            feature_id: featureId,
            artifact: name,
            path: artifactPath,
            size: content.length,
          }),
        },
      ],
    };
  }

  private async getArtifact(args: Record<string, unknown>) {
    const featureId = args.feature_id as string;
    const name = args.name as string;

    if (!featureId || !name) {
      throw new Error('feature_id and name are required');
    }

    const artifactPath = join(this.workspacesDir, featureId, name);

    if (!existsSync(artifactPath)) {
      throw new Error(`Artifact not found: ${name}`);
    }

    const content = readFileSync(artifactPath, 'utf-8');
    const stat = statSync(artifactPath);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              feature_id: featureId,
              name,
              path: artifactPath,
              content,
              size: stat.size,
              modified_at: stat.mtime.toISOString(),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async listArtifacts(args: Record<string, unknown>) {
    const featureId = args.feature_id as string;

    if (!featureId) {
      throw new Error('feature_id is required');
    }

    const workspacePath = join(this.workspacesDir, featureId);

    if (!existsSync(workspacePath)) {
      throw new Error(`Workspace not found: ${featureId}`);
    }

    const files = readdirSync(workspacePath);
    const artifacts: Artifact[] = files
      .filter((f) => !f.startsWith('.'))
      .map((f) => {
        const filePath = join(workspacePath, f);
        const stat = statSync(filePath);
        let type: 'json' | 'markdown' | 'text' = 'text';
        if (f.endsWith('.json')) type = 'json';
        else if (f.endsWith('.md')) type = 'markdown';

        return {
          name: f,
          path: filePath,
          type,
          size: stat.size,
          modified_at: stat.mtime.toISOString(),
        };
      });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              feature_id: featureId,
              workspace_path: workspacePath,
              artifacts,
              total: artifacts.length,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  // Configuration
  private async getConfig(args: Record<string, unknown>) {
    const configPath =
      (args.config_path as string) || join(this.projectRoot, '.claude', 'feature-orchestrator.yml');

    if (!existsSync(configPath)) {
      // Return defaults
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                exists: false,
                config_path: configPath,
                defaults: {
                  tests: {
                    e2e: { runner: 'playwright', command: 'npx playwright test' },
                    unit: { runner: 'vitest', command: 'npm run test:unit' },
                  },
                  docs: {
                    paths: ['docs', 'specs', 'README.md'],
                  },
                  default_feature_env: {
                    base_url: 'http://localhost:3000',
                  },
                  behavior: {
                    max_iterations: 5,
                  },
                },
              },
              null,
              2
            ),
          },
        ],
      };
    }

    const content = readFileSync(configPath, 'utf-8');

    // Parse YAML (simple key-value extraction for now)
    // For full YAML support, would need yaml package
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              exists: true,
              config_path: configPath,
              raw_content: content,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async generateFeatureId(args: Record<string, unknown>) {
    const shortName = args.short_name as string;

    if (!shortName) {
      throw new Error('short_name is required');
    }

    // Sanitize short name
    const sanitized = shortName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Generate timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T]/g, '')
      .slice(0, 14);

    const featureId = `feat-${sanitized}-${timestamp}`;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            feature_id: featureId,
            short_name: sanitized,
            timestamp,
          }),
        },
      ],
    };
  }

  // Documentation Tools
  private async searchDocs(args: Record<string, unknown>) {
    const query = args.query as string;
    const paths = (args.paths as string[]) || ['docs', 'specs', 'README.md'];
    const maxResults = (args.max_results as number) || 20;

    if (!query) {
      throw new Error('query is required');
    }

    const results: Array<{
      path: string;
      matches: Array<{ line: number; text: string }>;
    }> = [];

    for (const searchPath of paths) {
      const fullPath = join(this.projectRoot, searchPath);

      if (!existsSync(fullPath)) continue;

      const stat = statSync(fullPath);
      const filesToSearch: string[] = [];

      if (stat.isFile()) {
        filesToSearch.push(fullPath);
      } else if (stat.isDirectory()) {
        const pattern = `${fullPath}/**/*.{md,txt,mdx}`;
        const files = await glob(pattern, { nodir: true });
        filesToSearch.push(...files);
      }

      for (const file of filesToSearch) {
        try {
          const content = readFileSync(file, 'utf-8');
          const lines = content.split('\n');
          const matches: Array<{ line: number; text: string }> = [];

          const queryLower = query.toLowerCase();
          lines.forEach((line, index) => {
            if (line.toLowerCase().includes(queryLower)) {
              matches.push({ line: index + 1, text: line.trim() });
            }
          });

          if (matches.length > 0) {
            results.push({
              path: file.replace(this.projectRoot + '/', ''),
              matches: matches.slice(0, 10),
            });
          }
        } catch {
          // Skip files that can't be read
        }
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              query,
              results: results.slice(0, maxResults),
              total_files: results.length,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async readDoc(args: Record<string, unknown>) {
    const docPath = args.path as string;

    if (!docPath) {
      throw new Error('path is required');
    }

    const fullPath = docPath.startsWith('/') ? docPath : join(this.projectRoot, docPath);

    if (!existsSync(fullPath)) {
      throw new Error(`Document not found: ${docPath}`);
    }

    const rawContent = readFileSync(fullPath, 'utf-8');
    let content = rawContent;
    let frontMatter: Record<string, unknown> | undefined;

    // Parse front matter for markdown
    if (fullPath.endsWith('.md') || fullPath.endsWith('.mdx')) {
      try {
        const parsed = matter(rawContent);
        content = parsed.content;
        frontMatter = parsed.data as Record<string, unknown>;
      } catch {
        // Ignore front matter parsing errors
      }
    }

    // Extract headings
    const headings: Array<{ level: number; text: string; line: number }> = [];
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        headings.push({
          level: match[1].length,
          text: match[2].trim(),
          line: index + 1,
        });
      }
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              path: docPath,
              content,
              frontMatter,
              headings,
              wordCount: content.split(/\s+/).filter(Boolean).length,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  // Report Generation
  private async generateReport(args: Record<string, unknown>) {
    const featureId = args.feature_id as string;

    if (!featureId) {
      throw new Error('feature_id is required');
    }

    const workspacePath = join(this.workspacesDir, featureId);

    if (!existsSync(workspacePath)) {
      throw new Error(`Workspace not found: ${featureId}`);
    }

    // Load state and artifacts
    const state = JSON.parse(
      readFileSync(join(workspacePath, 'state.json'), 'utf-8')
    ) as FeatureState;

    // Try to load various artifacts
    const loadArtifact = (name: string) => {
      const path = join(workspacePath, name);
      if (existsSync(path)) {
        return JSON.parse(readFileSync(path, 'utf-8'));
      }
      return null;
    };

    const spec = loadArtifact('spec.json');
    const checklist = loadArtifact('checklist.json');
    const plan = loadArtifact('plan.json');
    const testCoverage = loadArtifact('test-coverage.json');
    const playwrightResults = loadArtifact('playwright-results.json');

    // Generate report
    const report = `# Orchestrator Report: ${state.title || featureId}

## Feature Information

- **Feature ID**: ${featureId}
- **Status**: ${state.status}
- **Current Phase**: ${state.current_phase}
- **Implementation Scope**: ${state.scope.implementation_scope}
- **Iterations**: ${state.current_iteration}/${state.max_iterations}

## Phases Completed

${state.phases_completed.map((p) => `- [x] ${p}`).join('\n') || '- None yet'}

## Specification

${spec ? `- **Title**: ${spec.title}\n- **User Stories**: ${spec.user_stories?.length || 0}` : 'Not yet created'}

## Acceptance Criteria

${checklist ? `- **Total Criteria**: ${checklist.checklist?.length || 0}` : 'Not yet created'}

## Implementation Plan

${plan ? `- **Scope**: ${plan.implementation_scope}\n- **Backend Tasks**: ${plan.areas?.backend?.tasks?.length || 0}\n- **Frontend Tasks**: ${plan.areas?.frontend?.tasks?.length || 0}` : 'Not yet created'}

## Test Coverage

${testCoverage ? `- **Tests Written**: ${testCoverage.tests_written || 0}\n- **Coverage**: ${testCoverage.coverage_summary?.coverage_percentage || 0}%` : 'Not yet determined'}

## E2E Results

${playwrightResults ? `- **Total Tests**: ${playwrightResults.total_tests || 0}\n- **Passed**: ${playwrightResults.passed || 0}\n- **Failed**: ${playwrightResults.failed || 0}` : 'Not yet run'}

## Errors

${state.errors.length > 0 ? state.errors.map((e) => `- ${e}`).join('\n') : 'No errors'}

---
Generated: ${new Date().toISOString()}
`;

    // Save report
    const reportPath = join(workspacePath, 'orchestrator-report.md');
    writeFileSync(reportPath, report);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            feature_id: featureId,
            report_path: reportPath,
            report,
          }),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Feature Orchestrator MCP server running on stdio');
  }
}

const server = new FeatureOrchestratorServer();
server.run().catch(console.error);
