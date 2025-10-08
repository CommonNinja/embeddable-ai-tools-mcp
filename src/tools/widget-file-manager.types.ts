import { z } from 'zod';

/**
 * Zod schema for widget file write arguments
 */
export const WidgetWriteFileArgs = z
	.object({
		widgetId: z
			.string()
			.describe('The unique identifier for the widget'),
		filePath: z
			.string()
			.describe('Relative path to the file (e.g., "/config.ts", "/components/Card.tsx")'),
		content: z
			.string()
			.describe('The complete file content to write'),
	})
	.strict();

/**
 * Zod schema for widget file view arguments
 */
export const WidgetViewFileArgs = z
	.object({
		widgetId: z
			.string()
			.describe('The unique identifier for the widget'),
		filePath: z
			.string()
			.describe('Relative path to the file to read'),
		lines: z
			.string()
			.optional()
			.describe('Line ranges to read (e.g., "1-50, 100-150"). If not specified, reads first 500 lines'),
	})
	.strict();

/**
 * Zod schema for widget file delete arguments
 */
export const WidgetDeleteFileArgs = z
	.object({
		widgetId: z
			.string()
			.describe('The unique identifier for the widget'),
		filePath: z
			.string()
			.describe('Relative path to the file to delete'),
		removeFromIndex: z
			.boolean()
			.optional()
			.default(true)
			.describe('Whether to remove the file from AI search index (default: true)'),
	})
	.strict();

/**
 * Zod schema for widget file search arguments
 */
export const WidgetSearchFilesArgs = z
	.object({
		widgetId: z
			.string()
			.describe('The unique identifier for the widget'),
		query: z
			.string()
			.describe('Regex pattern to search for (e.g., "useState", "handleSubmit\\\\(")'),
		includePattern: z
			.string()
			.describe('Files to include using glob syntax (e.g., "src/**", "**/*.tsx")'),
		excludePattern: z
			.string()
			.optional()
			.describe('Files to exclude using glob syntax (e.g., "**/*.test.tsx", "src/components/ui/**")'),
		caseSensitive: z
			.boolean()
			.optional()
			.default(false)
			.describe('Whether to match case (default: false)'),
		contextLines: z
			.number()
			.optional()
			.default(3)
			.describe('Number of lines of context to show around matches (default: 3)'),
	})
	.strict();

/**
 * Zod schema for widget line replace arguments
 */
export const WidgetLineReplaceArgs = z
	.object({
		widgetId: z
			.string()
			.describe('The unique identifier for the widget'),
		filePath: z
			.string()
			.describe('Relative path to the file to modify'),
		search: z
			.string()
			.describe('Content to search for (can use ellipsis ... for large sections)'),
		firstReplacedLine: z
			.number()
			.describe('First line number to replace (1-indexed)'),
		lastReplacedLine: z
			.number()
			.describe('Last line number to replace (1-indexed)'),
		replace: z
			.string()
			.describe('New content to replace the search content with'),
	})
	.strict();

/**
 * TypeScript types inferred from schemas
 */
export type WidgetWriteFileArgsType = z.infer<typeof WidgetWriteFileArgs>;
export type WidgetViewFileArgsType = z.infer<typeof WidgetViewFileArgs>;
export type WidgetDeleteFileArgsType = z.infer<typeof WidgetDeleteFileArgs>;
export type WidgetSearchFilesArgsType = z.infer<typeof WidgetSearchFilesArgs>;
export type WidgetLineReplaceArgsType = z.infer<typeof WidgetLineReplaceArgs>;

/**
 * Search result interface
 */
export interface SearchMatch {
	filePath: string;
	line: number;
	column: number;
	matchText: string;
	beforeContext: string[];
	afterContext: string[];
}

/**
 * File operation result interfaces
 */
export interface FileOperationResult {
	success: boolean;
	message: string;
	filePath?: string;
	error?: string;
}

export interface FileViewResult extends FileOperationResult {
	content?: string;
	totalLines?: number;
	linesShown?: string;
}

export interface FileSearchResult extends FileOperationResult {
	matches?: SearchMatch[];
	totalMatches?: number;
	searchPattern?: string;
}
