import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import {
	WidgetWriteFileArgs,
	WidgetDeleteFileArgs,
	// WidgetLineReplaceArgs,
	WidgetWriteFileArgsType,
	WidgetDeleteFileArgsType,
	// WidgetLineReplaceArgsType,
} from './widget-file-manager.types.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import widgetFileManagerController from '../controllers/widget-file-manager.controller.js';

/**
 * Tool handler for writing widget files
 */
async function handleWidgetWriteFile(args: WidgetWriteFileArgsType) {
	const methodLogger = Logger.forContext(
		'tools/widget-file-manager.tool.ts',
		'handleWidgetWriteFile',
	);
	methodLogger.debug(
		`Writing file ${args.filePath} to widget ${args.widgetId}`,
		{ ...args, content: '[CONTENT_TRUNCATED]' }
	);

	try {
		const result = await widgetFileManagerController.writeFile(args);
		methodLogger.debug('File write completed', result);

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
			`Error writing file ${args.filePath} to widget ${args.widgetId}`,
			error,
		);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Tool handler for deleting widget files
 */
async function handleWidgetDeleteFile(args: WidgetDeleteFileArgsType) {
	const methodLogger = Logger.forContext(
		'tools/widget-file-manager.tool.ts',
		'handleWidgetDeleteFile',
	);
	methodLogger.debug(
		`Deleting file ${args.filePath} from widget ${args.widgetId}`,
		args,
	);

	try {
		const result = await widgetFileManagerController.deleteFile(args);
		methodLogger.debug('File deletion completed', result);

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
			`Error deleting file ${args.filePath} from widget ${args.widgetId}`,
			error,
		);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Tool handler for line-based search and replace in widget files
 * TODO: Disabled for now - will be enabled later
 */
// async function handleWidgetLineReplace(args: WidgetLineReplaceArgsType) {
// 	const methodLogger = Logger.forContext(
// 		'tools/widget-file-manager.tool.ts',
// 		'handleWidgetLineReplace',
// 	);
// 	methodLogger.debug(
// 		`Replacing lines ${args.firstReplacedLine}-${args.lastReplacedLine} in ${args.filePath} (widget ${args.widgetId})`,
// 		{ ...args, search: '[SEARCH_TRUNCATED]', replace: '[REPLACE_TRUNCATED]' }
// 	);

// 	try {
// 		const result = await widgetFileManagerController.replaceLines(args);
// 		methodLogger.debug('Line replacement completed', result);

// 		return {
// 			content: [
// 				{
// 					type: 'text' as const,
// 					text: result.content,
// 				},
// 			],
// 		};
// 	} catch (error) {
// 		methodLogger.error(
// 			`Error replacing lines in ${args.filePath} (widget ${args.widgetId})`,
// 			error,
// 		);
// 		return formatErrorForMcpTool(error);
// 	}
// }

/**
 * Register widget file management tools with the MCP server
 */
function registerTools(server: McpServer) {
	const methodLogger = Logger.forContext(
		'tools/widget-file-manager.tool.ts',
		'registerTools',
	);
	methodLogger.debug('Registering widget file management tools...');

	// Register widget file write tool
	server.tool(
		'widget_write_file',
		`Write a file to a widget's codebase. This tool will:
- Update the file in AWS S3 storage
- Overwrite existing files with the same path

Use this tool to create new files or update existing files in a widget.
When writing files, provide the complete content - this tool overwrites the entire file.

IMPORTANT: Always use relative paths starting from the widget root (e.g., "/config.ts", "/components/Card.tsx").`,
		WidgetWriteFileArgs.shape,
		handleWidgetWriteFile,
	);

	// Register widget file delete tool
	server.tool(
		'widget_delete_file',
		`Delete a file from a widget's codebase. This tool will:
- Remove the file from AWS S3 storage  
- Permanently delete the specified file

Use this tool to remove files that are no longer needed in a widget.

IMPORTANT: File deletion is permanent. Use relative paths from the widget root (e.g., "/old-component.tsx").`,
		WidgetDeleteFileArgs.shape,
		handleWidgetDeleteFile,
	);

	// TODO: Line replace tool - disabled for now
	// server.tool(
	// 	'widget_line_replace_file',
	// 	`Perform line-based search and replace in a widget file. This is the PREFERRED tool for modifying existing files.`,
	// 	WidgetLineReplaceArgs.shape,
	// 	handleWidgetLineReplace,
	// );

	methodLogger.debug('Successfully registered all widget file management tools.');
}

export default { registerTools };
