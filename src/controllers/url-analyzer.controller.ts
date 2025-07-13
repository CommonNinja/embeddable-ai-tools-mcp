import { Logger } from '../utils/logger.util.js';
import {
	createAnalysisPrompt,
	analyzeImageWithClaude,
	getUrlContentType,
	scrapeWithJina,
} from '../utils/url-analyzer.util.js';
import type {
	UrlAnalyzerToolArgs,
	AnalysisResult,
	CodeExample,
	LayoutAnalysis,
	ColorAnalysis,
	TypographyAnalysis,
	ComponentAnalysis,
	ContentAnalysis,
	FunctionalityAnalysis,
	UXPatternsAnalysis,
	ResponsiveDesignAnalysis,
	AccessibilityAnalysis,
} from '../tools/url-analyzer.types.js';
import { z } from 'zod';

/**
 * URL analyzer controller for handling analysis requests
 */
class UrlAnalyzerController {
	private logger = Logger.forContext(
		'controllers/url-analyzer.controller.ts',
	);

	/**
	 * Analyze a URL for design, components, and content
	 */
	async analyze(
		args: z.infer<typeof UrlAnalyzerToolArgs>,
	): Promise<{ content: string }> {
		const methodLogger = this.logger.forMethod('analyze');
		methodLogger.debug('Starting URL analysis', { url: args.url });

		try {
			// Validate URL
			const url = new URL(args.url);
			methodLogger.debug('URL validated', { url: url.toString() });

			// Determine content type
			const contentType = await getUrlContentType(args.url);
			methodLogger.debug('Content type detected', { contentType });

			const isImageUrl = contentType.startsWith('image/');
			let analysisInput = '';

			if (isImageUrl) {
				methodLogger.debug('Processing as image URL');
				analysisInput = args.url;
			} else {
				methodLogger.debug('Processing as website URL');
				// Scrape website for screenshot
				const jinaResult = await scrapeWithJina(args.url);

				if (!jinaResult.screenshotUrl) {
					throw new Error(
						'Failed to capture website screenshot. The website may not be accessible or may block automated tools.',
					);
				}

				analysisInput = jinaResult.screenshotUrl;
				methodLogger.debug('Screenshot captured', {
					screenshotUrl: jinaResult.screenshotUrl,
				});
			}

			// Create analysis prompt
			const prompt = createAnalysisPrompt(
				args.aspects || [
					'design',
					'content',
					'functionality',
					'colors',
					'typography',
					'layout',
					'components',
				],
				args.focus || 'design_inspiration',
				!isImageUrl,
				args.custom_requirements,
			);

			methodLogger.debug('Analysis prompt created');

			// Analyze with Claude
			const analysisResult = await analyzeImageWithClaude(
				analysisInput,
				prompt,
			);

			methodLogger.debug('Analysis completed successfully');

			// Create result object
			const result: AnalysisResult = {
				url: args.url,
				contentType: isImageUrl ? 'image' : 'website',
				analysis: this.parseAnalysisResult(analysisResult),
				suggestions: this.extractSuggestions(analysisResult),
				codeExamples: args.include_code_examples
					? this.extractCodeExamples(
							analysisResult,
							args.target_framework,
						)
					: undefined,
				timestamp: new Date().toISOString(),
			};

			return {
				content: this.formatOutput(
					result,
					args.output_format || 'structured',
				),
			};
		} catch (error) {
			methodLogger.error('Error in URL analysis', { error });
			throw error;
		}
	}

	/**
	 * Parse analysis result into structured format
	 */
	private parseAnalysisResult(
		analysisText: string,
	): AnalysisResult['analysis'] {
		// This is a simplified parser - in production, you might want more sophisticated parsing
		return {
			layout: this.extractSection(
				analysisText,
				'Layout',
			) as unknown as LayoutAnalysis,
			colors: this.extractSection(
				analysisText,
				'Color',
			) as unknown as ColorAnalysis,
			typography: this.extractSection(
				analysisText,
				'Typography',
			) as unknown as TypographyAnalysis,
			components: this.extractSection(
				analysisText,
				'Component',
			) as unknown as ComponentAnalysis,
			content: this.extractSection(
				analysisText,
				'Content',
			) as unknown as ContentAnalysis,
			functionality: this.extractSection(
				analysisText,
				'Functionality',
			) as unknown as FunctionalityAnalysis,
			ux_patterns: this.extractSection(
				analysisText,
				'UX',
			) as unknown as UXPatternsAnalysis,
			responsive_design: this.extractSection(
				analysisText,
				'Responsive',
			) as unknown as ResponsiveDesignAnalysis,
			accessibility: this.extractSection(
				analysisText,
				'Accessibility',
			) as unknown as AccessibilityAnalysis,
		};
	}

