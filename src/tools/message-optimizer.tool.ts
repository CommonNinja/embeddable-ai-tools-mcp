import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { MessageOptimizerToolArgs } from './message-optimizer.types.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import { z } from 'zod';

import messageOptimizerController from '../controllers/message-optimizer.controller.js';

/**
 * Zod schema for the tool arguments.
 */
const MessageOptimizerToolSchema = MessageOptimizerToolArgs;

/**
 * TypeScript type inferred from the tool arguments schema.
 */
type MessageOptimizerToolArgsType = z.infer<typeof MessageOptimizerToolSchema>;

/**
 * @function handleMessageOptimization
 * @description MCP Tool handler to optimize user messages for better UX/UI specifications.
 *              It calls the messageOptimizerController to enhance the message and formats the response for the MCP.
 *
 * @param {MessageOptimizerToolArgsType} args - Arguments provided to the tool.
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} Formatted response for the MCP.
 * @throws {McpError} Formatted error if the controller or service layer encounters an issue.
 */
async function handleMessageOptimization(args: MessageOptimizerToolArgsType) {
	const methodLogger = Logger.forContext(
		'tools/message-optimizer.tool.ts',
		'handleMessageOptimization',
	);
	methodLogger.debug(
		`Optimizing message: ${args.originalMessage.substring(0, 50)}...`,
		args,
	);

	try {
		// Pass args directly to the controller
		const result = await messageOptimizerController.optimizeMessage(args);
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
			`Error optimizing message: ${args.originalMessage.substring(0, 50)}...`,
			error,
		);
		return formatErrorForMcpTool(error);
	}
}

/**
 * @function registerTools
 * @description Registers the message optimizer tool ('optimize_first_user_message') with the MCP server.
 *
 * @param {McpServer} server - The MCP server instance.
 */
function registerTools(server: McpServer) {
	const methodLogger = Logger.forContext(
		'tools/message-optimizer.tool.ts',
		'registerTools',
	);
	methodLogger.debug(`Registering message optimizer tool...`);

	server.tool(
		'optimize_first_user_message',
		`Optimizes the first user message in a conversation to improve UX/UI specifications and add modern web development best practices. This tool should only be called for the initial user request to enhance it with better design guidelines, accessibility features, and technical specifications. Requires OPENAI_API_KEY environment variable to be configured.`,
		MessageOptimizerToolSchema.shape,
		handleMessageOptimization,
	);

	methodLogger.debug(
		'Successfully registered optimize_first_user_message tool.',
	);
}

export default { registerTools };
