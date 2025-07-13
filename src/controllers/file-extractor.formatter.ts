import { FileExtractionResponse } from '../services/vendor.aws.lambda.types.js';
import {
	formatDate,
	formatHeading,
	formatBulletList,
	formatSeparator,
} from '../utils/formatter.util.js';

/**
 * Format file extraction results into Markdown.
 * @param extractionResult - Raw extraction result from the AWS Lambda service.
 * @param originalMessage - The original message that was analyzed.
 * @returns Formatted Markdown string.
 */
export function formatFileExtractionResults(
	extractionResult: FileExtractionResponse,
	originalMessage: string,
): string {
	const lines: string[] = [];

	// Add a main heading
	lines.push(formatHeading('File Extraction Results', 1));
	lines.push('');

	// Add extraction summary
	lines.push(formatHeading('Extraction Summary', 2));

	const summaryInfo: Record<string, unknown> = {
		'Files Found': extractionResult.fileCount,
		'Successfully Processed': extractionResult.successCount,
		'Failed to Process': extractionResult.errorCount,
		'File Types': extractionResult.fileTypes.join(', '),
	};

	lines.push(formatBulletList(summaryInfo));
	lines.push('');

	// Add files section if any
	if (extractionResult.files.length > 0) {
		lines.push(formatHeading('Extracted Files', 2));
		lines.push('');

		extractionResult.fileContents.forEach((fileContent, index) => {
			const file = extractionResult.files[index];
			if (!file) return;

			lines.push(formatHeading(`${index + 1}. ${file.filename}`, 3));
			lines.push('');

			// Add file details
			const fileInfo: Record<string, unknown> = {
				'File Type': file.fileType.toUpperCase(),
				'Source URL': file.url,
				Status: fileContent.success
					? '✅ Successfully processed'
					: '❌ Failed',
			};

			if (!fileContent.success && fileContent.error) {
				fileInfo['Error'] = fileContent.error;
			}

			lines.push(formatBulletList(fileInfo));
			lines.push('');

			// Add content if successfully extracted
			if (fileContent.success && fileContent.content) {
				lines.push('**File Content:**');
				lines.push('');
				lines.push('```');
				lines.push(fileContent.content);
				lines.push('```');
				lines.push('');
			}
		});
	} else {
		lines.push('*No files found in the message.*');
		lines.push('');
	}

	// Add usage instructions
	if (extractionResult.successCount > 0) {
		lines.push(formatHeading('Next Steps', 2));
		lines.push('');
		lines.push(
			`The content from ${extractionResult.successCount} file(s) has been extracted and is available above for analysis or processing.`,
		);
		lines.push('');
	}

	// Add original message for reference
	lines.push(formatHeading('Original Message', 2));
	lines.push('');
	lines.push(`> ${originalMessage}`);
	lines.push('');

	// Add a separator
	lines.push(formatSeparator());

	// Add a timestamp footer
	lines.push(`*Files extracted at ${formatDate(new Date())}*`);

	return lines.join('\n');
}
