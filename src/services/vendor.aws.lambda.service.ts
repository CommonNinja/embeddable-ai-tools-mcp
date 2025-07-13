import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { Logger } from '../utils/logger.util.js';
import {
	FileExtractionResponse,
	FileExtractionResponseSchema,
	AWSLambdaRequestOptions,
	ExtractedFile,
	FileContentResult,
} from './vendor.aws.lambda.types.js';
import {
	createApiError,
	createUnexpectedError,
	McpError,
} from '../utils/error.util.js';

// Create a contextualized logger for this file
const serviceLogger = Logger.forContext(
	'services/vendor.aws.lambda.service.ts',
);

// Log service initialization
serviceLogger.debug('AWS Lambda service initialized');

// Timeout for Lambda function calls
const LAMBDA_TIMEOUT = 45000; // 45 seconds

/**
 * @namespace VendorAWSLambdaService
 * @description Service layer for interacting with AWS Lambda for file extraction.
 *              Responsible for extracting file URLs from messages and getting their content.
 */

// Helper function to create a timeout promise
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
	return Promise.race([
		promise,
		new Promise<T>((_, reject) =>
			setTimeout(
				() =>
					reject(
						new Error(`Operation timed out after ${timeoutMs}ms`),
					),
				timeoutMs,
			),
		),
	]);
}

/**
 * @function invokeLambda
 * @description Invokes an AWS Lambda function with the given payload.
 * @param functionName - The name of the Lambda function to invoke
 * @param payload - The payload to send to the Lambda function
 * @returns The response from the Lambda function
 */
async function invokeLambda(
	functionName: string,
	payload: Record<string, unknown>,
) {
	const methodLogger = Logger.forContext(
		'services/vendor.aws.lambda.service.ts',
		'invokeLambda',
	);

	// Check if AWS credentials are configured
	const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
	const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

	if (!accessKeyId || !secretAccessKey) {
		methodLogger.warn('AWS credentials not configured');
		throw createApiError(
			'AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables are required',
		);
	}

	// Initialize AWS Lambda client
	const lambdaClient = new LambdaClient({
		region: 'us-east-1',
		credentials: {
			accessKeyId,
			secretAccessKey,
		},
	});

	const command = new InvokeCommand({
		FunctionName: functionName,
		Payload: JSON.stringify({
			body: payload,
			headers: {
				'ninja-secret': process.env.COMMONNINJA_SECRET,
			},
		}),
	});

	const response = await withTimeout(
		lambdaClient.send(command),
		LAMBDA_TIMEOUT,
	);

	if (response.StatusCode !== 200) {
		throw new Error(
			`Lambda invocation failed with status: ${response.StatusCode}`,
		);
	}

	if (response.FunctionError) {
		throw new Error(`Lambda function error: ${response.FunctionError}`);
	}

	if (!response.Payload) {
		return null;
	}

	// Parse the response payload
	const responsePayload = Buffer.from(response.Payload).toString('utf-8');
	const parsedResponse = JSON.parse(responsePayload);
	return parsedResponse.body;
}

/**
 * @function extractFilesFromMessage
 * @description Extracts file URLs from a message and retrieves their content.
 * @memberof VendorAWSLambdaService
 * @param options - Options including the message content to analyze
 * @returns Promise resolving to file extraction results
 */
