# Docs MCP Server (Stub)

This is a **stub implementation** for a documentation reading MCP server. It's provided as a starting point for future development.

## Current Status

**NOT IMPLEMENTED**. This directory contains only documentation and a skeleton structure.

## Why a Stub?

The Feature Orchestrator plugin can work without a dedicated docs MCP server by:
1. Using the **document-skills** plugin (if installed in Claude Code)
2. Using direct file reading via Claude Code's built-in Read/Grep tools
3. Implementing a custom docs MCP later if needed

## When to Implement This

Consider implementing this MCP server when:
- You have complex documentation sources (Confluence, Notion, proprietary formats)
- You need semantic search across large documentation sets
- You want caching and indexing for faster doc lookups
- document-skills doesn't meet your needs

## Proposed Architecture

If implementing this MCP server, it should provide:

### Tools

1. **search_docs**
   - Search documentation by keywords
   - Support multiple file formats (Markdown, PDF, Word, etc.)
   - Return ranked results with excerpts

2. **read_doc**
   - Read full content of a documentation file
   - Parse structure (headings, sections)
   - Extract metadata (author, date, tags)

3. **extract_requirements**
   - AI-powered extraction of requirements from docs
   - Map to acceptance criteria format
   - Identify gaps and conflicts

4. **find_similar_features**
   - Search for similar feature documentation
   - Extract implementation patterns
   - Suggest code references

5. **validate_against_guidelines**
   - Check specs against documented guidelines
   - Identify violations or missing requirements
   - Suggest additions

### Data Sources

Support for:
- Local Markdown files (`/docs`, `/specs`)
- PDF documents
- Confluence (via API)
- Notion (via API)
- GitHub wikis
- Custom documentation systems

### Features

- **Semantic search**: Use embeddings for better search
- **Caching**: Cache frequently accessed docs
- **Indexing**: Build search index on startup
- **Incremental updates**: Watch for doc changes
- **Access control**: Respect document permissions

## Alternative: Using document-skills Plugin

Instead of building this MCP server, you can use the existing **document-skills** plugin from the Claude Code marketplace:

1. Install document-skills: `/install document-skills`
2. Configure it to read your docs directory
3. The docs-reader Skill will automatically use it

This is the **recommended approach** unless you have specialized needs.

## Fallback: Direct File Access

The docs-reader Skill includes fallback logic to use Claude Code's built-in tools:

```typescript
// Pseudo-code for fallback
if (docsMCPAvailable()) {
  result = await docsMCP.searchDocs(query);
} else if (documentSkillsAvailable()) {
  result = await documentSkills.search(query);
} else {
  // Fallback to direct file access
  files = await glob('docs/**/*.md');
  result = await grep(query, files);
}
```

This ensures the Feature Orchestrator works even without a dedicated docs MCP.

## Implementation Guide

If you decide to implement this MCP server, follow these steps:

### 1. Set Up Project

```bash
cd mcp/docs
npm init -y
npm install @modelcontextprotocol/sdk
npm install -D typescript @types/node
```

### 2. Create TypeScript Config

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "outDir": "./dist",
    "strict": true
  }
}
```

### 3. Implement MCP Server

```typescript
// src/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

class DocsServer {
  // Implement tools...
}

const server = new DocsServer();
server.run();
```

### 4. Implement Tools

For each tool (search_docs, read_doc, etc.), implement:
- Input schema validation
- Core logic (file reading, searching, parsing)
- Error handling
- Response formatting

### 5. Add Document Parsers

Support various formats:
- Markdown: Use `marked` or `remark`
- PDF: Use `pdf-parse`
- Word: Use `mammoth`
- HTML: Use `cheerio`

### 6. Add Search Capabilities

Options:
- Simple: Use regex or string matching
- Advanced: Use `lunr.js` for full-text search
- Semantic: Use OpenAI embeddings or similar

### 7. Test Thoroughly

Create test cases for:
- Different document formats
- Edge cases (missing files, malformed docs)
- Large documentation sets (performance)

### 8. Update .mcp.json

Enable the server in the plugin config:
```json
{
  "mcpServers": {
    "docs-reader": {
      "command": "node",
      "args": ["../../mcp/docs/dist/index.js"],
      "enabled": true
    }
  }
}
```

## Example Implementation

See `mcp/playwright-orchestrator` for a reference MCP server implementation. The docs MCP would follow a similar structure.

## Dependencies

Recommended packages:
- `@modelcontextprotocol/sdk` - MCP SDK
- `marked` or `remark` - Markdown parsing
- `pdf-parse` - PDF parsing
- `mammoth` - Word document parsing
- `cheerio` - HTML parsing
- `lunr` - Full-text search
- `gray-matter` - Front matter parsing

## Configuration

Allow users to configure via `.claude/feature-orchestrator.yml`:

```yaml
docs:
  mcp:
    enabled: true
    paths:
      - /docs
      - /specs
      - /design
    formats:
      - md
      - pdf
      - docx
    search:
      type: semantic  # or "text"
      indexOnStartup: true
    cache:
      enabled: true
      ttlMinutes: 60
```

## Contributing

If you implement this MCP server:
1. Follow the structure of `mcp/playwright-orchestrator`
2. Add comprehensive tests
3. Document all tools and their parameters
4. Update this README with implementation details

## License

MIT

---

**Note**: This is a stub. The Feature Orchestrator plugin works without this MCP server by using alternative methods. Implement it only if you have specialized documentation needs.