	/**
	 * Extract a specific section from analysis text
	 */
	private extractSection(
		text: string,
		sectionName: string,
	): Record<string, string> | undefined {
		const regex = new RegExp(
			`\\*\\*${sectionName}[^:]*:\\*\\*([\\s\\S]*?)(?=\\*\\*|$)`,
			'i',
		);
		const match = text.match(regex);

		if (match && match[1]) {
			const content = match[1].trim();
			return {
				structure: content,
				grid_system: content,
				spacing: content,
				alignment: content,
				dimensions: content,
			};
		}

		return undefined;
	}

	/**
	 * Extract suggestions from analysis result
	 */
	private extractSuggestions(analysisText: string): string[] {
		const suggestions: string[] = [];
		const lines = analysisText.split('\n');

		for (const line of lines) {
			if (line.includes('suggestion') || line.includes('recommend')) {
				suggestions.push(line.trim());
			}
		}

		return suggestions.length > 0 ? suggestions : [];
	}

	/**
	 * Extract code examples from analysis result
	 */
	private extractCodeExamples(
		analysisText: string,
		framework?: string,
	): CodeExample[] {
		// Simple code extraction - could be enhanced with better parsing
		const codeBlocks = analysisText.match(/```[\s\S]*?```/g) || [];

		return codeBlocks.map((block, index) => ({
			framework: framework || 'HTML/CSS',
			component_name: `Component_${index + 1}`,
			code: block.replace(/```/g, '').trim(),
			description: `Extracted code example ${index + 1}`,
		}));
	}

	/**
	 * Format output based on specified format
	 */
	private formatOutput(
		result: AnalysisResult,
		format: 'structured' | 'json' | 'markdown' | 'code',
	): string {
		switch (format) {
			case 'json':
				return JSON.stringify(result, null, 2);

			case 'markdown':
				return this.formatAsMarkdown(result);

			case 'code':
				return this.formatAsCode(result);

			case 'structured':
			default:
				return this.formatAsStructured(result);
		}
	}

	/**
	 * Format result as structured text
	 */
	private formatAsStructured(result: AnalysisResult): string {
		const sections = [
			`# URL Analysis Report`,
			``,
			`**URL:** ${result.url}`,
			`**Type:** ${result.contentType}`,
			`**Analyzed:** ${new Date(result.timestamp).toLocaleString()}`,
			``,
		];

		// Add analysis sections
		Object.entries(result.analysis).forEach(([key, value]) => {
			if (value) {
				sections.push(`## ${key.replace(/_/g, ' ').toUpperCase()}`);
				sections.push('');

				if (typeof value === 'object') {
					Object.entries(value).forEach(([subKey, subValue]) => {
						if (subValue) {
							sections.push(
								`**${subKey.replace(/_/g, ' ')}:** ${subValue}`,
							);
						}
					});
				} else {
					sections.push(String(value));
				}

				sections.push('');
			}
		});

		// Add suggestions if available
		if (result.suggestions && result.suggestions.length > 0) {
			sections.push('## SUGGESTIONS');
			sections.push('');
			result.suggestions.forEach((suggestion) => {
				sections.push(`- ${suggestion}`);
			});
			sections.push('');
		}

		// Add code examples if available
		if (result.codeExamples && result.codeExamples.length > 0) {
			sections.push('## CODE EXAMPLES');
			sections.push('');
			result.codeExamples.forEach((example) => {
				sections.push(
					`### ${example.component_name} (${example.framework})`,
				);
				sections.push('');
				sections.push('```');
				sections.push(example.code);
				sections.push('```');
				sections.push('');
				sections.push(example.description);
				sections.push('');
			});
		}

		return sections.join('\n');
	}

	/**
	 * Format result as markdown
	 */
	private formatAsMarkdown(result: AnalysisResult): string {
		// Similar to structured but with proper markdown formatting
		return this.formatAsStructured(result);
	}

	/**
	 * Format result with focus on code implementation
	 */
	private formatAsCode(result: AnalysisResult): string {
		const sections = [
			`/* URL Analysis: ${result.url} */`,
			`/* Type: ${result.contentType} */`,
			`/* Generated: ${new Date(result.timestamp).toLocaleString()} */`,
			``,
		];

		// Focus on actionable code-related information
		if (result.analysis.colors) {
			sections.push('/* COLOR PALETTE */');
			sections.push(':root {');
			// This would be enhanced to extract actual color values
			sections.push('  --primary-color: #000000;');
			sections.push('  --secondary-color: #ffffff;');
			sections.push('}');
			sections.push('');
		}

		if (result.codeExamples && result.codeExamples.length > 0) {
			sections.push('/* COMPONENT EXAMPLES */');
			result.codeExamples.forEach((example) => {
				sections.push(`/* ${example.component_name} */`);
				sections.push(example.code);
				sections.push('');
			});
		}

		return sections.join('\n');
	}
}

export default new UrlAnalyzerController();
