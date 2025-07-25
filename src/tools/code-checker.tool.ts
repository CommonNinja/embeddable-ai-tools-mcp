import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import {
	CodeCheckerToolArgs,
	CodeCheckerToolArgsType,
	CheckResult,
	CheckError,
} from './code-checker.types';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import { promises as fs } from 'fs';
import path from 'path';
import * as ts from 'typescript';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Common packages that are pre-installed and should be ignored
const DEFAULT_IGNORED_IMPORTS = [
	'@embeddable/sdk',
	'@hookform/resolvers',
	'@radix-ui/react-accordion',
	'@radix-ui/react-avatar',
	'@radix-ui/react-checkbox',
	'@radix-ui/react-collapsible',
	'@radix-ui/react-dialog',
	'@radix-ui/react-dropdown-menu',
	'@radix-ui/react-hover-card',
	'@radix-ui/react-icons',
	'@radix-ui/react-label',
	'@radix-ui/react-menubar',
	'@radix-ui/react-navigation-menu',
	'@radix-ui/react-popover',
	'@radix-ui/react-progress',
	'@radix-ui/react-radio-group',
	'@radix-ui/react-scroll-area',
	'@radix-ui/react-select',
	'@radix-ui/react-separator',
	'@radix-ui/react-slider',
	'@radix-ui/react-slot',
	'@radix-ui/react-switch',
	'@radix-ui/react-tabs',
	'@radix-ui/react-toggle',
	'@radix-ui/react-toggle-group',
	'@radix-ui/react-tooltip',
	'@radix-ui/themes',
	'@tailwindcss/vite',
	'@tanstack/react-table',
	'@/components/ui/',
	'chart.js',
	'class-variance-authority',
	'clsx',
	'cmdk',
	'date-fns',
	'embla-carousel-react',
	'input-otp',
	'lucide-react',
	'motion',
	'next-themes',
	'react',
	'react-chartjs-2',
	'react-day-picker',
	'react-dom',
	'react-hook-form',
	'react-resizable-panels',
	'react-spring',
	'recharts',
	'sonner',
	'tailwind-merge',
	'tailwindcss',
	'three',
	'vaul',
	'zod',
];

export class CodeChecker {
	private tempDir: string;
	private changedFiles: Set<string> = new Set();
	private supportedExtensions = ['.ts', '.tsx', '.css', '.json'];
	private ignoredImports: string[];

	constructor(
		tempDir: string = `/tmp/widget-code-check-${Date.now()}`,
		ignoredImports: string[] = [],
	) {
		this.tempDir = tempDir;
		this.ignoredImports = [...DEFAULT_IGNORED_IMPORTS, ...ignoredImports];
	}

	/**
	 * Register a file as changed during the session
	 */
	registerFileChange(filePath: string): void {
		const ext = path.extname(filePath);
		if (this.supportedExtensions.includes(ext)) {
			this.changedFiles.add(filePath);
		}
	}

	/**
	 * Check if any files have been changed during the session
	 */
	hasChangedFiles(): boolean {
		return this.changedFiles.size > 0;
	}

	/**
	 * Clear the changed files registry
	 */
	clearChangedFiles(): void {
		this.changedFiles.clear();
	}

	/**
	 * Run code checking on all changed files
	 */
	async checkChangedFiles(
		files: Record<string, string>,
	): Promise<CheckResult> {
		if (!this.hasChangedFiles()) {
			console.log('[CODE-CHECK] No changed files to check');
			return { success: true, errors: [] };
		}

		console.log(
			`[CODE-CHECK] Starting code check for ${this.changedFiles.size} file(s)`,
		);

		try {
			// Create temp directory for checking
			await this.ensureTempDir();

			// Write files to temp directory
			const tempFiles = await this.writeFilesToTemp(files);
			console.log(
				`[CODE-CHECK] Written ${tempFiles.length} file(s) to temp directory`,
			);

			// Run checking on different file types
			const results = await this.runCheckers(tempFiles);

			// Clean up temp directory
			await this.cleanupTempDir();

			const errorCount = results.errors.filter(
				(e) => e.severity === 'error',
			).length;
			const warningCount = results.errors.filter(
				(e) => e.severity === 'warning',
			).length;

			if (results.success) {
				console.log(
					`[CODE-CHECK] ✅ All files passed checking (${warningCount} warning(s))`,
				);
			} else {
				console.log(
					`[CODE-CHECK] ❌ Found ${errorCount} error(s), ${warningCount} warning(s)`,
				);
			}

			return results;
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error';
			console.log(
				`[CODE-CHECK] ❌ Code checking system error: ${errorMessage}`,
			);
			console.error('Code checking error:', error);
			return {
				success: false,
				errors: [
					{
						file: 'system',
						line: 0,
						column: 0,
						message: `Code checking system error: ${errorMessage}`,
						rule: 'system',
						severity: 'error',
					},
				],
			};
		}
	}

