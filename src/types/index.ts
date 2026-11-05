export type AgentRole = 'Architect' | 'Implementer' | 'Tester' | 'Coordinator' | 'Watchdog';

export type TaskStatus = 'queued' | 'running' | 'waiting_hitl' | 'completed' | 'failed' | 'stalled';

export type SubtaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface Subtask {
  id: string;
  title: string;
  action: string;
  tool?: string;
  toolArgs?: Record<string, unknown>;
  status: SubtaskStatus;
  output?: string;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface Task {
  id: string;
  goal: string;
  origin: string;
  status: TaskStatus;
  createdAt: string;
  subtasks: Subtask[];
  currentSubtaskIndex: number;
  currentStep: number;
  logs: LogEntry[];
  result?: string;
  error?: string;
  lastActivity: number;
}

export interface LogEntry {
  id: string;
  taskId?: string;
  role: AgentRole;
  message: string;
  time: string;
  timestamp: number;
  data?: unknown;
  level?: 'info' | 'warn' | 'error' | 'success';
}

export interface HITLRequest {
  approvalId: string;
  taskId: string;
  subtaskId: string;
  tool: string;
  args: Record<string, unknown>;
  reason: string;
  riskLevel: 'medium' | 'high' | 'critical';
  timestamp: number;
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
  category: 'system' | 'filesystem' | 'execution' | 'unity' | 'network';
}

export interface MCPResult {
  ok: boolean;
  result: string;
  executionTimeMs?: number;
  rawJsonRpc?: unknown;
}

export interface WorkspaceFile {
  name: string;
  path: string;
  content: string;
  language: string;
  size: number;
  updatedAt: string;
  isDirectory?: boolean;
}

export interface ModelProvider {
  id: string;
  name: string;
  endpoint: string;
  apiKeyMasked: string;
  models: string[];
  status: 'active' | 'rate_limited' | 'error' | 'offline';
  latencyMs?: number;
  isCustom?: boolean;
  authType?: 'env_var' | 'no_key' | 'bearer_token';
  envVarName?: string;
}
