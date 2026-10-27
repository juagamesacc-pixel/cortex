import {
  BridgeInterface,
  BridgeResponse,
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
import { MockBridge } from './MockBridge';

/**
 * BridgeClient is the unified gateway through which the React agentic core
 * invokes all host native platform capabilities.
 */
export class BridgeClient implements BridgeInterface {
  private static instance: BridgeClient | null = null;
  private mockFallback: MockBridge;
  private streamHandlers: Map<string, (chunk: BridgeStreamChunk) => void> = new Map();
  private streamCompleters: Map<string, (result: ShellResult) => void> = new Map();

  private constructor() {
    this.mockFallback = new MockBridge();
    this.setupWindowBridgeListeners();
  }

  public static getInstance(): BridgeClient {
    if (!BridgeClient.instance) {
      BridgeClient.instance = new BridgeClient();
    }
    return BridgeClient.instance;
  }

  public get isNative(): boolean {
    return typeof window !== 'undefined' && typeof window.CortexNative !== 'undefined';
  }

  private setupWindowBridgeListeners(): void {
    if (typeof window === 'undefined') return;

    window.__cortexBridge = {
      onStreamChunk: (requestId: string, chunkJson: string) => {
        try {
          const chunk: BridgeStreamChunk = JSON.parse(chunkJson);
          const handler = this.streamHandlers.get(requestId);
          if (handler) {
            handler(chunk);
          }
        } catch (e) {
          console.error('[BridgeClient] Error handling stream chunk:', e);
        }
      },
      onStreamComplete: (requestId: string, resultJson: string) => {
        try {
          const result: ShellResult = JSON.parse(resultJson);
          const completer = this.streamCompleters.get(requestId);
          if (completer) {
            completer(result);
            this.streamHandlers.delete(requestId);
            this.streamCompleters.delete(requestId);
          }
        } catch (e) {
          console.error('[BridgeClient] Error handling stream completion:', e);
        }
      },
    };
  }

  private generateId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  async executeShell(params: ShellExecuteParams): Promise<ShellResult> {
    if (!this.isNative) {
      return this.mockFallback.executeShell(params);
    }

    try {
      const responseStr = window.CortexNative!.executeCommand(JSON.stringify(params));
      const res: BridgeResponse<ShellResult> = JSON.parse(responseStr);
      if (!res.success || !res.data) {
        throw new Error(res.error?.message || 'Native shell execution failed');
      }
      return res.data;
    } catch (err: any) {
      console.warn('[BridgeClient] Native executeCommand threw, falling back to mock:', err);
      return this.mockFallback.executeShell(params);
    }
  }

  async executeShellStreaming(
    params: ShellExecuteParams,
    onChunk: (chunk: BridgeStreamChunk) => void
  ): Promise<ShellResult> {
    if (!this.isNative) {
      return this.mockFallback.executeShellStreaming(params, onChunk);
    }

    const requestId = this.generateId();

    return new Promise((resolve) => {
      this.streamHandlers.set(requestId, onChunk);
      this.streamCompleters.set(requestId, resolve);

      try {
        window.CortexNative!.executeCommandAsync(requestId, JSON.stringify(params));
      } catch (err) {
        console.error('[BridgeClient] Failed to invoke async native command:', err);
        this.streamHandlers.delete(requestId);
        this.streamCompleters.delete(requestId);
        // Fall back to mock
        this.mockFallback.executeShellStreaming(params, onChunk).then(resolve);
      }
    });
  }

  async readFile(params: FileReadParams): Promise<string> {
    if (!this.isNative) {
      return this.mockFallback.readFile(params);
    }
    try {
      const resStr = window.CortexNative!.readFile(params.path);
      const res: BridgeResponse<string> = JSON.parse(resStr);
      if (!res.success || res.data === undefined) {
        throw new Error(res.error?.message || `Failed to read file ${params.path}`);
      }
      return res.data;
    } catch {
      return this.mockFallback.readFile(params);
    }
  }

  async writeFile(params: FileWriteParams): Promise<boolean> {
    if (!this.isNative) {
      return this.mockFallback.writeFile(params);
    }
    try {
      const resStr = window.CortexNative!.writeFile(
        params.path,
        params.content,
        params.append ?? false
      );
      const res: BridgeResponse<boolean> = JSON.parse(resStr);
      return res.success;
    } catch {
      return this.mockFallback.writeFile(params);
    }
  }

  async listDirectory(params: FileListParams): Promise<FileInfo[]> {
    if (!this.isNative) {
      return this.mockFallback.listDirectory(params);
    }
    try {
      const resStr = window.CortexNative!.listDirectory(params.path);
      const res: BridgeResponse<FileInfo[]> = JSON.parse(resStr);
      return res.data || [];
    } catch {
      return this.mockFallback.listDirectory(params);
    }
  }

  async deleteFile(path: string): Promise<boolean> {
    if (!this.isNative) {
      return this.mockFallback.deleteFile(path);
    }
    try {
      const resStr = window.CortexNative!.deleteFile(path);
      const res: BridgeResponse<boolean> = JSON.parse(resStr);
      return res.success;
    } catch {
      return this.mockFallback.deleteFile(path);
    }
  }

  async httpRequest(params: HttpRequestParams): Promise<HttpResponse> {
    if (!this.isNative) {
      return this.mockFallback.httpRequest(params);
    }
    try {
      const resStr = window.CortexNative!.httpRequest(JSON.stringify(params));
      const res: BridgeResponse<HttpResponse> = JSON.parse(resStr);
      if (!res.success || !res.data) {
        throw new Error(res.error?.message || 'Native HTTP request failed');
      }
      return res.data;
    } catch {
      return this.mockFallback.httpRequest(params);
    }
  }

  async getDeviceInfo(): Promise<DeviceInfo> {
    if (!this.isNative) {
      return this.mockFallback.getDeviceInfo();
    }
    try {
      const resStr = window.CortexNative!.getDeviceInfo();
      const res: BridgeResponse<DeviceInfo> = JSON.parse(resStr);
      return res.data || (await this.mockFallback.getDeviceInfo());
    } catch {
      return this.mockFallback.getDeviceInfo();
    }
  }

  async showNotification(params: NotificationParams): Promise<boolean> {
    if (!this.isNative) {
      return this.mockFallback.showNotification(params);
    }
    try {
      const resStr = window.CortexNative!.showNotification(params.title, params.body);
      const res: BridgeResponse<boolean> = JSON.parse(resStr);
      return res.success;
    } catch {
      return this.mockFallback.showNotification(params);
    }
  }

  async getClipboard(): Promise<string> {
    if (!this.isNative) {
      return this.mockFallback.getClipboard();
    }
    try {
      const resStr = window.CortexNative!.getClipboard();
      const res: BridgeResponse<string> = JSON.parse(resStr);
      return res.data || '';
    } catch {
      return this.mockFallback.getClipboard();
    }
  }

  async setClipboard(text: string): Promise<boolean> {
    if (!this.isNative) {
      return this.mockFallback.setClipboard(text);
    }
    try {
      const resStr = window.CortexNative!.setClipboard(text);
      const res: BridgeResponse<boolean> = JSON.parse(resStr);
      return res.success;
    } catch {
      return this.mockFallback.setClipboard(text);
    }
  }

  async getAvailableRuntimes(): Promise<string[]> {
    if (!this.isNative) {
      return this.mockFallback.getAvailableRuntimes();
    }
    try {
      const resStr = window.CortexNative!.getAvailableRuntimes();
      const res: BridgeResponse<string[]> = JSON.parse(resStr);
      return res.data || ['bash', 'sh'];
    } catch {
      return this.mockFallback.getAvailableRuntimes();
    }
  }
}

export const bridge = BridgeClient.getInstance();
