import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { WidgetSearchToolArgs } from './widget-search.types.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import { z } from 'zod';

import widgetSearchController from '../controllers/widget-search.controller.js';

/**
 * Zod schema for the tool arguments.
 */
const WidgetSearchToolSchema = WidgetSearchToolArgs;

/**
 * TypeScript type inferred from the tool arguments schema.
 */
type WidgetSearchToolArgsType = z.infer<typeof WidgetSearchToolSchema>;

/**
 * @function handleWidgetSearch
 * @description MCP Tool handler to search for relevant files in widget codebases.
 *              It calls the widgetSearchController to find files and formats the response for the MCP.
 *
 * @param {WidgetSearchToolArgsType} args - Arguments provided to the tool.
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} Formatted response for the MCP.
 * @throws {McpError} Formatted error if the controller or service layer encounters an issue.
 */
async function handleWidgetSearch(args: WidgetSearchToolArgsType) {
	const methodLogger = Logger.forContext(
		'tools/widget-search.tool.ts',
		'handleWidgetSearch',
	);
	methodLogger.debug(
		`Searching widget ${args.widgetId} for: ${args.query} (${args.searchType})`,
		args,
	);
	try {
		// Pass args directly to the controller
		const result = await widgetSearchController.search(args);
		methodLogger.debug(
			`Got the response from the controller`,
			result,
			args,
		);

		// Format the response for the MCP tool
		return {
			content: [
				{
					type: 'text' as const,
					text: result.content,
				},
			],
		};
	} catch (error) {
		methodLogger.error(
			`Error searching widget ${args.widgetId} for query: ${args.query}`,
			error,
		);
		return formatErrorForMcpTool(error);
	}
}

/**
 * @function registerTools
 * @description Registers the widget search tool ('search_widget_files') with the MCP server.
 *
 * @param {McpServer} server - The MCP server instance.
 */
function registerTools(server: McpServer) {
	const methodLogger = Logger.forContext(
		'tools/widget-search.tool.ts',
		'registerTools',
	);
	methodLogger.debug(`Registering widget search tool...`);

	server.tool(
		'search_widget_files',
		`🔍 **Search Widget Codebase for Relevant Files**

This tool helps you find the most relevant files in a widget's codebase for making changes. Perfect for understanding which files to modify when implementing features or fixing issues.

**Search Types:**
- **semantic** (default): AI-powered conceptual search - finds files based on functionality and purpose
- **exact**: Text pattern matching - finds files containing specific code or text
- **filename**: File name matching - finds files by name patterns

**When to use:**
- "Which file handles user authentication?" → semantic search
- "Find files with 'handleSubmit' function" → exact search  
- "Find all component files" → filename search with "component"

**Examples:**
- \`widgetId: "my-widget", query: "button component", searchType: "semantic"\`
- \`widgetId: "my-widget", query: "useState", searchType: "exact"\`
- \`widgetId: "my-widget", query: "*.tsx", searchType: "filename"\`

Returns ranked list of relevant files with content previews to help you identify the right files to change.`,
		WidgetSearchToolSchema.shape,
		handleWidgetSearch,
	);

	methodLogger.debug('Successfully registered search_widget_files tool.');
}

export default { registerTools };