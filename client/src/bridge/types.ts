/**
 * Bridge Protocol Specification for Cortex
 * Defines the contract between JS/React layer and Android Host
 */

export interface BridgeRequest {
  id: string;
  method: string;
  params: Record<string, any>;
  timeoutMs?: number;
  streaming?: boolean;
}

export interface BridgeResponse<T = any> {
  id: string;
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  durationMs: number;
}

export type StreamChunkType = 'stdout' | 'stderr' | 'progress' | 'complete' | 'error';

export interface BridgeStreamChunk {
  id: string;
  type: StreamChunkType;
  data: string;
  timestamp: number;
}

export interface ShellExecuteParams {
  command: string;
  workingDir?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
  mergeStderr?: boolean;
}

export interface ShellResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  durationMs: number;
}

export interface FileReadParams {
  path: string;
  encoding?: 'utf-8' | 'base64';
}

export interface FileWriteParams {
  path: string;
  content: string;
  append?: boolean;
  encoding?: 'utf-8' | 'base64';
}

export interface FileListParams {
  path: string;
  recursive?: boolean;
  maxDepth?: number;
}

export interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  sizeBytes: number;
  modifiedTimestamp: number;
}

export interface HttpRequestParams {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

export interface HttpResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  durationMs: number;
}

export interface DeviceInfo {
  manufacturer: string;
  model: string;
  androidVersion: string;
  sdkInt: number;
  availableMemoryBytes: number;
  batteryLevelPercent: number;
  isCharging: boolean;
  networkType: 'WIFI' | 'CELLULAR' | 'ETHERNET' | 'NONE';
  availableRuntimes: string[];
}

export interface NotificationParams {
  title: string;
  body: string;
  tag?: string;
}

export interface BridgeInterface {
  isNative: boolean;
  executeShell(params: ShellExecuteParams): Promise<ShellResult>;
  executeShellStreaming(
    params: ShellExecuteParams,
    onChunk: (chunk: BridgeStreamChunk) => void
  ): Promise<ShellResult>;
  readFile(params: FileReadParams): Promise<string>;
  writeFile(params: FileWriteParams): Promise<boolean>;
  listDirectory(params: FileListParams): Promise<FileInfo[]>;
  deleteFile(path: string): Promise<boolean>;
  httpRequest(params: HttpRequestParams): Promise<HttpResponse>;
  getDeviceInfo(): Promise<DeviceInfo>;
  showNotification(params: NotificationParams): Promise<boolean>;
  getClipboard(): Promise<string>;
  setClipboard(text: string): Promise<boolean>;
  getAvailableRuntimes(): Promise<string[]>;
}

declare global {
  interface Window {
    CortexNative?: {
      executeCommand(requestJson: string): string;
      executeCommandAsync(requestId: string, requestJson: string): void;
      readFile(path: string): string;
      writeFile(path: string, content: string, append?: boolean): string;
      listDirectory(path: string): string;
      deleteFile(path: string): string;
      httpRequest(requestJson: string): string;
      getDeviceInfo(): string;
      showNotification(title: string, body: string): string;
      getClipboard(): string;
      setClipboard(text: string): string;
      getAvailableRuntimes(): string;
    };
    __cortexBridge?: {
      onStreamChunk: (requestId: string, chunkJson: string) => void;
      onStreamComplete: (requestId: string, resultJson: string) => void;
    };
  }
}
