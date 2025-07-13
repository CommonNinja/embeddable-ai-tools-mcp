import { z } from 'zod';

/**
 * Zod schema for the Unsplash image search tool arguments.
 */
export const UnsplashToolArgs = z
	.object({
		query: z
			.string()
			.describe(
				'Search term for finding images (e.g., "elephant", "nature", "city")',
			),
		count: z
			.number()
			.optional()
			.default(1)
			.describe('Number of images to return (default: 1)'),
		orientation: z
			.enum(['landscape', 'portrait', 'squarish'])
			.optional()
			.default('landscape')
			.describe('Image orientation preference (default: landscape)'),
	})
	.strict();

/**
 * TypeScript type inferred from the UnsplashToolArgs Zod schema.
 * This represents the arguments passed to the tool handler and controller.
 */
export type UnsplashToolArgsType = z.infer<typeof UnsplashToolArgs>;