	private async ensureTempDir(): Promise<void> {
		try {
			await fs.mkdir(this.tempDir, { recursive: true });
		} catch {
			// Directory might already exist
		}
	}

	private async cleanupTempDir(): Promise<void> {
		try {
			if (process.platform === 'win32') {
				await execAsync(`rmdir /s /q "${this.tempDir}"`);
			} else {
				await execAsync(`rm -rf "${this.tempDir}"`);
			}
		} catch {
			// Ignore cleanup errors
		}
	}

	private async writeFilesToTemp(
		files: Record<string, string>,
	): Promise<string[]> {
		const tempFiles: string[] = [];

		for (const [filePath, content] of Object.entries(files)) {
			if (this.changedFiles.has(filePath)) {
				const tempFilePath = path.join(
					this.tempDir,
					filePath.replace(/^\//, ''),
				);
				const tempDir = path.dirname(tempFilePath);

				// Ensure directory exists
				await fs.mkdir(tempDir, { recursive: true });

				// Write file
				await fs.writeFile(tempFilePath, content, 'utf-8');
				tempFiles.push(tempFilePath);
			}
		}

		return tempFiles;
	}

	private async runCheckers(tempFiles: string[]): Promise<CheckResult> {
		const errors: CheckError[] = [];

		for (const filePath of tempFiles) {
			const ext = path.extname(filePath);
			const fileName = path.basename(filePath);

			try {
				switch (ext) {
					case '.ts':
					case '.tsx': {
						console.log(
							`[CODE-CHECK] Checking TypeScript file: ${fileName}`,
						);
						const tsResults = await this.checkTypeScript(filePath);
						errors.push(...tsResults.errors);
						break;
					}

					case '.json': {
						console.log(
							`[CODE-CHECK] Checking JSON file: ${fileName}`,
						);
						const jsonResults = await this.checkJSON(filePath);
						errors.push(...jsonResults.errors);
						break;
					}

					case '.css': {
						console.log(
							`[CODE-CHECK] Checking CSS file: ${fileName}`,
						);
						const cssResults = await this.checkCSS(filePath);
						errors.push(...cssResults.errors);
						break;
					}
				}
			} catch (error: unknown) {
				const errorMessage =
					error instanceof Error ? error.message : 'Unknown error';
				console.log(
					`[CODE-CHECK] ❌ Failed to check ${fileName}: ${errorMessage}`,
				);
				errors.push({
					file: filePath,
					line: 0,
					column: 0,
					message: `Code checking failed: ${errorMessage}`,
					rule: 'system',
					severity: 'error',
				});
			}
		}

		return {
			success: errors.filter((e) => e.severity === 'error').length === 0,
			errors,
		};
	}

	private async checkTypeScript(
		filePath: string,
	): Promise<{ errors: CheckError[] }> {
		const errors: CheckError[] = [];

		try {
			const fileName = path.basename(filePath);
			const fileContent = await fs.readFile(filePath, 'utf-8');

			// Create a program to check for syntax and semantic errors
			const compilerOptions: ts.CompilerOptions = {
				target: ts.ScriptTarget.ES2020,
				module: ts.ModuleKind.ESNext,
				moduleResolution: ts.ModuleResolutionKind.NodeJs,
				jsx: ts.JsxEmit.ReactJSX,
				strict: true,
				esModuleInterop: true,
				skipLibCheck: true,
				forceConsistentCasingInFileNames: true,
				allowSyntheticDefaultImports: true,
				resolveJsonModule: true,
				isolatedModules: true,
				noEmit: true,
				lib: ['DOM', 'DOM.Iterable', 'ES2020'],
			};

			// Create TypeScript source file
			const sourceFile = ts.createSourceFile(
				fileName,
				fileContent,
				ts.ScriptTarget.Latest,
				true,
			);

			// Create a program with just this file
			const program = ts.createProgram([filePath], compilerOptions, {
				getSourceFile: (fileName) => {
					if (fileName === filePath) return sourceFile;
					return undefined;
				},
				writeFile: () => {},
				getCurrentDirectory: () => process.cwd(),
				getDirectories: () => [],
				fileExists: (fileName) => fileName === filePath,
				readFile: (fileName) =>
					fileName === filePath ? fileContent : undefined,
				getCanonicalFileName: (fileName) => fileName,
				useCaseSensitiveFileNames: () => true,
				getNewLine: () => '\n',
				getDefaultLibFileName: () => 'lib.d.ts',
			});

			// Get syntax diagnostics (parsing errors)
			const syntaxDiagnostics =
				program.getSyntacticDiagnostics(sourceFile);

			for (const diagnostic of syntaxDiagnostics) {
				if (this.shouldIgnoreDiagnostic(diagnostic)) {
					continue;
				}

				const message = ts.flattenDiagnosticMessageText(
					diagnostic.messageText,
					'\n',
				);
				let line = 1;
				let column = 1;

				if (diagnostic.file && diagnostic.start !== undefined) {
					const lineAndChar =
						diagnostic.file.getLineAndCharacterOfPosition(
							diagnostic.start,
						);
					line = lineAndChar.line + 1;
					column = lineAndChar.character + 1;
				}

				errors.push({
					file: filePath,
					line,
					column,
					message,
					rule: 'typescript-syntax',
					severity: 'error',
				});
			}

			// Get semantic diagnostics (type errors) - but only basic ones
			const semanticDiagnostics =
				program.getSemanticDiagnostics(sourceFile);

			for (const diagnostic of semanticDiagnostics) {
				if (this.shouldIgnoreDiagnostic(diagnostic)) {
					continue;
				}

				// Only include certain types of semantic errors that are likely real syntax issues
				if (
					diagnostic.code === 1005 ||
					diagnostic.code === 1109 ||
					diagnostic.code === 1434
				) {
					const message = ts.flattenDiagnosticMessageText(
						diagnostic.messageText,
						'\n',
					);
					let line = 1;
					let column = 1;

					if (diagnostic.file && diagnostic.start !== undefined) {
						const lineAndChar =
							diagnostic.file.getLineAndCharacterOfPosition(
								diagnostic.start,
							);
						line = lineAndChar.line + 1;
						column = lineAndChar.character + 1;
					}

					errors.push({
						file: filePath,
						line,
						column,
						message,
						rule: 'typescript-semantic',
						severity: 'error',
					});
				}
			}

			return { errors };
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error';
			return {
				errors: [
					{
						file: filePath,
						line: 0,
						column: 0,
						message: `TypeScript checking failed: ${errorMessage}`,
						rule: 'system',
						severity: 'error',
					},
				],
			};
		}
	}

	private async checkJSON(
		filePath: string,
	): Promise<{ errors: CheckError[] }> {
		try {
			const content = (await fs.readFile(filePath, 'utf-8')) as string;
			JSON.parse(content);
			return { errors: [] };
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : 'Invalid JSON format';
			return {
				errors: [
					{
						file: filePath,
						line: 0,
						column: 0,
						message: `Invalid JSON: ${errorMessage}`,
						rule: 'json',
						severity: 'error',
					},
				],
			};
		}
	}

	private async checkCSS(
		filePath: string,
	): Promise<{ errors: CheckError[] }> {
		const errors: CheckError[] = [];

		try {
			const content = (await fs.readFile(filePath, 'utf-8')) as string;
			const lines = content.split('\n');
			let openBraces = 0;

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i].trim();

				// Count braces
				openBraces += (line.match(/{/g) || []).length;
				openBraces -= (line.match(/}/g) || []).length;

				// Check for obvious syntax errors
				if (
					line.includes('::') &&
					!line.includes('::before') &&
					!line.includes('::after')
				) {
					errors.push({
						file: filePath,
						line: i + 1,
						column: line.indexOf('::'),
						message: 'Invalid CSS pseudo-element syntax',
						rule: 'css-syntax',
						severity: 'error',
					});
				}

				// Check for invalid characters that would break CSS
				if (line.includes('<') && !line.includes('<!--')) {
					errors.push({
						file: filePath,
						line: i + 1,
						column: line.indexOf('<'),
						message: 'Invalid character in CSS: "<"',
						rule: 'css-syntax',
						severity: 'error',
					});
				}
			}

			// Check for unbalanced braces
			if (openBraces !== 0) {
				errors.push({
					file: filePath,
					line: lines.length,
					column: 0,
					message: `Unbalanced braces: ${openBraces > 0 ? 'missing closing' : 'extra closing'} braces`,
					rule: 'css-braces',
					severity: 'error',
				});
			}

			return { errors };
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error';
			return {
				errors: [
					{
						file: filePath,
						line: 0,
						column: 0,
						message: `CSS checking failed: ${errorMessage}`,
						rule: 'system',
						severity: 'error',
					},
				],
			};
		}
	}

	/**
	 * Check if an import should be ignored based on configured patterns
	 */
	private shouldIgnoreImport(importPath: string): boolean {
		return this.ignoredImports.some((pattern) => {
			if (pattern.endsWith('/')) {
				return importPath.startsWith(pattern);
			}
			return (
				importPath === pattern || importPath.startsWith(pattern + '/')
			);
		});
	}

	/**
	 * Check if a diagnostic error is related to an ignored import
	 */
	private shouldIgnoreDiagnostic(diagnostic: ts.Diagnostic): boolean {
		if (diagnostic.code === 2307 || diagnostic.code === 2305) {
			// Cannot find module
			const message = ts.flattenDiagnosticMessageText(
				diagnostic.messageText,
				'\n',
			);
			const moduleMatch = message.match(
				/Cannot find module ['"]([^'"]+)['"]/,
			);
			if (moduleMatch && this.shouldIgnoreImport(moduleMatch[1])) {
				return true;
			}
		}

		if (diagnostic.code === 2304) {
			// Cannot find name
			const message = ts.flattenDiagnosticMessageText(
				diagnostic.messageText,
				'\n',
			);
			const globalTypes = [
				'window',
				'document',
				'HTMLElement',
				'HTMLImageElement',
				'Event',
				'MouseEvent',
				'KeyboardEvent',
			];
			if (
				globalTypes.some((type) =>
					message.includes(`Cannot find name '${type}'`),
				)
			) {
				return true;
			}
		}

		return false;
	}
}

