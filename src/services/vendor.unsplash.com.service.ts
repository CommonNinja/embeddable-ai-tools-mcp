import { createApi } from 'unsplash-js';
import { Logger } from '../utils/logger.util.js';
import {
	UnsplashImage,
	UnsplashSearchResponse,
	UnsplashImageSchema,
	UnsplashApiRequestOptions,
} from './vendor.unsplash.com.types.js';
import {
	createApiError,
	createUnexpectedError,
	McpError,
} from '../utils/error.util.js';

// Create a contextualized logger for this file
const serviceLogger = Logger.forContext(
	'services/vendor.unsplash.com.service.ts',
);

// Log service initialization
serviceLogger.debug('Unsplash API service initialized');

/**
 * @namespace VendorUnsplashService
 * @description Service layer for interacting directly with the Unsplash API.
 *              Responsible for constructing API requests based on provided parameters
 *              and handling the raw response from the Unsplash API.
 */

/**
 * @function searchImages
 * @description Searches for images on Unsplash based on the provided query and options.
 * @memberof VendorUnsplashService
 * @param {UnsplashApiRequestOptions} options - Search options including query, count, and orientation
 * @returns {Promise<UnsplashSearchResponse>} A promise that resolves to the search results
 * @throws {McpError} Throws an `McpError` if the API call fails or returns an error
 */
async function searchImages(
	options: UnsplashApiRequestOptions,
): Promise<UnsplashSearchResponse> {
	const methodLogger = Logger.forContext(
		'services/vendor.unsplash.com.service.ts',
		'searchImages',
	);
	methodLogger.debug('Searching for images with options:', options);

	try {
		// Check if API key is configured
		const apiKey = process.env.UNSPLASH_ACCESS_KEY;
		if (!apiKey) {
			methodLogger.warn('UNSPLASH_ACCESS_KEY not configured');
			throw createApiError(
				'UNSPLASH_ACCESS_KEY environment variable is not configured',
			);
		}

		// Debug: Log API key info (only first/last few chars for security)
		methodLogger.debug(
			`API key configured: ${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}`,
		);

		// Initialize Unsplash API with fresh key (in case env vars changed)
		const unsplash = createApi({
			accessKey: apiKey,
		});

		// Perform the search
		const result = await unsplash.search.getPhotos({
			query: options.query,
			page: options.page || 1,
			perPage: options.count || 1,
			orientation: options.orientation || 'landscape',
		});

		// Handle API errors
		if (result.errors) {
			methodLogger.error('Unsplash API errors:', result.errors);
			throw createApiError(
				`Unsplash API error: ${result.errors.join(', ')}`,
			);
		}

		// Check if we have a valid response
		if (!result.response) {
			methodLogger.error('No response received from Unsplash API');
			throw createApiError('No response received from Unsplash API');
		}

		const photos = result.response.results;
		if (!photos || photos.length === 0) {
			methodLogger.info(`No images found for query: ${options.query}`);
			return {
				images: [],
				total: 0,
				totalPages: 0,
			};
		}

		// Transform the response to our format
		const images: UnsplashImage[] = photos.map((photo) => ({
			id: photo.id,
			url: photo.urls.regular,
			alt: photo.alt_description || options.query,
			width: photo.width,
			height: photo.height,
			photographer: photo.user.name,
			photographerUrl: photo.user.links.html,
		}));

		// Validate each image against our schema
		const validatedImages = images.map((image) => {
			const validationResult = UnsplashImageSchema.safeParse(image);
			if (!validationResult.success) {
				methodLogger.warn(
					`Invalid image data for ID ${image.id}:`,
					validationResult.error,
				);
				throw createUnexpectedError(
					`Invalid image data received from Unsplash API for image ID ${image.id}`,
				);
			}
			return validationResult.data;
		});

		const response: UnsplashSearchResponse = {
			images: validatedImages,
			total: result.response.total,
			totalPages: result.response.total_pages,
		};

		methodLogger.debug(
			`Successfully found ${validatedImages.length} images for query: ${options.query}`,
		);
		return response;
	} catch (error) {
		// If it's already an McpError, re-throw it
		if (error instanceof McpError) {
			throw error;
		}

		// Handle unexpected errors
		methodLogger.error('Unexpected error during image search:', error);
		throw createUnexpectedError(
			`Unexpected error during image search: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

export default {
	searchImages,
};
