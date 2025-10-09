import { Logger } from '../utils/logger.util.js';
import { ControllerResponse } from '../types/common.types.js';
import {
	WidgetWriteFileArgsType,
	WidgetViewFileArgsType,
	WidgetDeleteFileArgsType,
	WidgetSearchFilesArgsType,
	WidgetLineReplaceArgsType,
	FileOperationResult,
	FileViewResult,
	FileSearchResult,
	SearchMatch,
} from '../tools/widget-file-manager.types.js';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { createApiError } from '../utils/error.util.js';
import { MongoClient } from 'mongodb';

const logger = Logger.forContext(
	'controllers/widget-file-manager.controller.ts',
);

// Lambda function names
const UPDATE_SRC_FUNCTION = 'embeddable-widget-src-update';

/**
 * Helper function to invoke AWS Lambda (aligned with existing service)
 */
async function invokeLambda(
	functionName: string,
	payload: Record<string, unknown>,
) {
	const methodLogger = logger.forMethod('invokeLambda');

	// Check if AWS credentials are configured (same as existing service)
	const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
	const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

	if (!accessKeyId || !secretAccessKey) {
		methodLogger.warn('AWS credentials not configured');
		throw createApiError(
			'AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables are required',
		);
	}

	// Initialize AWS Lambda client (using same region as existing service)
	const lambdaClient = new LambdaClient({
		region: 'us-west-2',
		credentials: {
			accessKeyId,
			secretAccessKey,
		},
	});

	const command = new InvokeCommand({
		FunctionName: functionName,
		Payload: Buffer.from(
			JSON.stringify({
				body: payload,
				headers: {
					'ninja-secret': process.env.COMMONNINJA_SECRET,
				},
			}),
		),
	});

	const response = await lambdaClient.send(command);

	if (response.StatusCode !== 200) {
		throw createApiError(
			`Lambda invocation failed with status: ${response.StatusCode}`,
		);
	}

	if (response.FunctionError) {
		throw createApiError(
			`Lambda function error: ${response.FunctionError}`,
		);
	}

	if (!response.Payload) {
		return null;
	}

	// Parse the response payload
	const responsePayload = Buffer.from(response.Payload).toString('utf-8');
	const body = JSON.parse(responsePayload).body;
	return JSON.parse(body);
}

/**
 * Helper function to call indexing service
 */
// async function indexFiles(params: {
// 	widgetId: string;
// 	files: Record<string, string | null>;
// 	runIndexCheck?: boolean;
// }) {
// 	const methodLogger = logger.forMethod('indexFiles');
// 	methodLogger.debug('Indexing files', params);

// 	const apiBaseUrl =
// 		process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'https://embeddable.co';

// 	try {
// 		const result = await fetch(`${apiBaseUrl}/api/ai/index-files`, {
// 			method: 'POST',
// 			body: JSON.stringify({
// 				files: params.files,
// 				widgetId: params.widgetId,
// 				runIndexCheck: false,
// 			}),
// 			headers: {
// 				'Content-Type': 'application/json',
// 			},
// 			credentials: 'include',
// 		});

// 		if (!result.ok) {
// 			throw createApiError('Failed to index files');
// 		}

// 		return result.json();
// 	} catch (error) {
// 		methodLogger.error('Error indexing files', error);
// 		throw error;
// 	}
// }

/**
 * Helper function to delete widget files from index
 */
// async function deleteWidgetFiles(params: { widgetId: string }) {
// 	const methodLogger = logger.forMethod('deleteWidgetFiles');
// 	methodLogger.debug('Deleting widget files from index', params);

// 	const apiBaseUrl =
// 		process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'https://embeddable.co';

// 	try {
// 		const result = await fetch(`${apiBaseUrl}/api/ai/index-files`, {
// 			method: 'DELETE',
// 			body: JSON.stringify({
// 				widgetId: params.widgetId,
// 			}),
// 			headers: {
// 				'Content-Type': 'application/json',
// 			},
// 			credentials: 'include',
// 		});

// 		if (!result.ok) {
// 			throw createApiError('Failed to delete widget files');
// 		}

// 		return result.json();
// 	} catch (error) {
// 		methodLogger.error('Error deleting widget files', error);
// 		throw error;
// 	}
// }

/**
 * Get widget files from MongoDB (same as existing widget search)
 */
