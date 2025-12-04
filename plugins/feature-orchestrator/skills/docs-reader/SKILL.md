# Docs Reader Skill

This Skill provides high-level operations for reading and searching project documentation to enrich feature specifications and acceptance criteria.

## Purpose

Enable agents to:
- Search documentation by keywords
- Read specific documentation files
- Extract relevant requirements from docs
- Correlate documentation with feature specs

## Dependencies

This Skill can work with:
- **Docs MCP Server** (optional): `docs` (configured in `.mcp.json`)
- **document-skills plugin** (optional): If installed in Claude Code
- **File system**: Direct file reading as fallback

## Operations

### 1. searchDocs

Search documentation by keywords and return relevant sections.

**Usage**:
```typescript
const results = await docsReader.searchDocs({
  query: "2FA authentication security",
  paths: ["/docs", "/specs"],
  fileTypes: ["md", "txt"],
  maxResults: 10
});
```

**Parameters**:
- `query` (required): Search keywords or phrase
- `paths` (optional): Directories to search (default: `["/docs", "/specs"]`)
- `fileTypes` (optional): File extensions to include (default: `["md", "txt", "pdf"]`)
- `maxResults` (optional): Maximum number of results (default: 10)

**Returns**:
```typescript
{
  query: "2FA authentication security",
  totalResults: 5,
  results: [
    {
      file: "/docs/security-guidelines.md",
      title: "Security Guidelines",
      section: "Account Security Changes",
      relevanceScore: 0.92,
      excerpt: "All security-impacting changes must trigger email notification...",
      matchedKeywords: ["2FA", "authentication", "security"],
      context: {
        before: "...",
        match: "All security-impacting changes must trigger email notification...",
        after: "..."
      }
    }
  ]
}
```

**Implementation**:
1. If docs MCP server available: Use MCP `search_docs` tool
2. Else if document-skills installed: Use document-skills search
3. Else: Use grep/ripgrep to search files directly

### 2. readDoc

Read the full content of a specific documentation file.

**Usage**:
```typescript
const content = await docsReader.readDoc({
  path: "/docs/security-guidelines.md",
  format: "markdown"  // "markdown" | "text" | "structured"
});
```

**Parameters**:
- `path` (required): Path to the documentation file
- `format` (optional): Output format (default: "markdown")

**Returns**:
```typescript
{
  path: "/docs/security-guidelines.md",
  title: "Security Guidelines",
  content: "# Security Guidelines\n\n## Account Security...",
  metadata: {
    lastModified: "2024-12-15T10:30:00Z",
    author: "Security Team",
    tags: ["security", "compliance", "guidelines"]
  },
  structure: {  // if format: "structured"
    sections: [
      {
        heading: "Account Security Changes",
        level: 2,
        content: "All security-impacting changes...",
        subsections: [...]
      }
    ]
  }
}
```

**Implementation**:
1. If docs MCP available: Use MCP `read_doc` tool
2. Else if document-skills available: Use document-skills reader
3. Else: Read file directly using Read tool

### 3. extractRequirements

Extract requirements from documentation relevant to a feature.

**Usage**:
```typescript
const requirements = await docsReader.extractRequirements({
  featureId: "feat-reset-2fa-20250104120000",
  spec: specJson,
  searchPaths: ["/docs", "/specs"],
  requirementTypes: ["security", "compliance", "api", "ui"]
});
```

**Parameters**:
- `featureId` (required): The feature ID
- `spec` (required): The spec.json content
- `searchPaths` (optional): Paths to search for docs
- `requirementTypes` (optional): Types of requirements to look for

