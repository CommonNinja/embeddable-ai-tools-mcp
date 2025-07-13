import { Logger } from '../utils/logger.util.js';
import openaiService from '../services/vendor.openai.com.service.js';
import { formatMessageOptimizerResults } from './message-optimizer.formatter.js';
import { ControllerResponse } from '../types/common.types.js';

/**
 * @namespace MessageOptimizerController
 * @description Controller responsible for handling message optimization logic.
 *              It orchestrates calls to the OpenAI service and formats the response.
 */

/**
 * @function optimizeMessage
 * @description Optimizes a user message using OpenAI to improve UX/UI specifications.
 * @memberof MessageOptimizerController
 * @param {Object} args - Arguments containing optimization parameters
 * @param {string} args.originalMessage - The original message to optimize
 * @param {boolean} [args.isFirstMessage=true] - Whether this is the first message
 * @returns {Promise<ControllerResponse>} A promise that resolves to the standard controller response containing the formatted optimization results in Markdown.
 * @throws {McpError} Throws an McpError if the service call fails or returns an error.
 */
async function optimizeMessage(args: {
	originalMessage: string;
	isFirstMessage?: boolean;
}): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/message-optimizer.controller.ts',
		'optimizeMessage',
	);
	methodLogger.debug(`Optimizing message`, args);

	try {
		// Apply defaults
		const options = {
			originalMessage: args.originalMessage,
			isFirstMessage: args.isFirstMessage ?? true,
		};

		// Only optimize if this is marked as the first message
		if (!options.isFirstMessage) {
			const noOptimizationResult = {
				enhancedPrompt: options.originalMessage,
				wasEnhanced: false,
				originalLength: options.originalMessage.length,
				enhancedLength: options.originalMessage.length,
				improvementSuggestions: [],
			};

			const formattedContent = formatMessageOptimizerResults(
				noOptimizationResult,
				options.originalMessage,
			);

			return {
				content: formattedContent,
			};
		}

		// Skip optimization for very short messages
		if (options.originalMessage.trim().length < 10) {
			const shortMessageResult = {
				enhancedPrompt: options.originalMessage,
				wasEnhanced: false,
				originalLength: options.originalMessage.length,
				enhancedLength: options.originalMessage.length,
				improvementSuggestions: [],
			};

			const formattedContent = formatMessageOptimizerResults(
				shortMessageResult,
				options.originalMessage,
			);

			return {
				content: formattedContent,
			};
		}

		methodLogger.debug('Calling OpenAI service for optimization');

		// Call the service
		const enhancementResult = await openaiService.enhancePrompt({
			originalMessage: options.originalMessage,
		});

		methodLogger.debug(
			`Service returned enhancement result (wasEnhanced: ${enhancementResult.wasEnhanced})`,
		);

		// Format the response
		const formattedContent = formatMessageOptimizerResults(
			enhancementResult,
			options.originalMessage,
		);

		return {
			content: formattedContent,
		};
	} catch (error) {
		methodLogger.error(
			`Error optimizing message: ${args.originalMessage.substring(0, 50)}...`,
			error,
		);

		// Re-throw the error to be handled by the calling tool
		throw error;
	}
}

export default {
	optimizeMessage,
};
