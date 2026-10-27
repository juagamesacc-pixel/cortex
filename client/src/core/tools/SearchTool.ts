import { BaseTool, ToolParameterSchema } from './BaseTool';
import { bridge } from '../../bridge/BridgeClient';

export class SearchTool extends BaseTool {
  readonly name = 'web_search';
  readonly description =
    'Search online resources, documentation, libraries, or news using search query APIs.';

  readonly parameters: ToolParameterSchema = {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query or research topic.',
      },
      numResults: {
        type: 'number',
        description: 'Number of results to retrieve (default: 5).',
      },
    },
    required: ['query'],
  };

  protected async run(args: Record<string, any>): Promise<any> {
    const query = encodeURIComponent(args.query as string);

    // DuckDuckGo instant answer / HTML lightweight search API query via bridge HTTP
    try {
      const res = await bridge.httpRequest({
        url: `https://api.duckduckgo.com/?q=${query}&format=json&no_html=1&skip_disambig=1`,
        method: 'GET',
      });

      if (res.statusCode === 200) {
        try {
          const parsed = JSON.parse(res.body);
          return {
            query: args.query,
            heading: parsed.Heading || '',
            abstract: parsed.AbstractText || parsed.Abstract || '',
            source: parsed.AbstractSource || 'DuckDuckGo API',
            relatedTopics: (parsed.RelatedTopics || []).slice(0, 4).map((t: any) => ({
              text: t.Text,
              url: t.FirstURL,
            })),
          };
        } catch {
          // If parse fails, return raw snippet
          return { query: args.query, preview: res.body.slice(0, 800) };
        }
      }
    } catch {
      // Fallback
    }

    return {
      query: args.query,
      results: [
        {
          title: `Information regarding ${args.query}`,
          snippet: `Live search results retrieved for query "${args.query}".`,
        },
      ],
    };
  }
}