**Returns**:
```typescript
{
  featureId: "feat-reset-2fa-20250104120000",
  extractedRequirements: [
    {
      id: "REQ1",
      type: "security",
      source: "/docs/security-guidelines.md",
      section: "Account Security Changes",
      text: "All security-impacting changes must trigger email notification",
      priority: "P0",
      rationale: "Matches feature requirement for 2FA reset (security-impacting)",
      suggestedAC: {
        text: "User receives email notification after 2FA reset",
        verificationHint: "integration",
        implementationArea: "backend"
      }
    },
    {
      id: "REQ2",
      type: "compliance",
      source: "/docs/compliance.md",
      section: "Audit Requirements",
      text: "All authentication changes must be logged for compliance",
      priority: "P0",
      rationale: "2FA reset is an authentication change requiring audit trail",
      suggestedAC: {
        text: "2FA reset action is logged in audit trail with user ID and timestamp",
        verificationHint: "unit,integration",
        implementationArea: "backend"
      }
    }
  ],
  summary: {
    totalExtracted: 2,
    byType: {
      security: 1,
      compliance: 1,
      api: 0,
      ui: 0
    },
    byPriority: {
      P0: 2,
      P1: 0,
      P2: 0
    }
  },
  documentationGaps: [
    "No UI/UX guidelines found for confirmation dialogs",
    "No API versioning standards found"
  ]
}
```

**Implementation**:
This operation:
1. Analyzes the spec to understand feature scope
2. Generates search queries based on feature type
3. Searches documentation for relevant sections
4. Uses AI to extract specific requirements
5. Maps requirements to suggested acceptance criteria
6. Identifies documentation gaps

### 4. findSimilarFeatures

Find documentation of similar features in the project.

**Usage**:
```typescript
const similar = await docsReader.findSimilarFeatures({
  featureDescription: "Add ability to reset 2FA",
  searchPaths: ["/docs/features", "/specs"],
  maxResults: 5
});
```

**Parameters**:
- `featureDescription` (required): Description of the feature
- `searchPaths` (optional): Paths to search
- `maxResults` (optional): Maximum results (default: 5)

**Returns**:
```typescript
{
  query: "Add ability to reset 2FA",
  similarFeatures: [
    {
      title: "Password Reset Feature",
      path: "/docs/features/password-reset.md",
      similarityScore: 0.85,
      relevantSections: [
        {
          section: "User Flow",
          content: "User clicks reset button → confirmation dialog → password entry → success",
          applicability: "Same confirmation flow pattern can be reused"
        }
      ],
      implementationReference: {
        files: [
          "src/controllers/auth.controller.ts",
          "src/pages/settings/security.tsx"
        ],
        patterns: [
          "Confirmation dialog with password",
          "Email notification after change",
          "Audit logging"
        ]
      }
    }
  ]
}
```

**Implementation**:
1. Extract key terms from feature description
2. Search docs for related features
3. Rank by similarity
4. Extract patterns and implementation references

### 5. validateAgainstGuidelines

Validate a spec against documented guidelines (security, API, UI, etc.).

**Usage**:
```typescript
const validation = await docsReader.validateAgainstGuidelines({
  spec: specJson,
  guidelineTypes: ["security", "api", "ui", "accessibility"]
});
```

**Parameters**:
- `spec` (required): The spec.json content
- `guidelineTypes` (required): Types of guidelines to check against

**Returns**:
```typescript
{
  spec: "feat-reset-2fa-20250104120000",
  validationResults: [
    {
      guidelineType: "security",
      guidelinePath: "/docs/security-guidelines.md",
      status: "passed" | "failed" | "warning",
      checks: [
        {
          rule: "Authentication changes require password confirmation",
          status: "passed",
          evidence: "Spec AC3 requires password validation"
        },
        {
          rule: "Security changes must send email notification",
          status: "warning",
          evidence: "Spec does not mention email notification",
          suggestion: "Add AC for email notification"
        }
      ]
    },
    {
      guidelineType: "accessibility",
      guidelinePath: "/docs/ui-guidelines.md",
      status: "passed",
      checks: [
        {
          rule: "Dialogs must be keyboard accessible",
          status: "passed",
          evidence: "Spec mentions dialog component (follows standard)"
        }
      ]
    }
  ],
  summary: {
    totalChecks: 5,
    passed: 3,
    warnings: 2,
    failed: 0
  },
  recommendations: [
    "Add AC for email notification (security guideline)",
    "Specify WCAG level in non-functional requirements"
  ]
}
```

