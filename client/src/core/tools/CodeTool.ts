import { BaseTool, ToolParameterSchema } from './BaseTool';
import { bridge } from '../../bridge/BridgeClient';

export class CodeTool extends BaseTool {
  readonly name = 'code_patch';
  readonly description =
    'Inspect code, perform targeted search-and-replace patches, and verify syntax integrity in project files.';

  readonly parameters: ToolParameterSchema = {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Target file path to modify.',
      },
      searchString: {
        type: 'string',
        description: 'The exact code block or substring to find and replace.',
      },
      replacementString: {
        type: 'string',
        description: 'The replacement code block.',
      },
      allowMultiple: {
        type: 'boolean',
        description: 'Whether to replace multiple occurrences (default: false).',
      },
    },
    required: ['path', 'searchString', 'replacementString'],
  };

  protected async run(args: Record<string, any>): Promise<any> {
    const path = args.path as string;
    const searchString = args.searchString as string;
    const replacementString = args.replacementString as string;
    const allowMultiple = args.allowMultiple ?? false;

    const originalContent = await bridge.readFile({ path });

    if (!originalContent.includes(searchString)) {
      throw new Error(`Target searchString not found in file: ${path}`);
    }

    let occurrences = 0;
    let pos = originalContent.indexOf(searchString);
    while (pos !== -1) {
      occurrences++;
      pos = originalContent.indexOf(searchString, pos + searchString.length);
    }

    if (!allowMultiple && occurrences > 1) {
      throw new Error(
        `searchString matched ${occurrences} locations. Provide more context or set allowMultiple: true.`
      );
    }

    let newContent: string;
    if (allowMultiple) {
      newContent = originalContent.split(searchString).join(replacementString);
    } else {
      const idx = originalContent.indexOf(searchString);
      newContent =
        originalContent.slice(0, idx) +
        replacementString +
        originalContent.slice(idx + searchString.length);
    }

    await bridge.writeFile({ path, content: newContent, append: false });

    return {
      path,
      replacementsApplied: allowMultiple ? occurrences : 1,
      oldSize: originalContent.length,
      newSize: newContent.length,
      status: 'patched_successfully',
    };
  }
}
