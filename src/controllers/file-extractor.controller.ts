import { Logger } from '../utils/logger.util.js';
import awsLambdaService from '../services/vendor.aws.lambda.service.js';
import { formatFileExtractionResults } from './file-extractor.formatter.js';
import { ControllerResponse } from '../types/common.types.js';

/**
 * @namespace FileExtractorController
 * @description Controller responsible for handling file extraction logic.
 *              It orchestrates calls to the AWS Lambda service and formats the response.
 */

/**
 * @function extractFiles
 * @description Extracts file URLs from a message and retrieves their content.
 * @memberof FileExtractorController
 * @param {Object} args - Arguments containing extraction parameters
 * @param {string} args.messageContent - The message content to analyze for file URLs
 * @returns {Promise<ControllerResponse>} A promise that resolves to the standard controller response containing the formatted extraction results in Markdown.
 * @throws {McpError} Throws an McpError if the service call fails or returns an error.
 */
async function extractFiles(args: {
	messageContent: string;
}): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/file-extractor.controller.ts',
		'extractFiles',
	);
	methodLogger.debug('Extracting files from message', args);

	try {
		// Apply defaults
		const options = {
			messageContent: args.messageContent,
		};

		methodLogger.debug('Calling AWS Lambda service for file extraction');

		// Call the service
		const extractionResult =
			await awsLambdaService.extractFilesFromMessage(options);

		methodLogger.debug(
			`Service returned ${extractionResult.fileCount} files (${extractionResult.successCount} successful)`,
		);

		// Format the response
		const formattedContent = formatFileExtractionResults(
			extractionResult,
			options.messageContent,
		);

		return {
			content: formattedContent,
		};
	} catch (error) {
		methodLogger.error(
			`Error extracting files from message: ${args.messageContent.substring(0, 50)}...`,
			error,
		);

		// Re-throw the error to be handled by the calling tool
		throw error;
	}
}

export default {
	extractFiles,
};
