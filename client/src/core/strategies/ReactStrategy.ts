import { BaseStrategy } from './BaseStrategy';
import { ReActStep, StrategyType, ToolCall } from '../agent/types';
import { ACS_CONFIG } from '../agent/constants';
import { modelRouter } from '../llm/ModelRouter';
import { promptManager } from '../llm/PromptManager';
import { toolRegistry } from '../tools/ToolRegistry';
import { memoryManager } from '../memory/MemoryManager';
import { ChatMessage } from '../llm/LLMProvider';

export class ReactStrategy extends BaseStrategy {
  readonly type: StrategyType = 'react';

  async execute(params: {
    goal: string;
    onStep?: (step: ReActStep) => void;
  }): Promise<{
    success: boolean;
    finalResponse: string;
    steps: ReActStep[];
    durationMs: number;
  }> {
    const startTime = performance.now();
    const { goal, onStep } = params;
    const steps: ReActStep[] = [];
    const memoryContext = await memoryManager.assemblePromptContext(goal);
    const tools = toolRegistry.getSchemas();

    const systemPrompt = promptManager.buildSystemPrompt({
      availableTools: tools,
      memoryContext,
      horizonClass: 'short',
      strategy: 'react',
    });

    const conversationHistory: ChatMessage[] = [
      {
        role: 'user',
        content: `Goal: ${goal}\n\nExecute reactive steps to accomplish this goal. Alternate between reasoning (Thought) and action (Tool Call). When finished, output your clear final answer.`,
      },
    ];

    let currentStepIndex = 1;
    let finalAnswer = '';
    let success = true;

    while (currentStepIndex <= ACS_CONFIG.REACT_MAX_STEPS) {
      const stepStartTime = performance.now();
      const route = modelRouter.route('react', 'short', 'react');

      this.emit('thinking', { stepIndex: currentStepIndex });

      // Call LLM for next thought and tool action
      const response = await route.provider.complete(conversationHistory, {
        model: route.model,
        temperature: route.temperature,
        maxTokens: route.maxTokens,
        tools,
        systemPrompt,
      });

      const thought = response.content || 'Determining next action step...';
      const toolCall: ToolCall | undefined = response.toolCalls?.[0];

      if (!toolCall) {
        // No further tool calls -> Final answer reached
        finalAnswer = thought;
        const finalStep: ReActStep = {
          index: currentStepIndex,
          thought,
          confidence: 0.95,
          durationMs: Math.round(performance.now() - stepStartTime),
          timestamp: Date.now(),
        };
        steps.push(finalStep);
        if (onStep) onStep(finalStep);
        break;
      }

      // Add assistant step to history
      conversationHistory.push({
        role: 'assistant',
        content: thought,
        toolCalls: [toolCall],
      });

      // Execute tool call via host bridge
      const toolResult = await this.executeToolCall(toolCall);
      const observation = toolResult.success
        ? toolResult.output
        : `[Tool Error]: ${toolResult.error}`;

      // Calculate confidence
      const confidence = toolResult.success ? 0.85 : 0.25;

      const step: ReActStep = {
        index: currentStepIndex,
        thought,
        action: toolCall,
        observation,
        confidence,
        durationMs: Math.round(performance.now() - stepStartTime),
        timestamp: Date.now(),
      };

      steps.push(step);
      if (onStep) onStep(step);

      // Record in history for next iteration
      conversationHistory.push({
        role: 'tool',
        content: observation,
        toolCallId: toolCall.id,
      });

      if (!toolResult.success && currentStepIndex >= 3) {
        success = false;
      }

      currentStepIndex++;
    }

    if (!finalAnswer && steps.length > 0) {
      finalAnswer = steps[steps.length - 1].observation || 'Task execution finished.';
    }

    return {
      success,
      finalResponse: finalAnswer,
      steps,
      durationMs: Math.round(performance.now() - startTime),
    };
  }
}
