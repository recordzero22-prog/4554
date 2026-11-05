/**
 * JSON-RPC 2.0 MCP Protocol helpers
 */

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse<T = unknown> {
  jsonrpc: '2.0';
  id: number | string;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

let nextId = 1;

export function createRpcRequest(method: string, params: Record<string, unknown> = {}, customId?: number | string): JsonRpcRequest {
  return {
    jsonrpc: '2.0',
    id: customId !== undefined ? customId : nextId++,
    method,
    params,
  };
}

export function parseRpcResponse<T = unknown>(rawJson: string | unknown): { success: boolean; data?: T; error?: string } {
  try {
    const payload = (typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson) as JsonRpcResponse<T>;
    if (payload.jsonrpc !== '2.0') {
      return { success: false, error: 'Invalid protocol version: expected 2.0' };
    }
    if (payload.error) {
      return { success: false, error: payload.error.message || `RPC Error code ${payload.error.code}` };
    }
    return { success: true, data: payload.result };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'JSON parse failure' };
  }
}

export const KNOWN_MCP_TOOLS = [
  {
    name: 'Shell',
    category: 'execution' as const,
    description: 'Execute PowerShell / CMD commands in Windows or host environment',
    parameters: {
      command: { type: 'string', description: 'PowerShell / cmd command to run', required: true },
      timeoutMs: { type: 'number', description: 'Maximum execution timeout', required: false },
    },
  },
  {
    name: 'FileWrite',
    category: 'filesystem' as const,
    description: 'Write or update a file in the workspace sandbox',
    parameters: {
      path: { type: 'string', description: 'Target file path relative to workspace', required: true },
      content: { type: 'string', description: 'File content to write', required: true },
    },
  },
  {
    name: 'FileRead',
    category: 'filesystem' as const,
    description: 'Read the contents of a file in the workspace sandbox',
    parameters: {
      path: { type: 'string', description: 'Target file path', required: true },
    },
  },
  {
    name: 'FileList',
    category: 'filesystem' as const,
    description: 'List all files and directories in the workspace sandbox',
    parameters: {
      directory: { type: 'string', description: 'Directory path (default root)', required: false },
    },
  },
  {
    name: 'wsl_exec',
    category: 'execution' as const,
    description: 'Execute a bash command inside Windows Subsystem for Linux (WSL)',
    parameters: {
      command: { type: 'string', description: 'Bash command string', required: true },
    },
  },
  {
    name: 'ProcessList',
    category: 'system' as const,
    description: 'Enumerate running host processes with PID, memory and CPU usage',
    parameters: {
      filter: { type: 'string', description: 'Optional name filter', required: false },
    },
  },
  {
    name: 'Unity_CreateGameObject',
    category: 'unity' as const,
    description: 'Create a new GameObject in the active Unity scene via mcp-for-unity',
    parameters: {
      name: { type: 'string', description: 'GameObject name', required: true },
      components: { type: 'string', description: 'Comma-separated components or primitive type', required: false },
    },
  },
  {
    name: 'Unity_InspectScene',
    category: 'unity' as const,
    description: 'Inspect Unity Hierarchy and active game objects',
    parameters: {
      depth: { type: 'number', description: 'Hierarchy inspection depth', required: false },
    },
  },
];
