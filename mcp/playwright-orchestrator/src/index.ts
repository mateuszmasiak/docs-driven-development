#!/usr/bin/env node

/**
 * Playwright Orchestrator MCP Server
 *
 * Provides tools for running Playwright E2E tests with feature-based tagging,
 * result collection, and correlation with acceptance criteria.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface TestResult {
  testId: string;
  testName: string;
  file: string;
  line?: number;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut';
  duration: number;
  tags: string[];
  error?: {
    message: string;
    stack?: string;
    screenshot?: string;
    trace?: string;
  };
}

interface TestRunResult {
  runId: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
  results: TestResult[];
  artifacts: {
    htmlReport?: string;
    jsonReport?: string;
    screenshots: string[];
    traces: string[];
  };
}

class PlaywrightOrchestratorServer {
  private server: Server;
  private testRuns: Map<string, TestRunResult> = new Map();

  constructor() {
    this.server = new Server(
      {
        name: 'playwright-orchestrator',
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
      {
        name: 'run_feature_tests',
        description: 'Run Playwright tests for a specific feature using tag-based filtering',
        inputSchema: {
          type: 'object',
          properties: {
            featureId: {
              type: 'string',
              description: 'The feature ID to filter tests (e.g., feat-reset-2fa-20250104120000)',
            },
            baseURL: {
              type: 'string',
              description: 'Base URL for the application',
              default: 'http://localhost:3000',
            },
            browser: {
              type: 'string',
              enum: ['chromium', 'firefox', 'webkit', 'all'],
              description: 'Browser to run tests in',
              default: 'chromium',
            },
            headed: {
              type: 'boolean',
              description: 'Run in headed mode',
              default: false,
            },
            retries: {
              type: 'number',
              description: 'Number of retries for failed tests',
              default: 2,
            },
            workers: {
              type: 'number',
              description: 'Number of parallel workers',
              default: 4,
            },
            timeout: {
              type: 'number',
              description: 'Test timeout in milliseconds',
              default: 30000,
            },
          },
          required: ['featureId'],
        },
      },
      {
        name: 'run_ac_tests',
        description: 'Run Playwright tests for a specific acceptance criterion',
        inputSchema: {
          type: 'object',
          properties: {
            featureId: {
              type: 'string',
              description: 'The feature ID',
            },
            acId: {
              type: 'string',
              description: 'The acceptance criterion ID (e.g., AC1, AC2)',
            },
            baseURL: {
              type: 'string',
              description: 'Base URL for the application',
              default: 'http://localhost:3000',
            },
          },
          required: ['featureId', 'acId'],
        },
      },
      {
        name: 'get_test_report',
        description: 'Retrieve detailed test report for a previous test run',
        inputSchema: {
          type: 'object',
          properties: {
            runId: {
              type: 'string',
              description: 'The test run ID',
            },
          },
          required: ['runId'],
        },
      },
      {
        name: 'analyze_failure',
        description: 'Analyze a test failure and provide actionable feedback',
        inputSchema: {
          type: 'object',
          properties: {
            runId: {
              type: 'string',
              description: 'The test run ID',
            },
            testId: {
              type: 'string',
              description: 'The specific test ID to analyze',
            },
          },
          required: ['runId', 'testId'],
        },
      },
      {
        name: 'list_test_runs',
        description: 'List all test runs stored in memory',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  private async handleToolCall(name: string, args: Record<string, unknown>) {
    switch (name) {
      case 'run_feature_tests':
        return this.runFeatureTests(args);
      case 'run_ac_tests':
        return this.runACTests(args);
      case 'get_test_report':
        return this.getTestReport(args);
      case 'analyze_failure':
        return this.analyzeFailure(args);
      case 'list_test_runs':
        return this.listTestRuns();
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async runFeatureTests(args: Record<string, unknown>) {
    const {
      featureId,
      baseURL = 'http://localhost:3000',
      browser = 'chromium',
      headed = false,
      retries = 2,
      workers = 4,
      timeout = 30000,
    } = args;

    if (!featureId || typeof featureId !== 'string') {
      throw new Error('featureId is required and must be a string');
    }

    const runId = `run-${Date.now()}`;
    const grepPattern = `@${featureId}`;

    const result = await this.executePlaywrightTests({
      grep: grepPattern,
      baseURL: baseURL as string,
      browser: browser as string,
      headed: headed as boolean,
      retries: retries as number,
      workers: workers as number,
      timeout: timeout as number,
    });

    const testRunResult: TestRunResult = {
      runId,
      ...result,
    };

    this.testRuns.set(runId, testRunResult);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(testRunResult, null, 2),
        },
      ],
    };
  }

  private async runACTests(args: Record<string, unknown>) {
    const { featureId, acId, baseURL = 'http://localhost:3000' } = args;

    if (!featureId || typeof featureId !== 'string') {
      throw new Error('featureId is required and must be a string');
    }
    if (!acId || typeof acId !== 'string') {
      throw new Error('acId is required and must be a string');
    }

    const runId = `run-${Date.now()}`;
    const grepPattern = `@${featureId}.*@${acId}`;

    const result = await this.executePlaywrightTests({
      grep: grepPattern,
      baseURL: baseURL as string,
    });

    const testRunResult: TestRunResult = {
      runId,
      ...result,
    };

    this.testRuns.set(runId, testRunResult);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(testRunResult, null, 2),
        },
      ],
    };
  }

  private async getTestReport(args: Record<string, unknown>) {
    const { runId } = args;

    if (!runId || typeof runId !== 'string') {
      throw new Error('runId is required and must be a string');
    }

    const testRun = this.testRuns.get(runId);

    if (!testRun) {
      throw new Error(`Test run not found: ${runId}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(testRun, null, 2),
        },
      ],
    };
  }

  private async analyzeFailure(args: Record<string, unknown>) {
    const { runId, testId } = args;

    if (!runId || typeof runId !== 'string') {
      throw new Error('runId is required and must be a string');
    }
    if (!testId || typeof testId !== 'string') {
      throw new Error('testId is required and must be a string');
    }

    const testRun = this.testRuns.get(runId);
    if (!testRun) {
      throw new Error(`Test run not found: ${runId}`);
    }

    const test = testRun.results.find((t) => t.testId === testId);
    if (!test) {
      throw new Error(`Test not found: ${testId}`);
    }

    if (test.status !== 'failed') {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              message: 'Test did not fail, no analysis needed',
              test,
            }),
          },
        ],
      };
    }

    // Simple failure analysis
    const analysis = {
      testId: test.testId,
      testName: test.testName,
      file: test.file,
      error: test.error,
      category: this.categorizeFailure(test.error?.message || ''),
      suggestedFix: this.suggestFix(test.error?.message || ''),
      evidence: {
        screenshot: test.error?.screenshot,
        trace: test.error?.trace,
      },
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(analysis, null, 2),
        },
      ],
    };
  }

  private categorizeFailure(errorMessage: string): string {
    if (errorMessage.includes('Timeout') || errorMessage.includes('waiting for selector')) {
      return 'frontend';
    }
    if (errorMessage.includes('API') || errorMessage.includes('fetch') || errorMessage.includes('network')) {
      return 'backend';
    }
    if (errorMessage.includes('expect')) {
      return 'assertion';
    }
    return 'unknown';
  }

  private suggestFix(errorMessage: string): string {
    if (errorMessage.includes('Timeout waiting for selector')) {
      return 'Element not found. Check if the component is rendering correctly and the selector is accurate.';
    }
    if (errorMessage.includes('API')) {
      return 'API call failed. Check if the backend endpoint is working and returns expected data.';
    }
    if (errorMessage.includes('expect')) {
      return 'Assertion failed. Check if the actual behavior matches expected behavior.';
    }
    return 'Unknown error. Review error message and stack trace for details.';
  }

  private async listTestRuns() {
    const runs = Array.from(this.testRuns.entries()).map(([runId, run]) => ({
      runId,
      summary: run.summary,
      artifactsPath: run.artifacts,
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(runs, null, 2),
        },
      ],
    };
  }

  private async executePlaywrightTests(options: {
    grep: string;
    baseURL: string;
    browser?: string;
    headed?: boolean;
    retries?: number;
    workers?: number;
    timeout?: number;
  }): Promise<Omit<TestRunResult, 'runId'>> {
    const {
      grep,
      baseURL,
      browser = 'chromium',
      headed = false,
      retries = 2,
      workers = 4,
      timeout = 30000,
    } = options;

    // Build Playwright command
    const args = [
      'playwright',
      'test',
      '--grep',
      grep,
      '--reporter=json',
      '--project',
      browser,
      '--retries',
      retries.toString(),
      '--workers',
      workers.toString(),
      '--timeout',
      timeout.toString(),
    ];

    if (!headed) {
      args.push('--headed=false');
    }

    // Set environment variables
    const env = {
      ...process.env,
      BASE_URL: baseURL,
    };

    return new Promise((resolve, reject) => {
      const proc = spawn('npx', args, {
        env,
        cwd: process.cwd(),
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        try {
          // Parse Playwright JSON output
          const results = this.parsePlaywrightOutput(stdout);
          resolve(results);
        } catch (error) {
          reject(new Error(`Failed to parse test results: ${error}\n\nStderr: ${stderr}`));
        }
      });

      proc.on('error', (error) => {
        reject(new Error(`Failed to execute Playwright: ${error.message}`));
      });
    });
  }

  private parsePlaywrightOutput(output: string): Omit<TestRunResult, 'runId'> {
    // This is a simplified parser. In production, you'd use Playwright's JSON reporter output
    // For now, return a mock structure that matches the expected format

    // Try to find JSON in output
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Return empty result if no tests found
      return {
        summary: {
          total: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
          duration: 0,
        },
        results: [],
        artifacts: {
          screenshots: [],
          traces: [],
        },
      };
    }

    try {
      const data = JSON.parse(jsonMatch[0]);

      // Transform Playwright JSON to our format
      const results: TestResult[] = (data.suites || []).flatMap((suite: any) =>
        (suite.specs || []).map((spec: any) => ({
          testId: spec.id || `test-${Date.now()}-${Math.random()}`,
          testName: spec.title || 'Untitled test',
          file: spec.file || 'unknown',
          line: spec.line,
          status: spec.ok ? 'passed' : 'failed',
          duration: spec.duration || 0,
          tags: this.extractTags(spec.title || ''),
          error: spec.error
            ? {
                message: spec.error.message || 'Unknown error',
                stack: spec.error.stack,
              }
            : undefined,
        }))
      );

      const summary = {
        total: results.length,
        passed: results.filter((r) => r.status === 'passed').length,
        failed: results.filter((r) => r.status === 'failed').length,
        skipped: results.filter((r) => r.status === 'skipped').length,
        duration: results.reduce((sum, r) => sum + r.duration, 0),
      };

      return {
        summary,
        results,
        artifacts: {
          screenshots: [],
          traces: [],
        },
      };
    } catch (error) {
      throw new Error(`Failed to parse JSON output: ${error}`);
    }
  }

  private extractTags(testName: string): string[] {
    const tagPattern = /@[\w-]+/g;
    return testName.match(tagPattern) || [];
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Playwright Orchestrator MCP server running on stdio');
  }
}

const server = new PlaywrightOrchestratorServer();
server.run().catch(console.error);
