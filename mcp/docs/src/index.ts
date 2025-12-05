#!/usr/bin/env node

/**
 * Docs Reader MCP Server
 *
 * Provides tools for reading and searching project documentation
 * to support the feature orchestrator's docs-auditor agent.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, dirname, basename, extname, relative } from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface DocFile {
  path: string;
  relativePath: string;
  name: string;
  extension: string;
  size: number;
  modifiedAt: Date;
}

interface DocContent {
  path: string;
  content: string;
  frontMatter?: Record<string, unknown>;
  headings: Array<{ level: number; text: string; line: number }>;
  wordCount: number;
}

interface SearchResult {
  path: string;
  relativePath: string;
  matches: Array<{
    line: number;
    text: string;
    context: string;
  }>;
  score: number;
}

interface ExtractedRequirement {
  id: string;
  text: string;
  source: string;
  line: number;
  type: 'must' | 'should' | 'could' | 'guideline';
  category?: string;
}

class DocsReaderServer {
  private server: Server;
  private projectRoot: string;
  private docsPaths: string[];
  private fileTypes: string[];
  private cache: Map<string, { content: DocContent; timestamp: number }> = new Map();
  private cacheTTL = 60 * 60 * 1000; // 1 hour

  constructor() {
    this.projectRoot = process.cwd();
    this.docsPaths = ['docs', 'specs', 'design', 'architecture', 'README.md'];
    this.fileTypes = ['md', 'txt', 'mdx'];

    this.server = new Server(
      {
        name: 'docs-reader',
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
        name: 'list_docs',
        description: 'List all documentation files in the project',
        inputSchema: {
          type: 'object',
          properties: {
            paths: {
              type: 'array',
              items: { type: 'string' },
              description: 'Paths to search for documentation (relative to project root)',
            },
            fileTypes: {
              type: 'array',
              items: { type: 'string' },
              description: 'File extensions to include (e.g., ["md", "txt"])',
            },
          },
        },
      },
      {
        name: 'read_doc',
        description: 'Read the full content of a documentation file with parsed structure',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the documentation file (relative or absolute)',
            },
            parseHeadings: {
              type: 'boolean',
              description: 'Parse and return heading structure',
              default: true,
            },
            parseFrontMatter: {
              type: 'boolean',
              description: 'Parse YAML front matter if present',
              default: true,
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'search_docs',
        description: 'Search documentation files for specific keywords or patterns',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query (supports simple text or regex pattern)',
            },
            paths: {
              type: 'array',
              items: { type: 'string' },
              description: 'Paths to search in (relative to project root)',
            },
            caseSensitive: {
              type: 'boolean',
              description: 'Whether search is case-sensitive',
              default: false,
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of results to return',
              default: 20,
            },
            contextLines: {
              type: 'number',
              description: 'Number of context lines around each match',
              default: 2,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'extract_requirements',
        description: 'Extract requirements and guidelines from documentation files',
        inputSchema: {
          type: 'object',
          properties: {
            paths: {
              type: 'array',
              items: { type: 'string' },
              description: 'Paths to documentation files to analyze',
            },
            categories: {
              type: 'array',
              items: { type: 'string' },
              description: 'Categories to look for (e.g., ["security", "accessibility", "api"])',
            },
          },
        },
      },
      {
        name: 'get_doc_structure',
        description: 'Get the heading structure/outline of a documentation file',
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
      {
        name: 'find_related_docs',
        description: 'Find documentation files related to a topic or feature',
        inputSchema: {
          type: 'object',
          properties: {
            topic: {
              type: 'string',
              description: 'Topic or feature to find related documentation for',
            },
            keywords: {
              type: 'array',
              items: { type: 'string' },
              description: 'Additional keywords to search for',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of related documents to return',
              default: 10,
            },
          },
          required: ['topic'],
        },
      },
    ];
  }

  private async handleToolCall(name: string, args: Record<string, unknown>) {
    try {
      switch (name) {
        case 'list_docs':
          return this.listDocs(args);
        case 'read_doc':
          return this.readDoc(args);
        case 'search_docs':
          return this.searchDocs(args);
        case 'extract_requirements':
          return this.extractRequirements(args);
        case 'get_doc_structure':
          return this.getDocStructure(args);
        case 'find_related_docs':
          return this.findRelatedDocs(args);
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

  private async listDocs(args: Record<string, unknown>) {
    const paths = (args.paths as string[]) || this.docsPaths;
    const fileTypes = (args.fileTypes as string[]) || this.fileTypes;

    const docs: DocFile[] = [];

    for (const docPath of paths) {
      const fullPath = join(this.projectRoot, docPath);

      if (!existsSync(fullPath)) {
        continue;
      }

      const stat = statSync(fullPath);

      if (stat.isFile()) {
        // Single file
        docs.push({
          path: fullPath,
          relativePath: docPath,
          name: basename(fullPath),
          extension: extname(fullPath).slice(1),
          size: stat.size,
          modifiedAt: stat.mtime,
        });
      } else if (stat.isDirectory()) {
        // Directory - glob for files
        const pattern = `${fullPath}/**/*.{${fileTypes.join(',')}}`;
        const files = await glob(pattern, { nodir: true });

        for (const file of files) {
          const fileStat = statSync(file);
          docs.push({
            path: file,
            relativePath: relative(this.projectRoot, file),
            name: basename(file),
            extension: extname(file).slice(1),
            size: fileStat.size,
            modifiedAt: fileStat.mtime,
          });
        }
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              projectRoot: this.projectRoot,
              totalDocs: docs.length,
              docs: docs.map((d) => ({
                ...d,
                modifiedAt: d.modifiedAt.toISOString(),
              })),
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
    const parseHeadings = args.parseHeadings !== false;
    const parseFrontMatter = args.parseFrontMatter !== false;

    if (!docPath) {
      throw new Error('path is required');
    }

    // Resolve path
    const fullPath = docPath.startsWith('/') ? docPath : join(this.projectRoot, docPath);

    if (!existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`);
    }

    // Check cache
    const cached = this.cache.get(fullPath);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(cached.content, null, 2),
          },
        ],
      };
    }

    const rawContent = readFileSync(fullPath, 'utf-8');
    let content = rawContent;
    let frontMatter: Record<string, unknown> | undefined;

    // Parse front matter if markdown
    if (parseFrontMatter && (fullPath.endsWith('.md') || fullPath.endsWith('.mdx'))) {
      try {
        const parsed = matter(rawContent);
        content = parsed.content;
        frontMatter = parsed.data as Record<string, unknown>;
      } catch {
        // Ignore front matter parsing errors
      }
    }

    // Parse headings
    const headings: Array<{ level: number; text: string; line: number }> = [];
    if (parseHeadings) {
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
    }

    const docContent: DocContent = {
      path: fullPath,
      content,
      frontMatter,
      headings,
      wordCount: content.split(/\s+/).filter(Boolean).length,
    };

    // Update cache
    this.cache.set(fullPath, { content: docContent, timestamp: Date.now() });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(docContent, null, 2),
        },
      ],
    };
  }

  private async searchDocs(args: Record<string, unknown>) {
    const query = args.query as string;
    const paths = (args.paths as string[]) || this.docsPaths;
    const caseSensitive = args.caseSensitive as boolean || false;
    const maxResults = (args.maxResults as number) || 20;
    const contextLines = (args.contextLines as number) || 2;

    if (!query) {
      throw new Error('query is required');
    }

    // Get all docs
    const docsResult = await this.listDocs({ paths });
    const docsData = JSON.parse(
      (docsResult.content[0] as { type: string; text: string }).text
    );
    const docs = docsData.docs as DocFile[];

    const results: SearchResult[] = [];
    const searchPattern = caseSensitive ? query : query.toLowerCase();

    for (const doc of docs) {
      try {
        const content = readFileSync(doc.path, 'utf-8');
        const lines = content.split('\n');
        const matches: SearchResult['matches'] = [];

        lines.forEach((line, index) => {
          const searchLine = caseSensitive ? line : line.toLowerCase();
          if (searchLine.includes(searchPattern)) {
            // Get context
            const startLine = Math.max(0, index - contextLines);
            const endLine = Math.min(lines.length - 1, index + contextLines);
            const context = lines.slice(startLine, endLine + 1).join('\n');

            matches.push({
              line: index + 1,
              text: line,
              context,
            });
          }
        });

        if (matches.length > 0) {
          results.push({
            path: doc.path,
            relativePath: doc.relativePath,
            matches,
            score: matches.length,
          });
        }
      } catch {
        // Skip files that can't be read
      }
    }

    // Sort by score and limit results
    results.sort((a, b) => b.score - a.score);
    const limitedResults = results.slice(0, maxResults);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              query,
              totalMatches: results.reduce((sum, r) => sum + r.matches.length, 0),
              filesWithMatches: results.length,
              results: limitedResults,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async extractRequirements(args: Record<string, unknown>) {
    const paths = (args.paths as string[]) || this.docsPaths;
    const categories = (args.categories as string[]) || [
      'security',
      'accessibility',
      'api',
      'ui',
      'testing',
      'performance',
    ];

    // Get all docs
    const docsResult = await this.listDocs({ paths });
    const docsData = JSON.parse(
      (docsResult.content[0] as { type: string; text: string }).text
    );
    const docs = docsData.docs as DocFile[];

    const requirements: ExtractedRequirement[] = [];
    let reqId = 1;

    // Patterns to identify requirements
    const mustPatterns = [
      /\bmust\b/i,
      /\brequired\b/i,
      /\bshall\b/i,
      /\bneed to\b/i,
      /\bhas to\b/i,
    ];
    const shouldPatterns = [
      /\bshould\b/i,
      /\brecommended\b/i,
      /\bprefer\b/i,
    ];
    const couldPatterns = [
      /\bcould\b/i,
      /\bmay\b/i,
      /\boptional\b/i,
      /\bnice to have\b/i,
    ];

    for (const doc of docs) {
      try {
        const content = readFileSync(doc.path, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          // Skip empty lines and headings
          if (!line.trim() || line.startsWith('#')) {
            return;
          }

          // Determine requirement type
          let type: ExtractedRequirement['type'] = 'guideline';
          if (mustPatterns.some((p) => p.test(line))) {
            type = 'must';
          } else if (shouldPatterns.some((p) => p.test(line))) {
            type = 'should';
          } else if (couldPatterns.some((p) => p.test(line))) {
            type = 'could';
          } else {
            // Only include if it looks like a requirement or bullet point
            if (!line.trim().startsWith('-') && !line.trim().startsWith('*') && !line.trim().startsWith('•')) {
              return;
            }
          }

          // Determine category from file path or content
          let category: string | undefined;
          const lowerLine = line.toLowerCase();
          const lowerPath = doc.path.toLowerCase();

          for (const cat of categories) {
            if (lowerPath.includes(cat) || lowerLine.includes(cat)) {
              category = cat;
              break;
            }
          }

          // Clean up the requirement text
          let text = line.trim();
          // Remove bullet points
          text = text.replace(/^[-*•]\s*/, '');
          // Remove checkbox markers
          text = text.replace(/^\[[ x]\]\s*/i, '');

          if (text.length > 10) {
            // Only include non-trivial text
            requirements.push({
              id: `REQ${reqId++}`,
              text,
              source: doc.relativePath,
              line: index + 1,
              type,
              category,
            });
          }
        });
      } catch {
        // Skip files that can't be read
      }
    }

    // Group by type
    const grouped = {
      must: requirements.filter((r) => r.type === 'must'),
      should: requirements.filter((r) => r.type === 'should'),
      could: requirements.filter((r) => r.type === 'could'),
      guideline: requirements.filter((r) => r.type === 'guideline'),
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              totalRequirements: requirements.length,
              byType: {
                must: grouped.must.length,
                should: grouped.should.length,
                could: grouped.could.length,
                guideline: grouped.guideline.length,
              },
              requirements: grouped,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async getDocStructure(args: Record<string, unknown>) {
    const docPath = args.path as string;

    if (!docPath) {
      throw new Error('path is required');
    }

    const docResult = await this.readDoc({
      path: docPath,
      parseHeadings: true,
      parseFrontMatter: true,
    });

    const docData = JSON.parse(
      (docResult.content[0] as { type: string; text: string }).text
    );

    // Build nested structure from flat headings
    interface HeadingNode {
      level: number;
      text: string;
      line: number;
      children: HeadingNode[];
    }

    const buildTree = (headings: Array<{ level: number; text: string; line: number }>) => {
      const root: HeadingNode[] = [];
      const stack: HeadingNode[] = [];

      for (const heading of headings) {
        const node: HeadingNode = { ...heading, children: [] };

        // Pop from stack until we find a parent with lower level
        while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
          stack.pop();
        }

        if (stack.length === 0) {
          root.push(node);
        } else {
          stack[stack.length - 1].children.push(node);
        }

        stack.push(node);
      }

      return root;
    };

    const structure = buildTree(docData.headings || []);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              path: docData.path,
              frontMatter: docData.frontMatter,
              wordCount: docData.wordCount,
              structure,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async findRelatedDocs(args: Record<string, unknown>) {
    const topic = args.topic as string;
    const keywords = (args.keywords as string[]) || [];
    const maxResults = (args.maxResults as number) || 10;

    if (!topic) {
      throw new Error('topic is required');
    }

    // Combine topic and keywords for search
    const searchTerms = [topic, ...keywords];

    // Search for each term and combine results
    const allResults: Map<string, { path: string; relativePath: string; score: number; matchedTerms: string[] }> =
      new Map();

    for (const term of searchTerms) {
      const searchResult = await this.searchDocs({
        query: term,
        maxResults: 50,
      });

      const searchData = JSON.parse(
        (searchResult.content[0] as { type: string; text: string }).text
      );

      for (const result of searchData.results) {
        const existing = allResults.get(result.path);
        if (existing) {
          existing.score += result.score;
          existing.matchedTerms.push(term);
        } else {
          allResults.set(result.path, {
            path: result.path,
            relativePath: result.relativePath,
            score: result.score,
            matchedTerms: [term],
          });
        }
      }
    }

    // Sort by score and limit
    const sorted = Array.from(allResults.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              topic,
              keywords,
              relatedDocs: sorted.map((doc) => ({
                ...doc,
                relevance: doc.matchedTerms.length / searchTerms.length,
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Docs Reader MCP server running on stdio');
  }
}

const server = new DocsReaderServer();
server.run().catch(console.error);
