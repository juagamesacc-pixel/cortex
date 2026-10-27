export interface ParsedIntent {
  rawInput: string;
  category: 'direct_command' | 'factual_query' | 'multi_step_goal' | 'code_modification' | 'troubleshooting';
  entities: {
    filePaths: string[];
    urls: string[];
    shellCommands: string[];
    codeSnippets: string[];
  };
  urgency: 'low' | 'normal' | 'high';
}

export class PerceptionEngine {
  public parse(input: string): ParsedIntent {
    const trimmed = input.trim();

    // Extract file paths
    const pathRegex = /(?:\/[\w.-]+)+|(?:(?:\.{1,2}\/)?[\w.-]+\.[a-zA-Z0-9]+)/g;
    const filePaths = Array.from(new Set(trimmed.match(pathRegex) || []));

    // Extract URLs
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = Array.from(new Set(trimmed.match(urlRegex) || []));

    // Extract code snippets enclosed in backticks
    const codeRegex = /`{1,3}([^`]+)`{1,3}/g;
    const codeSnippets: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = codeRegex.exec(trimmed)) !== null) {
      codeSnippets.push(match[1]);
    }

    // Identify category
    let category: ParsedIntent['category'] = 'factual_query';
    const lower = trimmed.toLowerCase();

    if (
      lower.startsWith('$') ||
      lower.startsWith('bash ') ||
      lower.startsWith('sh ') ||
      lower.startsWith('cd ') ||
      lower.startsWith('ls ') ||
      lower.startsWith('mkdir ') ||
      lower.startsWith('npm ') ||
      lower.startsWith('pnpm ')
    ) {
      category = 'direct_command';
    } else if (
      lower.includes('fix') ||
      lower.includes('error') ||
      lower.includes('bug') ||
      lower.includes('failed') ||
      lower.includes('crash')
    ) {
      category = 'troubleshooting';
    } else if (
      lower.includes('edit') ||
      lower.includes('modify') ||
      lower.includes('refactor') ||
      lower.includes('write code')
    ) {
      category = 'code_modification';
    } else if (
      lower.includes('create') ||
      lower.includes('build') ||
      lower.includes('setup') ||
      lower.includes('develop') ||
      lower.includes('deploy') ||
      lower.includes('automate') ||
      trimmed.length > 80
    ) {
      category = 'multi_step_goal';
    }

    return {
      rawInput: trimmed,
      category,
      entities: {
        filePaths,
        urls,
        shellCommands: codeSnippets.filter((c) => c.includes(' ') && !c.includes('\n')),
        codeSnippets,
      },
      urgency: lower.includes('urgent') || lower.includes('asap') ? 'high' : 'normal',
    };
  }
}
