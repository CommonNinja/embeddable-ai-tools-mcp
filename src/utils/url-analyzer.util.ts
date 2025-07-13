import https from 'https';
import { URL } from 'url';
import { Logger } from './logger.util.js';
import type {
	AnalysisAspect,
	AnalysisFocusType,
} from '../tools/url-analyzer.types.js';

// Constants
const REQUEST_TIMEOUT = 30000; // 30 seconds
const ANALYSIS_TIMEOUT = 60000; // 60 seconds
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB

const logger = Logger.forContext('utils/url-analyzer.util.ts');

/**
 * Enhanced prompt generation based on focus area and aspects
 */
export function createAnalysisPrompt(
	aspects: AnalysisAspect[],
	focus: AnalysisFocusType,
	isWebsite: boolean = false,
	customRequirements?: string,
): string {
	const focusContext = getFocusContext(focus);
	const baseContext = isWebsite
		? '📸 This is a screenshot of a website interface.'
		: '📸 This is an image that needs to be analyzed.';

	const promptParts = [
		baseContext,
		'',
		`🎯 **ANALYSIS OBJECTIVE: ${focusContext.title}**`,
		focusContext.description,
		'',
		'📋 **ANALYSIS REQUIREMENTS:**',
	];

	// Add aspect-specific analysis requirements
	if (aspects.includes('layout') || aspects.includes('design')) {
		promptParts.push(
			'**Layout & Structure:**',
			'- Overall layout system (grid, flexbox, absolute positioning)',
			'- Component hierarchy and nesting structure',
			'- Spacing patterns (margins, padding, gaps) with specific measurements',
			'- Container relationships and alignment principles',
			'- Visual balance and proportions',
			'',
		);
	}

	if (aspects.includes('colors')) {
		promptParts.push(
			'**Color Analysis:**',
			'- Primary, secondary, and accent color palette with HEX codes',
			'- Background colors and gradients',
			'- Text colors for different content types',
			'- Interactive element colors (hover, active, focus states)',
			'- Color accessibility and contrast ratios',
			'',
		);
	}

	if (aspects.includes('typography')) {
		promptParts.push(
			'**Typography:**',
			'- Font families and fallbacks',
			'- Font sizes, weights, and line heights for each text level',
			'- Text hierarchy (H1-H6, body, captions, etc.)',
			'- Letter spacing, text alignment, and text decorations',
			'- Responsive typography considerations',
			'',
		);
	}

	if (aspects.includes('components')) {
		promptParts.push(
			'**Component Analysis:**',
			'- Interactive elements (buttons, forms, navigation)',
			'- Component variants and states',
			'- Reusable component patterns',
			'- Component composition and modularity',
			'- Icon usage and icon families',
			'',
		);
	}

	if (aspects.includes('ux_patterns')) {
		promptParts.push(
			'**UX Patterns:**',
			'- Design patterns and conventions used',
			'- User interaction flows',
			'- Information architecture',
			'- Navigation patterns',
			'- Content organization principles',
			'',
		);
	}

	if (aspects.includes('functionality')) {
		promptParts.push(
			'**Functionality Analysis:**',
			'- Interactive behaviors and micro-interactions',
			'- Form handling and validation patterns',
			'- Data display and manipulation',
			'- User feedback mechanisms',
			'- Loading and error states',
			'',
		);
	}

	if (aspects.includes('content')) {
		promptParts.push(
			'**Content Analysis:**',
			'- Text content and messaging hierarchy',
			'- Call-to-action elements',
			'- Labels, placeholders, and helper text',
			'- Content structure and organization',
			'- Media content integration',
			'',
		);
	}

	if (aspects.includes('responsive_design')) {
		promptParts.push(
			'**Responsive Design:**',
			'- Breakpoint considerations',
			'- Mobile-first or desktop-first approach',
			'- Adaptive layout strategies',
			'- Touch interaction considerations',
			'- Content prioritization on smaller screens',
			'',
		);
	}

	if (aspects.includes('accessibility')) {
		promptParts.push(
			'**Accessibility:**',
			'- Color contrast and readability',
			'- Focus indicators and keyboard navigation',
			'- Screen reader considerations',
			'- Semantic structure and landmarks',
			'- Alternative text and descriptions',
			'',
		);
	}

	// Add custom requirements if provided
	if (customRequirements) {
		promptParts.push('**Custom Requirements:**', customRequirements, '');
	}

	// Add focus-specific output requirements
	promptParts.push(
		'📦 **OUTPUT FORMAT:**',
		focusContext.outputRequirements,
		'',
		'🎨 **STYLE GUIDELINES:**',
		'- Be precise with measurements and specifications',
		'- Include specific values (px, rem, %, hex codes)',
		'- Organize information hierarchically',
		'- Focus on actionable implementation details',
		'- Avoid generic descriptions - be specific and technical',
	);

	return promptParts.join('\n');
}

