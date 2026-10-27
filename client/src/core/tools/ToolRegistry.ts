import { BaseTool, FunctionSchema } from './BaseTool';
import { BashTool } from './BashTool';
import { FileSystemTool } from './FileSystemTool';
import { HttpTool } from './HttpTool';
import { CodeTool } from './CodeTool';
import { SearchTool } from './SearchTool';
import { SystemTool } from './SystemTool';
import { ToolExecutionResult } from '../agent/types';

export interface ToolUsageStats {
  callCount: number;
  successCount: number;
  failureCount: number;
  totalDurationMs: number;
  averageDurationMs: number;
  lastUsedTimestamp: number;
}

export class ToolRegistry {
  private static instance: ToolRegistry | null = null;
  private tools: Map<string, BaseTool> = new Map();
  private stats: Map<string, ToolUsageStats> = new Map();

  private constructor() {
    this.registerDefaults();
  }

  public static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  private registerDefaults(): void {
    this.register(new BashTool());
    this.register(new FileSystemTool());
    this.register(new HttpTool());
    this.register(new CodeTool());
    this.register(new SearchTool());
    this.register(new SystemTool());
  }

  public register(tool: BaseTool): void {
    this.tools.set(tool.name, tool);
    if (!this.stats.has(tool.name)) {
      this.stats.set(tool.name, {
        callCount: 0,
        successCount: 0,
        failureCount: 0,
        totalDurationMs: 0,
        averageDurationMs: 0,
        lastUsedTimestamp: 0,
      });
    }
  }

  public unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  public get(name: string): BaseTool | undefined {
    return this.tools.get(name);
  }

  public getAll(): BaseTool[] {
    return Array.from(this.tools.values());
  }

  public getSchemas(): FunctionSchema[] {
    return this.getAll().map((t) => t.schema);
  }

  public recordUsage(result: ToolExecutionResult): void {
    const s = this.stats.get(result.tool);
    if (!s) return;

    s.callCount++;
    if (result.success) {
      s.successCount++;
    } else {
      s.failureCount++;
    }
    s.totalDurationMs += result.durationMs;
    s.averageDurationMs = Math.round(s.totalDurationMs / s.callCount);
    s.lastUsedTimestamp = Date.now();
  }

  public getStats(name: string): ToolUsageStats | undefined {
    return this.stats.get(name);
  }

  public getAllStats(): Record<string, ToolUsageStats> {
    const res: Record<string, ToolUsageStats> = {};
    for (const [k, v] of this.stats.entries()) {
      res[k] = { ...v };
    }
    return res;
  }
}

export const toolRegistry = ToolRegistry.getInstance();
