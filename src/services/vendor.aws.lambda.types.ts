import { z } from 'zod';

/**
 * Zod schema for extracted file information.
 */
export const ExtractedFileSchema = z.object({
	url: z.string().describe('The URL of the file'),
	filename: z.string().describe('The filename extracted from the URL'),
	fileType: z.string().describe('The file extension/type'),
	isFile: z.boolean().describe('Whether this is a valid file type'),
});

/**
 * TypeScript type inferred from the ExtractedFileSchema.
 */
export type ExtractedFile = z.infer<typeof ExtractedFileSchema>;

/**
 * Zod schema for file content extraction result.
 */
export const FileContentResultSchema = z.object({
	filename: z.string().describe('The filename'),
	fileType: z.string().describe('The file type/extension'),
	url: z.string().describe('The file URL'),
	content: z.string().nullable().describe('The extracted content'),
	success: z.boolean().describe('Whether extraction was successful'),
	error: z.string().optional().describe('Error message if extraction failed'),
});

/**
 * TypeScript type inferred from the FileContentResultSchema.
 */
export type FileContentResult = z.infer<typeof FileContentResultSchema>;

/**
 * Zod schema for the complete file extraction response.
 */
export const FileExtractionResponseSchema = z.object({
	files: z
		.array(ExtractedFileSchema)
		.describe('Array of extracted file information'),
	fileContents: z
		.array(FileContentResultSchema)
		.describe('Array of file content extraction results'),
	message: z.string().describe('Summary message'),
	fileCount: z.number().describe('Total number of files found'),
	fileTypes: z.array(z.string()).describe('Unique file types found'),
	successCount: z.number().describe('Number of successfully processed files'),
	errorCount: z.number().describe('Number of files that failed to process'),
});

/**
 * TypeScript type inferred from the FileExtractionResponseSchema.
 */
export type FileExtractionResponse = z.infer<
	typeof FileExtractionResponseSchema
>;

/**
 * Request options for the AWS Lambda service.
 */
export type AWSLambdaRequestOptions = {
	messageContent: string;
	functionName?: string;
	timeout?: number;
};
