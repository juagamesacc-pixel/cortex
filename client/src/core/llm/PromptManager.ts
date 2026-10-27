import { DEFAULT_SYSTEM_PROMPT } from '../agent/constants';
import { FunctionSchema } from '../tools/BaseTool';
import { ChatMessage } from './LLMProvider';

export class PromptManager {
  private static instance: PromptManager | null = null;

  public static getInstance(): PromptManager {
    if (!PromptManager.instance) {
      PromptManager.instance = new PromptManager();
    }
    return PromptManager.instance;
  }

  public buildSystemPrompt(params: {
    availableTools: FunctionSchema[];
    memoryContext?: string;
    horizonClass?: string;
    strategy?: string;
    customInstructions?: string;
  }): string {
    const sections: string[] = [DEFAULT_SYSTEM_PROMPT];

    if (params.horizonClass && params.strategy) {
      sections.push(
        `[Cognitive Mode: ${params.horizonClass.toUpperCase()} HORIZON using ${params.strategy.toUpperCase()} strategy]`
      );
    }

    if (params.availableTools && params.availableTools.length > 0) {
      const toolDescriptions = params.availableTools.map(
        (t) => `- \`${t.name}\`: ${t.description}`
      );
      sections.push(`### Available Bridge Tools:\n${toolDescriptions.join('\n')}`);
    }

    if (params.memoryContext) {
      sections.push(`### Accumulated Memory Context:\n${params.memoryContext}`);
    }

    if (params.customInstructions) {
      sections.push(`### Custom User Directives:\n${params.customInstructions}`);
    }

    return sections.join('\n\n');
  }

  public composeReActStepPrompt(goal: string, stepsHistoryText: string): ChatMessage[] {
    return [
      {
        role: 'user',
        content: `Goal: ${goal}\n\nExecution History so far:\n${stepsHistoryText}\n\nRespond with your next THOUGHT, followed by either an ACTION tool call or a FINAL RESPONSE.`,
      },
    ];
  }
}

export const promptManager = PromptManager.getInstance();
