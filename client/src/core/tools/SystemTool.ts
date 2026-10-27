import { BaseTool, ToolParameterSchema } from './BaseTool';
import { bridge } from '../../bridge/BridgeClient';

export class SystemTool extends BaseTool {
  readonly name = 'system_ops';
  readonly description =
    'Query device information (battery, memory, runtimes), manage Android clipboard, or emit system notifications.';

  readonly parameters: ToolParameterSchema = {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['get_device_info', 'get_clipboard', 'set_clipboard', 'notify', 'get_runtimes'],
        description: 'System operation to perform.',
      },
      text: {
        type: 'string',
        description: 'Text string for set_clipboard.',
      },
      title: {
        type: 'string',
        description: 'Title string for notification.',
      },
      body: {
        type: 'string',
        description: 'Body string for notification.',
      },
    },
    required: ['action'],
  };

  protected async run(args: Record<string, any>): Promise<any> {
    const action = args.action as string;

    switch (action) {
      case 'get_device_info':
        return await bridge.getDeviceInfo();
      case 'get_clipboard':
        return await bridge.getClipboard();
      case 'set_clipboard':
        if (!args.text) throw new Error('text required for set_clipboard');
        await bridge.setClipboard(args.text);
        return 'Clipboard updated successfully';
      case 'notify':
        await bridge.showNotification({
          title: args.title || 'Cortex Agent',
          body: args.body || 'Task update available',
        });
        return 'Notification posted';
      case 'get_runtimes':
        return await bridge.getAvailableRuntimes();
      default:
        throw new Error(`Unknown system action: ${action}`);
    }
  }
}
