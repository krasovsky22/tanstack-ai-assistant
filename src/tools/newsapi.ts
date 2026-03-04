import { toolDefinition } from '@tanstack/ai';
import { z } from 'zod';

export function getNewsApiTools() {
  return [
    toolDefinition({
      name: 'news_api_search',
      description:
        'Search for live news articles and top breaking headlines via NewsAPI.',
      inputSchema: z.object({
        endpoint: z
          .enum(['everything', 'top-headlines'])
          .describe(
            'Use "everything" for article discovery/search, or "top-headlines" for breaking news and top headlines.',
          ),
        q: z
          .string()
          .nullish()
          .describe(
            'Keywords or phrases to search for in the article title and body. Required for "everything" endpoint if sources/domains are not provided.',
          ),
        sources: z
          .string()
          .nullish()
          .describe(
            'A comma-seperated string of identifiers (maximum 20) for the news sources or blogs you want headlines from.',
          ),
        domains: z
          .string()
          .nullish()
          .describe(
            'A comma-seperated string of domains (eg bbc.co.uk, techcrunch.com) to restrict the search to. Only for "everything".',
          ),
        from: z
          .string()
          .optional()
          .describe(
            'A date and optional time for the oldest article allowed. ISO 8601 format (e.g. 2026-03-04). Only for "everything".',
          ),
        to: z
          .string()
          .optional()
          .describe(
            'A date and optional time for the newest article allowed. ISO 8601 format. Only for "everything".',
          ),
        language: z
          .string()
          .optional()
          .describe(
            'The 2-letter ISO-639-1 code of the language you want to get headlines for (e.g. en, fr).',
          ),
        sortBy: z
          .enum(['relevancy', 'popularity', 'publishedAt'])
          .optional()
          .describe(
            'The order to sort the articles in. Only for "everything".',
          ),
        country: z
          .string()
          .optional()
          .describe(
            'The 2-letter ISO 3166-1 code of the country you want to get headlines for (e.g. us). Only for "top-headlines". Cannot be mixed with sources.',
          ),
        category: z
          .enum([
            'business',
            'entertainment',
            'general',
            'health',
            'science',
            'sports',
            'technology',
          ])
          .optional()
          .describe(
            'The category you want to get headlines for. Only for "top-headlines". Cannot be mixed with sources.',
          ),
        pageSize: z
          .number()
          .optional()
          .describe(
            'The number of results to return per page (request). 20 is default, 100 is maximum.',
          ),
        page: z
          .number()
          .optional()
          .describe(
            'Use this to page through the results if the total results found is greater than the page size.',
          ),
      }),
    }).server(async (args) => {
      const apiKey = process.env.NEWS_API_TOKEN;
      if (!apiKey) {
        return {
          success: false,
          error:
            'NEWS_API_TOKEN environment variable is not configured. Ask the user to add it.',
        };
      }

      const { endpoint, ...params } = args;

      const searchParams = new URLSearchParams();
      searchParams.append('apiKey', apiKey);

      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      }

      try {
        const url = `https://newsapi.org/v2/${endpoint}?${searchParams.toString()}`;
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
          return {
            success: false,
            error: data.message || `NewsAPI returned status ${response.status}`,
          };
        }

        return data;
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }),
  ];
}
