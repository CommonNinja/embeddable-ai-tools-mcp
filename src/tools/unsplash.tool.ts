import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { UnsplashToolArgs } from './unsplash.types.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import { z } from 'zod';

import unsplashController from '../controllers/unsplash.controller.js';

/**
 * Zod schema for the tool arguments.
 */
const UnsplashImageSearchToolSchema = UnsplashToolArgs;

/**
 * TypeScript type inferred from the tool arguments schema.
 */
type UnsplashImageSearchToolArgsType = z.infer<
	typeof UnsplashImageSearchToolSchema
>;

/**
 * @function handleUnsplashImageSearch
 * @description MCP Tool handler to search for images on Unsplash.
 *              It calls the unsplashController to fetch the data and formats the response for the MCP.
 *
 * @param {UnsplashImageSearchToolArgsType} args - Arguments provided to the tool.
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} Formatted response for the MCP.
 * @throws {McpError} Formatted error if the controller or service layer encounters an issue.
 */
async function handleUnsplashImageSearch(
	args: UnsplashImageSearchToolArgsType,
) {
	const methodLogger = Logger.forContext(
		'tools/unsplash.tool.ts',
		'handleUnsplashImageSearch',
	);
	methodLogger.debug(`Searching for images with query: ${args.query}`, args);

	try {
		// Pass args directly to the controller
		const result = await unsplashController.search(args);
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
		methodLogger.error(
			`Error searching for images with query: ${args.query}`,
			error,
		);
		return formatErrorForMcpTool(error);
	}
}

/**
 * @function registerTools
 * @description Registers the Unsplash image search tool ('unsplash_search_images') with the MCP server.
 *
 * @param {McpServer} server - The MCP server instance.
 */
function registerTools(server: McpServer) {
	const methodLogger = Logger.forContext(
		'tools/unsplash.tool.ts',
		'registerTools',
	);
	methodLogger.debug(`Registering Unsplash image search tool...`);

	server.tool(
		'unsplash_search_images',
		`Search for high-quality images from Unsplash. Use this tool when you need to find images based on a search query. Returns detailed information about images including URLs, photographer information, and image dimensions.`,
		UnsplashImageSearchToolSchema.shape,
		handleUnsplashImageSearch,
	);

	methodLogger.debug('Successfully registered unsplash_search_images tool.');
}

export default { registerTools };
