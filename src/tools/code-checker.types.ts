import { z } from 'zod';

/**
 * Zod schema for the code checker tool arguments.
 */
export const CodeCheckerToolArgs = z.object({
	files: z
		.record(z.string(), z.string())
		.describe('Object with file paths as keys and file contents as values'),
	ignoredImports: z
		.array(z.string())
		.optional()
		.default([])
		.describe(
			'Additional import patterns to ignore (beyond the default pre-installed packages)',
		),
});

/**
 * TypeScript type inferred from the code checker tool arguments schema.
 */
export type CodeCheckerToolArgsType = z.infer<typeof CodeCheckerToolArgs>;

export interface CheckResult {
	success: boolean;
	errors: CheckError[];
}

export interface CheckError {
	file: string;
	line: number;
	column: number;
	message: string;
	rule: string;
	severity: 'error' | 'warning';
}
