import { z } from 'zod';

/**
 * Zod schema for the message optimizer tool arguments.
 */
export const MessageOptimizerToolArgs = z
	.object({
		originalMessage: z
			.string()
			.describe(
				'The original first user message that needs optimization for better UX/UI output',
			),
		isFirstMessage: z
			.boolean()
			.optional()
			.default(true)
			.describe(
				'Indicates if this is the first user message in the conversation (should be true when calling this tool)',
			),
	})
	.strict();

/**
 * TypeScript type inferred from the MessageOptimizerToolArgs Zod schema.
 */
export type MessageOptimizerToolArgsType = z.infer<
	typeof MessageOptimizerToolArgs
>;
