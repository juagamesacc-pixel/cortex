import { FunctionSchema } from '../tools/BaseTool';
import { ToolCall } from '../agent/types';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: FunctionSchema[];
  responseFormat?: 'text' | 'json';
  systemPrompt?: string;
}

export interface LLMResponse {
  content: string;
  toolCalls?: ToolCall[];
  promptTokens?: number;
  completionTokens?: number;
  model: string;
}

export interface StreamChunk {
  deltaContent?: string;
  deltaToolCalls?: ToolCall[];
  done: boolean;
}

export interface LLMProvider {
  readonly name: string;
  complete(messages: ChatMessage[], options?: CompletionOptions): Promise<LLMResponse>;
  stream(
    messages: ChatMessage[],
    options: CompletionOptions,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<LLMResponse>;
}