async function extractFilesFromMessage(
	options: AWSLambdaRequestOptions,
): Promise<FileExtractionResponse> {
	const methodLogger = Logger.forContext(
		'services/vendor.aws.lambda.service.ts',
		'extractFilesFromMessage',
	);
	methodLogger.debug('Extracting files from message:', options);

	try {
		// Common file extensions to look for
		const fileExtensions = [
			'pdf',
			'csv',
			'txt',
			'doc',
			'docx',
			'xls',
			'xlsx',
			'xml',
			'md',
		];

		// URL regex pattern that matches markdown links and plain URLs
		const urlRegex = /\[([^\]]+)\]\(([^)]+)\)|(https?:\/\/[^\s\n]+)/gi;

		const extractedFiles: ExtractedFile[] = [];

		let match;
		while ((match = urlRegex.exec(options.messageContent)) !== null) {
			let url: string;
			let filename: string;

			if (match[1] && match[2]) {
				// Markdown link format: [text](url)
				filename = match[1];
				url = match[2];
			} else if (match[3]) {
				// Plain URL format
				url = match[3];
				// Extract filename from URL
				try {
					const urlObj = new URL(url);
					filename = urlObj.pathname.split('/').pop() || 'unknown';
				} catch {
					filename = 'unknown';
				}
			} else {
				continue;
			}

			// Determine if it's a file based on extension
			const fileExtension = filename.split('.').pop()?.toLowerCase();
			const isFile = fileExtension
				? fileExtensions.includes(fileExtension)
				: false;

			if (isFile) {
				extractedFiles.push({
					url,
					filename,
					fileType: fileExtension || 'unknown',
					isFile,
				});
			}
		}

		if (extractedFiles.length === 0) {
			return {
				files: [],
				fileContents: [],
				message: 'No file URLs found in the message.',
				fileCount: 0,
				fileTypes: [],
				successCount: 0,
				errorCount: 0,
			};
		}

		methodLogger.debug(
			`Found ${extractedFiles.length} file(s):`,
			extractedFiles,
		);

		// Extract content from each file using the Lambda API
		const fileContents: FileContentResult[] = [];

		for (const file of extractedFiles) {
			try {
				const response = await invokeLambda('read-file-lambda', {
					type: file.fileType,
					url: file.url
						.replace('localhost:3000', 'embeddable.co')
						.replace('http://', 'https://'),
				});

				methodLogger.debug('Lambda response:', response);

				let content: string;
				if (
					[
						'txt',
						'csv',
						'md',
						'mdx',
						'doc',
						'docx',
						'xls',
						'xlsx',
					].includes(file.fileType)
				) {
					// For text-based files, content is a string
					content = String(response).slice(0, 10000);
				} else if (file.fileType === 'pdf') {
					// For PDF files, content is in response.content array
					content = (response as Array<{ content: string }>)
						.map((i) => `${i.content}`)
						.join(' ')
						.slice(0, 10000);
				} else {
					// For other file types, try to handle as string
					content = 'Unsupported file type';
				}

				fileContents.push({
					filename: file.filename,
					fileType: file.fileType,
					url: file.url,
					content,
					success: true,
				});
			} catch (error) {
				methodLogger.error(
					`Error extracting content from ${file.filename}:`,
					error,
				);

				let errorMessage = 'Unknown error';
				if (error instanceof Error) {
					if (error.message.includes('timeout')) {
						errorMessage =
							'File processing timed out - the file may be too large or the service is slow';
					} else {
						errorMessage = error.message;
					}
				}

				fileContents.push({
					filename: file.filename,
					fileType: file.fileType,
					url: file.url,
					content: null,
					error: errorMessage,
					success: false,
				});
			}
		}

		const result: FileExtractionResponse = {
			files: extractedFiles,
			fileContents,
			message: `Successfully extracted content from ${
				fileContents.filter((f) => f.success).length
			} out of ${extractedFiles.length} file(s).`,
			fileCount: extractedFiles.length,
			fileTypes: [...new Set(extractedFiles.map((f) => f.fileType))],
			successCount: fileContents.filter((f) => f.success).length,
			errorCount: fileContents.filter((f) => !f.success).length,
		};

		// Validate the result against our schema
		const validationResult = FileExtractionResponseSchema.safeParse(result);
		if (!validationResult.success) {
			methodLogger.warn(
				'Invalid extraction result:',
				validationResult.error,
			);
			throw createUnexpectedError(
				'Invalid extraction result received from Lambda service',
			);
		}

		methodLogger.debug(
			`Successfully processed ${result.successCount}/${result.fileCount} files`,
		);

		return validationResult.data;
	} catch (error) {
		// If it's already an McpError, re-throw it
		if (error instanceof McpError) {
			throw error;
		}

		// Handle unexpected errors
		methodLogger.error('Unexpected error during file extraction:', error);
		throw createUnexpectedError(
			`Unexpected error during file extraction: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

export default {
	extractFilesFromMessage,
};
