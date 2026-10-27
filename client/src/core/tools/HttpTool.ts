import { BaseTool, ToolParameterSchema } from './BaseTool';
import { bridge } from '../../bridge/BridgeClient';

export class HttpTool extends BaseTool {
  readonly name = 'http_request';
  readonly description =
    'Make network HTTP/HTTPS requests (GET, POST, PUT, DELETE) to fetch APIs, download web pages, or interact with external services.';

  readonly parameters: ToolParameterSchema = {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The target HTTP/HTTPS URL.',
      },
      method: {
        type: 'string',
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'],
        description: 'HTTP method (default: GET).',
      },
      headers: {
        type: 'object',
        description: 'Optional HTTP request headers key-value map.',
      },
      body: {
        type: 'string',
        description: 'Optional request body string (e.g. JSON or text).',
      },
      timeoutMs: {
        type: 'number',
        description: 'Timeout in milliseconds (default: 15000).',
      },
    },
    required: ['url'],
  };

  protected async run(args: Record<string, any>): Promise<any> {
    const url = args.url as string;
    const method = (args.method || 'GET') as any;
    const headers = args.headers as Record<string, string> | undefined;
    const body = args.body as string | undefined;
    const timeoutMs = args.timeoutMs as number | undefined;

    const res = await bridge.httpRequest({
      url,
      method,
      headers,
      body,
      timeoutMs,
    });

    return {
      statusCode: res.statusCode,
      bodyPreview: res.body.length > 5000 ? `${res.body.slice(0, 5000)}\n...[truncated ${res.body.length - 5000} chars]` : res.body,
      headers: res.headers,
      durationMs: res.durationMs,
    };
  }
}
