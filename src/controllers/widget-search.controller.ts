import { Logger } from '../utils/logger.util.js';
import { ControllerResponse } from '../types/common.types.js';
import {
	SearchResult,
	WidgetSearchToolArgsType,
} from '../tools/widget-search.types.js';
import { MongoClient } from 'mongodb';
import OpenAI from 'openai';

const logger = Logger.forContext('controllers/widget-search.controller.ts');

/**
 * Get OpenAI embedding for content
 */
async function getEmbedding(data: string): Promise<number[]> {
	const openai = new OpenAI({
		apiKey: process.env.OPENAI_API_KEY || process.env.OPEN_AI_KEY || '',
	});

	const embedding = await openai.embeddings.create({
		model: 'text-embedding-ada-002',
		input: data,
		encoding_format: 'float',
	});

	return embedding.data[0].embedding;
}

/**
 * Vector search specifically for widget code files
 */
async function runVectorSearchForWidget(
	widgetId: string,
	input: string,
	limit: number = 5,
): Promise<SearchResult[]> {
	const mongoUri = process.env.EMBEDDINGS_MONGODB_URI;
	if (!mongoUri) {
		throw new Error(
			'EMBEDDINGS_MONGODB_URI environment variable is required',
		);
	}
	const client = new MongoClient(mongoUri);

	try {
		await client.connect();
		const database = client.db('embeddable-core');
		const coll = database.collection('embedded_files');

		const queryVector = await getEmbedding(input);

		const agg = [
			{
				$vectorSearch: {
					index: 'vector_index',
					path: 'embedding',
					queryVector,
					numCandidates: 600,
					limit,
					filter: {
						widgetId,
					},
				},
			},
			{
				$match: {
					type: 'code',
				},
			},
			{
				$project: {
					_id: 0,
					filePath: 1,
					content: 1,
					lineStart: 1,
					lineEnd: 1,
					granularity: 1,
					score: {
						$meta: 'vectorSearchScore',
					},
				},
			},
			{
				$match: {
					score: { $gte: 0.4 },
				},
			},
		];

		const result = coll.aggregate(agg);
		const resultsArray: SearchResult[] = [];

		await result.forEach((doc: any) => {
			resultsArray.push({
				filePath: doc.filePath,
				content: doc.content,
				lineStart: doc.lineStart,
				lineEnd: doc.lineEnd,
				granularity: doc.granularity,
				score: doc.score,
				matchType: 'semantic',
			});
		});

		return resultsArray;
	} catch (e) {
		logger.error('Error in runVectorSearchForWidget:', e);
		return [];
	} finally {
		await client.close();
	}
}

/**
 * Search widget codebase with different search types
 */
export async function searchCodebase(
	widgetId: string,
	query: string,
	searchType: 'semantic' | 'exact' | 'filename' = 'semantic',
	limit: number = 5,
): Promise<SearchResult[]> {
	const mongoUri = process.env.EMBEDDINGS_MONGODB_URI;
	if (!mongoUri) {
		throw new Error(
			'EMBEDDINGS_MONGODB_URI environment variable is required',
		);
	}
	const client = new MongoClient(mongoUri);

	try {
		await client.connect();
		const database = client.db('embeddable-core');
		const collection = database.collection('embedded_files');

		switch (searchType) {
			case 'semantic':
				return await runVectorSearchForWidget(widgetId, query, limit);

			case 'exact':
				const exactResults = await collection
					.find({
						widgetId,
						type: 'code',
						content: { $regex: query, $options: 'i' },
					})
					.limit(limit)
					.toArray();

				return exactResults.map((doc: any) => ({
					filePath: doc.filePath,
					content: doc.content,
					lineStart: doc.lineStart,
					lineEnd: doc.lineEnd,
					matchType: 'exact' as const,
				}));

			case 'filename':
				const filenameResults = await collection
					.find({
						widgetId,
						type: 'code',
						filePath: { $regex: query, $options: 'i' },
					})
					.limit(limit)
					.toArray();

				return filenameResults.map((doc: any) => ({
					filePath: doc.filePath,
					content: doc.content,
					lineStart: doc.lineStart,
					lineEnd: doc.lineEnd,
					matchType: 'filename' as const,
				}));

			default:
				throw new Error(`Unsupported search type: ${searchType}`);
		}
	} catch (error) {
		logger.error('Error in searchCodebase:', error);
		throw error;
	} finally {
		await client.close();
	}
}

/**
 * Format search results for MCP response
 */
// function formatSearchResults(results: SearchResult[], query: string): string {
// 	if (results.length === 0) {
// 		return `No files found for query: "${query}"`;
// 	}

<<<<<<< HEAD
	// Build proper JSON object
	const filesObject: { [filePath: string]: string } = {};

	results.forEach((result) => {
		filesObject[result.filePath] = result.content;
	});
=======
// 	// Build proper JSON object
// 	const filesObject: { [filePath: string]: string } = {};
	
// 	results.forEach((result) => {
// 		filesObject[result.filePath] = result.content;
// 	});
>>>>>>> 687b56aa3b9da02f3419b04b158226593594f5c5

// 	// Return formatted message with JSON
// 	return `Found ${results.length} relevant files for "${query}":\n\n${JSON.stringify(filesObject, null, 2)}`;
// }

/**
 * Main controller function for widget search
 */
async function search(
	args: WidgetSearchToolArgsType,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/widget-search.controller.ts',
		'search',
	);

	methodLogger.debug(
		`Searching widget ${args.widgetId} for: ${args.query} (${args.searchType})`,
		args,
	);

	try {
		// Call the search function
		const results = await searchCodebase(
			args.widgetId,
			args.query,
			args.searchType,
			args.limit,
		);

		methodLogger.debug(
			`Found ${results.length} results for query: ${args.query}`,
		);

<<<<<<< HEAD
		// Format the response
		const formattedContent = formatSearchResults(results, args.query);
		methodLogger.debug(`Formatted content: ${formattedContent}`);
=======
		// methodLogger.debug(`Found ${results.length} results for query: ${args.query}`);
		
		// // Format the response
		// const formattedContent = formatSearchResults(results, args.query);
		// methodLogger.debug(`Formatted content: ${formattedContent}`);
>>>>>>> 687b56aa3b9da02f3419b04b158226593594f5c5

		return {
			content: JSON.stringify(results, null, 2),
		};
	} catch (error) {
		methodLogger.error(
			`Error searching widget ${args.widgetId} for query: ${args.query}`,
			error,
		);

		// Re-throw the error to be handled by the calling tool
		throw error;
	}
}

export default {
	search,
};