/**
 * Get focus-specific context for prompts
 */
function getFocusContext(focus: AnalysisFocusType): {
	title: string;
	description: string;
	outputRequirements: string;
} {
	switch (focus) {
		case 'widget_creation':
			return {
				title: 'Widget Creation',
				description:
					'Analyze this interface to extract specific components that can be recreated as standalone widgets. Focus on self-contained UI elements that have clear boundaries and functionality.',
				outputRequirements:
					'Structure the analysis to support component-based development. Include component specifications, prop interfaces, and integration guidelines.',
			};

		case 'design_inspiration':
			return {
				title: 'Design Inspiration',
				description:
					'Extract design principles, patterns, and visual elements that can inspire new designs. Focus on innovative approaches and best practices.',
				outputRequirements:
					'Highlight creative solutions, design patterns, and visual principles. Include suggestions for adaptation and implementation.',
			};

		case 'component_library':
			return {
				title: 'Component Library Development',
				description:
					'Analyze components for creating a systematic design system. Focus on consistency, reusability, and scalability.',
				outputRequirements:
					'Provide component specifications suitable for design system documentation. Include variants, states, and usage guidelines.',
			};

		case 'full_replication':
			return {
				title: 'Pixel-Perfect Replication',
				description:
					'Create a comprehensive blueprint for exact reproduction. Every visual detail must be captured with precision.',
				outputRequirements:
					'Provide exhaustive specifications with exact measurements, colors, and spacing. Include all states and responsive considerations.',
			};

		case 'content_extraction':
			return {
				title: 'Content Extraction',
				description:
					'Focus on extracting textual content, messaging hierarchy, and information architecture.',
				outputRequirements:
					'Organize content by type and hierarchy. Include messaging patterns and content strategy insights.',
			};

		case 'ux_research':
			return {
				title: 'UX Research Analysis',
				description:
					'Analyze user experience patterns, interaction flows, and usability considerations.',
				outputRequirements:
					'Provide UX insights, user journey analysis, and usability recommendations. Focus on user behavior and experience optimization.',
			};

		default:
			return {
				title: 'General Analysis',
				description:
					'Provide a comprehensive analysis of the design and functionality.',
				outputRequirements:
					'Structure the output for maximum clarity and actionability.',
			};
	}
}

/**
 * Helper function to create timeout promises
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
	return Promise.race([
		promise,
		new Promise<T>((_, reject) =>
			setTimeout(
				() =>
					reject(
						new Error(`Operation timed out after ${timeoutMs}ms`),
					),
				timeoutMs,
			),
		),
	]);
}

/**
 * Analyze image with Claude using improved prompts
 */
