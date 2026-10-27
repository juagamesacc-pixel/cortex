import { ToolExecutionResult } from '../agent/types';

export interface ToolParamProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  enum?: string[];
  items?: { type: string };
  required?: boolean;
}

export interface ToolParameterSchema {
  type: 'object';
  properties: Record<string, ToolParamProperty>;
  required?: string[];
}

export interface FunctionSchema {
  name: string;
  description: string;
  parameters: ToolParameterSchema;
}

export abstract class BaseTool {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly parameters: ToolParameterSchema;

  get schema(): FunctionSchema {
    return {
      name: this.name,
      description: this.description,
      parameters: this.parameters,
    };
  }

  protected validateArgs(args: Record<string, any>): void {
    const required = this.parameters.required || [];
    for (const req of required) {
      if (args[req] === undefined || args[req] === null) {
        throw new Error(`Tool [${this.name}] missing required parameter: "${req}"`);
      }
    }
  }

  async execute(
    args: Record<string, any>,
    onChunk?: (chunk: string) => void
  ): Promise<ToolExecutionResult> {
    const startTime = performance.now();
    const toolCallId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      this.validateArgs(args);
      const output = await this.run(args, onChunk);
      const durationMs = Math.round(performance.now() - startTime);

      return {
        toolCallId,
        tool: this.name,
        success: true,
        output: typeof output === 'string' ? output : JSON.stringify(output, null, 2),
        durationMs,
      };
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - startTime);
      return {
        toolCallId,
        tool: this.name,
        success: false,
        output: '',
        error: err?.message || String(err),
        durationMs,
      };
    }
  }

  async executeWithRetry(
    args: Record<string, any>,
    maxRetries = 2,
    onChunk?: (chunk: string) => void
  ): Promise<ToolExecutionResult> {
    let lastResult: ToolExecutionResult | null = null;
    let delay = 300;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const res = await this.execute(args, onChunk);
      if (res.success) return res;

      lastResult = res;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
      }
    }

    return lastResult!;
  }

  protected abstract run(
    args: Record<string, any>,
    onChunk?: (chunk: string) => void
  ): Promise<any>;
}
