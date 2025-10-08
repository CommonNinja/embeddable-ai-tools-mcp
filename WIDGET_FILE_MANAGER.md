# Widget File Manager Tools

This document describes the new MCP tools for managing widget files directly from your AI server, eliminating the need for client-side file operations.

## 🎯 Overview

These tools allow your AI server to:
- Write files directly to AWS S3 and index them for search
- Read widget files with optional line range support  
- Delete files from both AWS and search index
- Search across widget files using regex patterns
- Perform precise line-based search and replace operations

## 🔧 Available Tools

### 1. `widget_write_file`

Write a complete file to a widget's codebase.

**Parameters:**
- `widgetId` (string, required) - The widget identifier
- `filePath` (string, required) - Relative path from widget root (e.g., "/config.ts", "/components/Card.tsx")
- `content` (string, required) - Complete file content
- `shouldIndex` (boolean, optional, default: true) - Whether to index for AI search

**Example:**
```json
{
  "widgetId": "my-widget-123",
  "filePath": "/config.ts",
  "content": "export const widgetConfig = {\n  title: 'My Widget'\n};",
  "shouldIndex": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "File /config.ts written successfully",
  "filePath": "/config.ts"
}
```

### 2. `widget_view_file`

Read the contents of a widget file.

**Parameters:**
- `widgetId` (string, required) - The widget identifier  
- `filePath` (string, required) - Relative path to the file
- `lines` (string, optional) - Line ranges to read (e.g., "1-50, 100-150")

**Example:**
```json
{
  "widgetId": "my-widget-123",
  "filePath": "/components/Card.tsx",
  "lines": "1-30, 50-60"
}
```

**Response:**
```json
{
  "success": true,
  "message": "File /components/Card.tsx retrieved successfully",
  "filePath": "/components/Card.tsx",
  "content": "1|import React from 'react';\n2|import './Card.css';\n...",
  "totalLines": 120,
  "linesShown": "1-30, 50-60"
}
```

### 3. `widget_delete_file`

Delete a file from the widget's codebase.

**Parameters:**
- `widgetId` (string, required) - The widget identifier
- `filePath` (string, required) - Relative path to the file to delete
- `removeFromIndex` (boolean, optional, default: true) - Whether to remove from search index

**Example:**
```json
{
  "widgetId": "my-widget-123", 
  "filePath": "/old-component.tsx",
  "removeFromIndex": true
}
```

### 4. `widget_search_files`

Search for code patterns across widget files using regex.

**Parameters:**
- `widgetId` (string, required) - The widget identifier
- `query` (string, required) - Regex pattern to search for
- `includePattern` (string, required) - Files to include (glob syntax, e.g., "src/**/*.tsx")
- `excludePattern` (string, optional) - Files to exclude (e.g., "**/*.test.tsx")
- `caseSensitive` (boolean, optional, default: false) - Case-sensitive matching
- `contextLines` (number, optional, default: 3) - Context lines around matches

**Example:**
```json
{
  "widgetId": "my-widget-123",
  "query": "useState\\(",
  "includePattern": "src/**/*.tsx",
  "excludePattern": "**/*.test.tsx",
  "caseSensitive": false,
  "contextLines": 2
}
```

**Response:**
```json
{
  "success": true,
  "message": "Search completed. Found 5 matches",
  "matches": [
    {
      "filePath": "/components/Card.tsx",
      "line": 15,
      "column": 12,
      "matchText": "useState(",
      "beforeContext": ["import React from 'react';", ""],
      "afterContext": ["  const [count, setCount] = useState(0);", ""]
    }
  ],
  "totalMatches": 5,
  "searchPattern": "useState\\("
}
```

### 5. `widget_line_replace_file`

Perform precise line-based search and replace (preferred for file edits).

