import { z } from 'zod';

/**
 * Available analysis aspects for URL analysis
 */
export const AnalysisAspects = [
	'design',
	'content',
	'functionality',
	'colors',
	'typography',
	'layout',
	'components',
	'ux_patterns',
	'responsive_design',
	'accessibility',
] as const;

export type AnalysisAspect = (typeof AnalysisAspects)[number];

/**
 * Output format options for analysis results
 */
export const OutputFormats = [
	'structured',
	'json',
	'markdown',
	'code',
] as const;
export type OutputFormat = (typeof OutputFormats)[number];

/**
 * Analysis focus areas for different use cases
 */
export const AnalysisFocus = [
	'widget_creation',
	'design_inspiration',
	'component_library',
	'full_replication',
	'content_extraction',
	'ux_research',
] as const;
export type AnalysisFocusType = (typeof AnalysisFocus)[number];

/**
 * Zod schema for URL analyzer tool arguments
 */
export const UrlAnalyzerToolArgs = z.object({
	url: z
		.string()
		.url('Must be a valid URL')
		.describe('The URL of the image or website to analyze'),

	aspects: z
		.array(z.enum(AnalysisAspects))
		.optional()
		.default([
			'design',
			'content',
			'functionality',
			'colors',
			'typography',
			'layout',
			'components',
		])
		.describe('Specific aspects to analyze from the URL'),

	output_format: z
		.enum(OutputFormats)
		.optional()
		.default('structured')
		.describe('Format for the analysis output'),

	focus: z
		.enum(AnalysisFocus)
		.optional()
		.default('design_inspiration')
		.describe('Primary focus area for the analysis'),

	include_code_examples: z
		.boolean()
		.optional()
		.default(false)
		.describe('Whether to include HTML/CSS code examples in the analysis'),

	target_framework: z
		.string()
		.optional()
		.describe(
			'Target framework for code examples (e.g., React, Vue, HTML/CSS)',
		),

	custom_requirements: z
		.string()
		.optional()
		.describe(
			'Additional custom requirements or specific elements to focus on',
		),
});

/**
 * Analysis result structure
 */
export interface AnalysisResult {
	url: string;
	contentType: 'image' | 'website';
	analysis: {
		layout?: LayoutAnalysis;
		colors?: ColorAnalysis;
		typography?: TypographyAnalysis;
		components?: ComponentAnalysis;
		content?: ContentAnalysis;
		functionality?: FunctionalityAnalysis;
		ux_patterns?: UXPatternsAnalysis;
		responsive_design?: ResponsiveDesignAnalysis;
		accessibility?: AccessibilityAnalysis;
	};
	suggestions?: string[];
	codeExamples?: CodeExample[];
	timestamp: string;
}

export interface LayoutAnalysis {
	structure: string;
	grid_system: string;
	spacing: string;
	alignment: string;
	dimensions: string;
}

export interface ColorAnalysis {
	palette: string[];
	primary_colors: string;
	secondary_colors: string;
	backgrounds: string;
	text_colors: string;
	accent_colors: string;
}

export interface TypographyAnalysis {
	font_families: string;
	font_sizes: string;
	font_weights: string;
	line_heights: string;
	text_hierarchy: string;
}

export interface ComponentAnalysis {
	buttons: string;
	inputs: string;
	cards: string;
	navigation: string;
	icons: string;
	interactive_elements: string;
}

export interface ContentAnalysis {
	headings: string[];
	text_content: string;
	labels: string[];
	placeholders: string[];
	calls_to_action: string[];
}

export interface FunctionalityAnalysis {
	interactions: string;
	user_flows: string;
	form_behaviors: string;
	navigation_patterns: string;
	data_display: string;
}

export interface UXPatternsAnalysis {
	design_patterns: string[];
	user_experience: string;
	information_architecture: string;
	user_journey: string;
}

export interface ResponsiveDesignAnalysis {
	breakpoints: string;
	mobile_adaptations: string;
	tablet_considerations: string;
	desktop_optimizations: string;
}

export interface AccessibilityAnalysis {
	color_contrast: string;
	text_readability: string;
	interactive_elements: string;
	aria_considerations: string;
}

export interface CodeExample {
	framework: string;
	component_name: string;
	code: string;
	description: string;
}
