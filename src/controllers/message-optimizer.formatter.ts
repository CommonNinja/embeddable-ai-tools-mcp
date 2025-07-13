import { OpenAIPromptEnhancementResult } from '../services/vendor.openai.com.types.js';
import {
	formatDate,
	formatHeading,
	formatBulletList,
	formatSeparator,
} from '../utils/formatter.util.js';

/**
 * Format message optimizer results into Markdown.
 * @param enhancementResult - Raw enhancement result from the OpenAI service.
 * @param originalMessage - The original message that was enhanced.
 * @returns Formatted Markdown string.
 */
export function formatMessageOptimizerResults(
	enhancementResult: OpenAIPromptEnhancementResult,
	originalMessage: string,
): string {
	const lines: string[] = [];

	// Add a main heading
	lines.push(formatHeading('Message Optimization Results', 1));
	lines.push('');

	// Add optimization summary
	lines.push(formatHeading('Optimization Summary', 2));

	const summaryInfo: Record<string, unknown> = {
		'Was Enhanced': enhancementResult.wasEnhanced ? 'Yes' : 'No',
		'Original Length': `${enhancementResult.originalLength} characters`,
		'Enhanced Length': `${enhancementResult.enhancedLength} characters`,
		'Improvement Ratio': enhancementResult.wasEnhanced
			? `${((enhancementResult.enhancedLength / enhancementResult.originalLength) * 100).toFixed(1)}%`
			: 'N/A',
	};

	lines.push(formatBulletList(summaryInfo));
	lines.push('');

	// Add improvements section if any
	if (
		enhancementResult.improvementSuggestions &&
		enhancementResult.improvementSuggestions.length > 0
	) {
		lines.push(formatHeading('Improvements Made', 2));
		lines.push('');

		enhancementResult.improvementSuggestions.forEach((suggestion) => {
			lines.push(`- ${suggestion}`);
		});
		lines.push('');
	}

	// Add original message
	lines.push(formatHeading('Original Message', 2));
	lines.push('');
	lines.push(`> ${originalMessage}`);
	lines.push('');

	// Add enhanced message
	lines.push(formatHeading('Enhanced Message', 2));
	lines.push('');
	lines.push(`> ${enhancementResult.enhancedPrompt}`);
	lines.push('');

	// Add usage instructions
	if (enhancementResult.wasEnhanced) {
		lines.push(formatHeading('Next Steps', 2));
		lines.push('');
		lines.push(
			'The enhanced message above includes improved UX/UI specifications and should be used for widget creation.',
		);
		lines.push('');
	}

	// Add a separator
	lines.push(formatSeparator());

	// Add a timestamp footer
	lines.push(`*Message optimized at ${formatDate(new Date())}*`);

	return lines.join('\n');
}
