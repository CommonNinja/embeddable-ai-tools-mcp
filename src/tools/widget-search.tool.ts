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
		`🚨🚨🚨 MANDATORY BEFORE ANY WIDGET CHANGES 🚨🚨🚨

**ABSOLUTE REQUIREMENT**: You CANNOT modify ANY existing widget files without using this tool FIRST. NO EXCEPTIONS.

**WHY THIS EXISTS**: This tool helps you find the most relevant files in a widget's codebase for making changes. Perfect for understanding which files to modify when implementing features or fixing issues.

**MANDATORY USAGE PATTERN**:
1. 🔍 **USE THIS TOOL FIRST** - Search for ALL relevant files
2. 📖 **READ ALL FOUND FILES** - Understand current structure completely  
3. 🔄 **CASCADING SEARCH** - Search for imports/dependencies discovered in files
4. ⚡ **COMPLETE UNDERSTANDING** - Build full context before ANY modifications
5. 🎯 **TARGETED CHANGES ONLY** - Modify only what was specifically requested

**FORBIDDEN - WILL CAUSE CATASTROPHIC FAILURES**:
❌ Making ANY file changes without searching first
❌ Rebuilding entire widgets instead of targeted modifications  
❌ Overwriting existing functionality that works fine
❌ Assuming you know file structure without searching

**Search Types:**
- **semantic** (default): AI-powered conceptual search - finds files based on functionality and purpose
- **exact**: Text pattern matching - finds files containing specific code or text
- **filename**: File name matching - finds files by name patterns
	`,
		WidgetSearchToolSchema.shape,
		handleWidgetSearch,
	);

	methodLogger.debug('Successfully registered search_widget_files tool.');
}

export default { registerTools };