async function getWidgetFiles(params: { widgetId: string }) {
	const methodLogger = logger.forMethod('getWidgetFiles');
	const mongoUri = process.env.EMBEDDINGS_MONGODB_URI;

	if (!mongoUri) {
		throw new Error(
			'EMBEDDINGS_MONGODB_URI environment variable is required',
		);
	}

	const client = new MongoClient(mongoUri);

	try {
		await client.connect();
		const database = client.db('embeddable-core');
		const collection = database.collection('embedded_files');

		const results = await collection
			.find({
				widgetId: params.widgetId,
				type: 'code',
			})
			.toArray();

		// Group by file path and combine content
		const files: Record<string, string> = {};

		results.forEach((doc: any) => {
			if (!files[doc.filePath]) {
				files[doc.filePath] = doc.content;
			} else {
				// If we have multiple chunks for the same file, combine them
				files[doc.filePath] += '\n' + doc.content;
			}
		});

		return { files };
	} catch (error) {
		methodLogger.error('Failed to get widget files from MongoDB', error);
		throw error;
	} finally {
		await client.close();
	}
}

/**
 * Parse line ranges (e.g., "1-50, 100-150")
 */
function parseLineRanges(lines: string): Array<{ start: number; end: number }> {
	const ranges: Array<{ start: number; end: number }> = [];

	const parts = lines.split(',').map((s) => s.trim());

	for (const part of parts) {
		if (part.includes('-')) {
			const [start, end] = part
				.split('-')
				.map((s) => parseInt(s.trim(), 10));
			if (!isNaN(start) && !isNaN(end) && start <= end) {
				ranges.push({ start, end });
			}
		} else {
			const line = parseInt(part, 10);
			if (!isNaN(line)) {
				ranges.push({ start: line, end: line });
			}
		}
	}

	return ranges;
}

/**
 * Extract specific lines from content
 */
function extractLines(
	content: string,
	ranges: Array<{ start: number; end: number }>,
): string {
	const lines = content.split('\n');
	const extractedLines: string[] = [];

	for (const range of ranges) {
		for (
			let i = range.start - 1;
			i < Math.min(range.end, lines.length);
			i++
		) {
			if (i >= 0) {
				extractedLines.push(`${i + 1}|${lines[i]}`);
			}
		}
	}

	return extractedLines.join('\n');
}

/**
 * Search widget files using MongoDB (same approach as existing widget search)
 */
async function searchInMongoDB(
	widgetId: string,
	query: string,
	searchType: 'exact' | 'filename' = 'exact',
	limit: number = 10,
): Promise<SearchMatch[]> {
	const mongoUri = process.env.EMBEDDINGS_MONGODB_URI;

	if (!mongoUri) {
		throw new Error(
			'EMBEDDINGS_MONGODB_URI environment variable is required',
		);
	}

	const client = new MongoClient(mongoUri);

	try {
		await client.connect();
		const database = client.db('embeddable-core');
		const collection = database.collection('embedded_files');

		let results: any[];

		if (searchType === 'exact') {
			results = await collection
				.find({
					widgetId,
					type: 'code',
					content: { $regex: query, $options: 'i' },
				})
				.limit(limit)
				.toArray();
		} else {
			// filename
			results = await collection
				.find({
					widgetId,
					type: 'code',
					filePath: { $regex: query, $options: 'i' },
				})
				.limit(limit)
				.toArray();
		}

		// Convert to SearchMatch format
		const matches: SearchMatch[] = [];

		results.forEach((doc: any) => {
			// Find the actual match in the content
			const lines = doc.content.split('\n');
			const searchRegex = new RegExp(query, 'gi');

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				let match;

				searchRegex.lastIndex = 0;
				while ((match = searchRegex.exec(line)) !== null) {
					matches.push({
						filePath: doc.filePath,
						line: (doc.lineStart || 1) + i,
						column: match.index + 1,
						matchText: match[0],
						beforeContext: lines.slice(Math.max(0, i - 3), i),
						afterContext: lines.slice(
							i + 1,
							Math.min(lines.length, i + 4),
						),
					});
				}
			}
		});

		return matches;
	} catch (error) {
		logger.error('Error searching in MongoDB', error);
		throw error;
	} finally {
		await client.close();
	}
}

/**
 * Write a file to the widget
 */
