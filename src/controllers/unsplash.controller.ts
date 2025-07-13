import { Logger } from '../utils/logger.util.js';
import unsplashService from '../services/vendor.unsplash.com.service.js';
import { formatUnsplashResults } from './unsplash.formatter.js';
import { ControllerResponse } from '../types/common.types.js';

/**
 * @namespace UnsplashController
 * @description Controller responsible for handling Unsplash image search logic.
 *              It orchestrates calls to the Unsplash service, applies defaults,
 *              and formats the response using the formatter.
 */

/**
 * @function search
 * @description Searches for images on Unsplash based on the provided query and options.
 * @memberof UnsplashController
 * @param {Object} args - Arguments containing search parameters
 * @param {string} args.query - Search term for finding images
 * @param {number} [args.count=1] - Number of images to return
 * @param {string} [args.orientation='landscape'] - Image orientation preference
 * @returns {Promise<ControllerResponse>} A promise that resolves to the standard controller response containing the formatted search results in Markdown.
 * @throws {McpError} Throws an McpError if the service call fails or returns an error.
 */
async function search(args: {
	query: string;
	count?: number;
	orientation?: 'landscape' | 'portrait' | 'squarish';
}): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/unsplash.controller.ts',
		'search',
	);
	methodLogger.debug(`Searching for images with query: ${args.query}`, args);

	try {
		// Apply defaults
		const options = {
			query: args.query,
			count: args.count ?? 1,
			orientation: args.orientation ?? 'landscape',
		};

		methodLogger.debug('Calling Unsplash service with options:', options);

		// Call the service
		const searchResults = await unsplashService.searchImages(options);

		methodLogger.debug(
			`Service returned ${searchResults.images.length} images`,
		);

		// Format the response
		const formattedContent = formatUnsplashResults(
			searchResults,
			options.query,
		);

		return {
			content: formattedContent,
		};
	} catch (error) {
		methodLogger.error(
			`Error searching for images with query: ${args.query}`,
			error,
		);

		// Re-throw the error to be handled by the calling tool
		throw error;
	}
}

export default {
	search,
};
