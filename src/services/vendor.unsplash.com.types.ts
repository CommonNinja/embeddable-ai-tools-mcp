import { z } from 'zod';

/**
 * Zod schema for Unsplash image data returned by the API.
 */
export const UnsplashImageSchema = z.object({
	id: z.string().describe('Unique identifier for the image'),
	url: z.string().describe('URL of the image'),
	alt: z.string().describe('Alternative text for the image'),
	width: z.number().describe('Width of the image in pixels'),
	height: z.number().describe('Height of the image in pixels'),
	photographer: z.string().describe('Name of the photographer'),
	photographerUrl: z.string().describe('URL to the photographer profile'),
});

/**
 * TypeScript type inferred from the UnsplashImageSchema.
 */
export type UnsplashImage = z.infer<typeof UnsplashImageSchema>;

/**
 * Zod schema for the Unsplash search response.
 */
export const UnsplashSearchResponseSchema = z.object({
	images: z.array(UnsplashImageSchema).describe('Array of image results'),
	total: z.number().describe('Total number of images found'),
	totalPages: z.number().describe('Total number of pages available'),
});

/**
 * TypeScript type inferred from the UnsplashSearchResponseSchema.
 */
export type UnsplashSearchResponse = z.infer<
	typeof UnsplashSearchResponseSchema
>;

/**
 * Request options for the Unsplash API service.
 */
export type UnsplashApiRequestOptions = {
	query: string;
	count?: number;
	orientation?: 'landscape' | 'portrait' | 'squarish';
	page?: number;
};
