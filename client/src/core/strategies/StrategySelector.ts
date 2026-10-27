import { BaseStrategy } from './BaseStrategy';
import { ReactStrategy } from './ReactStrategy';
import { HTNStrategy } from './HTNStrategy';
import { LATSStrategy } from './LATSStrategy';
import { HorizonType, StrategyType } from '../agent/types';

export class StrategySelector {
  private reactStrategy: ReactStrategy = new ReactStrategy();
  private htnStrategy: HTNStrategy = new HTNStrategy();
  private latsStrategy: LATSStrategy = new LATSStrategy();

  public getStrategy(type: StrategyType): BaseStrategy {
    switch (type) {
      case 'react':
        return this.reactStrategy;
      case 'htn':
        return this.htnStrategy;
      case 'lats':
        return this.latsStrategy;
      default:
        return this.reactStrategy;
    }
  }

  public getStrategyForHorizon(horizon: HorizonType): BaseStrategy {
    switch (horizon) {
      case 'short':
        return this.reactStrategy;
      case 'medium':
        return this.htnStrategy;
      case 'long':
        return this.latsStrategy;
    }
  }
}

export const strategySelector = new StrategySelector();
