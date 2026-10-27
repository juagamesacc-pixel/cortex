import { ChatMessage, CompletionOptions, LLMProvider, LLMResponse, StreamChunk } from './LLMProvider';
import { ToolCall } from '../agent/types';

export class OpenAIProvider implements LLMProvider {
  readonly name = 'OpenAI';
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(
    apiKey = '',
    baseUrl = 'https://api.openai.com/v1',
    defaultModel = 'gpt-4o'
  ) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.defaultModel = defaultModel;
  }

  public setConfig(apiKey: string, baseUrl?: string, model?: string): void {
    this.apiKey = apiKey;
    if (baseUrl) this.baseUrl = baseUrl.replace(/\/$/, '');
    if (model) this.defaultModel = model;
  }

  async complete(messages: ChatMessage[], options?: CompletionOptions): Promise<LLMResponse> {
    if (!this.apiKey) {
      return this.fallbackSimulatedResponse(messages, options);
    }

    const model = options?.model || this.defaultModel;
    const body: Record<string, any> = {
      model,
      messages: this.formatMessages(messages, options?.systemPrompt),
      temperature: options?.temperature ?? 0.2,
      max_tokens: options?.maxTokens ?? 2048,
    };

    if (options?.responseFormat === 'json') {
      body.response_format = { type: 'json_object' };
    }

    if (options?.tools && options.tools.length > 0) {
      body.tools = options.tools.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API error [${response.status}]: ${errText}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const msg = choice?.message;

    let toolCalls: ToolCall[] | undefined;
    if (msg?.tool_calls && Array.isArray(msg.tool_calls)) {
      toolCalls = msg.tool_calls.map((tc: any) => ({
        id: tc.id,
        tool: tc.function.name,
        args: JSON.parse(tc.function.arguments || '{}'),
      }));
    }

    return {
      content: msg?.content || '',
      toolCalls,
      promptTokens: data.usage?.prompt_tokens,
      completionTokens: data.usage?.completion_tokens,
      model,
    };
  }

  async stream(
    messages: ChatMessage[],
    options: CompletionOptions,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<LLMResponse> {
    if (!this.apiKey) {
      // Simulate streaming with simulated response
      const res = await this.fallbackSimulatedResponse(messages, options);
      const parts = res.content.split(' ');
      for (const p of parts) {
        onChunk({ deltaContent: p + ' ', done: false });
        await new Promise((r) => setTimeout(r, 20));
      }
      if (res.toolCalls) {
        onChunk({ deltaToolCalls: res.toolCalls, done: false });
      }
      onChunk({ done: true });
      return res;
    }

    const model = options?.model || this.defaultModel;
    const body: Record<string, any> = {
      model,
      stream: true,
      messages: this.formatMessages(messages, options?.systemPrompt),
      temperature: options?.temperature ?? 0.2,
      max_tokens: options?.maxTokens ?? 2048,
    };

    if (options?.tools && options.tools.length > 0) {
      body.tools = options.tools.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI Streaming error [${response.status}]: ${errText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder('utf-8');
    let accumulatedContent = '';
    const toolCallAccumulators: Record<number, { id: string; name: string; args: string }> = {};

    if (reader) {
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (trimmed.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(trimmed.slice(6));
              const delta = parsed.choices?.[0]?.delta;
              if (delta?.content) {
                accumulatedContent += delta.content;
                onChunk({ deltaContent: delta.content, done: false });
              }
              if (delta?.tool_calls) {
                for (const tc of delta.tool_calls) {
                  const idx = tc.index ?? 0;
                  if (!toolCallAccumulators[idx]) {
                    toolCallAccumulators[idx] = { id: tc.id || '', name: tc.function?.name || '', args: '' };
                  }
                  if (tc.id) toolCallAccumulators[idx].id = tc.id;
                  if (tc.function?.name) toolCallAccumulators[idx].name = tc.function.name;
                  if (tc.function?.arguments) toolCallAccumulators[idx].args += tc.function.arguments;
                }
              }
            } catch {
              // Ignore partial chunk parse error
            }
          }
        }
      }
    }

    onChunk({ done: true });

    const finalToolCalls: ToolCall[] = Object.values(toolCallAccumulators).map((tc) => ({
      id: tc.id || `call_${Date.now()}`,
      tool: tc.name,
      args: tc.args ? JSON.parse(tc.args) : {},
    }));

    return {
      content: accumulatedContent,
      toolCalls: finalToolCalls.length > 0 ? finalToolCalls : undefined,
      model,
    };
  }

  private formatMessages(messages: ChatMessage[], systemPrompt?: string): any[] {
    const out: any[] = [];
    if (systemPrompt) {
      out.push({ role: 'system', content: systemPrompt });
    }
    for (const m of messages) {
      if (m.role === 'tool') {
        out.push({
          role: 'tool',
          tool_call_id: m.toolCallId,
          content: m.content,
        });
      } else if (m.role === 'assistant' && m.toolCalls) {
        out.push({
          role: 'assistant',
          content: m.content || null,
          tool_calls: m.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.tool,
              arguments: JSON.stringify(tc.args),
            },
          })),
        });
      } else {
        out.push({
          role: m.role,
          content: m.content,
        });
      }
    }
    return out;
  }

  private async fallbackSimulatedResponse(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Promise<LLMResponse> {
    const lastMsg = messages[messages.length - 1];
    const userPrompt = lastMsg?.content || '';

    // If tools are provided and user prompt implies an action
    if (options?.tools && options.tools.length > 0) {
      const lower = userPrompt.toLowerCase();
      if (lower.includes('file') || lower.includes('read') || lower.includes('write')) {
        return {
          content: 'I will inspect the workspace files.',
          toolCalls: [
            {
              id: `sim_${Date.now()}`,
              tool: 'file_system',
              args: { action: 'list', path: '/workspace' },
            },
          ],
          model: 'cortex-simulated-engine',
        };
      }
      if (lower.includes('bash') || lower.includes('command') || lower.includes('run') || lower.includes('pwd') || lower.includes('ls')) {
        return {
          content: 'I will run the command via native bash shell.',
          toolCalls: [
            {
              id: `sim_${Date.now()}`,
              tool: 'bash',
              args: { command: 'pwd && ls -la' },
            },
          ],
          model: 'cortex-simulated-engine',
        };
      }
    }

    return {
      content: `I am Cortex, running on Android. I received your request: "${userPrompt}". How would you like me to proceed with execution?`,
      model: 'cortex-simulated-engine',
    };
  }
}