export async function analyzeImageWithClaude(
	imageUrl: string,
	prompt: string,
): Promise<string> {
	const methodLogger = logger.forMethod('analyzeImageWithClaude');
	methodLogger.debug('Starting image analysis', { imageUrl });

	try {
		// Import Anthropic dynamically to handle potential missing dependency
		const { default: Anthropic } = await import('@anthropic-ai/sdk');

		const anthropic = new Anthropic({
			apiKey: process.env.ANTHROPIC_API_KEY,
		});

		// Fetch image with timeout and size limits
		const imageData = await withTimeout(
			fetchImageData(imageUrl),
			REQUEST_TIMEOUT,
		);

		const base64Image = imageData.buffer.toString('base64');

		// Analyze with Claude
		const response = await withTimeout(
			anthropic.messages.create({
				model: 'claude-sonnet-4-0',
				max_tokens: 4000,
				messages: [
					{
						role: 'user',
						content: [
							{
								type: 'image',
								source: {
									type: 'base64',
									media_type: imageData.contentType as
										| 'image/jpeg'
										| 'image/png'
										| 'image/gif'
										| 'image/webp',
									data: base64Image,
								},
							},
							{ type: 'text', text: prompt },
						],
					},
				],
			}),
			ANALYSIS_TIMEOUT,
		);

		const result =
			response.content[0].type === 'text'
				? response.content[0].text
				: 'No description available.';

		methodLogger.debug('Analysis completed successfully');
		return result;
	} catch (error) {
		methodLogger.error('Error analyzing image', { error });
		throw error;
	}
}

/**
 * Fetch image data with proper error handling
 */
async function fetchImageData(imageUrl: string): Promise<{
	buffer: Buffer;
	contentType: string;
}> {
	return new Promise((resolve, reject) => {
		const request = https.request(
			new URL(imageUrl.replace('http://', 'https://')),
			{ timeout: REQUEST_TIMEOUT },
			(res) => {
				const chunks: Buffer[] = [];
				let totalSize = 0;

				res.on('data', (chunk) => {
					totalSize += chunk.length;
					if (totalSize > MAX_IMAGE_SIZE) {
						request.destroy();
						reject(new Error('Image too large (max 20MB)'));
						return;
					}
					chunks.push(chunk);
				});

				res.on('end', () => {
					const buffer = Buffer.concat(chunks);
					const contentType =
						res.headers['content-type'] || 'image/jpeg';
					resolve({ buffer, contentType });
				});

				res.on('error', reject);
			},
		);

		request.on('error', reject);
		request.on('timeout', () => {
			request.destroy();
			reject(new Error('Request timeout'));
		});
		request.end();
	});
}

/**
 * Get URL content type with timeout
 */
export async function getUrlContentType(url: string): Promise<string> {
	return withTimeout(
		new Promise<string>((resolve, reject) => {
			const request = https.request(
				new URL(url),
				{
					method: 'HEAD',
					timeout: REQUEST_TIMEOUT,
				},
				(res) => {
					resolve(res.headers['content-type'] || '');
				},
			);

			request.on('error', reject);
			request.on('timeout', () => {
				request.destroy();
				reject(new Error('Request timeout'));
			});

			request.end();
		}),
		REQUEST_TIMEOUT,
	);
}

/**
 * Enhanced Jina scraping with better error handling
 */
export async function scrapeWithJina(url: string): Promise<{
	screenshotUrl?: string;
	content?: string;
}> {
	const methodLogger = logger.forMethod('scrapeWithJina');
	methodLogger.debug('Starting Jina scraping', { url });

	try {
		const { default: axios } = await import('axios');

		const headers: Record<string, string> = {
			Accept: 'application/json',
			Authorization: `Bearer ${process.env.JINA_AI_API_KEY}`,
			'X-Return-Format': 'screenshot',
			'X-With-Shadow-Dom': 'true',
		};

		const { data } = await axios(`https://r.jina.ai/${url}`, {
			headers,
			timeout: REQUEST_TIMEOUT,
		});

		methodLogger.debug('Jina scraping completed');
		return {
			screenshotUrl: data?.data?.screenshotUrl || data?.data?.pageshotUrl,
			content: data?.data?.content,
		};
	} catch (error) {
		methodLogger.error('Error in Jina scraping', { error });
		throw error;
	}
}