async function writeFile(
	args: WidgetWriteFileArgsType,
): Promise<ControllerResponse> {
	const methodLogger = logger.forMethod('writeFile');
	methodLogger.debug('Writing widget file', {
		widgetId: args.widgetId,
		filePath: args.filePath,
		contentLength: args.content.length,
	});

	try {
		// Prepare files object for Lambda
		const files = {
			[args.filePath]: args.content,
		};

		// Update files via Lambda
		await invokeLambda(UPDATE_SRC_FUNCTION, {
			widgetId: args.widgetId,
			files,
			deletedFiles: [],
		});

		// Index files if requested
		try {
			// await indexFiles({
			// 	widgetId: args.widgetId,
			// 	files: files,
			// });
			methodLogger.debug('Files indexed successfully');
		} catch (error) {
			methodLogger.error('Failed to index files', error);
			// Don't fail the whole operation if indexing fails
		}

		const result: FileOperationResult = {
			success: true,
			message: `File ${args.filePath} written successfully`,
			filePath: args.filePath,
		};

		return {
			content: JSON.stringify(result, null, 2),
		};
	} catch (error) {
		methodLogger.error('Failed to write file', error);

		const result: FileOperationResult = {
			success: false,
			message: `Failed to write file ${args.filePath}`,
			filePath: args.filePath,
			error: error instanceof Error ? error.message : 'Unknown error',
		};

		return {
			content: JSON.stringify(result, null, 2),
		};
	}
}

/**
 * View a file from the widget
 */
async function viewFile(
	args: WidgetViewFileArgsType,
): Promise<ControllerResponse> {
	const methodLogger = logger.forMethod('viewFile');
	methodLogger.debug('Viewing widget file', args);

	try {
		// Get widget files from AWS
		const widgetData = await getWidgetFiles({
			widgetId: args.widgetId,
		});

		if (!widgetData?.files || !widgetData.files[args.filePath]) {
			const result: FileViewResult = {
				success: false,
				message: `File ${args.filePath} not found`,
				filePath: args.filePath,
				error: 'File not found',
			};

			return {
				content: JSON.stringify(result, null, 2),
			};
		}

		const content = widgetData.files[args.filePath];
		const allLines = content.split('\n');
		let displayContent: string;
		let linesShown: string;

		if (args.lines) {
			// Parse and extract specific line ranges
			const ranges = parseLineRanges(args.lines);
			displayContent = extractLines(content, ranges);
			linesShown = args.lines;
		} else {
			// Default: show first 500 lines with line numbers
			const linesToShow = Math.min(500, allLines.length);
			const numberedLines = allLines
				.slice(0, linesToShow)
				.map((line: string, index: number) => `${index + 1}|${line}`);

			displayContent = numberedLines.join('\n');
			linesShown =
				linesToShow === allLines.length
					? `1-${allLines.length}`
					: `1-${linesToShow} (truncated)`;
		}

		const result: FileViewResult = {
			success: true,
			message: `File ${args.filePath} retrieved successfully`,
			filePath: args.filePath,
			content: displayContent,
			totalLines: allLines.length,
			linesShown,
		};

		return {
			content: JSON.stringify(result, null, 2),
		};
	} catch (error) {
		methodLogger.error('Failed to view file', error);

		const result: FileViewResult = {
			success: false,
			message: `Failed to view file ${args.filePath}`,
			filePath: args.filePath,
			error: error instanceof Error ? error.message : 'Unknown error',
		};

		return {
			content: JSON.stringify(result, null, 2),
		};
	}
}

/**
 * Delete a file from the widget
 */
async function deleteFile(
	args: WidgetDeleteFileArgsType,
): Promise<ControllerResponse> {
	const methodLogger = logger.forMethod('deleteFile');
	methodLogger.debug('Deleting widget file', args);

	try {
		// Delete file via Lambda
		await invokeLambda(UPDATE_SRC_FUNCTION, {
			widgetId: args.widgetId,
			files: {},
			deletedFiles: [args.filePath],
		});

		// Remove from index if requested
		if (args.removeFromIndex) {
			try {
				// await deleteWidgetFiles({
				// 	widgetId: args.widgetId,
				// });
				methodLogger.debug(
					'Widget files removed from index successfully',
				);
			} catch (error) {
				methodLogger.error('Failed to remove files from index', error);
				// Don't fail the whole operation if index removal fails
			}
		}

		const result: FileOperationResult = {
			success: true,
			message: `File ${args.filePath} deleted successfully`,
			filePath: args.filePath,
		};

		return {
			content: JSON.stringify(result, null, 2),
		};
	} catch (error) {
		methodLogger.error('Failed to delete file', error);

		const result: FileOperationResult = {
			success: false,
			message: `Failed to delete file ${args.filePath}`,
			filePath: args.filePath,
			error: error instanceof Error ? error.message : 'Unknown error',
		};

		return {
			content: JSON.stringify(result, null, 2),
		};
	}
}

/**
 * Search files in the widget (using MongoDB like existing widget search)
 */