**Parameters:**
- `widgetId` (string, required) - The widget identifier
- `filePath` (string, required) - Relative path to the file  
- `search` (string, required) - Content to search for (can use ellipsis ... for large sections)
- `firstReplacedLine` (number, required) - First line number to replace (1-indexed)
- `lastReplacedLine` (number, required) - Last line number to replace (1-indexed)
- `replace` (string, required) - New content to replace with
- `shouldIndex` (boolean, optional, default: true) - Whether to re-index after replacement

**Example:**
```json
{
  "widgetId": "my-widget-123",
  "filePath": "/components/Button.tsx", 
  "search": "function Button() {\n  return (\n...\n  );\n}",
  "firstReplacedLine": 5,
  "lastReplacedLine": 15,
  "replace": "const Button = () => {\n  return (\n    <button className=\"btn\">Click me</button>\n  );\n};",
  "shouldIndex": true
}
```

## 🚀 Usage Workflow

### Creating New Files
```javascript
// 1. Write new component file
await tool("widget_write_file", {
  widgetId: "my-widget",
  filePath: "/components/NewComponent.tsx",
  content: componentCode
});

// 2. Update imports in main file
await tool("widget_line_replace_file", {
  widgetId: "my-widget", 
  filePath: "/App.tsx",
  search: "import './App.css';",
  firstReplacedLine: 3,
  lastReplacedLine: 3,
  replace: "import './App.css';\nimport NewComponent from './components/NewComponent';"
});
```

### Modifying Existing Files
```javascript
// 1. First, view the file to understand current content
const fileContent = await tool("widget_view_file", {
  widgetId: "my-widget",
  filePath: "/config.ts"
});

// 2. Use line-based replace for precise edits (preferred)
await tool("widget_line_replace_file", {
  widgetId: "my-widget",
  filePath: "/config.ts", 
  search: "title: 'Old Title'",
  firstReplacedLine: 5,
  lastReplacedLine: 5,
  replace: "title: 'New Title'"
});
```

### Finding Code Patterns
```javascript
// Search for all form submissions
const results = await tool("widget_search_files", {
  widgetId: "my-widget",
  query: "onSubmit|handleSubmit",
  includePattern: "src/**/*.tsx"
});
```

## ⚠️ Important Notes

1. **File Paths**: Always use relative paths from widget root (e.g., "/config.ts", "/components/Card.tsx")

2. **Line Numbers**: All line numbers are 1-indexed (first line = line 1)

3. **Ellipsis Usage**: For large replacements (>6 lines), use `...` in search patterns:
   ```
   "search": "function start() {\n...\n  return result;\n}"
   ```

4. **Parallel Edits**: When making multiple edits to the same file, always use original line numbers from your initial view

5. **Indexing**: Files are automatically indexed for AI search unless disabled with `shouldIndex: false`

6. **Error Handling**: All tools return `success: boolean` and include error details when operations fail

## 🔄 Migration from Client-Side

**Before (Client-Side):**
```javascript
// AI returns file content, then client calls:
await fetch('/api/embeddable/update-src', {
  method: 'POST',
  body: JSON.stringify({
    widgetId,
    files: { [filePath]: content },
    deletedFiles: []
  })
});
```

**After (MCP Tools):**
```javascript
// AI directly calls MCP tool:
await tool("widget_write_file", {
  widgetId,
  filePath,
  content
});
```

## 🧪 Testing Locally

You can test the widget search functionality using the existing CLI:
```bash
npm run test:search-simple  # Edit test-widget-search-simple.js first
```

The new file management tools are available via MCP protocol when your AI server connects to this MCP server.

## 🔜 TODO Implementation Notes

The following functions need to be implemented for full functionality:

1. **File Indexing Service**: Currently commented out - implement actual calls to your indexing service
2. **Context Management**: Get `organizationId` and `userId` from MCP session/context  
3. **AWS Lambda Functions**: Ensure `embeddable-widget-src-update` and `embeddable-get-widget-files` Lambda functions exist

These placeholders are marked with `// TODO:` comments in the controller code.
