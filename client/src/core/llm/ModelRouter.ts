import { LLMProvider } from './LLMProvider';
import { OpenAIProvider } from './OpenAIProvider';
import { HorizonType, StrategyType } from '../agent/types';

export interface ModelRouteDecision {
  provider: LLMProvider;
  model: string;
  temperature: number;
  maxTokens: number;
  reason: string;
}

export class ModelRouter {
  private static instance: ModelRouter | null = null;
  private defaultProvider: LLMProvider;

  private constructor() {
    this.defaultProvider = new OpenAIProvider();
  }

  public static getInstance(): ModelRouter {
    if (!ModelRouter.instance) {
      ModelRouter.instance = new ModelRouter();
    }
    return ModelRouter.instance;
  }

  public setDefaultProvider(provider: LLMProvider): void {
    this.defaultProvider = provider;
  }

  public getProvider(): LLMProvider {
    return this.defaultProvider;
  }

  public route(
    phase: 'perception' | 'react' | 'planning' | 'lats' | 'reflection' | 'critic',
    horizon: HorizonType,
    strategy: StrategyType
  ): ModelRouteDecision {
    switch (phase) {
      case 'perception':
        return {
          provider: this.defaultProvider,
          model: 'gpt-4o-mini',
          temperature: 0.1,
          maxTokens: 512,
          reason: 'Fast, low latency perception and classification',
        };
      case 'react':
        return {
          provider: this.defaultProvider,
          model: 'gpt-4o',
          temperature: 0.2,
          maxTokens: 1024,
          reason: 'Balanced precision tool calling for short horizon execution',
        };
      case 'planning':
        return {
          provider: this.defaultProvider,
          model: 'gpt-4o',
          temperature: 0.3,
          maxTokens: 2048,
          reason: 'Structured decomposition and DAG dependency analysis',
        };
      case 'lats':
        return {
          provider: this.defaultProvider,
          model: 'gpt-4o',
          temperature: 0.5,
          maxTokens: 1536,
          reason: 'Exploratory branch expansion and heuristic evaluation',
        };
      case 'reflection':
      case 'critic':
        return {
          provider: this.defaultProvider,
          model: 'gpt-4o-mini',
          temperature: 0.2,
          maxTokens: 1024,
          reason: 'Objective verification and critique pass',
        };
    }
  }
}

export const modelRouter = ModelRouter.getInstance();
