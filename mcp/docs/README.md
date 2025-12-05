# Docs Reader MCP Server

An MCP server for reading and searching project documentation to support the feature orchestrator's docs-auditor agent.

## Status

**IMPLEMENTED** - This MCP server is fully functional.

## Features

The docs-reader MCP server provides the following tools:

### Tools

1. **list_docs**
   - List all documentation files in the project
   - Supports configurable paths and file types
   - Returns file metadata (path, size, modified date)

2. **read_doc**
   - Read the full content of a documentation file
   - Parses YAML front matter (for Markdown files)
   - Extracts heading structure
   - Returns word count

3. **search_docs**
   - Search documentation files for keywords or patterns
   - Case-sensitive or case-insensitive search
   - Returns matching lines with context
   - Ranked by relevance score

4. **extract_requirements**
   - AI-powered extraction of requirements from documentation
   - Identifies MUST, SHOULD, COULD, and guideline requirements
   - Categorizes by topic (security, accessibility, api, etc.)
   - Returns structured requirement objects

5. **get_doc_structure**
   - Get the heading structure/outline of a documentation file
   - Builds nested tree from flat headings
   - Useful for understanding document organization

6. **find_related_docs**
   - Find documentation files related to a topic or feature
   - Combines multiple keyword searches
   - Ranks by relevance based on match count

## Installation

```bash
cd mcp/docs
npm install
npm run build
```

## Usage

The server is configured in the plugin's `.mcp.json` file:

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

## Configuration

The server uses sensible defaults but can be configured:

### Default Documentation Paths
- `docs/`
- `specs/`
- `design/`
- `architecture/`
- `README.md`

### Supported File Types
- `.md` (Markdown)
- `.mdx` (MDX)
- `.txt` (Plain text)

### Caching
- Documentation content is cached for 1 hour
- Cache improves performance for repeated reads

## Tool Examples

### list_docs

```json
{
  "name": "list_docs",
  "arguments": {
    "paths": ["docs", "specs"],
    "fileTypes": ["md", "txt"]
  }
}
```

### read_doc

```json
{
  "name": "read_doc",
  "arguments": {
    "path": "docs/api-guidelines.md",
    "parseHeadings": true,
    "parseFrontMatter": true
  }
}
```

### search_docs

```json
{
  "name": "search_docs",
  "arguments": {
    "query": "authentication",
    "paths": ["docs"],
    "caseSensitive": false,
    "maxResults": 20,
    "contextLines": 2
  }
}
```

### extract_requirements

```json
{
  "name": "extract_requirements",
  "arguments": {
    "paths": ["docs/security-guidelines.md"],
    "categories": ["security", "authentication"]
  }
}
```

### get_doc_structure

```json
{
  "name": "get_doc_structure",
  "arguments": {
    "path": "docs/architecture.md"
  }
}
```

### find_related_docs

```json
{
  "name": "find_related_docs",
  "arguments": {
    "topic": "user authentication",
    "keywords": ["login", "session", "jwt"],
    "maxResults": 10
  }
}
```

## Integration with Feature Orchestrator

The docs-reader MCP server is used by the **docs-auditor agent** to:

1. Search project documentation for relevant requirements
2. Extract acceptance criteria from guideline documents
3. Enrich feature specifications with compliance requirements
4. Validate features against documented standards

### Workflow

1. User provides documentation paths in feature request
2. docs-auditor agent uses `search_docs` to find relevant documents
3. Uses `extract_requirements` to identify MUST/SHOULD requirements
4. Builds comprehensive `checklist.json` with acceptance criteria

## Development

### Build

```bash
npm run build
```

### Watch Mode

```bash
npm run dev
```

### Testing

```bash
npm test
```

## Dependencies

- `@modelcontextprotocol/sdk` - MCP SDK for server implementation
- `gray-matter` - YAML front matter parsing
- `glob` - File pattern matching

## License

MIT