/**
 * @function handleCodeChecker
 * @description MCP Tool handler to check syntax errors in TypeScript, TSX, CSS, and JSON files.
 */
async function handleCodeChecker(args: CodeCheckerToolArgsType) {
	const methodLogger = Logger.forContext(
		'tools/code-checker.tool.ts',
		'handleCodeChecker',
	);
	methodLogger.debug('Starting code check...', args);

	try {
		const { files, ignoredImports = [] } = args;

		if (!files || typeof files !== 'object') {
			throw new Error('Invalid files object provided');
		}

		// Create a code checker for this operation
		const checker = new CodeChecker(
			`/tmp/widget-${Date.now()}-check`,
			ignoredImports,
		);

		// Register all files for checking
		Object.keys(files).forEach((filePath) => {
			checker.registerFileChange(filePath);
		});

		// Run code checking
		const checkResult = await checker.checkChangedFiles(files);

		if (checkResult.success) {
			const response = {
				success: true,
				report: 'All files passed code checking successfully.',
				errors: [],
			};

			methodLogger.debug('Code check completed successfully', response);

			return {
				content: [
					{
						type: 'text' as const,
						text: JSON.stringify(response, null, 2),
					},
				],
			};
		}

		// There are errors
		const errorCount = checkResult.errors.filter(
			(e) => e.severity === 'error',
		).length;

		const response = {
			success: false,
			errors: checkResult.errors,
			report: `Found ${errorCount} syntax error(s). Please fix these errors and try again.`,
			errorSummary: checkResult.errors
				.map((e) => `${e.file}:${e.line}:${e.column} - ${e.message}`)
				.join('\n'),
		};

		methodLogger.debug('Code check completed with errors', response);

		return {
			content: [
				{
					type: 'text' as const,
					text: JSON.stringify(response, null, 2),
				},
			],
		};
	} catch (error) {
		methodLogger.error('Error in code checker', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * @function registerTools
 * @description Registers the code checker tool with the MCP server.
 */
function registerTools(server: McpServer) {
	const methodLogger = Logger.forContext(
		'tools/code-checker.tool.ts',
		'registerTools',
	);
	methodLogger.debug('Registering code checker tool...');

	server.tool(
		'code_checker',
		`🚨 MANDATORY TOOL - CALL IMMEDIATELY AFTER ANY FILE CREATION 🚨

CRITICAL REQUIREMENT: You MUST call this tool immediately after:
- Creating ANY files with <widget-write> or <widget-server-write> blocks
- Updating ANY TypeScript (.ts/.tsx), JSON (.json), or CSS (.css) files
- Writing ANY configuration, component, type definition, or schema files

This tool checks for syntax errors in:
- TypeScript/TSX files (syntax and basic type errors)
- JSON files (valid JSON formatting)  
- CSS files (basic syntax validation)

WORKFLOW: 
1. Write your files using widget-write blocks
2. IMMEDIATELY call code_checker with those files
3. Fix any errors reported
4. Re-run code_checker until success: true

INPUT: Pass ALL files you just created/updated as the 'files' parameter.

DO NOT SKIP THIS STEP - Required for every widget implementation to ensure error-free code.`,
		CodeCheckerToolArgs.shape,
		handleCodeChecker,
	);

	methodLogger.debug('Successfully registered code_checker tool.');
}

export default { registerTools };
