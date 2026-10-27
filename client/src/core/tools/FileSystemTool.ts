import { BaseTool, ToolParameterSchema } from './BaseTool';
import { bridge } from '../../bridge/BridgeClient';

export class FileSystemTool extends BaseTool {
  readonly name = 'file_system';
  readonly description =
    'Perform structured file operations: read file, write/create file, append content, list directories, and delete files on the Android host.';

  readonly parameters: ToolParameterSchema = {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['read', 'write', 'append', 'list', 'delete'],
        description: 'Action to perform on the filesystem.',
      },
      path: {
        type: 'string',
        description: 'Absolute or workspace-relative path to the file or directory.',
      },
      content: {
        type: 'string',
        description: 'Content to write or append (required for write/append).',
      },
    },
    required: ['action', 'path'],
  };

  protected async run(args: Record<string, any>): Promise<any> {
    const action = args.action as string;
    const path = args.path as string;

    switch (action) {
      case 'read': {
        const text = await bridge.readFile({ path });
        return text;
      }
      case 'write': {
        if (args.content === undefined) {
          throw new Error('Content is required for write action');
        }
        await bridge.writeFile({ path, content: args.content, append: false });
        return `Successfully wrote ${args.content.length} characters to ${path}`;
      }
      case 'append': {
        if (args.content === undefined) {
          throw new Error('Content is required for append action');
        }
        await bridge.writeFile({ path, content: args.content, append: true });
        return `Successfully appended to ${path}`;
      }
      case 'list': {
        const entries = await bridge.listDirectory({ path });
        return entries;
      }
      case 'delete': {
        const ok = await bridge.deleteFile(path);
        return ok ? `Deleted ${path}` : `Failed to delete ${path}`;
      }
      default:
        throw new Error(`Unsupported filesystem action: ${action}`);
    }
  }
}
