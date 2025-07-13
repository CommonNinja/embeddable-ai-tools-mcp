import { z } from 'zod';

/**
 * Zod schema for the OpenAI prompt enhancement result.
 */
export const OpenAIPromptEnhancementResultSchema = z.object({
	enhancedPrompt: z
		.string()
		.describe('The enhanced prompt optimized for better UX/UI output'),
	wasEnhanced: z
		.boolean()
		.describe('Whether the prompt was actually enhanced'),
	originalLength: z.number().describe('Length of the original prompt'),
	enhancedLength: z.number().describe('Length of the enhanced prompt'),
	improvementSuggestions: z
		.array(z.string())
		.optional()
		.describe('List of improvements made to the prompt'),
});

/**
 * TypeScript type inferred from the OpenAIPromptEnhancementResultSchema.
 */
export type OpenAIPromptEnhancementResult = z.infer<
	typeof OpenAIPromptEnhancementResultSchema
>;

/**
 * Request options for the OpenAI API service.
 */
export type OpenAIApiRequestOptions = {
	originalMessage: string;
	maxTokens?: number;
	temperature?: number;
	model?: string;
};
