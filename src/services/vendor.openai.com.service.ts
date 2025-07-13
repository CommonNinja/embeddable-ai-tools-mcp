import OpenAI from 'openai';
import { Logger } from '../utils/logger.util.js';
import {
	OpenAIPromptEnhancementResult,
	OpenAIPromptEnhancementResultSchema,
	OpenAIApiRequestOptions,
} from './vendor.openai.com.types.js';
import {
	createApiError,
	createUnexpectedError,
	McpError,
} from '../utils/error.util.js';

// Create a contextualized logger for this file
const serviceLogger = Logger.forContext(
	'services/vendor.openai.com.service.ts',
);

// Log service initialization
serviceLogger.debug('OpenAI API service initialized');

/**
 * @namespace VendorOpenAIService
 * @description Service layer for interacting directly with the OpenAI API.
 *              Responsible for enhancing user prompts for better UX/UI widget creation.
 */

/**
 * @function enhancePrompt
 * @description Enhances a user prompt using OpenAI to improve UX/UI specifications.
 * @memberof VendorOpenAIService
 * @param {OpenAIApiRequestOptions} options - Enhancement options including the original message
 * @returns {Promise<OpenAIPromptEnhancementResult>} A promise that resolves to the enhanced prompt
 * @throws {McpError} Throws an `McpError` if the API call fails or returns an error
 */
async function enhancePrompt(
	options: OpenAIApiRequestOptions,
): Promise<OpenAIPromptEnhancementResult> {
	const methodLogger = Logger.forContext(
		'services/vendor.openai.com.service.ts',
		'enhancePrompt',
	);
	methodLogger.debug('Enhancing prompt with options:', options);

	try {
		// Check if API key is configured
		const apiKey = process.env.OPENAI_API_KEY;
		if (!apiKey) {
			methodLogger.warn('OPENAI_API_KEY not configured');
			throw createApiError(
				'OPENAI_API_KEY environment variable is not configured',
			);
		}

		// Initialize OpenAI client
		const openai = new OpenAI({
			apiKey: apiKey,
		});

		// Create the system prompt for enhancement
		const systemPrompt = `You are a UX/UI expert specializing in modern web widget design. Your task is to enhance user prompts to create better widget specifications.

When enhancing prompts, focus on:
- Modern UI/UX best practices
- Accessibility considerations (ARIA labels, keyboard navigation, color contrast)
- Responsive design principles
- Clean, minimalist aesthetics
- Interactive elements and micro-interactions
- Performance considerations
- Mobile-first approach

Return an enhanced version of the user's prompt that includes:
- Specific design guidelines
- Accessibility requirements
- Technical specifications
- Color scheme suggestions
- Typography recommendations
- Layout structure details

Only enhance the prompt if it can be significantly improved. If the original prompt is already comprehensive, return it unchanged.

Important: Do not include any URLs in your response. Focus only on design specifications and requirements.`;

		// Call OpenAI API
		const completion = await openai.chat.completions.create({
			model: options.model || 'gpt-4.1-nano',
			messages: [
				{
					role: 'system',
					content: systemPrompt,
				},
				{
					role: 'user',
					content: `Please enhance this widget creation prompt: "${options.originalMessage}"`,
				},
			],
			max_tokens: options.maxTokens || 500,
			temperature: options.temperature || 0.7,
		});

		const enhancedPrompt = completion.choices[0]?.message?.content || '';

		if (!enhancedPrompt) {
			methodLogger.warn('No enhanced prompt returned from OpenAI');
			throw createApiError('No enhanced prompt returned from OpenAI API');
		}

		// Determine if the prompt was actually enhanced
		const wasEnhanced =
			enhancedPrompt.trim() !== options.originalMessage.trim() &&
			enhancedPrompt.length > options.originalMessage.length;

		// Create basic improvement suggestions
		const improvementSuggestions: string[] = [];
		if (wasEnhanced) {
			if (enhancedPrompt.includes('accessibility')) {
				improvementSuggestions.push(
					'Added accessibility considerations',
				);
			}
			if (enhancedPrompt.includes('responsive')) {
				improvementSuggestions.push('Added responsive design guidance');
			}
			if (enhancedPrompt.includes('color')) {
				improvementSuggestions.push(
					'Added color scheme recommendations',
				);
			}
			if (enhancedPrompt.includes('typography')) {
				improvementSuggestions.push('Added typography specifications');
			}
		}

		const result: OpenAIPromptEnhancementResult = {
			enhancedPrompt: enhancedPrompt.trim(),
			wasEnhanced,
			originalLength: options.originalMessage.length,
			enhancedLength: enhancedPrompt.length,
			improvementSuggestions,
		};

		// Validate the result against our schema
		const validationResult =
			OpenAIPromptEnhancementResultSchema.safeParse(result);
		if (!validationResult.success) {
			methodLogger.warn(
				'Invalid enhancement result:',
				validationResult.error,
			);
			throw createUnexpectedError(
				'Invalid enhancement result received from OpenAI API',
			);
		}

		methodLogger.debug(
			`Successfully enhanced prompt (${options.originalMessage.length} -> ${enhancedPrompt.length} chars)`,
		);

		return validationResult.data;
	} catch (error) {
		// If it's already an McpError, re-throw it
		if (error instanceof McpError) {
			throw error;
		}

		// Handle unexpected errors
		methodLogger.error(
			'Unexpected error during prompt enhancement:',
			error,
		);
		throw createUnexpectedError(
			`Unexpected error during prompt enhancement: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

export default {
	enhancePrompt,
};
