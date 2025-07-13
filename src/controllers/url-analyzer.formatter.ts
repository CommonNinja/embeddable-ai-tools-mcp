import { Logger } from '../utils/logger.util.js';
import type { AnalysisResult } from '../tools/url-analyzer.types.js';

/**
 * URL analyzer formatter for standardizing output
 */
class UrlAnalyzerFormatter {
	private logger = Logger.forContext('controllers/url-analyzer.formatter.ts');

	/**
	 * Format the analysis result for MCP tool response
	 */
	formatAnalysisResult(
		result: AnalysisResult,
		outputFormat: string = 'structured',
	): string {
		const methodLogger = this.logger.forMethod('formatAnalysisResult');
		methodLogger.debug('Formatting analysis result', { outputFormat });

		try {
			switch (outputFormat) {
				case 'json':
					return this.formatAsJson(result);
				case 'markdown':
					return this.formatAsMarkdown(result);
				case 'code':
					return this.formatAsCode(result);
				case 'structured':
				default:
					return this.formatAsStructured(result);
			}
		} catch (error) {
			methodLogger.error('Error formatting result', { error });
			return this.formatError(error);
		}
	}

	/**
	 * Format as JSON
	 */
	private formatAsJson(result: AnalysisResult): string {
		return JSON.stringify(result, null, 2);
	}

	/**
	 * Format as structured text for best readability
	 */
	private formatAsStructured(result: AnalysisResult): string {
		const sections: string[] = [];

		// Header
		sections.push('🎨 URL ANALYSIS REPORT');
		sections.push(''.padEnd(50, '='));
		sections.push('');
		sections.push(`📍 URL: ${result.url}`);
		sections.push(`📄 Type: ${result.contentType.toUpperCase()}`);
		sections.push(
			`⏰ Analyzed: ${new Date(result.timestamp).toLocaleString()}`,
		);
		sections.push('');

		// Analysis sections
		this.addAnalysisSection(
			sections,
			'LAYOUT & STRUCTURE',
			result.analysis.layout,
		);
		this.addAnalysisSection(
			sections,
			'COLOR PALETTE',
			result.analysis.colors,
		);
		this.addAnalysisSection(
			sections,
			'TYPOGRAPHY',
			result.analysis.typography,
		);
		this.addAnalysisSection(
			sections,
			'COMPONENTS',
			result.analysis.components,
		);
		this.addAnalysisSection(sections, 'CONTENT', result.analysis.content);
		this.addAnalysisSection(
			sections,
			'FUNCTIONALITY',
			result.analysis.functionality,
		);
		this.addAnalysisSection(
			sections,
			'UX PATTERNS',
			result.analysis.ux_patterns,
		);
		this.addAnalysisSection(
			sections,
			'RESPONSIVE DESIGN',
			result.analysis.responsive_design,
		);
		this.addAnalysisSection(
			sections,
			'ACCESSIBILITY',
			result.analysis.accessibility,
		);

		// Suggestions
		if (result.suggestions && result.suggestions.length > 0) {
			sections.push('💡 IMPLEMENTATION SUGGESTIONS');
			sections.push(''.padEnd(40, '-'));
			result.suggestions.forEach((suggestion, index) => {
				sections.push(`${index + 1}. ${suggestion}`);
			});
			sections.push('');
		}

		// Code examples
		if (result.codeExamples && result.codeExamples.length > 0) {
			sections.push('🔧 CODE EXAMPLES');
			sections.push(''.padEnd(30, '-'));
			result.codeExamples.forEach((example) => {
				sections.push('');
				sections.push(
					`📋 ${example.component_name} (${example.framework})`,
				);
				sections.push('```');
				sections.push(example.code);
				sections.push('```');
				sections.push(`💬 ${example.description}`);
			});
		}

		return sections.join('\n');
	}

