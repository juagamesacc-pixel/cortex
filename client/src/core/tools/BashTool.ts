import { BaseTool, ToolParameterSchema } from './BaseTool';
import { bridge } from '../../bridge/BridgeClient';

export class BashTool extends BaseTool {
  readonly name = 'bash';
  readonly description =
    'Execute arbitrary shell/bash commands natively on Android. Supports command chaining, piping, environment variables, and returns stdout/stderr with exit code.';

  readonly parameters: ToolParameterSchema = {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The shell command or script line to execute.',
      },
      workingDir: {
        type: 'string',
        description: 'Optional working directory path (defaults to app workspace).',
      },
      timeoutMs: {
        type: 'number',
        description: 'Execution timeout in milliseconds (default: 30000).',
      },
    },
    required: ['command'],
  };

  protected async run(
    args: Record<string, any>,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    const command = args.command as string;
    const workingDir = args.workingDir as string | undefined;
    const timeoutMs = args.timeoutMs as number | undefined;

    if (onChunk) {
      const result = await bridge.executeShellStreaming(
        { command, workingDir, timeoutMs },
        (chunk) => onChunk(chunk.data)
      );

      let formatted = result.stdout;
      if (result.stderr) {
        formatted += `\n[STDERR]:\n${result.stderr}`;
      }
      formatted += `\n[Exit Code: ${result.exitCode}]`;

      if (result.exitCode !== 0) {
        throw new Error(formatted);
      }
      return formatted;
    } else {
      const result = await bridge.executeShell({ command, workingDir, timeoutMs });
      let formatted = result.stdout;
      if (result.stderr) {
        formatted += `\n[STDERR]:\n${result.stderr}`;
      }
      formatted += `\n[Exit Code: ${result.exitCode}]`;

      if (result.exitCode !== 0) {
        throw new Error(formatted);
      }
      return formatted;
    }
  }
}