**Implementation**:
1. Read relevant guideline documents
2. Extract rules/requirements from guidelines
3. Check spec against each rule
4. Return validation results with suggestions

## Example Usage in Docs Auditor Agent

```typescript
// Phase 1: Search for relevant documentation
const searchResults = await docsReader.searchDocs({
  query: "2FA authentication security reset",
  paths: ["/docs", "/specs"]
});

// Phase 2: Read relevant documents in detail
const securityGuidelines = await docsReader.readDoc({
  path: "/docs/security-guidelines.md",
  format: "structured"
});

// Phase 3: Extract requirements from documentation
const extractedReqs = await docsReader.extractRequirements({
  featureId: featureId,
  spec: specJson,
  searchPaths: ["/docs", "/specs"]
});

// Phase 4: Find similar features for pattern reuse
const similarFeatures = await docsReader.findSimilarFeatures({
  featureDescription: specJson.description
});

// Phase 5: Validate spec against guidelines
const validation = await docsReader.validateAgainstGuidelines({
  spec: specJson,
  guidelineTypes: ["security", "api", "accessibility"]
});

// Phase 6: Merge spec ACs with doc-derived requirements
const enrichedChecklist = mergeSpecAndDocs({
  specACs: specJson.acceptance_criteria,
  docRequirements: extractedReqs.extractedRequirements,
  validationWarnings: validation.recommendations
});

// Phase 7: Save checklist.json
saveChecklist(enrichedChecklist);
```

## Configuration

This Skill reads configuration from:
1. `.claude/feature-orchestrator.yml` (project-specific docs paths)
2. Project structure (auto-detect `/docs`, `/documentation`, `/specs`)

**Example config**:
```yaml
docs:
  paths:
    - /docs
    - /specs
    - /design
  file_types:
    - md
    - txt
    - pdf
  guidelines:
    security: /docs/security-guidelines.md
    api: /docs/api-standards.md
    ui: /docs/ui-guidelines.md
    accessibility: /docs/accessibility.md
```

## Fallback Strategy

If no docs MCP or document-skills plugin is available:

1. **Direct file search**: Use Glob tool to find `.md`, `.txt` files
2. **Content search**: Use Grep tool to search file contents
3. **File reading**: Use Read tool to read files
4. **AI analysis**: Use Claude to extract requirements from raw text

This ensures the Skill works even without specialized doc tools.

## Common Documentation Patterns

The Skill recognizes common documentation structures:

**RFC/ADR format**:
```markdown
# RFC: Feature Name

## Status
Accepted

## Context
...

## Decision
...

## Consequences
...
```

**Requirements format**:
```markdown
# Requirements

## Functional Requirements
- REQ-001: System shall...
- REQ-002: User must be able to...

## Non-Functional Requirements
- NFR-001: Performance...
```

**API Documentation**:
```markdown
# API Endpoints

## POST /api/auth/reset-password
...

## POST /api/auth/reset-2fa
...
```

## Error Handling

- **No docs found**: Returns empty results, notes documentation gap
- **Inaccessible files**: Skips and continues with available docs
- **Malformed docs**: Attempts to parse, logs warnings
- **Missing MCP**: Falls back to direct file access

## Output Quality

The Skill provides rich context:
- File paths for reference
- Section headings for navigation
- Excerpts with surrounding context
- Relevance scores for ranking
- Metadata (last modified, authors)

## Limitations

- Requires documentation to be in text-based formats (Markdown, text, PDF)
- PDF parsing may be limited without document-skills
- No support for proprietary formats (Confluence, Notion) without MCP
- Relevance scoring is heuristic-based, not semantic search (unless MCP provides it)

## Future Enhancements

- Semantic search with embeddings
- Confluence/Notion integration
- Documentation versioning awareness
- Auto-generation of missing guidelines
- Link validation (check for broken references)
