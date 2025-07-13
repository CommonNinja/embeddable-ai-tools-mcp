import { z } from 'zod';

/**
 * Zod schema for the file extractor tool arguments.
 */
export const FileExtractorToolArgs = z
	.object({
		messageContent: z
			.string()
			.describe(
				'The content of the user message to analyze for file URLs',
			),
	})
	.strict();

/**
 * TypeScript type inferred from the FileExtractorToolArgs Zod schema.
 */
export type FileExtractorToolArgsType = z.infer<typeof FileExtractorToolArgs>;
