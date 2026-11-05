import { Task, ModelProvider } from '../types';

export const TASKS_STORAGE_KEY = 'mcp_orchestrator_tasks_v2';
export const ACTIVE_TASK_STORAGE_KEY = 'mcp_orchestrator_active_task_id_v2';
export const PROVIDERS_STORAGE_KEY = 'mcp_orchestrator_providers_v2';

// In-memory fallback for environments without localStorage (e.g., Node.js test runner)
const inMemoryStore: Record<string, string> = {};

function getStorage(): { getItem: (key: string) => string | null; setItem: (key: string, value: string) => void; removeItem: (key: string) => void } {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      // Test availability
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return window.localStorage;
    } catch {
      // Fallback if blocked by security/quota
    }
  }

  return {
    getItem: (key: string) => inMemoryStore[key] || null,
    setItem: (key: string, value: string) => {
      inMemoryStore[key] = value;
    },
    removeItem: (key: string) => {
      delete inMemoryStore[key];
    },
  };
}

/**
 * Persists tasks array to storage.
 */
export function saveTasks(tasks: Task[]): boolean {
  try {
    const storage = getStorage();
    // Strip circular references or excessive log payloads if needed
    const serialized = JSON.stringify(tasks);
    storage.setItem(TASKS_STORAGE_KEY, serialized);
    return true;
  } catch (err) {
    console.warn('[TaskStorage] Failed to save tasks to storage:', err);
    return false;
  }
}

/**
 * Loads tasks array from storage, validating structure and handling interrupted states.
 */
export function loadTasks(): Task[] {
  try {
    const storage = getStorage();
    const raw = storage.getItem(TASKS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item: any) => {
      const task: Task = {
        id: String(item.id || 'task_' + Date.now()),
        goal: String(item.goal || ''),
        origin: String(item.origin || 'storage'),
        status: item.status || 'queued',
        createdAt: item.createdAt || new Date().toISOString(),
        subtasks: Array.isArray(item.subtasks) ? item.subtasks : [],
        currentSubtaskIndex: typeof item.currentSubtaskIndex === 'number' ? item.currentSubtaskIndex : 0,
        currentStep: typeof item.currentStep === 'number' ? item.currentStep : 0,
        logs: Array.isArray(item.logs) ? item.logs : [],
        result: item.result,
        error: item.error,
        lastActivity: typeof item.lastActivity === 'number' ? item.lastActivity : Date.now(),
      };

      // If page was refreshed while a task was actively running or waiting for HITL, mark it as stalled/interrupted
      if (task.status === 'running' || task.status === 'waiting_hitl') {
        task.status = 'stalled';
        task.error = 'Исполнение задачи было прервано перезагрузкой страницы или браузера.';
      }

      return task;
    });
  } catch (err) {
    console.warn('[TaskStorage] Failed to load tasks from storage:', err);
    return [];
  }
}

/**
 * Persists the active task ID.
 */
export function saveActiveTaskId(id: string | null): void {
  try {
    const storage = getStorage();
    if (id) {
      storage.setItem(ACTIVE_TASK_STORAGE_KEY, id);
    } else {
      storage.removeItem(ACTIVE_TASK_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Loads the active task ID.
 */
export function loadActiveTaskId(): string | null {
  try {
    const storage = getStorage();
    return storage.getItem(ACTIVE_TASK_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Clears persisted tasks.
 */
export function clearTasks(): void {
  try {
    const storage = getStorage();
    storage.removeItem(TASKS_STORAGE_KEY);
    storage.removeItem(ACTIVE_TASK_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Exports tasks as JSONL (matching tasks.jsonl audit format).
 */
export function exportTasksJsonl(tasks: Task[]): string {
  return tasks.map(t => JSON.stringify(t)).join('\n');
}

/**
 * Parses JSONL string into Task objects.
 */
export function importTasksJsonl(jsonl: string): Task[] {
  const lines = jsonl.split('\n');
  const result: Task[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed && parsed.id && parsed.goal) {
        result.push(parsed);
      }
    } catch {
      // Skip invalid line
    }
  }
  return result;
}

/**
 * Persists providers array to storage.
 */
export function saveProviders(providers: ModelProvider[]): boolean {
  try {
    const storage = getStorage();
    storage.setItem(PROVIDERS_STORAGE_KEY, JSON.stringify(providers));
    return true;
  } catch (err) {
    console.warn('[TaskStorage] Failed to save providers to storage:', err);
    return false;
  }
}

/**
 * Loads providers array from storage, fallback to null if not stored.
 */
export function loadProviders(): ModelProvider[] | null {
  try {
    const storage = getStorage();
    const raw = storage.getItem(PROVIDERS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch (err) {
    console.warn('[TaskStorage] Failed to load providers from storage:', err);
    return null;
  }
}

