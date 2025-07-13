import { UnsplashSearchResponse } from '../services/vendor.unsplash.com.types.js';
import {
	formatUrl,
	formatDate,
	formatHeading,
	formatBulletList,
	formatSeparator,
} from '../utils/formatter.util.js';

/**
 * Format Unsplash search results into Markdown.
 * @param searchResults - Raw search results from the Unsplash service.
 * @param query - The search query used.
 * @returns Formatted Markdown string.
 */
export function formatUnsplashResults(
	searchResults: UnsplashSearchResponse,
	query: string,
): string {
	const lines: string[] = [];

	// Add a main heading
	lines.push(formatHeading(`Unsplash Image Search Results: "${query}"`, 1));
	lines.push('');

	// Add summary information
	lines.push(formatHeading('Search Summary', 2));

	const summaryInfo: Record<string, unknown> = {
		'Search Query': query,
		'Images Found': searchResults.images.length,
		'Total Available': searchResults.total,
		'Total Pages': searchResults.totalPages,
	};

	lines.push(formatBulletList(summaryInfo));
	lines.push('');

	// Add images section
	if (searchResults.images.length > 0) {
		lines.push(formatHeading('Images', 2));
		lines.push('');

		searchResults.images.forEach((image, index) => {
			lines.push(formatHeading(`Image ${index + 1}`, 3));
			lines.push('');

			// Add image preview
			lines.push(`![${image.alt}](${image.url})`);
			lines.push('');

			// Add image details
			const imageInfo: Record<string, unknown> = {
				'Image ID': image.id,
				'Image URL': formatUrl(image.url, 'View Image'),
				'Alt Text': image.alt,
				Dimensions: `${image.width} × ${image.height}`,
				Photographer: formatUrl(
					image.photographerUrl,
					image.photographer,
				),
			};

			lines.push(formatBulletList(imageInfo));
			lines.push('');
		});
	} else {
		lines.push('*No images found for this query.*');
		lines.push('');
	}

	// Add a separator
	lines.push(formatSeparator());

	// Add a timestamp footer
	lines.push(`*Search performed at ${formatDate(new Date())}*`);

	return lines.join('\n');
}
