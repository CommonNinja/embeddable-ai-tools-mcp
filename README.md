# embeddable-ai-tools-mcp

A foundation for developing custom Model Context Protocol (MCP) servers in TypeScript. Provides a complete layered architecture pattern, working example tools, and developer infrastructure to connect AI assistants with external APIs and data sources.

[![NPM Version](https://img.shields.io/npm/v/@aashari/boilerplate-mcp-server)](https://www.npmjs.com/package/@aashari/boilerplate-mcp-server)
[![Build Status](https://img.shields.io/github/workflow/status/aashari/boilerplate-mcp-server/CI)](https://github.com/aashari/boilerplate-mcp-server/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue)](https://www.typescriptlang.org/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

## Features

- **Multiple Transport Support**: STDIO and Streamable HTTP transports
- **Production-Ready Architecture**: Clean separation between CLI, tools, controllers, and services
- **Type Safety**: Built with TypeScript for improved developer experience
- **Working Example**: Fully implemented IP address lookup tools
- **Testing Framework**: Ready-to-use testing infrastructure with coverage reporting
- **Complete Developer Tooling**: Pre-configured ESLint, Prettier, TypeScript

## What is MCP?

Model Context Protocol (MCP) is an open standard for securely connecting AI systems to external tools and data sources. This boilerplate implements the MCP specification with a clean, layered architecture that can be extended to build custom MCP servers for any API or data source.

## Prerequisites

- **Node.js** (>=18.x): [Download](https://nodejs.org/)
- **Git**: For version control

## Quick Start

```bash
# Clone the repository
git clone https://github.com/aashari/boilerplate-mcp-server.git
cd boilerplate-mcp-server

# Install dependencies
npm install

# Run in different modes:

# 1. CLI Mode - Execute commands directly
npm run cli -- get-ip-details 8.8.8.8

# 2. STDIO Transport - For direct AI assistant integration
npm run mcp:stdio

# 3. HTTP Transport - For web-based integrations (default)
npm run mcp:http

# 4. Development with MCP Inspector
npm run mcp:inspect
```

# Tunneling
```bash
npx untun@latest tunnel http://localhost:5006
```

## Transport Modes

### STDIO Transport
- Traditional subprocess communication via stdin/stdout
- Ideal for local AI assistant integrations
- Run with: `TRANSPORT_MODE=stdio npm run build && node dist/index.js`

### Streamable HTTP Transport (Default)
- Modern HTTP-based transport with Server-Sent Events (SSE)
- Supports multiple concurrent connections
- Runs on port 3000 by default (configurable via PORT env var)
- Endpoint: `http://localhost:3000/mcp`
- Health check: `http://localhost:3000/`
- Run with: `TRANSPORT_MODE=http npm run build && node dist/index.js`

## Architecture Overview

<details>
<summary><b>Project Structure (Click to expand)</b></summary>

```
src/
├── cli/              # Command-line interfaces
│   ├── index.ts      # CLI entry point
│   └── *.cli.ts      # Feature-specific CLI modules
├── controllers/      # Business logic
│   └── *.controller.ts  # Feature controllers
├── services/         # External API interactions
│   └── *.service.ts  # Service modules
├── tools/            # MCP tool definitions
│   ├── *.tool.ts     # Tool implementations
│   └── *.types.ts    # Tool argument schemas
├── resources/        # MCP resource definitions
│   └── *.resource.ts # Resource implementations
├── types/            # Type definitions
│   └── common.types.ts # Shared type definitions
├── utils/            # Shared utilities
│   ├── logger.util.ts  # Structured logging
│   ├── error.util.ts   # Error handling
│   └── ...           # Other utility modules
└── index.ts          # Server entry point
```

</details>

## Layered Architecture

The boilerplate follows a clean, layered architecture that promotes maintainability and clear separation of concerns:

### 1. CLI Layer (`src/cli/*.cli.ts`)

- **Purpose**: Command-line interfaces that parse arguments and call controllers
- **Pattern**: Use `commander` for argument parsing, call controllers, handle errors with `handleCliError`
- **Naming**: `<feature>.cli.ts` 

### 2. Tools Layer (`src/tools/*.tool.ts`)

- **Purpose**: MCP tool definitions exposed to AI assistants
- **Pattern**: Use `zod` for schema validation, call controllers, format responses for MCP
- **Naming**: `<feature>.tool.ts` with types in `<feature>.types.ts`

### 3. Controllers Layer (`src/controllers/*.controller.ts`)

- **Purpose**: Business logic orchestration, error handling, response formatting
- **Pattern**: Return standardized `ControllerResponse` objects, throw errors with context
- **Naming**: `<feature>.controller.ts` with optional `<feature>.formatter.ts`

### 4. Services Layer (`src/services/*.service.ts`)

- **Purpose**: External API interactions and data handling
- **Pattern**: Pure API calls with minimal logic, return raw data
- **Naming**: `<feature>.service.ts` or `vendor.<vendor>.<feature>.service.ts`

### 5. Utils Layer (`src/utils/*.util.ts`)

- **Purpose**: Shared functionality across the application
- **Key Utils**: Logging, error handling, formatting, configuration

## Developer Guide

### Development Scripts

```bash
# Development
npm run build               # Build TypeScript
npm run clean               # Clean build artifacts

# Running different modes
npm run cli -- [command]    # Run CLI commands
npm run mcp:stdio          # Run with STDIO transport
npm run mcp:http           # Run with HTTP transport (default)
npm run mcp:inspect        # Run with MCP Inspector

# Development modes
npm run dev:stdio          # STDIO with inspector
npm run dev:http           # HTTP in development mode

# Testing
npm test                    # Run all tests
npm run test:coverage       # Generate coverage report

# Code Quality
npm run lint                # Run ESLint
npm run format              # Format with Prettier
```

### Environment Variables

- `TRANSPORT_MODE`: Set to `stdio` or `http` (default: `http`)
- `PORT`: HTTP server port (default: `3000`)
- `DEBUG`: Enable debug logging (default: `false`)
- `IPAPI_API_TOKEN`: API token for ip-api.com (optional)

### Debugging Tools

- **MCP Inspector**: Visual tool for testing your MCP tools
  - Run server with `npm run mcp:inspect`
  - Open the URL shown in terminal
  - Test your tools interactively

- **Debug Logging**: Enable with `DEBUG=true` environment variable

<details>
<summary><b>Configuration (Click to expand)</b></summary>

Create `~/.mcp/configs.json`:

```json
{
  "boilerplate": {
    "environments": {
      "DEBUG": "true",
      "TRANSPORT_MODE": "http",
      "PORT": "3000"
    }
  }
}
```

</details>

## Building Custom Tools

<details>
<summary><b>Step-by-Step Tool Implementation Guide (Click to expand)</b></summary>

### 1. Define Service Layer

Create a new service in `src/services/` to interact with your external API:

```typescript
// src/services/example.service.ts
import { Logger } from '../utils/logger.util.js';

const logger = Logger.forContext('services/example.service.ts');

export async function getData(param: string): Promise<any> {
	logger.debug('Getting data', { param });
	// API interaction code here
	return { result: 'example data' };
}
```

### 2. Create Controller

Add a controller in `src/controllers/` to handle business logic:

```typescript
// src/controllers/example.controller.ts
import { Logger } from '../utils/logger.util.js';
import * as exampleService from '../services/example.service.js';
import { formatMarkdown } from '../utils/formatter.util.js';
import { handleControllerError } from '../utils/error-handler.util.js';
import { ControllerResponse } from '../types/common.types.js';

const logger = Logger.forContext('controllers/example.controller.ts');

export interface GetDataOptions {
	param?: string;
}

export async function getData(
	options: GetDataOptions = {},
): Promise<ControllerResponse> {
	try {
		logger.debug('Getting data with options', options);

		const data = await exampleService.getData(options.param || 'default');

		const content = formatMarkdown(data);

		return { content };
	} catch (error) {
		throw handleControllerError(error, {
			entityType: 'ExampleData',
			operation: 'getData',
			source: 'controllers/example.controller.ts',
		});
	}
}
```

### 3. Implement MCP Tool

Create a tool definition in `src/tools/`:

```typescript
// src/tools/example.tool.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { Logger } from '../utils/logger.util.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import * as exampleController from '../controllers/example.controller.js';

const logger = Logger.forContext('tools/example.tool.ts');

const GetDataArgs = z.object({
	param: z.string().optional().describe('Optional parameter'),
});

type GetDataArgsType = z.infer<typeof GetDataArgs>;

async function handleGetData(args: GetDataArgsType) {
	try {
		logger.debug('Tool get_data called', args);

		const result = await exampleController.getData({
			param: args.param,
		});

		return {
			content: [{ type: 'text' as const, text: result.content }],
		};
	} catch (error) {
		logger.error('Tool get_data failed', error);
		return formatErrorForMcpTool(error);
	}
}

export function register(server: McpServer) {
	server.tool(
		'get_data',
		`Gets data from the example API, optionally using \`param\`.
Use this to fetch example data. Returns formatted data as Markdown.`,
		GetDataArgs.shape,
		handleGetData,
	);
}
```

### 4. Add CLI Support

Create a CLI command in `src/cli/`:

```typescript
// src/cli/example.cli.ts
import { program } from 'commander';
import { Logger } from '../utils/logger.util.js';
import * as exampleController from '../controllers/example.controller.js';
import { handleCliError } from '../utils/error-handler.util.js';

const logger = Logger.forContext('cli/example.cli.ts');

program
	.command('get-data')
	.description('Get example data')
	.option('--param <value>', 'Optional parameter')
	.action(async (options) => {
		try {
			logger.debug('CLI get-data called', options);

			const result = await exampleController.getData({
				param: options.param,
			});

			console.log(result.content);
		} catch (error) {
			handleCliError(error);
		}
	});
```

### 5. Register Components

Update the entry points to register your new components:

```typescript
// In src/cli/index.ts
import '../cli/example.cli.js';

// In src/index.ts (for the tool)
import exampleTool from './tools/example.tool.js';
// Then in registerTools function:
exampleTool.register(server);
```

</details>

## Publishing Your MCP Server

1. Update package.json with your details:
   ```json
   {
     "name": "your-mcp-server-name",
     "version": "1.0.0",
     "description": "Your custom MCP server",
     "author": "Your Name",
     // Other fields...
   }
   ```

2. Update README.md with your tool documentation
3. Build: `npm run build`
4. Test: `npm run mcp:stdio` and `npm run mcp:http`
5. Publish: `npm publish`

## Testing Best Practices

- **Unit Tests**: Test utils and pure functions in isolation
- **Controller Tests**: Test business logic with mocked service calls
- **Integration Tests**: Test CLI with real dependencies
- **Coverage Goal**: Aim for >80% test coverage

## License

[ISC License](https://opensource.org/licenses/ISC)

## Resources

- [MCP Specification](https://github.com/modelcontextprotocol/mcp-spec)
- [Official MCP Documentation](https://www.modelcontextprotocol.ai/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## AWS Logging

Trail logs:
```
aws logs tail /aws/apprunner/embeddable-ai-tools-mcp/a5850b27fcda48809bac8a975dd34571/application --since 1h --follow --region us-west-2
```

Filter:
```
aws logs tail /aws/apprunner/embeddable-ai-tools-mcp/a5850b27fcda48809bac8a975dd34571/application --follow --region us-west-2 | grep error
```
