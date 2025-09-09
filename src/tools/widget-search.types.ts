import { z } from 'zod';

/**
 * Zod schema for the widget search tool arguments.
 */
export const WidgetSearchToolArgs = z
	.object({
		widgetId: z
			.string()
			.describe('The unique identifier for the widget'),
		query: z
			.string()
			.describe('Search term for finding files (e.g., "button", "config", "authentication")'),
		searchType: z
			.enum(['semantic', 'exact', 'filename'])
			.optional()
			.default('semantic')
			.describe(
				'Type of search: semantic (vector/AI search for concepts), exact (text matching), filename (file name matching)',
			),
		limit: z
			.number()
			.optional()
			.default(10)
			.describe('Maximum number of results to return (default: 10)'),
	})
	.strict();

/**
 * TypeScript type inferred from the WidgetSearchToolArgs Zod schema.
 */
export type WidgetSearchToolArgsType = z.infer<typeof WidgetSearchToolArgs>;

/**
 * Search result interface
 */
export interface SearchResult {
	filePath: string;
	content: string;
	lineStart: number;
	lineEnd: number;
	matchType: 'semantic' | 'exact' | 'filename';
	score?: number;
	granularity?: string;
}