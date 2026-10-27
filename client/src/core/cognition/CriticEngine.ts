import { CriticIssue, CriticPass } from '../agent/types';
import { toolRegistry } from '../tools/ToolRegistry';

export class CriticEngine {
  /**
   * Performs automated evaluation and verification pass on agent deliverables
   */
  public async evaluate(params: {
    targetOutput: string;
    targetType: 'code' | 'command_output' | 'plan';
    goal: string;
  }): Promise<CriticPass> {
    const { targetOutput, targetType, goal } = params;
    const issues: CriticIssue[] = [];
    const toolsUsed: string[] = [];

    // Verification check 1: Null/Empty checks
    if (!targetOutput || targetOutput.trim().length === 0) {
      issues.push({
        severity: 'critical',
        aspect: 'Completeness',
        description: 'Output is empty or undefined.',
        suggestion: 'Re-invoke execution engine with explicit fallback instructions.',
      });
    }

    // Verification check 2: Syntax / Markdown bracket checks
    if (targetType === 'code') {
      const openBraces = (targetOutput.match(/{/g) || []).length;
      const closeBraces = (targetOutput.match(/}/g) || []).length;
      if (openBraces !== closeBraces) {
        issues.push({
          severity: 'major',
          aspect: 'Syntax Balance',
          description: `Unbalanced curly braces in generated code (${openBraces} '{' vs ${closeBraces} '}').`,
          suggestion: 'Ensure complete closing braces and blocks before saving.',
        });
      }
    }

    // Verification check 3: Bash command errors
    if (targetOutput.includes('command not found') || targetOutput.includes('Exit Code: 127')) {
      issues.push({
        severity: 'critical',
        aspect: 'Environment Availability',
        description: 'Shell command failed due to missing binary in host environment.',
        suggestion: 'Verify runtime with system_ops get_runtimes before calling binary.',
      });
      toolsUsed.push('bash');
    }

    const passed = issues.filter((i) => i.severity === 'critical').length === 0;
    const confidence = passed ? (issues.length === 0 ? 0.95 : 0.75) : 0.2;

    return {
      target: targetOutput.slice(0, 100),
      verificationToolsUsed: toolsUsed,
      issues,
      passed,
      confidence,
      suggestedRevision: passed ? undefined : `Revise based on critique: ${issues.map((i) => i.description).join('; ')}`,
    };
  }
}

export const criticEngine = new CriticEngine();