async function searchFiles(
	args: WidgetSearchFilesArgsType,
): Promise<ControllerResponse> {
	const methodLogger = logger.forMethod('searchFiles');
	methodLogger.debug('Searching widget files', args);

	try {
		// Determine search type based on query
		const searchType = args.includePattern?.includes('*')
			? 'filename'
			: 'exact';

		// Search using MongoDB (same as existing widget search)
		const matches = await searchInMongoDB(
			args.widgetId,
			args.query,
			searchType,
			50, // Reasonable limit
		);

		const result: FileSearchResult = {
			success: true,
			message: `Search completed. Found ${matches.length} matches`,
			matches,
			totalMatches: matches.length,
			searchPattern: args.query,
		};

		return {
			content: JSON.stringify(result, null, 2),
		};
	} catch (error) {
		methodLogger.error('Failed to search files', error);

		const result: FileSearchResult = {
			success: false,
			message: `Failed to search files in widget ${args.widgetId}`,
			error: error instanceof Error ? error.message : 'Unknown error',
		};

		return {
			content: JSON.stringify(result, null, 2),
		};
	}
}

/**
 * Replace lines in a file (search and replace)
 */
async function replaceLines(
	args: WidgetLineReplaceArgsType,
): Promise<ControllerResponse> {
	const methodLogger = logger.forMethod('replaceLines');
	methodLogger.debug('Replacing lines in widget file', {
		widgetId: args.widgetId,
		filePath: args.filePath,
		firstLine: args.firstReplacedLine,
		lastLine: args.lastReplacedLine,
	});

	try {
		// Get current file content
		const widgetData = await getWidgetFiles({
			widgetId: args.widgetId,
		});

		if (!widgetData?.files || !widgetData.files[args.filePath]) {
			const result: FileOperationResult = {
				success: false,
				message: `File ${args.filePath} not found`,
				filePath: args.filePath,
				error: 'File not found',
			};

			return {
				content: JSON.stringify(result, null, 2),
			};
		}

		const originalContent = widgetData.files[args.filePath];
		const lines = originalContent.split('\n');

		// Validate line numbers
		if (
			args.firstReplacedLine < 1 ||
			args.lastReplacedLine < 1 ||
			args.firstReplacedLine > lines.length ||
			args.lastReplacedLine > lines.length ||
			args.firstReplacedLine > args.lastReplacedLine
		) {
			const result: FileOperationResult = {
				success: false,
				message: `Invalid line range: ${args.firstReplacedLine}-${args.lastReplacedLine}`,
				filePath: args.filePath,
				error: 'Invalid line range',
			};

			return {
				content: JSON.stringify(result, null, 2),
			};
		}

		// Extract the content to be replaced
		const targetLines = lines.slice(
			args.firstReplacedLine - 1,
			args.lastReplacedLine,
		);
		const targetContent = targetLines.join('\n');

		// Handle ellipsis in search pattern
		const searchPattern = args.search.replace(/\.\.\./g, '.*?');
		const searchRegex = new RegExp(searchPattern, 's'); // 's' flag for dotall mode

		// Validate that the search pattern matches the target content
		if (!searchRegex.test(targetContent)) {
			const result: FileOperationResult = {
				success: false,
				message: `Search pattern does not match content at lines ${args.firstReplacedLine}-${args.lastReplacedLine}`,
				filePath: args.filePath,
				error: 'Search pattern mismatch',
			};

			return {
				content: JSON.stringify(result, null, 2),
			};
		}

		// Perform the replacement
		const newLines = [
			...lines.slice(0, args.firstReplacedLine - 1),
			...args.replace.split('\n'),
			...lines.slice(args.lastReplacedLine),
		];

		const newContent = newLines.join('\n');

		// Write the updated file
		const updateResult = await writeFile({
			widgetId: args.widgetId,
			filePath: args.filePath,
			content: newContent,
		});

		// Parse the write result to determine success
		const writeResponse = JSON.parse(updateResult.content);

		if (writeResponse.success) {
			const result: FileOperationResult = {
				success: true,
				message: `Successfully replaced lines ${args.firstReplacedLine}-${args.lastReplacedLine} in ${args.filePath}`,
				filePath: args.filePath,
			};

			return {
				content: JSON.stringify(result, null, 2),
			};
		} else {
			return updateResult; // Return the error from writeFile
		}
	} catch (error) {
		methodLogger.error('Failed to replace lines', error);

		const result: FileOperationResult = {
			success: false,
			message: `Failed to replace lines in file ${args.filePath}`,
			filePath: args.filePath,
			error: error instanceof Error ? error.message : 'Unknown error',
		};

		return {
			content: JSON.stringify(result, null, 2),
		};
	}
}

export default {
	writeFile,
	viewFile,
	deleteFile,
	searchFiles,
	replaceLines,
};