	/**
	 * Format as markdown
	 */
	private formatAsMarkdown(result: AnalysisResult): string {
		const sections: string[] = [];

		// Header
		sections.push('# 🎨 URL Analysis Report');
		sections.push('');
		sections.push(`**📍 URL:** ${result.url}`);
		sections.push(`**📄 Type:** ${result.contentType}`);
		sections.push(
			`**⏰ Analyzed:** ${new Date(result.timestamp).toLocaleString()}`,
		);
		sections.push('');

		// Analysis sections
		Object.entries(result.analysis).forEach(([key, value]) => {
			if (value) {
				const title = key.replace(/_/g, ' ').toUpperCase();
				sections.push(`## ${title}`);
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

		// Suggestions
		if (result.suggestions && result.suggestions.length > 0) {
			sections.push('## 💡 Implementation Suggestions');
			sections.push('');
			result.suggestions.forEach((suggestion) => {
				sections.push(`- ${suggestion}`);
			});
			sections.push('');
		}

		// Code examples
		if (result.codeExamples && result.codeExamples.length > 0) {
			sections.push('## 🔧 Code Examples');
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
				sections.push(`> ${example.description}`);
				sections.push('');
			});
		}

		return sections.join('\n');
	}

	/**
	 * Format as code-focused output
	 */
	private formatAsCode(result: AnalysisResult): string {
		const sections: string[] = [];

		// Header comment
		sections.push(`/* ====================================== */`);
		sections.push(`/* URL ANALYSIS: ${result.url} */`);
		sections.push(`/* Type: ${result.contentType} */`);
		sections.push(
			`/* Generated: ${new Date(result.timestamp).toLocaleString()} */`,
		);
		sections.push(`/* ====================================== */`);
		sections.push('');

		// CSS Variables from color analysis
		if (result.analysis.colors) {
			sections.push('/* CSS VARIABLES */');
			sections.push(':root {');
			sections.push('  /* Primary Colors */');
			sections.push('  --primary-color: #your-primary-color;');
			sections.push('  --secondary-color: #your-secondary-color;');
			sections.push('  --accent-color: #your-accent-color;');
			sections.push('  ');
			sections.push('  /* Text Colors */');
			sections.push('  --text-primary: #your-text-color;');
			sections.push('  --text-secondary: #your-secondary-text;');
			sections.push('  ');
			sections.push('  /* Background Colors */');
			sections.push('  --bg-primary: #your-bg-color;');
			sections.push('  --bg-secondary: #your-secondary-bg;');
			sections.push('}');
			sections.push('');
		}

		// Layout information as CSS comments
		if (result.analysis.layout) {
			sections.push('/* LAYOUT STRUCTURE */');
			sections.push('/*');
			sections.push(' * Grid System: Flexbox/Grid');
			sections.push(' * Container Width: 1200px max');
			sections.push(' * Spacing Unit: 8px base');
			sections.push(' * Breakpoints: 768px, 1024px, 1200px');
			sections.push(' */');
			sections.push('');
		}

		// Component examples
		if (result.codeExamples && result.codeExamples.length > 0) {
			sections.push('/* COMPONENT IMPLEMENTATIONS */');
			sections.push('');
			result.codeExamples.forEach((example) => {
				sections.push(
					`/* ${example.component_name.toUpperCase()} - ${example.framework} */`,
				);
				sections.push(example.code);
				sections.push('');
			});
		}

		return sections.join('\n');
	}

	/**
	 * Add analysis section to output
	 */
	private addAnalysisSection(
		sections: string[],
		title: string,
		data: unknown,
	): void {
		if (!data) return;

		sections.push(`🎯 ${title}`);
		sections.push(''.padEnd(title.length + 3, '-'));

		if (typeof data === 'object') {
			Object.entries(data).forEach(([key, value]) => {
				if (value) {
					const formattedKey = key.replace(/_/g, ' ').toUpperCase();
					sections.push(`${formattedKey}: ${value}`);
				}
			});
		} else {
			sections.push(String(data));
		}

		sections.push('');
	}

	/**
	 * Format error messages
	 */
	private formatError(error: unknown): string {
		return `❌ Analysis Error\n\n${error instanceof Error ? error.message : 'Unknown error occurred'}`;
	}

	/**
	 * Format success message with summary
	 */
	formatSuccess(url: string, analysisType: string): string {
		return `✅ Successfully analyzed ${analysisType} from: ${url}`;
	}

	/**
	 * Format streaming progress message
	 */
	formatProgress(stage: string, url: string): string {
		const stages = {
			detecting: '🔍 Detecting content type...',
			capturing: '📸 Capturing screenshot...',
			analyzing: '🧠 Analyzing with AI...',
			formatting: '📝 Formatting results...',
		};

		return `${stages[stage as keyof typeof stages] || stage} for ${url}`;
	}
}

export default new UrlAnalyzerFormatter();
