import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { UrlAnalyzerToolArgs } from './url-analyzer.types.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import urlAnalyzerController from '../controllers/url-analyzer.controller.js';
import { z } from 'zod';

/**
 * TypeScript type inferred from the tool arguments schema.
 */
type UrlAnalyzerToolArgsType = z.infer<typeof UrlAnalyzerToolArgs>;

/**
 * @function handleUrlAnalyzer
 * @description MCP Tool handler to analyze URLs for design, components, and content.
 *              It calls the urlAnalyzerController to process the URL and formats the response for the MCP.
 *
 * @param {UrlAnalyzerToolArgsType} args - Arguments provided to the tool.
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} Formatted response for the MCP.
 * @throws {McpError} Formatted error if the controller or service layer encounters an issue.
 */
async function handleUrlAnalyzer(args: UrlAnalyzerToolArgsType) {
	const methodLogger = Logger.forContext(
		'tools/url-analyzer.tool.ts',
		'handleUrlAnalyzer',
	);
	methodLogger.debug(`Analyzing URL: ${args.url}`, args);

	try {
		// Pass args directly to the controller
		const result = await urlAnalyzerController.analyze(args);
		methodLogger.debug(`Got the response from the controller`, result);

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
		methodLogger.error(`Error analyzing URL: ${args.url}`, error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * @function registerTools
 * @description Registers the URL analyzer tool with the MCP server.
 *
 * @param {McpServer} server - The MCP server instance.
 */
function registerTools(server: McpServer) {
	const methodLogger = Logger.forContext(
		'tools/url-analyzer.tool.ts',
		'registerTools',
	);
	methodLogger.debug(`Registering URL analyzer tool...`);

	server.tool(
		'analyze_url_for_design_and_content',
		`Analyzes websites/screenshots to extract design patterns, colors, typography, and components for design inspiration and widget creation. Don't use if URL is already wrapped in <widget-*> command.`,
		UrlAnalyzerToolArgs.shape,
		handleUrlAnalyzer,
	);

	methodLogger.debug('Successfully registered URL analyzer tool.');
}

export default { registerTools };
