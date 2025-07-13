import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { UrlAnalyzerToolArgs } from './url-analyzer.types.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import urlAnalyzerController from '../controllers/url-analyzer.controller.js';
import { z } from 'zod';

/**
 * TypeScript type inferred from the tool arguments schema.
 */
type UrlAnalyzerToolArgsType = z.infer<typeof UrlAnalyzerToolArgs>;

/**
 * @function handleUrlAnalyzer
 * @description MCP Tool handler to analyze URLs for design, components, and content.
 *              It calls the urlAnalyzerController to process the URL and formats the response for the MCP.
 *
 * @param {UrlAnalyzerToolArgsType} args - Arguments provided to the tool.
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} Formatted response for the MCP.
 * @throws {McpError} Formatted error if the controller or service layer encounters an issue.
 */
async function handleUrlAnalyzer(args: UrlAnalyzerToolArgsType) {
	const methodLogger = Logger.forContext(
		'tools/url-analyzer.tool.ts',
		'handleUrlAnalyzer',
	);
	methodLogger.debug(`Analyzing URL: ${args.url}`, args);

	try {
		// Pass args directly to the controller
		const result = await urlAnalyzerController.analyze(args);
		methodLogger.debug(`Got the response from the controller`, result);

		// Format the response for the MCP tool
		return {
			content: [
				{
					type: 'text' as const,
					text: result.content,
				},
			],
		};
	} catch (error) {
		methodLogger.error(`Error analyzing URL: ${args.url}`, error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * @function registerTools
 * @description Registers the URL analyzer tool with the MCP server.
 *
 * @param {McpServer} server - The MCP server instance.
 */
function registerTools(server: McpServer) {
	const methodLogger = Logger.forContext(
		'tools/url-analyzer.tool.ts',
		'registerTools',
	);
	methodLogger.debug(`Registering URL analyzer tool...`);

	server.tool(
		'analyze_url_for_design_and_content',
		`🎨 Advanced URL analyzer for design inspiration, component extraction, and content analysis. 
		🚨 IMPORTANT: Don't use this tool if a URL is being referenced in a <widget-*> tag.

Perfect for prompts like:
• "Use this website as a style reference"
• "Create a widget based on this design"  
• "Extract components from this interface"
• "Analyze the UX patterns in this app"
• "Get the color palette from this site"

✨ Key Features:
- Smart content detection (images vs websites)
- Multiple analysis aspects (design, colors, typography, components, UX patterns)
- Different focus modes (widget creation, design inspiration, full replication)
- Various output formats (structured, JSON, markdown, code-focused)
- Optional code examples generation
- Comprehensive accessibility and responsive design analysis

📋 Analysis Aspects:
- Layout & Structure: Grid systems, spacing, hierarchy
- Color Palette: Primary/secondary colors, accessibility
- Typography: Font families, sizes, hierarchy
- Components: Buttons, forms, navigation elements
- Content: Text structure, CTAs, messaging
- Functionality: Interactions, user flows
- UX Patterns: Design conventions, user experience
- Responsive Design: Breakpoints, mobile adaptation
- Accessibility: Contrast, screen readers, ARIA

🎯 Focus Modes:
- widget_creation: Extract standalone components
- design_inspiration: Creative patterns and principles  
- component_library: Systematic design system elements
- full_replication: Pixel-perfect reproduction specs
- content_extraction: Text and messaging analysis
- ux_research: User experience insights

📤 Output Formats:
- structured: Easy-to-read formatted analysis
- json: Machine-readable structured data
- markdown: Documentation-ready format
- code: Implementation-focused with CSS/code examples

Use this tool to transform any visual interface into actionable design and development insights.`,
		UrlAnalyzerToolArgs.shape,
		handleUrlAnalyzer,
	);

	methodLogger.debug('Successfully registered URL analyzer tool.');
}

export default { registerTools };
