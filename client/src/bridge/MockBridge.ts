import {
  BridgeInterface,
  BridgeStreamChunk,
  DeviceInfo,
  FileInfo,
  FileListParams,
  FileReadParams,
  FileWriteParams,
  HttpRequestParams,
  HttpResponse,
  NotificationParams,
  ShellExecuteParams,
  ShellResult,
} from './types';

/**
 * MockBridge provides a high-fidelity simulation of the Android native bridge
 * for local development, testing, and web preview environments.
 */
export class MockBridge implements BridgeInterface {
  readonly isNative = false;

  // In-memory virtual filesystem
  private virtualFs: Map<string, string> = new Map([
    ['/workspace/README.md', '# Cortex Workspace\nInitialized virtual environment.'],
    ['/workspace/config.json', '{\n  "mode": "standalone",\n  "version": "1.0.0"\n}'],
  ]);

  private clipboardText = '';

  constructor() {
    console.info('[MockBridge] Initialized in development/fallback mode.');
  }

  async executeShell(params: ShellExecuteParams): Promise<ShellResult> {
    const startTime = performance.now();
    const cmd = params.command.trim();

    // Builtin simulated commands
    if (cmd === 'pwd') {
      return {
        exitCode: 0,
        stdout: params.workingDir || '/workspace',
        stderr: '',
        timedOut: false,
        durationMs: Math.round(performance.now() - startTime),
      };
    }

    if (cmd === 'date') {
      return {
        exitCode: 0,
        stdout: new Date().toISOString(),
        stderr: '',
        timedOut: false,
        durationMs: Math.round(performance.now() - startTime),
      };
    }

    if (cmd === 'whoami') {
      return {
        exitCode: 0,
        stdout: 'u0_a248 (cortex-user)',
        stderr: '',
        timedOut: false,
        durationMs: Math.round(performance.now() - startTime),
      };
    }

    if (cmd.startsWith('echo ')) {
      const text = cmd.slice(5).replace(/^['"]|['"]$/g, '');
      return {
        exitCode: 0,
        stdout: text,
        stderr: '',
        timedOut: false,
        durationMs: Math.round(performance.now() - startTime),
      };
    }

    if (cmd === 'ls' || cmd.startsWith('ls ')) {
      const files = Array.from(this.virtualFs.keys())
        .map((k) => k.replace('/workspace/', ''))
        .filter((k) => !k.startsWith('.'));
      return {
        exitCode: 0,
        stdout: files.join('  '),
        stderr: '',
        timedOut: false,
        durationMs: Math.round(performance.now() - startTime),
      };
    }

    if (cmd.startsWith('cat ')) {
      const target = cmd.slice(4).trim();
      const resolved = target.startsWith('/') ? target : `/workspace/${target}`;
      const content = this.virtualFs.get(resolved);
      if (content !== undefined) {
        return {
          exitCode: 0,
          stdout: content,
          stderr: '',
          timedOut: false,
          durationMs: Math.round(performance.now() - startTime),
        };
      }
      return {
        exitCode: 1,
        stdout: '',
        stderr: `cat: ${target}: No such file or directory`,
        timedOut: false,
        durationMs: Math.round(performance.now() - startTime),
      };
    }

    if (cmd.startsWith('mkdir ')) {
      const dirName = cmd.slice(6).trim();
      this.virtualFs.set(`/workspace/${dirName}/.keep`, '');
      return {
        exitCode: 0,
        stdout: '',
        stderr: '',
        timedOut: false,
        durationMs: Math.round(performance.now() - startTime),
      };
    }

    // Default simulated shell response
    return {
      exitCode: 0,
      stdout: `[MockShell: executed "${cmd}"]\nOperation completed successfully in virtual environment.`,
      stderr: '',
      timedOut: false,
      durationMs: Math.round(performance.now() - startTime) + 45,
    };
  }

  async executeShellStreaming(
    params: ShellExecuteParams,
    onChunk: (chunk: BridgeStreamChunk) => void
  ): Promise<ShellResult> {
    const id = `mock-stream-${Date.now()}`;
    const startTime = performance.now();

    onChunk({
      id,
      type: 'stdout',
      data: `[Streaming execution started: ${params.command}]\n`,
      timestamp: Date.now(),
    });

    await new Promise((r) => setTimeout(r, 60));

    onChunk({
      id,
      type: 'stdout',
      data: '-> Allocating process resources...\n',
      timestamp: Date.now(),
    });

    await new Promise((r) => setTimeout(r, 80));

    const result = await this.executeShell(params);

    onChunk({
      id,
      type: 'stdout',
      data: result.stdout + (result.stdout.endsWith('\n') ? '' : '\n'),
      timestamp: Date.now(),
    });

    onChunk({
      id,
      type: 'complete',
      data: `Process exited with code ${result.exitCode}`,
      timestamp: Date.now(),
    });

    return {
      ...result,
      durationMs: Math.round(performance.now() - startTime),
    };
  }

  async readFile(params: FileReadParams): Promise<string> {
    const content = this.virtualFs.get(params.path);
    if (content === undefined) {
      throw new Error(`File not found: ${params.path}`);
    }
    return content;
  }

  async writeFile(params: FileWriteParams): Promise<boolean> {
    if (params.append) {
      const existing = this.virtualFs.get(params.path) || '';
      this.virtualFs.set(params.path, existing + params.content);
    } else {
      this.virtualFs.set(params.path, params.content);
    }
    return true;
  }

  async listDirectory(params: FileListParams): Promise<FileInfo[]> {
    const entries: FileInfo[] = [];
    for (const [filePath, content] of this.virtualFs.entries()) {
      if (filePath.startsWith(params.path)) {
        const relativeName = filePath.slice(params.path.length).replace(/^\//, '');
        entries.push({
          name: relativeName,
          path: filePath,
          isDirectory: false,
          sizeBytes: content.length,
          modifiedTimestamp: Date.now(),
        });
      }
    }
    return entries;
  }

  async deleteFile(path: string): Promise<boolean> {
    return this.virtualFs.delete(path);
  }

  async httpRequest(params: HttpRequestParams): Promise<HttpResponse> {
    const startTime = performance.now();
    try {
      const response = await fetch(params.url, {
        method: params.method,
        headers: params.headers,
        body: params.body,
      });

      const text = await response.text();
      const headersRecord: Record<string, string> = {};
      response.headers.forEach((v, k) => {
        headersRecord[k] = v;
      });

      return {
        statusCode: response.status,
        headers: headersRecord,
        body: text,
        durationMs: Math.round(performance.now() - startTime),
      };
    } catch (err: any) {
      return {
        statusCode: 0,
        headers: {},
        body: `HTTP Fetch Error: ${err.message}`,
        durationMs: Math.round(performance.now() - startTime),
      };
    }
  }

  async getDeviceInfo(): Promise<DeviceInfo> {
    return {
      manufacturer: 'Google/Android Virtual Device',
      model: 'Cortex Virtual Host',
      androidVersion: 'Android 15 (Vanilla Ice Cream)',
      sdkInt: 35,
      availableMemoryBytes: 6 * 1024 * 1024 * 1024,
      batteryLevelPercent: 92,
      isCharging: true,
      networkType: 'WIFI',
      availableRuntimes: ['bash', 'sh', 'node', 'python3'],
    };
  }

  async showNotification(params: NotificationParams): Promise<boolean> {
    console.info(`[Notification] ${params.title}: ${params.body}`);
    return true;
  }

  async getClipboard(): Promise<string> {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
      try {
        return await navigator.clipboard.readText();
      } catch {
        return this.clipboardText;
      }
    }
    return this.clipboardText;
  }

  async setClipboard(text: string): Promise<boolean> {
    this.clipboardText = text;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // Fallback to internal buffer
      }
    }
    return true;
  }

  async getAvailableRuntimes(): Promise<string[]> {
    return ['bash', 'sh', 'node', 'python3', 'git'];
  }
}
