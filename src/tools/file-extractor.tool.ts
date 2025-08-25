import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { FileExtractorToolArgs } from './file-extractor.types.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import { z } from 'zod';

import fileExtractorController from '../controllers/file-extractor.controller.js';

/**
 * Zod schema for the tool arguments.
 */
const FileExtractorToolSchema = FileExtractorToolArgs;

/**
 * TypeScript type inferred from the tool arguments schema.
 */
type FileExtractorToolArgsType = z.infer<typeof FileExtractorToolSchema>;

/**
 * @function handleFileExtraction
 * @description MCP Tool handler to extract file URLs and their content from user messages.
 *              It calls the fileExtractorController to process the message and formats the response for the MCP.
 *
 * @param {FileExtractorToolArgsType} args - Arguments provided to the tool.
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} Formatted response for the MCP.
 * @throws {McpError} Formatted error if the controller or service layer encounters an issue.
 */
async function handleFileExtraction(args: FileExtractorToolArgsType) {
	const methodLogger = Logger.forContext(
		'tools/file-extractor.tool.ts',
		'handleFileExtraction',
	);
	methodLogger.debug(
		`Extracting files from message: ${args.messageContent.substring(0, 50)}...`,
		args,
	);

	try {
		// Pass args directly to the controller
		const result = await fileExtractorController.extractFiles(args);
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
			`Error extracting files from message: ${args.messageContent.substring(0, 50)}...`,
			error,
		);
		return formatErrorForMcpTool(error);
	}
}

/**
 * @function registerTools
 * @description Registers the file extractor tool ('extract_file_urls_content') with the MCP server.
 *
 * @param {McpServer} server - The MCP server instance.
 */
function registerTools(server: McpServer) {
	const methodLogger = Logger.forContext(
		'tools/file-extractor.tool.ts',
		'registerTools',
	);
	methodLogger.debug(`Registering file extractor tool...`);

	server.tool(
		'extract_file_urls_content',
		`Extract file URLs (PDFs, CSVs, TXTs, etc.) and their content from user messages. Use when prompt includes file links like: "analyze this PDF", "read this CSV file", "extract text from this document", or when users share file links in markdown format.`,
		FileExtractorToolSchema.shape,
		handleFileExtraction,
	);

	methodLogger.debug(
		'Successfully registered extract_file_urls_content tool.',
	);
}

export default { registerTools };
