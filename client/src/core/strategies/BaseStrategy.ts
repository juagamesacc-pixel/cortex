import { AgentEventListener, ReActStep, StrategyType, ToolCall, ToolExecutionResult } from '../agent/types';
import { toolRegistry } from '../tools/ToolRegistry';

export abstract class BaseStrategy {
  abstract readonly type: StrategyType;
  protected listeners: Set<AgentEventListener> = new Set();

  public addEventListener(listener: AgentEventListener): void {
    this.listeners.add(listener);
  }

  public removeEventListener(listener: AgentEventListener): void {
    this.listeners.delete(listener);
  }

  protected emit(type: any, payload: any): void {
    const event = { type, timestamp: Date.now(), payload };
    for (const l of this.listeners) {
      try {
        l(event);
      } catch (err) {
        console.error('[StrategyEvent Error]', err);
      }
    }
  }

  protected async executeToolCall(
    toolCall: ToolCall,
    onChunk?: (chunk: string) => void
  ): Promise<ToolExecutionResult> {
    const tool = toolRegistry.get(toolCall.tool);
    if (!tool) {
      return {
        toolCallId: toolCall.id,
        tool: toolCall.tool,
        success: false,
        output: '',
        error: `Tool "${toolCall.tool}" is not registered in ToolRegistry.`,
        durationMs: 0,
      };
    }

    this.emit('tool_start', { toolCall });

    const result = await tool.execute(toolCall.args, (chunk) => {
      this.emit('tool_chunk', { toolCallId: toolCall.id, chunk });
      if (onChunk) onChunk(chunk);
    });

    toolRegistry.recordUsage(result);
    this.emit('tool_end', { result });

    return result;
  }

  abstract execute(params: {
    goal: string;
    onStep?: (step: ReActStep) => void;
  }): Promise<{
    success: boolean;
    finalResponse: string;
    steps: ReActStep[];
    durationMs: number;
  }>;
}
